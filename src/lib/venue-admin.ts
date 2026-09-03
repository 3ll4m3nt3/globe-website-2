import matter from "gray-matter";
import { z } from "zod";
import type { Venue } from "@/types/venue";
import { loadVenueMarkdownRecords, removeVenueMarkdown, writeVenueMarkdown } from "@/lib/venue-storage";

const imageSchema = z.object({
  src: z.string().trim().min(1).default("/venues/default-hero.svg"),
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

const gigSchema = z.object({
  date: z.string().min(1),
  title: z.string().min(1),
  note: z.string().min(1),
});

export const venueAdminSchema = z.object({
  slug: z.string().min(1).transform((value) => value.trim()),
  name: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  summary: z.string().min(1),
  coordinates: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }),
  heroImage: imageSchema,
  gallery: z.array(imageSchema).default([]),
  videos: z.array(videoSchema).default([]),
  gigs: z.array(gigSchema).default([]),
  body: z.string().default(""),
});

export type VenueAdminFormData = z.infer<typeof venueAdminSchema>;

export function getValidationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => issue.message)
      .filter(Boolean)
      .join("; ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Please check the form and try again.";
}

export function normalizeCoordinateInput(
  rawValue: string | null,
  latitudeOverride?: number,
  longitudeOverride?: number,
) {
  const fallbackLatitude = Number.isFinite(latitudeOverride) ? Number(latitudeOverride) : 0;
  const fallbackLongitude = Number.isFinite(longitudeOverride) ? Number(longitudeOverride) : 0;

  const tryParse = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const rawText = (rawValue ?? "").trim();

  if (rawText) {
    const parts = rawText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const firstValue = tryParse(parts[0]);
      const secondValue = tryParse(parts[1]);

      if (firstValue !== null && secondValue !== null) {
        const firstLooksLikelyLat = firstValue >= -90 && firstValue <= 90;
        const secondLooksLikelyLat = secondValue >= -90 && secondValue <= 90;

        const lat = firstLooksLikelyLat && !secondLooksLikelyLat
          ? firstValue
          : secondLooksLikelyLat && !firstLooksLikelyLat
            ? secondValue
            : firstLooksLikelyLat
              ? firstValue
              : secondValue;

        const lng = firstLooksLikelyLat && !secondLooksLikelyLat
          ? secondValue
          : secondLooksLikelyLat && !firstLooksLikelyLat
            ? firstValue
            : firstLooksLikelyLat
              ? secondValue
              : firstValue;

        const normalizedLat = Math.min(Math.max(lat, -90), 90);
        const normalizedLng = Math.min(Math.max(lng, -180), 180);

        return {
          latitude: Number(normalizedLat.toFixed(6)),
          longitude: Number(normalizedLng.toFixed(6)),
        };
      }
    }
  }

  const lat = Number.isFinite(latitudeOverride) ? Number(latitudeOverride) : fallbackLatitude;
  const lng = Number.isFinite(longitudeOverride) ? Number(longitudeOverride) : fallbackLongitude;

  return {
    latitude: Number(Math.min(Math.max(lat, -90), 90).toFixed(6)),
    longitude: Number(Math.min(Math.max(lng, -180), 180).toFixed(6)),
  };
}

