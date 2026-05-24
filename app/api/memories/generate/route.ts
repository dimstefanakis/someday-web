import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import {
  getClientIpAddress,
  sendMetaConversionEvent,
} from '../../../../lib/meta-server';
import type { SignupAttribution } from '../../../../lib/signup';
import { sendTikTokConversionEvent } from '../../../../lib/tiktok-server';
import {
  assertSupabaseWebMemoryReady,
  getSupabaseWebMemoryConfig,
  insertWebMemoryRows,
  uploadWebMemoryObject,
} from '../../../../lib/supabase-web-memory';

export const runtime = 'nodejs';
export const maxDuration = 120;

type MemoryPerson = {
  id?: string;
  isUser?: boolean;
  name?: string;
  photoCount?: number;
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

const MAX_PEOPLE = 4;
const MAX_IMAGES = 4;
const MAX_SOURCE_IMAGES = 16;

function cleanText(value: FormDataEntryValue | null, fallback = '') {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, 120)
    : fallback;
}

function parseJson<T>(value: FormDataEntryValue | null): T | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function parsePeople(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as MemoryPerson[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .slice(0, MAX_PEOPLE)
      .map((person, index) => ({
        id: person.id || `person-${index + 1}`,
        isUser: Boolean(person.isUser),
        name: String(person.name || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 48),
        photoCount: Number(person.photoCount || 0),
      }))
      .filter((person) => person.name);
  } catch {
    return [];
  }
}

function buildPrompt(albumTitle: string, people: MemoryPerson[]) {
  const subjectLines = people.map((person, index) => {
    const photoCount = Math.max(1, Number(person.photoCount || 1));

    return `- Person ${index + 1}: ${person.name}${
      person.isUser ? ' (the user)' : ''
    }, represented by input image ${
      index + 1
    }, a single-person identity sheet built from ${photoCount} source reference image${
      photoCount === 1 ? '' : 's'
    }.`;
  });

  return [
    'SYSTEM PROMPT - Someday Web Memory Image Composer',
    '',
    'Role',
    '- Create exactly one photorealistic image that feels like a real future memory from a phone camera roll.',
    '- The user has had the best results with prompts like "create a polaroid image of..."; use that intent as a photo aesthetic, not as a physical object.',
    '',
    'Inputs',
    `- Album title: "${albumTitle}".`,
    '- Attached images are one identity sheet per person, in the exact order listed below.',
    '- Each identity sheet may contain up to four photos of the same person in a grid. Treat every tile inside one sheet as the same identity, not as multiple people.',
    '- The references are identity anchors only, not scene, pose, crop, background, outfit, or expression instructions.',
    '',
    'People who must be represented',
    subjectLines.join('\n'),
    '',
    'Primary image request',
    `- Create a very realistic instant-film Polaroid-style travel photo of these people inside a believable future memory for "${albumTitle}", as if the image itself was found in a box of old memories.`,
    '- IMPORTANT BORDER RULE: output only the square photographic image area. Do not render the physical Polaroid print, white paper border, thick border, bottom caption strip, handwriting, drop shadow, frame, tabletop photo object, or scanned-photo edges.',
    '- Apply the Polaroid feeling only as an in-photo aesthetic: slightly imperfect framing, soft flash-lit faces when natural, warm nostalgic color grading, subtle film grain, faint dust/specks inside the photo, gentle background blur, mild vignette, and slightly faded contrast.',
    '- The image should feel candid and emotionally real, like a memory from a movie or an old travel snapshot, not like a polished photoshoot or ad.',
    '',
    'Album context',
    '- Treat the album title as a hard context anchor. If it names a destination, season, event, or year, the scene must visibly belong there through setting, objects, clothes, light, activity, architecture, weather, food, transit, signage shape, or social detail.',
    '- Avoid generic travel, generic nightlife, generic beach, generic cafe, or random transit imagery unless the album title actually points there.',
    '- Make one specific plausible moment, not a symbolic or promotional scene.',
    '',
    'Face and identity retention protocol',
    `- This is an identity-sensitive multi-image edit/composite with exactly ${people.length} listed person${people.length === 1 ? '' : 's'} total.`,
    '- One uploaded identity sheet equals one final person. Do not interpret grid tiles within a sheet as extra people.',
    '- Preserve each person\'s recognizable facial structure, eye shape and spacing, nose shape, mouth shape, jawline, cheekbones, skin tone, hairline, hairstyle cues, approximate age, and overall proportions.',
    '- Never use one person\'s references to render another person, and never blend, average, swap, duplicate, or merge identities.',
    '- If a person has multiple references, treat those images as complementary evidence for one consistent identity.',
    '- Change expression, gaze, posture, clothing, lighting, camera angle, and environment into a new memory, but do not redesign the underlying face or turn anyone into a generic attractive substitute.',
    '- Keep faces readable whenever possible. Avoid hiding identity-critical faces behind heavy shadow, hair, hands, sunglasses, objects, extreme motion blur, or tiny background placement.',
    '',
    'Performance and emotion',
    '- Use varied, natural facial expressions and body language that fit the moment. Do not make everyone share the same smile or stare at the camera unless the shot is clearly a selfie.',
    '- Do not overcorrect into serious or muted energy. Happiness is allowed when it fits, but it should feel candid instead of advertisement-happy.',
    '- Friends should feel socially believable: relaxed, imperfect, mid-moment, reacting to the same real situation.',
    '',
    'Visual style',
    '- Square 1:1 composition.',
    '- Realistic accidental iPhone, point-and-shoot, or instant-film photo treatment.',
    '- The final image should look like a borderless crop from an instant-film photograph: nostalgic colors and film artifacts are visible, but the paper print is not visible.',
    '- Personal, candid, slightly imperfect, emotionally specific, and plausible as something the group would later save to camera roll.',
    '- Prioritize realism and recognizability over cinematic polish, studio lighting, editorial posing, or glossy ad composition.',
    '',
    'Hard constraints',
    '- No visible Polaroid paper, no white border, no thick border, no bottom caption area, no scanned border edge, no handwritten text, no album title text in the image.',
    '- No text overlays, captions, logos, watermarks, UI chrome, timestamps, frames, posters, split images, or collages.',
    '- No extra duplicate versions of the listed people. Background passersby are allowed only if minor and contextually natural.',
    '- No distorted anatomy, extra limbs, identity mixing, duplicated faces, or conflicting camera viewpoints.',
    '',
    'Success criteria',
    '- One cohesive square future-memory photo.',
    '- The album scenario is obvious from the environment and action.',
    '- The listed people remain individually recognizable from their references.',
    '- The image has a clear instant-film Polaroid feel through color, flash, grain, dust, blur, vignette, and faded contrast without rendering the physical Polaroid frame.',
  ].join(' ');
}

