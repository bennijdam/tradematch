// ============================================
// AUTH SESSION GUARD (CUSTOMER DASHBOARD)
// ============================================
function getStoredUser() {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return null;
    try {
        return JSON.parse(rawUser);
    } catch (error) {
        console.warn('Failed to parse stored user data:', error);
        return null;
    }
}

function getReturnUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
}

function redirectToLogin() {
    const returnUrl = encodeURIComponent(getReturnUrl());
    window.location.href = `/login?redirect=${returnUrl}`;
}

function enforceCustomerSession() {
    const token = localStorage.getItem('token');
    if (!token) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isDemoPage = /my-jobs\.html|job-details\.html|job-quotes\.html|dashboard\.html|quotes\.html|messages\.html|notifications\.html|profile\.html|settings\.html|billing\.html|saved-trades\.html|reviews\.html|post-job\.html|index\.html/i.test(window.location.pathname);

        if (isLocalhost && isDemoPage) {
            localStorage.setItem('token', 'demo-token');
            if (!localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify({
                    userType: 'customer',
                    name: 'Demo Customer'
                }));
            }
            return true;
        }

        redirectToLogin();
        return false;
    }

    const user = getStoredUser();
    if (!user || !user.userType) {
        return true;
    }

    if (user.userType === 'customer') {
        return true;
    }

    if (user.userType === 'vendor' || user.userType === 'tradesperson') {
        window.location.href = '/vendor-dashboard';
        return false;
    }

    return true;
}

enforceCustomerSession();

// Theme Toggle
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    if (!themeToggle) return;
    if (themeToggle.dataset.bound === 'true') return;

    const currentTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        const theme = htmlElement.getAttribute('data-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    themeToggle.dataset.bound = 'true';
}

// Sidebar Collapse
const sidebar = document.getElementById('sidebar');
const collapseBtn = document.getElementById('collapseBtn');
const topNav = document.getElementById('topNav');
const mainContent = document.getElementById('mainContent');

collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    topNav.classList.toggle('sidebar-collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
    
    // Save state
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebar-collapsed', isCollapsed);
});

// Restore sidebar state
const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
if (sidebarCollapsed) {
    sidebar.classList.add('collapsed');
    topNav.classList.add('sidebar-collapsed');
    mainContent.classList.add('sidebar-collapsed');
}

// Search functionality
const searchInput = document.querySelector('.search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        // Implement search logic here
        console.log('Searching for:', searchTerm);
    });
}

// Notification handling
const notificationButtons = document.querySelectorAll('.icon-button');
notificationButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Handle notification click
        console.log('Notification clicked');
    });
});

// Modal handling
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Escape key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }
});

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const inputs = form.querySelectorAll('[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });
    
    return isValid;
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ============================================
// JOB LINKS + DETAILS (MOCK DATA)
// ============================================
const JOB_MOCK_DATA = {
    'job-1': {
        id: 'job-1',
        title: 'Kitchen Renovation',
        status: 'Open',
        statusClass: 'open',
        posted: 'Posted 2 days ago',
        location: 'London, SW1A',
        quotesCount: 3,
        serviceType: 'Kitchen Fitting',
        budget: '£8,000 - £12,000',
        propertyType: 'Semi-detached House',
        urgency: 'Within 1 month',
        summaryDesc: 'Need complete kitchen refit including cabinets, countertops, and appliances.',
        descriptionHtml: `
            <p>I'm looking for a complete kitchen renovation in my London home. The current kitchen is approximately 15 years old and needs a full refit.</p>
            <br>
            <p><strong>Requirements:</strong></p>
            <ul style="margin-left: 20px; margin-top: 8px;">
                <li>Remove existing kitchen units and appliances</li>
                <li>Install new modern cabinetry (approximately 10 units)</li>
                <li>Granite or quartz worktops</li>
                <li>Integrated appliances (oven, hob, dishwasher, fridge)</li>
                <li>New sink and tap fittings</li>
                <li>Tiling for splashback</li>
                <li>Updated lighting (under-cabinet and ceiling)</li>
            </ul>
            <br>
            <p>The kitchen dimensions are approximately 3.5m x 4m. I have a modern, minimalist style preference with handleless units in matt grey or white finish.</p>
        `,
        quotes: [
            {
                id: 'quote1',
                vendorName: 'Kitchen Bros Ltd',
                vendorInitials: 'KB',
                vendorSlug: 'kitchen-bros',
                ratingText: '4.8 (124 reviews)',
                price: '£8,500',
                timeline: '3-4 weeks',
                availability: 'Can start in 2 weeks',
                warranty: '12 months guarantee',
                message: 'We specialize in modern kitchen renovations. The quote includes all materials, labour, and disposal. We use premium quality cabinets and countertops.'
            },
            {
                id: 'quote2',
                vendorName: 'Premium Renovations',
                vendorInitials: 'PR',
                vendorSlug: 'premium-reno',
                ratingText: '4.9 (89 reviews)',
                price: '£9,200',
                timeline: '2-3 weeks',
                availability: 'Can start immediately',
                warranty: '24 months guarantee',
                message: 'We offer a complete kitchen renovation service with designer-grade materials, custom cabinetry, and granite countertops.'
            },
            {
                id: 'quote3',
                vendorName: 'Luxury Kitchens UK',
                vendorInitials: 'LK',
                vendorSlug: 'luxury-kitchens',
                ratingText: '5.0 (156 reviews)',
                price: '£11,750',
                timeline: '3-4 weeks',
                availability: 'Can start in 3 weeks',
                warranty: '60 months guarantee',
                message: 'We specialize in high-end luxury kitchen installations with bespoke cabinetry, premium appliances, and complete project management.'
            }
        ]
    },
    'job-2': {
        id: 'job-2',
        title: 'Bathroom Plumbing Repair',
        status: 'Quoted',
        statusClass: 'quoted',
        posted: 'Posted 5 days ago',
        location: 'Manchester, M1',
        quotesCount: 2,
        serviceType: 'Plumbing Repair',
        budget: '£300 - £650',
        propertyType: 'Apartment',
        urgency: 'Urgent (within 7 days)',
        summaryDesc: 'Leaking shower and toilet cistern need repair. Urgent fix required.',
        descriptionHtml: `
            <p>Leaking shower and toilet cistern need repair. Water is dripping continuously and the shower pressure is low.</p>
            <br>
            <p><strong>Requirements:</strong></p>
            <ul style="margin-left: 20px; margin-top: 8px;">
                <li>Fix shower leakage</li>
                <li>Repair toilet cistern mechanism</li>
                <li>Inspect pipework for any additional leaks</li>
            </ul>
        `,
        quotes: [
            {
                id: 'quote1',
                vendorName: 'Quick Fix Plumbing',
                vendorInitials: 'QF',
                vendorSlug: 'quick-fix',
                ratingText: '4.6 (58 reviews)',
                price: '£420',
                timeline: '1-2 days',
                availability: 'Can start tomorrow',
                warranty: '6 months guarantee',
                message: 'We can resolve the leak and cistern issue quickly. Price includes parts and labour.'
            },
            {
                id: 'quote2',
                vendorName: 'Precision Plumbing Co',
                vendorInitials: 'PP',
                vendorSlug: 'precision-plumbing',
                ratingText: '4.7 (102 reviews)',
                price: '£510',
                timeline: '2-3 days',
                availability: 'Can start in 2 days',
                warranty: '12 months guarantee',
                message: 'We will replace worn parts and ensure all pipework is tested and sealed.'
            }
        ]
    },
    'job-3': {
        id: 'job-3',
        title: 'Garden Landscaping',
        status: 'Accepted',
        statusClass: 'accepted',
        posted: 'Posted 1 week ago',
        location: 'Birmingham, B1',
        quotesCount: 1,
        serviceType: 'Landscaping',
        budget: '£2,000 - £4,500',
        propertyType: 'Terraced House',
        urgency: 'Flexible (within 2 months)',
        summaryDesc: 'Redesign back garden with patio area, new lawn, and flower beds.',
        descriptionHtml: `
            <p>Looking for a full garden redesign with a new patio, lawn, and flower beds.</p>
            <br>
            <p><strong>Requirements:</strong></p>
            <ul style="margin-left: 20px; margin-top: 8px;">
                <li>Patio area for seating</li>
                <li>New lawn installation</li>
                <li>Flower beds with low maintenance plants</li>
            </ul>
        `,
        quotes: [
            {
                id: 'quote1',
                vendorName: 'Green Gardens Ltd',
                vendorInitials: 'GG',
                vendorSlug: 'green-gardens',
                ratingText: '4.9 (76 reviews)',
                price: '£3,600',
                timeline: '2-3 weeks',
                availability: 'Can start in 3 weeks',
                warranty: '12 months guarantee',
                message: 'We will design and build a modern, low-maintenance garden with premium materials.'
            }
        ]
    }
};

function isPage(targetFile) {
    return window.location.pathname.endsWith(`/${targetFile}`) || window.location.pathname.endsWith(targetFile);
}

function getJobIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('job_id');
}

