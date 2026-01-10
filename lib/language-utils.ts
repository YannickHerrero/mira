import type { AudioTrack, TextTrack } from "react-native-video";
import type { LanguageOption, SubtitleOption } from "@/stores/streaming-preferences";

/**
 * Language normalization map
 * Maps ISO 639-1/2/3 codes and various language name variations to canonical English names
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  // === English ===
  en: "English",
  eng: "English",
  english: "English",

  // === French ===
  fr: "French",
  fra: "French",
  fre: "French",
  french: "French",
  français: "French",
  francais: "French",

  // === German ===
  de: "German",
  deu: "German",
  ger: "German",
  german: "German",
  deutsch: "German",

  // === Spanish ===
  es: "Spanish",
  spa: "Spanish",
  spanish: "Spanish",
  español: "Spanish",
  espanol: "Spanish",
  castellano: "Spanish",

  // === Italian ===
  it: "Italian",
  ita: "Italian",
  italian: "Italian",
  italiano: "Italian",

  // === Portuguese ===
  pt: "Portuguese",
  por: "Portuguese",
  portuguese: "Portuguese",
  português: "Portuguese",
  portugues: "Portuguese",

  // === Russian ===
  ru: "Russian",
  rus: "Russian",
  russian: "Russian",
  русский: "Russian",

  // === Japanese ===
  ja: "Japanese",
  jpn: "Japanese",
  japanese: "Japanese",
  日本語: "Japanese",

  // === Korean ===
  ko: "Korean",
  kor: "Korean",
  korean: "Korean",
  한국어: "Korean",

  // === Chinese ===
  zh: "Chinese",
  zho: "Chinese",
  chi: "Chinese",
  chinese: "Chinese",
  中文: "Chinese",
  mandarin: "Chinese",
  cantonese: "Chinese",

  // === Hindi ===
  hi: "Hindi",
  hin: "Hindi",
  hindi: "Hindi",
  हिन्दी: "Hindi",

  // === Arabic ===
  ar: "Arabic",
  ara: "Arabic",
  arabic: "Arabic",
  العربية: "Arabic",

  // === Dutch ===
  nl: "Dutch",
  nld: "Dutch",
  dut: "Dutch",
  dutch: "Dutch",
  nederlands: "Dutch",
  flemish: "Dutch",

  // === Polish ===
  pl: "Polish",
  pol: "Polish",
  polish: "Polish",
  polski: "Polish",

  // === Turkish ===
  tr: "Turkish",
  tur: "Turkish",
  turkish: "Turkish",
  türkçe: "Turkish",
  turkce: "Turkish",

  // === Swedish ===
  sv: "Swedish",
  swe: "Swedish",
  swedish: "Swedish",
  svenska: "Swedish",

  // === Norwegian ===
  no: "Norwegian",
  nor: "Norwegian",
  nob: "Norwegian",
  nno: "Norwegian",
  norwegian: "Norwegian",
  norsk: "Norwegian",

  // === Danish ===
  da: "Danish",
  dan: "Danish",
  danish: "Danish",
  dansk: "Danish",

  // === Finnish ===
  fi: "Finnish",
  fin: "Finnish",
  finnish: "Finnish",
  suomi: "Finnish",

  // === Greek ===
  el: "Greek",
  ell: "Greek",
  gre: "Greek",
  greek: "Greek",
  ελληνικά: "Greek",

  // === Hebrew ===
  he: "Hebrew",
  heb: "Hebrew",
  hebrew: "Hebrew",
  עברית: "Hebrew",

  // === Thai ===
  th: "Thai",
  tha: "Thai",
  thai: "Thai",
  ไทย: "Thai",

  // === Vietnamese ===
  vi: "Vietnamese",
  vie: "Vietnamese",
  vietnamese: "Vietnamese",
  tiếng: "Vietnamese",

  // === Indonesian ===
  id: "Indonesian",
  ind: "Indonesian",
  indonesian: "Indonesian",

  // === Malay ===
  ms: "Malay",
  msa: "Malay",
  may: "Malay",
  malay: "Malay",
  melayu: "Malay",

  // === Filipino ===
  fil: "Filipino",
  tl: "Filipino",
  tgl: "Filipino",
  tagalog: "Filipino",
  filipino: "Filipino",

  // === Additional common languages (for future expansion) ===
  // Czech
  cs: "Czech",
  ces: "Czech",
  cze: "Czech",
  czech: "Czech",

  // Hungarian
  hu: "Hungarian",
  hun: "Hungarian",
  hungarian: "Hungarian",

  // Romanian
  ro: "Romanian",
  ron: "Romanian",
  rum: "Romanian",
  romanian: "Romanian",

  // Ukrainian
  uk: "Ukrainian",
  ukr: "Ukrainian",
  ukrainian: "Ukrainian",
};

const LANGUAGE_POPULARITY = [
  "English",
  "French",
  "Spanish",
  "Hindi",
  "Portuguese",
  "Russian",
  "Japanese",
  "German",
  "Italian",
  "Korean",
  "Chinese",
  "Arabic",
  "Turkish",
  "Polish",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Hebrew",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Filipino",
  "Czech",
  "Hungarian",
  "Romanian",
  "Ukrainian",
];

const LANGUAGE_POPULARITY_RANK = new Map(
  LANGUAGE_POPULARITY.map((language, index) => [language, index])
);

function normalizeLanguageName(language: string): string {
  const normalized = language.trim().toLowerCase();
  return LANGUAGE_ALIASES[normalized] ?? language;
}

export function sortLanguagesByPopularity(
  languages: string[],
  preferredLanguages: string[] = []
): string[] {
  const preferredOrder = new Map<string, number>();
  preferredLanguages.forEach((language, index) => {
    const normalized = normalizeLanguageName(language);
    if (!preferredOrder.has(normalized)) {
      preferredOrder.set(normalized, index);
    }
  });

  const languageItems = languages.map((language, index) => {
    const normalized = normalizeLanguageName(language);
    const rank = LANGUAGE_POPULARITY_RANK.get(normalized) ?? Number.POSITIVE_INFINITY;
    const preferredRank = preferredOrder.get(normalized) ?? Number.POSITIVE_INFINITY;

    return {
      language,
      normalized,
      rank,
      preferredRank,
      index,
    };
  });

  return languageItems
    .sort((a, b) => {
      if (a.preferredRank !== b.preferredRank) {
        return a.preferredRank - b.preferredRank;
      }

      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }

      const nameCompare = a.normalized.localeCompare(b.normalized);
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return a.index - b.index;
    })
    .map((item) => item.language);
}

/**
 * Extracts and normalizes the language from a track name/title
 * VLC tracks often have formats like:
 * - "English"
 * - "English (AC3 5.1)"
 * - "[eng] English"
 * - "eng - English"
 * - "Track 1"
 *
 * @param trackName The track name/title from VLC
 * @returns The normalized language name or null if not detected
 */
