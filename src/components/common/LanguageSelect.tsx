import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, Search, ChevronDown } from 'lucide-react';
import { GCP_SUPPORTED_LANGUAGES, SupportedLanguage, getLanguageByCode } from '../../data/languages';

interface LanguageSelectProps {
  value: string;
  onChange: (languageCode: string, languageName: string) => void;
  label?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({
  value,
  onChange,
  label = 'Beneficiary Preferred Language',
  helperText = 'Communications will automatically be translated if not English.',
  required = false,
  disabled = false,
  className = '',
  id = 'beneficiary-language-select',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedLang = getLanguageByCode(value || 'en');

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredLanguages = GCP_SUPPORTED_LANGUAGES.filter((l) => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    return (
      l.name.toLowerCase().includes(search) ||
      (l.nativeName && l.nativeName.toLowerCase().includes(search)) ||
      l.code.toLowerCase().includes(search)
    );
  });

  const popularLanguages = filteredLanguages.filter((l) => l.popular);
  const otherLanguages = filteredLanguages.filter((l) => !l.popular);

  const handleSelect = (lang: SupportedLanguage) => {
    onChange(lang.code, lang.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id={`${id}-wrapper`}>
      {label && (
        <label htmlFor={id} className="block font-medium text-slate-700 mb-1 text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white border rounded-xl font-normal text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-[#0089B3] ring-1 ring-[#0089B3] shadow-xs'
            : 'border-slate-300 hover:border-slate-400 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Globe className="w-4 h-4 text-[#0089B3] shrink-0" />
          <span className="font-semibold text-slate-900 truncate">
            {selectedLang.name} {selectedLang.nativeName && selectedLang.nativeName !== selectedLang.name ? `(${selectedLang.nativeName})` : ''}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-medium shrink-0">
            {selectedLang.code.toUpperCase()}
          </span>
          {selectedLang.code !== 'en' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200 shrink-0">
              Auto-Translate
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {helperText && (
        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-normal">
          <span>{helperText}</span>
          {selectedLang.code !== 'en' && (
            <span className="font-medium text-[#006E8F]">
              (Emails to beneficiary will be translated into {selectedLang.name})
            </span>
          )}
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-80 flex flex-col">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search GCP supported languages (e.g. Spanish, Arabic, vi)..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-hidden focus:border-[#0089B3] focus:ring-1 focus:ring-[#0089B3]"
              />
            </div>
          </div>

          {/* Languages List */}
          <div className="overflow-y-auto p-1.5 space-y-2 text-xs divide-y divide-slate-100">
            {/* Common / Popular section if not searching */}
            {popularLanguages.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {searchTerm ? 'Matching Popular Languages' : 'Frequently Used Languages'}
                </div>
                {popularLanguages.map((lang) => {
                  const isSelected = selectedLang.code.toLowerCase() === lang.code.toLowerCase();
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelect(lang)}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#EDF7FC] text-[#006E8F] font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-900 font-normal truncate">{lang.name}</span>
                        {lang.nativeName && lang.nativeName !== lang.name && (
                          <span className="text-[11px] text-slate-400 truncate">({lang.nativeName})</span>
                        )}
                        <span className="text-[10px] font-mono px-1 bg-slate-100 text-slate-500 rounded font-medium">
                          {lang.code}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0089B3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* All other GCP languages */}
            {otherLanguages.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {searchTerm ? 'Other Matching Languages' : 'All GCP Supported Languages'}
                </div>
                {otherLanguages.map((lang) => {
                  const isSelected = selectedLang.code.toLowerCase() === lang.code.toLowerCase();
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelect(lang)}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#EDF7FC] text-[#006E8F] font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-900 font-normal truncate">{lang.name}</span>
                        {lang.nativeName && lang.nativeName !== lang.name && (
                          <span className="text-[11px] text-slate-400 truncate">({lang.nativeName})</span>
                        )}
                        <span className="text-[10px] font-mono px-1 bg-slate-100 text-slate-500 rounded font-medium">
                          {lang.code}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0089B3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredLanguages.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs italic">
                No matching GCP languages found for "{searchTerm}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
