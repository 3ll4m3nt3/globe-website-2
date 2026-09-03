import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getAboutContent } from "@/lib/about-content";

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutContent();

  return {
    title: `${about.title} | SZABO MAN BAND`,
    description: about.summary,
  };
}

export default async function AboutPage() {
  const about = await getAboutContent();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
      >
        ← Back to the globe
      </Link>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow)]">
          <Image
            src="/me.png"
            alt="Portrait of SZABO MAN BAND"
            width={900}
            height={1100}
            priority
            className="h-full w-full rounded-[1.5rem] object-cover"
          />
        </div>

        <article className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">About</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight sm:text-6xl">
            {about.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            {about.summary}
          </p>

          <div className="about-copy mt-8">
            <ReactMarkdown>{about.body}</ReactMarkdown>
          </div>
        </article>
      </section>
    </main>
  );
}
