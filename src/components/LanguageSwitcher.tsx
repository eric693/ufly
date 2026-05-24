import { useState, useRef, useEffect } from 'react'
import { Languages } from 'lucide-react'
import { useI18n } from '../contexts/I18nContext'
import { Lang } from '../i18n/translations'

const OPTIONS: { value: Lang; flag: string }[] = [
  { value: 'zh-TW', flag: '🇹🇼' },
  { value: 'en',    flag: '🇺🇸' },
  { value: 'zh-CN', flag: '🇨🇳' },
]

interface Props {
  dark?: boolean
}

export default function LanguageSwitcher({ dark = false }: Props) {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen]      = useState(false)
  const ref                  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = OPTIONS.find(o => o.value === lang)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors
          ${dark
            ? 'text-gray-300 hover:text-white hover:bg-surface-700'
            : 'text-paper-600 hover:text-paper-900 hover:bg-paper-100'
          }`}
        title={t.lang.label}
      >
        <Languages size={14} />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{t.lang[lang]}</span>
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1 rounded-2xl shadow-card-xl border z-50 py-1 min-w-[130px]
          ${dark ? 'bg-[#1a1a1e] border-surface-700' : 'bg-white border-paper-200'}`}>
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setLang(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                ${lang === opt.value
                  ? dark ? 'text-white bg-white/10' : 'text-paper-900 bg-paper-100 font-semibold'
                  : dark ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-paper-600 hover:text-paper-900 hover:bg-paper-50'
                }`}
            >
              <span>{opt.flag}</span>
              <span>{t.lang[opt.value]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
