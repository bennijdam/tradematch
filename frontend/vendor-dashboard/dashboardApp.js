// ============================================
// VENDOR DASHBOARD LIVE DATA
// ============================================
function getAuthToken() {
    return localStorage.getItem('token');
}

let cachedVendorUser = null;
let cachedAvailableQuotes = [];

const ONBOARDING_COMPLETED_KEY = 'vendorOnboardingCompleted';
const ONBOARDING_STEP_KEY = 'vendorOnboardingStep';
let onboardingDismissedSession = false;

function isDemoToken(token) {
    return token === 'demo-token';
}

function getApiBaseUrl() {
    const stored = localStorage.getItem('apiBaseUrl');
    if (stored) return stored.replace(/\/$/, '');

    const origin = window.location.origin;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost && !origin.includes(':3001')) {
        return 'http://localhost:3001';
    }
    return origin;
}

function getAuthBaseUrl() {
    const stored = localStorage.getItem('authBaseUrl');
    if (stored) return stored.replace(/\/$/, '');

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
        return 'http://localhost:3002';
    }
    return window.location.origin;
}

function redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${getAuthBaseUrl()}/frontend/pages/auth-login.html?redirect=${returnUrl}`;
}

async function enforceVendorSession() {
    const token = getAuthToken();
    if (!token || isDemoToken(token)) {
        redirectToLogin();
        return false;
    }

    const cachedUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch (error) {
            return {};
        }
    })();

    if (cachedUser.userType && cachedUser.userType !== 'vendor' && cachedUser.userType !== 'tradesperson') {
        redirectToLogin();
        return false;
    }

    try {
        const profile = await apiFetchJson('/api/auth/me');
        const user = profile?.user || {};
        const userType = user.user_type || user.userType || cachedUser.userType;
        localStorage.setItem('user', JSON.stringify({
            ...cachedUser,
            id: user.id || cachedUser.id,
            email: user.email || cachedUser.email,
            userType
        }));

        if (userType && userType !== 'vendor' && userType !== 'tradesperson') {
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.warn('Vendor auth check failed:', error);
    }

    return true;
}

async function apiFetchJson(path, options = {}) {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token && !isDemoToken(token)) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with ${response.status}`);
    }

    return response.json();
}

function getOnboardingModalElements() {
    return {
        modal: document.getElementById('vendorOnboardingModal'),
        frame: document.getElementById('vendorOnboardingFrame')
    };
}

function openVendorOnboardingModal() {
    const { modal, frame } = getOnboardingModalElements();
    if (!modal || !frame || modal.classList.contains('active')) return;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('vendor-onboarding-open');

    if (!frame.getAttribute('src')) {
        frame.setAttribute('src', '/frontend/vendor-dashboard/modals/vendor-onboarding-wizard.html');
    }
}

function closeVendorOnboardingModal() {
    const { modal } = getOnboardingModalElements();
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('vendor-onboarding-open');
}

async function fetchVendorOnboardingStatus() {
    try {
        const profile = await apiFetchJson('/api/auth/me');
        const user = profile?.user || {};
        const metadata = user.metadata || {};
        return Boolean(user.onboarding_completed || metadata.onboarding_completed);
    } catch (error) {
        console.warn('Onboarding status check failed:', error);
        return false;
    }
}

async function markVendorOnboardingComplete() {
    try {
        await apiFetchJson('/api/vendor/onboarding', {
            method: 'PATCH',
            body: JSON.stringify({ completed: true })
        });
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        localStorage.removeItem(ONBOARDING_STEP_KEY);
        closeVendorOnboardingModal();
    } catch (error) {
        console.warn('Failed to persist onboarding completion:', error);
        showVendorToast('Unable to save onboarding status.', 'error');
    }
}

async function checkVendorOnboarding() {
    if (onboardingDismissedSession) return;
    const completed = await fetchVendorOnboardingStatus();
    if (completed) {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        return;
    }

    openVendorOnboardingModal();
}

window.addEventListener('message', (event) => {
    const data = event?.data || {};
    if (data.source !== 'vendor-onboarding') return;

    if (data.type === 'dismiss') {
        onboardingDismissedSession = true;
        closeVendorOnboardingModal();
        return;
    }

    if (data.type === 'complete') {
        markVendorOnboardingComplete();
    }
});

function updateText(el, value) {
    if (!el) return;
    el.textContent = value;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function isValidEmail(email = '') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function clampText(value, maxLength) {
    const text = String(value || '').trim();
    return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return 'TBD';
    const amount = Number(value);
    if (Number.isNaN(amount)) return value;
    return `£${amount.toLocaleString('en-GB')}`;
}

function formatBudgetRange(min, max) {
    if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}`;
    if (min) return `From ${formatCurrency(min)}`;
    if (max) return `Up to ${formatCurrency(max)}`;
    return 'Budget not specified';
}

function formatRelativeDate(dateValue) {
    if (!dateValue) return 'Recently posted';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Recently posted';

    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Posted today';
    if (diffDays === 1) return 'Posted 1 day ago';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `Posted ${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
}

function showVendorToast(message, type = 'success', subtitle = '') {
    const toastTitle = document.getElementById('toastTitle');
    const toastSub = document.getElementById('toastSub');
    const toast = document.getElementById('toast');

    if (toastTitle && toastSub && toast) {
        toastTitle.textContent = message;
        toastSub.textContent = subtitle;
        toast.classList.remove('success', 'error', 'warning');
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 3200);
        return;
    }

    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
        return;
    }

    alert(message);
}

