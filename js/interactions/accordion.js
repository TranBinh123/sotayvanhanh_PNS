/* ============================================
   interactions/accordion.js
   ============================================ */

const Accordion = {
  init(selector) {
    const root = (typeof selector === 'string') ? document.querySelector(selector) : selector;
    if (!root) return null;
    const items = root.querySelectorAll('.accordion-item');
    const handlers = [];

    items.forEach(item => {
      const header = item.querySelector('.accordion-header');
      const body = item.querySelector('.accordion-body');
      const onClick = () => {
        const willOpen = !item.classList.contains('open');
        item.classList.toggle('open', willOpen);
        body.style.maxHeight = willOpen ? body.scrollHeight + 'px' : 0;
        if (typeof root._onInteract === 'function') {
          root._onInteract('accordion', item.dataset.id || header.textContent.trim());
        }
      };
      header.addEventListener('click', onClick);
      handlers.push({ header, onClick });
    });

    root._accordionHandlers = handlers;
    return {
      onInteract(cb) { root._onInteract = cb; },
      destroy() {
        handlers.forEach(({ header, onClick }) => header.removeEventListener('click', onClick));
      }
    };
  }
};
