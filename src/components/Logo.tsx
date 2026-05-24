import { Zap } from 'lucide-react'
import clsx from 'clsx'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
}

export default function Logo({ size = 'md', variant = 'light' }: LogoProps) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }
  const iconSizes = { sm: 14, md: 18, lg: 24 }

  return (
    <div className={clsx('flex items-center gap-1.5 font-black tracking-tight select-none', sizes[size])}>
      <div className="bg-white rounded-lg p-1 flex items-center justify-center">
        <Zap size={iconSizes[size]} className="text-black fill-black" />
      </div>
      <span className={variant === 'light' ? 'text-white' : 'text-black'}>
        Ufly
      </span>
    </div>
  )
}
