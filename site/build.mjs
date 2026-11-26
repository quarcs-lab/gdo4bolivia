// Build the website into _site/: bundle the React app (esbuild), compile Tailwind, write the data of
// the interactive maps and the search index, and pre-render one HTML page per route, each with its
// own title, description, preview card and structured data.
//
//   node site/build.mjs                    # _site/ for https://<owner>.github.io/<repo>/ (project.yaml)
//   node site/build.mjs --base / --serve 8765   # preview at http://localhost:8765/
//   node site/build.mjs --full             # also copy every tracked file, as GitHub Pages deploys it
//
// Generic: the site's identity comes from project.yaml and site/src/content.js.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import sharp from 'sharp';
import YAML from 'yaml';

const require = createRequire(import.meta.url);
const SITE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SITE, '..');

// --------------------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const project = YAML.parse(readFileSync(join(ROOT, 'project.yaml'), 'utf8'));
const SITE_URL = project.website.endsWith('/') ? project.website : `${project.website}/`;
const BASE = opt('base', new URL(SITE_URL).pathname);
const OUT = resolve(opt('out', join(ROOT, '_site')));
const FULL = argv.includes('--full');
const SERVE = opt('serve', null);

const C = await import(pathToFileURL(join(SITE, 'src/content.js')));
const readJSON = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const write = (p, text) => { const f = join(OUT, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); };
const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 10);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s) => String(s ?? '').replace(/`/g, '');
// a description may have several paragraphs (blank lines between them)
const oneLine = (s) => plain(s).replace(/\s*\n\s*/g, ' ');
const paragraphs = (s) => plain(s).split(/\n\s*\n/).filter(Boolean);
const itemPath = (item) => `${item.section}/${item.id}/`;

// --------------------------------------------------------------------------- code-box notebooks
// Every code box gets a Colab notebook with exactly its code (site/notebooks.mjs, which needs no
// npm packages). --check-notebooks writes nothing and fails if they are out of date.
{
  const { codeBoxNotebooks } = await import(pathToFileURL(join(SITE, 'notebooks.mjs')));
  if (!codeBoxNotebooks({ check: argv.includes('--check-notebooks') })) process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// --------------------------------------------------------------------------- static files
// --full reproduces the old "serve the repository" deployment, so URLs of data and docs keep working
if (FULL) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const f of files) {
    if (/^(site|\.github)\//.test(f) || ['index.html', '404.html', 'sitemap.xml'].includes(f)) continue;
    mkdirSync(dirname(join(OUT, f)), { recursive: true });
    cpSync(join(ROOT, f), join(OUT, f));
  }
} else {
  for (const p of ['images', 'robots.txt', 'site.webmanifest']) {
    if (existsSync(join(ROOT, p))) cpSync(join(ROOT, p), join(OUT, p), { recursive: true });
  }
  // the indicator pages read each dataset's metadata, data/<dataset>/datapackage.json, and offer its
  // wide files (data/<dataset>/<scale>/<dataset>_wide.gpkg and .geojson) for download
  for (const d of readJSON('data/index.json').datasets) {
    const pkg = readJSON(`data/${d}/datapackage.json`);
    mkdirSync(join(OUT, 'data', d), { recursive: true });
    cpSync(join(ROOT, 'data', d, 'datapackage.json'), join(OUT, 'data', d, 'datapackage.json'));
    for (const res of pkg.resources) {
      for (const key of ['geo:gpkg', 'geo:geojson']) {
        if (!res[key] || !existsSync(join(ROOT, res[key]))) continue;
        mkdirSync(dirname(join(OUT, res[key])), { recursive: true });
        cpSync(join(ROOT, res[key]), join(OUT, res[key]));
      }
    }
  }
}
writeFileSync(join(OUT, '.nojekyll'), '');

// --------------------------------------------------------------------------- GeoLibre projects
// "Open in GeoLibre" (site/geolibre.mjs): geolibre/<dataset>.geolibre.json for every indicator with
// `geolibre: true`, its wide GeoJSON styled as GeoLibre would, opened by web.geolibre.app from this site
{
  const { writeGeolibreProjects } = await import(pathToFileURL(join(SITE, 'geolibre.mjs')));
  writeGeolibreProjects({ registry: C.CONTENT_REGISTRY, readJSON, write, siteUrl: SITE_URL, siteName: C.SITE_NAME });
}

// --------------------------------------------------------------------------- responsive images
// Smaller copies of every WebP under images/ (but the hero's, hero-*, which the globe needs at full size),
// so a card or band loads the width it is shown at: assets/img/<path>-<w>.webp. Registry items' pictures
// also get a pre-blurred copy, the soft background of their page's header (<path>-blur.webp). The copies
// are cached in site/.cache/img/ by the source's hash, so a rebuild only redoes changed pictures.
const IMG_WIDTHS = [480, 800, 1200];
const IMG_CACHE = join(SITE, '.cache/img');
const imageVariants = {};
{
  mkdirSync(IMG_CACHE, { recursive: true });
  const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (
    e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.webp') && !e.name.startsWith('hero-') ? [`${dir}/${e.name}`] : []));
  const sources = existsSync(join(ROOT, 'images')) ? walk('images') : [];
  const blurred = new Set(C.CONTENT_REGISTRY.map((i) => i.image).filter(Boolean));
  const cached = async (key, out, make) => {
    const f = join(IMG_CACHE, key);
    if (!existsSync(f)) await make().toFile(f);
    mkdirSync(dirname(join(OUT, out)), { recursive: true });
    cpSync(f, join(OUT, out));
  };
  await Promise.all(sources.map(async (src) => {
    const buf = readFileSync(join(ROOT, src));
    const key = hash(buf);
    const { width, height } = await sharp(buf).metadata();
    const stem = `assets/img/${src.replace(/^images\//, '').replace(/\.webp$/, '')}`;
    const widths = IMG_WIDTHS.filter((w) => w < width);
    for (const w of widths) await cached(`${key}-${w}.webp`, `${stem}-${w}.webp`, () => sharp(buf).resize({ width: w }).webp({ quality: 78 }));
    const blur = blurred.has(src) && width > 800;
    if (blur) await cached(`${key}-blur.webp`, `${stem}-blur.webp`, () => sharp(buf).resize({ width: 800 }).blur(1.2).webp({ quality: 70 }));
    if (widths.length || blur) imageVariants[src] = { widths, width, height, blur };
  }));
}

