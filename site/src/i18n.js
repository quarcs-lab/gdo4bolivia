// The website's languages. English is the source: every text of app.jsx, map.jsx, content.js and the
// metadata is written in English, and each other language lives in site/i18n/<lang>/ (see
// site/i18n/strings.mjs, which lists what is translated and checks that nothing is missing):
//   ui.json                  interface strings, keyed by their English text
//   content.json             the site's constants, the package cards and the registry items' prose
//   metadata/<dataset>.json  a dataset's title and its variables' labels and descriptions
// A translation is loaded only when its language is chosen. Generic: no project-specific text here.
import { overlay } from './overlay.js';

export const LANGUAGES = {
  en: { label: 'English', short: 'EN' },
  es: { label: 'Español', short: 'ES' },
};
export const DEFAULT_LANGUAGE = 'en';

// Translations of each language other than English, as separate chunks of the bundle
const LOADERS = {
  es: () => Promise.all([import('../i18n/es/ui.json'), import('../i18n/es/content.json')]),
};

// IANA time zones of the countries whose main language is Spanish: Spain and Equatorial Guinea, Mexico,
// Central America and the Caribbean, and South America. The browser reports its zone, so the country
// is known without any request to a geolocation service.
const SPANISH_ZONES = [
  'Europe/Madrid', 'Africa/Ceuta', 'Atlantic/Canary', 'Africa/Malabo',
  'America/Mexico_City', 'America/Cancun', 'America/Merida', 'America/Monterrey', 'America/Matamoros',
  'America/Chihuahua', 'America/Ciudad_Juarez', 'America/Ojinaga', 'America/Mazatlan', 'America/Bahia_Banderas',
  'America/Hermosillo', 'America/Tijuana',
  'America/Guatemala', 'America/Tegucigalpa', 'America/El_Salvador', 'America/Managua', 'America/Costa_Rica',
  'America/Panama', 'America/Havana', 'America/Santo_Domingo', 'America/Puerto_Rico',
  'America/Bogota', 'America/Caracas', 'America/Guayaquil', 'Pacific/Galapagos', 'America/Lima', 'America/La_Paz',
  'America/Asuncion', 'America/Montevideo', 'America/Santiago', 'America/Punta_Arenas', 'Pacific/Easter',
  'America/Buenos_Aires', 'America/Cordoba', 'America/Catamarca', 'America/Jujuy', 'America/Mendoza',
];
const zoneLanguage = () => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (SPANISH_ZONES.includes(zone) || zone.startsWith('America/Argentina/')) return 'es';
  } catch (e) { /* no Intl: fall through */ }
  return null;
};

// The visitor's choice is remembered per site (several sites can share an origin, e.g. <owner>.github.io)
const STORE_KEY = `lang:${new URL(document.baseURI).pathname}`;
const stored = () => { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } };
const remember = (lang) => { try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* storage blocked */ } };

// ?lang=es in a link, else the visitor's last choice, else the country (time zone), else the browser's language
export const detectLanguage = () => {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param && LANGUAGES[param]) { remember(param); return param; }
  const saved = stored();
  if (saved && LANGUAGES[saved]) return saved;
  const byZone = zoneLanguage();
  if (byZone) return byZone;
  const browser = ((navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
  return LANGUAGES[browser] ? browser : DEFAULT_LANGUAGE;
};

// ---------------------------------------------------------------- state
let current = DEFAULT_LANGUAGE;
const loaded = { en: { ui: {}, content: null } };
export const language = () => current;

export const loadLanguage = (lang) => {
  if (loaded[lang]) return Promise.resolve(loaded[lang]);
  if (!LOADERS[lang]) return Promise.reject(new Error(`No translation for ${lang}`));
  return LOADERS[lang]().then(([ui, content]) => (loaded[lang] = { ui: ui.default || ui, content: content.default || content }));
};

// Make `lang` current (its translation must be loaded); `save` remembers it as the visitor's choice
export const setLanguage = (lang, save = false) => {
  current = loaded[lang] ? lang : DEFAULT_LANGUAGE;
  document.documentElement.lang = current;
  if (save) remember(current);
};

// t('Copy') -> 'Copiar'; t('{n} results', { n: 3 }) fills {placeholders}. Falls back to the English text.
export const t = (text, vars) => {
  const s = (current !== DEFAULT_LANGUAGE && loaded[current].ui[text]) || text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
};

// ---------------------------------------------------------------- content
const cache = {};
// The registry, the package cards and the site constants in the current language
export const localized = (C) => {
  if (current === DEFAULT_LANGUAGE) return C;
  if (cache[current]) return cache[current];
  const tr = loaded[current].content || {};
  return (cache[current] = {
    ...C, ...(tr.site || {}),
    CONTENT_REGISTRY: C.CONTENT_REGISTRY.map((item) => overlay(item, tr.items?.[item.id])),
    PACKAGE_WORKFLOW: C.PACKAGE_WORKFLOW.map((w) => overlay(w, tr.workflow?.[w.id])),
  });
};

// A dataset's metadata (datapackage.json) with its title and variables in the current language
// (assets/i18n/<lang>/<dataset>.json, copied there by site/build.mjs); English when there is none
const metaCache = {};
export const fetchMetadataTranslation = (dataset, lang = current) => {
  if (lang === DEFAULT_LANGUAGE) return Promise.resolve(null);
  const key = `${lang}/${dataset}`;
  return metaCache[key] || (metaCache[key] = fetch(`assets/i18n/${key}.json`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null));
};
export const translatePackage = (pkg, tr) => {
  if (!tr) return pkg;
  const fields = (f) => ({ ...f, ...(tr.fields?.[f.name] || {}) });
  return {
    ...pkg, title: tr.title || pkg.title,
    resources: pkg.resources.map((r, i) => (i === 0 ? { ...r, schema: { ...r.schema, fields: r.schema.fields.map(fields) } } : r)),
  };
};
