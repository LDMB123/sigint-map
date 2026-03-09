const fs = require('fs');
const path = require('path');
const vm = require('vm');

class ClassList {
  constructor(initial = []) { this.set = new Set(initial); }
  add(...names) { names.forEach((n) => this.set.add(n)); }
  remove(...names) { names.forEach((n) => this.set.delete(n)); }
  toggle(name, force) {
    if (force === undefined) {
      if (this.set.has(name)) { this.set.delete(name); return false; }
      this.set.add(name); return true;
    }
    if (force) this.set.add(name); else this.set.delete(name);
    return !!force;
  }
  contains(name) { return this.set.has(name); }
  toString() { return [...this.set].join(' '); }
}

class FakeElement {
  constructor(id = null, classNames = []) {
    this.id = id;
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
    this.title = '';
    this.disabled = false;
    this.className = classNames.join(' ');
    this.classList = new ClassList(classNames);
    this.attributes = {};
    this.listeners = {};
  }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML; }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  remove() { if (this.parentElement) { this.parentElement.children = this.parentElement.children.filter((c) => c !== this); this.parentElement = null; } }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(event) { const list = this.listeners[event.type] || []; list.forEach((fn) => fn(event)); }
  click() { this.dispatchEvent({ type: 'click', target: this, preventDefault() {}, key: undefined }); }
  focus() {}
  querySelector(selector) {
    if (selector === '.chart-empty') return this.children.find((c) => c.classList.contains('chart-empty')) || null;
    return null;
  }
  querySelectorAll(selector) {
    if (selector === '.chart-empty') return this.children.filter((c) => c.classList.contains('chart-empty'));
    return [];
  }
  closest(selector) {
    if (selector === '[data-filter-reset]' && this.dataset.filterReset) return this;
    return null;
  }
}

const ids = [
  'appAlert','filterSummary','presetBar','strainSearch','strainSuggestions','searchClearBtn','sortSelect','resultCount','lastUpdated','priceCoverage','dataFreshness',
  'refreshBtn','syncBtn','scrapeBtn','clearFiltersBtn','pricedOnlyBtn','shareViewBtn','exportCsvBtn','exportJsonBtn',
  'historyTypeSelect','historySizeSelect','spotlightCard','marketPulseCard','opsPulseCard','compareGrid','mapContainer','mapList','mapListSummary','tableBody','dispensaryGrid','dealGrid','freshDropList','coverageList',
  'priceMoveList','captureList','jobRunList','historySummary','historyMoveCount','dispensarySummary','tableSummary','mapSummary',
  'priceChartSubtitle','strainChartSubtitle','statusMeta','typeFilter','sizeFilter','strainChart','priceChart','historyChart',
  'kpiDispensaries','kpiDispensariesSub','kpiStrains','kpiStrainsSub','kpiLowest','kpiLowestSub','kpiAvgLabel','kpiAvg','kpiAvgSub',
  'kpiBulkLabel','kpiBulk','kpiBulkSub','kpiDropLabel','kpiDrop','kpiDropSub'
];

const elementsById = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));

// Parent chart wrappers
['strainChart','priceChart','historyChart'].forEach((id) => {
  const wrap = new FakeElement(null, ['chart-wrap']);
  wrap.appendChild(elementsById[id]);
  elementsById[id].parentElement = wrap;
});

// Set initial values for selects.
elementsById.sortSelect.value = 'distance';
elementsById.historyTypeSelect.value = 'ALL';
elementsById.historySizeSelect.value = 'ALL';

const themeToggleBtn = new FakeElement('themeToggleBtn');
themeToggleBtn.setAttribute('data-theme-toggle', '');

const tabs = ['overview','insights','table','map'].map((name, index) => {
  const el = new FakeElement(null, ['tab']);
  el.dataset.tab = name;
  if (index === 0) el.classList.add('active');
  return el;
});
const panels = ['overview','insights','table','map'].map((name, index) => {
  const el = new FakeElement(`panel-${name}`, ['tab-panel']);
  if (index === 0) el.classList.add('active');
  return el;
});
const typeButtons = ['ALL','REC','MED'].map((value, index) => { const el = new FakeElement(null, ['toggle-btn']); el.dataset.value = value; if(index===0) el.classList.add('active'); return el; });
const sizeButtons = ['ALL','3.5g','7g','14g','28g'].map((value, index) => { const el = new FakeElement(null, ['toggle-btn']); el.dataset.value = value; if(index===0) el.classList.add('active'); return el; });
const sortHeaders = ['dispensary','distance','strain','size','price','unitPrice','type','thc','drop'].map((value) => { const el = new FakeElement(null, ['sortable']); el.dataset.sort = value; return el; });

const document = {
  documentElement: new FakeElement('documentElement'),
  body: new FakeElement('body'),
  getElementById(id) { return elementsById[id] || null; },
  createElement(tag) { return new FakeElement(null, [tag]); },
  querySelector(selector) {
    if (selector === '[data-theme-toggle]') return themeToggleBtn;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.tab') return tabs;
    if (selector === '.tab-panel') return panels;
    if (selector === '#typeFilter .toggle-btn') return typeButtons;
    if (selector === '#sizeFilter .toggle-btn') return sizeButtons;
    if (selector === '.data-table th.sortable') return sortHeaders;
    return [];
  },
};
document.documentElement.style = {};
document.documentElement.setAttribute = function(name, value) { this.attributes[name] = String(value); };

