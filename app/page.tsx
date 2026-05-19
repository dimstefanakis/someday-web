'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  collectSignupAttribution,
  createMetaEventId,
  trackMetaSignup,
} from '../lib/meta-browser';
import { trackTikTokSignup } from '../lib/tiktok-browser';

const railPolaroids = [
  {
    id: 'japan',
    title: 'Hawaii Summer',
    date: 'May 2027',
    image: '/images/polaroid-1.jpg',
    alt: 'A Someday polaroid memory from a future Japan trip',
    imageClassName: 'object-[50%_50%]',
    railClassName: 'rotate-[-7deg] translate-y-2',
  },
  {
    id: 'coffee',
    title: 'Greek Weekend',
    date: 'Aug 2027',
    image: '/images/polaroid-2.jpg',
    alt: 'Two friends in a future cafe memory',
    imageClassName: 'object-[50%_50%] saturate-[1.04] brightness-[0.98]',
    railClassName: 'rotate-[4deg] -translate-y-1',
  },
  {
    id: 'afterparty',
    title: 'Birthday',
    date: '2028',
    image: '/images/polaroid-3.jpg',
    alt: 'A warm future memory with friends',
    imageClassName: 'object-[50%_50%] contrast-[1.03] brightness-[0.94]',
    railClassName: 'rotate-[-2deg] translate-y-3',
  },
  {
    id: 'night',
    title: 'Tokyo Nights',
    date: 'Soon',
    image: '/images/polaroid-4.jpg',
    alt: 'A future memory polaroid from Someday',
    imageClassName: 'object-[50%_50%] saturate-[1.06] brightness-[0.96]',
    railClassName: 'rotate-[8deg] -translate-y-2',
  },
];

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
      <section className="relative mx-auto flex h-full w-full max-w-[520px] flex-col px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between">
          <p className="font-display text-[19px] font-black uppercase leading-[0.9] tracking-normal text-white">
            Some
            <br />
            Day.
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-3 pt-8">
          <div className="max-w-[390px] font-display text-[clamp(15px,4.15vw,17px)] font-medium leading-[1.31] tracking-normal text-white">
            <p>
              We built this because people keep postponing the life they want.
            </p>

            <div className="mt-6 space-y-4">
              <p>Everyone has a plan sitting in the group chat.</p>

              <p className="font-bold leading-[1.28]">
                We should go to Japan.
                <br />
                We should rent a house this summer.
                <br />
                We should move cities.
              </p>

              <p>
                <span className="font-bold">Someday</span> turns those plans
                into photos before they happen.
              </p>
            </div>
          </div>

          <div className="relative -mx-5 h-[154px] overflow-visible">
            <div className="absolute left-1/2 top-3 flex w-[620px] -translate-x-1/2 items-start justify-center">
              {railPolaroids.map((card) => (
                <article
                  key={card.id}
                  className={`relative mx-[-8px] w-[116px] shrink-0 rounded-[3px] bg-[#fbfaf5] p-[7px] pb-[42px] text-black shadow-[0_18px_40px_rgba(0,0,0,.55)] ${card.railClassName}`}>
                  <div className="relative aspect-square w-full overflow-hidden rounded-[3px] bg-neutral-900">
                    <Image
                      src={card.image}
                      alt={card.alt}
                      fill
                      loading="eager"
                      sizes="116px"
                      className={`object-cover ${card.imageClassName}`}
                    />
                  </div>
                  <span className="absolute inset-x-2 bottom-[16px] max-w-[78%] font-hand text-[16px] font-bold leading-[0.9]">
                    {card.title}
                  </span>
                  <span className="absolute bottom-[7px] right-2 whitespace-nowrap font-hand text-[11px] font-bold leading-none">
                    {card.date}
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="relative z-40 flex w-full max-w-[350px] flex-col gap-2 self-center">
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
                {isSubmitting ? 'Saving...' : 'See the future'}
              </button>
            </form>

            <p
              className={`h-4 text-center font-display text-[12px] font-bold transition-opacity duration-300 ${
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
