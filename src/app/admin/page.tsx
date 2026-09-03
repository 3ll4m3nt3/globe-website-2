import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated, loginAdmin } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const authenticated = await isAdminAuthenticated();

  if (authenticated) {
    redirect("/admin/editor");
  }

  async function loginAction(formData: FormData) {
    "use server";

    const password = String(formData.get("password") ?? "");
    const ok = await loginAdmin(password);

    if (!ok) {
      redirect("/admin?error=invalid-password");
    }

    redirect("/admin/editor");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-5 py-12">
      <div className="w-full rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">Admin</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-none">Gig Atlas editor</h1>

        {params.error === "invalid-password" && (
          <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Incorrect password.
          </p>
        )}

        {params.error === "unauthorized" && (
          <p className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Please sign in to continue.
          </p>
        )}

        <form action={loginAction} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[var(--muted)]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
              placeholder="Enter admin password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 text-sm text-[var(--muted)]">
          <Link href="/" className="text-[var(--foreground)] underline underline-offset-4">
            Return to the globe
          </Link>
        </div>
      </div>
    </main>
  );
}
