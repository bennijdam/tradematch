/**
 * TradeMatch Mobile Sidebar Controller
 * Enables hamburger menu and mobile navigation for responsive dashboard
 * Works with responsive-dashboard.css
 */

(function() {
  'use strict';

  const MobileMenuController = {
    // State management
    isOpen: false,
    isMobile: false,
    sidebar: null,
    hamburger: null,
    backdrop: null,
    
    // Initialize mobile menu
    init() {
      this.setupDOM();
      this.bindEvents();
      this.checkViewport();
      this.addARIA();
      console.log('✅ Mobile menu initialized');
    },
    
    // Create HTML elements needed for mobile menu
    setupDOM() {
      const existingHamburger = document.querySelector('.hamburger');
      const sidebar = document.querySelector('.sidebar');
      
      if (!sidebar) {
        console.warn('No .sidebar element found. Mobile menu requires sidebar.');
        return;
      }
      
      // Create hamburger menu if it doesn't exist
      if (!existingHamburger) {
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger';
        hamburger.setAttribute('aria-label', 'Open navigation menu');
        hamburger.setAttribute('aria-controls', 'sidebar');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        
        // Insert at the beginning of top-nav
        const topNav = document.querySelector('.top-nav');
        if (topNav) {
          topNav.insertBefore(hamburger, topNav.firstChild);
        }
      }
      
      // Create backdrop if it doesn't exist
      if (!document.querySelector('.sidebar-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(backdrop);
      }
      
      this.sidebar = document.querySelector('.sidebar');
      this.hamburger = document.querySelector('.hamburger');
      this.backdrop = document.querySelector('.sidebar-backdrop');
    },
    
    // Bind event listeners
    bindEvents() {
      if (this.hamburger) {
        this.hamburger.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggle();
        });
      }
      
      if (this.backdrop) {
        this.backdrop.addEventListener('click', () => {
          this.close();
        });
      }
      
      // Handle window resize
      window.addEventListener('resize', () => {
        this.checkViewport();
      });
      
      // Handle navigation clicks (close on link click)
      if (this.sidebar) {
        this.sidebar.addEventListener('click', (e) => {
          if (e.target.matches('.nav-item')) {
            // Delay closing to allow navigation to start
            setTimeout(() => this.close(), 100);
          }
        });
      }
      
      // Handle ESC key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
      
      // Handle swipe gestures
      this.initSwipeGestures();
    },
    
    // Add ARIA attributes for accessibility
    addARIA() {
      if (this.sidebar && !this.sidebar.hasAttribute('id')) {
        this.sidebar.id = 'sidebar';
      }
      
      if (this.sidebar) {
        this.sidebar.setAttribute('role', 'navigation');
        this.sidebar.setAttribute('aria-label', 'Main navigation');
      }
    },
    
    // Check if viewport is mobile
    checkViewport() {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      
      if (!this.isMobile && this.isOpen) {
        // Close menu when transitioning to desktop
        this.close();
      }
      
      if (wasMobile !== this.isMobile) {
        console.log(`📱 Viewport changed: ${this.isMobile ? 'mobile' : 'desktop'}`);
      }
    },
    
    // Toggle sidebar open/close
    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },
    
    // Open sidebar
    open() {
      if (!this.sidebar || !this.hamburger) return;
      
      this.isOpen = true;
      this.sidebar.classList.add('open');
      this.hamburger.classList.add('active');
      document.body.classList.add('sidebar-open');
      
      if (this.backdrop) {
        this.backdrop.classList.add('active');
      }
      
      this.hamburger.setAttribute('aria-expanded', 'true');
      this.hamburger.setAttribute('aria-label', 'Close navigation menu');
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      console.log('📱 Sidebar opened');
    },
    
    // Close sidebar
    close() {
      if (!this.sidebar || !this.hamburger) return;
      
      this.isOpen = false;
      this.sidebar.classList.remove('open');
      this.hamburger.classList.remove('active');
      document.body.classList.remove('sidebar-open');
      
      if (this.backdrop) {
        this.backdrop.classList.remove('active');
      }
      
      this.hamburger.setAttribute('aria-expanded', 'false');
      this.hamburger.setAttribute('aria-label', 'Open navigation menu');
      
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      
      console.log('📱 Sidebar closed');
    },
    
    // Initialize swipe gestures
    initSwipeGestures() {
      let startX = 0;
      let startY = 0;
      
      document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });
      
      document.addEventListener('touchend', (e) => {
        if (!this.isMobile) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        // Swipe from left edge to open
        if (startX < 40 && deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
          this.open();
        }
        
        // Swipe right to left to close
        if (this.isOpen && deltaX < -60 && Math.abs(deltaX) > Math.abs(deltaY)) {
          this.close();
        }
      }, { passive: true });
    }
  };
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      MobileMenuController.init();
    });
  } else {
    // DOM already loaded
    MobileMenuController.init();
  }
  
  // Expose to global scope for manual control
  window.MobileMenu = MobileMenuController;
  
  console.log('✅ Mobile menu loaded');
  
})();
