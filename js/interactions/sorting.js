/* ============================================
   interactions/sorting.js
   Sắp xếp thứ tự đúng bằng kéo-thả trong 1 danh sách.
   container cần <ul class="sorting-list"> chứa <li class="sorting-item"
   data-id="...">nội dung</li>, thứ tự đúng lấy từ data-order-correct
   (mảng id) truyền vào constructor.
   ============================================ */

class Sorting {
  constructor(containerEl, correctOrder) {
    this.container = (typeof containerEl === 'string') ? document.querySelector(containerEl) : containerEl;
    this.list = this.container?.querySelector('.sorting-list');
    this.correctOrder = correctOrder;
    this._onInteract = null;
    this._draggedEl = null;
  }

  init() {
    if (!this.list) return;
    this._renumber();
    [...this.list.children].forEach(item => {
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', () => { this._draggedEl = item; item.classList.add('dragging'); });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => e.preventDefault());
      item.addEventListener('drop', () => this._onDrop(item));
      // touch fallback: chạm để đưa lên đầu danh sách (đơn giản hoá thao tác trên mobile)
      item.addEventListener('touchstart', () => { this._draggedEl = item; }, { passive: true });
    });
  }

  _onDrop(targetItem) {
    if (!this._draggedEl || this._draggedEl === targetItem) return;
    const items = [...this.list.children];
    const draggedIdx = items.indexOf(this._draggedEl);
    const targetIdx = items.indexOf(targetItem);
    if (draggedIdx < targetIdx) {
      targetItem.after(this._draggedEl);
    } else {
      targetItem.before(this._draggedEl);
    }
    this._renumber();
    if (typeof this._onInteract === 'function') this._onInteract('sorting', targetItem.dataset.id, {});
  }

  _renumber() {
    [...this.list.children].forEach((item, i) => {
      let numEl = item.querySelector('.num');
      if (!numEl) {
        numEl = document.createElement('span');
        numEl.className = 'num';
        item.prepend(numEl);
      }
      numEl.textContent = i + 1;
    });
  }

  checkOrder() {
    const currentOrder = [...this.list.children].map(el => el.dataset.id);
    let correctCount = 0;
    currentOrder.forEach((id, i) => {
      const el = this.list.children[i];
      if (id === this.correctOrder[i]) { correctCount++; el.classList.add('correct-pos'); }
      else el.classList.remove('correct-pos');
    });
    const isFullyCorrect = correctCount === this.correctOrder.length;
    return { correctCount, total: this.correctOrder.length, isFullyCorrect };
  }

  onInteract(cb) { this._onInteract = cb; }
}
