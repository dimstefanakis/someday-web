'use client';

import Image from 'next/image';
import Link from 'next/link';
import { track } from '@vercel/analytics';

const railPolaroids = [
  {
    id: 'hawaii',
    title: 'Hawaii Summer',
    date: 'May 2027',
    image: '/images/polaroid-1.jpg',
    alt: 'A Someday polaroid memory from a future trip',
    imageClassName: 'object-[50%_50%]',
    railClassName: 'rotate-[-7deg] translate-y-2',
  },
  {
    id: 'greek',
    title: 'Greek Weekend',
    date: 'Aug 2027',
    image: '/images/polaroid-2.jpg',
    alt: 'Two friends in a future weekend memory',
    imageClassName: 'object-[50%_50%] saturate-[1.04] brightness-[0.98]',
    railClassName: 'rotate-[4deg] -translate-y-1',
  },
  {
    id: 'birthday',
    title: 'Birthday',
    date: '2028',
    image: '/images/polaroid-3.jpg',
    alt: 'A warm future memory with friends',
    imageClassName: 'object-[50%_50%] contrast-[1.03] brightness-[0.94]',
    railClassName: 'rotate-[-2deg] translate-y-3',
  },
  {
    id: 'tokyo',
    title: 'Tokyo Nights',
    date: 'Soon',
    image: '/images/polaroid-4.jpg',
    alt: 'A future memory polaroid from Someday',
    imageClassName: 'object-[50%_50%] saturate-[1.06] brightness-[0.96]',
    railClassName: 'rotate-[8deg] -translate-y-2',
  },
];

export default function Home() {
  return (
    <main className="relative grid h-[100svh] overflow-hidden bg-black text-white">
      <section className="relative mx-auto flex h-full w-full max-w-[520px] flex-col px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
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
            <Link
              href="/try"
              onClick={() => track('try_memory_clicked')}
              className="flex min-h-14 w-full items-center justify-center rounded-full bg-white px-6 text-center font-display text-[13px] font-black uppercase tracking-normal text-black shadow-[0_18px_48px_rgba(255,255,255,.16)] transition duration-200 hover:scale-[1.015] hover:bg-[#f5f0df] active:scale-[0.985]">
              See it before it happens
            </Link>
            <p className="text-center font-display text-[12px] font-bold text-white/44">
              Name the plan. Add your people. Get the first photo.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
