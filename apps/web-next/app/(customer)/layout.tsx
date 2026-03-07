import CustomerSidebar from '@/components/layout/CustomerSidebar';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell customer-shell">
      <CustomerSidebar />
      <main className="main customer-main">{children}</main>
    </div>
  );
}
