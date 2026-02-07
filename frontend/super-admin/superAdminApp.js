(function () {
    "use strict";

    const root = document.getElementById("super-admin-root");

    const ROUTES = [
        {
            path: "/super-admin/dashboard",
            file: "Dashboard.html",
            label: "Dashboard",
            viewRoles: ["super_admin", "trust_safety_admin", "finance_admin", "support_admin", "read_only_admin"],
            actionRoles: ["super_admin", "support_admin"]
        },
        {
            path: "/super-admin/users",
            file: "Users.html",
            label: "Users",
            viewRoles: ["super_admin", "trust_safety_admin", "support_admin", "read_only_admin"],
            actionRoles: ["super_admin", "trust_safety_admin", "support_admin"]
        },
        {
            path: "/super-admin/vendors",
            file: "Vendors.html",
            label: "Vendors",
            viewRoles: ["super_admin", "trust_safety_admin", "support_admin", "read_only_admin"],
            actionRoles: ["super_admin", "trust_safety_admin", "support_admin"]
        },
        {
            path: "/super-admin/jobs-leads",
            file: "JobsLeads.html",
            label: "Jobs & Leads",
            viewRoles: ["super_admin", "support_admin", "read_only_admin"],
            actionRoles: ["super_admin", "support_admin"]
        },
        {
            path: "/super-admin/trust-safety",
            file: "TrustSafety.html",
            label: "Trust & Safety",
            viewRoles: ["super_admin", "trust_safety_admin", "read_only_admin"],
            actionRoles: ["super_admin", "trust_safety_admin"]
        },
        {
            path: "/super-admin/revenue",
            file: "Revenue.html",
            label: "Revenue",
            viewRoles: ["super_admin", "finance_admin", "read_only_admin"],
            actionRoles: ["super_admin", "finance_admin"]
        },
        {
            path: "/super-admin/platform",
            file: "Platform.html",
            label: "Platform",
            viewRoles: ["super_admin"],
            actionRoles: ["super_admin"]
        },
        {
            path: "/super-admin/audit-logs",
            file: "AuditLogs.html",
            label: "Audit Logs",
            viewRoles: ["super_admin", "trust_safety_admin", "finance_admin", "support_admin", "read_only_admin"],
            actionRoles: ["super_admin", "trust_safety_admin", "finance_admin", "support_admin"]
        },
        {
            path: "/super-admin/roles-permissions",
            file: "RolesPermissions.html",
            label: "Roles & Permissions",
            viewRoles: ["super_admin"],
            actionRoles: ["super_admin"]
        }
    ];

    const LABEL_OVERRIDES = {
        "dashboard": "/super-admin/dashboard",
        "users": "/super-admin/users",
        "vendors": "/super-admin/vendors",
        "jobsleads": "/super-admin/jobs-leads",
        "jobs": "/super-admin/jobs-leads",
        "jobs&leads": "/super-admin/jobs-leads",
        "trust&safety": "/super-admin/trust-safety",
        "trustsafety": "/super-admin/trust-safety",
        "revenue": "/super-admin/revenue",
        "platform": "/super-admin/platform",
        "settings": "/super-admin/platform",
        "auditlog": "/super-admin/audit-logs",
        "auditlogs": "/super-admin/audit-logs",
        "roles&permissions": "/super-admin/roles-permissions",
        "rolespermissions": "/super-admin/roles-permissions",
        "roles": "/super-admin/roles-permissions",
        "permissions": "/super-admin/roles-permissions"
    };

    const ROLE_LABELS = {
        super_admin: "Super Admin",
        trust_safety_admin: "Trust & Safety Admin",
        finance_admin: "Finance Admin",
        support_admin: "Support Admin",
        read_only_admin: "Read-only Admin"
    };

    const isLocal = window.location.protocol === "file:"
        || window.location.hostname === "localhost"
        || window.location.hostname === "127.0.0.1";

    const API_CONFIG = {
        BASE_URL: isLocal
            ? "http://localhost:3001"
            : "https://api.tradematch.uk",
        ENDPOINTS: {
            LOGIN: "/api/auth/login",
            VERIFY: "/api/auth/verify",
            LOGOUT: "/api/auth/logout",
            STRIPE_RECONCILIATION: "/api/admin/finance/reconciliation/stripe",
            STRIPE_PAYMENTS: "/api/admin/finance/stripe/payments",
            STRIPE_SUBSCRIPTIONS: "/api/admin/finance/stripe/subscriptions",
            STRIPE_REFUNDS: "/api/admin/finance/stripe/refunds",
            AUDIT_LOG: "/api/admin/audit"
        }
    };

    class AdminAPI {
        constructor() {
            this.token = localStorage.getItem("admin_token");
            this.user = this.readUser();
        }

        readUser() {
            try {
                return JSON.parse(localStorage.getItem("admin_user") || "null");
            } catch (error) {
                return null;
            }
        }

        getHeaders() {
            const headers = {
                "Content-Type": "application/json"
            };
            if (this.token) {
                headers.Authorization = `Bearer ${this.token}`;
            }
            return headers;
        }

        async request(endpoint, options = {}) {
            const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...options.headers
                }
            });

            if (response.status === 401) {
                this.logout();
                throw new Error("Session expired");
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            return data;
        }

        async login(email, password) {
            const data = await this.request(API_CONFIG.ENDPOINTS.LOGIN, {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            this.token = data.token;
            this.user = {
                userId: data.userId,
                email: data.email,
                name: data.name,
                role: data.role
            };

            localStorage.setItem("admin_token", this.token);
            localStorage.setItem("admin_user", JSON.stringify(this.user));

            return data;
        }

        async verifyToken() {
            const data = await this.request(API_CONFIG.ENDPOINTS.VERIFY);
            if (data && data.userId) {
                this.user = {
                    userId: data.userId,
                    email: data.email,
                    name: data.name,
                    role: data.role
                };
                localStorage.setItem("admin_user", JSON.stringify(this.user));
            }
            return data;
        }

        async getStripeReconciliation(params = {}) {
            const query = new URLSearchParams(params).toString();
            const endpoint = query
                ? `${API_CONFIG.ENDPOINTS.STRIPE_RECONCILIATION}?${query}`
                : API_CONFIG.ENDPOINTS.STRIPE_RECONCILIATION;
            return this.request(endpoint);
        }

        async getStripePayments(params = {}) {
            const query = new URLSearchParams(params).toString();
            const endpoint = query
                ? `${API_CONFIG.ENDPOINTS.STRIPE_PAYMENTS}?${query}`
                : API_CONFIG.ENDPOINTS.STRIPE_PAYMENTS;
            return this.request(endpoint);
        }

        async getStripeSubscriptions(params = {}) {
            const query = new URLSearchParams(params).toString();
            const endpoint = query
                ? `${API_CONFIG.ENDPOINTS.STRIPE_SUBSCRIPTIONS}?${query}`
                : API_CONFIG.ENDPOINTS.STRIPE_SUBSCRIPTIONS;
            return this.request(endpoint);
        }

        async getStripeRefunds(params = {}) {
            const query = new URLSearchParams(params).toString();
            const endpoint = query
                ? `${API_CONFIG.ENDPOINTS.STRIPE_REFUNDS}?${query}`
                : API_CONFIG.ENDPOINTS.STRIPE_REFUNDS;
            return this.request(endpoint);
        }

        async getAuditLog(params = {}) {
            const query = new URLSearchParams(params).toString();
            const endpoint = query
                ? `${API_CONFIG.ENDPOINTS.AUDIT_LOG}?${query}`
                : API_CONFIG.ENDPOINTS.AUDIT_LOG;
            return this.request(endpoint);
        }

        logout() {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
            this.token = null;
            this.user = null;
        }
    }

    const adminApi = new AdminAPI();
    let router = null;

    function normalizeLabel(text) {
        return text.toLowerCase().replace(/\s+/g, "").replace(/&/g, "&");
    }

    function getRouteForNavLabel(label) {
        const key = normalizeLabel(label);
        return LABEL_OVERRIDES[key] || null;
    }

    function getCurrentUser() {
        return adminApi.user || adminApi.readUser();
    }

    function getCurrentRole() {
        return getCurrentUser()?.role || null;
    }

    function isRoleAllowed(role, allowedRoles) {
        if (!role) return false;
        if (role === "super_admin") return true;
        return allowedRoles.includes(role);
    }

    function enforceLightMode() {
        document.documentElement.setAttribute("data-theme", "light");
        document.body.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
        document.querySelectorAll(".theme-toggle").forEach((element) => element.remove());
    }

    function updateAdminProfile() {
        const user = getCurrentUser();
        if (!user) return;

        const displayName = user.name || user.email || ROLE_LABELS[user.role] || "Admin";
        const initials = displayName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        document.querySelectorAll(".admin-name").forEach((node) => {
            node.textContent = ROLE_LABELS[user.role] || displayName;
        });
        document.querySelectorAll(".admin-avatar").forEach((node) => {
            node.textContent = initials || "SA";
        });
    }

    function injectLogoutButton() {
        const containers = [
            ".top-nav-right",
            ".topbar-actions",
            ".top-nav",
            ".topbar"
        ];

        let container = null;
        for (const selector of containers) {
            const found = document.querySelector(selector);
            if (found) {
                container = found;
                break;
            }
        }

        if (!container || container.querySelector(".super-admin-logout")) return;

        const button = document.createElement("button");
        button.className = "btn btn-secondary super-admin-logout";
        button.type = "button";
        button.textContent = "Logout";
        button.addEventListener("click", () => {
            adminApi.logout();
            renderLogin();
        });

        container.appendChild(button);
    }

    function applyNavLinks(activePath) {
        const role = getCurrentRole();
        const navItems = Array.from(document.querySelectorAll(".nav-item"));

        navItems.forEach((item) => {
            const labelNode = item.querySelector(".nav-label") || item.querySelector("span") || item;
            const label = (labelNode.textContent || "").trim();
            const path = getRouteForNavLabel(label);

            if (!path) {
                item.classList.add("is-disabled");
                item.style.display = "none";
                return;
            }

            const route = ROUTES.find((entry) => entry.path === path);
            if (!route || !isRoleAllowed(role, route.viewRoles)) {
                item.style.display = "none";
                return;
            }

            item.setAttribute("href", `#${path}`);
            item.dataset.route = path;
            item.classList.toggle("active", path === activePath);
        });
    }

    function applyActionPermissions(route) {
        const role = getCurrentRole();
        if (!route || !role) return;

        const allowActions = isRoleAllowed(role, route.actionRoles);
        if (allowActions) return;

        const scope = document.querySelector(".main-content") || root;
        scope.querySelectorAll("button, [onclick], .actions-btn, .table-action-btn, .btn, .btn-small").forEach((node) => {
            node.classList.add("is-disabled");
            if (node.tagName === "BUTTON") {
                node.disabled = true;
            }
        });
    }

    function renderAccessDenied() {
        root.innerHTML = `
            <section class="access-denied">
                <div class="access-denied-card">
                    <div class="access-denied-title">Access restricted</div>
                    <div class="access-denied-subtitle">Your role does not have permission to view this page.</div>
                    <button class="btn-primary" type="button" id="accessDeniedBack">Return to dashboard</button>
                </div>
            </section>
        `;
        const backButton = document.getElementById("accessDeniedBack");
        if (backButton && router) {
            backButton.addEventListener("click", () => router.navigate("/super-admin/dashboard"));
        }
    }

    function renderLogin(errorMessage) {
        root.innerHTML = `
            <section class="login-screen">
                <div class="login-card">
                    <div class="login-title">Super Admin Login</div>
                    <div class="login-subtitle">Use your admin credentials to continue.</div>
                    <form class="login-form" id="superAdminLogin">
                        <div>
                            <label for="loginEmail">Email</label>
                            <input id="loginEmail" type="email" autocomplete="email" required>
                        </div>
                        <div>
                            <label for="loginPassword">Password</label>
                            <input id="loginPassword" type="password" autocomplete="current-password" required>
                        </div>
                        ${errorMessage ? `<div class="login-error">${errorMessage}</div>` : ""}
                        <div class="login-actions">
                            <button class="btn-primary" type="submit">Sign in</button>
                            <button class="btn-secondary" type="button" id="loginCancel">Back to site</button>
                        </div>
                    </form>
                </div>
            </section>
        `;

        const form = document.getElementById("superAdminLogin");
        const cancel = document.getElementById("loginCancel");
        if (cancel) {
            cancel.addEventListener("click", () => {
                window.location.href = "/frontend/pages/index.html";
            });
        }

        if (form) {
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                const email = document.getElementById("loginEmail").value.trim();
                const password = document.getElementById("loginPassword").value.trim();
                if (!email || !password) return;

                try {
                    await adminApi.login(email, password);
                    router.navigate("/super-admin/dashboard");
                } catch (error) {
                    renderLogin(error.message || "Login failed");
                }
            });
        }
    }

    async function loadPage(route) {
        if (!route) {
            renderAccessDenied();
            return;
        }

        const role = getCurrentRole();
        if (!role || !adminApi.token) {
            renderLogin();
            return;
        }

        if (!isRoleAllowed(role, route.viewRoles)) {
            renderAccessDenied();
            return;
        }

        const response = await fetch(`./pages/${route.file}`);
        if (!response.ok) {
            root.innerHTML = `<div class="route-loading">Unable to load ${route.label}.</div>`;
            return;
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const styleBlocks = Array.from(doc.querySelectorAll("style"))
            .map((style) => style.textContent)
            .join("\n");

        let styleTag = document.getElementById("super-admin-page-style");
        if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "super-admin-page-style";
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = styleBlocks;

        const scripts = Array.from(doc.querySelectorAll("script"))
            .map((script) => script.textContent)
            .join("\n");

        root.innerHTML = doc.body.innerHTML;

        let scriptTag = document.getElementById("super-admin-page-script");
        if (scriptTag) {
            scriptTag.remove();
        }
        if (scripts.trim()) {
            scriptTag = document.createElement("script");
            scriptTag.id = "super-admin-page-script";
            scriptTag.textContent = scripts;
            document.body.appendChild(scriptTag);
        }

        enforceLightMode();
        updateAdminProfile();
        applyNavLinks(route.path);
        injectLogoutButton();
        applyActionPermissions(route);
        await loadPageData(route.path);
    }

    async function loadPageData(path) {
        if (path === "/super-admin/revenue") {
            await loadStripeSnapshot();
            await loadStripeTransactions();
            ensureRevenueDrawerHandlers();
        }
        if (path === "/super-admin/audit-logs") {
            await loadAuditLogs();
        }
    }

    function ensureRevenueDrawerHandlers() {
        const drawer = document.getElementById('transactionDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        if (!drawer || !backdrop) return;

        window.closeDrawer = () => {
            drawer.classList.remove('active');
            backdrop.classList.remove('active');
        };

        window.openDrawer = () => {
            drawer.classList.add('active');
            backdrop.classList.add('active');
        };

        backdrop.onclick = window.closeDrawer;
    }

    async function loadStripeSnapshot() {
        const container = document.getElementById("stripeSnapshot");
        if (!container) return;

        const role = getCurrentRole();
        if (!isRoleAllowed(role, ["super_admin", "finance_admin"])) {
            container.innerHTML = "<div class=\"status-note\">Stripe data visible to finance roles only.</div>";
            return;
        }

        try {
            const data = await adminApi.getStripeReconciliation({ limit: 100 });
            const totals = data?.stripeTotals;

            if (!totals) {
                container.innerHTML = "<div class=\"status-note\">No Stripe totals available.</div>";
                return;
            }

            const summaryRows = [
                { label: "Total", value: totals.total },
                { label: "Charges", value: totals.charges },
                { label: "Refunds", value: totals.refunds },
                { label: "Chargebacks", value: totals.chargebacks }
            ];

            container.innerHTML = `
                <div class="stripe-summary-list">
                    ${summaryRows
                        .map((row) => {
                            const amount = Number(row.value || 0) / 100;
                            return `
                                <div class="stripe-summary-item">
                                    <div class="stripe-summary-title">${row.label}</div>
                                    <div class="stripe-summary-meta">GBP ${amount.toFixed(2)}</div>
                                </div>
                            `;
                        })
                        .join("")}
                </div>
            `;
        } catch (error) {
            container.innerHTML = "<div class=\"status-note\">Stripe data unavailable.</div>";
        }
    }

    function formatCurrencyCents(amount) {
        const value = Number(amount || 0) / 100;
        return `£${value.toFixed(2)}`;
    }

    function formatStripeDate(epochSeconds) {
        if (!epochSeconds) return "-";
        const date = new Date(epochSeconds * 1000);
        return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }

    function formatStripeTime(epochSeconds) {
        if (!epochSeconds) return "-";
        const date = new Date(epochSeconds * 1000);
        return `${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} GMT`;
    }

    function mapStatusBadge(status) {
        const normalized = String(status || '').toLowerCase();
        if (normalized === 'succeeded') return 'status-succeeded';
        if (normalized === 'pending' || normalized === 'processing') return 'status-pending';
        if (normalized === 'failed' || normalized === 'requires_payment_method') return 'status-failed';
        if (normalized === 'refunded') return 'status-refunded';
        return 'status-pending';
    }

    function updateRevenueDrawer(entry) {
        const setText = (id, value) => {
            const node = document.getElementById(id);
            if (node) node.textContent = value;
        };

        setText('revenueDrawerId', entry.id);
        setText('revenueDrawerTransactionId', entry.id);
        setText('revenueDrawerStripeIntent', entry.intentId || '-');
        setText('revenueDrawerStripeCharge', entry.chargeId || '-');
        setText('revenueDrawerVendor', entry.vendor || 'Stripe');
        setText('revenueDrawerDate', entry.dateTime || '-');
        setText('revenueDrawerGross', entry.gross || '-');
        setText('revenueDrawerFee', entry.fee || '-');
        setText('revenueDrawerNet', entry.net || '-');
        setText('revenueDrawerMethod', entry.method || 'card');
        setText('revenueDrawerCard', entry.card || 'Card');
        setText('revenueDrawerCountry', entry.country || 'United Kingdom');
        setText('revenueDrawerCreated', entry.created || '-');
        setText('revenueDrawerSucceeded', entry.succeeded || '-');

        const typeNode = document.getElementById('revenueDrawerType');
        if (typeNode) {
            typeNode.textContent = entry.typeLabel;
            typeNode.className = entry.typeClass;
        }

        const statusNode = document.getElementById('revenueDrawerStatus');
        if (statusNode) {
            statusNode.textContent = entry.statusLabel;
            statusNode.className = `status-badge ${entry.statusClass}`;
        }

        const drawer = document.getElementById('transactionDrawer');
        const backdrop = document.getElementById('drawerBackdrop');
        if (drawer && backdrop) {
            drawer.classList.add('active');
            backdrop.classList.add('active');
            backdrop.onclick = () => {
                drawer.classList.remove('active');
                backdrop.classList.remove('active');
            };
        }
    }

    async function loadStripeTransactions() {
        const tableBody = document.getElementById('stripeTransactionsBody');
        if (!tableBody) return;

        const role = getCurrentRole();
        if (!isRoleAllowed(role, ['super_admin', 'finance_admin'])) {
            tableBody.innerHTML = '<tr><td colspan="9">Stripe data visible to finance roles only.</td></tr>';
            return;
        }

        try {
            const [paymentsResult, refundsResult, subscriptionsResult] = await Promise.all([
                adminApi.getStripePayments({ limit: 10 }),
                adminApi.getStripeRefunds({ limit: 5 }),
                adminApi.getStripeSubscriptions({ limit: 5 })
            ]);

            const payments = paymentsResult?.payments || [];
            const refunds = refundsResult?.refunds || [];
            const subscriptions = subscriptionsResult?.subscriptions || [];

            const rows = [];

            payments.forEach((payment) => {
                rows.push({
                    id: payment.id,
                    date: formatStripeDate(payment.created),
                    time: formatStripeTime(payment.created),
                    vendor: payment.customer ? 'Stripe Customer' : 'Stripe',
                    typeLabel: 'Payment',
                    typeClass: 'type-badge type-lead',
                    related: payment.description || payment.id,
                    gross: formatCurrencyCents(payment.amount),
                    net: formatCurrencyCents(payment.amount),
                    statusLabel: payment.status || 'pending',
                    statusClass: mapStatusBadge(payment.status),
                    method: 'Stripe Card',
                    intentId: payment.id,
                    chargeId: payment.id,
                    card: 'Card',
                    country: 'United Kingdom',
                    created: `${formatStripeDate(payment.created)} ${formatStripeTime(payment.created)}`,
                    succeeded: payment.status === 'succeeded' ? `${formatStripeDate(payment.created)} ${formatStripeTime(payment.created)}` : '-'
                });
            });

            refunds.forEach((refund) => {
                rows.push({
                    id: refund.id,
                    date: formatStripeDate(refund.created),
                    time: formatStripeTime(refund.created),
                    vendor: 'Stripe',
                    typeLabel: 'Refund',
                    typeClass: 'type-badge type-addon',
                    related: refund.payment_intent || refund.id,
                    gross: formatCurrencyCents(refund.amount),
                    net: formatCurrencyCents(refund.amount),
                    statusLabel: refund.status || 'refunded',
                    statusClass: mapStatusBadge(refund.status || 'refunded'),
                    method: 'Stripe Refund',
                    intentId: refund.payment_intent || '-',
                    chargeId: refund.id,
                    card: 'Refund',
                    country: 'United Kingdom',
                    created: `${formatStripeDate(refund.created)} ${formatStripeTime(refund.created)}`,
                    succeeded: refund.status === 'succeeded' ? `${formatStripeDate(refund.created)} ${formatStripeTime(refund.created)}` : '-'
                });
            });

            subscriptions.forEach((subscription) => {
                rows.push({
                    id: subscription.id,
                    date: formatStripeDate(subscription.created),
                    time: formatStripeTime(subscription.created),
                    vendor: subscription.customer ? 'Stripe Customer' : 'Stripe',
                    typeLabel: 'Subscription',
                    typeClass: 'type-badge type-subscription',
                    related: subscription.id,
                    gross: '-',
                    net: '-',
                    statusLabel: subscription.status || 'active',
                    statusClass: mapStatusBadge(subscription.status),
                    method: 'Stripe Subscription',
                    intentId: subscription.id,
                    chargeId: '-',
                    card: 'Subscription',
                    country: 'United Kingdom',
                    created: `${formatStripeDate(subscription.created)} ${formatStripeTime(subscription.created)}`,
                    succeeded: '-'
                });
            });

            if (!rows.length) {
                tableBody.innerHTML = '<tr><td colspan="9">No Stripe transactions available.</td></tr>';
                return;
            }

            tableBody.innerHTML = rows
                .slice(0, 12)
                .map((entry) => {
                    return `
                        <tr data-entry-id="${entry.id}">
                            <td><span class="table-id">${entry.id}</span></td>
                            <td>
                                <div class="table-date">${entry.date}</div>
                                <div class="table-date">${entry.time}</div>
                            </td>
                            <td><span class="table-vendor">${entry.vendor}</span></td>
                            <td><span class="${entry.typeClass}">${entry.typeLabel}</span></td>
                            <td><span class="table-id">${entry.related}</span></td>
                            <td><span class="table-amount">${entry.gross}</span></td>
                            <td><span class="table-amount">${entry.net}</span></td>
                            <td><span class="status-badge ${entry.statusClass}">${entry.statusLabel}</span></td>
                            <td>${entry.method}</td>
                        </tr>
                    `;
                })
                .join('');

            tableBody.querySelectorAll('tr').forEach((row) => {
                row.addEventListener('click', () => {
                    const entryId = row.dataset.entryId;
                    const entry = rows.find((item) => item.id === entryId);
                    if (entry) {
                        entry.dateTime = `${entry.date} • ${entry.time}`;
                        updateRevenueDrawer(entry);
                    }
                });
            });
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="9">Stripe transactions unavailable.</td></tr>';
        }
    }

    function formatAuditRow(entry) {
        const date = new Date(entry.created_at || Date.now());
        const dateText = date.toISOString().split("T")[0];
        const timeText = date.toISOString().split("T")[1].split(".")[0];
        const adminName = entry.admin_email || entry.admin_id || "System";
        const roleText = ROLE_LABELS[entry.role] || entry.admin_role || "Admin";
        const actionText = entry.action || "Action";
        const targetType = (entry.target_type || "entity").toUpperCase();
        const targetId = entry.target_id || "-";
        const actionLower = actionText.toLowerCase();
        const riskClass =
            actionLower.includes("suspend") ||
            actionLower.includes("refund") ||
            actionLower.includes("delete") ||
            actionLower.includes("revoke") ||
            actionLower.includes("restrict")
                ? "high"
                : "low";
        const detailsText = typeof entry.details === "string"
            ? entry.details
            : entry.details
                ? JSON.stringify(entry.details)
                : "";

        return `
            <tr class="${riskClass === "high" ? "high-risk" : ""}">
                <td>
                    <div class="timestamp">
                        <span class="timestamp-date">${dateText}</span>
                        <span class="timestamp-time">${timeText}</span>
                    </div>
                </td>
                <td>
                    <div class="admin-info">
                        <div class="admin-name">${adminName}</div>
                        <div class="admin-id">${entry.admin_id || "-"}</div>
                    </div>
                </td>
                <td>
                    <span class="role-badge role-super-admin">${roleText}</span>
                </td>
                <td>
                    <div class="action-text">${actionText}</div>
                    <div class="action-target">${detailsText}</div>
                </td>
                <td>
                    <div class="entity-badge">
                        <span class="entity-type">${targetType}</span>
                        <span class="entity-id">${targetId}</span>
                    </div>
                </td>
                <td>
                    <span class="risk-badge risk-${riskClass}">${riskClass}</span>
                </td>
                <td>
                    <span class="source-badge">API</span>
                </td>
                <td>
                    <button class="view-btn" type="button">View</button>
                </td>
            </tr>
        `;
    }

    async function loadAuditLogs() {
        const tableBody = document.getElementById("auditTableBody");
        if (!tableBody) return;

        try {
            const data = await adminApi.getAuditLog({ days: 30, limit: 10 });
            if (data && Array.isArray(data.logs) && data.logs.length) {
                tableBody.innerHTML = data.logs.map(formatAuditRow).join("");
            }
        } catch (error) {
            // Keep static rows if API is unavailable.
        }
    }

    async function initApp() {
        router = window.createSuperAdminRouter({
            routes: ROUTES,
            defaultPath: "/super-admin/dashboard",
            onRouteChange: async (route) => {
                try {
                    if (adminApi.token) {
                        await adminApi.verifyToken();
                    }
                } catch (error) {
                    adminApi.logout();
                }
                await loadPage(route);
            }
        });
    }

    initApp();
})();
