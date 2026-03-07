// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Check for saved theme preference or default to dark
const currentTheme = localStorage.getItem('theme') || 'dark';
if (currentTheme === 'light') {
    html.setAttribute('data-theme', 'light');
}

themeToggle.addEventListener('click', () => {
    const theme = html.getAttribute('data-theme');
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Modal & Wizard Navigation
let currentStep = 1;
const totalSteps = 8;

// Quiz engine instance (mounted on step 8)
let _quizEngine = null;

const modal = document.getElementById('onboardingModal');
const steps = document.querySelectorAll('.step');
const progressBar = document.getElementById('progressBar');
const currentStepDisplay = document.getElementById('currentStep');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const nextBtnText = document.getElementById('nextBtnText');
const skipBtn = document.getElementById('skipBtn');

// Check if onboarding should show
function shouldShowOnboarding() {
    // In production, check: vendor.onboarding_completed === false
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    return !onboardingComplete;
}

// Show/hide modal
function showModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Counter animation for earnings
function animateCounter(element, target, duration = 1500) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = '£' + target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = '£' + Math.floor(current).toLocaleString();
        }
    }, 16);
}

// Trigger counters when Step 1 becomes active
function triggerEarningsCounters() {
    const counters = document.querySelectorAll('[data-count]');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        animateCounter(counter, target);
    });
}

function updateStep(stepNumber) {
    // Hide all steps
    steps.forEach(step => step.classList.remove('active'));
    
    // Show current step
    const currentStepElement = document.querySelector(`[data-step="${stepNumber}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
        
        // Trigger counters on step 1
        if (stepNumber === 1) {
            setTimeout(triggerEarningsCounters, 300);
        }
    }
    
    // Update progress bar
    const progress = (stepNumber / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update step counter
    currentStepDisplay.textContent = stepNumber;
    
    // Update buttons
    backBtn.disabled = stepNumber === 1;
    
    if (stepNumber === totalSteps) {
        // Step 8: quiz step — hide the Next button; quiz engine controls progression
        nextBtnText.textContent = 'Complete Setup';
        nextBtn.style.display = 'none';
        skipBtn.style.display = 'none';
        _mountQuizEngine();
    } else {
        nextBtn.style.display = '';
        skipBtn.style.display = '';
        nextBtnText.textContent = 'Continue';
        // Tear down quiz if navigating away from step 8
        if (_quizEngine) { _quizEngine.destroy(); _quizEngine = null; }
    }

    // Scroll to top of modal content
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}

function _mountQuizEngine() {
    if (typeof QuizEngine === 'undefined') {
        const mount = document.getElementById('quiz-mount');
        if (mount) mount.innerHTML = '<p style="color:#dc2626;padding:20px">Quiz engine failed to load. Please refresh and try again.</p>';
        return;
    }
    // Destroy any existing instance
    if (_quizEngine) { _quizEngine.destroy(); _quizEngine = null; }

    // Persist selected trades into WizardState so QuizEngine can read them
    const tradeSelect = document.querySelector('[data-step="5"] select.form-select');
    if (tradeSelect) {
        const selected = Array.from(tradeSelect.selectedOptions).map((o) => o.value);
        const state = JSON.parse(localStorage.getItem('wizardState') || '{}');
        state.selectedTrades = selected;
        localStorage.setItem('wizardState', JSON.stringify(state));
    }

    _quizEngine = new QuizEngine({
        container:  document.getElementById('quiz-mount'),
        onComplete: (result) => {
            // Show brief success banner then advance to dashboard
            const mount = document.getElementById('quiz-mount');
            if (result.overall >= 60 && mount) {
                const badge = result.overall >= 80 ? '🏆 Knowledge Verified Professional' : '✓ Conditionally Approved';
                mount.insertAdjacentHTML('afterbegin',
                    `<div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:10px;padding:14px 18px;margin-bottom:18px;font-weight:700;color:#065f46;font-size:14px">${badge} — redirecting to your dashboard…</div>`
                );
                setTimeout(() => {
                    completeOnboarding();
                }, 2500);
            }
        },
        onSkip: () => completeOnboarding(),
    });
    _quizEngine.init();
}

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateStep(currentStep);
    } else {
        // Last step - complete onboarding
        completeOnboarding();
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStep(currentStep);
    }
}

function completeOnboarding() {
    // Mark onboarding as complete
    localStorage.setItem('onboarding_complete', 'true');

    // In production, send to backend:
    // await fetch('/api/vendor/onboarding/complete', { method: 'POST' });

    // Hide modal
    hideModal();

    // Show success message
    if (typeof CustomConfirm !== 'undefined') {
        CustomConfirm.toast('Onboarding completed! Welcome to TradeMatch.', 'success');
    }
}

