import type { SocialLink, SpotifyTrack } from "../components/BioLinks";
import type { ExperienceItem } from "../components/ExperienceSection";
import type { FooterNavItem } from "../components/Footer";

export const FOOTER_NAV_LINKS: FooterNavItem[] = [
  { label: "Home", targetId: "home", navSection: "home" },
  { label: "Experience", targetId: "experience-heading", navSection: "home" },
  { label: "Projects", targetId: "project", navSection: "project" },
];

export const EXPERIENCES: ExperienceItem[] = [
  {
    id: "cwd",
    company: "CWD",
    role: "Software Engineer (Frontend & Mobile)",
    status: "Working",
    period: "Present",
    location: "India (On-Site)",
    technologies: [
      "angular",
      "react",
      "tailwind",
      "reactNative",
      "nextjs",
      "bun",
      "figma",
    ],
    highlights: [
      "Smart Meter (Angular v19): Built a real-time analytics dashboard with ECharts, standalone components, RBAC, and server-side paginated tables with CSV export.",
      "Sound Box (React Native): Led end-to-end MPIN auth with hardware-backed key cryptography, nonce challenge-response, and JWT verification.",
      "FOTA Dashboard (React 19): Architected an enterprise IoT firmware portal with Tailwind, generic pagination across 7+ modules, Recharts, and Docker/Nginx.",
    ],
    defaultExpanded: false,
  },
];

export const SOCIAL_LINKS: SocialLink[] = [
  {
    platform: "x",
    label: "X",
    href: "https://x.com/_nilesh05",
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/in/nileshpandey05",
  },
  {
    platform: "github",
    label: "GitHub",
    href: "https://github.com/NileshPandey05",
  },
  {
    platform: "email",
    label: "Email",
    href: "mailto:nileshpandey200311@gmail.com",
  },
];

export const LAST_PLAYED_SPOTIFY: SpotifyTrack = {
  track: "Nights",
  artist: "Frank Ocean",
  href: "https://open.spotify.com",
};
