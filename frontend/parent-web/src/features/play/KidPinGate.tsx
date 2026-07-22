import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { verifyChildPin } from '@/services/homeworkService'
import { usePinGate } from './pinGate'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/** 进入某个孩子乐园前的 4 位 PIN 门。服务端校验；验对后写入 pinGate，本次访问不再拦。 */
export function KidPinGate({ childId, childName, avatar }: { childId: string; childName: string; avatar?: string | null }) {
  const { t } = useTranslation()
  const markVerified = usePinGate((s) => s.markVerified)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  const submit = async (full: string) => {
    setChecking(true)
    try {
      if (await verifyChildPin(childId, { pin: full })) {
        markVerified(childId)
      } else {
        setError(true)
        setPin('')
      }
    } catch {
      setError(true)
      setPin('')
    } finally {
      setChecking(false)
    }
  }

  const press = (d: string) => {
    if (checking || pin.length >= 4) return
    setError(false)
    const next = pin + d
    setPin(next)
    if (next.length === 4) void submit(next)
  }

  const back = () => {
    setError(false)
    setPin((p) => p.slice(0, -1))
  }

  return (
    <div className="kid-pin" data-testid="kid-pin-gate">
      <div className="kid-pin-avatar" aria-hidden="true">{avatar || '🐼'}</div>
      <h1 className="kid-pin-title">{t('play.pinTitle', { name: childName })}</h1>
      <div className={`kid-pin-dots${error ? ' is-error' : ''}`} data-testid="kid-pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`kid-pin-dot${i < pin.length ? ' is-filled' : ''}`} />
        ))}
      </div>
      <div className="kid-pin-msg" role="status">
        {error ? <span className="kid-pin-error" data-testid="kid-pin-error">{t('play.pinWrong')}</span> : null}
      </div>
      <div className="kid-pin-pad">
        {KEYS.map((d) => (
          <button key={d} type="button" className="kid-pin-key" data-testid={`pin-key-${d}`}
            disabled={checking} onClick={() => press(d)}>{d}</button>
        ))}
        <span aria-hidden="true" />
        <button type="button" className="kid-pin-key" data-testid="pin-key-0"
          disabled={checking} onClick={() => press('0')}>0</button>
        <button type="button" className="kid-pin-key kid-pin-back" data-testid="pin-key-back"
          disabled={checking || pin.length === 0} onClick={back}>⌫</button>
      </div>
    </div>
  )
}
