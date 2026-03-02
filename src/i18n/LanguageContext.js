import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from './translations';

const STORAGE_KEY = 'app_language';

const LOCALES = {
    tr: 'tr-TR',
    en: 'en-US',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
};

export const LANGUAGES = [
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState('tr');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(saved => {
            if (saved && translations[saved]) setLanguageState(saved);
        });
    }, []);

    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
        AsyncStorage.setItem(STORAGE_KEY, lang);
    }, []);

    const t = useCallback((key, params = {}) => {
        const dict = translations[language] || translations.tr;
        let str = dict[key] ?? key;
        Object.entries(params).forEach(([k, v]) => {
            str = str.replace(`{${k}}`, v);
        });
        return str;
    }, [language]);

    const locale = LOCALES[language] || 'tr-TR';

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
