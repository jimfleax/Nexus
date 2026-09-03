"use client";

/**
 * @file page.tsx
 * @description Settings page: reader preferences (font, size, line height, width) backed by the ReaderSettingsProvider, with a live preview.
 */
import {
  ArrowCounterClockwise,
  SlidersHorizontal,
  TextT,
} from "@phosphor-icons/react";
import { PageHeader } from "@/components/ui/page-header";
import { motion } from "motion/react";
import {
  useReaderSettings,
  type ReaderFont,
} from "@/components/reader-settings-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * @constant fonts
 * @desc    Options for the reader font picker, each mapping a ReaderFont value to a display name, note, and CSS font-family
 * @type    {{value: ReaderFont; name: string; note: string; style?: React.CSSProperties; className?: string}[]}
 */
const fonts: {
  value: ReaderFont;
  name: string;
  note: string;
  style?: React.CSSProperties;
  className?: string;
}[] = [
  {
    value: "atkinson",
    name: "Atkinson Hyperlegible",
    note: "Maximum legibility",
    style: { fontFamily: "var(--font-atkinson)" },
  },
  {
    value: "inter",
    name: "Inter",
    note: "Clean and modern",
    style: { fontFamily: "var(--font-inter)" },
  },
  {
    value: "merriweather",
    name: "Merriweather",
    note: "Highly readable classic",
    style: { fontFamily: "var(--font-merriweather)" },
  },
  {
    value: "literata",
    name: "Literata",
    note: "Designed for long reading",
    style: { fontFamily: "var(--font-literata)" },
  },
  {
    value: "garamond",
    name: "EB Garamond",
    note: "Elegant and traditional",
    style: { fontFamily: "var(--font-garamond)" },
  },
];

/**
 * @desc    Render the reading-settings page with font and layout controls and a preview
 * @returns {JSX.Element} The settings UI
 */
export default function SettingsPage() {
  const { readerSettings, setReaderSettings, resetReaderSettings } =
    useReaderSettings();
  const update = <K extends keyof typeof readerSettings>(
    key: K,
    value: (typeof readerSettings)[K],
  ) => setReaderSettings({ ...readerSettings, [key]: value });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        className="border-none pb-0"
        kicker={<p className="text-sm text-[#815ac0]">Preferences</p>}
        title={<span className="mt-1 block">Reading settings</span>}
        subtitle={
          <span className="mt-3 block max-w-xl text-[#815ac0]">
            Make long-form resources feel right for the way you read.
          </span>
        }
        actions={
          <Button variant="outline" onClick={resetReaderSettings}>
            <ArrowCounterClockwise />
            Reset defaults
          </Button>
        }
      />
      <div className="mt-9 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TextT className="size-4" />
                Reading font
              </CardTitle>
              <CardDescription>
                Choose a typeface for Markdown resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {fonts.map((font) => {
                const isActive = readerSettings.font === font.value;
                return (
                  <button
                    key={font.value}
                    onClick={() => update("font", font.value)}
                    className={`rounded-lg border p-3 text-left transition ${isActive ? "border-[#6247aa] bg-[#6247aa] text-white ring-1 ring-[#6247aa]" : "border-[#d2b7e5] hover:border-[#815ac0] hover:bg-[#f8f4fb]"}`}
                  >
                    <span
                      className={`block text-lg ${font.className || ""}`}
                      style={font.style}
                    >
                      {font.name}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${isActive ? "text-white/80" : "text-[#a06cd5]"}`}
                    >
                      {font.note}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                Text layout
              </CardTitle>
              <CardDescription>
                Adjust the rhythm and density of the reader.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <label className="block">
                <span className="flex justify-between text-sm font-medium">
                  <span>Text size</span>
                  <span className="text-[#815ac0]">
                    {readerSettings.fontSize}px
                  </span>
                </span>
                <input
                  className="mt-3 w-full accent-[#a06cd5]"
                  type="range"
                  min="15"
                  max="23"
                  value={readerSettings.fontSize}
                  onChange={(event) =>
                    update("fontSize", Number(event.target.value))
                  }
                />
              </label>
              <label className="block">
                <span className="flex justify-between text-sm font-medium">
                  <span>Line spacing</span>
                  <span className="text-[#815ac0]">
                    {readerSettings.lineHeight.toFixed(1)}
                  </span>
                </span>
                <input
                  className="mt-3 w-full accent-[#a06cd5]"
                  type="range"
                  min="1.5"
                  max="2.3"
                  step="0.1"
                  value={readerSettings.lineHeight}
                  onChange={(event) =>
                    update("lineHeight", Number(event.target.value))
                  }
                />
              </label>
              <fieldset>
                <legend className="text-sm font-medium">Reading width</legend>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["narrow", "standard", "wide"] as const).map((width) => (
                    <button
                      key={width}
                      onClick={() => update("width", width)}
                      className={`rounded-md border px-2 py-2 text-sm capitalize transition ${readerSettings.width === width ? "border-[#6247aa] bg-[#6247aa] text-white" : "border-[#d2b7e5] hover:bg-[#f8f4fb]"}`}
                    >
                      {width}
                    </button>
                  ))}
                </div>
              </fieldset>
            </CardContent>
          </Card>
        </div>
        <motion.div className="lg:sticky lg:top-20 lg:h-fit">
          <p className="mb-3 text-sm font-medium text-[#815ac0]">Preview</p>
          <Card>
            <CardContent className="pt-6">
              <article className="reading">
                <h2 className="!mt-0">A quieter way to read</h2>
                <p>
                  Typography should disappear behind the ideas. Tune the text
                  until it feels comfortable enough to stay with a page a little
                  longer.
                </p>
                <blockquote>
                  <p>Good reading settings make the interface recede.</p>
                </blockquote>
                <p>
                  These preferences are saved locally and apply whenever you
                  open a Markdown resource.
                </p>
              </article>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
