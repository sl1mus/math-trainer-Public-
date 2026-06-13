
/**
 * v0.3 SequenceOrderTask
 * Replaces drag-and-drop with accessible "click-to-order".
 * Usage:
 *   const task = new SequenceOrderTask({
 *     container: document.getElementById('task'),
 *     items: ['3+4', '5+2', '6+1'],
 *     correctOrder: [0,1,2], // indexes in ascending-result order
 *     onFinish: (ok, attempts) => console.log(ok, attempts)
 *   });
 */
class SequenceOrderTask {
  constructor({ container, items, correctOrder, onFinish }) {
    this.root = container;
    this.items = items.map((text, i) => ({ id: i, text }));
    this.correctOrder = correctOrder;
    this.onFinish = onFinish || (()=>{});
    this.picked = [];
    this.attempts = 0;
    this.render();
  }

  render() {
    this.root.innerHTML = `
      <div class="seq">
        <div class="seq__label">Нажимайте шаги в правильном порядке:</div>
        <div class="seq__pool" role="list" aria-label="Варианты">
          ${this.items.map(it => `
            <button class="seq__item" data-id="${it.id}" role="listitem" aria-pressed="false">
              ${it.text}
            </button>
          `).join('')}
        </div>
        <div class="seq__label">Ваш порядок:</div>
        <div class="seq__target" role="list" aria-label="Порядок решения"></div>
        <div class="seq__controls">
          <button id="seq-check" class="seq__btn">Проверить</button>
          <button id="seq-reset" class="seq__btn seq__btn--ghost">Сбросить</button>
        </div>
      </div>
    `;
    this.pool = this.root.querySelector('.seq__pool');
    this.target = this.root.querySelector('.seq__target');
    this.pool.addEventListener('click', (e) => {
      const btn = e.target.closest('.seq__item');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (this.picked.includes(id)) return;
      this.picked.push(id);
      btn.setAttribute('aria-pressed','true');
      btn.disabled = true;
      this._renderTarget();
    });
    this.root.querySelector('#seq-reset').addEventListener('click', () => this.reset());
    this.root.querySelector('#seq-check').addEventListener('click', () => this.check());
  }

  _renderTarget() {
    this.target.innerHTML = this.picked.map((id, idx) => {
      const text = this.items.find(it => it.id === id).text;
      return `<div class="seq__picked"><span class="seq__badge">${idx+1}</span>${text}</div>`;
    }).join('');
  }

  reset() {
    this.picked = [];
    this.attempts = 0;
    this.render();
  }

  check() {
    if (this.picked.length !== this.items.length) {
      this._flash('Поставь все элементы по порядку');
      return;
    }
    this.attempts++;
    const isCorrect = this.picked.every((id, idx) => id === this.correctOrder[idx]);
    if (isCorrect) {
      this._flash('Верно!', true);
      this.onFinish(true, this.attempts);
    } else {
      this._flash('Есть ошибка. Попробуй ещё.');
      this.onFinish(false, this.attempts);
    }
  }

  _flash(msg, ok=false) {
    let el = this.root.querySelector('.seq__flash');
    if (!el) {
      el = document.createElement('div');
      el.className = 'seq__flash';
      this.root.appendChild(el);
    }
    el.textContent = msg;
    el.setAttribute('data-ok', ok ? '1' : '0');
    clearTimeout(this._t);
    this._t = setTimeout(() => el.textContent = '', 1500);
  }
}

window.SequenceOrderTask = SequenceOrderTask;
