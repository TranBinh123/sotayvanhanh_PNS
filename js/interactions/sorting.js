```javascript
/* ============================================
   interactions/sorting.js

   Sắp xếp thứ tự đúng bằng kéo-thả trong 1 danh sách.

   Hỗ trợ:
   - Chuột
   - Touch / mobile

   Có destroy() để dọn event listener khi rời slide.
   ============================================ */

class Sorting {
  constructor(containerEl, correctOrder) {
    this.container =
      (typeof containerEl === 'string')
        ? document.querySelector(containerEl)
        : containerEl;

    this.list =
      this.container?.querySelector('.sorting-list');

    this.correctOrder = correctOrder;

    this._onInteract = null;

    this._draggedEl = null;
    this._touchTarget = null;

    this._boundHandlers = [];
    this._checkBinding = null;

    this._destroyed = false;
  }

  init() {
    if (!this.list) return;

    this._destroyed = false;

    this._renumber();

    [...this.list.children].forEach(item => {
      item.setAttribute('draggable', 'true');

      /*
       * -------------------------------
       * MOUSE / HTML5 DRAG
       * -------------------------------
       */

      const onDragStart = e => {
        this._draggedEl = item;

        item.classList.add('dragging');

        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData(
            'text/plain',
            item.dataset.id
          );
        }
      };

      const onDragEnd = () => {
        item.classList.remove('dragging');
        this._clearTouchTarget();
      };

      const onDragOver = e => {
        e.preventDefault();
      };

      const onDrop = () => {
        this._onDrop(item);
      };

      /*
       * -------------------------------
       * TOUCH
       * -------------------------------
       */

      const onTouchStart = e => {
        this._onTouchStart(e, item);
      };

      item.addEventListener(
        'dragstart',
        onDragStart
      );

      item.addEventListener(
        'dragend',
        onDragEnd
      );

      item.addEventListener(
        'dragover',
        onDragOver
      );

      item.addEventListener(
        'drop',
        onDrop
      );

      item.addEventListener(
        'touchstart',
        onTouchStart,
        { passive: false }
      );

      this._boundHandlers.push({
        element: item,
        event: 'dragstart',
        handler: onDragStart
      });

      this._boundHandlers.push({
        element: item,
        event: 'dragend',
        handler: onDragEnd
      });

      this._boundHandlers.push({
        element: item,
        event: 'dragover',
        handler: onDragOver
      });

      this._boundHandlers.push({
        element: item,
        event: 'drop',
        handler: onDrop
      });

      this._boundHandlers.push({
        element: item,
        event: 'touchstart',
        handler: onTouchStart,
        options: { passive: false }
      });
    });

    /*
     * Touch listener trên document.
     * Phải lưu reference để destroy() tháo được.
     */
    this._boundTouchMove = e => {
      this._onTouchMove(e);
    };

    this._boundTouchEnd = e => {
      this._onTouchEnd(e);
    };

    document.addEventListener(
      'touchmove',
      this._boundTouchMove,
      { passive: false }
    );

    document.addEventListener(
      'touchend',
      this._boundTouchEnd
    );

    /*
     * Giúp browser hiểu đây là vùng tương tác
     * kéo-thả, không phải thao tác scroll.
     */
    this.list.style.touchAction = 'none';
  }

  /*
   * -------------------------------
   * MOUSE
   * -------------------------------
   */

  _onDrop(targetItem) {
    if (
      !this._draggedEl ||
      this._draggedEl === targetItem
    ) {
      return;
    }

    this._moveItemToTarget(
      this._draggedEl,
      targetItem
    );

    this._draggedEl.classList.remove('dragging');

    this._draggedEl = null;
  }

  /*
   * -------------------------------
   * TOUCH
   * -------------------------------
   */

  _onTouchStart(e, item) {
    if (e.touches.length !== 1) return;

    e.preventDefault();

    this._draggedEl = item;

    item.classList.add('dragging');
  }

  _onTouchMove(e) {
    if (
      !this._draggedEl ||
      e.touches.length !== 1
    ) {
      return;
    }

    e.preventDefault();

    const touch = e.touches[0];

    const element = document.elementFromPoint(
      touch.clientX,
      touch.clientY
    );

    const target =
      element && element.closest
        ? element.closest('.sorting-item')
        : null;

    if (
      !target ||
      target === this._draggedEl ||
      !this.list.contains(target)
    ) {
      this._clearTouchTarget();
      return;
    }

    this._clearTouchTarget();

    this._touchTarget = target;

    target.classList.add('touch-target');
  }

  _onTouchEnd(e) {
    if (!this._draggedEl) return;

    const draggedEl = this._draggedEl;
    const target = this._touchTarget;

    if (target && target !== draggedEl) {
      this._moveItemToTarget(
        draggedEl,
        target
      );
    }

    draggedEl.classList.remove('dragging');

    this._clearTouchTarget();

    this._draggedEl = null;
  }

  /*
   * Di chuyển item dựa trên vị trí ngón tay
   * / item target.
   */
  _moveItemToTarget(draggedEl, targetItem) {
    const items = [
      ...this.list.children
    ];

    const draggedIdx =
      items.indexOf(draggedEl);

    const targetIdx =
      items.indexOf(targetItem);

    if (
      draggedIdx === -1 ||
      targetIdx === -1 ||
      draggedIdx === targetIdx
    ) {
      return;
    }

    if (draggedIdx < targetIdx) {
      targetItem.after(draggedEl);
    } else {
      targetItem.before(draggedEl);
    }

    this._renumber();

    if (
      typeof this._onInteract === 'function'
    ) {
      this._onInteract(
        'sorting',
        targetItem.dataset.id,
        {
          dragged: draggedEl.dataset.id
        }
      );
    }
  }

  _clearTouchTarget() {
    if (this._touchTarget) {
      this._touchTarget.classList.remove(
        'touch-target'
      );
    }

    this._touchTarget = null;
  }

  _renumber() {
    [...this.list.children].forEach(
      (item, i) => {
        let numEl =
          item.querySelector('.num');

        if (!numEl) {
          numEl = document.createElement('span');
          numEl.className = 'num';
          item.prepend(numEl);
        }

        numEl.textContent = i + 1;
      }
    );
  }

  checkOrder() {
    const currentOrder = [
      ...this.list.children
    ].map(el => el.dataset.id);

    let correctCount = 0;

    currentOrder.forEach((id, i) => {
      const el = this.list.children[i];

      if (id === this.correctOrder[i]) {
        correctCount++;

        el.classList.add('correct-pos');
      } else {
        el.classList.remove('correct-pos');
      }
    });

    const isFullyCorrect =
      correctCount === this.correctOrder.length;

    return {
      correctCount,
      total: this.correctOrder.length,
      isFullyCorrect
    };
  }

  /*
   * app.js dùng hàm này để đăng ký listener
   * cho nút "Kiểm tra thứ tự", sau đó destroy()
   * có thể tháo listener đó.
   */
  setCheckHandler(element, handler) {
    this._checkBinding = {
      element,
      handler
    };
  }

  onInteract(cb) {
    this._onInteract = cb;
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    /*
     * Dọn listener trên các item.
     */
    this._boundHandlers.forEach(binding => {
      binding.element.removeEventListener(
        binding.event,
        binding.handler,
        binding.options
      );
    });

    this._boundHandlers = [];

    /*
     * Dọn listener touch trên document.
     */
    if (this._boundTouchMove) {
      document.removeEventListener(
        'touchmove',
        this._boundTouchMove
      );
    }

    if (this._boundTouchEnd) {
      document.removeEventListener(
        'touchend',
        this._boundTouchEnd
      );
    }

    this._boundTouchMove = null;
    this._boundTouchEnd = null;

    /*
     * Dọn listener nút kiểm tra.
     */
    if (this._checkBinding) {
      this._checkBinding.element.removeEventListener(
        'click',
        this._checkBinding.handler
      );
    }

    this._checkBinding = null;

    /*
     * Khôi phục touch-action.
     */
    if (this.list) {
      this.list.style.touchAction = '';
    }

    if (this._draggedEl) {
      this._draggedEl.classList.remove('dragging');
    }

    this._clearTouchTarget();

    this._draggedEl = null;
    this._onInteract = null;
  }
}
```
