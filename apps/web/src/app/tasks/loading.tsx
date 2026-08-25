export default function TasksLoading() {
  return (
    <div
      aria-label="Loading tasks"
      className="animate-pulse space-y-5"
      role="status"
    >
      <div className="bg-muted h-16 w-72 rounded-md" />
      <div className="bg-muted h-10 w-full rounded-md" />
      <div className="space-y-px overflow-hidden rounded-md border">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="bg-muted/60 h-14" key={index} />
        ))}
      </div>
      <span className="sr-only">Loading tasks…</span>
    </div>
  );
}
