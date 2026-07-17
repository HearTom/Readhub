// Combina el reporte de size-limit (bundle-size-report.json) y el de
// Lighthouse CI (.lighthouseci/manifest.json) en una tabla Markdown, y la
// agrega a $GITHUB_STEP_SUMMARY — para poder ver el resultado del job
// "performance" directamente en la pestaña Summary de GitHub Actions, sin
// tener que descargar el artefacto para los números clave.
//
// Se ejecuta con `if: always()` en el workflow: corre tanto si los gates
// pasaron como si fallaron, para que un fallo sea fácil de diagnosticar
// desde el propio resumen del job.
import { readFileSync, appendFileSync, existsSync } from 'node:fs'

const summaryPath = process.env.GITHUB_STEP_SUMMARY
const lines = ['# Reporte de performance', '']

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

// ── size-limit ────────────────────────────────────────────────────────────
if (existsSync('bundle-size-report.json')) {
  const bundle = JSON.parse(readFileSync('bundle-size-report.json', 'utf8'))
  lines.push(
    '## Tamaño de bundle (size-limit)',
    '',
    '| Recurso | Tamaño (gzip) | Límite | Estado |',
    '|---|---|---|---|'
  )
  for (const entry of bundle) {
    const status = entry.passed ? 'OK' : 'EXCEDE EL LIMITE'
    lines.push(`| ${entry.name} | ${formatKB(entry.size)} | ${formatKB(entry.sizeLimit)} | ${status} |`)
  }
  lines.push('')
} else {
  lines.push('_No se encontró bundle-size-report.json — el paso de size-limit no llegó a generarlo._', '')
}

// ── Lighthouse CI ────────────────────────────────────────────────────────
const manifestPath = '.lighthouseci/manifest.json'
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const representative = manifest.filter((run) => run.isRepresentativeRun)

  lines.push(
    '## Core Web Vitals / Lighthouse (corrida representativa por URL, preset desktop)',
    '',
    '| URL | Performance | LCP | CLS | TBT (proxy de INP) |',
    '|---|---|---|---|---|'
  )
  for (const run of representative) {
    const lhr = JSON.parse(readFileSync(run.jsonPath, 'utf8'))
    const perf = Math.round(run.summary.performance * 100)
    const lcp = lhr.audits['largest-contentful-paint']?.displayValue ?? 'n/d'
    const cls = lhr.audits['cumulative-layout-shift']?.displayValue ?? 'n/d'
    const tbt = lhr.audits['total-blocking-time']?.displayValue ?? 'n/d'
    lines.push(`| ${run.url} | ${perf}/100 | ${lcp} | ${cls} | ${tbt} |`)
  }
  lines.push(
    '',
    '_Umbrales definidos en `apps/web/lighthouserc.json`. Lighthouse mide Total Blocking Time (TBT) en laboratorio como proxy de INP — INP real de campo requiere RUM, fuera del alcance de este pipeline. Reportes HTML completos (uno por corrida) en el artefacto `performance-report`._'
  )
} else {
  lines.push('_No se encontró .lighthouseci/manifest.json — el paso de Lighthouse CI no llegó a generarlo._')
}

const output = lines.join('\n') + '\n'

if (summaryPath) {
  appendFileSync(summaryPath, output)
} else {
  // Fuera de GitHub Actions (uso local) — imprime a stdout en vez de fallar.
  console.log(output)
}
