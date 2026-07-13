export const CatalogPermissions = {
  Pets: 'Homework.Catalog.Pets',
  RewardItems: 'Homework.Catalog.RewardItems',
  Medals: 'Homework.Catalog.Medals',
} as const

export function hasAnyCatalog(has: (name: string) => boolean): boolean {
  return has(CatalogPermissions.Pets) || has(CatalogPermissions.RewardItems) || has(CatalogPermissions.Medals)
}