export function extractLanguageFromTrack(trackName: string): string | null {
  if (!trackName) return null;

  const normalized = trackName.toLowerCase().trim();

  // Pattern 1: Check for ISO codes in brackets [eng], [fra], [en]
  const bracketMatch = normalized.match(/\[([a-z]{2,3})\]/);
  if (bracketMatch) {
    const code = bracketMatch[1];
    if (LANGUAGE_ALIASES[code]) {
      return LANGUAGE_ALIASES[code];
    }
  }

  // Pattern 2: Check for "code - language" or "code: language" format
  const prefixMatch = normalized.match(/^([a-z]{2,3})\s*[-–—:]\s*/);
  if (prefixMatch) {
    const code = prefixMatch[1];
    if (LANGUAGE_ALIASES[code]) {
      return LANGUAGE_ALIASES[code];
    }
  }

  // Pattern 3: Check each word against aliases (handles "English 5.1 DTS")
  const words = normalized.split(/[\s\-_()[\]:,./]+/);
  for (const word of words) {
    if (word && LANGUAGE_ALIASES[word]) {
      return LANGUAGE_ALIASES[word];
    }
  }

  // Pattern 4: Substring matching for longer language names
  // Only check aliases with 4+ characters to avoid false positives
  for (const [alias, language] of Object.entries(LANGUAGE_ALIASES)) {
    if (alias.length >= 4 && normalized.includes(alias)) {
      return language;
    }
  }

  return null;
}

