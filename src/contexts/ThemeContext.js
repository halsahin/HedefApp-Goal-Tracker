import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors } from '../constants/theme';

const STORAGE_KEY = 'app_theme'; // 'light' | 'dark' | 'system'

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme(); // 'light' | 'dark' | null
    const [themeMode, setThemeModeState] = useState('system');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(saved => {
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                setThemeModeState(saved);
            }
        });
    }, []);

    const setThemeMode = (mode) => {
        setThemeModeState(mode);
        AsyncStorage.setItem(STORAGE_KEY, mode);
    };

    const isDark =
        themeMode === 'dark'  ? true  :
        themeMode === 'light' ? false :
        systemScheme === 'dark';

    const colors = isDark ? DarkColors : LightColors;

    return (
        <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
