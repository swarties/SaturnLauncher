export function Fade({
  children,
  delay = 0,
  duration = 35,
  up = 8,
  className = '',
}) {
  return (
    <div
      className={className}
      style={{
        animation: `fade-in-up ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
        '--fade-up': `${up}px`,
      }}
    >
      {children}
    </div>
  );
}
