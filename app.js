/* v0.5 */
const LESSONS_URL = 'data/lessons.json';
const LS_KEY      = 'mt4_stats_v0_1';
const LS_BEST     = 'mt4_best_v0_1';
const MAX_ATTEMPTS = 3;

const State = {
  lessons: [],
  currentLesson: null,
  shuffledExercises: [],
  wrongExercises: [],
  idx: 0, score: 0,
  attemptsForCurrent: 0,
  startedAt: 0,
  exerciseRecorded: false,
  isReviewMode: false,
};

const el = {
  lessonList:    document.getElementById('lesson-list'),
  exerciseArea:  document.getElementById('exercise-area'),
  intro:         document.getElementById('intro'),
  summary:       document.getElementById('summary-area'),
  summaryBody:   document.getElementById('summary-body'),
  lessonTitle:   document.getElementById('lesson-title'),
  progress:      document.getElementById('progress'),
  exerciseBody:  document.getElementById('exercise-body'),
  backToLessons: document.getElementById('back-to-lessons'),
  toHome:        document.getElementById('to-lessons-from-summary'),
  hintBtn:       document.getElementById('hint-btn'),
  checkBtn:      document.getElementById('check-btn'),
  nextBtn:       document.getElementById('next-btn'),
  retryBtn:      document.getElementById('retry-wrong-btn'),
  globalStats:   document.getElementById('global-stats'),
};

/* ── Storage ─────────────────────────────────────────────────── */
function loadStats()     { try { return JSON.parse(localStorage.getItem(LS_KEY)  || '{}'); } catch(e) { return {}; } }
function saveStats(s)    { localStorage.setItem(LS_KEY,  JSON.stringify(s)); }
function loadBest()      { try { return JSON.parse(localStorage.getItem(LS_BEST) || '{}'); } catch(e) { return {}; } }
function saveBest(b)     { localStorage.setItem(LS_BEST, JSON.stringify(b)); }

/* ── Helpers ─────────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function stars(pct) { return pct >= 85 ? 3 : pct >= 60 ? 2 : pct >= 1 ? 1 : 0; }
function starsHtml(n, color) {
  const filled = `<span style="color:${color || '#ffcd3c'}">★</span>`;
  const empty  = `<span style="color:#2e3352">★</span>`;
  return filled.repeat(n) + empty.repeat(3 - n);
}
function normalizeAnswer(ans) {
  return String(ans).toLowerCase().trim().replace(/\s*\/\s*/g, '/');
}
function formatMs(ms) {
  const s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60;
  return `${m} мин ${r} сек`;
}

/* ── Boot ────────────────────────────────────────────────────── */
fetch(LESSONS_URL)
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(data => { State.lessons = data.lessons; renderLessons(); })
  .catch(() => {
    el.lessonList.innerHTML = '<p style="color:var(--red);padding:16px">Не удалось загрузить задания. Обновите страницу.</p>';
  });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/* ── Home screen ─────────────────────────────────────────────── */
function renderGlobalStats() {
  const s = loadStats();
  let done = 0, correct = 0;
  for (const v of Object.values(s)) { done += v.total || 0; correct += v.correct || 0; }
  if (!done) { el.globalStats.classList.add('hidden'); return; }
  const acc = Math.round(100 * correct / done);
  const started = Object.values(s).filter(v => v.total > 0).length;
  el.globalStats.classList.remove('hidden');
  el.globalStats.innerHTML = `
    <div class="gstat"><div class="gstat-num">${done}</div><div class="gstat-label">заданий</div></div>
    <div class="gstat-sep"></div>
    <div class="gstat"><div class="gstat-num">${acc}%</div><div class="gstat-label">точность</div></div>
    <div class="gstat-sep"></div>
    <div class="gstat"><div class="gstat-num">${started}</div><div class="gstat-label">из ${State.lessons.length} тем</div></div>
  `;
}

function renderLessons() {
  const stats = loadStats();
  const best  = loadBest();
  renderGlobalStats();
  el.lessonList.innerHTML = '';
  State.lessons.forEach(lesson => {
    const s = stats[lesson.id] || { correct: 0, total: 0 };
    const b = best[lesson.id] || 0;
    const pct = s.total ? Math.round(100 * s.correct / s.total) : 0;
    const n = stars(b);
    const color = lesson.color || '#5b8eff';

    const div = document.createElement('div');
    div.className = 'lesson';
    div.innerHTML = `
      <div class="lesson-bar" style="background:${color}"></div>
      <div class="lesson-icon-wrap" style="background:${color}22; color:${color}">${lesson.icon || '?'}</div>
      <h3>${lesson.title}</h3>
      <div class="meta">${lesson.desc}</div>
      <div class="lesson-stars">${starsHtml(n, color)}</div>
      ${s.total ? `
        <div class="lesson-mini-bar">
          <div class="lesson-mini-fill" style="background:${color}; width:${pct}%"></div>
        </div>
        <div class="meta">${pct}% верно · ${s.total} заданий</div>
      ` : '<div class="meta" style="color:var(--text-dim)">Ещё не начато</div>'}
      <div class="lesson-footer">
        <button class="btn btn-primary start-btn">Начать</button>
        ${s.total ? `<button class="btn btn-ghost reset-btn">Сбросить</button>` : ''}
      </div>
    `;
    div.querySelector('.start-btn').onclick = () => startLesson(lesson.id);
    if (s.total) div.querySelector('.reset-btn').onclick = () => resetLesson(lesson.id);
    el.lessonList.appendChild(div);
  });
}

