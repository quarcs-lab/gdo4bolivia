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

const TAB_TITLE = { python: 'with the package', pandas: 'without the package (plain URLs)' };

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
