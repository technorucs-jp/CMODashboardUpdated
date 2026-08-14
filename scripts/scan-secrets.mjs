import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'public', 'data')

const SECRET_PATTERNS = [
  { name: 'Bearer Token', regex: /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i },
  { name: 'Private Key', regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i },
  { name: 'Generic API Key', regex: /["'](api[_-]?key|secret|password|access[_-]?token)["']\s*:\s*["'][a-zA-Z0-9_\-\.]{16,}["']/i },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Slack Webhook / Token', regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/ },
  { name: 'Zoho CRM Notes Field', regex: /["'](notes|description|inquiry_text)["']\s*:/i },
]

export function scanSecretsInDirectory(dir = DATA_DIR) {
  const findings = []

  function walk(currentDir) {
    const files = readdirSync(currentDir)
    for (const file of files) {
      const fullPath = join(currentDir, file)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (file.endsWith('.json') || file.endsWith('.txt')) {
        const content = readFileSync(fullPath, 'utf8')
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(content)) {
            findings.push(`[${file}] Potential secret / forbidden field detected: ${pattern.name}`)
          }
        }
      }
    }
  }

  walk(dir)
  return findings
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = scanSecretsInDirectory()
  if (findings.length > 0) {
    console.error('❌ Secrets / PII scan detected violations in public/data:')
    for (const f of findings) {
      console.error(`  - ${f}`)
    }
    process.exit(1)
  }
  console.log('✅ Secrets and PII scan clean — no tokens or forbidden notes found in public/data.')
  process.exit(0)
}
