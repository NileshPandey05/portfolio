import { useCallback, useEffect, useRef, useState } from "react";
import "./index.css";
import profileImg from "./assets/profile.webp";
import { BioLinks } from "./components/BioLinks";
import { ExperienceSection } from "./components/ExperienceSection";
import { Footer } from "./components/Footer";
import { Navbar, type NavSection } from "./components/Navbar";
import { PALETTE_HEX, PixelLensToggle } from "./components/PixelLensToggle";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProjectsSection } from "./components/ProjectsSection";
import {
  EXPERIENCES,
  FOOTER_NAV_LINKS,
  LAST_PLAYED_SPOTIFY,
  PROJECTS,
  SOCIAL_LINKS,
  TAGLINE_LEFT_WORDS,
  TAGLINE_RIGHT_WORDS,
} from "./constants/profile";
import { useRecentTrack } from "./hooks/useRecentTrack";

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>("home");
  const [isDark, setIsDark] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const recentTrack = useRecentTrack(LAST_PLAYED_SPOTIFY);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
  }, [isDark]);

  const handleToggleProgress = useCallback((_p: number, pageBgColor: string) => {
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = pageBgColor;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: PALETTE_HEX.pageNight }}
      className={`min-h-screen ${
        isDark
          ? "text-neutral-100 selection:bg-white/20"
          : "text-neutral-900 selection:bg-amber-500/20"
      }`}
    >
      {/* Top Bar: max-w-6xl container with Navbar on one side and PixelLensToggle on the other */}
      <header className="fixed top-5 inset-x-0 z-50 pointer-events-none">
        <div className="max-w-2xl mx-auto px-6 flex items-center justify-between">
          <div className="pointer-events-auto">
            <Navbar
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              isDark={isDark}
            />
          </div>

          <div className="pointer-events-auto flex items-center">
            <PixelLensToggle
              checked={isDark}
              onChange={setIsDark}
              onProgress={handleToggleProgress}
              size={70}
              height={26}
              ariaLabel={
                isDark ? "Switch to daylight theme" : "Switch to night theme"
              }
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6">
        <section
          id="home"
          className="pt-32 sm:pt-36 pb-20"
        >
          <div className="space-y-9">
            <ProfileHeader
              name="Nilesh Pandey"
              leftWords={TAGLINE_LEFT_WORDS}
              rightWords={TAGLINE_RIGHT_WORDS}
              imageSrc={profileImg}
              isDark={isDark}
            />

            <BioLinks
              description="Building minimal, tactile interfaces and experimenting on the web. Always curious about how things work under the hood."
              links={SOCIAL_LINKS}
              spotify={recentTrack}
              isDark={isDark}
            />

            <ExperienceSection experiences={EXPERIENCES} isDark={isDark} />
          </div>
        </section>

        <ProjectsSection projects={PROJECTS} isDark={isDark} />
      </main>

      <Footer
        name="Nilesh Pandey"
        navItems={FOOTER_NAV_LINKS}
        socialLinks={SOCIAL_LINKS}
        onSelectSection={setActiveSection}
        isDark={isDark}
      />
    </div>
  );
}

export default App;
