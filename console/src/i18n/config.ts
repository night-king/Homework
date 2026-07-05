import i18n from 'i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n.use(HttpBackend).use(LanguageDetector).use(initReactI18next).init({
  fallbackLng: 'zh-CN',
  supportedLngs: ['zh-CN', 'en'],
  interpolation: { escapeValue: false },
  backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
  detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
})
export default i18n
