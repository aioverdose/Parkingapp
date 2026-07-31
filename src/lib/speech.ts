/**
 * speech.ts — Text-to-Speech helper using the Web Speech API.
 * Free, built into all modern browsers.
 */

let synth: SpeechSynthesis | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  synth = synth || window.speechSynthesis;
  return synth;
}

/**
 * Speak a message aloud using the device's built-in TTS engine.
 * Returns a promise that resolves when speech ends or is cancelled.
 */
export function speak(text: string, opts?: { rate?: number; pitch?: number; volume?: number }): Promise<void> {
  return new Promise((resolve) => {
    const s = getSynth();
    if (!s) { resolve(); return; }

    // Cancel any ongoing speech
    s.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = opts?.rate ?? 1;
    utterance.pitch = opts?.pitch ?? 1;
    utterance.volume = opts?.volume ?? 1;
    utterance.lang = "en-US";

    // Prefer a natural-sounding voice if available
    const voices = s.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    s.speak(utterance);

    // Safety timeout — some browsers don't fire onend
    setTimeout(resolve, 15000);
  });
}

/**
 * Stop any ongoing speech.
 */
export function stopSpeech() {
  getSynth()?.cancel();
}

/**
 * Check if TTS is available in this browser.
 */
export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
