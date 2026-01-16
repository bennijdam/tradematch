/**
 * TradeMatch Authentication Module
 * Handles user registration, login, and session management
 */

class AuthManager {
    constructor() {
        this.api = window.api;
        this.currentUser = null;
        this.init();
    }

    /**
     * Initialize authentication
     */
    async init() {
        // Check if user is already logged in
        if (this.api.isAuthenticated()) {
            try {
                const response = await this.api.getCurrentUser();
                if (response.success) {
                    this.currentUser = response.user;
                    this.updateUIForAuthenticatedUser();
                }
            } catch (error) {
                console.log('Invalid token, clearing...');
                this.api.logout();
            }
        }
        
        this.setupAuthModals();
        this.setupAuthForms();
    }

    /**
     * Setup authentication modals
     */
    setupAuthModals() {
        // Create auth modal HTML if it doesn't exist
        if (!document.getElementById('authModal')) {
            const modalHTML = `
                <div id="authModal" class="auth-modal">
                    <div class="auth-modal-overlay" onclick="closeAuthModal()"></div>
                    <div class="auth-modal-content">
                        <button class="auth-modal-close" onclick="closeAuthModal()">×</button>
                        
                        <div class="auth-tabs">
                            <button class="auth-tab active" data-tab="login">Login</button>
                            <button class="auth-tab" data-tab="register">Register</button>
                        </div>
                        
                        <!-- Login Form -->
                        <form id="loginForm" class="auth-form active">
                            <h3>Welcome Back</h3>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" name="email" required placeholder="your@email.com">
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="password" name="password" required placeholder="••••••••">
                            </div>
                            <button type="submit" class="btn btn-primary btn-full">Login</button>
                            <div class="auth-form-footer">
                                <a href="#" onclick="showForgotPassword()">Forgot password?</a>
                            </div>
                        </form>
                        
                        <!-- Register Form -->
                        <form id="registerForm" class="auth-form">
                            <h3>Create Account</h3>
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" name="name" required placeholder="John Doe">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" name="email" required placeholder="your@email.com">
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input type="password" name="password" required placeholder="Min 6 characters">
                            </div>
                            <div class="form-group">
                                <label>I am a...</label>
                                <select name="userType" required>
                                    <option value="">Select type</option>
                                    <option value="customer">Customer (looking for trades)</option>
                                    <option value="vendor">Vendor (tradesperson)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Phone (optional)</label>
                                <input type="tel" name="phone" placeholder="07xxx xxx xxx">
                            </div>
                            <div class="form-group">
                                <label>Postcode (optional)</label>
                                <input type="text" name="postcode" placeholder="SW1A 1AA">
                            </div>
                            <button type="submit" class="btn btn-primary btn-full">Create Account</button>
                        </form>
                        
                        <div id="authMessage" class="auth-message"></div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    /**
     * Setup authentication form handlers
     */
    setupAuthForms() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAuthTab(tabName);
            });
        });

        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(new FormData(loginForm));
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(new FormData(registerForm));
            });
        }
    }

    /**
     * Switch between login and register tabs
     */
    switchAuthTab(tabName) {
        // Update tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });

        // Clear messages
        this.clearAuthMessage();
    }

    /**
     * Handle user login
     */
    async handleLogin(formData) {
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            this.showAuthMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            this.showAuthMessage('Logging in...', 'loading');
            
            const response = await this.api.login(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.showAuthMessage('Login successful!', 'success');
                
                setTimeout(() => {
                    this.closeAuthModal();
                    this.updateUIForAuthenticatedUser();
                }, 1000);
            } else {
                this.showAuthMessage(response.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.showAuthMessage(error.message || 'Login failed', 'error');
        }
    }

    /**
     * Handle user registration
     */
    async handleRegister(formData) {
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            userType: formData.get('userType'),
            phone: formData.get('phone') || null,
            postcode: formData.get('postcode') || null
        };

        // Validation
        if (!userData.name || !userData.email || !userData.password || !userData.userType) {
            this.showAuthMessage('Please fill in all required fields', 'error');
            return;
        }

        if (userData.password.length < 6) {
            this.showAuthMessage('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            this.showAuthMessage('Creating account...', 'loading');
            
            const response = await this.api.register(userData);
            
            if (response.success) {
                this.currentUser = response.user;
                this.showAuthMessage('Account created successfully!', 'success');
                
                setTimeout(() => {
                    this.closeAuthModal();
                    this.updateUIForAuthenticatedUser();
                }, 1000);
            } else {
                this.showAuthMessage(response.error || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showAuthMessage(error.message || 'Registration failed', 'error');
        }
    }

    /**
     * Update UI for authenticated user
     */
    updateUIForAuthenticatedUser() {
        if (!this.currentUser) return;

        // Update navigation
        const navAuth = document.querySelector('.nav-auth') || document.querySelector('.navbar .container');
        if (navAuth) {
            // Add user menu
            const userMenuHTML = `
                <div class="user-menu">
                    <div class="user-avatar" onclick="toggleUserMenu()">
                        ${this.currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-dropdown" id="userDropdown">
                        <div class="user-info">
                            <div class="user-name">${this.currentUser.name}</div>
                            <div class="user-type">${this.currentUser.userType}</div>
                        </div>
                        <div class="user-menu-items">
                            <a href="#" onclick="showDashboard()">Dashboard</a>
                            <a href="#" onclick="showProfile()">Profile</a>
                            <a href="#" onclick="authManager.logout()">Logout</a>
                        </div>
                    </div>
                </div>
            `;
            
            // Replace login/register buttons with user menu
            const authButtons = navAuth.querySelector('.auth-buttons') || navAuth.querySelector('.nav-right');
            if (authButtons) {
                authButtons.innerHTML = userMenuHTML;
            }
        }

        // Update quote forms to require authentication
        this.updateQuoteForms();
    }

    /**
     * Update quote forms for authenticated users
     */
    updateQuoteForms() {
        const quoteForms = document.querySelectorAll('#navQuoteForm, .quote-form');
        quoteForms.forEach(form => {
            if (form && !form.hasAttribute('data-auth-updated')) {
                form.setAttribute('data-auth-updated', 'true');
                // Forms can now be submitted with authentication
            }
        });
    }

    /**
     * Show authentication message
     */
    showAuthMessage(message, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `auth-message ${type}`;
            messageEl.style.display = 'block';
        }
    }

    /**
     * Clear authentication message
     */
    clearAuthMessage() {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.style.display = 'none';
            messageEl.textContent = '';
        }
    }

    /**
     * Close authentication modal
     */
    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
            this.clearAuthMessage();
        }
    }

    /**
     * Logout user
     */
    logout() {
        this.api.logout();
        this.currentUser = null;
        location.reload();
    }
}

// Global functions
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
        if (window.authManager) {
            window.authManager.switchAuthTab(tab);
        }
    }
}

function closeAuthModal() {
    if (window.authManager) {
        window.authManager.closeAuthModal();
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Initialize auth manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Close user menu when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && !userMenu.contains(e.target) && dropdown) {
        dropdown.classList.remove('active');
    }
});