async function skipOnboarding() {
    if (typeof CustomConfirm !== 'undefined') {
        const { confirmed } = await CustomConfirm.ask(
            'Skip Onboarding?',
            'Are you sure you want to skip onboarding? You can access this setup later in settings.',
            'Skip',
            'warning'
        );
        if (confirmed) completeOnboarding();
    } else {
        completeOnboarding();
    }
}

// Event Listeners
nextBtn.addEventListener('click', nextStep);
backBtn.addEventListener('click', previousStep);
skipBtn.addEventListener('click', skipOnboarding);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('hidden')) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'TEXTAREA' && activeElement.tagName !== 'SELECT') {
                e.preventDefault();
                nextStep();
            }
        } else if (e.key === 'Escape') {
            skipOnboarding();
        }
    }
});

// Radio card click handling
const radioCards = document.querySelectorAll('.radio-card, .topup-card');
radioCards.forEach(card => {
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }
        }
    });
});

// Tooltip hover (simple implementation)
const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
tooltipTriggers.forEach(trigger => {
    trigger.addEventListener('mouseenter', () => {
        const tooltipText = trigger.getAttribute('data-tooltip');
        if (tooltipText) {
            // In production, create proper tooltip element
            trigger.setAttribute('title', tooltipText);
        }
    });
});

// Form validation helpers
const forms = document.querySelectorAll('.onboarding-form');
forms.forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        nextStep();
    });
});

// Initialize modal on page load
window.addEventListener('DOMContentLoaded', () => {
    // Show modal by default (for demo/testing)
    // In production, check: if (shouldShowOnboarding())
    showModal();
    updateStep(currentStep);
});

// Prevent modal close on overlay click (force completion)
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        // Optional: show reminder to complete or skip
        console.log('Please complete onboarding or skip');
    }
});

// Track step views for analytics (optional)
function trackStepView(stepNumber) {
    // In production, send to analytics
    console.log(`Viewed step ${stepNumber}`);
    
    // Example: Google Analytics
    // gtag('event', 'onboarding_step_view', {
    //     step_number: stepNumber
    // });
}

// Enhanced updateStep with tracking
const originalUpdateStep = updateStep;
updateStep = function(stepNumber) {
    originalUpdateStep(stepNumber);
    trackStepView(stepNumber);
};

// Helper: Reset onboarding (for testing)
window.resetOnboarding = function() {
    localStorage.removeItem('onboarding_complete');
    location.reload();
};

// ─── Step 3: Vetting & Credentials ───────────────────────────────────────────

