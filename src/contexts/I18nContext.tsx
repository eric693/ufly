import { createContext, useContext, useState, ReactNode } from 'react'
import translations, { Lang } from '../i18n/translations'

// Use the zh-TW translation as the canonical shape
type T = typeof translations['zh-TW']

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: T
}

const I18nContext = createContext<I18nCtx>({
  lang: 'zh-TW',
  setLang: () => {},
  t: translations['zh-TW'],
})

const STORAGE_KEY = 'ufly_lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    return saved && saved in translations ? saved : 'zh-TW'
  })

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] as T }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
