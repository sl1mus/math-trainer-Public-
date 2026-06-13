/* v0.7 */
const LESSONS_URL = 'data/lessons.json';
const LS_USERS    = 'mt4_users_v1';
const LS_CURRENT  = 'mt4_current_user';
const MAX_ATTEMPTS = 3;

let currentUserId = null;
function statsKey() { return `mt4_stats_v0_1_${currentUserId || 'guest'}`; }
function bestKey()  { return `mt4_best_v0_1_${currentUserId || 'guest'}`; }

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
  auth:          document.getElementById('auth-screen'),
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
  headerUser:    document.getElementById('header-user'),
  yorkieWrap:    document.getElementById('yorkie-wrap'),
};

/* ── Storage ─────────────────────────────────────────────────── */
function loadStats()  { try { return JSON.parse(localStorage.getItem(statsKey()) || '{}'); } catch(e) { return {}; } }
function saveStats(s) { localStorage.setItem(statsKey(), JSON.stringify(s)); }
function loadBest()   { try { return JSON.parse(localStorage.getItem(bestKey())  || '{}'); } catch(e) { return {}; } }
function saveBest(b)  { localStorage.setItem(bestKey(),  JSON.stringify(b)); }

/* ── Users ───────────────────────────────────────────────────── */
function getUsers()    { try { return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); } catch(e) { return []; } }
function saveUsers(u)  { localStorage.setItem(LS_USERS, JSON.stringify(u)); }

function createUser(name) {
  const users = getUsers();
  const id    = 'u' + Date.now();
  users.push({ id, name: name.trim() });
  saveUsers(users);
  return id;
}

function updateHeaderUser(name) {
  if (name) {
    el.headerUser.textContent = name;
    el.headerUser.classList.remove('hidden');
  } else {
    el.headerUser.classList.add('hidden');
  }
}

function loginAs(userId) {
  currentUserId = userId;
  localStorage.setItem(LS_CURRENT, userId);
  const user = getUsers().find(u => u.id === userId);
  updateHeaderUser(user ? user.name : '');
  show('home');
}

function logoutUser() {
  localStorage.removeItem(LS_CURRENT);
  currentUserId = null;
  stopYorkie();
  show('auth');
}

function renderAuthScreen() {
  const users    = getUsers();
  const userList = document.getElementById('auth-user-list');
  const nameInp  = document.getElementById('auth-name-input');
  const startBtn = document.getElementById('auth-start-btn');

  userList.innerHTML = '';
  users.forEach(u => {
    const card = document.createElement('button');
    card.className = 'auth-user-card';
    card.innerHTML = `<div class="auth-avatar">${u.name.charAt(0).toUpperCase()}</div>${u.name}`;
    card.onclick = () => loginAs(u.id);
    userList.appendChild(card);
  });

  startBtn.onclick = () => {
    const name = nameInp.value.trim();
    if (!name) { nameInp.focus(); return; }
    const id = createUser(name);
    loginAs(id);
  };
  nameInp.onkeydown = e => { if (e.key === 'Enter') startBtn.click(); };
  if (!users.length) requestAnimationFrame(() => nameInp.focus());
}

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
function starsHtml(n) {
  const filled = `<span style="color:#fff">★</span>`;
  const empty  = `<span style="color:rgba(255,255,255,.15)">★</span>`;
  return filled.repeat(n) + empty.repeat(3 - n);
}
function normalizeAnswer(ans) {
  return String(ans).toLowerCase().trim().replace(/\s*\/\s*/g, '/');
}
function formatMs(ms) {
  const s = Math.round(ms / 1000), m = Math.floor(s / 60), r = s % 60;
  return `${m} мин ${r} сек`;
}

