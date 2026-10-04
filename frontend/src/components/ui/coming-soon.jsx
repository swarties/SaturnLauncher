export function ComingSoon({ label }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-muted-foreground text-5xl font-extralight tracking-tight">
          {label}
        </p>
        <p className="text-muted-foreground text-sm font-thin">Coming Soon.</p>
      </div>
    </div>
  );
}
