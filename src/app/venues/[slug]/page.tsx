import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getAllVenues, getVenueBySlug, getVenueSlugs } from "@/lib/venues";

export const dynamicParams = true;

type VenuePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getVenueSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: VenuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  if (!venue) {
    return {
      title: "Venue not found | Gig Atlas",
    };
  }

  return {
    title: `${venue.name} | Gig Atlas`,
    description: venue.summary,
  };
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { slug } = await params;
  const [venue, allVenues] = await Promise.all([
    getVenueBySlug(slug),
    getAllVenues(),
  ]);

  if (!venue) {
    notFound();
  }

  const relatedVenues = allVenues.filter((entry) => entry.slug !== venue.slug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
      >
        ← Back to the globe
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow)] sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
            {venue.city}, {venue.country}
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight sm:text-6xl">
            {venue.name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            {venue.summary}
          </p>

          <div className="mt-8 grid gap-4">
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                Gig entries
              </p>
              <p className="mt-2 text-2xl font-semibold">{venue.gigs.length}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
          <Image
            src={venue.heroImage.src}
            alt={venue.heroImage.alt}
            width={venue.heroImage.width}
            height={venue.heroImage.height}
            priority
            className="h-full min-h-[22rem] w-full object-cover"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
            Gig history
          </p>
          <div className="mt-5 space-y-4">
            {venue.gigs.map((gig) => (
              <article
                key={`${gig.date}-${gig.title}`}
                className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  {gig.date}
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight">
                  {gig.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {gig.note}
                </p>
              </article>
            ))}
          </div>
        </div>

        <article className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
            Venue notes
          </p>
          <div className="venue-copy mt-6">
            <ReactMarkdown>{venue.body}</ReactMarkdown>
          </div>
        </article>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
              Photo gallery
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none">
              Visual fragments from the room.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[var(--muted)]">
            The starter gallery is seeded with placeholder artwork so the layout and CMS schema can be exercised immediately.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {venue.gallery.map((image) => (
            <figure
              key={image.src}
              className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]"
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                className="aspect-[4/3] h-full w-full object-cover"
              />
              <figcaption className="border-t border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
                {image.alt}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface-strong)] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
            Videos
          </p>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {venue.videos.map((video, index) => {
              const hasSource = video.source.trim().length > 0;
              const hasEmbed = video.embedUrl.trim().length > 0;

              if (!hasSource && !hasEmbed) {
                return null;
              }

              return (
                <article key={`${video.title}-${index}`} className="space-y-3">
                  <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-black">
                    {hasSource ? (
                      <video
                        src={video.source}
                        poster={video.poster || undefined}
                        controls
                        preload="metadata"
                        className="aspect-video w-full"
                      />
                    ) : (
                      <iframe
                        src={video.embedUrl}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="aspect-video w-full"
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight">
                      {video.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {video.caption}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
            More venues
          </p>
          <div className="mt-5 space-y-3">
            {relatedVenues.map((entry) => (
              <Link
                key={entry.slug}
                href={`/venues/${entry.slug}`}
                className="block rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-strong)]"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {entry.city}, {entry.country}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight">
                  {entry.name}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {entry.summary}
                </p>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}