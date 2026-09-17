/* ============================================
   interactions/scenario.js

   Cây quyết định:
   {
     nodeId: {
       text,
       choices: [
         {
           label,
           next,
           score,
           feedback,
           tone
         }
       ]
     }
   }

   tone: 'good' | 'mid' | 'bad'
   next = null nghĩa là node kết thúc nhánh.

   Có destroy() để dọn interaction khi rời slide.
   ============================================ */

class Scenario {
  constructor(containerEl, tree) {
    this.container =
      (typeof containerEl === 'string')
        ? document.querySelector(containerEl)
        : containerEl;

    this.tree = tree;

    this.currentNodeId =
      tree.__start ||
      Object.keys(tree)[0];

    this.totalScore = 0;

    this._onInteract = null;
    this._onComplete = null;

    this._destroyed = false;
  }

  render() {
    if (
      !this.container ||
      this._destroyed
    ) {
      return;
    }

    const node =
      this.tree[this.currentNodeId];

    if (!node) return;

    this.container.innerHTML = `
      <div class="scenario-bubble">
        ${node.text}
      </div>

      <div class="scenario-choices">
        ${node.choices.map((c, i) => `
          <button
            class="scenario-choice"
            data-idx="${i}"
          >
            ${c.label}
          </button>
        `).join('')}
      </div>

      <div class="scenario-result"></div>
    `;

    this.container
      .querySelectorAll(
        '.scenario-choice'
      )
      .forEach(btn => {
        btn.addEventListener(
          'click',
          () => {
            if (this._destroyed) return;

            this._choose(
              node,
              parseInt(
                btn.dataset.idx,
                10
              )
            );
          }
        );
      });
  }

  _choose(node, idx) {
    if (
      this._destroyed ||
      !node ||
      !node.choices ||
      !node.choices[idx]
    ) {
      return;
    }

    const choice =
      node.choices[idx];

    this.totalScore +=
      choice.score || 0;

    const resultEl =
      this.container.querySelector(
        '.scenario-result'
      );

    if (resultEl) {
      resultEl.textContent =
        choice.feedback || '';

      resultEl.className =
        `scenario-result show ${
          choice.tone || 'mid'
        }`;
    }

    this.container
      .querySelectorAll(
        '.scenario-choice'
      )
      .forEach(b => {
        b.disabled = true;
      });

    if (
      typeof this._onInteract ===
      'function'
    ) {
      this._onInteract(
        'scenario',
        this.currentNodeId,
        {
          choice: choice.label,
          score: choice.score
        }
      );
    }

    if (
      typeof window.ReportManager !==
      'undefined'
    ) {
      ReportManager.logScenarioStep(
        this.currentNodeId,
        choice.label
      );
    }

    if (choice.next) {
      const nextBtn =
        document.createElement('button');

      nextBtn.className =
        'nav-btn primary';

      nextBtn.style.marginTop =
        '14px';

      nextBtn.textContent =
        'Tiếp tục tình huống';

      nextBtn.addEventListener(
        'click',
        () => {
          if (this._destroyed) return;

          this.currentNodeId =
            choice.next;

          this.render();
        }
      );

      this.container.appendChild(
        nextBtn
      );
    } else {
      /*
       * Chỉ tại node kết thúc mới gọi onComplete.
       *
       * app.js sẽ dùng callback này để đánh dấu
       * slide Scenario là đã hoàn thành.
       */
      if (
        typeof this._onComplete ===
        'function'
      ) {
        this._onComplete({
          totalScore:
            this.totalScore
        });
      }
    }
  }

  onInteract(cb) {
    this._onInteract = cb;
  }

  onComplete(cb) {
    this._onComplete = cb;
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    /*
     * Các click listener của Scenario đều nằm
     * trong container. Xoá DOM sẽ giải phóng
     * các listener tương ứng.
     */
    if (this.container) {
      this.container.innerHTML = '';
    }

    this._onInteract = null;
    this._onComplete = null;
  }
}