function getJobData(jobId) {
    return jobId ? JOB_MOCK_DATA[jobId] || null : null;
}

function buildQuery(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, value);
        }
    });
    const query = search.toString();
    return query ? `?${query}` : '';
}

const SPA_PAGE_MAP = new Map([
    ['dashboard.html', 'index.html']
]);

const SPA_PAGES = new Set([
    'index.html',
    'dashboard.html',
    'my-jobs.html',
    'job-details.html',
    'job-quotes.html',
    'quotes.html',
    'messages.html',
    'notifications.html',
    'profile.html',
    'settings.html',
    'billing.html',
    'billing-addons.html',
    'saved-trades.html',
    'reviews.html',
    'post-job.html'
]);

function getPageFromUrl(url) {
    const path = url.pathname || '';
    const parts = path.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
}

function normalizeSpaPage(page) {
    return SPA_PAGE_MAP.get(page) || page;
}

function buildNavigationUrl(page, params = {}) {
    if (page.includes('?') || page.includes('#')) {
        return page;
    }
    return `${page}${buildQuery(params)}`;
}

function navigateTo(page, params = {}) {
    const url = buildNavigationUrl(page, params);
    if (typeof navigateSpa === 'function' && navigateSpa(url)) {
        return;
    }
    window.location.href = url;
}

let spaNavigationInFlight = false;

function syncHeadAssets(doc) {
    document.querySelectorAll('[data-spa-style]')
        .forEach(node => node.remove());

    const existingLinks = new Set(
        Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.href)
    );

    doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const resolvedHref = new URL(href, window.location.href).href;
        if (existingLinks.has(resolvedHref)) return;
        const clone = link.cloneNode(true);
        clone.setAttribute('data-spa-style', 'true');
        document.head.appendChild(clone);
    });

    doc.querySelectorAll('style').forEach(styleTag => {
        const clone = styleTag.cloneNode(true);
        clone.setAttribute('data-spa-style', 'true');
        document.head.appendChild(clone);
    });
}

function updateActiveNav(targetPage) {
    const currentPage = normalizeSpaPage(targetPage || getPageFromUrl(new URL(window.location.href)));
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (!href) return;
        const page = normalizeSpaPage(getPageFromUrl(new URL(href, window.location.href)));
        item.classList.toggle('active', page === currentPage);
    });
}

function runInlineScripts(doc) {
    const scripts = Array.from(doc.querySelectorAll('script'))
        .filter(script => !script.src || !script.src.includes('script.js'));

    scripts.forEach(script => {
        const injected = document.createElement('script');
        if (script.src) {
            injected.src = script.src;
            injected.async = false;
        } else {
            injected.textContent = script.textContent;
        }
        injected.setAttribute('data-spa-runtime', 'true');
        document.body.appendChild(injected);
        injected.remove();
    });
}

