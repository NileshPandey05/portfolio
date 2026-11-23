import { Eye } from "lucide-react";
import { useVisitorCount } from "../hooks/useVisitorCount";
import type { NavSection } from "./Navbar";
import { PLATFORM_ICONS, type SocialLink } from "./SocialIcon";

export interface FooterNavItem {
  label: string;
  targetId: string;
  navSection?: NavSection;
}

interface FooterProps {
  name: string;
  navItems: FooterNavItem[];
  socialLinks: SocialLink[];
  onSelectSection?: (section: NavSection) => void;
  isDark?: boolean;
}

export function Footer({
  name,
  navItems,
  socialLinks,
  onSelectSection,
  isDark = true,
}: FooterProps) {
  const year = new Date().getFullYear();
  const { count, isRefreshing, refresh } = useVisitorCount();

  const handleNavigate = (item: FooterNavItem) => {
    if (item.navSection) {
      onSelectSection?.(item.navSection);
    }
    const el = document.getElementById(item.targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer
      className={`border-t transition-colors duration-500 ${
        isDark ? "border-white/10" : "border-neutral-900/10"
      }`}
    >
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        {/* Top Two-Column Area: NAVIGATE & CONNECT */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          {/* Left: NAVIGATE */}
          <div className="space-y-3.5">
            <h2
              className={`text-[11px] font-medium tracking-widest uppercase transition-colors duration-300 ${
                isDark ? "text-neutral-500" : "text-neutral-500"
              }`}
            >
              Navigate
            </h2>
            <nav aria-label="Footer Navigation">
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-2.5 max-w-sm">
                {navItems.map((item) => (
                  <li key={item.targetId}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(item)}
                      className={`text-xs sm:text-[13.5px] transition-colors duration-200 cursor-pointer outline-none focus-visible:underline ${
                        isDark
                          ? "text-neutral-400 hover:text-neutral-100"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Right: CONNECT */}
          <div className="space-y-3.5">
            <h2
              className={`text-[11px] font-medium tracking-widest uppercase transition-colors duration-300 ${
                isDark ? "text-neutral-500" : "text-neutral-500"
              }`}
            >
              Connect
            </h2>
            <div className="flex flex-wrap items-center gap-2.5">
              {socialLinks.map((link) => {
                const Icon = PLATFORM_ICONS[link.platform];
                const isExternal = !link.href.startsWith("mailto:");

                return (
                  <a
                    key={link.platform}
                    href={link.href}
                    aria-label={link.label}
                    title={link.label}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 ${
                      isDark
                        ? "bg-white/[0.03] border-white/10 text-neutral-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 focus-visible:ring-white/30"
                        : "bg-neutral-100/70 border-neutral-200/90 text-neutral-500 hover:text-neutral-900 hover:bg-white hover:border-neutral-300 focus-visible:ring-neutral-900/25"
                    }`}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Hairline, Copyright & Visitor Counter */}
        <div
          className={`pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors duration-500 ${
            isDark ? "border-white/10" : "border-neutral-900/10"
          }`}
        >
          <p
            className={`text-xs transition-colors duration-300 ${
              isDark ? "text-neutral-500" : "text-neutral-500"
            }`}
          >
            &copy; {year} {name}. All rights reserved.
          </p>

          <button
            type="button"
            onClick={() => void refresh()}
            title="Total portfolio visits (click to refresh)"
            aria-label={
              count !== null
                ? `${count.toLocaleString()} visitors`
                : "Visitor count"
            }
            className={`inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-full border text-[11.5px] font-mono tabular-nums transition-all duration-200 cursor-pointer ${
              isDark
                ? "bg-white/[0.03] border-white/10 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.07] hover:border-white/20"
                : "bg-neutral-100/80 border-neutral-200/90 text-neutral-600 hover:text-neutral-900 hover:bg-white hover:border-neutral-300"
            }`}
          >
            <Eye
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-pulse" : ""}`}
            />
            <span>
              {count !== null ? count.toLocaleString() : "—"} visitors
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
