import { Link } from "wouter";
import { Compass } from "lucide-react";

const STAMPS = ["🚙", "🛣️", "🦌", "🌵", "🌽", "⛰️", "🛻", "🌅", "🦅", "🪧", "🚦", "🛞"];

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-6 py-20">
      <div className="w-full max-w-2xl">

        {/* Eyebrow */}
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground mb-6 flex items-center gap-2">
          <Compass className="h-3 w-3" />
          Off the map · Error 404
        </p>

        {/* Big editorial 404 */}
        <h1 className="text-[140px] md:text-[200px] font-editorial italic text-foreground leading-[0.85] tracking-tight mb-2 select-none">
          404
        </h1>

        {/* Sub-headline */}
        <p className="text-2xl md:text-3xl font-editorial italic text-foreground/80 leading-tight mb-6 max-w-xl">
          You've wandered off the bingo board.
        </p>

        {/* Body */}
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-10">
          This stop isn't on any of our routes. Maybe a deer ran across the URL,
          or maybe the page packed up and headed for the next state. Either way —
          there's nothing to spot here.
        </p>

        {/* Bingo card of stamps — purely decorative */}
        <div className="grid grid-cols-4 border border-border max-w-[260px] mb-10 select-none" aria-hidden="true">
          {STAMPS.map((stamp, i) => {
            const stamped = [0, 5, 6, 9, 11].includes(i);
            return (
              <div
                key={i}
                className="aspect-square border border-border/50 flex items-center justify-center text-lg relative"
              >
                <span className={stamped ? "opacity-100" : "opacity-30"}>{stamp}</span>
                {stamped && (
                  <span className="absolute inset-0 flex items-center justify-center text-3xl font-editorial italic text-destructive/60 leading-none">
                    ×
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-foreground hover:text-foreground/70 transition-colors underline underline-offset-4 decoration-border"
          >
            ← Back to the database
          </Link>
          <span className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/50">
            Or just stare out the window for a bit.
          </span>
        </div>

      </div>
    </div>
  );
}