global.document = document;

const fetchCalls = [];
const dashboardPayload = {
  serverTime: new Date().toISOString(),
  data: {
    lastUpdated: '2026-03-02T12:00:00Z',
    centerZip: '80920',
    centerLat: 38.9283,
    centerLng: -104.7949,
    radius: 30,
    dispensaries: [
      {
        name: 'Elevations',
        address: '8270 Razorback Rd, Colorado Springs, CO 80920',
        lat: 38.9278,
        lng: -104.7591,
        distance: 2.1,
        dropDate: '2026-02-28',
        menuUrl: 'https://example.com/elevations',
        menuType: null,
        products: [
          { strain: 'I-95', size: '3.5g', price: 44, type: 'MED', thc: '22.2%', thcValue: 22.2 },
          { strain: 'Blu Froot', size: '3.5g', price: null, type: 'MED', thc: '20.3%', thcValue: 20.3 },
          { strain: 'Screaming OG', size: '7g', price: 80, type: 'MED', thc: '24.1%', thcValue: 24.1 },
        ],
      },
      {
        name: 'Buku Loud',
        address: '3079 S Academy Blvd, Colorado Springs, CO 80916',
        lat: 38.8050,
        lng: -104.7580,
        distance: 9.4,
        dropDate: '2026-02-21',
        menuUrl: 'https://example.com/buku-loud',
        menuType: null,
        products: [
          { strain: 'Jetpack', size: '3.5g', price: 50, type: 'REC', thc: null, thcValue: null },
          { strain: 'Monaco', size: '3.5g', price: null, type: 'REC', thc: null, thcValue: null },
        ],
      },
    ],
  },
  stats: {
    avgRec35: 50,
    avgMed35: 44,
    lowestPriceDetail: { price: 44, strain: 'I-95', dispensary: 'Elevations' },
  },
  scrapeStatus: { lastScrape: null, lastSource: null, lastSourceKind: null, pricedProducts: 3, totalProducts: 5, priceCoverage: 60, schedulerEnabled: false },
  status: {
    status: 'ok',
    radiusMiles: 30,
    jobRunning: false,
    schedulerEnabled: false,
    lastRefresh: '2026-03-02T12:00:00Z',
    lastRefreshSource: 'seed',
    lastRefreshKind: 'seed',
    lastActivity: '2026-03-02T12:00:00Z',
    lastActivitySource: 'seed',
    lastActivityKind: 'seed',
    lastScrape: null,
    lastScrapeSource: null,
    lastScrapeKind: null,
    activeJobs: [],
  },
  history: [
    { dispensary: 'Elevations', strain: 'I-95', size: '3.5g', price: 40, type: 'MED', recordedAt: '2026-03-01T00:00:00Z' },
    { dispensary: 'Elevations', strain: 'I-95', size: '3.5g', price: 44, type: 'MED', recordedAt: '2026-03-02T00:00:00Z' },
    { dispensary: 'Buku Loud', strain: 'Jetpack', size: '3.5g', price: 50, type: 'REC', recordedAt: '2026-03-02T00:00:00Z' },
  ],
  jobs: [],
};

class FakeResponse {
  constructor(body, status = 200, headers = { 'content-type': 'application/json' }) {
    this._body = body;
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.headers = { get(name) { return headers[name.toLowerCase()] || headers[name] || null; } };
  }
  async json() { return this._body; }
  async text() { return typeof this._body === 'string' ? this._body : JSON.stringify(this._body); }
}

global.fetch = async function(url, options = {}) {
  fetchCalls.push([url, options]);
  if (String(url).includes('/api/dashboard')) return new FakeResponse(dashboardPayload);
  if (String(url).includes('/api/refresh')) return new FakeResponse({ status: 'ok', dispensaryCount: 2, productCount: 3 });
  if (String(url).includes('/api/sync')) return new FakeResponse({ status: 'ok', dispensaryCount: 2, productCount: 3, pricedProducts: 3, totalProducts: 3, scrape: { warnings: [], errors: [] }, refresh: {} });
  if (String(url).includes('/api/scrape')) return new FakeResponse({ status: 'ok', pricedProducts: 3, totalProducts: 3, warnings: [], errors: [] });
  throw new Error(`Unhandled fetch ${url}`);
};

global.navigator = { clipboard: { writeText: async () => {} } };
global.getComputedStyle = () => ({ getPropertyValue: (name) => ({
  '--color-primary':'#00aa88', '--color-primary-muted':'#00aa8855', '--color-blue':'#3366ff', '--color-blue-muted':'#3366ff55',
  '--chart-text':'#111111', '--chart-grid':'#dddddd', '--color-surface':'#ffffff', '--color-border':'#cccccc', '--color-text-muted':'#666666',
}[name] || '') });

