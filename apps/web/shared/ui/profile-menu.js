(function () {
    const injectMobileMenuStyles = () => {
        if (document.getElementById('mobile-menu-styles')) return;
        const style = document.createElement('style');
        style.id = 'mobile-menu-styles';
        style.textContent = `
            .mobile-menu-toggle {
                display: none;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 12px;
                border: 1px solid rgba(15, 23, 42, 0.12);
                background: rgba(255, 255, 255, 0.9);
                color: #0f172a;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .mobile-menu-toggle .bar {
                width: 18px;
                height: 2px;
                background: currentColor;
                border-radius: 999px;
                display: block;
                margin: 3px 0;
            }

            @media (max-width: 968px) {
                nav { position: relative; }

                .mobile-menu-toggle {
                    display: inline-flex;
                }

                .nav-links {
                    position: absolute;
                    top: calc(100% + 12px);
                    right: 0;
                    min-width: 220px;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 12px;
                    padding: 16px;
                    background: #ffffff;
                    border: 1px solid rgba(15, 23, 42, 0.12);
                    border-radius: 14px;
                    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.15);
                    display: none;
                    z-index: 1000;
                }

                .nav-links.is-open {
                    display: flex;
                }

                .nav-links a {
                    color: #0f172a;
                }
            }
        `;
        document.head.appendChild(style);
    };

    const initMobileMenu = () => {
        const nav = document.querySelector('header nav') || document.querySelector('nav');
        if (!nav) return;

        const navLinks = nav.querySelector('.nav-links') || document.querySelector('.nav-links');
        if (!navLinks) return;

        if (nav.querySelector('.mobile-menu-toggle')) return;
        injectMobileMenuStyles();

        const toggle = document.createElement('button');
        toggle.className = 'mobile-menu-toggle';
        toggle.setAttribute('aria-label', 'Toggle navigation');
        toggle.setAttribute('aria-expanded', 'false');

        toggle.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
        nav.appendChild(toggle);

        const closeMenu = () => {
            navLinks.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        };

        toggle.addEventListener('click', (event) => {
            event.preventDefault();
            const isOpen = navLinks.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        document.addEventListener('click', (event) => {
            if (!nav.contains(event.target)) {
                closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                closeMenu();
            }
        });
    };

    const createProfileMenu = () => {
        const menu = document.createElement('div');
        menu.className = 'profile-menu';
        menu.innerHTML = `
            <button class="profile-button" aria-haspopup="true" aria-expanded="false">
                <span class="profile-initials">TM</span>
            </button>
            <div class="profile-dropdown" role="menu">
                <a href="/frontend/email-preferences.html" role="menuitem">User Settings</a>
                <a href="#" data-logout="true" role="menuitem">Logout</a>
            </div>
        `;
        return menu;
    };

    const initProfileMenu = (menu) => {
        const user = (() => {
            try {
                return JSON.parse(localStorage.getItem('user') || 'null');
            } catch (error) {
                return null;
            }
        })();

        const initialsEl = menu.querySelector('.profile-initials');
        if (initialsEl) {
            const name = user?.fullName || user?.name || user?.email || 'User';
            const initials = name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
            initialsEl.textContent = initials || 'TM';
        }

        const button = menu.querySelector('.profile-button');
        const dropdown = menu.querySelector('.profile-dropdown');
        const logoutLink = menu.querySelector('[data-logout="true"]');

        if (button && dropdown) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const isOpen = dropdown.classList.toggle('is-open');
                button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            document.addEventListener('click', (event) => {
                if (!dropdown.contains(event.target) && !button.contains(event.target)) {
                    dropdown.classList.remove('is-open');
                    button.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (logoutLink) {
            logoutLink.addEventListener('click', (event) => {
                event.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            });
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        initMobileMenu();
        const isAdminPage = window.location.pathname.includes('admin-');
        if (isAdminPage) {
            return;
        }
        if (document.querySelector('.profile-menu')) {
            document.querySelectorAll('.profile-menu').forEach(initProfileMenu);
            return;
        }

        const navContainers = document.querySelectorAll([
            '.nav-links',
            'nav',
            'header nav',
            '.navbar',
            '.nav-container',
            '.top-nav',
            '.nav',
            '.menu',
            '.header-actions',
            '.auth-links',
            '.breadcrumb'
        ].join(','));

        const findDashboardLink = (scope) => Array.from(scope.querySelectorAll('a')).find((anchor) => {
            const href = anchor.getAttribute('href') || '';
            const text = anchor.textContent.trim().toLowerCase();
            return href.includes('vendor-dashboard.html') || text === 'vendor dashboard' || text === 'dashboard';
        });

        let dashboardLink = null;
        if (navContainers.length) {
            for (const container of navContainers) {
                dashboardLink = findDashboardLink(container);
                if (dashboardLink) break;
            }
        }

        if (!dashboardLink) {
            const header = document.querySelector('header') || document.body;
            dashboardLink = findDashboardLink(header);
        }

        if (!dashboardLink) return;

        const menu = createProfileMenu();
        dashboardLink.replaceWith(menu);
        initProfileMenu(menu);
    });
})();



