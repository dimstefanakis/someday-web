import { createHash } from 'node:crypto';
import type { MetaEventName } from './meta-events';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION ?? 'v23.0';

export type MetaServerEventInput = {
  clientIpAddress?: string;
  clientUserAgent?: string;
  customData?: Record<string, unknown>;
  email?: string;
  eventId?: string;
  eventName: MetaEventName;
  eventSourceUrl?: string;
  eventTime?: number;
  fbc?: string;
  fbp?: string;
};

export async function sendMetaConversionEvent({
  clientIpAddress,
  clientUserAgent,
  customData,
  email,
  eventId,
  eventName,
  eventSourceUrl,
  eventTime,
  fbc,
  fbp,
}: MetaServerEventInput) {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return false;
  }

  const payload = {
    data: [
      compactObject({
        action_source: 'website',
        custom_data:
          customData && Object.keys(customData).length > 0
            ? compactObject(customData)
            : undefined,
        event_id: eventId,
        event_name: eventName,
        event_source_url: eventSourceUrl,
        event_time: eventTime ?? Math.floor(Date.now() / 1000),
        user_data: compactObject({
          client_ip_address: clientIpAddress,
          client_user_agent: clientUserAgent,
          em: email ? [hashSha256(email)] : undefined,
          fbc,
          fbp,
        }),
      }),
    ],
    test_event_code: process.env.META_TEST_EVENT_CODE || undefined,
  };

  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
      accessToken
    )}`,
    {
      body: JSON.stringify(payload),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Meta returned ${response.status}: ${errorBody || 'Unknown error'}`
    );
  }

  return true;
}

export function getClientIpAddress(headersList: Headers) {
  const forwardedFor = headersList.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }

  return headersList.get('x-real-ip') || undefined;
}

function hashSha256(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => {
      const candidate = entry[1];

      if (candidate === undefined || candidate === null || candidate === '') {
        return false;
      }

      if (Array.isArray(candidate)) {
        return candidate.length > 0;
      }

      if (typeof candidate === 'object') {
        return Object.keys(candidate).length > 0;
      }

      return true;
    })
  ) as T;
}
