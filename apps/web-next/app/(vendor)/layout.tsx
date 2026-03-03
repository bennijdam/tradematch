import VendorSidebar from '@/components/layout/VendorSidebar';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <VendorSidebar />
      <main className="main">{children}</main>
    </div>
  );
}
