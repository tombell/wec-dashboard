import { useState, useEffect, useCallback } from "react";

import { fetchCurrent } from "@/api/client";
import ClassFilter from "@/components/ClassFilter";
import Leaderboard from "@/components/Leaderboard";
import SessionInfo from "@/components/SessionInfo";
import WeatherWidget from "@/components/WeatherWidget";
import type { ApiCurrent, CarEntry } from "@/types";

const CLASSES = ["All", "HYPERCAR", "LMP2", "LMGT3"];

function getClassFromCategory(cat: string): string {
  if (cat === "HYPERCAR") return "HYPERCAR";
  if (cat === "LMP2") return "LMP2";
  return "LMGT3";
}

function getClassCounts(entries: CarEntry[]): Record<string, number> {
  const counts: Record<string, number> = { All: entries.length };
  for (const e of entries) {
    const cls = getClassFromCategory(e.category);
    counts[cls] = (counts[cls] || 0) + 1;
  }
  return counts;
}

export default function App() {
  const [data, setData] = useState<ApiCurrent | null>(null);
  const [activeClass, setActiveClass] = useState("All");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await fetchCurrent();
      setData(d);
      setLoading(false);
    } catch {
      // retry
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const filteredEntries: CarEntry[] = data?.entries
    ? activeClass === "All"
      ? data.entries
      : data.entries.filter((e) => getClassFromCategory(e.category) === activeClass)
    : [];

  return (
    <div className="min-h-screen bg-bg text-gray-200">
      <header className="border-b border-gray-800 bg-bg2 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏁</span>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">
              WEC <span className="text-accent">Live</span>
            </h1>
            {data?.live && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="live-dot inline-block h-2 w-2 rounded-full bg-green-400" />
                LIVE
              </span>
            )}
          </div>
          {data?.session && <SessionInfo session={data.session} />}
        </div>
      </header>

      {data?.session?.weather && (
        <div className="border-b border-gray-800 bg-bg2/50 px-4 py-2 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <WeatherWidget weather={data.session.weather} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-2 py-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-accent" />
            <span className="ml-3">Connecting...</span>
          </div>
        ) : !data?.live ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted">
            <span className="text-4xl mb-4">⏳</span>
            <p>No live session</p>
          </div>
        ) : (
          <>
            <ClassFilter
              classes={CLASSES}
              active={activeClass}
              counts={getClassCounts(data?.entries || [])}
              onSelect={setActiveClass}
            />
            <Leaderboard entries={filteredEntries} activeClass={activeClass} />
          </>
        )}
      </main>

      <footer className="border-t border-gray-800 px-4 py-3 text-center text-xs text-muted">
        Data: FIA WEC / Al Kamel Systems
        {data?.updated_at && <> &middot; {new Date(data.updated_at).toLocaleTimeString()}</>}
      </footer>
    </div>
  );
}
