import {
  createInitialState,
  getTickMs,
  restart,
  setDirection,
  tick,
  togglePause
} from './snakeLogic.js';
import { loadScores, registerScore } from './highScores.js';
import { createMusicPlayer } from './musicPlayer.js';

const COLS = 20;
const ROWS = 20;

const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const statusEl = document.getElementById('status');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const soundBtn = document.getElementById('soundBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const highScoresEl = document.getElementById('highScores');
const mobileControls = document.querySelector('.mobile-controls');
const SWIPE_THRESHOLD_PX = 24;

let state = createInitialState({ cols: COLS, rows: ROWS });
let elapsedMs = 0;
let scoreRegistered = false;
let highScores = loadScores();
let touchStart = null;
const musicPlayer = createMusicPlayer();

document.documentElement.style.setProperty('--cols', String(state.cols));
document.documentElement.style.setProperty('--rows', String(state.rows));

function createBoardCells() {
  const total = state.cols * state.rows;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < total; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    frag.appendChild(cell);
  }
  board.replaceChildren(frag);
}

function indexFromPos({ x, y }) {
  return y * state.cols + x;
}

function getCurrentTickMs() {
  return getTickMs({ elapsedMs, snakeLength: state.snake.length });
}

function renderHighScores() {
  if (!highScoresEl) {
    return;
  }

  if (highScores.length === 0) {
    highScoresEl.innerHTML = '<li>Ainda sem recordes.</li>';
    return;
  }

  highScoresEl.replaceChildren();
  highScores.forEach((entry) => {
    const item = document.createElement('li');
    const when = new Date(entry.date).toLocaleDateString('pt-BR');
    item.textContent = `${entry.score} pts | tam ${entry.length} | ${when}`;
    highScoresEl.appendChild(item);
  });
}

function draw() {
  const cells = board.children;
  for (let i = 0; i < cells.length; i += 1) {
    cells[i].className = 'cell';
  }

  state.snake.forEach((segment) => {
    const idx = indexFromPos(segment);
    if (cells[idx]) {
      cells[idx].classList.add('snake');
    }
  });

  if (state.food) {
    const foodIdx = indexFromPos(state.food);
    if (cells[foodIdx]) {
      cells[foodIdx].classList.add('food');
    }
  }

  scoreEl.textContent = String(state.score);
  speedEl.textContent = String(getCurrentTickMs());

  if (state.gameOver) {
    statusEl.textContent = 'Game over. Clique em Reiniciar.';
  } else if (state.won) {
    statusEl.textContent = 'Você venceu. Tabuleiro completo!';
  } else if (state.paused) {
    statusEl.textContent = 'Pausado';
  } else {
    statusEl.textContent = 'Jogando';
  }

  pauseBtn.textContent = state.paused ? 'Continuar' : 'Pausar';
  updateSoundButton();
}

function maybeRegisterScore(previousState) {
  if (scoreRegistered) {
    return;
  }

  const endedNow =
    (!previousState.gameOver && state.gameOver) || (!previousState.won && state.won);

  if (!endedNow || state.score <= 0) {
    return;
  }

  highScores = registerScore({
    score: state.score,
    length: state.snake.length,
    date: new Date().toISOString()
  });
  scoreRegistered = true;
  renderHighScores();
}

function applyDirectionInput(direction) {
  state = setDirection(state, direction);
  syncMusicWithGame();
}

function restartMatch() {
  state = restart(state);
  elapsedMs = 0;
  scoreRegistered = false;
  syncMusicWithGame();
  draw();
}

function vibrateOnEat() {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(30);
  }
}

function autoPauseIfPlaying() {
  if (state.paused || state.gameOver || state.won) {
    return;
  }
  state = togglePause(state);
  syncMusicWithGame();
  draw();
}

function updateSoundButton() {
  if (!(soundBtn instanceof HTMLButtonElement)) {
    return;
  }
  soundBtn.textContent = musicPlayer.enabled ? 'Som ligado' : 'Som desligado';
}

function syncMusicWithGame() {
  if (!musicPlayer.enabled || state.paused || state.gameOver || state.won) {
    musicPlayer.stop();
    return;
  }

  musicPlayer.start();
}

function onTouchStart(event) {
  const point = event.touches?.[0];
  if (!point) {
    return;
  }
  touchStart = { x: point.clientX, y: point.clientY };
}

function onTouchEnd(event) {
  if (!touchStart) {
    return;
  }

  const point = event.changedTouches?.[0];
  if (!point) {
    touchStart = null;
    return;
  }

  const dx = point.clientX - touchStart.x;
  const dy = point.clientY - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  touchStart = null;

  if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) {
    return;
  }

  if (absX > absY) {
    applyDirectionInput(dx > 0 ? 'right' : 'left');
  } else {
    applyDirectionInput(dy > 0 ? 'down' : 'up');
  }
}

function canUseFullscreen() {
  const el = document.documentElement;
  return Boolean(
    document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      el.requestFullscreen ||
      el.webkitRequestFullscreen
  );
}

function isFullscreenActive() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function updateFullscreenButton() {
  if (!(fullscreenBtn instanceof HTMLButtonElement)) {
    return;
  }
  fullscreenBtn.disabled = !canUseFullscreen();
  fullscreenBtn.textContent = isFullscreenActive() ? 'Sair tela cheia' : 'Tela cheia';
}

async function toggleFullscreenMode() {
  const el = document.documentElement;
  try {
    if (isFullscreenActive()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } else if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch {
    // Ignora falhas de fullscreen (alguns browsers mobile restringem cenarios).
  } finally {
    updateFullscreenButton();
  }
}

function gameLoop() {
  const delay = getCurrentTickMs();

  window.setTimeout(() => {
    if (!state.gameOver && !state.won && !state.paused) {
      elapsedMs += delay;
    }

    const previousState = state;
    state = tick(state);
    if (state.score > previousState.score) {
      vibrateOnEat();
    }
    syncMusicWithGame();
    maybeRegisterScore(previousState);
    draw();
    gameLoop();
  }, delay);
}

const keyToDirection = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right'
};

window.addEventListener('keydown', (event) => {
  const direction = keyToDirection[event.key];
  if (direction) {
    event.preventDefault();
    applyDirectionInput(direction);
  }

  if (event.key === ' ') {
    event.preventDefault();
    state = togglePause(state);
    syncMusicWithGame();
    draw();
  }
});

pauseBtn.addEventListener('click', () => {
  state = togglePause(state);
  syncMusicWithGame();
  draw();
});

restartBtn.addEventListener('click', () => {
  restartMatch();
});

if (soundBtn instanceof HTMLButtonElement) {
  soundBtn.addEventListener('click', () => {
    musicPlayer.toggle();
    syncMusicWithGame();
    updateSoundButton();
  });
}

if (fullscreenBtn instanceof HTMLButtonElement) {
  fullscreenBtn.addEventListener('click', () => {
    toggleFullscreenMode();
  });
}

if (mobileControls) {
  mobileControls.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const direction = target.dataset.dir;
    if (direction) {
      applyDirectionInput(direction);
    }
  });
}

board.addEventListener('touchstart', onTouchStart, { passive: true });
board.addEventListener('touchend', onTouchEnd, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    autoPauseIfPlaying();
  } else {
    syncMusicWithGame();
  }
});
window.addEventListener('blur', autoPauseIfPlaying);
window.addEventListener('pagehide', autoPauseIfPlaying);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

createBoardCells();
renderHighScores();
updateFullscreenButton();
draw();
gameLoop();
