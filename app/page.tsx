'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
  collectSignupAttribution,
  createMetaEventId,
  trackMetaSignup,
} from '../lib/meta-browser';
import { trackTikTokSignup } from '../lib/tiktok-browser';

const polaroids = [
  {
    id: 'japan',
    title: 'Japan Summer Trip',
    date: 'May 2027',
    image: '/images/polaroid-1.jpg',
    alt: 'A Someday polaroid memory from a future Japan trip',
    imageClassName: 'object-[50%_50%]',
    zIndex: 'z-50',
    animation: 'card-enter-left',
    pose: { '--card-x': '0px', '--card-y': '-10px', '--card-rotate': '-2.4deg', '--card-scale': '0.98', '--card-delay': '560ms' },
  },
  {
    id: 'coffee',
    title: 'Paris Weekend',
    date: 'Aug 2027',
    image: '/images/polaroid-2.jpg',
    alt: 'Two friends in a future cafe memory',
    imageClassName: 'object-[50%_50%] saturate-[1.04] brightness-[0.98]',
    zIndex: 'z-30',
    animation: 'card-enter-right',
    pose: { '--card-x': '88px', '--card-y': '-34px', '--card-rotate': '10deg', '--card-scale': '0.86', '--card-delay': '380ms' },
  },
  {
    id: 'afterparty',
    title: 'Birthday Weekend',
    date: '2028',
    image: '/images/polaroid-3.jpg',
    alt: 'A warm future memory with friends',
    imageClassName: 'object-[50%_50%] contrast-[1.03] brightness-[0.94]',
    zIndex: 'z-20',
    animation: 'card-enter-left',
    pose: { '--card-x': '-88px', '--card-y': '-32px', '--card-rotate': '-10.5deg', '--card-scale': '0.86', '--card-delay': '220ms' },
  },
  {
    id: 'night',
    title: 'Tokyo Nights',
    date: 'Soon',
    image: '/images/polaroid-4.jpg',
    alt: 'A future memory polaroid from Someday',
    imageClassName: 'object-[50%_50%] saturate-[1.06] brightness-[0.96]',
    zIndex: 'z-40',
    animation: 'card-enter-right',
    pose: { '--card-x': '-72px', '--card-y': '30px', '--card-rotate': '-7.2deg', '--card-scale': '0.88', '--card-delay': '100ms' },
  },
  {
    id: 'summer',
    title: 'Lake House Summer',
    date: 'Later',
    image: '/images/polaroid-2.jpg',
    alt: 'A second lower polaroid from Someday',
    imageClassName: 'object-[62%_50%] saturate-[1.03] brightness-[0.92]',
    zIndex: 'z-10',
    animation: 'card-enter-left',
    pose: { '--card-x': '76px', '--card-y': '34px', '--card-rotate': '7.8deg', '--card-scale': '0.87', '--card-delay': '40ms' },
  },
];

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadedImages, setLoadedImages] = useState<ReadonlySet<string>>(() => new Set());
  const [introReady, setIntroReady] = useState(false);

  useEffect(() => {
    if (loadedImages.size !== polaroids.length) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const startIntro = () => {
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          setIntroReady(true);
        }
      }, 120);
    };

    void (document.fonts?.ready ?? Promise.resolve()).then(startIntro, startIntro);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [loadedImages.size]);

  async function submitSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const eventId = createMetaEventId('someday_signup');

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/signups', {
        body: JSON.stringify({
          attribution: collectSignupAttribution(),
          email,
          eventId,
          pageUrl: window.location.href,
          referrer: document.referrer || undefined,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; eventId?: string; ok?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save your spot.');
      }

      trackMetaSignup(payload?.eventId || eventId, email);
      trackTikTokSignup(payload?.eventId || eventId, email);
      setSubmitted(true);
    } catch (error) {
      setSubmitted(false);
      setSubmitError(
        error instanceof Error ? error.message : 'Could not save your spot.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid h-[100svh] overflow-hidden bg-black text-white">
      <section className="relative mx-auto flex h-full w-full max-w-[500px] flex-col items-center px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        <p className="absolute left-5 top-[max(18px,env(safe-area-inset-top))] z-40 font-display text-[19px] font-black uppercase leading-[0.9] tracking-normal sm:left-7">
          Some
          <br />
          Day.
        </p>

        <div className="landing-shell flex flex-1 flex-col items-center justify-center gap-16 pt-10">
          <div className="landing-stage relative h-[min(39svh,332px)] w-full max-w-[360px]">
            <div className="absolute left-1/2 top-1/2 h-[82%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-[38px] bg-white/10 blur-3xl" />
            {polaroids.map((card) => (
              <article
                key={card.id}
                style={card.pose as CSSProperties}
                className={`polaroid-card group absolute left-1/2 top-1/2 w-[min(52vw,228px)] rounded-[3px] bg-[#fbfaf5] p-[10px] pb-[86px] text-black shadow-[0_22px_58px_rgba(0,0,0,.6)] ${card.zIndex} ${
                  introReady ? card.animation : 'card-waiting'
                }`}>
                <div className="relative aspect-square w-full overflow-hidden rounded-[3px] bg-neutral-900">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    loading="eager"
                    fetchPriority={card.id === 'japan' ? 'high' : undefined}
                    sizes="(max-width: 640px) 52vw, 228px"
                    className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] ${card.imageClassName}`}
                    onLoad={() => {
                      setLoadedImages((currentLoadedImages) => {
                        if (currentLoadedImages.has(card.id)) {
                          return currentLoadedImages;
                        }

                        const nextLoadedImages = new Set(currentLoadedImages);
                        nextLoadedImages.add(card.id);
                        return nextLoadedImages;
                      });
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="absolute inset-x-3 bottom-[35px] flex min-h-[57px] flex-col justify-center font-hand font-bold leading-none">
                  <span className="max-w-[78%] text-[22px] leading-[0.92]">{card.title}</span>
                </div>
                <span className="absolute bottom-[10px] right-3 whitespace-nowrap font-hand text-[17px] font-bold leading-none">
                  {card.date}
                </span>
              </article>
            ))}
          </div>

          <div className="landing-copy relative z-40 flex w-full max-w-[350px] flex-col items-center gap-5 text-center">
            <h1 className="landing-title font-display text-[clamp(31px,10vw,52px)] font-black uppercase leading-[0.84] tracking-normal">
              <span className="whitespace-nowrap">Future photos</span>
              <br />
              <span className="whitespace-nowrap">with your gc</span>
            </h1>

            <form
              className="landing-form flex w-full flex-col gap-1.5 rounded-[27px] border border-white/10 bg-white/[0.08] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_14px_40px_rgba(0,0,0,.45)] backdrop-blur-xl"
              onSubmit={submitSignup}>
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubmitError('');
                  setSubmitted(false);
                }}
                disabled={isSubmitting}
                className="min-h-11 flex-1 bg-transparent px-4 font-display text-[15px] font-semibold text-white outline-none placeholder:text-white/38"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-11 rounded-full bg-white px-5 font-display text-[12px] font-black uppercase tracking-normal text-black transition duration-200 hover:scale-[1.015] hover:bg-[#f5f0df] active:scale-[0.985]">
                {isSubmitting ? 'Saving...' : 'Unlock your future camera roll'}
              </button>
            </form>

            <p
              className={`h-4 font-display text-[12px] font-bold transition-opacity duration-300 ${
                submitted || submitError ? 'opacity-100' : 'opacity-0'
              } ${submitError ? 'text-white/72' : 'text-white/54'}`}>
              {submitError
                ? submitError
                : submitted
                  ? 'You are on the list.'
                  : ' '}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
