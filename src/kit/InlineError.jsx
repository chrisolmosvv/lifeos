// LifeOS — Health kit: a calm inline error + retry (V2), replacing a crashed/blank
// screen on a fetch failure. No alarm colour, no box — a quiet line + a retry button.
//   message — what went wrong (plain).  onRetry — re-run the load.
export default function InlineError({ message, onRetry }) {
  return (
    <div className="inline-error">
      <p className="inline-error-msg">Couldn’t load this. {message}</p>
      {onRetry && (
        <button type="button" className="inline-error-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
