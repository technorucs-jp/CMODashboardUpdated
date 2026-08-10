import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// RTL's automatic afterEach-cleanup only self-registers when `afterEach` is a global
// (vite.config.ts doesn't set `test.globals: true`, so it isn't) — do it explicitly.
afterEach(() => {
  cleanup()
})
