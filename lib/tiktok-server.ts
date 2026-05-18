import { createHash } from 'node:crypto';

const TIKTOK_API_VERSION = process.env.TIKTOK_API_VERSION ?? 'v1.3';

export type TikTokServerEventInput = {
  clientIpAddress?: string;
  clientUserAgent?: string;
  email?: string;
  eventId: string;
  eventSourceUrl?: string;
  eventTime?: number;
  referrer?: string;
  ttclid?: string;
  ttp?: string;
};

export async function sendTikTokConversionEvent({
  clientIpAddress,
  clientUserAgent,
  email,
  eventId,
  eventSourceUrl,
  eventTime,
  referrer,
  ttclid,
  ttp,
}: TikTokServerEventInput) {
  const pixelCode =
    process.env.TIKTOK_PIXEL_CODE || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_CODE;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!pixelCode || !accessToken) {
    return false;
  }

  const payload = {
    data: [
      compactObject({
        event: 'CompleteRegistration',
        event_id: eventId,
        event_time: eventTime ?? Math.floor(Date.now() / 1000),
        page: compactObject({
          referrer,
          url: eventSourceUrl,
        }),
        properties: {
          content_name: 'Someday early access signup',
          content_type: 'waitlist',
        },
        user: compactObject({
          email: email ? hashSha256(email) : undefined,
          ip: clientIpAddress,
          ttclid,
          ttp,
          user_agent: clientUserAgent,
        }),
      }),
    ],
    event_source: 'web',
    event_source_id: pixelCode,
    test_event_code: process.env.TIKTOK_TEST_EVENT_CODE || undefined,
  };

  const response = await fetch(
    `https://business-api.tiktok.com/open_api/${TIKTOK_API_VERSION}/event/track/`,
    {
      body: JSON.stringify(payload),
      cache: 'no-store',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `TikTok returned ${response.status}: ${errorBody || 'Unknown error'}`
    );
  }

  const responseBody = (await response.json().catch(() => null)) as
    | { code?: number; message?: string }
    | null;

  if (responseBody?.code && responseBody.code !== 0) {
    throw new Error(
      `TikTok returned code ${responseBody.code}: ${
        responseBody.message || 'Unknown error'
      }`
    );
  }

  return true;
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

      if (typeof candidate === 'object' && !Array.isArray(candidate)) {
        return Object.keys(candidate).length > 0;
      }

      return true;
    })
  ) as T;
}
