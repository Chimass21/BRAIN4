import React, { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  value?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  value = "",
  className = "",
  size = "sm",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSupport(false);
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setErrorStatus(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const current = value.trim();
          const updated = current ? `${current} ${transcript}` : transcript;
          onTranscript(updated);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorStatus("Microphone permission blocked or denied by browser.");
        } else if (event.error === "no-speech") {
          setErrorStatus("No speech detected. Speak clearly into mic.");
        } else if (event.error === "service-not-allowed") {
          setErrorStatus("Voice service blocked in this preview iframe context.");
        } else {
          setErrorStatus(`Speech Error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setErrorStatus(null), 4000);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn("Already started or error:", e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    setIsListening(false);
  };

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!hasSupport) {
    // If not supported natively, let's keep it visible but disabled with an offline tooltip, 
    // or let's show an warning on click if they try to use it so it's not confusing.
  }

  const pulseStyle = isListening
    ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200"
    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700";

  const sizeClasses = {
    xs: "p-1 rounded-md text-[10px]",
    sm: "p-1.5 rounded-lg text-xs",
    md: "p-2 rounded-xl text-sm",
    lg: "p-2.5 rounded-2xl text-base",
  };

  return (
    <div className="relative inline-flex items-center">
      {errorStatus && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-slate-900 border border-slate-700 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
          ⚠️ {errorStatus}
        </div>
      )}
      {!hasSupport ? (
        <button
          type="button"
          onClick={() => {
            setErrorStatus("Speech-to-text is not supported on this browser context.");
            setTimeout(() => setErrorStatus(null), 3000);
          }}
          className={`inline-flex items-center justify-center opacity-60 text-slate-400 cursor-help ${sizeClasses[size]} bg-slate-100 ${className}`}
          title="Speech recognition not supported"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggleListening}
          className={`inline-flex items-center justify-center transition-all cursor-pointer border-none shrink-0 ${sizeClasses[size]} ${pulseStyle} ${className}`}
          title={isListening ? "Listening... Speak now" : "Use speech-to-text (microphone input)"}
        >
          {isListening ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <Mic className="w-3.5 h-3.5 animate-bounce" />
            </span>
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
};
