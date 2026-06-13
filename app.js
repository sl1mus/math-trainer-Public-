/* v0.4 */
const LESSONS_URL = 'data/lessons.json';
const LS_KEY = 'mt4_stats_v0_1';

const State = {
  lessons: [],
  currentLesson: null,
  shuffledExercises: [],
  idx: 0,
  score: 0,
  attemptsForCurrent: 0,
  startedAt: 0,
  exerciseRecorded: false,
};

const el = {
  lessonList: document.getElementById('lesson-list'),
  exerciseArea: document.getElementById('exercise-area'),
  intro: document.getElementById('intro'),
  summary: document.getElementById('summary-area'),
  summaryBody: document.getElementById('summary-body'),
  lessonTitle: document.getElementById('lesson-title'),
  progress: document.getElementById('progress'),
  exerciseBody: document.getElementById('exercise-body'),
  backToLessons: document.getElementById('back-to-lessons'),
  toLessonsFromSummary: document.getElementById('to-lessons-from-summary'),
  hintBtn: document.getElementById('hint-btn'),
  checkBtn: document.getElementById('check-btn'),
  nextBtn: document.getElementById('next-btn'),
};

function loadStats() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(e) { return {}; }
}
function saveStats(stats) { localStorage.setItem(LS_KEY, JSON.stringify(stats)); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

fetch(LESSONS_URL)
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(data => { State.lessons = data.lessons; renderLessons(); })
  .catch(() => {
    el.lessonList.innerHTML = '<p style="color:var(--red);padding:12px">Не удалось загрузить задания. Обновите страницу.</p>';
  });

function renderLessons() {
  const stats = loadStats();
  el.lessonList.innerHTML = '';
  State.lessons.forEach(lesson => {
    const s = stats[lesson.id] || { correct: 0, total: 0, timeMs: 0 };
    const pct = s.total ? Math.round(100 * s.correct / s.total) : 0;
    const hasProgress = s.total > 0;
    const color = lesson.color || '#9e84ff';
    const icon = lesson.icon || '?';

    const div = document.createElement('div');
    div.className = 'lesson';
    div.style.borderTop = `4px solid ${color}`;
    div.innerHTML = `
      <div class="lesson-icon-wrap" style="background:${color}22">
        <span class="lesson-icon" style="color:${color}">${icon}</span>
      </div>
      <h3>${lesson.title}</h3>
      <div class="meta">${lesson.desc}</div>
      <div class="meta">${hasProgress
        ? `Правильно: <strong>${pct}%</strong> · Заданий: ${s.total}`
        : 'Ещё не начато'
      }</div>
      <div class="lesson-footer">
        <button class="btn btn-primary start-btn">Начать</button>
        ${hasProgress ? '<button class="btn btn-ghost reset-btn">Сбросить</button>' : ''}
      </div>
    `;
    div.querySelector('.start-btn').onclick = () => startLesson(lesson.id);
    if (hasProgress) {
      div.querySelector('.reset-btn').onclick = () => resetLesson(lesson.id);
    }
    el.lessonList.appendChild(div);
  });
}

function resetLesson(lessonId) {
  const stats = loadStats();
  delete stats[lessonId];
  saveStats(stats);
  renderLessons();
}

function startLesson(lessonId) {
  const lesson = State.lessons.find(l => l.id === lessonId);
  State.currentLesson = lesson;
  State.shuffledExercises = shuffle(lesson.exercises);
  State.idx = 0;
  State.score = 0;
  State.startedAt = Date.now();
  showExercise();
  el.intro.classList.add('hidden');
  el.summary.classList.add('hidden');
  el.exerciseArea.classList.remove('hidden');
  el.lessonTitle.textContent = lesson.title;
}

el.backToLessons.onclick = () => {
  el.exerciseArea.classList.add('hidden');
  el.summary.classList.add('hidden');
  el.intro.classList.remove('hidden');
  renderLessons();
};
el.toLessonsFromSummary.onclick = () => {
  el.summary.classList.add('hidden');
  el.intro.classList.remove('hidden');
  renderLessons();
};

function currentExercise() { return State.shuffledExercises[State.idx]; }

function showExercise() {
  const ex = currentExercise();
  const total = State.shuffledExercises.length;
  const pct = Math.round(100 * State.idx / total);

  el.progress.innerHTML = `
    <div class="progress-label">Задание ${State.idx + 1} из ${total}</div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  `;

  State.attemptsForCurrent = 0;
  State.exerciseRecorded = false;
  el.nextBtn.classList.add('hidden');
  el.checkBtn.disabled = false;
  el.checkBtn.classList.remove('hidden');
  el.hintBtn.classList.remove('hidden');
  el.hintBtn.disabled = !ex.hints || !ex.hints.length;

  const container = document.createElement('div');
  container.className = 'exercise';
  container.innerHTML = `<div class="q">${ex.q}</div>`;

  if (ex.type === 'choice') {
    const box = document.createElement('div');
    box.className = 'choices';
    shuffle(ex.options).forEach(opt => {
      const c = document.createElement('div');
      c.className = 'choice';
      c.textContent = opt;
      c.onclick = () => {
        [...box.children].forEach(ch => ch.classList.remove('selected'));
        c.classList.add('selected');
      };
      box.appendChild(c);
    });
    container.appendChild(box);
  }

  if (ex.type === 'input') {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Введите ответ';
    input.dataset.role = 'answer';
    input.onkeydown = e => { if (e.key === 'Enter') checkAnswer(); };
    container.appendChild(input);
    // Focus input on desktop
    requestAnimationFrame(() => input.focus());
  }

  if (ex.type === 'order') {
    el.checkBtn.classList.add('hidden');
    el.hintBtn.classList.add('hidden');
    const correctOrder = ex.answer.map(a => ex.steps.indexOf(a));
    const taskContainer = document.createElement('div');
    container.appendChild(taskContainer);
    new SequenceOrderTask({
      container: taskContainer,
      items: ex.steps,
      correctOrder,
      onFinish: ok => {
        if (ok && !State.exerciseRecorded) {
          State.exerciseRecorded = true;
          State.score += 1;
          el.nextBtn.classList.remove('hidden');
          updateProgress(true);
        } else if (!ok && !State.exerciseRecorded) {
          updateProgress(false);
        }
      },
    });
  }

  el.exerciseBody.innerHTML = '';
  el.exerciseBody.appendChild(container);

  const hintBox = document.createElement('div');
  hintBox.id = 'hint-box';
  el.exerciseBody.appendChild(hintBox);

  const fb = document.createElement('div');
  fb.id = 'feedback';
  el.exerciseBody.appendChild(fb);
}

function revealHint() {
  const ex = currentExercise();
  if (!ex.hints || !ex.hints.length) return;
  const box = document.getElementById('hint-box');
  const shown = box.querySelectorAll('.hint').length;
  if (shown < ex.hints.length) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = ex.hints[shown];
    box.appendChild(h);
  }
}

