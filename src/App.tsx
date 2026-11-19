import { useCallback, useEffect, useRef, useState } from "react";
import "./index.css";
import { Navbar, type NavSection } from "./components/Navbar";
import { PALETTE_HEX, PixelLensToggle } from "./components/PixelLensToggle";

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>("home");
  const [isDark, setIsDark] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

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
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
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
              size={78}
              ariaLabel={
                isDark ? "Switch to daylight theme" : "Switch to night theme"
              }
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">
        <section
          id="home"
          className="min-h-screen flex flex-col items-center justify-center text-center space-y-3 pt-16"
        >
          <p
            className={`text-sm sm:text-base max-w-md transition-colors duration-500 ${
              isDark ? "text-neutral-400" : "text-neutral-600"
            }`}
          >
            Minimalistic &amp; tactile interface powered by React, Bun, and Tailwind CSS.
          </p>
        </section>

        <section
          id="project"
          className={`min-h-screen flex flex-col items-center justify-center text-center space-y-3 border-t transition-colors duration-500 ${
            isDark ? "border-white/5" : "border-neutral-900/10"
          }`}
        >
          <h2
            className={`text-3xl font-semibold tracking-tight transition-colors duration-500 ${
              isDark ? "text-white" : "text-neutral-950"
            }`}
          >
            Projects
          </h2>
          <p
            className={`text-sm sm:text-base max-w-md transition-colors duration-500 ${
              isDark ? "text-neutral-400" : "text-neutral-600"
            }`}
          >
            Selected works and interactive experiments.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