function initializeSmoothScroll(root = document) {
    root.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initializePageHandlers() {
    initializeThemeToggle();
    initMyJobsLinks();
    initJobConversationMenu();
    initMyJobsSearch();
    initJobDetailsPage();
    initJobQuotesPage();
    initCustomerDashboardPage();
}

function navigateSpa(url, options = {}) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return false;

    closeAllModals();

    const targetUrl = new URL(url, window.location.href);
    const targetPage = getPageFromUrl(targetUrl);
    if (!SPA_PAGES.has(targetPage)) return false;

    if (spaNavigationInFlight) return true;
    spaNavigationInFlight = true;

    const resolvedPage = normalizeSpaPage(targetPage);
    const resolvedUrl = new URL(targetUrl.href, window.location.href);
    if (resolvedPage !== targetPage) {
        resolvedUrl.pathname = resolvedUrl.pathname.replace(targetPage, resolvedPage);
    }

    fetch(`${resolvedUrl.pathname}${resolvedUrl.search}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load page');
            return response.text();
        })
        .then(html => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const newMain = doc.querySelector('#mainContent') || doc.querySelector('main.main-content');
            if (!newMain) throw new Error('Missing main content');

            syncHeadAssets(doc);
            if (doc.title) {
                document.title = doc.title;
            }

            mainContent.innerHTML = newMain.innerHTML;
            if (options.pushState !== false) {
                window.history.pushState({}, '', `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`);
            }
            updateActiveNav(resolvedPage);
            initializeSmoothScroll(mainContent);
            initializePageHandlers();
            runInlineScripts(doc);
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        })
        .catch(() => {
            window.location.href = resolvedUrl.toString();
        })
        .finally(() => {
            spaNavigationInFlight = false;
        });

    return true;
}

function initializeSpaNavigation() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    document.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (!link) return;
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target && link.target !== '_self') return;
        if (link.dataset.spa === 'false') return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

        const targetUrl = new URL(href, window.location.href);
        const targetPage = getPageFromUrl(targetUrl);
        if (!SPA_PAGES.has(targetPage)) return;
        if (targetUrl.origin !== window.location.origin) return;

        event.preventDefault();
        navigateSpa(targetUrl.toString());
    });

    window.addEventListener('popstate', () => {
        navigateSpa(window.location.href, { pushState: false });
    });
}

function notifyError(message) {
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    } else {
        alert(message);
    }
}

function getAuthToken() {
    return localStorage.getItem('token');
}

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
    return 'https://api.tradematch.uk';
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

function initializeInvoiceDownloads() {
    const buttons = document.querySelectorAll('.invoice-download');
    if (!buttons.length) return;

    buttons.forEach(button => {
        if (button.dataset.bound === 'true') return;
        button.addEventListener('click', async () => {
            const token = getAuthToken();
            if (!token || isDemoToken(token)) {
                notifyError('Please log in to download invoices.');
                return;
            }

            const payload = {
                invoiceId: button.dataset.invoiceId,
                date: button.dataset.date,
                description: button.dataset.description,
                relatedJob: button.dataset.relatedJob,
                amount: button.dataset.amount,
                status: button.dataset.status || 'Paid'
            };

            if (!payload.invoiceId || !payload.date || !payload.description || !payload.amount) {
                notifyError('Invoice details are missing.');
                return;
            }

            const originalText = button.textContent;
            button.textContent = 'Preparing...';
            button.disabled = true;

            try {
                const data = await apiFetchJson('/api/invoices/pdf', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (data?.downloadUrl) {
                    window.open(data.downloadUrl, '_blank', 'noopener');
                } else {
                    notifyError('Download link not available.');
                }
            } catch (error) {
                notifyError(error.message || 'Failed to generate invoice.');
            } finally {
                button.textContent = originalText;
                button.disabled = false;
            }
        });

        button.dataset.bound = 'true';
    });
}

function updateText(el, value) {
    if (!el) return;
    el.textContent = value;
}

function updateRatingText(ratingEl, text) {
    if (!ratingEl) return;
    const svg = ratingEl.querySelector('svg');
    ratingEl.textContent = text;
    if (svg) {
        ratingEl.prepend(svg);
    }
}

function updateMetaItemText(metaItem, text) {
    if (!metaItem) return;
    const svg = metaItem.querySelector('svg');
    metaItem.textContent = text;
    if (svg) {
        metaItem.prepend(svg);
    }
}

function formatQuotesLabel(count) {
    const label = count === 1 ? 'Quote' : 'Quotes';
    return `${count} ${label} received`;
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

function formatUrgency(value) {
    if (!value) return 'Not specified';
    const map = {
        asap: 'ASAP',
        '1-3months': 'Within 1-3 months',
        '3-6months': 'Within 3-6 months',
        planning: 'Planning stage'
    };
    return map[value] || value.replace(/_/g, ' ');
}

function formatRelativeDate(dateValue) {
    if (!dateValue) return 'Posted recently';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Posted recently';

    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Posted today';
    if (diffDays === 1) return 'Posted 1 day ago';
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `Posted ${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
}

function mapQuoteStatus(status) {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'open') return { label: 'Open', className: 'open' };
    if (normalized === 'accepted') return { label: 'Accepted', className: 'accepted' };
    if (normalized === 'completed') return { label: 'Completed', className: 'completed' };
    if (normalized === 'in_progress') return { label: 'In Progress', className: 'accepted' };
    if (normalized === 'closed' || normalized === 'cancelled') {
        return { label: 'Closed', className: 'completed' };
    }
    return { label: status || 'Open', className: 'open' };
}

function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'TM';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function slugifyVendorName(name = '') {
    return name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function loadCustomerQuotesFromApi() {
    const token = getAuthToken();
    if (!token || isDemoToken(token)) return null;
    try {
        const data = await apiFetchJson('/api/customer/quotes?limit=20');
        return data?.quotes || [];
    } catch (error) {
        try {
            const userData = await apiFetchJson('/api/auth/me');
            const userId = userData?.user?.id || userData?.userId || userData?.id;
            if (!userId) throw new Error('Missing user id');
            const data = await apiFetchJson(`/api/quotes/customer/${encodeURIComponent(userId)}`);
            return data?.quotes || [];
        } catch (fallbackError) {
            console.warn('Quotes API fallback failed:', fallbackError);
            return null;
        }
    }
}

async function loadCustomerQuoteDetailsFromApi(quoteId) {
    const token = getAuthToken();
    if (!token || isDemoToken(token)) return null;
    try {
        const data = await apiFetchJson(`/api/customer/quotes/${encodeURIComponent(quoteId)}`);
        if (!data?.quote) return null;
        return data;
    } catch (error) {
        try {
            const quoteData = await apiFetchJson(`/api/quotes/${encodeURIComponent(quoteId)}`);
            let bids = [];
            try {
                const bidsData = await apiFetchJson(`/api/bids/quote/${encodeURIComponent(quoteId)}`);
                bids = bidsData?.bids || bidsData?.data?.bids || [];
            } catch (bidsError) {
                bids = [];
            }

            if (!quoteData?.quote) return null;
            return {
                quote: quoteData.quote,
                bids
            };
        } catch (fallbackError) {
            console.warn('Quote details API fallback failed:', fallbackError);
            return null;
        }
    }
}

async function acceptBidApi(bidId, quoteId) {
    try {
        await apiFetchJson('/api/customer/accept-bid', {
            method: 'POST',
            body: JSON.stringify({ bidId, quoteId })
        });
        return true;
    } catch (error) {
        try {
            await apiFetchJson(`/api/bids/${encodeURIComponent(bidId)}/accept`, {
                method: 'PATCH'
            });
            return true;
        } catch (fallbackError) {
            console.warn('Accept bid fallback failed:', fallbackError);
            return false;
        }
    }
}

function initMyJobsLinks() {
    if (!isPage('my-jobs.html')) return;

    document.querySelectorAll('.job-list-card').forEach(card => {
        const detailsBtn = card.querySelector('[data-action="view-details"]');
        const quotesBtn = card.querySelector('[data-action="view-quotes"]');
        const messageBtn = card.querySelector('[data-action="message-vendor"]');

        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => {
                const jobId = card.dataset.jobId;
                if (!jobId) {
                    notifyError('Missing job reference.');
                    return;
                }
                navigateTo('job-details.html', { job_id: jobId });
            });
        }

        if (quotesBtn) {
            quotesBtn.addEventListener('click', () => {
                const jobId = card.dataset.jobId;
                if (!jobId) {
                    notifyError('Missing job reference.');
                    return;
                }
                navigateTo('job-quotes.html', { job_id: jobId });
            });
        }

        if (messageBtn) {
            messageBtn.addEventListener('click', () => {
                const vendorSlug = card.dataset.vendorSlug
                    || slugifyVendorName(card.dataset.vendorName || '');
                if (!vendorSlug) {
                    notifyError('Vendor messaging is not available yet.');
                    return;
                }
                navigateTo('messages.html', { vendor: vendorSlug });
            });
        }
    });

    (async () => {
        try {
            const quotes = await loadCustomerQuotesFromApi();
            if (!quotes) return;

            const cards = Array.from(document.querySelectorAll('.job-list-card'));
            cards.forEach((card, index) => {
                const quote = quotes[index];
                if (!quote) {
                    card.style.display = 'none';
                    return;
                }

                card.style.display = 'block';
                card.dataset.jobId = quote.id;

                const statusBadge = card.querySelector('.job-status-badge');
                const statusMeta = mapQuoteStatus(quote.status);
                if (statusBadge) {
                    statusBadge.textContent = statusMeta.label;
                    statusBadge.classList.remove('open', 'quoted', 'accepted', 'completed');
                    statusBadge.classList.add(statusMeta.className);
                }

                const vendorSlug = quote.vendor_slug
                    || quote.vendorSlug
                    || quote.vendor_id
                    || quote.vendorId
                    || slugifyVendorName(
                        quote.vendor_name
                        || quote.company_name
                        || quote.accepted_vendor_name
                        || quote.vendor
                        || ''
                    );

                if (vendorSlug) {
                    card.dataset.vendorSlug = vendorSlug;
                }

                updateText(card.querySelector('.job-list-title'), quote.title);
                updateText(card.querySelector('.job-list-description'), quote.description);

                const metaItems = card.querySelectorAll('.job-meta-item');
                if (metaItems[0]) {
                    updateMetaItemText(metaItems[0], formatRelativeDate(quote.created_at));
                }
                if (metaItems[1]) {
                    updateMetaItemText(metaItems[1], quote.postcode || quote.location || 'Location not set');
                }
                if (metaItems[2]) {
                    updateMetaItemText(metaItems[2], formatQuotesLabel(Number(quote.bid_count) || 0));
                }

                const quotesButton = card.querySelector('[data-action="view-quotes"]');
                if (quotesButton) {
                    quotesButton.textContent = `View Quotes (${Number(quote.bid_count) || 0})`;
                }

                const messageBtn = card.querySelector('[data-action="message-vendor"]');
                if (messageBtn) {
                    if (statusMeta.className !== 'accepted') {
                        messageBtn.style.display = 'none';
                    } else {
                        messageBtn.style.display = '';
                        messageBtn.disabled = !vendorSlug;
                        messageBtn.classList.toggle('disabled', !vendorSlug);
                    }
                }
            });
        } catch (error) {
            console.warn('Failed to load customer quotes from API:', error);
        }
    })();
}

