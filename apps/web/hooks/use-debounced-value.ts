/**
 * @file use-debounced-value.ts
 * @description Hook that delays updating a value until after a specified time has elapsed.
 * @architecture Prevents excessive renders and API calls in search/filter inputs.
 */
import { useState, useEffect } from "react";

/**
 * @desc Returns a debounced version of the provided value that updates only after the specified delay.
 * @param {any} value - The value to debounce
 * @param {number} [delay=150] - The debounce delay in milliseconds
 * @returns {any} The debounced value
 */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
