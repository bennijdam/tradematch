import type { Config } from 'tailwindcss';

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
      // ========================================
      colors: {
        // Backgrounds (Super Admin theme)
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
        // Syne for Admin (display/headings)
        syne: ['Syne', 'sans-serif'],
        // JetBrains Mono for code/data
        mono: ['JetBrains Mono', 'monospace'],
        // DM Sans for body text (Super Admin)
        dm: ['DM Sans', 'sans-serif'],
        // Archivo for User/Vendor
        archivo: ['Archivo', 'sans-serif'],
        // Sora for modern feel
        sora: ['Sora', 'sans-serif'],
      },
      
      // ========================================
      // SPACING - From CSS Variables
      // ========================================
      spacing: {
        'sidebar': '218px',
        'sidebar-lg': '280px',
        'topbar': '54px',
        'topbar-lg': '72px',
      },
      
      // ========================================
      // BORDER RADIUS - Pixel Perfect
      // ========================================
      borderRadius: {
        'card': '11px',
        'card-lg': '16px',
        'btn': '6px',
        'btn-lg': '12px',
        'badge': '100px',
        'dot': '50%',
      },
      
      // ========================================
      // BOX SHADOW - Neon Glows
      // ========================================
      boxShadow: {
        'neon': '0 0 18px rgba(0,229,160,0.28)',
        'neon-lg': '0 0 28px rgba(0,229,160,0.35)',
        'neon-sm': '0 0 6px rgba(0,229,160,0.5)',
        'danger': '0 0 6px rgba(255,71,87,0.5)',
        'amber': '0 0 6px rgba(255,167,38,0.4)',
        'card': '0 2px 8px rgba(0,0,0,0.3)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.4)',
        'card-light': '0 1px 3px rgba(0,0,0,0.08)',
        'card-light-lg': '0 4px 12px rgba(0,0,0,0.1)',
      },
      
      // ========================================
      // TRANSITIONS - From Legacy CSS
      // ========================================
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      
      // ========================================
      // ANIMATIONS
      // ========================================
      animation: {
        'pulse-slow': 'pulse 2s infinite',
        'pulse-fast': 'pulse 1s infinite',
        'fade-in': 'fadeIn 0.2s ease',
        'sla-pulse': 'slaPulse 1.5s infinite',
        'danger-pulse': 'dangerPulse 2s infinite',
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
      },
      
      // ========================================
      // GRID TEMPLATES
      // ========================================
      gridTemplateColumns: {
        'dashboard': '1fr 320px',
        'wide': '2fr 1fr',
        'metrics-6': 'repeat(6, 1fr)',
        'metrics-4': 'repeat(4, 1fr)',
        'metrics-3': 'repeat(3, 1fr)',
        '12': 'repeat(12, minmax(0, 1fr))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
