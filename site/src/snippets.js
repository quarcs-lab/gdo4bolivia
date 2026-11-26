// Every code box of the website that runs in Colab has a notebook of its own with exactly its code,
// so its Open in Colab button opens that code ready to run. Plain JavaScript (no JSX), generic: shared
// by the app (the button's link) and site/notebooks.mjs (which writes the notebooks into notebooks/snippets/; site/build.mjs runs it).
//
// A notebook's path inside notebooks/ is snippets/<item id>/<slot>.ipynb, with these slots:
//   python, pandas                     an indicator's code tabs (item.code)
//   example-1, example-2, ...          an indicator's More examples (item.examples, in order)
//   install                            a package's Install box (item.install)
//   quickstart-python, quickstart-pandas   a package's Quickstart tabs (item.quickstart)
//   step-<id>                          a package's Tutorial steps (item.tutorial)
//   build                              a package's Build your own indicator (item.build)
// and snippets/<id>.ipynb for a box shared by several pages (SHARED_SNIPPETS in content.js).

export const SNIPPETS_DIR = 'snippets';

export const snippetPath = (itemId, slot) => `${SNIPPETS_DIR}/${itemId}/${slot}.ipynb`;
export const sharedSnippetPath = (id) => `${SNIPPETS_DIR}/${id}.ipynb`;

const TAB_TITLE = { python: 'with the package', pandas: 'without the package (plain URLs)', gpkg: 'from the wide GeoPackage (one row per municipality)', geolibre: 'in GeoLibre (the wide GeoJSON)' };

// Every code box of the registry as { path, code, title, page }: page is the item's path on the
// website (e.g. "indicators/<id>/"), title says which box it is
export const registrySnippets = (registry) => {
  const out = [];
  const add = (item, slot, code, title) => {
    if (typeof code === 'string' && code.trim()) out.push({ path: snippetPath(item.id, slot), code, title, page: `${item.section}/${item.id}/`, item });
  };
  for (const item of registry) {
    for (const [k, code] of Object.entries(item.code || {})) add(item, k, code, `Load the data ${TAB_TITLE[k] || k}`);
    (item.examples || []).forEach((ex, i) => add(item, `example-${i + 1}`, ex.code, ex.title));
    add(item, 'install', item.install, 'Install');
    for (const [k, code] of Object.entries(item.quickstart || {})) add(item, `quickstart-${k}`, code, `Quickstart ${TAB_TITLE[k] || k}`);
    (item.tutorial || []).forEach((st) => add(item, `step-${st.id}`, st.code, st.title));
    add(item, 'build', item.build, 'Build your own indicator');
  }
  return out;
};

// The notebook of one code box: a Markdown cell (what it is, the page it comes from) and the code
export const snippetNotebook = ({ code, title, heading, pageUrl, siteName }) => ({
  cells: [
    { cell_type: 'markdown', metadata: {}, source: [
      `# ${heading}\n\n`,
      `**${title}**: the code of a box on [${pageUrl}](${pageUrl}) (${siteName}), on its own. `,
      'Run the cell (Runtime > Run all); it installs what it needs.',
    ].join('') },
    { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: code.trim() },
  ],
  metadata: {
    colab: { provenance: [] },
    kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
    language_info: { name: 'python' },
  },
  nbformat: 4,
  nbformat_minor: 5,
});

// ---------------------------------------------------------------------------- the page notebooks
// "Open in AI Notebook" (indicator pages): one notebook with every code box of the page, in page order,
// written into notebooks/pages/<item id>.ipynb by site/notebooks.mjs. It opens with the indicator, the
// questions to ask Colab's AI (item.aiPrompts), the variables, then a single Setup cell that installs and
// imports what every box needs (their own !pip and import lines move there), the boxes, and how to cite.
export const PAGES_DIR = 'pages';
export const pagePath = (itemId) => `${PAGES_DIR}/${itemId}.ipynb`;

// The order of an indicator's code tabs on its page (CODE_TABS in app.jsx)
export const PAGE_TABS = ['python', 'pandas', 'gpkg', 'geolibre'];

