import { TECH_REGISTRY, type TechId } from "../constants/tech";

interface TechIconProps {
  id: TechId;
  isDark?: boolean;
}

export function TechIcon({ id, isDark = true }: TechIconProps) {
  const meta = TECH_REGISTRY[id];

  return (
    <div
      tabIndex={0}
      aria-label={meta.label}
      className={`group inline-flex items-center h-8 px-1.5 rounded-lg border select-none cursor-default outline-none transition-[background-color,border-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 focus-visible:-translate-y-0.5 ${
        isDark
          ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.09] hover:border-white/20 focus-visible:border-white/30"
          : "bg-neutral-100/80 border-neutral-200/90 hover:bg-white hover:border-neutral-300 hover:shadow-xs focus-visible:border-neutral-400"
      }`}
    >
      <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
        {meta.render(isDark)}
      </span>

      <span className="grid grid-cols-[0fr] group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <span className="overflow-hidden">
          <span
            className={`block pl-1.5 pr-1 text-[11.5px] font-medium tracking-tight whitespace-nowrap opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isDark ? "text-neutral-200" : "text-neutral-800"
            }`}
          >
            {meta.label}
          </span>
        </span>
      </span>
    </div>
  );
}
