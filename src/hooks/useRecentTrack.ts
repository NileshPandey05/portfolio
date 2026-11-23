import { useEffect, useState } from "react";
import type { SpotifyTrack } from "../components/BioLinks";

const POLL_INTERVAL_MS = 45_000;

interface LastFmTrackResponse {
  recenttracks?: {
    track?: Array<{
      name?: string;
      url?: string;
      artist?: { "#text"?: string };
      "@attr"?: { nowplaying?: string };
    }>;
  };
}

function getLastFmConfig() {
  try {
    const username = process.env.BUN_PUBLIC_LASTFM_USERNAME?.trim();
    const apiKey = process.env.BUN_PUBLIC_LASTFM_API_KEY?.trim();
    return { username, apiKey };
  } catch {
    return { username: undefined, apiKey: undefined };
  }
}

/**
 * Fetches the live currently-playing or last-played track via Last.fm's
 * read-only `user.getrecenttracks` endpoint (no backend or OAuth refresh needed).
 * Falls back cleanly to `fallback` if env vars are unset or the request fails.
 */
export function useRecentTrack(fallback: SpotifyTrack): SpotifyTrack {
  const [track, setTrack] = useState<SpotifyTrack>(fallback);

  useEffect(() => {
    const { username, apiKey } = getLastFmConfig();
    if (!username || !apiKey) return;

    let active = true;
    let controller: AbortController | null = null;

    const fetchTrack = async () => {
      if (document.visibilityState === "hidden") return;

      controller?.abort();
      controller = new AbortController();

      try {
        const params = new URLSearchParams({
          method: "user.getrecenttracks",
          user: username,
          api_key: apiKey,
          format: "json",
          limit: "1",
        });

        const res = await fetch(
          `https://ws.audioscrobbler.com/2.0/?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;

        const data = (await res.json()) as LastFmTrackResponse;
        const latest = data.recenttracks?.track?.[0];
        if (!active || !latest?.name) return;

        setTrack({
          track: latest.name,
          artist: latest.artist?.["#text"]?.trim() || "Unknown Artist",
          href: latest.url || fallback.href,
          isPlaying: latest["@attr"]?.nowplaying === "true",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          // Keep last valid track or fallback silently on transient network issues
        }
      }
    };

    void fetchTrack();

    const intervalId = window.setInterval(fetchTrack, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchTrack();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fallback]);

  return track;
}