/**
 * Checks if a track appears to be a commentary track
 */
function isCommentaryTrack(track: AudioTrack | TextTrack): boolean {
  const name = (track.title || track.language || "").toLowerCase();
  return (
    name.includes("commentary") ||
    name.includes("director") ||
    name.includes("cast") ||
    name.includes("crew")
  );
}

/**
 * Checks if a track appears to be forced subtitles
 */
function isForcedSubtitle(track: TextTrack): boolean {
  const name = (track.title || track.language || "").toLowerCase();
  return name.includes("forced") || name.includes("signs");
}

/**
 * Finds the best matching audio track based on user preferences
 *
 * @param tracks Available audio tracks from the video
 * @param preferredLanguages Ordered array of preferred languages (first = highest priority)
 * @returns The best matching track, or the first track if no preference matches
 */
export function findBestAudioTrack(
  tracks: AudioTrack[],
  preferredLanguages: LanguageOption[]
): AudioTrack | null {
  if (!tracks || tracks.length === 0) return null;
  if (preferredLanguages.length === 0) return tracks[0]; // No preference, use default

  // Build a map of tracks by their detected language
  const tracksByLanguage = new Map<string, AudioTrack[]>();

  for (const track of tracks) {
    const language = extractLanguageFromTrack(track.title || track.language || "");
    if (language) {
      const existing = tracksByLanguage.get(language) || [];
      existing.push(track);
      tracksByLanguage.set(language, existing);
    }
  }

  // Find first match in preference order
  for (const preferred of preferredLanguages) {
    const matches = tracksByLanguage.get(preferred);
    if (matches && matches.length > 0) {
      // Prefer non-commentary tracks
      const nonCommentary = matches.find((t) => !isCommentaryTrack(t));
      return nonCommentary || matches[0];
    }
  }

  // No preference matched, fall back to first track
  return tracks[0];
}

/**
 * Finds the best matching subtitle track based on user preferences
 *
 * @param tracks Available text/subtitle tracks from the video
 * @param preferredLanguages Ordered array of preferred languages (first = highest priority)
 *                           Can include "Off" to disable subtitles if no match
 * @returns Object with the best matching track (or null) and whether to disable subtitles
 */
export function findBestSubtitleTrack(
  tracks: TextTrack[],
  preferredLanguages: SubtitleOption[]
): { track: TextTrack | null; shouldDisable: boolean } {
  if (!tracks || tracks.length === 0) {
    return { track: null, shouldDisable: false };
  }

  if (preferredLanguages.length === 0) {
    // No preference, don't auto-select anything
    return { track: null, shouldDisable: false };
  }

  // Build a map of tracks by their detected language
  const tracksByLanguage = new Map<string, TextTrack[]>();

  for (const track of tracks) {
    const language = extractLanguageFromTrack(track.title || track.language || "");
    if (language) {
      const existing = tracksByLanguage.get(language) || [];
      existing.push(track);
      tracksByLanguage.set(language, existing);
    }
  }

  // Find first match in preference order
  for (const preferred of preferredLanguages) {
    // Check for "Off" option
    if (preferred === "Off") {
      return { track: null, shouldDisable: true };
    }

    const matches = tracksByLanguage.get(preferred);
    if (matches && matches.length > 0) {
      // Prefer non-forced, non-SDH tracks first
      const regular = matches.find((t) => !isForcedSubtitle(t));
      return { track: regular || matches[0], shouldDisable: false };
    }
  }

  // No preference matched and "Off" was not in the list
  // Don't auto-select anything, let the player use its default
  return { track: null, shouldDisable: false };
}

/**
 * Gets a display-friendly description of track language preferences
 *
 * @param languages Ordered array of preferred languages
 * @returns Human-readable string like "French, then English" or "No preference"
 */
export function getPreferenceDisplayText(languages: (LanguageOption | SubtitleOption)[]): string {
  if (languages.length === 0) {
    return "No preference";
  }

  if (languages.length === 1) {
    return languages[0];
  }

  if (languages.length === 2) {
    return `${languages[0]}, then ${languages[1]}`;
  }

  // For 3+ items, show first two and count
  return `${languages[0]}, ${languages[1]} +${languages.length - 2} more`;
}
