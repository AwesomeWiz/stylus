export default function ActivityLoading() {
  return (
    <div aria-label="Loading activity" className="animate-pulse" role="status">
      <div className="bg-muted h-16 w-72 rounded-md" />
      <div className="mt-6 space-y-px border-y">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="bg-muted/60 h-16" key={index} />
        ))}
      </div>
      <span className="sr-only">Loading activity…</span>
    </div>
  );
}
