export default function MemoryLoading() {
  return (
    <div
      aria-label="Loading company memory"
      className="animate-pulse"
      role="status"
    >
      <div className="bg-muted h-16 w-80 rounded-md" />
      <div className="mt-8 border-y py-5">
        <div className="bg-muted h-10 w-full rounded-md" />
        <div className="bg-muted mt-4 h-24 w-full rounded-md" />
      </div>
      <span className="sr-only">Loading company memory…</span>
    </div>
  );
}
