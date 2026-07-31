"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

/**
 * useVoiceInput — Wraps the Web Speech API (webkitSpeechRecognition)
 * for hands-free Accept/Deny input on match notifications.
 *
 * Browser support: Chrome, Edge, Opera. Not Firefox or Safari.
 */
export function useVoiceInput(onResult: (result: SpeechRecognitionResult) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      if (result) {
        onResult({
          transcript: result[0].transcript,
          confidence: result[0].confidence,
        });
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, startListening, stopListening };
}
