import React from 'react';
import { LANGUAGES } from '../constants';

interface Props {
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const LanguageSelector: React.FC<Props> = ({ selectedLanguage, onLanguageChange, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg theme-card border-t sm:border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b theme-border flex items-center justify-between sticky top-0 theme-card z-10">
          <h3 className="font-bold text-lg theme-text">Select Language</h3>
          <button onClick={onClose} className="p-2 theme-text-muted hover:opacity-70">
            <i className="fas fa-xmark text-xl"></i>
          </button>
        </div>
        <div className="overflow-y-auto p-2 no-scrollbar theme-bg">
          <div className="grid grid-cols-1 gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code);
                  onClose();
                }}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                  selectedLanguage === lang.code 
                  ? 'dynamic-accent-soft font-bold border-transparent' 
                  : 'hover:bg-indigo-600/5 theme-text-muted'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{lang.name}</span>
                  <span className="text-xs opacity-60 font-normal">{lang.nativeName}</span>
                </div>
                {selectedLanguage === lang.code && (
                  <i className="fas fa-check-circle dynamic-accent-text"></i>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 safe-pb border-t theme-border theme-card text-center text-[10px] theme-text-muted font-black opacity-40">
          18+ LANGUAGES SUPPORTED
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;