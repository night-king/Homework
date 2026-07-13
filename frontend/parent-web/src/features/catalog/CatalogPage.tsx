import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { CatalogPermissions, hasAnyCatalog } from '@/lib/permissions'
import { RewardItemsPanel } from './RewardItemsPanel'
import { MedalsPanel } from './MedalsPanel'
import { PetSpeciesPanel } from './PetSpeciesPanel'

type TabKey = 'reward-items' | 'medals' | 'pets'

export function CatalogPage() {
  const { t } = useTranslation()
  const has = useAuthStore((s) => s.hasPermission)

  const allTabs: { key: TabKey; testId: string; label: string; perm: string }[] = [
    { key: 'reward-items', testId: 'tab-reward-items', label: t('catalog.tabRewardItems'), perm: CatalogPermissions.RewardItems },
    { key: 'medals', testId: 'tab-medals', label: t('catalog.tabMedals'), perm: CatalogPermissions.Medals },
    { key: 'pets', testId: 'tab-pets', label: t('catalog.tabPets'), perm: CatalogPermissions.Pets },
  ]
  const tabs = allTabs.filter((tab) => has(tab.perm))

  const [active, setActive] = useState<TabKey | null>(tabs[0]?.key ?? null)

  if (!hasAnyCatalog(has)) return <Navigate to="/home" replace />
  const current = active && tabs.some((tab) => tab.key === active) ? active : tabs[0]?.key ?? null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('catalog.title')}</h1>
      <div className="flex gap-2 border-b border-ink/10">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" data-testid={tab.testId} onClick={() => setActive(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${current === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-muted hover:text-ink'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {current === 'reward-items' && <RewardItemsPanel />}
      {current === 'medals' && <MedalsPanel />}
      {current === 'pets' && <PetSpeciesPanel />}
    </div>
  )
}
