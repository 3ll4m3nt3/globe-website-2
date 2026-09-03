import { randomUUID } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sanitizeSlug } from "@/lib/venue-admin";

export const runtime = "nodejs";

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

const videoTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

function safeExtension(fileName: string, mimeType: string) {
  const fromName = path.extname(fileName || "").toLowerCase().replace(/[^a-z0-9.]/g, "");

  if (fromName && fromName.length <= 10) {
    return fromName;
  }

  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/avif") return ".avif";
  if (mimeType === "image/svg+xml") return ".svg";
  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "video/webm") return ".webm";
  if (mimeType === "video/ogg") return ".ogv";
  if (mimeType === "video/quicktime") return ".mov";

  return "";
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const rawSlug = String(formData.get("slug") ?? "uploads");
    const slug = sanitizeSlug(rawSlug) || "uploads";
    const kind = String(formData.get("kind") ?? "").trim();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was provided." }, { status: 400 });
    }

    const fileType = file.type.toLowerCase();
    const isImage = kind === "image";
    const isVideo = kind === "video";

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Upload kind must be image or video." }, { status: 400 });
    }

    if ((isImage && !imageTypes.has(fileType)) || (isVideo && !videoTypes.has(fileType))) {
      return NextResponse.json({ error: `Unsupported ${kind} format: ${fileType || "unknown"}.` }, { status: 400 });
    }

    const maxBytes = isImage ? 25 * 1024 * 1024 : 250 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({
        error: isImage
          ? "Image is too large. Max size is 25MB."
          : "Video is too large. Max size is 250MB.",
      }, { status: 400 });
    }

    const extension = safeExtension(file.name, fileType);
    if (!extension) {
      return NextResponse.json({ error: "Unable to determine a safe file extension." }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN is not configured on the server." },
        { status: 500 },
      );
    }

    const fileName = `${kind}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
    const blobPath = path.posix.join("venues", slug, fileName);
    const uploaded = await put(blobPath, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: fileType,
      allowOverwrite: true,
      addRandomSuffix: false,
    });

    return NextResponse.json({ path: uploaded.url }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unexpected upload error." }, { status: 500 });
  }
}
