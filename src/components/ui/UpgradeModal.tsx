import React from 'react'
import { Modal } from './Modal'
import { Crown } from 'lucide-react'
import { Button } from './Button'
import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
  bullets?: string[]
  subMessage?: string
}

export function UpgradeModal({ 
  isOpen, 
  onClose,
  title = "Premium Feature",
  message = "This feature is available for Premium members. Upgrade today to unlock the full potential of Vanta.",
  bullets,
  subMessage
}: UpgradeModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onClose()
    router.push('/pricing')
  }

  const defaultBullets = [
    "Full Learn Hub Access",
    "Deal Intelligence",
    "Voice Notes",
    "Marketplace Posting",
    "Chat Access",
    "And more..."
  ]

  const displayBullets = bullets || defaultBullets

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="sm"
    >
      <div className="text-center py-2 space-y-4">
        <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Crown className="w-8 h-8 fill-amber-500/15" />
        </div>

        <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-amber-500 fill-amber-500/10" />
          <span>{title}</span>
        </h3>

        <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
          {message}
        </p>

        <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-4 text-left space-y-2.5">
          <div className="text-[10px] uppercase font-bold text-gray-500">
            {bullets ? "Unlock advanced modules covering:" : "Unlock:"}
          </div>
          {displayBullets.map((bullet, idx) => (
            <div key={idx} className="text-xs flex items-center gap-2 text-gray-300">
              <span className="text-amber-500">👑</span>
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        {subMessage && (
          <p className="text-xs text-gray-405 font-bold max-w-xs mx-auto leading-relaxed">
            {subMessage}
          </p>
        )}

        <Button
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-extrabold"
        >
          Upgrade to Premium
        </Button>
        
        <button
          onClick={onClose}
          className="text-[10px] text-gray-500 hover:text-white underline font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
