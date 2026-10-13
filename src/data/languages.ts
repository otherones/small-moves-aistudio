export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName?: string;
  popular?: boolean;
}

/**
 * Full list of languages supported by Google Cloud Translation API (ISO 639-1 / BCP-47)
 */
export const GCP_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // Popular / Primary Languages for School Communities
  { code: 'en', name: 'English', nativeName: 'English', popular: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', popular: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', popular: true },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', popular: true },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', popular: true },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', popular: true },
  { code: 'fr', name: 'French', nativeName: 'Français', popular: true },
  { code: 'tl', name: 'Tagalog / Filipino', nativeName: 'Tagalog', popular: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', popular: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', popular: true },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl ayisyen', popular: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', popular: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', popular: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', popular: true },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', popular: true },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', popular: true },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', popular: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', popular: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', popular: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', popular: true },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', popular: true },

  // Additional GCP Supported Languages
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan dili' },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Sinugboanon' },
  { code: 'ny', name: 'Chichewa', nativeName: 'ChiCheŵa' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'ee', name: 'Ewe', nativeName: 'Èʋegbe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fy', name: 'Frisian', nativeName: 'Frysk' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gn', name: 'Guarani', nativeName: 'Avañeʼẽ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo' },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda' },
  { code: 'gom', name: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'kri', name: 'Krio', nativeName: 'Krio' },
  { code: 'ku', name: 'Kurdish (Kurmanji)', nativeName: 'Kurdî' },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lg', name: 'Luganda', nativeName: 'Oluganda' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'mni-Mtei', name: 'Meiteilon (Manipuri)', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'or', name: 'Odia (Oriya)', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'gd', name: 'Scots Gaelic', nativeName: 'Gàidhlig' },
  { code: 'nso', name: 'Sepedi', nativeName: 'Sesotho sa Leboa' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho' },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татар' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ' },
  { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe' },
  { code: 'ak', name: 'Twi (Akan)', nativeName: 'Twi' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
];

/**
 * Looks up language by ISO code (defaulting to English if not found or empty)
 */
export function getLanguageByCode(code?: string): SupportedLanguage {
  if (!code) {
    return GCP_SUPPORTED_LANGUAGES[0]; // English
  }
  const normalized = code.toLowerCase().trim();
  const match = GCP_SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === normalized || l.code.toLowerCase().startsWith(normalized)
  );
  return match || { code, name: code.toUpperCase() };
}

/**
 * Returns formatted display name for a language code (e.g. "Spanish (Español)")
 */
export function getLanguageDisplayName(code?: string): string {
  const lang = getLanguageByCode(code);
  if (lang.nativeName && lang.nativeName !== lang.name) {
    return `${lang.name} (${lang.nativeName})`;
  }
  return lang.name;
}
