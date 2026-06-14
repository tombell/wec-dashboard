import { useState, Fragment } from "react";

import type { CarEntry } from "@/types";

interface Props {
  entries: CarEntry[];
  activeClass: string;
}

const CAT_COLORS: Record<string, string> = {
  HYPERCAR: "border-l-hypercar",
  LMP2: "border-l-lmp2",
  LMGTEPro: "border-l-lmgt3",
  LMGTEAm: "border-l-lmgt3",
};

const CAT_BADGE: Record<string, string> = {
  HYPERCAR: "bg-hypercar/20 text-hypercar",
  LMP2: "bg-lmp2/20 text-lmp2",
  LMGTEPro: "bg-lmgt3/20 text-lmgt3",
  LMGTEAm: "bg-lmgt3/20 text-lmgt3",
};

const SECTOR_COLORS: Record<string, string> = {
  HYPERCAR: "bg-hypercar",
  LMP2: "bg-lmp2",
  LMGTEPro: "bg-lmgt3",
  LMGTEAm: "bg-lmgt3",
};

const FLAGS: Record<string, string> = {
  NED: "🇳🇱",
  GBR: "🇬🇧",
  FRA: "🇫🇷",
  DEU: "🇩🇪",
  ITA: "🇮🇹",
  ESP: "🇪🇸",
  CHE: "🇨🇭",
  AUT: "🇦🇹",
  BEL: "🇧🇪",
  DNK: "🇩🇰",
  SWE: "🇸🇪",
  FIN: "🇫🇮",
  NOR: "🇳🇴",
  PRT: "🇵🇹",
  GRC: "🇬🇷",
  IRL: "🇮🇪",
  POL: "🇵🇱",
  CZE: "🇨🇿",
  HUN: "🇭🇺",
  ROU: "🇷🇴",
  RUS: "🇷🇺",
  USA: "🇺🇸",
  CAN: "🇨🇦",
  MEX: "🇲🇽",
  BRA: "🇧🇷",
  ARG: "🇦🇷",
  CHL: "🇨🇱",
  COL: "🇨🇴",
  JPN: "🇯🇵",
  CHN: "🇨🇳",
  AUS: "🇦🇺",
  NZL: "🇳🇿",
  ZAF: "🇿🇦",
  MYS: "🇲🇾",
  ARE: "🇦🇪",
  IND: "🇮🇳",
  THA: "🇹🇭",
  ISR: "🇮🇱",
  TUR: "🇹🇷",
  UKR: "🇺🇦",
  MCO: "🇲🇨",
  LBN: "🇱🇧",
  SUI: "🇨🇭",
};

function formatGap(gap: string, gapLaps?: string): string {
  if (gapLaps && gapLaps !== "-" && gapLaps !== "") return gapLaps;
  if (!gap || gap === "" || gap === "-") return "--";
  return gap;
}

function formatTime(time: string): string {
  if (!time || time === "" || time === "-") return "--:--.---";
  return time;
}

function getDriverCountry(entry: CarEntry): string {
  if (entry.drivers && entry.drivers.length > 0) {
    return entry.drivers[0].country || "";
  }
  return entry.nationality || "";
}

