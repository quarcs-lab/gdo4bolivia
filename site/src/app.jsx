// The observatory's website: React components, the router and the landing page.
// site/build.mjs bundles this file (esbuild) and pre-renders a page for every route.
import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import * as CONTENT from './content.js';
import {
  SITE_URL, REPO_URL, PACKAGE_DOCS_URL, RAW_URL, COLAB_URL, COLAB_EMPTY, SHORT_NAME, CITE_AUTHORS,
  CONTENT_REGISTRY, REDIRECTS, PEOPLE, CONTACTS, CITATION_APA, CITATION_BIB, THREE_PACKAGES_EXAMPLE,
} from './content.js';
import { snippetPath, sharedSnippetPath } from './snippets.js';
import { GEOLIBRE_APP, projectPath } from '../geolibre.mjs';
import { LANGUAGES, detectLanguage, loadLanguage, setLanguage, language, t, localized, fetchMetadataTranslation, translatePackage } from './i18n.js';

// The content in the current language (site/i18n/<lang>/); CONTENT_REGISTRY is the English source
const L = () => localized(CONTENT);
// The current language and the function that changes it (the App holds it; every component re-renders)
const LanguageContext = React.createContext({ lang: 'en', change: () => {} });

// Units per scale in geo/units.csv, injected by site/build.mjs
const UNIT_COUNTS = __UNIT_COUNTS__;
// First and last year of the published data, from the metadata, e.g. [2001, 2024]
const YEAR_SPAN = __YEAR_SPAN__;
// Smaller copies of the pictures under images/, made by site/build.mjs: {src: {widths, width, height, blur}}
const IMAGE_VARIANTS = __IMAGE_VARIANTS__;
const imageStem = (src) => `assets/img/${src.replace(/^images\//, '').replace(/\.webp$/, '')}`;
// The <img> attributes that let the browser pick the copy it needs: src, srcSet, sizes, width and height
const responsive = (src, sizes) => {
  const v = IMAGE_VARIANTS[src];
  if (!v) return { src };
  const srcSet = v.widths.length ? [...v.widths.map((w) => `${imageStem(src)}-${w}.webp ${w}w`), `${src} ${v.width}w`].join(', ') : undefined;
  return { src, srcSet, sizes: srcSet ? sizes : undefined, width: v.width, height: v.height };
};
// The pre-blurred copy of a picture, for the soft header of its page (null when there is none)
const blurredImage = (src) => (IMAGE_VARIANTS[src]?.blur ? `${imageStem(src)}-blur.webp` : null);
// Widths an image is shown at, for the browser to choose a copy (keep DETAIL_SIZES equal to site/build.mjs)
const CARD_SIZES = '(min-width: 1280px) 400px, (min-width: 1024px) 31vw, (min-width: 768px) 46vw, 92vw';
const BAND_SIZES = '100vw';
const DETAIL_SIZES = '(min-width: 1024px) 740px, 92vw';

