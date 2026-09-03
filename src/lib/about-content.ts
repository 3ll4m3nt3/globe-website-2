import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { del, list, put } from "@vercel/blob";

export type AboutContent = {
  title: string;
  summary: string;
  body: string;
};

const aboutDirectory = path.join(process.cwd(), "content");
const aboutFilePath = path.join(aboutDirectory, "about.md");
const aboutBlobPrefix = "site-content/about.md";

const defaultAboutMarkdown = `---
title: "About me"
summary: "I’m SZABO MAN BAND — a live performer documenting the rooms, people, and nights that shape the music."
---

# About me

I’m a musician and collector of live memory — chasing the atmosphere of every room, the people in front of the stage, and the stories that emerge after midnight.

This site is a map of those nights: the venues, the crowds, and the moments that stick with me long after the set ends.

## What this project is

The globe brings together the places I’ve played and the stories tied to each one. The aim is simple: keep the energy of each show in one place and make it feel like a living archive.

## Touring notes

From tiny basements to bigger rooms, each venue carries its own personality. The details matter — the room tone, the lights, the audience, the way a set lands differently in each city.

This archive is as much about the atmosphere as the music itself.
`;

function getBlobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function shouldUseBlobForWrites() {
  return process.env.NODE_ENV === "production" && Boolean(getBlobToken());
}

function assertWritableStorageConfigured() {
  if (process.env.NODE_ENV === "production" && !getBlobToken()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for about-page edits in production.");
  }
}

async function readLocalAboutMarkdown(): Promise<string> {
  try {
    return await fs.readFile(aboutFilePath, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return defaultAboutMarkdown;
    }

    throw error;
  }
}

async function readBlobAboutMarkdown(): Promise<string> {
  const token = getBlobToken();

  if (!token) {
    return "";
  }

  const response = await list({
    prefix: aboutBlobPrefix,
    token,
  });

  const blob = response.blobs[0];

  if (!blob) {
    return "";
  }

  const markdownResponse = await fetch(blob.url, { cache: "no-store" });

  if (!markdownResponse.ok) {
    return "";
  }

  return await markdownResponse.text();
}

export async function getAboutContent(): Promise<AboutContent> {
  const [localMarkdown, blobMarkdown] = await Promise.all([
    readLocalAboutMarkdown(),
    readBlobAboutMarkdown(),
  ]);

  const markdown = blobMarkdown || localMarkdown || defaultAboutMarkdown;
  const { data, content } = matter(markdown);

  return {
    title: typeof data.title === "string" ? data.title : "About me",
    summary: typeof data.summary === "string" ? data.summary : "",
    body: content.trim(),
  };
}

export async function saveAboutContent(nextContent: AboutContent) {
  const markdown = matter.stringify(nextContent.body, {
    title: nextContent.title,
    summary: nextContent.summary,
  });

  assertWritableStorageConfigured();

  if (shouldUseBlobForWrites()) {
    await put(aboutBlobPrefix, markdown, {
      access: "public",
      addRandomSuffix: false,
      contentType: "text/markdown; charset=utf-8",
      token: getBlobToken(),
    });
    return;
  }

  await fs.mkdir(aboutDirectory, { recursive: true });
  await fs.writeFile(aboutFilePath, markdown, "utf8");
}

export async function deleteAboutContent() {
  assertWritableStorageConfigured();

  if (shouldUseBlobForWrites()) {
    await del(aboutBlobPrefix, {
      token: getBlobToken(),
    });
    return;
  }

  await fs.rm(aboutFilePath, { force: true });
}
