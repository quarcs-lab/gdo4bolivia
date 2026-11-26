// "Open in GeoLibre": a GeoLibre project file (https://geolibre.app, the open-source GIS in the browser)
// for every indicator of the CONTENT_REGISTRY with `geolibre: true`. site/build.mjs runs it and writes
// _site/geolibre/<dataset>.geolibre.json; the website opens it with
// https://web.geolibre.app/?url=<that file> (a new tab, or the embedded viewer of the indicator page).
// Generic: everything comes from project.yaml, content.js and the datasets' metadata.
//
// The project has one layer, the dataset's wide GeoJSON (data/<dataset>/<scale>/<dataset>_wide.geojson,
// one feature per unit, a property per variable and year), fetched by GeoLibre from this website, and
// styled as GeoLibre styles a graduated layer by default: five natural-breaks classes in its viridis
// ramp, on the headline variable and year of the dataset (`geo:map`). Every other <variable>_<year>
// stays in the layer, so users can restyle it in GeoLibre's Style panel.
//
// GeoLibre draws a graduated layer from the class breaks stored in the project (it does not compute
// them when a project opens), so they are computed here with a port of GeoLibre's own natural breaks
// and colour ramp (packages/core/src/color-ramp.ts, MIT License, (c) the GeoLibre authors): the map
// opens exactly as GeoLibre's Style panel would draw it.

export const GEOLIBRE_APP = 'https://web.geolibre.app/';
export const GEOLIBRE_DIR = 'geolibre';
export const projectPath = (dataset) => `${GEOLIBRE_DIR}/${dataset}.geolibre.json`;

const CLASS_COUNT = 5;
const SCHEME = 'natural-breaks';
const RAMP = 'viridis';
const RAMPS = { viridis: ['#440154', '#31688e', '#35b779', '#fde725'] };   // GeoLibre's VECTOR_COLOR_RAMPS
const MAX_NATURAL_BREAK_SAMPLES = 1000;

