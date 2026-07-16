import { useTranslation } from 'react-i18next'
import { dayStatus } from './dayStatus'
import type { WeekDayDto } from '@/types/homework'

const WEEK_NAMES = ['play.sun', 'play.mon', 'play.tue', 'play.wed', 'play.thu', 'play.fri', 'play.sat']

export function DayStrip({ days, today, selectedDate, onSelectDate }: {
  days: WeekDayDto[]
  today: string
  selectedDate: string
  onSelectDate: (date: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="kid-day-strip">
      {days.map((day) => {
        const { tone, labelKey } = dayStatus(day, today)
        const isFuture = day.date > today
        const isSelected = day.date === selectedDate
        const dow = new Date(day.date + 'T00:00:00').getDay()
        const dd = day.date.slice(5) // MM-DD
        return (
          <button
            key={day.date}
            type="button"
            data-testid={`day-chip-${day.date}`}
            className={`kid-day-chip${isSelected ? ' is-selected' : ''}`}
            disabled={isFuture}
            onClick={() => onSelectDate(day.date)}
          >
            <span className="kid-day-top-slot">
              {day.date === today && <span className="kid-day-today-tag">{t('play.today')}</span>}
            </span>
            <span className="kid-day-name">{t(WEEK_NAMES[dow])}</span>
            <span className="kid-day-date">{dd}</span>
            <span className={`kid-day-state is-${tone}`}>{t(labelKey)}</span>
          </button>
        )
      })}
    </div>
  )
}
