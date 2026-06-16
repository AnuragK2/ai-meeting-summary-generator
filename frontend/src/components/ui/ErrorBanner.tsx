export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div className="font-medium">Something went wrong</div>
      <div className="mt-1 whitespace-pre-wrap">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-3">
          Try again
        </button>
      )}
    </div>
  );
}
