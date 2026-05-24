export const MEMORY_DRAFT_KEY = 'someday.memory.draft.v1';
export const MEMORY_RESULT_KEY = 'someday.memory.result.v1';

export type MemoryDraft = {
  albumTitle: string;
};

export type MemoryResult = {
  albumTitle: string;
  image: string;
  prompt?: string;
};

export function normalizeAlbumTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 80);
}