function normalizeVenueInput(data: Record<string, unknown>, body: string) {
  const coordinates = typeof data.coordinates === "object" && data.coordinates !== null ? data.coordinates as Record<string, unknown> : {};

  return {
    slug: typeof data.slug === "string" ? data.slug : "",
    name: typeof data.name === "string" ? data.name : "",
    city: typeof data.city === "string" ? data.city : "",
    country: typeof data.country === "string" ? data.country : "",
    summary: typeof data.summary === "string" ? data.summary : "",
    coordinates: {
      latitude: Number(coordinates.latitude ?? 0),
      longitude: Number(coordinates.longitude ?? 0),
    },
    heroImage:
      typeof data.heroImage === "object" && data.heroImage !== null
        ? {
            src: typeof (data.heroImage as Record<string, unknown>).src === "string" ? (data.heroImage as Record<string, unknown>).src as string : "/venues/default-hero.svg",
            alt: typeof (data.heroImage as Record<string, unknown>).alt === "string" ? (data.heroImage as Record<string, unknown>).alt as string : "",
            width: Number((data.heroImage as Record<string, unknown>).width ?? 1600),
            height: Number((data.heroImage as Record<string, unknown>).height ?? 1000),
          }
        : {
            src: "/venues/default-hero.svg",
            alt: "",
            width: 1600,
            height: 1000,
          },
    gallery: Array.isArray(data.gallery) ? data.gallery.map((image) => ({
      src: typeof image === "object" && image !== null && typeof (image as Record<string, unknown>).src === "string" ? String((image as Record<string, unknown>).src) : "/venues/default-hero.svg",
      alt: typeof image === "object" && image !== null && typeof (image as Record<string, unknown>).alt === "string" ? String((image as Record<string, unknown>).alt) : "",
      width: Number((image as Record<string, unknown>).width ?? 1200),
      height: Number((image as Record<string, unknown>).height ?? 900),
    })) : [],
    videos: Array.isArray(data.videos) ? data.videos.map((video) => ({
      title: typeof video === "object" && video !== null && typeof (video as Record<string, unknown>).title === "string" ? String((video as Record<string, unknown>).title) : "",
      embedUrl: typeof video === "object" && video !== null && typeof (video as Record<string, unknown>).embedUrl === "string" ? String((video as Record<string, unknown>).embedUrl) : "",
      source: typeof video === "object" && video !== null && typeof (video as Record<string, unknown>).source === "string" ? String((video as Record<string, unknown>).source) : "",
      poster: typeof video === "object" && video !== null && typeof (video as Record<string, unknown>).poster === "string" ? String((video as Record<string, unknown>).poster) : "",
      caption: typeof video === "object" && video !== null && typeof (video as Record<string, unknown>).caption === "string" ? String((video as Record<string, unknown>).caption) : "",
    })) : [],
    gigs: Array.isArray(data.gigs) ? data.gigs.map((gig) => ({
      date: typeof gig === "object" && gig !== null && typeof (gig as Record<string, unknown>).date === "string" ? String((gig as Record<string, unknown>).date) : "",
      title: typeof gig === "object" && gig !== null && typeof (gig as Record<string, unknown>).title === "string" ? String((gig as Record<string, unknown>).title) : "",
      note: typeof gig === "object" && gig !== null && typeof (gig as Record<string, unknown>).note === "string" ? String((gig as Record<string, unknown>).note) : "",
    })) : [],
    body,
  };
}

export async function readAllVenueFiles(): Promise<Venue[]> {
  const records = await loadVenueMarkdownRecords();

  const venues = await Promise.all(
    records.map(async (record) => {
      const { content, data } = matter(record.markdown);
      const normalized = normalizeVenueInput(data as Record<string, unknown>, content.trim());
      const result = venueAdminSchema.safeParse(normalized);

      if (!result.success) {
        return null;
      }

      return result.data satisfies Venue;
    })
  );

  return venues
    .filter((venue): venue is Venue => venue !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function saveVenue(venue: VenueAdminFormData) {
  const parsed = venueAdminSchema.parse(venue);

  const frontMatter = {
    slug: parsed.slug,
    name: parsed.name,
    city: parsed.city,
    country: parsed.country,
    summary: parsed.summary,
    coordinates: {
      latitude: parsed.coordinates.latitude,
      longitude: parsed.coordinates.longitude,
    },
    heroImage: parsed.heroImage,
    gallery: parsed.gallery,
    videos: parsed.videos,
    gigs: parsed.gigs,
  };

  const body = parsed.body || "";
  const markdown = matter.stringify(body, frontMatter);
  await writeVenueMarkdown(parsed.slug, markdown);

  return parsed;
}

export async function deleteVenue(slug: string) {
  await removeVenueMarkdown(slug);
}

export function buildEmptyVenue(): VenueAdminFormData {
  return {
    slug: "",
    name: "",
    city: "",
    country: "",
    summary: "",
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
    heroImage: {
      src: "/venues/default-hero.svg",
      alt: "",
      width: 1600,
      height: 1000,
    },
    gallery: [],
    videos: [],
    gigs: [],
    body: "",
  };
}

export function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
