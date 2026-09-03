import { cache } from "react";
import matter from "gray-matter";
import { z } from "zod";
import type { Venue, VenueMapItem } from "@/types/venue";
import { loadVenueMarkdownRecords } from "@/lib/venue-storage";

const imageSchema = z.object({
  src: z.string().trim().min(1),
  alt: z.string().trim().default(""),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const videoSchema = z.object({
  title: z.string().min(1),
  embedUrl: z.string().trim().default(""),
  source: z.string().trim().default(""),
  poster: z.string().trim().default(""),
  caption: z.string().min(1),
}).refine((video) => video.embedUrl.length > 0 || video.source.length > 0, {
  message: "Each video needs either an embed URL or a source path.",
});

const dateStringSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}, z.string().min(1));

const gigSchema = z.object({
  date: dateStringSchema,
  title: z.string().min(1),
  note: z.string().min(1),
});

const venueSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  summary: z.string().min(1),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  heroImage: imageSchema,
  gallery: z.array(imageSchema).default([]),
  videos: z.array(videoSchema).default([]),
  gigs: z.array(gigSchema).default([]),
});

const readVenueFiles = cache(async () => {
  const records = await loadVenueMarkdownRecords();

  const venues = await Promise.all(
    records.map(async (record) => {
      const { content, data } = matter(record.markdown);
      const frontmatter = venueSchema.parse(data);

      return {
        ...frontmatter,
        body: content.trim(),
      } satisfies Venue;
    })
  );

  return venues.sort((left, right) => left.name.localeCompare(right.name));
});

export async function getAllVenues(): Promise<Venue[]> {
  return readVenueFiles();
}

export async function getVenueMapItems(): Promise<VenueMapItem[]> {
  const venues = await readVenueFiles();

  return venues.map(({ slug, name, city, country, summary, coordinates }) => ({
    slug,
    name,
    city,
    country,
    summary,
    coordinates,
  }));
}

export async function getVenueBySlug(slug: string): Promise<Venue | undefined> {
  const venues = await readVenueFiles();
  return venues.find((venue) => venue.slug === slug);
}

export async function getVenueSlugs(): Promise<string[]> {
  const venues = await readVenueFiles();
  return venues.map((venue) => venue.slug);
}