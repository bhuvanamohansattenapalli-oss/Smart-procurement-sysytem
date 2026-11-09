import type { Language } from "./translations";
import { apiUrl } from "./api";

// Active audio tracking
let currentAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentCancelCallback: (() => void) | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Initialize voices cache
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Strips markdown, emojis, asterisks, URLs, and converts symbols into
 * natural spoken words for Telugu, Hindi, and English.
 */
export function cleanTextForSpeech(rawText: string, language: Language): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove markdown links, keep label: [Label](url) -> Label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 2. Remove raw URLs
  text = text.replace(/https?:\/\/\S+/gi, "");

  // 3. Remove markdown headers, bold, italics, code blocks
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/#{1,6}\s+/g, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // 4. Remove list bullet marks
  text = text.replace(/^\s*[-*•]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // 5. Expand symbols & abbreviations to target language words
  if (language === "TE") {
    text = text.replace(/₹\s*([\d,]+)/g, "$1 రూపాయలు");
    text = text.replace(/Rs\.?\s*([\d,]+)/gi, "$1 రూపాయలు");
    text = text.replace(/([\d,]+)\s*₹/g, "$1 రూపాయలు");
    text = text.replace(/%/g, " శాతం");
    text = text.replace(/\bMSP\b/gi, "కనీస మద్దతు ధర");
    text = text.replace(/\bDBT\b/gi, "ప్రత్యక్ష నగదు బదిలీ");
    text = text.replace(/\bQC\b/gi, "నాణ్యత తనిఖీ");
    text = text.replace(/\bFAQ\b/gi, "సగటు నాణ్యతా ప్రమాణాలు");
    text = text.replace(/\bkg\b/gi, "కిలోలు");
    text = text.replace(/\bquintal\b/gi, "క్వింటాలు");
  } else if (language === "HI") {
    text = text.replace(/₹\s*([\d,]+)/g, "$1 रुपये");
    text = text.replace(/Rs\.?\s*([\d,]+)/gi, "$1 रुपये");
    text = text.replace(/([\d,]+)\s*₹/g, "$1 रुपये");
    text = text.replace(/%/g, " प्रतिशत");
    text = text.replace(/\bMSP\b/gi, "न्यूनतम समर्थन मूल्य");
    text = text.replace(/\bDBT\b/gi, "प्रत्यक्ष लाभ अंतरण");
    text = text.replace(/\bQC\b/gi, "गुणवत्ता जांच");
    text = text.replace(/\bFAQ\b/gi, "उचित औसत गुणवत्ता");
    text = text.replace(/\bkg\b/gi, "किलो");
    text = text.replace(/\bquintal\b/gi, "क्विंटल");
  } else {
    text = text.replace(/₹\s*([\d,]+)/g, "$1 Rupees");
    text = text.replace(/Rs\.?\s*([\d,]+)/gi, "$1 Rupees");
    text = text.replace(/%/g, " percent");
    text = text.replace(/\bMSP\b/gi, "Minimum Support Price");
    text = text.replace(/\bDBT\b/gi, "Direct Benefit Transfer");
    text = text.replace(/\bQC\b/gi, "Quality Control");
  }

  // 6. Remove decorative emojis and pictographs
  text = text.replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/g, "");

  // 7. Clean up extraneous punctuation, spaces, quotes
  text = text.replace(/[\\/|><~`]/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Phonetic transliteration from Telugu script to readable Latin characters
 * so that English TTS engines do not skip Telugu words if a native voice is absent.
 */
export function transliterateTelugu(text: string): string {
  const vowels: Record<string, string> = {
    "\u0C05": "a", "\u0C06": "aa", "\u0C07": "i", "\u0C08": "ee",
    "\u0C09": "u", "\u0C0A": "oo", "\u0C0B": "ru", "\u0C0E": "e",
    "\u0C0F": "ae", "\u0C10": "ai", "\u0C12": "o", "\u0C13": "o",
    "\u0C14": "au", "\u0C02": "m ", "\u0C03": "ha", "\u0C01": "m"
  };
  const matras: Record<string, string> = {
    "\u0C3E": "aa", "\u0C3F": "i", "\u0C40": "ee", "\u0C41": "u",
    "\u0C42": "oo", "\u0C43": "ru", "\u0C46": "e", "\u0C47": "ae",
    "\u0C48": "ai", "\u0C4A": "o", "\u0C4B": "o", "\u0C4C": "au",
    "\u0C4D": "" // virama
  };
  const consonants: Record<string, string> = {
    "\u0C15": "ka", "\u0C16": "kha", "\u0C17": "ga", "\u0C18": "gha", "\u0C19": "nga",
    "\u0C1A": "cha", "\u0C1B": "chha", "\u0C1C": "ja", "\u0C1D": "jha", "\u0C1E": "nya",
    "\u0C1F": "ta", "\u0C20": "tha", "\u0C21": "da", "\u0C22": "dha", "\u0C23": "na",
    "\u0C24": "tha", "\u0C25": "thha", "\u0C26": "da", "\u0C27": "dha", "\u0C28": "na",
    "\u0C2A": "pa", "\u0C2B": "pha", "\u0C2C": "ba", "\u0C2D": "bha", "\u0C2E": "ma",
    "\u0C2F": "ya", "\u0C30": "ra", "\u0C31": "rra", "\u0C32": "la", "\u0C33": "la",
    "\u0C35": "va", "\u0C36": "sha", "\u0C37": "sha", "\u0C38": "sa", "\u0C39": "ha"
  };

  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (vowels[ch]) {
      out += vowels[ch];
    } else if (consonants[ch]) {
      const base = consonants[ch].slice(0, -1);
      if (next && matras[next] !== undefined) {
        out += base + matras[next];
        i++;
      } else {
        out += consonants[ch];
      }
    } else if (matras[ch]) {
      out += matras[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Phonetic transliteration from Devanagari (Hindi) script to readable Latin characters
 * so that English TTS engines do not skip Hindi words if a native voice is absent.
 */
export function transliterateHindi(text: string): string {
  const vowels: Record<string, string> = {
    "\u0905": "a", "\u0906": "aa", "\u0907": "i", "\u0908": "ee",
    "\u0909": "u", "\u090A": "oo", "\u090B": "ri", "\u090E": "e",
    "\u090F": "ae", "\u0910": "ai", "\u0912": "o", "\u0913": "o",
    "\u0914": "au", "\u0902": "n ", "\u0903": "ha", "\u0901": "n"
  };
  const matras: Record<string, string> = {
    "\u093E": "aa", "\u093F": "i", "\u0940": "ee", "\u0941": "u",
    "\u0942": "oo", "\u0943": "ri", "\u0946": "e", "\u0947": "ae",
    "\u0948": "ai", "\u094A": "o", "\u094B": "o", "\u094C": "au",
    "\u094D": ""
  };
  const consonants: Record<string, string> = {
    "\u0915": "ka", "\u0916": "kha", "\u0917": "ga", "\u0918": "gha", "\u0919": "nga",
    "\u091A": "cha", "\u091B": "chha", "\u091C": "ja", "\u091D": "jha", "\u091E": "nya",
    "\u091F": "ta", "\u0920": "tha", "\u0921": "da", "\u0922": "dha", "\u0923": "na",
    "\u0924": "ta", "\u0925": "tha", "\u0926": "da", "\u0927": "dha", "\u0928": "na",
    "\u092A": "pa", "\u092B": "pha", "\u092C": "ba", "\u092D": "bha", "\u092E": "ma",
    "\u092F": "ya", "\u0930": "ra", "\u0932": "la", "\u0933": "la", "\u0935": "va",
    "\u0936": "sha", "\u0937": "sha", "\u0938": "sa", "\u0939": "ha"
  };

  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (vowels[ch]) {
      out += vowels[ch];
    } else if (consonants[ch]) {
      const base = consonants[ch].slice(0, -1);
      if (next && matras[next] !== undefined) {
        out += base + matras[next];
        i++;
      } else {
        out += consonants[ch];
      }
    } else if (matras[ch]) {
      out += matras[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Finds a matching voice in window.speechSynthesis that truly supports the given language.
 */
function findNativeIndicVoice(lang: Language): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const code = lang === "TE" ? "te" : lang === "HI" ? "hi" : "en";

  // 1. Language code match (te-IN, te_IN, te)
  let voice = voices.find(v => {
    const l = (v.lang || "").toLowerCase().replace("_", "-");
    return l === `${code}-in` || l === code || l.startsWith(`${code}-`);
  });
  if (voice) return voice;

  // 2. Name contains language indicator
  const keyword = lang === "TE" ? "telugu" : lang === "HI" ? "hindi" : "english";
  voice = voices.find(v => (v.name || "").toLowerCase().includes(keyword));
  if (voice) return voice;

  // 3. Known vendor voice names
  if (lang === "TE") {
    voice = voices.find(
      v => (v.name || "").toLowerCase().includes("mohan") || (v.name || "").includes("తెలుగు")
    );
  } else if (lang === "HI") {
    voice = voices.find(
      v =>
        (v.name || "").toLowerCase().includes("kalpana") ||
        (v.name || "").toLowerCase().includes("hemant") ||
        (v.name || "").includes("हिन्दी")
    );
  }

  return voice || null;
}

/**
 * Splits text into chunks appropriate for audio synthesis (<= 180 chars).
 */
function splitIntoAudioChunks(text: string): string[] {
  if (!text) return [];

  // Split on sentence boundaries: periods, exclamation marks, question marks, danda, newlines
  const rawSentences = text.match(/[^.!?।\n]+[.!?।\n]*|.+$/g) || [text];
  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= 180) {
      chunks.push(trimmed);
    } else {
      // Split by commas or word boundaries
      const words = trimmed.split(/\s+/);
      let current = "";
      for (const w of words) {
        if ((current + " " + w).trim().length <= 180) {
          current = (current + " " + w).trim();
        } else {
          if (current) chunks.push(current);
          current = w;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks;
}

/**
 * Stops all ongoing speech playback immediately.
 */
export function stopSpeaking(): void {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.removeAttribute("src");
    currentAudioElement = null;
  }

  if (currentCancelCallback) {
    currentCancelCallback();
    currentCancelCallback = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  currentUtterance = null;
}

/**
 * Plays text aloud in Telugu, Hindi, or English without skipping any letters.
 *
 * Tier 1: Real native Indic voice in Web Speech API (if installed by OS/Browser).
 * Tier 2: Natural Indic streaming audio via Google Translate TTS (works on all devices).
 * Tier 3: Phonetic transliteration fallback to Web Speech API so English voice pronounces every word.
 */
export function speakText({
  text,
  language,
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  language: Language;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}): void {
  stopSpeaking();

  const clean = cleanTextForSpeech(text, language);
  if (!clean) {
    onEnd?.();
    return;
  }

  onStart?.();

  // Tier 1: Check if browser already has a verified native voice for this language
  const nativeVoice = findNativeIndicVoice(language);
  if (nativeVoice && typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.voice = nativeVoice;
      utterance.lang = nativeVoice.lang || (language === "TE" ? "te-IN" : language === "HI" ? "hi-IN" : "en-IN");
      utterance.rate = language === "TE" ? 0.95 : language === "HI" ? 0.95 : 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        currentUtterance = null;
        onEnd?.();
      };
      utterance.onerror = (e) => {
        currentUtterance = null;
        // If native synthesis fails, fallback to Tier 2
        playViaAudioStream(clean, language, onEnd, onError);
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return;
    } catch {
      // Fall through to Tier 2
    }
  }

  // Tier 2: For Telugu or Hindi when native voice is missing, stream natural audio
  if (language === "TE" || language === "HI") {
    playViaAudioStream(clean, language, onEnd, (err) => {
      // Tier 3 Fallback: If network audio is unreachable (e.g. offline), use phonetic transliteration
      playViaTransliteratedSpeech(clean, language, onEnd, onError);
    });
    return;
  }

  // For English: standard SpeechSynthesis
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "en-IN";
      const enVoice = findNativeIndicVoice("EN");
      if (enVoice) utterance.voice = enVoice;

      utterance.onend = () => {
        currentUtterance = null;
        onEnd?.();
      };
      utterance.onerror = (e) => {
        currentUtterance = null;
        onError?.(e);
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return;
    } catch (err) {
      onError?.(err);
    }
  }

  onEnd?.();
}

/**
 * Streams natural audio chunks via HTML5 Audio element.
 */
function playViaAudioStream(
  text: string,
  language: Language,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  const tl = language === "TE" ? "te" : language === "HI" ? "hi" : "en";
  const chunks = splitIntoAudioChunks(text);

  if (chunks.length === 0) {
    onEnd?.();
    return;
  }

  let chunkIndex = 0;
  let isCancelled = false;

  currentCancelCallback = () => {
    isCancelled = true;
  };

  const playNextChunk = () => {
    if (isCancelled) return;

    if (chunkIndex >= chunks.length) {
      currentAudioElement = null;
      currentCancelCallback = null;
      onEnd?.();
      return;
    }

    const currentText = chunks[chunkIndex];
    chunkIndex++;

    const audioUrl = apiUrl(
      `/ai/tts?lang=${tl}&text=${encodeURIComponent(currentText)}`
    );

    const audio = new Audio(audioUrl);
    currentAudioElement = audio;

    audio.onended = () => {
      if (!isCancelled) {
        playNextChunk();
      }
    };

    audio.onerror = (e) => {
      if (isCancelled) return;
      currentAudioElement = null;
      currentCancelCallback = null;
      console.warn("Audio stream playback failed, falling back to transliterated speech:", e);
      playViaTransliteratedSpeech(text, language, onEnd, onError);
    };

    audio.play().catch((playErr) => {
      if (isCancelled) return;
      currentAudioElement = null;
      currentCancelCallback = null;
      console.warn("Audio play blocked or failed, falling back to transliterated speech:", playErr);
      playViaTransliteratedSpeech(text, language, onEnd, onError);
    });
  };

  playNextChunk();
}

/**
 * Phonetic transliteration fallback when offline and native voice is missing.
 */
function playViaTransliteratedSpeech(
  text: string,
  language: Language,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  const transliterated =
    language === "TE"
      ? transliterateTelugu(text)
      : language === "HI"
      ? transliterateHindi(text)
      : text;

  try {
    const utterance = new SpeechSynthesisUtterance(transliterated);
    utterance.lang = "en-IN";
    utterance.rate = 0.9; // Slightly slower for clear phonetic articulation

    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };
    utterance.onerror = (e) => {
      currentUtterance = null;
      onError?.(e);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    onError?.(err);
  }
}

