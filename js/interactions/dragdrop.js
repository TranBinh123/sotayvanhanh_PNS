/* ============================================
   interactions/dragdrop.js
   Hỗ trợ chuột + cảm ứng. Kéo .dd-item (cột A) thả vào
   .dd-target (cột B). data-pairs='[{"a":"...","b":"..."}]'
   Mỗi .dd-item có data-match trùng với data-match của .dd-target đúng.
   ============================================ */

class DragDrop {
  constructor(containerEl) {
    this.container = (typeof containerEl === 'string') ? document.querySelector(containerEl) : containerEl;
    this.attempts = 0;
    this.correctCount = 0;
    this._onInteract = null;
    this._onComplete = null;
    this._draggedEl = null;
  }

  init() {
    if (!this.container) return;
    this.items = [...this.container.querySelectorAll('.dd-item')];
    this.targets = [...this.container.querySelectorAll('.dd-target')];

    this.items.forEach(item => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e) => this._onDragStart(e, item));
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      // touch support
      item.addEventListener('touchstart', (e) => this._onTouchStart(e, item), { passive: true });
    });

    this.targets.forEach(target => {
      target.addEventListener('dragover', (e) => e.preventDefault());
      target.addEventListener('drop', (e) => this._onDrop(e, target));
    });

    document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this._onTouchEnd(e));
  }

  _onDragStart(e, item) {
    this._draggedEl = item;
    item.classList.add('dragging');
    e.dataTransfer.setData('text/plain', item.dataset.match);
  }

  _onDrop(e, target) {
    e.preventDefault();
    const matchId = e.dataTransfer.getData('text/plain');
    this._resolveDrop(matchId, target, this._draggedEl);
  }

  _onTouchStart(e, item) {
    this._draggedEl = item;
    item.classList.add('dragging');
  }

  _onTouchMove(e) {
    if (this._draggedEl) e.preventDefault();
  }

  _onTouchEnd(e) {
    if (!this._draggedEl) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el && el.closest ? el.closest('.dd-target') : null;
    if (target) this._resolveDrop(this._draggedEl.dataset.match, target, this._draggedEl);
    this._draggedEl.classList.remove('dragging');
    this._draggedEl = null;
  }

  _resolveDrop(matchId, target, draggedItem) {
    this.attempts++;
    const isCorrect = target.dataset.match === matchId;
    target.classList.remove('correct', 'incorrect');
    target.classList.add(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      this.correctCount++;
      target.innerHTML = draggedItem.innerHTML;
      draggedItem.setAttribute('draggable', 'false');
      draggedItem.style.opacity = '.35';
      draggedItem.style.cursor = 'default';
    } else {
      setTimeout(() => target.classList.remove('incorrect'), 500);
    }

    if (typeof this._onInteract === 'function') {
      this._onInteract('dragdrop', matchId, { correct: isCorrect, attempts: this.attempts });
    }

    if (this.correctCount === this.targets.length && typeof this._onComplete === 'function') {
      this._onComplete({ attempts: this.attempts, correctCount: this.correctCount });
    }
  }

  onInteract(cb) { this._onInteract = cb; }
  onComplete(cb) { this._onComplete = cb; }
}
