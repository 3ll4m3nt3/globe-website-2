import Link from "next/link";
import { redirect } from "next/navigation";
import { getAboutContent, saveAboutContent } from "@/lib/about-content";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminAboutEditorPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const params = searchParams ? await searchParams : {};
  const about = await getAboutContent();
  const validationError = params.error ?? "";
  const saved = params.saved === "1";

  async function saveAction(formData: FormData) {
    "use server";

    await requireAdmin();

    const nextContent = {
      title: String(formData.get("title") ?? about.title).trim() || "About me",
      summary: String(formData.get("summary") ?? about.summary).trim(),
      body: String(formData.get("body") ?? about.body).trim(),
    };

    try {
      await saveAboutContent(nextContent);
      redirect("/admin/editor/about?saved=1");
    } catch (error) {
      const message = encodeURIComponent(
        error instanceof Error ? error.message : "Unable to save about page.",
      );
      redirect(`/admin/editor/about?error=${message}`);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">Admin</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none">Edit About page</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/editor" className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
            Back to list
          </Link>
          <Link href="/about" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90">
            View page
          </Link>
        </div>
      </div>

      {validationError && (
        <div className="rounded-[1.5rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {validationError}
        </div>
      )}

      {saved && (
        <div className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          About page saved successfully.
        </div>
      )}

      <form action={saveAction} className="space-y-8 rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="space-y-5 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] p-5">
          <label className="block space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Page title</span>
            <input
              name="title"
              defaultValue={about.title}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Short summary</span>
            <textarea
              name="summary"
              defaultValue={about.summary}
              rows={3}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-[var(--muted)]">
            <span>Page body (Markdown)</span>
            <textarea
              name="body"
              defaultValue={about.body}
              rows={18}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 font-mono text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Save about page
          </button>
        </div>
      </form>
    </main>
  );
}
