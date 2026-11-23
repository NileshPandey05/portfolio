import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { TechId } from "../constants/tech";
import { TechIcon } from "./TechIcon";

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  status?: string;
  period: string;
  location: string;
  technologies: TechId[];
  highlights: string[];
  defaultExpanded?: boolean;
}

interface ExperienceSectionProps {
  experiences: ExperienceItem[];
  isDark?: boolean;
}

function RevealLine({
  show,
  delayMs,
  children,
  className = "",
}: {
  show: boolean;
  delayMs: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      style={{ transitionDelay: show ? `${delayMs}ms` : "0ms" }}
      className={`transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function ExperienceCard({
  item,
  isDark,
}: {
  item: ExperienceItem;
  isDark: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(item.defaultExpanded ?? false);

  return (
    <div>
      {/* Header Row (click anywhere on row or chevron to toggle) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="group flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 cursor-pointer select-none outline-none rounded-lg -mx-2 px-2 py-1.5 transition-colors duration-200 hover:bg-white/[0.02] light:hover:bg-neutral-900/[0.02]"
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3
              className={`text-base sm:text-[17px] font-semibold tracking-tight transition-colors duration-300 ${
                isDark ? "text-neutral-100" : "text-neutral-900"
              }`}
            >
              {item.company}
            </h3>

            {item.status && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors duration-300 ${
                  isDark
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-emerald-500/15 text-emerald-700"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {item.status}
              </span>
            )}

            <span
              aria-hidden="true"
              className={`inline-flex items-center justify-center w-6 h-6 rounded-md border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isDark
                  ? "bg-white/[0.04] border-white/10 text-neutral-400 group-hover:text-neutral-200 group-hover:bg-white/[0.08]"
                  : "bg-neutral-100 border-neutral-200/90 text-neutral-600 group-hover:text-neutral-900 group-hover:bg-neutral-200/60"
              }`}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isExpanded ? "rotate-0" : "-rotate-90"
                }`}
              />
            </span>
          </div>

          <p
            className={`text-xs sm:text-[13px] transition-colors duration-300 ${
              isDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            {item.role}
          </p>
        </div>

        <div className="sm:text-right space-y-0.5 shrink-0">
          <p
            className={`text-xs sm:text-[13px] transition-colors duration-300 ${
              isDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            {item.period}
          </p>
          <p
            className={`text-xs sm:text-[13px] transition-colors duration-300 ${
              isDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            {item.location}
          </p>
        </div>
      </div>

      {/* Smooth Accordion + Masked Text Reveal */}
      <div
        aria-hidden={!isExpanded}
        className={`grid transition-[grid-template-rows,opacity] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`mt-3 pt-4 border-t space-y-5 transition-colors duration-300 ${
              isDark ? "border-white/10" : "border-neutral-200/80"
            }`}
          >
            {/* Technologies & Tools */}
            <div className="space-y-2.5">
              <RevealLine show={isExpanded} delayMs={40}>
                <h4
                  className={`text-xs sm:text-[13px] font-semibold tracking-tight transition-colors duration-300 ${
                    isDark ? "text-neutral-200" : "text-neutral-800"
                  }`}
                >
                  Technologies &amp; Tools
                </h4>
              </RevealLine>

              <RevealLine show={isExpanded} delayMs={90}>
                <div className="flex flex-wrap items-center gap-2">
                  {item.technologies.map((tech) => (
                    <TechIcon key={tech} id={tech} isDark={isDark} />
                  ))}
                </div>
              </RevealLine>
            </div>

            {/* What I've done */}
            <div className="space-y-2">
              <RevealLine show={isExpanded} delayMs={130}>
                <h4
                  className={`text-xs sm:text-[13px] font-semibold tracking-tight transition-colors duration-300 ${
                    isDark ? "text-neutral-200" : "text-neutral-800"
                  }`}
                >
                  What I&apos;ve done
                </h4>
              </RevealLine>

              <ul className="space-y-1.5">
                {item.highlights.map((point, index) => (
                  <li key={index}>
                    <RevealLine
                      show={isExpanded}
                      delayMs={170 + index * 55}
                      className={`flex items-start gap-2.5 text-xs sm:text-[13.5px] leading-relaxed transition-colors duration-300 ${
                        isDark ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-[7px] w-1 h-1 shrink-0 rounded-[1px] ${
                          isDark ? "bg-neutral-500" : "bg-neutral-400"
                        }`}
                      />
                      <span>{point}</span>
                    </RevealLine>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExperienceSection({
  experiences,
  isDark = true,
}: ExperienceSectionProps) {
  return (
    <section aria-labelledby="experience-heading" className="space-y-4">
      <h2
        id="experience-heading"
        className={`text-xl sm:text-[22px] font-semibold tracking-tight transition-colors duration-300 ${
          isDark ? "text-neutral-100" : "text-neutral-900"
        }`}
      >
        Experience
      </h2>

      <div className="space-y-6">
        {experiences.map((item) => (
          <ExperienceCard key={item.id} item={item} isDark={isDark} />
        ))}
      </div>
    </section>
  );
}

export default ExperienceSection;