function resetLesson(id) {
  const s = loadStats(); delete s[id]; saveStats(s);
  const b = loadBest();  delete b[id]; saveBest(b);
  renderLessons();
}

/* ── Lesson flow ─────────────────────────────────────────────── */
function startLesson(id) {
  const lesson = State.lessons.find(l => l.id === id);
  State.currentLesson  = lesson;
  State.shuffledExercises = shuffle(lesson.exercises);
  State.wrongExercises = [];
  State.isReviewMode   = false;
  State.idx = 0; State.score = 0;
  State.startedAt = Date.now();
  show('exercise');
  el.lessonTitle.textContent = lesson.title;
  showExercise();
}

function startReviewMode() {
  State.shuffledExercises = shuffle([...State.wrongExercises]);
  State.wrongExercises = [];
  State.isReviewMode   = true;
  State.idx = 0; State.score = 0;
  State.startedAt = Date.now();
  show('exercise');
  el.lessonTitle.textContent = `Повтор ошибок: ${State.currentLesson.title}`;
  showExercise();
}

function show(screen) {
  el.intro.classList.add('hidden');
  el.exerciseArea.classList.add('hidden');
  el.summary.classList.add('hidden');
  if (screen === 'home')     { el.intro.classList.remove('hidden'); renderLessons(); }
  if (screen === 'exercise') { el.exerciseArea.classList.remove('hidden'); }
  if (screen === 'summary')  { el.summary.classList.remove('hidden'); }
}

/* ── Exercise render ─────────────────────────────────────────── */
function cur() { return State.shuffledExercises[State.idx]; }

