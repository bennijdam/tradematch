export default function FullViewportFrame({
  src,
  title,
  background = '#0A0E14',
}: {
  src: string;
  title: string;
  background?: string;
}) {
  return (
    <iframe
      src={src}
      title={title}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: '0',
        zIndex: 2147483647,
        background,
      }}
    />
  );
}