function initJobDetailsPage() {
    if (!isPage('job-details.html')) return;

    const jobId = getJobIdFromUrl();
    const job = getJobData(jobId);
    const viewQuotesBtn = document.querySelector('[data-action="view-quotes"]');

    if (!job) {
        (async () => {
            try {
                if (!jobId) throw new Error('Missing job reference');
                const apiData = await loadCustomerQuoteDetailsFromApi(jobId);
                if (!apiData) throw new Error('No job data found');

                const { quote, bids } = apiData;
                const bidCount = Array.isArray(bids) ? bids.length : Number(quote.bid_count) || 0;
                const statusMeta = mapQuoteStatus(quote.status);

                updateText(document.querySelector('[data-job-field="title"]'), quote.title);
                updateText(document.querySelector('[data-job-field="posted"]'), formatRelativeDate(quote.created_at));
                updateText(document.querySelector('[data-job-field="location"]'), quote.postcode || 'Location not set');
                updateText(document.querySelector('[data-job-field="quotes"]'), formatQuotesLabel(bidCount));
                updateText(document.querySelector('[data-job-field="serviceType"]'), quote.service_type || 'Service');
                updateText(document.querySelector('[data-job-field="budget"]'), formatBudgetRange(quote.budget_min, quote.budget_max));
                updateText(document.querySelector('[data-job-field="propertyType"]'), quote.additional_details?.propertyType || 'Not specified');
                updateText(document.querySelector('[data-job-field="urgency"]'), formatUrgency(quote.urgency));

                const statusBadge = document.querySelector('[data-job-field="status"]');
                if (statusBadge) {
                    statusBadge.textContent = statusMeta.label;
                    statusBadge.classList.remove('open', 'quoted', 'accepted', 'completed');
                    statusBadge.classList.add(statusMeta.className);
                }

                const descriptionEl = document.querySelector('[data-job-field="description"]');
                if (descriptionEl) {
                    descriptionEl.textContent = quote.description || 'No description provided.';
                }

                if (viewQuotesBtn) {
                    const viewQuotesLabel = viewQuotesBtn.querySelector('[data-job-field="viewQuotesLabel"]');
                    const labelText = `View Quotes (${bidCount})`;
                    if (viewQuotesLabel) {
                        viewQuotesLabel.textContent = labelText;
                    } else {
                        viewQuotesBtn.textContent = labelText;
                    }
                    viewQuotesBtn.addEventListener('click', () => {
                        navigateTo('job-quotes.html', { job_id: quote.id });
                    });
                }
            } catch (error) {
                if (viewQuotesBtn) {
                    viewQuotesBtn.setAttribute('disabled', 'disabled');
                    viewQuotesBtn.style.opacity = '0.6';
                }
                notifyError('Invalid or missing job reference.');
            }
        })();
        return;
    }

    updateText(document.querySelector('[data-job-field="title"]'), job.title);
    updateText(document.querySelector('[data-job-field="posted"]'), job.posted);
    updateText(document.querySelector('[data-job-field="location"]'), job.location);
    updateText(document.querySelector('[data-job-field="quotes"]'), formatQuotesLabel(job.quotesCount));
    updateText(document.querySelector('[data-job-field="serviceType"]'), job.serviceType);
    updateText(document.querySelector('[data-job-field="budget"]'), job.budget);
    updateText(document.querySelector('[data-job-field="propertyType"]'), job.propertyType);
    updateText(document.querySelector('[data-job-field="urgency"]'), job.urgency);

    const statusBadge = document.querySelector('[data-job-field="status"]');
    if (statusBadge) {
        statusBadge.textContent = job.status;
        statusBadge.classList.remove('open', 'quoted', 'accepted', 'completed');
        if (job.statusClass) {
            statusBadge.classList.add(job.statusClass);
        }
    }

    const descriptionEl = document.querySelector('[data-job-field="description"]');
    if (descriptionEl && job.descriptionHtml) {
        descriptionEl.innerHTML = job.descriptionHtml;
    }

    if (viewQuotesBtn) {
        const viewQuotesLabel = viewQuotesBtn.querySelector('[data-job-field="viewQuotesLabel"]');
        const labelText = `View Quotes (${job.quotesCount})`;
        if (viewQuotesLabel) {
            viewQuotesLabel.textContent = labelText;
        } else {
            viewQuotesBtn.textContent = labelText;
        }
        viewQuotesBtn.addEventListener('click', () => {
            navigateTo('job-quotes.html', { job_id: job.id });
        });
    }
}

function initJobQuotesPage() {
    if (!isPage('job-quotes.html')) return;

    const jobId = getJobIdFromUrl();
    const job = getJobData(jobId);

    if (!job) {
        (async () => {
            try {
                if (!jobId) throw new Error('Missing job reference');
                const apiData = await loadCustomerQuoteDetailsFromApi(jobId);
                if (!apiData) throw new Error('No quote data found');

                const { quote, bids } = apiData;
                updateText(document.querySelector('[data-job-field="title"]'), quote.title);
                updateText(document.querySelector('[data-job-field="summaryTitle"]'), quote.title);
                updateText(document.querySelector('[data-job-field="summaryDesc"]'), quote.description);

                const quoteCards = Array.from(document.querySelectorAll('.quote-card'));
                quoteCards.forEach((card, index) => {
                    const bid = bids?.[index];
                    if (!bid) {
                        card.style.display = 'none';
                        return;
                    }

                    card.style.display = 'block';
                    card.dataset.quoteId = bid.id;
                    card.dataset.vendorSlug = bid.company_name
                        ? bid.company_name.toLowerCase().replace(/\s+/g, '-')
                        : (bid.vendor_id || bid.id);

                    updateText(card.querySelector('.vendor-avatar'), getInitials(bid.company_name));
                    updateText(card.querySelector('.vendor-details h3'), bid.company_name || 'Vendor');

                    const ratingValue = bid.rating ? `${Number(bid.rating).toFixed(1)}` : null;
                    const reviews = bid.reviews_count ? `${bid.reviews_count} reviews` : null;
                    const ratingText = ratingValue ? `${ratingValue}${reviews ? ` (${reviews})` : ''}` : 'No rating yet';
                    updateRatingText(card.querySelector('.vendor-rating'), ratingText);

                    updateText(card.querySelector('.price-value'), formatCurrency(bid.amount));

                    const detailRows = card.querySelectorAll('.quote-detail-row');
                    if (detailRows[0]) updateText(detailRows[0].querySelector('.quote-detail-value'), bid.timeline || 'Timeline to be confirmed');
                    if (detailRows[1]) updateText(detailRows[1].querySelector('.quote-detail-value'), bid.availability || 'Availability to be confirmed');
                    if (detailRows[2]) updateText(detailRows[2].querySelector('.quote-detail-value'), bid.warranty || 'Warranty not specified');

                    updateText(card.querySelector('.quote-message-text'), bid.message || 'No message provided.');

                    const actionButtons = card.querySelectorAll('.quote-actions .btn');
                    if (actionButtons[0]) {
                        actionButtons[0].setAttribute('onclick', `acceptQuote('${bid.id}')`);
                    }
                    if (actionButtons[1]) {
                        actionButtons[1].onclick = () => navigateTo('messages.html', { vendor: card.dataset.vendorSlug });
                    }
                });
            } catch (error) {
                notifyError('Invalid or missing job reference.');
            }
        })();
        return;
    }

    updateText(document.querySelector('[data-job-field="title"]'), job.title);
    updateText(document.querySelector('[data-job-field="summaryTitle"]'), job.title);
    updateText(document.querySelector('[data-job-field="summaryDesc"]'), job.summaryDesc);

    const quoteCards = Array.from(document.querySelectorAll('.quote-card'));
    quoteCards.forEach((card, index) => {
        const quote = job.quotes[index];
        if (!quote) {
            card.style.display = 'none';
            return;
        }

        card.style.display = 'block';
        card.dataset.quoteId = quote.id;

        updateText(card.querySelector('.vendor-avatar'), quote.vendorInitials);
        updateText(card.querySelector('.vendor-details h3'), quote.vendorName);
        updateRatingText(card.querySelector('.vendor-rating'), quote.ratingText);
        updateText(card.querySelector('.price-value'), quote.price);

        const detailRows = card.querySelectorAll('.quote-detail-row');
        if (detailRows[0]) updateText(detailRows[0].querySelector('.quote-detail-value'), quote.timeline);
        if (detailRows[1]) updateText(detailRows[1].querySelector('.quote-detail-value'), quote.availability);
        if (detailRows[2]) updateText(detailRows[2].querySelector('.quote-detail-value'), quote.warranty);

        updateText(card.querySelector('.quote-message-text'), quote.message);

        const actionButtons = card.querySelectorAll('.quote-actions .btn');
        if (actionButtons[1]) {
            actionButtons[1].onclick = () => navigateTo('messages.html', { vendor: quote.vendorSlug });
        }
    });
}

