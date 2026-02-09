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
const totalSteps = 6;

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
        nextBtnText.textContent = 'Complete Setup';
    } else {
        nextBtnText.textContent = 'Continue';
    }
    
    // Scroll to top of modal content
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
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
    
    // Optional: Show success message
    alert('Onboarding completed! Welcome to TradeMatch.');
}

function skipOnboarding() {
    if (confirm('Are you sure you want to skip onboarding? You can access this setup later in settings.')) {
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

console.log('TradeMatch Vendor Onboarding loaded. Type resetOnboarding() to test again.');
