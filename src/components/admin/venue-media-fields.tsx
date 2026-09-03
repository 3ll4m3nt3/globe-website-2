"use client";

import { useMemo, useState } from "react";
import type { VenueImage, VenueVideo } from "@/types/venue";

type VenueMediaFieldsProps = {
  initialSlug: string;
  initialHeroImage: VenueImage;
  initialGallery: VenueImage[];
  initialVideos: VenueVideo[];
};

type UploadKind = "image" | "video";

type UploadState = {
  label: string;
  progress: number;
  tone: "idle" | "error" | "success";
};

const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const VIDEO_MAX_BYTES = 250 * 1024 * 1024;

const defaultImage: VenueImage = {
  src: "/venues/default-hero.svg",
  alt: "",
  width: 1200,
  height: 900,
};

const defaultVideo: VenueVideo = {
  title: "",
  embedUrl: "",
  source: "",
  poster: "",
  caption: "",
};

function normalizeSlug(rawValue: string) {
  return rawValue
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Failed to read image dimensions."));
      image.src = url;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function VenueMediaFields({
  initialSlug,
  initialHeroImage,
  initialGallery,
  initialVideos,
}: VenueMediaFieldsProps) {
  const [heroImage, setHeroImage] = useState<VenueImage>(initialHeroImage);
  const [gallery, setGallery] = useState<VenueImage[]>(initialGallery);
  const [videos, setVideos] = useState<VenueVideo[]>(initialVideos);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const heroJson = useMemo(() => JSON.stringify(heroImage), [heroImage]);
  const galleryJson = useMemo(() => JSON.stringify(gallery), [gallery]);
  const videosJson = useMemo(() => JSON.stringify(videos), [videos]);

  const getCurrentSlug = () => {
    const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
    return normalizeSlug(slugInput?.value ?? initialSlug) || "uploads";
  };

  const uploadFile = async (file: File, kind: UploadKind, label: string): Promise<string> => {
    const payload = new FormData();
    payload.set("slug", getCurrentSlug());
    payload.set("kind", kind);
    payload.set("file", file);

    setUploadState({
      label: `${label} (${formatFileSize(file.size)})`,
      progress: 0,
      tone: "idle",
    });

    return new Promise<string>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/admin/uploads");

      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) {
          setUploadState((previous) => previous ? { ...previous, progress: 15 } : previous);
          return;
        }

        const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
        setUploadState((previous) => previous ? { ...previous, progress } : previous);
      });

      request.addEventListener("load", () => {
        const body = request.responseText ? JSON.parse(request.responseText) as { path?: string; error?: string } : {};

        if (request.status < 200 || request.status >= 300) {
          const message = typeof body.error === "string"
            ? body.error
            : `Upload failed with status ${request.status}.`;
          setUploadState((previous) => previous ? { ...previous, tone: "error" } : previous);
          reject(new Error(message));
          return;
        }

        if (!body.path) {
          setUploadState((previous) => previous ? { ...previous, tone: "error" } : previous);
          reject(new Error("Upload failed because no file path was returned."));
          return;
        }

        setUploadState((previous) => previous ? { ...previous, progress: 100, tone: "success" } : previous);
        resolve(body.path);
      });

      request.addEventListener("error", () => {
        setUploadState((previous) => previous ? { ...previous, tone: "error" } : previous);
        reject(new Error("Network error while uploading file."));
      });

      request.send(payload);
    });
  };

  const updateGallery = (index: number, patch: Partial<VenueImage>) => {
    setGallery((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  const updateVideo = (index: number, patch: Partial<VenueVideo>) => {
    setVideos((previous) => previous.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  return (
    <div className="space-y-8">
      <input type="hidden" name="heroImageJson" value={heroJson} />
      <input type="hidden" name="galleryJson" value={galleryJson} />
      <input type="hidden" name="videosJson" value={videosJson} />

      {uploadState && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          <div className="flex items-center justify-between gap-3">
            <span>{uploadState.label}</span>
            <span className={uploadState.tone === "error" ? "text-red-300" : uploadState.tone === "success" ? "text-emerald-300" : "text-[var(--accent)]"}>
              {uploadState.tone === "error" ? "Failed" : `${uploadState.progress}%`}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
            <div
              className={uploadState.tone === "error" ? "h-full bg-red-400 transition-all" : uploadState.tone === "success" ? "h-full bg-emerald-400 transition-all" : "h-full bg-[var(--accent)] transition-all"}
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Hero image</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Image path</span>
            <input
              value={heroImage.src}
              onChange={(event) => setHeroImage((previous) => ({ ...previous, src: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              placeholder="/venues/venue/hero.jpg"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Alt text</span>
            <input
              value={heroImage.alt}
              onChange={(event) => setHeroImage((previous) => ({ ...previous, alt: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              placeholder="Venue entrance at sunset"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Width</span>
            <input
              type="number"
              value={heroImage.width}
              onChange={(event) => setHeroImage((previous) => ({ ...previous, width: Number(event.target.value || 1600) }))}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Height</span>
            <input
              type="number"
              value={heroImage.height}
              onChange={(event) => setHeroImage((previous) => ({ ...previous, height: Number(event.target.value || 1000) }))}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <label className="mt-5 block space-y-2 text-sm font-medium text-[var(--muted)]">
          <span>Upload image file</span>
          <p className="text-xs leading-6 text-[var(--muted)]">Accepted: image files up to {formatFileSize(IMAGE_MAX_BYTES)}.</p>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              try {
                setUploading(true);
                const dimensions = await getImageDimensions(file);
                const src = await uploadFile(file, "image", "Uploading hero image");
                setHeroImage((previous) => ({
                  ...previous,
                  src,
                  width: dimensions.width,
                  height: dimensions.height,
                }));
              } catch (error) {
                setUploadState({
                  label: error instanceof Error ? error.message : "Image upload failed.",
                  progress: 100,
                  tone: "error",
                });
              } finally {
                setUploading(false);
                event.target.value = "";
              }
            }}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]"
          />
        </label>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Gallery images</p>
          <button
            type="button"
            onClick={() => setGallery((previous) => [...previous, { ...defaultImage }])}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)]"
          >
            + Add image
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {gallery.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
              No gallery images yet.
            </p>
          )}

          {gallery.map((image, index) => (
            <div key={`gallery-${index}`} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                  <span>Image path</span>
                  <input
                    value={image.src}
                    onChange={(event) => updateGallery(index, { src: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                  <span>Alt text</span>
                  <input
                    value={image.alt}
                    onChange={(event) => updateGallery(index, { alt: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                  <span>Width</span>
                  <input
                    type="number"
                    value={image.width}
                    onChange={(event) => updateGallery(index, { width: Number(event.target.value || 1200) })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                  <span>Height</span>
                  <input
                    type="number"
                    value={image.height}
                    onChange={(event) => updateGallery(index, { height: Number(event.target.value || 900) })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--foreground)]">
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      try {
                        setUploading(true);
                        const dimensions = await getImageDimensions(file);
                        const src = await uploadFile(file, "image", `Uploading gallery image ${index + 1}`);
                        updateGallery(index, {
                          src,
                          width: dimensions.width,
                          height: dimensions.height,
                        });
                      } catch (error) {
                        setUploadState({
                          label: error instanceof Error ? error.message : "Gallery upload failed.",
                          progress: 100,
                          tone: "error",
                        });
                      } finally {
                        setUploading(false);
                        event.target.value = "";
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setGallery((previous) => previous.filter((_, entryIndex) => entryIndex !== index))}
                  className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200"
                >
                  Remove
                </button>
              </div>
              <p className="mt-3 text-xs leading-6 text-[var(--muted)]">Image uploads support files up to {formatFileSize(IMAGE_MAX_BYTES)}.</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Videos</p>
          <button
            type="button"
            onClick={() => setVideos((previous) => [...previous, { ...defaultVideo }])}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)]"
          >
            + Add video
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {videos.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
              No videos yet.
            </p>
          )}

          {videos.map((video, index) => (
            <div key={`video-${index}`} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                  <span>Title</span>
                  <input
                    value={video.title}
                    onChange={(event) => updateVideo(index, { title: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                  <span>Caption</span>
                  <input
                    value={video.caption}
                    onChange={(event) => updateVideo(index, { caption: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[var(--muted)] md:col-span-2">
                  <span>Embed URL (YouTube/Vimeo)</span>
                  <input
                    value={video.embedUrl}
                    onChange={(event) => updateVideo(index, { embedUrl: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[var(--muted)] md:col-span-2">
                  <span>Uploaded video path</span>
                  <input
                    value={video.source}
                    onChange={(event) => updateVideo(index, { source: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    placeholder="/venues/venue/video.mp4"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-[var(--muted)] md:col-span-2">
                  <span>Poster image path (optional)</span>
                  <input
                    value={video.poster}
                    onChange={(event) => updateVideo(index, { poster: event.target.value })}
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    placeholder="/venues/venue/video-poster.jpg"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--foreground)]">
                  Upload video
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    disabled={uploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      try {
                        setUploading(true);
                        const source = await uploadFile(file, "video", `Uploading video ${index + 1}`);
                        updateVideo(index, {
                          source,
                          embedUrl: "",
                        });
                      } catch (error) {
                        setUploadState({
                          label: error instanceof Error ? error.message : "Video upload failed.",
                          progress: 100,
                          tone: "error",
                        });
                      } finally {
                        setUploading(false);
                        event.target.value = "";
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex cursor-pointer items-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-semibold text-[var(--foreground)]">
                  Upload poster
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      try {
                        setUploading(true);
                        const poster = await uploadFile(file, "image", `Uploading poster ${index + 1}`);
                        updateVideo(index, { poster });
                      } catch (error) {
                        setUploadState({
                          label: error instanceof Error ? error.message : "Poster upload failed.",
                          progress: 100,
                          tone: "error",
                        });
                      } finally {
                        setUploading(false);
                        event.target.value = "";
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setVideos((previous) => previous.filter((_, entryIndex) => entryIndex !== index))}
                  className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200"
                >
                  Remove
                </button>
              </div>
              <p className="mt-3 text-xs leading-6 text-[var(--muted)]">Video uploads support files up to {formatFileSize(VIDEO_MAX_BYTES)}. Large files can take a while; the bar above tracks browser upload progress.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