// ====================================================================
// Icons (inline SVG, Lucide style)
// ====================================================================
const IconWrapper = ({ size = 24, className = '', children, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={className} aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
);
const PackageIcon = (p) => (<IconWrapper {...p}><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></IconWrapper>);
const MapIcon = (p) => (<IconWrapper {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></IconWrapper>);
const Database = (p) => (<IconWrapper {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></IconWrapper>);
const FolderKanban = (p) => (<IconWrapper {...p}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /><path d="M8 10v4" /><path d="M12 10v2" /><path d="M16 10v6" /></IconWrapper>);
const Terminal = (p) => (<IconWrapper {...p}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></IconWrapper>);
const BarChart2 = (p) => (<IconWrapper {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></IconWrapper>);
const Globe = (p) => (<IconWrapper {...p}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></IconWrapper>);
const BookOpen = (p) => (<IconWrapper {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></IconWrapper>);
const Github = (p) => (<IconWrapper {...p}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></IconWrapper>);
const ExternalLink = (p) => (<IconWrapper {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></IconWrapper>);
const Copy = (p) => (<IconWrapper {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></IconWrapper>);
const Check = (p) => (<IconWrapper {...p}><polyline points="20 6 9 17 4 12" /></IconWrapper>);
const Menu = (p) => (<IconWrapper {...p}><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></IconWrapper>);
const X = (p) => (<IconWrapper {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconWrapper>);
const ChevronRight = (p) => (<IconWrapper {...p}><polyline points="9 18 15 12 9 6" /></IconWrapper>);
const ArrowLeft = (p) => (<IconWrapper {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></IconWrapper>);
const ArrowRight = (p) => (<IconWrapper {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></IconWrapper>);
const Layers = (p) => (<IconWrapper {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></IconWrapper>);
const FileText = (p) => (<IconWrapper {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></IconWrapper>);
const Download = (p) => (<IconWrapper {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></IconWrapper>);
const Lightbulb = (p) => (<IconWrapper {...p}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></IconWrapper>);
const Calendar = (p) => (<IconWrapper {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></IconWrapper>);
const MapPin = (p) => (<IconWrapper {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></IconWrapper>);
const Clock = (p) => (<IconWrapper {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></IconWrapper>);
const Play = (p) => (<IconWrapper {...p}><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" /></IconWrapper>);
const Mail = (p) => (<IconWrapper {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></IconWrapper>);
const Users = (p) => (<IconWrapper {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconWrapper>);
const MessageCircle = (p) => (<IconWrapper {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></IconWrapper>);
const Pause = (p) => (<IconWrapper {...p}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></IconWrapper>);
const Plus = (p) => (<IconWrapper {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></IconWrapper>);
const Minus = (p) => (<IconWrapper {...p}><line x1="5" y1="12" x2="19" y2="12" /></IconWrapper>);
const ChevronLeft = (p) => (<IconWrapper {...p}><polyline points="15 18 9 12 15 6" /></IconWrapper>);
const ArrowDown = (p) => (<IconWrapper {...p}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></IconWrapper>);
const Satellite = (p) => (<IconWrapper {...p}><path d="M13 7 9 3 5 7l4 4" /><path d="m17 11 4 4-4 4-4-4" /><path d="m8 12 4 4 6-6-4-4Z" /><path d="m16 8 3-3" /><path d="M9 21a6 6 0 0 0-6-6" /></IconWrapper>);
const Headphones = (p) => (<IconWrapper {...p}><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></IconWrapper>);
const Presentation = (p) => (<IconWrapper {...p}><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" /></IconWrapper>);
const Sparkles = (p) => (<IconWrapper {...p}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></IconWrapper>);
const Bot = (p) => (<IconWrapper {...p}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></IconWrapper>);
const Code = (p) => (<IconWrapper {...p}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></IconWrapper>);
const SearchIcon = (p) => (<IconWrapper {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></IconWrapper>);
const AlertTriangle = (p) => (<IconWrapper {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></IconWrapper>);

// ====================================================================
// Hooks
// ====================================================================
const usePrefersReducedMotion = () => {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia && window.matchMedia(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange));
  }, []);
  return reduced;
};

const useInView = (options = {}) => {
  const { threshold = 0.1, once = true, rootMargin = '0px' } = options;
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        if (once) observer.unobserve(element);
      } else if (!once) {
        setIsInView(false);
      }
    }, { threshold, rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);
  return [ref, isInView];
};

const useActiveSection = (sectionIds, enabled) => {
  const [activeId, setActiveId] = useState('');
  useEffect(() => {
    if (!enabled) { setActiveId(''); return; }
    const observers = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) setActiveId(id);
      }, { threshold: 0.15, rootMargin: '-80px 0px -50% 0px' });
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [enabled]);
  return activeId;
};

const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
    }
  };
  return [copied, copy];
};

// Path router: "<base>/<section>/<id>/" renders a detail view; the base path (with an optional #anchor)
// is the landing page. The <base href> of every pre-rendered page is the site's root, so relative links,
// images and fetches resolve from there. Old "#/<section>/<id>" links are rewritten to paths.
const BASE_PATH = new URL(document.baseURI).pathname;
const ROUTE_EVENT = 'gdo:navigate';
const parseLocation = () => {
  const { pathname, hash } = window.location;
  const rest = pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname.replace(/^\//, '');
  const [section, id] = rest.split('/').filter((p) => p && p !== 'index.html');
  const moved = REDIRECTS[`${section}/${id}`];
  if (moved && /^https?:/.test(moved)) window.location.replace(moved);   // the page left the site
  else if (moved) { window.history.replaceState(null, '', `${BASE_PATH}${moved}/${hash}`); return parseLocation(); }
  if (section && id) return { view: 'detail', section, id: decodeURIComponent(id) };
  if (section) return { view: 'detail', section, id: '' };   // a section alone, e.g. "indicators/"
  return { view: 'home', anchor: hash.replace(/^#/, '') };
};
const navigate = (url, replace = false) => {
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event(ROUTE_EVENT));
};
const legacyHashRoute = () => {
  const h = window.location.hash;
  if (!h.startsWith('#/')) return false;
  const [section, id] = h.slice(2).split('/');
  navigate(BASE_PATH + (section && id ? `${section}/${id}/` : ''), true);
  return true;
};
const useRoute = () => {
  const [route, setRoute] = useState(() => { legacyHashRoute(); return parseLocation(); });
  useEffect(() => {
    const onChange = () => setRoute(parseLocation());
    const onHash = () => { if (!legacyHashRoute()) onChange(); };
    // Links inside the site change the URL without reloading; files, new tabs and modified clicks are left alone
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target || a.hasAttribute('download')) return;
      const url = new URL(a.href, document.baseURI);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE_PATH)) return;
      if (/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith('index.html')) return;
      if (url.pathname === window.location.pathname) return;   // an anchor on this page: the browser scrolls
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    window.addEventListener(ROUTE_EVENT, onChange);
    window.addEventListener('popstate', onChange);
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener(ROUTE_EVENT, onChange);
      window.removeEventListener('popstate', onChange);
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
    };
  }, []);
  return route;
};

// ====================================================================
// Animation wrapper
// ====================================================================
const ReducedMotionContext = React.createContext(false);

// Drift a background image slower than the page. Only on larger screens with a fine pointer (phones keep the
// image still), only under normal motion, and only while the image is within a screen of the viewport
const PARALLAX_QUERY = '(min-width: 768px) and (pointer: fine)';
const useParallax = (factor = 0.08, scale = 1.25) => {
  const reduced = React.useContext(ReducedMotionContext);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const still = () => { el.style.transform = `scale(${scale})`; el.style.willChange = 'auto'; };
    if (reduced || !window.matchMedia || !window.matchMedia(PARALLAX_QUERY).matches) { still(); return undefined; }
    let frame = 0, listening = false;
    const update = () => {
      frame = 0;
      const box = el.parentElement.getBoundingClientRect();
      const offset = (box.top + box.height / 2 - window.innerHeight / 2) * -factor;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(${scale})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const listen = (on) => {
      if (on === listening) return;
      listening = on;
      el.style.willChange = on ? 'transform' : 'auto';
      if (on) { update(); window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); }
      else { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
    };
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(([entry]) => listen(entry.isIntersecting), { rootMargin: '50% 0px' });
      io.observe(el.parentElement);
    } else listen(true);
    update();
    return () => { cancelAnimationFrame(frame); if (io) io.disconnect(); listen(false); };
  }, [reduced, factor, scale]);
  return ref;
};

// Content eases in as it nears the screen: the animation starts a fifth of a screen before it arrives
const AnimateIn = ({ children, delay = 0, className = '' }) => {
  const reduced = React.useContext(ReducedMotionContext);
  const [ref, isInView] = useInView({ threshold: 0, rootMargin: '0px 0px 20% 0px' });
  if (reduced) return <div className={className}>{children}</div>;
  const wait = Math.min(delay, 150);
  return (
    <div ref={ref} className={className} style={{
      opacity: isInView ? 1 : 0,
      transform: isInView ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity 0.35s ease-out ${wait}ms, transform 0.35s ease-out ${wait}ms`,
    }}>
      {children}
    </div>
  );
};


const ENGLISH_BY_ID = Object.fromEntries(CONTENT_REGISTRY.map((i) => [i.id, i]));
const byId = (id) => L().CONTENT_REGISTRY.find((i) => i.id === id);
const byType = (types) => L().CONTENT_REGISTRY.filter((i) => types.includes(i.type))
  .sort((a, b) => (a.pinned !== b.pinned ? b.pinned - a.pinned : new Date(b.date) - new Date(a.date)));
const itemHref = (item) => `${item.section}/${item.id}/`;

// Projects, Insights and Events appear (in the menu too) once they have an item.
// Indicators and tools share one landing section; their pages keep their own paths (indicators/<id>/, tools/<id>/).
const HAS_SECTION = { projects: byType(['project']).length > 0, insights: byType(['insight']).length > 0, events: byType(['event']).length > 0 };
const SECTION_ORDER = ['about', 'indicators', 'projects', 'insights', 'events', 'team', 'community', 'cite', 'contact']
  .filter((id) => HAS_SECTION[id] !== false);
const sectionIndex = (id) => String(SECTION_ORDER.indexOf(id) + 1).padStart(2, '0');

const TYPE_STYLE = {
  indicator: { label: 'Indicator', text: 'text-teal-300', bg: 'bg-teal-400/10', ring: 'border-teal-400/30', glow: 'hover:border-teal-400/40', icon: Database },
  package: { label: 'Python package', text: 'text-sand-300', bg: 'bg-sand-400/10', ring: 'border-sand-400/30', glow: 'hover:border-sand-400/40', icon: PackageIcon },
  notebook: { label: 'Notebook', text: 'text-violet-300', bg: 'bg-violet-400/10', ring: 'border-violet-400/30', glow: 'hover:border-violet-400/40', icon: BookOpen },
  project: { label: 'Project', text: 'text-sky-300', bg: 'bg-sky-400/10', ring: 'border-sky-400/30', glow: 'hover:border-sky-400/40', icon: FolderKanban },
  app: { label: 'Web app', text: 'text-orange-300', bg: 'bg-orange-400/10', ring: 'border-orange-400/30', glow: 'hover:border-orange-400/40', icon: Globe },
  insight: { label: 'Insight', text: 'text-rose-300', bg: 'bg-rose-400/10', ring: 'border-rose-400/30', glow: 'hover:border-rose-400/40', icon: Lightbulb },
  event: { label: 'Event', text: 'text-emerald-300', bg: 'bg-emerald-400/10', ring: 'border-emerald-400/30', glow: 'hover:border-emerald-400/40', icon: Calendar },
};

const LINK_ICON = {
  colab: BookOpen, github: Github, pypi: PackageIcon, docs: FileText, launch: Globe, 'gee-code': Code, external: ExternalLink, paper: FileText,
  slides: Presentation, notebooklm: Sparkles, story: BookOpen, chatbot: Bot,
};


// ====================================================================
// Code highlighting (Python)
// ====================================================================
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LANGS = {
  python: {
    comment: (src, i) => src[i] === '#',
    keywords: ['import', 'from', 'as', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'with', 'try', 'except', 'lambda', 'True', 'False', 'None'],
    builtins: ['print', 'display', 'len', 'int', 'str', 'float', 'list', 'dict', 'range', 'sum', 'min', 'max', 'round', 'sorted'],
  },
};
const highlightCode = (src, lang) => {
  const L = LANGS[lang];
  if (!L) return esc(src);
  const out = [];
  let i = 0;
  while (i < src.length) {
    if (L.comment(src, i)) {
      let end = src.indexOf('\n', i); if (end === -1) end = src.length;
      out.push('<span style="color:#8fb0ad;font-style:italic">' + esc(src.slice(i, end)) + '</span>'); i = end; continue;
    }
    if (src[i] === '"' || src[i] === "'") {
      const q = src[i]; const start = i; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; out.push('<span style="color:#e7c27d">' + esc(src.slice(start, i)) + '</span>'); continue;
    }
    if (/[0-9]/.test(src[i]) && (i === 0 || /[\s(,=\[{+\-*/:<]/.test(src[i - 1]))) {
      const start = i; while (i < src.length && /[0-9._eE]/.test(src[i])) i++;
      out.push('<span style="color:#f6a38f">' + esc(src.slice(start, i)) + '</span>'); continue;
    }
    if (/[a-zA-Z_]/.test(src[i])) {
      const start = i; while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
      const w = src.slice(start, i);
      if (L.keywords.includes(w)) out.push('<span style="color:#ff8597;font-weight:600">' + esc(w) + '</span>');
      else if (L.builtins.includes(w)) out.push('<span style="color:#5ad6c6">' + esc(w) + '</span>');
      else out.push('<span style="color:#e3ecea">' + esc(w) + '</span>');
      continue;
    }
    out.push(esc(src[i])); i++;
  }
  return out.join('');
};

// ====================================================================
// Shared UI pieces
// ====================================================================
// Monospace label with a leading hairline, as in the hero
const Eyebrow = ({ index, children, tone = 'text-brand-turquoise', as = 'p', className = '' }) => {
  const T = as;
  return (
    <T className={`flex items-center gap-3 font-mono text-[11px] sm:text-xs uppercase tracking-[0.25em] ${tone} ${className}`}>
      <span className="h-px w-8 bg-current opacity-60" aria-hidden="true"></span>
      {index && <span>{index} ·</span>}
      <span>{children}</span>
    </T>
  );
};

// Editorial section heading: label, white title with an italic gradient phrase, intro
const SectionHeading = ({ index, eyebrow, title, emphasis, id, children, as = 'h2' }) => {
  const H = as;
  return (
    <div className="max-w-3xl relative z-10">
      {eyebrow && <Eyebrow index={index} className="mb-5">{eyebrow}</Eyebrow>}
      <H id={id} className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] text-white">
        {title}{emphasis && <> <em className="gradient-text pr-2">{emphasis}</em></>}
      </H>
      {children && <p className="mt-5 text-lg text-salt-300 leading-relaxed">{children}</p>}
    </div>
  );
};

// Sentinel-2 cloudless crops of Bolivia (EOX) behind the main section headers and the footer: the 2016 mosaic
// (CC BY 4.0), except Laguna Verde from the 2024 mosaic (CC BY-NC-SA 4.0), where 2016 has cloud over the lagoon
const SECTION_BANDS = {
  about: { image: 'images/bands/laguna-verde-licancabur.webp', place: 'Laguna Verde · Licancabur', lat: -22.8, lng: -67.87, year: 2024 },
  indicators: { image: 'images/bands/lake-titicaca.webp', place: 'Lake Titicaca', lat: -16.05, lng: -69.05 },
  projects: { image: 'images/bands/la-paz-el-alto.webp', place: 'La Paz · El Alto', lat: -16.51, lng: -68.15 },
  insights: { image: 'images/bands/santa-cruz-de-la-sierra.webp', place: 'Santa Cruz de la Sierra', lat: -17.78, lng: -63.18 },
  events: { image: 'images/bands/cochabamba-valley.webp', place: 'Cochabamba valley', lat: -17.42, lng: -66.15 },
  footer: { image: 'images/bands/rio-mamore-trinidad.webp', place: 'Río Mamoré near Trinidad', lat: -14.83, lng: -64.92 },
};

const BandCaption = ({ band, className = '' }) => (
  <p className={`font-mono text-[11px] uppercase tracking-[0.2em] text-salt-300 ${className}`}>
    <span className="block text-xs sm:text-sm tracking-[0.15em] text-white whitespace-pre">{formatCoord(band.lat, band.lng)}</span>
    <span className="block mt-1 text-brand-turquoise">{t(band.place)}</span>
    <span className="block mt-1 text-salt-400">Sentinel-2 cloudless {band.year || 2016}</span>
  </p>
);

const SatelliteHeader = ({ band, children }) => {
  const imgRef = useParallax();
  return (
    <div className="relative overflow-hidden min-h-[440px] md:min-h-[540px] flex items-end">
      <div className="absolute inset-0" aria-hidden="true">
        <img ref={imgRef} {...responsive(band.image, BAND_SIZES)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover scale-125 saturate-[1.2] brightness-110" />
        <div className="absolute inset-0 bg-lagoon-950/50 md:bg-lagoon-950/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-lagoon-950/95 via-lagoon-950/55 via-35% to-transparent to-65%"></div>
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-lagoon-950/90 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-lagoon-950 via-lagoon-950/60 to-transparent"></div>
      </div>
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <AnimateIn className="min-w-0">{children}</AnimateIn>
        <BandCaption band={band} className="md:text-right flex-shrink-0" />
      </div>
    </div>
  );
};

const CopyButton = ({ text, label }) => {
  const [copied, copy] = useCopy();
  const name = label || t('Copy');
  return (
    <button type="button" onClick={() => copy(text)}
            className="text-salt-400 hover:text-white transition-colors flex items-center gap-1 text-xs uppercase font-bold tracking-wider"
            aria-label={copied ? t('Copied to clipboard') : t('{label} to clipboard', { label: name })}>
      {copied ? <Check size={14} className="text-brand-turquoise" /> : <Copy size={14} />}
      <span aria-live="polite">{copied ? t('Copied') : name}</span>
    </button>
  );
};

// Opens the box's own notebook in Colab (notebooks/snippets/, written by site/build.mjs from
// site/src/snippets.js), or a blank notebook for a box without one; styled like CopyButton
const ColabButton = ({ notebook }) => (
  <a href={notebook ? COLAB_URL + notebook : COLAB_EMPTY} target="_blank" rel="noopener noreferrer"
     className="text-salt-400 hover:text-white transition-colors flex items-center gap-1 text-xs uppercase font-bold tracking-wider">
    <img src="https://colab.research.google.com/img/colab_favicon_256px.png" alt="" width="14" height="14" />
    <span>{t('Open in Colab')}<span className="sr-only">{notebook ? t(': a notebook with this code (opens in a new tab)') : t(': a blank notebook (opens in a new tab)')}</span></span>
  </a>
);

// colab: the box's notebook path inside notebooks/ (snippetPath), or true for a blank notebook
const CodeBlock = ({ code, language = 'python', title, colab = false }) => {
  const highlighted = useMemo(() => highlightCode(code, language), [code, language]);
  return (
    <div className="rounded-xl overflow-hidden bg-lagoon-900/80 shadow-2xl border border-white/10">
      <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5" aria-hidden="true">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="ml-3 text-xs text-salt-400 font-mono truncate">{title}</span>
        </div>
        <CopyButton text={code} />
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-xs sm:text-sm font-mono text-salt-300 leading-relaxed"><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
      </div>
      {colab && (
        <div className="flex justify-end px-4 py-2 bg-white/5 border-t border-white/10">
          <ColabButton notebook={typeof colab === 'string' ? colab : null} />
        </div>
      )}
    </div>
  );
};

// Every dataset can be loaded with the package or straight from its URL; both run in Google Colab
const CODE_TABS = [['python', 'Python · package'], ['pandas', 'Python · URL'], ['gpkg', 'Python · GeoPackage'], ['geolibre', 'Python · GeoLibre']];
const CODE_LANG = { pandas: 'python', gpkg: 'python', geolibre: 'python' };
const CODE_TITLE = { python: 'Colab · with geo4bolivia', pandas: 'Colab · without the package', gpkg: 'Colab · the wide GeoPackage', geolibre: 'Colab · GeoLibre' };

const CodeTabs = ({ code, idPrefix, itemId, slot = '' }) => {
  const tabs = CODE_TABS.filter(([k]) => code[k]);
  const [active, setActive] = useState(tabs[0][0]);
  // ARIA tabs pattern: arrow keys (and Home/End) move between tabs; only the active tab is in the tab order
  const onKeyDown = (e) => {
    const i = tabs.findIndex(([k]) => k === active);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const k = tabs[(next + tabs.length) % tabs.length][0];
    setActive(k);
    document.getElementById(`${idPrefix}-tab-${k}`)?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={t('Code language')} className="flex gap-2 mb-3" onKeyDown={onKeyDown}>
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" id={`${idPrefix}-tab-${k}`} aria-selected={active === k} aria-controls={`${idPrefix}-panel-${k}`}
                  tabIndex={active === k ? 0 : -1} onClick={() => setActive(k)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${active === k ? 'bg-brand-rose text-white' : 'bg-transparent text-salt-300 border border-white/15 hover:text-white hover:border-white/30'}`}>
            {t(label)}
          </button>
        ))}
      </div>
      {tabs.map(([k]) => (
        <div key={k} role="tabpanel" id={`${idPrefix}-panel-${k}`} aria-labelledby={`${idPrefix}-tab-${k}`} hidden={active !== k}>
          <CodeBlock code={code[k]} language={CODE_LANG[k] || k} title={t(CODE_TITLE[k] || 'example')} colab={itemId ? snippetPath(itemId, slot + k) : true} />
        </div>
      ))}
    </div>
  );
};

const TypeBadge = ({ item, solid = false }) => {
  const s = TYPE_STYLE[item.type];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${solid ? 'bg-lagoon-950/90 border border-white/10' : s.bg} ${s.text}`}>
      <Icon size={12} /> {item.subtype || t(s.label)}
    </span>
  );
};

const Tag = ({ children, type }) => {
  const s = TYPE_STYLE[type] || TYPE_STYLE.indicator;
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.ring} ${s.text} bg-transparent`}>{children}</span>;
};

const LinkButton = ({ link, primary = false }) => {
  const Icon = LINK_ICON[link.kind] || ExternalLink;
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer"
       className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 ${primary
         ? 'bg-brand-rose hover:bg-brand-roseHover text-white shadow-lg shadow-rose-950/30'
         : 'bg-white/5 hover:bg-white/10 border border-white/15 text-salt-100'}`}>
      <Icon size={16} /> <span>{link.label}{link.native && <span lang={link.lang}>{link.native}</span>}{link.after}</span>
      <span className="sr-only">{t('(opens in a new tab)')}</span>
    </a>
  );
};

// Click-to-load YouTube embed: no third-party iframe until the user asks for it.
const LiteYouTube = ({ id, label, lang }) => {
  const [active, setActive] = useState(false);
  return (
    <figure className="rounded-xl overflow-hidden border border-white/10 bg-black">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        {active ? (
          <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                  title={label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        ) : (
          <button type="button" onClick={() => setActive(true)} className="absolute inset-0 w-full h-full group" aria-label={t('Play video: {label}', { label })}>
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full bg-brand-rose/90 group-hover:bg-brand-rose flex items-center justify-center shadow-xl text-white transition-transform group-hover:scale-110">
                <Play size={26} />
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption lang={lang} className="px-4 py-3 text-sm text-salt-300 bg-lagoon-900">{label}</figcaption>
    </figure>
  );
};

const AudioPlayer = ({ src, label }) => (
  <figure className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
    <figcaption className="flex items-center gap-2 text-sm font-semibold text-salt-200 mb-3"><Headphones size={18} className="text-brand-turquoise" /> {label}</figcaption>
    <audio controls preload="none" src={src} className="w-full">{t('Your browser does not support the audio element.')} <a href={src}>{t('Download the audio')}</a>.</audio>
  </figure>
);

// ====================================================================
// Search: every item and every dataset variable (assets/search.json, written by site/build.mjs)
// ====================================================================
// One index per language: assets/search.json (English) and assets/search.<lang>.json
const searchIndex = {};
const loadSearchIndex = (lang) => searchIndex[lang] || (searchIndex[lang] = fetch(`assets/search${lang === 'en' ? '' : `.${lang}`}.json`).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}).catch((err) => { delete searchIndex[lang]; throw err; }));
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Every word must match somewhere; titles weigh most, then tags, variables and the text
const searchItems = (index, query) => {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return index.map((item) => {
    const title = fold(item.title);
    const tags = item.tags.map(fold);
    const body = fold(`${item.summary} ${item.text} ${item.subtype}`);
    const vars = item.variables.map((v) => ({ ...v, hay: fold(`${v.name} ${v.title}`) }));
    let score = 0;
    for (const t of terms) {
      const hits = [title.includes(t) && 10, tags.some((g) => g.includes(t)) && 5, vars.some((v) => v.hay.includes(t)) && 3, body.includes(t) && 2].filter(Boolean);
      if (!hits.length) return null;
      score += hits.reduce((a, b) => a + b, 0);
    }
    return { item, score, vars: vars.filter((v) => terms.every((t) => v.hay.includes(t))).slice(0, 3) };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 12);
};

const SearchDialog = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const closeRef = useRef(null);
  const { lang } = useContext(LanguageContext);
  useEffect(() => {
    if (!open) return undefined;
    setFailed(false);
    loadSearchIndex(lang).then(setIndex).catch(() => setFailed(true));
    const previous = document.activeElement;
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (previous && previous.focus) previous.focus();
    };
  }, [open, lang]);
  const results = useMemo(() => (index ? searchItems(index, query) : []), [index, query]);
  useEffect(() => setActive(0), [query]);
  if (!open) return null;

  const go = (r) => { onClose(); navigate(BASE_PATH + r.item.href); };
  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
  };
  // Keep the focus inside the dialog
  const onDialogKey = (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    (document.activeElement === inputRef.current ? closeRef : inputRef).current.focus();
  };
  const status = failed ? t('The search index could not be loaded.')
    : !index ? t('Loading…')
    : !query.trim() ? t('Try “poverty”, “night-time lights”, “malnutrition”, “GWR” or a variable name.')
    : results.length === 0 ? t('No results') : results.length === 1 ? t('1 result') : t('{n} results', { n: results.length });
  return (
    <div className="fixed inset-0 z-[90] bg-lagoon-950/80 backdrop-blur-sm flex items-start justify-center px-4 pt-[8vh]"
         onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={t('Search the observatory')} onKeyDown={onDialogKey}
           className="w-full max-w-2xl rounded-2xl bg-lagoon-900 border border-white/15 shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-white/10">
          <SearchIcon size={18} className="text-salt-400 flex-shrink-0" />
          <input ref={inputRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onInputKey}
                 placeholder={t('Search indicators, variables, tools and papers')} aria-label={t('Search the observatory')}
                 role="combobox" aria-expanded={results.length > 0} aria-controls="search-results" aria-autocomplete="list"
                 aria-activedescendant={results[active] ? `search-result-${active}` : undefined}
                 className="flex-1 min-w-0 bg-transparent py-4 text-base text-white placeholder:text-salt-400 focus:outline-none" />
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('Close search')} className="p-1.5 rounded-md text-salt-300 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <ul id="search-results" role="listbox" aria-label={t('Search results')} className="max-h-[60vh] overflow-y-auto p-2 empty:hidden">
          {results.map((r, i) => {
            const s = TYPE_STYLE[r.item.type]; const Icon = s.icon;
            return (
              <li key={r.item.href} id={`search-result-${i}`} role="option" aria-selected={i === active}>
                <a href={r.item.href} tabIndex={-1} onClick={(e) => { e.preventDefault(); go(r); }} onMouseEnter={() => setActive(i)}
                   className={`flex gap-3 rounded-lg p-3 ${i === active ? 'bg-white/10' : ''}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg} ${s.text}`}><Icon size={16} /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{r.item.title}</span>
                    <span className="block text-xs text-salt-400 truncate">{r.item.subtype || t(s.label)} · {r.item.summary}</span>
                    {r.vars.length > 0 && <span className="block text-xs text-brand-turquoise mt-1 truncate">{r.vars.map((v) => `${v.name}: ${v.title}`).join(' · ')}</span>}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="px-4 py-3 text-xs text-salt-400 border-t border-white/10" aria-live="polite">{status}</p>
      </div>
    </div>
  );
};

// ====================================================================
// Navigation
// ====================================================================
const NAV_LINKS = [
  { name: 'About', id: 'about' },
  { name: 'Indicators & tools', id: 'indicators' },
  { name: 'Projects', id: 'projects' },
  { name: 'Insights', id: 'insights' },
  { name: 'Events', id: 'events' },
  { name: 'Team', id: 'team' },
  { name: 'Cite', id: 'cite' },
].filter((l) => HAS_SECTION[l.id] !== false);

const Wordmark = ({ size = 'md' }) => (
  <a href="#top" className="flex items-center gap-3 group">
    <img src="images/logo/emblem-dark-192.png" alt="" width="40" height="40"
         className={`${size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'} transition-transform duration-500 group-hover:rotate-12`} />
    {/* The accessible name starts with the visible text (WCAG 2.5.3) */}
    <span className="leading-tight">
      <span className={`block font-bold tracking-tight text-white ${size === 'lg' ? 'text-lg' : 'text-[15px]'}`}>{t('GeoDevelopment Observatory')}</span>{' '}
      <span className={`block font-semibold text-[#ff8597] ${size === 'lg' ? 'text-base' : 'text-[13px]'}`}>{t('of Bolivia')}</span>
      <span className="sr-only">{t(', home')}</span>
    </span>
  </a>
);

// EN | ES: the visitor's choice is remembered; each label is announced in its own language
const LanguageSwitch = () => {
  const { lang, change } = useContext(LanguageContext);
  return (
    <div role="group" aria-label={t('Language')} className="flex items-center rounded-full bg-white/5 border border-white/15 p-0.5">
      {Object.entries(LANGUAGES).map(([code, l]) => (
        <button key={code} type="button" lang={code} onClick={() => change(code)} aria-pressed={lang === code} title={l.label}
                className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold tracking-wider transition-colors ${lang === code ? 'bg-brand-turquoise text-lagoon-950' : 'text-salt-300 hover:text-white'}`}>
          <span aria-hidden="true">{l.short}</span><span className="sr-only">{l.label}</span>
        </button>
      ))}
    </div>
  );
};

const Navigation = ({ isHome }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // "/" or Ctrl/Cmd+K opens the search, unless the user is typing
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); setSearching(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const openSearch = () => { setIsOpen(false); setSearching(true); };
  const activeSection = useActiveSection(NAV_LINKS.map((l) => l.id), isHome);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const close = () => setIsOpen(false);
    window.addEventListener('hashchange', close);
    window.addEventListener(ROUTE_EVENT, close);
    return () => { window.removeEventListener('hashchange', close); window.removeEventListener(ROUTE_EVENT, close); };
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const solid = scrolled || isOpen;
  return (
    <header>
      <nav aria-label={t('Main')} className={`fixed w-full z-50 transition-all duration-300 ${solid ? 'bg-lagoon-950/90 backdrop-blur-md shadow-lg shadow-black/40 border-b border-white/5 py-2' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <Wordmark />
            <ul className="hidden lg:flex items-center gap-4 xl:gap-7">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} aria-current={activeSection === link.id ? 'true' : undefined}
                     className={`nav-link-underline text-sm font-medium transition-colors ${activeSection === link.id ? 'text-brand-turquoise active' : 'text-salt-300 hover:text-white'}`}>
                    {t(link.name)}
                  </a>
                </li>
              ))}
            </ul>
            <div className="hidden lg:flex items-center gap-2">
              <LanguageSwitch />
              <button type="button" onClick={openSearch} aria-keyshortcuts="/ Control+K Meta+K"
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-salt-300 bg-white/5 border border-white/15 hover:text-white hover:border-brand-turquoise/50 transition-all">
                <SearchIcon size={16} /> <span className="sr-only xl:not-sr-only">{t('Search')}</span> <kbd className="font-mono text-[11px] text-salt-400 border border-white/15 rounded px-1.5" aria-hidden="true">/</kbd>
              </button>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer"
                 className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/10 border border-white/15 hover:bg-white/15 hover:border-brand-turquoise/50 transition-all">
                <Github size={16} /> GitHub<span className="sr-only"> {t('repository (opens in a new tab)')}</span>
              </a>
            </div>
            <div className="lg:hidden ml-auto mr-1"><LanguageSwitch /></div>
            <button type="button" onClick={openSearch} className="lg:hidden p-2 rounded-md text-white" aria-label={t('Search')}>
              <SearchIcon size={22} />
            </button>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-2 rounded-md text-white"
                    aria-label={isOpen ? t('Close menu') : t('Open menu')} aria-expanded={isOpen} aria-controls="mobile-menu">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {(
          <div id="mobile-menu" hidden={!isOpen} className="lg:hidden bg-lagoon-900 shadow-xl absolute w-full top-full left-0 border-t border-white/10">
            <ul className="px-3 pt-2 pb-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} onClick={() => setIsOpen(false)}
                     className="block px-3 py-2.5 rounded-md text-base font-medium text-salt-200 hover:text-white hover:bg-lagoon-800">{t(link.name)}</a>
                </li>
              ))}
              <li>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium text-salt-200 hover:text-white hover:bg-lagoon-800">
                  <Github size={18} /> {t('GitHub repository')}<span className="sr-only"> {t('(opens in a new tab)')}</span>
                </a>
              </li>
            </ul>
          </div>
        )}
      </nav>
      <SearchDialog open={searching} onClose={() => setSearching(false)} />
    </header>
  );
};

// ====================================================================
// Landing page sections
// ====================================================================
// Satellite globe (globe.gl), loaded on demand so it never blocks first paint
// Sentinel-2 cloudless 2016 (EOX, CC BY 4.0) patches draped over the globe, made by scripts/site_images.py:
// Bolivia from level-7 tiles (~600 m/px), each city from a 9 x 7 block of level-11 tiles (~38 m/px) and its
// centre from a 7 x 5 block of level-13 tiles (~10 m/px). The patches float just above the ground (in globe radii),
// stacked from coarse to fine, low enough that the close-up camera never passes through them.
const BOLIVIA_PATCH = { url: 'images/hero-bolivia-s2.webp', lat: -16.171875, lng: -63.28125, width: 14.0625, height: 15.46875, altitude: 0.00004, curvature: 0.25 };
const cityPatch = (id, lat, lng) => ({ url: `images/hero-city-${id}.webp`, lat, lng, width: 0.791016, height: 0.615234, altitude: 0.00008, curvature: 0.05 });
const cityDetailPatch = (id, lat, lng) => ({ url: `images/hero-city-${id}-z13.webp`, lat, lng, width: 0.153809, height: 0.109863, altitude: 0.00012, curvature: 0.01 });
// The nine department capitals by 2020 population; their imagery loads only when a city is hovered or picked
const HERO_CITIES = [
  { id: 'santa-cruz', name: 'Santa Cruz', lat: -17.7833, lng: -63.1821, patch: cityPatch('santa-cruz', -17.797852, -63.149414), detail: cityDetailPatch('santa-cruz', -17.786865, -63.182373) },
  { id: 'la-paz', name: 'La Paz', lat: -16.4955, lng: -68.1336, patch: cityPatch('la-paz', -16.479492, -68.15918), detail: cityDetailPatch('la-paz', -16.490479, -68.126221) },
  { id: 'cochabamba', name: 'Cochabamba', lat: -17.3895, lng: -66.1568, patch: cityPatch('cochabamba', -17.358398, -66.137695), detail: cityDetailPatch('cochabamba', -17.391357, -66.148682) },
  { id: 'oruro', name: 'Oruro', lat: -17.9667, lng: -67.1125, patch: cityPatch('oruro', -17.973633, -67.104492), detail: cityDetailPatch('oruro', -17.962646, -67.115479) },
  { id: 'sucre', name: 'Sucre', lat: -19.0476, lng: -65.2596, patch: cityPatch('sucre', -19.02832, -65.258789), detail: cityDetailPatch('sucre', -19.039307, -65.269775) },
  { id: 'tarija', name: 'Tarija', lat: -21.5345, lng: -64.7296, patch: cityPatch('tarija', -21.577148, -64.731445), detail: cityDetailPatch('tarija', -21.544189, -64.720459) },
  { id: 'potosi', name: 'Potosí', lat: -19.5891, lng: -65.7535, patch: cityPatch('potosi', -19.555664, -65.786133), detail: cityDetailPatch('potosi', -19.588623, -65.753174) },
  { id: 'trinidad', name: 'Trinidad', lat: -14.8337, lng: -64.904, patch: cityPatch('trinidad', -14.80957, -64.907227), detail: cityDetailPatch('trinidad', -14.842529, -64.89624) },
  { id: 'cobija', name: 'Cobija', lat: -11.0275, lng: -68.768, patch: cityPatch('cobija', -11.030273, -68.774414), detail: cityDetailPatch('cobija', -11.019287, -68.763428) },
];
const INTRO_CITY = HERO_CITIES.find((c) => c.id === 'la-paz');   // the intro flies to the seat of government
const HERO_THEMES = ['Measure regional development', 'Explore with open tools', 'Turn evidence into insight'];
// Altitudes in globe radii; city views sit low enough to match the ~10 m/px close-ups (0.0013 shows ~8 km of ground)
const GLOBE_ALT = { intro: 2.6, overview: 0.9, city: 0.0013, min: 0.0008, max: 2.6, detail: 0.08 };

// globe.gl (with three.js) is a separate chunk, fetched only when the globe is shown
const loadGlobe = () => import('globe.gl').then((m) => m.default);

const hasWebGL = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
};
const isSmallScreen = () => window.matchMedia('(max-width: 767px)').matches;
const formatCoord = (lat, lng) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
const nearestCity = (lat, lng) => {
  let best = null, bestDist = 0.45;
  HERO_CITIES.forEach((c) => { const d = Math.hypot(c.lat - lat, c.lng - lng); if (d < bestDist) { best = c; bestDist = d; } });
  return best;
};

// Image patches and street-level detail, tracked per globe instance
const globeLayers = new WeakMap();

// Drape a sharp image patch over the base globe, reusing globe.gl's bundled three.js classes
const addGlobePatch = (world, patch) => {
  const layers = globeLayers.get(world);
  const base = world.globeMaterial();
  if (!layers || !base || !base.map || layers.requested.has(patch.url)) return;
  layers.requested.add(patch.url);
  const img = new Image();
  img.onload = () => {
    if (globeLayers.get(world) !== layers) return;
    const texture = new base.map.constructor(img);
    texture.colorSpace = base.map.colorSpace;
    texture.anisotropy = world.renderer().capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
    layers.patches.push({ ...patch, material: new base.constructor({ map: texture, transparent: true }) });
    world.tilesData([...layers.patches]);
  };
  img.onerror = () => layers.requested.delete(patch.url);
  img.src = patch.url;
};

// Close to the ground, the outline and city markers would cover the imagery
const setGlobeDetail = (world, detail) => {
  const layers = globeLayers.get(world);
  if (!layers || layers.detail === detail) return;
  layers.detail = detail;
  world.polygonsData(detail ? [] : layers.outline).pointsData(detail ? [] : HERO_CITIES);
};

const useSatelliteGlobe = (containerRef, enabled, handlers) => {
  const worldRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    if (!enabled) return undefined;
    const el = containerRef.current;
    let world = null, ro = null, io = null, moveTimer = 0, cancelled = false;
    const reportMove = () => {
      moveTimer = 0;
      const { lat, lng } = world.pointOfView();
      handlersRef.current.onMove(lat, lng);
    };
    Promise.all([loadGlobe(), fetch('assets/data/country.geojson').then((r) => r.json())])
      .then(([Globe, outline]) => {
        if (cancelled || !el || typeof Globe !== 'function') throw new Error('Globe unavailable');
        world = new Globe(el, { animateIn: false, rendererConfig: { logarithmicDepthBuffer: true } })
          .width(el.clientWidth).height(el.clientHeight)
          .backgroundColor('rgba(0,0,0,0)')
          .globeImageUrl('images/hero-globe-day.webp')
          .showAtmosphere(true).atmosphereColor('#5ad6c6').atmosphereAltitude(0.18)
          .polygonsData(outline.features)
          .polygonSideColor(() => 'rgba(255, 133, 151, 0.35)')
          .polygonStrokeColor(() => '#ff8597')
          .polygonAltitude(0.0012)
          .pointsData(HERO_CITIES).pointLat('lat').pointLng('lng')
          .pointColor(() => '#ffffff').pointAltitude(0.0015).pointRadius(0.045)
          .tileLat('lat').tileLng('lng').tileWidth('width').tileHeight('height')
          .tileAltitude('altitude').tileCurvatureResolution('curvature').tileMaterial('material')
          .ringsData(HERO_CITIES).ringLat('lat').ringLng('lng')
          .ringColor(() => (t) => `rgba(90, 214, 198, ${1 - t})`)
          .ringMaxRadius(0.9).ringPropagationSpeed(0.6).ringRepeatPeriod(1800)
          .pointOfView({ lat: -16, lng: -20, altitude: GLOBE_ALT.intro })
          .onGlobeReady(() => { if (cancelled) return; addGlobePatch(world, BOLIVIA_PATCH); handlersRef.current.onReady(); });
        globeLayers.set(world, { patches: [], requested: new Set(), outline: outline.features, detail: false });
        // An invisible cap that doesn't hide the Bolivia patch underneath
        const capMaterial = new (world.globeMaterial().constructor)({ transparent: true, opacity: 0, depthWrite: false });
        world.polygonCapMaterial(() => capMaterial);
        world.camera().near = 0.005; // the close-ups put the camera ~0.1 globe units above the ground
        world.camera().updateProjectionMatrix();
        world.lights().forEach((light) => { light.intensity *= light.isDirectionalLight ? 1.6 : 1.15; });
        const controls = world.controls();
        controls.enableZoom = false; // the mouse wheel keeps scrolling the page
        controls.enablePan = false;
        controls.autoRotateSpeed = 0.12;
        if (isSmallScreen()) controls.enabled = false; // touch keeps scrolling the page
        controls.addEventListener('start', () => handlersRef.current.onInteract());
        controls.addEventListener('change', () => { if (!moveTimer) moveTimer = setTimeout(reportMove, 150); });
        ro = new ResizeObserver(() => world.width(el.clientWidth).height(el.clientHeight));
        ro.observe(el);
        // Draw only while the globe is on screen: scrolled past, it stops rendering and picks up where it was
        if ('IntersectionObserver' in window) {
          let visible = true;
          io = new IntersectionObserver(([entry]) => {
            if (cancelled || entry.isIntersecting === visible) return;
            visible = entry.isIntersecting;
            if (visible) world.resumeAnimation(); else world.pauseAnimation();
          });
          io.observe(el);
        }
        worldRef.current = world;
      })
      .catch(() => { if (!cancelled) handlersRef.current.onError(); });
    return () => {
      cancelled = true;
      clearTimeout(moveTimer);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      if (world) { globeLayers.delete(world); world.pauseAnimation(); if (world._destructor) world._destructor(); }
      worldRef.current = null;
      if (el) el.innerHTML = '';
    };
  }, [enabled]);
  return worldRef;
};

const HeroIconButton = ({ label, onClick, children }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/15 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
    {children}
  </button>
);

const Hero = () => {
  const reduced = React.useContext(ReducedMotionContext);
  const canGlobe = useMemo(() => !reduced && hasWebGL(), [reduced]);
  // Phones get the still image first and load the globe (~1.7 MB, heavy on the CPU) only when a control is tapped
  const onDemand = useMemo(() => isSmallScreen(), []);
  const [wantGlobe, setWantGlobe] = useState(!onDemand);
  const [failed, setFailed] = useState(false);
  const pending = useRef(null); // the control tapped before the globe was ready
  const globeEnabled = canGlobe && wantGlobe;
  const containerRef = useRef(null);
  const userTookOver = useRef(false);
  const target = useRef(null); // camera destination, so zooming mid-flight keeps the course
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeId, setActiveId] = useState(INTRO_CITY.id);
  const [motionPaused, setMotionPaused] = useState(false);   // the user paused: stop the orbit, rings and marquee
  const [announcement, setAnnouncement] = useState('');      // read out only when the user picks a city
  const [view, setView] = useState({ lat: INTRO_CITY.lat, lng: INTRO_CITY.lng });

  const worldRef = useSatelliteGlobe(containerRef, globeEnabled, {
    onReady: () => setReady(true),
    onError: () => { setReady(false); setFailed(true); },
    onMove: (lat, lng) => setView({ lat, lng }),
    onInteract: () => { userTookOver.current = true; target.current = null; setPlaying(false); setActiveId(null); },
  });

  // Intro: fly in from space to La Paz, then start a slow orbit on larger screens
  useEffect(() => {
    if (!ready || !worldRef.current) return undefined;
    const pp = INTRO_CITY;
    target.current = { lat: pp.lat, lng: pp.lng, altitude: GLOBE_ALT.overview };
    worldRef.current.pointOfView(target.current, 3500);
    if (pending.current) { const action = pending.current; pending.current = null; action(); return undefined; }
    if (isSmallScreen()) return undefined;
    const timer = setTimeout(() => { if (!userTookOver.current) { setPlaying(true); setActiveId(null); } }, 5000);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (playing) target.current = null;
    if (worldRef.current) worldRef.current.controls().autoRotate = playing;
  }, [playing, ready]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.ringsData(motionPaused ? [] : HERO_CITIES);
  }, [motionPaused, ready]);

  const preloadCity = (city) => { if (worldRef.current) { addGlobePatch(worldRef.current, city.patch); addGlobePatch(worldRef.current, city.detail); } };
  const flyTo = (city) => {
    const world = worldRef.current;
    if (!world) return;
    userTookOver.current = true;
    setPlaying(false);
    setActiveId(city.id);
    setAnnouncement(t('Flying to {name}', { name: city.name }));
    setView({ lat: city.lat, lng: city.lng });
    addGlobePatch(world, city.patch);
    addGlobePatch(world, city.detail);
    setGlobeDetail(world, true);
    target.current = { lat: city.lat, lng: city.lng, altitude: GLOBE_ALT.city };
    world.pointOfView(target.current, 2600);
  };
  const cycle = (step) => {
    const index = HERO_CITIES.findIndex((c) => c.id === activeId);
    const next = index < 0 ? 0 : (index + step + HERO_CITIES.length) % HERO_CITIES.length;
    flyTo(HERO_CITIES[next]);
  };
  const zoom = (factor) => {
    if (!worldRef.current) return;
    const { lat, lng, altitude } = target.current || worldRef.current.pointOfView();
    target.current = { lat, lng, altitude: Math.min(GLOBE_ALT.max, Math.max(GLOBE_ALT.min, altitude * factor)) };
    setGlobeDetail(worldRef.current, target.current.altitude < GLOBE_ALT.detail);
    worldRef.current.pointOfView(target.current, 800);
  };
  const togglePlay = () => {
    const world = worldRef.current;
    userTookOver.current = true;
    // Orbiting from street level would race across the ground, so pull back out first
    if (!playing && world && world.pointOfView().altitude < GLOBE_ALT.overview / 2) {
      const { lat, lng } = world.pointOfView();
      setGlobeDetail(world, false);
      world.pointOfView({ lat, lng, altitude: GLOBE_ALT.overview }, 1500);
    }
    if (!playing) { target.current = null; setActiveId(null); }
    setMotionPaused(playing);
    setPlaying((p) => !p);
  };
  // Run a control's action now, or load the globe first and run it once the globe is ready
  const withGlobe = (action) => () => {
    if (ready && worldRef.current) { action(); return; }
    pending.current = action;
    if (!wantGlobe) { setWantGlobe(true); setAnnouncement(t('Loading the satellite globe')); }
  };
  const onGlobeKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); cycle(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); cycle(-1); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(0.5); }
    else if (e.key === '-') { e.preventDefault(); zoom(2); }
  };

  const place = nearestCity(view.lat, view.lng);
  return (
    <div id="top" className="relative min-h-[100svh] flex flex-col overflow-hidden bg-lagoon-950">
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img src="images/hero-day.webp" alt="" fetchpriority="high"
             className={`w-full h-full object-cover transition-opacity duration-[1200ms] ${ready ? 'opacity-0' : 'opacity-100'}`} />
      </div>
      {globeEnabled && (
        <div ref={containerRef} tabIndex={ready ? 0 : -1} role="group" onKeyDown={onGlobeKeyDown}
             aria-hidden={!ready} aria-label={t("Interactive satellite globe centered on Bolivia. Use the left and right arrow keys to fly between cities, and plus or minus to zoom.")}
             className={`hero-globe absolute inset-0 z-[1] lg:left-[24%] lg:-right-[6%] transition-opacity duration-[1500ms] ${ready ? 'opacity-100' : 'opacity-0'}`}></div>
      )}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-lagoon-950/60 lg:bg-transparent lg:bg-gradient-to-r lg:from-lagoon-950/95 lg:via-lagoon-950/50 lg:via-35% lg:to-transparent lg:to-60%" aria-hidden="true"></div>
      <div className="absolute inset-x-0 top-0 h-32 z-[2] pointer-events-none bg-gradient-to-b from-lagoon-950/80 to-transparent" aria-hidden="true"></div>
      <div className="absolute inset-x-0 bottom-0 h-48 z-[2] pointer-events-none bg-gradient-to-t from-lagoon-950 to-transparent" aria-hidden="true"></div>

      <div className="relative z-10 flex-1 flex items-center pointer-events-none">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-10">
          <div className={`max-w-3xl pointer-events-auto text-white ${reduced ? '' : 'animate-fade-in-up'}`}>
            <p className="flex items-center gap-3 mb-6 font-mono text-[11px] sm:text-xs uppercase tracking-[0.25em] text-brand-turquoise">
              <span className="h-px w-8 bg-brand-turquoise/60" aria-hidden="true"></span>{L().SITE_NAME} · {SHORT_NAME}
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter leading-[1.02] mb-6">
              {language() === 'es'
                ? <>Observando el<br className="hidden sm:block" /> desarrollo de <span className="text-[#ff8597]">Bolivia</span><br className="hidden sm:block" /> <em className="gradient-text pr-2">desde el espacio.</em></>
                : <>Observing <span className="text-[#ff8597]">Bolivia's</span><br className="hidden sm:block" /> development<br className="hidden sm:block" /> <em className="gradient-text pr-2">from space.</em></>}
            </h1>
            <p className="text-lg md:text-xl text-salt-200 font-light leading-relaxed max-w-xl mb-10 [text-shadow:0_1px_12px_rgba(7,20,23,0.9)]">
              {t("Public-access indicators, AI-enhanced tools, research projects and insights for monitoring sustainable regional development across Bolivia.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#indicators" className="px-6 sm:px-8 py-3 rounded-lg bg-brand-rose hover:bg-brand-roseHover text-white font-bold text-base sm:text-lg transition-all hover:-translate-y-1 shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2">
                <Database size={20} /> {t('Explore indicators')}
              </a>
              <a href={HAS_SECTION.projects ? '#projects' : '#tools'} className="px-6 sm:px-8 py-3 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 font-bold text-base sm:text-lg transition-all hover:-translate-y-1 shadow-lg border border-white/20 flex items-center justify-center gap-2">
                <FolderKanban size={20} /> {t('See the projects')}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6 pointer-events-none">
        <div className="pointer-events-auto md:w-1/3">
          {(ready || (onDemand && canGlobe && !failed)) && (
            <div className="flex flex-col gap-3">
              <div role="group" aria-label={t('Fly to a city')} className="flex flex-wrap gap-2">
                {HERO_CITIES.map((c) => (
                  <button key={c.id} type="button" onClick={withGlobe(() => flyTo(c))} onMouseEnter={() => preloadCity(c)} onFocus={() => preloadCity(c)} aria-pressed={activeId === c.id}
                          className={`px-3 py-1.5 rounded-full border font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${activeId === c.id ? 'bg-brand-turquoise text-lagoon-950 border-brand-turquoise' : 'bg-white/5 text-salt-200 border-white/15 hover:bg-white/15'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <HeroIconButton label={t('Previous city')} onClick={withGlobe(() => cycle(-1))}><ChevronLeft size={16} /></HeroIconButton>
                <HeroIconButton label={playing ? t('Pause rotation') : t('Rotate the globe')} onClick={withGlobe(togglePlay)}>{playing ? <Pause size={14} /> : <Play size={14} />}</HeroIconButton>
                <HeroIconButton label={t('Next city')} onClick={withGlobe(() => cycle(1))}><ChevronRight size={16} /></HeroIconButton>
                <span className="w-px h-5 bg-white/15 mx-1" aria-hidden="true"></span>
                <HeroIconButton label={t('Zoom out')} onClick={withGlobe(() => zoom(2))}><Minus size={16} /></HeroIconButton>
                <HeroIconButton label={t('Zoom in')} onClick={withGlobe(() => zoom(0.5))}><Plus size={16} /></HeroIconButton>
              </div>
            </div>
          )}
        </div>
        <a href="#about" className="hidden md:flex pointer-events-auto flex-col items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-salt-300 hover:text-white transition-colors">
          {t('Explore the observatory')} <ArrowDown size={16} className="cue-bounce" />
        </a>
        <div className="pointer-events-auto md:w-1/3 md:text-right font-mono uppercase">
          <p className="text-sm sm:text-base tracking-[0.15em] text-white whitespace-pre">{formatCoord(view.lat, view.lng)}</p>
          <p className="mt-1 text-[11px] sm:text-xs tracking-[0.25em] text-brand-turquoise">{place ? `${place.name}, BO` : t('In orbit')}</p>
          <p className="sr-only" aria-live="polite">{announcement}</p>
          <p className="mt-2 text-[11px] tracking-[0.2em] text-salt-400">Sentinel-2 cloudless 2016 · NASA Blue Marble</p>
        </div>
      </div>

      <div className={`marquee relative z-10 overflow-hidden border-t border-white/10 bg-lagoon-950/85 py-3 ${motionPaused ? 'paused' : ''}`} aria-hidden="true">
        <div className="marquee-track flex">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {[0, 1].flatMap((rep) => HERO_THEMES.map((theme, i) => (
                <span key={`${rep}-${i}`} className="flex items-center gap-4 px-6 font-mono text-xs sm:text-sm uppercase tracking-[0.25em] text-salt-300 whitespace-nowrap">
                  <span className="text-brand-turquoise">{String(i + 1).padStart(2, '0')}</span>{t(theme)}<span className="text-brand-rose pl-6">✦</span>
                </span>
              )))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PILLARS = [
  { title: 'Indicators & Tools', href: '#indicators', image: 'images/pillar-indicators.webp', icon: Database, accent: 'text-teal-300', border: 'hover:border-teal-400/40',
    text: 'Harmonized municipal panels: the SDG Atlas 2026’s goal indices and indicators near 2012 and near 2024, night-time lights, population and satellite embeddings, with the Python packages, Colab notebooks and Earth Engine apps to load, map and model them.' },
  { title: 'GeoDevelopment Projects', href: HAS_SECTION.projects ? '#projects' : '#indicators', image: 'images/pillar-projects.webp', icon: FolderKanban, accent: 'text-sky-300', border: 'hover:border-sky-400/40',
    text: 'Research projects that build on the observatory, from the subnational SDG Atlas to regional shocks and local pollution, each with its own website, data and methods.' },
  { title: 'GeoDevelopment Insights', href: HAS_SECTION.insights ? '#insights' : '#indicators', image: 'images/pillar-insights.webp', icon: Lightbulb, accent: 'text-rose-300', border: 'hover:border-rose-400/40',
    text: 'Research that uses the observatory’s data, summarized in plain language with links to the papers, so every audience can learn from it.' },
];

const AUDIENCES = [
  { title: 'Researchers', text: 'Run empirical analyses on ready-made subnational panels with reproducible code.', icon: BarChart2 },
  { title: 'Decision-makers', text: 'Use evidence to design, target, and evaluate regional development policies.', icon: MapIcon },
  { title: 'Citizens', text: 'Understand how development is unfolding in the place where you live.', icon: Users },
];

const About = () => {
  const indicators = byType(['indicator']);
  const stats = [
    { value: new Set(indicators.flatMap((i) => i.datasets || [i.dataset])).size, label: 'indicator datasets' },
    { value: Object.keys(UNIT_COUNTS).filter((k) => k !== 'total').length, label: 'spatial scales' },
    ...(YEAR_SPAN ? [{ value: YEAR_SPAN[0] === YEAR_SPAN[1] ? String(YEAR_SPAN[0]) : `${YEAR_SPAN[0]}–${YEAR_SPAN[1]}`, label: 'years covered' }] : []),
    { value: byType(['package', 'notebook', 'app']).length, label: 'packages, notebooks & apps' },
    { value: byType(['project']).length, label: byType(['project']).length === 1 ? 'research project' : 'research projects' },
    { value: byType(['insight']).length, label: byType(['insight']).length === 1 ? 'research insight' : 'research insights' },
  ];
  return (
    <section id="about" aria-labelledby="about-title" className="relative border-t border-white/10">
      <SatelliteHeader band={SECTION_BANDS.about}>
        <SectionHeading index={sectionIndex('about')} eyebrow={t("About the observatory")} title={t("From pixels")} emphasis={t("to policy")} id="about-title">
          {t("The GeoDevelopment Observatory of Bolivia (GDO-Bolivia) is a public-access platform for analyzing, monitoring, and evaluating sustainable regional development across Bolivia’s regions, at whatever scale the data allow. It brings together social, economic, and environmental indicators from satellite imagery, censuses, and administrative records; makes them explorable through AI-enhanced notebooks and web apps; puts them to work in research projects; and turns the results into insights anyone can use.")}
        </SectionHeading>
      </SatelliteHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <AnimateIn key={p.title} delay={i * 100}>
                <a href={p.href} className={`group block h-full bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${p.border}`}>
                  <div className="relative aspect-[3/2] overflow-hidden bg-lagoon-900">
                    <img {...responsive(p.image, '(min-width: 1280px) 400px, (min-width: 768px) 31vw, 92vw')} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-lagoon-950 via-lagoon-950/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-5 w-12 h-12 rounded-xl bg-lagoon-950/80 border border-white/10 flex items-center justify-center">
                      <Icon size={24} className={p.accent} />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{t(p.title)}</h3>
                    <p className="text-salt-400 leading-relaxed mb-4">{t(p.text)}</p>
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${p.accent}`}>{t('Explore')} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </a>
              </AnimateIn>
            );
          })}
        </div>

        <AnimateIn>
          {/* Six across only where each box is wide enough for a year span such as 2001–2024; with an odd
              number of stats, the last one fills the phone layout's second column */}
          <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-16">
            {stats.map((s) => (
              <div key={s.label} className={`min-w-0 rounded-xl bg-white/[0.03] border border-white/10 py-6 px-4 sm:px-5 xl:px-4 ${stats.length % 2 ? 'last:col-span-2 md:last:col-span-1' : ''}`}>
                <dt className="sr-only">{t(s.label)}</dt>
                <dd>
                  <span className={`block font-extrabold tracking-tight tabular-nums text-white whitespace-nowrap ${String(s.value).length > 4 ? 'text-lg max-[359px]:text-base sm:text-3xl md:text-[1.75rem] lg:text-4xl xl:text-2xl' : 'text-3xl lg:text-4xl'} leading-9 lg:leading-10 xl:leading-10`}>{s.value}</span>
                  <span className="block h-px w-6 bg-brand-turquoise my-3" aria-hidden="true"></span>
                  <span className="block text-xs sm:text-sm text-salt-400">{t(s.label)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </AnimateIn>

        <AnimateIn>
          <Eyebrow as="h3" tone="text-salt-300" className="mb-6">{t('Who it is for')}</Eyebrow>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="flex gap-4 items-start p-6 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-brand-rose/15 text-[#ff9aa9] flex items-center justify-center"><Icon size={22} /></div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{t(a.title)}</h4>
                    <p className="text-sm text-salt-400 leading-relaxed">{t(a.text)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
};

const ItemCard = ({ item, showImage = true }) => {
  const s = TYPE_STYLE[item.type];
  return (
    <article className={`group h-full bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-0.5 ${s.glow} relative`}>
      {showImage && item.image && (
        <div className="relative aspect-[16/9] overflow-hidden bg-lagoon-900">
          <img {...responsive(item.image, CARD_SIZES)} alt={item.imageAlt || ''} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-lagoon-950/80 to-transparent"></div>
          <div className="absolute top-3 left-3"><TypeBadge item={item} solid /></div>
          {item.pinned && <span className="absolute top-3 right-3 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-rose text-white">{t('Featured')}</span>}
        </div>
      )}
      <div className="p-6 flex flex-col flex-grow">
        {item.scope && <p className="text-xs font-mono text-brand-turquoise mb-2">{item.scope}</p>}
        <h3 className="text-lg font-bold text-white leading-snug mb-2">
          <a href={itemHref(item)} className="after:absolute after:inset-0">{item.title}</a>
        </h3>
        <p className="text-sm text-salt-400 mb-4 flex-grow leading-relaxed">{item.summary}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.tags.slice(0, 4).map((t) => <Tag key={t} type={item.type}>{t}</Tag>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 text-sm font-semibold ${s.text}`}>
            {t('View details')} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </span>
          {item.geolibre && item.dataset && (
            <a href={geolibreUrl(item.dataset)} target="_blank" rel="noopener noreferrer"
               className="relative z-10 inline-flex items-center gap-1 text-xs font-semibold text-salt-200 bg-white/5 border border-white/15 rounded-full px-2.5 py-1 hover:border-brand-turquoise/60 hover:text-white transition-colors">
              {t('Open in GeoLibre')} <ExternalLink size={11} />
              <span className="sr-only"> {t('(opens in a new tab)')}</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

// The three Python packages (home page and every package page): geo4bolivia, the place to start,
// covers the fundamentals; expdpy and geometrics are its companions for specialised methods.
// `current` marks the package whose page shows it.
const PACKAGE_PREFIX = { 'geo4bolivia-package': 'geo', 'expdpy-package': 'ex', 'geometrics-package': 'gm' };
const PackageWorkflow = ({ current, compact = false }) => (
  <ol className={`grid grid-cols-1 gap-4 ${compact ? 'sm:grid-cols-3' : 'md:grid-cols-3 md:gap-6'}`}>
    {L().PACKAGE_WORKFLOW.map((step, i) => {
      const here = step.id === current;
      const item = byId(step.id);
      return (
        <li key={step.id} className="relative">
          <a href={itemHref(item)} aria-current={here ? 'page' : undefined}
             className={`flex flex-col h-full rounded-xl border p-5 transition-colors ${here ? 'border-sand-400/60 bg-sand-400/10' : step.flagship ? 'border-sand-400/35 bg-sand-400/[0.06] hover:border-sand-400/60' : 'border-white/10 bg-white/[0.03] hover:border-sand-400/40'}`}>
            <div className={`flex gap-2 mb-3 ${compact ? 'flex-col items-start' : 'items-center justify-between'}`}>
              <span className="font-mono text-xs text-brand-turquoise">{step.flagship ? t('Start here') : t('Go further')}</span>
              {step.flagship && <span className="text-[10px] font-bold uppercase tracking-widest text-sand-200 bg-sand-400/15 border border-sand-400/30 rounded-full px-2 py-0.5">{t('Flagship')}</span>}
              {here && !step.flagship && <span className="text-[10px] font-bold uppercase tracking-widest text-salt-300">{t('This package')}</span>}
            </div>
            <h4 className="text-xl font-bold text-white font-mono">{step.name}</h4>
            <p className="text-sm font-semibold text-sand-200 mb-2">{step.role}</p>
            {!compact && <p className="text-sm text-salt-300 leading-relaxed mb-4">{step.text}</p>}
            <div className="mt-auto flex flex-wrap gap-1.5">
              {step.fns.map((fn) => <code key={fn} className="max-w-full break-all text-[11px] font-mono text-sand-200 bg-sand-400/10 px-1.5 py-0.5 rounded">{PACKAGE_PREFIX[step.id]}.{fn}()</code>)}
            </div>
          </a>
          {!compact && step.flagship && i < L().PACKAGE_WORKFLOW.length - 1 && (
            <span className="hidden md:flex absolute top-1/2 -right-[19px] -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-lagoon-900 border border-white/15 items-center justify-center text-salt-300" aria-hidden="true">
              <ArrowRight size={14} />
            </span>
          )}
        </li>
      );
    })}
  </ol>
);

// A dataset's folder on GitHub (data/<dataset>/: README, datapackage.json, one subfolder per map)
const datasetFolderUrl = (item) => `${REPO_URL}/tree/main/data/${item.dataset || item.datasets[0]}`;
// A dataset's wide files (one row per unit, a column per variable and year, with boundaries). The
// download buttons point at the site's own copy (relative to <base>; the deploy serves every tracked
// file), so the browser saves them instead of showing them; code reads them from RAW_URL
const WIDE_FORMATS = [['gpkg', 'GeoPackage'], ['geojson', 'GeoJSON']];
const wideFileUrl = (dataset, scale, ext) => `data/${dataset}/${scale}/${dataset}_wide.${ext}`;
// "Open in GeoLibre" (indicators with `geolibre`): GeoLibre, the open-source GIS in the browser, opens the
// project file site/geolibre.mjs writes (the wide GeoJSON, styled on the headline variable; in the page's
// language, since the Spanish site has its own copy, labels included).
// The project and the data are read from the live site (SITE_URL), whatever <base> this build has
const geolibreUrl = (dataset, { embed = false } = {}) =>
  `${GEOLIBRE_APP}?url=${encodeURIComponent(SITE_URL + projectPath(dataset, language()))}&welcome=0${embed ? '&layout=viewer' : ''}`;

// A row of the database table that opens a folder on GitHub: one link (the dataset's name), stretched
// over the whole row, so the row is one target for the mouse and one stop for the keyboard
const FolderRow = ({ href, name, title, scale, period, id, files, downloads = [], links = [] }) => (
  <tr className="relative group hover:bg-teal-400/[0.06] focus-within:bg-teal-400/[0.06] transition-colors cursor-pointer">
    <td className="px-4 py-4 md:px-6">
      <a href={href} target="_blank" rel="noopener noreferrer"
         className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-turquoise group-hover:underline focus:outline-none focus-visible:underline after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-turquoise">
        <Github size={13} className="flex-shrink-0" />{name}
        <span className="sr-only"> {t('folder on GitHub (opens in a new tab)')}</span>
      </a>
      <div className="text-salt-300 mt-1">{title}</div>
    </td>
    <td className="px-4 py-4 md:px-6 text-salt-300 whitespace-nowrap">{scale}</td>
    <td className="px-4 py-4 md:px-6 text-salt-300 whitespace-nowrap">{period}</td>
    <td className="px-4 py-4 md:px-6"><code className="font-mono text-brand-turquoise bg-teal-400/10 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">{id}</code></td>
    <td className="px-4 py-4 md:px-6 text-salt-400 whitespace-nowrap">
      <span className="inline-flex items-center gap-2">{files}<ExternalLink size={13} className="text-salt-500 group-hover:text-brand-turquoise transition-colors" /></span>
      {(downloads.length > 0 || links.length > 0) && (
        <span className="relative z-10 flex flex-wrap gap-1.5 mt-2">
          {downloads.map(([label, url]) => (
            <a key={label} href={url} download className="inline-flex items-center gap-1 text-[11px] font-semibold text-sand-200 bg-sand-400/10 border border-sand-400/25 rounded px-1.5 py-0.5 hover:border-sand-400/60 hover:text-white transition-colors">
              <Download size={11} />{label}<span className="sr-only"> {t('(wide, with boundaries)')}</span>
            </a>
          ))}
          {links.map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-salt-200 bg-white/5 border border-white/15 rounded px-1.5 py-0.5 hover:border-brand-turquoise/60 hover:text-white transition-colors">
              {label}<ExternalLink size={10} /><span className="sr-only"> {t('(opens in a new tab)')}</span>
            </a>
          ))}
        </span>
      )}
    </td>
  </tr>
);

// Indicators and tools share one section: the cards are filtered by type, the database and code examples follow
const TOOL_TYPES = ['package', 'notebook', 'app'];
const IndicatorsSection = () => {
  // The Python packages are the way into the data, so the section opens on them
  const [filter, setFilter] = useState('package');
  const items = byType(['indicator']);
  const all = [...TOOL_TYPES.flatMap((t) => byType([t])), ...items];
  const shown = filter === 'all' ? all : filter === 'tools' ? all.filter((i) => TOOL_TYPES.includes(i.type)) : all.filter((i) => i.type === filter);
  const count = (t) => all.filter((i) => i.type === t).length;
  const options = [['package', t('Python packages ({n})', { n: count('package') })], ['indicator', t('Indicators ({n})', { n: count('indicator') })],
    ['notebook', t('Notebooks ({n})', { n: count('notebook') })], ['app', t('Web apps ({n})', { n: count('app') })], ['all', t('All ({n})', { n: all.length })]];
  // "#tools" (old links, the tool pages' breadcrumbs) lands here with the tools selected
  useEffect(() => {
    const onHash = () => { if (window.location.hash === '#tools') setFilter('tools'); };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return (
    <section id="indicators" aria-labelledby="indicators-title" className="relative border-t border-white/10">
      <SatelliteHeader band={SECTION_BANDS.indicators}>
        <SectionHeading index={sectionIndex('indicators')} eyebrow={t("GeoDevelopment Indicators & Tools")} title={t("Subnational data,")} emphasis={t("ready to analyze")} id="indicators-title">
          {t("Social, economic, and environmental indicators for Bolivia’s departments, provinces, municipalities and other regional units, from satellite imagery, censuses, and administrative records, documented variable by variable, with their sources and licenses; and the Python packages, notebooks and web apps to load them, build new ones and model them, all running in your browser.")}
        </SectionHeading>
      </SatelliteHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <span id="tools" className="block scroll-mt-24" aria-hidden="true"></span>
        <AnimateIn>
          <div className="mb-12">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div className="max-w-3xl">
                <h3 className="text-2xl font-bold tracking-tight text-white">{t("Start with geo4bolivia, go further with its companions")}</h3>
                <p className="text-salt-300 leading-relaxed mt-2">{language() === 'es'
                  ? <>Cada indicador de abajo está pensado para usarse con <a className="text-brand-turquoise hover:underline" href={itemHref(byId('geo4bolivia-package'))}>geo4bolivia</a>: encuentra, carga y mapea los datos y ejecuta por sí mismo los análisis fundamentales, desde la dependencia espacial, la convergencia y la desigualdad hasta la regresión, los modelos espaciales y MGWR. Para métodos especializados entrega sus paneles, etiquetados, a dos paquetes compañeros: expdpy para paneles y geometrics para el espacio. Los tres funcionan en Google Colab.</>
                  : <>Every indicator below is meant to be used through <a className="text-brand-turquoise hover:underline" href={itemHref(byId('geo4bolivia-package'))}>geo4bolivia</a>: it finds, loads and maps the data and runs the fundamental analyses itself, from spatial dependence, convergence and inequality to regression, spatial models and MGWR. For specialised methods it hands its panels, labelled, to two companion packages: expdpy for panels and geometrics for space. All three run in Google Colab.</>}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={itemHref(byId('three-packages'))} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-rose text-white text-sm font-semibold hover:bg-brand-roseHover transition-colors">{t('One question in one notebook')} <ArrowRight size={14} /></a>
                <a href={PACKAGE_DOCS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-salt-200 text-sm font-semibold hover:border-white/30 hover:text-white transition-colors">{t('Documentation')}<span className="sr-only"> {t('of geo4bolivia (opens in a new tab)')}</span></a>
                <a href={`${PACKAGE_DOCS_URL}reference/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-salt-200 text-sm font-semibold hover:border-white/30 hover:text-white transition-colors">{t('Function reference')}<span className="sr-only"> {t('of geo4bolivia (opens in a new tab)')}</span></a>
              </div>
            </div>
            <PackageWorkflow />
          </div>
        </AnimateIn>
        <div role="group" aria-label={t('Filter indicators and tools')} className="flex flex-wrap gap-2 mb-10">
          {options.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k || (filter === 'tools' && TOOL_TYPES.includes(k))}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === k || (filter === 'tools' && TOOL_TYPES.includes(k)) ? 'bg-brand-rose text-white shadow-sm' : 'bg-transparent text-salt-300 border border-white/15 hover:border-white/30 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {shown.map((item, i) => <AnimateIn key={item.id} delay={(i % 3) * 80}><ItemCard item={item} /></AnimateIn>)}
        </div>

        {/* Database architecture */}
        <AnimateIn>
          <h3 id="get-the-data" className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-3 mb-6">
            <span className="font-mono text-sm text-brand-turquoise">01</span>
            {t('Database architecture')}
          </h3>
          <p className="text-salt-400 max-w-3xl -mt-3 mb-5">{t('Every dataset has a folder of its own on GitHub: its documentation (README), its metadata (datapackage.json) and its files, CSV and Parquet, one subfolder per map. Click a row to open it. GeoPackage and GeoJSON download the data wide, ready to map: one row per municipality, a column per variable and year, with boundaries.')}</p>
          <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] mb-16">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{t('Datasets, spatial scale, coverage, unit ID and files; each row links to the dataset’s folder on GitHub')}</caption>
                <thead className="bg-white/5 text-salt-300 text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3 md:px-6">{t('Dataset')}</th>
                    <th scope="col" className="px-4 py-3 md:px-6">{t('Scale')}</th>
                    <th scope="col" className="px-4 py-3 md:px-6">{t('Period')}</th>
                    <th scope="col" className="px-4 py-3 md:px-6">{t('Unit ID')}</th>
                    <th scope="col" className="px-4 py-3 md:px-6">{t('Files')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((it) => (
                    <FolderRow key={it.id} href={datasetFolderUrl(it)} name={(it.datasets || [it.dataset]).join(' · ')} title={it.title}
                               scale={`${it.units} · ${it.geography}`} period={it.period} id={it.idExample}
                               files="README · datapackage.json · CSV · Parquet"
                               downloads={WIDE_FORMATS.map(([ext, label]) => [label, wideFileUrl(it.dataset, it.scale, ext)])}
                               links={it.geolibre ? [['GeoLibre', geolibreUrl(it.dataset)]] : []} />
                  ))}
                  <FolderRow href={`${REPO_URL}/tree/main/geo`} name="geo" title={t('Units, boundaries and crosswalks')}
                             scale={t('All scales · {n} units', { n: UNIT_COUNTS.total })} period="—" id="BO"
                             files="CSV · Parquet · GeoJSON" />
                </tbody>
              </table>
            </div>
            <div className="bg-amber-950/30 px-4 py-4 md:px-6 border-t border-amber-900/30 flex gap-3">
              <Layers size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-100/80">
                {language() === 'es'
                  ? <><strong className="text-amber-200">Un sistema de ID para todas las escalas.</strong> Cada unidad tiene un geo ID que se anida por prefijo: el municipio <code>BO-04-17-04</code> (Nuestra Señora de La Paz) está en la provincia <code>BO-04-17</code> (Murillo), que está en el departamento <code>BO-04</code> (La Paz) y en Bolivia (<code>BO</code>). <a className="underline" href={`${REPO_URL}/blob/main/geo/units.csv`} target="_blank" rel="noopener noreferrer">geo/units.csv<span className="sr-only"> {t('(opens in a new tab)')}</span></a> vincula cada ID con su nombre y con sus códigos de GADM, del INE y de DS4Bolivia, y el <a className="underline" href="tools/geo4bolivia-package/">paquete de Python geo4bolivia</a> carga, vincula y agrega datos entre escalas. Los mapas municipales se nombran por su número de unidades: <code>map343</code>, los {UNIT_COUNTS.map343} municipios y autonomías indígenas del Atlas de los ODS 2026 (el mapa de 2025 de SDSN Bolivia), en {UNIT_COUNTS.province} provincias y {UNIT_COUNTS.department} departamentos, y <code>map339</code>, los {UNIT_COUNTS.map339} municipios del mapa de 2015 sobre el que se calcularon la población, las luces nocturnas y los embeddings satelitales. Un municipio conserva su geo ID en ambos mapas, y cada conjunto de datos registra el mapa en el que está. <a className="underline" href={`${REPO_URL}/blob/main/docs/data-infrastructure.md`} target="_blank" rel="noopener noreferrer">Cómo funciona la base de datos<span className="sr-only"> {t('(opens in a new tab)')}</span></a>.</>
                  : <><strong className="text-amber-200">One ID system for every scale.</strong> Every unit has a geo ID that nests by prefix: municipality <code>BO-04-17-04</code> (Nuestra Señora de La Paz) lies in province <code>BO-04-17</code> (Murillo), which lies in department <code>BO-04</code> (La Paz) and in Bolivia (<code>BO</code>). <a className="underline" href={`${REPO_URL}/blob/main/geo/units.csv`} target="_blank" rel="noopener noreferrer">geo/units.csv<span className="sr-only"> {t('(opens in a new tab)')}</span></a> links each ID to its name and to its GADM, INE and DS4Bolivia codes, and the <a className="underline" href="tools/geo4bolivia-package/">geo4bolivia Python package</a> loads, links and aggregates data across scales. Municipal maps are named by their number of units: <code>map343</code>, the {UNIT_COUNTS.map343} municipalities and indigenous autonomies of the SDG Atlas 2026 (SDSN Bolivia’s map of 2025), in {UNIT_COUNTS.province} provinces and {UNIT_COUNTS.department} departments, and <code>map339</code>, the {UNIT_COUNTS.map339} municipalities of the 2015 map on which the population, night-time lights and satellite embeddings were computed. A municipality keeps its geo ID on both maps, and each dataset records the map it is on. <a className="underline" href={`${REPO_URL}/blob/main/docs/data-infrastructure.md`} target="_blank" rel="noopener noreferrer">How the database works<span className="sr-only"> {t('(opens in a new tab)')}</span></a>.</>}</p>
            </div>
          </div>
        </AnimateIn>

        {/* Code examples */}
        <AnimateIn>
          <h3 className="text-2xl font-bold tracking-tight text-white flex items-baseline gap-3 mb-4">
            <span className="font-mono text-sm text-brand-turquoise">02</span>
            {t('Start coding in seconds')}
          </h3>
          <p className="text-salt-400 max-w-2xl mb-6">{language() === 'es'
            ? <>Dos formas de empezar. Con el paquete <a className="text-brand-turquoise underline decoration-brand-turquoise/50 underline-offset-2" href="tools/geo4bolivia-package/">geo4bolivia</a>, una línea le da un panel con nombres y límites. Sin él, cada archivo es una URL simple que pandas lee directamente. Cada fragmento funciona tal cual en un notebook en blanco de Google Colab: su primera línea instala lo que le falta a Colab.</>
            : <>Two ways in. With the <a className="text-brand-turquoise underline decoration-brand-turquoise/50 underline-offset-2" href="tools/geo4bolivia-package/">geo4bolivia</a> package, one line gives you a panel with names and boundaries. Without it, every file is a plain URL that pandas reads directly. Every snippet runs as-is in a blank Google Colab notebook: its first line installs what Colab lacks.</>}</p>
          <CodeTabs code={byId('municipalities343-sdg').code} idPrefix="home-code" itemId="municipalities343-sdg" />
        </AnimateIn>
      </div>
    </section>
  );
};

const ProjectsSection = () => {
  const items = byType(['project']);
  return (
    <section id="projects" aria-labelledby="projects-title" className="relative border-t border-white/10">
      <SatelliteHeader band={SECTION_BANDS.projects}>
        <SectionHeading index={sectionIndex('projects')} eyebrow={t("GeoDevelopment Projects")} title={t("Research projects,")} emphasis={t("in action")} id="projects-title">
          {t("Projects that put the observatory’s data and methods to work: atlases, new econometric tools and monitoring systems, each with its own website and team.")}
        </SectionHeading>
      </SatelliteHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => <AnimateIn key={item.id} delay={i * 80}><ItemCard item={item} /></AnimateIn>)}
        </div>
      </div>
    </section>
  );
};

const InsightsSection = () => {
  const items = byType(['insight']);
  return (
    <section id="insights" aria-labelledby="insights-title" className="relative border-t border-white/10">
      <SatelliteHeader band={SECTION_BANDS.insights}>
        <SectionHeading index={sectionIndex('insights')} eyebrow={t("GeoDevelopment Insights")} title={t("Research,")} emphasis={t("made accessible")} id="insights-title">
          {t("Research that uses the observatory’s indicators, summarized in plain language with links to the published papers, for researchers, policymakers, and the public.")}
        </SectionHeading>
      </SatelliteHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => <AnimateIn key={item.id} delay={i * 80}><ItemCard item={item} /></AnimateIn>)}
        </div>
      </div>
    </section>
  );
};

const EventsSection = () => {
  const events = byType(['event']);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section id="events" aria-labelledby="events-title" className="relative border-t border-white/10">
      <SatelliteHeader band={SECTION_BANDS.events}>
        <SectionHeading index={sectionIndex('events')} eyebrow={t("Events")} title={t("Workshops")} emphasis={t("and talks")} id="events-title">
          {t("We bring together researchers, practitioners, and students working at the intersection of development, geospatial analytics, and AI.")}
        </SectionHeading>
      </SatelliteHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="space-y-6 mb-12">
          {events.map((ev) => {
            const past = ev.date < today;
            return (
              <AnimateIn key={ev.id}>
                <article className="group relative grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-0 bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden hover:border-emerald-400/40 transition-all">
                  <div className="bg-white aspect-square self-start overflow-hidden">
                    <img {...responsive(ev.image, '(min-width: 768px) 300px, 92vw')} alt={ev.imageAlt} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <TypeBadge item={ev} />
                      <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${past ? 'bg-salt-700/60 text-salt-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{past ? t('Past event') : t('Upcoming')}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 leading-snug">
                      <a href={itemHref(ev)} className="after:absolute after:inset-0">{ev.title}</a>
                    </h3>
                    <ul className="space-y-1.5 text-sm text-salt-300 mb-4">
                      <li className="flex gap-2"><Calendar size={16} className="text-emerald-300 flex-shrink-0 mt-0.5" /> {ev.dateLabel}</li>
                      <li className="flex gap-2"><Clock size={16} className="text-emerald-300 flex-shrink-0 mt-0.5" /> {ev.time}</li>
                      <li className="flex gap-2"><MapPin size={16} className="text-emerald-300 flex-shrink-0 mt-0.5" /> {ev.venue}</li>
                    </ul>
                    <p className="text-salt-400 text-sm leading-relaxed mb-4">{ev.summary}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">{t('Program and details')} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                  </div>
                </article>
              </AnimateIn>
            );
          })}
        </div>
        <AnimateIn>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
            <h3 className="text-xl font-bold text-white mb-2">{t('Never miss an event')}</h3>
            <p className="text-salt-400 max-w-xl">{t('Subscribe to our events calendar for upcoming workshops, seminars, and training sessions on spatial data science and development.')}</p>
            </div>
            <a href="https://luma.com/cmg" target="_blank" rel="noopener noreferrer"
               className="flex-shrink-0 self-start md:self-auto inline-flex items-center gap-2 px-7 py-3 rounded-lg font-semibold text-white bg-brand-rose hover:bg-brand-roseHover transition-all hover:-translate-y-0.5 shadow-lg shadow-rose-950/30">
              <Calendar size={18} /> {t('Subscribe to upcoming events')}<span className="sr-only"> {t('(opens in a new tab)')}</span>
            </a>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
};

const PersonCard = ({ person, small = false }) => {
  const initials = person.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const size = small ? 'w-20 h-20 text-xl' : 'w-28 h-28 text-2xl';
  return (
    <div className="flex flex-col items-center text-center max-w-xs">
      {person.avatar ? (
        <img src={person.avatar} alt={t('Portrait of {name}', { name: person.name })} loading="lazy" width="112" height="112"
             className={`contributor-avatar ${size} rounded-full mb-4 object-cover shadow-sm border-2 border-white/20`} />
      ) : (
        <div className={`contributor-avatar ${size} rounded-full mb-4 bg-gradient-to-br from-lagoon-600 to-lagoon-800 flex items-center justify-center text-salt-200 font-bold border-2 border-white/20`} aria-hidden="true">{initials}</div>
      )}
      <h4 className={`${small ? 'text-base' : 'text-lg'} font-bold text-white`}>
        {person.website
          ? <a href={person.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand-turquoise inline-flex items-center gap-1">{person.name} <ExternalLink size={12} /><span className="sr-only"> {t('(profile, opens in a new tab)')}</span></a>
          : person.name}
      </h4>
      <p className="text-salt-400 text-sm mt-1">{t(person.affiliation)}</p>
    </div>
  );
};

const TeamSection = () => (
  <section id="team" aria-labelledby="team-title" className="py-24 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimateIn className="mb-14">
        <SectionHeading index={sectionIndex('team')} eyebrow={t("Team")} title={t("The people behind")} emphasis={t("GDO‑Bolivia")} id="team-title" />
      </AnimateIn>
      <AnimateIn>
        <Eyebrow as="h3" tone="text-salt-300" className="mb-8">{t('Core team')}</Eyebrow>
        <div className={`flex flex-wrap gap-x-16 gap-y-10 ${PEOPLE.associates.length ? 'mb-16' : ''}`}>
          {PEOPLE.core.map((p) => <PersonCard key={p.name} person={p} />)}
        </div>
      </AnimateIn>
      {PEOPLE.associates.length > 0 && (
      <AnimateIn>
        <Eyebrow as="h3" tone="text-salt-300" className="mb-8">{t('Research assistants')}</Eyebrow>
        <div className="flex flex-wrap gap-x-16 gap-y-10">
          {PEOPLE.associates.map((p) => <PersonCard key={p.name} person={p} small />)}
        </div>
      </AnimateIn>
      )}
    </div>
  </section>
);

const CommunitySection = () => (
  <section id="community" aria-labelledby="community-title" className="py-24 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimateIn className="mb-10">
        <SectionHeading index={sectionIndex('community')} eyebrow={t("Community")} title={t("Join")} emphasis={t("the conversation")} id="community-title">
          {t("GDO-Bolivia is open by design. Use GitHub Discussions to connect with the team and with other users of the observatory.")}
        </SectionHeading>
      </AnimateIn>
      <ul className="max-w-lg space-y-3 text-salt-300 mb-10">
        {[
          [MessageCircle, 'Ask questions about the data, methods, and tools'],
          [Lightbulb, 'Suggest new indicators, regions, or features'],
          [Code, 'Share notebooks, maps, and analyses built on the observatory'],
          [AlertTriangle, 'Report errors or inconsistencies in the data'],
        ].map(([Icon, text]) => (
          <li key={text} className="flex items-start gap-3"><Icon size={18} className="text-brand-turquoise mt-0.5 flex-shrink-0" /><span>{t(text)}</span></li>
        ))}
      </ul>
      <a href={`${REPO_URL}/discussions`} target="_blank" rel="noopener noreferrer"
         className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-lg text-white bg-brand-rose hover:bg-brand-roseHover transition-all hover:shadow-lg hover:-translate-y-0.5">
        <Github size={18} /> {t('Join GitHub Discussions')}<span className="sr-only"> {t('(opens in a new tab)')}</span>
      </a>
    </div>
  </section>
);

const CiteSection = () => (
  <section id="cite" aria-labelledby="cite-title" className="py-24 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimateIn className="max-w-4xl">
        <div className="mb-10">
          <SectionHeading index={sectionIndex('cite')} eyebrow={t("Cite")} title={t("How to")} emphasis={t("cite")} id="cite-title">
            {t("If you use the observatory in your work, please cite it as below. Each dataset’s page has its own citation, with those of its original sources.")}
          </SectionHeading>
        </div>
        <div className="bg-white/[0.03] p-6 rounded-xl border border-white/10 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-salt-200 text-sm uppercase tracking-wide">APA</h3>
            <CopyButton text={CITATION_APA} />
          </div>
          <p className="text-salt-300">Mendez, C. (2026). <em>GeoDevelopment Observatory of Bolivia</em>. https://quarcs-lab.github.io/gdo4bolivia/</p>
        </div>
        <CodeBlock title="BibTeX" language="bibtex" code={CITATION_BIB} />
      </AnimateIn>
    </div>
  </section>
);

const ContactSection = () => (
  <section id="contact" aria-labelledby="contact-title" className="py-24 border-t border-white/10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimateIn>
        <div className="mb-10">
          <SectionHeading index={sectionIndex('contact')} eyebrow={t('Contact')} title={t('Contact|us').split('|')[0]} emphasis={t('Contact|us').split('|')[1]} id="contact-title" />
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CONTACTS.map((c) => (
            <li key={c.email}>
              <div className="flex items-center gap-3 p-5 rounded-xl bg-white/[0.03] border border-white/10 h-full">
                <span className="w-10 h-10 rounded-full bg-brand-rose/15 text-[#ff9aa9] flex items-center justify-center flex-shrink-0"><Mail size={18} /></span>
                <span className="min-w-0">
                  <span className="block font-semibold text-white">{c.name}</span>
                  <span className="block text-xs text-salt-400 [overflow-wrap:anywhere]">{c.email}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </AnimateIn>
    </div>
  </section>
);

const Footer = () => {
  const band = SECTION_BANDS.footer;
  const imgRef = useParallax();
  return (
  <footer className="bg-lagoon-950/80 border-t border-white/10">
    <div className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <img ref={imgRef} {...responsive(band.image, BAND_SIZES)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover scale-125 saturate-[1.2] brightness-110" />
        <div className="absolute inset-0 bg-lagoon-950/30"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-lagoon-950/90 via-lagoon-950/50 to-transparent"></div>
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-lagoon-950 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-lagoon-950 to-transparent"></div>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">
          <div className="max-w-md">
            <Wordmark size="lg" />
            <p className="text-salt-200 mt-5">{t("Open data, tools, projects and insights for sustainable regional development in Bolivia.")}</p>
            <BandCaption band={band} className="mt-8" />
          </div>
          <div className="flex flex-wrap gap-12 items-start">
            <nav aria-label={t('Footer')}>
              <Eyebrow className="mb-4">{t('Explore')}</Eyebrow>
              <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
                {NAV_LINKS.map((l) => <a key={l.id} href={`#${l.id}`} className="text-salt-300 hover:text-white">{t(l.name)}</a>)}
                <a href="#community" className="text-salt-300 hover:text-white">{t('Community')}</a>
                <a href="#contact" className="text-salt-300 hover:text-white">{t('Contact')}</a>
              </div>
            </nav>
            <div>
              <Eyebrow className="mb-4">{t('Code')}</Eyebrow>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label={t('GitHub repository (opens in a new tab)')}
                 className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-salt-200 hover:text-white hover:border-brand-turquoise/50">
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      <div className="border-t border-white/10 pt-8 space-y-3 text-xs text-salt-400 leading-relaxed">
        {language() === 'es' ? <>
        <p><strong className="text-salt-400">Aviso.</strong> Los indicadores, herramientas, proyectos y hallazgos son responsabilidad de cada investigador y no representan necesariamente las opiniones de sus instituciones de afiliación ni de organizaciones relacionadas. Los mapas de este sitio son solo para uso geoestadístico y tienen carácter referencial e informativo. Representan indicadores espacialmente y no constituyen una definición oficial de los límites territoriales de Bolivia.</p>
        <p><strong className="text-salt-400">Créditos.</strong> Las ilustraciones de las secciones y las tarjetas se generan a partir de los datos del observatorio (scripts/site_images.py); las tarjetas de los proyectos son ilustraciones de lugares de Bolivia dibujadas con ChatGPT, y cualquier mapa en ellas se dibuja a partir de los límites oficiales (scripts/project_images.py); los mapas de los indicadores (scripts/indicator_map.py) se dibujan sobre el mapa base World Dark Gray Canvas de Esri (Esri, HERE, Garmin, © colaboradores de OpenStreetMap y la comunidad de usuarios SIG). El globo de la portada usa <a href={"https://s2maps.eu"} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">Sentinel-2 cloudless<span className="sr-only"> {t('(opens in a new tab)')}</span></a> de EOX IT Services GmbH (contiene datos modificados de Copernicus Sentinel 2016), con licencia CC BY 4.0, sobre Blue Marble Next Generation de la NASA (dominio público), y se dibuja con globe.gl; los fondos de las secciones y del pie de página son recortes de Sentinel-2 cloudless de Bolivia de la misma fuente, salvo Laguna Verde, del mosaico de 2024 (contiene datos modificados de Copernicus Sentinel 2024, CC BY-NC-SA 4.0). El emblema sombrea los nueve departamentos según la pobreza multidimensional (Atlas de los ODS 2020) dentro de la órbita de un satélite (scripts/site_images.py). Las capturas de las aplicaciones, las figuras y las fotos pertenecen a sus autores. El código se publica bajo la <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">licencia MIT<span className="sr-only"> {t('(opens in a new tab)')}</span></a> y los datos bajo <a href={`${REPO_URL}/blob/main/LICENSE-DATA`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">CC BY 4.0<span className="sr-only"> {t('(opens in a new tab)')}</span></a>, salvo cuando una fuente exige otra cosa; los límites son el mapa municipal de 2025 de SDSN Bolivia (Límites Municipales Bolivia 2025, con licencia CC BY 4.0 de SDSN Bolivia); la página de cada conjunto de datos acredita las fuentes originales y sus licencias.</p>
        <p>¿Encontró un error? <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">Abra un issue<span className="sr-only"> {t('(opens in a new tab)')}</span></a> o inicie un hilo en <a href={`${REPO_URL}/discussions`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">GitHub Discussions<span className="sr-only"> {t('(opens in a new tab)')}</span></a>.</p>
        </> : <>
        <p><strong className="text-salt-400">Disclaimer.</strong> The indicators, tools, projects and insights are the responsibility of the individual researchers and do not necessarily represent the views of their affiliated institutions or related organizations. Maps on this website are for geo-statistical use only and have a referential, informational character. They represent indicators spatially and do not constitute an official definition of Bolivia’s territorial boundaries.</p>
        <p><strong className="text-salt-400">Credits.</strong> The section illustrations and cards are rendered from the observatory’s data (scripts/site_images.py); the project cards are illustrations of Bolivian places drawn with ChatGPT, and any map on them is drawn from the official boundaries (scripts/project_images.py); the indicator maps (scripts/indicator_map.py) are drawn over Esri’s World Dark Gray Canvas basemap (Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community). The hero globe uses <a href="https://s2maps.eu" target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">Sentinel-2 cloudless<span className="sr-only"> {t('(opens in a new tab)')}</span></a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), licensed under CC BY 4.0, over NASA's Blue Marble Next Generation (public domain), and is rendered with globe.gl; the section and footer backgrounds are Sentinel-2 cloudless crops of Bolivia from the same source, except Laguna Verde, from the 2024 mosaic (contains modified Copernicus Sentinel data 2024, CC BY-NC-SA 4.0). The emblem shades the nine departments by multidimensional poverty (SDG Atlas 2020) inside a satellite’s orbit (scripts/site_images.py). App screenshots, figures, and photos belong to their respective authors. Code is released under the <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">MIT License<span className="sr-only"> {t('(opens in a new tab)')}</span></a> and data under <a href={`${REPO_URL}/blob/main/LICENSE-DATA`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">CC BY 4.0<span className="sr-only"> {t('(opens in a new tab)')}</span></a>, except where a source requires otherwise; the boundaries are SDSN Bolivia’s municipal map of 2025 (Límites Municipales Bolivia 2025, licensed by SDSN Bolivia under CC BY 4.0); each dataset page credits the original sources and their licenses.</p>
        <p>Found an error? <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">Open an issue<span className="sr-only"> {t('(opens in a new tab)')}</span></a> or start a thread in <a href={`${REPO_URL}/discussions`} target="_blank" rel="noopener noreferrer" className="underline hover:text-salt-300">GitHub Discussions<span className="sr-only"> {t('(opens in a new tab)')}</span></a>.</p>
        </>}
      </div>
    </div>
  </footer>
  );
};

// ====================================================================
// Detail views
// ====================================================================
const SECTION_LABEL = { indicators: 'Indicators', tools: 'Tools', projects: 'Projects', insights: 'Insights', events: 'Events' };

const DetailShell = ({ item, children, aside, lead }) => {
  const headingRef = useRef(null);
  const imgRef = useParallax(0.05, 1.3);
  useEffect(() => { if (headingRef.current) headingRef.current.focus({ preventScroll: true }); }, [item.id]);
  return (
    <article className="pb-20">
      <header className="relative overflow-hidden min-h-[420px] md:min-h-[480px] flex items-end mb-12">
        <div className="absolute inset-0" aria-hidden="true">
          {item.image && (blurredImage(item.image)
            ? <img ref={imgRef} src={blurredImage(item.image)} alt="" decoding="async" className="w-full h-full object-cover scale-[1.3]" />
            : <img ref={imgRef} src={item.image} alt="" decoding="async" className="w-full h-full object-cover scale-[1.3] blur-[2px]" />)}
          <div className="absolute inset-0 bg-lagoon-950/75"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-lagoon-950/90 via-lagoon-950/40 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-lagoon-950 to-transparent"></div>
          <div className="absolute inset-x-0 -bottom-0.5 h-40 bg-gradient-to-t from-lagoon-950 to-transparent"></div>
        </div>
        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-6">
          <nav aria-label={t('Breadcrumb')} className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-salt-400">
              <li><a href="#top" className="hover:text-white">{t('Home')}</a></li>
              <li aria-hidden="true">/</li>
              <li><a href={`#${item.section}`} className="hover:text-white">{t(SECTION_LABEL[item.section])}</a></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-brand-turquoise truncate max-w-[60vw]">{item.title}</li>
            </ol>
          </nav>
          <div className="flex flex-wrap items-center gap-3 mb-5"><TypeBadge item={item} solid />{item.scope && <span className="text-xs font-mono text-brand-turquoise">{item.scope}</span>}</div>
          <h1 ref={headingRef} tabIndex={-1} className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] text-white mb-5 max-w-4xl focus:outline-none">{item.title}</h1>
          <p className="text-lg md:text-xl text-salt-200 max-w-3xl leading-relaxed">{item.summary}</p>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {lead && <div className="mb-12">{lead}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10">
          <div className="min-w-0 space-y-12">{children}</div>
          <div className="space-y-6 lg:sticky lg:top-24 self-start">{aside}</div>
        </div>
        <div className="mt-16">
          <a href={`#${item.section}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-turquoise hover:text-white"><ArrowLeft size={16} /> {t('Back to {section}', { section: t(SECTION_LABEL[item.section]) })}</a>
        </div>
      </div>
    </article>
  );
};

// Short recipes under an indicator's main example: a heading, one sentence and a Python snippet each
const CodeExamples = ({ examples, itemId }) => (
  <div className="mt-10 space-y-8">
    <h3 className="text-xl font-bold tracking-tight text-white">{t('More examples')}</h3>
    {examples.map((ex, i) => (
      <div key={ex.title}>
        <h4 className="text-lg font-semibold text-white mb-1">{ex.title}</h4>
        {ex.text && <p className="text-salt-300 leading-relaxed mb-3">{ex.text}</p>}
        <CodeBlock code={ex.code} language="python" title={t(CODE_TITLE.python)} colab={snippetPath(itemId, `example-${i + 1}`)} />
      </div>
    ))}
  </div>
);

const Block = ({ title, children, id }) => (
  <section aria-labelledby={id} className="pt-10 border-t border-white/10 first:pt-0 first:border-t-0">
    <h2 id={id} className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-5">{title}</h2>
    {children}
  </section>
);

const AsideCard = ({ title, children }) => (
  <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
    {title && <h2 className="text-xs font-bold uppercase tracking-widest text-salt-400 mb-3">{title}</h2>}
    {children}
  </div>
);

const RelatedList = ({ ids }) => {
  const items = (ids || []).map((id) => byId(id)).filter(Boolean);
  if (!items.length) return null;
  return (
    <AsideCard title={t('Related')}>
      <ul className="space-y-3">
        {items.map((r) => {
          const s = TYPE_STYLE[r.type]; const Icon = s.icon;
          return (
            <li key={r.id}>
              <a href={itemHref(r)} className="flex gap-3 group">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg} ${s.text}`}><Icon size={16} /></span>
                <span className="text-sm text-salt-300 group-hover:text-white leading-snug">{r.title}<span className="block text-xs text-salt-400">{r.subtype || t(s.label)}</span></span>
              </a>
            </li>
          );
        })}
      </ul>
    </AsideCard>
  );
};

// Indicator pages read the variable dictionary, sources and licenses from the
// dataset's metadata (data/<dataset>/datapackage.json), the single source of truth.
const PACKAGES = {};
const fetchPackage = (id) => {
  if (!PACKAGES[id]) {
    PACKAGES[id] = fetch(`data/${id}/datapackage.json`).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    }).catch((err) => { delete PACKAGES[id]; throw err; });
  }
  return PACKAGES[id];
};
// The packages with their titles and variables in the current language (site/i18n/<lang>/metadata/)
const useDatapackages = (ids) => {
  const { lang } = useContext(LanguageContext);
  const key = `${lang}:${ids.join(',')}`;
  const [state, setState] = useState({ status: 'loading', packages: [] });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading', packages: [] });
    Promise.all(ids.map((id) => Promise.all([fetchPackage(id), fetchMetadataTranslation(id, lang)])))
      .then((pairs) => { if (live) setState({ status: 'ready', packages: pairs.map(([p, tr]) => translatePackage(p, tr)) }); })
      .catch(() => { if (live) setState({ status: 'error', packages: [] }); });
    return () => { live = false; };
  }, [key]);
  return state;
};
// Sources of several datasets, each listed once
const uniqueSources = (packages, role) => {
  const seen = new Set();
  return packages.flatMap((p) => p.sources || []).filter((s) => {
    if ((role && s['geo:role'] !== role) || seen.has(s.title)) return false;
    seen.add(s.title);
    return true;
  });
};
// The license of the boundaries a dataset is drawn on, by its map (geo:scale)
const BOUNDARY_NOTES = {
  map343: 'The unit boundaries (the maps on this page, geometry=True and geo/boundaries/map343) are SDSN Bolivia’s municipal map of 2025 (map343: 343 municipalities and indigenous autonomies), licensed by SDSN Bolivia under CC BY 4.0; please credit “SDSN Bolivia (2025). Límites Municipales Bolivia 2025 [Archivo shapefile]. https://sdsnbolivia.org/datos-espaciales/”. The geo IDs follow GADM 4.1’s numbering.',
  map339: 'The unit boundaries (the maps on this page, geometry=True and geo/boundaries/map339) are GeoBolivia’s municipal map of 2015 (map339: 339 municipalities), as published by geoBoundaries (gbOpen, public domain; Runfola et al. 2020) and used by DS4Bolivia; its municipalities keep their geo IDs in SDSN Bolivia’s map of 2025 (map343), whose union gives the department outlines (CC BY 4.0, SDSN Bolivia). The geo IDs follow GADM 4.1’s numbering.',
};
const boundaryNote = (packages) => t(BOUNDARY_NOTES[packages[0]?.resources?.[0]?.['geo:scale']] || BOUNDARY_NOTES.map343);

const ExternalA = ({ href, children, className = '' }) => (
  <a href={href} target="_blank" rel="noopener noreferrer"
     className={`text-brand-turquoise underline decoration-brand-turquoise/50 underline-offset-2 hover:decoration-brand-turquoise break-words ${className}`}>
    {children}<span className="sr-only"> {t('(opens in a new tab)')}</span>
  </a>
);

const MetadataStatus = ({ state, ids }) => state.status === 'loading'
  ? <p className="text-sm text-salt-400" role="status">{t('Loading the metadata…')}</p>
  : <p className="text-sm text-amber-100/90 bg-amber-950/30 border border-amber-900/40 rounded-xl p-4" role="alert">
      {t('The metadata could not be loaded. It is in')} {ids.map((id, i) => <React.Fragment key={id}>{i > 0 && ', '}<code className="text-xs">data/{id}/datapackage.json</code></React.Fragment>)}.
    </p>;

const SourceCard = ({ source }) => (
  <li className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
    <div className="flex justify-between items-start gap-4 mb-2">
      <p className="text-sm font-semibold text-white">{source['geo:creator'] || t('Original source')}</p>
      <CopyButton text={source.title} label={t('Copy citation')} />
    </div>
    <p className="text-sm text-salt-300 leading-relaxed">{source.title} {source.path && <ExternalA href={source.path}>{source.path}</ExternalA>}</p>
    {source['geo:homepage'] && (
      <p className="text-sm text-salt-400 mt-2">{t('Data provider:')} <ExternalA href={source['geo:homepage']}>{source['geo:homepage'].replace(/^https?:\/\//, '').replace(/\/$/, '')}</ExternalA></p>
    )}
  </li>
);

const VariableTable = ({ pkg, heading }) => (
  <div>
    {heading && <h3 className="text-lg font-semibold text-white mb-3"><code className="text-brand-turquoise text-base">{pkg.name}</code> · {pkg.title}</h3>}
    <div className="rounded-xl overflow-hidden border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t('Variables of {title}', { title: pkg.title })}</caption>
          <thead className="bg-white/5 text-salt-300 text-xs uppercase tracking-wider">
            <tr><th scope="col" className="px-4 py-3">{t('Name')}</th><th scope="col" className="px-4 py-3">{t('Label')}</th><th scope="col" className="px-4 py-3">{t('Description')}</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pkg.resources[0].schema.fields.map((f) => (
              <tr key={f.name}>
                <td className="px-4 py-3 align-top"><code className="text-brand-turquoise text-xs font-bold whitespace-nowrap">{f.name}</code></td>
                <td className="px-4 py-3 align-top text-salt-100 min-w-[10rem]">{f.title}</td>
                <td className="px-4 py-3 align-top text-salt-300 min-w-[18rem]">{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const LicenseBlock = ({ packages }) => {
  const own = packages[0].licenses[0];
  const sources = uniqueSources(packages);
  const creators = uniqueSources(packages, 'original').map((s) => s['geo:creator']).filter(Boolean);
  const updated = packages.map((p) => p['geo:updated']).filter(Boolean).sort().pop();
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
        <p className="text-salt-200 leading-relaxed">
          {t('The observatory’s files of this dataset are licensed under the')} {own.path ? <ExternalA href={own.path}>{own.title || own.name}</ExternalA> : (own.title || own.name)}{own.name === 'CC-BY-4.0' && ' (CC BY 4.0)'}.
          {own.name === 'CC-BY-4.0' && ` ${t("You may share and adapt them for any purpose, including commercially, as long as you give appropriate credit to the observatory and to the original sources below, link to the license, and indicate if changes were made.")}`}
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm mt-4">
          {creators.length > 0 && <><dt className="text-salt-400">{t('Created by')}</dt><dd className="text-salt-200">{creators.join('; ')}</dd></>}
          <dt className="text-salt-400">{t('Curated by')}</dt><dd className="text-salt-200">{L().SITE_NAME} ({SHORT_NAME})</dd>
          {updated && <><dt className="text-salt-400">{t('Last updated')}</dt><dd className="text-salt-200">{updated}</dd></>}
        </dl>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">{t('Licenses of the sources')}</h3>
        <ul className="space-y-3 text-sm">
          {sources.map((s) => {
            const lic = s['geo:license'];
            return (
              <li key={s.title} className="pl-4 border-l-2 border-white/10">
                <span className="text-salt-100 font-semibold">{s['geo:creator'] || s.title}</span>
                {lic && <span className="text-salt-300">: {lic.path ? <ExternalA href={lic.path}>{lic.title || lic.name}</ExternalA> : (lic.title || lic.name)}</span>}
                {s['geo:attribution'] && <span className="block text-salt-400 mt-1">{t('Required credit:')} “{s['geo:attribution']}”</span>}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-sm text-salt-400 leading-relaxed">{boundaryNote(packages)}</p>
    </div>
  );
};

// The interactive map (Leaflet and the map data) is a separate chunk, loaded on indicator pages only
const IndicatorMap = React.lazy(() => import('./map.jsx'));

// Renders its children once they come within a screen of the viewport (the map and its ~1 MB of data)
const WhenNear = ({ children, placeholder }) => {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !ref.current) return undefined;
    if (!('IntersectionObserver' in window)) { setNear(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '100% 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);
  return <div ref={ref}>{near ? children : placeholder}</div>;
};

// How to cite a dataset, as geo.cite() and the dataset's README do: its original sources first, then the
// observatory, which processes and maintains the data, then the other sources (boundaries, intermediaries)
const datasetCitations = (packages) => {
  const all = uniqueSources(packages);
  const entries = [
    ...all.filter((s) => s['geo:role'] === 'original').map((s) => ({ who: s['geo:creator'] || t('Original source'), text: s.title, kind: 'original' })),
    { who: L().SITE_NAME, text: CITATION_APA, kind: 'observatory' },
    ...all.filter((s) => s['geo:role'] !== 'original').map((s) => ({ who: s['geo:creator'] || t('Source'), text: s.title, kind: 'other' })),
  ];
  return entries.filter((e, i) => entries.findIndex((f) => f.text === e.text) === i);
};

const CITE_ROLE = { original: 'Original source', observatory: 'Processes and maintains the data', other: 'Other source' };

const CiteDataset = ({ packages }) => {
  const entries = datasetCitations(packages);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <p className="text-salt-300 leading-relaxed max-w-2xl">{t('If you use these data, please cite, in this order, the original source, the GeoDevelopment Observatory, which processes and maintains them, and the other sources.')}</p>
        <CopyButton text={entries.map((e) => e.text).join('\n\n')} label={t('Copy all')} />
      </div>
      <ol className="space-y-3">
        {entries.map((e, i) => (
          <li key={e.text} className={`rounded-xl border p-4 flex justify-between items-start gap-4 ${e.kind === 'observatory' ? 'bg-teal-400/[0.05] border-brand-turquoise/25' : 'bg-white/[0.03] border-white/10'}`}>
            <div className="flex gap-3 min-w-0">
              <span className="font-mono text-sm text-brand-turquoise font-bold mt-0.5" aria-hidden="true">{i + 1}</span>
              <p className="text-sm text-salt-300 leading-relaxed min-w-0 break-words">
                <span className="block text-salt-100 font-semibold mb-1">{e.who} <span className="text-xs font-normal text-salt-400">· {t(CITE_ROLE[e.kind])}</span></span>
                {e.text}
              </p>
            </div>
            <CopyButton text={e.text} />
          </li>
        ))}
      </ol>
    </div>
  );
};

// The indicator page's map: ours (the default) or, for indicators with `geolibre: true`, GeoLibre's
// viewer, embedded only when chosen (it loads the whole GeoLibre app)
const MapSwitch = ({ value, onChange }) => (
  <div role="radiogroup" aria-label={t('Map')} className="inline-flex mb-4 rounded-lg border border-white/15 bg-white/[0.03] p-1 text-sm">
    {[['ours', t('Our map')], ['geolibre', 'GeoLibre']].map(([k, label]) => (
      <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${value === k ? 'bg-brand-turquoise/15 text-white' : 'text-salt-400 hover:text-white'}`}>
        {label}
      </button>
    ))}
  </div>
);

const GeoLibreEmbed = ({ item, dataset }) => (
  <div>
    <iframe src={geolibreUrl(dataset, { embed: true })} title={t('{title} in GeoLibre', { title: item.title })}
            className="w-full h-[480px] sm:h-[600px] rounded-xl border border-white/10 bg-lagoon-900" loading="lazy" allow="fullscreen" />
    <div className="flex flex-wrap justify-between items-start gap-3 mt-2">
      <p className="text-xs text-salt-400 max-w-2xl">{t('GeoLibre, an open-source GIS by opengeos, draws the wide GeoJSON of this dataset from this site. Use the Layers and Style panels to map any other variable and year.')}</p>
      <a href={geolibreUrl(dataset)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-turquoise hover:underline">
        {t('Open full screen')} <ExternalLink size={12} /><span className="sr-only"> {t('(opens in a new tab)')}</span>
      </a>
    </div>
  </div>
);

const IndicatorDetail = ({ item }) => {
  const ids = item.datasets || [item.dataset];
  const meta = useDatapackages(ids);
  const [mapView, setMapView] = useState('ours');
  const ready = meta.status === 'ready';
  return (
    <DetailShell item={item} lead={
      <figure>
        <a href={item.map || item.image} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-white/10 bg-lagoon-900 hover:border-brand-turquoise/40 transition-colors">
          <img width="1600" height="1000" {...responsive(item.map || item.image, DETAIL_SIZES)} alt={item.mapAlt || item.imageAlt} fetchpriority="high" className="w-full h-auto" />
          <span className="sr-only">{t('Open the full-size map (new tab)')}</span>
        </a>
        <figcaption className="text-xs text-salt-400 mt-2">{t('Select the map to open it at full size.')}</figcaption>
      </figure>
    } aside={<>
      <AsideCard title={t('At a glance')}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <dt className="text-salt-400">{t('Geography')}</dt><dd className="text-salt-200">{item.geography}</dd>
          <dt className="text-salt-400">{t('Units')}</dt><dd className="text-salt-200">{item.units}</dd>
          <dt className="text-salt-400">{t('Period')}</dt><dd className="text-salt-200">{item.period}</dd>
          <dt className="text-salt-400">{t('Frequency')}</dt><dd className="text-salt-200">{item.frequency}</dd>
          <dt className="text-salt-400">{t('Join key')}</dt><dd><code className="text-brand-turquoise text-xs font-bold">{item.key}</code> <span className="text-salt-400 text-xs">{t('e.g.')} {item.idExample}</span></dd>
          <dt className="text-salt-400">{t('Dataset id')}</dt><dd>{ids.map((id) => <code key={id} className="text-brand-turquoise text-xs font-bold mr-2">{id}</code>)}</dd>
          <dt className="text-salt-400">{t('Categories')}</dt><dd className="text-salt-200">{item.categories.join(', ')}</dd>
          {ready && <><dt className="text-salt-400">{t('License')}</dt><dd className="text-salt-200">{meta.packages[0].licenses[0].name.replace(/-/g, ' ')}</dd></>}
        </dl>
        {ids.map((id) => (
          <a key={id} href={`${REPO_URL}/tree/main/data/${id}`} target="_blank" rel="noopener noreferrer"
             className="mt-5 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-white/15 text-salt-100 text-sm font-semibold hover:border-brand-turquoise/50 hover:text-white transition-colors">
            <Github size={16} /> {t('Dataset on GitHub')} <code className="text-xs text-brand-turquoise">data/{id}/</code>
            <span className="sr-only"> {t('(opens in a new tab)')}</span>
          </a>
        ))}
        <p className="text-xs text-salt-400 mt-2">{t('Its documentation, metadata and files, CSV and Parquet.')}</p>
        {item.scale && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-salt-200 mb-2">{t('Download, wide and ready to map')}</p>
            <div className="grid grid-cols-2 gap-2">
              {ids.flatMap((id) => WIDE_FORMATS.map(([ext, label]) => (
                <a key={`${id}-${ext}`} href={wideFileUrl(id, item.scale, ext)} download
                   className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sand-400/10 border border-sand-400/30 text-sand-200 text-sm font-semibold hover:border-sand-400/60 hover:text-white transition-colors">
                  <Download size={14} /> {label}
                </a>
              )))}
            </div>
            <p className="text-xs text-salt-400 mt-2">{t('One row per municipality and a column per variable and year (e.g. {col}), with boundaries. The GeoPackage also describes every column (table variables); the GeoJSON has lighter boundaries for web maps.', { col: `${(meta.packages[0]?.['geo:map']?.variable) || 'variable'}_${(meta.packages[0]?.['geo:map']?.year) || 'year'}` })}</p>
          </div>
        )}
        {item.geolibre && ids.map((id) => (
          <div key={`geolibre-${id}`} className="mt-4">
            <a href={geolibreUrl(id)} target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-brand-rose text-white text-sm font-semibold hover:bg-[#b8344c] transition-colors">
              <MapIcon size={16} /> {t('Open in GeoLibre')} <ExternalLink size={13} />
              <span className="sr-only"> {t('(opens in a new tab)')}</span>
            </a>
            <p className="text-xs text-salt-400 mt-2">{t('GeoLibre, an open-source GIS in the browser, opens the map with every variable and year, ready to restyle, filter, query and export.')}</p>
          </div>
        ))}
      </AsideCard>
    </>}>
      <Block title={t('About the dataset')} id="d-about">
        <p className="text-salt-300 leading-relaxed">{item.description}</p>
        {item.notice && (
          <p className="mt-5 flex gap-3 text-sm text-amber-100/90 bg-amber-950/30 border border-amber-900/40 rounded-xl p-4"><AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" /> {item.notice}</p>
        )}
        <h3 className="text-lg font-semibold text-white mt-8 mb-3">{t('Original source')}</h3>
        {ready
          ? <ul className="space-y-3">{uniqueSources(meta.packages, 'original').map((s) => <SourceCard key={s.title} source={s} />)}</ul>
          : <MetadataStatus state={meta} ids={ids} />}
      </Block>
      <Block title={t('Explore the map')} id="d-map">
        <p className="text-salt-300 leading-relaxed mb-5">{t('Choose any variable and year to map it across the {n} municipalities', { n: item.units })}{item.period && !/^\d{4}$/.test(ENGLISH_BY_ID[item.id].period) ? t(', or map its change between the first and the last year') : ''}.</p>
        {item.geolibre && <MapSwitch value={mapView} onChange={setMapView} />}
        {mapView === 'geolibre' ? <GeoLibreEmbed item={item} dataset={ids[0]} /> : (
          <WhenNear placeholder={<div className="h-[420px] sm:h-[520px] rounded-xl border border-white/10 bg-lagoon-900" />}>
            <React.Suspense fallback={<p className="text-sm text-salt-400" role="status">{t('Loading the map…')}</p>}>
              <IndicatorMap key={item.id} datasets={ids} id={`map-${item.id}`} />
            </React.Suspense>
          </WhenNear>
        )}
      </Block>
      <Block title={t('Variables')} id="d-variables">
        <p className="text-salt-300 leading-relaxed mb-5">{t("Every column of the data. Use the label to name the variable in plots; the description says how it was built.")}</p>
        {ready
          ? <div className="space-y-8">{meta.packages.map((p) => <VariableTable key={p.name} pkg={p} heading={meta.packages.length > 1} />)}</div>
          : <MetadataStatus state={meta} ids={ids} />}
      </Block>
      <Block title={t('Use it in your code')} id="d-code">
        <CodeTabs code={item.code} idPrefix={`code-${item.id}`} itemId={item.id} />
        {item.examples?.length > 0 && <CodeExamples examples={item.examples} itemId={item.id} />}
      </Block>
      <Block title={t('License')} id="d-license">
        {ready ? <LicenseBlock packages={meta.packages} /> : <MetadataStatus state={meta} ids={ids} />}
      </Block>
      <Block title={t('Cite this dataset')} id="d-cite">
        {ready ? <CiteDataset packages={meta.packages} /> : <MetadataStatus state={meta} ids={ids} />}
      </Block>
      <Block title={t('References')} id="d-refs">
        {ready ? (
          <ul className="space-y-3 text-sm text-salt-300">
            {uniqueSources(meta.packages).map((s) => (
              <li key={s.title} className="pl-4 border-l-2 border-white/10">{s.title} {s.path && <ExternalA href={s.path} className="break-all">{s.path}</ExternalA>}</li>
            ))}
          </ul>
        ) : <MetadataStatus state={meta} ids={ids} />}
      </Block>
    </DetailShell>
  );
};

// A package page: about, the three packages, install, quickstart, a step-by-step tutorial (if the entry
// has one), one question through the three packages, and what the package does
const PackageDetail = ({ item }) => {
  const steps = item.tutorial || [];
  const notebook = byId('three-packages');
  const here = itemHref(item);
  const jump = (id) => (e) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `${window.location.pathname}#${id}`);
  };
  return (
    <DetailShell item={item} aside={<>
      <AsideCard title={t('Install')}>
        <div className="rounded-lg bg-lagoon-950/70 border border-white/10 px-3 py-2.5 font-mono text-xs text-sand-200 flex items-center justify-between gap-2">
          <span className="truncate">{item.scope}</span><CopyButton text={item.scope} />
        </div>
      </AsideCard>
      {steps.length > 0 && (
        <AsideCard title={t('Tutorial')}>
          <ol className="space-y-2 text-sm">
            {steps.map((st, i) => (
              <li key={st.id}>
                <a href={`${here}#tut-${st.id}`} onClick={jump(`tut-${st.id}`)} className="flex gap-2 text-salt-300 hover:text-white">
                  <span className="font-mono text-brand-turquoise w-4 flex-shrink-0">{i + 1}</span><span>{st.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </AsideCard>
      )}
      <AsideCard title={t('Open')}>
        <div className="flex flex-col gap-2">{item.links.map((l, i) => <LinkButton key={l.url} link={l} primary={i === 0} />)}</div>
      </AsideCard>
      <AsideCard title={t('Topics')}><div className="flex flex-wrap gap-1.5">{item.tags.map((t) => <Tag key={t} type={item.type}>{t}</Tag>)}</div></AsideCard>
      <RelatedList ids={item.related} />
    </>}>
      <figure className="rounded-xl overflow-hidden border border-white/10 bg-lagoon-900">
        <img {...responsive(item.image, DETAIL_SIZES)} alt={item.imageAlt} fetchpriority="high" className="w-full h-auto" />
      </figure>
      <Block title={t('About this package')} id="p-about">
        <div className="space-y-4">{item.description.split(/\n\s*\n/).map((para) => <p key={para} className="text-salt-300 leading-relaxed">{para}</p>)}</div>
      </Block>
      <Block title={t("Start with geo4bolivia, go further with its companions")} id="p-flow">
        <p className="text-salt-300 leading-relaxed mb-6">{t("geo4bolivia is the place to start: it finds, loads and maps the data and runs the fundamental analyses itself (spatial dependence, convergence, inequality, regression and spatial models, MGWR). expdpy and geometrics are its companions for specialised methods, with panels and with space; geo4bolivia hands them any panel in one line (geo.for_expdpy, geo.for_geometrics).")}</p>
        <PackageWorkflow current={item.id} compact />
      </Block>
      <Block title={t('Install')} id="p-install">
        <CodeBlock title="Colab" language="text" code={item.install} colab={snippetPath(item.id, 'install')} />
        <p className="text-sm text-salt-400 mt-3">{t('Run this in a Google Colab code cell (Python 3.11+).')}{item.installNote ? ` ${item.installNote}` : ''}</p>
      </Block>
      <Block title={t('Quickstart')} id="p-quick">
        {item.quickstart.pandas && <p className="text-salt-300 leading-relaxed mb-4">{t("Load data with the package, or read the same files without it.")}</p>}
        <CodeTabs code={item.quickstart} idPrefix={`quick-${item.id}`} itemId={item.id} slot="quickstart-" />
      </Block>
      {steps.length > 0 && (
        <Block title={t('Tutorial')} id="p-tutorial">
          <p className="text-salt-300 leading-relaxed mb-8">{t("Step by step, on Bolivia’s data. Every code box runs on its own in a new Google Colab notebook.")}</p>
          <ol className="space-y-12">
            {steps.map((st, i) => (
              <li key={st.id} id={`tut-${st.id}`} className="scroll-mt-24">
                <h3 className="text-xl font-bold tracking-tight text-white mb-2 flex items-baseline gap-3">
                  <span className="font-mono text-sm text-brand-turquoise">{String(i + 1).padStart(2, '0')}</span>{st.title}
                </h3>
                <p className="text-salt-300 leading-relaxed mb-4">{st.text}</p>
                <CodeBlock code={st.code} language="python" title={t(CODE_TITLE.python)} colab={snippetPath(item.id, `step-${st.id}`)} />
              </li>
            ))}
          </ol>
        </Block>
      )}
      {item.build && (
        <Block title={t('Build your own indicator')} id="p-build">
          <p className="text-salt-300 leading-relaxed mb-4">{t("Link your own data to the observatory’s units, extract indicators from rasters, combine them with the published datasets, and save the result in the same documented format.")}</p>
          <CodeBlock title="my_indicator.py" language="python" code={item.build} colab={snippetPath(item.id, 'build')} />
        </Block>
      )}
      <Block title={t('One question, three packages')} id="p-example">
        <p className="text-salt-300 leading-relaxed mb-4">{language() === 'es' ? <>¿Convergieron los municipios de Bolivia en desarrollo sostenible entre ~2012 y ~2024? geo4bolivia la responde por sí solo: carga y mapea el índice, prueba la convergencia β, compara la desigualdad en los dos periodos y localiza los conglomerados. Cada compañero añade luego un paso especializado: expdpy separa la variación entre y dentro de los municipios, y geometrics verifica que el resultado espacial se mantenga con siete matrices de pesos. {notebook && <>El <a className="text-brand-turquoise hover:underline" href={itemHref(notebook)}>notebook</a> desarrolla la pregunta, con los resultados.</>}</> : <>Did Bolivia’s municipalities converge in sustainable development between ~2012 and ~2024? geo4bolivia answers it on its own: it loads and maps the index, tests β-convergence, compares inequality in the two periods and locates the clusters. Each companion then adds one specialised step: expdpy splits the variation between and within municipalities, and geometrics checks that the spatial result holds under seven weights matrices. {notebook && <>The <a className="text-brand-turquoise hover:underline" href={itemHref(notebook)}>notebook</a> works the question through, with the results.</>}</>}</p>
        <CodeBlock code={THREE_PACKAGES_EXAMPLE} language="python" title="three_packages.py" colab={sharedSnippetPath('three-packages')} />
      </Block>
      <Block title={t('What it does')} id="p-features">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {item.features.map((f) => (
            <div key={f.title} className="rounded-xl bg-white/[0.03] border border-white/10 p-5 hover:border-sand-400/30 transition-colors">
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-salt-400 leading-relaxed mb-3">{f.text}</p>
              <div className="flex flex-wrap gap-1.5">{f.fns.map((fn) => <code key={fn} className="text-[11px] font-mono text-sand-200 bg-sand-400/10 px-1.5 py-0.5 rounded">{fn}()</code>)}</div>
            </div>
          ))}
        </div>
        {item.referenceUrl && <p className="text-sm text-salt-400 mt-4">{language() === 'es' ? <>Cada función está documentada, con un ejemplo, en la <a className="text-brand-turquoise hover:underline" href={item.referenceUrl} target="_blank" rel="noopener noreferrer">referencia de funciones<span className="sr-only"> {t('(opens in a new tab)')}</span></a> del sitio de documentación del paquete.</> : <>Every function is documented, with an example, in the <a className="text-brand-turquoise hover:underline" href={item.referenceUrl} target="_blank" rel="noopener noreferrer">function reference<span className="sr-only"> {t('(opens in a new tab)')}</span></a> on the package’s documentation site.</>}</p>}
      </Block>
    </DetailShell>
  );
};

const ToolDetail = ({ item }) => {
  const primary = item.links[0];
  return (
    <DetailShell item={item} aside={<>
      <AsideCard title={t('Open')}>
        <div className="flex flex-col gap-2">{item.links.map((l, i) => <LinkButton key={l.url} link={l} primary={i === 0} />)}</div>
      </AsideCard>
      <AsideCard title={t('Topics')}><div className="flex flex-wrap gap-1.5">{item.tags.map((t) => <Tag key={t} type={item.type}>{t}</Tag>)}</div></AsideCard>
      <RelatedList ids={item.related} />
    </>}>
      <a href={primary.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-white/10 bg-lagoon-900 group relative">
        <img {...responsive(item.image, DETAIL_SIZES)} alt={item.imageAlt} fetchpriority="high" className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]" />
        <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lagoon-950/85 border border-white/15 text-sm font-semibold text-white">{primary.label} <ExternalLink size={14} /></span>
        <span className="sr-only"> {t('(opens in a new tab)')}</span>
      </a>
      <Block title={item.type === 'app' ? t('About this app') : t('About this notebook')} id="t-about"><p className="text-salt-300 leading-relaxed">{item.description}</p></Block>
      {item.type === 'notebook' && (
        <Block title={t('Run it')} id="t-run">
          <ol className="list-decimal pl-5 space-y-2 text-salt-300 leading-relaxed">
            {language() === 'es' ? <><li>Abra el notebook con el botón <em>Abrir en Colab</em>.</li>
            <li>Elija <em>Entorno de ejecución → Ejecutar todas</em>.</li>
            <li>El notebook instala los paquetes que le faltan a Colab antes de usarlos y lee sus datos por internet (los notebooks los obtienen de este repositorio con <code className="text-brand-turquoise">geo4bolivia</code>). No se necesita ninguna instalación local.</li></> : <><li>Open the notebook with the <em>Open in Colab</em> button.</li>
            <li>Choose <em>Runtime → Run all</em>.</li>
            <li>The notebook installs any packages Colab lacks before it uses them, and reads its data over the internet (the notebooks stream it from this repository with <code className="text-brand-turquoise">geo4bolivia</code>). No local setup is needed.</li></>}
          </ol>
        </Block>
      )}
    </DetailShell>
  );
};

const ProjectDetail = ({ item }) => {
  const primary = (item.links || [])[0];
  const image = <img {...responsive(item.image, DETAIL_SIZES)} alt={item.imageAlt} fetchpriority="high" className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]" />;
  return (
    <DetailShell item={item} aside={<>
      <AsideCard title={t('Visit')}>
        {primary
          ? <div className="flex flex-col gap-2">{item.links.map((l, i) => <LinkButton key={l.url} link={l} primary={i === 0} />)}</div>
          : <p className="text-sm text-salt-300">{t('The project’s website is coming soon.')}</p>}
      </AsideCard>
      {(item.status || item.team) && (
        <AsideCard title={t('Project')}>
          <dl className="space-y-3 text-sm">
            {item.status && <div><dt className="text-salt-400">{t('Status')}</dt><dd className="text-white">{item.status}</dd></div>}
            {item.team && <div><dt className="text-salt-400">{t('Team')}</dt><dd className="text-white">{item.team}</dd></div>}
          </dl>
        </AsideCard>
      )}
      <AsideCard title={t('Topics')}><div className="flex flex-wrap gap-1.5">{item.tags.map((t) => <Tag key={t} type={item.type}>{t}</Tag>)}</div></AsideCard>
      <RelatedList ids={item.related} />
    </>}>
      {primary
        ? <a href={primary.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-white/10 bg-lagoon-900 group relative">
            {image}
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lagoon-950/85 border border-white/15 text-sm font-semibold text-white">{primary.label} <ExternalLink size={14} /></span>
            <span className="sr-only"> {t('(opens in a new tab)')}</span>
          </a>
        : <div className="rounded-xl overflow-hidden border border-white/10 bg-lagoon-900">{image}</div>}
      <Block title={t('About this project')} id="p-about"><p className="text-salt-300 leading-relaxed">{item.description}</p></Block>
      {item.citation && <Block title={t('Cite this project')} id="p-cite"><p className="text-salt-300 leading-relaxed">{item.citation}</p></Block>}
    </DetailShell>
  );
};

const InsightDetail = ({ item }) => {
  const videos = (item.media || []).filter((m) => m.kind === 'youtube');
  const audios = (item.media || []).filter((m) => m.kind === 'audio');
  return (
    <DetailShell item={item} aside={<>
      {item.links.length > 0 && (
        <AsideCard title={t('Explore in other formats')}>
          <div className="flex flex-col gap-2">{item.links.map((l, i) => <LinkButton key={l.url} link={l} primary={i === 0 && l.kind === 'paper'} />)}</div>
          {item.note && <p className="text-xs text-salt-400 mt-4 leading-relaxed">{item.note}</p>}
        </AsideCard>
      )}
      <AsideCard title={t('Topics')}><div className="flex flex-wrap gap-1.5">{item.tags.map((t) => <Tag key={t} type={item.type}>{t}</Tag>)}</div></AsideCard>
      <RelatedList ids={item.related} />
    </>}>
      {item.citation && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-5">
          <div className="flex justify-between items-center mb-2 gap-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-rose-200">{t('Original publication')}</h2>
            <CopyButton text={`${item.citation} ${item.doi}`} />
          </div>
          <p className="text-sm text-salt-200 leading-relaxed">{item.citation} <a className="text-brand-turquoise underline decoration-brand-turquoise/50 underline-offset-2 hover:decoration-brand-turquoise break-all" href={item.doi} target="_blank" rel="noopener noreferrer">{item.doi}<span className="sr-only"> {t('(opens in a new tab)')}</span></a></p>
        </div>
      )}
      <Block title={t('Overview')} id="i-about"><p className="text-salt-300 leading-relaxed">{item.description}</p></Block>
      {videos.length > 0 && (
        <Block title={videos.length > 1 ? t('Watch') : t('Watch the video')} id="i-video">
          <div className={`grid gap-6 ${videos.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {videos.map((v) => <LiteYouTube key={v.id} id={v.id} label={v.label} lang={v.lang} />)}
          </div>
        </Block>
      )}
      {audios.length > 0 && (
        <Block title={t('Listen')} id="i-audio"><div className="space-y-4">{audios.map((a) => <AudioPlayer key={a.src} src={a.src} label={a.label} />)}</div></Block>
      )}
      {item.summarySections && (
        <Block title={t('Key points')} id="i-summary">
          <div className="space-y-3">
            {item.summarySections.map((s, i) => (
              <details key={s.h} className="group rounded-xl bg-white/[0.03] border border-white/10 open:border-rose-400/30" open={i === 0}>
                <summary className="flex items-center gap-3 px-5 py-4 font-semibold text-white">
                  <ChevronRight size={16} className="chev text-rose-300 transition-transform" /> {s.h}
                </summary>
                <p className="px-5 pb-5 pl-12 text-salt-300 leading-relaxed">{s.p}</p>
              </details>
            ))}
          </div>
        </Block>
      )}
    </DetailShell>
  );
};

const EventDetail = ({ item }) => {
  const past = item.date < new Date().toISOString().slice(0, 10);
  return (
    <DetailShell item={item} aside={<>
      <AsideCard title={t('When and where')}>
        <ul className="space-y-3 text-sm text-salt-300">
          <li className="flex gap-2"><Calendar size={16} className="text-emerald-300 flex-shrink-0 mt-0.5" /> {item.dateLabel}</li>
          <li className="flex gap-2"><Clock size={16} className="text-emerald-300 flex-shrink-0 mt-0.5" /> {item.time}</li>
          <li className="flex gap-2"><MapPin size={16} className="text-emerald-300 flex-shrink-0 mt-0.5" /> {item.venue}</li>
        </ul>
        <p className={`mt-4 text-xs font-bold uppercase tracking-wide inline-block px-2.5 py-1 rounded-full ${past ? 'bg-salt-700/60 text-salt-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{past ? t('This event has ended') : t('Upcoming')}</p>
        <div className="flex flex-col gap-2 mt-4">{item.links.map((l) => <LinkButton key={l.url} link={l} />)}</div>
      </AsideCard>
      <AsideCard title={t('Organizers')}><ul className="space-y-2 text-sm text-salt-300">{item.organizers.map((o) => <li key={o}>{o}</li>)}</ul></AsideCard>
      <RelatedList ids={item.related} />
    </>}>
      <figure className="rounded-xl overflow-hidden border border-white/10 bg-lagoon-900 max-w-xl">
        <img {...responsive(item.image, DETAIL_SIZES)} alt={item.imageAlt} fetchpriority="high" className="w-full h-auto" />
      </figure>
      <Block title={t('Overview')} id="e-about"><p className="text-salt-300 leading-relaxed">{item.description}</p></Block>
      <div className="grid md:grid-cols-2 gap-8">
        <Block title={t('Themes')} id="e-themes"><ul className="flex flex-wrap gap-2">{item.themes.map((t) => <li key={t}><Tag type="event">{t}</Tag></li>)}</ul></Block>
        <Block title={t('Objectives')} id="e-objectives"><ul className="space-y-2 text-salt-300 text-sm list-disc pl-5">{item.objectives.map((o) => <li key={o}>{o}</li>)}</ul></Block>
      </div>
      <Block title={t('Program')} id="e-program">
        <div className="rounded-xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t('Workshop program')}</caption>
              <thead className="bg-white/5 text-salt-300 text-xs uppercase tracking-wider">
                <tr><th scope="col" className="px-4 py-3">{t('Time')}</th><th scope="col" className="px-4 py-3">{t('Session')}</th><th scope="col" className="px-4 py-3">{t('Speakers')}</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {item.program.map(([time, title, who]) => (
                  <tr key={time}><td className="px-4 py-3 font-mono text-xs text-emerald-300 whitespace-nowrap align-top">{time}</td><td className="px-4 py-3 text-white">{title}</td><td className="px-4 py-3 text-salt-400">{who}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Block>
    </DetailShell>
  );
};

// `moved`: the full URL of a page that left the site (REDIRECTS); the router is already sending the visitor there
const NotFound = ({ moved }) => {
  const headingRef = useRef(null);
  useEffect(() => { if (headingRef.current) headingRef.current.focus(); }, []);
  return (
    <div className="max-w-7xl mx-auto pt-40 pb-32 px-4 sm:px-6 lg:px-8">
      <Eyebrow className="mb-5">{moved ? t('Moved') : t('Error 404')}</Eyebrow>
      <h1 ref={headingRef} tabIndex={-1} className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] text-white mb-5 focus:outline-none">{t('Page')} <em className="gradient-text pr-2">{moved ? t('moved') : t('not found')}</em></h1>
      {moved
        ? <p className="text-lg text-salt-300 mb-8">{t('This page has moved to')} <a className="text-brand-turquoise underline break-all" href={moved}>{moved}</a>.</p>
        : <p className="text-lg text-salt-300 mb-8">{t('We couldn’t find that item. It may have moved.')}</p>}
      <a href="#top" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-rose hover:bg-brand-roseHover text-white font-semibold"><ArrowLeft size={16} /> {t('Back to home')}</a>
    </div>
  );
};

const DetailView = ({ route }) => {
  const item = byId(route.id);
  const moved = REDIRECTS[`${route.section}/${route.id}`];
  if (!item || item.section !== route.section) return <NotFound moved={/^https?:/.test(moved || '') ? moved : undefined} />;
  if (item.type === 'indicator') return <IndicatorDetail item={item} />;
  if (item.type === 'package') return <PackageDetail item={item} />;
  if (item.type === 'notebook' || item.type === 'app') return <ToolDetail item={item} />;
  if (item.type === 'project') return <ProjectDetail item={item} />;
  if (item.type === 'insight') return <InsightDetail item={item} />;
  if (item.type === 'event') return <EventDetail item={item} />;
  return <NotFound />;
};

// ====================================================================
// App
// ====================================================================
const Home = () => (
  <>
    <Hero />
    <About />
    <IndicatorsSection />
    {HAS_SECTION.projects && <ProjectsSection />}
    {HAS_SECTION.insights && <InsightsSection />}
    {HAS_SECTION.events && <EventsSection />}
    <TeamSection />
    <CommunitySection />
    <CiteSection />
    <ContactSection />
  </>
);

const App = ({ initialLanguage }) => {
  const route = useRoute();
  const [lang, setLang] = useState(initialLanguage);
  // Load the translation, then switch: every component re-renders in the new language
  const change = useCallback((next) => {
    loadLanguage(next).then(() => { setLanguage(next, true); setLang(next); }).catch(() => {});
  }, []);
  const languageValue = useMemo(() => ({ lang, change }), [lang, change]);
  const reduced = usePrefersReducedMotion();
  const isHome = route.view === 'home';
  const prevView = useRef(route.view);

  useEffect(() => {
    // "<base>/indicators/" and the like are sections of the landing page
    if (route.view === 'detail' && !route.id && (SECTION_ORDER.includes(route.section) || route.section === 'tools')) {
      navigate(`${BASE_PATH}#${route.section}`, true);
      return;
    }
    const cameFromDetail = prevView.current === 'detail';
    prevView.current = route.view;
    if (isHome) {
      document.title = L().DEFAULT_TITLE;
      if (route.anchor && route.anchor !== 'top' && route.anchor !== 'main') {
        // Wait for the landing page to render before scrolling to the anchor.
        // Jump instantly when arriving from a detail view (the page was just re-rendered).
        requestAnimationFrame(() => {
          const el = document.getElementById(route.anchor);
          if (el) el.scrollIntoView({ behavior: reduced || cameFromDetail ? 'instant' : 'smooth' });
        });
      } else if (route.anchor === 'top' && !cameFromDetail) {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      } else if (cameFromDetail) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const item = byId(route.id);
      document.title = item && item.section === route.section ? `${item.title} | ${SHORT_NAME}` : `${t('Not found')} | ${SHORT_NAME}`;
    }
  }, [route]);

  // The tab title and the description follow the language
  useEffect(() => {
    const item = route.view === 'detail' ? byId(route.id) : null;
    if (route.view === 'home') document.title = L().DEFAULT_TITLE;
    else if (item) document.title = `${item.title} | ${SHORT_NAME}`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = item ? item.summary : L().SITE_DESCRIPTION;
  }, [lang]);

  return (
    <LanguageContext.Provider value={languageValue}>
    <ReducedMotionContext.Provider value={reduced}>
      <div className="min-h-screen text-salt-200 font-sans selection:bg-brand-rose/40 selection:text-white">
        <Navigation isHome={isHome} />
        <main id="main" tabIndex={-1} className="focus:outline-none">
          {isHome ? <Home /> : <DetailView route={route} />}
        </main>
        <Footer />
      </div>
    </ReducedMotionContext.Provider>
    </LanguageContext.Provider>
  );
};

// The language is known before the first render (i18n.js), so a Spanish visitor never sees English first
const startLanguage = detectLanguage();
const boot = (lang) => {
  setLanguage(lang);
  createRoot(document.getElementById('root')).render(<App initialLanguage={language()} />);
};
loadLanguage(startLanguage).then(() => boot(startLanguage)).catch(() => boot('en'));
