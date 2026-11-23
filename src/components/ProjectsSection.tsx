import { ArrowUpRight } from "lucide-react";
import type { TechId } from "../constants/tech";
import { TechIcon } from "./TechIcon";

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  githubUrl: string;
  liveUrl?: string;
  technologies: TechId[];
}

interface ProjectsSectionProps {
  projects: ProjectItem[];
  isDark?: boolean;
}

export function ProjectsSection({
  projects,
  isDark = true,
}: ProjectsSectionProps) {
  return (
    <section
      id="project"
      aria-labelledby="projects-heading"
      className="scroll-mt-24 pt-2 pb-20 space-y-6"
    >
      <div className="space-y-1">
        <h2
          id="projects-heading"
          className={`text-xl sm:text-[22px] font-semibold tracking-tight transition-colors duration-300 ${
            isDark ? "text-neutral-100" : "text-neutral-900"
          }`}
        >
          Projects
        </h2>
        <p
          className={`text-xs sm:text-[13px] transition-colors duration-300 ${
            isDark ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          Selected builds from GitHub — full-stack apps, 3D shaders, and backend systems.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <article
            key={project.id}
            className={`group rounded-xl border p-4 sm:p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isDark
                ? "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20"
                : "bg-neutral-50/70 border-neutral-200/80 hover:bg-white hover:border-neutral-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                className={`text-base sm:text-[17px] font-semibold tracking-tight truncate transition-colors duration-300 ${
                  isDark ? "text-neutral-100" : "text-neutral-900"
                }`}
              >
                {project.name}
              </h3>

              <div className="flex items-center gap-1.5 shrink-0">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.name} live demo`}
                    title="Live Demo"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors duration-200 ${
                      isDark
                        ? "bg-white/[0.05] border-white/10 text-neutral-200 hover:bg-white/10 hover:border-white/20"
                        : "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                    }`}
                  >
                    <span>Live</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                )}

                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.name} GitHub repository`}
                  title="GitHub Repository"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors duration-200 ${
                    isDark
                      ? "bg-white/[0.03] border-white/10 text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.08]"
                      : "bg-neutral-100 border-neutral-200/90 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60"
                  }`}
                >
                  <span>Code</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            <p
              className={`mt-2 text-xs sm:text-[13.5px] leading-relaxed transition-colors duration-300 ${
                isDark ? "text-neutral-400" : "text-neutral-600"
              }`}
            >
              {project.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {project.technologies.map((tech) => (
                <TechIcon key={tech} id={tech} isDark={isDark} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProjectsSection;
