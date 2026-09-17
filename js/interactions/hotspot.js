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
    const left = Math.min(Math.max(parseFloat(el.style.left), 15), 75);
    this.tooltip.style.left = left + '%';
    this.tooltip.style.top = (parseFloat(el.style.top) + 8) + '%';
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
