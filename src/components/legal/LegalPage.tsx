/**
 * LegalPage — the public face of the app's promises.
 *
 * Reads without an account, without onboarding, on any device: these pages
 * are where someone decides whether to trust Bloom, so they render before
 * any gate and say only what the code actually does.
 */

import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BloomLogo } from "@/components/BloomLogo";

export interface LegalSection {
  heading: string;
  paras: string[];
}

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-6 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Bloom
        </Link>

        <header className="mt-10 flex items-start gap-4">
          <BloomLogo size={40} />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Bloom · legal
            </p>
            <h1 className="mt-1 font-display text-[clamp(26px,5vw,38px)] italic leading-tight">
              {title}
            </h1>
          </div>
        </header>

        <p className="mt-3 text-[11px] text-muted-foreground">Last updated {updated}</p>

        <p className="mt-8 text-[14px] leading-relaxed text-foreground/90">{intro}</p>

        {sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-foreground">
              {s.heading}
            </h2>
            {s.paras.map((p) => (
              <p
                key={p.slice(0, 24)}
                className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground"
              >
                {p}
              </p>
            ))}
          </section>
        ))}

        <footer className="mt-14 border-t border-border pt-6">
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Questions about this page belong to whoever runs the Bloom instance you are using. This
            copy of the policy ships with the app itself, so what you read here is what the code
            does.
          </p>
          <p className="mt-4 flex gap-4 text-[11.5px]">
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
