import Link from "next/link";
import { redirect } from "next/navigation";
import { clearAdminSession, requireAdmin } from "@/lib/admin-auth";
import { readAllVenueFiles } from "@/lib/venue-admin";

export default async function AdminEditorPage() {
  await requireAdmin();

  const venues = await readAllVenueFiles();

  async function logoutAction() {
    "use server";
    await clearAdminSession();
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">Admin</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none">Venue content</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Update the venue list, map pins, and each venue page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/editor/about"
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
          >
            Edit About
          </Link>
          <Link
            href="/admin/editor/new"
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            + Add venue
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-3xl leading-none">Current venues</h2>
          <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-sm text-[var(--muted)]">
            {venues.length} total
          </span>
        </div>

        {venues.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface-strong)] p-8 text-center text-[var(--muted)]">
            No venues yet. Add your first venue to start building the map.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {venues.map((venue) => (
              <article
                key={venue.slug}
                className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {venue.city}, {venue.country}
                </p>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-none">
                  {venue.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{venue.summary}</p>

                <div className="mt-5 flex items-center gap-3">
                  <Link
                    href={`/admin/editor/${venue.slug}`}
                    className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
                  >
                    Edit
                  </Link>
                  <Link href={`/venues/${venue.slug}`} className="text-sm font-semibold text-[var(--accent)]">
                    View page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
