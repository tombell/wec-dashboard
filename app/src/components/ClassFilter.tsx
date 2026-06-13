interface Props {
  classes: string[];
  active: string;
  counts: Record<string, number>;
  onSelect: (cls: string) => void;
}

const CLASS_COLORS: Record<string, string> = {
  HYPERCAR: "border-hypercar text-hypercar",
  LMP2: "border-lmp2 text-lmp2",
  LMGT3: "border-lmgt3 text-lmgt3",
};

export default function ClassFilter({ classes, active, counts, onSelect }: Props) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {classes.map((cls) => {
        const isActive = cls === active;
        const color = cls === "All" ? "border-accent text-accent" : (CLASS_COLORS[cls] || "");
        return (
          <button
            key={cls}
            onClick={() => onSelect(cls)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors
              ${isActive
                ? `${color} bg-bg3`
                : "border-gray-700 text-muted hover:border-gray-500 hover:text-white"
              }`}
          >
            {cls === "All" ? "🏁 All" : cls}
            <span className="ml-1.5 opacity-60">({counts[cls] || 0})</span>
          </button>
        );
      })}
    </div>
  );
}
