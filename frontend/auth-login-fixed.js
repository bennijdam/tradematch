// User Type Toggle
const userTypeButtons = document.querySelectorAll('.user-type-btn');
let currentUserType = 'customer';

userTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        userTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUserType = btn.dataset.type;
    });
});

// Toggle Password Visibility
document.getElementById('togglePassword').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

// Show Notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

const FRONTEND_BASE = 'https://www.tradematch.uk';

function openOAuthPopup(url) {
    const width = 520;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
        url,
        'tradematch_oauth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!popup) {
        window.location.href = url;
        return null;
    }
    popup.focus();
    return popup;
}

function resolveReturnTo(value) {
    if (value && value.startsWith(FRONTEND_BASE)) {
        if (value.includes('/frontend/auth-login.html')) {
            return FRONTEND_BASE;
        }
        return value;
    }
    return FRONTEND_BASE;
}

function generateQuoteTitle(serviceType) {
    const titles = {
        'extension': 'House Extension Quote Request',
        'loft': 'Loft Conversion Quote Request',
        'kitchen': 'Kitchen Fitting Quote Request',
        'bathroom': 'Bathroom Installation Quote Request',
        'roofing': 'Roofing Quote Request',
        'electrical': 'Electrical Work Quote Request',
        'plumbing': 'Plumbing Quote Request',
        'flooring': 'Flooring Quote Request',
        'painting': 'Painting & Decorating Quote Request',
        'landscaping': 'Landscaping Quote Request'
    };

    return titles[serviceType] || 'Home Improvement Quote Request';
}

function generateQuoteDescription(serviceType) {
    const descriptions = {
        'extension': 'Looking for quotes for house extension work. Please provide detailed quotes including timeline and materials.',
        'loft': 'Requesting quotes for loft conversion. Need experienced professionals with relevant certifications.',
        'kitchen': 'Need kitchen fitting and installation services. Looking for complete solution from design to installation.',
        'bathroom': 'Bathroom installation and renovation required. Need plumbing, tiling, and fitting services.',
        'roofing': 'Roofing work needed - either repair or replacement. Looking for certified roofers with guarantees.',
        'electrical': 'Electrical work required. Need certified electricians for safe and compliant installation.',
        'plumbing': 'Plumbing services needed. Looking for experienced plumbers for installation and repair work.',
        'flooring': 'Flooring installation required. Need quotes for materials and labor for various flooring options.',
        'painting': 'Painting and decorating services needed. Looking for professional painters for interior/exterior work.',
        'landscaping': 'Landscaping work required. Need quotes for garden design, patio, or outdoor improvements.'
    };

    return descriptions[serviceType] || 'Home improvement work required. Please provide a detailed quote.';
}

async function submitPendingQuoteIfAny(token) {
    const pendingRaw = localStorage.getItem('pendingQuote');
    if (!pendingRaw) return false;

    let pendingQuote;
    try {
        pendingQuote = JSON.parse(pendingRaw);
    } catch (error) {
        console.warn('Failed to parse pending quote:', error);
        return false;
    }

    const serviceType = pendingQuote.serviceType || pendingQuote.service;
    const postcode = pendingQuote.postcode;

    if (!serviceType || !postcode) {
        console.warn('Pending quote missing required fields');
        return false;
    }

    const payload = {
        serviceType,
        title: generateQuoteTitle(serviceType),
        description: generateQuoteDescription(serviceType),
        postcode,
        urgency: pendingQuote.urgency || 'asap',
        additionalDetails: {
            source: 'auth-login',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        }
    };

    try {
        const response = await fetch('https://api.tradematch.uk/api/quotes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to submit quote');
        }

        localStorage.removeItem('pendingQuote');
        return true;
    } catch (error) {
        console.error('Pending quote submission error:', error);
        return false;
    }
}

async function processOAuthToken(token, source) {
    localStorage.setItem('token', token);

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userData = {
            id: payload.userId,
            email: payload.email,
            userType: payload.userType || payload.user_type || 'null',
            authProvider: source || 'google'
        };

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('lastEmail', payload.email);

        showNotification(`Successfully logged in with ${source || 'OAuth'}!`, 'success');

        const returnTo = resolveReturnTo(localStorage.getItem('oauthReturnTo'));

        if (userData.userType === 'vendor' || userData.userType === 'tradesperson') {
            window.location.href = returnTo + '/vendor-dashboard.html?source=google';
            return;
        }

        if (userData.userType === 'customer') {
            await submitPendingQuoteIfAny(token);
            window.location.href = returnTo + '/customer-dashboard.html?source=google';
            return;
        }

        window.location.href = returnTo + '/auth-select-role.html?token=' + token + '&source=google';
    } catch (decodeError) {
        console.error('JWT decode error:', decodeError);
        showNotification('Login successful, but failed to get user data', 'error');
    }
}

