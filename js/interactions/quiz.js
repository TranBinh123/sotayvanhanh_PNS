/* ============================================
   interactions/quiz.js
   questions: [{id, text, options:[..], correct:index, explain}]
   ============================================ */

class Quiz {
  constructor(containerEl, questions) {
    this.container = (typeof containerEl === 'string') ? document.querySelector(containerEl) : containerEl;
    this.originalQuestions = questions;
    this.questions = JSON.parse(JSON.stringify(questions));
    this.currentIndex = 0;
    this.answers = {};        // {questionId: optionIndex}
    this._onComplete = null;
    this.quizId = this.container?.dataset.quizId || 'quiz';

    const saved = StorageManager.loadState(`quiz_${this.quizId}`);
    if (saved) { this.answers = saved.answers || {}; this.currentIndex = saved.currentIndex || 0; }
  }

  shuffle() {
    this.questions = [...this.questions].sort(() => Math.random() - 0.5);
    this.questions.forEach(q => {
      const correctText = q.options[q.correct];
      q.options = [...q.options].sort(() => Math.random() - 0.5);
      q.correct = q.options.indexOf(correctText);
    });
  }

  render() {
    if (!this.container) return;
    const q = this.questions[this.currentIndex];
    if (!q) { this._renderResult(); return; }

    const savedAnswer = this.answers[q.id];
    this.container.innerHTML = `
      <div class="quiz-progress">Câu ${this.currentIndex + 1}/${this.questions.length}</div>
      <div class="quiz-q">${q.text}</div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <div class="quiz-option${savedAnswer === i ? ' selected' : ''}" data-idx="${i}">${opt}</div>
        `).join('')}
      </div>
      <div class="quiz-feedback"></div>
      <button class="nav-btn primary quiz-submit">Xác nhận</button>
    `;

    const options = this.container.querySelectorAll('.quiz-option');
    let selected = savedAnswer ?? null;
    options.forEach(opt => {
      opt.addEventListener('click', () => {
        if (this.container.dataset.locked === 'true') return;
        options.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selected = parseInt(opt.dataset.idx, 10);
      });
    });

    this.container.querySelector('.quiz-submit').addEventListener('click', () => {
      if (selected === null) return;
      this.checkAnswer(q.id, selected, options);
    });
  }

  checkAnswer(qid, selectedIdx, optionEls) {
    const q = this.questions.find(x => x.id === qid);
    const isCorrect = selectedIdx === q.correct;
    this.answers[qid] = selectedIdx;
    this.container.dataset.locked = 'true';

    optionEls.forEach((el, i) => {
      if (i === q.correct) el.classList.add('correct');
      else if (i === selectedIdx) el.classList.add('incorrect');
    });

    const fb = this.container.querySelector('.quiz-feedback');
    fb.textContent = (isCorrect ? '✅ Chính xác! ' : '❌ Chưa đúng. ') + (q.explain || '');
    fb.classList.add('show', isCorrect ? 'correct' : 'incorrect');

    const submitBtn = this.container.querySelector('.quiz-submit');
    submitBtn.textContent = this.currentIndex < this.questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả';
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);
    newBtn.addEventListener('click', () => {
      this.currentIndex++;
      this.container.dataset.locked = 'false';
      this._persist();
      this.render();
    });

    this._persist();
  }

  _persist() {
    StorageManager.saveState(`quiz_${this.quizId}`, { answers: this.answers, currentIndex: this.currentIndex });
  }

  getScore() {
    let correct = 0;
    this.questions.forEach(q => { if (this.answers[q.id] === q.correct) correct++; });
    return { correct, total: this.questions.length, percent: Math.round((correct / this.questions.length) * 100) };
  }

  _renderResult() {
    const { correct, total, percent } = this.getScore();
    this.container.innerHTML = `
      <div class="quiz-q">Hoàn thành bài kiểm tra!</div>
      <p>Bạn trả lời đúng ${correct}/${total} câu.</p>
      <span class="quiz-score-badge">${percent}%</span>
    `;
    if (typeof this._onComplete === 'function') this._onComplete({ correct, total, percent });
    if (typeof window.ReportManager !== 'undefined') ReportManager.logQuizResult(this.quizId, correct, total);
    if (typeof window.ScormAPI !== 'undefined') ScormAPI.setScore(correct, 0, total);
  }

  reset() {
    this.currentIndex = 0;
    this.answers = {};
    StorageManager.saveState(`quiz_${this.quizId}`, { answers: {}, currentIndex: 0 });
    this.render();
  }

  onComplete(cb) { this._onComplete = cb; }
}