function SectorIndicator({ sector, category }: { sector: number; category: string }) {
  const activeColor = SECTOR_COLORS[category] || "bg-white";
  return (
    <div className="inline-flex items-center gap-[3px]" title={`Sector ${sector}`}>
      {[1, 2, 3].map((s) => (
        <span
          key={s}
          className={`inline-block h-2.5 w-2.5 rounded-full transition-colors ${
            s === sector ? activeColor : "bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

function PosChange({ change }: { change: number }) {
  if (change === 0) return null;
  const up = change > 0;
  return (
    <span
      className={`inline-flex items-center text-xs font-bold ${
        up ? "text-green-400" : "text-red-400"
      }`}
      title={up ? `+${change} pos` : `${change} pos`}
    >
      {up ? "▲" : "▼"}
      <span className="ml-0.5 tabular-nums">{Math.abs(change)}</span>
    </span>
  );
}

export default function Leaderboard({ entries, activeClass }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const colCount = activeClass === "All" ? 12 : 11;

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <p>No cars in this class</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-bg2">
      <table className="w-full table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-muted">
            <th className="w-12 px-2 py-3 sm:px-4">Pos</th>
            <th className="w-14 px-1 py-3">#</th>
            <th className="w-1/4 px-2 py-3 sm:px-4">Driver</th>
            <th className="hidden w-1/4 px-2 py-3 md:table-cell">Team</th>
            <th className="hidden w-1/5 px-2 py-3 lg:table-cell">Car</th>
            <th className="w-16 px-2 py-3 text-right">Laps</th>
            <th className="w-24 px-2 py-3 text-right">Best</th>
            <th className="hidden w-24 px-2 py-3 text-right sm:table-cell">Last</th>
            <th className="hidden w-24 px-2 py-3 text-right md:table-cell">Gap</th>
            <th className="w-20 px-1 py-3 text-center">Sector</th>
            <th className="w-16 px-2 py-3 text-right">Δ</th>
            {activeClass === "All" && <th className="w-16 px-2 py-3 text-right">Class</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((car) => {
            const isExpanded = expandedId === car.id;
            const borderColor = CAT_COLORS[car.category] || "border-l-gray-600";
            const flag = FLAGS[getDriverCountry(car)] || "";

            return (
              <Fragment key={car.id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : car.id)}
                  className={`cursor-pointer border-b border-gray-800/50 transition-colors hover:bg-white/5 ${borderColor} border-l-2`}
                >
                  <td className="px-2 py-2.5 sm:px-4">
                    <span
                      className={`font-bold tabular-nums ${
                        car.ranking === 1 ? "text-leader" : "text-white"
                      }`}
                    >
                      {car.ranking === 1
                        ? "🥇"
                        : car.ranking === 2
                          ? "🥈"
                          : car.ranking === 3
                            ? "🥉"
                            : car.ranking}
                    </span>
                  </td>
                  <td className="px-1 py-2.5">
                    <span className="font-mono font-bold text-white">#{car.number}</span>
                  </td>
                  <td className="truncate px-2 py-2.5 sm:px-4">
                    <div className="flex items-center gap-1.5">
                      {flag && <span className="text-base leading-none shrink-0">{flag}</span>}
                      <span className="truncate font-semibold text-white">{car.driver}</span>
                    </div>
                  </td>
                  <td className="hidden truncate px-2 py-2.5 md:table-cell">
                    <span className="block truncate text-gray-300">{car.team}</span>
                  </td>
                  <td className="hidden truncate px-2 py-2.5 lg:table-cell">
                    <span className="block truncate text-sm text-gray-400">{car.car}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{car.lap}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-green-400">
                    {formatTime(car.bestLap)}
                  </td>
                  <td className="hidden px-2 py-2.5 text-right font-mono tabular-nums sm:table-cell">
                    {formatTime(car.lastlap)}
                  </td>
                  <td className="hidden px-2 py-2.5 text-right font-mono tabular-nums md:table-cell">
                    {formatGap(car.gap, car.gapLaps)}
                  </td>
                  <td className="px-1 py-2.5 text-center">
                    <SectorIndicator sector={car.sector} category={car.category} />
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <PosChange change={car.positionChange} />
                  </td>
                  {activeClass === "All" && (
                    <td className="px-2 py-2.5 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          CAT_BADGE[car.category] || "bg-gray-700 text-gray-300"
                        }`}
                      >
                        P{car.categoryPosition}
                      </span>
                    </td>
                  )}
                </tr>

                {isExpanded && (
                  <tr className="border-b border-gray-800/30 bg-bg3/50">
                    <td colSpan={colCount} className="px-4 py-3">
                      <CarDetail car={car} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CarDetail({ car }: { car: CarEntry }) {
  const drivers = car.drivers || [];
  const flag = FLAGS[getDriverCountry(car)] || "";

  return (
    <div className="space-y-3">
      {drivers.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs">
          {drivers.map((d, i) => (
            <span key={i} className="flex items-center gap-1 rounded-md bg-bg2 px-2 py-1">
              {FLAGS[d.country] && <span>{FLAGS[d.country]}</span>}
              <span className="font-semibold text-white">
                {d.firstName} {d.lastName}
              </span>
              <span className="text-muted">{d.license}</span>
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <DetailItem label="Speed" value={`${car.speed} km/h`} />
        <DetailItem label="Best S1" value={formatTime(car.bestSector1)} />
        <DetailItem label="Best S2" value={formatTime(car.bestSector2)} />
        <DetailItem label="Best S3" value={formatTime(car.bestSector3)} />
        <DetailItem label="Curr S1" value={formatTime(car.currentSector1)} />
        <DetailItem label="Curr S2" value={formatTime(car.currentSector2)} />
        <DetailItem label="Curr S3" value={formatTime(car.currentSector3)} />
        <DetailItem label="2nd Best" value={formatTime(car.secondBestLap)} />
        <DetailItem label="Class Gap" value={formatGap(car.classGap, car.classGapLaps)} />
        <DetailItem label="Gap to Prev" value={formatGap(car.gapPrev, car.gapPrevLaps)} />
        <DetailItem label="Class Pos" value={`P${car.categoryPosition}`} />
        <DetailItem
          label="Class Δ"
          value={`${car.categoryPositionChange > 0 ? "+" : ""}${car.categoryPositionChange}`}
        />
        <DetailItem
          label="Tyre"
          value={car.tyre === "M" ? "Michelin" : car.tyre === "G" ? "Goodyear" : car.tyre || "--"}
        />
        <DetailItem
          label="State"
          value={car.state === "In" ? "On Track" : car.state === "Out" ? "In Pits" : car.state}
        />
        <DetailItem label="Pitstops" value={String(car.pitstop)} />
        <DetailItem label="Nat" value={flag ? `${flag} ${getDriverCountry(car)}` : "--"} />
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted mb-0.5 uppercase tracking-wider">{label}</div>
      <div className="font-mono font-semibold text-white">{value}</div>
    </div>
  );
}