// ------------------------------------------------------------------ GeoLibre's classification, ported
const hex = (v) => { const n = Number.parseInt(v.slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; };
const toHex = (c) => `#${[c.r, c.g, c.b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
const mix = (from, to, ratio) => {
  const a = hex(from); const b = hex(to);
  return toHex({ r: Math.round(a.r + (b.r - a.r) * ratio), g: Math.round(a.g + (b.g - a.g) * ratio), b: Math.round(a.b + (b.b - a.b) * ratio) });
};
export function rampColors(ramp, count) {
  const anchors = RAMPS[ramp];
  if (count <= 0) return [];
  if (count === 1) return [anchors.at(-1)];
  return Array.from({ length: count }, (_, i) => {
    const scaled = (i / (count - 1)) * (anchors.length - 1);
    const lo = Math.floor(scaled); const hi = Math.min(anchors.length - 1, Math.ceil(scaled));
    return mix(anchors[lo], anchors[hi], scaled - lo);
  });
}

const downsample = (values, max) => {
  if (values.length <= max) return values;
  const step = (values.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => values[Math.round(i * step)]);
};

// Jenks natural breaks as GeoLibre computes them: the class lower bounds (the minimum first)
export function naturalBreaks(values, count) {
  const sorted = downsample(Array.from(new Set(values)).sort((a, b) => a - b), MAX_NATURAL_BREAK_SAMPLES);
  if (sorted.length <= count) return sorted;
  const limits = Array.from({ length: sorted.length + 1 }, () => Array(count + 1).fill(0));
  const variance = Array.from({ length: sorted.length + 1 }, () => Array(count + 1).fill(Number.POSITIVE_INFINITY));
  for (let k = 1; k <= count; k += 1) { limits[1][k] = 1; variance[1][k] = 0; }
  for (let i = 2; i <= sorted.length; i += 1) {
    let sum = 0; let sumSquares = 0; let weight = 0;
    for (let lower = 1; lower <= i; lower += 1) {
      const current = i - lower + 1;
      const value = sorted[current - 1];
      weight += 1; sum += value; sumSquares += value * value;
      const v = sumSquares - (sum * sum) / weight;
      const previous = current - 1;
      if (previous === 0) continue;
      for (let k = 2; k <= count; k += 1) {
        const candidate = v + variance[previous][k - 1];
        if (variance[i][k] >= candidate) { limits[i][k] = current; variance[i][k] = candidate; }
      }
    }
    limits[i][1] = 1;
    variance[i][1] = sumSquares - (sum * sum) / Math.max(1, weight);
  }
  const breaks = Array(count).fill(sorted[0]);
  let i = sorted.length;
  for (let k = count; k >= 2; k -= 1) {
    const limit = Math.max(1, limits[i][k]);
    breaks[k - 1] = sorted[limit - 1];
    i = limit - 1;
  }
  breaks[0] = sorted[0];
  return breaks.filter((b, j) => Number.isFinite(b) && (j === 0 || b > breaks[j - 1]));
}

// GeoLibre's createGraduatedStops: one stop (class lower bound and colour) per class
export function graduatedStops(values, count = CLASS_COUNT, ramp = RAMP) {
  const finite = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  const colors = rampColors(ramp, count);
  if (!finite.length) return colors.map((color, value) => ({ value, color }));
  if (Math.min(...finite) === Math.max(...finite)) return [{ value: finite[0], color: colors.at(-1) }];
  const breaks = naturalBreaks(finite, count);
  const stopColors = breaks.length === count ? colors : rampColors(ramp, breaks.length);
  return breaks.map((value, i) => ({ value, color: stopColors[i] }));
}

// ------------------------------------------------------------------ the project of one indicator
const bboxOf = (features) => {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c) => {
    if (typeof c[0] === 'number') { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); return; }
    c.forEach(walk);
  };
  features.forEach((f) => f.geometry && walk(f.geometry.coordinates));
  return b.map((x) => Number(x.toFixed(4)));
};

export function geolibreProject({ item, pkg, geojson, siteUrl, siteName }) {
  const res = pkg.resources[0];
  const view = pkg['geo:map'];
  if (!view?.variable || !view?.year) throw new Error(`${pkg.name}: geo:map needs a variable and a year for GeoLibre`);
  const column = `${view.variable}_${view.year}`;
  const fields = Object.fromEntries(res.schema.fields.map((f) => [f.name, f]));
  const label = fields[view.variable]?.title || view.variable;
  const values = geojson.features.map((f) => f.properties[column]);
  if (!values.some((v) => typeof v === 'number')) throw new Error(`${pkg.name}: ${column} is not in ${res['geo:geojson']}`);
  const bbox = bboxOf(geojson.features);
  const creators = pkg.sources.filter((s) => s['geo:role'] === 'original').map((s) => s['geo:creator']).filter(Boolean);
  const pageUrl = `${siteUrl}${item.section}/${item.id}/`;
  const layerId = `${pkg.name}-wide`;
  return {
    version: '0.2.0',
    name: `${item.title} · ${siteName}`,
    mapView: { center: [Number(((bbox[0] + bbox[2]) / 2).toFixed(4)), Number(((bbox[1] + bbox[3]) / 2).toFixed(4))], zoom: 5, bearing: 0, pitch: 0, bbox },
    layers: [{
      id: layerId,
      name: `${label}, ${view.year}`,
      type: 'geojson',
      source: { type: 'geojson', data: `${siteUrl}${res['geo:geojson']}` },
      visible: true,
      opacity: 1,
      metadata: {},
      style: {
        fillColor: '#3b82f6', fillOpacity: 0.8, strokeColor: '#ffffff', strokeWidth: 0.4, strokeOpacity: 0.6,
        vectorStyleMode: 'graduated', vectorStyleProperty: column, vectorStyleClassCount: CLASS_COUNT,
        vectorStyleColorRamp: RAMP, vectorStyleClassificationScheme: SCHEME,
        vectorStyleStops: graduatedStops(values), vectorStyleExpression: '',
      },
      popup: {
        click: true, hover: false, titleField: 'name', showFeatureId: false,
        fields: [
          { field: 'department', label: 'Department' },
          { field: column, label: `${label}, ${view.year}`, kind: 'number', format: { decimals: 2 } },
          { field: 'geo_id', label: 'geo_id' },
        ],
      },
      descriptiveMetadata: {
        title: pkg.title,
        abstract: `${pkg.description} One feature per unit, a property per variable and year (<variable>_<year>); restyle any of them in the Style panel.`,
        license: pkg.licenses?.[0]?.name || '',
        attribution: [...creators, siteName].join('; '),
        links: [{ href: pageUrl }],
      },
    }],
    selectedLayerId: layerId,
  };
}

// Writes the projects of the flagged indicators into the site; returns their number
export function writeGeolibreProjects({ registry, readJSON, write, siteUrl, siteName }) {
  let n = 0;
  for (const item of registry.filter((i) => i.type === 'indicator' && i.geolibre)) {
    for (const dataset of item.datasets || [item.dataset]) {
      const pkg = readJSON(`data/${dataset}/datapackage.json`);
      const geojson = readJSON(pkg.resources[0]['geo:geojson']);
      write(projectPath(dataset), `${JSON.stringify(geolibreProject({ item, pkg, geojson, siteUrl, siteName }), null, 1)}\n`);
      n += 1;
    }
  }
  return n;
}
