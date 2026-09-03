import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import {
  buildEmptyVenue,
  deleteVenue,
  getValidationMessage,
  normalizeCoordinateInput,
  readAllVenueFiles,
  sanitizeSlug,
  saveVenue,
  venueAdminSchema,
} from "@/lib/venue-admin";

const toNumber = (value: FormDataEntryValue | null, fallback: number) => {
  const numericValue = Number(value ?? fallback);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export default async function AdminVenueEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const paramsData = searchParams ? await searchParams : {};
  const allVenues = await readAllVenueFiles();
  const currentVenue = allVenues.find((venue) => venue.slug === slug) ?? buildEmptyVenue();

  const isNew = slug === "new";
  const validationError = paramsData.error ?? "";
  const saved = paramsData.saved === "1";

  async function saveAction(formData: FormData) {
    "use server";

    await requireAdmin();

    const mode = String(formData.get("submitMode") ?? "save");
    const rawSlug = String(formData.get("slug") ?? "").trim();
    const latitudeInput = toNumber(formData.get("latitude"), Number.NaN);
    const longitudeInput = toNumber(formData.get("longitude"), Number.NaN);
    const coordinates = normalizeCoordinateInput(
      String(formData.get("coordinatesText") ?? ""),
      latitudeInput,
      longitudeInput,
    );

    const parsedForm = {
      slug: sanitizeSlug(rawSlug) || rawSlug,
      name: String(formData.get("name") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      country: String(formData.get("country") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim(),
      coordinates,
      heroImage: {
        src: (String(formData.get("heroSrc") ?? "/venues/default-hero.svg").trim() || "/venues/default-hero.svg"),
        alt: String(formData.get("heroAlt") ?? "").trim(),
        width: toNumber(formData.get("heroWidth"), 1600),
        height: toNumber(formData.get("heroHeight"), 1000),
      },
      gallery: [],
      videos: [],
      gigs: [],
      body: String(formData.get("body") ?? "").trim(),
    };

    try {
      const normalized = venueAdminSchema.parse(parsedForm);
      await saveVenue(normalized);

      if (mode === "view") {
        redirect(`/venues/${normalized.slug}`);
      }

      redirect(`/admin/editor/${normalized.slug}?saved=1`);
    } catch (error) {
      if (
        error instanceof Error &&
        "digest" in error &&
        typeof (error as { digest?: string }).digest === "string" &&
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }

      const message = encodeURIComponent(getValidationMessage(error));
      redirect(`/admin/editor/${slug === "new" ? "new" : rawSlug || slug}?error=${message}`);
    }
  }

  async function deleteAction() {
    "use server";

    await requireAdmin();

    if (!isNew && currentVenue.slug) {
      await deleteVenue(currentVenue.slug);
    }

    redirect("/admin/editor");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">Admin</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none">
            {isNew ? "Add venue" : `Edit ${currentVenue.name || "venue"}`}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/editor" className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
            Back to list
          </Link>
          {!isNew && (
            <form action={deleteAction}>
              <button
                type="submit"
                className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200"
              >
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {validationError && (
        <div className="rounded-[1.5rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {validationError}
        </div>
      )}

      {saved && (
        <div className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Venue saved successfully.
        </div>
      )}

      <form action={saveAction} className="space-y-8 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Basic details</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Venue slug</span>
              <input
                name="slug"
                defaultValue={currentVenue.slug}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                placeholder="brixton-electric"
                required
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Venue name</span>
              <input
                name="name"
                defaultValue={currentVenue.name}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                placeholder="Brixton Electric"
                required
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>City</span>
              <input
                name="city"
                defaultValue={currentVenue.city}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                placeholder="London"
                required
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Country</span>
              <input
                name="country"
                defaultValue={currentVenue.country}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                placeholder="United Kingdom"
                required
              />
            </label>
          </div>

          <label className="mt-5 block space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Short summary</span>
            <textarea
              name="summary"
              defaultValue={currentVenue.summary}
              rows={4}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              required
            />
          </label>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Map location</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Paste Google Maps coordinates like 38.717636, -9.143338. The app treats the first value as latitude and the second as longitude when needed.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Coordinates</span>
              <input
                name="coordinatesText"
                defaultValue={`${currentVenue.coordinates.latitude}, ${currentVenue.coordinates.longitude}`}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                placeholder="38.717636, -9.143338"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                <span>Latitude</span>
                <input
                  name="latitude"
                  type="number"
                  step="0.000001"
                  defaultValue={currentVenue.coordinates.latitude}
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
                <span>Longitude</span>
                <input
                  name="longitude"
                  type="number"
                  step="0.000001"
                  defaultValue={currentVenue.coordinates.longitude}
                  className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Hero image</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Image path</span>
              <input
                name="heroSrc"
                defaultValue={currentVenue.heroImage.src}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                placeholder="/venues/venue/hero.jpg"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Alt text</span>
              <input
                name="heroAlt"
                defaultValue={currentVenue.heroImage.alt}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                placeholder="Venue entrance at sunset"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Width</span>
              <input
                name="heroWidth"
                type="number"
                defaultValue={currentVenue.heroImage.width}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--muted)]">
              <span>Height</span>
              <input
                name="heroHeight"
                type="number"
                defaultValue={currentVenue.heroImage.height}
                className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Venue notes</p>
          <label className="mt-4 block space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Page body (Markdown)</span>
            <textarea
              name="body"
              defaultValue={currentVenue.body}
              rows={10}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 font-mono text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
          <button
            type="submit"
            name="submitMode"
            value="save"
            className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          >
            Save venue
          </button>
          <button
            type="submit"
            name="submitMode"
            value="view"
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Save & view
          </button>
        </div>
      </form>
    </main>
  );
}
