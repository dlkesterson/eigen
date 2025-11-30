import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';

// ---
// i18n Configuration
// ---

export const defaultNS = 'translation';
export const resources = {
  en: { translation: en },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // Disable suspense for SSR compatibility
  },
});

export default i18n;
