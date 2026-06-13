import type { SessionData } from "@/types";

function formatFlag(flag: string): string {
  switch (flag) {
    case "green": return "🟢";
    case "yellow": return "🟡";
    case "red": return "🔴";
    case "fullcourse": return "🟡 FCY";
    case "safetycar": return "🟡 SC";
    default: return flag;
  }
}

export default function SessionInfo({ session }: { session: SessionData }) {
  const progress = session.duration > 0
    ? Math.round((session.elapsed_seconds / session.duration) * 100)
    : 0;

  return (
    <div className="flex items-center gap-4 text-xs sm:text-sm">
      <div className="hidden sm:block text-right">
        <div className="font-semibold text-white">{session.event_name}</div>
        <div className="text-muted">#{session.session_id}</div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-bg3 px-3 py-1.5 font-mono">
        <span className="text-muted">⏱</span>
        <span className="font-bold tabular-nums text-white">
          {session.elapsed_time}
        </span>
      </div>
      <div className="hidden sm:block w-24 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="hidden sm:block text-xs text-muted tabular-nums w-10 text-right">
        {progress}%
      </div>
      <div className="rounded-lg bg-bg3 px-3 py-1.5 text-lg leading-none" title={session.flag_state}>
        {formatFlag(session.flag_state)}
      </div>
      {session.safety_car && (
        <div className="rounded-lg bg-yellow-600/20 px-2 py-1 text-xs text-yellow-400 font-semibold">
          SC
        </div>
      )}
    </div>
  );
}