// --------------------------------------------------------------------------- metadata
// one folder per dataset: data/<dataset>/datapackage.json, listed in data/index.json
const DATASETS = readJSON('data/index.json').datasets;
const PKG = Object.fromEntries(DATASETS.map((d) => [d, readJSON(`data/${d}/datapackage.json`)]));
const yearSpan = (resources) => {
  const years = resources.flatMap((r) => r['geo:period'] || []).map(Number).filter(Number.isFinite);
  return years.length ? [Math.min(...years), Math.max(...years)] : null;
};
const itemDatasets = (item) => (item.datasets || (item.dataset ? [item.dataset] : [])).filter((d) => PKG[d]);
const variables = (pkg) => pkg.resources[0].schema.fields.filter((f) => !f['geo:role']);

// --------------------------------------------------------------------------- data of the interactive maps
// One JSON per dataset: the units in a fixed order and, for every numeric variable, its values by year
const parseCSV = (text) => {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, j) => [h, r[j]])));
};
const units = parseCSV(readFileSync(join(ROOT, 'geo/units.csv'), 'utf8'));
const mapData = {};
for (const d of DATASETS) {
  const pkg = PKG[d]; const res = pkg.resources[0];
  const scale = res['geo:scale'];
  const ids = units.filter((u) => u.scale === scale).map((u) => u.geo_id).sort();
  const index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const rows = parseCSV(readFileSync(join(ROOT, res['geo:path']), 'utf8'));
  const vars = variables(pkg).filter((f) => f.type === 'number' || f.type === 'integer').map((f) => {
    const years = {};
    for (const r of rows) {
      if (r[f.name] === '' || r[f.name] === undefined || !(r.geo_id in index)) continue;
      const v = Number(r[f.name]);
      if (!Number.isFinite(v)) continue;
      (years[r.year] ||= Array(ids.length).fill(null))[index[r.geo_id]] = Number(v.toPrecision(6));
    }
    return { name: f.name, title: f.title, unit: f['geo:unit'] || '', years };
  }).filter((v) => Object.keys(v.years).length);
  mapData[d] = { dataset: d, title: pkg.title, scale, units: ids, variables: vars, default: pkg['geo:map'] || null };
  write(`assets/data/${d}.json`, JSON.stringify(mapData[d]));
}
// the boundaries of every map (scripts/web_boundaries.py): one file per scale, named after it
for (const f of readdirSync(join(SITE, 'data')).filter((name) => name.endsWith('.geojson'))) {
  cpSync(join(SITE, 'data', f), join(OUT, 'assets/data', f));
}

