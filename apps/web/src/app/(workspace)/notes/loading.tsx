export default function NotesLoading() {
  return (
    <div
      role="status"
      aria-label="Loading working Notes"
      className="space-y-4 motion-safe:animate-pulse"
    >
      <div className="bg-muted h-8 w-56 max-w-full rounded-md" />
      <div className="bg-muted h-11 rounded-md" />
      <div className="divide-y border-y">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-muted/40 h-16" />
        ))}
      </div>
      <span className="sr-only">Loading working Notes…</span>
    </div>
  );
}
