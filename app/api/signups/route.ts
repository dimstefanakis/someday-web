import { cookies, headers } from 'next/headers';
import {
  type SignupAttribution,
  type SignupSubmission,
  validateSignupSubmission,
} from '../../../lib/signup';
import {
  getClientIpAddress,
  sendMetaConversionEvent,
} from '../../../lib/meta-server';
import { sendTikTokConversionEvent } from '../../../lib/tiktok-server';

export const runtime = 'nodejs';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const validation = validateSignupSubmission(payload);

  if (!validation.success) {
    return Response.json(
      {
        error: firstError(validation.errors) || 'The signup payload is invalid.',
        fields: validation.errors,
      },
      { status: 400 }
    );
  }

  const missingConfig = getMissingAirtableConfig();

  if (missingConfig.length > 0) {
    return Response.json(
      {
        error: `Missing Airtable configuration: ${missingConfig.join(', ')}`,
      },
      { status: 503 }
    );
  }

  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const attribution = mergeAttribution(validation.data, cookieStore);
  const clientIpAddress = getClientIpAddress(requestHeaders);
  const clientUserAgent = requestHeaders.get('user-agent') || undefined;
  const eventId = validation.data.eventId || createServerEventId();
  const eventCustomData = {
    content_category: 'Waitlist',
    content_name: 'Someday early access signup',
    email_domain: validation.data.email.split('@')[1] || '',
  };

  const [airtableResult, analyticsResult] = await Promise.allSettled([
    writeSignupToAirtable(validation.data, attribution, eventId),
    Promise.all([
      sendMetaConversionEvent({
        clientIpAddress,
        clientUserAgent,
        customData: eventCustomData,
        email: validation.data.email,
        eventId,
        eventName: 'Lead',
        eventSourceUrl: validation.data.pageUrl,
        fbc: attribution.fbc,
        fbp: attribution.fbp,
      }),
      sendMetaConversionEvent({
        clientIpAddress,
        clientUserAgent,
        customData: eventCustomData,
        email: validation.data.email,
        eventId,
        eventName: 'CompleteRegistration',
        eventSourceUrl: validation.data.pageUrl,
        fbc: attribution.fbc,
        fbp: attribution.fbp,
      }),
      sendTikTokConversionEvent({
        clientIpAddress,
        clientUserAgent,
        email: validation.data.email,
        eventId,
        eventSourceUrl: validation.data.pageUrl,
        referrer: attribution.referrer || validation.data.referrer,
        ttclid: attribution.ttclid,
        ttp: attribution.ttp,
      }),
    ]),
  ]);

  if (airtableResult.status === 'rejected') {
    console.error('Airtable signup write failed', airtableResult.reason);

    if (analyticsResult.status === 'rejected') {
      console.error('Analytics tracking also failed', analyticsResult.reason);
    }

    return Response.json(
      {
        error:
          'We could not save your signup right now. Please try again in a moment.',
      },
      { status: 502 }
    );
  }

  if (analyticsResult.status === 'rejected') {
    console.error('Analytics tracking failed', analyticsResult.reason);
  }

  const [leadTracked, registrationTracked, tikTokTracked] =
    analyticsResult.status === 'fulfilled'
      ? analyticsResult.value
      : [false, false, false];

  return Response.json({
    eventId,
    metaTracked: leadTracked || registrationTracked,
    ok: true,
    tikTokTracked,
  });
}

