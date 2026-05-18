'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useState } from 'react';

const polaroids = [
  {
    id: 'japan',
    title: 'Japan Summer',
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
    title: 'Morning Abroad',
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
    title: 'One Day Soon',
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
    title: 'Future Night',
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
    title: 'Made It Out',
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
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="relative grid h-[100svh] overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),transparent_22%,transparent_74%,rgba(255,255,255,0.05))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.17] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />

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
                className={`polaroid-card group absolute left-1/2 top-1/2 aspect-[0.78] w-[min(52vw,228px)] rounded-[3px] bg-[#fbfaf5] p-[10px] pb-[46px] text-black shadow-[0_22px_58px_rgba(0,0,0,.6)] ${card.zIndex} ${card.animation}`}>
                <div className="relative h-full overflow-hidden rounded-[3px] bg-neutral-900">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    loading="eager"
                    fetchPriority={card.id === 'japan' ? 'high' : undefined}
                    sizes="(max-width: 640px) 52vw, 228px"
                    className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] ${card.imageClassName}`}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="absolute inset-x-3 bottom-[10px] flex items-end justify-between gap-3 font-hand text-[22px] font-bold leading-none">
                  <span className="max-w-[68%]">{card.title}</span>
                  <span className="whitespace-nowrap text-[17px]">{card.date}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="landing-copy relative z-40 flex w-full max-w-[350px] flex-col items-center gap-5 text-center">
            <h1 className="landing-title max-w-[11ch] font-display text-[clamp(31px,10vw,52px)] font-black uppercase leading-[0.84] tracking-normal">
              See your future memories
            </h1>

            <form
              className="landing-form flex w-full flex-col gap-1.5 rounded-[27px] border border-white/10 bg-white/[0.08] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_14px_40px_rgba(0,0,0,.45)] backdrop-blur-xl"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}>
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
                className="min-h-11 flex-1 bg-transparent px-4 font-display text-[15px] font-semibold text-white outline-none placeholder:text-white/38"
              />
              <button
                type="submit"
                className="min-h-11 rounded-full bg-white px-5 font-display text-[12px] font-black uppercase tracking-normal text-black transition duration-200 hover:scale-[1.015] hover:bg-[#f5f0df] active:scale-[0.985]">
                see your future memories
              </button>
            </form>

            <p
              className={`h-4 font-display text-[12px] font-bold text-white/54 transition-opacity duration-300 ${
                submitted ? 'opacity-100' : 'opacity-0'
              }`}>
              You are on the list.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
