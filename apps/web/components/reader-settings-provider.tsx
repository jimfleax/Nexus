"use client";

/**
 * @file reader-settings-provider.tsx
 * @description Context provider for reader typography preferences (font, size, line height, width), persisted to localStorage and applied to the document root.
 * @architecture Client provider exposing readerSettings/setReaderSettings/resetReaderSettings; writes CSS custom props (--reader-font-size, --reader-line-height) and the data-reader-font attribute consumed by reader styles.
 */
import { createContext, useContext, useEffect, useState } from "react";

export type ReaderFont =
  "atkinson" | "inter" | "merriweather" | "literata" | "garamond";
export type ReaderSettings = {
  font: ReaderFont;
  fontSize: number;
  lineHeight: number;
  width: "narrow" | "standard" | "wide";
};

/**
 * @constant defaultReaderSettings
 * @desc    Default typography values used before any user customization
 */
const defaultReaderSettings: ReaderSettings = {
  font: "atkinson",
  fontSize: 18,
  lineHeight: 1.9,
  width: "standard",
};
const ReaderSettingsContext = createContext<{
  readerSettings: ReaderSettings;
  setReaderSettings: (settings: ReaderSettings) => void;
  resetReaderSettings: () => void;
}>({
  readerSettings: defaultReaderSettings,
  setReaderSettings: () => {},
  resetReaderSettings: () => {},
});

/**
 * @desc    Provide reader settings, hydrating from localStorage and syncing changes to the document root
 * @param   {{children: React.ReactNode}} props - Child tree
 * @returns {JSX.Element} The reader-settings context provider
 */
export function ReaderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(
    defaultReaderSettings,
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem("nexus-reader-settings");
      if (saved) {
        setReaderSettings({
          ...defaultReaderSettings,
          ...(JSON.parse(saved) as ReaderSettings),
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const root = document.documentElement;
    root.dataset.readerFont = readerSettings.font;
    root.style.setProperty(
      "--reader-font-size",
      `${readerSettings.fontSize}px`,
    );
    root.style.setProperty(
      "--reader-line-height",
      String(readerSettings.lineHeight),
    );

    const widthMap = { narrow: "60ch", standard: "70ch", wide: "85ch" };
    root.style.setProperty(
      "--reader-max-width",
      widthMap[readerSettings.width] || "70ch",
    );

    localStorage.setItem(
      "nexus-reader-settings",
      JSON.stringify(readerSettings),
    );
  }, [readerSettings, isMounted]);

  return (
    <ReaderSettingsContext.Provider
      value={{
        readerSettings,
        setReaderSettings,
        resetReaderSettings: () => setReaderSettings(defaultReaderSettings),
      }}
    >
      {children}
    </ReaderSettingsContext.Provider>
  );
}

/**
 * @desc    Access the current reader settings context
 * @returns {Object} readerSettings, setReaderSettings, and resetReaderSettings
 */
export const useReaderSettings = () => useContext(ReaderSettingsContext);
