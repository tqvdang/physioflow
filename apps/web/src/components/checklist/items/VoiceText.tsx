"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VoiceTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  previousValue?: string;
  disabled?: boolean;
  autoPopulated?: boolean;
  maxLength?: number;
}

type RecordingState = "idle" | "recording" | "processing" | "error";

/**
 * Voice input with transcription and text editing fallback
 */
export function VoiceText({
  value,
  onChange,
  placeholder = "Tap microphone to record or type here...",
  previousValue,
  disabled = false,
  autoPopulated = false,
  maxLength = 500,
}: VoiceTextProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check for Web Speech API support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const startRecording = () => {
    if (!isSupported || disabled) return;

    setError(null);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "vi-VN"; // Vietnamese

    let finalTranscript = value;

    recognition.onstart = () => {
      setRecordingState("recording");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result?.[0];
        if (!result || !alternative) continue;

        const transcript = alternative.transcript;
        if (result.isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
          onChange(finalTranscript.trim());
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setError(`Recording error: ${event.error}`);
      setRecordingState("error");
    };

    recognition.onend = () => {
      setRecordingState("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecordingState("idle");
  };

  const clearText = () => {
    onChange("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <div
      className={cn(
        "space-y-3",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* Previous value reference */}
      {previousValue && previousValue !== value && (
        <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
          <div className="text-xs text-muted-foreground mb-1">Previous note:</div>
          <p className="text-sm italic text-muted-foreground line-clamp-2">
            "{previousValue}"
          </p>
        </div>
      )}

      {/* Text input area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled || recordingState === "recording"}
          rows={3}
          className={cn(
            "w-full p-4 pr-12 rounded-lg border-2 resize-none transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            recordingState === "recording"
              ? "border-error bg-error-50"
              : "border-border bg-background",
            autoPopulated && "border-dashed border-primary/50"
          )}
        />

        {/* Clear button */}
        {value && recordingState === "idle" && (
          <button
            type="button"
            onClick={clearText}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Recording indicator */}
        {recordingState === "recording" && (
          <div className="absolute top-3 right-3 flex items-center gap-2 text-error">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error" />
            </span>
            <span className="text-sm font-medium">Recording...</span>
          </div>
        )}
      </div>

      {/* Character count and auto-populated badge */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {autoPopulated && (
            <span className="px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
              Auto-populated
            </span>
          )}
        </div>
        <span
          className={cn(
            "text-muted-foreground",
            value.length > maxLength * 0.9 && "text-warning-600"
          )}
        >
          {value.length} / {maxLength}
        </span>
      </div>

      {/* Voice controls */}
      <div className="flex items-center gap-2">
        {isSupported ? (
          <>
            {recordingState === "idle" ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={startRecording}
                disabled={disabled}
                className="flex-1 gap-2 h-14"
              >
                <Mic className="w-5 h-5" />
                Tap to Record
              </Button>
            ) : recordingState === "recording" ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={stopRecording}
                className="flex-1 gap-2 h-14"
              >
                <MicOff className="w-5 h-5" />
                Stop Recording
              </Button>
            ) : recordingState === "processing" ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled
                className="flex-1 gap-2 h-14"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </Button>
            ) : null}
          </>
        ) : (
          <div className="flex-1 text-center text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            Voice input not supported in this browser
          </div>
        )}

        {value && (
          <Button
            type="button"
            variant="default"
            size="lg"
            className="h-14 px-6"
          >
            <Check className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
