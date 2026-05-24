'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { useEffect, useState } from 'react';
import {
  MEMORY_DRAFT_KEY,
  MEMORY_RESULT_KEY,
  MemoryResult,
} from '../../../lib/memory-flow';

export default function TryResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<MemoryResult | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(MEMORY_RESULT_KEY);

    if (!stored) {
      router.replace('/try');
      return;
    }

    try {
      setResult(JSON.parse(stored) as MemoryResult);
    } catch {
      router.replace('/try');
    }
  }, [router]);

  function downloadImage() {
    if (!result?.image) {
      return;
    }

    const link = document.createElement('a');
    link.href = result.image;
    link.download = `${result.albumTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'someday-memory'}.png`;
    link.click();
    track('memory_download_clicked', { albumTitle: result.albumTitle });
  }

  async function shareImage() {
    if (!result?.image) {
      return;
    }

    track('memory_share_clicked', { albumTitle: result.albumTitle });

    try {
      const response = await fetch(result.image);
      const blob = await response.blob();
      const file = new File([blob], 'someday-memory.png', {
        type: blob.type || 'image/png',
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `Made this future memory for ${result.albumTitle} on Someday.`,
          title: result.albumTitle,
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.origin);
    } catch {
      downloadImage();
    }
  }

  function startOver() {
    window.sessionStorage.removeItem(MEMORY_DRAFT_KEY);
    window.sessionStorage.removeItem(MEMORY_RESULT_KEY);
    track('memory_start_over_clicked');
    router.push('/try');
  }

  return (
    <main className="min-h-[100svh] bg-black px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] text-white">
      <section className="mx-auto flex min-h-[calc(100svh-42px)] w-full max-w-[560px] flex-col gap-6">
        <header className="flex items-start justify-between">
          <Link
            href="/"
            className="font-display text-[19px] font-black uppercase leading-[0.9] tracking-normal text-white">
            Some
            <br />
            Day.
          </Link>
        </header>

        <div className="space-y-2">
          <p className="font-display text-[12px] font-black uppercase text-white/42">
            {result?.albumTitle || 'Your memory'}
          </p>
          <h1 className="font-display text-[clamp(34px,9.6vw,56px)] font-black leading-[0.94] tracking-normal">
            First photo before it happens.
          </h1>
        </div>

        <div className="flex flex-1 items-center justify-center py-2">
          <div className="flex w-full max-w-[390px] flex-col rounded-[10px] bg-[#fbfaf5] p-[13px] shadow-[0_28px_80px_rgba(0,0,0,.65)]">
            <div className="relative aspect-square w-full overflow-hidden rounded-[6px] bg-neutral-950">
              {result?.image ? (
                <img
                  src={result.image}
                  alt={`Generated memory for ${result.albumTitle}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-white/10" />
              )}
            </div>
            <div className="grid min-h-[116px] grid-rows-[1fr_auto] pt-[18px] text-black">
              <p className="max-w-[74%] font-hand text-[30px] font-bold leading-[0.92]">
                {result?.albumTitle || 'Someday'}
              </p>
              <p className="justify-self-end font-hand text-[22px] font-bold leading-none">
                {new Date().toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={downloadImage}
            disabled={!result?.image}
            className="min-h-13 rounded-full bg-white px-4 font-display text-[12px] font-black uppercase text-black transition hover:bg-[#f5f0df] disabled:opacity-50">
            Download
          </button>
          <button
            type="button"
            onClick={() => void shareImage()}
            disabled={!result?.image}
            className="min-h-13 rounded-full border border-white/16 px-4 font-display text-[12px] font-black uppercase text-white transition hover:border-white/34 disabled:opacity-50">
            Share
          </button>
          <button
            type="button"
            onClick={startOver}
            className="col-span-2 min-h-11 rounded-full px-4 font-display text-[11px] font-black uppercase text-white/42 transition hover:text-white">
            Make another
          </button>
        </div>
      </section>
    </main>
  );
}
