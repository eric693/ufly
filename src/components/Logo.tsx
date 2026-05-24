import { Zap } from 'lucide-react'
import clsx from 'clsx'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  dark?: boolean
}

export default function Logo({ size = 'md', dark = false }: LogoProps) {
  const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' }
  const iconSizes = { sm: 14, md: 18, lg: 24 }

  return (
    <div className={clsx('flex items-center gap-1.5 font-black tracking-tight select-none', sizes[size])}>
      <div className={clsx('rounded-lg p-1 flex items-center justify-center', dark ? 'bg-white' : 'bg-paper-900')}>
        <Zap size={iconSizes[size]} className={dark ? 'text-black fill-black' : 'text-white fill-white'} />
      </div>
      <span className={dark ? 'text-white' : 'text-paper-900'}>Ufly</span>
    </div>
  )
}
