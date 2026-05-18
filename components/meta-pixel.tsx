'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { getMetaPixelId, rememberAttributionFromBrowser } from '../lib/meta-browser';

export function MetaPixel() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);
  const pixelId = getMetaPixelId();

  useEffect(() => {
    rememberAttributionFromBrowser();

    if (
      lastPathname.current &&
      lastPathname.current !== pathname &&
      typeof window.fbq === 'function'
    ) {
      window.fbq('track', 'PageView');
    }

    lastPathname.current = pathname;
  }, [pathname]);

  if (!pixelId) {
    return null;
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          alt=""
          height="1"
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          style={{ display: 'none' }}
          width="1"
        />
      </noscript>
    </>
  );
}
