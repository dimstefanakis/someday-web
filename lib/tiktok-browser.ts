'use client';

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: TikTokQueue;
  }
}

type TikTokQueue = Array<unknown> & {
  identify?: (data: Record<string, string>) => void;
  page?: () => void;
  track?: (
    eventName: string,
    properties?: Record<string, unknown>,
    options?: { event_id?: string }
  ) => void;
};

const TIKTOK_PIXEL_CODE = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_CODE || '';

export function getTikTokPixelCode() {
  return TIKTOK_PIXEL_CODE;
}

export function trackTikTokSignup(eventId: string, email: string) {
  if (typeof window === 'undefined' || !TIKTOK_PIXEL_CODE) {
    return;
  }

  const track = () => {
    window.ttq?.identify?.({ email });
    window.ttq?.track?.(
      'CompleteRegistration',
      {
        content_name: 'Someday early access signup',
        content_type: 'waitlist',
      },
      { event_id: eventId }
    );
  };

  if (typeof window.ttq?.track === 'function') {
    track();
    return;
  }

  window.setTimeout(track, 250);
}

export function trackTikTokMemoryCreated(
  eventId: string,
  properties: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !TIKTOK_PIXEL_CODE) {
    return;
  }

  const track = () => {
    const payload = {
      content_name: 'Someday generated future memory',
      content_type: 'web_memory_generator',
      ...properties,
    };

    window.ttq?.track?.('SomedayMemoryCreated', payload, {
      event_id: eventId,
    });
    window.ttq?.track?.('CompleteRegistration', payload, {
      event_id: eventId,
    });
  };

  if (typeof window.ttq?.track === 'function') {
    track();
    return;
  }

  window.setTimeout(track, 250);
}
