const STORAGE_KEY = 'snake.highscores.v1';
const MAX_ENTRIES = 10;

function toPositiveNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

export function normalizeScores(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      score: toPositiveNumber(entry?.score, 0),
      length: Math.max(1, toPositiveNumber(entry?.length, 1)),
      date: typeof entry?.date === 'string' && entry.date ? entry.date : new Date().toISOString()
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.length - a.length;
    })
    .slice(0, MAX_ENTRIES);
}

export function insertScore(entries, newEntry) {
  const clean = normalizeScores(entries);
  return normalizeScores([
    ...clean,
    {
      score: newEntry?.score ?? 0,
      length: newEntry?.length ?? 1,
      date: newEntry?.date ?? new Date().toISOString()
    }
  ]);
}

export function loadScores(storage = globalThis.localStorage) {
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return normalizeScores(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveScores(entries, storage = globalThis.localStorage) {
  if (!storage) {
    return;
  }

  const clean = normalizeScores(entries);
  storage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function registerScore(scoreData, storage = globalThis.localStorage) {
  const next = insertScore(loadScores(storage), scoreData);
  saveScores(next, storage);
  return next;
}
