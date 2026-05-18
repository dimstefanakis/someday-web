'use client';

import type { MetaEventName } from './meta-events';
import type { SignupAttribution } from './signup';

declare global {
  interface Window {
    _fbq?: unknown;
    fbq?: (...args: unknown[]) => void;
  }
}

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const ATTRIBUTION_COOKIE_DAYS = 90;

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

export function getMetaPixelId() {
  return META_PIXEL_ID;
}

export function createMetaEventId(prefix = 'meta_event') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function rememberAttributionFromBrowser() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const fbclid = url.searchParams.get('fbclid');
  const ttclid = url.searchParams.get('ttclid');

  if (fbclid) {
    const existingFbc = readCookie('_fbc') ?? readCookie('someday_fbc');
    const fbc = existingFbc || `fb.1.${Date.now()}.${fbclid}`;
    writeCookie('someday_fbc', fbc, ATTRIBUTION_COOKIE_DAYS);
    writeCookie('someday_fbclid', fbclid, ATTRIBUTION_COOKIE_DAYS);
  }

  const fbp = readCookie('_fbp');
  if (fbp) {
    writeCookie('someday_fbp', fbp, ATTRIBUTION_COOKIE_DAYS);
  }

  if (ttclid) {
    writeCookie('someday_ttclid', ttclid, ATTRIBUTION_COOKIE_DAYS);
  }

  const ttp = readCookie('_ttp');
  if (ttp) {
    writeCookie('someday_ttp', ttp, ATTRIBUTION_COOKIE_DAYS);
  }

  const utmValues = Object.fromEntries(
    UTM_KEYS.map((key) => [key, url.searchParams.get(key)?.trim()]).filter(
      (entry): entry is [string, string] => Boolean(entry[1])
    )
  );

  if (Object.keys(utmValues).length > 0) {
    writeCookie(
      'someday_utm',
      JSON.stringify(utmValues),
      ATTRIBUTION_COOKIE_DAYS
    );
  }

  if (!readCookie('someday_landing_path')) {
    writeCookie(
      'someday_landing_path',
      `${url.pathname}${url.search}`,
      ATTRIBUTION_COOKIE_DAYS
    );
  }

  if (document.referrer && !readCookie('someday_referrer')) {
    writeCookie('someday_referrer', document.referrer, ATTRIBUTION_COOKIE_DAYS);
  }
}

export function collectSignupAttribution(): SignupAttribution {
  if (typeof window === 'undefined') {
    return {};
  }

  const url = new URL(window.location.href);
  const utmPayload = parseJson<Record<string, string>>(readCookie('someday_utm'));

  return {
    fbc: readCookie('_fbc') ?? readCookie('someday_fbc') ?? undefined,
    fbp: readCookie('_fbp') ?? readCookie('someday_fbp') ?? undefined,
    fbclid: url.searchParams.get('fbclid') ?? readCookie('someday_fbclid') ?? undefined,
    landingPath:
      readCookie('someday_landing_path') ?? `${url.pathname}${url.search}`,
    referrer: document.referrer || readCookie('someday_referrer') || undefined,
    ttclid:
      url.searchParams.get('ttclid') ?? readCookie('someday_ttclid') ?? undefined,
    ttp: readCookie('_ttp') ?? readCookie('someday_ttp') ?? undefined,
    utmCampaign:
      url.searchParams.get('utm_campaign') ??
      utmPayload?.utm_campaign ??
      undefined,
    utmContent:
      url.searchParams.get('utm_content') ?? utmPayload?.utm_content ?? undefined,
    utmMedium:
      url.searchParams.get('utm_medium') ?? utmPayload?.utm_medium ?? undefined,
    utmSource:
      url.searchParams.get('utm_source') ?? utmPayload?.utm_source ?? undefined,
    utmTerm: url.searchParams.get('utm_term') ?? utmPayload?.utm_term ?? undefined,
  };
}

export function trackMetaSignup(eventId: string, email: string) {
  const emailDomain = email.split('@')[1] || '';

  trackMetaBrowserEvent({
    customData: {
      content_category: 'Waitlist',
      content_name: 'Someday early access signup',
      email_domain: emailDomain,
    },
    eventId,
    eventName: 'Lead',
  });

  trackMetaBrowserEvent({
    customData: {
      content_category: 'Waitlist',
      content_name: 'Someday early access signup',
      email_domain: emailDomain,
    },
    eventId,
    eventName: 'CompleteRegistration',
  });
}

function trackMetaBrowserEvent({
  attempt = 0,
  customData,
  eventId,
  eventName,
}: {
  attempt?: number;
  customData?: Record<string, unknown>;
  eventId: string;
  eventName: MetaEventName;
}) {
  if (typeof window === 'undefined' || !META_PIXEL_ID) {
    return;
  }

  if (typeof window.fbq !== 'function') {
    if (attempt >= 8) {
      return;
    }

    window.setTimeout(() => {
      trackMetaBrowserEvent({
        attempt: attempt + 1,
        customData,
        eventId,
        eventName,
      });
    }, 250);
    return;
  }

  window.fbq('track', eventName, customData || {}, { eventID: eventId });
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readCookie(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const encodedPrefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(encodedPrefix));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(encodedPrefix.length));
}

function writeCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${days * 24 * 60 * 60}`,
    'SameSite=Lax',
  ].join('; ');
}
