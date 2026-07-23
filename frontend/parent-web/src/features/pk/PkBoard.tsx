import { useWeeklyPk } from '@/hooks/useWeeklyPk'
import type { PkEntryDto } from '@/types/homework'
import './pk.css'

function rankPill(rank: number): { cls: string; label: string } {
  if (rank === 1) return { cls: 'r1', label: '🥇 第1名' }
  if (rank === 2) return { cls: 'r2', label: '🥈 第2名' }
  if (rank === 3) return { cls: 'r3', label: '🥉 第3名' }
  return { cls: 'rn', label: `第${rank}名` }
}

function PkCard({ e }: { e: PkEntryDto }) {
  const { cls, label } = rankPill(e.rank)
  const champ = e.rank === 1
  const items = e.items.slice(0, 6) // 展示数量最多的前 6（后端已按数量降序）
  return (
    <div className={champ ? 'pk-card pk-champ' : 'pk-card'} data-testid={`pk-card-${e.childId}`}>
      {champ && <div className="pk-crown">👑</div>}
      <div className={`pk-rank ${cls}`}>{label}</div>
      <div className="pk-pet">
        {e.petSpriteUrl
          ? <img src={e.petSpriteUrl} alt={e.petName} />
          : <span className="pk-pet-emoji">🥚</span>}
      </div>
      <div className="pk-name">{e.displayName}</div>
      <div className="pk-lv">{e.petName} · Lv{e.petLevel}</div>
      <div className="pk-bag">
        {items.map((it) => (
          <div className="pk-item" key={it.rewardItemId}>
            <span className="pk-item-g">
              {it.iconUrl ? <img src={it.iconUrl} alt={it.name} /> : (it.glyph ?? '🎁')}
            </span>
            <span className="pk-item-c">{it.quantity}</span>
          </div>
        ))}
      </div>
      <div className="pk-progress">
        <div className="pk-plabel"><span>本周</span><b>{e.completionPercent}%</b></div>
        <div className="pk-ptrack">
          <div className="pk-pfill" style={{ width: `${e.completionPercent}%` }} />
        </div>
      </div>
    </div>
  )
}

export function PkBoard({ title = '🏆 本周 PK' }: { title?: string }) {
  const { data, isLoading } = useWeeklyPk()
  const entries = data?.entries ?? []

  return (
    <div className="pk-wrap">
      <h1 className="pk-title">{title}</h1>
      {isLoading ? (
        <div className="pk-empty">加载中…</div>
      ) : entries.length === 0 ? (
        <div className="pk-empty">还没有正在闯关的小伙伴，开始一段旅程就能上榜啦！</div>
      ) : (
        <div className="pk-board">
          {entries.map((e) => <PkCard key={e.childId} e={e} />)}
        </div>
      )}
    </div>
  )
}
