export const META_EVENT_NAMES = [
  'CompleteRegistration',
  'Lead',
  'PageView',
] as const;

export type MetaEventName = (typeof META_EVENT_NAMES)[number];

export type MetaEventPayload = {
  customData?: Record<string, unknown>;
  email?: string;
  eventId?: string;
  eventName: MetaEventName;
  eventSourceUrl?: string;
  fbc?: string;
  fbp?: string;
};
