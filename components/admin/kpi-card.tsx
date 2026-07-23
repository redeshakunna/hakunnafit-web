export function KpiCard({
  icon,
  label,
  value,
  tone = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "blue" | "purple" | "green" | "pink" | "amber";
}) {
  const tones: Record<string, string> = {
    blue: "bg-hf-blue/15 text-hf-blue",
    purple: "bg-hf-purple/15 text-hf-purple",
    green: "bg-emerald-500/15 text-emerald-400",
    pink: "bg-hf-fuchsia/15 text-hf-fuchsia",
    amber: "bg-amber-500/15 text-amber-400",
  };

  return (
    <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <p className="mt-3 text-[13px] text-white/50">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