function renderLoading(container, message = 'Loading...') {
    if (!container) return;
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">${message}</div><div class="empty-state-desc">Please wait.</div></div>`;
}

function renderError(container, message = 'Something went wrong', retryLabel = 'Retry', retryFnName = '') {
    if (!container) return;
    const retryButton = retryFnName
        ? `<button class="btn btn-secondary" onclick="${retryFnName}()">${retryLabel}</button>`
        : '';
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-title">${message}</div>
            <div class="empty-state-desc">Please try again.</div>
            ${retryButton}
        </div>
    `;
}

function formatShortDate(dateValue) {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getInitials(value = '') {
    const trimmed = String(value).trim();
    if (!trimmed) return 'TM';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function formatRelativeTime(dateValue) {
    if (!dateValue) return 'Just now';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Just now';

    const diffMs = Date.now() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
}

function setCachedVendorUser(user) {
    if (!user) return;
    cachedVendorUser = {
        id: user.id || user.userId,
        email: user.email,
        fullName: user.full_name || user.name,
        userType: user.user_type || user.userType
    };
}

async function getVendorUser() {
    if (cachedVendorUser?.id) return cachedVendorUser;

    try {
        const cached = JSON.parse(localStorage.getItem('user') || '{}');
        if (cached?.id) {
            cachedVendorUser = cached;
            return cachedVendorUser;
        }
    } catch (error) {
        // ignore parse errors
    }

    try {
        const profile = await apiFetchJson('/api/auth/me');
        const user = profile?.user || {};
        setCachedVendorUser(user);
        return cachedVendorUser;
    } catch (error) {
        return null;
    }
}

const NOTIFICATION_ICONS = {
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>',
    good: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    warn: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
    danger: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
};

function mapNotificationType(type = '', title = '') {
    const normalized = `${type} ${title}`.toLowerCase();
    if (normalized.includes('review')) return 'good';
    if (normalized.includes('payment') || normalized.includes('billing') || normalized.includes('failed')) return 'danger';
    if (normalized.includes('impression') || normalized.includes('quota')) return 'warn';
    if (normalized.includes('won') || normalized.includes('accepted')) return 'good';
    if (normalized.includes('lead') || normalized.includes('message')) return 'info';
    return 'info';
}

function normalizeNotification(notification = {}) {
    const title = notification.title || notification.subject || 'Notification';
    const type = mapNotificationType(notification.notification_type || notification.type || '', title);
    const icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info;
    return {
        id: notification.id,
        unread: !notification.is_read,
        type,
        title,
        desc: notification.body || notification.message || '',
        time: formatRelativeTime(notification.created_at || notification.createdAt),
        icon
    };
}

function updateMessageBadge(unreadCount) {
    const badge = document.querySelector('[data-message-badge]');
    if (!badge) return;
    if (unreadCount > 0) {
        badge.style.display = 'block';
        badge.title = `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`;
    } else {
        badge.style.display = 'none';
        badge.removeAttribute('title');
    }
}

function updateImpressionsUI({ available, totalPurchased, totalSpent }) {
    const remaining = toNumber(available, 0);
    const purchased = toNumber(totalPurchased, 0);
    const spent = toNumber(totalSpent, 0);
    const total = purchased > 0 ? purchased : remaining + spent;
    const used = Math.max(0, total - remaining);
    const percentUsed = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;

    updateText(document.querySelector('[data-vendor-stat="impressionsRemaining"]'), remaining.toLocaleString('en-GB'));
    updateText(
        document.querySelector('[data-vendor-stat="impressionsSummary"]'),
        total > 0 ? `of ${total.toLocaleString('en-GB')} remaining` : 'Impressions remaining'
    );
    updateText(
        document.querySelector('[data-vendor-stat="impressionsUsed"]'),
        total > 0 ? `${used.toLocaleString('en-GB')} / ${total.toLocaleString('en-GB')}` : `${used.toLocaleString('en-GB')}`
    );

    const progress = document.querySelector('[data-vendor-stat="impressionsProgress"]');
    if (progress) {
        progress.style.width = `${percentUsed.toFixed(0)}%`;
    }

    updateText(
        document.querySelector('[data-vendor-profile="impressionsMini"]'),
        total > 0 ? `${used.toLocaleString('en-GB')} / ${total.toLocaleString('en-GB')}` : `${used.toLocaleString('en-GB')}`
    );
    const miniProgress = document.querySelector('[data-vendor-profile="impressionsMiniProgress"]');
    if (miniProgress) {
        miniProgress.style.width = `${percentUsed.toFixed(0)}%`;
    }
}

function updateImpressionsPageUI({ available, totalPurchased, totalSpent }) {
    const remaining = toNumber(available, 0);
    const purchased = toNumber(totalPurchased, 0);
    const spent = toNumber(totalSpent, 0);
    const total = purchased > 0 ? purchased : remaining + spent;
    const used = Math.max(0, total - remaining);
    const percentUsed = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;

    updateText(document.querySelector('[data-impressions-total]'), total.toLocaleString('en-GB'));
    updateText(document.querySelector('[data-impressions-used]'), used.toLocaleString('en-GB'));
    updateText(document.querySelector('[data-impressions-remaining]'), remaining.toLocaleString('en-GB'));
    updateText(
        document.querySelector('[data-impressions-remaining-subtext]'),
        total > 0 ? `${Math.round((remaining / total) * 100)}% of allowance` : 'Allowance not set'
    );
    updateText(document.querySelector('[data-impressions-total-label]'), total.toLocaleString('en-GB'));

    const status = document.querySelector('[data-impressions-status]');
    const statusText = document.querySelector('[data-impressions-status-text]');
    if (status) {
        status.classList.remove('active', 'warning', 'paused');
        if (percentUsed >= 90) {
            status.classList.add('paused');
        } else if (percentUsed >= 70) {
            status.classList.add('warning');
        } else {
            status.classList.add('active');
        }
    }
    updateText(statusText, `${Math.round(percentUsed)}% Used`);

    const progress = document.querySelector('[data-impressions-progress]');
    if (progress) {
        progress.style.width = `${percentUsed.toFixed(0)}%`;
        progress.classList.remove('warning', 'danger');
        if (percentUsed >= 90) {
            progress.classList.add('danger');
        } else if (percentUsed >= 70) {
            progress.classList.add('warning');
        }
    }

    updateText(
        document.querySelector('[data-impressions-alert]'),
        total > 0
            ? `You've used ${used.toLocaleString('en-GB')} of your ${total.toLocaleString('en-GB')} monthly impressions. Your profile will auto-pause when you reach 100%. Consider adding more impressions to stay visible.`
            : 'Impression usage will appear once your allowance is active.'
    );
}

