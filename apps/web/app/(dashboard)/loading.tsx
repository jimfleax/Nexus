import { Skeleton } from "boneyard-js/react";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { formatLongDate } from "@/lib/utils";

/**
 * @desc    Time-of-day greeting for the hero
 * @returns {string} "Good morning", "Good afternoon", or "Good evening"
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Loading() {
  return (
    <div>
      <BackgroundGradientAnimation
        containerClassName="rounded-3xl shadow-sm mb-12 w-full h-auto min-h-[400px]"
        className="p-8 relative z-20 w-full h-full"
      >
        <div className="flex items-start justify-between relative z-30">
          <p className="text-sm font-medium tracking-wide text-white/80 uppercase">
            {formatLongDate(new Date())}
          </p>
        </div>
        <h1 className="mt-1 font-serif text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30 drop-shadow-sm [text-shadow:_0_4px_24px_rgb(255_255_255_/_20%)] relative z-20">
          {getGreeting()}
        </h1>
        <p className="mt-2 text-white/80 relative z-20">
          Continue where you left off in your knowledge workspace.
        </p>

        <section className="mt-10 relative z-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-white">Projects</h2>
          </div>
          <div className="gap-3 md:grid-cols-3 grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} name="project-card" loading={true}>
                {null}
              </Skeleton>
            ))}
          </div>
        </section>
      </BackgroundGradientAnimation>

      <section className="mt-12 mb-12">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-xl">Recent Resources</h2>
        </div>
        <div className="border-y border-[#dec9e9]">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} name="resource-card" loading={true}>
                {null}
              </Skeleton>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
