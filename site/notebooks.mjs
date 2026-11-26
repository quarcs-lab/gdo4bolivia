// The Colab notebook of every code box of the website (site/src/snippets.js), written into
// notebooks/snippets/, and of every indicator page (all its boxes, "Open in AI Notebook"), written into
// notebooks/pages/; both committed, since Colab opens them from GitHub. Generic, and it needs no npm
// packages (only Node and the plain-JavaScript content.js and snippets.js), so CI can run it
// without installing anything:
//
//   node site/notebooks.mjs            # write them, removing stale ones
//   node site/notebooks.mjs --check    # write nothing; exit 1 if any is missing or out of date
//
// site/build.mjs runs it too. On a push to main the Pages workflow runs it and commits the result.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SITE, '..');

export async function loadInputs() {
  const C = await import(pathToFileURL(join(SITE, 'src/content.js')));
  const S = await import(pathToFileURL(join(SITE, 'src/snippets.js')));
  const website = readFileSync(join(ROOT, 'project.yaml'), 'utf8').match(/^website:\s*["']?([^\s"']+)/m)[1];
  return { C, S, SITE_URL: website.endsWith('/') ? website : `${website}/` };
}

const { C, S, SITE_URL } = await loadInputs();

const asText = (nb) => `${JSON.stringify(nb, null, 1)}\n`;

// Every notebook the site links to, as Map(path inside notebooks/ -> text): one per code box
// (snippets/), and one per indicator page with all of its boxes (pages/, "Open in AI Notebook")
export function wantedNotebooks() {
  const boxes = [
    ...S.registrySnippets(C.CONTENT_REGISTRY).map((b) => ({ ...b, heading: b.item.title })),
    ...Object.entries(C.SHARED_SNIPPETS || {}).map(([id, b]) => ({ ...b, path: S.sharedSnippetPath(id), heading: b.title })),
  ];
  const wanted = new Map(boxes.map((b) => [b.path, asText(S.snippetNotebook({
    code: b.code, title: b.title, heading: b.heading, pageUrl: `${SITE_URL}${b.page || ''}`, siteName: C.SITE_NAME,
  }))]));
  for (const item of C.CONTENT_REGISTRY.filter((i) => i.type === 'indicator')) {
    if (!Array.isArray(item.aiPrompts) || !item.aiPrompts.length) {
      throw new Error(`${item.id}: an indicator needs aiPrompts, the questions its AI Notebook suggests asking Gemini (site/src/content.js)`);
    }
    const ids = item.datasets || [item.dataset];
    const packages = ids.map((d) => JSON.parse(readFileSync(join(ROOT, 'data', d, 'datapackage.json'), 'utf8')));
    wanted.set(S.pagePath(item.id), asText(S.pageNotebook({
      item, packages, citationApa: C.CITATION_APA, pageUrl: `${SITE_URL}${item.section}/${item.id}/`, siteName: C.SITE_NAME,
    })));
  }
  return wanted;
}

// Writes (or with check, only compares) the notebooks; returns false when check finds them stale
export function codeBoxNotebooks({ check = false } = {}) {
  const dirs = [S.SNIPPETS_DIR, S.PAGES_DIR].map((d) => join(ROOT, 'notebooks', d));
  const wanted = wantedNotebooks();
  const existing = [];
  const walk = (d) => existsSync(d) && readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.ipynb') && existing.push(join(d, e.name))));
  dirs.forEach(walk);
  const rel = (f) => f.slice(join(ROOT, 'notebooks').length + 1).split('\\').join('/');
  const stale = existing.filter((f) => !wanted.has(rel(f)));
  const changed = [...wanted].filter(([p, text]) => !existsSync(join(ROOT, 'notebooks', p)) || readFileSync(join(ROOT, 'notebooks', p), 'utf8') !== text).map(([p]) => p);
  if (check) {
    if (stale.length || changed.length) {
      console.error(`notebooks/${S.SNIPPETS_DIR}/ and notebooks/${S.PAGES_DIR}/ are out of date (${changed.length} to write, ${stale.length} to remove): run "node site/notebooks.mjs" and commit them (on main the Pages workflow does it)`);
      [...changed, ...stale.map(rel)].slice(0, 20).forEach((p) => console.error(`  ${p}`));
      return false;
    }
  } else {
    stale.forEach((f) => rmSync(f));
    for (const p of changed) { mkdirSync(dirname(join(ROOT, 'notebooks', p)), { recursive: true }); writeFileSync(join(ROOT, 'notebooks', p), wanted.get(p)); }
    for (const dir of dirs.filter(existsSync)) {
      for (const d of readdirSync(dir)) if (statSync(join(dir, d)).isDirectory() && !readdirSync(join(dir, d)).length) rmSync(join(dir, d), { recursive: true });
    }
  }
  const pages = [...wanted.keys()].filter((p) => p.startsWith(`${S.PAGES_DIR}/`)).length;
  console.log(`Colab notebooks: ${wanted.size - pages} code boxes in notebooks/${S.SNIPPETS_DIR}/, ${pages} pages in notebooks/${S.PAGES_DIR}/ (${changed.length} written, ${stale.length} removed)`);
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(codeBoxNotebooks({ check: process.argv.includes('--check') }) ? 0 : 1);
}