function switchVettingTab(tab) {
    document.querySelectorAll('.vetting-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.vetting-panel').forEach((p) => p.classList.remove('active'));
    const btn = document.querySelector(`.vetting-tab[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');
    const panel = document.getElementById(`vetting-${tab}`);
    if (panel) panel.classList.add('active');
}

async function startIdentityVerification() {
    const btn = document.getElementById('btn-verify-identity');
    if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…'; }
    try {
        const res = await fetch('/api/vetting/identity/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await res.json();
        if (data.verified) {
            // Dev mock — already verified
            document.getElementById('identity-status-bar').innerHTML = '<span class="vetting-badge verified">Verified</span>';
            refreshVettingScore();
            return;
        }
        if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
            return;
        }
        throw new Error(data.error || 'Unknown error');
    } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = 'Verify with GOV.UK One Login'; }
        if (typeof showToast === 'function') showToast('Failed to start identity verification: ' + err.message, 'error');
    }
}

async function submitInsurance(e) {
    e.preventDefault();
    const errEl = document.getElementById('ins-error');
    const btn   = document.getElementById('btn-submit-ins');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const body = {
        insuranceType:      document.getElementById('ins-type').value,
        providerName:       document.getElementById('ins-provider').value,
        policyNumber:       document.getElementById('ins-policy').value,
        coverageAmountGbp:  parseInt(document.getElementById('ins-coverage').value, 10),
        validFrom:          document.getElementById('ins-valid-from').value,
        expiresAt:          document.getElementById('ins-expires').value
    };

    try {
        const res = await fetch('/api/vetting/insurance', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
            body:    JSON.stringify(body)
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Submission failed'); }
        if (typeof showToast === 'function') showToast('Insurance submitted — we will review within 2–3 business days.', 'success');
        document.getElementById('form-insurance').reset();
        refreshVettingScore();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Insurance';
    }
}

async function submitTradeReg(e) {
    e.preventDefault();
    const errEl = document.getElementById('trade-error');
    const btn   = document.getElementById('btn-submit-trade');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const body = {
        registrationType:   document.getElementById('trade-type').value,
        registrationNumber: document.getElementById('trade-number').value,
        registeredName:     document.getElementById('trade-name').value,
        expiresAt:          document.getElementById('trade-expires').value || null
    };

    try {
        const res = await fetch('/api/vetting/trade-registration', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
            body:    JSON.stringify(body)
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Submission failed'); }
        const data = await res.json();
        const msg = data.status === 'api_verified'
            ? 'Registration verified automatically!'
            : 'Registration submitted — we will review within 2–3 business days.';
        if (typeof showToast === 'function') showToast(msg, 'success');
        document.getElementById('form-trade').reset();
        refreshVettingScore();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Registration';
    }
}

async function loadQuizQuestions() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '<p>Loading questions…</p>';
    try {
        const res = await fetch('/api/vetting/quiz/questions', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await res.json();
        let html = '<form id="quiz-form" onsubmit="submitQuiz(event)">';
        data.questions.forEach((q, i) => {
            html += `<div class="quiz-question"><p class="quiz-q-text"><strong>${i + 1}. ${q.question}</strong></p>`;
            q.options.forEach((opt, oi) => {
                html += `<label class="quiz-option"><input type="radio" name="${q.id}" value="${oi}" required> ${opt}</label>`;
            });
            html += '</div>';
        });
        html += '<div id="quiz-error" class="step-error-msg" style="display:none"></div>';
        html += '<button type="submit" class="btn btn-primary" id="btn-submit-quiz">Submit Answers</button></form>';
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<p class="step-error-msg">Failed to load quiz: ${err.message}</p><button class="btn btn-secondary" onclick="loadQuizQuestions()">Retry</button>`;
    }
}

async function submitQuiz(e) {
    e.preventDefault();
    const errEl = document.getElementById('quiz-error');
    const btn   = document.getElementById('btn-submit-quiz');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const form    = document.getElementById('quiz-form');
    const inputs  = form.querySelectorAll('input[type="radio"]:checked');
    const answers = {};
    inputs.forEach((inp) => { answers[inp.name] = inp.value; });

    try {
        const res = await fetch('/api/vetting/quiz/submit', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
            body:    JSON.stringify({ answers })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Quiz submission failed');
        const msg = data.passed
            ? `Quiz passed! You scored ${data.score}% (${data.correct}/${data.total} correct).`
            : `Score: ${data.score}% — you need 80% to pass. You can retry from your dashboard.`;
        document.getElementById('quiz-container').innerHTML = `<p class="form-hint" style="font-size:16px">${msg}</p>`;
        refreshVettingScore();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Submit Answers';
    }
}

async function refreshVettingScore() {
    try {
        const res  = await fetch('/api/vetting/status', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await res.json();
        const score = data.vettingScore || 0;
        const bar   = document.getElementById('vetting-score-bar');
        const val   = document.getElementById('vetting-score-value');
        if (bar) bar.style.width = score + '%';
        if (val) val.textContent = score + ' / 100';
        // Update identity badge
        if (data.identity && data.identity.verified) {
            const statusBar = document.getElementById('identity-status-bar');
            if (statusBar) statusBar.innerHTML = '<span class="vetting-badge verified">Verified</span>';
            const btn = document.getElementById('btn-verify-identity');
            if (btn) { btn.disabled = true; btn.textContent = 'Identity Verified'; }
        }
    } catch (e) { /* non-critical */ }
}

// Load score when arriving at step 3
const _origUpdateStep = typeof updateStep === 'function' ? updateStep : null;
document.addEventListener('DOMContentLoaded', () => {
    // Hook into step navigation to refresh score when landing on step 3
    const origNext = typeof nextStep === 'function' ? nextStep : null;
});

// Also refresh on GOV.UK callback redirect
(function checkVettingCallback() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vetting_success') === 'identity') {
        history.replaceState({}, '', window.location.pathname);
        if (typeof showToast === 'function') showToast('Identity successfully verified!', 'success');
        refreshVettingScore();
    }
    if (params.get('vetting_error')) {
        history.replaceState({}, '', window.location.pathname);
        if (typeof showToast === 'function') showToast('Identity verification failed: ' + params.get('vetting_error'), 'error');
    }
})();

console.log('TradeMatch Vendor Onboarding loaded. Type resetOnboarding() to test again.');