// --------------------------------------------------------------------------- translations
// site/i18n/<lang>/ (see site/i18n/strings.mjs): the app bundles ui.json and content.json; each dataset's
// translated labels and descriptions are served as assets/i18n/<lang>/<dataset>.json
const { overlay } = await import(pathToFileURL(join(SITE, 'src/overlay.js')));
const LANGS = existsSync(join(SITE, 'i18n')) ? readdirSync(join(SITE, 'i18n')).filter((l) => existsSync(join(SITE, 'i18n', l, 'content.json'))) : [];
const TR = Object.fromEntries(LANGS.map((l) => {
  const dir = join(SITE, 'i18n', l);
  const meta = {};
  for (const d of DATASETS) {
    const f = join(dir, 'metadata', `${d}.json`);
    if (existsSync(f)) { meta[d] = JSON.parse(readFileSync(f, 'utf8')); write(`assets/i18n/${l}/${d}.json`, JSON.stringify(meta[d])); }
  }
  return [l, { content: JSON.parse(readFileSync(join(dir, 'content.json'), 'utf8')), meta }];
}));
try { execFileSync('node', [join(SITE, 'i18n/strings.mjs')], { stdio: 'pipe' }); }
catch (e) { console.warn(`Some translations are missing or stale (node site/i18n/strings.mjs):\n${String(e.stdout).trim()}`); }

// --------------------------------------------------------------------------- search index
// One per language: assets/search.json (English) and assets/search.<lang>.json
const searchIndex = (lang) => C.CONTENT_REGISTRY.map((en) => {
  const tr = lang ? TR[lang] : null;
  const item = tr ? overlay(en, tr.content.items?.[en.id]) : en;
  return {
    href: itemPath(item), type: item.type, subtype: item.subtype || '', title: item.title, summary: plain(item.summary),
    tags: item.tags || [],
    text: oneLine(item.description),
    variables: itemDatasets(item).flatMap((d) => variables(PKG[d]).map((f) => ({ name: f.name, title: tr?.meta[d]?.fields?.[f.name]?.title || f.title, dataset: d }))),
  };
});
write('assets/search.json', JSON.stringify(searchIndex(null)));
for (const l of LANGS) write(`assets/search.${l}.json`, JSON.stringify(searchIndex(l)));

// --------------------------------------------------------------------------- JavaScript and CSS
const js = await esbuild.build({
  entryPoints: { app: join(SITE, 'src/app.jsx') },
  outdir: join(OUT, 'assets'), entryNames: '[name]-[hash]', chunkNames: 'chunk-[hash]',
  bundle: true, splitting: true, format: 'esm', target: 'es2020', minify: true, jsx: 'automatic',
  legalComments: 'linked', sourcemap: 'linked', metafile: true, logLevel: 'warning',
  define: {
    'process.env.NODE_ENV': '"production"',
    __SITE_CONFIG__: JSON.stringify(project.site || {}),
    // number of units at each scale of geo/units.csv, e.g. {"country": 1, ..., "total": 466}
    __UNIT_COUNTS__: JSON.stringify(units.reduce((n, u) => ({ ...n, [u.scale]: (n[u.scale] || 0) + 1, total: (n.total || 0) + 1 }), {})),
    // first and last year of every published resource (geo:period), e.g. [2001, 2024]
    __YEAR_SPAN__: JSON.stringify(yearSpan(Object.values(PKG).flatMap((p) => p.resources || []))),
    // the smaller copies of each picture (see "responsive images"), e.g. {"images/bands/x.webp": {"widths": [480, 800, 1200], ...}}
    __IMAGE_VARIANTS__: JSON.stringify(imageVariants),
  },
});
const appJs = `assets/${basename(Object.entries(js.metafile.outputs).find(([, o]) => o.entryPoint && o.entryPoint.endsWith('src/app.jsx'))[0])}`;

