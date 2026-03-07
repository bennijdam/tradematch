import styles from './DashboardLayout.module.css';

export default function DashboardLayout({
  mode,
  sidebar,
  children,
}: {
  mode: 'full' | 'lite';
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell} data-mode={mode}>
      {sidebar}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
