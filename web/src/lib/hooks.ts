"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Health } from "./types";

/** Fetch once on mount; exposes data/error/loading and a retry. */
export function useApi<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcherRef.current()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  return { data, error, loading, retry: load };
}

type HealthState = { health: Health | null; online: boolean | null };
const HealthContext = createContext<HealthState>({ health: null, online: null });

/** Polls /api/health so the nav and hero share one live status. */
export function HealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>({ health: null, online: null });

  useEffect(() => {
    let alive = true;
    const tick = () =>
      api
        .health()
        .then((health) => alive && setState({ health, online: health.status === "ok" }))
        .catch(() => alive && setState({ health: null, online: false }));
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return createElement(HealthContext.Provider, { value: state }, children);
}

export const useHealth = () => useContext(HealthContext);

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
