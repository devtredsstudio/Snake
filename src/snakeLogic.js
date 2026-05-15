export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export const SPEED_DEFAULTS = {
  baseTickMs: 200,
  minTickMs: 70,
  timeStepMs: 15000,
  timeDecreaseMs: 4,
  sizeStep: 3,
  sizeDecreaseMs: 3
};

function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

function randomInt(max, rng) {
  return Math.floor(rng() * max);
}

export function placeFood(snake, cols, rows, rng = Math.random) {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        free.push({ x, y });
      }
    }
  }

  if (free.length === 0) {
    return null;
  }

  return free[randomInt(free.length, rng)];
}

export function createInitialState({ cols = 20, rows = 20, rng = Math.random } = {}) {
  const snake = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];

  return {
    cols,
    rows,
    snake,
    direction: 'right',
    pendingDirection: 'right',
    food: placeFood(snake, cols, rows, rng),
    score: 0,
    gameOver: false,
    paused: false,
    won: false
  };
}

export function isOppositeDirection(a, b) {
  return (
    (a === 'up' && b === 'down') ||
    (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') ||
    (a === 'right' && b === 'left')
  );
}

export function setDirection(state, direction) {
  if (!DIRECTIONS[direction]) {
    return state;
  }

  if (state.snake.length > 1 && isOppositeDirection(state.direction, direction)) {
    return state;
  }

  return { ...state, pendingDirection: direction };
}

export function tick(state, rng = Math.random) {
  if (state.gameOver || state.paused || state.won) {
    return state;
  }

  const direction = state.pendingDirection;
  const vector = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };

  if (nextHead.x < 0 || nextHead.x >= state.cols || nextHead.y < 0 || nextHead.y >= state.rows) {
    return { ...state, direction, gameOver: true };
  }

  const grows = state.food && samePos(nextHead, state.food);
  const bodyToCheck = grows ? state.snake : state.snake.slice(0, -1);
  const hitBody = bodyToCheck.some((segment) => samePos(segment, nextHead));

  if (hitBody) {
    return { ...state, direction, gameOver: true };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!grows) {
    nextSnake.pop();
  }

  let nextFood = state.food;
  let nextScore = state.score;
  let won = state.won;

  if (grows) {
    nextScore += 1;
    nextFood = placeFood(nextSnake, state.cols, state.rows, rng);
    if (!nextFood) {
      won = true;
    }
  }

  return {
    ...state,
    direction,
    snake: nextSnake,
    food: nextFood,
    score: nextScore,
    won
  };
}

export function togglePause(state) {
  if (state.gameOver || state.won) {
    return state;
  }
  return { ...state, paused: !state.paused };
}

export function restart(state, rng = Math.random) {
  return createInitialState({ cols: state.cols, rows: state.rows, rng });
}

export function getTickMs(
  {
    elapsedMs = 0,
    snakeLength = 1
  } = {},
  config = SPEED_DEFAULTS
) {
  const safeElapsed = Math.max(0, elapsedMs);
  const safeLength = Math.max(1, snakeLength);

  const timeSteps = Math.floor(safeElapsed / config.timeStepMs);
  const sizeSteps = Math.floor((safeLength - 1) / config.sizeStep);
  const decrease = timeSteps * config.timeDecreaseMs + sizeSteps * config.sizeDecreaseMs;
  const tickMs = config.baseTickMs - decrease;

  return Math.max(config.minTickMs, tickMs);
}
