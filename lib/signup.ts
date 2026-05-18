export type SignupAttribution = {
  fbc?: string;
  fbp?: string;
  fbclid?: string;
  landingPath?: string;
  referrer?: string;
  ttclid?: string;
  ttp?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmMedium?: string;
  utmSource?: string;
  utmTerm?: string;
};

export type SignupSubmission = {
  attribution?: SignupAttribution;
  email: string;
  eventId?: string;
  pageUrl?: string;
  referrer?: string;
};

export type SignupFieldErrors = Partial<Record<'email' | 'form', string>>;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateSignupSubmission(
  input: unknown
):
  | { success: true; data: SignupSubmission }
  | { success: false; errors: SignupFieldErrors } {
  const candidate = (input ?? {}) as Record<string, unknown>;
  const email = normalizeEmail(asString(candidate.email));
  const eventId = asString(candidate.eventId).trim();
  const pageUrl = asString(candidate.pageUrl).trim();
  const referrer = asString(candidate.referrer).trim();
  const attribution = normalizeAttribution(candidate.attribution);
  const errors: SignupFieldErrors = {};

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email.';
  }

  if (pageUrl && pageUrl.length > 500) {
    errors.form = 'The captured page URL was unexpectedly long.';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      attribution,
      email,
      eventId: eventId || undefined,
      pageUrl: pageUrl || undefined,
      referrer: referrer || undefined,
    },
  };
}

function normalizeAttribution(value: unknown): SignupAttribution | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const attribution: SignupAttribution = {
    fbc: trimmed(candidate.fbc),
    fbp: trimmed(candidate.fbp),
    fbclid: trimmed(candidate.fbclid),
    landingPath: trimmed(candidate.landingPath),
    referrer: trimmed(candidate.referrer),
    ttclid: trimmed(candidate.ttclid),
    ttp: trimmed(candidate.ttp),
    utmCampaign: trimmed(candidate.utmCampaign),
    utmContent: trimmed(candidate.utmContent),
    utmMedium: trimmed(candidate.utmMedium),
    utmSource: trimmed(candidate.utmSource),
    utmTerm: trimmed(candidate.utmTerm),
  };

  return Object.values(attribution).some(Boolean) ? attribution : undefined;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function trimmed(value: unknown) {
  const text = asString(value).trim();
  return text || undefined;
}
