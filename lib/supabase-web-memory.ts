const DEFAULT_BUCKET = 'web-memory-assets';

type InsertRow = Record<string, unknown>;

type SupabaseConfig = {
  bucket: string;
  key: string;
  url: string;
};

export function getSupabaseWebMemoryConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    bucket: process.env.SUPABASE_WEB_MEMORY_BUCKET || DEFAULT_BUCKET,
    key,
    url: url.replace(/\/$/, ''),
  };
}

export async function uploadWebMemoryObject({
  body,
  config,
  contentType,
  path,
}: {
  body: BodyInit;
  config: SupabaseConfig;
  contentType: string;
  path: string;
}) {
  const response = await fetch(
    `${config.url}/storage/v1/object/${config.bucket}/${encodePath(path)}`,
    {
      body,
      cache: 'no-store',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Supabase storage upload failed ${response.status}: ${
        errorBody || 'Unknown error'
      }`
    );
  }
}

export async function assertSupabaseWebMemoryReady(config: SupabaseConfig) {
  const [tableResponse, bucketResponse] = await Promise.all([
    fetch(`${config.url}/rest/v1/web_memory_generations?select=id&limit=0`, {
      cache: 'no-store',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    }),
    fetch(`${config.url}/storage/v1/bucket/${config.bucket}`, {
      cache: 'no-store',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    }),
  ]);

  if (!tableResponse.ok) {
    const errorBody = await tableResponse.text();
    throw new Error(
      `Supabase web memory table is not ready ${tableResponse.status}: ${
        errorBody || 'Unknown error'
      }`
    );
  }

  if (!bucketResponse.ok) {
    const errorBody = await bucketResponse.text();
    throw new Error(
      `Supabase web memory bucket is not ready ${bucketResponse.status}: ${
        errorBody || 'Unknown error'
      }`
    );
  }
}

export async function insertWebMemoryRows<T extends InsertRow>({
  config,
  rows,
  table,
}: {
  config: SupabaseConfig;
  rows: InsertRow[];
  table: string;
}): Promise<T[]> {
  if (rows.length === 0) {
    return [];
  }
  const normalizedRows = normalizeInsertRows(rows);

  const response = await fetch(`${config.url}/rest/v1/${table}`, {
    body: JSON.stringify(normalizedRows),
    cache: 'no-store',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Supabase insert into ${table} failed ${response.status}: ${
        errorBody || 'Unknown error'
      }`
    );
  }

  return (await response.json()) as T[];
}

function normalizeInsertRows(rows: InsertRow[]) {
  const keys = Array.from(
    rows.reduce((seenKeys, row) => {
      Object.keys(row).forEach((key) => seenKeys.add(key));
      return seenKeys;
    }, new Set<string>())
  );

  return rows.map((row) =>
    Object.fromEntries(keys.map((key) => [key, row[key] ?? null]))
  );
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}
