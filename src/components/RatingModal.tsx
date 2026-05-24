import { useState } from 'react'
import { Star, X, ThumbsUp, Navigation } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  driverName?: string
  orderId?: string
}

const QUICK_TAGS = ['準時到達', '態度親切', '小心輕放', '主動聯繫', '迅速完成']

export default function RatingModal({ open, onClose, driverName = '王小明', orderId = 'UF240001' }: Props) {
  const [rating, setRating]   = useState(0)
  const [hover, setHover]     = useState(0)
  const [tags, setTags]       = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const handleSubmit = () => {
    setSubmitted(true)
    setTimeout(() => { setSubmitted(false); onClose() }, 1800)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-800 border border-surface-600
                      rounded-t-3xl md:rounded-3xl shadow-2xl p-6 animate-slide-up">
        <button onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-surface-400 hover:text-white hover:bg-surface-700">
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ThumbsUp size={28} className="text-white" />
            </div>
            <div className="text-xl font-bold mb-1">感謝您的評價！</div>
            <div className="text-surface-300 text-sm">您的回饋幫助我們不斷進步</div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Navigation size={26} className="text-white" />
              </div>
              <div className="font-bold text-lg">{driverName}</div>
              <div className="text-surface-400 text-sm mt-0.5">訂單 {orderId} · 已完成</div>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className="transition-transform hover:scale-110 active:scale-95">
                  <Star size={36}
                    className={`transition-colors ${s <= (hover || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-surface-500'}`} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="text-center text-sm text-surface-300 mb-4 -mt-2">
                {['', '需要改進', '尚可', '不錯', '很好', '非常完美！'][rating]}
              </div>
            )}

            {/* Quick tags */}
            {rating >= 4 && (
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {QUICK_TAGS.map(t => (
                  <button key={t}
                    onClick={() => toggleTag(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                      ${tags.includes(t)
                        ? 'bg-white text-black'
                        : 'bg-surface-700 text-surface-200 hover:bg-surface-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Comment */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="留下您的感想（選填）"
              className="w-full bg-surface-700 border border-surface-600 rounded-2xl px-4 py-3
                         text-sm text-white placeholder-surface-400 resize-none h-20
                         focus:border-white outline-none transition-colors mb-4"
            />

            <button
              disabled={rating === 0}
              onClick={handleSubmit}
              className="btn-primary w-full disabled:opacity-40">
              送出評價
            </button>
          </>
        )}
      </div>
    </div>
  )
}
