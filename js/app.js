```javascript
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
  const activeInteractions = [];

  /*
   * Audio phải khớp chính xác với số slide.
   * File audio sử dụng định dạng .wav
   */
  const AUDIO_MAP = {
    1: 'audio/slide-01.wav',
    2: 'audio/slide-02.wav',
    3: 'audio/slide-03.wav',
    4: 'audio/slide-04.wav',
    5: 'audio/slide-05.wav',
    6: 'audio/slide-06.wav',
    7: 'audio/slide-07.wav',
    8: 'audio/slide-08.wav',
    9: 'audio/slide-09.wav',
    10: 'audio/slide-10.wav',
    11: 'audio/slide-11.wav',
    12: 'audio/slide-12.wav',
  };

  function init() {
    document.addEventListener('DOMContentLoaded', _onReady);
  }

  function _onReady() {
    const slides = document.querySelectorAll('.slide');
    state.totalSlides = slides.length;

    audioManager = new AudioManager(AUDIO_MAP);

    ScormAPI.init();

    const resumeLoc = parseInt(
      ScormAPI.getValue('cmi.core.lesson_location'),
      10
    );

    const savedLocal = StorageManager.loadState('current_slide');

    state.currentSlide =
      (resumeLoc && resumeLoc > 0)
        ? resumeLoc
        : (savedLocal || 1);

    state.userProgress = StorageManager.loadState('progress', {});

    /*
     * Quan trọng:
     * Slide Quiz và Scenario không được coi là hoàn thành
     * chỉ vì người học đã mở slide.
     *
     * Nếu progress cũ đã đánh dấu 2 slide này là hoàn thành
     * từ phiên bản trước, xoá trạng thái cũ để tránh việc
     * khóa học tự động completed.
     */
    const requiredSlides = _getRequiredInteractionSlides();

    requiredSlides.forEach(slideIndex => {
      delete state.userProgress[slideIndex];
    });

    StorageManager.saveState('progress', state.userProgress);

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

    // Event delegation cho mọi nút điều hướng nội bộ trong slide
    document
      .getElementById('slide-viewport')
      .addEventListener('click', (e) => {
        const target = e.target.closest('[data-goto]');

        if (target) {
          goToSlide(parseInt(target.dataset.goto, 10));
        }
      });
  }

  function _bindAudioControls() {
    document.getElementById('btn-mute').addEventListener('click', (e) => {
      const muted = audioManager.toggleMute();
      e.currentTarget.textContent = muted ? '🔇' : '🔊';
    });

    document
      .getElementById('btn-replay')
      .addEventListener('click', () => audioManager.replay());
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

      d.classList.toggle(
        'current',
        i === state.currentSlide
      );

      d.classList.toggle(
        'done',
        !!state.userProgress[i] &&
        i !== state.currentSlide
      );
    });

    document.getElementById('slide-counter').textContent =
      `${state.currentSlide} / ${state.totalSlides}`;

    document.getElementById('progress-bar').style.width =
      `${(state.currentSlide / state.totalSlides) * 100}%`;

    document.getElementById('btn-prev').disabled =
      state.currentSlide === 1;

    document.getElementById('btn-next').textContent =
      state.currentSlide === state.totalSlides
        ? 'Hoàn thành'
        : 'Tiếp theo →';
  }

  function _destroyActiveInteractions() {
    activeInteractions.forEach(inst => {
      if (inst && typeof inst.destroy === 'function') {
        inst.destroy();
      }
    });

    activeInteractions.length = 0;
  }

  /*
   * Xác định những slide bắt buộc phải hoàn thành interaction.
   *
   * Hiện tại:
   * - Scenario
   * - Quiz
   *
   * Hai loại này KHÔNG được đánh dấu complete khi chỉ mở slide.
   */
  function _getRequiredInteractionSlides() {
    const result = [];

    document.querySelectorAll('.slide').forEach(slide => {
      const hasQuiz = !!slide.querySelector('[data-quiz-id]');
      const hasScenario =
        !!slide.querySelector('[data-interaction="scenario"]');

      if (hasQuiz || hasScenario) {
        const slideIndex = parseInt(
          slide.dataset.slide,
          10
        );

        if (!Number.isNaN(slideIndex)) {
          result.push(slideIndex);
        }
      }
    });

    return result;
  }

  function _slideRequiresInteraction(slideIndex) {
    const slide = document.querySelector(
      `.slide[data-slide="${slideIndex}"]`
    );

    if (!slide) return false;

    return !!(
      slide.querySelector('[data-quiz-id]') ||
      slide.querySelector('[data-interaction="scenario"]')
    );
  }

  // ---- Factory pattern: khởi tạo interaction cho slide hiện tại ----
  function _initInteractionsForSlide(slideEl) {
    slideEl
      .querySelectorAll('[data-interaction="accordion"]')
      .forEach(el => {
        activeInteractions.push(Accordion.init(el));
      });

    slideEl
      .querySelectorAll('[data-interaction="tabs"]')
      .forEach(el => {
        activeInteractions.push(Tabs.init(el));
      });

    slideEl
      .querySelectorAll('[data-interaction="flipcard"]')
      .forEach(el => {
        activeInteractions.push(FlipCard.init(el));
      });

    slideEl
      .querySelectorAll('[data-interaction="hotspot"]')
      .forEach(el => {
        const hs = new Hotspot(el);

        hs.render();

        hs.onInteract((type, id, detail) => {
          ReportManager.logInteraction(type, id, detail);
        });

        activeInteractions.push(hs);
      });

    slideEl
      .querySelectorAll('[data-interaction="dragdrop"]')
      .forEach(el => {
        const dd = new DragDrop(el);

        dd.init();

        dd.onInteract((type, id, detail) => {
          ReportManager.logInteraction(type, id, detail);
        });

        activeInteractions.push(dd);
      });

    slideEl
      .querySelectorAll('[data-interaction="sorting"]')
      .forEach(el => {
        const order = JSON.parse(
          el.dataset.orderCorrect || '[]'
        );

        const st = new Sorting(el, order);

        st.init();

        st.onInteract((type, id, detail) => {
          ReportManager.logInteraction(type, id, detail);
        });

        const checkBtn = el.querySelector('.sorting-check');

        if (checkBtn) {
          const onCheck = () => {
            const result = st.checkOrder();
            const msg = el.querySelector('.sorting-msg');

            if (msg) {
              msg.textContent = result.isFullyCorrect
                ? '✅ Chính xác! Đây là trình tự chuẩn.'
                : `Đúng ${result.correctCount}/${result.total} vị trí — thử sắp xếp lại nhé.`;
            }
          };

          checkBtn.addEventListener('click', onCheck);

          /*
           * Để destroy() của Sorting có thể dọn luôn
           * listener này khi rời slide.
           */
          st.setCheckHandler(checkBtn, onCheck);
        }

        activeInteractions.push(st);
      });

    slideEl
      .querySelectorAll('[data-quiz-id]')
      .forEach(el => {
        const questions = JSON.parse(
          el.dataset.questions || '[]'
        );

        const quiz = new Quiz(el, questions);

        quiz.render();

        quiz.onComplete(() => {
          _markComplete(state.currentSlide, true);
        });

        activeInteractions.push(quiz);
      });

    slideEl
      .querySelectorAll('[data-interaction="scenario"]')
      .forEach(el => {
        const tree = JSON.parse(
          el.dataset.tree || '{}'
        );

        const sc = new Scenario(el, tree);

        sc.render();

        sc.onInteract((type, id, detail) => {
          ReportManager.logInteraction(type, id, detail);
        });

        sc.onComplete(() => {
          _markComplete(state.currentSlide, true);
        });

        activeInteractions.push(sc);
      });
  }

  /*
   * force = true chỉ được dùng khi interaction bắt buộc
   * đã thực sự hoàn thành.
   */
  function _markComplete(slideIndex, force = false) {
    if (!slideIndex) return;

    /*
     * Nếu slide yêu cầu Quiz/Scenario thì không cho phép
     * đánh dấu complete chỉ bằng việc mở slide.
     */
    if (
      !force &&
      _slideRequiresInteraction(slideIndex)
    ) {
      return;
    }

    state.userProgress[slideIndex] = true;

    StorageManager.saveState(
      'progress',
      state.userProgress
    );

    _updateChrome();

    _checkCourseCompletion();
  }

  function _checkCourseCompletion() {
    /*
     * Không dùng Object.keys(progress).length >= totalSlides
     * một cách mù quáng, vì progress cũ có thể chứa trạng thái
     * không hợp lệ.
     */

    for (let i = 1; i <= state.totalSlides; i++) {
      if (!state.userProgress[i]) {
        return false;
      }
    }

    ScormAPI.setStatus('completed');

    return true;
  }

  function goToSlide(n, opts = {}) {
    if (n < 1 || n > state.totalSlides) return;

    _destroyActiveInteractions();

    document
      .querySelectorAll('.slide')
      .forEach(s => s.classList.remove('active'));

    const target = document.querySelector(
      `.slide[data-slide="${n}"]`
    );

    if (!target) return;

    target.classList.add('active');

    state.currentSlide = n;

    /*
     * Slide thường được hoàn thành khi người học mở nó.
     * Quiz/Scenario thì _markComplete() sẽ bỏ qua,
     * chỉ callback onComplete mới đánh dấu hoàn thành.
     */
    _markComplete(n);

    _updateChrome();

    _initInteractionsForSlide(target);

    ScormAPI.setLocation(n);

    StorageManager.saveState(
      'current_slide',
      n
    );

    if (!opts.silent) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    audioManager.play(n);
  }

  function nextSlide() {
    if (state.currentSlide === state.totalSlides) {
      /*
       * Không được set completed chỉ vì người dùng
       * bấm nút ở slide cuối.
       *
       * Chỉ completed khi tất cả slide bắt buộc,
       * bao gồm Quiz + Scenario, đã hoàn thành.
       */
      if (_checkCourseCompletion()) {
        ScormAPI.commit();
      }

      return;
    }

    goToSlide(state.currentSlide + 1);
  }

  function prevSlide() {
    goToSlide(state.currentSlide - 1);
  }

  return {
    init,
    goToSlide,
    nextSlide,
    prevSlide,
    state
  };
})();

App.init();
```
