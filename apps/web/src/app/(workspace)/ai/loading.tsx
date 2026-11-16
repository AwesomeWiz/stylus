export default function AILoading() {
  return (
    <div
      aria-label="Loading AI settings"
      className="animate-pulse"
      role="status"
    >
      <div className="bg-muted h-16 w-80 rounded-md" />
      <div className="mt-8 border-y py-5">
        <div className="bg-muted h-10 w-full rounded-md" />
        <div className="bg-muted mt-4 h-10 w-2/3 rounded-md" />
      </div>
      <span className="sr-only">Loading AI settings…</span>
    </div>
  );
}
