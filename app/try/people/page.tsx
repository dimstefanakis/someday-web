'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collectSignupAttribution,
  createMetaEventId,
  trackMetaMemoryCreated,
} from '../../../lib/meta-browser';
import { trackTikTokMemoryCreated } from '../../../lib/tiktok-browser';
import {
  MEMORY_DRAFT_KEY,
  MEMORY_RESULT_KEY,
  MemoryDraft,
} from '../../../lib/memory-flow';

type MemoryPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type MemoryPerson = {
  id: string;
  name: string;
  isUser: boolean;
  photos: MemoryPhoto[];
};

const MAX_PEOPLE = 4;
const MAX_PHOTOS_PER_PERSON = 4;
const IDENTITY_SHEET_SIZE = 2048;
const IDENTITY_SHEET_GUTTER = 8;

function identitySheetGrid(photoCount: number) {
  if (photoCount <= 1) {
    return { columns: 1, rows: 1 };
  }

  if (photoCount === 2) {
    return { columns: 2, rows: 1 };
  }

  return { columns: 2, rows: 2 };
}

async function loadImage(file: File) {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();
    image.src = sourceUrl;
    await image.decode();

    return image;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
}

async function buildIdentitySheet(person: MemoryPerson) {
  const sourcePhotos = person.photos.slice(0, MAX_PHOTOS_PER_PERSON);
  const { columns, rows } = identitySheetGrid(sourcePhotos.length);
  const tileWidth = Math.floor(
    (IDENTITY_SHEET_SIZE - (columns + 1) * IDENTITY_SHEET_GUTTER) / columns
  );
  const tileHeight = Math.floor(
    (IDENTITY_SHEET_SIZE - (rows + 1) * IDENTITY_SHEET_GUTTER) / rows
  );
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not prepare identity references.');
  }

  canvas.width = IDENTITY_SHEET_SIZE;
  canvas.height = IDENTITY_SHEET_SIZE;
  context.fillStyle = 'rgb(245,245,245)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await Promise.all(
    sourcePhotos.map(async (photo, index) => {
      const image = await loadImage(photo.file);
      const column = index % columns;
      const row = Math.floor(index / columns);
      const left =
        IDENTITY_SHEET_GUTTER + column * (tileWidth + IDENTITY_SHEET_GUTTER);
      const top =
        IDENTITY_SHEET_GUTTER + row * (tileHeight + IDENTITY_SHEET_GUTTER);

      drawCoverImage(context, image, left, top, tileWidth, tileHeight);
    })
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92);
  });

  if (!blob) {
    throw new Error('Could not prepare identity references.');
  }

  const safeName = person.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return new File([blob], `${safeName || 'person'}-identity-sheet.jpg`, {
    type: 'image/jpeg',
  });
}

