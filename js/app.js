/* ============================================
   app.js — Khởi tạo, router slide, state tổng
   ============================================ */

const App = (function () {
  const state = {
    currentSlide: 1,
    totalSlides: 0,
    userProgress: {},     // {slideIndex: true}
    scores: {},
  };

  let audioManager;
  const activeInteractions = []; // instances cần destroy khi rời slide

  const AUDIO_MAP = {
    1: 'audio/slide-01.mp3', 2: 'audio/slide-02.mp3', 3: 'audio/slide-03.mp3',
    4: 'audio/slide-04.mp3', 5: 'audio/slide-05.mp3', 6: 'audio/slide-06.mp3',
    7: 'audio/slide-07.mp3', 8: 'audio/slide-08.mp3', 9: 'audio/slide-09.mp3',
    10: 'audio/slide-10.mp3', 11: 'audio/slide-11.mp3', 12: 'audio/slide-12.mp3',
  };

  function init() {
    document.addEventListener('DOMContentLoaded', _onReady);
  }

  function _onReady() {
    const slides = document.querySelectorAll('.slide');
    state.totalSlides = slides.length;
    audioManager = new AudioManager(AUDIO_MAP);

    ScormAPI.init();
    const resumeLoc = parseInt(ScormAPI.getValue('cmi.core.lesson_location'), 10);
    const savedLocal = StorageManager.loadState('current_slide');
    state.currentSlide = (resumeLoc && resumeLoc > 0) ? resumeLoc : (savedLocal || 1);
    state.userProgress = StorageManager.loadState('progress', {});

    _buildDotNav();
    _bindNav();
    _bindAudioControls();
    goToSlide(state.currentSlide, { silent: true });

    window.addEventListener('beforeunload', () => {
      ScormAPI.commit();
      ReportManager.sendToLMS();
    });
  }

  function _bindNav() {
    document.getElementById('btn-prev').addEventListener('click', prevSlide);
    document.getElementById('btn-next').addEventListener('click', nextSlide);
    // event delegation cho mọi nút điều hướng nội bộ trong slide (data-goto)
    document.getElementById('slide-viewport').addEventListener('click', (e) => {
      const target = e.target.closest('[data-goto]');
      if (target) goToSlide(parseInt(target.dataset.goto, 10));
    });
  }

  function _bindAudioControls() {
    document.getElementById('btn-mute').addEventListener('click', (e) => {
      const muted = audioManager.toggleMute();
      e.currentTarget.textContent = muted ? '🔇' : '🔊';
    });
    document.getElementById('btn-replay').addEventListener('click', () => audioManager.replay());
  }

  function _buildDotNav() {
    const nav = document.getElementById('dot-nav');
    nav.innerHTML = '';
    for (let i = 1; i <= state.totalSlides; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot-item';
      dot.dataset.goto = i;
      dot.addEventListener('click', () => goToSlide(i));
      nav.appendChild(dot);
    }
  }

  function _updateChrome() {
    document.querySelectorAll('.dot-item').forEach(d => {
      const i = parseInt(d.dataset.goto, 10);
      d.classList.toggle('current', i === state.currentSlide);
      d.classList.toggle('done', !!state.userProgress[i] && i !== state.currentSlide);
    });
    document.getElementById('slide-counter').textContent = `${state.currentSlide} / ${state.totalSlides}`;
    document.getElementById('progress-bar').style.width = `${(state.currentSlide / state.totalSlides) * 100}%`;
    document.getElementById('btn-prev').disabled = state.currentSlide === 1;
    document.getElementById('btn-next').textContent = state.currentSlide === state.totalSlides ? 'Hoàn thành' : 'Tiếp theo →';
  }

  function _destroyActiveInteractions() {
    activeInteractions.forEach(inst => { if (inst && typeof inst.destroy === 'function') inst.destroy(); });
    activeInteractions.length = 0;
  }

  // ---- Factory pattern: quét DOM slide hiện tại, khởi tạo interaction tương ứng ----
  function _initInteractionsForSlide(slideEl) {
    slideEl.querySelectorAll('[data-interaction="accordion"]').forEach(el => {
      activeInteractions.push(Accordion.init(el));
    });
    slideEl.querySelectorAll('[data-interaction="tabs"]').forEach(el => {
      activeInteractions.push(Tabs.init(el));
    });
    slideEl.querySelectorAll('[data-interaction="flipcard"]').forEach(el => {
      activeInteractions.push(FlipCard.init(el));
    });
    slideEl.querySelectorAll('[data-interaction="hotspot"]').forEach(el => {
      const hs = new Hotspot(el);
      hs.render();
      hs.onInteract((type, id, detail) => ReportManager.logInteraction(type, id, detail));
      activeInteractions.push(hs);
    });
    slideEl.querySelectorAll('[data-interaction="dragdrop"]').forEach(el => {
      const dd = new DragDrop(el);
      dd.init();
      dd.onInteract((type, id, detail) => ReportManager.logInteraction(type, id, detail));
      activeInteractions.push(dd);
    });
    slideEl.querySelectorAll('[data-interaction="sorting"]').forEach(el => {
      const order = JSON.parse(el.dataset.orderCorrect || '[]');
      const st = new Sorting(el, order);
      st.init();
      st.onInteract((type, id, detail) => ReportManager.logInteraction(type, id, detail));
      const checkBtn = el.querySelector('.sorting-check');
      if (checkBtn) checkBtn.addEventListener('click', () => {
        const result = st.checkOrder();
        const msg = el.querySelector('.sorting-msg');
        if (msg) {
          msg.textContent = result.isFullyCorrect
            ? '✅ Chính xác! Đây là trình tự chuẩn.'
            : `Đúng ${result.correctCount}/${result.total} vị trí — thử sắp xếp lại nhé.`;
        }
      });
      activeInteractions.push(st);
    });
    slideEl.querySelectorAll('[data-quiz-id]').forEach(el => {
      const questions = JSON.parse(el.dataset.questions || '[]');
      const quiz = new Quiz(el, questions);
      quiz.render();
      quiz.onComplete(() => _markComplete(state.currentSlide));
      activeInteractions.push(quiz);
    });
    slideEl.querySelectorAll('[data-interaction="scenario"]').forEach(el => {
      const tree = JSON.parse(el.dataset.tree || '{}');
      const sc = new Scenario(el, tree);
      sc.render();
      sc.onInteract((type, id, detail) => ReportManager.logInteraction(type, id, detail));
      sc.onComplete(() => _markComplete(state.currentSlide));
      activeInteractions.push(sc);
    });
  }

  function _markComplete(slideIndex) {
    state.userProgress[slideIndex] = true;
    StorageManager.saveState('progress', state.userProgress);
    if (Object.keys(state.userProgress).length >= state.totalSlides) {
      ScormAPI.setStatus('completed');
    }
  }

  function goToSlide(n, opts = {}) {
    if (n < 1 || n > state.totalSlides) return;
    _destroyActiveInteractions();
    document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
    const target = document.querySelector(`.slide[data-slide="${n}"]`);
    if (!target) return;
    target.classList.add('active');

    state.currentSlide = n;
    _markComplete(n);
    _updateChrome();
    _initInteractionsForSlide(target);

    ScormAPI.setLocation(n);
    StorageManager.saveState('current_slide', n);

    if (!opts.silent) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!audioManager.muted || true) audioManager.play(n); // play() tự bỏ qua nếu đang muted qua thuộc tính audio.muted
  }

  function nextSlide() {
    if (state.currentSlide === state.totalSlides) {
      ScormAPI.setStatus('completed');
      ScormAPI.commit();
      return;
    }
    goToSlide(state.currentSlide + 1);
  }

  function prevSlide() { goToSlide(state.currentSlide - 1); }

  return { init, goToSlide, nextSlide, prevSlide, state };
})();

App.init();
