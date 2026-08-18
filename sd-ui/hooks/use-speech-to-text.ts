"use client";
import { useState, useRef, useCallback, useEffect } from "react";

// No official TS lib types ship for the Web Speech API — Safari/Firefox on
// desktop don't implement it at all, so this stays feature-detected and
// untyped rather than pulling in a dependency for a browser-only global.
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: any) => void) | null;
  onerror:  ((e: any) => void) | null;
  onend:    (() => void) | null;
  start: () => void;
  stop:  () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface UseSpeechToTextOptions {
  /** Called with the full text (pre-existing + recognized speech) as it updates. */
  onTranscript: (text: string) => void;
}

/**
 * Push-to-talk dictation for the chat input, via the browser's built-in
 * SpeechRecognition — no API key, no network round trip to us, and it starts
 * showing words while you're still talking (interim results).
 *
 * Recognized speech is appended to whatever was already typed, not used to
 * replace it, so tapping the mic mid-sentence to finish by voice doesn't lose
 * anything. Nothing is auto-sent — dictated text lands in the input for review,
 * same as typed text.
 */
export function useSpeechToText({ onTranscript }: UseSpeechToTextOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef    = useRef("");     // input's contents at the moment listening started
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback((currentText: string) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) { setSupported(false); return; }
    if (listening) return;

    setError(null);
    baseTextRef.current = currentText.trim();

    const recognition = new Ctor();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = typeof navigator !== "undefined" ? navigator.language : "en-US";

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interimChunk += result[0].transcript;
      }
      if (finalChunk) {
        // Fold completed speech into the running base so later interim text
        // only ever replaces the still-in-progress phrase, never what's settled.
        baseTextRef.current = joinSpoken(baseTextRef.current, finalChunk);
      }
      onTranscriptRef.current(joinSpoken(baseTextRef.current, interimChunk));
    };

    recognition.onerror = (event: any) => {
      const messages: Record<string, string> = {
        "not-allowed":  "Microphone access was denied.",
        "no-speech":    "Didn't catch that — try again.",
        "audio-capture": "No microphone found.",
        "network":      "Speech recognition needs a network connection.",
      };
      setError(messages[event.error] ?? "Voice input failed.");
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const toggle = useCallback((currentText: string) => {
    if (listening) stop();
    else start(currentText);
  }, [listening, start, stop]);

  // Stop cleanly if the component unmounts mid-dictation (e.g. switching topics).
  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  return { supported, listening, error, toggle };
}

function joinSpoken(base: string, spoken: string): string {
  if (!spoken) return base;
  if (!base) return spoken;
  return /[\s([{]$/.test(base) ? base + spoken : `${base} ${spoken}`;
}