const twConfig = require(join(SITE, 'tailwind.config.cjs'));
twConfig.content = [join(SITE, 'src/**/*.{js,jsx}'), join(SITE, 'template.html'), join(SITE, 'build.mjs')];
const { css } = await postcss([tailwindcss(twConfig)]).process(readFileSync(join(SITE, 'src/styles.css'), 'utf8'), { from: undefined });
const { code: cssMin } = await esbuild.transform(css, { loader: 'css', minify: true });
const appCss = `assets/app-${hash(cssMin)}.css`;
write(appCss, cssMin);
cpSync(join(dirname(require.resolve('leaflet')), 'leaflet.css'), join(OUT, 'assets/leaflet.css'));
// Inter, served with the site (the @font-face rules are in src/styles.css, the preload in template.html)
mkdirSync(join(OUT, 'assets/fonts'), { recursive: true });
const FONT_DIR = join(dirname(require.resolve('@fontsource-variable/inter/package.json')), 'files');
for (const f of ['inter-latin-wght-normal.woff2', 'inter-latin-ext-wght-normal.woff2']) cpSync(join(FONT_DIR, f), join(OUT, 'assets/fonts', f));

// --------------------------------------------------------------------------- preview images
// A 1200 x 630 JPEG per item from its card, for link previews (WebP is not read everywhere)
const ogImage = {};
for (const item of C.CONTENT_REGISTRY) {
  if (!item.image || !existsSync(join(ROOT, item.image))) continue;
  const p = `assets/og/${item.id}.jpg`;
  mkdirSync(join(OUT, 'assets/og'), { recursive: true });
  await sharp(join(ROOT, item.image)).resize(1200, 630, { fit: 'cover' }).flatten({ background: '#071417' })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, p));
  ogImage[item.id] = p;
}

// --------------------------------------------------------------------------- structured data
const ORG = `${SITE_URL}#org`;
const orgGraph = [
  { '@type': 'WebSite', '@id': `${SITE_URL}#website`, url: SITE_URL, name: C.SITE_NAME, alternateName: C.SHORT_NAME, inLanguage: 'en', publisher: { '@id': ORG } },
  {
    '@type': 'ResearchProject', '@id': ORG, name: C.SITE_NAME, alternateName: C.SHORT_NAME, url: SITE_URL,
    logo: `${SITE_URL}images/logo/emblem-512.png`, sameAs: [C.REPO_URL],
    member: C.PEOPLE.core.map((p) => ({ '@type': 'Person', name: p.name, affiliation: p.affiliation })),
  },
];
const period = (p) => String(p || '').replace(/[–-]/, '/');
// ISO 8601 coverage of an indicator from its resources' geo:period, else its display period
const coverage = (pkgs, fallback) => {
  const span = yearSpan(pkgs.flatMap((p) => p?.resources || []));
  return span ? (span[0] === span[1] ? String(span[0]) : `${span[0]}/${span[1]}`) : period(fallback);
};
const itemLD = (item) => {
  const url = SITE_URL + itemPath(item);
  const base = { '@id': `${url}#item`, url, name: item.title, description: oneLine(item.description || item.summary), keywords: item.tags, creator: { '@id': ORG } };
  if (item.type === 'indicator') {
    const pkgs = itemDatasets(item).map((d) => PKG[d]);
    return {
      '@type': 'Dataset', ...base, isAccessibleForFree: true,
      license: pkgs[0]?.licenses?.[0]?.path, temporalCoverage: coverage(pkgs, item.period),
      spatialCoverage: { '@type': 'Place', name: project.country.name },
      variableMeasured: pkgs.flatMap((p) => variables(p).map((f) => f.title)).filter((t, i, a) => a.indexOf(t) === i).slice(0, 100),
    };
  }
  if (item.type === 'package') {
    const repo = (item.links || []).find((l) => l.kind === 'github');
    return { '@type': 'SoftwareSourceCode', ...base, programmingLanguage: 'Python', codeRepository: repo?.url };
  }
  if (item.type === 'notebook') return { '@type': 'LearningResource', ...base, learningResourceType: 'Jupyter notebook' };
  if (item.type === 'app') return { '@type': 'WebApplication', ...base, applicationCategory: 'Map', operatingSystem: 'Web browser' };
  if (item.type === 'project') return { '@type': 'ResearchProject', ...base, ...(item.links?.[0] ? { sameAs: item.links[0].url } : {}) };
  if (item.type === 'insight') return { '@type': 'ScholarlyArticle', ...base, headline: item.title, sameAs: item.doi, datePublished: item.date };
  if (item.type === 'event') return { '@type': 'Event', ...base, startDate: item.date };
  return { '@type': 'CreativeWork', ...base };
};
const SECTION_LABEL = { indicators: 'Indicators', tools: 'Tools', projects: 'Projects', insights: 'Insights', events: 'Events' };
const breadcrumb = (item) => ({
  '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: SECTION_LABEL[item.section], item: `${SITE_URL}#${item.section}` },
    { '@type': 'ListItem', position: 3, name: item.title, item: SITE_URL + itemPath(item) },
  ],
});
const jsonLD = (graph) => JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

