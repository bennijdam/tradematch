/**
 * apps/web/vendor-dashboard/quiz-engine/QuizEngine.js
 *
 * Standalone, plug-in quiz engine for TradeMatch vendor onboarding.
 * Reads trade + service context from WizardState (set during Step 5 of wizard),
 * renders a role-aware adaptive quiz, handles pass/fail/cooldown logic,
 * and POSTs results to /api/vetting/quiz/complete.
 *
 * Usage:
 *   const engine = new QuizEngine({ container: document.getElementById('quiz-mount'), onComplete: (result) => {} });
 *   engine.init();
 */

'use strict';

/* ── Bank → trade group mapping ─────────────────────────────────────────── */
const BANK_MAP = {
  'gas-work':              'gas',
  'central-heating':       'gas',
  'electrical':            'electrical',
  'security-systems':      'electrical',
  'plumbing':              'plumbing',
  'bathroom-fitting':      'plumbing',
  'kitchen-fitting':       'plumbing',
  'roofing-flat':          'roofing',
  'roofing-pitched':       'roofing',
  'fascias-soffits':       'roofing',
  'guttering':             'roofing',
  'bricklaying':           'building',
  'extensions':            'building',
  'loft-conversion':       'building',
  'new-builds':            'building',
  'groundwork-foundations':'building',
  'conversions':           'building',
  'windows-doors-upvc':    'building',
  'windows-doors-wooden':  'building',
  'painting-decorating':   'decorating',
  'hard-flooring':         'flooring',
  'carpets-lino':          'flooring',
  'architecture':          'architecture',
  'cad-drawings':          'architecture',
  'default':               'generic',
};

function tradeToBank(selectedTrades) {
  if (!selectedTrades || !selectedTrades.length) return 'generic';
  for (const t of selectedTrades) {
    const key = (t || '').toLowerCase().replace(/\s+/g, '-');
    if (BANK_MAP[key]) return BANK_MAP[key];
  }
  return 'generic';
}

/* ── WizardState helper ─────────────────────────────────────────────────── */
const WizardState = {
  _cache: null,
  load() {
    if (this._cache) return this._cache;
    try { this._cache = JSON.parse(localStorage.getItem('wizardState') || '{}'); }
    catch (_) { this._cache = {}; }
    return this._cache;
  },
  get(key) { return this.load()[key]; },
  getSelectedTrades() {
    const s = this.load();
    return s.selectedTrades || s.services || s.tradeCategories || [];
  },
};

/* ── Utility ────────────────────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pad2(n) { return String(n).padStart(2, '0'); }
function fmtTime(secs) { return pad2(Math.floor(secs / 60)) + ':' + pad2(secs % 60); }

/* ── Constants ──────────────────────────────────────────────────────────── */
const QUIZ_QUESTIONS = 10;      // questions to serve per attempt
const PASS_GOLD     = 80;       // % → "Knowledge Verified" badge
const PASS_SILVER   = 60;       // % → conditional approval
const COOLDOWN_MEDIUM = 24;     // hours cooldown for score 40–59%
const MAX_RETAKES_PER_DAY = 3;
const TIMER_SECS    = 15 * 60;  // 15-minute session limit
const STREAK_FIRE   = 3;        // consecutive correct to announce level-up

/* ── Main class ─────────────────────────────────────────────────────────── */
class QuizEngine {
  constructor({ container, onComplete, onSkip } = {}) {
    this.container  = container || document.getElementById('quiz-mount');
    this.onComplete = onComplete || (() => {});
    this.onSkip     = onSkip    || (() => {});

    // State
    this.bank         = null;
    this.questions    = [];
    this.qIndex       = 0;
    this.answers      = [];      // { questionId, correct: bool, timeMs, chosen }
    this.scores       = { safety: [], regulation: [], technical: [], practice: [], judgement: [] };
    this.streakArr    = [];
    this.difficulty   = 1;
    this.correctRow   = 0;
    this.startTime    = null;
    this.qStartTime   = null;
    this.timerSecs    = TIMER_SECS;
    this._timerHandle = null;
    this._destroyed   = false;
    this.tradeName    = '';
    this.tradeEmoji   = '';
    this.multiSelected= [];      // for select-all questions
  }

