/* ============================================
   interactions/dragdrop.js
   Hỗ trợ chuột + cảm ứng.
   Kéo .dd-item (cột A) thả vào
   .dd-target (cột B).

   Có destroy() để dọn toàn bộ event listener
   khi rời slide.
   ============================================ */

class DragDrop {
  constructor(containerEl) {
    this.container =
      (typeof containerEl === 'string')
        ? document.querySelector(containerEl)
        : containerEl;

    this.attempts = 0;
    this.correctCount = 0;

    this._onInteract = null;
    this._onComplete = null;
    this._draggedEl = null;

    this.items = [];
    this.targets = [];

    this._boundHandlers = [];
    this._destroyed = false;
  }

  init() {
    if (!this.container) return;

    this._destroyed = false;

    this.items = [
      ...this.container.querySelectorAll('.dd-item')
    ];

    this.targets = [
      ...this.container.querySelectorAll('.dd-target')
    ];

    this.items.forEach(item => {
      item.setAttribute('draggable', 'true');

      const onDragStart = e => {
        this._onDragStart(e, item);
      };

      const onDragEnd = () => {
        item.classList.remove('dragging');
      };

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
        'touchstart',
        onTouchStart,
        { passive: true }
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
        event: 'touchstart',
        handler: onTouchStart,
        options: { passive: true }
      });
    });

    this.targets.forEach(target => {
      const onDragOver = e => {
        e.preventDefault();
      };

      const onDrop = e => {
        this._onDrop(e, target);
      };

      target.addEventListener(
        'dragover',
        onDragOver
      );

      target.addEventListener(
        'drop',
        onDrop
      );

      this._boundHandlers.push({
        element: target,
        event: 'dragover',
        handler: onDragOver
      });

      this._boundHandlers.push({
        element: target,
        event: 'drop',
        handler: onDrop
      });
    });

    /*
     * Listener document phải được lưu reference
     * để destroy() tháo được chính xác.
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
  }

  _onDragStart(e, item) {
    this._draggedEl = item;

    item.classList.add('dragging');

    if (e.dataTransfer) {
      e.dataTransfer.setData(
        'text/plain',
        item.dataset.match
      );

      e.dataTransfer.effectAllowed = 'move';
    }
  }

  _onDrop(e, target) {
    e.preventDefault();

    const matchId =
      e.dataTransfer?.getData('text/plain') ||
      this._draggedEl?.dataset.match;

    this._resolveDrop(
      matchId,
      target,
      this._draggedEl
    );

    if (this._draggedEl) {
      this._draggedEl.classList.remove('dragging');
    }

    this._draggedEl = null;
  }

  _onTouchStart(e, item) {
    if (item.getAttribute('draggable') === 'false') {
      return;
    }

    this._draggedEl = item;

    item.classList.add('dragging');
  }

  _onTouchMove(e) {
    if (!this._draggedEl) return;

    /*
     * Ngăn trình duyệt cuộn trang khi đang kéo.
     */
    e.preventDefault();
  }

  _onTouchEnd(e) {
    if (!this._draggedEl) return;

    const touch = e.changedTouches[0];

    if (!touch) {
      this._draggedEl.classList.remove('dragging');
      this._draggedEl = null;
      return;
    }

    const el = document.elementFromPoint(
      touch.clientX,
      touch.clientY
    );

    const target =
      el && el.closest
        ? el.closest('.dd-target')
        : null;

    if (target) {
      this._resolveDrop(
        this._draggedEl.dataset.match,
        target,
        this._draggedEl
      );
    }

    this._draggedEl.classList.remove('dragging');

    this._draggedEl = null;
  }

  _resolveDrop(matchId, target, draggedItem) {
    if (!target || !draggedItem || !matchId) {
      return;
    }

    this.attempts++;

    const isCorrect =
      target.dataset.match === matchId;

    target.classList.remove(
      'correct',
      'incorrect'
    );

    target.classList.add(
      isCorrect
        ? 'correct'
        : 'incorrect'
    );

    if (isCorrect) {
      this.correctCount++;

      /*
       * Hiển thị câu "Nên nói" của ô đích.
       */
      target.innerHTML =
        target.dataset.answer ||
        target.innerHTML;

      draggedItem.setAttribute(
        'draggable',
        'false'
      );

      draggedItem.style.opacity = '.35';
      draggedItem.style.cursor = 'default';
    } else {
      setTimeout(() => {
        target.classList.remove('incorrect');
      }, 500);
    }

    if (typeof this._onInteract === 'function') {
      this._onInteract(
        'dragdrop',
        matchId,
        {
          correct: isCorrect,
          attempts: this.attempts
        }
      );
    }

    if (
      this.correctCount === this.targets.length &&
      typeof this._onComplete === 'function'
    ) {
      this._onComplete({
        attempts: this.attempts,
        correctCount: this.correctCount
      });
    }
  }

  onInteract(cb) {
    this._onInteract = cb;
  }

  onComplete(cb) {
    this._onComplete = cb;
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    /*
     * Dọn tất cả listener gắn trên item/target.
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
     * Đặc biệt quan trọng:
     * dọn listener touch trên document.
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

    if (this._draggedEl) {
      this._draggedEl.classList.remove('dragging');
    }

    this._draggedEl = null;

    this._onInteract = null;
    this._onComplete = null;

    this.items = [];
    this.targets = [];
  }
}
