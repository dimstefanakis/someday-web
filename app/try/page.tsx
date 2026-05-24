'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { useEffect, useState } from 'react';
import { MEMORY_DRAFT_KEY, normalizeAlbumTitle } from '../../lib/memory-flow';

export default function TryMemoryPage() {
  const router = useRouter();
  const [albumTitle, setAlbumTitle] = useState('Japan 2027');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = window.sessionStorage.getItem(MEMORY_DRAFT_KEY);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { albumTitle?: string };

      if (parsed.albumTitle) {
        setAlbumTitle(parsed.albumTitle);
      }
    } catch {
      window.sessionStorage.removeItem(MEMORY_DRAFT_KEY);
    }
  }, []);

  function submitAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = normalizeAlbumTitle(albumTitle);

    if (normalizedTitle.length < 2) {
      setError('Name the plan first.');
      return;
    }

    window.sessionStorage.setItem(
      MEMORY_DRAFT_KEY,
      JSON.stringify({ albumTitle: normalizedTitle })
    );
    track('memory_album_started', { albumTitle: normalizedTitle });
    router.push('/try/people');
  }

  return (
    <main className="min-h-[100svh] bg-black px-5 pb-[max(22px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] text-white">
      <section className="mx-auto flex min-h-[calc(100svh-40px)] w-full max-w-[520px] flex-col">
        <header className="flex items-start justify-between">
          <Link
            href="/"
            className="font-display text-[19px] font-black uppercase leading-[0.9] tracking-normal text-white">
            Some
            <br />
            Day.
          </Link>
        </header>

        <form
          onSubmit={submitAlbum}
          className="flex flex-1 flex-col justify-center gap-8 py-10">
          <div className="space-y-4">
            <h1 className="max-w-[430px] font-display text-[clamp(38px,11vw,62px)] font-black leading-[0.92] tracking-normal">
              What&apos;s sitting in the group chat?
            </h1>
            <p className="max-w-[330px] font-display text-[15px] font-semibold leading-[1.35] text-white/58">
              Name the trip, night, or someday-plan you keep talking about.
            </p>
          </div>

          <div className="space-y-3">
            <label
              className="sr-only"
              htmlFor="albumTitle">
              Plan name
            </label>
            <input
              id="albumTitle"
              name="albumTitle"
              value={albumTitle}
              onChange={(event) => {
                setAlbumTitle(event.target.value);
                setError('');
              }}
              placeholder="Japan 2027"
              autoComplete="off"
              className="min-h-16 w-full rounded-[30px] border border-white/12 bg-white/[0.08] px-5 font-display text-[22px] font-black text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.12)] placeholder:text-white/24 focus:border-white/34"
            />
            <p
              className={`h-5 px-2 font-display text-[12px] font-bold ${
                error ? 'text-white/70' : 'text-white/34'
              }`}>
              {error || 'Try Hawaii summer, Greek weekend, or New York 2028.'}
            </p>
          </div>

          <button
            type="submit"
            className="min-h-14 w-full rounded-full bg-white px-6 font-display text-[13px] font-black uppercase tracking-normal text-black transition duration-200 hover:scale-[1.015] hover:bg-[#f5f0df] active:scale-[0.985]">
            Add your people
          </button>
        </form>
      </section>
    </main>
  );
}
