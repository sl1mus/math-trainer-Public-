/* v0.3 */
const LESSONS_URL = 'data/lessons.json';
const LS_KEY = 'mt4_stats_v0_1';

const State = {
  lessons: [], currentLesson: null, idx: 0, score: 0,
  attemptsForCurrent: 0, startedAt: 0, exerciseRecorded: false,
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
    const div = document.createElement('div');
    div.className = 'lesson';
    div.innerHTML = `
      <h3>${lesson.title}</h3>
      <div class="meta">${lesson.desc}</div>
      <div class="meta">Правильно: ${pct}% · Пройдено заданий: ${s.total || 0}</div>
      <button class="btn btn-primary">Начать</button>
    `;
    div.querySelector('button').onclick = () => startLesson(lesson.id);
    el.lessonList.appendChild(div);
  });
}

function startLesson(lessonId) {
  const lesson = State.lessons.find(l => l.id === lessonId);
  State.currentLesson = lesson;
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

function currentExercise() { return State.currentLesson.exercises[State.idx]; }

function showExercise() {
  const ex = currentExercise();
  el.progress.textContent = `Задание ${State.idx + 1} из ${State.currentLesson.exercises.length}`;
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
    ex.options.forEach(opt => {
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
          updateProgressAfterExercise(true);
        } else if (!ok && !State.exerciseRecorded) {
          updateProgressAfterExercise(false);
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
      updateProgressAfterExercise(true);
    }
  } else if (State.attemptsForCurrent >= MAX_ATTEMPTS) {
    fb.textContent = `Правильный ответ: ${ex.answer}. Не расстраивайтесь — продолжайте!`;
    fb.classList.add('err');
    el.checkBtn.disabled = true;
    el.hintBtn.disabled = true;
    el.nextBtn.classList.remove('hidden');
    if (!State.exerciseRecorded) {
      State.exerciseRecorded = true;
      updateProgressAfterExercise(false);
    }
  } else {
    fb.textContent = State.attemptsForCurrent === 1
      ? 'Почти! Подумайте ещё…'
      : 'Неверно. Попробуйте ещё раз или откройте подсказку.';
    fb.classList.add('err');
  }
}

function updateProgressAfterExercise(correct) {
  const key = State.currentLesson.id;
  const stats = loadStats();
  const item = stats[key] || { correct: 0, total: 0, timeMs: 0 };
  item.total += 1;
  if (correct) item.correct += 1;
  stats[key] = item;
  saveStats(stats);
}

function nextExercise() {
  if (State.idx < State.currentLesson.exercises.length - 1) {
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
  const total = State.currentLesson.exercises.length;
  const pct = Math.round(100 * (State.score / total));
  el.exerciseArea.classList.add('hidden');
  el.summary.classList.remove('hidden');
  el.summaryBody.innerHTML = `
    <div class="stat">
      <div class="kpi"><div>Баллы</div><div style="font-size:32px;font-weight:800">${State.score.toFixed(1)}</div></div>
      <div class="kpi"><div>Процент</div><div style="font-size:32px;font-weight:800">${pct}%</div></div>
      <div class="kpi"><div>Заданий</div><div style="font-size:32px;font-weight:800">${total}</div></div>
      <div class="kpi"><div>Время</div><div style="font-size:18px">${formatMs(duration)}</div></div>
    </div>
    <p class="meta">Подсказки уменьшают баллы за задание. Повторите блок для улучшения результата.</p>
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
