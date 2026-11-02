export default function WhiteboardsLoading() {
  return (
    <main
      aria-label="Loading board"
      className="bg-background flex h-dvh flex-col"
      role="status"
    >
      <div className="h-12 shrink-0 border-b" />
      <div className="bg-muted/40 flex-1 animate-pulse motion-reduce:animate-none" />
      <h1 className="sr-only">Loading board</h1>
    </main>
  );
}
