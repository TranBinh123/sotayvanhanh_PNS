/* ============================================
   audio-manager.js — Quản lý voice-over
   LƯU Ý: các file audio/slide-XX.mp3 là PLACEHOLDER,
   chưa có file thật. Class xử lý graceful khi file
   audio thiếu / lỗi để không chặn luồng bài học.
   ============================================ */

class AudioManager {
  constructor(audioMap) {
    this.audioMap = audioMap || {};      // {1:'audio/slide-01.mp3', 2:...}
    this.currentAudio = null;
    this.currentIndex = null;
    this.muted = StorageManager.loadState('audio_muted', false);
    this.autoplayNext = false;
    this._endedCallback = null;
    this._preloaded = {};
  }

  play(slideIndex) {
    this.pause();
    const src = this.audioMap[slideIndex];
    if (!src) { console.info(`[Audio] Không có voice-over cho slide ${slideIndex}.`); return; }

    const audio = new Audio(src);
    audio.muted = this.muted;
    audio.addEventListener('ended', () => {
      if (typeof this._endedCallback === 'function') this._endedCallback(slideIndex);
    });
    audio.addEventListener('error', () => {
      console.warn(`[Audio] Không tải được file: ${src} (placeholder — bỏ qua).`);
    });

    audio.play().catch(err => {
      // Trình duyệt có thể chặn autoplay cho tới khi có tương tác người dùng
      console.info('[Audio] Autoplay bị chặn, chờ tương tác người dùng.', err?.message);
    });

    this.currentAudio = audio;
    this.currentIndex = slideIndex;
    this.preloadNext(slideIndex);
  }

  pause() {
    if (this.currentAudio) this.currentAudio.pause();
  }

  resume() {
    if (this.currentAudio) {
      this.currentAudio.play().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.currentAudio) this.currentAudio.muted = this.muted;
    StorageManager.saveState('audio_muted', this.muted);
    return this.muted;
  }

  replay() {
    if (this.currentAudio) {
      this.currentAudio.currentTime = 0;
      this.currentAudio.play().catch(() => {});
    } else if (this.currentIndex != null) {
      this.play(this.currentIndex);
    }
  }

  onEnded(callback) { this._endedCallback = callback; }

  preloadNext(slideIndex) {
    const nextSrc = this.audioMap[slideIndex + 1];
    if (nextSrc && !this._preloaded[nextSrc]) {
      const pre = new Audio();
      pre.preload = 'auto';
      pre.src = nextSrc;
      this._preloaded[nextSrc] = pre;
    }
  }
}
