import type { Config } from 'tailwindcss';

/**
 * TradeMatch Unified Design System
 * Extracted from: super-admin-dashboard.html, user-dashboard.html, vendor-dashboard.html
 * Pixel-Perfect Parity Configuration v2.0
 */

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ========================================
      // COLORS - Extracted from Legacy HTML
      // Unified across all three dashboard variants
      // ========================================
      colors: {
        // Background Scale (Super Admin + User/Vendor unified)
        'tm-bg': {
          0: '#050709', // Super Admin deepest
          1: '#080C12', // User/Vendor primary
          2: '#0a0d14', // Super Admin bg-1
          3: '#0E1420', // User/Vendor secondary
          4: '#0f1219', // Super Admin bg-2
          5: '#111827', // User/Vendor card
          6: '#141720', // Super Admin bg-3
          7: '#141B28', // User/Vendor tertiary
          8: '#191d28', // Super Admin bg-4
          9: '#182030', // User/Vendor card hover
          10: '#1e2330', // Super Admin bg-5
        },
        
        // Legacy Backgrounds (Super Admin theme)
        'bg-0': '#050709',
        'bg-1': '#0a0d14',
        'bg-2': '#0f1219',
        'bg-3': '#141720',
        'bg-4': '#191d28',
        'bg-5': '#1e2330',
        'bg-card': '#1E2430',
        'bg-secondary': '#12161E',
        'bg-tertiary': '#1A1F2B',

        // Primary Accent (Neon Green)
        neon: {
          DEFAULT: '#00E5A0',
          dim: 'rgba(0,229,160,0.07)',
          'dim-v2': 'rgba(0,229,160,0.1)',
          glow: '0 0 18px rgba(0,229,160,0.28)',
          50: 'rgba(0,229,160,0.05)',
          100: 'rgba(0,229,160,0.10)',
          200: 'rgba(0,229,160,0.18)',
          300: 'rgba(0,229,160,0.25)',
          400: 'rgba(0,229,160,0.35)',
        },

        // Semantic Colors
        danger: {
          DEFAULT: '#FF4757',
          dim: 'rgba(255,71,87,0.08)',
        },
        amber: {
          DEFAULT: '#FFA726',
          dim: 'rgba(255,167,38,0.08)',
        },
        blue: {
          DEFAULT: '#42A5F5',
          dim: 'rgba(66,165,245,0.08)',
        },
        purple: {
          DEFAULT: '#B39DDB',
          dim: 'rgba(179,157,219,0.08)',
        },
        gold: {
          DEFAULT: '#FFD700',
          dim: 'rgba(255,215,0,0.08)',
        },
        sentinel: {
          DEFAULT: '#7C3AED',
          light: '#A78BFA',
          dim: 'rgba(124,58,237,0.09)',
        },

        // Text Colors
        t1: '#ffffff',
        t2: 'rgba(255,255,255,0.68)',
        t3: 'rgba(255,255,255,0.38)',
        t4: 'rgba(255,255,255,0.20)',

        // Borders
        border: {
          DEFAULT: 'rgba(255,255,255,0.055)',
          2: 'rgba(255,255,255,0.09)',
          3: 'rgba(255,255,255,0.13)',
          hover: 'rgba(255,255,255,0.16)',
        },
      },

      // ========================================
      // FONTS - From Legacy CSS
      // ========================================
      fontFamily: {
        // Syne for Super Admin (display/headings)
        syne: ['Syne', 'sans-serif'],
        // Sora for User/Vendor (display/headings)
        sora: ['Sora', 'sans-serif'],
        // JetBrains Mono for code/data (all dashboards)
        mono: ['JetBrains Mono', 'monospace'],
        // DM Sans for body text (all dashboards)
        dm: ['DM Sans', 'sans-serif'],
        // Archivo for User/Vendor
        archivo: ['Archivo', 'sans-serif'],
      },

      // ========================================
      // SPACING - From CSS Variables
      // ========================================
      spacing: {
        'sidebar': '218px',
        'sidebar-admin': '218px',
        'sidebar-user': '268px',
        'sidebar-vendor': '268px',
        'sidebar-lg': '280px',
        'sidebar-collapsed': '72px',
        'topbar': '54px',
        'topbar-admin': '54px',
        'topbar-user': '72px',
        'topbar-vendor': '72px',
        'topbar-lg': '72px',
      },

      // ========================================
      // BORDER RADIUS - Pixel Perfect
      // ========================================
      borderRadius: {
        'card': '11px',
        'card-lg': '16px',
        'card-xl': '18px',
        'card-2xl': '22px',
        'btn': '6px',
        'btn-lg': '12px',
        'badge': '100px',
        'dot': '50%',
      },

      // ========================================
      // BOX SHADOW - Neon Glows (Pixel-Perfect)
      // ========================================
      boxShadow: {
        // Neon Glow Effects
        'neon': '0 0 18px rgba(0,229,160,0.28)',
        'neon-lg': '0 0 28px rgba(0,229,160,0.35)',
        'neon-sm': '0 0 14px rgba(0,229,160,0.22)',
        'neon-admin': '0 0 18px rgba(0,229,160,0.28)',
        'neon-user': '0 0 28px rgba(0,229,160,0.35)',
        
        // Status Glows
        'danger': '0 0 6px rgba(255,71,87,0.5)',
        'amber': '0 0 6px rgba(255,167,38,0.4)',
        'blue': '0 0 10px rgba(66,165,245,0.25)',
        
        // Card Shadows
        'card': '0 2px 8px rgba(0,0,0,0.3)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.4)',
        'card-light': '0 1px 3px rgba(0,0,0,0.08)',
        'card-light-lg': '0 4px 12px rgba(0,0,0,0.1)',
        'card-user': '0 8px 32px rgba(0,0,0,0.4)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.5)',
        'modal': '0 24px 80px rgba(0,0,0,0.5)',
      },

      // ========================================
      // TRANSITIONS - From Legacy CSS
      // ========================================
      transitionDuration: {
        '150': '150ms',
        '180': '180ms',
        '200': '200ms',
        '220': '220ms',
        '280': '280ms',
        '300': '300ms',
      },
      
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.34,1.56,0.64,1)',
        'smooth': 'cubic-bezier(0.4,0,0.2,1)',
      },

      // ========================================
      // ANIMATIONS - Pixel-Perfect from Legacy
      // ========================================
      animation: {
        'pulse-slow': 'pulse 2s infinite',
        'pulse-fast': 'pulse 1s infinite',
        'fade-in': 'fadeIn 0.2s ease',
        'sla-pulse': 'slaPulse 1.5s infinite',
        'danger-pulse': 'dangerPulse 2s infinite',
        'pulse-dot': 'pulseDot 2s infinite',
        'ring-expand': 'ringExpand 2s infinite',
        'amber-pulse': 'amberPulse 2s infinite',
        'slide-in': 'slideIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        'dropup': 'dropup 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        'dropdown': 'dropdown 0.16s cubic-bezier(0.4,0,0.2,1)',
        'vendor-move': 'vendorMove 4s infinite alternate ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slaPulse: {
          '0%, 100%': { background: 'transparent' },
          '50%': { background: 'rgba(255,71,87,0.04)' },
        },
        dangerPulse: {
          '0%, 100%': { boxShadow: 'none' },
          '50%': { boxShadow: '0 0 0 2px rgba(255,71,87,0.15)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.6)' },
        },
        ringExpand: {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        amberPulse: {
          '0%, 100%': { boxShadow: 'none' },
          '50%': { boxShadow: '0 0 16px rgba(255,167,38,0.3)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        dropup: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        dropdown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        vendorMove: {
          '0%': { transform: 'translate(-30px, 20px)' },
          '100%': { transform: 'translate(20px, -10px)' },
        },
      },

      // ========================================
      // GRID TEMPLATES
      // ========================================
      gridTemplateColumns: {
        'dashboard': '1fr 320px',
        'dashboard-user': '1fr 360px',
        'wide': '2fr 1fr',
        'metrics-6': 'repeat(6, 1fr)',
        'metrics-4': 'repeat(4, 1fr)',
        'metrics-3': 'repeat(3, 1fr)',
        '12': 'repeat(12, minmax(0, 1fr))',
      },
      
      // ========================================
      // Z-INDEX SCALE
      // ========================================
      zIndex: {
        'sidebar': '200',
        'topnav': '100',
        'dropdown': '300',
        'search': '500',
        'modal': '1000',
        'toast': '9999',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
