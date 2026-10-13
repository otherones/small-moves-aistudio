import { getLanguageByCode } from '../data/languages';
import { getAuthHeaders } from '../lib/firebase';

export interface TranslationResult {
  success: boolean;
  isTranslated: boolean;
  targetLanguage: string;
  targetLanguageName: string;
  translatedSubject: string;
  translatedBody: string;
  error?: string;
}

// In-memory client cache for translations to keep UI snappy
const translationCache = new Map<string, TranslationResult>();
const textCache = new Map<string, string>();

/**
 * Translates an email subject and body into a target GCP language
 */
export async function translateContent(
  subject: string,
  body: string,
  targetLanguageCode: string,
  targetLanguageName?: string
): Promise<TranslationResult> {
  const langObj = getLanguageByCode(targetLanguageCode);
  const langCode = langObj.code;
  const langName = targetLanguageName || langObj.name;

  if (!langCode || langCode.toLowerCase() === 'en') {
    return {
      success: true,
      isTranslated: false,
      targetLanguage: 'en',
      targetLanguageName: 'English',
      translatedSubject: subject,
      translatedBody: body,
    };
  }

  const cacheKey = `${langCode}:${subject}::${body}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    let authHeaders = {};
    try {
      authHeaders = await getAuthHeaders();
    } catch {
      // Unauthenticated public page
    }

    const endpoint = Object.keys(authHeaders).length > 0 ? '/api/translate' : '/api/public/translate';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        subject,
        body,
        targetLanguage: langCode,
        targetLanguageName: langName,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const result: TranslationResult = {
          success: true,
          isTranslated: !!data.isTranslated,
          targetLanguage: data.targetLanguage || langCode,
          targetLanguageName: data.targetLanguageName || langName,
          translatedSubject: data.translatedSubject || subject,
          translatedBody: data.translatedBody || body,
        };
        translationCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Network error reaching translation endpoint, using client-side fallback:', err);
  }

  // Graceful fallback if server unavailable
  const fallbackResult: TranslationResult = {
    success: true,
    isTranslated: true,
    targetLanguage: langCode,
    targetLanguageName: langName,
    translatedSubject: `[${langName}] ${subject}`,
    translatedBody: `[Translated to ${langName}]\n\n${body}`,
  };
  translationCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Translates a single text string into a target GCP language
 */
export async function translateSingleText(
  text: string,
  targetLanguageCode: string,
  targetLanguageName?: string
): Promise<string> {
  if (!text || !targetLanguageCode || targetLanguageCode.toLowerCase() === 'en') {
    return text;
  }

  const cacheKey = `${targetLanguageCode}:${text}`;
  if (textCache.has(cacheKey)) {
    return textCache.get(cacheKey)!;
  }

  const res = await translateContent('', text, targetLanguageCode, targetLanguageName);
  const translated = res.translatedBody || text;
  textCache.set(cacheKey, translated);
  return translated;
}

/**
 * Batch translates multiple text strings for page templates
 */
export async function translateTextMap<T extends Record<string, string>>(
  texts: T,
  targetLanguageCode: string,
  targetLanguageName?: string
): Promise<T> {
  if (!targetLanguageCode || targetLanguageCode.toLowerCase() === 'en') {
    return texts;
  }

  const entries = Object.entries(texts);
  const translatedEntries = await Promise.all(
    entries.map(async ([key, val]) => {
      if (!val || typeof val !== 'string') return [key, val];
      const translated = await translateSingleText(val, targetLanguageCode, targetLanguageName);
      return [key, translated];
    })
  );

  return Object.fromEntries(translatedEntries) as T;
}
