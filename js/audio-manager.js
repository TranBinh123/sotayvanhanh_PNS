/* ============================================
   audio-manager.js — Quản lý voice-over + nhạc nền

   Voice-over:
   - Mỗi slide có một file audio riêng.
   - Chuyển slide sẽ đổi voice-over.

   Background music:
   - Chỉ có 1 audio instance chạy xuyên suốt bài học.
   - Không restart khi chuyển slide.
   - Lặp liên tục.
   - Âm lượng mặc định thấp.
   - Tự động thử autoplay khi bài học mở.
   - Nếu trình duyệt chặn autoplay, sẽ tự tiếp tục
     ngay khi người học có tương tác đầu tiên.
   ============================================ */

class AudioManager {
  constructor(audioMap, options = {}) {
    this.audioMap = audioMap || {};

    /* Voice-over */
    this.currentAudio = null;
    this.currentIndex = null;
    this._endedCallback = null;
    this._preloaded = {};

    /* Global mute */
    this.muted = StorageManager.loadState(
      'audio_muted',
      false
    );

    /* Background music */
    this.backgroundSrc =
      options.backgroundSrc ||
      'audio/background-music.mp3';

    this.backgroundVolume =
      typeof options.backgroundVolume === 'number'
        ? Math.max(0, Math.min(1, options.backgroundVolume))
        : 0.12;

    this.backgroundAudio = null;
    this.backgroundStarted = false;
    this._bgStartPromise = null;
    this._userGestureBound = false;

    this._boundUserGestureHandler = () => {
      this.startBackgroundMusic();
    };
  }

  /* ============================================
     * VOICE-OVER
     * ============================================ */

  play(slideIndex) {
    this.pause();

    const src = this.audioMap[slideIndex];

    if (!src) {
      console.info(
        `[Audio] Không có voice-over cho slide ${slideIndex}.`
      );
      return;
    }

    const audio = new Audio(src);

    audio.preload = 'auto';
    audio.muted = this.muted;
    audio.volume = 1;

    audio.addEventListener('ended', () => {
      if (typeof this._endedCallback === 'function') {
        this._endedCallback(slideIndex);
      }
    });

    audio.addEventListener('error', () => {
      console.warn(
        `[Audio] Không tải được file voice-over: ${src}.`
      );
    });

    audio.play().catch(err => {
      console.info(
        '[Audio] Voice-over autoplay bị chặn, chờ tương tác người dùng.',
        err?.message
      );
    });

    this.currentAudio = audio;
    this.currentIndex = slideIndex;

    this.preloadNext(slideIndex);
  }

  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  resume() {
    if (this.currentAudio) {
      this.currentAudio.play().catch(() => {});
    }
  }

  replay() {
    if (this.currentAudio) {
      this.currentAudio.currentTime = 0;
      this.currentAudio.play().catch(() => {});
    } else if (this.currentIndex != null) {
      this.play(this.currentIndex);
    }
  }

  onEnded(callback) {
    this._endedCallback = callback;
  }

  preloadNext(slideIndex) {
    const nextSrc = this.audioMap[slideIndex + 1];

    if (nextSrc && !this._preloaded[nextSrc]) {
      const pre = new Audio();

      pre.preload = 'auto';
      pre.src = nextSrc;

      this._preloaded[nextSrc] = pre;
    }
  }

  /* ============================================
     * NHẠC NỀN
     * ============================================ */

  startBackgroundMusic() {
    if (!this.backgroundSrc) return;

    if (this.backgroundStarted) return;

    if (!this.backgroundAudio) {
      const audio = new Audio(this.backgroundSrc);

      audio.preload = 'auto';
      audio.loop = true;
      audio.volume = this.backgroundVolume;
      audio.muted = this.muted;

      audio.addEventListener('error', () => {
        console.warn(
          `[Audio] Không tải được nhạc nền: ${this.backgroundSrc}.`
        );
      });

      this.backgroundAudio = audio;
    }

    if (this._bgStartPromise) return;

    this._bgStartPromise =
      this.backgroundAudio.play();

    this._bgStartPromise
      .then(() => {
        this.backgroundStarted = true;
        this._bgStartPromise = null;
        this._removeUserGestureListeners();
      })
      .catch(err => {
        this._bgStartPromise = null;

        console.info(
          '[Audio] Autoplay nhạc nền bị trình duyệt chặn, sẽ thử lại khi người học tương tác.',
          err?.message
        );

        this._bindUserGestureListeners();
      });
  }

  pauseBackgroundMusic() {
    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
    }
  }

  resumeBackgroundMusic() {
    if (!this.backgroundAudio) {
      this.startBackgroundMusic();
      return;
    }

    if (this.backgroundAudio.paused) {
      this.backgroundAudio.play().catch(() => {
        this._bindUserGestureListeners();
      });
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
      this.backgroundAudio.currentTime = 0;
    }

    this.backgroundStarted = false;
    this._bgStartPromise = null;

    this._removeUserGestureListeners();
  }

  setBackgroundVolume(volume) {
    const numericVolume = Number(volume);

    this.backgroundVolume =
      Number.isFinite(numericVolume)
        ? Math.max(0, Math.min(1, numericVolume))
        : 0.12;

    if (this.backgroundAudio) {
      this.backgroundAudio.volume =
        this.backgroundVolume;
    }
  }

  /* 🔊 / 🔇 điều khiển cả voice-over và nhạc nền. */
  toggleMute() {
    this.muted = !this.muted;

    if (this.currentAudio) {
      this.currentAudio.muted = this.muted;
    }

    if (this.backgroundAudio) {
      this.backgroundAudio.muted = this.muted;
    }

    StorageManager.saveState(
      'audio_muted',
      this.muted
    );

    return this.muted;
  }

  /* ============================================
     * AUTOPLAY FALLBACK
     * ============================================ */

  _bindUserGestureListeners() {
    if (this._userGestureBound) return;

    this._userGestureBound = true;

    const events = [
      'pointerdown',
      'touchstart',
      'keydown'
    ];

    events.forEach(eventName => {
      document.addEventListener(
        eventName,
        this._boundUserGestureHandler,
        {
          once: true,
          passive: eventName !== 'keydown'
        }
      );
    });
  }

  _removeUserGestureListeners() {
    if (!this._userGestureBound) return;

    const events = [
      'pointerdown',
      'touchstart',
      'keydown'
    ];

    events.forEach(eventName => {
      document.removeEventListener(
        eventName,
        this._boundUserGestureHandler
      );
    });

    this._userGestureBound = false;
  }
}
