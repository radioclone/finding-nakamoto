export interface HiroHeaders {
  [key: string]: string;
}

const HIRO_KEYS = [
  process.env.NEXT_PUBLIC_HIRO_API_KEY1 || "d3aa23556a80fc18c70ccd95c4780028",
  process.env.NEXT_PUBLIC_HIRO_API_KEY2 || "d3aa23556a80fc18c70ccd95c4780028",
  process.env.NEXT_PUBLIC_HIRO_API_KEY3 || "d3aa23556a80fc18c70ccd95c4780028",
];

export function getRandomHiroHeader(): HiroHeaders {
  const randomApiKey = HIRO_KEYS[Math.floor(Math.random() * HIRO_KEYS.length)];
  return {
    Accept: "application/json",
    "x-hiro-api-key": randomApiKey,
  };
}

export function mergeHiroHeaders(initHeaders?: HeadersInit | undefined): HeadersInit {
  const existing = new Headers(initHeaders || {});
  const random = getRandomHiroHeader();

  Object.entries(random).forEach(([key, value]) => {
    if (!existing.has(key)) {
      existing.set(key, value);
    }
  });

  return existing;
}
