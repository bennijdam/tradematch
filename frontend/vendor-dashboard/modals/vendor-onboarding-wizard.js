// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

const ONBOARDING_STEP_KEY = 'vendorOnboardingStep';
const ONBOARDING_COMPLETED_KEY = 'vendorOnboardingCompleted';

function notifyParent(type, payload = {}) {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            source: 'vendor-onboarding',
            type,
            payload
        }, '*');
    }
}

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

// Wizard Navigation
const storedStep = parseInt(localStorage.getItem(ONBOARDING_STEP_KEY) || '1', 10);
let currentStep = Number.isNaN(storedStep) ? 1 : Math.min(Math.max(storedStep, 1), 5);
const totalSteps = 5;

const steps = document.querySelectorAll('.step');
const progressBar = document.getElementById('progressBar');
const currentStepDisplay = document.getElementById('currentStep');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const nextBtnText = document.getElementById('nextBtnText');
const skipBtn = document.getElementById('skipBtn');

function updateStep(stepNumber) {
    // Hide all steps
    steps.forEach(step => step.classList.remove('active'));
    
    // Show current step
    const currentStepElement = document.querySelector(`[data-step="${stepNumber}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    // Update progress bar
    const progress = (stepNumber / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update step counter
    currentStepDisplay.textContent = stepNumber;
    
    // Update buttons
    backBtn.disabled = stepNumber === 1;
    
    if (stepNumber === totalSteps) {
        nextBtnText.textContent = 'Complete Setup';
    } else {
        nextBtnText.textContent = 'Continue';
    }
    
    localStorage.setItem(ONBOARDING_STEP_KEY, String(stepNumber));

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    notifyParent('complete');
}

function skipOnboarding() {
    if (confirm('Are you sure you want to skip onboarding? You can complete this later in settings.')) {
        notifyParent('dismiss');
    }
}

// Event Listeners
nextBtn.addEventListener('click', nextStep);
backBtn.addEventListener('click', previousStep);
skipBtn.addEventListener('click', skipOnboarding);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            nextStep();
        }
    }
});

// Form validation (basic example)
const forms = document.querySelectorAll('.onboarding-form');
forms.forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        nextStep();
    });
});

// Multi-select cards animation
const checkboxCards = document.querySelectorAll('.checkbox-card');
checkboxCards.forEach(card => {
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            const checkbox = card.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
});

// Radio cards animation
const radioCards = document.querySelectorAll('.radio-card, .topup-card');
radioCards.forEach(card => {
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        }
    });
});

// Initialize
updateStep(currentStep);