function normalizeAnswer(ans) {
  return String(ans).toLowerCase().trim().replace(/\s*\/\s*/g, '/');
}

function getUserAnswer(ex) {
  if (ex.type === 'choice') {
    const sel = document.querySelector('.choice.selected');
    return sel ? sel.textContent : null;
  }
  if (ex.type === 'input') {
    const input = document.querySelector('input[data-role="answer"]');
    return input ? input.value.trim() : null;
  }
  return null;
}

function isCorrect(ex, ans) {
  if (ans == null || ans === '') return false;
  return normalizeAnswer(ans) === normalizeAnswer(ex.answer);
}

const MAX_ATTEMPTS = 3;

function checkAnswer() {
  const ex = currentExercise();
  const ans = getUserAnswer(ex);
  State.attemptsForCurrent += 1;
  const fb = document.getElementById('feedback');
  fb.className = 'feedback';

  if (isCorrect(ex, ans)) {
    const hintsShown = document.getElementById('hint-box').querySelectorAll('.hint').length;
    const scoreGain = Math.max(0.2, 1 - 0.3 * hintsShown);
    State.score += scoreGain;
    fb.textContent = `Верно! +${scoreGain.toFixed(1)} балла`;
    fb.classList.add('ok');
    el.checkBtn.disabled = true;
    el.hintBtn.disabled = true;
    el.nextBtn.classList.remove('hidden');
    if (!State.exerciseRecorded) {
      State.exerciseRecorded = true;
      updateProgress(true);
    }
  } else if (State.attemptsForCurrent >= MAX_ATTEMPTS) {
    fb.textContent = `Правильный ответ: ${ex.answer}. Не расстраивайтесь — продолжайте!`;
    fb.classList.add('err');
    el.checkBtn.disabled = true;
    el.hintBtn.disabled = true;
    el.nextBtn.classList.remove('hidden');
    if (!State.exerciseRecorded) {
      State.exerciseRecorded = true;
      updateProgress(false);
    }
  } else {
    fb.textContent = State.attemptsForCurrent === 1
      ? 'Почти! Подумайте ещё…'
      : 'Неверно. Попробуйте ещё раз или откройте подсказку.';
    fb.classList.add('err');
  }
}

function updateProgress(correct) {
  const key = State.currentLesson.id;
  const stats = loadStats();
  const item = stats[key] || { correct: 0, total: 0, timeMs: 0 };
  item.total += 1;
  if (correct) item.correct += 1;
  stats[key] = item;
  saveStats(stats);
}

function nextExercise() {
  if (State.idx < State.shuffledExercises.length - 1) {
    State.idx += 1;
    showExercise();
  } else {
    finishLesson();
  }
}

function finishLesson() {
  const duration = Date.now() - State.startedAt;
  const stats = loadStats();
  const key = State.currentLesson.id;
  const item = stats[key] || { correct: 0, total: 0, timeMs: 0 };
  item.timeMs += duration;
  stats[key] = item;
  saveStats(stats);

  const total = State.shuffledExercises.length;
  const pct = Math.round(100 * State.score / total);
  const medal = pct >= 90 ? '🏆' : pct >= 70 ? '⭐' : pct >= 50 ? '👍' : '💪';

  el.exerciseArea.classList.add('hidden');
  el.summary.classList.remove('hidden');
  el.summaryBody.innerHTML = `
    <div style="text-align:center;font-size:40px;margin-bottom:8px">${medal}</div>
    <div class="stat">
      <div class="kpi"><div>Баллы</div><div style="font-size:32px;font-weight:800">${State.score.toFixed(1)}</div></div>
      <div class="kpi"><div>Результат</div><div style="font-size:32px;font-weight:800">${pct}%</div></div>
      <div class="kpi"><div>Заданий</div><div style="font-size:32px;font-weight:800">${total}</div></div>
      <div class="kpi"><div>Время</div><div style="font-size:18px">${formatMs(duration)}</div></div>
    </div>
    <p class="meta" style="margin-top:12px">Подсказки уменьшают баллы за задание. Повторите блок для улучшения результата.</p>
  `;
}

function formatMs(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m} мин ${r} сек`;
}

el.hintBtn.onclick = revealHint;
el.checkBtn.onclick = checkAnswer;
el.nextBtn.onclick = nextExercise;
