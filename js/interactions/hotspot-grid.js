/* ============================================
   interactions/hotspot-grid.js

   Biến thể "lưới" của Hotspot, thay cho cách bố trí
   theo tọa độ x/y (vòng tròn) + tooltip nổi tuyệt đối.

   Lý do cần biến thể này:
   - Tooltip định vị tuyệt đối (position:absolute) rất dễ
     bị tràn ra ngoài khung slide hoặc bị các phần tử khác
     che mất, đặc biệt trên màn hình hẹp.
   - Ở đây mỗi điểm là 1 thẻ nằm trong luồng bố cục bình
     thường (CSS Grid). Khi bấm vào, phần nội dung chi tiết
     được MỞ RỘNG NGAY BÊN TRONG thẻ đó (đẩy layout giãn ra),
     nên nội dung luôn nằm gọn trong khung, không thể bị
     che hoặc vượt ra ngoài.

   Nhận container có data-points là JSON:
   [
     { label: '1', title: '...', content: '...' }
   ]
   ============================================ */

class HotspotGrid {
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
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.container.classList.add('hotspot-grid');

    this.points.forEach((pt, i) => {
      const item = document.createElement('div');
      item.className = 'hotspot-grid-item';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hotspot-grid-btn';
      btn.setAttribute('aria-expanded', 'false');

      const panelId =
        `hsg-panel-${Math.random().toString(36).slice(2, 8)}-${i}`;
      btn.setAttribute('aria-controls', panelId);

      btn.innerHTML = `
        <span class="hotspot-grid-badge">${pt.label || (i + 1)}</span>
        <span class="hotspot-grid-title">${pt.title || ''}</span>
        <span class="hotspot-grid-caret" aria-hidden="true"></span>
      `;

      const panelOuter = document.createElement('div');
      panelOuter.className = 'hotspot-grid-content';
      panelOuter.id = panelId;

      const panelInner = document.createElement('div');
      panelInner.className = 'hotspot-grid-content-inner';
      panelInner.innerHTML = `<p>${pt.content || ''}</p>`;

      panelOuter.appendChild(panelInner);

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        /*
         * Cho phép nhiều thẻ mở cùng lúc (không đóng các
         * thẻ khác) để người dùng dễ so sánh 4 điểm với nhau.
         */
        item.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));

        if (!isOpen) {
          this._markVisited(pt, i);
        }
      });

      item.appendChild(btn);
      item.appendChild(panelOuter);

      this.container.appendChild(item);
    });
  }

  _markVisited(pt, index) {
    this.visited.add(index);

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
      this.container.innerHTML = '';
    }
  }
}