function showExercise() {
  const ex    = cur();
  const total = State.shuffledExercises.length;
  const pct   = Math.round(100 * State.idx / total);

  el.progress.innerHTML = `
    <div class="progress-label">Задание ${State.idx + 1} / ${total}</div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  `;

  State.attemptsForCurrent = 0;
  State.exerciseRecorded   = false;
  el.nextBtn.classList.add('hidden');
  el.checkBtn.disabled = false;
  el.checkBtn.classList.remove('hidden');
  el.hintBtn.classList.remove('hidden');
  el.hintBtn.disabled = !ex.hints || !ex.hints.length;

  const wrap = document.createElement('div');
  wrap.className = 'exercise';
  wrap.innerHTML = `<div class="q">${ex.q}</div>`;

  if (ex.type === 'choice') {
    const box = document.createElement('div');
    box.className = 'choices';
    shuffle(ex.options).forEach(opt => {
      const c = document.createElement('div');
      c.className = 'choice'; c.textContent = opt;
      c.onclick = () => {
        [...box.children].forEach(ch => ch.classList.remove('selected'));
        c.classList.add('selected');
      };
      box.appendChild(c);
    });
    wrap.appendChild(box);
  }

  if (ex.type === 'input') {
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = 'Введите ответ';
    input.dataset.role = 'answer';
    input.onkeydown = e => { if (e.key === 'Enter') checkAnswer(); };
    wrap.appendChild(input);
    requestAnimationFrame(() => input.focus());
  }

  if (ex.type === 'order') {
    el.checkBtn.classList.add('hidden');
    el.hintBtn.classList.add('hidden');
    const correctOrder = ex.answer.map(a => ex.steps.indexOf(a));
    const taskDiv = document.createElement('div');
    wrap.appendChild(taskDiv);
    new SequenceOrderTask({
      container: taskDiv, items: ex.steps, correctOrder,
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
  el.exerciseBody.appendChild(wrap);

  const hintBox = document.createElement('div'); hintBox.id = 'hint-box';
  const fb      = document.createElement('div'); fb.id = 'feedback';
  el.exerciseBody.appendChild(hintBox);
  el.exerciseBody.appendChild(fb);
}

/* ── Hint ────────────────────────────────────────────────────── */
function revealHint() {
  const ex = cur(); if (!ex.hints || !ex.hints.length) return;
  const box  = document.getElementById('hint-box');
  const shown = box.querySelectorAll('.hint').length;
  if (shown < ex.hints.length) {
    const h = document.createElement('div');
    h.className = 'hint'; h.textContent = ex.hints[shown];
    box.appendChild(h);
  }
}

/* ── Answer checking ─────────────────────────────────────────── */
function getAnswer(ex) {
  if (ex.type === 'choice') {
    const sel = document.querySelector('.choice.selected');
    return sel ? sel.textContent : null;
  }
  if (ex.type === 'input') {
    const inp = document.querySelector('input[data-role="answer"]');
    return inp ? inp.value.trim() : null;
  }
  return null;
}

function isCorrect(ex, ans) {
  if (ans == null || ans === '') return false;
  const norm = normalizeAnswer(ans);
  if (norm === normalizeAnswer(ex.answer)) return true;
  if (ex.accept) return ex.accept.some(a => norm === normalizeAnswer(a));
  return false;
}

function checkAnswer() {
  const ex  = cur();
  const ans = getAnswer(ex);
  State.attemptsForCurrent += 1;
  const fb  = document.getElementById('feedback');
  fb.className = 'feedback';

  if (isCorrect(ex, ans)) {
    const hintsShown = document.getElementById('hint-box').querySelectorAll('.hint').length;
    const gain = Math.max(0.2, 1 - 0.3 * hintsShown);
    State.score += gain;
    fb.textContent = `Верно! +${gain.toFixed(1)} балла`;
    fb.classList.add('ok');
    el.checkBtn.disabled = true; el.hintBtn.disabled = true;
    el.nextBtn.classList.remove('hidden');
    if (!State.exerciseRecorded) { State.exerciseRecorded = true; updateProgress(true); }

  } else if (State.attemptsForCurrent >= MAX_ATTEMPTS) {
    fb.textContent = `Правильный ответ: ${ex.answer}. Не расстраивайтесь — продолжайте!`;
    fb.classList.add('err');
    el.checkBtn.disabled = true; el.hintBtn.disabled = true;
    el.nextBtn.classList.remove('hidden');
    if (!State.exerciseRecorded) {
      State.exerciseRecorded = true;
      updateProgress(false);
      State.wrongExercises.push(ex);
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
  const s   = loadStats();
  const item = s[key] || { correct: 0, total: 0, timeMs: 0 };
  item.total += 1; if (correct) item.correct += 1;
  s[key] = item; saveStats(s);
}

function nextExercise() {
  if (State.idx < State.shuffledExercises.length - 1) { State.idx += 1; showExercise(); }
  else finishLesson();
}

/* ── Summary ─────────────────────────────────────────────────── */
function finishLesson() {
  const duration = Date.now() - State.startedAt;
  const s   = loadStats(); const key = State.currentLesson.id;
  const item = s[key] || { correct: 0, total: 0, timeMs: 0 };
  item.timeMs += duration; s[key] = item; saveStats(s);

  const total = State.shuffledExercises.length;
  const pct   = Math.round(100 * State.score / total);
  const medal = pct >= 90 ? '🏆' : pct >= 70 ? '⭐' : pct >= 50 ? '👍' : '💪';

  // Update best score
  if (!State.isReviewMode) {
    const best = loadBest();
    if (pct > (best[key] || 0)) { best[key] = pct; saveBest(best); }
  }

  show('summary');
  el.summaryBody.innerHTML = `
    <div class="summary-medal">${medal}</div>
    <div class="stat">
      <div class="kpi"><div class="kpi-val">${State.score.toFixed(1)}</div><div class="kpi-label">Баллы</div></div>
      <div class="kpi"><div class="kpi-val">${pct}%</div><div class="kpi-label">Результат</div></div>
      <div class="kpi"><div class="kpi-val">${total}</div><div class="kpi-label">Заданий</div></div>
      <div class="kpi"><div class="kpi-val" style="font-size:20px">${formatMs(duration)}</div><div class="kpi-label">Время</div></div>
    </div>
    <p class="summary-note">Подсказки снижают баллы за задание. Повторите блок — улучшите результат.</p>
  `;

  if (State.wrongExercises.length > 0 && !State.isReviewMode) {
    el.retryBtn.textContent = `Повторить ошибки (${State.wrongExercises.length})`;
    el.retryBtn.classList.remove('hidden');
  } else {
    el.retryBtn.classList.add('hidden');
  }
}

/* ── Event wiring ────────────────────────────────────────────── */
el.backToLessons.onclick = () => show('home');
el.toHome.onclick        = () => show('home');
el.hintBtn.onclick       = revealHint;
el.checkBtn.onclick      = checkAnswer;
el.nextBtn.onclick       = nextExercise;
el.retryBtn.onclick      = startReviewMode;
