// A translation laid over the English source: the translated fields replace the English ones and
// arrays of objects merge element by element. Plain JavaScript, shared by the app and site/build.mjs.
export const overlay = (base, tr) => {
  if (!tr) return base;
  if (Array.isArray(base)) return base.map((el, i) => (el && typeof el === 'object' ? overlay(el, tr[i]) : (tr[i] ?? el)));
  const out = { ...base };
  for (const [k, v] of Object.entries(tr)) {
    out[k] = v && typeof v === 'object' && base[k] && typeof base[k] === 'object' ? overlay(base[k], v) : v;
  }
  return out;
};
