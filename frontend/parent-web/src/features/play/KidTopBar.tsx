import { useTranslation } from 'react-i18next'
import { DayStrip } from './DayStrip'
import type { WeekStripDto, DailyBoardDto } from '@/types/homework'

export function KidTopBar({ childName, weekStrip, board, today, selectedDate, onSelectDate }: {
  childName: string
  weekStrip?: WeekStripDto
  board?: DailyBoardDto
  today: string
  selectedDate: string
  onSelectDate: (date: string) => void
}) {
  const { t } = useTranslation()
  const initial = childName.slice(0, 1) || '?'
  return (
    <section className="kid-panel kid-topbar">
      <div className="kid-profile">
        <div className="kid-avatar">{initial}</div>
        <div className="kid-profile-label">
          <div className="kid-overline">ADVENTURE BASE</div>
          <h1 className="kid-hero-name">{childName}</h1>
        </div>
      </div>
      <DayStrip days={weekStrip?.days ?? []} today={today} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <div className="kid-top-stats">
        <div className="kid-stat-pill">
          <span className="kid-overline">{t('play.stars')}</span>
          <strong className="kid-stat-value" data-testid="topbar-stars">{board?.stars ?? 0}</strong>
        </div>
        <div className="kid-stat-pill">
          <span className="kid-overline">{t('play.streak')}</span>
          <strong className="kid-stat-value" data-testid="topbar-streak">{weekStrip?.streak ?? 0}</strong>
        </div>
        <div className="kid-stat-pill">
          <span className="kid-overline">{t('play.progress')}</span>
          <strong className="kid-stat-value" data-testid="topbar-progress">
            {board?.tasksCompleted ?? 0}/{board?.tasksTotal ?? 0}
          </strong>
        </div>
      </div>
    </section>
  )
}