// --------------------------------------------------------------------------- crawlable fallbacks
const ul = (lis) => (lis.length ? `<ul>${lis.map((li) => `<li>${li}</li>`).join('')}</ul>` : '');
const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
const BY_SECTION = (section) => C.CONTENT_REGISTRY.filter((i) => i.section === section);
const homeFallback = () => [
  `<img src="images/logo/emblem-192.png" alt="${esc(C.SHORT_NAME)} emblem" width="72" height="72">`,
  `<h1 style="font-size:2.25rem;font-weight:800;margin:1rem 0">${esc(C.SITE_NAME)}</h1>`,
  `<p>${esc(C.SITE_DESCRIPTION)}</p>`,
  ...Object.entries(SECTION_LABEL).filter(([s]) => BY_SECTION(s).length).flatMap(([s, label]) => [
    `<h2>${esc(label)}</h2>`, ul(BY_SECTION(s).map((i) => `${a(itemPath(i), i.title)}: ${esc(plain(i.summary))}`)),
  ]),
  `<p>Data, code and documentation: ${a(C.REPO_URL, 'GitHub repository')}.</p>`,
].join('\n');
const itemFallback = (item) => {
  const pkgs = itemDatasets(item).map((d) => PKG[d]);
  return [
    `<p>${a('./', C.SITE_NAME)} / ${a(`./#${item.section}`, SECTION_LABEL[item.section])}</p>`,
    `<h1 style="font-size:2.25rem;font-weight:800;margin:1rem 0">${esc(item.title)}</h1>`,
    `<p>${esc(plain(item.summary))}</p>`,
    ...paragraphs(item.description).map((para) => `<p>${esc(para)}</p>`),
    item.citation ? `<p>${esc(item.citation)} ${a(item.doi, item.doi)}</p>` : '',
    ul((item.links || []).map((l) => a(l.url, l.label))),
    ...pkgs.flatMap((p) => [
      `<h2>Variables of ${esc(p.name)}</h2>`,
      ul(variables(p).map((f) => `<code>${esc(f.name)}</code>: ${esc(f.title)}. ${esc(plain(f.description))}`)),
      '<h2>Sources</h2>', ul((p.sources || []).map((s) => `${esc(s.title)}${s.path ? ` ${a(s.path, s.path)}` : ''}`)),
    ]),
    `<p>${a('./', `Back to the ${C.SITE_NAME}`)}</p>`,
  ].filter(Boolean).join('\n');
};