window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const { type, token, source } = event.data || {};
    if (type === 'oauth' && token) {
        processOAuthToken(token, source);
    }
});

// Form Submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    // Get form data
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    try {
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
        
        // Real API call to backend
        const response = await fetch('https://api.tradematch.uk/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, userType: currentUserType })
        });
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Invalid credentials');
        }
        
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('lastEmail', email);
        
        // Store remember me preference
        if (remember) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        // Show success
        showNotification('Login successful! Redirecting...', 'success');
        
        // Redirect based on user type or explicit redirect
        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect) {
                window.location.href = redirect;
                return;
            }
            window.location.href = data.user.userType === 'customer' 
                ? 'customer-dashboard.html' 
                : 'vendor-dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Social Login
// Login with Google OAuth
async function loginWithGoogle() {
    try {
        showNotification('Connecting to Google...', 'info');
        
        // Check URL parameters for callback errors
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('error')) {
            showNotification('Google login failed: ' + urlParams.get('error'), 'error');
            return;
        }
        
        // Store return URL for callback redirect
        const defaultReturnTo = FRONTEND_BASE;
        const returnTo = resolveReturnTo(urlParams.get('returnTo') || defaultReturnTo);
        localStorage.setItem('oauthReturnTo', returnTo);
        
        // Redirect to backend OAuth initiation
        const googleAuthUrl = 'https://api.tradematch.uk/auth/google?returnTo=' + encodeURIComponent(returnTo);
        openOAuthPopup(googleAuthUrl);
        
    } catch (error) {
        console.error('Google login error:', error);
        showNotification('Failed to connect to Google', 'error');
    }
}

// Login with Microsoft OAuth
async function loginWithMicrosoft() {
    try {
        showNotification('Connecting to Microsoft...', 'info');
        
        // Check URL parameters for callback errors
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('error')) {
            showNotification('Microsoft login failed: ' + urlParams.get('error'), 'error');
            return;
        }
        
        // Store return URL for callback redirect
        const defaultReturnTo = FRONTEND_BASE;
        const returnTo = resolveReturnTo(urlParams.get('returnTo') || defaultReturnTo);
        localStorage.setItem('oauthReturnTo', returnTo);
        
        // Redirect to backend OAuth initiation
        const microsoftAuthUrl = 'https://api.tradematch.uk/auth/microsoft?returnTo=' + encodeURIComponent(returnTo);
        openOAuthPopup(microsoftAuthUrl);
        
    } catch (error) {
        console.error('Microsoft login error:', error);
        showNotification('Failed to connect to Microsoft', 'error');
    }
}

// Handle OAuth callback
function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const source = urlParams.get('source');
    
    if (token) {
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'oauth', token, source }, window.location.origin);
            window.close();
            return;
        }
        processOAuthToken(token, source);
    } else if (urlParams.get('error')) {
        const error = urlParams.get('error');
        const source = urlParams.get('source') || 'OAuth';
        showNotification(`${source} login failed: ${error}`, 'error');
    }
}

// Check if already logged in and pre-fill email
window.addEventListener('load', () => {
    // Handle OAuth callback first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token') || urlParams.get('error')) {
        handleOAuthCallback();
        return;
    }
    
    const lastEmail = localStorage.getItem('lastEmail');
    const emailInput = document.getElementById('email');
    
    if (lastEmail && emailInput) {
        emailInput.value = lastEmail;
        emailInput.style.backgroundColor = '#e8f5ea';
        emailInput.style.border = '1px solid #16a34a';
        
        // Add small hint
        const emailHint = document.createElement('small');
        emailHint.textContent = 'Last email used: ' + lastEmail;
        emailHint.style.cssText = 'color: #6b7280; font-size: 12px; margin-top: 5px;';
        emailInput.parentNode.appendChild(emailHint);
    }
    
    // Check remember me
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe) {
        document.getElementById('remember').checked = true;
    }
});
