/* ============================================
   interactions/hotspot.js

   Nhận container .hotspot-stage có data-points là JSON:
   [
     {
       x: 12,
       y: 40,
       label: 'A',
       title: '...',
       content: '...'
     }
   ]

   x,y là % theo chiều rộng/cao của stage.
   ============================================ */

class Hotspot {
  constructor(containerEl, points) {
    this.container =
      (typeof containerEl === 'string')
        ? document.querySelector(containerEl)
        : containerEl;

    this.points =
      points ||
      JSON.parse(this.container?.dataset.points || '[]');

    this.visited = new Set();
    this._onInteract = null;
    this.tooltip = null;
  }

  render() {
    if (!this.container) return;

    /*
     * Xóa hotspot cũ trước khi render lại.
     */
    this.container
      .querySelectorAll('.hotspot-point')
      .forEach(el => el.remove());

    if (this.tooltip) {
      this.tooltip.remove();
    }

    /*
     * Tạo tooltip dùng chung.
     */
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'hotspot-tooltip';

    /*
     * Đảm bảo tooltip luôn nằm trên các hotspot point.
     */
    this.tooltip.style.zIndex = '100';

    this.container.appendChild(this.tooltip);

    /*
     * Tạo từng hotspot.
     */
    this.points.forEach((pt, i) => {
      const el = document.createElement('button');

      el.type = 'button';
      el.className = 'hotspot-point';

      el.style.left = pt.x + '%';
      el.style.top = pt.y + '%';

      el.textContent = pt.label || (i + 1);

      el.setAttribute(
        'aria-label',
        pt.title || pt.label || `Điểm ${i + 1}`
      );

      el.addEventListener('click', () => {
        this._showTooltip(pt, el, i);
      });

      this.container.appendChild(el);
    });
  }

  _showTooltip(pt, el, index) {
    if (!this.tooltip) return;

    /*
     * Nội dung tooltip.
     */
    this.tooltip.innerHTML = `
      <h4>${pt.title || pt.label || ''}</h4>
      <p>${pt.content || ''}</p>
    `;

    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);

    /*
     * ==================================================
     * XỬ LÝ VỊ TRÍ THEO CHIỀU NGANG
     * ==================================================
     *
     * Không cho tooltip bám quá sát mép trái/phải.
     *
     * Trước đây giới hạn 20–80%.
     * Nay dùng 18–82% để tận dụng không gian tốt hơn.
     */
    const clampedX = Math.min(
      Math.max(x, 18),
      82
    );

    this.tooltip.style.left = clampedX + '%';
    this.tooltip.style.transform = 'translateX(-50%)';

    /*
     * ==================================================
     * XỬ LÝ VỊ TRÍ THEO CHIỀU DỌC
     * ==================================================
     *
     * Nếu hotspot nằm ở nửa dưới:
     * → tooltip nằm phía TRÊN hotspot.
     *
     * Nếu hotspot nằm ở nửa trên:
     * → tooltip nằm phía DƯỚI hotspot.
     *
     * Cách này giúp tooltip không che mất hotspot
     * và hạn chế bị khung slide che nội dung.
     */
    const showAbove = y > 50;

    if (showAbove) {
      this.tooltip.style.top = 'auto';

      this.tooltip.style.bottom =
        (100 - y + 8) + '%';
    } else {
      this.tooltip.style.bottom = 'auto';

      this.tooltip.style.top =
        (y + 8) + '%';
    }

    /*
     * Hiển thị tooltip.
     */
    this.tooltip.classList.add('show');

    /*
     * Đánh dấu hotspot đã xem.
     */
    el.classList.add('visited');

    this.visited.add(index);

    /*
     * Thông báo cho hệ thống tương tác nếu có callback.
     */
    if (typeof this._onInteract === 'function') {
      this._onInteract(
        'hotspot',
        pt.label,
        {
          visitedCount: this.visited.size,
          total: this.points.length
        }
      );
    }
  }

  onInteract(cb) {
    this._onInteract = cb;
  }

  allVisited() {
    return this.visited.size >= this.points.length;
  }

  destroy() {
    if (this.container) {
      this.container
        .querySelectorAll('.hotspot-point')
        .forEach(el => el.remove());
    }

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