function initMyJobsSearch() {
    if (!isPage('my-jobs.html')) return;

    const searchInput = document.querySelector('.search-input');
    const jobCards = Array.from(document.querySelectorAll('.job-list-card'));
    const filterTabs = Array.from(document.querySelectorAll('.filter-tab'));
    const jobsList = document.querySelector('.jobs-list');

    if (!searchInput || !jobCards.length || !jobsList) return;
    if (searchInput.dataset.myJobsSearchBound === 'true') return;

    let emptyState = document.getElementById('myJobsSearchEmptyState');
    if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.id = 'myJobsSearchEmptyState';
        emptyState.textContent = 'No jobs match your search.';
        emptyState.style.display = 'none';
        emptyState.style.marginTop = '16px';
        emptyState.style.padding = '16px';
        emptyState.style.border = '1px solid var(--border)';
        emptyState.style.borderRadius = '12px';
        emptyState.style.background = 'var(--bg-card)';
        emptyState.style.color = 'var(--text-secondary)';
        emptyState.style.fontSize = '14px';
        jobsList.parentNode?.insertBefore(emptyState, jobsList.nextSibling);
    }

    const normalizedCache = new Map();

    function normalizeText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[£,$]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function buildSearchText(card) {
        if (normalizedCache.has(card)) return normalizedCache.get(card);

        const title = card.querySelector('.job-list-title')?.textContent || '';
        const description = card.querySelector('.job-list-description')?.textContent || '';
        const status = card.dataset.status || card.querySelector('.job-status-badge')?.textContent || '';
        const meta = Array.from(card.querySelectorAll('.job-meta-item'))
            .map(item => item.textContent || '')
            .join(' ');
        const vendor = card.dataset.vendorName || '';

        const hasQuotes = card.dataset.hasQuotes === 'true';
        const quotesMeta = hasQuotes ? meta : `${meta} no quotes`;

        const combined = [title, description, status, card.dataset.postcode, card.dataset.trade, vendor, quotesMeta]
            .filter(Boolean)
            .join(' ');

        const normalized = normalizeText(combined);
        normalizedCache.set(card, normalized);
        return normalized;
    }

    function getActiveFilter() {
        const activeTab = document.querySelector('.filter-tab.active');
        return activeTab?.dataset?.filter || 'all';
    }

    function applySearch() {
        const query = normalizeText(searchInput.value);
        const keywords = query ? query.split(' ').filter(Boolean) : [];
        const activeFilter = getActiveFilter();

        let visibleCount = 0;

        jobCards.forEach(card => {
            const matchesTab = activeFilter === 'all' || card.dataset.status === activeFilter;
            const text = buildSearchText(card);
            const matchesQuery = !keywords.length || keywords.every(term => text.includes(term));
            const shouldShow = matchesTab && matchesQuery;
            card.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount += 1;
        });

        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    let searchTimer = null;
    searchInput.addEventListener('input', () => {
        if (searchTimer) window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(applySearch, 300);
    });

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            window.setTimeout(applySearch, 0);
        });
    });

    searchInput.dataset.myJobsSearchBound = 'true';
    applySearch();
}

const JOB_MENU_MUTED_KEY = 'tm_job_menu_muted_conversations';
const JOB_MENU_ARCHIVED_KEY = 'tm_job_menu_archived_conversations';
const JOB_MENU_REVIEWED_KEY = 'tm_job_menu_reviewed_jobs';

let activeJobMenuCard = null;
let mutedJobConversationIds = new Set();
let archivedJobConversationIds = new Set();
let reviewedJobIds = new Set();

function loadIdSet(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const list = JSON.parse(raw);
        return new Set(Array.isArray(list) ? list : []);
    } catch (error) {
        console.warn('Failed to load job menu state:', error);
        return new Set();
    }
}

