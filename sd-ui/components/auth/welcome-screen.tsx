"use client";
import { signIn } from "next-auth/react";
import {
  Building2, BookOpen, Target, Microscope,
  Check, X, ArrowRight, Loader2,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const MODES = [
  { Icon: BookOpen,   label: "Study",     blurb: "Guided path through each topic" },
  { Icon: Target,     label: "Quiz",      blurb: "Drilled like a real interviewer" },
  { Icon: Microscope, label: "Deep Dive", blurb: "Full architecture, end to end" },
];

// The whole point of the screen: show what signing in buys you, so the choice
// isn't arbitrary. Kept honest — guest mode really does lose everything.
const COMPARISON = [
  { label: "Ask anything, all 22 topics", signedIn: true, guest: true  },
  { label: "Grounded in Alex Xu's books", signedIn: true, guest: true  },
  { label: "Chat kept while the tab is open", signedIn: true, guest: true  },
  { label: "History saved after you close the tab", signedIn: true, guest: false },
  { label: "Pick up on another device", signedIn: true, guest: false },
  { label: "Quiz attempts kept to review later", signedIn: true, guest: false },
];

export function WelcomeScreen({ onExploreAsGuest }: { onExploreAsGuest: () => void }) {
  const [signingIn, setSigningIn] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[880px] animate-fade-in">

          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-9">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 border-[1.5px] border-primary/30 ring-4 ring-primary/5 flex items-center justify-center mb-4">
              <Building2 size={26} className="text-primary" />
            </div>
            <h1 className="font-display font-bold text-[26px] sm:text-[32px] tracking-tight text-foreground">
              archprep
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-[460px] leading-relaxed">
              System design interview prep, grounded in Alex Xu&apos;s books and open-source
              architecture references — not made up on the spot.
            </p>
          </div>

          {/* The three modes, so the product is legible before committing */}
          <div className="grid sm:grid-cols-3 gap-2.5 mb-8">
            {MODES.map(({ Icon, label, blurb }) => (
              <div key={label} className="rounded-xl border border-border bg-card px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-primary shrink-0" />
                  <span className="font-display font-semibold text-[13px] text-foreground">{label}</span>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">{blurb}</p>
              </div>
            ))}
          </div>

          {/* Choice */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 sm:px-7 py-6">
              <h2 className="font-display font-semibold text-[15px] text-foreground text-center mb-1">
                How do you want to start?
              </h2>
              <p className="text-[12px] text-muted-foreground text-center mb-6">
                Both give you the full app. Signing in is what keeps your work.
              </p>

              {/* What you get either way */}
              <div className="rounded-xl border border-border overflow-hidden mb-6">
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-primary w-14 text-center">
                    Signed in
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground w-14 text-center">
                    Guest
                  </span>
                </div>
                {COMPARISON.map(({ label, signedIn, guest }, i) => (
                  <div
                    key={label}
                    className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 ${
                      i < COMPARISON.length - 1 ? "border-b border-border/60" : ""
                    }`}
                  >
                    <span className="text-[12px] text-foreground/90">{label}</span>
                    <span className="w-14 flex justify-center">
                      {signedIn
                        ? <Check size={13} className="text-emerald-500" strokeWidth={2.5} />
                        : <X size={13} className="text-muted-foreground/40" />}
                    </span>
                    <span className="w-14 flex justify-center">
                      {guest
                        ? <Check size={13} className="text-emerald-500" strokeWidth={2.5} />
                        : <X size={13} className="text-muted-foreground/40" />}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => { setSigningIn(true); signIn("google"); }}
                  disabled={signingIn}
                  className="flex-1 flex items-center justify-center gap-2.5 h-11 rounded-xl bg-primary text-primary-foreground font-medium text-[13.5px] hover:bg-primary/90 transition-all disabled:opacity-70 disabled:cursor-wait"
                >
                  {signingIn ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Redirecting to Google…
                    </>
                  ) : (
                    <>
                      <GoogleMark />
                      Continue with Google
                    </>
                  )}
                </button>

                <button
                  onClick={onExploreAsGuest}
                  disabled={signingIn}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border text-muted-foreground font-medium text-[13.5px] hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                >
                  Explore as guest
                  <ArrowRight size={14} />
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
                As a guest nothing is stored on our servers — your chat lives only in this tab
                and is gone when you close it. You can sign in later from the header.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Google's brand mark, inline so no external request is needed. */
function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.0 35.5 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}
