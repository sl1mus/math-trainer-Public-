/* v0.1 core */
const LESSONS_URL = 'data/lessons.json';
const State = { lessons: [], currentLesson: null, idx: 0, score: 0, attemptsForCurrent: 0, startedAt: 0, perLessonStats: {}, };
const elLessonList = document.getElementById('lesson-list');
const elExerciseArea = document.getElementById('exercise-area');
const elIntro = document.getElementById('intro');
const elSummary = document.getElementById('summary-area');
const elSummaryBody = document.getElementById('summary-body');
const elLessonTitle = document.getElementById('lesson-title');
const elProgress = document.getElementById('progress');
const elExerciseBody = document.getElementById('exercise-body');
const elBackToLessons = document.getElementById('back-to-lessons');
const elToLessonsFromSummary = document.getElementById('to-lessons-from-summary');
const elHintBtn = document.getElementById('hint-btn');
const elCheckBtn = document.getElementById('check-btn');
const elNextBtn = document.getElementById('next-btn');
const LS_KEY = 'mt4_stats_v0_1';
function loadStats(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(e){ return {}; } }
function saveStats(stats){ localStorage.setItem(LS_KEY, JSON.stringify(stats)); }
fetch(LESSONS_URL).then(r=>r.json()).then(data=>{ State.lessons = data.lessons; renderLessons(); });
function renderLessons(){
  const stats = loadStats();
  elLessonList.innerHTML = '';
  State.lessons.forEach(lesson => {
    const s = stats[lesson.id] || {correct:0,total:0,timeMs:0};
    const div = document.createElement('div');
    div.className = 'lesson';
    div.innerHTML = `
      <h3>${lesson.title}</h3>
      <div class="meta">${lesson.desc}</div>
      <div class="meta">Пройдено: ${s.total?Math.round(100*s.correct/s.total):0}% · Заданий: ${s.total||0}</div>
      <button class="btn btn-primary">Начать</button>
    `;
    div.querySelector('button').onclick = ()=>startLesson(lesson.id);
    elLessonList.appendChild(div);
  });
}
function startLesson(lessonId){
  const lesson = State.lessons.find(l=>l.id===lessonId);
  State.currentLesson = lesson; State.idx = 0; State.score = 0; State.startedAt = Date.now(); State.perLessonStats = loadStats();
  showExercise(); elIntro.classList.add('hidden'); elSummary.classList.add('hidden'); elExerciseArea.classList.remove('hidden'); elLessonTitle.textContent = lesson.title;
}
elBackToLessons.onclick = ()=>{ elExerciseArea.classList.add('hidden'); elSummary.classList.add('hidden'); elIntro.classList.remove('hidden'); renderLessons(); };
elToLessonsFromSummary.onclick = ()=>{ elSummary.classList.add('hidden'); elIntro.classList.remove('hidden'); renderLessons(); };
function currentExercise(){ return State.currentLesson.exercises[State.idx]; }
function showExercise(){
  const ex = currentExercise();
  elProgress.textContent = `Задание ${State.idx+1} из ${State.currentLesson.exercises.length}`;
  State.attemptsForCurrent = 0; elNextBtn.classList.add('hidden'); elCheckBtn.disabled = false; elHintBtn.disabled = false;
  const container = document.createElement('div'); container.className = 'exercise'; container.innerHTML = `<div class="q">${ex.q}</div>`;
  if(ex.type === 'choice'){
    const box = document.createElement('div'); box.className = 'choices';
    ex.options.forEach((opt, i)=>{ const c = document.createElement('div'); c.className = 'choice'; c.textContent = opt;
      c.onclick = ()=>{ [...box.children].forEach(el=>el.classList.remove('selected')); c.classList.add('selected'); c.dataset.selected = '1'; };
      box.appendChild(c); });
    container.appendChild(box);
  }
  if(ex.type === 'input'){
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Введите ответ'; input.dataset.role = 'answer';
    input.onkeydown = (e)=>{ if(e.key==='Enter'){ checkAnswer(); } }; container.appendChild(input);
  }
  if(ex.type === 'order'){
    const zone = document.createElement('div'); zone.className = 'order-zone'; zone.id = 'drop-zone';
    const pool = document.createElement('div'); pool.className = 'order-zone'; pool.setAttribute('aria-label','Доступные шаги');
    ex.steps.forEach((s,i)=>{ const d = document.createElement('div'); d.className = 'draggable'; d.textContent = s; d.draggable = true; d.dataset.idx = i;
      d.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', s)); pool.appendChild(d); });
    ;[zone,pool].forEach(z=>{ z.addEventListener('dragover', e=>e.preventDefault()); z.addEventListener('drop', e=>{
      e.preventDefault(); const t = e.dataTransfer.getData('text/plain');
      const el = [...pool.children, ...zone.children].find(x=>x.textContent===t); if(el && z!==el.parentElement) z.appendChild(el); }); });
    container.appendChild(document.createElement('div')).outerHTML = '<div class="meta">Перетащите шаги в правильном порядке (слева направо)</div>';
    container.appendChild(zone); container.appendChild(pool);
  }
  elExerciseBody.innerHTML = ''; elExerciseBody.appendChild(container);
  const hintBox = document.createElement('div'); hintBox.id = 'hint-box'; elExerciseBody.appendChild(hintBox);
  const fb = document.createElement('div'); fb.id = 'feedback'; elExerciseBody.appendChild(fb);
}
function revealHint(){
  const ex = currentExercise(); if(!ex.hints || !ex.hints.length) return;
  const box = document.getElementById('hint-box'); const shown = box.querySelectorAll('.hint').length;
  if(shown < ex.hints.length){ const h = document.createElement('div'); h.className = 'hint'; h.textContent = ex.hints[shown]; box.appendChild(h); }
}
function getUserAnswer(ex){
  if(ex.type==='choice'){ const sel = document.querySelector('.choice.selected'); return sel ? sel.textContent : null; }
  if(ex.type==='input'){ const input = document.querySelector('input[data-role="answer"]'); return input ? input.value.trim() : null; }
  if(ex.type==='order'){ const zone = document.getElementById('drop-zone'); return [...zone.children].map(c=>c.textContent); }
  return null;
}
function isCorrect(ex, ans){
  if(ans==null) return false;
  if(ex.type==='choice' || ex.type==='input'){ return String(ans).toLowerCase() === String(ex.answer).toLowerCase(); }
  if(ex.type==='order'){ if(!Array.isArray(ans)) return false; return JSON.stringify(ans) === JSON.stringify(ex.answer); }
  return false;
}
function checkAnswer(){
  const ex = currentExercise(); const ans = getUserAnswer(ex); State.attemptsForCurrent += 1;
  const fb = document.getElementById('feedback'); fb.className = 'feedback';
  if(isCorrect(ex, ans)){
    const hintsShown = (document.getElementById('hint-box').querySelectorAll('.hint')||[]).length;
    const scoreGain = Math.max(0.2, 1 - 0.3 * hintsShown); State.score += scoreGain;
    fb.textContent = `Верно! +${scoreGain.toFixed(1)} балла`; fb.classList.add('ok'); elCheckBtn.disabled = true; elHintBtn.disabled = true; elNextBtn.classList.remove('hidden');
    updateProgressAfterExercise(true);
  } else {
    fb.textContent = State.attemptsForCurrent >= 2 ? 'Неверно. Попробуйте ещё раз или откройте подсказку.' : 'Почти! Подумайте ещё…';
    fb.classList.add('err'); updateProgressAfterExercise(false);
  }
}
function updateProgressAfterExercise(wasAttempt){
  const key = State.currentLesson.id; const stats = loadStats();
  const item = stats[key] || {correct:0,total:0,timeMs:0}; if(wasAttempt){ item.correct += 1; } item.total += 1; stats[key] = item; saveStats(stats);
}
function nextExercise(){ if(State.idx < State.currentLesson.exercises.length-1){ State.idx += 1; showExercise(); } else { finishLesson(); } }
function finishLesson(){
  const duration = Date.now() - State.startedAt; const stats = loadStats(); const key = State.currentLesson.id;
  const item = stats[key] || {correct:0,total:0,timeMs:0}; item.timeMs += duration; stats[key] = item; saveStats(stats);
  const pct = Math.round(100 * (State.score / State.currentLesson.exercises.length)); elExerciseArea.classList.add('hidden'); elSummary.classList.remove('hidden');
  elSummaryBody.innerHTML = `
    <div class="stat">
      <div class="kpi"><div>Баллы</div><div style="font-size:32px;font-weight:800">${State.score.toFixed(1)}</div></div>
      <div class="kpi"><div>Процент</div><div style="font-size:32px;font-weight:800">${pct}%</div></div>
      <div class="kpi"><div>Заданий</div><div style="font-size:32px;font-weight:800">${State.currentLesson.exercises.length}</div></div>
      <div class="kpi"><div>Время</div><div style="font-size:18px">${formatMs(duration)}</div></div>
    </div>
    <p class="meta">Подсказки уменьшают баллы за задание. Повторите блок для улучшения результата.</p>
  `;
}
function formatMs(ms){ const s = Math.round(ms/1000); const m = Math.floor(s/60); const r = s%60; return `${m} мин ${r} сек`; }
document.getElementById('hint-btn').onclick = revealHint;
document.getElementById('check-btn').onclick = checkAnswer;
document.getElementById('next-btn').onclick = nextExercise;
