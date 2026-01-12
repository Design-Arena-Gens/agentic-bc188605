import { useCallback, useEffect, useState } from "react";

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key);

      if (storedValue) {
        setState(JSON.parse(storedValue) as T);
      }
    } catch (error) {
      console.error(`Failed to read ${key} from localStorage`, error);
    } finally {
      setHydrated(true);
    }
  }, [key]);

  const updateState = useCallback(
    (update: T | ((prev: T) => T)) => {
      setState((prev) => {
        const nextValue = typeof update === "function" ? (update as (value: T) => T)(prev) : update;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.error(`Failed to persist ${key} to localStorage`, error);
        }

        return nextValue;
      });
    },
    [key],
  );

  return [state, updateState, hydrated] as const;
}
