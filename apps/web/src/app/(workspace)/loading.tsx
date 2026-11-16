export default function WorkspaceLoading() {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      className="animate-pulse space-y-6"
    >
      <div aria-hidden="true" className="bg-muted h-8 w-48 rounded-md" />
      <div aria-hidden="true" className="bg-muted h-10 rounded-md" />
      <div aria-hidden="true" className="space-y-2">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="bg-muted h-12 rounded-md" />
        ))}
      </div>
      <span className="sr-only">Loading destination content</span>
    </div>
  );
}