async function getImpressionsData() {
    try {
        const analytics = await apiFetchJson('/api/credits/analytics');
        const creditBalance = analytics?.creditBalance || {};
        return {
            available: creditBalance.available,
            totalPurchased: creditBalance.totalPurchased,
            totalSpent: creditBalance.totalSpent
        };
    } catch (error) {
        try {
            const user = await getVendorUser();
            if (!user?.id) return null;
            const credits = await apiFetchJson(`/api/vendor-credits/balance/${encodeURIComponent(user.id)}`);
            return {
                available: credits?.balance ?? credits?.currentBalance ?? 0,
                totalPurchased: credits?.totalPurchased ?? 0,
                totalSpent: credits?.totalSpent ?? 0
            };
        } catch (creditError) {
            return null;
        }
    }
}

let cachedConversations = [];
let currentConversationId = null;

function getConversationTitle(convo = {}) {
    if (convo.customer_name) return convo.customer_name;
    if (convo.customerName) return convo.customerName;
    if (convo.contact_name) return convo.contact_name;
    if (convo.customer_id) return `Customer ${String(convo.customer_id).slice(-4)}`;
    return 'Customer';
}

function getConversationJob(convo = {}) {
    if (convo.quote_title) return convo.quote_title;
    if (convo.job_title) return convo.job_title;
    if (convo.job_id) return `Job ${convo.job_id}`;
    return 'Job discussion';
}

function getConversationPreview(convo = {}) {
    return (
        convo.last_message_body ||
        convo.last_message_preview ||
        convo.last_message_text ||
        convo.last_message ||
        'Open conversation'
    );
}

function renderConversationList(conversations = [], activeId) {
    const list = document.getElementById('conversationsList');
    if (!list) return;

    if (!conversations.length) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-title">No messages yet</div><div class="empty-state-desc">When customers contact you, they will appear here.</div></div>';
        return;
    }

    list.innerHTML = '';
    conversations.forEach((convo) => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        if (convo.id === activeId) item.classList.add('active');
        if (toNumber(convo.unread_count, 0) > 0) item.classList.add('unread');

        const title = getConversationTitle(convo);
        const job = getConversationJob(convo);
        const preview = getConversationPreview(convo);
        const time = formatRelativeTime(convo.last_message_at || convo.updated_at || convo.created_at);
        const initials = getInitials(title);

        item.dataset.conversationId = convo.id;
        item.innerHTML = `
            <div class="conversation-header">
                <div class="conversation-avatar">${initials}</div>
                <div class="conversation-info">
                    <div class="conversation-name">${title}</div>
                    <div class="conversation-job">${job}</div>
                </div>
                <div class="conversation-time">${time}</div>
            </div>
            <div class="conversation-preview">${preview}</div>
            ${toNumber(convo.unread_count, 0) > 0 ? '<span class="conversation-unread"></span>' : ''}
        `;

        item.addEventListener('click', () => {
            selectConversation(convo.id);
        });

        list.appendChild(item);
    });
}

