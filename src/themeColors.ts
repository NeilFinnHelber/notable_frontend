// themeColors.ts
// Centralized color definitions for Notable Notes Application themes
// Use these color tokens throughout the app (except for Ionic's note/folder colors)

export type ThemeName = 'arcticFox' | 'darkFox' | 'redFox' | 'corsacFox';

export interface ThemeColors {
  background: string;      // Main app background
  surface: string;         // Card/modal backgrounds
  primary: string;         // Main accent (buttons, highlights)
  secondary: string;       // Secondary accent
  accent: string;          // Extra accent (links, icons)
  error: string;           // Error messages
  warning: string;         // Warning messages
  success: string;         // Success messages
  text: string;            // Main text color
  textMuted: string;       // Muted/secondary text
  border: string;          // Borders/dividers
  overlay: string;         // Modal overlays
  noteBg: string;          // Note background
  folderBg: string;        // Folder background
  hoverBg: string;         // Background color when hovering over items
  hoverText: string;       // Text color when hovering over items
  standardNoteText: string;// Text color for standard notes
  standardFolderText: string; // Text color for standard folders
  standardIconColor: string; // Icon color for standard items
  modalText: string;       // Text color for modals
}

export const themes: Record<ThemeName, ThemeColors> = {
  arcticFox: {
    background: '#f9f9fb',
    surface: '#ffffff',
    primary: '#4b6bfa',
    secondary: '#a0b4ff',
    accent: '#c2d5ff',
    error: '#ef4444',
    warning: '#f59e42',
    success: '#22c55e',
    text: '#18181b',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    overlay: 'rgba(0,0,0,0.2)',
    noteBg: '#e0e7ef',      // darker than background
    folderBg: '#e0e7ef',    // darker than background
    hoverBg: '#e6f0ff',
    hoverText: '#4b6bfa',
    standardNoteText: '#000000',
    standardFolderText: '#000000',
    standardIconColor: '#000000',
    modalText: '#000000',
  },
  darkFox: {
    background: '#18181b',
    surface: '#232336',
    primary: '#60a5fa',
    secondary: '#a78bfa',
    accent: '#fbbf24',
    error: '#f87171',
    warning: '#fbbf24',
    success: '#4ade80',
    text: '#f3f4f6',
    textMuted: '#9ca3af',
    border: '#2a2a38',
    overlay: 'rgba(0,0,0,0.5)',
    noteBg: '#202d3a',
    folderBg: '#202d3a',
    hoverBg: '#2a2a4a',
    hoverText: '#60a5fa',
    standardNoteText: '#f3f4f6',  // Keep light text for dark theme
    standardFolderText: '#f3f4f6', // Keep light text for dark theme
    standardIconColor: '#f3f4f6',  // Keep light icons for dark theme
    modalText: '#f3f4f6',          // Keep light text for dark theme
  },
  redFox: {
    background: '#F5ECD5',
    surface: '#F5ECD5',
    primary: '#A4B465',
    secondary: '#626F47',
    accent: '#F0BB78',
    error: '#dc322f',
    warning: '#cb4b16',
    success: '#859900',
    text: '#626F47',
    textMuted: '#8c6e63',
    border: '#F0BB78',
    overlay: 'rgba(244, 187, 120, 0.15)',
    noteBg: '#F0BB78',      // noticeably darker/oranger than background
    folderBg: '#F0BB78',
    hoverBg: '#F0BB78',
    hoverText: '#A4B465',
    standardNoteText: '#000000',
    standardFolderText: '#000000',
    standardIconColor: '#000000',
    modalText: '#000000',
  },
  corsacFox: {
    background: '#DFD0B8',
    surface: '#DFD0B8',
    primary: '#393E46',
    secondary: '#948979',
    accent: '#948979',
    error: '#e57373',
    warning: '#ffd54f',
    success: '#81c784',
    text: '#222831',
    textMuted: '#948979',
    border: '#393E46',
    overlay: 'rgba(223, 208, 184, 0.15)',
    noteBg: '#948979',      // darker than background
    folderBg: '#948979',
    hoverBg: '#393E46',
    hoverText: '#DFD0B8',
    standardNoteText: '#000000',
    standardFolderText: '#000000',
    standardIconColor: '#000000',
    modalText: '#000000',
  },
};

// Utility to apply a theme by updating CSS variables (optional, for integration)
export function applyTheme(theme: ThemeColors | undefined | null, themeName?: string) {
  // Safety check - if theme is null or undefined, use the default darkFox theme
  if (!theme) {
    console.warn('Theme is undefined or null, using default darkFox theme');
    theme = themes.darkFox;
  }
  
  // Safely apply theme properties
  Object.entries(theme).forEach(([key, value]) => {
    if (value) {
      document.documentElement.style.setProperty(`--notable-${key}`, value);
    }
  });
  
  // Also update Ionic variables for deeper integration
  if (theme.background) document.documentElement.style.setProperty('--ion-background-color', theme.background);
  if (theme.primary) document.documentElement.style.setProperty('--ion-color-primary', theme.primary);
  if (theme.surface) {
    document.documentElement.style.setProperty('--ion-toolbar-background', theme.surface);
    document.documentElement.style.setProperty('--ion-item-background', theme.surface);
  }
  if (theme.text) document.documentElement.style.setProperty('--ion-text-color', theme.text);
  if (theme.secondary) document.documentElement.style.setProperty('--ion-color-secondary', theme.secondary);
  if (theme.success) document.documentElement.style.setProperty('--ion-color-success', theme.success);
  if (theme.warning) document.documentElement.style.setProperty('--ion-color-warning', theme.warning);
  if (theme.error) document.documentElement.style.setProperty('--ion-color-danger', theme.error);
  
  // Set note and folder backgrounds
  if (theme.noteBg) document.documentElement.style.setProperty('--notable-note-bg', theme.noteBg);
  if (theme.folderBg) document.documentElement.style.setProperty('--notable-folder-bg', theme.folderBg);
  
  // Set standard text colors for notes, folders, icons, and modals
  if (theme.standardNoteText) document.documentElement.style.setProperty('--notable-standard-note-text', theme.standardNoteText);
  if (theme.standardFolderText) document.documentElement.style.setProperty('--notable-standard-folder-text', theme.standardFolderText);
  if (theme.standardIconColor) document.documentElement.style.setProperty('--notable-standard-icon-color', theme.standardIconColor);
  if (theme.modalText) document.documentElement.style.setProperty('--notable-modal-text', theme.modalText);
  
  // Set the data-theme attribute on the body for theme detection (if applicable)
  if (themeName) {
    document.body.setAttribute('data-theme', themeName);
  }
}

// Usage:
// import { themes, applyTheme } from './themeColors';
// applyTheme(themes['dark']); // or any theme
