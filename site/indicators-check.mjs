// The check that every indicator has the structure of docs/indicator-anatomy.md: the registry fields its
// card, page, Database row and AI Notebook are drawn from, the files they link to, and its Spanish. Generic,
// and it needs no npm packages (only Node, content.js, snippets.js and i18n/strings.mjs):
//
//   node site/indicators-check.mjs     # list what is missing; exit 1 if anything is
//
// site/build.mjs runs it first and stops when an indicator is incomplete, so the Pages workflow
// (every push and pull request) enforces it too.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PAGE_TABS } from './src/snippets.js';
import { englishContent, englishMetadata, compare } from './i18n/strings.mjs';

const SITE = dirname(fileURLToPath(import.meta.url));
const SPEC = 'docs/indicator-anatomy.md';

// Every registry field an indicator needs, with the section of the spec that says what it is for
export const REQUIRED_FIELDS = {
  id: 'inputs', type: 'inputs', section: 'inputs', title: 'inputs', scope: 'inputs', summary: 'inputs',
  description: 'inputs', geography: 'inputs', units: 'inputs', period: 'inputs', frequency: 'inputs',
  key: 'inputs', idExample: 'inputs', categories: 'inputs', tags: 'inputs',
  image: 'images', imageAlt: 'images', map: 'images', mapAlt: 'images', date: 'inputs', pinned: 'inputs',
  scale: 'inputs', geolibre: 'geolibre', code: 'code', aiPrompts: 'ai-notebook',
};
// The files of a dataset every indicator links to (its sidebar, card and Database row)
export const DATA_FILES = (d, scale) => [`${d}.csv`, `${d}.dta`, `${d}_wide.gpkg`, `${d}_wide.geojson`].map((f) => `data/${d}/${scale}/${f}`);

const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

// Returns the problems, one string each, naming the indicator, what is missing and where the spec explains it
export function checkIndicators({ registry, root, langs = ['es'] }) {
  const problems = [];
  const add = (item, what, anchor) => problems.push(`${item.id}: ${what} (${SPEC}#${anchor})`);
  const indicators = registry.filter((i) => i.type === 'indicator');
  const english = englishContent({ SITE_NAME: '', DEFAULT_TITLE: '', SITE_DESCRIPTION: '', PACKAGE_WORKFLOW: [], CONTENT_REGISTRY: indicators }).items;
  const json = (p) => { try { return JSON.parse(readFileSync(join(root, p), 'utf8')); } catch { return null; } };
  const translations = Object.fromEntries(langs.map((l) => [l, json(`site/i18n/${l}/content.json`)?.items || {}]));

  for (const item of indicators) {
    for (const [f, anchor] of Object.entries(REQUIRED_FIELDS)) {
      if (f === 'pinned' ? typeof item.pinned !== 'boolean' : empty(item[f])) add(item, `no ${f}`, anchor);
    }
    if (item.section !== 'indicators') add(item, `section is "${item.section}", not "indicators"`, 'inputs');
    const ids = item.datasets || (item.dataset ? [item.dataset] : []);
    if (!ids.length) add(item, 'no dataset (or datasets)', 'inputs');
    for (const tab of PAGE_TABS) {
      if (typeof item.code?.[tab] !== 'string' || !item.code[tab].trim()) add(item, `no "${tab}" code tab`, 'code');
    }
    if (Array.isArray(item.aiPrompts) && (item.aiPrompts.length < 4 || item.aiPrompts.length > 6)) {
      add(item, `${item.aiPrompts.length} aiPrompts; write 4 to 6 questions for Gemini`, 'ai-notebook');
    }
    for (const f of ['image', 'map']) {
      if (item[f] && !existsSync(join(root, item[f]))) add(item, `${f} ${item[f]} does not exist (scripts/indicator_map.py draws it)`, 'images');
    }
    for (const d of ids) {
      const pkg = json(`data/${d}/datapackage.json`);
      if (!pkg) { add(item, `data/${d}/datapackage.json is missing`, 'inputs'); continue; }
      if (!pkg['geo:map']?.variable) add(item, `data/${d}/datapackage.json has no geo:map (the headline variable and year)`, 'inputs');
      if (item.scale) {
        for (const p of DATA_FILES(d, item.scale)) if (!existsSync(join(root, p))) add(item, `${p} is missing (uv run geo4bolivia build ${d})`, 'downloads');
      }
      for (const l of langs) {
        const diffs = compare(englishMetadata(pkg), json(`site/i18n/${l}/metadata/${d}.json`) || {});
        if (diffs.length) add(item, `site/i18n/${l}/metadata/${d}.json is incomplete: ${diffs.slice(0, 3).join('; ')}${diffs.length > 3 ? ` (+${diffs.length - 3} more)` : ''}`, 'spanish');
      }
    }
    for (const l of langs) {
      const diffs = compare(english[item.id], translations[l][item.id], `items.${item.id}`);
      if (diffs.length) add(item, `site/i18n/${l}/content.json is incomplete: ${diffs.slice(0, 3).join('; ')}${diffs.length > 3 ? ` (+${diffs.length - 3} more)` : ''}`, 'spanish');
    }
  }
  return problems;
}

export async function runCheck(root = resolve(SITE, '..')) {
  const C = await import(pathToFileURL(join(root, 'site/src/content.js')));
  const problems = checkIndicators({ registry: C.CONTENT_REGISTRY, root });
  const n = C.CONTENT_REGISTRY.filter((i) => i.type === 'indicator').length;
  if (problems.length) {
    console.error(`${problems.length} problem(s) in the indicators (every indicator needs the structure of ${SPEC}):\n  ${problems.join('\n  ')}`);
    return false;
  }
  console.log(`indicators: all ${n} have the structure of ${SPEC}`);
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit((await runCheck()) ? 0 : 1);
}
