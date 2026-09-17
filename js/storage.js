/* ============================================
   storage.js — localStorage: lưu tiến độ, điểm
   Có version migration nếu schema đổi.
   ============================================ */

const StorageManager = (function () {
  const PREFIX = 'pns_retrain_';
  const SCHEMA_VERSION = 1;

  function _fullKey(key) { return PREFIX + key; }

  function saveState(key, value) {
    try {
      const payload = { v: SCHEMA_VERSION, data: value, ts: Date.now() };
      localStorage.setItem(_fullKey(key), JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[Storage] Không thể lưu:', e);
      return false;
    }
  }

  function loadState(key, fallback = null) {
    try {
      const raw = localStorage.getItem(_fullKey(key));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed.v !== SCHEMA_VERSION) {
        console.info('[Storage] Phát hiện schema cũ, bỏ qua dữ liệu:', key);
        return fallback;
      }
      return parsed.data;
    } catch (e) {
      console.warn('[Storage] Không thể đọc:', e);
      return fallback;
    }
  }

  function clearProgress() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }

  return { saveState, loadState, clearProgress };
})();
