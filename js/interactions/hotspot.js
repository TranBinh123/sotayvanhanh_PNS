/* ============================================
   interactions/hotspot.js
   Nhận container .hotspot-stage có data-points là JSON:
   [{x:12, y:40, label:'A', title:'...', content:'...'}]
   x,y là % theo chiều rộng/cao của stage.
   ============================================ */

class Hotspot {
  constructor(containerEl, points) {
    this.container = (typeof containerEl === 'string') ? document.querySelector(containerEl) : containerEl;
    this.points = points || JSON.parse(this.container?.dataset.points || '[]');
    this.visited = new Set();
    this._onInteract = null;
    this.tooltip = null;
  }

  render() {
    if (!this.container) return;
    this.container.querySelectorAll('.hotspot-point').forEach(el => el.remove());
    if (this.tooltip) this.tooltip.remove();

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'hotspot-tooltip';
    this.container.appendChild(this.tooltip);

    this.points.forEach((pt, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'hotspot-point';
      el.style.left = pt.x + '%';
      el.style.top = pt.y + '%';
      el.textContent = pt.label || (i + 1);
      el.setAttribute('aria-label', pt.title || pt.label);
      el.addEventListener('click', (e) => this._showTooltip(pt, el, i));
      this.container.appendChild(el);
    });
  }

  _showTooltip(pt, el, index) {
    this.tooltip.innerHTML = `<h4>${pt.title || pt.label}</h4><p>${pt.content || ''}</p>`;

    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);

    // Căn giữa tooltip theo trục ngang tại điểm chạm, giới hạn để không tràn 2 mép
    const clampedX = Math.min(Math.max(x, 20), 80);
    this.tooltip.style.left = clampedX + '%';
    this.tooltip.style.transform = 'translateX(-50%)';

    // Nếu điểm nằm ở nửa dưới khung, hiện tooltip PHÍA TRÊN điểm thay vì phía dưới
    // để tránh bị che hoặc tràn ra ngoài khung (đây là nguyên nhân gây lỗi "bị che khung")
    const showAbove = y > 55;
    if (showAbove) {
      this.tooltip.style.top = 'auto';
      this.tooltip.style.bottom = (100 - y + 6) + '%';
    } else {
      this.tooltip.style.bottom = 'auto';
      this.tooltip.style.top = (y + 6) + '%';
    }

    this.tooltip.classList.add('show');
    el.classList.add('visited');
    this.visited.add(index);

    if (typeof this._onInteract === 'function') {
      this._onInteract('hotspot', pt.label, { visitedCount: this.visited.size, total: this.points.length });
    }
  }

  onInteract(cb) { this._onInteract = cb; }

  allVisited() { return this.visited.size >= this.points.length; }

  destroy() {
    if (this.container) this.container.querySelectorAll('.hotspot-point').forEach(el => el.remove());
    if (this.tooltip) this.tooltip.remove();
  }
}