async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files work here.');
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new window.Image();
    image.src = sourceUrl;
    await image.decode();

    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not prepare this photo.');
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    });

    if (!blob) {
      throw new Error('Could not prepare this photo.');
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function createPerson(name = ''): MemoryPerson {
  return {
    id: crypto.randomUUID(),
    name,
    isUser: false,
    photos: [],
  };
}

export default function TryPeoplePage() {
  const router = useRouter();
  const [albumTitle, setAlbumTitle] = useState('');
  const [people, setPeople] = useState<MemoryPerson[]>([
    {
      id: 'you',
      name: 'You',
      isUser: true,
      photos: [],
    },
  ]);
  const [error, setError] = useState('');
  const [busyPersonId, setBusyPersonId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const peopleRef = useRef(people);

  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(MEMORY_DRAFT_KEY);

    if (!stored) {
      router.replace('/try');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as MemoryDraft;
      setAlbumTitle(parsed.albumTitle);
    } catch {
      router.replace('/try');
    }
  }, [router]);

  useEffect(() => {
    return () => {
      peopleRef.current.forEach((person) => {
        person.photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      });
    };
  }, []);

  const canAddPerson = people.length < MAX_PEOPLE;
  const totalPhotos = useMemo(
    () => people.reduce((sum, person) => sum + person.photos.length, 0),
    [people]
  );

  function updatePersonName(personId: string, name: string) {
    setPeople((current) =>
      current.map((person) =>
        person.id === personId ? { ...person, name } : person
      )
    );
    setError('');
  }

  async function addPhotos(personId: string, fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setBusyPersonId(personId);
    setError('');

    try {
      const incomingFiles = Array.from(fileList);
      const currentCount =
        people.find((person) => person.id === personId)?.photos.length || 0;
      const slotsLeft = MAX_PHOTOS_PER_PERSON - currentCount;
      const filesToUse = incomingFiles.slice(0, slotsLeft);

      if (slotsLeft <= 0) {
        setError('Each person can have up to four photos for this test.');
        return;
      }

      const preparedPhotos = await Promise.all(
        filesToUse.map(async (file) => {
          const compressed = await compressImageFile(file);

          return {
            id: crypto.randomUUID(),
            file: compressed,
            previewUrl: URL.createObjectURL(compressed),
          };
        })
      );

      setPeople((current) =>
        current.map((person) =>
          person.id === personId
            ? {
                ...person,
                photos: [...person.photos, ...preparedPhotos],
              }
            : person
        )
      );

      track('memory_reference_photos_added', {
        count: preparedPhotos.length,
        personCount: people.length,
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Could not add those photos.'
      );
    } finally {
      setBusyPersonId(null);
    }
  }

  function removePhoto(personId: string, photoId: string) {
    setPeople((current) =>
      current.map((person) => {
        if (person.id !== personId) {
          return person;
        }

        const photoToRemove = person.photos.find((photo) => photo.id === photoId);

        if (photoToRemove) {
          URL.revokeObjectURL(photoToRemove.previewUrl);
        }

        return {
          ...person,
          photos: person.photos.filter((photo) => photo.id !== photoId),
        };
      })
    );
  }

  function removePerson(personId: string) {
    setPeople((current) => {
      const personToRemove = current.find((person) => person.id === personId);

      if (personToRemove) {
        personToRemove.photos.forEach((photo) =>
          URL.revokeObjectURL(photo.previewUrl)
        );
      }

      return current.filter((person) => person.id !== personId);
    });
  }

  async function createMemory() {
    const cleanPeople = people.map((person) => ({
      ...person,
      name: person.name.trim() || (person.isUser ? 'You' : ''),
    }));
    const invalidPerson = cleanPeople.find(
      (person) => !person.name || person.photos.length === 0
    );

    if (invalidPerson) {
      setError('Every person needs a name and at least one photo.');
      return;
    }

    setIsGenerating(true);
    setError('');
    track('memory_generate_clicked', {
      albumTitle,
      peopleCount: cleanPeople.length,
      photoCount: totalPhotos,
    });

    try {
      const formData = new FormData();
      const identitySheets = await Promise.all(
        cleanPeople.map((person) => buildIdentitySheet(person))
      );

      formData.set('albumTitle', albumTitle);
      const eventId = createMetaEventId('someday_memory_created');

      formData.set('eventId', eventId);
      formData.set('pageUrl', window.location.href);
      formData.set('referrer', document.referrer || '');
      formData.set('attribution', JSON.stringify(collectSignupAttribution()));
      formData.set(
        'people',
        JSON.stringify(
          cleanPeople.map((person) => ({
            id: person.id,
            isUser: person.isUser,
            name: person.name,
            photoCount: person.photos.length,
          }))
        )
      );

      identitySheets.forEach((sheet, personIndex) => {
        formData.append(
          'images',
          sheet,
          `person-${personIndex + 1}-${sheet.name}`
        );
      });
      cleanPeople.forEach((person, personIndex) => {
        person.photos.forEach((photo, photoIndex) => {
          formData.append(
            'sourceImages',
            photo.file,
            `person-${personIndex + 1}-source-${photoIndex + 1}.jpg`
          );
        });
      });

      const response = await fetch('/api/memories/generate', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            albumTitle?: string;
            error?: string;
            eventId?: string;
            generationId?: string;
            image?: string;
            metaTracked?: boolean;
            prompt?: string;
            tikTokTracked?: boolean;
          }
        | null;

      if (!response.ok || !payload?.image) {
        throw new Error(payload?.error || 'Could not create this memory.');
      }

      window.sessionStorage.setItem(
        MEMORY_RESULT_KEY,
        JSON.stringify({
          albumTitle: payload.albumTitle || albumTitle,
          image: payload.image,
          prompt: payload.prompt,
        })
      );
      track('memory_generate_succeeded', {
        albumTitle,
        eventId: payload.eventId || eventId,
        generationId: payload.generationId,
        metaTracked: Boolean(payload.metaTracked),
        peopleCount: cleanPeople.length,
        photoCount: totalPhotos,
        tikTokTracked: Boolean(payload.tikTokTracked),
      });
      trackMetaMemoryCreated(payload.eventId || eventId, {
        album_title: albumTitle,
        people_count: cleanPeople.length,
        reference_photo_count: totalPhotos,
      });
      trackTikTokMemoryCreated(payload.eventId || eventId, {
        album_title: albumTitle,
        people_count: cleanPeople.length,
        reference_photo_count: totalPhotos,
      });
      router.push('/try/result');
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'Could not create this memory.'
      );
      track('memory_generate_failed', { albumTitle });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-[100svh] bg-black px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] text-white">
      <section className="mx-auto flex w-full max-w-[560px] flex-col gap-7">
        <header className="flex items-start justify-between">
          <Link
            href="/try"
            className="font-display text-[19px] font-black uppercase leading-[0.9] tracking-normal text-white">
            Some
            <br />
            Day.
          </Link>
        </header>

        <div className="space-y-3">
          <p className="font-display text-[12px] font-black uppercase text-white/42">
            {albumTitle || 'Future memory'}
          </p>
          <h1 className="max-w-[470px] font-display text-[clamp(34px,9.6vw,56px)] font-black leading-[0.94] tracking-normal">
            Who should be in this album?
          </h1>
          <p className="max-w-[390px] font-display text-[14px] font-semibold leading-[1.35] text-white/55">
            Add yourself and up to three friends. Up to four photos each helps
            the first photo feel like them.
          </p>
        </div>

        <div className="space-y-3">
          {people.map((person, index) => (
            <section
              key={person.id}
              className="rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-black text-black">
                  {index + 1}
                </div>
                <label className="sr-only" htmlFor={`person-${person.id}`}>
                  Person name
                </label>
                <input
                  id={`person-${person.id}`}
                  value={person.name}
                  onChange={(event) =>
                    updatePersonName(person.id, event.target.value)
                  }
                  readOnly={person.isUser}
                  placeholder={person.isUser ? 'You' : 'Friend name'}
                  className="min-h-11 min-w-0 flex-1 bg-transparent font-display text-[19px] font-black text-white outline-none placeholder:text-white/25 read-only:text-white"
                />
                {!person.isUser ? (
                  <button
                    type="button"
                    onClick={() => removePerson(person.id)}
                    className="rounded-full px-3 py-2 font-display text-[11px] font-black uppercase text-white/42 transition hover:text-white">
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {person.photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => removePhoto(person.id, photo.id)}
                    className="relative aspect-square overflow-hidden rounded-[16px] bg-white/10">
                    <img
                      src={photo.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/64 font-display text-[12px] font-black text-white">
                      x
                    </span>
                  </button>
                ))}

                {person.photos.length < MAX_PHOTOS_PER_PERSON ? (
                  <label className="flex aspect-square cursor-pointer items-center justify-center rounded-[16px] border border-dashed border-white/20 bg-white/[0.045] text-center font-display text-[12px] font-black uppercase leading-tight text-white/54 transition hover:border-white/38 hover:text-white">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      disabled={busyPersonId === person.id || isGenerating}
                      onChange={(event) => {
                        void addPhotos(person.id, event.target.files);
                        event.currentTarget.value = '';
                      }}
                    />
                    {busyPersonId === person.id ? 'Adding' : 'Add photos'}
                  </label>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {canAddPerson ? (
            <button
              type="button"
              onClick={() => {
                setPeople((current) => [...current, createPerson()]);
                track('memory_friend_added', { nextCount: people.length + 1 });
              }}
              disabled={isGenerating}
              className="min-h-12 rounded-full border border-white/14 px-5 font-display text-[12px] font-black uppercase text-white/68 transition hover:border-white/30 hover:text-white disabled:opacity-50">
              Add friend
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void createMemory()}
            disabled={isGenerating || !!busyPersonId}
            className="min-h-14 rounded-full bg-white px-6 font-display text-[13px] font-black uppercase tracking-normal text-black transition duration-200 hover:scale-[1.015] hover:bg-[#f5f0df] active:scale-[0.985] disabled:scale-100 disabled:cursor-wait disabled:bg-white/70">
            {isGenerating ? 'Creating memory...' : 'See the future memory'}
          </button>

          <p className="min-h-5 text-center font-display text-[12px] font-bold text-white/56">
            {error ||
              `${people.length}/${MAX_PEOPLE} people, ${totalPhotos} reference photo${
                totalPhotos === 1 ? '' : 's'
              }`}
          </p>
        </div>
      </section>
    </main>
  );
}
