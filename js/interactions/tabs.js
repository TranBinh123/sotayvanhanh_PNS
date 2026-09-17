/* ============================================
   interactions/tabs.js
   ============================================ */

const Tabs = {
  init(selector) {
    const root = (typeof selector === 'string') ? document.querySelector(selector) : selector;
    if (!root) return null;
    const buttons = root.querySelectorAll('.tab-btn');
    const panels = root.querySelectorAll('.tab-panel');
    let onInteract = null;

    function activate(name) {
      buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      panels.forEach(p => p.classList.toggle('active', p.dataset.tab === name));
      if (typeof onInteract === 'function') onInteract('tabs', name);
    }

    const handlers = [];
    buttons.forEach(btn => {
      const fn = () => activate(btn.dataset.tab);
      btn.addEventListener('click', fn);
      handlers.push({ btn, fn });
    });

    // mở tab đầu tiên mặc định
    if (buttons.length) activate(buttons[0].dataset.tab);

    return {
      onInteract(cb) { onInteract = cb; },
      destroy() { handlers.forEach(({ btn, fn }) => btn.removeEventListener('click', fn)); }
    };
  }
};
