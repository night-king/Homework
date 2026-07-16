import type { PetFormDto } from '@/types/homework'
import type { RefObject } from 'react'

// 宠物舞台：光环/底盘/能量环/彩带的静态氛围层 + LV 横幅 + 形态名，精灵图(或蛋兜底)居中。
// 对照原型 child-homepage.html DOM 3681–3710 的层序：banner 在上，aura/disc/energy-ring 为兄弟，
// core 内含 stage-mount 承载精灵图，confetti 四 span 收尾。
// petRef 挂在 .kid-pet-core 上，作为喂养投掷动画的落点（DailyBoard 转交，喂养 hook 里的 launchFeedProjectile 用它取 rect）。
export function PetStage({ form, level, petRef }: {
  form?: PetFormDto
  level: number
  petRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="kid-pet-stage">
      <div className="kid-pet-wrap">
        <div className="kid-pet-stage-banner">
          <span className="kid-pet-stage-level">LV {level}</span>
          {form?.name && <strong className="kid-pet-stage-hero-name">{form.name}</strong>}
        </div>
        <div className="kid-pet-aura" />
        <div className="kid-pet-disc" />
        <div className="kid-pet-energy-ring" />
        <div className="kid-pet-core" ref={petRef}>
          <div className="kid-pet-stage-mount">
            {form?.spriteUrl ? (
              <img
                data-testid="pet-sprite"
                className="kid-pet-sprite"
                src={form.spriteUrl}
                alt={form.name}
                style={{ transform: `scale(${form.scale ?? 1})` }}
              />
            ) : (
              <div data-testid="pet-sprite" className="kid-pet-fallback">🥚</div>
            )}
          </div>
        </div>
        <div className="kid-pet-confetti">
          <span /><span /><span /><span />
        </div>
      </div>
    </div>
  )
}
