"use client";

import { VenueGlobe } from "@/components/globe/venue-globe";
import type { VenueMapItem } from "@/types/venue";

type GlobeLandingProps = {
  venues: VenueMapItem[];
};

export function GlobeLanding({ venues }: GlobeLandingProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-3 py-3 sm:px-4 lg:px-5">
      <section className="relative min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[radial-gradient(circle_at_top,rgba(244,162,97,0.18),transparent_30%),linear-gradient(180deg,rgba(12,18,25,0.96),rgba(9,14,20,0.98))] shadow-[var(--shadow)]">
        <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
          <img
            src="/me.png"
            alt="Portrait"
            className="h-20 w-20 rounded-full border border-white/20 object-cover shadow-[0_0_30px_rgba(255,255,255,0.28)] transition-all duration-700 ease-out sm:h-24 sm:w-24"
          />
        </div>

        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-6 sm:pt-8">
          <h1
            className="text-center text-2xl font-black uppercase tracking-[0.25em] text-white/90 sm:text-4xl lg:text-5xl"
            style={{
              WebkitTextStroke: "1px rgba(0, 0, 0, 0.65)",
              textShadow:
                "0 0 2px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.75), 0 0 1px rgba(255,255,255,0.8)",
            }}
          >
            SZABO MAN BAND
          </h1>
        </header>
        <div className="absolute inset-0">
          <VenueGlobe venues={venues} />
        </div>
      </section>
    </main>
  );
}