function isSupportedImage(entry: FormDataEntryValue): entry is File {
  return (
    entry instanceof File &&
    entry.size > 0 &&
    entry.size <= 8 * 1024 * 1024 &&
    ['image/jpeg', 'image/png', 'image/webp'].includes(entry.type)
  );
}

function sourceImagePersonPosition(fileName: string) {
  const match = fileName.match(/^person-(\d+)-source-(\d+)\.jpg$/);

  if (!match) {
    return null;
  }

  return {
    personPosition: Number(match[1]),
    photoPosition: Number(match[2]),
  };
}

function createServerEventId() {
  return `someday_memory_created_${crypto.randomUUID()}`;
}

function mergeAttribution(
  submitted: SignupAttribution | undefined,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const cookieAttribution = parseCookieJson<Record<string, string>>(
    cookieStore.get('someday_utm')?.value
  );

  return compactObject<SignupAttribution>({
    fbc:
      submitted?.fbc ||
      cookieStore.get('_fbc')?.value ||
      cookieStore.get('someday_fbc')?.value,
    fbp:
      submitted?.fbp ||
      cookieStore.get('_fbp')?.value ||
      cookieStore.get('someday_fbp')?.value,
    fbclid: submitted?.fbclid || cookieStore.get('someday_fbclid')?.value,
    landingPath:
      submitted?.landingPath || cookieStore.get('someday_landing_path')?.value,
    referrer: submitted?.referrer || cookieStore.get('someday_referrer')?.value,
    ttclid: submitted?.ttclid || cookieStore.get('someday_ttclid')?.value,
    ttp:
      submitted?.ttp ||
      cookieStore.get('_ttp')?.value ||
      cookieStore.get('someday_ttp')?.value,
    utmCampaign: submitted?.utmCampaign || cookieAttribution?.utm_campaign,
    utmContent: submitted?.utmContent || cookieAttribution?.utm_content,
    utmMedium: submitted?.utmMedium || cookieAttribution?.utm_medium,
    utmSource: submitted?.utmSource || cookieAttribution?.utm_source,
    utmTerm: submitted?.utmTerm || cookieAttribution?.utm_term,
  });
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

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseConfig = getSupabaseWebMemoryConfig();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI is not configured yet.' },
      { status: 503 }
    );
  }

  if (!supabaseConfig) {
    return NextResponse.json(
      { error: 'Supabase is not configured yet.' },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const albumTitle = cleanText(formData.get('albumTitle'), 'Someday');
  const people = parsePeople(formData.get('people'));
  const images = formData.getAll('images').filter(isSupportedImage);
  const sourceImages = formData.getAll('sourceImages').filter(isSupportedImage);
  const eventId = cleanText(formData.get('eventId')) || createServerEventId();
  const pageUrl = cleanText(formData.get('pageUrl'));
  const referrer = cleanText(formData.get('referrer'));
  const submittedAttribution = parseJson<SignupAttribution>(
    formData.get('attribution')
  );

  if (albumTitle.length < 2) {
    return NextResponse.json(
      { error: 'Give this memory a title first.' },
      { status: 400 }
    );
  }

  if (!people.length || people.length > MAX_PEOPLE) {
    return NextResponse.json(
      { error: 'Add one to four people for this memory.' },
      { status: 400 }
    );
  }

  if (!images.length) {
    return NextResponse.json(
      { error: 'Add at least one reference photo.' },
      { status: 400 }
    );
  }

  if (images.length !== people.length) {
    return NextResponse.json(
      { error: 'Each person needs one identity reference sheet.' },
      { status: 400 }
    );
  }

  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: 'Too many reference photos for this test.' },
      { status: 400 }
    );
  }

  if (sourceImages.length > MAX_SOURCE_IMAGES) {
    return NextResponse.json(
      { error: 'Too many uploaded photos for this test.' },
      { status: 400 }
    );
  }

  try {
    await assertSupabaseWebMemoryReady(supabaseConfig);
  } catch (error) {
    console.error('Supabase web memory storage is not ready', error);
    return NextResponse.json(
      { error: 'Supabase memory storage is not ready yet.' },
      { status: 503 }
    );
  }

  const openaiForm = new FormData();
  const prompt = buildPrompt(albumTitle, people);
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  openaiForm.set('model', model);
  openaiForm.set('prompt', prompt);
  openaiForm.set('size', process.env.OPENAI_IMAGE_SIZE || '1024x1024');
  openaiForm.set('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
  openaiForm.set('output_format', 'png');

  images.forEach((image) => {
    openaiForm.append('image[]', image, image.name);
  });

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: openaiForm,
  });
  const payload = (await response.json().catch(() => null)) as
    | OpenAIImageResponse
    | null;

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          payload?.error?.message ||
          'The image provider could not create this memory.',
      },
      { status: 502 }
    );
  }

  const image = payload?.data?.[0];
  const encodedImage = image?.b64_json
    ? `data:image/png;base64,${image.b64_json}`
    : image?.url;

  if (!encodedImage) {
    return NextResponse.json(
      { error: 'The image provider returned an empty result.' },
      { status: 502 }
    );
  }

  const generationId = crypto.randomUUID();
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const attribution = mergeAttribution(submittedAttribution, cookieStore);
  const clientIpAddress = getClientIpAddress(requestHeaders);
  const clientUserAgent = requestHeaders.get('user-agent') || undefined;
  const runPrefix = `${new Date().toISOString().slice(0, 10)}/${generationId}`;
  const generatedContentType = image?.b64_json ? 'image/png' : 'image/png';
  const generatedPath = `${runPrefix}/generated-memory.png`;
  const generatedBytes = image?.b64_json
    ? Buffer.from(image.b64_json, 'base64')
    : Buffer.from(await (await fetch(encodedImage)).arrayBuffer());
  const generatedBlob = new Blob([new Uint8Array(generatedBytes)], {
    type: generatedContentType,
  });

  await uploadWebMemoryObject({
    body: generatedBlob,
    config: supabaseConfig,
    contentType: generatedContentType,
    path: generatedPath,
  });

  await Promise.all(
    images.map((identitySheet, index) =>
      uploadWebMemoryObject({
        body: identitySheet,
        config: supabaseConfig,
        contentType: identitySheet.type || 'image/jpeg',
        path: `${runPrefix}/people/person-${index + 1}/identity-sheet.jpg`,
      })
    )
  );

  await Promise.all(
    sourceImages.map((sourceImage, index) => {
      const parsed = sourceImagePersonPosition(sourceImage.name);
      const personPosition = parsed?.personPosition || 0;
      const photoPosition = parsed?.photoPosition || index + 1;

      return uploadWebMemoryObject({
        body: sourceImage,
        config: supabaseConfig,
        contentType: sourceImage.type || 'image/jpeg',
        path: `${runPrefix}/people/person-${personPosition}/source-${photoPosition}.jpg`,
      });
    })
  );

  const analyticsCustomData = {
    album_title: albumTitle,
    content_category: 'Web memory generator',
    content_name: 'Someday generated future memory',
    people_count: people.length,
    reference_photo_count: sourceImages.length,
  };
  const analyticsResults = await Promise.allSettled([
    sendMetaConversionEvent({
      clientIpAddress,
      clientUserAgent,
      customData: analyticsCustomData,
      eventId,
      eventName: 'CompleteRegistration',
      eventSourceUrl: pageUrl,
      fbc: attribution.fbc,
      fbp: attribution.fbp,
    }),
    sendMetaConversionEvent({
      clientIpAddress,
      clientUserAgent,
      customData: analyticsCustomData,
      eventId,
      eventName: 'SomedayMemoryCreated',
      eventSourceUrl: pageUrl,
      fbc: attribution.fbc,
      fbp: attribution.fbp,
    }),
    sendTikTokConversionEvent({
      clientIpAddress,
      clientUserAgent,
      eventId,
      eventName: 'CompleteRegistration',
      eventSourceUrl: pageUrl,
      properties: {
        ...analyticsCustomData,
        content_type: 'web_memory_generator',
      },
      referrer: referrer || attribution.referrer,
      ttclid: attribution.ttclid,
      ttp: attribution.ttp,
    }),
    sendTikTokConversionEvent({
      clientIpAddress,
      clientUserAgent,
      eventId,
      eventName: 'SomedayMemoryCreated',
      eventSourceUrl: pageUrl,
      properties: {
        ...analyticsCustomData,
        content_type: 'web_memory_generator',
      },
      referrer: referrer || attribution.referrer,
      ttclid: attribution.ttclid,
      ttp: attribution.ttp,
    }),
  ]);
  const registrationTracked =
    analyticsResults[0].status === 'fulfilled' && analyticsResults[0].value;
  const customMetaTracked =
    analyticsResults[1].status === 'fulfilled' && analyticsResults[1].value;
  const tikTokTracked =
    (analyticsResults[2].status === 'fulfilled' && analyticsResults[2].value) ||
    (analyticsResults[3].status === 'fulfilled' && analyticsResults[3].value);

  analyticsResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('Web memory analytics event failed', index, result.reason);
    }
  });

  const [generation] = await insertWebMemoryRows<{ id: string }>({
    config: supabaseConfig,
    table: 'web_memory_generations',
    rows: [
      {
        id: generationId,
        album_title: albumTitle,
        storage_bucket: supabaseConfig.bucket,
        final_storage_path: generatedPath,
        final_content_type: generatedContentType,
        prompt,
        image_model: model,
        people_count: people.length,
        source_photo_count: sourceImages.length,
        event_id: eventId,
        page_url: pageUrl || null,
        referrer: referrer || attribution.referrer || null,
        attribution: attribution || null,
        meta_tracked: registrationTracked || customMetaTracked,
        tiktok_tracked: tikTokTracked,
        status: 'complete',
      },
    ],
  });

  const peopleRows: { id: string; position: number }[] =
    await insertWebMemoryRows<{ id: string; position: number }>({
    config: supabaseConfig,
    table: 'web_memory_people',
    rows: people.map((person, index) => ({
      generation_id: generationId,
      position: index + 1,
      display_name: person.name,
      is_user: Boolean(person.isUser),
      source_photo_count: Number(person.photoCount || 0),
      identity_sheet_storage_path: `${runPrefix}/people/person-${
        index + 1
      }/identity-sheet.jpg`,
    })),
    });
  const personIdByPosition = new Map(
    peopleRows.map((person) => [person.position, person.id])
  );

  await insertWebMemoryRows({
    config: supabaseConfig,
    table: 'web_memory_photos',
    rows: [
      {
        generation_id: generationId,
        person_id: null,
        kind: 'generated',
        storage_bucket: supabaseConfig.bucket,
        storage_path: generatedPath,
        content_type: generatedContentType,
        original_filename: 'generated-memory.png',
        position: 1,
      },
      ...images.map((identitySheet, index) => ({
        generation_id: generationId,
        person_id: personIdByPosition.get(index + 1) || null,
        kind: 'identity_sheet',
        storage_bucket: supabaseConfig.bucket,
        storage_path: `${runPrefix}/people/person-${index + 1}/identity-sheet.jpg`,
        content_type: identitySheet.type || 'image/jpeg',
        original_filename: identitySheet.name,
        position: index + 1,
      })),
      ...sourceImages.map((sourceImage, index) => {
        const parsed = sourceImagePersonPosition(sourceImage.name);
        const personPosition = parsed?.personPosition || 0;
        const photoPosition = parsed?.photoPosition || index + 1;

        return {
          generation_id: generationId,
          person_id: personIdByPosition.get(personPosition) || null,
          kind: 'source',
          storage_bucket: supabaseConfig.bucket,
          storage_path: `${runPrefix}/people/person-${personPosition}/source-${photoPosition}.jpg`,
          content_type: sourceImage.type || 'image/jpeg',
          original_filename: sourceImage.name,
          position: photoPosition,
        };
      }),
    ],
  });

  return NextResponse.json({
    albumTitle,
    eventId,
    generationId: generation?.id || generationId,
    image: encodedImage,
    metaTracked: registrationTracked || customMetaTracked,
    prompt,
    tikTokTracked,
  });
}
