import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  getTickMs,
  placeFood,
  setDirection,
  tick
} from '../src/snakeLogic.js';

function rngFrom(values) {
  let i = 0;
  return () => {
    const value = values[i] ?? values[values.length - 1] ?? 0;
    i += 1;
    return value;
  };
}

test('move a cobrinha na direcao atual', () => {
  const state = createInitialState({ cols: 10, rows: 10, rng: () => 0 });
  const next = tick(state, () => 0);

  assert.equal(next.snake[0].x, state.snake[0].x + 1);
  assert.equal(next.snake[0].y, state.snake[0].y);
  assert.equal(next.score, 0);
});

test('cresce e aumenta pontuacao ao comer comida', () => {
  const base = createInitialState({ cols: 8, rows: 8, rng: () => 0 });
  const custom = {
    ...base,
    food: { x: base.snake[0].x + 1, y: base.snake[0].y }
  };

  const next = tick(custom, () => 0);
  assert.equal(next.snake.length, custom.snake.length + 1);
  assert.equal(next.score, 1);
});

test('detecta colisao com parede', () => {
  const state = {
    cols: 5,
    rows: 5,
    snake: [{ x: 4, y: 2 }],
    direction: 'right',
    pendingDirection: 'right',
    food: { x: 0, y: 0 },
    score: 0,
    gameOver: false,
    paused: false,
    won: false
  };

  const next = tick(state, () => 0);
  assert.equal(next.gameOver, true);
});

test('nao permite reverter direcao com tamanho > 1', () => {
  const state = {
    cols: 6,
    rows: 6,
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 }
    ],
    direction: 'right',
    pendingDirection: 'right',
    food: { x: 0, y: 0 },
    score: 0,
    gameOver: false,
    paused: false,
    won: false
  };

  const next = setDirection(state, 'left');
  assert.equal(next.pendingDirection, 'right');
});

test('placeFood nunca escolhe celula ocupada', () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 }
  ];
  const rng = rngFrom([0.1, 0.8]);
  const food = placeFood(snake, 4, 1, rng);

  assert.ok(food);
  assert.notDeepEqual(food, { x: 0, y: 0 });
  assert.notDeepEqual(food, { x: 1, y: 0 });
  assert.notDeepEqual(food, { x: 2, y: 0 });
});

test('velocidade aumenta com tempo e tamanho', () => {
  const start = getTickMs({ elapsedMs: 0, snakeLength: 1 });
  const later = getTickMs({ elapsedMs: 30000, snakeLength: 1 });
  const bigger = getTickMs({ elapsedMs: 30000, snakeLength: 10 });

  assert.ok(later < start);
  assert.ok(bigger < later);
});
