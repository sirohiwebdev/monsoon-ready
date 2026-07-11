"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherSummary } from "./types";
import { fetchWeatherByCoords, fetchWeatherByPlace } from "./client";

export type LocationInput = { place: string } | { lat: number; lon: number };

interface State {
  weather: WeatherSummary | null;
  lastUpdated: number | null;
  refreshing: boolean;
  error: string | null;
}

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Drives the live conditions bar: resolves a location once, then polls every
 * 5 minutes independently of plan generation. Pauses while the tab is hidden
 * and catches up immediately on refocus if the data has gone stale.
 */
export function useLiveWeather() {
  const [state, setState] = useState<State>({
    weather: null,
    lastUpdated: null,
    refreshing: false,
    error: null,
  });
  const locRef = useRef<LocationInput | null>(null);
  const lastUpdatedRef = useRef<number | null>(null);

  const load = useCallback(
    async (loc: LocationInput, opts?: { silent?: boolean }) => {
      if (state.refreshing && opts?.silent) return;
      locRef.current = loc;
      setState((s) => ({
        ...s,
        refreshing: true,
        error: opts?.silent ? s.error : null,
      }));
      try {
        const w =
          "place" in loc
            ? await fetchWeatherByPlace(loc.place)
            : await fetchWeatherByCoords(loc.lat, loc.lon);
        const now = Date.now();
        lastUpdatedRef.current = now;
        setState({
          weather: w,
          lastUpdated: now,
          refreshing: false,
          error: null,
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          refreshing: false,
          // Stale-while-revalidate: never blank good data because a refresh failed.
          error: s.weather
            ? null
            : err instanceof Error
              ? err.message
              : "Couldn't load weather.",
        }));
      }
    },
    [state.refreshing],
  );

  const refresh = useCallback(() => {
    if (locRef.current) void load(locRef.current, { silent: true });
  }, [load]);

  const reset = useCallback(() => {
    locRef.current = null;
    lastUpdatedRef.current = null;
    setState({
      weather: null,
      lastUpdated: null,
      refreshing: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const last = lastUpdatedRef.current;
      if (last && Date.now() - last > REFRESH_MS) refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { ...state, load, refresh, reset };
}
