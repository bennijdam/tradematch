'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardBridge() {
  const pathname = usePathname();
  const onVendor = pathname.startsWith('/vendor');
  const label = onVendor ? 'Switch to Customer View' : 'Switch to Pro Dashboard';
  const href = onVendor ? '/customer/dashboard' : '/vendor/dashboard';

  return (
    <Link href={href} style={{ display: 'inline-block', marginTop: '0.75rem' }} className="badge">
      {label}
    </Link>
  );
}
