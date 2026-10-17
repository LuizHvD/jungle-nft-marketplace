import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { arch, platform, release } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs', 'audit', 'lighthouse')
const base = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:4173'
const targets = [
  { name: 'inicio-mobile', path: '/', preset: 'mobile' },
  { name: 'inicio-desktop', path: '/', preset: 'desktop' },
  { name: 'detalhe-mobile', path: '/nfts/nft-aurora', preset: 'mobile' },
  { name: 'detalhe-desktop', path: '/nfts/nft-aurora', preset: 'desktop' },
]
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const metrics = [
  ['largest-contentful-paint', 'lcp'],
  ['cumulative-layout-shift', 'cls'],
  ['total-blocking-time', 'tbt'],
]

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function run(command, args, shell) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell,
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} saiu com ${code}`))
    })
  })
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function reachable(url) {
  try {
    const response = await fetch(url, { redirect: 'manual' })
    return response.status < 500
  } catch {
    return false
  }
}

async function ensurePreview() {
  if (await reachable(base)) {
    return null
  }
  if (!(await exists(join(root, 'dist', 'index.html')))) {
    await run('pnpm', ['build'], true)
  }
  const child = spawn(
    'pnpm',
    ['preview', '--host', '127.0.0.1', '--port', '4173'],
    {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    },
  )
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await reachable(base)) {
      return child
    }
    await delay(1000)
  }
  throw new Error('O preview não respondeu em 4173.')
}

function stopPreview(child) {
  if (!child?.pid) {
    return
  }
  if (platform() === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { shell: true })
    return
  }
  child.kill('SIGTERM')
}

async function auditOnce(target, index) {
  const stem = join(outDir, `${target.name}-${index}`)
  const args = [
    join(root, 'node_modules', 'lighthouse', 'cli', 'index.js'),
    `${base}${target.path}`,
    '--output=html',
    '--output=json',
    `--output-path=${stem}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--disable-full-page-screenshot',
    '--chrome-flags=--headless=new',
    '--quiet',
  ]
  if (target.preset === 'desktop') {
    args.push('--preset=desktop')
  }
  await run(process.execPath, args, false)
  const report = JSON.parse(await readFile(`${stem}.report.json`, 'utf8'))
  const scores = {}
  for (const category of categories) {
    scores[category] = Math.round(report.categories[category].score * 100)
  }
  const numbers = {}
  for (const [auditId, key] of metrics) {
    numbers[key] = report.audits[auditId].numericValue
  }
  const opportunities = Object.values(report.audits)
    .filter(
      (audit) =>
        audit.details?.type === 'opportunity' &&
        typeof audit.numericValue === 'number' &&
        audit.numericValue > 0,
    )
    .sort((left, right) => right.numericValue - left.numericValue)
    .slice(0, 5)
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      numericValue: audit.numericValue,
    }))
  return {
    scores,
    numbers,
    opportunities,
    lighthouseVersion: report.lighthouseVersion,
    userAgent: report.userAgent,
    fetchTime: report.fetchTime,
  }
}

function markdown(summary) {
  const lines = [
    '# Lighthouse',
    '',
    `Ambiente: ${summary.environment.platform} ${summary.environment.release} ${summary.environment.arch}.`,
    `Lighthouse ${summary.lighthouseVersion}. Chrome: ${summary.userAgent}.`,
    `URL: ${summary.base}. Três medições por combinação. O valor publicado é a mediana.`,
    '',
    'Metas do enunciado: performance ≥ 90, accessibility ≥ 95, best practices ≥ 95, SEO ≥ 90.',
    '',
  ]
  for (const target of summary.targets) {
    lines.push(`## ${target.name}`)
    lines.push('')
    lines.push(
      `Performance ${target.median.performance}. Accessibility ${target.median.accessibility}. Best practices ${target.median['best-practices']}. SEO ${target.median.seo}.`,
    )
    lines.push(
      `LCP ${target.median.lcp} ms. CLS ${target.median.cls}. TBT ${target.median.tbt} ms.`,
    )
    if (target.below.length > 0) {
      lines.push(`Abaixo da meta: ${target.below.join(', ')}.`)
      lines.push('Oportunidades medidas na corrida da mediana de performance:')
      for (const item of target.opportunities) {
        lines.push(`- ${item.id}: ${item.title} (${item.numericValue})`)
      }
    }
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

const preview = await ensurePreview()
try {
  await mkdir(outDir, { recursive: true })
  const targetsSummary = []
  let lighthouseVersion = ''
  let userAgent = ''
  for (const target of targets) {
    const runs = []
    for (let index = 1; index <= 3; index += 1) {
      runs.push(await auditOnce(target, index))
    }
    lighthouseVersion = runs[0].lighthouseVersion
    userAgent = runs[0].userAgent
    const performanceOrder = [...runs].sort(
      (left, right) => left.scores.performance - right.scores.performance,
    )
    const medianRun = performanceOrder[1]
    const medianScores = {}
    for (const category of categories) {
      medianScores[category] = median(runs.map((run) => run.scores[category]))
    }
    const medianNumbers = {
      lcp: median(runs.map((run) => run.numbers.lcp)),
      cls: median(runs.map((run) => run.numbers.cls)),
      tbt: median(runs.map((run) => run.numbers.tbt)),
    }
    const goals = {
      performance: 90,
      accessibility: 95,
      'best-practices': 95,
      seo: 90,
    }
    const below = categories.filter(
      (category) => medianScores[category] < goals[category],
    )
    targetsSummary.push({
      name: target.name,
      path: target.path,
      preset: target.preset,
      runs: runs.map((run) => ({
        scores: run.scores,
        numbers: run.numbers,
        fetchTime: run.fetchTime,
      })),
      median: { ...medianScores, ...medianNumbers },
      below,
      opportunities: medianRun.opportunities,
    })
  }
  const summary = {
    base,
    lighthouseVersion,
    userAgent,
    environment: {
      platform: platform(),
      release: release(),
      arch: arch(),
    },
    targets: targetsSummary,
  }
  await writeFile(
    join(outDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  )
  await writeFile(join(outDir, 'summary.md'), markdown(summary))
} finally {
  stopPreview(preview)
}