async function writeSignupToAirtable(
  submission: SignupSubmission,
  attribution: SignupAttribution,
  eventId: string
) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('Airtable configuration is incomplete.');
  }

  const field = getAirtableFieldNames();
  const fields: Record<string, string> = {
    [field.email]: submission.email,
    [field.pageUrl]: submission.pageUrl || '',
    [field.landingPath]: attribution.landingPath || '',
    [field.referrer]: attribution.referrer || submission.referrer || '',
    [field.utmSource]: attribution.utmSource || '',
    [field.utmMedium]: attribution.utmMedium || '',
    [field.utmCampaign]: attribution.utmCampaign || '',
    [field.utmContent]: attribution.utmContent || '',
    [field.utmTerm]: attribution.utmTerm || '',
    [field.metaFbp]: attribution.fbp || '',
    [field.metaFbc]: attribution.fbc || '',
    [field.tikTokTtclid]: attribution.ttclid || '',
    [field.tikTokTtp]: attribution.ttp || '',
    [field.tikTokEventId]: eventId,
    [field.eventId]: eventId,
    [field.submittedAt]: new Date().toISOString(),
  };

  const response = await fetch(
    `${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(tableName)}`,
    {
      body: JSON.stringify({
        records: [
          {
            fields: Object.fromEntries(
              Object.entries(fields).filter((entry) => entry[1] !== '')
            ),
          },
        ],
        typecast: true,
      }),
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Airtable returned ${response.status}: ${errorBody || 'Unknown error'}`
    );
  }

  return true;
}

function mergeAttribution(
  submission: SignupSubmission,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const cookieAttribution = parseCookieJson<Record<string, string>>(
    cookieStore.get('someday_utm')?.value
  );
  const cookieFbclid = cookieStore.get('someday_fbclid')?.value;
  const cookieTtclid = cookieStore.get('someday_ttclid')?.value;

  return compactObject<SignupAttribution>({
    fbc:
      submission.attribution?.fbc ||
      cookieStore.get('_fbc')?.value ||
      cookieStore.get('someday_fbc')?.value ||
      formatFbc(cookieFbclid),
    fbp:
      submission.attribution?.fbp ||
      cookieStore.get('_fbp')?.value ||
      cookieStore.get('someday_fbp')?.value,
    fbclid: submission.attribution?.fbclid || cookieFbclid,
    landingPath:
      submission.attribution?.landingPath ||
      cookieStore.get('someday_landing_path')?.value,
    referrer:
      submission.referrer ||
      submission.attribution?.referrer ||
      cookieStore.get('someday_referrer')?.value,
    ttclid: submission.attribution?.ttclid || cookieTtclid,
    ttp:
      submission.attribution?.ttp ||
      cookieStore.get('_ttp')?.value ||
      cookieStore.get('someday_ttp')?.value,
    utmCampaign:
      submission.attribution?.utmCampaign || cookieAttribution?.utm_campaign,
    utmContent:
      submission.attribution?.utmContent || cookieAttribution?.utm_content,
    utmMedium:
      submission.attribution?.utmMedium || cookieAttribution?.utm_medium,
    utmSource:
      submission.attribution?.utmSource || cookieAttribution?.utm_source,
    utmTerm: submission.attribution?.utmTerm || cookieAttribution?.utm_term,
  });
}

function getMissingAirtableConfig() {
  return [
    !process.env.AIRTABLE_API_KEY && 'AIRTABLE_API_KEY',
    !process.env.AIRTABLE_BASE_ID && 'AIRTABLE_BASE_ID',
    !process.env.AIRTABLE_TABLE_NAME && 'AIRTABLE_TABLE_NAME',
  ].filter((entry): entry is string => Boolean(entry));
}

function getAirtableFieldNames() {
  return {
    email: process.env.AIRTABLE_EMAIL_FIELD || 'Email',
    eventId: process.env.AIRTABLE_EVENT_ID_FIELD || 'Meta event id',
    landingPath: process.env.AIRTABLE_LANDING_PATH_FIELD || 'Landing path',
    metaFbc: process.env.AIRTABLE_META_FBC_FIELD || 'Meta fbc',
    metaFbp: process.env.AIRTABLE_META_FBP_FIELD || 'Meta fbp',
    pageUrl: process.env.AIRTABLE_PAGE_URL_FIELD || 'Page URL',
    referrer: process.env.AIRTABLE_REFERRER_FIELD || 'Referrer',
    submittedAt: process.env.AIRTABLE_SUBMITTED_AT_FIELD || 'Submitted at',
    tikTokEventId:
      process.env.AIRTABLE_TIKTOK_EVENT_ID_FIELD || 'TikTok event id',
    tikTokTtclid:
      process.env.AIRTABLE_TIKTOK_TTCLID_FIELD || 'TikTok ttclid',
    tikTokTtp: process.env.AIRTABLE_TIKTOK_TTP_FIELD || 'TikTok ttp',
    utmCampaign: process.env.AIRTABLE_UTM_CAMPAIGN_FIELD || 'UTM campaign',
    utmContent: process.env.AIRTABLE_UTM_CONTENT_FIELD || 'UTM content',
    utmMedium: process.env.AIRTABLE_UTM_MEDIUM_FIELD || 'UTM medium',
    utmSource: process.env.AIRTABLE_UTM_SOURCE_FIELD || 'UTM source',
    utmTerm: process.env.AIRTABLE_UTM_TERM_FIELD || 'UTM term',
  };
}

function firstError(errors: Record<string, string | undefined>) {
  return Object.values(errors).find(Boolean);
}

function createServerEventId() {
  return `someday_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatFbc(fbclid?: string) {
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
}

function parseCookieJson<T>(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
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

      return true;
    })
  ) as T;
}
