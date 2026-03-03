import CustomerSidebar from '@/components/layout/CustomerSidebar';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <CustomerSidebar />
      <main className="main">{children}</main>
    </div>
  );
}