global.window = {
  location: { protocol: 'http:', search: '?tab=map&type=MED&size=3.5g&priced=1', pathname: '/', origin: 'http://127.0.0.1:8000' },
  localStorage: { getItem() { return null; }, setItem() {} },
  history: {
    replaceState(_state, _title, url) {
      const next = new URL(url, 'http://127.0.0.1:8000');
      window.location.pathname = next.pathname;
      window.location.search = next.search;
    },
    pushState(_state, _title, url) {
      const next = new URL(url, 'http://127.0.0.1:8000');
      window.location.pathname = next.pathname;
      window.location.search = next.search;
    },
  },
  matchMedia: () => ({ matches: false }),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame: (fn) => { fn(); },
  addEventListener() {},
  removeEventListener() {},
  prompt() {},
  URLSearchParams,
  URL,
  Chart: undefined,
  L: undefined,
  fetch: global.fetch,
  navigator: global.navigator,
};
global.requestAnimationFrame = window.requestAnimationFrame;
global.Blob = class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
global.URL.createObjectURL = () => 'blob:fake';
global.URL.revokeObjectURL = () => {};

global.console = console;

['js/runtime-helpers.js', 'js/status-helpers.js', 'app.js'].forEach((relativePath) => {
  const script = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
  vm.runInThisContext(script, { filename: relativePath });
});

setTimeout(() => {
  try {
    const restoredTab = tabs.find((tab) => tab.classList.contains('active'))?.dataset.tab || null;
    const restoredTheme = document.documentElement.attributes['data-theme'] || null;
    const restoredSearch = window.location.search;

    tabs[1].click();
    typeButtons[2].click();
    sizeButtons[1].click();
    elementsById.pricedOnlyBtn.click();
    elementsById.clearFiltersBtn.click();
    themeToggleBtn.click();
    sortHeaders.find((h) => h.dataset.sort === 'price').click();
    elementsById.historyTypeSelect.listeners.change?.[0]?.({ type: 'change', target: { value: 'MED' } });
    elementsById.historySizeSelect.listeners.change?.[0]?.({ type: 'change', target: { value: '3.5g' } });
    tabs[3].click();
    elementsById.refreshBtn.click();
    elementsById.syncBtn.click();
    elementsById.scrapeBtn.click();

    setTimeout(() => {
      const renderedMarkup = [
        elementsById.spotlightCard.innerHTML,
        elementsById.compareGrid.innerHTML,
        elementsById.tableBody.innerHTML,
        elementsById.dispensaryGrid.innerHTML,
        elementsById.mapList.innerHTML,
      ].join(' ');
      const hasFalseZeroPrice = /\$0(?:\.00)?(?!\d)/.test(renderedMarkup);
      const hasSeedCopy = [elementsById.lastUpdated.textContent, elementsById.dataFreshness.textContent, elementsById.statusMeta.textContent].some((value) => /Seed/i.test(value));
      const summary = {
        fetchCalls: fetchCalls.map(([u]) => u),
        restoredTab,
        restoredTheme,
        restoredSearch,
        alertHidden: elementsById.appAlert.hidden,
        resultCount: elementsById.resultCount.textContent,
        lastUpdated: elementsById.lastUpdated.textContent,
        priceCoverage: elementsById.priceCoverage.textContent,
        dataFreshness: elementsById.dataFreshness.textContent,
        statusMeta: elementsById.statusMeta.textContent,
        filterSummaryHidden: elementsById.filterSummary.hidden,
        spotlightLength: elementsById.spotlightCard.innerHTML.length,
        compareGridLength: elementsById.compareGrid.innerHTML.length,
        tableRowsLength: elementsById.tableBody.innerHTML.length,
        dispensaryGridLength: elementsById.dispensaryGrid.innerHTML.length,
        mapListLength: elementsById.mapList.innerHTML.length,
        mapHTMLLength: elementsById.mapContainer.innerHTML.length,
        mapSummary: elementsById.mapSummary.textContent,
        currentSearch: window.location.search,
        currentTheme: document.documentElement.attributes['data-theme'] || null,
        hasFalseZeroPrice,
        hasSeedCopy,
        renderedNoPriceLabel: renderedMarkup.includes('No price'),
      };
      if (restoredTab !== 'map') throw new Error(`Expected shared tab restore to land on map, received ${restoredTab}`);
      if (!hasSeedCopy) throw new Error('Expected seed/bootstrap provenance copy to be rendered.');
      if (hasFalseZeroPrice) throw new Error('Null prices rendered as $0.');
      if (!summary.renderedNoPriceLabel) throw new Error('Expected unavailable pricing to render with a no-price label.');
      if (!/dispensaries mapped/.test(summary.mapSummary)) throw new Error(`Expected irregular dispensary plural copy, received "${summary.mapSummary}"`);
      if (summary.currentTheme !== 'light') throw new Error(`Expected theme toggle to switch to light mode, received ${summary.currentTheme}`);
      console.log(JSON.stringify(summary, null, 2));
      process.exit(0);
    }, 50);
  } catch (err) {
    console.error('SMOKE_ERROR', err);
    process.exit(1);
  }
}, 50);
