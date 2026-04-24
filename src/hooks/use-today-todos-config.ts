import { useState, useCallback } from "react";

export interface TodayTodosConfig {
  projects: string[];
  showNoProject: boolean;
}

const STORAGE_KEY = "xerro-today-todos-config";

function loadConfig(): TodayTodosConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        showNoProject: typeof parsed.showNoProject === "boolean" ? parsed.showNoProject : false,
      };
    }
  } catch {}
  return { projects: [], showNoProject: false };
}

export function useTodayTodosConfig() {
  const [config, setConfigState] = useState<TodayTodosConfig>(loadConfig);

  const setConfig = useCallback((next: TodayTodosConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConfigState(next);
  }, []);

  const addProject = useCallback((name: string) => {
    setConfigState((prev) => {
      if (prev.projects.includes(name)) return prev;
      const next = { ...prev, projects: [...prev.projects, name] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeProject = useCallback((name: string) => {
    setConfigState((prev) => {
      const next = { ...prev, projects: prev.projects.filter((p) => p !== name) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setShowNoProject = useCallback((show: boolean) => {
    setConfigState((prev) => {
      const next = { ...prev, showNoProject: show };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { config, setConfig, addProject, removeProject, setShowNoProject };
}