const md = (text) => ({ cell_type: 'markdown', metadata: {}, source: text });
const codeCell = (text) => ({ cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: text });
const cellText = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// Splits the boxes' code into the shared setup (installs and top-level imports, each once, first seen
// first) and what is left of each box
export const splitSetup = (codes) => {
  const reqs = new Map();   // package -> Set of extras
  const imports = [];
  const bodies = codes.map((code) => {
    const kept = [];
    for (const line of code.split('\n')) {
      const pip = line.match(/^!pip install(?: -q)? (.+)$/);
      if (pip) {
        for (const tok of pip[1].replace(/["']/g, '').split(/\s+/).filter((x) => x && !x.startsWith('-'))) {
          const [, name, extras] = tok.match(/^([^[\]]+)(?:\[([^\]]*)\])?$/) || [null, tok, ''];
          if (!reqs.has(name)) reqs.set(name, new Set());
          (extras || '').split(',').filter(Boolean).forEach((e) => reqs.get(name).add(e.trim()));
        }
      } else if (/^(import|from)\s\S/.test(line)) {
        if (!imports.includes(line)) imports.push(line);
      } else kept.push(line);
    }
    return kept.join('\n').replace(/^\s*\n/, '').trim();
  });
  const install = [...reqs].map(([name, ex]) => (ex.size ? `"${name}[${[...ex].sort().join(',')}]"` : name));
  const setup = [install.length ? `!pip install -q ${install.join(' ')}` : '', ...imports].filter(Boolean).join('\n');
  return { setup, bodies };
};

// The code boxes of an indicator's page as [{ heading, code }], in page order
export const pageBoxes = (item) => [
  ...PAGE_TABS.filter((k) => typeof item.code?.[k] === 'string' && item.code[k].trim())
    .map((k) => ({ heading: `Load the data ${TAB_TITLE[k]}`, code: item.code[k] })),
  ...(item.examples || []).filter((ex) => ex.code?.trim()).map((ex) => ({ heading: ex.title, code: ex.code })),
];

// How to cite, as the page does (datasetCitations in app.jsx): the original sources, the observatory,
// then the other sources, each once
export const pageCitations = (packages, citationApa) => {
  const seen = new Set();
  const sources = packages.flatMap((p) => p.sources || []).filter((s) => !seen.has(s.title) && seen.add(s.title));
  const list = [
    ...sources.filter((s) => s['geo:role'] === 'original').map((s) => s.title),
    citationApa,
    ...sources.filter((s) => s['geo:role'] !== 'original').map((s) => s.title),
  ];
  return list.filter((x, i) => list.indexOf(x) === i);
};

// packages: the item's data/<dataset>/datapackage.json, parsed
export const pageNotebook = ({ item, packages, citationApa, pageUrl, siteName }) => {
  const boxes = pageBoxes(item);
  const { setup, bodies } = splitSetup(boxes.map((b) => b.code));
  const ids = packages.map((p) => p.name);
  const variables = packages.flatMap((p) => p.resources.flatMap((r) => r.schema.fields.map((f) => ({ ...f, dataset: p.name }))));
  const seenVar = new Set();
  const rows = variables.filter((f) => !seenVar.has(f.name) && seenVar.add(f.name));
  const licenses = packages.flatMap((p) => p.licenses || []).filter((l, i, a) => a.findIndex((m) => m.name === l.name) === i);
  const seenSrc = new Set();
  const sourceLicenses = packages.flatMap((p) => p.sources || [])
    .filter((s) => s['geo:license'] && !seenSrc.has(s.title) && seenSrc.add(s.title))
    .map((s) => `- ${s['geo:creator'] || s.title}: [${s['geo:license'].title || s['geo:license'].name}](${s['geo:license'].path})`);
  const cells = [
    md([
      `# ${item.title}\n\n`,
      `${item.summary}\n\n`,
      `This notebook gathers every code box of the indicator's page, [${pageUrl}](${pageUrl}) (${siteName}), `,
      'so you can work with the data in one place. Run **Setup** first; then any section runs on its own ',
      '(Runtime › Run all runs everything).',
    ].join('')),
    md([
      '## Ask Gemini, Colab\'s AI\n\n',
      'Colab has an AI assistant, Gemini. Open it with the Gemini button (✦) in Colab\'s toolbar, or click ',
      '**Generate** in an empty code cell, and paste one of these questions. It writes and explains code that ',
      'builds on the data loaded below. Run Setup first, and check its answers against the variables\' ',
      'descriptions on the page.\n\n',
      ...(item.aiPrompts || []).map((p) => `- "${p}"\n`),
    ].join('')),
    md([
      '## Variables\n\n',
      `The columns of ${ids.map((d) => `\`${d}\``).join(' and ')}, one row per unit and year. Each one's full description `,
      `(how it was built, its source and reference years) is under Variables on the page, and in \`geo.dictionary("${ids[0]}")\`.\n\n`,
      '| Variable | Label | Unit |\n| --- | --- | --- |\n',
      ...rows.map((f) => `| \`${f.name}\` | ${cellText(f.title)} | ${cellText(f['geo:unit'] || f.unit || '')} |\n`),
    ].join('')),
    md('## Setup\n\nInstalls the packages every section uses and imports them once.'),
    codeCell(setup),
    ...boxes.flatMap((b, i) => [md(`## ${b.heading}`), codeCell(bodies[i])]),
    md([
      '## License and how to cite\n\n',
      `The data are published under ${licenses.map((l) => `[${l.title || l.name}](${l.path})`).join(', ')}`,
      sourceLicenses.length ? '; their sources keep their own licenses:\n\n' + sourceLicenses.join('\n') + '\n\n' : '.\n\n',
      'If you use these data, please cite, in this order, the original source, the observatory, which processes ',
      'and maintains them, and the other sources:\n\n',
      ...pageCitations(packages, citationApa).map((c, i) => `${i + 1}. ${c}\n`),
    ].join('')),
  ];
  return {
    cells,
    metadata: {
      colab: { provenance: [] },
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
};
