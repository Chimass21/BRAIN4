// Prevent garbage collection in Chrome/Safari/iOS which silences speech synthesis prematurely
let activeUtterancesStore: SpeechSynthesisUtterance[] = [];

export const speakText = (
  text: string,
  isPlaying: boolean,
  setIsPlaying: (playing: boolean) => void
) => {
  if (!("speechSynthesis" in window)) {
    alert("Text-to-speech is not fully supported on this browser or environment.");
    return;
  }

  if (isPlaying) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn(e);
    }
    setIsPlaying(false);
    return;
  }

  // Cancel any operating speech first to prevent overlapping or freezing
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn(e);
  }

  // Strip HTML entities/tags so synthesis reads pure text
  const div = document.createElement("div");
  div.innerHTML = text;
  // Replace HTML-style entities and math delimiters if present
  let cleanText = div.innerText || div.textContent || "";
  cleanText = cleanText
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2")
    .replace(/\^\{([^}]+)\}/g, " raised to power $1")
    .replace(/\_\{([^}]+)\}/g, " subscript $1")
    .replace(/[\$\\]/g, " ");

  if (!cleanText.trim()) {
    return;
  }

  // Segment speech text safely. Large blocks can crash standard speech synthesis.
  const shortText = cleanText.substring(0, 3000);
  const utterance = new SpeechSynthesisUtterance(shortText);
  utterance.lang = "en-US";
  utterance.volume = 1.0;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    setIsPlaying(true);
  };

  utterance.onend = () => {
    setIsPlaying(false);
    activeUtterancesStore = activeUtterancesStore.filter(u => u !== utterance);
  };

  utterance.onerror = (e) => {
    console.warn("Speech synthesis local warning or stop:", e);
    setIsPlaying(false);
    activeUtterancesStore = activeUtterancesStore.filter(u => u !== utterance);
  };

  // Add reference to prevent immediate garbage collection
  activeUtterancesStore.push(utterance);

  try {
    // Mobil Safari/Chrome compatibility pre-fetch voices reference
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const engVoice = voices.find(v => v.lang.startsWith("en-") || v.lang.startsWith("en_"));
      if (engVoice) {
        utterance.voice = engVoice;
      }
    }
  } catch (err) {
    console.warn("Could not pre-fetch system voices:", err);
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
    
    // Fallback heartbeat for iOS/Safari where speech synthesis crashes arbitrarily
    const r = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(r);
      } else {
        try {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } catch (e) {}
      }
    }, 10000);

  } catch (err) {
    console.error("Critical error starting speech synthesis, attempting fallback cancel:", err);
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (retryErr) {
      console.error("Speech retry failed:", retryErr);
      setIsPlaying(false);
    }
  }
};

export const stopSpeech = () => {
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn(e);
    }
  }
};
