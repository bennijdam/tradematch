/**
 * SACRED LAYOUT - Bypasses standard Next.js layout
 * 
 * This layout returns children ONLY, giving the Sacred Shell
 * 100% control over the viewport. No duplicate topbars, no squashing.
 */

export default function SacredLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sacred-root">
      {children}
    </div>
  );
}