function saveIdSet(key, set) {
    try {
        localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch (error) {
        console.warn('Failed to save job menu state:', error);
    }
}

function getJobMenuStatus(card) {
    const status = String(card?.dataset?.status || '').toLowerCase();
    const isCompleted = status === 'completed';
    const isAccepted = status === 'accepted' || isCompleted;
    return { status, isAccepted, isCompleted };
}

function closeAllJobMenus() {
    document.querySelectorAll('.job-menu.open').forEach(menu => {
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.job-menu-toggle[aria-expanded="true"]').forEach(toggle => {
        toggle.setAttribute('aria-expanded', 'false');
    });
}

function updateJobMenuState(card, menu) {
    if (!card || !menu) return;
    const jobId = card.dataset.jobId;
    const statusMeta = getJobMenuStatus(card);
    const muteBtn = menu.querySelector('[data-action="mute"]');
    const quoteBtn = menu.querySelector('[data-action="view-quote"]');
    const uploadBtn = menu.querySelector('[data-action="upload-files"]');
    const reviewBtn = menu.querySelector('[data-action="review"]');
    const archiveBtn = menu.querySelector('[data-action="archive"]');

    if (muteBtn) {
        const muted = mutedJobConversationIds.has(jobId);
        muteBtn.textContent = muted ? 'Unmute Notifications' : 'Mute Notifications';
    }

    if (quoteBtn) {
        quoteBtn.style.display = statusMeta.isAccepted ? 'block' : 'none';
    }

    if (uploadBtn) {
        uploadBtn.style.display = statusMeta.isAccepted ? 'block' : 'none';
    }

    if (reviewBtn) {
        const reviewed = reviewedJobIds.has(jobId) || card.dataset.reviewSubmitted === 'true';
        reviewBtn.style.display = statusMeta.isCompleted && !reviewed ? 'block' : 'none';
    }

    if (archiveBtn) {
        const archived = archivedJobConversationIds.has(jobId);
        archiveBtn.textContent = archived ? 'Restore Conversation' : 'Archive Conversation';
    }
}

function renderAcceptedQuoteModal(card) {
    const jobId = card?.dataset?.jobId;
    const job = getJobData(jobId);
    const quote = job?.quotes?.[0] || null;

    updateText(document.getElementById('jobAcceptedQuoteJob'), job?.title || card?.querySelector('.job-list-title')?.textContent || 'Job');
    updateText(document.getElementById('jobAcceptedQuoteVendor'), quote?.vendorName || card?.dataset?.vendorName || 'Tradesperson');
    const parsedPrice = parseCurrencyToNumber(quote?.price ?? quote?.amount ?? null);
    if (Number.isFinite(parsedPrice)) {
        updateText(document.getElementById('jobAcceptedQuotePrice'), formatCurrency(parsedPrice));
    } else {
        updateText(document.getElementById('jobAcceptedQuotePrice'), 'Not specified');
    }
    updateText(document.getElementById('jobAcceptedQuoteTimeline'), quote?.timeline || 'Not specified');
    updateText(document.getElementById('jobAcceptedQuoteScope'), quote?.message || 'Scope details are available in the quote summary.');
}

function initJobConversationMenu() {
    if (!isPage('my-jobs.html')) return;

    mutedJobConversationIds = loadIdSet(JOB_MENU_MUTED_KEY);
    archivedJobConversationIds = loadIdSet(JOB_MENU_ARCHIVED_KEY);
    reviewedJobIds = loadIdSet(JOB_MENU_REVIEWED_KEY);

    const jobCards = document.querySelectorAll('.job-list-card');
    jobCards.forEach(card => {
        const toggle = card.querySelector('.job-menu-toggle');
        const menu = card.querySelector('.job-menu');
        if (!toggle || !menu) return;

        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = menu.classList.contains('open');
            closeAllJobMenus();
            activeJobMenuCard = card;
            updateJobMenuState(card, menu);
            if (!isOpen) {
                menu.classList.add('open');
                menu.setAttribute('aria-hidden', 'false');
                toggle.setAttribute('aria-expanded', 'true');
            }
        });

        menu.addEventListener('click', (event) => {
            const actionBtn = event.target.closest('button[data-action]');
            if (!actionBtn) return;
            event.stopPropagation();
            const action = actionBtn.dataset.action;
            const jobId = card.dataset.jobId;
            const statusMeta = getJobMenuStatus(card);

            if (action === 'view-job') {
                navigateTo('job-details.html', { job_id: jobId });
            }

            if (action === 'view-quote' && statusMeta.isAccepted) {
                renderAcceptedQuoteModal(card);
                openModal('jobAcceptedQuoteModal');
            }

            if (action === 'upload-files' && statusMeta.isAccepted) {
                const uploadInput = document.getElementById('jobUploadInput');
                const uploadList = document.getElementById('jobUploadList');
                if (uploadInput) uploadInput.value = '';
                if (uploadList) uploadList.textContent = 'No files selected.';
                openModal('jobUploadModal');
            }

            if (action === 'mute') {
                if (mutedJobConversationIds.has(jobId)) {
                    mutedJobConversationIds.delete(jobId);
                } else {
                    mutedJobConversationIds.add(jobId);
                }
                saveIdSet(JOB_MENU_MUTED_KEY, mutedJobConversationIds);
                updateJobMenuState(card, menu);
                showToast('Notification preference updated.', 'success');
            }

            if (action === 'report') {
                openModal('jobReportModal');
            }

            if (action === 'archive') {
                const archived = archivedJobConversationIds.has(jobId);
                updateText(document.getElementById('jobArchiveTitle'), archived ? 'Restore Conversation' : 'Archive Conversation');
                updateText(document.getElementById('jobArchiveMessage'), archived
                    ? 'Restoring will return this conversation to your inbox.'
                    : 'Archiving hides this conversation from your inbox. You can restore it later.');
                openModal('jobArchiveModal');
            }

            if (action === 'review' && statusMeta.isCompleted) {
                openModal('jobReviewModal');
            }

            closeAllJobMenus();
        });

        updateJobMenuState(card, menu);
    });

    if (!window.__jobMenuOutsideClickBound) {
        window.__jobMenuOutsideClickBound = true;
        document.addEventListener('click', (event) => {
            if (event.target.closest('.job-menu') || event.target.closest('.job-menu-toggle')) return;
            closeAllJobMenus();
        });
    }

    document.querySelectorAll('[data-close-modal]').forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.closeModal;
            closeModal(target);
        });
    });

    const uploadInput = document.getElementById('jobUploadInput');
    const uploadList = document.getElementById('jobUploadList');
    const uploadConfirm = document.getElementById('jobUploadConfirm');

    if (uploadInput && uploadList) {
        uploadInput.addEventListener('change', () => {
            const files = Array.from(uploadInput.files || []);
            if (!files.length) {
                uploadList.textContent = 'No files selected.';
                return;
            }
            uploadList.innerHTML = files.map(file => `<div>${file.name}</div>`).join('');
        });
    }

    if (uploadConfirm) {
        uploadConfirm.addEventListener('click', () => {
            closeModal('jobUploadModal');
            showToast('Files shared with the conversation.', 'success');
        });
    }

    const reportSubmit = document.getElementById('jobReportSubmit');
    if (reportSubmit) {
        reportSubmit.addEventListener('click', () => {
            closeModal('jobReportModal');
            showToast('Report submitted. Our team will review it shortly.', 'success');
        });
    }

    const archiveConfirm = document.getElementById('jobArchiveConfirm');
    if (archiveConfirm) {
        archiveConfirm.addEventListener('click', () => {
            const jobId = activeJobMenuCard?.dataset?.jobId;
            if (!jobId) return;
            if (archivedJobConversationIds.has(jobId)) {
                archivedJobConversationIds.delete(jobId);
            } else {
                archivedJobConversationIds.add(jobId);
            }
            saveIdSet(JOB_MENU_ARCHIVED_KEY, archivedJobConversationIds);
            closeModal('jobArchiveModal');
            const menu = activeJobMenuCard?.querySelector('.job-menu');
            if (menu) updateJobMenuState(activeJobMenuCard, menu);
            showToast('Conversation updated.', 'success');
        });
    }

    const reviewGo = document.getElementById('jobReviewGo');
    if (reviewGo) {
        reviewGo.addEventListener('click', () => {
            const jobId = activeJobMenuCard?.dataset?.jobId;
            if (jobId) {
                reviewedJobIds.add(jobId);
                saveIdSet(JOB_MENU_REVIEWED_KEY, reviewedJobIds);
                navigateTo('reviews.html', { job_id: jobId });
            } else {
                navigateTo('reviews.html');
            }
            closeModal('jobReviewModal');
        });
    }
}

