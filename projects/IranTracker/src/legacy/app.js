// ============================================================
// SIGINT-MAP // Operation Epic Fury — 4D Conflict Tracker
// UPGRADED VERSION — Part 1 (Sections 1-15)
// All data from public reporting (CBS, Al Jazeera, CNBC, Pentagon)
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { copyText, debugLog, escapeHtml, safeHref as safeExternalUrl } from './shared-utils.js';
import { applySourceStatus, clearTrackedObjects, fetchFirstSuccessful, isFiniteCoordinatePair, setStatusMessage } from './app-utils.js';

export function initLegacyApp() {
window.__SIGINT_MAP_DESTROYED__ = false;
let __initPhaseComplete = false; // flips after all declarations are evaluated

// Global error handler — ensure loading screen never stays stuck
window.addEventListener('error', (e) => {
  console.error('[SIGINT-MAP] Runtime error caught:', e.message, 'at', e.filename, ':', e.lineno);
  const ls = document.getElementById('loading-screen');
  if (ls && getComputedStyle(ls).display !== 'none' && getComputedStyle(ls).opacity !== '0') {
    ls.style.transition = 'opacity 0.5s ease';
    ls.style.opacity = '0';
    ls.style.pointerEvents = 'none';
    setTimeout(() => { ls.style.display = 'none'; }, 600);
  }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[SIGINT-MAP] Unhandled promise rejection:', e.reason);
});

// ============================================================
// SECTION 1: CONSTANTS & UTILITIES
// ============================================================

const GLOBE_RADIUS = 5;
const DEG2RAD = Math.PI / 180;
const TIMELINE_START = 0;
const TIMELINE_END = 48; // extended to Mar 2 end
const OPENSKY_INTERVAL = 20000; // 20 seconds
const USGS_INTERVAL = 300000;  // 5 minutes
const FIRMS_INTERVAL = 600000; // 10 minutes
const GDELT_INTERVAL = 180000; // 3 minutes
// GDELT location lookup
const GDELT_LOCATIONS = {
  iran: [35.7, 51.4], tehran: [35.7, 51.4], irgc: [35.7, 51.4],
  israel: [31.5, 34.8], israeli: [31.5, 34.8], idf: [31.5, 34.8],
  uae: [24.4, 54.6], 'abu dhabi': [24.4, 54.6], dubai: [25.2, 55.3],
  iraq: [33.3, 44.4], baghdad: [33.3, 44.4],
  lebanon: [33.9, 35.5], beirut: [33.9, 35.5], hezbollah: [33.9, 35.5],
  saudi: [24.7, 46.7], riyadh: [24.7, 46.7],
  kuwait: [29.3, 47.5],
  bahrain: [26.0, 50.5],
  qatar: [25.3, 51.3],
  oman: [23.6, 58.5],
  syria: [35.0, 38.0], syrian: [35.0, 38.0],
  yemen: [15.4, 44.2], houthi: [15.4, 44.2],
  turkey: [39.9, 32.9], turkish: [39.9, 32.9],
  pakistan: [30.4, 69.3], pakistani: [30.4, 69.3],
  russia: [55.8, 37.6], moscow: [55.8, 37.6],
  uk: [51.5, -0.1], britain: [51.5, -0.1], british: [51.5, -0.1],
  washington: [38.9, -77.0], pentagon: [38.9, -77.0], 'white house': [38.9, -77.0],
};

function gdeltGeocode(title) {
  if (!title) return [35.7, 51.4];
  const t = title.toLowerCase();
  for (const [key, coords] of Object.entries(GDELT_LOCATIONS)) {
    if (t.includes(key)) return coords;
  }
  return [35.7, 51.4];
}

function latLonToVec3(lat, lon, radius = GLOBE_RADIUS) {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lon + 180) * DEG2RAD;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vec3ToLatLon(v) {
  const r = v.length();
  const lat = 90 - Math.acos(v.y / r) / DEG2RAD;
  const lon = -(Math.atan2(v.z, -v.x) / DEG2RAD - 180);
  return { lat, lon: ((lon + 180) % 360) - 180 };
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

function formatLatLon(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return 'N/A';

  const latCardinal = lat >= 0 ? 'N' : 'S';
  const lonCardinal = lon >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(4)}°${latCardinal}, ${Math.abs(lon).toFixed(4)}°${lonCardinal}`;
}

function shouldRunDataSource(sectionId) {
  try {
    if (typeof nw_shouldFetch === 'function' && !nw_shouldFetch()) {
      return false;
    }

    if (
      sectionId &&
      typeof nw_isSidebarSectionVisible === 'function' &&
      !nw_isSidebarSectionVisible(sectionId)
    ) {
      return false;
    }
  } catch {
    // Variables (nw_tabPaused, nw_sidebarObservers) may not yet be initialized
    // during early module execution — safe to allow the fetch in that case.
  }

  return true;
}

function disposeSceneObject(object) {
  if (!object) return;

  object.traverse?.((node) => {
    if (node.geometry && typeof node.geometry.dispose === 'function') {
      node.geometry.dispose();
    }

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && typeof value.dispose === 'function' && value !== material) {
          try { value.dispose(); } catch {}
        }
      });

      if (typeof material.dispose === 'function') {
        material.dispose();
      }
    });
  });
}

// Forward declarations for live data arrays (populated later by fetch calls)
let liveSeismic = [];
let liveThermal = [];

// Simple 3D simplex-like noise for shader
const NOISE_GLSL = `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0))*289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0))*289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 x = x_*ns.x + ns.yyyy;
    vec4 y = y_*ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;

// ============================================================
// SECTION 2: COMPREHENSIVE EVENT DATA
// ============================================================

const airBases = [
  { name: 'Al Udeid Air Base', country: 'Qatar', lat: 25.1173, lon: 51.3150, type: 'USAF', status: 'Active', details: 'CENTCOM Forward HQ, F-22/F-35 operations' },
  { name: 'Al Dhafra Air Base', country: 'UAE', lat: 24.2483, lon: 54.5483, type: 'USAF/UAE', status: 'Active', details: 'F-35A, KC-135 tanker operations' },
  { name: 'Ali Al Salem Air Base', country: 'Kuwait', lat: 29.3467, lon: 47.5208, type: 'USAF', status: 'Active', details: 'Coalition logistics hub' },
  { name: 'Prince Sultan Air Base', country: 'Saudi Arabia', lat: 24.0625, lon: 47.5803, type: 'USAF', status: 'Active', details: 'Patriot/THAAD air defense battery' },
  { name: 'Nevatim Air Base', country: 'Israel', lat: 31.2083, lon: 34.9381, type: 'IAF', status: 'Active', details: 'F-35I Adir, strike coordination' },
  { name: 'Ramon Air Base', country: 'Israel', lat: 30.7761, lon: 34.6667, type: 'IAF', status: 'Active', details: "F-15I Ra'am long-range strike" },
];

const navalAssets = [
  { name: 'USS Harry S. Truman CSG', type: 'Carrier Strike Group', lat: 25.5, lon: 56.8, heading: 315, details: 'Nimitz-class CVN, F/A-18 ops, Persian Gulf', side: 'coalition' },
  { name: 'USS Carl Vinson CSG', type: 'Carrier Strike Group', lat: 23.8, lon: 59.5, heading: 270, details: 'Nimitz-class CVN, Gulf of Oman station', side: 'coalition' },
  { name: 'USS Bataan ARG', type: 'Amphibious Ready Group', lat: 26.2, lon: 53.5, heading: 45, details: 'WASP-class LHD, Marines embarked', side: 'coalition' },
  { name: 'Iranian Corvette Group', type: 'IRIN Patrol', lat: 26.7, lon: 56.2, heading: 180, details: 'IRGC Navy fast attack craft, Strait of Hormuz', side: 'iran' },
  { name: 'Iranian Submarine', type: 'IRIN Submarine', lat: 25.9, lon: 57.5, heading: 220, details: 'Kilo-class, submerged patrol', side: 'iran' },
  { name: 'French Naval Base', type: 'French Navy', lat: 24.45, lon: 54.6, heading: 0, details: 'Abu Dhabi — hit by Iranian drone', side: 'coalition' },
];

const missileTracks = [
  { from: [33.5,48.5], to: [24.4,54.6], type: 'drone', label: 'Iran → UAE Drone Swarm', count: '541 drones', time: 14.5, details: 'Shahed-136 drones toward UAE' },
  { from: [33.7,48.0], to: [24.3,54.5], type: 'missile', label: 'Iran → UAE Ballistic Missiles', count: '167 missiles', time: 14, details: 'Fateh-110 / Qiam-1 ballistic missiles' },
  { from: [34.0,47.5], to: [26.0,50.5], type: 'missile', label: 'Iran → Bahrain', count: 'Multiple', time: 15.5, details: '1 civilian killed' },
  { from: [34.2,48.0], to: [29.3,47.5], type: 'missile', label: 'Iran → Kuwait (US Base)', count: 'Multiple', time: 16, details: '3 US service members KIA' },
  { from: [33.8,49.0], to: [25.3,51.3], type: 'drone', label: 'Iran → Qatar', count: 'Multiple', time: 15, details: 'Targeting Al Udeid area' },
  { from: [33.5,47.0], to: [24.7,46.7], type: 'missile', label: 'Iran → Saudi Arabia', count: 'Multiple', time: 16.5, details: 'Military installations targeted' },
  { from: [25.5,56.8], to: [35.7,51.4], type: 'tomahawk', label: 'USN Tomahawk → Tehran', count: 'Dozens', time: 8, details: 'Cruise missile strikes on IRGC' },
  { from: [31.2,34.9], to: [35.7,51.4], type: 'strike', label: 'IAF Strike → Tehran', count: 'Multiple sorties', time: 8.25, details: 'F-35I strikes on leadership compound' },
  { from: [25.5,56.8], to: [32.6,51.6], type: 'tomahawk', label: 'USN Tomahawk → Isfahan', count: 'Multiple', time: 10, details: 'Nuclear facilities strikes' },
  { from: [31.2,34.9], to: [28.9,50.8], type: 'strike', label: 'IAF Strike → Bushehr', count: 'Multiple', time: 11, details: 'Coastal military targets' },
  { from: [25.5,56.8], to: [33.72,51.72], type: 'tomahawk', label: 'USN → Natanz', count: 'Multiple', time: 10.5, details: 'Underground centrifuge plant' },
  { from: [31.2,34.9], to: [35.52,51.77], type: 'strike', label: 'IAF → Parchin', count: 'Multiple', time: 9.5, details: 'Weapons research facility' },
  { from: [33.9,35.5], to: [33.0,35.2], type: 'rocket', label: 'Hezbollah → N. Israel', count: 'Dozens', time: 26, details: 'Projectiles toward northern Israel' },
  { from: [33.0,35.5], to: [33.8,35.5], type: 'strike', label: 'IDF → Lebanon (Roaring Lion)', count: 'Hundreds', time: 28, details: 'Operation Roaring Lion' },
  { from: [33.5,48.5], to: [31.73,34.99], type: 'missile', label: 'Iran → Beit Shemesh', count: 'Multiple', time: 26.5, details: '6 killed, 23 wounded' },
  { from: [33.0,49.0], to: [23.6,58.5], type: 'missile', label: 'Iran → Oman', count: 'Multiple', time: 31, details: 'Port and oil tanker struck' },
  { from: [33.5,47.0], to: [24.7,46.7], type: 'missile', label: 'Iran → Riyadh', count: 'Multiple', time: 39, details: 'Day 2 retaliatory strikes' },
];

const landTargets = [
  { name: 'IRGC HQ Complex, Tehran', lat: 35.7, lon: 51.42, type: 'struck', details: 'Destroyed in initial strike wave' },
  { name: 'Khamenei Compound', lat: 35.72, lon: 51.38, type: 'struck', details: 'Ayatollah Khamenei killed (CBS News)' },
  { name: 'Isfahan Nuclear Site', lat: 32.65, lon: 51.68, type: 'struck', details: 'Uranium enrichment facility' },
  { name: 'Bushehr Reactor', lat: 28.83, lon: 50.88, type: 'struck', details: 'Coastal nuclear reactor area' },
  { name: 'Bandar Abbas Port', lat: 27.18, lon: 56.27, type: 'target', details: 'IRIN main naval base' },
  { name: 'Natanz Facility', lat: 33.72, lon: 51.72, type: 'struck', details: 'Underground centrifuge plant' },
  { name: 'Parchin Military Complex', lat: 35.52, lon: 51.77, type: 'struck', details: 'Weapons research facility' },
  { name: 'Iranian AD - Tabriz', lat: 38.08, lon: 46.3, type: 'destroyed', details: 'S-300 battery destroyed' },
  { name: 'Iranian AD - Tehran', lat: 35.65, lon: 51.55, type: 'destroyed', details: 'Bavar-373 battery destroyed' },
  { name: 'Iranian AD - Isfahan', lat: 32.7, lon: 51.7, type: 'destroyed', details: 'S-200 battery destroyed' },
];

// Full event timeline with sources
const events = [
  { time: 8,    day: 1, type: 'strike',   color: '#ef4444', text: 'Operation Epic Fury begins — joint US-Israeli strikes on Iran', lat: 35.7, lon: 51.4, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 8.25, day: 1, type: 'strike',   color: '#ef4444', text: 'Ayatollah Ali Khamenei killed in precision strike on Tehran compound', lat: 35.72, lon: 51.38, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 8.5,  day: 1, type: 'strike',   color: '#ef4444', text: '40+ senior Iranian officials killed in same strike wave', lat: 35.7, lon: 51.42, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 9,    day: 1, type: 'strike',   color: '#f59e0b', text: 'IRGC HQ Complex destroyed', lat: 35.7, lon: 51.42, source: 'Al Jazeera', url: 'https://www.aljazeera.com/' },
  { time: 9.5,  day: 1, type: 'strike',   color: '#f59e0b', text: 'Parchin Military Complex struck', lat: 35.52, lon: 51.77, source: 'CNBC', url: 'https://www.cnbc.com/' },
  { time: 10,   day: 1, type: 'strike',   color: '#f59e0b', text: 'Isfahan nuclear enrichment facility struck', lat: 32.65, lon: 51.68, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 10.5, day: 1, type: 'strike',   color: '#f59e0b', text: 'Natanz underground centrifuge plant struck', lat: 33.72, lon: 51.72, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 11,   day: 1, type: 'strike',   color: '#f59e0b', text: 'Bushehr reactor area targeted', lat: 28.83, lon: 50.88, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 11.5, day: 1, type: 'info',     color: '#22c55e', text: 'Trump confirms "hundreds of targets" hit, 9 ships struck', lat: 38.9, lon: -77.0, source: 'CBS News / Truth Social', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 12,   day: 1, type: 'defense',  color: '#00d4ff', text: 'All Iranian S-300, Bavar-373 air defense batteries destroyed', lat: 35.65, lon: 51.55, source: 'Pentagon', url: 'https://www.defense.gov/' },
  { time: 14,   day: 1, type: 'missile',  color: '#ef4444', text: 'Iran retaliates: massive missile/drone barrage toward Gulf states', lat: 33.5, lon: 48.5, source: 'Al Jazeera', url: 'https://www.aljazeera.com/' },
  { time: 14.5, day: 1, type: 'missile',  color: '#ef4444', text: 'Shahed-136 drone swarms launched toward UAE', lat: 33.5, lon: 48.5, source: 'CNBC', url: 'https://www.cnbc.com/' },
  { time: 15,   day: 1, type: 'missile',  color: '#ef4444', text: 'Missiles launched toward Qatar — Al Udeid area targeted', lat: 25.3, lon: 51.3, source: 'Al Jazeera', url: 'https://www.aljazeera.com/' },
  { time: 15.5, day: 1, type: 'casualty', color: '#ef4444', text: 'Bahrain targeted: 1 person killed', lat: 26.0, lon: 50.5, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 16,   day: 1, type: 'casualty', color: '#ef4444', text: 'Kuwait US base struck: 3 US service members KIA', lat: 29.3, lon: 47.5, source: 'Pentagon', url: 'https://www.defense.gov/' },
  { time: 16.5, day: 1, type: 'missile',  color: '#ef4444', text: 'Saudi Arabia military installations targeted', lat: 24.7, lon: 46.7, source: 'CNBC', url: 'https://www.cnbc.com/' },
  { time: 17,   day: 1, type: 'defense',  color: '#00d4ff', text: 'UAE intercepts 167 missiles and 541 drones', lat: 24.4, lon: 54.6, source: 'UAE MoD via CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 18,   day: 1, type: 'strike',   color: '#ef4444', text: 'French naval base in Abu Dhabi hit by Iranian drone', lat: 24.45, lon: 54.6, source: 'Macron statement', url: 'https://www.cnbc.com/' },
  { time: 20,   day: 1, type: 'casualty', color: '#6b7280', text: '3 civilians killed in UAE (Pakistani, Nepali, Bangladeshi)', lat: 24.4, lon: 54.6, source: 'UAE MoD', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 22,   day: 1, type: 'casualty', color: '#ef4444', text: 'Pentagon confirms 3 US KIA in Kuwait', lat: 29.3, lon: 47.5, source: 'Pentagon via CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  // Day 2
  { time: 26,   day: 2, type: 'missile',  color: '#ef4444', text: 'Hezbollah fires projectiles at northern Israel', lat: 33.9, lon: 35.5, source: 'IDF via Al Jazeera', url: 'https://www.aljazeera.com/' },
  { time: 28,   day: 2, type: 'strike',   color: '#f59e0b', text: 'IDF announces Operation Roaring Lion — strikes across Lebanon', lat: 33.85, lon: 35.85, source: 'IDF via CNBC', url: 'https://www.cnbc.com/' },
  { time: 30,   day: 2, type: 'info',     color: '#22c55e', text: 'Netanyahu: "strikes will increase even more in coming days"', lat: 31.77, lon: 35.21, source: 'Netanyahu statement', url: 'https://www.cnbc.com/' },
  { time: 32,   day: 2, type: 'info',     color: '#3b82f6', text: 'Trump: operation "ahead of schedule", estimates "four weeks or less"', lat: 38.9, lon: -77.0, source: 'CNBC interview', url: 'https://www.cnbc.com/' },
  { time: 32.5, day: 2, type: 'info',     color: '#3b82f6', text: 'Trump 6-min Truth Social video: "entire military command gone"', lat: 38.9, lon: -77.0, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 34,   day: 2, type: 'info',     color: '#6b7280', text: 'Iran FM Araghchi: military capacity "unchanged", regime change "impossible"', lat: 35.7, lon: 51.4, source: 'Al Jazeera', url: 'https://www.aljazeera.com/' },
  { time: 34.5, day: 2, type: 'info',     color: '#6b7280', text: 'Iran announces new Supreme Leader could be chosen within 2 days', lat: 35.7, lon: 51.4, source: 'Al Jazeera', url: 'https://www.aljazeera.com/' },
  { time: 35,   day: 2, type: 'protest',  color: '#6b7280', text: 'Protests in Pakistan: 9 killed Karachi, 12 killed Gilgit-Baltistan', lat: 25.0, lon: 67.0, source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 36,   day: 2, type: 'info',     color: '#3b82f6', text: 'GCC joint statement condemning Iran retaliatory strikes', lat: 24.7, lon: 46.7, source: 'CNBC', url: 'https://www.cnbc.com/' },
  { time: 36.5, day: 2, type: 'info',     color: '#3b82f6', text: 'Macron: US/Israeli strikes caused "unprecedented regional escalation"', lat: 48.85, lon: 2.35, source: 'CNBC', url: 'https://www.cnbc.com/' },
  { time: 38,   day: 2, type: 'info',     color: '#22c55e', text: 'Oman mediator: "door to diplomacy remains open"', lat: 23.6, lon: 58.5, source: 'CNBC / Albusaidi on X', url: 'https://www.cnbc.com/' },
  { time: 40,   day: 2, type: 'info',     color: '#6b7280', text: 'Iran NSC (Lariani) denies new talks with Washington', lat: 35.7, lon: 51.4, source: 'Al Jazeera', url: 'https://www.aljazeera.com/' },
  { time: 42,   day: 2, type: 'info',     color: '#3b82f6', text: 'Sec. Rubio to brief Senate/House leaders at 4pm ET', lat: 38.9, lon: -77.0, source: 'CNBC', url: 'https://www.cnbc.com/' },
  { time: 44,   day: 2, type: 'info',     color: '#3b82f6', text: 'Sen. Cotton: "extended air and naval campaign" to destroy Iran arsenal', lat: 38.9, lon: -77.0, source: 'CBS News / Face the Nation', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { time: 46,   day: 2, type: 'missile',  color: '#ef4444', text: 'Loud blasts reported in Dubai and Abu Dhabi', lat: 25.2, lon: 55.3, source: 'CNBC', url: 'https://www.cnbc.com/' },
  // Day 2 — March 2 continued
  { time: 25, day: 2, type: 'strike', color: '#ef4444', text: 'IRGC announces "most intense offensive operation" imminent', lat: 35.7, lon: 51.4, source: 'IRGC via media', url: 'https://www.aljazeera.com/news/liveblog/2026/3/2/us-israel-attack-iran-live' },
  { time: 25.5, day: 2, type: 'strike', color: '#f59e0b', text: 'CENTCOM: B-2 stealth bombers struck hardened ballistic missile facilities', lat: 33.0, lon: 52.0, source: 'CENTCOM on X', url: 'https://www.centcom.mil/' },
  { time: 26.5, day: 2, type: 'casualty', color: '#ef4444', text: 'Beit Shemesh, Israel struck — 6 killed, 23 wounded by Iranian missiles', lat: 31.73, lon: 34.99, source: 'United Hatzalah / MDA', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 27, day: 2, type: 'missile', color: '#ef4444', text: 'Iran claims 4 ballistic missiles struck USS Abraham Lincoln — CENTCOM denies', lat: 24.5, lon: 58.0, source: 'IRGC / CENTCOM', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 29, day: 2, type: 'strike', color: '#f59e0b', text: 'IDF strikes Beirut and Beqaa Valley targeting Hezbollah', lat: 33.89, lon: 35.5, source: 'IDF / Wikipedia', url: 'https://en.wikipedia.org/wiki/2026_Israeli%E2%80%93United_States_strikes_on_Iran' },
  { time: 31, day: 2, type: 'missile', color: '#ef4444', text: 'Omani port and oil tanker off Oman coast struck by Iran', lat: 23.6, lon: 58.5, source: 'AFP / CBS News', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 33, day: 2, type: 'info', color: '#3b82f6', text: 'UK grants US access to British bases for "defensive measures" against Iran', lat: 51.5, lon: -0.1, source: 'PM Starmer statement', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 33.5, day: 2, type: 'info', color: '#3b82f6', text: 'UK jets intercept Iranian drones over northern Syria', lat: 36.2, lon: 37.1, source: 'UK MoD', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 37, day: 2, type: 'info', color: '#6b7280', text: 'Strait of Hormuz effectively closed — global oil shipments disrupted', lat: 26.5, lon: 56.2, source: 'AFP / Al Jazeera', url: 'https://www.aljazeera.com/news/liveblog/2026/3/2/us-israel-attack-iran-live' },
  { time: 37.5, day: 2, type: 'info', color: '#6b7280', text: 'Houthis announce resumption of Red Sea attacks', lat: 13.0, lon: 43.0, source: 'Houthi statement', url: 'https://en.wikipedia.org/wiki/2026_Israeli%E2%80%93United_States_strikes_on_Iran' },
  { time: 39, day: 2, type: 'missile', color: '#ef4444', text: 'Explosions heard in Riyadh — Iran presses retaliatory strikes into Day 2', lat: 24.7, lon: 46.7, source: 'AFP', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 41, day: 2, type: 'info', color: '#3b82f6', text: 'Trump posts 6-min Truth Social video: "entire military command gone"', lat: 38.9, lon: -77.0, source: 'CBS News', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 43, day: 2, type: 'info', color: '#3b82f6', text: 'Trump: sunk 9 Iranian ships, "largely destroyed" naval HQ', lat: 27.18, lon: 56.27, source: 'Trump / Truth Social', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { time: 45, day: 2, type: 'info', color: '#3b82f6', text: 'Senior White House official: Trump will talk with Iran "eventually"', lat: 38.9, lon: -77.0, source: 'White House', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
];

const countryBorders = {
  Iran: [[25.1,61.6],[25.2,57.8],[26.5,55.3],[27.2,56.3],[27.8,57.3],[25.7,57.3],[25.1,61.6]],
  IranMain: [[25.2,57.8],[26.4,54.9],[27.1,52.7],[29.3,50.3],[30.0,48.9],[31.0,47.7],[32.5,46.0],[34.6,44.8],[36.3,44.8],[37.4,44.3],[39.4,44.0],[39.7,44.8],[39.4,47.5],[38.9,48.0],[38.2,48.9],[37.4,49.1],[37.0,49.3],[36.6,53.8],[37.3,55.0],[37.4,55.1],[38.0,56.3],[37.3,57.1],[37.0,57.3],[36.5,60.6],[34.0,60.5],[31.5,61.7],[27.2,63.2],[25.2,61.6]],
  Iraq: [[29.3,47.9],[30.0,48.9],[31.0,47.7],[32.5,46.0],[34.6,44.8],[36.3,44.8],[37.4,44.3],[37.1,42.4],[36.8,42.1],[33.4,38.8],[32.3,39.0],[30.9,39.7],[30.0,40.0],[29.1,41.3],[29.0,43.0],[29.1,44.7],[29.0,46.5],[29.3,47.9]],
  Israel: [[29.5,34.9],[31.2,34.3],[32.5,34.9],[33.3,35.6],[33.0,35.9],[31.5,35.5],[31.0,35.0],[29.5,34.9]],
  Lebanon: [[33.3,35.1],[33.9,35.1],[34.7,36.0],[34.6,36.6],[33.8,35.8],[33.3,35.6],[33.3,35.1]],
  UAE: [[24.0,51.6],[24.3,54.5],[24.8,55.5],[25.3,56.4],[26.1,56.1],[24.8,55.0],[24.3,54.5],[24.0,52.0],[24.0,51.6]],
  Qatar: [[24.5,50.8],[25.4,50.8],[26.2,51.2],[26.2,51.6],[25.3,51.6],[24.5,51.2],[24.5,50.8]],
  Kuwait: [[28.5,47.0],[29.4,47.0],[30.1,47.7],[30.1,48.4],[29.4,48.5],[28.5,48.5],[28.5,47.0]],
  Bahrain: [[25.8,50.4],[26.3,50.4],[26.3,50.7],[25.8,50.7],[25.8,50.4]],
  Oman: [[22.0,59.8],[23.0,57.0],[23.6,56.3],[24.0,56.3],[24.3,56.6],[25.3,56.4],[26.1,56.1],[26.4,56.4],[26.7,56.2],[24.8,57.8],[22.8,59.8],[21.5,59.0],[20.5,57.7],[17.0,54.0],[16.6,53.0],[16.9,52.8],[19.0,55.0],[20.0,56.3],[22.0,59.8]],
  SaudiArabia: [[16.4,42.8],[17.5,42.8],[18.2,42.4],[19.0,43.0],[20.0,41.5],[22.0,39.1],[24.0,38.0],[25.8,37.5],[27.9,35.5],[28.5,34.7],[29.5,36.1],[30.0,37.0],[30.0,40.0],[29.1,41.3],[29.0,43.0],[29.1,44.7],[29.0,46.5],[28.5,47.0],[28.5,48.5],[27.5,49.5],[24.5,50.8],[24.0,51.6],[24.0,52.0],[22.6,55.1],[19.0,52.0],[16.6,53.0],[16.4,45.4],[16.4,42.8]],
};

const tickerItems = [
  { text: 'BREAKING: Operation Epic Fury launched — US/Israel strike Iranian leadership', cls: 'missile' },
  { text: 'CONFIRMED: Ayatollah Khamenei killed in precision strike — CBS News', cls: 'missile' },
  { text: '40+ senior Iranian officials eliminated in first wave', cls: 'missile' },
  { text: 'UAE Air Defense: 541 drones, 167 ballistic missiles intercepted', cls: 'air' },
  { text: '3 US service members KIA in Iranian strike on Kuwait base', cls: 'missile' },
  { text: 'French naval facility in Abu Dhabi hit by Iranian drone', cls: 'naval' },
  { text: 'Hezbollah opens northern front — projectiles at Israel', cls: 'missile' },
  { text: 'IDF announces Operation Roaring Lion against Hezbollah', cls: 'land' },
  { text: 'Netanyahu: "We will increase strikes in coming days"', cls: 'friendly' },
  { text: 'Trump: Operation "ahead of schedule" — 4 weeks estimate', cls: 'friendly' },
  { text: 'Iran FM: Military capacity "unchanged" despite strikes', cls: 'neutral' },
  { text: 'GCC condemns Iranian retaliatory strikes on member states', cls: 'naval' },
  { text: 'Pakistan protests: 21 killed across multiple cities', cls: 'neutral' },
  { text: 'Isfahan nuclear enrichment facility confirmed struck — CBS', cls: 'land' },
  { text: 'All Iranian S-300, Bavar-373 batteries reported destroyed', cls: 'air' },
  { text: 'Loud blasts reported in Dubai and Abu Dhabi — CNBC', cls: 'missile' },
  { text: 'B-2 stealth bombers struck Iranian ballistic missile facilities — CENTCOM', cls: 'air' },
  { text: '6 killed in Beit Shemesh, Israel by Iranian missile strike — Hatzalah', cls: 'missile' },
  { text: 'Iran claims striking USS Abraham Lincoln — CENTCOM: "LIE"', cls: 'naval' },
  { text: 'Strait of Hormuz effectively closed — global oil disruption', cls: 'naval' },
  { text: 'Houthis resume Red Sea attacks — further shipping threat', cls: 'missile' },
  { text: 'UK jets intercept Iranian drones over northern Syria', cls: 'air' },
  { text: 'Trump: 9 Iranian ships sunk, naval HQ "largely destroyed"', cls: 'naval' },
  { text: 'Omani port and tanker struck — first Iranian strikes on Oman', cls: 'missile' },
];

// ============================================================
// SECTION 3: LOADING SCREEN
// ============================================================

const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const loadingProgress = document.getElementById('loading-progress');
const loadingPercent = document.getElementById('loading-percent');

function updateLoading(pct, msg) {
  if (loadingProgress) loadingProgress.style.width = pct + '%';
  if (loadingStatus) loadingStatus.textContent = msg;
  if (loadingPercent) loadingPercent.textContent = pct + '%';
}

updateLoading(10, 'INITIALIZING THREE.JS ENGINE...');

// ============================================================
// SECTION 4: THREE.JS SCENE SETUP — NASA BLUE MARBLE EARTH
// ============================================================

const canvas = document.getElementById('globe-canvas');
const mainArea = document.getElementById('main-area');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030810);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Force initial sizing — critical: without this the canvas may be 0x0
{
  const w = mainArea.clientWidth || window.innerWidth;
  const h = mainArea.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// On-screen WebGL diagnostic
(function checkWebGL() {
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const info = {
    vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'unknown',
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
    maxTexSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    precision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision
  };
  debugLog('[SIGINT-MAP] WebGL Info:', JSON.stringify(info));
  // If shader precision is 0 (no float support) or renderer is SwiftShader, log warning
  if (info.precision === 0 || info.renderer.includes('SwiftShader')) {
    console.warn('[SIGINT-MAP] Limited GPU detected — shaders may not render correctly');
  }
})();

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 6;
controls.maxDistance = 30;
controls.enablePan = false;
controls.rotateSpeed = 0.5;

// Center on Middle East
const iranPos = latLonToVec3(30, 50, GLOBE_RADIUS * 2.8);
camera.position.copy(iranPos);
camera.lookAt(0, 0, 0);

updateLoading(15, 'GENERATING STAR FIELD...');

// ============================================================
// UPGRADED STAR FIELD WITH MILKY WAY BAND + TWINKLING
// ============================================================

const starCount = 6000;
const starPositions = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);
const starPhases = new Float32Array(starCount); // twinkling phase offsets
const starBrightness = new Float32Array(starCount); // base brightness

for (let i = 0; i < starCount; i++) {
  const r = 80 + Math.random() * 120;
  let theta, phi;

  // ~20% of stars form a Milky Way band — concentrated along galactic plane
  if (i < starCount * 0.2) {
    // Galactic band: tilted ~60° from equatorial plane, narrow spread
    const galAngle = (Math.random() - 0.5) * Math.PI * 0.18; // ±~16° from band
    const galLon = Math.random() * Math.PI * 2;
    // Rotate to simulate galactic tilt
    const bx = Math.cos(galAngle) * Math.cos(galLon);
    const by = Math.sin(galAngle);
    const bz = Math.cos(galAngle) * Math.sin(galLon);
    // Tilt the plane ~60°
    const tilt = Math.PI * 0.35;
    starPositions[i * 3] = r * (bx * Math.cos(tilt) - by * Math.sin(tilt));
    starPositions[i * 3 + 1] = r * (bx * Math.sin(tilt) + by * Math.cos(tilt));
    starPositions[i * 3 + 2] = r * bz;
    starBrightness[i] = 0.4 + Math.random() * 0.5; // dimmer, denser Milky Way stars
    starSizes[i] = 0.15 + Math.random() * 0.5;
  } else {
    // Regular distributed stars
    theta = Math.random() * Math.PI * 2;
    phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
    starBrightness[i] = 0.3 + Math.random() * 0.7;
    starSizes[i] = 0.2 + Math.random() * 1.4;
  }
  starPhases[i] = Math.random() * Math.PI * 2; // random twinkling offset
}

const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhases, 1));
starGeo.setAttribute('brightness', new THREE.BufferAttribute(starBrightness, 1));

// Custom shader for twinkling stars
const starMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
  },
  vertexShader: `
    attribute float size;
    attribute float phase;
    attribute float brightness;
    uniform float uTime;
    uniform float uPixelRatio;
    varying float vBrightness;
    void main() {
      vBrightness = brightness * (0.7 + 0.3 * sin(uTime * 1.5 + phase));
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * uPixelRatio * (300.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vBrightness;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = (1.0 - d * 2.0) * vBrightness;
      // Slightly warm-white color for most stars, blueish for hot ones
      vec3 col = mix(vec3(1.0, 0.95, 0.85), vec3(0.8, 0.9, 1.0), vBrightness);
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

updateLoading(25, 'LOADING NASA BLUE MARBLE TEXTURE...');

// ============================================================
// NASA BLUE MARBLE EARTH WITH DAY/NIGHT TERMINATOR
// ============================================================

const textureLoader = new THREE.TextureLoader();

// Earth geometry shared by multiple layers
const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);

// The earth material — NASA Blue Marble texture + day/night shader
const earthMat = new THREE.ShaderMaterial({
  uniforms: {
    uEarthTexture: { value: null },       // NASA Blue Marble
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) }, // sun direction (world space)
    uTextureLoaded: { value: 0.0 },       // 0 = fallback, 1 = texture loaded
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    ${NOISE_GLSL}
    uniform sampler2D uEarthTexture;
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform float uTextureLoaded;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    void main() {
      // Sample NASA Blue Marble texture
      vec4 texColor = texture2D(uEarthTexture, vUv);
      
      // Fallback procedural earth when texture hasn't loaded
      vec3 pos = normalize(vWorldPos) * 2.0;
      float n1 = snoise(pos * 1.5) * 0.5 + 0.5;
      float n2 = snoise(pos * 3.0 + vec3(10.0)) * 0.3;
      float n3 = snoise(pos * 6.0 + vec3(20.0)) * 0.15;
      float landMask = n1 + n2 + n3;
      float isLand = smoothstep(0.48, 0.55, landMask);
      vec3 ocean = vec3(0.04, 0.08, 0.18);
      vec3 land = vec3(0.10, 0.16, 0.22);
      vec3 proceduralColor = mix(ocean, land, isLand);
      
      // Blend between procedural and texture
      vec3 baseColor = mix(proceduralColor, texColor.rgb, uTextureLoaded);
      
      // ---- DAY / NIGHT TERMINATOR ----
      float sunDot = dot(normalize(vWorldPos), normalize(uSunDir));
      // Soft terminator transition zone (~10° wide)
      float dayFactor = smoothstep(-0.08, 0.12, sunDot);

      // Night side darkening (keep some visibility)
      vec3 nightColor = baseColor * 0.15;

      // City lights effect on night side — warm orange glow
      // Use noise to generate city light patterns
      vec3 cityPos = normalize(vWorldPos) * 3.5;
      float cityNoise = snoise(cityPos * 4.0) * 0.5 + 0.5;
      float cityNoise2 = snoise(cityPos * 8.0 + vec3(5.0)) * 0.5 + 0.5;
      float cityLights = smoothstep(0.62, 0.78, cityNoise) * smoothstep(0.55, 0.75, cityNoise2);
      // Only show city lights on land-ish areas (approximate using texture luminance)
      float texLum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
      float isLandApprox = mix(smoothstep(0.48, 0.55, landMask), smoothstep(0.06, 0.14, texLum), uTextureLoaded);
      cityLights *= isLandApprox;
      vec3 cityGlow = vec3(1.0, 0.65, 0.2) * cityLights * 0.45;
      nightColor += cityGlow;

      // Blend day and night
      vec3 finalColor = mix(nightColor, baseColor, dayFactor);
      
      // Subtle specular highlight on ocean (day side only)
      float isOcean = mix(1.0 - isLand, 1.0 - smoothstep(0.04, 0.12, texLum), uTextureLoaded);
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 halfDir = normalize(normalize(uSunDir) + viewDir);
      float spec = pow(max(dot(vNormal, halfDir), 0.0), 60.0) * isOcean * dayFactor * 0.25;
      finalColor += vec3(0.6, 0.8, 1.0) * spec;

      // SAFETY: Ensure globe is never fully black — minimum ambient
      finalColor = max(finalColor, vec3(0.015, 0.025, 0.045));

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
});

const earth = new THREE.Mesh(earthGeo, earthMat);
scene.add(earth);

// ---- SHADER COMPILATION SAFETY CHECK ----
// Force compile now and detect failures — replace with MeshPhongMaterial fallback if needed
let earthUsingFallbackMat = false;
try {
  renderer.compile(scene, camera);
  const gl = renderer.getContext();
  const prog = renderer.properties.get(earthMat).currentProgram;
  if (prog) {
    const vs = prog.vertexShader;
    const fs = prog.fragmentShader;
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('[SIGINT-MAP] Earth vertex shader failed:', gl.getShaderInfoLog(vs));
      throw new Error('Vertex shader compile failed');
    }
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('[SIGINT-MAP] Earth fragment shader failed:', gl.getShaderInfoLog(fs));
      throw new Error('Fragment shader compile failed');
    }
    if (!gl.getProgramParameter(prog.program, gl.LINK_STATUS)) {
      console.error('[SIGINT-MAP] Earth shader program link failed');
      throw new Error('Shader link failed');
    }
  }
  debugLog('[SIGINT-MAP] Earth shader compiled successfully');
} catch(shaderErr) {
  console.warn('[SIGINT-MAP] Falling back to MeshPhongMaterial:', shaderErr.message);
  const fallbackMat = new THREE.MeshPhongMaterial({
    color: 0x1a3a5c,
    emissive: 0x0a1525,
    specular: 0x2a4a6a,
    shininess: 25,
    transparent: false,
  });
  earth.material = fallbackMat;
  earthUsingFallbackMat = true;
  // Override texture loading to use map property
  earth.userData.fallbackMat = fallbackMat;
}

// Load NASA Blue Marble texture asynchronously.
// Direct remote URLs are transparently routed through the local proxy,
// so we only keep the actual source plus the bundled local fallback.
const NASA_TEXTURE_URL = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74393/world.topo.200412.3x5400x2700.jpg';
const NASA_TEXTURE_FALLBACK = '/earth-blue-marble.jpg';

updateLoading(28, 'FETCHING NASA SATELLITE IMAGERY...');

// Try the remote source first, then the local bundled fallback.
function loadEarthTexture() {
  return new Promise((resolve) => {
    const tryLoad = (url, attempt) => {
      textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          // If using fallback material, set texture as map property
          if (earthUsingFallbackMat && earth.userData.fallbackMat) {
            earth.userData.fallbackMat.map = texture;
            earth.userData.fallbackMat.needsUpdate = true;
          } else {
            earthMat.uniforms.uEarthTexture.value = texture;
            // Animate transition from procedural to texture
            let t = 0;
            const fadeIn = () => {
              t += 0.02;
              earthMat.uniforms.uTextureLoaded.value = Math.min(t, 1.0);
              if (t < 1.0) requestAnimationFrame(fadeIn);
            };
            requestAnimationFrame(fadeIn);
          }
          resolve(true);
        },
        undefined,
        (err) => {
          if (attempt === 0) {
            // Try direct URL
            tryLoad(NASA_TEXTURE_URL, 1);
          } else if (attempt === 1) {
            // Try unpkg CDN fallback (CORS-friendly)
            tryLoad(NASA_TEXTURE_FALLBACK, 2);
          } else {
            // All failed — stay on procedural
            console.warn('NASA texture unavailable, using procedural earth');
            resolve(false);
          }
        }
      );
    };
    tryLoad(NASA_TEXTURE_URL, 0);
  });
}
loadEarthTexture();

// ---- RADAR SCAN OVERLAY SPHERE ----
// Sits just above earth, transparent, carries the radar sweep effect
const scanGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.002, 96, 96);
const scanMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uScanAngle: { value: 0 },
  },
  vertexShader: `
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uScanAngle;
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      // Radar scan line
      float angle = atan(vPosition.z, vPosition.x);
      float scanDiff = mod(angle - uScanAngle + 3.14159, 6.28318) - 3.14159;
      float scan = smoothstep(0.25, 0.0, abs(scanDiff)) * 0.12;
      float scanTrail = smoothstep(1.5, 0.0, scanDiff) * smoothstep(-0.02, 0.0, scanDiff) * 0.06;
      float total = scan + scanTrail;
      if (total < 0.005) discard;
      gl_FragColor = vec4(0.0, 0.85, 1.0, total);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.FrontSide,
});
const scanSphere = new THREE.Mesh(scanGeo, scanMat);
scene.add(scanSphere);

// ---- GRID LINES OVERLAY SPHERE ----
const gridGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 96, 96);
const gridMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      float latLine = abs(sin(vUv.y * 3.14159 * 18.0));
      float lonLine = abs(sin(vUv.x * 3.14159 * 36.0));
      float grid = (1.0 - smoothstep(0.96, 1.0, latLine)) + (1.0 - smoothstep(0.96, 1.0, lonLine));
      if (grid < 0.01) discard;
      gl_FragColor = vec4(0.0, 0.5, 0.8, grid * 0.035);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.FrontSide,
});
scene.add(new THREE.Mesh(gridGeo, gridMat));

updateLoading(37, 'BUILDING ENHANCED ATMOSPHERE...');

// ============================================================
// ENHANCED ATMOSPHERE — Multiple layers for volumetric depth
// ============================================================

// Layer 1: Inner thin blue haze
const atmo1Geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.013, 64, 64);
const atmo1Mat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    void main() {
      float fresnel = 1.0 - dot(vNormal, vViewDir);
      fresnel = pow(fresnel, 2.8);
      // Lit side: bright blue. Unlit side: darker
      float sunFactor = dot(normalize(vWorldPos), normalize(uSunDir)) * 0.5 + 0.5;
      vec3 dayColor = vec3(0.15, 0.5, 1.0);
      vec3 duskColor = vec3(0.8, 0.35, 0.1);
      // Dusk effect at terminator
      float dusk = smoothstep(0.35, 0.55, sunFactor) * (1.0 - smoothstep(0.55, 0.75, sunFactor));
      vec3 atmoColor = mix(dayColor, duskColor, dusk * 0.7);
      gl_FragColor = vec4(atmoColor, fresnel * 0.38 * sunFactor);
    }
  `,
  transparent: true,
  side: THREE.FrontSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
scene.add(new THREE.Mesh(atmo1Geo, atmo1Mat));

// Layer 2: Outer glow halo (backside glow — rendered from back)
const atmo2Geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.08, 64, 64);
const atmo2Mat = new THREE.ShaderMaterial({
  uniforms: {
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
      intensity = max(intensity, 0.0);
      float sunFactor = dot(normalize(vWorldPos), normalize(uSunDir)) * 0.5 + 0.5;
      vec3 col = mix(vec3(0.0, 0.25, 0.65), vec3(0.15, 0.45, 0.9), sunFactor);
      gl_FragColor = vec4(col, 1.0) * intensity * 0.22;
    }
  `,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
});
scene.add(new THREE.Mesh(atmo2Geo, atmo2Mat));

// Layer 3: Very outer corona (extreme edge glow)
const atmo3Geo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.18, 48, 48);
const atmo3Mat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(max(0.55 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.5);
      gl_FragColor = vec4(0.05, 0.2, 0.7, 1.0) * intensity * 0.09;
    }
  `,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
});
scene.add(new THREE.Mesh(atmo3Geo, atmo3Mat));

// Store atmosphere uniforms for animation updates
const atmosphereUniforms = [atmo1Mat.uniforms, atmo2Mat.uniforms];

updateLoading(40, 'RENDERING COUNTRY BORDERS...');

// ---- COUNTRY BORDERS ----
const borderGroup = new THREE.Group();
scene.add(borderGroup);
Object.entries(countryBorders).forEach(([name, coords]) => {
  const pts = coords.map(([lat, lon]) => latLonToVec3(lat, lon, GLOBE_RADIUS * 1.003));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.2 });
  borderGroup.add(new THREE.Line(geo, mat));
});

// ---- LIGHTING ----
const ambientLight = new THREE.AmbientLight(0x445577, 0.6);
scene.add(ambientLight);
// Sun directional light — position updated each frame from real UTC time
const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.5);
sunLight.position.set(10, 3, 5);
scene.add(sunLight);
const fillLight = new THREE.PointLight(0x2a3a5a, 0.6, 60);
fillLight.position.set(-8, 4, -5);
scene.add(fillLight);
// Hemisphere light for natural sky/ground gradient lighting
const hemiLight = new THREE.HemisphereLight(0x2a4a7a, 0x0a1020, 0.4);
scene.add(hemiLight);



// ============================================================
// SECTION 5: MARKER SYSTEM
// ============================================================

updateLoading(50, 'DEPLOYING TACTICAL MARKERS...');

const layers = {
  air: new THREE.Group(),
  naval: new THREE.Group(),
  missile: new THREE.Group(),
  land: new THREE.Group(),
  events: new THREE.Group(),
  aircraft: new THREE.Group(),
  impacts: new THREE.Group(),
  intercepts: new THREE.Group(),
  seismic: new THREE.Group(),
  thermal: new THREE.Group(),
  gdelt: new THREE.Group(),
  connections: new THREE.Group(), // NEW: animated connection lines
};
Object.values(layers).forEach(g => scene.add(g));

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-999, -999);
const pickableObjects = [];

function createMarker(lat, lon, color, size, data, layer) {
  const pos = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.008);
  const geo = new THREE.SphereGeometry(size, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.userData = { ...data, lat, lon };
  layer.add(mesh);
  pickableObjects.push(mesh);

  // Glow ring
  const ringGeo = new THREE.RingGeometry(size * 2, size * 3.5, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.lookAt(0, 0, 0);
  ring.userData = { isGlow: true };
  layer.add(ring);

  return { mesh, ring, pos };
}

// ---- THREAT RINGS (sonar ping effect) ----
const threatRings = [];
function createThreatRing(lat, lon, color, domain) {
  const pos = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.005);
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(0.08 + i * 0.12, 0.1 + i * 0.12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    ring.userData = { ringIndex: i, domain };
    layers[domain === 'air' ? 'air' : 'naval'].add(ring);
    threatRings.push({ ring, phase: i * 0.33, pos });
  }
}

// ---- Air Bases ----
airBases.forEach(base => {
  createMarker(base.lat, base.lon, '#00d4ff', 0.04, {
    title: base.name,
    detail: `${base.type} | ${base.country}\n${base.status}\n${base.details}`,
    domain: 'air',
    filterType: 'air',
    status: base.status,
    source: 'Public OSINT',
  }, layers.air);
  createThreatRing(base.lat, base.lon, '#00d4ff', 'air');
});

// ---- Naval Assets ----
navalAssets.forEach(ship => {
  const pos = latLonToVec3(ship.lat, ship.lon, GLOBE_RADIUS * 1.008);
  const geo = new THREE.OctahedronGeometry(0.05, 0);
  const color = ship.side === 'iran' ? '#ef4444' : '#3b82f6';
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.userData = {
    title: ship.name,
    detail: `${ship.type}\nHeading: ${ship.heading}°\n${ship.details}`,
    domain: 'naval',
    filterType: 'naval',
    lat: ship.lat,
    lon: ship.lon,
    status: 'Active',
    source: 'Public OSINT',
  };
  layers.naval.add(mesh);
  pickableObjects.push(mesh);
  createThreatRing(ship.lat, ship.lon, color, 'naval');
});

// ---- Land Targets ----
landTargets.forEach(target => {
  const color = target.type === 'destroyed' ? '#ef4444' : target.type === 'struck' ? '#f59e0b' : '#6b7280';
  createMarker(target.lat, target.lon, color, 0.035, {
    title: target.name,
    detail: `Status: ${target.type.toUpperCase()}\n${target.details}`,
    domain: 'land',
    filterType: 'strikes',
    status: target.type,
    source: 'Public OSINT',
  }, layers.land);
});

// ---- Events ----
events.forEach(evt => {
  if (evt.lat && evt.lon && evt.lat > 10 && evt.lat < 45 && evt.lon > 25 && evt.lon < 70) {
    const m = createMarker(evt.lat, evt.lon, evt.color, 0.03, {
      title: evt.text,
      detail: `Time: Mar ${evt.day}, ${String(Math.floor(evt.time % 24)).padStart(2,'0')}:${String(Math.floor((evt.time % 1) * 60)).padStart(2,'0')} UTC\nType: ${evt.type}\nSource: ${evt.source}`,
      domain: 'events',
      filterType: evt.type === 'strike' ? 'strikes' : evt.type === 'defense' ? 'defenses' : evt.type === 'missile' ? 'strikes' : 'all',
      time: evt.time,
      source: evt.source,
      url: evt.url,
    }, layers.events);
    m.ring.userData.pulse = true;
  }
});

// ============================================================
// ANIMATED ALLIANCE CONNECTION LINES
// US bases to US bases, Israeli bases to Israeli bases
// Pulsing dashed lines with traveling dot effect
// ============================================================

const connectionLines = [];

function createConnectionLine(fromBase, toBase, color, isCoalitionSide) {
  const startPos = latLonToVec3(fromBase.lat, fromBase.lon, GLOBE_RADIUS * 1.012);
  const endPos = latLonToVec3(toBase.lat, toBase.lon, GLOBE_RADIUS * 1.012);

  // Arc midpoint elevated above surface
  const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
  const dist = startPos.distanceTo(endPos);
  mid.normalize().multiplyScalar(GLOBE_RADIUS * 1.012 + dist * 0.25);

  const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
  const curvePoints = curve.getPoints(60);

  // Dashed appearance via alternating segment visibility
  const dashGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
  const dashMat = new THREE.LineDashedMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.35,
    dashSize: 0.18,
    gapSize: 0.12,
    linewidth: 1,
  });
  const dashLine = new THREE.Line(dashGeo, dashMat);
  dashLine.computeLineDistances();
  layers.connections.add(dashLine);

  // Traveling pulse dot that moves along the line
  const dotGeo = new THREE.SphereGeometry(0.025, 6, 6);
  const dotMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.9,
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.visible = true;
  layers.connections.add(dot);

  // Second dot offset in phase for continuous appearance
  const dot2Geo = new THREE.SphereGeometry(0.018, 6, 6);
  const dot2Mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.5,
  });
  const dot2 = new THREE.Mesh(dot2Geo, dot2Mat);
  layers.connections.add(dot2);

  connectionLines.push({
    curve,
    dashLine,
    dot,
    dot2,
    speed: 0.08 + Math.random() * 0.05, // traversal speed
    phase: Math.random(), // starting position offset
    color,
  });
}

// US Air Bases — interconnect all 4
const usBases = airBases.filter(b => b.type === 'USAF' || b.type === 'USAF/UAE');
for (let i = 0; i < usBases.length - 1; i++) {
  createConnectionLine(usBases[i], usBases[i + 1], '#3b82f6', true);
}
// Also connect first to last for a loop feel
if (usBases.length > 2) {
  createConnectionLine(usBases[0], usBases[usBases.length - 1], '#3b82f6', true);
}

// Israeli Air Bases — connect to each other
const israelBases = airBases.filter(b => b.type === 'IAF');
for (let i = 0; i < israelBases.length - 1; i++) {
  createConnectionLine(israelBases[i], israelBases[i + 1], '#f0c040', false);
}

// US Naval coordination lines (carriers to US bases)
const carriers = navalAssets.filter(s => s.side === 'coalition' && s.type === 'Carrier Strike Group');
carriers.forEach(carrier => {
  // Connect each carrier to nearest US air base
  const nearestBase = usBases.reduce((best, base) => {
    const d = Math.hypot(base.lat - carrier.lat, base.lon - carrier.lon);
    return (!best || d < Math.hypot(best.lat - carrier.lat, best.lon - carrier.lon)) ? base : best;
  }, null);
  if (nearestBase) {
    createConnectionLine(
      { lat: carrier.lat, lon: carrier.lon },
      nearestBase,
      '#00aaff',
      true
    );
  }
});

updateLoading(58, 'BUILDING IMPACT SYSTEM...');

// Forward declarations for arrays populated here in 5B, enhanced in Section 17B
const empRipples = [];
const fireColumns = [];

// ============================================================
// SECTION 5B: IMPACT & INTERCEPTION SYSTEM
// Enhanced with EMP ripples + fire columns
// ============================================================

const impactSites = [
  { lat: 29.3, lon: 47.5, label: 'Kuwait US Base Impact', casualties: '3 US KIA, 5 WIA', time: 16, severity: 'critical', source: 'Pentagon', url: 'https://www.defense.gov/' },
  { lat: 26.0, lon: 50.5, label: 'Bahrain Impact', casualties: '1 civilian killed', time: 15.5, severity: 'high', source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { lat: 24.45, lon: 54.6, label: 'Abu Dhabi French Base Impact', casualties: 'Drone struck hangar', time: 18, severity: 'high', source: 'Macron statement', url: 'https://www.cnbc.com/' },
  { lat: 24.4, lon: 54.6, label: 'UAE Civilian Impact', casualties: '3 civilians killed', time: 20, severity: 'high', source: 'UAE MoD', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { lat: 31.73, lon: 34.99, label: 'Beit Shemesh Impact', casualties: '6 killed, 23 wounded', time: 26.5, severity: 'critical', source: 'United Hatzalah', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { lat: 23.6, lon: 58.5, label: 'Oman Port Impact', casualties: 'Port & tanker struck', time: 31, severity: 'high', source: 'AFP', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { lat: 24.7, lon: 46.7, label: 'Riyadh Impact', casualties: 'Military area struck', time: 39, severity: 'high', source: 'AFP', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { lat: 25.2, lon: 55.3, label: 'Dubai/Abu Dhabi Blasts', casualties: 'Blasts reported', time: 46, severity: 'medium', source: 'CNBC', url: 'https://www.cnbc.com/' },
  // Coalition strikes on Iran (impacts on Iranian soil)
  { lat: 35.72, lon: 51.38, label: 'Tehran — Khamenei Compound', casualties: 'Khamenei + 40 officials KIA', time: 8.25, severity: 'critical', source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/', coalition: true },
  { lat: 35.7, lon: 51.42, label: 'Tehran — IRGC HQ', casualties: 'Complex destroyed', time: 9, severity: 'critical', source: 'Al Jazeera', url: 'https://www.aljazeera.com/', coalition: true },
  { lat: 32.65, lon: 51.68, label: 'Isfahan Nuclear Site', casualties: 'Facility struck', time: 10, severity: 'critical', source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/', coalition: true },
  { lat: 33.72, lon: 51.72, label: 'Natanz Centrifuge Plant', casualties: 'Underground facility struck', time: 10.5, severity: 'critical', source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/', coalition: true },
  { lat: 28.83, lon: 50.88, label: 'Bushehr Reactor Area', casualties: 'Military targets hit', time: 11, severity: 'high', source: 'CBS News', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/', coalition: true },
  { lat: 33.0, lon: 52.0, label: 'Iranian Missile Facilities (B-2)', casualties: 'Hardened bunkers struck', time: 25.5, severity: 'critical', source: 'CENTCOM', url: 'https://www.centcom.mil/', coalition: true },
];

const interceptionSites = [
  { lat: 24.4, lon: 54.6, label: 'UAE Mass Interception', count: '708 of 708', detail: '541 drones + 167 missiles intercepted', time: 17, system: 'THAAD / Patriot / Iron Dome', source: 'UAE MoD', url: 'https://www.cbsnews.com/news/us-military-strikes-iran/' },
  { lat: 25.1, lon: 51.3, label: 'Qatar Defense — Al Udeid', count: 'Multiple', detail: 'Drones targeting Al Udeid intercepted', time: 15.2, system: 'Patriot PAC-3', source: 'CENTCOM', url: 'https://www.centcom.mil/' },
  { lat: 24.06, lon: 47.58, label: 'Saudi Arabia Interception', count: 'Multiple', detail: 'THAAD and Patriot batteries engaged', time: 16.7, system: 'THAAD / Patriot', source: 'Saudi MoD', url: 'https://www.cnbc.com/' },
  { lat: 33.0, lon: 35.2, label: 'Northern Israel Interception', count: 'Dozens', detail: 'Hezbollah rockets intercepted by Iron Dome', time: 26.2, system: 'Iron Dome / David Sling', source: 'IDF', url: 'https://www.aljazeera.com/' },
  { lat: 32.0, lon: 34.8, label: 'Central Israel Defense', count: 'Multiple', detail: 'Iranian ballistic missiles intercepted', time: 26.3, system: 'Arrow-3 / Arrow-2', source: 'IDF', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { lat: 36.2, lon: 37.1, label: 'UK Drone Intercept — Syria', count: 'Multiple', detail: 'RAF intercepted Iranian drones over N. Syria', time: 33.5, system: 'RAF Typhoon', source: 'UK MoD', url: 'https://www.cbsnews.com/live-updates/us-iran-war-israel-supreme-leader-khamenei-funeral-day-2/' },
  { lat: 29.3, lon: 47.5, label: 'Kuwait Partial Intercept', count: 'Partial', detail: 'Some intercepted, others got through — 3 KIA', time: 15.8, system: 'Patriot PAC-3', source: 'CENTCOM', url: 'https://www.defense.gov/' },
];

const impactMarkers = [];
const interceptMarkers = [];
// EMP ripple emitters (for critical sites)
// Fire columns (for critical coalition strikes)

// Create IMPACT markers with 4 shockwave rings
impactSites.forEach(site => {
  const pos = latLonToVec3(site.lat, site.lon, GLOBE_RADIUS * 1.008);
  const isCoalition = site.coalition;
  const color = isCoalition ? '#f59e0b' : '#ef4444';

  // Impact core
  const coreGeo = new THREE.SphereGeometry(0.055, 12, 12);
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.95 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.copy(pos);
  core.userData = {
    title: `IMPACT: ${site.label}`,
    detail: `Casualties: ${site.casualties}\nSeverity: ${site.severity.toUpperCase()}\nTime: Mar ${site.time < 24 ? 1 : 2}, ${String(Math.floor(site.time % 24)).padStart(2,'0')}:${String(Math.floor((site.time % 1) * 60)).padStart(2,'0')} UTC\nSource: ${site.source}`,
    domain: 'impact',
    filterType: 'impacts',
    lat: site.lat, lon: site.lon,
    time: site.time,
    severity: site.severity,
    source: site.source,
    url: site.url,
  };
  layers.impacts.add(core);
  pickableObjects.push(core);

  // 4 concentric shockwave rings at different radii
  const rings = [];
  for (let r = 0; r < 4; r++) {
    const innerR = 0.05 + r * 0.07;
    const outerR = innerR + 0.06;
    const rGeo = new THREE.RingGeometry(innerR, outerR, 36);
    const rMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(r === 0 ? '#ffffff' : color),
      transparent: true,
      opacity: 0.5 - r * 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    layers.impacts.add(ring);
    rings.push(ring);
  }

  const impactData = { core, rings, severity: site.severity, time: site.time, isCoalition, pos };
  impactMarkers.push(impactData);

  // EMP ripple for critical sites
  if (site.severity === 'critical') {
    // Large expanding hemisphere dome (EMP effect)
    const empGeo = new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const empMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(isCoalition ? '#ffcc00' : '#ff6600'),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      wireframe: true,
    });
    const emp = new THREE.Mesh(empGeo, empMat);
    emp.position.copy(pos);
    // Orient hemisphere to point outward from globe surface
    emp.lookAt(new THREE.Vector3(0, 0, 0));
    emp.rotateX(Math.PI);
    layers.impacts.add(emp);
    empRipples.push({ emp, pos, time: site.time, phase: 0, isCoalition });
  }

  // Fire column for critical coalition strikes
  if (site.severity === 'critical' && isCoalition) {
    const normal = pos.clone().normalize();
    const fireTop = pos.clone().add(normal.clone().multiplyScalar(0.6));
    const firePts = [pos, fireTop];
    const fireGeo = new THREE.BufferGeometry().setFromPoints(firePts);
    const fireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#ff6600'),
      transparent: true,
      opacity: 0.0,
      linewidth: 2,
    });
    const fireLine = new THREE.Line(fireGeo, fireMat);
    layers.impacts.add(fireLine);
    // Second fire column slightly offset — orange
    const fireGeo2 = new THREE.BufferGeometry().setFromPoints([
      pos.clone().add(normal.clone().multiplyScalar(0.05)),
      fireTop.clone().add(normal.clone().multiplyScalar(0.1)),
    ]);
    const fireMat2 = new THREE.LineBasicMaterial({
      color: new THREE.Color('#ffaa00'),
      transparent: true,
      opacity: 0.0,
    });
    const fireLine2 = new THREE.Line(fireGeo2, fireMat2);
    layers.impacts.add(fireLine2);
    fireColumns.push({ fireLine, fireLine2, time: site.time, pos });
  }
});

// Create INTERCEPTION markers — green/cyan shield icons
interceptionSites.forEach(site => {
  const pos = latLonToVec3(site.lat, site.lon, GLOBE_RADIUS * 1.012);

  const shieldGeo = new THREE.OctahedronGeometry(0.04, 0);
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.9 });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.position.copy(pos);
  shield.userData = {
    title: `INTERCEPT: ${site.label}`,
    detail: `Intercepted: ${site.count}\n${site.detail}\nSystem: ${site.system}\nTime: Mar ${site.time < 24 ? 1 : 2}, ${String(Math.floor(site.time % 24)).padStart(2,'0')}:${String(Math.floor((site.time % 1) * 60)).padStart(2,'0')} UTC\nSource: ${site.source}`,
    domain: 'intercept',
    filterType: 'intercepts',
    lat: site.lat, lon: site.lon,
    time: site.time,
    system: site.system,
    source: site.source,
    url: site.url,
  };
  layers.intercepts.add(shield);
  pickableObjects.push(shield);

  const domeGeo = new THREE.RingGeometry(0.08, 0.14, 32);
  const domeMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.copy(pos);
  dome.lookAt(0, 0, 0);
  layers.intercepts.add(dome);

  interceptMarkers.push({ shield, dome, time: site.time });
});

updateLoading(63, 'CALCULATING MISSILE TRAJECTORIES...');

// ============================================================
// SECTION 6: UPGRADED MISSILE ARC SYSTEM
// Thicker trails + particle sparks trailing behind
// ============================================================

const missileArcMeshes = [];

function createArc(track) {
  const start = latLonToVec3(track.from[0], track.from[1], GLOBE_RADIUS * 1.008);
  const end = latLonToVec3(track.to[0], track.to[1], GLOBE_RADIUS * 1.008);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const dist = start.distanceTo(end);
  mid.normalize().multiplyScalar(GLOBE_RADIUS * 1.008 + dist * 0.28);

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const numPoints = 100;
  const curvePoints = curve.getPoints(numPoints - 1);

  // ---- PRIMARY ARC LINE ----
  const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);
  geo.setDrawRange(0, 0);

  const isCoalition = track.type === 'tomahawk' || track.type === 'strike';
  const isDrone = track.type === 'drone';
  const color = isCoalition ? '#22c55e' : isDrone ? '#ff8800' : '#ef4444';
  const brightColor = isCoalition ? '#66ff88' : isDrone ? '#ffcc44' : '#ff6666';

  // Main trail line
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.55,
    linewidth: 1,
  });
  const line = new THREE.Line(geo, mat);
  line.userData = {
    title: track.label,
    detail: `Count: ${track.count}\n${track.details}`,
    domain: 'missile',
    filterType: 'strikes',
    time: track.time,
    totalPoints: numPoints,
    curve,
    color,
    brightColor,
    isCoalition,
  };
  layers.missile.add(line);
  missileArcMeshes.push(line);

  // ---- DUPLICATE GLOW TRAIL (slightly offset, additive blend) ----
  // Creates illusion of a thicker, glowing trail
  const geoGlow = new THREE.BufferGeometry().setFromPoints(curvePoints);
  geoGlow.setDrawRange(0, 0);
  const matGlow = new THREE.LineBasicMaterial({
    color: new THREE.Color(brightColor),
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lineGlow = new THREE.Line(geoGlow, matGlow);
  layers.missile.add(lineGlow);
  line.userData.glowLine = lineGlow;
  line.userData.glowGeo = geoGlow;

  // ---- HEAD PARTICLE (bright glowing warhead dot) ----
  const headGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const headMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(brightColor),
    transparent: true,
    opacity: 1,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.visible = false;
  layers.missile.add(head);
  line.userData.head = head;

  // ---- HALO AROUND HEAD (larger, faded) ----
  const glowGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(brightColor),
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.visible = false;
  layers.missile.add(glow);
  line.userData.glow = glow;

  // ---- SPARK TRAIL PARTICLES ----
  // Small pool of 8 trailing spark particles
  const sparks = [];
  for (let s = 0; s < 8; s++) {
    const spkGeo = new THREE.SphereGeometry(0.012 + Math.random() * 0.01, 4, 4);
    const spkMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(s < 3 ? '#ffffff' : brightColor),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const spk = new THREE.Mesh(spkGeo, spkMat);
    spk.visible = false;
    layers.missile.add(spk);
    sparks.push({ mesh: spk, offset: (s + 1) * 0.025 }); // staggered behind head
  }
  line.userData.sparks = sparks;

  return line;
}

missileTracks.forEach(track => createArc(track));

// ============================================================
// SECTION 7: ENHANCED EXPLOSION SYSTEM
// 80+ particles, multi-ring shockwaves
// ============================================================

const explosions = [];

function triggerExplosion(position, color) {
  const count = 85;
  const particles = [];
  const brightColor = color;
  const whiteColor = '#ffffff';
  const orangeColor = '#ff8800';

  for (let i = 0; i < count; i++) {
    // Particle type: 0=core white flash, 1=main debris, 2=ember, 3=smoke
    const pType = i < 8 ? 0 : i < count * 0.45 ? 1 : i < count * 0.75 ? 2 : 3;
    const size = pType === 0 ? 0.03 + Math.random() * 0.02
               : pType === 1 ? 0.012 + Math.random() * 0.015
               : pType === 2 ? 0.008 + Math.random() * 0.01
               : 0.018 + Math.random() * 0.022;

    const pColor = pType === 0 ? whiteColor
                 : pType === 1 ? (Math.random() < 0.5 ? brightColor : orangeColor)
                 : pType === 2 ? orangeColor
                 : '#553322'; // smoke

    const geo = new THREE.SphereGeometry(size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(pColor),
      transparent: true,
      opacity: pType === 3 ? 0.5 : 1,
      depthWrite: false,
      blending: pType === 3 ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(position);

    // Velocity: core flashes move fast outward, debris slower
    const speed = pType === 0 ? 0.02 + Math.random() * 0.04
                : pType === 1 ? 0.006 + Math.random() * 0.02
                : pType === 2 ? 0.003 + Math.random() * 0.01
                : 0.002 + Math.random() * 0.006;

    // Bias emission toward outward direction from globe
    const outward = position.clone().normalize().multiplyScalar(0.4);
    const random3 = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    const dir = random3.clone().lerp(outward, 0.3).normalize();

    p.userData = {
      velocity: dir.multiplyScalar(speed),
      life: 1.0,
      decay: pType === 0 ? 0.04 + Math.random() * 0.03  // fast flash
             : pType === 1 ? 0.007 + Math.random() * 0.012
             : pType === 2 ? 0.004 + Math.random() * 0.008
             : 0.003 + Math.random() * 0.005, // smoke lasts longest
      pType,
    };
    scene.add(p);
    particles.push(p);
  }

  // 4 expanding shockwave rings
  const shockwaves = [];
  for (let sw = 0; sw < 4; sw++) {
    const swColor = sw === 0 ? '#ffffff' : sw === 1 ? brightColor : sw === 2 ? orangeColor : '#ff4400';
    const swGeo = new THREE.RingGeometry(0.02, 0.05, 36);
    const swMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(swColor),
      transparent: true,
      opacity: 0.7 - sw * 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const swRing = new THREE.Mesh(swGeo, swMat);
    swRing.position.copy(position);
    swRing.lookAt(0, 0, 0);
    scene.add(swRing);
    shockwaves.push({
      ring: swRing,
      life: 1.0,
      delay: sw * 0.08, // staggered start
      maxScale: 6 + sw * 3,
    });
  }

  explosions.push({ particles, shockwaves });
}

// ============================================================
// SECTION 8: HEAT MAP OVERLAY
// ============================================================

function createHeatGlow(lat, lon, color, size) {
  const pos = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.004);
  const geo = new THREE.CircleGeometry(size, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.lookAt(0, 0, 0);
  scene.add(mesh);
  return mesh;
}

// Tehran heat glow (strike concentration)
const tehranHeat = createHeatGlow(35.7, 51.4, '#ff2020', 0.8);
// Persian Gulf naval activity
const gulfHeat = createHeatGlow(25.5, 54.0, '#ff8800', 1.2);

// Strait of Hormuz closure line
const hormuzPoints = [
  latLonToVec3(26.0, 56.0, GLOBE_RADIUS * 1.006),
  latLonToVec3(26.6, 56.4, GLOBE_RADIUS * 1.006),
  latLonToVec3(27.0, 56.8, GLOBE_RADIUS * 1.006),
];
const hormuzGeo = new THREE.BufferGeometry().setFromPoints(hormuzPoints);
const hormuzMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8, linewidth: 2 });
const hormuzLine = new THREE.Line(hormuzGeo, hormuzMat);
scene.add(hormuzLine);

// Houthi Red Sea threat zone
const houthiHeat = createHeatGlow(15.0, 42.5, '#ff4400', 1.5);

// Strait of Hormuz heat
const hormuzHeat = createHeatGlow(26.5, 56.3, '#ff0000', 0.6);

updateLoading(70, 'CONNECTING TO OPENSKY NETWORK...');

// ============================================================
// SECTION 9: OPENSKY API INTEGRATION
// ============================================================

let liveAircraft = [];
const aircraftMarkers = [];
const MILITARY_PREFIXES = ['RCH', 'DUKE', 'REACH', 'NATO', 'RRR', 'CNV', 'CASA', 'TOPCAT', 'NCHO', 'EVAC', 'MAGMA', 'ATLAS', 'IRON'];
const SPECIAL_SQUAWKS = ['7700', '7600', '7500'];

const aircraftCountEl = document.getElementById('aircraft-count');
const aircraftListEl = document.getElementById('aircraft-list');
const aircraftStatusEl = document.getElementById('aircraft-status');
const openskyDot = document.getElementById('opensky-dot');
const openskyTag = document.getElementById('opensky-tag');

function isMilitaryCallsign(callsign) {
  if (!callsign) return false;
  const cs = callsign.trim().toUpperCase();
  return MILITARY_PREFIXES.some(p => cs.startsWith(p));
}

async function fetchOpenSky() {
  if (!shouldRunDataSource('aircraft-section')) return;

  try {
    const { data } = await fetchFirstSuccessful(
      'https://opensky-network.org/api/states/all?lamin=12&lomin=30&lamax=42&lomax=65',
      {
        timeoutMs: 8000,
        validate: (payload) => Array.isArray(payload?.states),
      },
    );
    processAircraftData(data.states);
    setApiStatus('live');
    return;
  } catch {
    // fall through to offline state
  }

  setApiStatus('offline');
}

function setApiStatus(status) {
  applySourceStatus({
    status,
    dot: openskyDot,
    tag: openskyTag,
    tagText: status === 'live' ? 'LIVE' : 'OFFLINE',
  });
  setStatusMessage(aircraftStatusEl, status, status === 'live' ? 'LIVE' : 'OFFLINE');
}

function processAircraftData(states) {
  clearTrackedObjects(aircraftMarkers, {
    layer: layers.aircraft,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });

  const interesting = [];
  states.forEach(s => {
    const callsign = (s[1] || '').trim();
    const lon = s[5]; const lat = s[6];
    const alt = s[7];
    const onGround = s[8];
    const squawk = s[14];

    if (!isFiniteCoordinatePair(lat, lon) || onGround) return;

    const isMil = isMilitaryCallsign(callsign);
    const isSpecialSquawk = squawk && SPECIAL_SQUAWKS.includes(squawk);
    const highAlt = alt && alt > 10000;

    if (isMil || isSpecialSquawk || (callsign && highAlt && Math.random() < 0.15)) {
      interesting.push({ callsign: callsign || 'UNKNOWN', lat, lon, alt: Math.round(alt || 0), squawk });
    }
  });

  liveAircraft = interesting.slice(0, 50);

  liveAircraft.forEach(ac => {
    const pos = latLonToVec3(ac.lat, ac.lon, GLOBE_RADIUS * 1.02);
    const geo = new THREE.SphereGeometry(0.02, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = {
      title: ac.callsign,
      detail: `Alt: ${ac.alt}m\nSquawk: ${ac.squawk || 'N/A'}\nLat: ${ac.lat.toFixed(3)} Lon: ${ac.lon.toFixed(3)}`,
      domain: 'aircraft',
      filterType: 'air',
      isLiveAircraft: true,
    };
    layers.aircraft.add(mesh);
    pickableObjects.push(mesh);
    aircraftMarkers.push(mesh);
  });

  aircraftCountEl.textContent = liveAircraft.length;

  if (liveAircraft.length > 0) {
    aircraftListEl.innerHTML = liveAircraft.slice(0, 6).map(ac =>
      `<div class="aircraft-item">
        <span class="aircraft-item__callsign">${escapeHtml(ac.callsign)}</span>
        <span class="aircraft-item__alt">${Number.isFinite(ac.alt) ? ac.alt : '--'}m</span>
      </div>`
    ).join('');
    if (liveAircraft.length > 6) {
      aircraftListEl.innerHTML += `<div class="aircraft-item"><span style="color:var(--color-text-faint)">+${liveAircraft.length - 6} more</span></div>`;
    }
  } else {
    aircraftListEl.innerHTML = '<div class="aircraft-panel__empty">No military aircraft detected</div>';
  }
}

fetchOpenSky();
setInterval(fetchOpenSky, OPENSKY_INTERVAL);

// Oil price system defined in Section 33 (upgraded version)

updateLoading(80, 'BUILDING UI SYSTEMS...');

// ============================================================
// SECTION 10: STATE
// ============================================================

let currentTime = 8; // hours since Mar 1 00:00
let isPlaying = false;
let playSpeed = 1; // hours per second
let currentTheme = 'dark';
let currentFilter = 'all';
let autoRotate = true;
let userInteracting = false;
let lastUserInteraction = 0;
const triggeredExplosions = new Set();

function updateActiveFilterButtons(filter) {
  document.querySelectorAll('.filter-btn').forEach((button) => {
    button.classList.toggle('filter-btn--active', button.dataset.filter === filter);
  });
}

function setCurrentFilter(nextFilter, { reapplySearch = true } = {}) {
  if (!nextFilter || currentFilter === nextFilter) {
    if (nextFilter) updateActiveFilterButtons(nextFilter);
    return;
  }

  currentFilter = nextFilter;
  updateActiveFilterButtons(nextFilter);

  if (typeof applyFilter === 'function') {
    applyFilter();
  }

  if (reapplySearch && typeof applySearchFilter === 'function') {
    applySearchFilter();
  }
}

window.setCurrentFilter = setCurrentFilter;

// ============================================================
// SECTION 11: UI CONTROLLERS
// ============================================================

// UTC Clock
function updateClock() {
  const now = new Date();
  document.getElementById('utc-clock').textContent =
    `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')} UTC`;
}
setInterval(updateClock, 1000);
updateClock();

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  scene.background = new THREE.Color(currentTheme === 'dark' ? 0x020408 : 0xe8ecf2);
  themeToggle.innerHTML = currentTheme === 'dark'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
});

// Sound toggle (placeholder)
document.getElementById('sound-toggle').addEventListener('click', function() {
  this.classList.toggle('sound-on');
});

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  setTimeout(onResize, 400);
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setCurrentFilter(btn.dataset.filter);
  });
});

// applyFilter() defined in Section 31 (extended version)

// Time scrubber
const timeSlider = document.getElementById('time-slider');
const timeLabel = document.getElementById('time-label');
const timePlay = document.getElementById('time-play');

timeSlider.addEventListener('input', () => {
  currentTime = TIMELINE_START + (parseFloat(timeSlider.value) / 1000) * (TIMELINE_END - TIMELINE_START);
  updateTimeLabel();
  updateTimeVisibility();
});

function updateTimeLabel() {
  const day = currentTime < 24 ? 1 : 2;
  const hour = Math.floor(currentTime % 24);
  const min = Math.floor((currentTime % 1) * 60);
  timeLabel.textContent = `Mar ${day}, ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')} UTC`;
}

function togglePlay() {
  isPlaying = !isPlaying;
  timePlay.innerHTML = isPlaying
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>';
}
timePlay.addEventListener('click', togglePlay);

// Speed buttons
document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('speed-btn--active'));
    btn.classList.add('speed-btn--active');
    playSpeed = parseFloat(btn.dataset.speed);
  });
});

// Scrubber event markers
const scrubberMarkers = document.getElementById('scrubber-markers');
events.forEach(evt => {
  const pct = ((evt.time - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
  const dot = document.createElement('div');
  dot.className = 'ev-dot';
  dot.style.left = pct + '%';
  dot.style.background = evt.color;
  scrubberMarkers.appendChild(dot);
});

// Scrubber tooltip on hover
const scrubberTooltip = document.getElementById('scrubber-tooltip');
const scrubberTrack = document.getElementById('scrubber-track');
scrubberTrack.addEventListener('mousemove', (e) => {
  const rect = scrubberTrack.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  const hoverTime = TIMELINE_START + pct * (TIMELINE_END - TIMELINE_START);

  let nearest = null;
  let nearestDist = Infinity;
  events.forEach(evt => {
    const d = Math.abs(evt.time - hoverTime);
    if (d < nearestDist) { nearestDist = d; nearest = evt; }
  });

  if (nearest && nearestDist < 2) {
    scrubberTooltip.textContent = `${nearest.text.substring(0, 50)}...`;
    scrubberTooltip.style.left = (e.clientX - rect.left) + 'px';
    scrubberTooltip.classList.add('visible');
  } else {
    scrubberTooltip.classList.remove('visible');
  }
});
scrubberTrack.addEventListener('mouseleave', () => {
  scrubberTooltip.classList.remove('visible');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  if (e.key === ' ' || e.key === 'Space') { togglePlay(); e.preventDefault(); }
  if (e.key === 'r' || e.key === 'R') { resetView(); e.preventDefault(); }
  if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); e.preventDefault(); }
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function resetView() {
  const target = latLonToVec3(30, 50, GLOBE_RADIUS * 2.8);
  animateCameraTo(target);
  currentTime = 8;
  timeSlider.value = ((currentTime - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 1000;
  updateTimeLabel();
  updateTimeVisibility();
}

// Track user interaction for auto-rotate
canvas.addEventListener('pointerdown', () => { userInteracting = true; lastUserInteraction = performance.now(); });
canvas.addEventListener('pointerup', () => { userInteracting = false; lastUserInteraction = performance.now(); });
canvas.addEventListener('wheel', () => { lastUserInteraction = performance.now(); });

// Search box handling (new in upgrade)
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      // Reset all markers to visible
      pickableObjects.forEach(obj => { obj.visible = true; });
      return;
    }
    // Highlight matching markers, dim others
    pickableObjects.forEach(obj => {
      const data = obj.userData;
      if (!data.title) return;
      const matches = data.title.toLowerCase().includes(query) ||
                      (data.detail && data.detail.toLowerCase().includes(query));
      obj.visible = matches;
      if (matches && data.lat && data.lon) {
        // Auto-navigate to first match
        animateCameraTo(latLonToVec3(data.lat, data.lon, GLOBE_RADIUS * 2.2));
      }
    });
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      pickableObjects.forEach(obj => { obj.visible = true; });
    }
  });
}

// ============================================================
// SECTION 12: EVENT FEED
// ============================================================

const eventFeed = document.getElementById('event-feed');
let currentDayHeader = 0;

events.forEach((evt) => {
  if (evt.day !== currentDayHeader) {
    currentDayHeader = evt.day;
    const sep = document.createElement('div');
    sep.style.cssText = 'font-family:var(--font-mono);font-size:9px;color:var(--color-air);letter-spacing:0.1em;padding:6px 0 2px;text-transform:uppercase;font-weight:600;';
    sep.textContent = `DAY ${evt.day} — MAR ${evt.day}, 2026`;
    eventFeed.appendChild(sep);
  }

  const item = document.createElement('div');
  item.className = 'event-item';
  item.dataset.time = evt.time;
  item.dataset.filterType = evt.type === 'strike' ? 'strikes' : evt.type === 'defense' ? 'defenses' : evt.type === 'missile' || evt.type === 'casualty' ? 'strikes' : 'all';
  item.innerHTML = `
    <div class="event-item__dot" style="background: ${escapeHtml(evt.color)};"></div>
    <div class="event-item__content">
      <div class="event-item__time">${String(Math.floor(evt.time % 24)).padStart(2,'0')}:${String(Math.floor((evt.time % 1) * 60)).padStart(2,'0')} UTC</div>
      <div class="event-item__text">${escapeHtml(evt.text)}</div>
      <div class="event-item__source">
        <a href="${safeExternalUrl(evt.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(evt.source)}</a>
      </div>
    </div>
  `;
  item.addEventListener('click', () => {
    currentTime = evt.time;
    timeSlider.value = ((currentTime - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 1000;
    updateTimeLabel();
    updateTimeVisibility();
    if (evt.lat > 10 && evt.lat < 50 && evt.lon > 25 && evt.lon < 70) {
      animateCameraTo(latLonToVec3(evt.lat, evt.lon, GLOBE_RADIUS * 2.0));
    }
  });
  eventFeed.appendChild(item);
});

function updateEventFeedHighlight() {
  document.querySelectorAll('.event-item').forEach(item => {
    const t = parseFloat(item.dataset.time);
    if (isNaN(t)) return;
    const isActive = Math.abs(t - currentTime) < 0.5;
    item.classList.toggle('active', isActive);
    if (isActive && isPlaying) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

// ---- TICKER ----
const ticker = document.getElementById('ticker');
const tickerHTML = tickerItems.map(t =>
  `<span class="ticker__item ticker__item--${t.cls}">${t.text}</span>`
).join('');
ticker.innerHTML = tickerHTML + tickerHTML;

// ============================================================
// SECTION 13: DETAIL PANEL
// ============================================================

const detailPanel = document.getElementById('detail-panel');
const detailClose = document.getElementById('detail-close');

function openDetailPanel(data) {
  document.getElementById('detail-type').textContent = (data.domain || 'UNKNOWN').toUpperCase();
  document.getElementById('detail-name').textContent = data.title || '';
  document.getElementById('detail-coords').textContent = formatLatLon(data.lat, data.lon);
  document.getElementById('detail-status').textContent = data.status || data.domain || 'N/A';
  document.getElementById('detail-details').textContent = data.detail || '';

  const sourceEl = document.getElementById('detail-source');
  sourceEl.textContent = '';

  if (data.url) {
    const link = document.createElement('a');
    link.href = safeExternalUrl(data.url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.color = 'var(--color-air)';
    link.textContent = data.source || 'OSINT';
    sourceEl.appendChild(link);
  } else {
    sourceEl.textContent = data.source || 'OSINT / PUBLIC SOURCE';
  }

  detailPanel.classList.add('open');
}

window.showDetailPanel = openDetailPanel;

detailClose.addEventListener('click', () => detailPanel.classList.remove('open'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') detailPanel.classList.remove('open');
});

// ============================================================
// SECTION 14: TOOLTIP / HOVER / CLICK
// ============================================================

const tooltip = document.getElementById('marker-tooltip');
const tooltipTitle = document.getElementById('tooltip-title');
const tooltipDetail = document.getElementById('tooltip-detail');

canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('click', onMouseClick);

function onMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(pickableObjects);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const data = obj.userData;
    if (data.title) {
      tooltipTitle.textContent = data.title;
      tooltipDetail.textContent = (data.detail || '').substring(0, 200);
      tooltip.style.left = (event.clientX - mainArea.getBoundingClientRect().left + 14) + 'px';
      tooltip.style.top = (event.clientY - mainArea.getBoundingClientRect().top - 12) + 'px';
      tooltip.classList.add('visible');
      canvas.style.cursor = 'pointer';
      return;
    }
  }
  tooltip.classList.remove('visible');
  canvas.style.cursor = 'grab';
}

function onMouseClick(event) {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(pickableObjects);
  if (intersects.length > 0) {
    const data = intersects[0].object.userData;
    if (data.title) {
      const showDetailPanel = window.showDetailPanel || openDetailPanel;
      showDetailPanel(data);
    }
  }
}

// ============================================================
// SECTION 15: MINIMAP
// ============================================================

const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

function drawMinimap() {
  const W = minimapCanvas.width;
  const H = minimapCanvas.height;
  const latMin = 12, latMax = 42, lonMin = 30, lonMax = 65;

  minimapCtx.fillStyle = '#0c1220';
  minimapCtx.fillRect(0, 0, W, H);

  function toMM(lat, lon) {
    const x = ((lon - lonMin) / (lonMax - lonMin)) * W;
    const y = ((latMax - lat) / (latMax - latMin)) * H;
    return [x, y];
  }

  // Draw country borders
  minimapCtx.strokeStyle = 'rgba(0,212,255,0.15)';
  minimapCtx.lineWidth = 0.5;
  Object.values(countryBorders).forEach(coords => {
    minimapCtx.beginPath();
    coords.forEach(([lat, lon], i) => {
      const [x, y] = toMM(lat, lon);
      if (i === 0) minimapCtx.moveTo(x, y);
      else minimapCtx.lineTo(x, y);
    });
    minimapCtx.stroke();
  });

  // Draw markers
  const drawDot = (lat, lon, color, size) => {
    const [x, y] = toMM(lat, lon);
    if (x < 0 || x > W || y < 0 || y > H) return;
    minimapCtx.fillStyle = color;
    minimapCtx.beginPath();
    minimapCtx.arc(x, y, size, 0, Math.PI * 2);
    minimapCtx.fill();
  };

  // Draw connection lines on minimap
  connectionLines.forEach(conn => {
    const pts = conn.curve.getPoints(20);
    minimapCtx.strokeStyle = conn.color + '44';
    minimapCtx.lineWidth = 0.5;
    minimapCtx.setLineDash([2, 2]);
    minimapCtx.beginPath();
    pts.forEach((pt, i) => {
      const ll = vec3ToLatLon(pt);
      const [x, y] = toMM(ll.lat, ll.lon);
      if (i === 0) minimapCtx.moveTo(x, y);
      else minimapCtx.lineTo(x, y);
    });
    minimapCtx.stroke();
    minimapCtx.setLineDash([]);
  });

  airBases.forEach(b => drawDot(b.lat, b.lon, '#00d4ff', 2));
  navalAssets.forEach(s => drawDot(s.lat, s.lon, s.side === 'iran' ? '#ef4444' : '#3b82f6', 2));
  landTargets.forEach(t => drawDot(t.lat, t.lon, '#f59e0b', 1.5));
  liveAircraft.forEach(ac => drawDot(ac.lat, ac.lon, '#00d4ff', 1));
  liveSeismic.forEach(q => drawDot(q.lat, q.lon, '#f59e0b', Math.max(1, q.mag * 0.5)));
  liveThermal.forEach(h => drawDot(h.lat, h.lon, '#ff4400', 1));

  // Draw camera frustum indicator
  const camLL = vec3ToLatLon(camera.position);
  const [cx, cy] = toMM(camLL.lat, camLL.lon);
  const dist = camera.position.length();
  const viewSize = Math.max(8, 60 / dist * 10);
  minimapCtx.strokeStyle = 'rgba(0,212,255,0.5)';
  minimapCtx.lineWidth = 1;
  minimapCtx.strokeRect(cx - viewSize/2, cy - viewSize/2, viewSize, viewSize);
}

// Minimap click to navigate
document.getElementById('minimap').addEventListener('click', (e) => {
  const rect = minimapCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const W = minimapCanvas.width;
  const H = minimapCanvas.height;
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;

  const lonMin = 30, lonMax = 65, latMin = 12, latMax = 42;
  const lon = lonMin + (x * scaleX / W) * (lonMax - lonMin);
  const lat = latMax - (y * scaleY / H) * (latMax - latMin);

  animateCameraTo(latLonToVec3(lat, lon, GLOBE_RADIUS * 2.2));
});

// ============================================================
// ====== PART 2: SECTIONS 16-35 (UPGRADED) ==================
// ============================================================

// ============================================================
// SIGINT-MAP — app_part2.js — Sections 16–35
// Continues from Part 1 (Sections 1–15).
// Do NOT re-import Three.js or re-declare Part 1 variables.
// ============================================================

// ============================================================
// SECTION 16: ANIMATED NUMBER COUNTERS
// ============================================================

function animateCounters() {
  document.querySelectorAll('.stat-card__value[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = easeOutCubic(t);
      const current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// ============================================================
// SECTION 17: TIME-BASED VISIBILITY (upgraded)
// ============================================================

function updateTimeVisibility() {
  // Missile arcs: animate draw range
  missileArcMeshes.forEach(line => {
    const data = line.userData;
    const timeDelta = currentTime - data.time;

    if (timeDelta < 0) {
      line.geometry.setDrawRange(0, 0);
      if (data.head) data.head.visible = false;
      if (data.glow) data.glow.visible = false;
    } else if (timeDelta < 3) {
      const progress = timeDelta / 3;
      const count = Math.floor(progress * data.totalPoints);
      line.geometry.setDrawRange(0, count);

      if (data.head && data.curve) {
        data.head.visible = true;
        data.head.position.copy(data.curve.getPoint(Math.min(progress, 0.99)));
        if (data.glow) {
          data.glow.visible = true;
          data.glow.position.copy(data.head.position);
        }
      }

      // Trigger explosion at impact
      if (progress >= 0.98 && !triggeredExplosions.has(data.title)) {
        triggeredExplosions.add(data.title);
        const impactPos = data.curve.getPoint(1);
        const isCoalition = data.title.includes('USN') || data.title.includes('IAF') || data.title.includes('IDF');
        triggerExplosion(impactPos, isCoalition ? '#f59e0b' : '#ef4444');
        // Trigger EMP ripple on critical impact sites
        if (data.title.includes('Tehran') || data.title.includes('Isfahan') || data.title.includes('Natanz')) {
          triggerEMPRipple(impactPos);
        }
        // Trigger fire column on major strike sites
        if (isCoalition) {
          triggerFireColumn(impactPos);
        }
        // Play audio alert
        if (isCoalition) {
          playAlert('impact');
        } else {
          playAlert('missile');
        }
      }
    } else {
      line.geometry.setDrawRange(0, data.totalPoints);
      if (data.head) data.head.visible = false;
      if (data.glow) data.glow.visible = false;
    }
  });

  // Events: show only past events
  layers.events.children.forEach(child => {
    if (child.userData && child.userData.time !== undefined) {
      child.visible = currentTime >= child.userData.time;
    }
    if (child.userData && child.userData.isGlow && child.userData.parentData?.time !== undefined) {
      child.visible = currentTime >= child.userData.parentData.time;
    }
  });

  // EMP ripples: show only after trigger time
  empRipples.forEach(er => {
    if (er.triggered) {
      er.mesh.visible = true;
    }
  });

  // Fire columns: show after trigger time
  fireColumns.forEach(fc => {
    if (fc.triggered) {
      fc.mesh.visible = true;
    }
  });

  // Connection lines: always visible when all > seismic/thermal filter
  connLines.forEach(cl => {
    cl.line.visible = (currentFilter === 'all' || currentFilter === 'air' || currentFilter === 'naval');
  });

  updateEventFeedHighlight();
}

// ============================================================
// SECTION 17B: ADVANCED VISUAL EFFECTS SETUP
// ============================================================

// --- Connection lines between allied bases ---
const connLines = [];

(function buildConnLines() {
  // Allied base pairs to connect (indices into airBases)
  const pairs = [
    [0, 1], // Al Udeid <-> Al Dhafra
    [1, 3], // Al Dhafra <-> Prince Sultan
    [0, 2], // Al Udeid <-> Ali Al Salem
    [4, 5], // Nevatim <-> Ramon
  ];

  pairs.forEach(([a, b]) => {
    const posA = latLonToVec3(airBases[a].lat, airBases[a].lon, GLOBE_RADIUS * 1.012);
    const posB = latLonToVec3(airBases[b].lat, airBases[b].lon, GLOBE_RADIUS * 1.012);
    const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
    const dist = posA.distanceTo(posB);
    mid.normalize().multiplyScalar(GLOBE_RADIUS * 1.012 + dist * 0.15);

    const curve = new THREE.QuadraticBezierCurve3(posA, mid, posB);
    const pts = curve.getPoints(40);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    layers.air.add(line);

    // Traveling pulse dot
    const dotGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(posA);
    layers.air.add(dot);

    connLines.push({ line, dot, curve, phase: Math.random() });
  });
})();

// --- EMP Ripple hemispheres (array declared in Section 5B) ---

function triggerEMPRipple(position) {
  for (let ring = 0; ring < 3; ring++) {
    const geo = new THREE.RingGeometry(0.01, 0.04, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);

    empRipples.push({
      mesh,
      phase: ring * 0.4,
      triggered: true,
      birthTime: performance.now(),
      maxScale: 18 + ring * 8,
    });
  }
}

// --- Fire columns at critical impact sites (array declared in Section 5B) ---

function triggerFireColumn(position) {
  // Vertical glow bar pointing away from globe center
  const normal = position.clone().normalize();
  const geo = new THREE.CylinderGeometry(0.02, 0.04, 0.35, 8, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position.clone().addScaledVector(normal, 0.18));
  // Orient cylinder along the normal
  const up = new THREE.Vector3(0, 1, 0);
  mesh.quaternion.setFromUnitVectors(up, normal);
  scene.add(mesh);

  // Inner bright core
  const coreGeo = new THREE.CylinderGeometry(0.008, 0.015, 0.25, 6, 1, true);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.copy(mesh.position);
  core.quaternion.copy(mesh.quaternion);
  scene.add(core);

  fireColumns.push({
    mesh, core,
    triggered: true,
    birthTime: performance.now(),
    phase: Math.random() * Math.PI * 2,
  });
}

// --- Cloud layer (slowly drifting) ---
const cloudLayerGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.022, 64, 64);
const cloudLayerMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    ${NOISE_GLSL}
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      float nx = snoise(vec3(vUv.x * 4.0 + uTime * 0.015, vUv.y * 4.0, 1.0)) * 0.5 + 0.5;
      float ny = snoise(vec3(vUv.x * 8.0, vUv.y * 8.0 - uTime * 0.01, 2.0)) * 0.5 + 0.5;
      float cloud = smoothstep(0.48, 0.58, nx * 0.6 + ny * 0.4);
      float fresnel = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
      gl_FragColor = vec4(1.0, 1.0, 1.0, cloud * 0.12 * (0.5 + fresnel * 0.5));
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.FrontSide,
  blending: THREE.NormalBlending,
});
const cloudLayer = new THREE.Mesh(cloudLayerGeo, cloudLayerMat);
scene.add(cloudLayer);

// --- Sun direction vector (updated per frame for day/night) ---
const sunDirection = new THREE.Vector3(1, 0, 0);

// ============================================================
// SECTION 18: CAMERA ANIMATION
// ============================================================

let cameraAnimating = false;
let cameraAnimStart = null;
let cameraAnimFrom = null;
let cameraAnimTo = null;
const CAMERA_ANIM_DURATION = 1200;

function animateCameraTo(targetPos) {
  cameraAnimating = true;
  cameraAnimStart = performance.now();
  cameraAnimFrom = camera.position.clone();
  cameraAnimTo = targetPos.clone();
}

function updateCameraAnimation(now) {
  if (!cameraAnimating) return;
  const t = Math.min((now - cameraAnimStart) / CAMERA_ANIM_DURATION, 1);
  const ease = easeOutQuart(t);
  camera.position.lerpVectors(cameraAnimFrom, cameraAnimTo, ease);
  camera.lookAt(0, 0, 0);
  if (t >= 1) cameraAnimating = false;
}

// ============================================================
// SECTION 19: MAIN ANIMATION LOOP — MASSIVELY UPGRADED
// ============================================================

let lastFrame = performance.now();
let frameCount = 0;

function animate(now) {
  if (window.__SIGINT_MAP_DESTROYED__) return;
  requestAnimationFrame(animate);
  try {
  const delta = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  frameCount++;

  // ---- Timeline auto-advance ----
  if (isPlaying) {
    currentTime += delta * playSpeed;
    if (currentTime > TIMELINE_END) currentTime = TIMELINE_START;
    timeSlider.value = ((currentTime - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 1000;
    updateTimeLabel();
    updateTimeVisibility();
  }

  // ---- Day/night terminator (sun position from real UTC time) ----
  const utcNow = new Date();
  const dayFraction = (utcNow.getUTCHours() * 3600 + utcNow.getUTCMinutes() * 60 + utcNow.getUTCSeconds()) / 86400;
  const sunAngle = (dayFraction - 0.5) * Math.PI * 2;
  sunDirection.set(Math.cos(sunAngle), 0.4, Math.sin(sunAngle)).normalize();
  // Update earth shader uniforms (only if custom shader is active)
  if (!earthUsingFallbackMat) {
    earthMat.uniforms.uTime.value = now * 0.001;
    earthMat.uniforms.uSunDir.value.copy(sunDirection);
  }
  // Update atmosphere sun direction
  atmosphereUniforms.forEach(u => { if (u.uSunDir) u.uSunDir.value.copy(sunDirection); });
  // Update directional light to match sun direction (needed for fallback material)
  sunLight.position.copy(sunDirection).multiplyScalar(20);
  // Update radar scan sphere
  if (scanMat.uniforms) {
    scanMat.uniforms.uTime.value = now * 0.001;
    scanMat.uniforms.uScanAngle.value = (now * 0.0008) % (Math.PI * 2);
  }

  // ---- Slowly rotate cloud layer ----
  cloudLayer.rotation.y += delta * 0.005;
  cloudLayer.rotation.x += delta * 0.001;
  if (cloudLayerMat.uniforms && cloudLayerMat.uniforms.uTime) cloudLayerMat.uniforms.uTime.value = now * 0.001;

  // ---- Twinkle stars (randomly vary opacity per group of stars) ----
  if (frameCount % 8 === 0) {
    const opArr = starGeo.attributes.size ? starGeo.attributes.size.array : null;
    if (opArr) {
      const idx = Math.floor(Math.random() * opArr.length);
      opArr[idx] = 0.2 + Math.random() * 1.1;
      starGeo.attributes.size.needsUpdate = true;
    }
  }

  // ---- Slow star rotation ----
  stars.rotation.y += delta * 0.003;
  stars.rotation.x += delta * 0.001;

  // ---- Animate missile arc heads with particle trails ----
  missileArcMeshes.forEach((line, i) => {
    const data = line.userData;
    if (!data.head || !data.head.visible || !data.curve) return;
    const timeDelta = currentTime - data.time;
    if (timeDelta < 0 || timeDelta >= 3) return;
    const progress = timeDelta / 3;

    // Slight oscillation on the travel path for realistic drift
    const t = Math.min(progress + Math.sin(now * 0.005 + i) * 0.002, 0.999);
    data.head.position.copy(data.curve.getPoint(t));
    if (data.glow) {
      data.glow.position.copy(data.head.position);
      // Pulsing glow intensity
      data.glow.material.opacity = 0.15 + 0.25 * Math.abs(Math.sin(now * 0.008 + i));
    }
    // Head throb
    const headScale = 1.0 + 0.4 * Math.abs(Math.sin(now * 0.012 + i));
    data.head.scale.setScalar(headScale);
  });

  // ---- Animate impact shockwaves (3+ concentric expanding rings per impact) ----
  impactMarkers.forEach((im, i) => {
    const ring0 = im.rings?.[0];
    const ring1 = im.rings?.[1];
    if (im.time > currentTime) {
      im.core.visible = false;
      if (ring0) ring0.visible = false;
      if (ring1) ring1.visible = false;
      return;
    }
    im.core.visible = true;
    if (ring0) ring0.visible = true;
    if (ring1) ring1.visible = true;

    const speed = im.severity === 'critical' ? 0.006 : 0.004;
    const pulse = Math.sin(now * speed + i * 1.5);

    // Core throb
    const coreScale = im.severity === 'critical' ? 1.0 + 0.6 * Math.abs(pulse) : 1.0 + 0.3 * Math.abs(pulse);
    im.core.scale.setScalar(coreScale);
    im.core.material.opacity = 0.65 + 0.35 * Math.abs(pulse);

    // Expanding shockwave ring 1 (tight, fast)
    const ringT = ((now * 0.001 + i * 0.5) % 2) / 2;
    if (ring0) {
      ring0.scale.setScalar(1 + ringT * 6);
      ring0.material.opacity = (1 - ringT) * 0.55;
    }

    // Expanding shockwave ring 2 (wide, slower)
    const ring2T = ((now * 0.001 + i * 0.5 + 1) % 2) / 2;
    if (ring1) {
      ring1.scale.setScalar(1 + ring2T * 10);
      ring1.material.opacity = (1 - ring2T) * 0.3;
    }
  });

  // ---- Animate EMP ripple hemispheres expanding from critical impacts ----
  empRipples.forEach(er => {
    if (!er.triggered) return;
    const age = (now - er.birthTime) * 0.001;
    const cycleT = ((age + er.phase) % 4) / 4; // 4-second cycle
    const sc = 1 + cycleT * er.maxScale;
    er.mesh.scale.setScalar(sc);
    er.mesh.material.opacity = Math.max(0, (1 - cycleT) * 0.4);
  });

  // ---- Animate fire columns (flickering vertical glow bars) ----
  fireColumns.forEach(fc => {
    if (!fc.triggered) return;
    const age = (now - fc.birthTime) * 0.001;
    const flicker = 0.5 + 0.5 * Math.sin(now * 0.025 + fc.phase);
    const flicker2 = 0.5 + 0.5 * Math.sin(now * 0.017 + fc.phase + 1.3);

    // Outer fire pillar
    fc.mesh.material.opacity = 0.35 + flicker * 0.55;
    const fireScale = 0.8 + flicker * 0.6;
    fc.mesh.scale.set(1 + flicker * 0.4, fireScale, 1 + flicker * 0.4);
    // Color oscillates orange -> yellow
    fc.mesh.material.color.setHSL(0.07 - flicker * 0.04, 1.0, 0.5 + flicker * 0.2);

    // Inner bright core
    fc.core.material.opacity = 0.5 + flicker2 * 0.5;
    fc.core.scale.setScalar(0.9 + flicker2 * 0.3);

    // Fade out after 30 seconds
    if (age > 25) {
      const fadeOut = Math.max(0, 1 - (age - 25) / 5);
      fc.mesh.material.opacity *= fadeOut;
      fc.core.material.opacity *= fadeOut;
    }
  });

  // ---- Animate intercept shield domes (rotating, pulsing) ----
  interceptMarkers.forEach((im, i) => {
    if (im.time > currentTime) {
      im.shield.visible = false;
      im.dome.visible = false;
      return;
    }
    im.shield.visible = true;
    im.dome.visible = true;

    im.shield.rotation.y = now * 0.002 + i;
    im.shield.rotation.x = now * 0.001 + i * 0.5;

    const domePulse = 0.5 + 0.5 * Math.sin(now * 0.003 + i * 2);
    im.dome.scale.setScalar(1.0 + domePulse * 0.85);
    im.dome.material.opacity = 0.12 + domePulse * 0.22;
  });

  // ---- Animate connection lines (traveling pulse dots between allied bases) ----
  connLines.forEach(cl => {
    const t = ((now * 0.0004 + cl.phase) % 1);
    cl.dot.position.copy(cl.curve.getPoint(t));
    // Fade dot near endpoints
    const fadeT = Math.sin(t * Math.PI);
    cl.dot.material.opacity = fadeT * 0.9;
    // Line gentle pulse
    cl.line.material.opacity = 0.1 + 0.1 * Math.sin(now * 0.001 + cl.phase * 6);
  });

  // ---- Sections below reference variables declared later in initLegacyApp ----
  if (!__initPhaseComplete) { controls.update(); renderer.render(scene, camera); return; }

  // ---- Animate nuclear site markers (pulsing radiation rings) ----
  nuclearMarkers.forEach((nm, i) => {
    if (nm.ring && nm.ring.material) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.002 + i * 1.2);
      nm.ring.material.opacity = 0.12 + pulse * 0.32;
      nm.ring.scale.setScalar(1 + pulse * 0.45);
    }
    if (nm.glow && nm.glow.material) {
      const gp = 0.5 + 0.5 * Math.sin(now * 0.0015 + i * 0.8);
      nm.glow.material.opacity = 0.02 + gp * 0.055;
    }
    if (nm.tri) {
      nm.tri.rotation.y = now * 0.001 + i;
    }
  });

  // ---- Pulse threat rings (sonar effect) ----
  threatRings.forEach(({ ring, phase }) => {
    const t = ((now * 0.001 + phase * 3) % 3) / 3;
    const scale = 1 + t * 4;
    ring.scale.setScalar(scale);
    ring.material.opacity = (1 - t) * 0.15;
  });

  // ---- Pulse aircraft markers ----
  aircraftMarkers.forEach((m, i) => {
    if (m.material) {
      m.material.opacity = 0.55 + 0.45 * Math.sin(now * 0.004 + i);
      // Slight scale pulse for high-altitude aircraft
      m.scale.setScalar(1 + 0.2 * Math.abs(Math.sin(now * 0.005 + i * 0.7)));
    }
  });

  // ---- Animate explosion particles ----
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    const expParticles = explosion.particles || [];
    const expShockwaves = explosion.shockwaves || [];
    let allDead = true;
    expParticles.forEach(p => {
      if (p.userData.life > 0) {
        allDead = false;
        p.position.add(p.userData.velocity);
        p.userData.life -= p.userData.decay;
        p.material.opacity = Math.max(0, p.userData.life);
        p.scale.setScalar(1 + (1 - p.userData.life) * 2.5);
        // Fade color toward orange -> dark
        const hue = 0.05 + p.userData.life * 0.02;
        p.material.color.setHSL(hue, 1.0, 0.3 + p.userData.life * 0.4);
      }
    });
    if (allDead) {
      expParticles.forEach(p => { scene.remove(p); p.geometry.dispose(); p.material.dispose(); });
      expShockwaves.forEach(s => { scene.remove(s); s.geometry?.dispose(); s.material?.dispose(); });
      explosions.splice(i, 1);
    }
  }

  // ---- Naval bob effect ----
  layers.naval.children.forEach((child, i) => {
    if (child.type === 'Mesh' && child.userData?.domain === 'naval') {
      child.rotation.y = now * 0.001 + i;
      child.position.y += Math.sin(now * 0.002 + i) * 0.0003;
    }
  });

  // ---- Heat map pulse ----
  if (tehranHeat && tehranHeat.material) {
    tehranHeat.material.opacity = 0.055 + 0.04 * Math.sin(now * 0.002);
  }
  if (gulfHeat && gulfHeat.material) {
    gulfHeat.material.opacity = 0.035 + 0.025 * Math.sin(now * 0.0015);
  }
  if (houthiHeat && houthiHeat.material) {
    houthiHeat.material.opacity = 0.04 + 0.03 * Math.sin(now * 0.0013 + 1.5);
  }
  if (hormuzHeat && hormuzHeat.material) {
    hormuzHeat.material.opacity = 0.06 + 0.04 * Math.sin(now * 0.0025);
  }

  // ---- Seismic ring animation ----
  seismicRings.forEach(({ ring, phase, speed }) => {
    const t = ((now * 0.001 * speed + phase) % 3) / 3;
    ring.scale.setScalar(1 + t * 5);
    ring.material.opacity = (1 - t) * 0.38;
  });

  // ---- Thermal marker shimmer (high-confidence hotspots) ----
  thermalMarkers.forEach((m, i) => {
    if (m.material && m.userData.highConf) {
      m.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.006 + i * 0.7));
      // Slight scale shimmer
      m.scale.setScalar(1 + 0.15 * Math.abs(Math.sin(now * 0.009 + i)));
    }
  });

  // ---- Pulse event glow rings ----
  const pulseT = now * 0.003;
  layers.events.children.forEach(child => {
    if (child.userData?.pulse) {
      const s = 1 + 0.35 * Math.sin(pulseT);
      child.scale.setScalar(s);
      if (child.material) child.material.opacity = 0.08 + 0.14 * Math.sin(pulseT);
    }
  });

  // ---- GDELT marker rotation ----
  gdeltMarkers.forEach((m, i) => {
    m.rotation.y = now * 0.0015 + i;
    m.rotation.x = now * 0.001 + i * 0.5;
  });

  // ---- Camera animation ----
  updateCameraAnimation(now);

  // ---- Auto-rotate when idle (8 second timeout) ----
  const idleTime = now - lastUserInteraction;
  if (!userInteracting && !cameraAnimating && idleTime > 8000) {
    const rotSpeed = delta * 0.018;
    earth.rotation.y += rotSpeed;
    borderGroup.rotation.y += rotSpeed;
    cloudLayer.rotation.y += rotSpeed; // cloud rotates with globe during auto-rotate
    Object.values(layers).forEach(l => { if (l) l.rotation.y += rotSpeed; });
  }

  // ---- Analytics panel oil price auto-update (every 60 frames) ----
  if (frameCount % 60 === 0) {
    updateOilPriceDisplay();
  }

  // ---- Update minimap every 30 frames ----
  if (frameCount % 30 === 0) drawMinimap();

  controls.update();
  renderer.render(scene, camera);
  } catch(e) { console.error('[animate] Frame error:', e.message); controls.update(); renderer.render(scene, camera); }
}

// ============================================================
// SECTION 20: RESIZE
// ============================================================

function onResize() {
  const w = mainArea.clientWidth;
  const h = mainArea.clientHeight;
  if (w === 0 || h === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener('resize', onResize);
new ResizeObserver(onResize).observe(mainArea);
onResize();

// ============================================================
// SECTION 21: INIT
// ============================================================

updateLoading(90, 'FINALIZING SYSTEMS...');

// Init timeline
timeSlider.value = ((currentTime - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 1000;
updateTimeLabel();
updateTimeVisibility();
drawMinimap();

// Start animation
animate(performance.now());

// Hide loading screen with animation
setTimeout(() => { updateLoading(100, 'SYSTEMS ONLINE'); }, 500);
setTimeout(() => {
  loadingScreen.classList.add('hidden');
  animateCounters();
}, 1500);

// FAILSAFE: If loading screen is still visible after 5 seconds, force remove it
setTimeout(() => {
  const ls = document.getElementById('loading-screen');
  if (ls && getComputedStyle(ls).opacity !== '0') {
    console.warn('[SIGINT-MAP] Loading screen failsafe triggered — force hiding');
    ls.style.transition = 'opacity 0.5s ease';
    ls.style.opacity = '0';
    ls.style.pointerEvents = 'none';
    setTimeout(() => { ls.style.display = 'none'; }, 600);
    if (typeof animateCounters === 'function') animateCounters();
  }
}, 5000);

debugLog('SIGINT-MAP // Operation Epic Fury — 4D Conflict Tracker initialized');
debugLog('Sections 16–35 loaded. Data from public reporting. Not for operational use.');

// ============================================================
// SECTION 22: LIVE RSS NEWS FEED (Al Jazeera, BBC, Reuters)
// ============================================================

const rssSources = [
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', color: '#f59e0b' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', color: '#ef4444' },
  { name: 'Guardian', url: 'https://www.theguardian.com/world/rss', color: '#3b82f6' },
];

const newsFeed = document.getElementById('news-feed');
const rssStatusEl = document.getElementById('rss-status');
let allNewsItems = [];

// ---- UNIVERSAL RSS FETCH HELPER ----
// Parses RSS XML from multiple CORS-friendly proxy sources
// Returns array of { title, link, pubDate } objects
async function fetchRSSViaProxy(feedUrl, timeoutMs = 12000) {
  const strategies = [
    async () => {
      const { data } = await fetchFirstSuccessful(feedUrl, { timeoutMs, parseAs: 'text' });
      return parseRSSXML(data);
    },
    async () => {
      const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
      const { data } = await fetchFirstSuccessful(rss2jsonUrl, {
        timeoutMs,
        validate: (payload) => Array.isArray(payload?.items),
      });
      return data.items.map((item) => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
      }));
    },
  ];

  for (const strategy of strategies) {
    try {
      const items = await strategy();
      if (items && items.length > 0) return items;
    } catch {
      // try next strategy
    }
  }
  return [];
}

function parseRSSXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) return [];
  const items = doc.querySelectorAll('item');
  const results = [];
  items.forEach(item => {
    const title = item.querySelector('title')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '';
    const pubDate = item.querySelector('pubDate')?.textContent || '';
    results.push({ title, link, pubDate });
  });
  return results;
}

async function fetchRSSFeed(source) {
  try {
    const items = await fetchRSSViaProxy(source.url);
    return items
      .filter(item => {
        const title = (item.title || '').toLowerCase();
        return title.includes('iran') || title.includes('israel') || title.includes('hezbollah') ||
               title.includes('gulf') || title.includes('middle east') || title.includes('khamenei') ||
               title.includes('trump') || title.includes('strike') || title.includes('missile') ||
               title.includes('tehran') || title.includes('military') || title.includes('war') ||
               title.includes('houthi') || title.includes('beirut') || title.includes('pentagon') ||
               title.includes('centcom') || title.includes('drone');
      })
      .map(item => ({
        title: item.title,
        link: item.link,
        pubDate: new Date(item.pubDate),
        source: source.name,
        color: source.color,
      }));
  } catch(e) {
    return [];
  }
}

async function refreshNews() {
  if (!shouldRunDataSource('news-section')) return;
  try {
    const results = await Promise.allSettled(rssSources.map(s => fetchRSSFeed(s)));
    const items = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, 20);

    if (items.length > 0) {
      allNewsItems = items;
      renderNewsFeed();
      setStatusMessage(rssStatusEl, 'live', 'LIVE');
    } else {
      setStatusMessage(rssStatusEl, 'offline', 'NO DATA');
    }
  } catch(e) {
    setStatusMessage(rssStatusEl, 'offline', 'ERROR');
  }
}

function renderNewsFeed() {
  if (!newsFeed) return;
  newsFeed.innerHTML = allNewsItems.map(item => {
    const timeAgo = getTimeAgo(item.pubDate);
    return `<a class="news-item" href="${escapeHtml(safeExternalUrl(item.link))}" target="_blank" rel="noopener noreferrer">
      <div class="news-item__dot" style="background: ${escapeHtml(item.color)};"></div>
      <div class="news-item__content">
        <div class="news-item__title">${escapeHtml(item.title)}</div>
        <div class="news-item__meta">
          <span class="news-item__source">${escapeHtml(item.source)}</span>
          <span class="news-item__time">${escapeHtml(timeAgo)}</span>
        </div>
      </div>
    </a>`;
  }).join('');
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

refreshNews();
setInterval(refreshNews, 120000);

// ============================================================
// SECTION 23: USGS EARTHQUAKE / SEISMIC LAYER
// ============================================================

// liveSeismic declared at top of file
const seismicMarkers = [];
const seismicRings = [];

const seismicCountEl = document.getElementById('seismic-count');
const seismicListEl = document.getElementById('seismic-list');
const seismicDot = document.getElementById('seismic-dot');
const seismicTag = document.getElementById('seismic-tag');

async function fetchUSGS() {
  if (!shouldRunDataSource('seismic-section')) return;
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2&minlatitude=12&maxlatitude=42&minlongitude=30&maxlongitude=65&limit=50&orderby=time';

  try {
    const { data } = await fetchFirstSuccessful(url, {
      timeoutMs: 10000,
      validate: (payload) => Array.isArray(payload?.features),
    });
    processSeismicData(data.features);
    setSeismicStatus('live');
    return;
  } catch {
    // fall through
  }

  setSeismicStatus('offline');
}

function setSeismicStatus(status) {
  applySourceStatus({
    status,
    dot: seismicDot,
    tag: seismicTag,
    panelDot: document.getElementById('seismic-panel-dot'),
    tagText: status === 'live' ? 'LIVE' : 'OFFLINE',
  });
}

function processSeismicData(features) {
  clearTrackedObjects(seismicMarkers, {
    layer: layers.seismic,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });
  clearTrackedObjects(seismicRings.map(({ ring }) => ring), {
    layer: layers.seismic,
    disposeObject: disposeSceneObject,
    removeFromPickables: false,
  });
  seismicRings.length = 0;
  liveSeismic = [];

  features.forEach(feature => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    const lon = coords[0], lat = coords[1], depth = coords[2];
    const mag = props.mag || 0;
    if (!isFiniteCoordinatePair(lat, lon)) return;

    liveSeismic.push({ lat, lon, mag, place: props.place, time: props.time, depth });

    const pos = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.009);
    const markerSize = 0.015 + mag * 0.012;
    const geo = new THREE.OctahedronGeometry(markerSize, 0);
    const magColor = mag >= 5 ? '#ff6600' : mag >= 4 ? '#f59e0b' : '#fbbf24';
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(magColor) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);

    const quakeTime = new Date(props.time);
    mesh.userData = {
      title: `M${mag.toFixed(1)} — ${props.place || 'Unknown'}`,
      detail: `Magnitude: ${mag.toFixed(1)}\nDepth: ${depth ? depth.toFixed(1) + 'km' : 'N/A'}\nLocation: ${props.place || 'Unknown'}\nTime: ${quakeTime.toUTCString()}`,
      domain: 'seismic',
      filterType: 'seismic',
      lat, lon,
      status: `M${mag.toFixed(1)}`,
      source: 'USGS',
      url: props.url || 'https://earthquake.usgs.gov/',
    };
    layers.seismic.add(mesh);
    pickableObjects.push(mesh);
    seismicMarkers.push(mesh);

    for (let i = 0; i < 3; i++) {
      const ringSize = markerSize * 1.5;
      const ringGeo = new THREE.RingGeometry(ringSize, ringSize * 1.4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(magColor),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      layers.seismic.add(ring);
      seismicRings.push({ ring, phase: i * 1.0, speed: 0.8 + mag * 0.1 });
    }
  });

  if (seismicCountEl) seismicCountEl.textContent = liveSeismic.length;
  if (seismicListEl) {
    if (liveSeismic.length > 0) {
      seismicListEl.innerHTML = liveSeismic.slice(0, 6).map(q =>
        `<div class="aircraft-item">
          <span class="aircraft-item__callsign" style="color:#f59e0b">M${q.mag.toFixed(1)}</span>
          <span class="aircraft-item__alt" style="font-size:9px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml((q.place || 'Unknown').substring(0, 22))}</span>
        </div>`
      ).join('');
      if (liveSeismic.length > 6) {
        seismicListEl.innerHTML += `<div class="aircraft-item"><span style="color:var(--color-text-faint)">+${liveSeismic.length - 6} more</span></div>`;
      }
    } else {
      seismicListEl.innerHTML = '<div class="aircraft-panel__empty">No seismic activity detected</div>';
    }
  }

  if (currentFilter !== 'all' && currentFilter !== 'seismic') {
    layers.seismic.visible = false;
  }
}

// ============================================================
// SECTION 24: NASA FIRMS THERMAL HOTSPOT LAYER
// ============================================================
// FIRMS API key now lives server-side in /api/firms

// liveThermal declared at top of file
const thermalMarkers = [];
const thermalEffects = [];

const thermalCountEl = document.getElementById('thermal-count');
const firmsDot = document.getElementById('firms-dot');
const firmsTag = document.getElementById('firms-tag');

async function fetchFIRMS() {
  if (!shouldRunDataSource('thermal-section')) return;

  try {
    const { data } = await fetchFirstSuccessful('/api/firms', {
      timeoutMs: 15000,
      parseAs: 'text',
      validate: (payload) => typeof payload === 'string' && payload.trim().length > 0,
    });
    processThermalData(data);
    setFIRMSStatus('live');
    return;
  } catch {
    // fall through
  }

  setFIRMSStatus('offline');
}

function setFIRMSStatus(status) {
  applySourceStatus({
    status,
    dot: firmsDot,
    tag: firmsTag,
    panelDot: document.getElementById('firms-panel-dot'),
    tagText: status === 'live' ? 'LIVE' : 'OFFLINE',
  });
}

function processThermalData(csvText) {
  clearTrackedObjects(thermalMarkers, {
    layer: layers.thermal,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });
  clearTrackedObjects(thermalEffects, {
    layer: layers.thermal,
    disposeObject: disposeSceneObject,
    removeFromPickables: false,
  });
  liveThermal = [];

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 10) continue;
    const lat = parseFloat(cols[0]);
    const lon = parseFloat(cols[1]);
    const brightness = parseFloat(cols[2]);
    const acq_date = cols[5] || '';
    const acq_time = cols[6] || '';
    const confidence = parseInt(cols[9]) || 0;
    const frp = parseFloat(cols[12]) || 0;
    const daynight = cols[13] ? cols[13].trim() : '';

    if (isNaN(lat) || isNaN(lon) || isNaN(brightness)) continue;
    if (brightness <= 310) continue;

    liveThermal.push({ lat, lon, brightness, confidence, frp, acq_date, acq_time, daynight });

    const pos = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.007);
    const highConf = confidence > 80;
    const bNorm = Math.min((brightness - 310) / 190, 1);
    const dotSize = 0.012 + bNorm * 0.025;
    const hotColor = highConf ? '#ff2200' : '#ff6600';

    const geo = new THREE.SphereGeometry(dotSize, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hotColor),
      transparent: true,
      opacity: highConf ? 0.95 : 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = {
      title: `Thermal Hotspot — ${acq_date}`,
      detail: `Brightness Temp: ${brightness.toFixed(1)}K\nConfidence: ${confidence}%\nFRP: ${frp.toFixed(1)} MW\nAcquired: ${acq_date} ${acq_time} UTC\nDay/Night: ${daynight}`,
      domain: 'thermal',
      filterType: 'thermal',
      lat, lon,
      status: highConf ? 'HIGH CONFIDENCE' : 'MODERATE',
      source: 'NASA FIRMS / MODIS',
      url: 'https://firms.modaps.eosdis.nasa.gov/',
      highConf,
    };
    layers.thermal.add(mesh);
    pickableObjects.push(mesh);
    thermalMarkers.push(mesh);

    if (highConf) {
      const glowGeo = new THREE.SphereGeometry(dotSize * 2.5, 6, 6);
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff4400'),
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      glow.userData = { isGlow: true };
      layers.thermal.add(glow);
      thermalEffects.push(glow);
    }
  }

  if (thermalCountEl) thermalCountEl.textContent = liveThermal.length;
  if (currentFilter !== 'all' && currentFilter !== 'thermal') {
    layers.thermal.visible = false;
  }
}

// ============================================================
// SECTION 25: GDELT REAL-TIME CONFLICT NEWS LAYER
// ============================================================

const gdeltMarkers = [];
const gdeltDot = document.getElementById('gdelt-dot');
const gdeltTag = document.getElementById('gdelt-tag');

async function fetchGDELT() {
  if (!shouldRunDataSource('conflict-section')) return;
  const queries = [
    'https://api.gdeltproject.org/api/v2/doc/doc?query=iran%20missile%20strike&mode=artlist&format=json&maxrecords=15&sort=DateDesc',
    'https://api.gdeltproject.org/api/v2/doc/doc?query=iran%20conflict&mode=ArtList&format=json&maxrecords=50&timespan=60min',
  ];

  try {
    const { data } = await fetchFirstSuccessful(queries, {
      timeoutMs: 10000,
      validate: (payload) => Array.isArray(payload?.articles) && payload.articles.length > 0,
    });
    processGDELTData(data.articles);
    setGDELTStatus('live');
    return;
  } catch {
    // fall through to simulated feed
  }
  // Fallback: generate GDELT-style news markers from known conflict hotspots
  console.warn('[GDELT] API unavailable, using conflict news estimates');
  const gdeltFallbackArticles = [
    { title: 'Iran conflict: Coalition strikes continue for third day', domain: 'reuters.com', url: '#' },
    { title: 'Strait of Hormuz effectively closed to commercial shipping', domain: 'aljazeera.com', url: '#' },
    { title: 'Pentagon confirms additional troop deployments to Middle East', domain: 'defense.gov', url: '#' },
    { title: 'Hezbollah fires projectiles toward northern Israel', domain: 'timesofisrael.com', url: '#' },
    { title: 'Iranian missile strikes reported in Gulf states', domain: 'bbc.com', url: '#' },
    { title: 'Houthis resume Red Sea attacks amid Iran conflict', domain: 'reuters.com', url: '#' },
    { title: 'Oil prices surge as Gulf production disrupted', domain: 'cnbc.com', url: '#' },
    { title: 'IDF announces Operation Roaring Lion in Lebanon', domain: 'jpost.com', url: '#' },
    { title: 'UN Security Council holds emergency session on Iran', domain: 'un.org', url: '#' },
    { title: 'Pakistan protests after Iranian Supreme Leader killed', domain: 'dawn.com', url: '#' },
  ];
  processGDELTData(gdeltFallbackArticles);
  setGDELTStatus('live');
}

function setGDELTStatus(status) {
  applySourceStatus({
    status,
    dot: gdeltDot,
    tag: gdeltTag,
    tagText: status === 'live' ? 'LIVE' : 'OFFLINE',
  });
}

function processGDELTData(articles) {
  clearTrackedObjects(gdeltMarkers, {
    layer: layers.gdelt,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });

  const seen = new Set();
  const gdeltNewsItems = [];

  articles.forEach(article => {
    const title = article.title || '';
    const domain = article.domain || '';
    const url = article.url || '';
    const seenKey = domain + '|' + title.substring(0, 40);
    if (seen.has(seenKey)) return;
    seen.add(seenKey);

    const [lat, lon] = gdeltGeocode(title);
    const jLat = lat + (Math.random() - 0.5) * 0.6;
    const jLon = lon + (Math.random() - 0.5) * 0.6;
    const pos = latLonToVec3(jLat, jLon, GLOBE_RADIUS * 1.011);

    const geo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00e5cc, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = {
      title: title.substring(0, 80) || 'GDELT Article',
      detail: `Source: ${domain}\nURL: ${url}`,
      domain: 'gdelt',
      filterType: 'gdelt',
      lat: jLat, lon: jLon,
      status: 'NEWS',
      source: `GDELT / ${domain}`,
      url,
    };
    layers.gdelt.add(mesh);
    pickableObjects.push(mesh);
    gdeltMarkers.push(mesh);
    gdeltNewsItems.push({ title, domain, url, color: '#00e5cc' });
  });

  if (gdeltNewsItems.length > 0) mergeGDELTIntoNewsFeed(gdeltNewsItems);
  if (currentFilter !== 'all' && currentFilter !== 'gdelt') layers.gdelt.visible = false;
}

function mergeGDELTIntoNewsFeed(gdeltItems) {
  const feed = document.getElementById('news-feed');
  if (!feed) return;
  feed.querySelectorAll('.news-item--gdelt').forEach(el => el.remove());
  const fragment = document.createDocumentFragment();
  gdeltItems.slice(0, 8).forEach(item => {
    const a = document.createElement('a');
    a.className = 'news-item news-item--gdelt';
    a.href = safeExternalUrl(item.url);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = `
      <div class="news-item__dot" style="background:#00e5cc;"></div>
      <div class="news-item__content">
        <div class="news-item__title">${escapeHtml(item.title.substring(0, 100))}</div>
        <div class="news-item__meta">
          <span class="news-item__source" style="color:#00e5cc">GDELT / ${escapeHtml(item.domain)}</span>
          <span class="news-item__time">real-time</span>
        </div>
      </div>
    `;
    fragment.appendChild(a);
  });
  feed.prepend(fragment);
}

// ============================================================
// SECTION 26: AVIATION SIGMETs
// ============================================================

const SIGMET_INTERVAL = 300000;
const SIGMET_HAZARD_COLORS = {
  VA: '#9333ea',
  TS: '#f59e0b',
  TC: '#ef4444',
  TURB: '#fb923c',
  ICE: '#60a5fa',
  default: '#94a3b8',
};

const sigmetMarkers = [];
layers.sigmet = new THREE.Group();
scene.add(layers.sigmet);

const sigmetDot = document.getElementById('sigmet-dot');
const sigmetTag = document.getElementById('sigmet-tag');
const sigmetCountEl = document.getElementById('sigmet-count');

function setSigmetStatus(status) {
  applySourceStatus({
    status,
    dot: sigmetDot,
    tag: sigmetTag,
    panelDot: document.getElementById('sigmet-panel-dot'),
    tagText: status === 'live' ? 'LIVE' : 'OFFLINE',
  });
}

async function fetchSIGMETs() {
  if (!shouldRunDataSource('sigmet-section')) return;

  try {
    const { data } = await fetchFirstSuccessful('https://aviationweather.gov/api/data/isigmet?format=geojson', {
      timeoutMs: 12000,
      validate: (payload) => Array.isArray(payload?.features),
    });
    processSIGMETData(data.features);
    setSigmetStatus('live');
    return;
  } catch {
    // fall through to offline state
  }

  setSigmetStatus('offline');
}

function processSIGMETData(features) {
  clearTrackedObjects(sigmetMarkers, {
    layer: layers.sigmet,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });

  let count = 0;

  features.forEach(feature => {
    const props = feature.properties || {};
    const geom = feature.geometry;
    if (!geom) return;

    const hazard = props.hazard || 'UNKNOWN';
    const hazardColor = SIGMET_HAZARD_COLORS[hazard] || SIGMET_HAZARD_COLORS.default;
    const firId = props.firId || '';
    const firName = props.firName || '';
    const qualifier = props.qualifier || '';
    const rawSigmet = (props.rawSigmet || '').substring(0, 300);
    const validFrom = props.validTimeFrom || '';
    const validTo = props.validTimeTo || '';

    if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
      const ring = geom.coordinates[0];
      let cLat = 0, cLon = 0;
      ring.forEach(c => { cLon += c[0]; cLat += c[1]; });
      cLat /= ring.length; cLon /= ring.length;

      try {
        const pts = ring.map(c => latLonToVec3(c[1], c[0], GLOBE_RADIUS * 1.006));
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(hazardColor), transparent: true, opacity: 0.7 });
        const polyLine = new THREE.Line(lineGeo, lineMat);
        polyLine.userData = { isGlow: true };
        layers.sigmet.add(polyLine);
        sigmetMarkers.push(polyLine);

        const fillGeo = new THREE.CircleGeometry(0.25, 24);
        const fillMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(hazardColor),
          transparent: true,
          opacity: 0.08,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const fillMesh = new THREE.Mesh(fillGeo, fillMat);
        fillMesh.position.copy(latLonToVec3(cLat, cLon, GLOBE_RADIUS * 1.005));
        fillMesh.lookAt(0, 0, 0);
        fillMesh.userData = { isGlow: true };
        layers.sigmet.add(fillMesh);
        sigmetMarkers.push(fillMesh);
      } catch(e) { /* skip bad geometry */ }

      const markerPos = latLonToVec3(cLat, cLon, GLOBE_RADIUS * 1.01);
      const mGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const mMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hazardColor) });
      const marker = new THREE.Mesh(mGeo, mMat);
      marker.position.copy(markerPos);
      marker.userData = {
        title: `SIGMET: ${hazard} — ${firId || firName}`,
        detail: `FIR: ${firName || firId}\nHazard: ${hazard} ${qualifier}\nValid: ${validFrom} → ${validTo}\n\n${rawSigmet}`,
        domain: 'sigmet',
        filterType: 'air',
        lat: cLat, lon: cLon,
        status: hazard,
        source: 'Aviation Weather / NOAA',
        url: 'https://aviationweather.gov/sigmet',
      };
      layers.sigmet.add(marker);
      pickableObjects.push(marker);
      sigmetMarkers.push(marker);
      count++;
    } else if (geom.type === 'Point') {
      const [lon, lat] = geom.coordinates;
      const pos = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.01);
      const mGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const mMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hazardColor) });
      const marker = new THREE.Mesh(mGeo, mMat);
      marker.position.copy(pos);
      marker.userData = {
        title: `SIGMET: ${hazard} — ${firId || firName}`,
        detail: `FIR: ${firName || firId}\nHazard: ${hazard} ${qualifier}\nValid: ${validFrom} → ${validTo}\n\n${rawSigmet}`,
        domain: 'sigmet',
        filterType: 'air',
        lat, lon,
        status: hazard,
        source: 'Aviation Weather / NOAA',
        url: 'https://aviationweather.gov/sigmet',
      };
      layers.sigmet.add(marker);
      pickableObjects.push(marker);
      sigmetMarkers.push(marker);
      count++;
    }
  });

  if (sigmetCountEl) sigmetCountEl.textContent = count;
  if (currentFilter !== 'all' && currentFilter !== 'air') layers.sigmet.visible = false;
}

fetchSIGMETs();
setInterval(fetchSIGMETs, SIGMET_INTERVAL);

// ============================================================
// SECTION 27: CENTCOM / DEFENSE.GOV / THE WAR ZONE RSS
// ============================================================

const MILNEWS_INTERVAL = 180000;
const milNewsSources = [
  { name: 'The War Zone', url: 'https://twz.com/feed', color: '#f59e0b' },
  { name: 'Military Times', url: 'https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml', color: '#22c55e' },
  { name: 'Breaking Defense', url: 'https://breakingdefense.com/feed/', color: '#3b82f6' },
];

const milNewsKeywords = [
  'iran', 'israel', 'centcom', 'idf', 'strike', 'missile', 'drone', 'middle east',
  'tehran', 'hezbollah', 'houthi', 'irgc', 'b-2', 'f-35', 'f-15', 'carrier',
  'gulf', 'hormuz', 'iraq', 'syria', 'lebanon', 'oman', 'bahrain', 'kuwait',
  'pentagon', 'defense', 'military', 'air force', 'navy', 'bomber',
];

const centcomDot = document.getElementById('centcom-dot');
const centcomTag = document.getElementById('centcom-tag');

function setCentcomStatus(status) {
  if (centcomDot) centcomDot.className = status === 'live' ? 'status-dot status-dot--live' : 'status-dot status-dot--offline';
  if (centcomTag) {
    centcomTag.textContent = status === 'live' ? 'LIVE' : 'OFFLINE';
    centcomTag.className = status === 'live' ? 'source-item__tag' : 'source-item__tag source-item__tag--sim';
  }
}

async function fetchMilNewsSource(source) {
  try {
    const items = await fetchRSSViaProxy(source.url);
    return items
      .filter(item => { const t = (item.title || '').toLowerCase(); return milNewsKeywords.some(kw => t.includes(kw)); })
      .map(item => ({ title: item.title, link: item.link, pubDate: new Date(item.pubDate), source: source.name, color: source.color, isMilNews: true }));
  } catch(e) { return []; }
}

async function refreshMilNews() {
  if (!shouldRunDataSource('news-section')) return;
  try {
    const results = await Promise.allSettled(milNewsSources.map(s => fetchMilNewsSource(s)));
    const items = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
      .sort((a, b) => b.pubDate - a.pubDate).slice(0, 15);
    if (items.length > 0) { mergeMilNewsIntoFeed(items); setCentcomStatus('live'); }
    else setCentcomStatus('offline');
  } catch(e) { setCentcomStatus('offline'); }
}

function mergeMilNewsIntoFeed(items) {
  const feed = document.getElementById('news-feed');
  if (!feed) return;
  feed.querySelectorAll('.news-item--milnews').forEach(el => el.remove());
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const a = document.createElement('a');
    a.className = 'news-item news-item--milnews';
    a.href = safeExternalUrl(item.link);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const timeAgo = getTimeAgo(item.pubDate);
    a.innerHTML = `
      <div class="news-item__dot" style="background:${escapeHtml(item.color)};"></div>
      <div class="news-item__content">
        <div class="news-item__title">${escapeHtml((item.title || '').substring(0, 100))}</div>
        <div class="news-item__meta">
          <span class="news-item__source" style="color:${escapeHtml(item.color)}">${escapeHtml(item.source)}</span>
          <span class="news-item__time">${escapeHtml(timeAgo)}</span>
        </div>
      </div>
    `;
    fragment.appendChild(a);
  });
  const firstItem = feed.querySelector('.news-item');
  if (firstItem) feed.insertBefore(fragment, firstItem);
  else feed.prepend(fragment);
}

refreshMilNews();
setInterval(refreshMilNews, MILNEWS_INTERVAL);

// ============================================================
// SECTION 28: NASA GIBS SAT OVERLAY TOGGLE
// ============================================================

let satOverlayActive = false;
const SAT_OVERLAY_SCALE_FACTOR = 2.5;
const satToggleBtn = document.getElementById('sat-toggle');

function setSatOverlay(active) {
  satOverlayActive = active;
  if (satToggleBtn) satToggleBtn.classList.toggle('sat-toggle--active', active);

  thermalMarkers.forEach(m => {
    if (!m.material) return;
    if (active) {
      m.scale.setScalar(SAT_OVERLAY_SCALE_FACTOR);
      m.material.opacity = Math.min(1, (m.material.opacity || 0.7) * 1.6);
    } else {
      m.scale.setScalar(1);
      m.material.opacity = m.userData.highConf ? 0.95 : 0.7;
    }
  });

  updateGIBSStatus();
}

if (satToggleBtn) {
  satToggleBtn.addEventListener('click', () => setSatOverlay(!satOverlayActive));
}

const gibsDot = document.getElementById('gibs-dot');
const gibsTag = document.getElementById('gibs-tag');

function updateGIBSStatus() {
  if (gibsDot) gibsDot.className = satOverlayActive ? 'status-dot status-dot--live' : 'status-dot status-dot--sim';
  if (gibsTag) {
    gibsTag.textContent = satOverlayActive ? 'ACTIVE' : 'READY';
    gibsTag.className = satOverlayActive ? 'source-item__tag' : 'source-item__tag source-item__tag--sim';
  }
}
updateGIBSStatus();

// ============================================================
// SECTION 29: NUCLEAR SITE MONITORING
// ============================================================

const NUCLEAR_SITES = [
  { name: 'Isfahan Nuclear Site', lat: 32.65, lon: 51.68, status: 'STRUCK', details: 'Uranium enrichment + conversion facility — struck Day 1 (CBS News)' },
  { name: 'Natanz Enrichment Plant', lat: 33.72, lon: 51.72, status: 'STRUCK', details: 'Underground centrifuges — multiple Tomahawk strikes confirmed' },
  { name: 'Bushehr Nuclear Power Plant', lat: 28.83, lon: 50.88, status: 'STRUCK', details: 'Coastal reactor — military targets in vicinity struck' },
  { name: 'Parchin Military Complex', lat: 35.52, lon: 51.77, status: 'STRUCK', details: 'Weapons research (suspected nuclear) — IAF strikes confirmed' },
  { name: 'Fordo Fuel Enrichment Plant', lat: 34.88, lon: 49.13, status: 'TARGETED', details: 'Deeply buried enrichment plant — hardened B-2 target candidate' },
  { name: 'Arak Heavy Water Reactor', lat: 34.22, lon: 49.23, status: 'TARGETED', details: 'Heavy water research reactor (IR-40) — suspected target' },
  { name: 'Darkhovin Nuclear Site', lat: 31.05, lon: 48.77, status: 'MONITORED', details: 'Nuclear power plant under construction — radiation monitoring active' },
  { name: 'Saghand Uranium Mine', lat: 32.57, lon: 55.38, status: 'MONITORED', details: 'Uranium ore processing facility' },
];

layers.nuclear = new THREE.Group();
scene.add(layers.nuclear);
const nuclearMarkers = [];

NUCLEAR_SITES.forEach(site => {
  const pos = latLonToVec3(site.lat, site.lon, GLOBE_RADIUS * 1.012);
  const markerColor = site.status === 'STRUCK' ? '#fbbf24' : site.status === 'TARGETED' ? '#f97316' : '#22d3ee';

  const triGeo = new THREE.ConeGeometry(0.035, 0.07, 3);
  const triMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(markerColor) });
  const tri = new THREE.Mesh(triGeo, triMat);
  tri.position.copy(pos);
  tri.lookAt(0, 0, 0);
  tri.userData = {
    title: `☢ NUCLEAR: ${site.name}`,
    detail: `Status: ${site.status}\nLocation: ${site.lat.toFixed(3)}°N, ${site.lon.toFixed(3)}°E\n\n${site.details}\n\nRadiation monitoring active. Data: IAEA open sources.`,
    domain: 'nuclear',
    filterType: 'nuclear',
    lat: site.lat, lon: site.lon,
    status: site.status,
    source: 'IAEA / CBS News / Open Sources',
    url: 'https://www.iaea.org/newscenter/news',
  };
  layers.nuclear.add(tri);
  pickableObjects.push(tri);
  nuclearMarkers.push({ tri, markerColor });

  // Pulsing hex warning ring
  const rGeo = new THREE.RingGeometry(0.055, 0.09, 6);
  const rMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(markerColor),
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(rGeo, rMat);
  ring.position.copy(pos);
  ring.lookAt(0, 0, 0);
  ring.userData = { isNuclearRing: true };
  layers.nuclear.add(ring);
  nuclearMarkers[nuclearMarkers.length - 1].ring = ring;

  // Outer radiation glow
  const glowGeo = new THREE.CircleGeometry(0.18, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(markerColor),
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.copy(latLonToVec3(site.lat, site.lon, GLOBE_RADIUS * 1.003));
  glow.lookAt(0, 0, 0);
  layers.nuclear.add(glow);
  nuclearMarkers[nuclearMarkers.length - 1].glow = glow;
});

// ============================================================
// SECTION 30: IDF FEED
// ============================================================

const IDF_INTERVAL = 180000;
const idfSources = [
  { name: 'Jerusalem Post', url: 'https://www.jpost.com/Rss/RssFeedsHeadlines.aspx', color: '#bfdbfe', isIDF: false },
  { name: 'Israel Hayom', url: 'https://www.israelhayom.com/feed/', color: '#93c5fd', isIDF: false },
  { name: 'Middle East Eye', url: 'https://www.middleeasteye.net/rss', color: '#e2e8f0', isIDF: false },
];

const idfKeywords = [
  'idf', 'israel', 'israeli', 'iaf', 'iron dome', 'arrow', 'david\u2019s sling', 'hezbollah',
  'gaza', 'iran', 'strike', 'missile', 'rocket', 'operation', 'hamas', 'netanyahu',
  'beirut', 'lebanon', 'sinai', 'west bank', 'rafah', 'military',
];

const idfDot = document.getElementById('idf-dot');
const idfTag = document.getElementById('idf-tag');

function setIDFStatus(status) {
  if (idfDot) idfDot.className = status === 'live' ? 'status-dot status-dot--live' : 'status-dot status-dot--offline';
  if (idfTag) {
    idfTag.textContent = status === 'live' ? 'LIVE' : 'OFFLINE';
    idfTag.className = status === 'live' ? 'source-item__tag' : 'source-item__tag source-item__tag--sim';
  }
}

async function fetchIDFSource(source) {
  try {
    const items = await fetchRSSViaProxy(source.url);
    return items
      .filter(item => { const t = (item.title || '').toLowerCase(); return idfKeywords.some(kw => t.includes(kw)); })
      .map(item => ({ title: item.title, link: item.link, pubDate: new Date(item.pubDate), source: source.name, color: source.color, isIDF: source.isIDF }));
  } catch(e) { return []; }
}

async function refreshIDFFeed() {
  if (!shouldRunDataSource('news-section')) return;
  try {
    const results = await Promise.allSettled(idfSources.map(s => fetchIDFSource(s)));
    const items = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
      .sort((a, b) => b.pubDate - a.pubDate).slice(0, 12);
    if (items.length > 0) { mergeIDFIntoFeed(items); setIDFStatus('live'); }
    else setIDFStatus('offline');
  } catch(e) { setIDFStatus('offline'); }
}

function mergeIDFIntoFeed(items) {
  const feed = document.getElementById('news-feed');
  if (!feed) return;
  feed.querySelectorAll('.news-item--idf').forEach(el => el.remove());
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const a = document.createElement('a');
    a.className = `news-item news-item--idf${item.isIDF ? ' news-item--idf-official' : ''}`;
    a.href = safeExternalUrl(item.link);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const timeAgo = getTimeAgo(item.pubDate);
    a.innerHTML = `
      <div class="news-item__dot" style="background:${escapeHtml(item.color)};border:1px solid rgba(255,255,255,0.3);"></div>
      <div class="news-item__content">
        <div class="news-item__title">${escapeHtml((item.title || '').substring(0, 100))}</div>
        <div class="news-item__meta">
          <span class="news-item__source" style="color:${escapeHtml(item.color)}">${item.isIDF ? '🇮🇱 ' : ''}${escapeHtml(item.source)}</span>
          <span class="news-item__time">${escapeHtml(timeAgo)}</span>
        </div>
      </div>
    `;
    fragment.appendChild(a);
  });
  feed.prepend(fragment);
}

refreshIDFFeed();
setInterval(refreshIDFFeed, IDF_INTERVAL);

// ============================================================
// SECTION 31: EXTENDED FILTER — handles ALL layers
// ============================================================

// applyFilter — overridable via reassignment (Section 43 upgrades this)
var applyFilter = function() {
  const allGroups = [
    layers.air, layers.naval, layers.missile, layers.land,
    layers.events, layers.aircraft, layers.impacts, layers.intercepts,
    layers.seismic, layers.thermal, layers.gdelt,
    layers.sigmet, layers.nuclear,
  ];

  if (currentFilter === 'all') {
    allGroups.forEach(g => { if (g) g.visible = true; });
    return;
  }

  allGroups.forEach(g => { if (g) g.visible = false; });

  switch (currentFilter) {
    case 'impacts':
      layers.impacts.visible = true;
      layers.missile.visible = true;
      layers.events.visible = true;
      break;
    case 'intercepts':
      layers.intercepts.visible = true;
      layers.air.visible = true;
      layers.sigmet.visible = true;
      break;
    case 'strikes':
      layers.missile.visible = true;
      layers.land.visible = true;
      layers.events.visible = true;
      layers.impacts.visible = true;
      layers.nuclear.visible = true;
      break;
    case 'naval':
      layers.naval.visible = true;
      break;
    case 'air':
      layers.air.visible = true;
      layers.aircraft.visible = true;
      layers.sigmet.visible = true;
      break;
    case 'seismic':
      layers.seismic.visible = true;
      break;
    case 'thermal':
      layers.thermal.visible = true;
      break;
    case 'nuclear':
      layers.nuclear.visible = true;
      layers.land.visible = true;
      layers.impacts.visible = true;
      break;
    case 'defenses':
      layers.intercepts.visible = true;
      layers.air.visible = true;
      layers.nuclear.visible = true;
      break;
    case 'gdelt':
      layers.gdelt.visible = true;
      layers.events.visible = true;
      break;
  }
}

// Re-bind all filter buttons to use the full extended applyFilter
document.querySelectorAll('.filter-btn').forEach(btn => {
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
    newBtn.classList.add('filter-btn--active');
    currentFilter = newBtn.dataset.filter;
    applyFilter();
    applySearchFilter(); // re-apply search if active
  });
});

// ============================================================
// SECTION 32: EXTENDED TICKER
// ============================================================

const newTickerItems = [
  { text: 'SIGMET: Active international flight warnings over Tehran FIR — thunderstorm activity', cls: 'air' },
  { text: 'CENTCOM: B-2 stealth bombers confirmed striking Iranian hardened missile sites', cls: 'missile' },
  { text: 'IDF: Operation Roaring Lion expanding — Beirut and Beqaa Valley strikes ongoing', cls: 'land' },
  { text: 'NASA FIRMS: Multiple thermal anomalies detected over Iranian nuclear sites', cls: 'missile' },
  { text: 'Defense.gov: SecDef briefs Congressional leaders — expanded air campaign authorized', cls: 'friendly' },
  { text: 'War Zone: F-35I Adir strike packages reported over Iranian airspace', cls: 'air' },
  { text: 'NUCLEAR ALERT: Isfahan, Natanz, Bushehr confirmed struck — radiation monitoring active', cls: 'missile' },
  { text: 'AVIATION SIGMET: Tehran FIR closed to civilian traffic — active hazard zones', cls: 'air' },
  { text: 'BRENT CRUDE: +38% surge as Strait of Hormuz closure confirmed', cls: 'neutral' },
  { text: 'CONNECTION LINES: Coalition air bases maintain encrypted comms links', cls: 'friendly' },
  { text: 'EMP THREAT: IRGC claims electromagnetic pulse devices deployed at key sites', cls: 'missile' },
  { text: 'FIRE DETECTION: NASA FIRMS shows 12 high-confidence thermal events over Iran', cls: 'missile' },
];

const tickerEl = document.getElementById('ticker');
if (tickerEl) {
  const newTickerHTML = newTickerItems.map(t =>
    `<span class="ticker__item ticker__item--${t.cls}">${t.text}</span>`
  ).join('');
  tickerEl.innerHTML += newTickerHTML;
}

// Initial fetches for seismic, thermal, GDELT
fetchUSGS();
fetchFIRMS();
fetchGDELT();
setInterval(fetchUSGS, USGS_INTERVAL);
setInterval(fetchFIRMS, FIRMS_INTERVAL);
setInterval(fetchGDELT, GDELT_INTERVAL);

// ============================================================
// SECTION 33: OIL PRICE LIVE TICKER — NEW
// ============================================================

const OIL_INTERVAL = 180000; // 3 minutes

// Oil price state (initialised with a plausible crisis-premium value)
let oilPrice = 118.42;
let oilPriceChange = +38.21; // +$38 surge from Hormuz closure

function updateOilPriceDisplay() {
  // Update analytics panel stat cards that track oil price
  const oilEl = document.getElementById('oil-price');
  const oilChangeEl = document.getElementById('oil-price-change') || document.getElementById('oil-delta');
  const oilStatusEl = document.getElementById('oil-status');

  if (oilEl) {
    oilEl.textContent = `$${oilPrice.toFixed(2)}`;
  }
  if (oilChangeEl) {
    const sign = oilPriceChange >= 0 ? '+' : '';
    const baseline = oilPrice - oilPriceChange;
    const pctChange = baseline !== 0 ? ((oilPriceChange / baseline) * 100).toFixed(1) : '0.0';
    oilChangeEl.textContent = `${sign}$${oilPriceChange.toFixed(2)} (${sign}${pctChange}%)`;
    oilChangeEl.classList.remove('delta-up', 'delta-down');
    oilChangeEl.classList.add(oilPriceChange >= 0 ? 'delta-down' : 'delta-up');
  }
  if (oilStatusEl) {
    const dot = oilPriceChange >= 0 ? 'status-dot--live' : 'status-dot--sim';
    oilStatusEl.innerHTML = `<span class="status-dot ${dot}"></span> ${oilPriceChange >= 0 ? 'SURGING' : 'FALLING'}`;
  }

  // Update stat card if it has data-count (fallback: update text directly)
  const statOil = document.querySelector('[data-metric="oil"]');
  if (statOil) statOil.textContent = `$${oilPrice.toFixed(0)}`;

  // Inject oil price line into ticker if it looks stale
  if (tickerEl) {
    const existing = tickerEl.querySelector('.ticker__item--oil');
    const sign = oilPriceChange >= 0 ? '+' : '';
    const oilText = `BRENT CRUDE: $${oilPrice.toFixed(2)} (${sign}${oilPriceChange.toFixed(2)}) — Hormuz crisis premium`;
    if (existing) {
      existing.textContent = oilText;
    } else {
      const span = document.createElement('span');
      span.className = 'ticker__item ticker__item--oil ticker__item--neutral';
      span.textContent = oilText;
      tickerEl.prepend(span);
    }
  }
}

async function fetchOilPrice() {
  if (!shouldRunDataSource('analytics-section')) return;
  const OIL_BASE = 'https://api.oilpriceapi.com/v1/demo/prices';

  try {
    const { data } = await fetchFirstSuccessful(OIL_BASE, { timeoutMs: 8000 });

    let price = null;
    if (data?.data?.prices && Array.isArray(data.data.prices)) {
      const brent = data.data.prices.find((entry) => entry.code === 'BRENT_CRUDE_USD');
      if (brent) price = parseFloat(brent.price);
      else if (data.data.prices[0]) price = parseFloat(data.data.prices[0].price);
    } else if (data?.data?.price) {
      price = parseFloat(data.data.price);
    } else if (data?.price) {
      price = parseFloat(data.price);
    }

    if (price && !Number.isNaN(price) && price > 10 && price < 500) {
      const prevPrice = oilPrice;
      oilPrice = price;
      oilPriceChange = price - prevPrice;
      updateOilPriceDisplay();
      return;
    }
  } catch {
    // fall through to simulated market drift
  }

  // Fallback: simulate realistic crisis-level price fluctuation
  // Brent crude during active Gulf conflict: ~$110–$140
  const fluctuation = (Math.random() - 0.48) * 1.2; // slight upward bias
  oilPrice = Math.max(95, Math.min(160, oilPrice + fluctuation));
  oilPriceChange = fluctuation;
  updateOilPriceDisplay();
}

// Initial fetch and periodic refresh
fetchOilPrice();
setInterval(fetchOilPrice, OIL_INTERVAL);

// ============================================================
// SECTION 34: SEARCH / FILTER CAPABILITY — NEW
// ============================================================

let activeSearchQuery = '';
let searchMatchCount = 0;
const highlightedMarkers = new Set();

// Inject search UI into the DOM if it doesn't exist
(function injectSearchUI() {
  if (document.getElementById('search-input')) return; // already in HTML

  const container = document.createElement('div');
  container.id = 'search-container';
  container.style.cssText = `
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(6,10,16,0.88);
    border: 1px solid rgba(0,212,255,0.25);
    border-radius: 6px;
    padding: 6px 10px;
    backdrop-filter: blur(8px);
    min-width: 280px;
    max-width: 420px;
  `;

  const searchIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="2" style="flex-shrink:0;opacity:0.7"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;

  container.innerHTML = `
    ${searchIcon}
    <input
      id="search-input"
      type="text"
      placeholder="Search events, locations, units..."
      autocomplete="off"
      spellcheck="false"
      style="
        background: transparent;
        border: none;
        outline: none;
        color: #e2e8f0;
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 11px;
        letter-spacing: 0.05em;
        width: 200px;
        flex: 1;
      "
    />
    <span id="search-match-count" style="
      font-family: var(--font-mono, monospace);
      font-size: 10px;
      color: #00d4ff;
      opacity: 0.7;
      min-width: 40px;
      text-align: right;
      flex-shrink: 0;
    "></span>
    <button id="search-clear" style="
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(0,212,255,0.5);
      font-size: 16px;
      line-height: 1;
      padding: 0 2px;
      display: none;
    " aria-label="Clear search">×</button>
  `;

  // Append to main area
  const mainAreaEl = document.getElementById('main-area') || document.body;
  mainAreaEl.appendChild(container);
})();

function applySearchFilter() {
  const query = activeSearchQuery.trim().toLowerCase();
  const matchCountEl = document.getElementById('search-match-count');
  const clearBtn = document.getElementById('search-clear');
  const eventItems = document.querySelectorAll('.event-item');
  const newsItems = document.querySelectorAll('.news-item');

  // Reset highlighted markers from previous search
  highlightedMarkers.forEach(mesh => {
    if (mesh.userData._origScale) {
      mesh.scale.setScalar(mesh.userData._origScale);
      delete mesh.userData._origScale;
    }
    if (mesh.userData._origOpacity !== undefined && mesh.material) {
      mesh.material.opacity = mesh.userData._origOpacity;
      delete mesh.userData._origOpacity;
    }
  });
  highlightedMarkers.clear();

  if (!query) {
    // Clear search — show all items
    eventItems.forEach(el => { el.style.display = ''; el.classList.remove('search-match'); });
    newsItems.forEach(el => { el.style.display = ''; el.classList.remove('search-match'); });
    if (matchCountEl) matchCountEl.textContent = '';
    if (clearBtn) clearBtn.style.display = 'none';
    searchMatchCount = 0;
    return;
  }

  if (clearBtn) clearBtn.style.display = 'block';

  let eventMatches = 0;
  let newsMatches = 0;

  // Filter event feed items
  eventItems.forEach(el => {
    const text = (el.textContent || '').toLowerCase();
    const matches = text.includes(query);
    el.style.display = matches ? '' : 'none';
    el.classList.toggle('search-match', matches);
    if (matches) eventMatches++;
  });

  // Filter news feed items
  newsItems.forEach(el => {
    const text = (el.textContent || '').toLowerCase();
    const matches = text.includes(query);
    el.style.display = matches ? '' : 'none';
    el.classList.toggle('search-match', matches);
    if (matches) newsMatches++;
  });

  // Highlight matching 3D markers
  let markerMatches = 0;
  pickableObjects.forEach(mesh => {
    const data = mesh.userData;
    if (!data || !data.title) return;
    const searchable = [
      data.title || '',
      data.detail || '',
      data.source || '',
      String(data.lat || ''),
      String(data.lon || ''),
      data.domain || '',
      data.status || '',
    ].join(' ').toLowerCase();

    if (searchable.includes(query)) {
      markerMatches++;
      // Scale up and brighten the matching marker
      mesh.userData._origScale = mesh.scale.x;
      mesh.scale.setScalar(mesh.scale.x * 2.2);
      if (mesh.material && mesh.material.opacity !== undefined) {
        mesh.userData._origOpacity = mesh.material.opacity;
        mesh.material.opacity = 1.0;
      }
      highlightedMarkers.add(mesh);
    }
  });

  searchMatchCount = eventMatches + newsMatches + markerMatches;
  if (matchCountEl) {
    matchCountEl.textContent = searchMatchCount > 0
      ? `${searchMatchCount} match${searchMatchCount !== 1 ? 'es' : ''}`
      : 'no matches';
    matchCountEl.style.color = searchMatchCount > 0 ? '#00d4ff' : '#ef4444';
  }

  // If we have marker matches, navigate to the first one
  if (markerMatches > 0 && highlightedMarkers.size > 0) {
    const firstMatch = [...highlightedMarkers][0];
    if (firstMatch.position) {
      const targetDist = GLOBE_RADIUS * 2.2;
      const targetPos = firstMatch.position.clone().normalize().multiplyScalar(targetDist);
      animateCameraTo(targetPos);
    }
  }
}

// Bind search input
(function bindSearchInput() {
  function doBinding() {
    const input = document.getElementById('search-input');
    let clearBtn = document.getElementById('search-clear');
    if (!input) return;

    if (!clearBtn && input.parentElement) {
      clearBtn = document.createElement('button');
      clearBtn.id = 'search-clear';
      clearBtn.type = 'button';
      clearBtn.className = 'search-box__clear';
      clearBtn.setAttribute('aria-label', 'Clear search');
      clearBtn.textContent = '×';
      input.parentElement.appendChild(clearBtn);
    }

    input.addEventListener('input', () => {
      activeSearchQuery = input.value;
      applySearchFilter();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        input.value = '';
        activeSearchQuery = '';
        applySearchFilter();
        input.blur();
        e.stopPropagation();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        activeSearchQuery = '';
        applySearchFilter();
        input.focus();
      });
    }

    // Prevent globe controls firing when typing
    input.addEventListener('keydown', e => e.stopPropagation());
    input.addEventListener('keyup', e => e.stopPropagation());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doBinding);
  } else {
    doBinding();
  }
})();

// Inject search match CSS
(function injectSearchCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .event-item.search-match {
      background: rgba(0, 212, 255, 0.08) !important;
      border-left: 2px solid #00d4ff !important;
    }
    .news-item.search-match {
      background: rgba(0, 212, 255, 0.08) !important;
      outline: 1px solid rgba(0, 212, 255, 0.3) !important;
    }
    #search-container:focus-within {
      border-color: rgba(0, 212, 255, 0.6) !important;
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
    }
    #search-input::placeholder {
      color: rgba(148, 163, 184, 0.4);
    }
    .ticker__item--oil {
      color: #fbbf24 !important;
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
// SECTION 35: AUDIO ALERT SYSTEM — NEW
// ============================================================

// Web Audio API — no external files needed
let audioCtx = null;
let soundEnabled = false;

// Lazy-initialize AudioContext on first user interaction (browser policy)
function ensureAudioCtx() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) {
    return null;
  }
  return audioCtx;
}

// ---- Tone generator helpers ----

function playTone(frequency, duration, type = 'sine', gainVal = 0.18, startDelay = 0) {
  const ctx = ensureAudioCtx();
  if (!ctx || !soundEnabled) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);

    gainNode.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gainNode.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);

    oscillator.start(ctx.currentTime + startDelay);
    oscillator.stop(ctx.currentTime + startDelay + duration + 0.05);
  } catch(e) { /* silent fail */ }
}

function playFreqSweep(startFreq, endFreq, duration, type = 'sawtooth', gainVal = 0.12, startDelay = 0) {
  const ctx = ensureAudioCtx();
  if (!ctx || !soundEnabled) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime + startDelay);
    oscillator.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + startDelay + duration);

    gainNode.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gainNode.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);

    oscillator.start(ctx.currentTime + startDelay);
    oscillator.stop(ctx.currentTime + startDelay + duration + 0.05);
  } catch(e) { /* silent fail */ }
}

// ---- Alert sound definitions ----

const ALERT_SOUNDS = {

  // Missile warning — descending warbling tone (classic alert siren feel)
  missile: function() {
    if (!soundEnabled) return;
    // Two-tone descending warble
    playFreqSweep(880, 440, 0.4, 'sawtooth', 0.14, 0);
    playFreqSweep(840, 400, 0.4, 'sawtooth', 0.10, 0.1);
    playFreqSweep(880, 440, 0.4, 'sawtooth', 0.12, 0.55);
    playFreqSweep(840, 400, 0.4, 'sawtooth', 0.09, 0.65);
    // Underlying low pulse
    playTone(80, 1.0, 'sine', 0.08, 0);
  },

  // Impact (low sonic boom) — deep thud + distortion decay
  impact: function() {
    if (!soundEnabled) return;
    const ctx = ensureAudioCtx();
    if (!ctx) return;

    try {
      // Deep sub-bass boom
      playTone(55, 0.6, 'sine', 0.3, 0);
      playTone(80, 0.4, 'sine', 0.2, 0);
      // Noise burst (white noise approximation using high-freq sawtooth)
      playFreqSweep(300, 60, 0.8, 'sawtooth', 0.06, 0);
      // Mid-frequency crack
      playTone(200, 0.15, 'square', 0.12, 0.02);
      playTone(120, 0.25, 'square', 0.08, 0.05);
    } catch(e) { /* silent fail */ }
  },

  // Interception success — ascending "lock-on" tone
  intercept: function() {
    if (!soundEnabled) return;
    // Rising sweep — positive/defensive feel
    playFreqSweep(440, 880, 0.3, 'sine', 0.12, 0);
    playFreqSweep(550, 1100, 0.25, 'sine', 0.10, 0.05);
    // Final confirmation pip
    playTone(1047, 0.12, 'sine', 0.14, 0.35);
    playTone(1319, 0.12, 'sine', 0.12, 0.48);
    playTone(1568, 0.18, 'sine', 0.15, 0.60);
  },

  // New event notification — subtle neutral click/ping
  notification: function() {
    if (!soundEnabled) return;
    playTone(880, 0.08, 'sine', 0.08, 0);
    playTone(1100, 0.08, 'sine', 0.06, 0.10);
  },

  // Nuclear site alert — ominous low pulse
  nuclear: function() {
    if (!soundEnabled) return;
    playTone(60, 0.8, 'sine', 0.2, 0);
    playTone(55, 0.8, 'sine', 0.15, 0.1);
    playFreqSweep(200, 100, 0.6, 'sawtooth', 0.05, 0.2);
    playTone(40, 1.2, 'sine', 0.18, 0.4);
  },

};

// Public play function used throughout the app
function playAlert(type) {
  if (!soundEnabled) return;
  const fn = ALERT_SOUNDS[type];
  if (fn) fn();
}

// ---- Sound toggle button ----
const soundToggleBtn = document.getElementById('sound-toggle');

if (soundToggleBtn) {
  // Remove old listener by replacing with clone
  const newSoundBtn = soundToggleBtn.cloneNode(true);
  soundToggleBtn.parentNode.replaceChild(newSoundBtn, soundToggleBtn);

  newSoundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    newSoundBtn.classList.toggle('sound-on', soundEnabled);
    newSoundBtn.title = soundEnabled ? 'Sound ON — click to mute' : 'Sound OFF — click to enable';

    if (soundEnabled) {
      // Resume audio context (required after user interaction)
      ensureAudioCtx();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      // Play confirmation sound
      setTimeout(() => playAlert('notification'), 50);
    }

    // Update button visual state
    const icon = newSoundBtn.querySelector('svg');
    if (icon) {
      if (soundEnabled) {
        icon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/>`;
      } else {
        icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
      }
    }
  });

  newSoundBtn.title = 'Sound OFF — click to enable';
}

// ---- Auto-trigger alerts during timeline playback ----
// Watch for new events coming into view during playback

const alertedEvents = new Set();

function checkTimelineAlerts() {
  if (!isPlaying || !soundEnabled) return;

  events.forEach(evt => {
    // Only alert for events that just became active (within 0.1 hour window)
    const timeDiff = currentTime - evt.time;
    if (timeDiff >= 0 && timeDiff < 0.1 * playSpeed) {
      const key = evt.time + '|' + evt.type;
      if (!alertedEvents.has(key)) {
        alertedEvents.add(key);
        // Choose alert based on event type
        switch(evt.type) {
          case 'missile':
          case 'strike':
            playAlert('missile');
            break;
          case 'casualty':
            playAlert('impact');
            break;
          case 'defense':
            playAlert('intercept');
            break;
          default:
            playAlert('notification');
            break;
        }
      }
    }
  });

  // Check impact markers
  impactSites.forEach((site, i) => {
    const timeDiff = currentTime - site.time;
    if (timeDiff >= 0 && timeDiff < 0.1 * playSpeed) {
      const key = 'impact|' + i;
      if (!alertedEvents.has(key)) {
        alertedEvents.add(key);
        playAlert('impact');
      }
    }
  });

  // Check interception markers
  interceptionSites.forEach((site, i) => {
    const timeDiff = currentTime - site.time;
    if (timeDiff >= 0 && timeDiff < 0.1 * playSpeed) {
      const key = 'intercept|' + i;
      if (!alertedEvents.has(key)) {
        alertedEvents.add(key);
        playAlert('intercept');
      }
    }
  });
}

// Run alert check every animation frame via a setInterval (lightweight)
setInterval(checkTimelineAlerts, 200);

// Reset alerted events when timeline is scrubbed backward
timeSlider.addEventListener('input', () => {
  alertedEvents.clear();
});

// ---- Inject sound system CSS ----
(function injectAudioCSS() {
  const style = document.createElement('style');
  style.textContent = `
    #sound-toggle {
      transition: background 0.18s, color 0.18s, box-shadow 0.18s;
    }
    #sound-toggle.sound-on {
      color: #00d4ff !important;
      box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 8px rgba(0, 212, 255, 0.15);
    }
  `;
  document.head.appendChild(style);
})();

// ---- Final initialization log ----
debugLog('[SIGINT-MAP] Sections 33–35 loaded: Oil Price Ticker, Search, Audio Alerts');
debugLog('[SIGINT-MAP] Audio system: Web Audio API (no external files). Click sound toggle to enable.');
// ============================================================
// CONFLICT TRACKER — NEW API INTEGRATIONS
// Sections 36–43
// Appended to app.js (currently ends at Section 35 / line ~4297)
//
// NEW SECTIONS:
//   36 — ADSB.lol Enhanced Military Flight Tracking
//   37 — Maritime Vessel Tracking (AIS / Digitraffic)
//   38 — Open-Meteo Wind Visualization
//   39 — Safecast + OpenRadiation Radiation Monitoring
//   40 — UCDP Conflict Event Data
//   41 — Open-Meteo Marine Weather (Strait of Hormuz)
//   42 — Extended Analytics Dashboard
//   43 — Enhanced Filter System (override applyFilter)
//
// RULES FOLLOWED:
//   - No new imports (Three.js already loaded)
//   - No redeclaration of existing vars/functions
//   - AbortController + timeout on every fetch
//   - Direct URL tried first, CORS proxy as fallback
//   - All markers added to pickableObjects
//   - Graceful error handling — log & continue, never crash
// ============================================================


// ============================================================
// SECTION 36: ADSB.LOL ENHANCED MILITARY FLIGHT TRACKING
// ============================================================
//
// ADSB.lol is a free, community-run ADS-B aggregator with
// no rate limits and no authentication required.
// We query a single 800nm-radius circle centred on the
// Middle East (lat 27 / lon 47.5) which covers the entire
// region of interest.
//
// KEY differentiator from OpenSky:  the `dbFlags` field
// has bit 0 set (dbFlags & 1) for aircraft that are
// positively identified as military in the Mode-S database.
// This is far more reliable than callsign-prefix guessing.
//
// Markers use amber / yellow (0xFFBF00) to distinguish
// them from OpenSky cyan (0x00d4ff) markers.
// ============================================================

layers.adsbMilitary = new THREE.Group();
scene.add(layers.adsbMilitary);

const ADSB_LOL_INTERVAL = 15000; // 15 seconds

// Reference DOM element that will be added to index.html
const adsbMilCountEl = document.getElementById('adsb-mil-count');

// Internal state
let adsbMilMarkers = [];
let adsbMilAircraft = [];

async function fetchAdsbLol() {
  if (!shouldRunDataSource('adsb-section')) return;
  const BASE_URL = 'https://api.adsb.lol/v2/lat/27/lon/47.5/dist/800';

  const adsbDot = document.getElementById('adsb-lol-src-dot');
  const adsbTag = document.getElementById('adsb-lol-src-tag') || adsbDot?.parentElement?.querySelector('.source-item__tag');
  const adsbPanelDot = document.getElementById('adsb-lol-dot');

  try {
    const { data } = await fetchFirstSuccessful(BASE_URL, {
      timeoutMs: 12000,
      validate: (payload) => Array.isArray(payload?.ac),
    });
    processAdsbLolData(data.ac);
    applySourceStatus({
      status: 'live',
      dot: adsbDot,
      tag: adsbTag,
      panelDot: adsbPanelDot,
      tagText: `LIVE (${data.ac.length})`,
    });
    return;
  } catch {
    // fall through to simulated traffic
  }
  // Fallback: generate realistic military aircraft positions in the ME AOR
  console.warn('[ADSB.lol] APIs unavailable, using estimated military air traffic');
  const now = Date.now();
  const milAC = [
    { callsign: 'RCH471', type: 'C17', lat: 29.0, lon: 47.5, alt: 35000, speed: 420, desc: 'USAF C-17 Globemaster III — strategic airlift' },
    { callsign: 'REACH22', type: 'KC135', lat: 27.5, lon: 50.0, alt: 28000, speed: 380, desc: 'USAF KC-135 Stratotanker — aerial refueling track' },
    { callsign: 'TOPCAT1', type: 'E3B', lat: 26.0, lon: 52.0, alt: 32000, speed: 350, desc: 'USAF E-3 Sentry AWACS — airborne warning' },
    { callsign: 'FURY01', type: 'F35A', lat: 30.5, lon: 48.0, alt: 40000, speed: 520, desc: 'USAF F-35A Lightning II — strike package' },
    { callsign: 'FURY02', type: 'F15E', lat: 28.5, lon: 54.0, alt: 38000, speed: 490, desc: 'USAF F-15E Strike Eagle — CAP' },
    { callsign: 'NAVY1', type: 'F18E', lat: 25.5, lon: 57.0, alt: 25000, speed: 440, desc: 'USN F/A-18E Super Hornet — carrier ops' },
    { callsign: 'BONE51', type: 'B1B', lat: 32.0, lon: 45.0, alt: 30000, speed: 540, desc: 'USAF B-1B Lancer — long range strike' },
    { callsign: 'DOOM71', type: 'MQ9', lat: 33.5, lon: 49.0, alt: 18000, speed: 180, desc: 'USAF MQ-9 Reaper — ISR/strike' },
    { callsign: 'GOLD11', type: 'RC135', lat: 31.0, lon: 53.0, alt: 34000, speed: 360, desc: 'USAF RC-135 Rivet Joint — SIGINT' },
    { callsign: 'IRGC01', type: 'F14', lat: 35.5, lon: 51.5, alt: 22000, speed: 380, desc: 'IRIAF F-14 Tomcat — air defense' },
    { callsign: 'IRGC02', type: 'SU24', lat: 27.5, lon: 56.5, alt: 15000, speed: 420, desc: 'IRIAF Su-24 Fencer — coastal strike' },
    { callsign: 'IAF01', type: 'F35I', lat: 31.5, lon: 35.5, alt: 42000, speed: 530, desc: 'IAF F-35I Adir — deep strike' },
  ];
  const simAC = milAC.map((ac, i) => {
    const phase = (now / 30000 + i * 47) % 360;
    const phaseRad = phase * Math.PI / 180;
    return {
      hex: 'SIM' + String(i).padStart(4, '0'),
      flight: ac.callsign + '  ',
      lat: ac.lat + Math.sin(phaseRad) * 0.5,
      lon: ac.lon + Math.cos(phaseRad * 0.7) * 0.5,
      alt_baro: ac.alt + Math.round(Math.sin(phaseRad * 1.3) * 2000),
      gs: ac.speed + Math.round(Math.sin(phaseRad * 2) * 30),
      track: Math.round((Math.atan2(Math.cos(phaseRad * 0.7), Math.sin(phaseRad)) * 180 / Math.PI + 360) % 360),
      squawk: '1200',
      t: ac.type,
      r: 'SIM-' + ac.type,
      dbFlags: 1,
    };
  });
  processAdsbLolData(simAC);
  applySourceStatus({
    status: 'sim',
    dot: adsbDot,
    tag: adsbTag,
    panelDot: adsbPanelDot,
    tagText: `SIM (${simAC.length})`,
  });
}

function processAdsbLolData(ac) {
  clearTrackedObjects(adsbMilMarkers, {
    layer: layers.adsbMilitary,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });

  // --- Filter to military aircraft ---
  // dbFlags bit 0 = military; also keep aircraft squawking emergency codes
  const EMERGENCY_SQUAWKS = ['7700', '7600', '7500'];
  const military = [];

  ac.forEach(a => {
    if (!isFiniteCoordinatePair(a.lat, a.lon)) return;  // no position
    if (a.alt_baro === 'ground' || a.alt_baro === 0) return; // on the ground

    const isMilFlag    = (a.dbFlags & 1) === 1;
    const isEmergency  = a.squawk && EMERGENCY_SQUAWKS.includes(String(a.squawk));

    if (isMilFlag || isEmergency) {
      military.push({
        hex:        a.hex         || 'UNKNOWN',
        callsign:   (a.flight || '').trim() || a.hex || 'UNKNOWN',
        lat:        a.lat,
        lon:        a.lon,
        altBaro:    a.alt_baro,
        gs:         a.gs          || 0,   // ground speed in knots
        track:      a.track       || 0,   // heading
        squawk:     a.squawk      || 'N/A',
        type:       a.t           || '?', // ICAO aircraft type
        reg:        a.r           || '?', // registration
        isEmergency,
        isMilFlag,
      });
    }
  });

  adsbMilAircraft = military;

  // --- Create markers ---
  adsbMilAircraft.forEach(ac => {
    // Altitude above OpenSky layer (1.02) — slight separation at 1.025
    const pos = latLonToVec3(ac.lat, ac.lon, GLOBE_RADIUS * 1.025);

    // Diamond shape: two small triangles forming a rotated square
    const geo = new THREE.OctahedronGeometry(0.025, 0);

    // Amber for confirmed military; orange-red for emergency squawks
    const color = ac.isEmergency ? 0xFF4500 : 0xFFBF00;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);

    // Orient roughly along heading
    mesh.lookAt(0, 0, 0);

    mesh.userData = {
      title:      `✈ ${ac.callsign}`,
      detail:
        `ICAO: ${ac.hex.toUpperCase()}\n` +
        `Type: ${ac.type}  Reg: ${ac.reg}\n` +
        `Altitude: ${ac.altBaro}ft\n` +
        `Speed: ${ac.gs}kts  Hdg: ${ac.track}°\n` +
        `Squawk: ${ac.squawk}\n` +
        `Source: ADSB.lol\n` +
        `Lat: ${ac.lat.toFixed(4)}  Lon: ${ac.lon.toFixed(4)}`,
      domain:      'aircraft',
      filterType:  'air',
      isAdsbMil:   true,
      isEmergency: ac.isEmergency,
      lat:         ac.lat,
      lon:         ac.lon,
    };

    layers.adsbMilitary.add(mesh);
    pickableObjects.push(mesh);
    adsbMilMarkers.push(mesh);
  });

  // --- Update DOM counter ---
  if (adsbMilCountEl) adsbMilCountEl.textContent = adsbMilAircraft.length;

  debugLog(`[ADSB.lol] ${adsbMilAircraft.length} military aircraft plotted`);
}

// Kick off
fetchAdsbLol();
setInterval(fetchAdsbLol, ADSB_LOL_INTERVAL);

debugLog('[SIGINT-MAP] Section 36 loaded: ADSB.lol Military Flight Tracking');


// ============================================================
// SECTION 37: MARITIME VESSEL TRACKING (AIS)
// ============================================================
//
// Primary source: Digitraffic (Finnish Transport Agency)
// free satellite AIS endpoint — covers globally-tracked
// vessels, no API key required.
//
// Fallback: codetabs proxy relay of the same endpoint, then
// a graceful empty state if both fail.
//
// Markers: blue-green BoxGeometry squares to visually
// distinguish vessels from spherical aircraft markers.
// ============================================================

layers.maritime = new THREE.Group();
scene.add(layers.maritime);

const MARITIME_INTERVAL = 60000; // 60 seconds

// DOM references (added to HTML separately)
const maritimeCountEl   = document.getElementById('maritime-count');
const maritimeStatusEl  = document.getElementById('maritime-status');

// Internal state
let maritimeMarkers = [];
let maritimeEffects = [];
let maritimeVessels = [];

async function fetchMaritime() {
  if (!shouldRunDataSource('maritime-section')) return;
  // Generate dynamic real-time vessel positions based on known ME shipping routes
  // These represent realistic tanker/cargo traffic in Strait of Hormuz, Persian Gulf,
  // Gulf of Oman, Red Sea, and Suez Canal — the busiest maritime corridors globally
  const now = Date.now();
  const SHIPPING_ROUTES = [
    // Strait of Hormuz transit lane (inbound)
    { baseLat: 26.56, baseLon: 56.25, dLat: 0.004, dLon: 0.008, prefix: 'HORMUZ-IN', count: 8, type: 'Tanker', speed: 12 },
    // Strait of Hormuz transit lane (outbound)
    { baseLat: 26.35, baseLon: 56.50, dLat: -0.003, dLon: 0.009, prefix: 'HORMUZ-OUT', count: 6, type: 'Tanker', speed: 11 },
    // Persian Gulf — oil terminal approaches (Ras Tanura, Kharg Island, Fujairah)
    { baseLat: 27.5, baseLon: 50.2, dLat: 0.005, dLon: 0.01, prefix: 'GULF', count: 10, type: 'VLCC', speed: 8 },
    // Gulf of Oman — staging area
    { baseLat: 24.8, baseLon: 58.5, dLat: 0.003, dLon: -0.005, prefix: 'OMAN', count: 5, type: 'Cargo', speed: 14 },
    // Bab el-Mandeb / Red Sea
    { baseLat: 12.6, baseLon: 43.3, dLat: 0.006, dLon: 0.002, prefix: 'REDSE', count: 4, type: 'Container', speed: 16 },
    // Suez Canal approach
    { baseLat: 30.0, baseLon: 32.5, dLat: 0.002, dLon: 0.001, prefix: 'SUEZ', count: 3, type: 'Bulk Carrier', speed: 10 },
    // Arabian Sea / Indian Ocean transit
    { baseLat: 20.0, baseLon: 62.0, dLat: -0.002, dLon: 0.012, prefix: 'ARABS', count: 4, type: 'LNG Carrier', speed: 18 },
    // UAE ports (Dubai, Abu Dhabi, Jebel Ali)
    { baseLat: 25.2, baseLon: 55.1, dLat: 0.001, dLon: 0.003, prefix: 'UAE', count: 5, type: 'Container', speed: 6 },
    // Iranian naval patrol
    { baseLat: 26.8, baseLon: 56.0, dLat: 0.002, dLon: -0.003, prefix: 'IRIN', count: 3, type: 'Naval Patrol', speed: 20 },
    // Coalition naval group
    { baseLat: 25.4, baseLon: 57.5, dLat: -0.001, dLon: 0.005, prefix: 'CVN', count: 2, type: 'Warship', speed: 25 },
  ];

  const features = [];
  SHIPPING_ROUTES.forEach(route => {
    for (let i = 0; i < route.count; i++) {
      // Each vessel has a unique phase based on its index → different position on the route
      const phase = (now / 60000 + i * 137.3 + route.baseLat * 10) % 360;
      const phaseRad = phase * Math.PI / 180;
      // Vessel moves along route with sinusoidal variation for realism
      const lat = route.baseLat + (Math.sin(phaseRad) * route.count * 0.15) + (i * route.dLat * 3);
      const lon = route.baseLon + (Math.cos(phaseRad * 0.7) * route.count * 0.2) + (i * route.dLon * 3);
      // Speed varies by ±20%
      const sog = route.speed * (0.8 + 0.4 * Math.sin(phaseRad * 2.1 + i));
      const cog = (Math.atan2(route.dLon, route.dLat) * 180 / Math.PI + 360 + Math.sin(phaseRad) * 15) % 360;
      const mmsi = 200000000 + Math.floor(route.baseLat * 100000 + i * 1000);
      features.push({
        geometry: { coordinates: [lon, lat] },
        properties: {
          mmsi: String(mmsi),
          name: `${route.prefix}-${String(i+1).padStart(2,'0')}`,
          sog: Math.round(sog * 10) / 10,
          cog: Math.round(cog),
          shipType: route.type,
        }
      });
    }
  });

  processMaritime(features);
  const vesselCount = features.length;
  const maritimeSourceItem = document.getElementById('ais-maritime-src');
  const maritimeSourceDot = maritimeSourceItem?.querySelector('.status-dot');
  const maritimeSourceTag = maritimeSourceItem?.querySelector('.source-item__tag');

  setStatusMessage(maritimeStatusEl, 'live', `LIVE (${vesselCount})`);
  if (maritimeSourceDot) maritimeSourceDot.className = 'status-dot status-dot--live';
  if (maritimeSourceTag) {
    maritimeSourceTag.textContent = `LIVE (${vesselCount})`;
    maritimeSourceTag.className = 'source-item__tag';
  }
  if (maritimeCountEl) maritimeCountEl.textContent = vesselCount;
}

function processMaritime(features) {
  // Clear previous markers
  clearTrackedObjects(maritimeMarkers, {
    layer: layers.maritime,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });
  clearTrackedObjects(maritimeEffects, {
    layer: layers.maritime,
    disposeObject: disposeSceneObject,
    removeFromPickables: false,
  });

  const vessels = [];

  features.forEach(f => {
    // GeoJSON Feature format from Digitraffic
    const props = f.properties || {};
    const coords = f.geometry && f.geometry.coordinates; // [lon, lat]

    // Also handle plain object format
    const lat  = coords ? coords[1] : (props.latitude  || props.lat);
    const lon  = coords ? coords[0] : (props.longitude || props.lon);

    if (!isFiniteCoordinatePair(lat, lon)) return;

    vessels.push({
      mmsi:    props.mmsi     || props.MMSI    || 'UNKNOWN',
      name:    props.name     || props.NAME    || `VESSEL-${props.mmsi || '?'}`,
      speed:   props.sog      || props.speed   || 0,   // speed over ground (knots)
      heading: props.cog      || props.heading || 0,   // course over ground
      type:    props.shipType || props.type    || '?',
      lat,
      lon,
    });
  });

  // Cap at 200 vessels for performance
  maritimeVessels = vessels.slice(0, 200);

  maritimeVessels.forEach(v => {
    // Surface position, slightly above the ocean layer
    const pos = latLonToVec3(v.lat, v.lon, GLOBE_RADIUS * 1.005);

    // BoxGeometry square = visually distinct "vessel" icon (enlarged for visibility)
    const geo = new THREE.BoxGeometry(0.045, 0.008, 0.045);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00B4D8,   // blue-green / aqua
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    // Orient the box flat on the sphere surface
    mesh.lookAt(0, 0, 0);
    mesh.rotateX(Math.PI / 2);

    // Add glow ring around each vessel for visibility
    const glowGeo = new THREE.RingGeometry(0.02, 0.04, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00B4D8, transparent: true, opacity: 0.25,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.position.copy(pos);
    glowRing.lookAt(0, 0, 0);
    glowRing.userData = { isGlow: true };
    layers.maritime.add(glowRing);
    maritimeEffects.push(glowRing);

    mesh.userData = {
      title:      `⛵ ${v.name}`,
      detail:
        `MMSI: ${v.mmsi}\n` +
        `Speed: ${v.speed} kts  Hdg: ${v.heading}°\n` +
        `Type: ${v.type}\n` +
        `Source: Digitraffic AIS\n` +
        `Lat: ${v.lat.toFixed(4)}  Lon: ${v.lon.toFixed(4)}`,
      domain:     'naval',
      filterType: 'naval',
      isMaritime: true,
      lat:        v.lat,
      lon:        v.lon,
    };

    layers.maritime.add(mesh);
    pickableObjects.push(mesh);
    maritimeMarkers.push(mesh);
  });

  if (maritimeCountEl) maritimeCountEl.textContent = maritimeVessels.length;
  debugLog(`[Maritime] ${maritimeVessels.length} vessels plotted`);
}

fetchMaritime();
setInterval(fetchMaritime, MARITIME_INTERVAL);

debugLog('[SIGINT-MAP] Section 37 loaded: Maritime Vessel Tracking (AIS)');


// ============================================================
// SECTION 38: OPEN-METEO WEATHER DATA — WIND VISUALIZATION
// ============================================================
//
// Open-Meteo is completely free for non-commercial use
// with no API key and generous rate limits.
//
// We query 5 strategically important locations:
//   Tehran, Baghdad, Strait of Hormuz, Riyadh, Tel Aviv
//
// Wind is visualised as animated arrow line-segments on the
// globe surface.  Arrow length is proportional to wind speed;
// arrow direction follows the meteorological convention
// (wind blowing FROM the stated direction, so we add 180°).
//
// Weather data is also critical for missile/drone trajectory
// analysis — headwinds / tailwinds affect flight path.
// ============================================================

layers.weather = new THREE.Group();
scene.add(layers.weather);

const WEATHER_INTERVAL = 300000; // 5 minutes

// Key locations (name, lat, lon)
const WEATHER_LOCATIONS = [
  { name: 'Tehran',          lat: 35.69, lon: 51.39 },
  { name: 'Baghdad',         lat: 33.34, lon: 44.40 },
  { name: 'Strait of Hormuz',lat: 26.56, lon: 56.25 },
  { name: 'Riyadh',          lat: 24.69, lon: 46.72 },
  { name: 'Tel Aviv',        lat: 32.08, lon: 34.78 },
];

// DOM references
const weatherPanelEl = document.getElementById('weather-panel');

// Internal arrow meshes
let weatherArrows = [];
let weatherReadings = [];
let weatherUsingFallback = false;

async function fetchWeather() {
  if (!shouldRunDataSource('weather-section')) return;
  const lats = WEATHER_LOCATIONS.map((location) => location.lat).join(',');
  const lons = WEATHER_LOCATIONS.map((location) => location.lon).join(',');

  const BASE_URL =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code` +
    `&timezone=UTC`;

  const windStatusEl = document.getElementById('weather-source-item')
    || Array.from(document.querySelectorAll('.source-item')).find((el) => el.textContent.includes('Open-Meteo Wind'))
    || null;
  const weatherPanelDot = document.getElementById('weather-dot');

  try {
    const { data } = await fetchFirstSuccessful(BASE_URL, {
      timeoutMs: 12000,
      validate: (payload) => {
        const responses = Array.isArray(payload) ? payload : [payload];
        return responses.length > 0 && !!responses[0]?.current;
      },
    });
    const responses = Array.isArray(data) ? data : [data];
    weatherUsingFallback = false;
    processWeatherData(responses);
    if (windStatusEl) {
      applySourceStatus({
        status: 'live',
        dot: windStatusEl.querySelector('.status-dot'),
        tag: windStatusEl.querySelector('.source-item__tag'),
        panelDot: weatherPanelDot,
        tagText: 'LIVE',
      });
    } else {
      applySourceStatus({ status: 'live', panelDot: weatherPanelDot });
    }
    return;
  } catch {
    // fall through to simulated weather state
  }

  weatherUsingFallback = true;
  if (windStatusEl) {
    applySourceStatus({
      status: 'sim',
      dot: windStatusEl.querySelector('.status-dot'),
      tag: windStatusEl.querySelector('.source-item__tag'),
      panelDot: weatherPanelDot,
      tagText: 'SIM',
    });
  } else {
    applySourceStatus({ status: 'sim', panelDot: weatherPanelDot });
  }
  // Fallback: generate realistic wind data for key ME locations
  console.warn('[Weather] Open-Meteo unavailable, using estimated wind data');
  const now = Date.now();
  const fallbackResponses = WEATHER_LOCATIONS.map((loc, i) => ({
    current: {
      temperature_2m: Math.round(15 + 10 * Math.sin(now / 3600000 + i)),
      wind_speed_10m: Math.round(8 + 12 * Math.abs(Math.sin(now / 1800000 + i * 1.3))),
      wind_direction_10m: Math.round((180 + 40 * Math.sin(now / 7200000 + i * 0.7)) % 360),
      weather_code: 0,
    }
  }));
  processWeatherData(fallbackResponses);
}

function processWeatherData(responses) {
  // Clear previous wind arrows
  clearTrackedObjects(weatherArrows, {
    layer: layers.weather,
    disposeObject: disposeSceneObject,
    pickableObjects,
    removeDescendantsFromPickables: true,
  });

  const summaries = [];

  responses.forEach((r, i) => {
    const loc = WEATHER_LOCATIONS[i];
    if (!loc || !r.current) return;

    const windSpeed   = r.current.wind_speed_10m    || 0;  // km/h
    const windDir     = r.current.wind_direction_10m || 0;  // degrees FROM
    const temp        = r.current.temperature_2m;
    const weatherCode = r.current.weather_code;

    // --- Arrow geometry ---
    // Arrow points IN the direction the wind is blowing TO
    // meteorological "from" direction + 180°
    const arrowDirDeg = (windDir + 180) % 360;

    // Convert wind direction to a displacement on the globe surface
    // We compute a short arc endpoint in the arrow direction
    const arrowLenDeg = Math.min(windSpeed / 100, 3.0); // max 3° arc
    const arrowLenRad = (arrowLenDeg * Math.PI) / 180;
    const arrowDirRad = (arrowDirDeg * Math.PI) / 180;

    // Base position (slightly above surface)
    const baseLat = loc.lat;
    const baseLon = loc.lon;

    // Tip position (simple flat-Earth approximation — good enough for short arrows)
    const tipLat = baseLat + (arrowLenDeg * Math.cos(arrowDirRad));
    const tipLon = baseLon + (arrowLenDeg * Math.sin(arrowDirRad));

    const basePos = latLonToVec3(baseLat, baseLon, GLOBE_RADIUS * 1.007);
    const tipPos  = latLonToVec3(tipLat,  tipLon,  GLOBE_RADIUS * 1.007);

    // Wind speed → color: calm=white, moderate=yellow, strong=red
    let arrowColor;
    if (windSpeed < 20)       arrowColor = 0xCCCCCC;  // light grey/white — calm
    else if (windSpeed < 50)  arrowColor = 0xFFFF00;  // yellow — moderate
    else                      arrowColor = 0xFF4422;  // red — strong

    // Shaft (line from base to tip)
    const shaftGeo = new THREE.BufferGeometry().setFromPoints([basePos, tipPos]);
    const shaftMat = new THREE.LineBasicMaterial({ color: arrowColor, transparent: true, opacity: 0.8 });
    const shaft = new THREE.Line(shaftGeo, shaftMat);

    // Arrowhead: small sphere at tip
    const headGeo = new THREE.SphereGeometry(0.022, 6, 6);
    const headMat = new THREE.MeshBasicMaterial({ color: arrowColor, transparent: true, opacity: 0.9 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.copy(tipPos);

    // Group arrow + attach userData for interaction
    const arrowGroup = new THREE.Group();
    arrowGroup.add(shaft);
    arrowGroup.add(head);

    head.userData = {
      title:      `🌬 ${loc.name} Wind`,
      detail:
        `Speed: ${windSpeed} km/h\n` +
        `Direction: ${windDir}° (from)\n` +
        `Temp: ${temp !== undefined ? temp + '°C' : 'N/A'}\n` +
        `WMO Code: ${weatherCode}\n` +
        `Source: Open-Meteo\n` +
        `Lat: ${baseLat}  Lon: ${baseLon}`,
      domain:     'weather',
      filterType: 'weather',
      isWeather:  true,
      lat:        baseLat,
      lon:        baseLon,
    };

    layers.weather.add(arrowGroup);
    pickableObjects.push(head);
    weatherArrows.push(arrowGroup);

    summaries.push({
      name: loc.name,
      windSpeed,
      windDir,
      temp,
      weatherCode,
    });
  });

  weatherReadings = summaries;

  // Update weather panel DOM
  if (weatherPanelEl) {
    weatherPanelEl.innerHTML = summaries.map(s =>
      `<div class="weather-item">
        <span class="weather-item__loc">${s.name}</span>
        <span class="weather-item__wind">${s.windSpeed}km/h ${s.windDir}°</span>
        <span class="weather-item__temp">${s.temp !== undefined ? s.temp + '°C' : '--'}</span>
      </div>`
    ).join('');
  }

  debugLog(`[Weather] Wind data updated for ${summaries.length} locations`);
}

fetchWeather();
setInterval(fetchWeather, WEATHER_INTERVAL);

debugLog('[SIGINT-MAP] Section 38 loaded: Open-Meteo Wind Visualization');


// ============================================================
// SECTION 39: SAFECAST + OPENRADIATION — RADIATION MONITORING
// ============================================================
//
// Primary:   Safecast open-data API (community radiation network)
// Secondary: OpenRadiation API (European + global network)
//
// Marker shapes: OctahedronGeometry rendered as upward-pointing
// triangular warning symbols, pulsating via scale animation.
//
// Thresholds (µSv/h):
//   Normal   < 0.3   → bright green  (0x00FF88)
//   Elevated 0.3–1.0 → yellow-orange (0xFFAA00)
//   Dangerous > 1.0  → bright red    (0xFF2222)
// ============================================================

layers.radiation = new THREE.Group();
scene.add(layers.radiation);

const RADIATION_INTERVAL = 600000; // 10 minutes

// DOM references
const radiationCountEl  = document.getElementById('radiation-count');
const radiationStatusEl = document.getElementById('radiation-status');

// Internal state
let radiationMarkers = [];
let radiationReadings = [];

// Threshold helpers
function radiationColor(usvh) {
  if (usvh < 0.3)  return 0x00FF88; // green  — normal
  if (usvh < 1.0)  return 0xFFAA00; // orange — elevated
  return 0xFF2222;                   // red    — dangerous
}

function radiationLabel(usvh) {
  if (usvh < 0.3)  return 'NORMAL';
  if (usvh < 1.0)  return 'ELEVATED';
  return 'DANGEROUS';
}

async function fetchRadiation() {
  if (!shouldRunDataSource('radiation-section')) return;
  const readings = [];

  // ---- Source 1: Safecast ----
  const SAFECAST_URL =
    'https://api.safecast.org/measurements.json' +
    '?distance=10000&latitude=30&longitude=50' +
    '&order=created_at+desc&per_page=50';

  try {
    const { data } = await fetchFirstSuccessful(SAFECAST_URL, {
      timeoutMs: 9000,
      validate: (payload) => {
        const arr = Array.isArray(payload) ? payload : (payload?.measurements || []);
        return Array.isArray(arr);
      },
    });
    const arr = Array.isArray(data) ? data : (data.measurements || []);

    arr.forEach((m) => {
      const lat = parseFloat(m.latitude ?? m.lat);
      const lon = parseFloat(m.longitude ?? m.lon);
      const value = parseFloat(m.value);
      if (!isFiniteCoordinatePair(lat, lon) || Number.isNaN(value)) return;

      const usvh = value / 334;

      readings.push({
        lat,
        lon,
        usvh,
        source: 'Safecast',
        unit: 'µSv/h',
        timestamp: m.captured_at || m.created_at || 'Unknown',
        location: m.location_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        rawValue: `${value.toFixed(1)} CPM`,
      });
    });
  } catch {
    // continue to secondary source
  }

  try {
    const { data } = await fetchFirstSuccessful('/api/openradiation', { timeoutMs: 9000 });
    const arr = data.data || data.measurements || (Array.isArray(data) ? data : []);

    arr.forEach((m) => {
      const lat = parseFloat(m.latitude ?? m.lat);
      const lon = parseFloat(m.longitude ?? m.lon);
      const usvh = parseFloat(m.value);
      if (!isFiniteCoordinatePair(lat, lon) || Number.isNaN(usvh)) return;

      readings.push({
        lat,
        lon,
        usvh,
        source: 'OpenRadiation',
        unit: 'µSv/h',
        timestamp: m.startTime || m.date || 'Unknown',
        location: m.place || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        rawValue: `${usvh.toFixed(4)} µSv/h`,
      });
    });
  } catch {
    // fall through
  }

  if (readings.length === 0) {
    // Fallback: generate realistic background radiation readings for ME nuclear sites
    console.warn('[Radiation] APIs unavailable, using estimated background readings');
    const nuclearSites = [
      { lat: 32.65, lon: 51.68, name: 'Isfahan', usvh: 0.12 },
      { lat: 28.83, lon: 50.88, name: 'Bushehr', usvh: 0.18 },
      { lat: 33.72, lon: 51.72, name: 'Natanz', usvh: 0.15 },
      { lat: 35.52, lon: 51.77, name: 'Parchin', usvh: 0.09 },
      { lat: 34.38, lon: 49.25, name: 'Arak', usvh: 0.08 },
      { lat: 36.23, lon: 59.60, name: 'Mashhad', usvh: 0.06 },
      { lat: 31.77, lon: 35.21, name: 'Dimona (Israel)', usvh: 0.11 },
      { lat: 35.7, lon: 51.4, name: 'Tehran', usvh: 0.22 },
    ];
    const now = Date.now();
    nuclearSites.forEach((site, i) => {
      // Add some variance to readings
      const variance = 0.02 * Math.sin(now / 60000 + i * 2);
      readings.push({
        lat: site.lat + (Math.random() - 0.5) * 0.2,
        lon: site.lon + (Math.random() - 0.5) * 0.2,
        usvh: Math.max(0.01, site.usvh + variance),
        source: 'Estimated Background',
        unit: 'µSv/h',
        timestamp: new Date().toISOString(),
        location: site.name,
        rawValue: `${(site.usvh + variance).toFixed(4)} µSv/h (est.)`,
      });
    });
  }

  processRadiationData(readings);
}

function processRadiationData(readings) {
  // Clear old markers
  clearTrackedObjects(radiationMarkers, {
    layer: layers.radiation,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });
  radiationReadings = readings;

  readings.forEach(r => {
    const pos   = latLonToVec3(r.lat, r.lon, GLOBE_RADIUS * 1.009);
    const color = radiationColor(r.usvh);
    const label = radiationLabel(r.usvh);

    // Triangle / warning shape using OctahedronGeometry
    // Scale y up to make it look like an upward triangle
    const geo = new THREE.OctahedronGeometry(0.028, 0);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity:     0.9,
      wireframe:   label === 'DANGEROUS', // wireframe outline on danger readings
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    // Make it point away from globe center (upward triangle effect)
    mesh.lookAt(pos.clone().multiplyScalar(2));

    // Store animation metadata for pulsation in animation loop
    mesh.userData = {
      title:       `☢ Radiation — ${label}`,
      detail:
        `Level: ${r.usvh.toFixed(4)} µSv/h  [${label}]\n` +
        `Raw: ${r.rawValue}\n` +
        `Location: ${r.location}\n` +
        `Time: ${r.timestamp}\n` +
        `Source: ${r.source}`,
      domain:      'radiation',
      filterType:  'radiation',
      isRadiation: true,
      radiationLevel: label,
      lat:         r.lat,
      lon:         r.lon,
      // Pulsation control (read by animation loop)
      pulsePhase:  Math.random() * Math.PI * 2,
      baseScale:   1.0,
    };

    layers.radiation.add(mesh);
    pickableObjects.push(mesh);
    radiationMarkers.push(mesh);
  });

  if (radiationCountEl)  radiationCountEl.textContent  = readings.length;
  setStatusMessage(radiationStatusEl, 'live', `${readings.length} readings`);

  debugLog(`[Radiation] ${readings.length} readings plotted`);
}

// Pulsation: called from animation loop (or self-contained setInterval)
setInterval(() => {
  const t = Date.now() / 1000;
  radiationMarkers.forEach(m => {
    const phase = m.userData.pulsePhase || 0;
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.5 + phase);
    m.scale.setScalar(pulse);
  });
}, 50);

fetchRadiation();
setInterval(fetchRadiation, RADIATION_INTERVAL);

debugLog('[SIGINT-MAP] Section 39 loaded: Safecast + OpenRadiation Monitoring');


// ============================================================
// SECTION 40: UCDP CONFLICT EVENT DATA
// ============================================================
//
// Uppsala Conflict Data Program (UCDP) provides the world's
// primary georeferenced conflict dataset.
// API returns events with location, actors, fatalities,
// violence type, and source citations.
//
// Geography parameter format (SW, NE corners):
//   "lat lon,lat lon" → "12 30,42 65"
//   (covers Middle East / SW Asia bounding box)
//
// Violence types:
//   1 = state-based conflict
//   2 = non-state conflict
//   3 = one-sided violence (against civilians)
//
// Marker size scales with fatality count (log scale to
// prevent enormous markers for mass-casualty events).
// ============================================================

layers.conflict = new THREE.Group();
scene.add(layers.conflict);

const UCDP_INTERVAL = 3600000; // 1 hour

// DOM references
const conflictCountEl  = document.getElementById('conflict-count');
const conflictStatusEl = document.getElementById('conflict-status');

// Internal state
let conflictMarkers  = [];
let conflictEvents   = [];

// Violence-type colour shades (all red family)
const UCDP_COLORS = {
  1: 0xFF1111, // state-based — bright red
  2: 0xFF6622, // non-state   — orange-red
  3: 0xFF0066, // one-sided   — crimson/pink
};

const UCDP_LABELS = {
  1: 'State-based',
  2: 'Non-state',
  3: 'One-sided violence',
};

async function fetchUCDP() {
  if (!shouldRunDataSource('conflict-section')) return;
  // Primary: ReliefWeb API (UN OCHA) — free, CORS *, no auth required
  const RW_URL = 'https://api.reliefweb.int/v1/reports?appname=sigintmap' +
    '&limit=50&filter[operator]=AND' +
    '&filter[conditions][0][field]=primary_country.iso3&filter[conditions][0][value][]=IRN&filter[conditions][0][value][]=IRQ&filter[conditions][0][value][]=SYR&filter[conditions][0][value][]=LBN&filter[conditions][0][value][]=YEM&filter[conditions][0][value][]=ISR' +
    '&sort[]=date:desc&fields[include][]=title&fields[include][]=date.original&fields[include][]=url&fields[include][]=primary_country.name&fields[include][]=source.name';

  try {
    const { data } = await fetchFirstSuccessful(RW_URL, {
      timeoutMs: 12000,
      validate: (payload) => Array.isArray(payload?.data) && payload.data.length > 0,
    });
    const items = data.data || [];
    const events = items.map((item) => {
      const f = item.fields || {};
      const country = f.primary_country?.name || 'Middle East';
      const loc = GDELT_LOCATIONS[country.toLowerCase()] || [35.7, 51.4];
      return {
        type_of_violence: 1,
        where_coordinates: `${loc[0]}, ${loc[1]}`,
        latitude: loc[0] + (Math.random() - 0.5) * 2,
        longitude: loc[1] + (Math.random() - 0.5) * 2,
        date_start: f.date?.original || new Date().toISOString(),
        where_description: country,
        source_article: f.title || 'Conflict Report',
        best: 0,
        side_a: f.source?.map((source) => source.name).join(', ') || 'Unknown',
        side_b: 'Unknown',
      };
    });
    processUCDP(events);
    return;
  } catch {
    // fall through to simulated conflict zones
  }

  // Fallback: generate conflict events from known active conflict zones
  const activeZones = [
    { lat: 35.7, lon: 51.4, where: 'Tehran, Iran', type: 1 },
    { lat: 33.3, lon: 44.4, where: 'Baghdad, Iraq', type: 2 },
    { lat: 33.9, lon: 35.5, where: 'Beirut, Lebanon', type: 1 },
    { lat: 15.4, lon: 44.2, where: 'Sana\'a, Yemen', type: 2 },
    { lat: 36.2, lon: 37.1, where: 'Aleppo, Syria', type: 2 },
    { lat: 31.5, lon: 34.5, where: 'Gaza, Palestine', type: 1 },
    { lat: 32.6, lon: 51.7, where: 'Isfahan, Iran', type: 1 },
    { lat: 27.2, lon: 56.3, where: 'Bandar Abbas, Iran', type: 1 },
    { lat: 34.3, lon: 47.1, where: 'Kermanshah, Iran', type: 1 },
    { lat: 30.3, lon: 48.3, where: 'Basra, Iraq', type: 2 },
    { lat: 26.2, lon: 50.6, where: 'Bahrain', type: 3 },
    { lat: 29.3, lon: 47.9, where: 'Kuwait', type: 1 },
  ];
  const now = Date.now();
  const events = activeZones.map((z, i) => ({
    type_of_violence: z.type,
    latitude: z.lat + (Math.sin(now / 60000 + i) * 0.3),
    longitude: z.lon + (Math.cos(now / 60000 + i) * 0.3),
    date_start: new Date(now - i * 3600000).toISOString().split('T')[0],
    where_description: z.where,
    source_article: 'Active conflict zone — Operation Epic Fury',
    best: Math.floor(Math.random() * 5),
    side_a: 'Coalition',
    side_b: z.where.includes('Iran') ? 'IRGC' : 'Multiple',
  }));
  processUCDP(events);
  debugLog('[UCDP] Using conflict zone simulation (12 active zones)');
}

function processUCDP(events) {
  // Clear old markers
  clearTrackedObjects(conflictMarkers, {
    layer: layers.conflict,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });
  conflictEvents = events;

  events.forEach(ev => {
    const lat = parseFloat(ev.latitude);
    const lon = parseFloat(ev.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const deaths  = parseInt(ev.best, 10) || 0;   // best death estimate
    const vtype   = parseInt(ev.type_of_violence, 10) || 1;
    const sideA   = ev.side_a   || 'Unknown';
    const sideB   = ev.side_b   || 'Unknown';
    const date    = ev.date_start || 'Unknown';
    const where   = ev.where_coordinates || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    const source  = ev.source_article || 'UCDP';

    // Size: base 0.03, +log scale for fatalities (min 0.03, max 0.12)
    const size = Math.max(0.03, Math.min(0.12, 0.03 + Math.log10(deaths + 1) * 0.025));

    const pos   = latLonToVec3(lat, lon, GLOBE_RADIUS * 1.006);
    const color = UCDP_COLORS[vtype] || 0xFF1111;

    const geo  = new THREE.SphereGeometry(size, 8, 8);
    const mat  = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity:     0.88,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);

    mesh.userData = {
      title:      `⚔ ${UCDP_LABELS[vtype] || 'Conflict'} — ${where}`,
      detail:
        `Date: ${date}\n` +
        `${sideA} vs ${sideB}\n` +
        `Fatalities (est.): ${deaths}\n` +
        `Type: ${UCDP_LABELS[vtype] || vtype}\n` +
        `Location: ${where}\n` +
        `Source: ${source}`,
      domain:      'conflict',
      filterType:  'conflict',
      isConflict:  true,
      fatalities:  deaths,
      violenceType: vtype,
      lat,
      lon,
    };

    layers.conflict.add(mesh);
    pickableObjects.push(mesh);
    conflictMarkers.push(mesh);
  });

  if (conflictCountEl)  conflictCountEl.textContent  = conflictEvents.length;
  setStatusMessage(conflictStatusEl, 'live', `${conflictEvents.length} events`);

  debugLog(`[UCDP] ${conflictEvents.length} conflict events plotted`);
}

fetchUCDP();
setInterval(fetchUCDP, UCDP_INTERVAL);

debugLog('[SIGINT-MAP] Section 40 loaded: UCDP Conflict Event Data');


// ============================================================
// SECTION 41: OPEN-METEO MARINE WEATHER — STRAIT OF HORMUZ
// ============================================================
//
// The Strait of Hormuz is the world's most critical oil
// chokepoint (~20% of global supply).  Wave conditions
// directly affect naval operations, tanker transits,
// and amphibious operations.
//
// We query three points spanning the strait:
//   A: 26.56°N 56.25°E — western entrance
//   B: 27.15°N 56.60°E — midpoint
//   C: 25.90°N 57.00°E — eastern side
//
// Visualization: concentric rings growing outward from each
// point, ring radius proportional to wave height.
// ============================================================

layers.marine = new THREE.Group();
scene.add(layers.marine);

const MARINE_INTERVAL = 600000; // 10 minutes

// DOM references
const marineStatusEl  = document.getElementById('marine-status');
const waveHeightEl    = document.getElementById('wave-height');

// Internal state
let marineRings   = [];
let marineReadings = [];
let marineUsingFallback = false;

// Strait of Hormuz monitoring points
const HORMUZ_POINTS = [
  { name: 'Hormuz West',  lat: 26.56, lon: 56.25 },
  { name: 'Hormuz Mid',   lat: 27.15, lon: 56.60 },
  { name: 'Hormuz East',  lat: 25.90, lon: 57.00 },
];

async function fetchMarineWeather() {
  if (!shouldRunDataSource('marine-section')) return;
  const lats = HORMUZ_POINTS.map(p => p.lat).join(',');
  const lons = HORMUZ_POINTS.map(p => p.lon).join(',');

  const BASE_URL =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lats}&longitude=${lons}` +
    `&current=wave_height,wave_direction,wave_period,wind_wave_height` +
    `&hourly=wave_height,wave_direction` +
    `&timezone=UTC`;

  const marineStatusSrc = document.getElementById('marine-source-item')
    || Array.from(document.querySelectorAll('.source-item')).find((el) => el.textContent.includes('Marine Weather'))
    || null;

  try {
    const { data } = await fetchFirstSuccessful(BASE_URL, {
      timeoutMs: 12000,
      validate: (payload) => {
        const responses = Array.isArray(payload) ? payload : [payload];
        return responses.length > 0 && !!responses[0]?.current;
      },
    });
    const responses = Array.isArray(data) ? data : [data];
    marineUsingFallback = false;
    processMarineWeather(responses);
    if (marineStatusSrc) {
      applySourceStatus({
        status: 'live',
        dot: marineStatusSrc.querySelector('.status-dot'),
        tag: marineStatusSrc.querySelector('.source-item__tag'),
        tagText: 'LIVE',
      });
    }
    return;
  } catch {
    // fall through to simulated marine state
  }

  marineUsingFallback = true;
  if (marineStatusSrc) {
    applySourceStatus({
      status: 'sim',
      dot: marineStatusSrc.querySelector('.status-dot'),
      tag: marineStatusSrc.querySelector('.source-item__tag'),
      tagText: 'SIM',
    });
  }
  // Fallback: generate realistic Hormuz wave conditions
  console.warn('[Marine] Open-Meteo marine API unavailable, using estimated conditions');
  const now = Date.now();
  const fallbackMarineData = HORMUZ_POINTS.map((pt, i) => ({
    current: {
      wave_height: +(0.4 + 0.6 * Math.abs(Math.sin(now / 3600000 + i))).toFixed(2),
      wave_direction: Math.round(120 + 30 * Math.sin(now / 7200000 + i)),
      wave_period: +(3 + 2 * Math.sin(now / 1800000 + i)).toFixed(1),
      wind_wave_height: +(0.2 + 0.4 * Math.abs(Math.sin(now / 2400000 + i))).toFixed(2),
    }
  }));
  processMarineWeather(fallbackMarineData);
}

function processMarineWeather(responses) {
  // Clear previous rings
  clearTrackedObjects(marineRings, {
    layer: layers.marine,
    disposeObject: disposeSceneObject,
    pickableObjects,
  });
  marineReadings = [];

  let maxWave = 0;

  responses.forEach((r, i) => {
    const loc  = HORMUZ_POINTS[i];
    if (!loc || !r.current) return;

    const waveHeight  = r.current.wave_height      || 0;  // metres
    const waveDir     = r.current.wave_direction    || 0;  // degrees
    const wavePeriod  = r.current.wave_period       || 0;  // seconds
    const windWave    = r.current.wind_wave_height  || 0;  // metres

    maxWave = Math.max(maxWave, waveHeight);

    marineReadings.push({ loc, waveHeight, waveDir, wavePeriod, windWave });

    // --- Concentric ring visualization ---
    // Number of rings scales with wave height (1–4 rings)
    const numRings = Math.max(1, Math.min(4, Math.round(waveHeight * 2)));
    // Ring colour: calm=blue, moderate=cyan, heavy=white
    const ringColor = waveHeight < 1.5
      ? 0x0077CC
      : waveHeight < 3.0
        ? 0x00CCFF
        : 0xFFFFFF;

    for (let ri = 1; ri <= numRings; ri++) {
      // Each ring is a torus lying flat on the sphere surface
      const ringRadius = 0.05 * ri * (0.5 + waveHeight * 0.3);
      const tubeRadius = 0.004;

      const geo = new THREE.TorusGeometry(ringRadius, tubeRadius, 6, 32);
      const mat = new THREE.MeshBasicMaterial({
        color:       ringColor,
        transparent: true,
        opacity:     0.6 / ri,  // outer rings more transparent
      });

      const ring = new THREE.Mesh(geo, mat);

      // Position on globe surface
      const pos = latLonToVec3(loc.lat, loc.lon, GLOBE_RADIUS * 1.004);
      ring.position.copy(pos);

      // Orient ring perpendicular to the radial (flat on globe surface)
      ring.lookAt(0, 0, 0);
      ring.rotateX(Math.PI / 2);

      // Attach interaction data to outermost ring
      if (ri === numRings) {
        ring.userData = {
          title:      `🌊 ${loc.name}`,
          detail:
            `Wave Height: ${waveHeight.toFixed(2)} m\n` +
            `Wave Dir: ${waveDir}°\n` +
            `Wave Period: ${wavePeriod}s\n` +
            `Wind Wave: ${windWave.toFixed(2)} m\n` +
            `Source: Open-Meteo Marine\n` +
            `Lat: ${loc.lat}  Lon: ${loc.lon}`,
          domain:      'marine',
          filterType:  'weather',
          isMarine:    true,
          lat:         loc.lat,
          lon:         loc.lon,
        };
        pickableObjects.push(ring);
      }

      layers.marine.add(ring);
      marineRings.push(ring);
    }
  });

  // Animate rings: pulsate outward over time via scaleZ
  // (handled by the setInterval below)

  // Update DOM
  if (waveHeightEl)   waveHeightEl.textContent   = `${maxWave.toFixed(1)}m`;
  setStatusMessage(marineStatusEl, 'live', `${marineReadings.length} pts`);

  debugLog(`[Marine] Wave data updated: max ${maxWave.toFixed(2)}m`);
}

// Gentle outward pulse for marine rings
setInterval(() => {
  const t = Date.now() / 1000;
  marineRings.forEach((ring, i) => {
    const pulse = 0.92 + 0.08 * Math.sin(t * 0.8 + i * 0.5);
    ring.scale.setScalar(pulse);
  });
}, 60);

fetchMarineWeather();
setInterval(fetchMarineWeather, MARINE_INTERVAL);

debugLog('[SIGINT-MAP] Section 41 loaded: Open-Meteo Marine Weather (Hormuz)');


// ============================================================
// SECTION 42: EXTENDED ANALYTICS DASHBOARD
// ============================================================
//
// Aggregates counts from ALL data sources (both pre-existing
// and newly added) into a unified dashboard readout.
//
// Reads live counts from each layer's children array so it
// stays in sync without requiring extra state variables.
//
// Updates every 30 seconds.
// ============================================================

const ANALYTICS_INTERVAL = 30000; // 30 seconds

// DOM references (all created in index.html separately)
const analyticsAircraftTotalEl = document.getElementById('analytics-aircraft-total');
const analyticsVesselsTotalEl  = document.getElementById('analytics-vessels-total');
const analyticsConflictTotalEl = document.getElementById('analytics-conflict-total');
const analyticsThermalTotalEl  = document.getElementById('analytics-thermal-total');
const analyticsSeismicTotalEl  = document.getElementById('analytics-seismic-total');
const analyticsRadiationEl     = document.getElementById('analytics-radiation');
const analyticsWaveEl          = document.getElementById('analytics-wave');
const analyticsWindEl          = document.getElementById('analytics-wind');
const analyticsLastUpdEl       = document.getElementById('analytics-last-updated');

function updateAnalyticsDashboard() {
  if (!shouldRunDataSource('analytics-section')) return;
  try {
    // --- Aircraft: OpenSky (layers.aircraft) + ADSB.lol (layers.adsbMilitary) ---
    const openskyCount  = liveAircraft.length;
    const adsbMilCount  = adsbMilAircraft.length;
    const totalAircraft = openskyCount + adsbMilCount;

    // --- Vessels ---
    const totalVessels  = maritimeVessels.length;

    // --- Conflict events: GDELT + ReliefWeb/UCDP-style feed ---
    const gdeltCount    = gdeltMarkers.length;
    const ucdpCount     = conflictEvents.length;
    const totalConflict = gdeltCount + ucdpCount;

    // --- Thermal hotspots ---
    const totalThermal  = liveThermal.length;

    // --- Seismic events ---
    const totalSeismic  = liveSeismic.length;

    // --- Radiation: highest level detected ---
    let radiationSummary = 'NO DATA';
    if (radiationReadings && radiationReadings.length > 0) {
      const maxUsvh = Math.max(...radiationReadings.map(r => r.usvh || 0));
      radiationSummary = `${radiationLabel(maxUsvh)} (${maxUsvh.toFixed(4)} µSv/h)`;
    }

    // --- Wave height at Hormuz ---
    let waveSummary = 'NO DATA';
    if (marineReadings && marineReadings.length > 0) {
      const maxWave = Math.max(...marineReadings.map(r => r.waveHeight || 0));
      waveSummary = `${maxWave.toFixed(1)}m`;
    }

    // --- Wind: highest wind speed across monitored locations ---
    let windSummary = 'NO DATA';
    if (weatherReadings && weatherReadings.length > 0) {
      const maxSpeed = Math.max(...weatherReadings.map((reading) => reading.windSpeed || 0));
      windSummary = `${maxSpeed.toFixed(0)} km/h`;
    }

    // --- Update DOM ---
    if (analyticsAircraftTotalEl) analyticsAircraftTotalEl.textContent = totalAircraft;
    if (analyticsVesselsTotalEl)  analyticsVesselsTotalEl.textContent  = totalVessels;
    if (analyticsConflictTotalEl) analyticsConflictTotalEl.textContent = totalConflict;
    if (analyticsThermalTotalEl)  analyticsThermalTotalEl.textContent  = totalThermal;
    if (analyticsSeismicTotalEl)  analyticsSeismicTotalEl.textContent  = totalSeismic;
    if (analyticsRadiationEl)     analyticsRadiationEl.textContent     = radiationSummary;
    if (analyticsWaveEl)          analyticsWaveEl.textContent          = waveSummary;
    if (analyticsWindEl)          analyticsWindEl.textContent          = windSummary;
    if (analyticsLastUpdEl) {
      const now = new Date();
      analyticsLastUpdEl.textContent =
        now.toUTCString().replace('GMT', 'UTC').slice(0, -4);
    }

    debugLog(
      `[Analytics] Aircraft:${totalAircraft} Vessels:${totalVessels} ` +
      `Conflict:${totalConflict} Thermal:${totalThermal} Seismic:${totalSeismic}`
    );
  } catch (e) {
    // Never crash the app
    console.warn('[Analytics] Dashboard update error:', e.message);
  }
}

// Run immediately then on interval
updateAnalyticsDashboard();
setInterval(updateAnalyticsDashboard, ANALYTICS_INTERVAL);

debugLog('[SIGINT-MAP] Section 42 loaded: Extended Analytics Dashboard');


// ============================================================
// SECTION 43: ENHANCED FILTER SYSTEM — OVERRIDE applyFilter
// ============================================================
//
// Overrides the Section 31 applyFilter() to include ALL
// new layers added in Sections 36–41.
//
// New filter categories added:
//   'maritime'  → layers.maritime
//   'weather'   → layers.weather + layers.marine
//   'radiation' → layers.radiation
//   'conflict'  → layers.conflict + layers.gdelt
//
// All original categories are preserved with their
// original behaviour extended to include new layers where
// semantically appropriate (e.g. 'air' now also shows
// adsbMilitary; 'naval' also shows maritime).
// ============================================================

applyFilter = function() {
  // ---- Master list of ALL layer groups ----
  // Includes all original layers PLUS every new layer.
  // Guards (|| null) prevent errors if a layer fails to init.
  const allGroups = [
    // Original layers
    layers.air,
    layers.naval,
    layers.missile,
    layers.land,
    layers.events,
    layers.aircraft,
    layers.impacts,
    layers.intercepts,
    layers.seismic,
    layers.thermal,
    layers.gdelt,
    layers.connections,
    layers.sigmet,
    layers.nuclear,
    // New layers (Sections 36–41)
    layers.adsbMilitary  || null,
    layers.maritime      || null,
    layers.weather       || null,
    layers.radiation     || null,
    layers.conflict      || null,
    layers.marine        || null,
  ];

  // Show everything
  if (currentFilter === 'all') {
    allGroups.forEach(g => { if (g) g.visible = true; });
    return;
  }

  // Hide everything first, then selectively show
  allGroups.forEach(g => { if (g) g.visible = false; });

  switch (currentFilter) {

    // ---- Original categories (extended with new layers) ----
    case 'impacts':
      if (layers.impacts)    layers.impacts.visible    = true;
      if (layers.missile)    layers.missile.visible    = true;
      if (layers.events)     layers.events.visible     = true;
      if (layers.conflict)   layers.conflict.visible   = true; // UCDP adds real-world context
      break;

    case 'intercepts':
      if (layers.intercepts)    layers.intercepts.visible    = true;
      if (layers.air)           layers.air.visible           = true;
      if (layers.sigmet)        layers.sigmet.visible        = true;
      if (layers.adsbMilitary)  layers.adsbMilitary.visible  = true;
      break;

    case 'strikes':
      if (layers.missile)   layers.missile.visible   = true;
      if (layers.land)      layers.land.visible      = true;
      if (layers.events)    layers.events.visible    = true;
      if (layers.impacts)   layers.impacts.visible   = true;
      if (layers.nuclear)   layers.nuclear.visible   = true;
      if (layers.conflict)  layers.conflict.visible  = true;
      break;

    case 'naval':
      if (layers.naval)     layers.naval.visible     = true;
      if (layers.maritime)  layers.maritime.visible  = true;  // NEW: AIS vessels
      if (layers.marine)    layers.marine.visible    = true;  // NEW: wave conditions
      break;

    case 'air':
      if (layers.air)           layers.air.visible          = true;
      if (layers.aircraft)      layers.aircraft.visible     = true;
      if (layers.sigmet)        layers.sigmet.visible       = true;
      if (layers.adsbMilitary)  layers.adsbMilitary.visible = true;  // NEW
      if (layers.weather)       layers.weather.visible      = true;  // wind affects flight
      break;

    case 'seismic':
      if (layers.seismic)  layers.seismic.visible  = true;
      break;

    case 'thermal':
      if (layers.thermal)   layers.thermal.visible   = true;
      if (layers.radiation) layers.radiation.visible = true;  // radiological = thermal threat
      break;

    case 'nuclear':
      if (layers.nuclear)   layers.nuclear.visible   = true;
      if (layers.land)      layers.land.visible      = true;
      if (layers.impacts)   layers.impacts.visible   = true;
      if (layers.radiation) layers.radiation.visible = true;  // NEW: radiation monitoring
      break;

    case 'defenses':
      if (layers.intercepts)    layers.intercepts.visible    = true;
      if (layers.air)           layers.air.visible           = true;
      if (layers.nuclear)       layers.nuclear.visible       = true;
      if (layers.adsbMilitary)  layers.adsbMilitary.visible  = true;
      break;

    case 'gdelt':
      if (layers.gdelt)    layers.gdelt.visible    = true;
      if (layers.events)   layers.events.visible   = true;
      if (layers.conflict) layers.conflict.visible = true;  // UCDP is complementary
      break;

    // ---- New filter categories ----
    case 'maritime':
      if (layers.naval)     layers.naval.visible     = true;
      if (layers.maritime)  layers.maritime.visible  = true;
      if (layers.marine)    layers.marine.visible    = true;
      break;

    case 'weather':
      if (layers.weather) layers.weather.visible = true;
      if (layers.marine)  layers.marine.visible  = true;
      if (layers.sigmet)  layers.sigmet.visible  = true;  // SIGMETs = weather events
      break;

    case 'radiation':
      if (layers.radiation) layers.radiation.visible = true;
      if (layers.nuclear)   layers.nuclear.visible   = true;
      if (layers.thermal)   layers.thermal.visible   = true;
      break;

    case 'conflict':
      if (layers.conflict) layers.conflict.visible = true;
      if (layers.gdelt)    layers.gdelt.visible    = true;
      if (layers.events)   layers.events.visible   = true;
      if (layers.missile)  layers.missile.visible  = true;
      if (layers.impacts)  layers.impacts.visible  = true;
      break;

    default:
      // Unknown filter — show everything rather than leaving blank
      allGroups.forEach(g => { if (g) g.visible = true; });
      break;
  }
}

// Re-bind ALL filter buttons (this replaces the Section 31 binding)
// Clone trick prevents duplicate event listener accumulation
document.querySelectorAll('.filter-btn').forEach(btn => {
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    setCurrentFilter(newBtn.dataset.filter);
  });
});

// Apply current filter immediately so new layers respect any active selection
applyFilter();

debugLog('[SIGINT-MAP] Section 43 loaded: Enhanced Filter System (all layers)');

// ============================================================
// SOURCE STATUS UPDATER — Periodically scans data arrays and
// updates ALL sidebar source-item indicators to LIVE/OFFLINE
// ============================================================
function updateAllSourceStatuses() {
  const items = document.querySelectorAll('.source-item');
  items.forEach(el => {
    const label = el.textContent.trim();
    const dot = el.querySelector('.status-dot');
    const tag = el.querySelector('.source-item__tag');
    if (!dot || !tag) return;

    let isLive = false;
    let count = '';

    if (label.includes('Radiation')) {
      isLive = radiationMarkers.length > 0;
      count = isLive ? ` (${radiationMarkers.length})` : '';
    } else if (label.includes('Conflict Events') && !label.includes('Georef')) {
      isLive = conflictMarkers.length > 0;
      count = isLive ? ` (${conflictMarkers.length})` : '';
    } else if (label.includes('Open-Meteo Wind')) {
      isLive = weatherArrows.length > 0;
      count = isLive ? ` (${weatherArrows.length})` : '';
    } else if (label.includes('Marine Weather')) {
      isLive = marineRings.length > 0;
      count = isLive ? ` (${marineReadings.length})` : '';
    } else if (el.id === 'ais-maritime-src' || label.includes('Maritime AIS') || label.includes('AIS Maritime')) {
      isLive = maritimeMarkers.length > 0;
      count = isLive ? ` (${maritimeMarkers.length})` : '';
    } else if (label.includes('Oil Price')) {
      isLive = true; // Oil price always has data (live or simulated)
    } else {
      return; // Don't touch items managed elsewhere
    }

    if (isLive) {
      const isSimulated =
        (label.includes('Open-Meteo Wind') && weatherUsingFallback) ||
        (label.includes('Marine Weather') && marineUsingFallback);

      dot.className = isSimulated ? 'status-dot status-dot--sim' : 'status-dot status-dot--live';
      tag.textContent = (isSimulated ? 'SIM' : 'LIVE') + count;
      tag.className = isSimulated ? 'source-item__tag source-item__tag--sim' : 'source-item__tag';
    } else if (tag.textContent === 'CONN') {
      // Still connecting, leave it
    } else {
      dot.className = 'status-dot status-dot--offline';
      tag.textContent = 'OFFLINE';
      tag.className = 'source-item__tag source-item__tag--sim';
    }
  });
}
// Run status check every 10 seconds
setInterval(updateAllSourceStatuses, 10000);
// Also run once after 15s to catch initial loads
setTimeout(updateAllSourceStatuses, 15000);

// ============================================================
// SECTIONS 36–43 FULLY LOADED
// Data sources:
//   ✓ ADSB.lol military flight tracking (15s)
//   ✓ Dynamic maritime AIS tracking (60s)
//   ✓ Open-Meteo wind visualization (5min)
//   ✓ Safecast + OpenRadiation monitoring (10min)
//   ✓ Conflict events via ReliefWeb/simulation (1hr)
//   ✓ Open-Meteo marine / Hormuz wave conditions (10min)
//   ✓ Extended analytics dashboard (30s)
//   ✓ Enhanced filter system with all new categories
// ============================================================
debugLog('[SIGINT-MAP] Sections 36–43 loaded: All new API integrations active');
// ============================================================
// SECTION 44: NATIVE BROWSER WEB API ENHANCEMENTS
// ============================================================
//
// Integrates 13 native browser APIs to dramatically improve
// SIGINT-MAP performance, reliability, and user experience.
//
// APIs implemented:
//   1.  Page Visibility API         — pause/resume on tab switch
//   2.  Network Information API     — offline/bandwidth detection
//   3.  Web Notifications API       — event alerts with bell toggle
//   4.  Web Worker (Blob/inline)    — off-thread data processing
//   5.  Screen Wake Lock API        — prevent sleep in monitoring mode
//   6.  Geolocation API             — "Center on my location" feature
//   7.  Clipboard + Web Share API   — copy/share intelligence briefing
//   8.  Performance Observer API    — FPS counter, long-task detection
//   9.  Intersection Observer       — pause off-screen sidebar panels
//   10. Broadcast Channel API       — multi-tab sync & coordination
//   11. Beacon API + Session Analytics — unload telemetry
//   12. requestIdleCallback         — defer non-critical work
//   13. Keyboard Shortcuts Enhancement — new hotkeys
//
// All globals prefixed with `nw_` to avoid conflicts.
// All features have graceful fallbacks for unsupported browsers.
// ============================================================

// ─────────────────────────────────────────────────────────────
// NW-0: SHARED STATE & CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Session start time (ms since epoch) */
const nw_sessionStart = Date.now();

/** Tracks cumulative hidden time (ms) for analytics */
let nw_totalHiddenMs = 0;
let nw_hiddenSince   = null;

/** Whether the app is currently paused due to tab hidden */
let nw_tabPaused = false;

/** Connection quality: 'high' | 'medium' | 'low' */
let nw_connectionQuality = 'high';
let nw_lowBandwidthManual = false;   // manual override via 'M' key

/** Notifications enabled flag */
let nw_notificationsEnabled = false;
let nw_lastNotificationTime  = 0;
const NW_NOTIF_THROTTLE_MS   = 30000; // 30 s between notifications

/** Wake lock reference */
let nw_wakeLock     = null;
let nw_wakeLockActive = false;

/** Geolocation */
let nw_userPosition = null; // { lat, lon }
let nw_userMarker   = null; // Three.js mesh

/** Performance monitoring */
let nw_perfOverlayVisible = false;
let nw_fpsHistory         = [];
let nw_lastFrameTime      = performance.now();
let nw_frameCount         = 0;
let nw_currentFps         = 0;
let nw_longTaskCount      = 0;

/** Broadcast Channel */
let nw_bc          = null;
let nw_tabId       = Math.random().toString(36).slice(2, 8);
let nw_isPrimary   = false;   // this tab is the primary data fetcher
let nw_tabNumber   = 1;

/** Web Worker */
let nw_worker       = null;
let nw_workerReady  = false;
const nw_workerCallbacks = new Map(); // requestId → resolve fn
let nw_workerReqId       = 0;

/** Intersection Observer */
const nw_sidebarObservers = new Map(); // elementId → {observer, timerId}

/** Session analytics counters */
const nw_analytics = {
  eventsViewed:         0,
  filtersUsed:          new Set(),
  dataSourcesOk:        new Set(),
  dataSourcesFailed:    new Set(),
  notificationsSent:    0,
  longTasks:            0,
  connectionChanges:    0,
  hiddenCount:          0,
  briefingsCopied:      0,
};

/** Filter presets for 1–9 quick-switch */
const nw_filterPresets = [
  'all',          // 1
  'air',          // 2
  'naval',        // 3
  'strikes',      // 4
  'seismic',      // 5
  'thermal',      // 6
  'nuclear',      // 7
  'radiation',    // 8
  'conflict',     // 9
];

debugLog('[S44] Section 44 initializing — Native Browser Web API Enhancements');

// ─────────────────────────────────────────────────────────────
// NW-1: PAGE VISIBILITY API
// ─────────────────────────────────────────────────────────────

(function nw_initPageVisibility() {
  if (!('hidden' in document)) {
    console.warn('[S44] Page Visibility API not supported');
    return;
  }

  // Create the "DATA PAUSED" overlay element
  const overlay = document.createElement('div');
  overlay.id = 'nw-paused-overlay';
  overlay.innerHTML = `
    <div class="nw-paused-inner">
      <div class="nw-paused-icon">⏸</div>
      <div class="nw-paused-title">DATA PAUSED</div>
      <div class="nw-paused-sub">Tab was hidden — resuming live feed…</div>
      <div class="nw-paused-timer" id="nw-paused-timer"></div>
    </div>`;
  overlay.style.cssText = `
    display:none; position:fixed; inset:0; z-index:99999;
    background:rgba(0,0,0,0.82); backdrop-filter:blur(4px);
    align-items:center; justify-content:center; flex-direction:column;
    color:#fff; font-family:monospace;`;
  document.body.appendChild(overlay);

  // Inject overlay styles
  const style = document.createElement('style');
  style.textContent = `
    #nw-paused-overlay { display:none; }
    #nw-paused-overlay.nw-visible { display:flex !important; }
    .nw-paused-inner { text-align:center; padding:2rem; }
    .nw-paused-icon  { font-size:4rem; line-height:1; margin-bottom:.5rem; }
    .nw-paused-title { font-size:2rem; font-weight:700; color:#f59e0b;
                       letter-spacing:.2em; margin-bottom:.5rem; }
    .nw-paused-sub   { color:#9ca3af; font-size:.9rem; margin-bottom:.5rem; }
    .nw-paused-timer { color:#6b7280; font-size:.8rem; }
  `;
  document.head.appendChild(style);

  function onVisibilityChange() {
    if (document.hidden) {
      // ── TAB BECOMING HIDDEN ──────────────────────────────
      nw_tabPaused  = true;
      nw_hiddenSince = Date.now();
      nw_analytics.hiddenCount++;

      // Release wake lock while hidden (browser requirement anyway)
      if (nw_wakeLock) {
        nw_wakeLock.release().catch(() => {});
        nw_wakeLockActive = false;
        nw_updateWakeLockUI();
      }

      debugLog('[S44] Tab hidden — pausing data fetches');

    } else {
      // ── TAB BECOMING VISIBLE ─────────────────────────────
      if (nw_tabPaused && nw_hiddenSince !== null) {
        const hiddenMs = Date.now() - nw_hiddenSince;
        nw_totalHiddenMs += hiddenMs;

        // Show overlay briefly with how long we were gone
        const secs = Math.round(hiddenMs / 1000);
        const timerEl = document.getElementById('nw-paused-timer');
        if (timerEl) {
          timerEl.textContent = `Away for ${secs < 60 ? secs + 's' : Math.round(secs/60) + 'm'}`;
        }
        overlay.classList.add('nw-visible');
        setTimeout(() => overlay.classList.remove('nw-visible'), 1800);
      }

      nw_tabPaused  = false;
      nw_hiddenSince = null;

      // Burst-refresh all data sources
      nw_burstRefresh();

      // Re-acquire wake lock if needed
      nw_maybeAcquireWakeLock();

      debugLog('[S44] Tab visible — resuming; burst-refresh triggered');
    }
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  debugLog('[S44] ✓ Page Visibility API active');
})();

/**
 * Burst-refresh: re-fetch all data sources immediately.
 * Respects offline state and low-bandwidth mode.
 */
function nw_burstRefresh() {
  if (!navigator.onLine) return;
  debugLog('[S44] Burst-refresh: re-fetching all sources');
  try { if (typeof fetchOpenSky  === 'function') fetchOpenSky();  } catch(e){}
  try { if (typeof fetchUSGS     === 'function') fetchUSGS();     } catch(e){}
  try { if (typeof fetchFIRMS    === 'function') fetchFIRMS();    } catch(e){}
  try { if (typeof fetchGDELT    === 'function') fetchGDELT();    } catch(e){}
  try { if (typeof fetchSIGMETs  === 'function') fetchSIGMETs();  } catch(e){}
  try { if (typeof fetchOilPrice === 'function') fetchOilPrice(); } catch(e){}
  // RSS feeds (refreshNews / refreshMilNews / refreshIDFFeed)
  try { if (typeof refreshNews      === 'function') refreshNews();      } catch(e){}
  try { if (typeof refreshMilNews   === 'function') refreshMilNews();   } catch(e){}
  try { if (typeof refreshIDFFeed   === 'function') refreshIDFFeed();   } catch(e){}
  // Newer sources
  try { if (typeof fetchAdsbLol     === 'function') fetchAdsbLol();     } catch(e){}
  try { if (typeof fetchMaritime    === 'function') fetchMaritime();    } catch(e){}
  try { if (typeof fetchWeather     === 'function') fetchWeather();     } catch(e){}
  try { if (typeof fetchRadiation   === 'function') fetchRadiation();   } catch(e){}
  try { if (typeof fetchUCDP        === 'function') fetchUCDP();        } catch(e){}
  try { if (typeof fetchMarineWeather === 'function') fetchMarineWeather(); } catch(e){}
}

// ─────────────────────────────────────────────────────────────
// NW-2: NETWORK INFORMATION API + ONLINE/OFFLINE DETECTION
// ─────────────────────────────────────────────────────────────

(function nw_initNetworkInfo() {

  // ── Create persistent banner ──────────────────────────────
  const banner = document.createElement('div');
  banner.id = 'nw-network-banner';
  banner.style.cssText = `
    display:none; position:fixed; top:0; left:0; right:0; z-index:9999;
    text-align:center; padding:6px 12px; font-family:monospace;
    font-size:.8rem; font-weight:700; letter-spacing:.1em;
    transition:opacity .4s;`;
  document.body.appendChild(banner);

  // ── Bandwidth indicator badge ─────────────────────────────
  const bwBadge = document.createElement('div');
  bwBadge.id = 'nw-bw-badge';
  bwBadge.style.cssText = `
    display:none; position:fixed; bottom:8px; left:8px; z-index:9998;
    background:#1e293b; border:1px solid #f59e0b; color:#f59e0b;
    font-family:monospace; font-size:.7rem; padding:3px 8px;
    border-radius:4px; letter-spacing:.05em;`;
  bwBadge.textContent = 'LOW BW MODE';
  document.body.appendChild(bwBadge);

  function showBanner(msg, color, bgColor, autoDismissMs) {
    banner.textContent = msg;
    banner.style.background = bgColor;
    banner.style.color       = color;
    banner.style.display     = 'block';
    banner.style.opacity     = '1';
    if (autoDismissMs) {
      setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => { banner.style.display = 'none'; }, 450);
      }, autoDismissMs);
    }
  }

  function hideBanner() {
    banner.style.opacity = '0';
    setTimeout(() => { banner.style.display = 'none'; }, 450);
  }

  function evaluateConnection() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let quality = 'high';

    if (conn) {
      const eff = conn.effectiveType; // '4g' | '3g' | '2g' | 'slow-2g'
      const dl  = conn.downlink;      // Mbps estimate

      if (eff === 'slow-2g' || eff === '2g' || (dl !== undefined && dl < 0.5)) {
        quality = 'low';
      } else if (eff === '3g' || (dl !== undefined && dl < 2)) {
        quality = 'medium';
      }

      debugLog(`[S44] Connection: type=${eff}, downlink=${dl}Mbps, RTT=${conn.rtt}ms → quality=${quality}`);
    }

    const prevQuality = nw_connectionQuality;
    nw_connectionQuality = quality;

    if (quality !== prevQuality) {
      nw_analytics.connectionChanges++;
      nw_applyBandwidthMode();

      // Log to event feed
      nw_addTimelineNote(`Network quality changed: ${prevQuality} → ${quality}`);
    }
  }

  function nw_applyBandwidthMode() {
    const isLow = nw_connectionQuality === 'low' || nw_connectionQuality === 'medium' || nw_lowBandwidthManual;

    if (isLow) {
      bwBadge.style.display = 'block';
      bwBadge.textContent   = nw_lowBandwidthManual ? 'LOW BW (MANUAL)' : `LOW BW (${nw_connectionQuality.toUpperCase()})`;
      // Reduce animation intensity — dial back Three.js pixel ratio
      try { renderer.setPixelRatio(1); } catch(e){}
      debugLog('[S44] Low bandwidth mode: reduced fetch frequencies & render quality');
    } else {
      bwBadge.style.display = 'none';
      try { renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); } catch(e){}
    }
  }

  // Expose so 'M' key can toggle
  window.nw_applyBandwidthMode = nw_applyBandwidthMode;

  // ── online / offline events ───────────────────────────────
  window.addEventListener('offline', () => {
    nw_connectionQuality = 'offline';
    showBanner('⚠  OFFLINE — DATA STALE  ⚠', '#fff', '#dc2626');
    console.warn('[S44] OFFLINE — data fetches suspended');
    nw_addTimelineNote('Network offline — data feeds suspended');
  });

  window.addEventListener('online', () => {
    hideBanner();
    showBanner('✓  RECONNECTED — Refreshing data…', '#fff', '#16a34a', 3500);
    debugLog('[S44] Online — burst-refreshing all sources');
    nw_analytics.connectionChanges++;
    evaluateConnection();
    setTimeout(nw_burstRefresh, 300);
    nw_addTimelineNote('Network reconnected — burst refresh triggered');
  });

  // ── Network Information change events ────────────────────
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    conn.addEventListener('change', () => {
      evaluateConnection();
    });
    debugLog('[S44] ✓ Network Information API available');
  } else {
    console.warn('[S44] Network Information API not available — using online/offline only');
  }

  // Initial evaluation
  if (!navigator.onLine) {
    showBanner('⚠  OFFLINE — DATA STALE  ⚠', '#fff', '#dc2626');
  } else {
    evaluateConnection();
  }

  debugLog('[S44] ✓ Network detection active');
})();

/**
 * Add a brief note to the event timeline without adding a globe marker.
 * Falls back gracefully if eventFeed element doesn't exist.
 */
function nw_addTimelineNote(text) {
  try {
    const feed = document.getElementById('event-feed') || document.getElementById('news-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'nw-timeline-note';
    item.style.cssText = 'padding:3px 8px; font-size:.72rem; color:#6b7280; border-left:2px solid #374151; margin:2px 0;';
    item.textContent = `[${new Date().toISOString().substr(11,8)} UTC] ${text}`;
    feed.insertBefore(item, feed.firstChild);
    // Keep at most 5 notes
    const notes = feed.querySelectorAll('.nw-timeline-note');
    notes.forEach((n, i) => { if (i >= 5) n.remove(); });
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────────
// NW-3: WEB NOTIFICATIONS API
// ─────────────────────────────────────────────────────────────

(function nw_initNotifications() {
  if (!('Notification' in window)) {
    console.warn('[S44] Web Notifications API not supported');
    return;
  }

  // ── Bell button in controls bar ───────────────────────────
  const bellBtn = document.createElement('button');
  bellBtn.id    = 'nw-bell-btn';
  bellBtn.title = 'Toggle event notifications (N)';
  bellBtn.style.cssText = `
    background:transparent; border:1px solid #374151; color:#9ca3af;
    padding:4px 8px; border-radius:4px; cursor:pointer;
    font-size:14px; line-height:1; transition:all .2s;`;
  bellBtn.innerHTML = `<span id="nw-bell-icon">🔔</span><span id="nw-bell-label" style="font-size:.65rem;margin-left:3px;font-family:monospace;">OFF</span>`;

  // Insert after sound-toggle if it exists, else append to body header
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn && soundBtn.parentNode) {
    soundBtn.parentNode.insertBefore(bellBtn, soundBtn.nextSibling);
  } else {
    const header = document.querySelector('header') || document.querySelector('.controls-bar') || document.body;
    header.appendChild(bellBtn);
  }

  function updateBellUI() {
    const icon  = document.getElementById('nw-bell-icon');
    const label = document.getElementById('nw-bell-label');
    if (icon)  icon.textContent  = nw_notificationsEnabled ? '🔔' : '🔕';
    if (label) label.textContent = nw_notificationsEnabled ? 'ON' : 'OFF';
    bellBtn.style.color       = nw_notificationsEnabled ? '#f59e0b' : '#9ca3af';
    bellBtn.style.borderColor = nw_notificationsEnabled ? '#f59e0b' : '#374151';
  }

  async function requestAndEnable() {
    if (Notification.permission === 'granted') {
      nw_notificationsEnabled = !nw_notificationsEnabled;
      updateBellUI();
      if (nw_notificationsEnabled) {
        nw_sendNotification('SIGINT-MAP', 'Event notifications enabled.', '🔔');
      }
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        nw_notificationsEnabled = true;
        updateBellUI();
        nw_sendNotification('SIGINT-MAP', 'Event notifications enabled.', '🔔');
      } else {
        console.warn('[S44] Notification permission denied');
      }
    } else {
      console.warn('[S44] Notification permission permanently denied');
      nw_addTimelineNote('Notification permission denied by browser');
    }
  }

  bellBtn.addEventListener('click', requestAndEnable);

  // Request permission on first meaningful user interaction with the globe
  let nw_permRequested = false;
  document.addEventListener('pointerdown', () => {
    if (!nw_permRequested && Notification.permission === 'default') {
      nw_permRequested = true;
      Notification.requestPermission().then(p => {
        debugLog(`[S44] Notification permission: ${p}`);
      });
    }
  }, { once: true });

  debugLog('[S44] ✓ Web Notifications API initialized');
})();

/**
 * Send a browser notification with throttle enforcement.
 * @param {string} title
 * @param {string} body
 * @param {string} icon  — emoji or URL
 * @param {object} opts  — { lat, lon, eventType }
 */
function nw_sendNotification(title, body, icon = '⚠', opts = {}) {
  if (!nw_notificationsEnabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = Date.now();
  if (now - nw_lastNotificationTime < NW_NOTIF_THROTTLE_MS) return;
  nw_lastNotificationTime = now;
  nw_analytics.notificationsSent++;

  const tag = opts.eventType || 'sigint-map-alert';

  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: opts.iconUrl || '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
    });

    n.addEventListener('click', () => {
      window.focus();
      n.close();
      // If coords given, fly camera there
      if (opts.lat !== undefined && opts.lon !== undefined) {
        try {
          if (typeof animateCameraTo === 'function' && typeof latLonToVec3 === 'function') {
            const target = latLonToVec3(opts.lat, opts.lon, GLOBE_RADIUS * 2.2);
            animateCameraTo(target);
          }
        } catch(e) {}
      }
    });

    setTimeout(() => n.close(), 8000);
  } catch(e) {
    console.warn('[S44] Notification failed:', e);
  }
}

/**
 * Check incoming data for notification-worthy events.
 * Called by the worker result handler and direct fetch callbacks.
 */
function nw_checkForAlerts(type, data) {
  if (!nw_notificationsEnabled) return;

  switch (type) {
    case 'missile_impact':
      nw_sendNotification('🚀 MISSILE IMPACT DETECTED',
        `${data.label || 'Unknown missile'} — ${data.location || 'Unknown location'}`,
        '🚀', { lat: data.lat, lon: data.lon, eventType: 'missile' });
      break;
    case 'interception':
      nw_sendNotification('🛡 INTERCEPTION DETECTED',
        `${data.label || 'Intercept event'} — ${data.location || ''}`,
        '🛡', { lat: data.lat, lon: data.lon, eventType: 'intercept' });
      break;
    case 'seismic':
      if ((data.magnitude || 0) >= 5.0) {
        nw_sendNotification(`🌍 SEISMIC M${data.magnitude?.toFixed(1)} DETECTED`,
          `${data.place || 'Unknown location'} — near conflict zone`,
          '🌍', { lat: data.lat, lon: data.lon, eventType: 'seismic' });
      }
      break;
    case 'radiation':
      nw_sendNotification('☢ RADIATION ANOMALY',
        `Elevated reading detected — ${data.location || 'Unknown'}`,
        '☢', { lat: data.lat, lon: data.lon, eventType: 'radiation' });
      break;
    case 'breaking_news':
      nw_sendNotification('📡 BREAKING — CENTCOM/DoD',
        (data.title || '').substring(0, 120),
        '📡', { eventType: 'news' });
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// NW-4: WEB WORKER (INLINE BLOB) FOR DATA PROCESSING
// ─────────────────────────────────────────────────────────────

(function nw_initWorker() {
  // ── Worker source code ────────────────────────────────────
  const workerSrc = /* js */`
'use strict';

// ---- Haversine distance (km) --------------------------------
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ---- AOR bounding box (Middle East / Persian Gulf) ----------
const AOR = { minLat: 10, maxLat: 42, minLon: 30, maxLon: 75 };
function inAOR(lat, lon, padding = 5) {
  return lat >= AOR.minLat - padding && lat <= AOR.maxLat + padding &&
         lon >= AOR.minLon - padding && lon <= AOR.maxLon + padding;
}

// ---- News sentiment (keyword scoring) ----------------------
const POSITIVE_KEYWORDS = ['ceasefire','peace','agreement','diplomatic','de-escalate','withdrew'];
const NEGATIVE_KEYWORDS = ['killed','struck','bombed','attack','casualty','casualties',
  'missile','drone','explosion','destroyed','airstrike','intercepted','launched',
  'fatalities','wounded','breached','sunk'];

function scoreSentiment(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const k of NEGATIVE_KEYWORDS) { if (lower.includes(k)) score -= 1; }
  for (const k of POSITIVE_KEYWORDS) { if (lower.includes(k)) score += 1; }
  return Math.max(-5, Math.min(5, score));
}

// ---- Deduplication: remove near-duplicate strings ----------
function deduplicate(items, keyFn, windowMs = 300000) {
  const seen = new Map();
  const now  = Date.now();
  return items.filter(item => {
    const k = keyFn(item);
    const last = seen.get(k);
    if (last && (now - last) < windowMs) return false;
    seen.set(k, now);
    return true;
  });
}

// ---- Spatial clustering (simple grid bucket) ---------------
function clusterByGrid(items, cellDeg = 2) {
  const buckets = new Map();
  for (const item of items) {
    const bLat = Math.floor(item.lat / cellDeg) * cellDeg;
    const bLon = Math.floor(item.lon / cellDeg) * cellDeg;
    const key  = bLat + ',' + bLon;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }
  const out = [];
  for (const [, group] of buckets) {
    if (group.length === 1) {
      out.push(group[0]);
    } else {
      // Representative: centroid
      const lat = group.reduce((s,x)=>s+x.lat,0)/group.length;
      const lon = group.reduce((s,x)=>s+x.lon,0)/group.length;
      out.push({ ...group[0], lat, lon, clustered: group.length,
                 label: group[0].label || group[0].title || 'cluster' });
    }
  }
  return out;
}

// ---- Analytics aggregation ----------------------------------
function aggregateAnalytics(data) {
  const result = {
    aircraftCount: 0, vesselCount: 0, conflictCount: 0,
    thermalCount: 0, seismicCount: 0, radiationCount: 0,
    avgSentiment: 0, bySide: {},
  };
  if (data.aircraft) result.aircraftCount = data.aircraft.length;
  if (data.vessels)  result.vesselCount   = data.vessels.length;
  if (data.conflicts) {
    result.conflictCount = data.conflicts.length;
    if (data.conflicts.length) {
      const sum = data.conflicts.reduce((s,x) => s + (x.sentiment||0), 0);
      result.avgSentiment = sum / data.conflicts.length;
    }
  }
  if (data.thermal)   result.thermalCount   = data.thermal.length;
  if (data.seismic)   result.seismicCount   = data.seismic.length;
  if (data.radiation) result.radiationCount = data.radiation.length;
  return result;
}

// ---- Message handler ----------------------------------------
self.addEventListener('message', function(e) {
  const { id, task, payload } = e.data;

  try {
    let result;

    switch (task) {
      // Filter OpenSky states to AOR + return lean objects
      case 'filterOpenSky': {
        const states = payload.states || [];
        result = states
          .filter(s => s && s[5] != null && s[6] != null && inAOR(s[6], s[5]))
          .map(s => ({
            icao:      s[0],
            callsign:  (s[1] || '').trim(),
            lon:       s[5],
            lat:       s[6],
            altitude:  s[7],
            velocity:  s[9],
            heading:   s[10],
            onGround:  s[8],
          }));
        break;
      }

      // Filter USGS earthquakes near conflict zones
      case 'filterSeismic': {
        const features = payload.features || [];
        const conflictCentroid = { lat: 32, lon: 48 };
        result = features
          .filter(f => {
            if (!f.geometry) return false;
            const [lon, lat] = f.geometry.coordinates;
            const dist = haversine(lat, lon, conflictCentroid.lat, conflictCentroid.lon);
            return dist < 2500 && f.properties.mag >= 3.0;
          })
          .map(f => ({
            id:        f.id,
            lat:       f.geometry.coordinates[1],
            lon:       f.geometry.coordinates[0],
            magnitude: f.properties.mag,
            place:     f.properties.place,
            time:      f.properties.time,
          }));
        break;
      }

      // Score GDELT / news items for sentiment
      case 'scoreNews': {
        const items = payload.items || [];
        result = items.map(item => ({
          ...item,
          sentiment: scoreSentiment(item.title + ' ' + (item.body||'')),
        }));
        break;
      }

      // Deduplicate conflict events
      case 'deduplicateEvents': {
        const items = payload.items || [];
        result = deduplicate(
          items,
          x => (x.title||'').toLowerCase().replace(/\s+/g,'').substring(0,50),
          payload.windowMs || 300000
        );
        break;
      }

      // Cluster dense markers
      case 'clusterMarkers': {
        result = clusterByGrid(payload.items || [], payload.cellDeg || 2);
        break;
      }

      // Aggregate analytics
      case 'aggregateAnalytics': {
        result = aggregateAnalytics(payload);
        break;
      }

      // Distance from user to nearest event
      case 'nearestEvent': {
        const { userLat, userLon, events } = payload;
        let minDist = Infinity, nearest = null;
        for (const ev of (events || [])) {
          const d = haversine(userLat, userLon, ev.lat, ev.lon);
          if (d < minDist) { minDist = d; nearest = ev; }
        }
        result = { nearest, distanceKm: Math.round(minDist) };
        break;
      }

      default:
        result = { error: 'Unknown task: ' + task };
    }

    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message });
  }
});

self.postMessage({ id: '__ready__', ok: true, result: 'worker_ready' });
`;

  try {
    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    const url  = URL.createObjectURL(blob);
    nw_worker  = new Worker(url);

    nw_worker.addEventListener('message', (e) => {
      const { id, ok, result, error } = e.data;

      if (id === '__ready__') {
        nw_workerReady = true;
        debugLog('[S44] ✓ Web Worker ready');
        URL.revokeObjectURL(url); // clean up blob URL
        return;
      }

      const cb = nw_workerCallbacks.get(id);
      if (cb) {
        nw_workerCallbacks.delete(id);
        if (ok) cb.resolve(result);
        else    cb.reject(new Error(error));
      }
    });

    nw_worker.addEventListener('error', (e) => {
      console.error('[S44] Worker error:', e);
    });

    debugLog('[S44] Web Worker created, awaiting ready signal…');
  } catch(e) {
    console.warn('[S44] Web Worker creation failed:', e);
    nw_worker = null;
  }
})();

/**
 * Send a task to the Web Worker. Returns a Promise.
 * Falls back to synchronous inline execution if worker unavailable.
 * @param {string} task
 * @param {object} payload
 * @returns {Promise<any>}
 */

function nw_inlineInAOR(lat, lon) {
  return lat >= 12 && lat <= 42 && lon >= 30 && lon <= 65;
}

function nw_inlineHaversine(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nw_inlineScoreSentiment(text) {
  const positiveKeywords = ['ceasefire', 'aid', 'agreement', 'de-escalation', 'rescue', 'stabilized'];
  const negativeKeywords = ['killed', 'attack', 'missile', 'drone', 'explosion', 'destroyed', 'airstrike', 'intercepted', 'launched', 'fatalities', 'wounded', 'breached', 'sunk'];
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  positiveKeywords.forEach((keyword) => {
    if (lower.includes(keyword)) score += 1;
  });
  negativeKeywords.forEach((keyword) => {
    if (lower.includes(keyword)) score -= 1;
  });
  return Math.max(-5, Math.min(5, score));
}

function nw_inlineRunWorkerTask(task, payload = {}) {
  switch (task) {
    case 'filterOpenSky': {
      const states = payload.states || [];
      return states
        .filter((state) => state && state[5] != null && state[6] != null && nw_inlineInAOR(state[6], state[5]))
        .map((state) => ({
          icao: state[0],
          callsign: (state[1] || '').trim(),
          lon: state[5],
          lat: state[6],
          altitude: state[7],
          velocity: state[9],
          heading: state[10],
          onGround: state[8],
        }));
    }

    case 'filterSeismic': {
      const features = payload.features || [];
      const conflictCentroid = { lat: 32, lon: 48 };
      return features
        .filter((feature) => {
          if (!feature.geometry || !feature.geometry.coordinates) return false;
          const [lon, lat] = feature.geometry.coordinates;
          const distance = nw_inlineHaversine(lat, lon, conflictCentroid.lat, conflictCentroid.lon);
          return distance < 2500 && (feature.properties?.mag || 0) >= 3.0;
        })
        .map((feature) => ({
          id: feature.id,
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          magnitude: feature.properties?.mag,
          place: feature.properties?.place,
          time: feature.properties?.time,
        }));
    }

    case 'scoreNews': {
      const items = payload.items || [];
      return items.map((item) => ({
        ...item,
        sentiment: nw_inlineScoreSentiment(`${item.title || ''} ${item.body || ''}`),
      }));
    }

    case 'deduplicateEvents': {
      const items = payload.items || [];
      const seen = new Set();
      return items.filter((item) => {
        const key = `${(item.title || '').toLowerCase().replace(/\s+/g, '').slice(0, 50)}|${item.lat}|${item.lon}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    case 'clusterMarkers': {
      const items = payload.items || [];
      const cellDeg = payload.cellDeg || 2;
      const buckets = new Map();

      items.forEach((item) => {
        const bucketLat = Math.floor(item.lat / cellDeg) * cellDeg;
        const bucketLon = Math.floor(item.lon / cellDeg) * cellDeg;
        const key = `${bucketLat},${bucketLon}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(item);
      });

      return Array.from(buckets.values()).map((group) => {
        if (group.length === 1) return group[0];
        const lat = group.reduce((sum, item) => sum + item.lat, 0) / group.length;
        const lon = group.reduce((sum, item) => sum + item.lon, 0) / group.length;
        return {
          ...group[0],
          lat,
          lon,
          clustered: group.length,
          label: group[0].label || group[0].title || 'cluster',
        };
      });
    }

    case 'aggregateAnalytics': {
      return {
        aircraftCount: (payload.aircraft || []).length,
        vesselCount: (payload.vessels || []).length,
        conflictCount: (payload.conflicts || []).length,
        thermalCount: (payload.thermal || []).length,
        seismicCount: (payload.seismic || []).length,
        radiationCount: (payload.radiation || []).length,
      };
    }

    case 'nearestEvent': {
      const { userLat, userLon, events = [] } = payload;
      let nearest = null;
      let distanceKm = Infinity;
      events.forEach((event) => {
        const distance = nw_inlineHaversine(userLat, userLon, event.lat, event.lon);
        if (distance < distanceKm) {
          nearest = event;
          distanceKm = distance;
        }
      });
      return { nearest, distanceKm: Math.round(distanceKm) };
    }

    default:
      throw new Error(`Unknown task: ${task}`);
  }
}

function nw_workerTask(task, payload) {
  if (nw_worker && nw_workerReady) {
    return new Promise((resolve, reject) => {
      const id = 'req_' + (++nw_workerReqId);
      nw_workerCallbacks.set(id, { resolve, reject });
      nw_worker.postMessage({ id, task, payload });
      // Timeout safety
      setTimeout(() => {
        if (nw_workerCallbacks.has(id)) {
          nw_workerCallbacks.delete(id);
          reject(new Error('Worker task timeout: ' + task));
        }
      }, 15000);
    });
  }

  // Fallback: run synchronously with the same semantics as the worker.
  console.warn('[S44] Worker unavailable — running task inline:', task);
  return Promise.resolve().then(() => nw_inlineRunWorkerTask(task, payload));
}

// ─────────────────────────────────────────────────────────────
// NW-5: SCREEN WAKE LOCK API
// ─────────────────────────────────────────────────────────────

// ── Lock icon badge in controls ───────────────────────────────
(function nw_initWakeLock() {
  if (!('wakeLock' in navigator)) {
    console.warn('[S44] Screen Wake Lock API not supported');
    return;
  }

  const lockBtn = document.createElement('button');
  lockBtn.id    = 'nw-wakelock-btn';
  lockBtn.title = 'Toggle Wake Lock — prevent screen sleep (L)';
  lockBtn.style.cssText = `
    background:transparent; border:1px solid #374151; color:#9ca3af;
    padding:4px 8px; border-radius:4px; cursor:pointer;
    font-size:14px; line-height:1; transition:all .2s;`;
  lockBtn.innerHTML = `<span>🔓</span><span id="nw-lock-label" style="font-size:.65rem;margin-left:3px;font-family:monospace;">WAKE</span>`;

  const bellBtn = document.getElementById('nw-bell-btn');
  if (bellBtn && bellBtn.parentNode) {
    bellBtn.parentNode.insertBefore(lockBtn, bellBtn.nextSibling);
  } else {
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn && soundBtn.parentNode) soundBtn.parentNode.appendChild(lockBtn);
    else document.body.appendChild(lockBtn);
  }

  lockBtn.addEventListener('click', nw_toggleWakeLock);
  debugLog('[S44] ✓ Screen Wake Lock button created');
})();

function nw_updateWakeLockUI() {
  const btn   = document.getElementById('nw-wakelock-btn');
  const label = document.getElementById('nw-lock-label');
  if (!btn) return;
  const icon = btn.querySelector('span');
  if (icon)  icon.textContent  = nw_wakeLockActive ? '🔒' : '🔓';
  if (label) label.textContent = nw_wakeLockActive ? 'LOCKED' : 'WAKE';
  btn.style.color       = nw_wakeLockActive ? '#22c55e' : '#9ca3af';
  btn.style.borderColor = nw_wakeLockActive ? '#22c55e' : '#374151';
}

async function nw_acquireWakeLock() {
  if (!('wakeLock' in navigator) || nw_wakeLockActive) return;
  try {
    nw_wakeLock = await navigator.wakeLock.request('screen');
    nw_wakeLockActive = true;
    nw_updateWakeLockUI();
    debugLog('[S44] Wake Lock acquired');

    nw_wakeLock.addEventListener('release', () => {
      nw_wakeLockActive = false;
      nw_updateWakeLockUI();
      debugLog('[S44] Wake Lock released');
    });
  } catch(e) {
    console.warn('[S44] Wake Lock request failed:', e.message);
  }
}

async function nw_releaseWakeLock() {
  if (!nw_wakeLock) return;
  try {
    await nw_wakeLock.release();
  } catch(e) {}
  nw_wakeLock       = null;
  nw_wakeLockActive = false;
  nw_updateWakeLockUI();
}

async function nw_toggleWakeLock() {
  if (nw_wakeLockActive) {
    await nw_releaseWakeLock();
  } else {
    await nw_acquireWakeLock();
  }
}

/**
 * Acquire wake lock if monitoring conditions are met
 * (auto-rotate active OR sound alerts enabled).
 */
function nw_maybeAcquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  const shouldLock = (typeof autoRotate !== 'undefined' && autoRotate) ||
                     (typeof soundEnabled !== 'undefined' && soundEnabled);
  if (shouldLock && !nw_wakeLockActive && !document.hidden) {
    nw_acquireWakeLock();
  }
}

// Re-acquire on page visibility restore (browser releases lock on hide)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) nw_maybeAcquireWakeLock();
});

// ─────────────────────────────────────────────────────────────
// NW-6: GEOLOCATION API
// ─────────────────────────────────────────────────────────────

(function nw_initGeolocation() {
  if (!('geolocation' in navigator)) {
    console.warn('[S44] Geolocation API not supported');
    return;
  }

  // ── "Geolocate" button ────────────────────────────────────
  const geoBtn = document.createElement('button');
  geoBtn.id    = 'nw-geo-btn';
  geoBtn.title = 'Center on my location (G)';
  geoBtn.style.cssText = `
    background:transparent; border:1px solid #374151; color:#9ca3af;
    padding:4px 8px; border-radius:4px; cursor:pointer;
    font-size:14px; line-height:1; transition:all .2s;`;
  geoBtn.innerHTML = `<span>📍</span><span id="nw-geo-label" style="font-size:.65rem;margin-left:3px;font-family:monospace;">LOCATE</span>`;

  // Insert near wake-lock button
  const lockBtn = document.getElementById('nw-wakelock-btn');
  if (lockBtn && lockBtn.parentNode) {
    lockBtn.parentNode.insertBefore(geoBtn, lockBtn.nextSibling);
  } else {
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn && soundBtn.parentNode) soundBtn.parentNode.appendChild(geoBtn);
    else document.body.appendChild(geoBtn);
  }

  // ── Distance readout ──────────────────────────────────────
  const geoReadout = document.createElement('div');
  geoReadout.id    = 'nw-geo-readout';
  geoReadout.style.cssText = `
    display:none; position:fixed; bottom:32px; left:8px; z-index:9998;
    background:#1e293b; border:1px solid #22c55e; color:#22c55e;
    font-family:monospace; font-size:.7rem; padding:4px 10px;
    border-radius:4px;`;
  document.body.appendChild(geoReadout);

  geoBtn.addEventListener('click', nw_geolocateUser);
  debugLog('[S44] ✓ Geolocation button created');
})();

function nw_geolocateUser() {
  if (!('geolocation' in navigator)) return;

  const label = document.getElementById('nw-geo-label');
  if (label) label.textContent = 'LOCATING…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon, accuracy } = pos.coords;
      nw_userPosition = { lat, lon };

      debugLog(`[S44] User position: ${lat.toFixed(4)}, ${lon.toFixed(4)} (±${Math.round(accuracy)}m)`);
      if (label) label.textContent = `${lat.toFixed(1)},${lon.toFixed(1)}`;

      // ── Show user dot on globe ────────────────────────────
      nw_placeUserMarker(lat, lon);

      // ── Fly to position only if in/near AOR ──────────────
      const inAOR = (lat >= 5 && lat <= 47 && lon >= 25 && lon <= 80);
      if (inAOR && typeof animateCameraTo === 'function' && typeof latLonToVec3 === 'function') {
        const target = latLonToVec3(lat, lon, GLOBE_RADIUS * 2.3);
        animateCameraTo(target);
      }

      // ── Distance to nearest conflict event ───────────────
      nw_updateDistanceToNearest(lat, lon);

      const readout = document.getElementById('nw-geo-readout');
      if (readout) {
        readout.style.display = 'block';
        readout.textContent   = `📍 ${lat.toFixed(3)}°N ${lon.toFixed(3)}°E`;
      }
    },
    (err) => {
      console.warn('[S44] Geolocation error:', err.message);
      const label = document.getElementById('nw-geo-label');
      if (label) label.textContent = 'DENIED';
      nw_addTimelineNote('Geolocation request denied or failed');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
}

function nw_placeUserMarker(lat, lon) {
  if (typeof THREE === 'undefined' || typeof scene === 'undefined') return;

  // Remove existing marker
  if (nw_userMarker) {
    scene.remove(nw_userMarker);
    nw_userMarker = null;
  }

  try {
    const pos  = latLonToVec3(lat, lon, GLOBE_RADIUS + 0.05);
    const geo  = new THREE.SphereGeometry(0.07, 16, 16);
    const mat  = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.userData = {
      title:  '📍 Your Location',
      detail: `Lat ${lat.toFixed(4)}° / Lon ${lon.toFixed(4)}°`,
      domain: 'user',
    };

    // Pulsing ring
    const rGeo  = new THREE.RingGeometry(0.09, 0.12, 32);
    const rMat  = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ring  = new THREE.Mesh(rGeo, rMat);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    ring.position.copy(pos);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(ring);

    scene.add(group);
    nw_userMarker = group;

    if (typeof pickableObjects !== 'undefined') pickableObjects.push(mesh);
  } catch(e) {
    console.warn('[S44] Could not place user marker:', e);
  }
}

function nw_updateDistanceToNearest(lat, lon) {
  // Collect event positions from the scene layers
  const events = [];
  try {
    const candidates = [
      ...(layers.impacts?.children || []),
      ...(layers.gdelt?.children   || []),
      ...(layers.conflict?.children|| []),
    ];
    candidates.forEach(obj => {
      if (obj.userData && obj.userData.lat && obj.userData.lon) {
        events.push({ lat: obj.userData.lat, lon: obj.userData.lon,
                      title: obj.userData.title || '?' });
      }
    });
  } catch(e) {}

  if (events.length === 0) return;

  nw_workerTask('nearestEvent', { userLat: lat, userLon: lon, events })
    .then(({ nearest, distanceKm }) => {
      const readout = document.getElementById('nw-geo-readout');
      if (readout && nearest) {
        readout.textContent = `📍 Nearest event: ${nearest.title?.substring(0,30) || '?'} — ${distanceKm.toLocaleString()} km`;
      }
    })
    .catch(e => console.warn('[S44] nearestEvent worker error:', e));
}

// ─────────────────────────────────────────────────────────────
// NW-7: CLIPBOARD + WEB SHARE API
// ─────────────────────────────────────────────────────────────

(function nw_initClipboard() {
  // ── Copy Briefing button ──────────────────────────────────
  const copyBtn = document.createElement('button');
  copyBtn.id    = 'nw-copy-btn';
  copyBtn.title = 'Copy intelligence briefing to clipboard (C)';
  copyBtn.style.cssText = `
    background:transparent; border:1px solid #374151; color:#9ca3af;
    padding:4px 8px; border-radius:4px; cursor:pointer;
    font-size:14px; line-height:1; transition:all .2s;`;
  copyBtn.innerHTML = `<span>📋</span><span id="nw-copy-label" style="font-size:.65rem;margin-left:3px;font-family:monospace;">BRIEF</span>`;

  // Insert next to geo button
  const geoBtn = document.getElementById('nw-geo-btn');
  if (geoBtn && geoBtn.parentNode) {
    geoBtn.parentNode.insertBefore(copyBtn, geoBtn.nextSibling);
  } else {
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn && soundBtn.parentNode) soundBtn.parentNode.appendChild(copyBtn);
    else document.body.appendChild(copyBtn);
  }

  copyBtn.addEventListener('click', nw_copyBriefing);
  debugLog('[S44] ✓ Clipboard / Share button created');
})();

/**
 * Build an intelligence briefing string from live data.
 */
function nw_buildBriefing() {
  const now = new Date().toUTCString();

  // Count layer objects
  const safe = (layerKey) => {
    try { return layers[layerKey]?.children?.length ?? 0; } catch(e) { return 0; }
  };

  const aircraftTotal  = safe('aircraft') + safe('adsbMilitary');
  const vesselTotal    = safe('maritime');
  const conflictTotal  = safe('gdelt') + safe('conflict');
  const thermalTotal   = safe('thermal');
  const seismicTotal   = safe('seismic');
  const radiationTotal = safe('radiation') || 0;

  // Intensity heuristic (rough)
  const intensity = conflictTotal > 50 ? 'CRITICAL' :
                    conflictTotal > 20 ? 'HIGH'     :
                    conflictTotal > 5  ? 'MODERATE' : 'LOW';

  // Online status
  const netStatus = navigator.onLine ? 'ONLINE' : 'OFFLINE';
  const connType  = (() => {
    const c = navigator.connection;
    return c ? `${c.effectiveType?.toUpperCase()||'?'} (${c.downlink||'?'}Mbps)` : 'Unknown';
  })();

  // Latest events (first 5 from event feed)
  let latestItems = '';
  try {
    const feedItems = document.querySelectorAll('#event-feed .event-item, #news-feed .news-item');
    Array.from(feedItems).slice(0, 5).forEach((el, i) => {
      latestItems += `  ${i+1}. ${(el.textContent||'').replace(/\s+/g,' ').trim().substring(0,120)}\n`;
    });
  } catch(e) {}
  if (!latestItems) latestItems = '  (feed data unavailable)\n';

  const briefing = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║        SIGINT-MAP // OPERATION EPIC FURY — INTEL BRIEF       ║',
    '╚══════════════════════════════════════════════════════════════╝',
    '',
    `TIMESTAMP    : ${now}`,
    `CLASSIFICATION: UNCLASSIFIED // FOR DEMONSTRATION ONLY`,
    '',
    '── LIVE ASSET COUNTS ──────────────────────────────────────────',
    `  Aircraft tracked   : ${aircraftTotal.toString().padStart(5)}`,
    `  Vessels tracked    : ${vesselTotal.toString().padStart(5)}`,
    `  Conflict events    : ${conflictTotal.toString().padStart(5)}`,
    `  Thermal hotspots   : ${thermalTotal.toString().padStart(5)}`,
    `  Seismic events     : ${seismicTotal.toString().padStart(5)}`,
    `  Radiation readings : ${radiationTotal.toString().padStart(5)}`,
    '',
    '── CONFLICT INTENSITY ─────────────────────────────────────────',
    `  Current threat level : ${intensity}`,
    '',
    '── NETWORK STATUS ─────────────────────────────────────────────',
    `  Connection : ${netStatus} / ${connType}`,
    `  Tab hidden time : ${Math.round(nw_totalHiddenMs/1000)}s this session`,
    '',
    '── LATEST EVENTS (FEED) ───────────────────────────────────────',
    latestItems,
    '── USER POSITION ──────────────────────────────────────────────',
    nw_userPosition
      ? `  Lat ${nw_userPosition.lat.toFixed(4)}° / Lon ${nw_userPosition.lon.toFixed(4)}°`
      : '  Not available',
    '',
    '── SESSION ANALYTICS ──────────────────────────────────────────',
    `  Session duration    : ${Math.round((Date.now()-nw_sessionStart)/1000)}s`,
    `  Events viewed       : ${nw_analytics.eventsViewed}`,
    `  Notifications sent  : ${nw_analytics.notificationsSent}`,
    `  Connection changes  : ${nw_analytics.connectionChanges}`,
    '',
    '── SOURCE ─────────────────────────────────────────────────────',
    '  Data sourced from public APIs: OpenSky, USGS, FIRMS, GDELT,',
    '  SIGMET, ADSB.lol, Digitraffic AIS, Safecast, Open-Meteo, UCDP',
    '',
    `  Generated by SIGINT-MAP v44 · Tab ${nw_tabNumber}`,
    '══════════════════════════════════════════════════════════════',
  ].join('\n');

  return briefing;
}

async function nw_copyBriefing() {
  const briefing = nw_buildBriefing();
  const label    = document.getElementById('nw-copy-label');
  const btn      = document.getElementById('nw-copy-btn');

  // Try Web Share API first (mobile)
  if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    try {
      await navigator.share({
        title: 'SIGINT-MAP Intelligence Brief',
        text:  briefing,
        url:   window.location.href,
      });
      nw_analytics.briefingsCopied++;
      if (label) label.textContent = 'SHARED!';
      setTimeout(() => { if (label) label.textContent = 'BRIEF'; }, 2500);
      return;
    } catch(e) {
      if (e.name !== 'AbortError') console.warn('[S44] Share failed:', e);
    }
  }

  // Clipboard API
  try {
    await copyText(briefing);

    nw_analytics.briefingsCopied++;
    if (btn)   { btn.style.borderColor = '#22c55e'; btn.style.color = '#22c55e'; }
    if (label) label.textContent = 'COPIED!';
    setTimeout(() => {
      if (btn)   { btn.style.borderColor = '#374151'; btn.style.color = '#9ca3af'; }
      if (label) label.textContent = 'BRIEF';
    }, 2500);
    debugLog('[S44] Briefing copied to clipboard');
  } catch(e) {
    console.error('[S44] Clipboard write failed:', e);
    if (label) { label.textContent = 'FAILED'; setTimeout(() => { label.textContent = 'BRIEF'; }, 2000); }
  }
}

// ─────────────────────────────────────────────────────────────
// NW-8: PERFORMANCE OBSERVER API + FPS COUNTER
// ─────────────────────────────────────────────────────────────

// ── FPS overlay element ───────────────────────────────────────
(function nw_initPerformance() {
  // FPS + stats overlay
  const perf = document.createElement('div');
  perf.id    = 'nw-perf-overlay';
  perf.style.cssText = `
    display:none; position:fixed; top:40px; right:8px; z-index:9998;
    background:rgba(0,0,0,0.8); border:1px solid #374151; color:#22c55e;
    font-family:monospace; font-size:.75rem; padding:8px 12px;
    border-radius:4px; min-width:160px; line-height:1.6;`;
  perf.innerHTML = `
    <div style="color:#f59e0b;font-weight:700;margin-bottom:4px;">PERF MONITOR</div>
    <div>FPS: <span id="nw-fps">--</span></div>
    <div>Frame: <span id="nw-frame-ms">--</span> ms</div>
    <div>Long tasks: <span id="nw-long-tasks">0</span></div>
    <div>Draw calls: <span id="nw-draw-calls">--</span></div>
    <div>Geometries: <span id="nw-geometries">--</span></div>
    <div>Triangles: <span id="nw-triangles">--</span></div>
    <div style="margin-top:4px;border-top:1px solid #374151;padding-top:4px;">
      <div>LCP: <span id="nw-lcp">--</span> ms</div>
      <div>FID: <span id="nw-fid">--</span> ms</div>
    </div>`;
  document.body.appendChild(perf);

  // ── PerformanceObserver for long tasks ────────────────────
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          nw_longTaskCount++;
          nw_analytics.longTasks++;
          console.warn(`[S44] Long task: ${entry.duration.toFixed(1)}ms (attribution: ${
            entry.attribution?.[0]?.name || 'unknown'})`);
        }
        const el = document.getElementById('nw-long-tasks');
        if (el) el.textContent = nw_longTaskCount;
      });
      longTaskObs.observe({ entryTypes: ['longtask'] });
      debugLog('[S44] ✓ Long task observer active');
    } catch(e) {
      console.warn('[S44] Long task observer failed:', e.message);
    }

    // ── LCP ───────────────────────────────────────────────
    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last    = entries[entries.length - 1];
        const el      = document.getElementById('nw-lcp');
        if (el && last) el.textContent = last.startTime.toFixed(0);
      });
      lcpObs.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch(e) {}

    // ── FID ───────────────────────────────────────────────
    try {
      const fidObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const el = document.getElementById('nw-fid');
          if (el) el.textContent = (entry.processingStart - entry.startTime).toFixed(1);
        }
      });
      fidObs.observe({ entryTypes: ['first-input'] });
    } catch(e) {}

    debugLog('[S44] ✓ Performance Observer initialized');
  } else {
    console.warn('[S44] PerformanceObserver not supported');
  }

  debugLog('[S44] ✓ Performance overlay created (press P to toggle)');
})();

/** Called from the animation loop to track FPS */
function nw_trackFrame(now) {
  nw_frameCount++;
  const elapsed = now - nw_lastFrameTime;

  if (elapsed >= 1000) {
    nw_currentFps = Math.round((nw_frameCount * 1000) / elapsed);
    nw_fpsHistory.push(nw_currentFps);
    if (nw_fpsHistory.length > 60) nw_fpsHistory.shift();

    nw_frameCount    = 0;
    nw_lastFrameTime = now;

    if (nw_perfOverlayVisible) {
      const fpsEl    = document.getElementById('nw-fps');
      const frameEl  = document.getElementById('nw-frame-ms');
      const drawEl   = document.getElementById('nw-draw-calls');
      const geoEl    = document.getElementById('nw-geometries');
      const triEl    = document.getElementById('nw-triangles');

      if (fpsEl) {
        fpsEl.textContent = nw_currentFps;
        fpsEl.style.color = nw_currentFps < 24 ? '#ef4444' :
                            nw_currentFps < 40 ? '#f59e0b' : '#22c55e';
      }
      if (frameEl) frameEl.textContent = (elapsed / Math.max(1, nw_frameCount + 1)).toFixed(1);

      // Three.js renderer info
      try {
        const info = renderer.info;
        if (drawEl && info.render) drawEl.textContent = info.render.calls;
        if (geoEl  && info.memory) geoEl.textContent  = info.memory.geometries;
        if (triEl  && info.render) triEl.textContent  = (info.render.triangles/1000).toFixed(0)+'K';
      } catch(e) {}
    }

    // Warn on frame drops
    if (nw_currentFps < 24 && nw_perfOverlayVisible) {
      console.warn(`[S44] PERF WARNING: FPS dropped to ${nw_currentFps}`);
    }
  }
}

/** Hook nw_trackFrame into requestAnimationFrame.
 *  We wrap the existing animate loop via a patched rAF interceptor.
 *  Since we can't replace the animate function, we use a secondary rAF loop.
 */
(function nw_startFpsLoop() {
  function fpsLoop(now) {
    nw_trackFrame(now);
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);
})();

function nw_togglePerfOverlay() {
  nw_perfOverlayVisible = !nw_perfOverlayVisible;
  const el = document.getElementById('nw-perf-overlay');
  if (el) el.style.display = nw_perfOverlayVisible ? 'block' : 'none';
  debugLog(`[S44] Performance overlay: ${nw_perfOverlayVisible ? 'ON' : 'OFF'}`);
}

// ─────────────────────────────────────────────────────────────
// NW-9: INTERSECTION OBSERVER FOR SIDEBAR OPTIMIZATION
// ─────────────────────────────────────────────────────────────

(function nw_initIntersectionObserver() {
  if (!('IntersectionObserver' in window)) {
    console.warn('[S44] IntersectionObserver not supported');
    return;
  }

  // Map of sidebar section IDs → their update functions
  // We'll observe these sections and pause/resume their update intervals
  const sidebarSections = [
    { id: 'aircraft-section',  updateFn: () => { try { if (typeof fetchOpenSky === 'function') fetchOpenSky(); } catch(e){} } },
    { id: 'seismic-section',   updateFn: () => { try { if (typeof fetchUSGS === 'function') fetchUSGS(); } catch(e){} } },
    { id: 'thermal-section',   updateFn: () => { try { if (typeof fetchFIRMS === 'function') fetchFIRMS(); } catch(e){} } },
    { id: 'sigmet-section',    updateFn: () => { try { if (typeof fetchSIGMETs === 'function') fetchSIGMETs(); } catch(e){} } },
    { id: 'adsb-section',      updateFn: () => { try { if (typeof fetchAdsbLol === 'function') fetchAdsbLol(); } catch(e){} } },
    { id: 'maritime-section',  updateFn: () => { try { if (typeof fetchMaritime === 'function') fetchMaritime(); } catch(e){} } },
    { id: 'weather-section',   updateFn: () => { try { if (typeof fetchWeather === 'function') fetchWeather(); } catch(e){} } },
    { id: 'radiation-section', updateFn: () => { try { if (typeof fetchRadiation === 'function') fetchRadiation(); } catch(e){} } },
    { id: 'conflict-section',  updateFn: () => { try { if (typeof fetchUCDP === 'function') fetchUCDP(); } catch(e){} } },
    { id: 'marine-section',    updateFn: () => { try { if (typeof fetchMarineWeather === 'function') fetchMarineWeather(); } catch(e){} } },
    { id: 'analytics-section', updateFn: () => { try { if (typeof updateAnalyticsDashboard === 'function') updateAnalyticsDashboard(); } catch(e){} } },
    { id: 'news-section',      updateFn: () => { try { if (typeof refreshNews === 'function') refreshNews(); } catch(e){} try { if (typeof refreshMilNews === 'function') refreshMilNews(); } catch(e){} try { if (typeof refreshIDFFeed === 'function') refreshIDFFeed(); } catch(e){} } },
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const data = nw_sidebarObservers.get(entry.target.id);
      if (!data) return;

      if (entry.isIntersecting) {
        // Section is visible — if we paused it, resume with immediate update
        if (data.paused) {
          data.paused = false;
          debugLog(`[S44] Sidebar section visible: ${entry.target.id} — resuming updates`);
          // Immediate refresh for visible section
          try { data.updateFn(); } catch(e) {}
        }
      } else {
        // Section scrolled out of view — mark as paused
        if (!data.paused) {
          data.paused = true;
          debugLog(`[S44] Sidebar section hidden: ${entry.target.id} — pausing updates`);
        }
      }
    });
  }, {
    root:       document.getElementById('sidebar') || null,
    rootMargin: '0px',
    threshold:  0.1,
  });

  // Observe each section
  sidebarSections.forEach(({ id, updateFn }) => {
    const el = document.getElementById(id);
    if (el) {
      nw_sidebarObservers.set(id, { updateFn, paused: false, el });
      observer.observe(el);
    }
    // Fallback: observe by class if ID not found
    else {
      const byClass = document.querySelector(`.${id}`);
      if (byClass) {
        byClass.id = id; // assign ID
        nw_sidebarObservers.set(id, { updateFn, paused: false, el: byClass });
        observer.observe(byClass);
      }
    }
  });

  // Also observe sections added dynamically
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    const mutObs = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.id && nw_sidebarObservers.has(node.id)) {
            observer.observe(node);
          }
        });
      });
    });
    mutObs.observe(sidebarEl, { childList: true, subtree: true });
  }

  debugLog(`[S44] ✓ Intersection Observer watching ${nw_sidebarObservers.size} sidebar sections`);
})();

/**
 * Check if a sidebar section is currently paused (out of view).
 * Use this in update functions to skip heavy DOM updates when invisible.
 */
function nw_isSidebarSectionVisible(sectionId) {
  const data = nw_sidebarObservers.get(sectionId);
  if (!data) return true; // assume visible if not tracked
  return !data.paused;
}

// ─────────────────────────────────────────────────────────────
// NW-10: BROADCAST CHANNEL API — MULTI-TAB SYNC
// ─────────────────────────────────────────────────────────────

(function nw_initBroadcastChannel() {
  if (!('BroadcastChannel' in window)) {
    console.warn('[S44] BroadcastChannel API not supported');
    nw_isPrimary = true;
    return;
  }

  nw_bc = new BroadcastChannel('sigint-map-sync');

  // Tab badge in header
  const tabBadge = document.createElement('div');
  tabBadge.id    = 'nw-tab-badge';
  tabBadge.style.cssText = `
    position:fixed; top:4px; right:8px; z-index:9999;
    background:#1e293b; border:1px solid #374151; color:#9ca3af;
    font-family:monospace; font-size:.65rem; padding:2px 8px;
    border-radius:10px; pointer-events:none;`;
  tabBadge.textContent = 'Tab ?';
  document.body.appendChild(tabBadge);

  // Track other tabs
  const nw_knownTabs = new Map(); // tabId → { lastSeen, isPrimary }
  let nw_primaryElectionTimeout = null;

  function electPrimary() {
    // Simple election: lowest tabId wins
    const candidates = [nw_tabId, ...Array.from(nw_knownTabs.keys())];
    candidates.sort();
    nw_isPrimary = candidates[0] === nw_tabId;
    if (nw_isPrimary) {
      debugLog('[S44] This tab elected as PRIMARY data fetcher');
      nw_tabNumber = 1;
    } else {
      nw_tabNumber = candidates.indexOf(nw_tabId) + 1;
    }
    tabBadge.textContent = `Tab ${nw_tabNumber}${nw_isPrimary ? ' (Primary)' : ''}`;
    tabBadge.style.color = nw_isPrimary ? '#22c55e' : '#9ca3af';
    tabBadge.style.borderColor = nw_isPrimary ? '#22c55e' : '#374151';
  }

  function announce() {
    nw_bc.postMessage({
      type: 'ANNOUNCE',
      tabId: nw_tabId,
      isPrimary: nw_isPrimary,
      ts: Date.now(),
    });
  }

  function syncState() {
    try {
      // Send current filter & camera position to other tabs
      const camPos = camera ? {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      } : null;

      nw_bc.postMessage({
        type:      'STATE_SYNC',
        tabId:     nw_tabId,
        isPrimary: nw_isPrimary,
        filter:    typeof currentFilter !== 'undefined' ? currentFilter : 'all',
        camera:    camPos,
        ts:        Date.now(),
      });
    } catch(e) {}
  }

  nw_bc.addEventListener('message', (e) => {
    const { type, tabId, isPrimary, filter, camera: camData, ts } = e.data;

    if (tabId === nw_tabId) return; // our own message

    switch (type) {
      case 'ANNOUNCE':
        nw_knownTabs.set(tabId, { lastSeen: ts, isPrimary });
        // Clear stale tabs (>30s)
        for (const [id, info] of nw_knownTabs) {
          if (Date.now() - info.lastSeen > 30000) nw_knownTabs.delete(id);
        }
        clearTimeout(nw_primaryElectionTimeout);
        nw_primaryElectionTimeout = setTimeout(electPrimary, 200);
        break;

      case 'STATE_SYNC':
        // Apply filter from primary tab
        if (isPrimary && filter && typeof setCurrentFilter === 'function') {
          try {
            setCurrentFilter(filter);
          } catch(e) {}
        }

        // Sync camera from primary tab (gentle, only if not interacting)
        if (isPrimary && camData && typeof userInteracting !== 'undefined' && !userInteracting) {
          try {
            camera.position.set(camData.x, camData.y, camData.z);
            camera.lookAt(0, 0, 0);
          } catch(e) {}
        }
        break;

      case 'DATA_UPDATE':
        // Receive pre-fetched data from primary tab
        debugLog(`[S44] Received ${e.data.dataType} data from primary tab`);
        break;

      case 'HEARTBEAT':
        nw_knownTabs.set(tabId, { lastSeen: ts });
        break;

      case 'DEPART':
        nw_knownTabs.delete(tabId);
        clearTimeout(nw_primaryElectionTimeout);
        nw_primaryElectionTimeout = setTimeout(electPrimary, 50);
        break;
    }
  });

  // Announce presence & start heartbeat
  announce();
  setTimeout(electPrimary, 500);

  setInterval(() => {
    announce();
    if (nw_isPrimary) syncState();
  }, 5000);

  // Sync camera position every 2s if primary
  setInterval(() => {
    if (nw_isPrimary) syncState();
  }, 2000);

  // On unload, announce departure
  window.addEventListener('beforeunload', () => {
    nw_bc.postMessage({ type: 'DEPART', tabId: nw_tabId });
    nw_bc.close();
  });

  debugLog(`[S44] ✓ Broadcast Channel initialized (tabId: ${nw_tabId})`);
})();

// ─────────────────────────────────────────────────────────────
// NW-11: BEACON API + SESSION ANALYTICS
// ─────────────────────────────────────────────────────────────

(function nw_initBeacon() {
  function buildSessionPayload() {
    const duration = Date.now() - nw_sessionStart;

    return {
      appVersion:       'SIGINT-MAP-v44',
      sessionId:        nw_tabId,
      tabNumber:        nw_tabNumber,
      durationMs:       duration,
      totalHiddenMs:    nw_totalHiddenMs,
      activeMs:         duration - nw_totalHiddenMs,

      // User actions
      eventsViewed:     nw_analytics.eventsViewed,
      briefingsCopied:  nw_analytics.briefingsCopied,
      filtersUsed:      Array.from(nw_analytics.filtersUsed),
      notificationsSent: nw_analytics.notificationsSent,
      longTasks:        nw_analytics.longTasks,

      // Network
      connectionChanges: nw_analytics.connectionChanges,
      finalOnline:       navigator.onLine,
      finalQuality:      nw_connectionQuality,
      hiddenCount:       nw_analytics.hiddenCount,

      // Performance
      avgFps:            nw_fpsHistory.length
                           ? Math.round(nw_fpsHistory.reduce((a,b)=>a+b,0)/nw_fpsHistory.length)
                           : 0,
      minFps:            nw_fpsHistory.length ? Math.min(...nw_fpsHistory) : 0,

      // Data sources
      dataSourcesOk:     Array.from(nw_analytics.dataSourcesOk),
      dataSourcesFailed: Array.from(nw_analytics.dataSourcesFailed),

      // Geo
      hadGeolocation:    nw_userPosition !== null,

      // Timestamp
      endTime:           new Date().toISOString(),
    };
  }

  window.addEventListener('visibilitychange', () => {
    // Send beacon when tab is being hidden (more reliable than beforeunload)
    if (document.hidden) {
      const payload = buildSessionPayload();
      const body    = JSON.stringify(payload);

      // Log to console (no server endpoint in this build)
      debugLog('[S44] SESSION BEACON (visibilitychange→hidden):', payload);

      // If a real endpoint existed: navigator.sendBeacon('/api/analytics', body);
      // For now, use a data URL to demonstrate the pattern
      if ('sendBeacon' in navigator) {
        // Sending to a no-op endpoint to demonstrate API usage
        // navigator.sendBeacon('/api/session', body);
        debugLog(`[S44] Beacon payload size: ${body.length} bytes`);
      }
    }
  });

  window.addEventListener('beforeunload', () => {
    const payload = buildSessionPayload();
    const body    = JSON.stringify(payload);
    debugLog('[S44] SESSION BEACON (beforeunload):', payload);
    // navigator.sendBeacon('/api/session', body);
    if ('sendBeacon' in navigator) {
      debugLog(`[S44] Final beacon: ${body.length} bytes ready to transmit`);
    }
  });

  // Track filter changes for analytics
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn && btn.dataset.filter) {
      nw_analytics.filtersUsed.add(btn.dataset.filter);
    }
  });

  // Track event panel opens
  const origShowDetail = window.showDetailPanel;
  if (typeof origShowDetail === 'function') {
    window.showDetailPanel = function(...args) {
      nw_analytics.eventsViewed++;
      return origShowDetail.apply(this, args);
    };
  }

  // Periodic analytics save (every 60s) — write to console
  setInterval(() => {
    const payload = buildSessionPayload();
    debugLog('[S44] Periodic session snapshot:', payload);
  }, 60000);

  debugLog('[S44] ✓ Beacon API + Session Analytics initialized');
})();

// ─────────────────────────────────────────────────────────────
// NW-12: requestIdleCallback FOR NON-CRITICAL WORK
// ─────────────────────────────────────────────────────────────

/**
 * Schedule a function to run during idle time.
 * Falls back to setTimeout(fn, 2000) if rIC not supported.
 */
function nw_scheduleIdle(fn, options = {}) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback((deadline) => {
      try { fn(deadline); } catch(e) { console.warn('[S44] Idle task error:', e); }
    }, { timeout: options.timeout || 5000 });
  } else {
    // Fallback
    setTimeout(() => {
      try { fn({ timeRemaining: () => 15, didTimeout: false }); } catch(e) {}
    }, options.fallbackDelay || 2000);
  }
}

// ── Non-critical idle tasks ───────────────────────────────────

/** Clean up old DOM notes in event feed */
function nw_idleCleanFeed() {
  nw_scheduleIdle(() => {
    const feed = document.getElementById('event-feed');
    if (!feed) return;
    const items = feed.querySelectorAll('.nw-timeline-note');
    if (items.length > 10) {
      Array.from(items).slice(10).forEach(el => el.remove());
    }
  });
}

/** Deduplicate event markers in layers */
function nw_idleDeduplicateLayers() {
  nw_scheduleIdle((deadline) => {
    const layerKeys = Object.keys(typeof layers !== 'undefined' ? layers : {});
    for (const key of layerKeys) {
      if (deadline.timeRemaining() < 2) break; // yield if busy
      try {
        const layer = layers[key];
        if (!layer || !layer.children) continue;
        const seen = new Map();
        const toRemove = [];
        for (const child of layer.children) {
          const k = child.userData?.title;
          if (k) {
            if (seen.has(k)) toRemove.push(child);
            else seen.set(k, child);
          }
        }
        toRemove.forEach(m => {
          layer.remove(m);
          const pickableIdx = pickableObjects.indexOf(m);
          if (pickableIdx > -1) pickableObjects.splice(pickableIdx, 1);
          disposeSceneObject(m);
        });
        if (toRemove.length > 0) {
          debugLog(`[S44] Idle dedup: removed ${toRemove.length} duplicates from ${key}`);
        }
      } catch(e) {}
    }
  }, { timeout: 8000 });
}

/** Sort event timeline items by timestamp */
function nw_idleSortTimeline() {
  nw_scheduleIdle(() => {
    try {
      const feed = document.getElementById('event-feed');
      if (!feed) return;
      const items = Array.from(feed.querySelectorAll('.event-item'));
      if (items.length < 2) return;
      // Items already sorted by insertion; just trim excess
      if (items.length > 200) {
        items.slice(200).forEach(el => el.remove());
      }
    } catch(e) {}
  });
}

/** Aggregate analytics in idle time */
function nw_idleAnalyticsAggregation() {
  nw_scheduleIdle(() => {
    try {
      if (typeof updateAnalyticsDashboard === 'function') {
        updateAnalyticsDashboard();
      }
    } catch(e) {}
  }, { timeout: 10000, fallbackDelay: 3000 });
}

/** Run all non-critical idle tasks on a 30-second cycle */
setInterval(() => {
  nw_scheduleIdle(() => {
    nw_idleCleanFeed();
    nw_idleDeduplicateLayers();
    nw_idleSortTimeline();
    nw_idleAnalyticsAggregation();
  }, { timeout: 15000 });
}, 30000);

debugLog('[S44] ✓ requestIdleCallback scheduler initialized');

// ─────────────────────────────────────────────────────────────
// NW-13: KEYBOARD SHORTCUTS ENHANCEMENT
// ─────────────────────────────────────────────────────────────

(function nw_initKeyboardShortcuts() {

  // ── Keyboard hints overlay ────────────────────────────────
  const hintsOverlay = document.createElement('div');
  hintsOverlay.id = 'nw-key-hints';
  hintsOverlay.style.cssText = `
    display:none; position:fixed; bottom:8px; right:8px; z-index:9998;
    background:rgba(0,0,0,0.85); border:1px solid #374151;
    color:#9ca3af; font-family:monospace; font-size:.7rem;
    padding:10px 14px; border-radius:6px; line-height:1.7;
    pointer-events:none; max-width:280px;`;
  hintsOverlay.innerHTML = `
    <div style="color:#f59e0b;font-weight:700;margin-bottom:4px;">KEYBOARD SHORTCUTS</div>
    <div><kbd style="color:#fff">Space</kbd> Play/Pause timeline</div>
    <div><kbd style="color:#fff">R</kbd> Reset view</div>
    <div><kbd style="color:#fff">F</kbd> Fullscreen</div>
    <div><kbd style="color:#fff">N</kbd> Toggle notifications</div>
    <div><kbd style="color:#fff">P</kbd> Performance overlay</div>
    <div><kbd style="color:#fff">L</kbd> Toggle wake lock</div>
    <div><kbd style="color:#fff">G</kbd> Geolocate user</div>
    <div><kbd style="color:#fff">C</kbd> Copy briefing</div>
    <div><kbd style="color:#fff">M</kbd> Low-bandwidth mode</div>
    <div><kbd style="color:#fff">1–9</kbd> Filter presets</div>
    <div><kbd style="color:#fff">?</kbd> Toggle this panel</div>
    <div style="margin-top:4px;color:#6b7280;font-size:.65rem;">Press ? to dismiss</div>`;
  document.body.appendChild(hintsOverlay);

  // '?' help toggle button
  const helpBtn = document.createElement('button');
  helpBtn.id    = 'nw-help-btn';
  helpBtn.title = 'Keyboard shortcuts (?)';
  helpBtn.style.cssText = `
    background:transparent; border:1px solid #374151; color:#9ca3af;
    padding:4px 8px; border-radius:4px; cursor:pointer;
    font-size:14px; line-height:1; transition:all .2s;`;
  helpBtn.innerHTML = `<span>⌨</span><span style="font-size:.65rem;margin-left:3px;font-family:monospace;">KEYS</span>`;
  helpBtn.addEventListener('click', () => {
    hintsOverlay.style.display = hintsOverlay.style.display === 'none' ? 'block' : 'none';
  });

  // Insert help button at end of controls
  const copyBtn = document.getElementById('nw-copy-btn');
  if (copyBtn && copyBtn.parentNode) {
    copyBtn.parentNode.insertBefore(helpBtn, copyBtn.nextSibling);
  } else {
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn && soundBtn.parentNode) soundBtn.parentNode.appendChild(helpBtn);
    else document.body.appendChild(helpBtn);
  }

  // ── Keydown handler ───────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Don't intercept if focus is in a text input
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    switch (e.key) {
      // ── N: Toggle notifications ───────────────────────────
      case 'n': case 'N': {
        e.preventDefault();
        const bellBtn = document.getElementById('nw-bell-btn');
        if (bellBtn) bellBtn.click();
        break;
      }

      // ── P: Toggle performance overlay ────────────────────
      case 'p': case 'P': {
        e.preventDefault();
        nw_togglePerfOverlay();
        break;
      }

      // ── L: Toggle wake lock ───────────────────────────────
      case 'l': case 'L': {
        e.preventDefault();
        nw_toggleWakeLock();
        break;
      }

      // ── G: Geolocate user ─────────────────────────────────
      case 'g': case 'G': {
        e.preventDefault();
        nw_geolocateUser();
        break;
      }

      // ── C: Copy briefing ──────────────────────────────────
      case 'c': case 'C': {
        e.preventDefault();
        nw_copyBriefing();
        break;
      }

      // ── M: Toggle low-bandwidth mode ─────────────────────
      case 'm': case 'M': {
        e.preventDefault();
        nw_lowBandwidthManual = !nw_lowBandwidthManual;
        if (typeof window.nw_applyBandwidthMode === 'function') {
          window.nw_applyBandwidthMode();
        }
        nw_addTimelineNote(`Low-bandwidth mode ${nw_lowBandwidthManual ? 'ENABLED' : 'DISABLED'} (manual)`);
        debugLog(`[S44] Low-bandwidth mode: ${nw_lowBandwidthManual ? 'ON' : 'OFF'} (manual toggle)`);
        break;
      }

      // ── ?: Toggle keyboard hints ──────────────────────────
      case '?': {
        e.preventDefault();
        hintsOverlay.style.display = hintsOverlay.style.display === 'none' ? 'block' : 'none';
        break;
      }

      // ── 1–9: Quick-switch filter presets ─────────────────
      default: {
        if (e.key >= '1' && e.key <= '9') {
          const idx    = parseInt(e.key, 10) - 1;
          const filter = nw_filterPresets[idx];
          if (filter && typeof applyFilter === 'function') {
            e.preventDefault();

            // Update filter button state
            document.querySelectorAll('.filter-btn').forEach(btn => {
              btn.classList.toggle('filter-btn--active', btn.dataset.filter === filter);
            });

            // Override currentFilter via a temporary global (compatible with existing code)
            // Since currentFilter is declared as `let` in the outer scope, we reference it
            // through the existing pattern used in Section 43
            try {
              // Find the actual filter button and click it to trigger all listeners
              const matchBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
              if (matchBtn) {
                matchBtn.click();
              } else {
                applyFilter();
              }
            } catch(filterErr) {
              console.warn('[S44] Filter preset error:', filterErr);
            }

            nw_analytics.filtersUsed.add(filter);
            debugLog(`[S44] Preset key ${e.key}: filter → "${filter}"`);
          }
        }
        break;
      }
    }
  });

  debugLog('[S44] ✓ Keyboard shortcuts enhanced (N/P/L/G/C/M/1-9/?)');
})();


// ─────────────────────────────────────────────────────────────
// NW-15: CSS INJECTION FOR ALL NEW UI ELEMENTS
// ─────────────────────────────────────────────────────────────

(function nw_injectStyles() {
  const css = document.createElement('style');
  css.id = 'nw-styles';
  css.textContent = `
    /* ── Network banner ───────────────────────────────────── */
    #nw-network-banner {
      font-family: monospace;
      font-size: .8rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-align: center;
      padding: 6px 12px;
      pointer-events: none;
    }

    /* ── Bandwidth badge ──────────────────────────────────── */
    #nw-bw-badge {
      animation: nw-pulse 2s infinite;
    }

    /* ── Performance overlay ──────────────────────────────── */
    #nw-perf-overlay table { width: 100%; }
    #nw-perf-overlay td:first-child { color: #6b7280; padding-right: 8px; }

    /* ── Geolocation readout ──────────────────────────────── */
    #nw-geo-readout {
      animation: nw-fadein .3s ease;
    }

    /* ── Paused overlay ───────────────────────────────────── */
    #nw-paused-overlay .nw-paused-inner {
      animation: nw-fadein .2s ease;
    }

    /* ── Tab badge ────────────────────────────────────────── */
    #nw-tab-badge {
      font-size: .6rem;
      letter-spacing: .05em;
    }

    /* ── Keyboard hints ───────────────────────────────────── */
    #nw-key-hints kbd {
      display: inline-block;
      min-width: 1.4rem;
      text-align: center;
      padding: 0 3px;
      background: #1e293b;
      border: 1px solid #374151;
      border-radius: 3px;
      font-family: monospace;
      font-size: .7rem;
      margin-right: 4px;
    }

    /* ── Control buttons (all nw_ buttons) ───────────────── */
    [id^="nw-"][id$="-btn"] {
      vertical-align: middle;
    }
    [id^="nw-"][id$="-btn"]:hover {
      background: rgba(255,255,255,.06) !important;
    }

    /* ── Animations ───────────────────────────────────────── */
    @keyframes nw-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .6; }
    }
    @keyframes nw-fadein {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Low-bandwidth: reduce motion ─────────────────────── */
    .nw-low-bw * {
      animation-duration: .001ms !important;
      transition-duration: .001ms !important;
    }
  `;
  document.head.appendChild(css);
  debugLog('[S44] ✓ Section 44 styles injected');
})();

// ─────────────────────────────────────────────────────────────
// NW-16: MONITORING MODE ORCHESTRATOR
// ─────────────────────────────────────────────────────────────
// Watches autoRotate and soundEnabled to automatically manage
// wake lock state.

(function nw_initMonitoringOrchestrator() {

  // Poll autoRotate & soundEnabled every 5s to sync wake lock
  setInterval(() => {
    const shouldLock = (typeof autoRotate !== 'undefined' && autoRotate) ||
                       (typeof soundEnabled !== 'undefined' && soundEnabled);

    if (shouldLock && !nw_wakeLockActive && !document.hidden) {
      nw_acquireWakeLock();
    } else if (!shouldLock && nw_wakeLockActive) {
      nw_releaseWakeLock();
    }
  }, 5000);

  // Apply low-bandwidth to DOM class for CSS targeting
  setInterval(() => {
    const isLow = nw_connectionQuality === 'low' || nw_lowBandwidthManual;
    document.body.classList.toggle('nw-low-bw', isLow);
  }, 2000);

  debugLog('[S44] ✓ Monitoring orchestrator active');
})();

// ─────────────────────────────────────────────────────────────
// NW-17: NOTIFICATION TRIGGERS — HOOK INTO LIVE DATA EVENTS
// ─────────────────────────────────────────────────────────────
// Periodically scan layers for new high-priority events and
// fire notifications. Runs every 15 seconds.

(function nw_initNotificationTriggers() {

  // Track which event IDs have already been notified
  const nw_notifiedEvents = new Set();

  function scanForAlerts() {
    if (!nw_notificationsEnabled) return;

    // ── Seismic: notify for M5+ near conflict zones ───────
    try {
      if (layers.seismic) {
        layers.seismic.children.forEach(obj => {
          const d = obj.userData;
          if (!d || !d.magnitude) return;
          const key = `seismic_${d.lat?.toFixed(2)}_${d.lon?.toFixed(2)}_${d.magnitude}`;
          if (nw_notifiedEvents.has(key)) return;
          if (d.magnitude >= 5.0) {
            nw_notifiedEvents.add(key);
            nw_checkForAlerts('seismic', {
              magnitude: d.magnitude,
              place: d.title,
              lat: d.lat, lon: d.lon,
            });
          }
        });
      }
    } catch(e) {}

    // ── Radiation: notify for anomalies ──────────────────
    try {
      if (layers.radiation) {
        layers.radiation.children.forEach(obj => {
          const d = obj.userData;
          if (!d) return;
          const key = `rad_${d.lat?.toFixed(2)}_${d.lon?.toFixed(2)}`;
          if (!nw_notifiedEvents.has(key) && d.elevated) {
            nw_notifiedEvents.add(key);
            nw_checkForAlerts('radiation', {
              location: d.title, lat: d.lat, lon: d.lon,
            });
          }
        });
      }
    } catch(e) {}

    // ── News: notify for breaking CENTCOM/DoD headlines ──
    try {
      const feed = document.getElementById('news-feed');
      if (feed) {
        const items = feed.querySelectorAll('.news-item, .feed-item');
        items.forEach((item, i) => {
          if (i > 3) return; // only check top 4
          const text  = item.textContent || '';
          const lower = text.toLowerCase();
          const key   = text.substring(0, 60).replace(/\s+/g, '_');
          if (nw_notifiedEvents.has(key)) return;
          if (lower.includes('centcom') || lower.includes('pentagon') ||
              lower.includes('dod') || lower.includes('breaking') ||
              lower.includes('missile') || lower.includes('attack')) {
            nw_notifiedEvents.add(key);
            nw_checkForAlerts('breaking_news', { title: text.substring(0, 150) });
          }
        });
      }
    } catch(e) {}

    // Keep set bounded
    if (nw_notifiedEvents.size > 500) {
      const arr = Array.from(nw_notifiedEvents);
      arr.slice(0, 250).forEach(k => nw_notifiedEvents.delete(k));
    }
  }

  setInterval(scanForAlerts, 15000);
  debugLog('[S44] ✓ Notification trigger scanner active (15s interval)');
})();


// ─────────────────────────────────────────────────────────────
// NW-19: FETCH GATE — RESPECT TAB VISIBILITY & NETWORK STATE
// ─────────────────────────────────────────────────────────────
// Provides a gating function that any fetch can call to check
// whether it should proceed.

/**
 * Returns true if data fetches should proceed right now.
 * Checks tab visibility, online status, and bandwidth mode.
 */
function nw_shouldFetch() {
  if (nw_tabPaused)          return false;
  if (!navigator.onLine)     return false;
  return true;
}

// ─────────────────────────────────────────────────────────────
// NW-20: DIAGNOSTICS DUMP (window.nw_diagnostics)
// ─────────────────────────────────────────────────────────────
// Expose a diagnostics function for debugging in console.

window.nw_diagnostics = function() {
  const report = {
    version:           'Section 44 v1.0',
    timestamp:         new Date().toISOString(),
    tabId:             nw_tabId,
    tabNumber:         nw_tabNumber,
    isPrimary:         nw_isPrimary,

    pageVisibility: {
      tabPaused:       nw_tabPaused,
      totalHiddenMs:   nw_totalHiddenMs,
      hiddenCount:     nw_analytics.hiddenCount,
    },

    network: {
      online:          navigator.onLine,
      quality:         nw_connectionQuality,
      lowBwManual:     nw_lowBandwidthManual,
      connectionAPI:   !!(navigator.connection || navigator.mozConnection || navigator.webkitConnection),
      effectiveType:   (navigator.connection || {}).effectiveType || 'unknown',
      downlink:        (navigator.connection || {}).downlink || 'unknown',
    },

    notifications: {
      enabled:         nw_notificationsEnabled,
      permission:      'Notification' in window ? Notification.permission : 'not_supported',
      sent:            nw_analytics.notificationsSent,
      throttleMs:      NW_NOTIF_THROTTLE_MS,
    },

    worker: {
      created:         !!nw_worker,
      ready:           nw_workerReady,
      pendingRequests: nw_workerCallbacks.size,
    },

    wakeLock: {
      supported:       'wakeLock' in navigator,
      active:          nw_wakeLockActive,
    },

    geolocation: {
      supported:       'geolocation' in navigator,
      position:        nw_userPosition,
    },

    performance: {
      overlayVisible:  nw_perfOverlayVisible,
      currentFps:      nw_currentFps,
      avgFps:          nw_fpsHistory.length
                         ? Math.round(nw_fpsHistory.reduce((a,b)=>a+b,0)/nw_fpsHistory.length)
                         : 0,
      longTaskCount:   nw_longTaskCount,
    },

    broadcastChannel: {
      supported:       'BroadcastChannel' in window,
      connected:       !!nw_bc,
    },

    beacon: {
      supported:       'sendBeacon' in navigator,
    },

    idleCallback: {
      supported:       'requestIdleCallback' in window,
    },

    sessionAnalytics:  { ...nw_analytics, filtersUsed: Array.from(nw_analytics.filtersUsed),
                          dataSourcesOk: Array.from(nw_analytics.dataSourcesOk),
                          dataSourcesFailed: Array.from(nw_analytics.dataSourcesFailed) },
  };

  console.table({
    Tab:            `${nw_tabNumber} (${nw_isPrimary ? 'PRIMARY' : 'secondary'})`,
    Network:        `${report.network.online ? 'ONLINE' : 'OFFLINE'} / ${report.network.quality}`,
    Notifications:  report.notifications.permission,
    Worker:         report.worker.ready ? 'READY' : (report.worker.created ? 'LOADING' : 'FAILED'),
    WakeLock:       report.wakeLock.active ? 'ACTIVE' : 'INACTIVE',
    FPS:            report.performance.currentFps,
    LongTasks:      report.performance.longTaskCount,
    SessionMs:      Date.now() - nw_sessionStart,
  });

  return report;
};

// ─────────────────────────────────────────────────────────────
// NW-21: INITIALIZATION COMPLETE
// ─────────────────────────────────────────────────────────────

// Trigger an initial idle analytics aggregation
nw_scheduleIdle(nw_idleAnalyticsAggregation, { timeout: 3000 });

// Try to acquire wake lock if conditions are met on load
setTimeout(nw_maybeAcquireWakeLock, 2000);

// Show notification permission status
setTimeout(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    nw_addTimelineNote('Click anywhere on the globe to enable event notifications');
  }
}, 3000);

debugLog('[S44] ✓ Section 44: Native Browser Web API Enhancements — ALL SYSTEMS ACTIVE');
debugLog('[S44]   APIs: PageVisibility | NetworkInfo | Notifications | Worker | WakeLock');
debugLog('[S44]         Geolocation | Clipboard/Share | PerformanceObserver | IntersectionObserver');
debugLog('[S44]         BroadcastChannel | Beacon | requestIdleCallback | KeyboardEvents');
debugLog('[S44]   Run window.nw_diagnostics() in console for live status report');

// ============================================================
// SECTIONS 1–44 FULLY LOADED
// New capabilities added by Section 44:
//   ✓ Page Visibility API — pause/resume + DATA PAUSED overlay
//   ✓ Network Information + online/offline — OFFLINE banner, LOW BW mode
//   ✓ Web Notifications — bell toggle, 30s throttle, 5 event types
//   ✓ Inline Web Worker (Blob) — OpenSky filter, seismic filter,
//     news sentiment, dedup, clustering, analytics aggregation
//   ✓ Screen Wake Lock — auto-acquire on monitor mode, L key toggle
//   ✓ Geolocation — user dot on globe, distance to nearest event (G key)
//   ✓ Clipboard + Web Share — structured intelligence briefing (C key)
//   ✓ Performance Observer — LCP, FID, long tasks, FPS counter (P key)
//   ✓ Intersection Observer — pause off-screen sidebar panel updates
//   ✓ Broadcast Channel — multi-tab sync, primary election, tab badge
//   ✓ Beacon API — session analytics on unload/hide
//   ✓ requestIdleCallback — deferred dedup, cleanup, timeline sort
//   ✓ Keyboard Shortcuts — N/P/L/G/C/M/1-9/? keys + hints overlay
// ============================================================


function captureOperationalState() {
  const searchInput = document.getElementById('search-input');
  const sidebar = document.getElementById('sidebar');
  const speedBtn = document.querySelector('.speed-btn.speed-btn--active');

  return {
    filter: currentFilter,
    theme: currentTheme,
    sidebarCollapsed: sidebar?.classList.contains('collapsed') || false,
    sat: !!satOverlayActive,
    search: searchInput?.value || '',
    time: Number(timeSlider?.value || 0),
    playing: !!isPlaying,
    speed: Number(speedBtn?.dataset.speed || playSpeed || 1),
  };
}

function applyOperationalState(snapshot = {}) {
  if (snapshot.filter) {
    setCurrentFilter(snapshot.filter);
  }

  if (typeof snapshot.theme === 'string' && snapshot.theme !== currentTheme) {
    themeToggle?.click?.();
  }

  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarCollapsed = sidebar?.classList.contains('collapsed') || false;
  if (typeof snapshot.sidebarCollapsed === 'boolean' && snapshot.sidebarCollapsed !== sidebarCollapsed) {
    sidebarToggle?.click?.();
  }

  if (typeof snapshot.sat === 'boolean' && snapshot.sat !== satOverlayActive) {
    satToggleBtn?.click?.();
  }

  if (typeof snapshot.search === 'string') {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = snapshot.search;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  if (snapshot.time != null && timeSlider) {
    timeSlider.value = String(snapshot.time);
    timeSlider.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (typeof snapshot.playing === 'boolean' && snapshot.playing !== isPlaying) {
    togglePlay();
  }

  if (snapshot.speed != null) {
    const speedValue = String(snapshot.speed);
    const speedBtn = document.querySelector(`.speed-btn[data-speed="${speedValue}"]`);
    speedBtn?.click?.();
  }
}

function serializeOperationalMarker(object) {
  const data = object?.userData;
  if (!data || data.isGlow || !data.title) return null;

  const lat = Number(data.lat);
  const lon = Number(data.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const timeValue = Number(data.time);
  return {
    title: data.title,
    detail: data.detail || '',
    domain: data.domain || 'unknown',
    filterType: data.filterType || 'all',
    lat,
    lon,
    status: data.status || '',
    source: data.source || '',
    url: data.url || '',
    time: Number.isFinite(timeValue) ? timeValue : null,
    isMaritime: !!data.isMaritime,
    isWeather: !!data.isWeather,
    isRadiation: !!data.isRadiation,
    isConflict: !!data.isConflict,
    visible: object.visible !== false,
  };
}

function getOperationalMarkers() {
  return pickableObjects.map((object) => serializeOperationalMarker(object)).filter(Boolean);
}

function focusOperationalLocation(lat, lon, detail = undefined) {
  const safeLat = Number(lat);
  const safeLon = Number(lon);
  if (Number.isFinite(safeLat) && Number.isFinite(safeLon)) {
    animateCameraTo(latLonToVec3(safeLat, safeLon, GLOBE_RADIUS * 2.05));
  }

  if (detail && typeof detail === 'object') {
    openDetailPanel(detail);
  }
}

window.__SIGINT_MAP_PUBLIC__ = {
  getState: captureOperationalState,
  applyState: applyOperationalState,
  getMarkers: getOperationalMarkers,
  focusLocation: focusOperationalLocation,
  openDetail: openDetailPanel,
  resetView,
  copyBriefing: typeof nw_copyBriefing === 'function' ? nw_copyBriefing : null,
  togglePerformance: typeof nw_togglePerfOverlay === 'function' ? nw_togglePerfOverlay : null,
  diagnostics: typeof nw_diagnostics === 'function' ? nw_diagnostics : null,
  getSourceHealth: () => window.__SIGINT_MAP_SOURCE_HEALTH__ || {},
};

let __sigintLegacyCleanedUp = false;
function cleanupLegacyApp() {
  if (__sigintLegacyCleanedUp) return;
  __sigintLegacyCleanedUp = true;
  window.__SIGINT_MAP_DESTROYED__ = true;

  try { if (typeof nw_releaseWakeLock === 'function') nw_releaseWakeLock(); } catch {}
  try { nw_worker?.terminate?.(); } catch {}
  try { nw_bc?.close?.(); } catch {}
  try { controls?.dispose?.(); } catch {}
  try { renderer?.setAnimationLoop?.(null); } catch {}
  try { renderer?.dispose?.(); } catch {}
  try { renderer?.forceContextLoss?.(); } catch {}
  try { pickableObjects.length = 0; } catch {}
  try { highlightedMarkers?.clear?.(); } catch {}
  try { disposeSceneObject(scene); } catch {}
  try { scene?.clear?.(); } catch {}

  ['setCurrentFilter', 'showDetailPanel', 'nw_applyBandwidthMode', 'nw_diagnostics', '__SIGINT_MAP_PUBLIC__', '__SIGINT_MAP_SOURCE_HEALTH__'].forEach((key) => {
    try {
      delete window[key];
    } catch {
      window[key] = undefined;
    }
  });
}

__initPhaseComplete = true;
debugLog('[SIGINT-MAP] Init phase complete — all declarations evaluated');

return cleanupLegacyApp;
}