async function selectConversation(conversationId) {
    if (!conversationId) return;
    currentConversationId = conversationId;
    renderConversationList(cachedConversations, conversationId);
    await hydrateConversationMessages(conversationId);
}

async function hydrateConversationMessages(conversationId) {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;

    renderLoading(chatContainer, 'Loading messages...');

    const convo = cachedConversations.find((item) => item.id === conversationId) || {};
    const title = getConversationTitle(convo);
    const job = getConversationJob(convo);
    updateText(document.querySelector('[data-chat-name]'), title);
    updateText(document.querySelector('[data-chat-job]'), job);
    updateText(document.querySelector('[data-chat-avatar]'), getInitials(title));

    try {
        const user = await getVendorUser();
        const response = await apiFetchJson(`/api/messaging/conversations/${encodeURIComponent(conversationId)}/messages`);
        const messages = response?.messages || [];
        chatContainer.innerHTML = '';

        if (!messages.length) {
            chatContainer.innerHTML = '<div class="empty-state"><div class="empty-state-title">No messages yet</div><div class="empty-state-desc">Start the conversation below.</div></div>';
            return;
        }

        messages.forEach((message) => {
            const isSent = user?.id && String(message.sender_id) === String(user.id);
            const wrapper = document.createElement('div');
            wrapper.className = `message${isSent ? ' sent' : ''}`;

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = isSent ? getInitials(user?.fullName || user?.email || 'You') : getInitials(title);

            const content = document.createElement('div');
            content.className = 'message-content';

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.textContent = message.body || '';

            const time = document.createElement('div');
            time.className = 'message-time';
            time.textContent = formatRelativeTime(message.created_at);

            content.appendChild(bubble);
            content.appendChild(time);
            wrapper.appendChild(avatar);
            wrapper.appendChild(content);
            chatContainer.appendChild(wrapper);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
        console.warn('Message load failed:', error);
        renderError(chatContainer, 'Unable to load messages', 'Retry', 'retryConversationMessages');
    }
}

async function hydrateVendorMessagesPage() {
    const list = document.getElementById('conversationsList');
    if (!list) return;

    renderLoading(list, 'Loading conversations...');

    try {
        const response = await apiFetchJson('/api/messaging/conversations?limit=50');
        cachedConversations = response?.conversations || [];

        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get('conversation_id');
        const initialId = requestedId || cachedConversations[0]?.id || null;
        renderConversationList(cachedConversations, initialId);

        if (initialId) {
            await selectConversation(initialId);
        }

        const searchInput = document.getElementById('conversationSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.trim().toLowerCase();
                const filtered = cachedConversations.filter((convo) => {
                    const title = getConversationTitle(convo).toLowerCase();
                    const job = getConversationJob(convo).toLowerCase();
                    return title.includes(query) || job.includes(query);
                });
                renderConversationList(filtered, currentConversationId);
            });
        }
    } catch (error) {
        console.warn('Conversation load failed:', error);
        renderError(list, 'Unable to load conversations', 'Retry', 'retryConversations');
    }
}