// --------------------------------------------------------------------------- pages
const template = readFileSync(join(SITE, 'template.html'), 'utf8');
const page = (p) => {
  const fields = {
    BASE, TITLE: p.title, DESCRIPTION: p.description, URL: p.url, OG_TYPE: p.ogType || 'website',
    OG_TITLE: p.ogTitle || p.title, OG_DESCRIPTION: p.description, OG_IMAGE: SITE_URL + p.image, OG_IMAGE_ALT: p.imageAlt || '',
    SHORT_NAME: C.SHORT_NAME, REPO_URL: C.REPO_URL, APP_JS: appJs, APP_CSS: appCss,
  };
  let html = template.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in fields ? esc(fields[k]) : m));
  const raw = {
    JSONLD: p.jsonld, FALLBACK: p.fallback, BOOT: p.boot || '', PRELOAD: p.preload || '',
    ROBOTS: p.noindex ? '<meta name="robots" content="noindex">' : '',
  };
  return html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in raw ? raw[k] : m));
};
// The widths a detail page's main image is shown at; keep equal to DETAIL_SIZES in site/src/app.jsx
const DETAIL_SIZES = '(min-width: 1024px) 740px, 92vw';
const imagePreload = (src) => {
  const v = imageVariants[src];
  const set = v?.widths.length ? [...v.widths.map((w) => `assets/img/${src.replace(/^images\//, '').replace(/\.webp$/, '')}-${w}.webp ${w}w`), `${src} ${v.width}w`].join(', ') : '';
  return `<link rel="preload" as="image" href="${esc(src)}"${set ? ` imagesrcset="${esc(set)}" imagesizes="${esc(DETAIL_SIZES)}"` : ''} fetchpriority="high">`;
};
const indicatorItems = C.CONTENT_REGISTRY.filter((i) => i.type === 'indicator');
write('index.html', page({
  title: C.DEFAULT_TITLE, ogTitle: C.SITE_NAME, description: C.SITE_DESCRIPTION, url: SITE_URL,
  image: 'images/og-image.jpg', imageAlt: `${C.SITE_NAME}: satellite view of Bolivia`,
  jsonld: jsonLD([...orgGraph, ...C.CONTENT_REGISTRY.filter((i) => ['indicator', 'package'].includes(i.type)).map(itemLD)]),
  fallback: homeFallback(), boot: '<div class="boot-hero" aria-hidden="true"></div>',
  preload: '<link rel="preload" as="image" href="images/hero-day.webp">',
}));
for (const item of C.CONTENT_REGISTRY) {
  write(`${itemPath(item)}index.html`, page({
    title: `${item.title} | ${C.SHORT_NAME}`, ogTitle: item.title, description: plain(item.summary),
    url: SITE_URL + itemPath(item), ogType: item.type === 'insight' ? 'article' : 'website',
    image: ogImage[item.id] || 'images/og-image.jpg', imageAlt: item.imageAlt,
    jsonld: jsonLD([...orgGraph, itemLD(item), breadcrumb(item)]), fallback: itemFallback(item),
    // The page's largest image (an indicator's map, else the item's picture) is found before the app runs,
    // in the copy the page will pick (srcset and sizes as in app.jsx)
    preload: (item.map || item.image) ? imagePreload(item.map || item.image) : '',
  }));
}
// Retired pages send visitors and search engines to the page that replaced them: a page of this site
// ("<section>/<id>", keeping the #anchor) or, for a page that left the site, a full URL
for (const [from, to] of Object.entries(C.REDIRECTS || {})) {
  const external = /^https?:/.test(to);
  const href = external ? to : `${BASE + to}/`;
  write(`${from}/index.html`, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<meta name="robots" content="noindex"><link rel="canonical" href="${esc(external ? to : `${SITE_URL + to}/`)}">
<meta http-equiv="refresh" content="0; url=${esc(href)}">
<script>location.replace(${JSON.stringify(href)}${external ? '' : ' + location.hash'})</script>
</head><body><p>This page has moved to <a href="${esc(href)}">${esc(external ? to : SITE_URL + to + '/')}</a>.</p></body></html>
`);
}
// Unknown paths: GitHub Pages serves 404.html, and the app shows its "not found" page there
write('404.html', page({
  title: `Page not found | ${C.SHORT_NAME}`, description: C.SITE_DESCRIPTION, url: SITE_URL, image: 'images/og-image.jpg',
  jsonld: jsonLD(orgGraph), noindex: true,
  fallback: `<h1>Page not found</h1><p>${a('./', `Back to the ${C.SITE_NAME}`)}</p>`,
}));

const today = new Date().toISOString().slice(0, 10);
const lastmod = (item) => itemDatasets(item).map((d) => PKG[d]['geo:updated']).filter(Boolean).sort().pop() || item.date;
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
${C.CONTENT_REGISTRY.map((i) => `  <url><loc>${SITE_URL}${itemPath(i)}</loc><lastmod>${lastmod(i)}</lastmod></url>`).join('\n')}
</urlset>
`);

console.log(`Built ${C.CONTENT_REGISTRY.length + 2} pages, ${DATASETS.length} map datasets and the search index into ${OUT} (base ${BASE})`);

// --------------------------------------------------------------------------- preview server
if (SERVE) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.geojson': 'application/geo+json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
  createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (!p.startsWith(BASE)) p = BASE;
    let f = join(OUT, p.slice(BASE.length));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    const found = existsSync(f) && f.startsWith(OUT);
    res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[found ? extname(f) : '.html'] || 'application/octet-stream' });
    createReadStream(found ? f : join(OUT, '404.html')).pipe(res);
  }).listen(Number(SERVE), '127.0.0.1', () => console.log(`Preview: http://localhost:${SERVE}${BASE}`));
}
