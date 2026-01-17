/**
 * TradeMatch Quote Engine
 * Handles quote submission and management
 */

class QuoteEngine {
    constructor() {
        this.api = window.api;
        this.authManager = window.authManager;
        this.currentQuote = null;
        this.init();
    }

    /**
     * Initialize quote engine
     */
    init() {
        this.setupQuoteForms();
        this.setupServiceSelection();
    }

    /**
     * Setup quote forms
     */
    setupQuoteForms() {
        // Navigation quote form
        const navQuoteForm = document.getElementById('navQuoteForm');
        if (navQuoteForm) {
            navQuoteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNavQuoteSubmit(e);
            });
        }

        // Hero search form
        const heroSearchForm = document.getElementById('heroSearchForm');
        if (heroSearchForm) {
            heroSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleHeroSearchSubmit(e);
            });
        }
    }

    /**
     * Setup service selection
     */
    setupServiceSelection() {
        // Service selection is already handled in the main script
        // We'll enhance it to work with authentication
    }

    /**
     * Handle navigation quote form submission
     */
    async handleNavQuoteSubmit(e) {
        const form = e.target;
        const service = document.getElementById('navService').value;
        const postcode = document.getElementById('navPostcode').value;
        const urgency = document.getElementById('navUrgency').value;

        // Basic validation
        if (!service || !postcode) {
            this.showQuoteMessage('Please fill in all required fields', 'error');
            return;
        }

        // Check if user is authenticated
        if (!this.api.isAuthenticated()) {
            // Store quote data and redirect to auth
            this.storePendingQuote({ service, postcode, urgency });
            openAuthModal('register');
            return;
        }

        // Submit quote
        await this.submitQuote({
            serviceType: service,
            postcode: postcode,
            urgency: urgency,
            source: 'navigation'
        });
    }

    /**
     * Handle hero search form submission
     */
    async handleHeroSearchSubmit(e) {
        const form = e.target;
        const service = selectedService; // From global variable
        const postcode = form.postcode?.value;

        if (!service) {
            this.showQuoteMessage('Please select a service', 'error');
            return;
        }

        if (!postcode) {
            this.showQuoteMessage('Please enter your postcode', 'error');
            return;
        }

        // Check if user is authenticated
        if (!this.api.isAuthenticated()) {
            // Store quote data and redirect to auth
            this.storePendingQuote({ service, postcode });
            openAuthModal('register');
            return;
        }

        // Submit quote
        await this.submitQuote({
            serviceType: service,
            postcode: postcode,
            source: 'hero'
        });
    }

    /**
     * Submit quote to API
     */
    async submitQuote(quoteData) {
        try {
            this.showQuoteMessage('Submitting your quote request...', 'loading');

            // Prepare quote data for API
            const apiQuoteData = {
                serviceType: quoteData.serviceType,
                title: this.generateQuoteTitle(quoteData.serviceType),
                description: this.generateQuoteDescription(quoteData.serviceType),
                postcode: quoteData.postcode,
                urgency: quoteData.urgency || 'asap',
                additionalDetails: {
                    source: quoteData.source || 'web',
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                }
            };

            const response = await this.api.createQuote(apiQuoteData);

            if (response.success) {
                this.currentQuote = response.quoteId;
                this.showQuoteMessage('Quote submitted successfully! Redirecting...', 'success');
                
                // Clear pending quote
                localStorage.removeItem('pendingQuote');
                
                // Redirect to quote confirmation or dashboard
                setTimeout(() => {
                    this.redirectToQuoteConfirmation(response.quoteId);
                }, 2000);
            } else {
                this.showQuoteMessage(response.error || 'Failed to submit quote', 'error');
            }
        } catch (error) {
            console.error('Quote submission error:', error);
            this.showQuoteMessage(error.message || 'Failed to submit quote', 'error');
        }
    }

    /**
     * Store pending quote for after authentication
     */
    storePendingQuote(quoteData) {
        localStorage.setItem('pendingQuote', JSON.stringify(quoteData));
    }

    /**
     * Retrieve pending quote
     */
    getPendingQuote() {
        const pending = localStorage.getItem('pendingQuote');
        return pending ? JSON.parse(pending) : null;
    }

    /**
     * Process pending quote after authentication
     */
    async processPendingQuote() {
        const pendingQuote = this.getPendingQuote();
        if (pendingQuote && this.api.isAuthenticated()) {
            await this.submitQuote(pendingQuote);
        }
    }

    /**
     * Generate quote title based on service type
     */
    generateQuoteTitle(serviceType) {
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

    /**
     * Generate quote description based on service type
     */
    generateQuoteDescription(serviceType) {
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
            'landscaping': 'Landscaping and garden design required. Need quotes for design, materials, and labor.'
        };

        return descriptions[serviceType] || 'Home improvement work required. Please provide detailed quotes.';
    }

    /**
     * Show quote message
     */
    showQuoteMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('quoteMessage');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'quoteMessage';
            messageEl.className = 'quote-message';
            
            // Add to navigation dropdown or hero section
            const navDropdown = document.getElementById('navDropdown');
            if (navDropdown) {
                navDropdown.appendChild(messageEl);
            } else {
                // Fallback to hero section
                const heroSection = document.querySelector('.hero');
                if (heroSection) {
                    heroSection.appendChild(messageEl);
                }
            }
        }

        messageEl.textContent = message;
        messageEl.className = `quote-message ${type}`;
        messageEl.style.display = 'block';

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Hide quote message
     */
    hideQuoteMessage() {
        const messageEl = document.getElementById('quoteMessage');
        if (messageEl) {
            messageEl.style.display = 'none';
        }
    }

    /**
     * Redirect to quote confirmation page
     */
    redirectToQuoteConfirmation(quoteId) {
        // For now, redirect to a success page or show success modal
        // In future, this could go to a dedicated quote tracking page
        
        // Create success modal
        const successModal = `
            <div id="successModal" class="auth-modal active">
                <div class="auth-modal-overlay" onclick="closeSuccessModal()"></div>
                <div class="auth-modal-content">
                    <button class="auth-modal-close" onclick="closeSuccessModal()">×</button>
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
                        <h2>Quote Submitted Successfully!</h2>
                        <p style="margin: 20px 0; color: var(--gray);">
                            Your quote request has been sent to verified tradespeople in your area.<br>
                            You'll start receiving quotes within 24 hours.
                        </p>
                        <div style="background: #F0F9FF; padding: 15px; border-radius: 10px; margin: 20px 0;">
                            <strong>Quote ID:</strong> ${quoteId}<br>
                            <small>Save this ID for tracking</small>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                            <button class="btn btn-primary" onclick="closeSuccessModal()">Continue</button>
                            <button class="btn btn-outline" onclick="viewQuotes()">View My Quotes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', successModal);
    }

    /**
     * Get user's quotes
     */
    async getUserQuotes() {
        try {
            const response = await this.api.getQuotes();
            return response.quotes || [];
        } catch (error) {
            console.error('Error fetching user quotes:', error);
            return [];
        }
    }
}

// Global functions
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.remove();
    }
}

function viewQuotes() {
    closeSuccessModal();
    // This would navigate to a quotes dashboard page
    console.log('Navigate to quotes dashboard');
}

// Initialize quote engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.quoteEngine = new QuoteEngine();
    
    // Process any pending quotes after authentication
    setTimeout(() => {
        if (window.authManager && window.authManager.currentUser) {
            window.quoteEngine.processPendingQuote();
        }
    }, 1000);
});