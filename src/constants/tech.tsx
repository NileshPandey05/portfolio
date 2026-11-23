import type { ReactNode } from "react";

export type TechId =
  | "angular"
  | "nextjs"
  | "tailwind"
  | "typescript"
  | "react"
  | "reactNative"
  | "figma"
  | "vercel"
  | "aws"
  | "postman"
  | "bun";

export interface TechMeta {
  label: string;
  render: (isDark: boolean) => ReactNode;
}

export const TECH_REGISTRY: Record<TechId, TechMeta> = {
  angular: {
    label: "Angular",
    render: () => (
      <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" aria-hidden="true">
        <path
          d="M12 2.5L3.5 5.6l1.3 11.2L12 21.5l7.2-4.7 1.3-11.2L12 2.5z"
          fill="#DD0031"
        />
        <path
          d="M12 2.5v19l7.2-4.7 1.3-11.2L12 2.5z"
          fill="#C3002F"
        />
        <path
          d="M12 5.4L7.1 16.5h1.8l1-2.5h4.2l1 2.5h1.8L12 5.4zm1.4 7h-2.8L12 9l1.4 3.4z"
          fill="#ffffff"
        />
      </svg>
    ),
  },
  nextjs: {
    label: "Next.js",
    render: (isDark) => (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill={isDark ? "#ffffff" : "#111111"} />
        <path
          d="M9 16V8l7.4 9.5"
          fill="none"
          stroke={isDark ? "#111111" : "#ffffff"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 8v5.5"
          fill="none"
          stroke={isDark ? "#111111" : "#ffffff"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  tailwind: {
    label: "Tailwind CSS",
    render: () => (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
        <path
          d="M12 6c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35.98 1 2.12 2.15 4.59 2.15 2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C15.61 7.15 14.47 6 12 6zM7 12c-2.67 0-4.33 1.33-5 4 1-1.33 2.17-1.83 3.5-1.5.76.19 1.31.74 1.91 1.35.98 1 2.12 2.15 4.59 2.15 2.67 0 4.33-1.33 5-4-1 1.33-2.17 1.83-3.5 1.5-.76-.19-1.31-.74-1.91-1.35C10.61 13.15 9.47 12 7 12z"
          fill="#38BDF8"
        />
      </svg>
    ),
  },
  typescript: {
    label: "TypeScript",
    render: () => (
      <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#3178C6" />
        <path
          d="M7.2 12.2h4.2M9.3 12.2v6.6"
          stroke="#ffffff"
          strokeWidth="1.9"
          strokeLinecap="square"
        />
        <path
          d="M18.2 13.3c-.4-.6-1.1-.9-1.9-.9-1.1 0-1.9.6-1.9 1.5 0 .9.7 1.3 2 1.7 1.3.4 2 .9 2 2 0 1.2-1 2-2.4 2-1.1 0-2-.4-2.5-1.1"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  react: {
    label: "React",
    render: () => (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
        <circle cx="12" cy="12" r="2" fill="#61DAFB" />
        <g fill="none" stroke="#61DAFB" strokeWidth="1.3">
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)" />
        </g>
      </svg>
    ),
  },
  reactNative: {
    label: "React Native",
    render: (isDark) => (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
        <circle cx="11.5" cy="12" r="1.9" fill="#38BDF8" />
        <g fill="none" stroke="#38BDF8" strokeWidth="1.25">
          <ellipse cx="11.5" cy="12" rx="8.8" ry="3.4" />
          <ellipse cx="11.5" cy="12" rx="8.8" ry="3.4" transform="rotate(60 11.5 12)" />
          <ellipse cx="11.5" cy="12" rx="8.8" ry="3.4" transform="rotate(120 11.5 12)" />
        </g>
        <rect
          x="15.5"
          y="13"
          width="6"
          height="9"
          rx="1.3"
          fill={isDark ? "#12131a" : "#f4f4f5"}
          stroke="#38BDF8"
          strokeWidth="1.2"
        />
        <circle cx="18.5" cy="19.8" r="0.6" fill="#38BDF8" />
      </svg>
    ),
  },
  figma: {
    label: "Figma",
    render: () => (
      <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" aria-hidden="true">
        <path d="M9 3h3v6H9a3 3 0 0 1 0-6z" fill="#F24E1E" />
        <path d="M12 3h3a3 3 0 0 1 0 6h-3V3z" fill="#FF7262" />
        <path d="M9 9h3v6H9a3 3 0 0 1 0-6z" fill="#A259FF" />
        <circle cx="15" cy="12" r="3" fill="#1ABCFE" />
        <path d="M9 15h3v3a3 3 0 1 1-3-3z" fill="#0ACF83" />
      </svg>
    ),
  },
  vercel: {
    label: "Vercel",
    render: (isDark) => (
      <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" aria-hidden="true">
        <path d="M12 4L21 20H3L12 4z" fill={isDark ? "#ffffff" : "#111111"} />
      </svg>
    ),
  },
  aws: {
    label: "AWS",
    render: (isDark) => (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
        <text
          x="12"
          y="12.5"
          textAnchor="middle"
          fontSize="7.2"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          fill={isDark ? "#F3F4F6" : "#232F3E"}
        >
          aws
        </text>
        <path
          d="M5 15.5c4.2 2.8 9.8 2.8 13.8.2"
          fill="none"
          stroke="#FF9900"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M16.8 14.8l2.2.6-.7 2.2"
          fill="none"
          stroke="#FF9900"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  postman: {
    label: "Postman",
    render: () => (
      <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill="#FF6C37" />
        <path
          d="M15.4 8.6l-4.9 4.9M14.2 8.2l1.6 1.6"
          stroke="#ffffff"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <circle cx="9.4" cy="14.6" r="1.4" fill="#ffffff" />
      </svg>
    ),
  },
  bun: {
    label: "Bun",
    render: () => (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" aria-hidden="true">
        <ellipse cx="12" cy="13" rx="9" ry="7" fill="#FBF0DF" stroke="#18181B" strokeWidth="1.4" />
        <path d="M9.5 6.8c.8-1 2.2-1.4 3.5-1.1" stroke="#D9A066" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="9" cy="13.2" r="1.1" fill="#18181B" />
        <circle cx="15" cy="13.2" r="1.1" fill="#18181B" />
        <ellipse cx="7.4" cy="14.6" rx="1.2" ry="0.7" fill="#F9A8D4" />
        <ellipse cx="16.6" cy="14.6" rx="1.2" ry="0.7" fill="#F9A8D4" />
        <path d="M11.2 14.8c.5.6 1.1.6 1.6 0" fill="none" stroke="#18181B" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
};
