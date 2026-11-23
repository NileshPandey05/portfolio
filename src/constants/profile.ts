import type { SocialLink, SpotifyTrack } from "../components/BioLinks";
import type { ExperienceItem } from "../components/ExperienceSection";
import type { FooterNavItem } from "../components/Footer";
import type { ProjectItem } from "../components/ProjectsSection";

export const FOOTER_NAV_LINKS: FooterNavItem[] = [
  { label: "Home", targetId: "home", navSection: "home" },
  { label: "Experience", targetId: "experience", navSection: "experience" },
  { label: "Projects", targetId: "project", navSection: "project" },
];

export const PROJECTS: ProjectItem[] = [
  {
    id: "wavechat",
    name: "WaveChat",
    description:
      "Real-time chat application built in a Turborepo monorepo with a Next.js frontend, Express + Prisma backend, WebSocket server, and PostgreSQL persistence.",
    githubUrl: "https://github.com/NileshPandey05/WaveChat",
    liveUrl: "https://wavechat.devnilesh.in/",
    technologies: ["nextjs", "typescript", "react", "tailwind"],
  },
  {
    id: "night-fisherman-3d",
    name: "Night Fisherman 3D",
    description:
      "Real-time 3D nocturnal ocean diorama and biological swarm simulation built with Three.js, React Three Fiber, and procedural GLSL shaders.",
    githubUrl: "https://github.com/NileshPandey05/night-fisherman-3d",
    liveUrl: "https://night-fisherman-3d.vercel.app",
    technologies: ["react", "tailwind"],
  },
  {
    id: "bitstreamfi",
    name: "BitStreamFi",
    description:
      "Decentralized streaming finance application built on Mezo L2 Testnet with Solidity smart contracts and Foundry.",
    githubUrl: "https://github.com/NileshPandey05/BitStreamfi",
    liveUrl: "https://bitstreamfi.devnilesh.in/",
    technologies: ["nextjs", "typescript", "tailwind"],
  },
  {
    id: "urlshortner",
    name: "URL Shortener",
    description:
      "Production-style URL shortener backend powered by Bun, Express, Prisma, PostgreSQL, and Base62 encoding for scalable short-link generation and redirects.",
    githubUrl: "https://github.com/NileshPandey05/urlshortner",
    technologies: ["bun", "typescript"],
  },
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

export const TAGLINE_LEFT_WORDS = [
  "Engineer",
  "Builder",
  "Tinkerer",
  "Crafter",
  "Creator",
  "Dreamer",
] as const;

export const TAGLINE_RIGHT_WORDS = [
  "Confused",
  "Curious",
  "Caffeinating",
  "Debugging",
  "Shipping",
  "Daydreaming",
] as const;

export const LAST_PLAYED_SPOTIFY: SpotifyTrack = {
  track: "Nights",
  artist: "Frank Ocean",
  href: "https://open.spotify.com",
};
