// What the website translates, and a check that every translation is complete.
//
//   node site/i18n/strings.mjs                    # report missing or stale translations (exit 1 if any)
//   node site/i18n/strings.mjs --extract <dir>    # write the English source of every translation to <dir>
//
// The site's language is English; every other language <lang> lives in site/i18n/<lang>/:
//   content.json            the site's constants, the package cards and every CONTENT_REGISTRY item's prose
//   metadata/<dataset>.json a dataset's title and its variables' labels and descriptions
//   ui.json                 the interface's strings (app.jsx, map.jsx), keyed by their English text
// Code, identifiers, URLs, citations and source titles are never translated.
// Generic: the content comes from site/src/content.js and data/<dataset>/datapackage.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// Fields of a registry item that are prose; arrays of objects list the prose keys of their elements
export const ITEM_FIELDS = {
  title: 1, summary: 1, description: 1, geography: 1, period: 1, frequency: 1, categories: 1, tags: 1,
  imageAlt: 1, mapAlt: 1, notice: 1, installNote: 1, team: 1, status: 1, subtype: 1,
  dateLabel: 1, time: 1, venue: 1, themes: 1, objectives: 1,
  examples: ['title', 'text'], features: ['title', 'text'], tutorial: ['title', 'text'], links: ['label'],
  summarySections: ['h', 'p'], media: ['label'],
};
// `scope` is prose on indicators and a pip command on packages
const itemFields = (item) => (item.type === 'package' ? Object.keys(ITEM_FIELDS) : [...Object.keys(ITEM_FIELDS), 'scope']);

export const englishContent = (C) => ({
  site: { SITE_NAME: C.SITE_NAME, DEFAULT_TITLE: C.DEFAULT_TITLE, SITE_DESCRIPTION: C.SITE_DESCRIPTION },
  workflow: Object.fromEntries(C.PACKAGE_WORKFLOW.map((w) => [w.id, { role: w.role, text: w.text }])),
  items: Object.fromEntries(C.CONTENT_REGISTRY.map((item) => {
    const out = {};
    for (const k of itemFields(item)) {
      const v = item[k]; const spec = ITEM_FIELDS[k];
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(spec)) {
        if (!Array.isArray(v) || !v.length) continue;
        out[k] = v.map((el) => Object.fromEntries(spec.filter((s) => el[s]).map((s) => [s, el[s]])));
      } else out[k] = v;
    }
    return [item.id, out];
  })),
});

export const englishMetadata = (pkg) => ({
  title: pkg.title,
  fields: Object.fromEntries(pkg.resources[0].schema.fields.map((f) => [f.name,
    Object.fromEntries(['title', 'description'].filter((k) => f[k]).map((k) => [k, f[k]]))])),
});

// Differences in shape between the English source and a translation: missing keys, extra keys, array lengths
export const compare = (en, tr, path = '', out = []) => {
  if (Array.isArray(en)) {
    if (!Array.isArray(tr)) out.push(`${path}: expected a list`);
    else {
      if (tr.length !== en.length) out.push(`${path}: ${en.length} elements in English, ${tr.length} translated`);
      en.forEach((e, i) => { if (typeof e === 'object' && tr[i] !== undefined) compare(e, tr[i], `${path}[${i}]`, out); });
    }
  } else if (en && typeof en === 'object') {
    if (!tr || typeof tr !== 'object') { out.push(`${path}: missing`); return out; }
    for (const k of Object.keys(en)) {
      if (!(k in tr)) out.push(`${path}.${k}: missing`);
      else compare(en[k], tr[k], `${path}.${k}`, out);
    }
    for (const k of Object.keys(tr)) if (!(k in en)) out.push(`${path}.${k}: not in the English source (stale?)`);
  } else if (typeof tr !== typeof en) out.push(`${path}: expected ${typeof en}`);
  return out;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const C = await import(pathToFileURL(join(ROOT, 'site/src/content.js')));
  const datasets = JSON.parse(readFileSync(join(ROOT, 'data/index.json'), 'utf8')).datasets;
  const pkg = (d) => JSON.parse(readFileSync(join(ROOT, `data/${d}/datapackage.json`), 'utf8'));
  const i = process.argv.indexOf('--extract');
  if (i > 0) {
    const dir = resolve(process.argv[i + 1]);
    mkdirSync(join(dir, 'metadata'), { recursive: true });
    writeFileSync(join(dir, 'content.json'), JSON.stringify(englishContent(C), null, 2));
    for (const d of datasets) writeFileSync(join(dir, `metadata/${d}.json`), JSON.stringify(englishMetadata(pkg(d)), null, 2));
    console.log(`English sources written to ${dir}`);
  } else {
    const langs = ['es'];
    let problems = 0;
    for (const lang of langs) {
      const read = (p) => { const f = join(HERE, lang, p); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };
      const report = (name, diffs) => { if (diffs.length) { problems += diffs.length; console.log(`${lang}/${name}\n  ${diffs.join('\n  ')}`); } };
      report('content.json', compare(englishContent(C), read('content.json') || {}));
      // every literal t('...') of the components (texts passed to t() as variables are checked by eye)
      const ui = read('ui.json') || {};
      const keys = ['app.jsx', 'map.jsx'].flatMap((f) => [...readFileSync(join(ROOT, 'site/src', f), 'utf8')
        .matchAll(/\bt\((['"])((?:\\.|(?!\1).)*)\1/g)].map((m) => JSON.parse(m[1] === '"' ? `"${m[2]}"` : `"${m[2].replace(/\\'/g, "'").replace(/"/g, '\\"')}"`)));
      report('ui.json', [...new Set(keys)].filter((k) => !(k in ui)).map((k) => `${JSON.stringify(k)}: missing`));
      for (const d of datasets) report(`metadata/${d}.json`, compare(englishMetadata(pkg(d)), read(`metadata/${d}.json`) || {}));
    }
    console.log(problems ? `${problems} translation problem(s)` : 'Every translation is complete.');
    process.exit(problems ? 1 : 0);
  }
}
