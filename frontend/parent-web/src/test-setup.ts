import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// `@/services/api` imports the real `@/i18n/config`, whose module-load side effect
// (`i18n.use(HttpBackend)...init()`) turns on react-i18next's default `useSuspense: true`
// against an async HTTP backend that never resolves in jsdom. Any test that renders a
// component using `useTranslation()` after that real init has run (e.g. transitively via a
// hook that imports `getErrorMessage` from `@/services/api`) suspends forever with a blank
// render and no test-explaining error. Stub the config module so `react-i18next` stays
// unconfigured/synchronous in tests (falls back to returning translation keys).
vi.mock('@/i18n/config', () => ({ default: { language: 'zh-CN' } }))
