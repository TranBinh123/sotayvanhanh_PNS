/* ============================================
   scorm-api.js — Wrapper giao tiếp LMS (SCORM 1.2)
   Tự tìm API trên window / window.parent / window.top,
   fallback sang "chế độ preview" nếu không có LMS.
   ============================================ */

const ScormAPI = (function () {
  let api = null;
  let initialized = false;
  let previewMode = false;

  function findAPI(win) {
    let attempts = 0;
    let w = win;
    while (w && attempts < 10) {
      if (w.API) return w.API;
      if (w.parent && w.parent !== w) { w = w.parent; } else { break; }
      attempts++;
    }
    // thử window.top riêng, phòng trường hợp cấu trúc frame khác
    if (window.top && window.top.API) return window.top.API;
    return null;
  }

  function init() {
    api = findAPI(window);
    if (!api) {
      previewMode = true;
      console.warn('[SCORM] Không tìm thấy LMS API — chạy ở chế độ PREVIEW (không lưu điểm).');
      return false;
    }
    const result = api.LMSInitialize('');
    initialized = (result === 'true' || result === true);
    if (!initialized) console.warn('[SCORM] LMSInitialize thất bại.');
    return initialized;
  }

  function setValue(key, val) {
    if (previewMode) { console.log(`[SCORM:preview] setValue(${key}, ${val})`); return true; }
    if (!api) return false;
    return api.LMSSetValue(key, String(val)) === 'true';
  }

  function getValue(key) {
    if (previewMode) return '';
    if (!api) return '';
    return api.LMSGetValue(key);
  }

  function commit() {
    if (previewMode) { console.log('[SCORM:preview] commit()'); return true; }
    if (!api) return false;
    return api.LMSCommit('') === 'true';
  }

  function finish() {
    if (previewMode) { console.log('[SCORM:preview] finish()'); return true; }
    if (!api) return false;
    const r = api.LMSFinish('');
    return r === 'true';
  }

  function setStatus(status) {
    // status: 'completed' | 'incomplete' | 'passed' | 'failed'
    setValue('cmi.core.lesson_status', status);
    commit();
  }

  function setScore(raw, min, max) {
    setValue('cmi.core.score.raw', raw);
    setValue('cmi.core.score.min', min);
    setValue('cmi.core.score.max', max);
    commit();
  }

  function setLocation(slideIndex) {
    setValue('cmi.core.lesson_location', String(slideIndex));
  }

  function isPreview() { return previewMode; }

  return { init, finish, commit, setValue, getValue, setStatus, setScore, setLocation, isPreview };
})();
