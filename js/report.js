/* ============================================
   report.js — Tổng hợp kết quả học tập
   ============================================ */

const ReportManager = (function () {
  let startTime = Date.now();
  let interactionLog = [];     // {type, id, detail, ts}
  let quizScores = {};         // {quizId: {score, total}}
  let scenarioPath = [];       // chuỗi node đã đi qua

  function logInteraction(type, id, detail) {
    interactionLog.push({ type, id, detail, ts: Date.now() });
  }

  function logQuizResult(quizId, score, total) {
    quizScores[quizId] = { score, total };
  }

  function logScenarioStep(nodeId, choiceLabel) {
    scenarioPath.push({ nodeId, choiceLabel });
  }

  function getTimeSpentSeconds() {
    return Math.round((Date.now() - startTime) / 1000);
  }

  function getInteractionCounts() {
    const counts = {};
    interactionLog.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    return counts;
  }

  function getOverallQuizScore() {
    const vals = Object.values(quizScores);
    if (!vals.length) return null;
    const score = vals.reduce((s, v) => s + v.score, 0);
    const total = vals.reduce((s, v) => s + v.total, 0);
    return { score, total, percent: total ? Math.round((score / total) * 100) : 0 };
  }

  function buildReport() {
    return {
      generatedAt: new Date().toISOString(),
      timeSpentSeconds: getTimeSpentSeconds(),
      interactionCounts: getInteractionCounts(),
      interactionLog,
      quizScores,
      overallQuiz: getOverallQuizScore(),
      scenarioPath,
    };
  }

  function exportJSON() {
    const report = buildReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-hoc-tap-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function sendToLMS() {
    const report = buildReport();
    try {
      ScormAPI.setValue('cmi.suspend_data', JSON.stringify(report).slice(0, 4096));
      ScormAPI.commit();
    } catch (e) {
      console.warn('[Report] Không gửi được lên LMS:', e);
    }
  }

  return {
    logInteraction, logQuizResult, logScenarioStep,
    getTimeSpentSeconds, getInteractionCounts, getOverallQuizScore,
    buildReport, exportJSON, sendToLMS,
  };
})();