function initCustomerDashboardPage() {
    if (!(isPage('index.html') || isPage('dashboard.html'))) return;

    const token = getAuthToken();
    const jobCards = Array.from(document.querySelectorAll('[data-job-card]'));
    jobCards.forEach(card => {
        const jobId = card.dataset.jobId;
        const detailsBtn = card.querySelector('[data-action="view-details"]');
        const quotesBtn = card.querySelector('[data-action="view-quotes"]');
        const messageBtn = card.querySelector('[data-action="message-vendor"]');

        if (detailsBtn) {
            detailsBtn.onclick = () => {
                if (!jobId) return;
                navigateTo('job-details.html', { job_id: jobId });
            };
        }

        if (quotesBtn) {
            quotesBtn.onclick = () => {
                if (!jobId) return;
                navigateTo('job-quotes.html', { job_id: jobId });
            };
        }

        if (messageBtn) {
            messageBtn.onclick = () => {
                if (!jobId) return;
                navigateTo('messages.html', { job_id: jobId });
            };
        }
    });

    if (!token || isDemoToken(token)) return;

    (async () => {
        try {
            const data = await apiFetchJson('/api/customer/dashboard');
            const payload = data?.data || {};
            const stats = payload.stats || {};
            const quotes = payload.quotes || [];
            const activity = payload.recentActivity || [];

            const activeJobs = Number(stats.open_quotes) || 0;
            const completedJobs = Number(stats.completed_jobs) || 0;
            const pendingReviews = Number(stats.pending_reviews) || 0;
            const newQuotes = quotes.reduce((acc, quote) => acc + (Number(quote.bid_count) || 0), 0);

            updateText(document.querySelector('[data-stat="activeJobs"]'), activeJobs);
            updateText(document.querySelector('[data-stat="newQuotes"]'), newQuotes);
            updateText(document.querySelector('[data-stat="completedJobs"]'), completedJobs);
            updateText(document.querySelector('[data-stat="pendingReviews"]'), pendingReviews);

            updateText(
                document.querySelector('[data-action-summary="compareQuotes"]'),
                `Review and compare ${newQuotes} new quote${newQuotes === 1 ? '' : 's'}`
            );
            updateText(
                document.querySelector('[data-action-summary="pendingReviews"]'),
                `${pendingReviews} completed job${pendingReviews === 1 ? '' : 's'} awaiting review`
            );

            const jobCards = Array.from(document.querySelectorAll('[data-job-card]'));
            jobCards.forEach((card, index) => {
                const quote = quotes[index];
                if (!quote) {
                    card.style.display = 'none';
                    return;
                }

                card.style.display = 'block';
                card.dataset.jobId = quote.id;

                const statusMeta = mapQuoteStatus(quote.status);
                const statusBadge = card.querySelector('[data-job-field="status"]');
                if (statusBadge) {
                    statusBadge.textContent = statusMeta.label;
                    statusBadge.classList.remove('open', 'quoted', 'accepted', 'completed');
                    statusBadge.classList.add(statusMeta.className);
                }

                updateText(card.querySelector('[data-job-field="posted"]'), formatRelativeDate(quote.created_at));
                updateText(card.querySelector('[data-job-field="title"]'), quote.title);
                updateText(card.querySelector('[data-job-field="description"]'), quote.description);

                const locationEl = card.querySelector('[data-job-field="location"]');
                if (locationEl) {
                    updateMetaItemText(locationEl, quote.postcode || 'Location not set');
                }

                const quotesEl = card.querySelector('[data-job-field="quotes"]');
                if (quotesEl) {
                    updateMetaItemText(quotesEl, `${Number(quote.bid_count) || 0} Quotes`);
                }

                const vendorEl = card.querySelector('[data-job-field="vendor"]');
                if (vendorEl) {
                    const vendorLabel = quote.status === 'accepted' ? 'Vendor assigned' : 'Vendor pending';
                    updateMetaItemText(vendorEl, vendorLabel);
                }

                const detailsBtn = card.querySelector('[data-action="view-details"]');
                if (detailsBtn) {
                    detailsBtn.onclick = () => navigateTo('job-details.html', { job_id: quote.id });
                }

                const quotesBtn = card.querySelector('[data-action="view-quotes"]');
                if (quotesBtn) {
                    quotesBtn.onclick = () => navigateTo('job-quotes.html', { job_id: quote.id });
                }

                const messageBtn = card.querySelector('[data-action="message-vendor"]');
                if (messageBtn) {
                    messageBtn.onclick = () => navigateTo('messages.html', { job_id: quote.id });
                }
            });

            const fallbackActivityButtons = Array.from(document.querySelectorAll('[data-activity-field="action"]'));
            fallbackActivityButtons.forEach(button => {
                if (!button || button.dataset.spaBound === 'true') return;
                const label = (button.textContent || '').toLowerCase();
                if (label.includes('review')) {
                    button.dataset.spaBound = 'true';
                    button.addEventListener('click', () => navigateTo('reviews.html'));
                    return;
                }
                if (label.includes('quote')) {
                    button.dataset.spaBound = 'true';
                    button.addEventListener('click', () => navigateTo('quotes.html'));
                    return;
                }
                if (label.includes('reply')) {
                    button.dataset.spaBound = 'true';
                    button.addEventListener('click', () => navigateTo('messages.html'));
                }
            });

            const activityItems = Array.from(document.querySelectorAll('[data-activity-item]'));
            activityItems.forEach((item, index) => {
                const row = activity[index];
                if (!row) {
                    item.style.display = 'none';
                    return;
                }

                item.style.display = 'flex';
                const titleEl = item.querySelector('[data-activity-field="title"]');
                const descEl = item.querySelector('[data-activity-field="description"]');
                const timeEl = item.querySelector('[data-activity-field="time"]');
                const actionEl = item.querySelector('[data-activity-field="action"]');

                if (row.type === 'bid') {
                    updateText(titleEl, `New quote received for ${row.quote_title}`);
                    updateText(descEl, `${row.vendor_name || 'A vendor'} submitted a quote`);
                    if (actionEl) {
                        actionEl.textContent = 'View Quotes';
                        actionEl.onclick = () => navigateTo('job-quotes.html', { job_id: row.quote_id });
                    }
                } else if (row.type === 'message') {
                    updateText(titleEl, `Message from ${row.vendor_name || 'Vendor'}`);
                    updateText(descEl, row.quote_title
                        ? `Vendor sent you a message about the ${row.quote_title} job`
                        : 'Vendor sent you a new message');
                    if (actionEl) {
                        actionEl.textContent = 'Reply';
                        const vendorSlug = row.vendor_slug
                            || row.vendorSlug
                            || row.vendor_id
                            || row.vendorId
                            || slugifyVendorName(row.vendor_name || row.company_name || '');
                        actionEl.onclick = () => navigateTo('messages.html', vendorSlug ? { vendor: vendorSlug } : {});
                    }
                } else if (row.type === 'review' || row.type === 'completed' || row.type === 'completion') {
                    updateText(titleEl, `Job completed - ${row.quote_title || 'Completed job'}`);
                    updateText(descEl, row.vendor_name
                        ? `Please leave a review for ${row.vendor_name}`
                        : 'Please leave a review for your completed job');
                    if (actionEl) {
                        actionEl.textContent = 'Leave Review';
                        actionEl.onclick = () => navigateTo('reviews.html', { job_id: row.quote_id });
                    }
                } else {
                    updateText(titleEl, `Job posted: ${row.quote_title}`);
                    updateText(descEl, 'Your job request is now live.');
                    if (actionEl) {
                        actionEl.textContent = 'View Details';
                        actionEl.onclick = () => navigateTo('job-details.html', { job_id: row.quote_id });
                    }
                }

                if (timeEl) {
                    updateText(timeEl, formatRelativeDate(row.created_at));
                }
            });
        } catch (error) {
            console.warn('Failed to load customer dashboard data:', error);
        }
    })();
}

const QUOTE_REVIEW_STORAGE_KEY = 'tm_quote_review_payload';

function parseCurrencyToNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value) return null;
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function buildQuoteReviewPayloadFromCard(quoteId, jobId, job, selectedQuote) {
    const vendorName = job?.quotes?.find(quote => quote.id === quoteId)?.vendorName
        || selectedQuote.querySelector('.vendor-details h3')?.textContent
        || 'Tradesperson';
    const vendorInitials = job?.quotes?.find(quote => quote.id === quoteId)?.vendorInitials
        || selectedQuote.querySelector('.vendor-avatar')?.textContent?.trim()
        || getInitials(vendorName);
    const vendorSlug = job?.quotes?.find(quote => quote.id === quoteId)?.vendorSlug
        || selectedQuote.dataset.vendorSlug
        || quoteId;
    const priceValue = job?.quotes?.find(quote => quote.id === quoteId)?.price
        || selectedQuote.querySelector('.price-value')?.textContent;
    const timelineValue = job?.quotes?.find(quote => quote.id === quoteId)?.timeline
        || selectedQuote.querySelector('.quote-detail-row .quote-detail-value')?.textContent;

    return {
        bidId: quoteId,
        quoteId: jobId,
        jobId,
        jobTitle: job?.title || document.querySelector('[data-job-field="title"]')?.textContent || 'Job',
        jobLocation: job?.location || null,
        jobPosted: job?.posted || null,
        vendorName,
        vendorInitials,
        vendorSlug,
        price: parseCurrencyToNumber(priceValue),
        timeline: timelineValue || null,
        vendorRating: job?.quotes?.find(quote => quote.id === quoteId)?.ratingText || null
    };
}

function goToQuoteReview(payload) {
    if (!payload) return;
    localStorage.setItem(QUOTE_REVIEW_STORAGE_KEY, JSON.stringify(payload));
    navigateTo('billing-addons.html', { job_id: payload.jobId, quote_id: payload.bidId });
}

function acceptQuote(quoteId) {
    if (!confirm('Are you sure you want to accept this quote? This will lock the job to this vendor and unlock messaging. Other quotes will be declined.')) {
        return;
    }

    const jobId = getJobIdFromUrl();
    const selectedQuote = document.querySelector(`[data-quote-id="${quoteId}"]`);

    if (!selectedQuote) {
        notifyError('Unable to locate the selected quote.');
        return;
    }

    const job = getJobData(jobId);
    const payload = buildQuoteReviewPayloadFromCard(quoteId, jobId, job, selectedQuote);
    goToQuoteReview(payload);
}

function finalizeAcceptedQuote(allQuotes, selectedQuote, quoteId) {
    const jobId = getJobIdFromUrl();
    const job = getJobData(jobId);
    const selectedQuoteData = job?.quotes?.find(quote => quote.id === quoteId);

    allQuotes.forEach(card => card.classList.remove('accepted'));
    selectedQuote.classList.add('accepted');

    const actionsDiv = selectedQuote.querySelector('.quote-actions');
    if (!actionsDiv) return;
    actionsDiv.innerHTML = '';

    const badge = document.createElement('div');
    badge.className = 'accepted-badge';
    badge.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Quote Accepted
    `;

    const messageBtn = document.createElement('button');
    messageBtn.className = 'btn btn-primary';
    messageBtn.textContent = 'Message Vendor';
    messageBtn.addEventListener('click', () => {
        const vendorSlug = selectedQuoteData?.vendorSlug || selectedQuote.dataset.vendorSlug || quoteId;
        navigateTo('messages.html', { vendor: vendorSlug });
    });

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-secondary';
    detailsBtn.textContent = 'View Job Details';
    detailsBtn.addEventListener('click', () => {
        if (!jobId) {
            notifyError('Missing job reference.');
            return;
        }
        navigateTo('job-details.html', { job_id: jobId });
    });

    actionsDiv.appendChild(badge);
    actionsDiv.appendChild(messageBtn);
    actionsDiv.appendChild(detailsBtn);

    if (typeof showToast === 'function') {
        showToast('Quote accepted successfully! Messaging is now unlocked with this vendor.', 'success');
    } else {
        alert('Quote accepted successfully! Messaging is now unlocked with this vendor.');
    }
}

window.acceptQuote = acceptQuote;

// Smooth scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Initialize tooltips
const tooltips = document.querySelectorAll('[data-tooltip]');
tooltips.forEach(element => {
    element.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = e.target.dataset.tooltip;
        document.body.appendChild(tooltip);
        
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    });
    
    element.addEventListener('mouseleave', () => {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    });
});

// Auto-save draft functionality
let autoSaveTimer;
function enableAutoSave(formId, interval = 5000) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveDraft(formId);
            }, interval);
        });
    });
}

function saveDraft(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    localStorage.setItem(`draft_${formId}`, JSON.stringify(data));
    console.log('Draft saved:', data);
}

function loadDraft(formId) {
    const draft = localStorage.getItem(`draft_${formId}`);
    if (!draft) return;
    
    const data = JSON.parse(draft);
    const form = document.getElementById(formId);
    if (!form) return;
    
    Object.keys(data).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = data[key];
        }
    });
}

// File upload preview
function handleFileUpload(input) {
    const files = input.files;
    const preview = document.getElementById('file-preview');
    
    if (!preview) return;
    
    preview.innerHTML = '';
    
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            fileItem.appendChild(img);
        }
        
        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        fileItem.appendChild(fileName);
        
        preview.appendChild(fileItem);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('User Dashboard initialized');
    initializeThemeToggle();
    initializeSmoothScroll(document.getElementById('mainContent') || document);
    initializeSpaNavigation();
    initializeInvoiceDownloads();

    // Initialize modals
    initializeNotificationModal();
    initializeProfileModal();

    // Job page bindings
    initializePageHandlers();
});

// Notification Modal
function initializeNotificationModal() {
    const notificationBtn = document.querySelector('.icon-button');
    const notificationModal = document.getElementById('notificationModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    if (!notificationBtn || !notificationModal) return;
    
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllModals();
        notificationModal.classList.add('active');
        modalBackdrop.classList.add('active');
    });
    
    // Mark all as read
    const markAllBtn = document.getElementById('markAllRead');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
            });
            const badge = document.querySelector('.notification-badge');
            if (badge) badge.style.display = 'none';
        });
    }
    
    // Notification item clicks
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            this.classList.remove('unread');
            const link = this.dataset.link;
            if (link) navigateTo(link);
        });
    });
}

// Profile Modal
function initializeProfileModal() {
    const profileBtn = document.querySelector('.user-menu');
    const profileModal = document.getElementById('profileModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    if (!profileBtn || !profileModal) return;
    
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllModals();
        profileModal.classList.add('active');
        modalBackdrop.classList.add('active');
    });
    
    // Logout confirmation
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                console.log('User logged out');
                window.location.href = 'login.html';
            }
        });
    }
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.top-bar-modal').forEach(modal => {
        modal.classList.remove('active');
    });
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
}

// Close modals when clicking backdrop
document.addEventListener('click', (e) => {
    const isBackdrop = e.target.id === 'modalBackdrop' || e.target.classList.contains('modal-backdrop');
    if (isBackdrop) {
        closeAllModals();
        return;
    }

    const clickedInsideModal = e.target.closest('.top-bar-modal');
    const clickedTrigger = e.target.closest('.notification-modal-container, .profile-modal-container');
    if (!clickedInsideModal && !clickedTrigger) {
        closeAllModals();
    }
});

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// Close top-bar modals on scroll and navigation
window.addEventListener('scroll', () => {
    closeAllModals();
}, { passive: true });

window.addEventListener('popstate', () => {
    closeAllModals();
});