/* ── Confetti ────────────────────────────────────────────────── */
function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width  = window.innerWidth  * dpr;
  const H = canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = window.innerWidth, h = window.innerHeight;

  const COLORS = ['#ffffff','#00e887','#5b8eff','#ffcd3c','#ff3b4e','#a06dff','#00c8ff','#ff8c00'];

  const pieces = Array.from({ length: 150 }, () => ({
    x:    Math.random() * w,
    y:    -30 - Math.random() * h * 0.6,
    pw:   Math.random() * 10 + 6,
    ph:   Math.random() * 6  + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot:  Math.random() * Math.PI * 2,
    drot: (Math.random() - 0.5) * 0.22,
    vx:   (Math.random() - 0.5) * 5,
    vy:   Math.random() * 5 + 3,
    alpha: 1,
  }));

  let raf;
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of pieces) {
      p.x   += p.vx;
      p.y   += p.vy;
      p.vy  += 0.15;
      p.vx  *= 0.99;
      p.rot += p.drot;
      if (p.y > h * 0.7) p.alpha = Math.max(0, p.alpha - 0.03);
      if (p.alpha > 0) alive = true;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.pw / 2, -p.ph / 2, p.pw, p.ph);
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(tick);
    else canvas.remove();
  };
  raf = requestAnimationFrame(tick);
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove(); }, 4500);
}

