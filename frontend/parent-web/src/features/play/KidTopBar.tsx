import { useTranslation } from 'react-i18next'
import { DayStrip } from './DayStrip'
import type { WeekStripDto, DailyBoardDto } from '@/types/homework'

export function KidTopBar({ weekStrip, board, today, selectedDate, onSelectDate }: {
  weekStrip?: WeekStripDto
  board?: DailyBoardDto
  today: string
  selectedDate: string
  onSelectDate: (date: string) => void
}) {
  const { t } = useTranslation()
  return (
    <section className="kid-panel kid-topbar">
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
