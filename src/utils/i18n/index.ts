import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { vi } from './vi'

export type GuestLanguage = 'vi' | 'en'

export const GUEST_LANGUAGE_KEY = 'spotway.guest.language'

function initialLanguage(): GuestLanguage {
  try {
    const saved = window.localStorage.getItem(GUEST_LANGUAGE_KEY)
    if (saved === 'vi' || saved === 'en') return saved
  } catch {
    // localStorage không dùng được: theo ngôn ngữ trình duyệt.
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en') ? 'en' : 'vi'
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { vi: { translation: vi }, en: { translation: en } },
    lng: initialLanguage(),
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
    returnNull: false,
  })
}

export function setGuestLanguage(language: GuestLanguage) {
  try {
    window.localStorage.setItem(GUEST_LANGUAGE_KEY, language)
  } catch {
    // bỏ qua
  }
  return i18n.changeLanguage(language)
}

export default i18n
