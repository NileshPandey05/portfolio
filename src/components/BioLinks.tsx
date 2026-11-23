import type { ReactNode } from "react";

export type SocialPlatform = "x" | "linkedin" | "github" | "email";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

export interface SpotifyTrack {
  track: string;
  artist: string;
  href?: string;
}

interface BioLinksProps {
  description: string;
  links: SocialLink[];
  spotify?: SpotifyTrack;
  isDark?: boolean;
}

function XLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[18px] h-[18px]"
      aria-hidden="true"
    >
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[18px] h-[18px]"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 11v5" />
      <path d="M8 8v.01" />
      <path d="M12 16v-5" />
      <path d="M16 16v-3a2 2 0 1 0 -4 0" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[18px] h-[18px]"
      aria-hidden="true"
    >
      <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />
    </svg>
  );
}

function EmailLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[18px] h-[18px]"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 7l9 6l9 -6" />
    </svg>
  );
}

function SpotifyLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#1DB954" />
      <path
        d="M7.5 9.6c3.2 -1 6.7 -.8 9.4 .6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.3 12.6c2.6 -.8 5.4 -.6 7.6 .5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.1 15.4c2 -.5 4.1 -.4 5.9 .4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const PLATFORM_ICONS: Record<SocialPlatform, () => ReactNode> = {
  x: XLogo,
  linkedin: LinkedInLogo,
  github: GitHubLogo,
  email: EmailLogo,
};

export function BioLinks({
  description,
  links,
  spotify,
  isDark = true,
}: BioLinksProps) {
  return (
    <div className="space-y-4">
      <p
        className={`text-sm sm:text-[15px] leading-relaxed max-w-xl transition-colors duration-300 ${
          isDark ? "text-neutral-300" : "text-neutral-600"
        }`}
      >
        {description}
      </p>

      {spotify && (
        <div>
          <a
            href={spotify.href ?? "https://open.spotify.com"}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-xs sm:text-[13px] transition-colors duration-200 ${
              isDark
                ? "text-neutral-400 hover:text-neutral-200"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <SpotifyLogo />
            <span>
              Last played — {spotify.track} · {spotify.artist}
            </span>
          </a>
        </div>
      )}

      <div className="flex items-center gap-3.5 pt-0.5">
        {links.map((link) => {
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
              className={`p-1 -m-1 rounded-lg transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 ${
                isDark
                  ? "text-neutral-400 hover:text-white focus-visible:ring-white/30"
                  : "text-neutral-500 hover:text-neutral-900 focus-visible:ring-neutral-900/25"
              }`}
            >
              <Icon />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default BioLinks;
