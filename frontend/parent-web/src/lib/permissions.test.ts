import { describe, it, expect } from 'vitest'
import { CatalogPermissions, hasAnyCatalog } from './permissions'

describe('permissions', () => {
  it('exposes the three catalog permission names', () => {
    expect(CatalogPermissions.Pets).toBe('Homework.Catalog.Pets')
    expect(CatalogPermissions.RewardItems).toBe('Homework.Catalog.RewardItems')
    expect(CatalogPermissions.Medals).toBe('Homework.Catalog.Medals')
  })
  it('hasAnyCatalog true if any catalog permission granted', () => {
    expect(hasAnyCatalog(() => false)).toBe(false)
    expect(hasAnyCatalog((n) => n === CatalogPermissions.Medals)).toBe(true)
  })
})
