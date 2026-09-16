import { useState, useEffect, useCallback } from "react";

/**
 * A robust hook for using localStorage with React state.
 * Handles SSR hydration safely and syncs across browser tabs.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Use a ref to track if we've hydrated to avoid hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on client side mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsHydrated(true);
  }, [key]);

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // Dispatch a custom event so other components in the same tab can update
          window.dispatchEvent(new Event("local-storage"));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue],
  );

  // Sync across tabs and components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      if (e instanceof StorageEvent && e.key !== key) return;
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.warn(`Error parsing localStorage key "${key}":`, error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, initialValue]);

  return [
    isHydrated ? storedValue : initialValue,
    setValue,
    isHydrated,
  ] as const;
}
