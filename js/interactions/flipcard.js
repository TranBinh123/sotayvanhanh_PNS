/* ============================================
   interactions/flipcard.js
   ============================================ */

const FlipCard = {
  init(selector) {
    const root = (typeof selector === 'string') ? document.querySelector(selector) : selector;
    if (!root) return null;
    const cards = root.classList && root.classList.contains('flip-card')
      ? [root]
      : root.querySelectorAll('.flip-card');
    let onInteract = null;
    const handlers = [];

    cards.forEach(card => {
      const fn = () => {
        card.classList.toggle('flipped');
        if (typeof onInteract === 'function') {
          onInteract('flipcard', card.dataset.id || 'card', card.classList.contains('flipped'));
        }
      };
      card.addEventListener('click', fn);
      handlers.push({ card, fn });
    });

    return {
      onInteract(cb) { onInteract = cb; },
      destroy() { handlers.forEach(({ card, fn }) => card.removeEventListener('click', fn)); }
    };
  }
};
