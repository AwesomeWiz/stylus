export default function WhiteboardsLoading() {
  return (
    <div
      className="bg-muted/40 h-[calc(100dvh-4rem)] animate-pulse"
      role="status"
    >
      <span className="sr-only">Loading whiteboards</span>
    </div>
  );
}