  /* ── Public API ─────────────────────────────────────────────────────── */

  init() {
    if (!window.BANKS) {
      this.container.innerHTML = '<p style="color:#dc2626;padding:20px">Question banks not loaded. Ensure questionBanks.js is included before QuizEngine.js.</p>';
      return;
    }
    // Detect trade from wizard state
    const trades = WizardState.getSelectedTrades();
    const bankKey = tradeToBank(trades);
    this.bank      = window.BANKS[bankKey] || window.BANKS.generic;
    this.tradeName = this.bank.name;
    this.tradeEmoji= this.bank.emoji;

    // Check for saved progress
    this._checkResume();
  }

  destroy() {
    this._destroyed = true;
    clearInterval(this._timerHandle);
  }

  /* ── Resume logic ───────────────────────────────────────────────────── */

  _checkResume() {
    const raw = localStorage.getItem('vettingQuizProgress');
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        const ageHours = (Date.now() - new Date(saved.savedAt).getTime()) / 3600000;
        if (ageHours < 24 && saved.trade === this._bankKey()) {
          if (typeof CustomConfirm !== 'undefined') {
            CustomConfirm.ask('Resume your quiz where you left off?').then((yes) => {
              if (yes) { this._restoreState(saved); this._renderQuizStage(); }
              else     { localStorage.removeItem('vettingQuizProgress'); this._startFresh(); }
            });
            return;
          }
        }
      } catch (_) {}
    }
    this._startFresh();
  }

  _bankKey() {
    return Object.keys(window.BANKS).find((k) => window.BANKS[k] === this.bank) || 'generic';
  }

  _startFresh() {
    // Check cooldown
    const cooldownData = this._getCooldownData();
    if (cooldownData.blocked) {
      this._renderCooldownScreen(cooldownData);
      return;
    }
    this.questions  = shuffle(this.bank.questions).slice(0, QUIZ_QUESTIONS);
    this.qIndex     = 0;
    this.answers    = [];
    this.scores     = { safety: [], regulation: [], technical: [], practice: [], judgement: [] };
    this.streakArr  = [];
    this.difficulty = 1;
    this.correctRow = 0;
    this.startTime  = Date.now();
    this.timerSecs  = TIMER_SECS;
    this._renderQuizStage();
    this._startTimer();
  }

  _restoreState(saved) {
    this.questions  = saved.questions  || shuffle(this.bank.questions).slice(0, QUIZ_QUESTIONS);
    this.qIndex     = saved.qIndex     || 0;
    this.answers    = saved.answers    || [];
    this.scores     = saved.scores     || { safety: [], regulation: [], technical: [], practice: [], judgement: [] };
    this.streakArr  = saved.streakArr  || [];
    this.difficulty = saved.difficulty || 1;
    this.correctRow = saved.correctRow || 0;
    this.startTime  = saved.startTime  || Date.now();
    this.timerSecs  = saved.timerSecs  || TIMER_SECS;
  }

  /* ── Timer ──────────────────────────────────────────────────────────── */

  _startTimer() {
    clearInterval(this._timerHandle);
    this._timerHandle = setInterval(() => {
      if (this._destroyed) { clearInterval(this._timerHandle); return; }
      this.timerSecs--;
      this._updateTimerDisplay();
      if (this.timerSecs <= 0) {
        clearInterval(this._timerHandle);
        // Auto-submit whatever they have
        this._finishQuiz();
      }
    }, 1000);
  }

  _updateTimerDisplay() {
    const el = this.container.querySelector('.qe-timer');
    if (!el) return;
    el.textContent = '⏱ ' + fmtTime(this.timerSecs);
    el.className = 'qe-timer' + (this.timerSecs < 120 ? ' danger' : this.timerSecs < 300 ? ' warn' : '');
  }

  /* ── Render: Quiz stage ─────────────────────────────────────────────── */

  _renderQuizStage() {
    this.container.innerHTML = `
      <div class="qe-root">
        <div class="qe-header">
          <div class="qe-trade-pill">${this.tradeEmoji} ${this.tradeName}</div>
          <div class="qe-ring-wrap">
            <svg class="qe-ring" viewBox="0 0 44 44">
              <circle class="qe-ring-track" cx="22" cy="22" r="20"/>
              <circle class="qe-ring-fill" id="qe-ring-fill" cx="22" cy="22" r="20"/>
            </svg>
            <span class="qe-ring-text" id="qe-ring-text">0/${this.questions.length}</span>
          </div>
          <div class="qe-timer" id="qe-timer">⏱ ${fmtTime(this.timerSecs)}</div>
        </div>
        <div class="qe-comp-strip" id="qe-comp-strip">
          <div class="qe-cpill" data-c="safety">🛡 Safety</div>
          <div class="qe-cpill" data-c="regulation">📋 Regulation</div>
          <div class="qe-cpill" data-c="technical">⚙ Technical</div>
          <div class="qe-cpill" data-c="practice">✨ Best Practice</div>
          <div class="qe-cpill" data-c="judgement">🧠 Judgement</div>
        </div>
        <div class="qe-streak-bar" id="qe-streak-bar"></div>
        <div id="qe-lvl-announce"></div>
        <div id="qe-qa"></div>
      </div>`;
    this._renderQuestion();
  }

  /* ── Render: Single question ────────────────────────────────────────── */

  _renderQuestion() {
    if (this.qIndex >= this.questions.length) { this._finishQuiz(); return; }
    const q = this.questions[this.qIndex];
    this.qStartTime = Date.now();
    this.multiSelected = [];

    // Update comp strip
    this.container.querySelectorAll('.qe-cpill').forEach((p) => {
      p.classList.toggle('active', p.dataset.c === q.competency);
    });

    // Build streak bar
    const sbar = this.container.querySelector('#qe-streak-bar');
    if (sbar) {
      let html = this.streakArr.map((v) => `<div class="qe-spip ${v ? 'hit' : 'miss'}"></div>`).join('');
      // Placeholder pips for remaining
      for (let i = this.streakArr.length; i < this.questions.length; i++) {
        html += '<div class="qe-spip"></div>';
      }
      const streak = this.streakArr.length ? this.streakArr.slice().reverse().findIndex((v) => !v) : 0;
      const curStreak = streak === -1 ? this.streakArr.length : streak;
      if (curStreak >= STREAK_FIRE) html += `<span class="qe-streak-label">🔥 ${curStreak} streak</span>`;
      sbar.innerHTML = html;
    }

    // Ring
    this._updateRing();

    // Type badge class
    const typeClass = {
      scenario:    'qe-tb-scenario',
      safety:      'qe-tb-safety',
      regulation:  'qe-tb-regulation',
      technical:   'qe-tb-technical',
      practice:    'qe-tb-practice',
      truefalse:   'qe-tb-truefalse',
      calculation: 'qe-tb-calculation',
      'select-all':'qe-tb-select-all',
    }[q.type] || 'qe-tb-technical';

    const typeLabel = {
      scenario:    'Scenario',
      safety:      'Safety',
      regulation:  'Regulation',
      technical:   'Technical',
      practice:    'Best Practice',
      truefalse:   'True / False',
      calculation: 'Calculation',
      'select-all':'Select All',
    }[q.type] || q.type;

    const lvlClass = ['', 'qe-lv1', 'qe-lv2', 'qe-lv3'][q.level] || 'qe-lv1';
    const lvlLabel = ['', 'L1', 'L2', 'L3'][q.level] || 'L1';

    let answerHTML = '';
    if (q.type === 'truefalse') {
      answerHTML = `
        <div class="qe-tf-row">
          <button class="qe-tf t" onclick="window.__qe.answer(true)"><span class="qe-ico">✓</span>TRUE</button>
          <button class="qe-tf f" onclick="window.__qe.answer(false)"><span class="qe-ico">✗</span>FALSE</button>
        </div>`;
    } else if (q.type === 'calculation') {
      answerHTML = `
        <div class="qe-calc-wrap">
          <input type="number" class="qe-calc-input" id="qe-calc-in" placeholder="0" step="any">
          <span class="qe-calc-unit">${q.unit || ''}</span>
          <button class="qe-btn-confirm" onclick="window.__qe.answerCalc()">Submit →</button>
        </div>`;
    } else if (q.type === 'select-all') {
      const letters = 'ABCDEFGH';
      answerHTML = `<div class="qe-opts">` +
        q.options.map((opt, i) => `
          <button class="qe-opt" data-i="${i}" onclick="window.__qe.toggleMulti(${i}, this)">
            <span class="qe-oletter">${letters[i]}</span>${opt}
          </button>`).join('') +
        `</div><button class="btn-mc qe-btn-confirm" style="margin-top:10px" onclick="window.__qe.answerMulti()">Confirm Selection →</button>`;
    } else {
      // standard MC (scenario/technical/safety/regulation/practice)
      const letters = 'ABCDEFGH';
      answerHTML = `<div class="qe-opts">` +
        q.options.map((opt, i) => `
          <button class="qe-opt" data-i="${i}" onclick="window.__qe.answer(${i}, this)">
            <span class="qe-oletter">${letters[i]}</span>${opt}
          </button>`).join('') +
        `</div>`;
    }

    const qa = this.container.querySelector('#qe-qa');
    qa.innerHTML = `
      <div class="qe-card" id="qe-card-current">
        <div class="qe-meta">
          <span class="qe-qnum">${this.qIndex + 1} / ${this.questions.length}</span>
          <span class="qe-type-badge ${typeClass}">${typeLabel}</span>
          <span class="qe-lvl-badge ${lvlClass}">${lvlLabel}</span>
        </div>
        ${q.scenario ? `<div class="qe-scenario">${q.scenario}</div>` : ''}
        <p class="qe-qtext">${q.text}</p>
        ${answerHTML}
        <div id="qe-explanation"></div>
      </div>`;

    // Expose engine globally so inline onclick handlers can reach it
    window.__qe = this;
  }

  /* ── Answer handlers ────────────────────────────────────────────────── */

  answer(chosen, btn) {
    const q       = this.questions[this.qIndex];
    const timeMs  = Date.now() - this.qStartTime;
    let correct;

    if (q.type === 'truefalse') {
      correct = chosen === q.correct;
      const btns = this.container.querySelectorAll('.qe-tf');
      btns.forEach((b) => { b.disabled = true; });
      const trueBtn  = this.container.querySelector('.qe-tf.t');
      const falseBtn = this.container.querySelector('.qe-tf.f');
      if (chosen === true) {
        trueBtn.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) falseBtn.classList.add('correct');
      } else {
        falseBtn.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) trueBtn.classList.add('correct');
      }
    } else {
      correct = chosen === q.correct;
      const allBtns = this.container.querySelectorAll('.qe-opt');
      allBtns.forEach((b) => { b.disabled = true; });
      if (btn) btn.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) {
        const correctBtn = this.container.querySelector(`.qe-opt[data-i="${q.correct}"]`);
        if (correctBtn) correctBtn.classList.add('reveal');
      }
    }

    this._recordAnswer(q, correct, timeMs, chosen);
    this._showExplanation(q, correct);
  }

  answerCalc() {
    const q      = this.questions[this.qIndex];
    const inp    = this.container.querySelector('#qe-calc-in');
    const val    = parseFloat(inp.value);
    const timeMs = Date.now() - this.qStartTime;

    if (isNaN(val)) { inp.style.borderColor = '#f59e0b'; return; }

    const tol     = q.tolerance || 0.5;
    const correct = Math.abs(val - q.correct) <= tol;
    inp.classList.add(correct ? 'correct' : 'wrong');
    inp.disabled = true;
    this.container.querySelector('.qe-btn-confirm').disabled = true;

    this._recordAnswer(q, correct, timeMs, val);
    if (!correct) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:12px;color:#64748b;margin-top:4px';
      hint.textContent = `Correct answer: ${q.correct} ${q.unit || ''}`;
      inp.parentNode.insertAdjacentElement('afterend', hint);
    }
    this._showExplanation(q, correct);
  }

  toggleMulti(i, btn) {
    const idx = this.multiSelected.indexOf(i);
    if (idx === -1) { this.multiSelected.push(i); btn.classList.add('msel'); }
    else            { this.multiSelected.splice(idx, 1); btn.classList.remove('msel'); }
  }

  answerMulti() {
    const q      = this.questions[this.qIndex];
    const timeMs = Date.now() - this.qStartTime;
    const correct = Array.isArray(q.correct) &&
      q.correct.length === this.multiSelected.length &&
      q.correct.every((v) => this.multiSelected.includes(v));

    const allBtns = this.container.querySelectorAll('.qe-opt');
    allBtns.forEach((b) => { b.disabled = true; });
    this.container.querySelector('.qe-btn-confirm').disabled = true;

    if (Array.isArray(q.correct)) {
      q.correct.forEach((ci) => {
        const b = this.container.querySelector(`.qe-opt[data-i="${ci}"]`);
        if (b) b.classList.add('reveal');
      });
    }
    this.multiSelected.forEach((ci) => {
      const b = this.container.querySelector(`.qe-opt[data-i="${ci}"]`);
      if (b && !q.correct.includes(ci)) b.classList.add('wrong');
    });

    this._recordAnswer(q, correct, timeMs, this.multiSelected.slice());
    this._showExplanation(q, correct);
  }

  /* ── Internal: record + adaptive ───────────────────────────────────── */

  _recordAnswer(q, correct, timeMs, chosen) {
    const card = this.container.querySelector('#qe-card-current');
    if (card) card.classList.add('done');

    this.answers.push({ questionId: q.id, correct, timeMs, chosen });
    if (this.scores[q.competency]) this.scores[q.competency].push(correct ? 1 : 0);
    this.streakArr.push(correct);

    // Adaptive difficulty
    if (correct) {
      this.correctRow++;
      if (this.correctRow === STREAK_FIRE && this.difficulty < 3) {
        this.difficulty++;
        this._announceLevel(this.difficulty);
      }
    } else {
      this.correctRow = 0;
      const recent2 = this.streakArr.slice(-2).filter((v) => !v).length;
      if (recent2 === 2 && this.difficulty > 1) this.difficulty--;
    }

    // Persist mid-quiz progress
    this.saveProgress();
  }

  _announceLevel(level) {
    const labels = ['', '', '⚡ Level 2 — Practical Scenarios', '🔥 Level 3 — Expert Analysis'];
    const el = this.container.querySelector('#qe-lvl-announce');
    if (!el) return;
    el.innerHTML = `<div class="qe-lvl-toast">${labels[level]}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ''; }, 2200);
  }

  /* ── Explanation + Next ─────────────────────────────────────────────── */

  _showExplanation(q, correct) {
    const el = this.container.querySelector('#qe-explanation');
    if (!el) return;
    el.innerHTML = `
      <div class="qe-explanation ${correct ? 'correct' : 'wrong'}">
        <strong>${correct ? '✓ Correct' : '✗ Incorrect'}</strong> — ${q.explanation}
      </div>
      <button class="qe-btn-next" onclick="window.__qe.nextQuestion()">
        ${this.qIndex + 1 >= this.questions.length ? 'View My Results →' : 'Next Question →'}
      </button>`;
  }

  /* ── Next question ──────────────────────────────────────────────────── */

  nextQuestion() {
    this.qIndex++;
    if (this.qIndex >= this.questions.length) {
      this._finishQuiz();
    } else {
      this._renderQuestion();
    }
  }

  /* ── Progress ring ──────────────────────────────────────────────────── */

  _updateRing() {
    const fill = this.container.querySelector('#qe-ring-fill');
    const text = this.container.querySelector('#qe-ring-text');
    const circumference = 125.6;
    const progress = this.qIndex / this.questions.length;
    if (fill) fill.style.strokeDashoffset = circumference - progress * circumference;
    if (text) text.textContent = `${this.qIndex}/${this.questions.length}`;
  }

  /* ── Persistence ────────────────────────────────────────────────────── */

  saveProgress() {
    const data = {
      trade:       this._bankKey(),
      questions:   this.questions,
      qIndex:      this.qIndex,
      answers:     this.answers,
      scores:      this.scores,
      streakArr:   this.streakArr,
      difficulty:  this.difficulty,
      correctRow:  this.correctRow,
      startTime:   this.startTime,
      timerSecs:   this.timerSecs,
      savedAt:     new Date().toISOString(),
    };
    localStorage.setItem('vettingQuizProgress', JSON.stringify(data));
  }

  /* ── Cooldown ───────────────────────────────────────────────────────── */

  _getCooldownData() {
    const key = 'vettingQuizAttempts_' + this._bankKey();
    let attempts = [];
    try { attempts = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    const now = Date.now();
    // Purge attempts older than 24h
    attempts = attempts.filter((t) => now - t < 24 * 3600 * 1000);

    if (attempts.length >= MAX_RETAKES_PER_DAY) {
      const oldest = Math.min(...attempts);
      const retryAfterMs = oldest + 24 * 3600 * 1000 - now;
      return { blocked: true, retryAfterMs, count: attempts.length };
    }
    return { blocked: false, count: attempts.length };
  }

  _logAttempt() {
    const key = 'vettingQuizAttempts_' + this._bankKey();
    let attempts = [];
    try { attempts = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    attempts.push(Date.now());
    localStorage.setItem(key, JSON.stringify(attempts));
  }

  _renderCooldownScreen({ retryAfterMs }) {
    const hours = Math.ceil(retryAfterMs / 3600000);
    this.container.innerHTML = `
      <div class="qe-root" style="text-align:center;padding:40px 20px">
        <div style="font-size:48px;margin-bottom:16px">⏳</div>
        <h3 style="font-size:20px;font-weight:800;color:#1a202c;margin-bottom:8px">Daily Limit Reached</h3>
        <p style="font-size:14px;color:#64748b;margin-bottom:20px">
          You've used all ${MAX_RETAKES_PER_DAY} attempts for today.<br>
          Please come back in approximately <strong>${hours} hour${hours === 1 ? '' : 's'}</strong>.
        </p>
        <div class="qe-cooldown-badge">🕐 Retry available in ~${hours}h</div>
        <p style="font-size:13px;color:#94a3b8;margin-top:16px">Use this time to review the relevant trade guidance and regulations.</p>
      </div>`;
  }

  /* ── Finish quiz ────────────────────────────────────────────────────── */

  _finishQuiz() {
    clearInterval(this._timerHandle);
    localStorage.removeItem('vettingQuizProgress');
    this._logAttempt();

    const totalSecs = Math.round((Date.now() - this.startTime) / 1000);
    const correct   = this.answers.filter((a) => a.correct).length;
    const total     = this.answers.length;
    const overall   = total ? Math.round((correct / total) * 100) : 0;

    // Competency scores
    const competencyScores = {};
    Object.keys(this.scores).forEach((k) => {
      const arr = this.scores[k];
      competencyScores[k] = arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 100) : null;
    });

    // Fraud detection
    const answerTimes   = this.answers.map((a) => a.timeMs);
    const avgTime       = answerTimes.length ? answerTimes.reduce((s, v) => s + v, 0) / answerTimes.length : 0;
    const tooFastCount  = answerTimes.filter((t) => t < 3000).length;
    const fraudFlags    = [];
    if (tooFastCount > total * 0.4) fraudFlags.push('RAPID_ANSWERS');
    if (avgTime < 5000)             fraudFlags.push('LOW_AVG_TIME');

    let trustRating = 'HIGH';
    if (overall < 60 || fraudFlags.length >= 2) trustRating = 'LOW';
    else if (overall < 80 || fraudFlags.length === 1) trustRating = 'MEDIUM';

    // Best streak
    let bestStreak = 0, cur = 0;
    this.streakArr.forEach((v) => { if (v) { cur++; bestStreak = Math.max(bestStreak, cur); } else cur = 0; });

    const result = {
      trade:           this._bankKey(),
      tradeName:       this.tradeName,
      overall,
      correct,
      total,
      competencyScores,
      trustRating,
      fraudFlags,
      completionTimeSecs: totalSecs,
      bestStreak,
      answers:         this.answers,
    };

    // Persist result for recovery
    localStorage.setItem('vettingScores', JSON.stringify({ ...result, completedAt: new Date().toISOString() }));

    this._renderResults(result);
    this.postResults(result);
  }

  /* ── Results screen ─────────────────────────────────────────────────── */

  _renderResults(r) {
    const pass       = r.overall >= PASS_GOLD;
    const cond       = r.overall >= PASS_SILVER && !pass;
    const fail       = r.overall < PASS_SILVER;
    const ringColour = pass ? 'gold' : cond ? 'silver' : 'red';
    const ringStroke = pass ? '#f59e0b' : cond ? '#94a3b8' : '#dc2626';
    const verdict    = pass ? '🏆 Knowledge Verified!' : cond ? '✓ Conditionally Approved' : '✗ Retake Required';
    const verdictCls = pass ? 'pass' : cond ? 'silver' : 'fail';

    const compRows = Object.entries(r.competencyScores).filter(([, v]) => v !== null).map(([k, v]) => `
      <div class="qe-comp-row">
        <span class="qe-comp-label">${{ safety:'🛡 Safety', regulation:'📋 Regulation', technical:'⚙ Technical', practice:'✨ Best Practice', judgement:'🧠 Judgement' }[k] || k}</span>
        <div class="qe-comp-bar-bg"><div class="qe-comp-bar-fill" data-pct="${v}"></div></div>
        <span class="qe-comp-pct">${v}%</span>
      </div>`).join('');

    const weakAreas = Object.entries(r.competencyScores).filter(([, v]) => v !== null && v < 60).map(([k]) => k);

    let failBlock = '';
    if (fail) {
      const cooldownData = this._getCooldownData();
      const remaining    = MAX_RETAKES_PER_DAY - cooldownData.count;

      let retakeMsg = '';
      if (r.overall >= 40) {
        retakeMsg = `<p style="margin-top:10px;font-size:13px;color:#64748b">You may retake immediately. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining today.</p>`;
      } else if (r.overall >= 40) {
        retakeMsg = `<div class="qe-cooldown-badge">🕐 24-hour cooldown required before retake</div>`;
      } else {
        retakeMsg = `<div class="qe-cooldown-badge">⚠ Account flagged for manual review</div>
          <p style="font-size:12px;color:#94a3b8;margin-top:8px">A member of our team will review your application.</p>`;
      }

      failBlock = `
        <div class="qe-fail-card">
          <div class="qe-fail-title">Areas to Review</div>
          ${weakAreas.length ? weakAreas.map((k) => `<div class="qe-fail-item">• ${({ safety:'Safety procedures', regulation:'Regulations & compliance', technical:'Technical knowledge', practice:'Best practices', judgement:'Professional judgement' }[k] || k)}</div>`).join('') : '<div class="qe-fail-item">Review all topic areas before retrying.</div>'}
          ${retakeMsg}
        </div>`;
    }

    const trustMsg = {
      HIGH:   '✓ Strong trust indicators — consistent response times and accuracy.',
      MEDIUM: '⚠ Moderate trust indicators — review completed.',
      LOW:    '⚠ Some unusual response patterns detected — manual review may be required.',
    }[r.trustRating];

    const actionBtns = fail
      ? `<button class="qe-btn-retake" style="flex:1" onclick="window.__qe._startFresh()">Retake Quiz</button>`
      : `<button class="qe-btn-continue" onclick="window.__qe._handleContinue()">Continue to Dashboard →</button>
         <button class="qe-btn-retake" onclick="window.__qe._startFresh()">Retake</button>`;

    this.container.innerHTML = `
      <div class="qe-root qe-results">
        <div class="qe-results-hero">
          <div class="qe-score-ring-wrap">
            <svg class="qe-score-ring" viewBox="0 0 100 100">
              <circle class="qe-score-track" cx="50" cy="50" r="45"/>
              <circle class="qe-score-fill ${ringColour}" id="qe-res-fill" cx="50" cy="50" r="45"/>
            </svg>
            <div class="qe-score-num" id="qe-score-num">0%</div>
          </div>
          <div class="qe-verdict ${verdictCls}">${verdict}</div>
          <div class="qe-result-sub">${this.tradeEmoji} ${this.tradeName} · ${r.correct}/${r.total} correct</div>
        </div>

        <div class="qe-stats-row">
          <div class="qe-stat-box"><div class="qe-stat-val">${r.overall}%</div><div class="qe-stat-lbl">Overall Score</div></div>
          <div class="qe-stat-box"><div class="qe-stat-val">${fmtTime(r.completionTimeSecs)}</div><div class="qe-stat-lbl">Completion Time</div></div>
          <div class="qe-stat-box"><div class="qe-stat-val">${r.bestStreak}</div><div class="qe-stat-lbl">Best Streak</div></div>
        </div>

        <div class="qe-comp-breakdown">${compRows}</div>

        <div class="qe-trust-panel">
          <span class="qe-trust-badge qe-trust-${r.trustRating}">${r.trustRating}</span>
          <span style="font-size:13px;color:#475569;flex:1">${trustMsg}</span>
        </div>

        ${failBlock}

        <div class="qe-action-row">${actionBtns}</div>
      </div>`;

    window.__qe = this;

    // Animate ring + score counter
    requestAnimationFrame(() => {
      const fill  = this.container.querySelector('#qe-res-fill');
      const numEl = this.container.querySelector('#qe-score-num');
      const circumference = 314;
      if (fill) {
        fill.style.strokeDashoffset = circumference - (r.overall / 100) * circumference;
      }
      // Animate bars after 300ms
      setTimeout(() => {
        this.container.querySelectorAll('.qe-comp-bar-fill').forEach((b) => {
          b.style.width = (b.dataset.pct || 0) + '%';
        });
      }, 300);
      // Count-up score
      let displayed = 0;
      const step = Math.max(1, Math.round(r.overall / 40));
      const interval = setInterval(() => {
        displayed = Math.min(displayed + step, r.overall);
        if (numEl) numEl.textContent = displayed + '%';
        if (displayed >= r.overall) clearInterval(interval);
      }, 30);
    });
  }

  _handleContinue() {
    const saved = JSON.parse(localStorage.getItem('vettingScores') || '{}');
    this.onComplete(saved);
  }

  /* ── API: POST results ──────────────────────────────────────────────── */

  async postResults(result) {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await fetch('/api/vetting/quiz/complete', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(result),
      });
    } catch (err) {
      // Non-blocking — results persisted in localStorage
      console.warn('[QuizEngine] Failed to POST results:', err.message);
    }
  }
}

/* ── Export ─────────────────────────────────────────────────────────────── */
if (typeof module !== 'undefined') module.exports = { QuizEngine };
if (typeof window !== 'undefined') window.QuizEngine = QuizEngine;