window.sendMessage = async function sendMessage() {
    const textarea = document.getElementById('messageInput');
    const message = textarea?.value.trim();
    if (!currentConversationId) return;
    if (!message) {
        showVendorToast('Please enter a message.', 'error');
        return;
    }
    if (message.length > 2000) {
        showVendorToast('Message is too long (max 2000 characters).', 'error');
        return;
    }

    try {
        await apiFetchJson(`/api/messaging/conversations/${encodeURIComponent(currentConversationId)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ body: message })
        });
        textarea.value = '';
        textarea.style.height = 'auto';
        await hydrateConversationMessages(currentConversationId);
    } catch (error) {
        console.warn('Send message failed:', error);
    }
};

window.purchaseCredits = async function purchaseCredits(packageId) {
    if (!packageId) {
        showVendorToast('Select a credit package.', 'error');
        return;
    }

    try {
        const result = await apiFetchJson('/api/credits/checkout', {
            method: 'POST',
            body: JSON.stringify({ packageId })
        });

        if (result?.url) {
            window.location.href = result.url;
            return;
        }

        showVendorToast('Unable to start checkout.', 'error');
    } catch (error) {
        showVendorToast(error.message || 'Unable to start checkout.', 'error');
    }
};

function collectProfileFormData() {
    const fields = document.querySelectorAll('[data-profile-field]');
    if (!fields.length) return null;

    const data = {};
    fields.forEach((field) => {
        const key = field.dataset.profileField;
        if (!key) return;
        if (field.tagName === 'SELECT') {
            data[key] = field.value;
        } else if (field.type === 'checkbox') {
            data[key] = field.checked;
        } else {
            data[key] = field.value;
        }
    });

    const secondaryTags = Array.from(document.querySelectorAll('.multiselect-tags .tag'))
        .map((tag) => tag.textContent.replace('×', '').trim())
        .filter(Boolean);

    data.secondaryTrades = secondaryTags;
    return data;
}

window.saveVendorProfile = async function saveVendorProfile() {
    const formData = collectProfileFormData();
    if (!formData) {
        showVendorToast('Profile form not found.', 'error');
        return;
    }

    if (!formData.company_name || formData.company_name.trim().length < 2) {
        showVendorToast('Business name is required.', 'error');
        return;
    }

    if (formData.description && formData.description.length > 500) {
        showVendorToast('Description is too long (max 500 characters).', 'error');
        return;
    }

    if (formData.service_areas && formData.service_areas.length > 500) {
        showVendorToast('Service areas are too long (max 500 characters).', 'error');
        return;
    }

    const services = [formData.primary_trade, ...(formData.secondaryTrades || [])].filter(Boolean);
    const yearsExperience = formData.years_experience ? Number(formData.years_experience) : null;
    if (yearsExperience !== null && (Number.isNaN(yearsExperience) || yearsExperience < 0 || yearsExperience > 100)) {
        showVendorToast('Years in business must be a valid number.', 'error');
        return;
    }
    const user = await getVendorUser();

    try {
        await apiFetchJson('/api/vendor/profile', {
            method: 'PUT',
            body: JSON.stringify({
                company_name: formData.company_name,
                phone: formData.phone || user?.phone || null,
                email: user?.email || null,
                postcode: user?.postcode || null,
                service_areas: formData.service_areas || null,
                services: services.length ? services : null,
                description: formData.description || null,
                years_experience: yearsExperience
            })
        });
        const indicator = document.getElementById('unsavedIndicator');
        if (indicator) indicator.classList.remove('visible');
        showVendorToast('Profile Saved', 'success', 'Changes are under review and will go live shortly.');
    } catch (error) {
        showVendorToast(error.message || 'Failed to save profile', 'error');
    }
};

async function hydrateBillingPage() {
    const balanceEl = document.querySelector('[data-billing-balance]');
    if (!balanceEl) return;

    const minLeadFee = 8;
    let balanceValue = null;

    try {
        const user = await getVendorUser();
        if (user?.id) {
            const credits = await apiFetchJson(`/api/vendor-credits/balance/${encodeURIComponent(user.id)}`);
            balanceValue = credits?.balance ?? credits?.currentBalance ?? 0;
        }
    } catch (error) {
        console.warn('Balance fetch failed:', error);
    }

    if (balanceValue === null) {
        balanceValue = 0;
    }

    updateText(balanceEl, Number(balanceValue).toFixed(2));

    const statusEl = document.querySelector('[data-billing-status]');
    const metaEl = document.querySelector('[data-billing-meta]');
    const warningEl = document.querySelector('[data-billing-warning]');

    const leadsCover = Math.max(0, Math.floor(toNumber(balanceValue, 0) / minLeadFee));
    updateText(metaEl, leadsCover > 0 ? `Can cover ~${leadsCover} leads at current rates` : 'Balance too low for new leads');

    if (statusEl) {
        statusEl.classList.remove('success');
        if (toNumber(balanceValue, 0) < minLeadFee) {
            statusEl.classList.add('danger');
            statusEl.innerHTML = '<span>!</span> Balance too low';
        } else {
            statusEl.classList.add('success');
            statusEl.innerHTML = '<span>✓</span> Sufficient for leads';
        }
    }

    if (warningEl) {
        warningEl.style.display = toNumber(balanceValue, 0) < minLeadFee ? 'flex' : 'none';
    }

    try {
        const analytics = await apiFetchJson('/api/credits/analytics');
        const leadsCount = toNumber(analytics?.thisMonth?.leadsOffered, 0);
        const creditsSpent = toNumber(analytics?.thisMonth?.creditsSpent, 0);
        const estimatedCost = creditsSpent * 0.5;
        updateText(document.querySelector('[data-billing-leads-count]'), leadsCount.toLocaleString('en-GB'));
        updateText(document.querySelector('[data-billing-leads-spend]'), estimatedCost.toFixed(2));
        updateText(
            document.querySelector('[data-billing-leads-avg]'),
            leadsCount > 0 ? (estimatedCost / leadsCount).toFixed(2) : '0.00'
        );
    } catch (error) {
        console.warn('Billing analytics not available:', error);
    }

    await hydrateBillingTransactions();
}

async function hydrateBillingTransactions() {
    const tableBody = document.querySelector('[data-billing-transactions]');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6">Loading transactions...</td></tr>';

    try {
        const response = await apiFetchJson('/api/credits/transaction-history?limit=25');
        const transactions = response?.transactions || [];

        if (!transactions.length) {
            tableBody.innerHTML = '<tr><td colspan="6">No transactions yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        transactions.forEach((tx) => {
            const row = document.createElement('tr');
            const statusLabel = (tx.status || '').toLowerCase() === 'completed' ? 'Paid' : 'Pending';
            const amount = toNumber(tx.amount_paid, 0).toFixed(2);
            const createdAt = tx.completed_at || tx.created_at;
            row.innerHTML = `
                <td>${formatShortDate(createdAt)}</td>
                <td><span class="transaction-type topup">Top-Up</span></td>
                <td>
                    Balance top-up<br>
                    <span style="font-size: 12px; color: var(--text-muted);">Payment ID: ${tx.id}</span>
                </td>
                <td>+£${amount}</td>
                <td><span class="transaction-status paid">✓ ${statusLabel}</span></td>
                <td>—</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.warn('Transaction history not available:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Unable to load transactions. <button class="btn btn-secondary" onclick="retryBillingTransactions()">Retry</button></td></tr>';
    }
}

async function hydrateReviewsSummary() {
    const averageEl = document.querySelector('[data-review-average]');
    const totalEl = document.querySelector('[data-review-total]');
    const latestEl = document.querySelector('[data-review-latest]');
    const ringEl = document.querySelector('[data-review-ring]');
    if (!averageEl && !totalEl && !latestEl && !ringEl) return;

    updateText(averageEl, '—');
    updateText(totalEl, '—');
    updateText(latestEl, 'Loading reviews…');

    try {
        const response = await apiFetchJson('/api/vendor/reviews');
        const summary = response?.summary || {};
        const reviews = response?.reviews || [];

        const avg = toNumber(summary.average_rating, 0);
        const total = toNumber(summary.total_reviews, 0);
        updateText(averageEl, avg.toFixed(1));
        updateText(totalEl, total.toLocaleString('en-GB'));

        if (ringEl) {
            const circumference = 314.16;
            const percent = Math.min(1, Math.max(0, avg / 5));
            const offset = circumference * (1 - percent);
            ringEl.setAttribute('stroke-dashoffset', offset.toFixed(2));
        }

        if (latestEl) {
            const latest = reviews[0] || {};
            const reviewText = latest.comment || latest.review_text || latest.feedback || latest.summary || 'No reviews yet.';
            const customerName = latest.customer_name ? ` — ${latest.customer_name}` : '';
            updateText(latestEl, reviewText ? `"${reviewText}"${customerName}` : 'No reviews yet.');
        }
    } catch (error) {
        console.warn('Reviews fetch failed:', error);
        updateText(averageEl, '—');
        updateText(totalEl, '—');
        updateText(latestEl, 'Unable to load reviews.');
    }
}

function mapLeadStatus(status) {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'open') return { label: 'Open', className: 'status-open' };
    if (normalized === 'quoted' || normalized === 'pending') return { label: 'Quoted', className: 'status-quoted' };
    if (normalized === 'accepted' || normalized === 'won') return { label: 'Won', className: 'status-won' };
    if (normalized === 'closed' || normalized === 'rejected') return { label: 'Closed', className: 'status-quoted' };
    return { label: status || 'Open', className: 'status-open' };
}

async function hydrateVendorDashboard() {
    const token = getAuthToken();
    if (!token || isDemoToken(token)) return;

    try {
        const dashboard = await apiFetchJson('/api/vendor/dashboard');
        const payload = dashboard?.data || {};
        const availableQuotes = payload.availableQuotes || [];
        const myBids = payload.myBids || [];
        const stats = payload.stats || {};

        cachedAvailableQuotes = availableQuotes;

        const newLeadsCount = availableQuotes.length;
        const activeQuotesCount = Number(stats.pending_bids) || myBids.filter(bid => bid.status === 'pending').length;
        const wonJobsCount = Number(stats.won_bids) || myBids.filter(bid => bid.status === 'accepted').length;

        updateText(document.querySelector('[data-vendor-stat="newLeads"]'), newLeadsCount);
        updateText(document.querySelector('[data-vendor-stat="activeQuotes"]'), activeQuotesCount);
        updateText(document.querySelector('[data-vendor-stat="wonJobs"]'), wonJobsCount);

        const leadRows = Array.from(document.querySelectorAll('[data-lead-row]'));
        leadRows.forEach((row, index) => {
            const quote = availableQuotes[index];
            if (!quote) {
                row.style.display = 'none';
                return;
            }

            row.style.display = '';
            updateText(row.querySelector('[data-lead-field="title"]'), quote.title);
            updateText(row.querySelector('[data-lead-field="meta"]'), quote.service_type || 'Service');
            updateText(row.querySelector('[data-lead-field="location"]'), quote.postcode || 'Location');
            updateText(row.querySelector('[data-lead-field="budget"]'), formatBudgetRange(quote.budget_min, quote.budget_max));
            updateText(row.querySelector('[data-lead-field="posted"]'), formatRelativeDate(quote.created_at));

            const statusEl = row.querySelector('[data-lead-field="status"]');
            if (statusEl) {
                const statusMeta = mapLeadStatus(quote.status);
                statusEl.textContent = statusMeta.label;
                statusEl.classList.remove('status-open', 'status-quoted', 'status-won');
                statusEl.classList.add(statusMeta.className);
            }

            const actionBtn = row.querySelector('[data-lead-field="action"]');
            if (actionBtn) {
                actionBtn.textContent = 'Quote Now';
                actionBtn.classList.remove('btn-secondary');
                actionBtn.classList.add('btn-primary');
                actionBtn.onclick = () => {
                    window.location.href = `vendor-new-leads.html?quote_id=${encodeURIComponent(quote.id)}`;
                };
            }
        });

        try {
            const userInfo = await apiFetchJson('/api/auth/me');
            const user = userInfo?.user || {};
            setCachedVendorUser(user);
            updateText(document.querySelector('[data-vendor-profile="name"]'), user.full_name || user.name || 'Vendor');
            updateText(document.querySelector('[data-vendor-profile="email"]'), user.email || '');

            if (user.id) {
                try {
                    const credits = await apiFetchJson(`/api/vendor-credits/balance/${encodeURIComponent(user.id)}`);
                    const balanceValue = credits?.balance ?? credits?.currentBalance;
                    if (balanceValue !== undefined) {
                        updateText(document.querySelector('[data-vendor-profile="balance"]'), Number(balanceValue).toFixed(2));
                    }
                } catch (creditError) {
                    console.warn('Vendor credits not available:', creditError);
                }
            }
        } catch (userError) {
            console.warn('Vendor profile fetch failed:', userError);
        }
    } catch (error) {
        console.warn('Vendor dashboard API error:', error);
    }
}

function buildLeadCard(quote) {
    const title = quote.title || 'New Lead';
    const service = quote.service_type || 'Service';
    const location = quote.postcode || 'Location';
    const budget = formatBudgetRange(quote.budget_min, quote.budget_max);
    const description = quote.description || 'No description provided.';
    const timeLabel = formatRelativeDate(quote.created_at);
    const sourceLabel = quote.source || 'Local Page';
    const leadId = quote.id;

    return `
        <div class="lead-card" data-lead-id="${leadId}">
            <div class="lead-header">
                <div class="lead-status">
                    <span class="badge badge-new">New</span>
                    <span class="lead-time">${timeLabel}</span>
                </div>
                <span class="badge badge-source">${sourceLabel}</span>
            </div>

            <h3 class="lead-title">${title}</h3>

            <div class="lead-meta">
                <div class="lead-meta-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <span>${service}</span>
                </div>
                <div class="lead-meta-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>${location}</span>
                </div>
                <div class="lead-meta-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Budget: ${budget}</span>
                </div>
            </div>

            <p class="lead-description">${description}</p>

            <div class="lead-footer">
                <div class="lead-cost">
                    <span class="cost-label">Cost:</span>
                    <span class="cost-value">1 impression</span>
                </div>
                <div class="lead-actions">
                    <button class="btn btn-secondary" onclick="viewLead('${leadId}')">View Details</button>
                    <button class="btn btn-primary" onclick="sendQuote('${leadId}')">Send Quote</button>
                </div>
            </div>
        </div>
    `;
}

async function hydrateVendorLeadsPage() {
    const leadsGrid = document.querySelector('[data-leads-grid]');
    if (!leadsGrid) return;

    renderLoading(leadsGrid, 'Loading leads...');

    try {
        const dashboard = await apiFetchJson('/api/vendor/dashboard');
        const availableQuotes = dashboard?.data?.availableQuotes || [];
        cachedAvailableQuotes = availableQuotes;

        if (!availableQuotes.length) {
            leadsGrid.innerHTML = '';
            const emptyState = document.getElementById('leadsEmptyState');
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        const emptyState = document.getElementById('leadsEmptyState');
        if (emptyState) emptyState.style.display = 'none';

        leadsGrid.innerHTML = availableQuotes.map(buildLeadCard).join('');

        const params = new URLSearchParams(window.location.search);
        const highlightId = params.get('quote_id');
        if (highlightId) {
            const highlightEl = leadsGrid.querySelector(`[data-lead-id="${highlightId}"]`);
            if (highlightEl) {
                highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightEl.style.boxShadow = '0 0 0 2px rgba(0, 229, 160, 0.6)';
            }
        }
    } catch (error) {
        console.warn('Leads fetch failed:', error);
        renderError(leadsGrid, 'Unable to load leads', 'Retry', 'retryLeads');
    }
}

window.viewLead = function viewLead(leadId) {
    const leadsGrid = document.querySelector('[data-leads-grid]');
    if (leadsGrid) {
        const target = leadsGrid.querySelector(`[data-lead-id="${leadId}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.boxShadow = '0 0 0 2px rgba(66, 165, 245, 0.6)';
            showVendorToast('Lead details highlighted.', 'success');
            return;
        }
    }

    const lead = cachedAvailableQuotes.find((quote) => String(quote.id) === String(leadId));
    if (lead) {
        showVendorToast(lead.title || 'Lead selected', 'success', lead.description || '');
        return;
    }

    showVendorToast('Lead not found.', 'error');
};

window.sendQuote = async function sendQuote(leadId) {
    const price = window.prompt('Enter your quote price (£):');
    if (!price) return;
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
        showVendorToast('Enter a valid quote price.', 'error');
        return;
    }
    const message = window.prompt('Add a brief message for the customer:') || '';
    if (message.length > 2000) {
        showVendorToast('Message is too long (max 2000 characters).', 'error');
        return;
    }
    const estimatedDuration = window.prompt('Estimated duration (e.g. 2 days):') || '';
    const availability = window.prompt('Your earliest availability (e.g. Next week):') || '';

    if (estimatedDuration.length > 120 || availability.length > 120) {
        showVendorToast('Duration/availability is too long (max 120 characters).', 'error');
        return;
    }

    try {
        await apiFetchJson('/api/bids', {
            method: 'POST',
            body: JSON.stringify({
                quoteId: leadId,
                price: numericPrice,
                message: clampText(message, 2000),
                estimatedDuration: clampText(estimatedDuration, 120),
                availability: clampText(availability, 120)
            })
        });
        showVendorToast('Quote sent successfully!', 'success');
        window.location.href = 'vendor-active-quotes.html';
    } catch (error) {
        showVendorToast(error.message || 'Failed to send quote', 'error');
    }
};

async function hydrateNotifications() {
    if (typeof window.setNotifications !== 'function') return;
    window.setNotifications([
        {
            id: 'loading',
            unread: false,
            type: 'info',
            title: 'Loading notifications...',
            desc: 'Please wait while we fetch updates.',
            time: 'Just now',
            icon: NOTIFICATION_ICONS.info
        }
    ]);
    try {
        const response = await apiFetchJson('/api/messaging/notifications');
        const notifications = response?.notifications || response?.data || [];
        const normalized = notifications.map(normalizeNotification);
        window.NOTIFICATIONS = normalized;
        window.setNotifications(normalized);
    } catch (error) {
        console.warn('Notifications fetch failed:', error);
        window.setNotifications([
            {
                id: 'error',
                unread: false,
                type: 'danger',
                title: 'Unable to load notifications',
                desc: 'Check your connection and try again.',
                time: 'Just now',
                icon: NOTIFICATION_ICONS.danger
            }
        ]);
    }
}

window.retryNotifications = function retryNotifications() {
    hydrateNotifications();
};

async function hydrateMessageBadge() {
    try {
        const response = await apiFetchJson('/api/messaging/conversations?limit=50');
        const conversations = response?.conversations || response?.data || [];
        const unreadCount = conversations.reduce((sum, convo) => sum + toNumber(convo.unread_count, 0), 0);
        updateMessageBadge(unreadCount);
    } catch (error) {
        console.warn('Conversations fetch failed:', error);
    }
}

window.retryConversationMessages = function retryConversationMessages() {
    if (currentConversationId) {
        hydrateConversationMessages(currentConversationId);
    }
};

window.retryConversations = function retryConversations() {
    hydrateVendorMessagesPage();
};

window.retryLeads = function retryLeads() {
    hydrateVendorLeadsPage();
};

window.retryBillingTransactions = function retryBillingTransactions() {
    hydrateBillingTransactions();
};

window.retryReviews = function retryReviews() {
    hydrateReviewsSummary();
};

async function hydrateImpressions() {
    try {
        const data = await getImpressionsData();
        if (!data) return;
        updateImpressionsUI(data);
    } catch (error) {
        console.warn('Impressions fetch failed:', error);
    }
}

async function hydrateVendorSignals() {
    const token = getAuthToken();
    if (!token || isDemoToken(token)) return;
    await Promise.all([
        hydrateNotifications(),
        hydrateMessageBadge(),
        hydrateImpressions(),
        hydrateReviewsSummary()
    ]);
}

function initVendorDashboardObserver() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const observer = new MutationObserver(() => {
        if (document.querySelector('[data-vendor-stat="newLeads"]')) {
            hydrateVendorDashboard();
            hydrateVendorSignals();
        }
        if (document.querySelector('.tab-button')) {
            initSettingsTabs();
        }
    });

    observer.observe(mainContent, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        const sessionOk = await enforceVendorSession();
        if (!sessionOk) return;
        await checkVendorOnboarding();
    })();
    hydrateVendorDashboard();
    hydrateVendorSignals();
    hydrateVendorMessagesPage();
    hydrateBillingPage();
    hydrateVendorLeadsPage();
    (async () => {
        const data = await getImpressionsData();
        if (data) updateImpressionsPageUI(data);
    })();
    initVendorDashboardObserver();
    initSettingsTabs();
});

window.markAllNotificationsRead = async function markAllNotificationsRead() {
    try {
        await apiFetchJson('/api/messaging/notifications/read', { method: 'POST' });
    } catch (error) {
        console.warn('Mark notifications read failed:', error);
    }
    await hydrateNotifications();
};

function switchTab(tabName, button) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));

    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    if (button) {
        button.classList.add('active');
    }
}

window.switchTab = switchTab;

function initSettingsTabs() {
    const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
    if (!tabButtons.length) return;

    tabButtons.forEach(button => {
        if (!button.dataset.tabTarget) {
            const inline = button.getAttribute('onclick') || '';
            const match = inline.match(/switchTab\('([^']+)'/);
            if (match) {
                button.dataset.tabTarget = match[1];
            }
        }

        button.addEventListener('click', () => {
            const target = button.dataset.tabTarget;
            if (!target) return;
            switchTab(target, button);
        });
    });
}



