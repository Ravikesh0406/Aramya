// ARAMYA — media storage abstraction.
//
// Keys are never public. Only random server-generated keys are stored in Postgres.
// Drivers:
//   local  — disk under STORAGE_LOCAL_DIR (dev default; gitignored)
//   s3     — any S3-compatible bucket via presigned URLs or plain fetch
//
// Production: if production storage is not configured, uploads must fail loudly
// (the UI says so) instead of pretending success.

import { randomUUID } from "crypto";
import { mkdirSync, createReadStream, existsSync } from "fs";
import { createWriteStream } from "fs";
import path from "path";

export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

const PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/** jpeg / png / webp / pdf magic bytes. */
const MAGIC_SIGNATURES: { mime: string; test: (bytes: Buffer) => boolean }[] = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
  },
  {
    mime: "application/pdf",
    test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
];

export function detectMimeType(bytes: Buffer): string | null {
  for (const signature of MAGIC_SIGNATURES) {
    if (signature.test(bytes)) return signature.mime;
  }
  return null;
}

export type UploadKind = "photo" | "document";

export type UploadValidation = { ok: true; key: string; mime: string } | { ok: false; error: string };

export type StorageDriver = {
  readonly kind: "local" | "s3";
  isConfigured(): boolean;
  save(key: string, bytes: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  publicUrl(key: string): string | null;
};

class LocalDriver implements StorageDriver {
  readonly kind = "local" as const;
  private readonly dir: string;

  constructor(dir: string) {
    // Statically scoped so bundlers can follow the path.
    this.dir = path.join(process.cwd(), dir);
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  isConfigured(): boolean {
    return true;
  }

  private resolve(key: string): string {
    // Prevent path traversal: join only, then verify the result stays inside dir.
    const resolved = path.join(this.dir, key);
    if (!resolved.startsWith(this.dir + path.sep) && resolved !== this.dir) {
      throw new Error("Invalid storage key.");
    }
    return resolved;
  }

  async save(key: string, bytes: Buffer): Promise<void> {
    const target = this.resolve(key);
    mkdirSync(path.dirname(target), { recursive: true });
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(target);
      stream.on("error", reject);
      stream.on("close", () => resolve());
      stream.end(bytes);
    });
  }

  async read(key: string): Promise<Buffer> {
    const resolved = this.resolve(key);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(resolved);
      stream.on("data", (chunk) => chunks.push(chunk as Buffer));
      stream.on("error", reject);
      stream.on("end", () => resolve());
    });
    return Buffer.concat(chunks);
  }

  publicUrl(_key?: string): string | null {
    // Private files are always served through an authenticated route.
    return null;
  }
}

class S3Driver implements StorageDriver {
  readonly kind = "s3" as const;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string | null;
  private readonly baseUrl: string | null;
  private readonly accessKeyId: string | undefined;
  private readonly secretAccessKey: string | undefined;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    this.region = process.env.S3_REGION ?? "auto";
    this.endpoint = process.env.S3_ENDPOINT ?? null;
    this.baseUrl = process.env.S3_PUBLIC_BASE_URL ?? null;
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.bucket);
  }

  isPublicConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  async save(key: string, bytes: Buffer): Promise<void> {
    // S3 PUT uses @aws-sdk when installed; otherwise we fail loudly so the UI can say so.
    const sdk = await loadAwsSdk();
    if (!sdk) {
      throw new Error("S3 storage is selected but @aws-sdk/client-s3 is not installed.");
    }
    const client = new sdk.S3Client({
      region: this.region,
      endpoint: this.endpoint ?? undefined,
      credentials: this.accessKeyId
        ? { accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey ?? "" }
        : undefined,
    });
    await client.send(
      new sdk.PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: "application/octet-stream",
      }),
    );
  }

  async read(key: string): Promise<Buffer> {
    const sdk = await loadAwsSdk();
    if (!sdk) {
      throw new Error("S3 storage is selected but @aws-sdk/client-s3 is not installed.");
    }
    const client = new sdk.S3Client({
      region: this.region,
      endpoint: this.endpoint ?? undefined,
      credentials: this.accessKeyId
        ? { accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey ?? "" }
        : undefined,
    });
    const result = (await client.send(new sdk.GetObjectCommand({ Bucket: this.bucket, Key: key }))) as {
      Body?: AsyncIterable<Buffer>;
    };
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body ?? []) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  publicUrl(_key?: string): string | null {
    return null;
  }
}

async function loadAwsSdk(): Promise<{
  S3Client: new (config: Record<string, unknown>) => {
    send: (command: unknown) => Promise<unknown>;
  };
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  GetObjectCommand: new (input: Record<string, unknown>) => unknown;
} | null> {
  try {
    // Optional peer dependency: resolved at runtime only when S3 storage is used.
    const specifier = "@aws-sdk/client-s3";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loaded = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ specifier)) as any as {
      S3Client: new (config: Record<string, unknown>) => {
        send: (command: unknown) => Promise<unknown>;
      };
      PutObjectCommand: new (input: Record<string, unknown>) => unknown;
      GetObjectCommand: new (input: Record<string, unknown>) => unknown;
    };
    return loaded;
  } catch {
    return null;
  }
}

let cachedDriver: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (cachedDriver) return cachedDriver;
  const kind = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  if (kind === "s3") {
    cachedDriver = new S3Driver();
  } else {
    cachedDriver = new LocalDriver(process.env.STORAGE_LOCAL_DIR ?? ".aramya-uploads");
  }
  return cachedDriver;
}

export function storageConfigured(): boolean {
  return getStorageDriver().isConfigured();
}

export function randomStorageKey(prefix: string, extension: string): string {
  return `${prefix}/${randomUUID()}.${extension}`;
}

export const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Validates an upload by MIME *and* magic bytes and stores it.
 * SVG is never allowed; bytes are the source of truth.
 */
export async function validateAndStore(
  kind: UploadKind,
  declaredMime: string,
  bytes: Buffer,
  folder: string,
): Promise<UploadValidation> {
  const allowed = kind === "photo" ? PHOTO_MIME_TYPES : DOCUMENT_MIME_TYPES;
  const maxBytes = kind === "photo" ? PHOTO_MAX_BYTES : DOCUMENT_MAX_BYTES;

  if (bytes.byteLength === 0) return { ok: false, error: "The uploaded file is empty." };
  if (bytes.byteLength > maxBytes) {
    return {
      ok: false,
      error: `File is too large. Maximum ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    };
  }
  if (!allowed.has(declaredMime)) {
    return { ok: false, error: "Only JPEG, PNG and WebP images are accepted." };
  }
  const detected = detectMimeType(bytes);
  if (!detected) {
    return { ok: false, error: "This file type could not be verified. Use JPEG, PNG or WebP." };
  }
  if (detected !== declaredMime) {
    return { ok: false, error: "File contents do not match its type." };
  }

  const driver = getStorageDriver();
  if (!driver.isConfigured()) {
    return { ok: false, error: "Uploads are not configured for this environment." };
  }

  const key = randomStorageKey(folder, EXTENSION_BY_MIME[detected] ?? "bin");
  await driver.save(key, bytes);
  return { ok: true, key, mime: detected };
}

export async function readStoredFile(key: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const driver = getStorageDriver();
  if (!driver.isConfigured()) return null;
  try {
    const bytes = await driver.read(key);
    const mime = detectMimeType(bytes) ?? "application/octet-stream";
    return { bytes, mime };
  } catch {
    return null;
  }
}
