#!/usr/bin/env node
/**
 * scan-secrets.mjs — TASK.md §4 / CHECKLIST.md item 0.16 (BRD §16 criterion 6, P2).
 *
 * Scans `public/data/` and `src/` for credential-shaped patterns: bearer tokens,
 * AWS access key IDs, PEM private-key headers, `client_secret`, and long base64
 * blobs. Exits non-zero on any match — this is the mechanical backstop for
 * "no API credentials appear anywhere in code, network calls, or /data".
 *
 * Note: this scans for *credentials*, not PII. The separate rule that
 * `zoho-crm.json` must never contain a `notes` field (TAD ADR-012, P3′) is
 * enforced by the `.strict()` Zod schema (item 1.4), not here.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const SCAN_ROOTS = ['public/data', 'src']
const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.css', '.md', '.html', '.txt', '.yml', '.yaml',
])

const PATTERNS = [
  { name: 'Bearer token', regex: /bearer\s+[a-z0-9._-]{20,}/gi },
  { name: 'AWS access key ID (AKIA...)', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'PEM private key header', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'client_secret', regex: /client_secret\s*[:=]\s*['"]?[A-Za-z0-9\-_.~]{8,}/gi },
  { name: 'Long base64 blob (60+ chars)', regex: /(?:[A-Za-z0-9+/]{60,}={0,2})/g },
]

function walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return [] // root doesn't exist yet — fine, nothing to scan
  }
  const files = []
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...walk(full))
    } else if (TEXT_EXTENSIONS.has(extname(full))) {
      files.push(full)
    }
  }
  return files
}

let violations = []

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    const content = readFileSync(file, 'utf8')
    for (const { name, regex } of PATTERNS) {
      const matches = content.match(regex)
      if (matches) {
        violations.push({ file, pattern: name, sample: matches[0].slice(0, 40) })
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`scan:secrets — ${violations.length} potential credential(s) found:\n`)
  for (const v of violations) {
    console.error(`  ${v.file} — ${v.pattern} — "${v.sample}..."`)
  }
  process.exit(1)
}

console.log('scan:secrets — clean. No credential-shaped patterns in public/data/ or src/.')
process.exit(0)
