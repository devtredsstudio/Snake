import test from 'node:test';
import assert from 'node:assert/strict';
import { insertScore, normalizeScores } from '../src/highScores.js';

test('insertScore ordena por pontuacao desc', () => {
  const entries = [
    { score: 3, length: 4, date: '2026-01-01T00:00:00.000Z' },
    { score: 10, length: 9, date: '2026-01-02T00:00:00.000Z' }
  ];

  const next = insertScore(entries, {
    score: 7,
    length: 8,
    date: '2026-01-03T00:00:00.000Z'
  });

  assert.equal(next[0].score, 10);
  assert.equal(next[1].score, 7);
  assert.equal(next[2].score, 3);
});

test('normalizeScores limita top 10', () => {
  const entries = Array.from({ length: 20 }, (_, i) => ({
    score: i,
    length: i + 1,
    date: '2026-01-01T00:00:00.000Z'
  }));

  const clean = normalizeScores(entries);

  assert.equal(clean.length, 10);
  assert.equal(clean[0].score, 19);
  assert.equal(clean[9].score, 10);
});
