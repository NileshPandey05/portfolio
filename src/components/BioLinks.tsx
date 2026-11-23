import {
  PLATFORM_ICONS,
  type SocialLink,
  type SocialPlatform,
} from "./SocialIcon";

export type { SocialLink, SocialPlatform };

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