/* ── Boot ────────────────────────────────────────────────────── */
fetch(LESSONS_URL)
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(data => {
    State.lessons = data.lessons;
    const savedId = localStorage.getItem(LS_CURRENT);
    if (savedId) {
      const user = getUsers().find(u => u.id === savedId);
      if (user) { currentUserId = savedId; updateHeaderUser(user.name); show('home'); return; }
    }
    show('auth');
  })
  .catch(() => {
    el.lessonList.innerHTML = '<p style="color:var(--red);padding:16px">Не удалось загрузить задания. Обновите страницу.</p>';
    show('auth');
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
    <div class="gstat"><div class="gstat-num">${done}</div><div class="gstat-label">Заданий решено</div></div>
    <div class="gstat"><div class="gstat-num">${acc}%</div><div class="gstat-label">Точность</div></div>
    <div class="gstat"><div class="gstat-num">${started}/${State.lessons.length}</div><div class="gstat-label">Тем начато</div></div>
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
      <div class="lesson-icon-wrap" style="color:${color}">${lesson.icon || '?'}</div>
      <div class="lesson-info">
        <h3>${lesson.title}</h3>
        <div class="meta">${lesson.desc}</div>
        ${s.total ? `
          <div class="lesson-prog">
            <div class="lesson-mini-bar"><div class="lesson-mini-fill" style="background:${color}; width:${pct}%"></div></div>
            <span class="lesson-pct-label">${pct}% верно · ${s.total} заданий</span>
          </div>
        ` : ''}
      </div>
      <div class="lesson-right">
        <div class="lesson-stars">${starsHtml(n)}</div>
        <button class="btn btn-primary start-btn">Начать →</button>
        ${s.total ? `<button class="btn btn-ghost reset-btn">Сбросить</button>` : ''}
      </div>
    `;
    div.onclick = (e) => { if (!e.target.closest('.reset-btn')) startLesson(lesson.id); };
    if (s.total) div.querySelector('.reset-btn').onclick = (e) => { e.stopPropagation(); resetLesson(lesson.id); };
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
  el.auth.classList.add('hidden');
  el.intro.classList.add('hidden');
  el.exerciseArea.classList.add('hidden');
  el.summary.classList.add('hidden');
  if (screen !== 'exercise') stopYorkie();
  if (screen === 'auth')     { el.auth.classList.remove('hidden'); renderAuthScreen(); }
  if (screen === 'home')     { el.intro.classList.remove('hidden'); renderLessons(); }
  if (screen === 'exercise') { el.exerciseArea.classList.remove('hidden'); scheduleYorkie(); }
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
    triggerConfetti();
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

/* ── Yorkie ──────────────────────────────────────────────────── */
const YORKIE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 78" width="110" height="78">
  <path d="M20 42 C11 32 10 20 17 13 C21 8 27 11 25 19" fill="none" stroke="#1c1c28" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="50" cy="48" rx="30" ry="17" fill="#1c1c28"/>
  <ellipse cx="57" cy="54" rx="19" ry="10" fill="#c47a10"/>
  <rect x="72" y="31" width="15" height="21" rx="7" fill="#1c1c28"/>
  <circle cx="87" cy="27" r="17" fill="#1c1c28"/>
  <ellipse cx="97" cy="33" rx="10" ry="8" fill="#c47a10"/>
  <ellipse cx="98" cy="40" rx="8" ry="6" fill="#e8951a"/>
  <circle cx="91" cy="22" r="4" fill="#0c0c12"/>
  <circle cx="92.2" cy="20.8" r="1.4" fill="rgba(255,255,255,0.75)"/>
  <ellipse cx="102" cy="30" rx="4" ry="3" fill="#0c0c12"/>
  <ellipse cx="91" cy="16" rx="3" ry="2.3" fill="#c47a10"/>
  <polygon points="79,14 72,1 86,9" fill="#141420"/>
  <polygon points="87,12 81,0 96,7" fill="#141420"/>
  <polygon points="87,13 83,3 94,9" fill="#9a5a08"/>
  <rect class="leg leg-a" x="26" y="61" width="9" height="15" rx="4" fill="#c47a10"/>
  <rect class="leg leg-b" x="37" y="62" width="8" height="14" rx="4" fill="#1c1c28"/>
  <rect class="leg leg-b" x="65" y="59" width="9" height="16" rx="4" fill="#c47a10"/>
  <rect class="leg leg-a" x="75" y="60" width="8" height="15" rx="4" fill="#1c1c28"/>
</svg>`;

const YORKIE_MSGS = [
  'Ты сюда пришёл учиться, а не играть! 📚',
  'Математика сама себя не выучит! 🧮',
  'Гав! Решай задачи, а не гоняйся за мной!',
  'Сначала учёба, потом прогулка! 🐾',
  'Я занятой пёс. И ты тоже будь занятым! ✏️',
  'Стоп! Вернись к заданию! 🐕',
];

let yorkieTimer   = null;
let yorkieActive  = false;

function spawnYorkie() {
  if (!yorkieActive) return;
  const wrap = el.yorkieWrap;
  wrap.innerHTML = YORKIE_SVG;
  wrap.classList.add('active');

  const ltr      = Math.random() > 0.5;
  const duration = (3.5 + Math.random() * 1.5).toFixed(2);
  wrap.style.animation = 'none';
  wrap.offsetHeight;
  wrap.style.animation = ltr
    ? `yorkie-run-ltr ${duration}s linear forwards`
    : `yorkie-run-rtl ${duration}s linear forwards`;

  wrap.addEventListener('animationend', () => {
    wrap.innerHTML = '';
    wrap.classList.remove('active');
    wrap.style.animation = 'none';
    if (yorkieActive) yorkieTimer = setTimeout(spawnYorkie, 30000 + Math.random() * 60000);
  }, { once: true });
}

function scheduleYorkie() {
  yorkieActive = true;
  yorkieTimer  = setTimeout(spawnYorkie, 15000 + Math.random() * 25000);
}

function stopYorkie() {
  yorkieActive = false;
  clearTimeout(yorkieTimer);
  el.yorkieWrap.innerHTML      = '';
  el.yorkieWrap.style.animation = 'none';
  el.yorkieWrap.classList.remove('active');
}

el.yorkieWrap.onclick = () => {
  if (el.yorkieWrap.querySelector('.yorkie-bubble')) return;
  const msg    = YORKIE_MSGS[Math.floor(Math.random() * YORKIE_MSGS.length)];
  const bubble = document.createElement('div');
  bubble.className   = 'yorkie-bubble';
  bubble.textContent = msg;
  el.yorkieWrap.appendChild(bubble);
  setTimeout(() => bubble.remove(), 2500);
};

/* ── Event wiring ────────────────────────────────────────────── */
el.headerUser.onclick    = logoutUser;
el.backToLessons.onclick = () => show('home');
el.toHome.onclick        = () => show('home');
el.hintBtn.onclick       = revealHint;
el.checkBtn.onclick      = checkAnswer;
el.nextBtn.onclick       = nextExercise;
el.retryBtn.onclick      = startReviewMode;
