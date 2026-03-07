# TradeMatch Web Next

Modern Next.js App Router dashboard implementation with pixel-perfect parity to legacy HTML dashboards.

## Features

- **Pixel-Perfect Design**: 1:1 visual matching with legacy CSS
- **Multi-Tenant**: Role-based access control (Super Admin, Vendor, User)
- **Modern Stack**: Next.js 15, React 18, Tailwind CSS, Lucide Icons
- **Type-Safe**: Full TypeScript support
- **Accessible**: Built on Radix UI primitives

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
├── app/
│   └── (dashboards)/          # Dashboard route group
│       ├── layout.tsx         # Auth & tenant providers
│       ├── super-admin/       # Super Admin dashboard
│       ├── vendor/            # Vendor dashboard
│       └── user/              # User dashboard
├── components/
│   ├── dashboard/             # Dashboard-specific components
│   └── native/ui/             # Foundational UI components
├── hooks/                     # Custom React hooks
├── lib/                       # Utility functions
├── providers/                 # Context providers
└── styles/                    # Global styles
```

## Dashboard Routes

- `/dashboards/super-admin` - Super Admin Command Centre
- `/dashboards/vendor` - Vendor Dashboard
- `/dashboards/user` - User/Customer Dashboard

## Design System

### Colors

All colors extracted from legacy CSS:

- **Background**: `#050709` → `#1e2330` (bg-0 → bg-5)
- **Primary**: `#00E5A0` (neon green)
- **Danger**: `#FF4757`
- **Amber**: `#FFA726`
- **Blue**: `#42A5F5`
- **Text**: White with varying opacity (t1 → t4)

### Typography

- **Display**: Syne (Admin), Archivo (Vendor/User)
- **Mono**: JetBrains Mono
- **Body**: DM Sans

### Components

#### Foundational Five

1. **Button** - 7 variants, glow effects
2. **Card** - Panel, metric, accent styles
3. **Badge** - 8 color variants, dot support
4. **Table** - Sortable, specialized cells
5. **Modal** - Radix-based, panel styling

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Authentication

Uses JWT tokens stored in cookies:
- `token` - Access token
- `user` - User data (role, tenant, etc.)

## Multi-Tenancy

Tenant isolation via:
- JWT payload includes `tenantId`
- API calls automatically include tenant header
- Component-level feature gating
- Resource limits enforcement

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Targets

- FCP: < 1.5s
- TTI: < 3s
- Lighthouse: > 90

## License

MIT
