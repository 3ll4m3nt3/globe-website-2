import { promises as fs } from "node:fs";
import path from "node:path";
import { del, list, put } from "@vercel/blob";

const venuesDirectory = path.join(process.cwd(), "content", "venues");
const venueBlobPrefix = "venues-content/";

export type VenueMarkdownRecord = {
  slug: string;
  markdown: string;
};

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function shouldUseBlobForWrites() {
  return process.env.NODE_ENV === "production" && Boolean(getBlobToken());
}

function assertWritableStorageConfigured() {
  if (process.env.NODE_ENV === "production" && !getBlobToken()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for venue edits in production.");
  }
}

function recordSlugFromPathname(pathnameValue: string) {
  if (!pathnameValue.startsWith(venueBlobPrefix) || !pathnameValue.endsWith(".md")) {
    return "";
  }

  const slug = path.posix.basename(pathnameValue, ".md").trim();
  return slug;
}

async function readLocalVenueRecords(): Promise<VenueMarkdownRecord[]> {
  try {
    const entries = await fs.readdir(venuesDirectory, { withFileTypes: true });
    const markdownFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    const records = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const slug = path.basename(fileName, ".md");
        const fullPath = path.join(venuesDirectory, fileName);
        const markdown = await fs.readFile(fullPath, "utf8");

        return {
          slug,
          markdown,
        } satisfies VenueMarkdownRecord;
      })
    );

    return records;
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readBlobVenueRecords(): Promise<VenueMarkdownRecord[]> {
  const token = getBlobToken();

  if (!token) {
    return [];
  }

  const blobs: Array<{ pathname: string; url: string }> = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await list({
      prefix: venueBlobPrefix,
      cursor,
      token,
    });

    blobs.push(...response.blobs.map((blob) => ({ pathname: blob.pathname, url: blob.url })));
    hasMore = response.hasMore;
    cursor = response.cursor;
  }

  const records = await Promise.all(
    blobs.map(async (blob) => {
      const slug = recordSlugFromPathname(blob.pathname);

      if (!slug) {
        return null;
      }

      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) {
        return null;
      }

      const markdown = await response.text();
      return {
        slug,
        markdown,
      } satisfies VenueMarkdownRecord;
    })
  );

  return records.filter((record): record is VenueMarkdownRecord => record !== null);
}

export async function loadVenueMarkdownRecords(): Promise<VenueMarkdownRecord[]> {
  const [localRecords, blobRecords] = await Promise.all([
    readLocalVenueRecords(),
    readBlobVenueRecords(),
  ]);

  const merged = new Map<string, string>();

  for (const record of localRecords) {
    merged.set(record.slug, record.markdown);
  }

  for (const record of blobRecords) {
    merged.set(record.slug, record.markdown);
  }

  return Array.from(merged.entries())
    .map(([slug, markdown]) => ({ slug, markdown }))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export async function writeVenueMarkdown(slug: string, markdown: string) {
  assertWritableStorageConfigured();

  if (shouldUseBlobForWrites()) {
    await put(`${venueBlobPrefix}${slug}.md`, markdown, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "text/markdown; charset=utf-8",
      token: getBlobToken(),
    });
    return;
  }

  const fullPath = path.join(venuesDirectory, `${slug}.md`);
  await fs.mkdir(venuesDirectory, { recursive: true });
  await fs.writeFile(fullPath, markdown, "utf8");
}

export async function removeVenueMarkdown(slug: string) {
  assertWritableStorageConfigured();

  if (shouldUseBlobForWrites()) {
    await del(`${venueBlobPrefix}${slug}.md`, {
      token: getBlobToken(),
    });
    return;
  }

  const fullPath = path.join(venuesDirectory, `${slug}.md`);
  await fs.rm(fullPath, { force: true });
}