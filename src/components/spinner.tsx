export default function Spinner({ text = "Summoning..." }: { text?: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}
    </span>
  );
}
