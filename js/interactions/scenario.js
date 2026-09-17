/* ============================================
   interactions/scenario.js
   Cây quyết định: {id, text, choices:[{label,next,score,feedback,tone}]}
   tone: 'good' | 'mid' | 'bad' — quyết định màu kết quả hiển thị.
   next = null nghĩa là node kết thúc nhánh.
   ============================================ */

class Scenario {
  constructor(containerEl, tree) {
    this.container = (typeof containerEl === 'string') ? document.querySelector(containerEl) : containerEl;
    this.tree = tree; // {nodeId: node}
    this.currentNodeId = tree.__start || Object.keys(tree)[0];
    this.totalScore = 0;
    this._onInteract = null;
    this._onComplete = null;
  }

  render() {
    if (!this.container) return;
    const node = this.tree[this.currentNodeId];
    if (!node) return;

    this.container.innerHTML = `
      <div class="scenario-bubble">${node.text}</div>
      <div class="scenario-choices">
        ${node.choices.map((c, i) => `<button class="scenario-choice" data-idx="${i}">${c.label}</button>`).join('')}
      </div>
      <div class="scenario-result"></div>
    `;

    this.container.querySelectorAll('.scenario-choice').forEach(btn => {
      btn.addEventListener('click', () => this._choose(node, parseInt(btn.dataset.idx, 10)));
    });
  }

  _choose(node, idx) {
    const choice = node.choices[idx];
    this.totalScore += (choice.score || 0);

    const resultEl = this.container.querySelector('.scenario-result');
    resultEl.textContent = choice.feedback || '';
    resultEl.className = `scenario-result show ${choice.tone || 'mid'}`;
    this.container.querySelectorAll('.scenario-choice').forEach(b => b.disabled = true);

    if (typeof this._onInteract === 'function') {
      this._onInteract('scenario', this.currentNodeId, { choice: choice.label, score: choice.score });
    }
    if (typeof window.ReportManager !== 'undefined') ReportManager.logScenarioStep(this.currentNodeId, choice.label);

    if (choice.next) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'nav-btn primary';
      nextBtn.style.marginTop = '14px';
      nextBtn.textContent = 'Tiếp tục tình huống';
      nextBtn.addEventListener('click', () => {
        this.currentNodeId = choice.next;
        this.render();
      });
      this.container.appendChild(nextBtn);
    } else {
      if (typeof this._onComplete === 'function') this._onComplete({ totalScore: this.totalScore });
    }
  }

  onInteract(cb) { this._onInteract = cb; }
  onComplete(cb) { this._onComplete = cb; }
}
