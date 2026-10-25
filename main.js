// ==========================================
// REAL-TIME MULTI-SATELLITE ORBIT TRACKER
// [1A] International Space Station (ISS)
// [1B] Tiangong Space Station (CSS) / Hubble (HST)
// [1C] Cartosat-3 / RISAT-2BR1 (ISRO India 🇮🇳)
// ==========================================

// --- UI Elements ---
const utcClock = document.querySelector('#utc_clock');
const interSatDistEl = document.querySelector('#inter_sat_distance');
const distSat2NameEl = document.querySelector('#dist_sat2_name');
const distSat3NameEl = document.querySelector('#dist_sat3_name');
const distSat3ValEl = document.querySelector('#dist_sat3_value');

// Satellite 1A (ISS) Elements
const sat1LatEl = document.querySelector('#sat1_lat');
const sat1LngEl = document.querySelector('#sat1_lng');
const sat1AltEl = document.querySelector('#sat1_alt');
const sat1VelEl = document.querySelector('#sat1_vel');
const sat1VisibilityEl = document.querySelector('#sat1_visibility');

// Satellite 1B (Tiangong/Hubble) Elements
const sat2Selector = document.querySelector('#sat2_selector');
const sat2NoradLbl = document.querySelector('#sat2_norad_lbl');
const sat2IncTag = document.querySelector('#sat2_inc_tag');
const sat2LatEl = document.querySelector('#sat2_lat');
const sat2LngEl = document.querySelector('#sat2_lng');
const sat2AltEl = document.querySelector('#sat2_alt');
const sat2VelEl = document.querySelector('#sat2_vel');

// Satellite 1C (ISRO India) Elements
const sat3Selector = document.querySelector('#sat3_selector');
const sat3NoradLbl = document.querySelector('#sat3_norad_lbl');
const sat3IncTag = document.querySelector('#sat3_inc_tag');
const sat3LatEl = document.querySelector('#sat3_lat');
const sat3LngEl = document.querySelector('#sat3_lng');
const sat3AltEl = document.querySelector('#sat3_alt');
const sat3VelEl = document.querySelector('#sat3_vel');

// Theme Toggle Elements
const btnThemeToggle = document.querySelector('#btn_theme_toggle');
const themeIcon = document.querySelector('#theme_icon');
const themeLabel = document.querySelector('#theme_label');

// Live Earth Camera Elements
const liveCamWidget = document.querySelector('#live_cam_widget');
const btnToggleCam = document.querySelector('#btn_toggle_cam');
const btnCamMinimize = document.querySelector('#btn_cam_minimize');
const btnCamClose = document.querySelector('#btn_cam_close');
const camStreamSelect = document.querySelector('#cam_stream_select');
const nasaCamIframe = document.querySelector('#nasa_cam_iframe');
const camOrbitStatus = document.querySelector('#cam_orbit_status');

// State
let sat1Data = { lat: 0, lng: 0, alt: 418.5, vel: 27580 };
let sat2Data = { lat: 0, lng: 0, alt: 393.6, vel: 27630 };
let sat3Data = { lat: 0, lng: 0, alt: 505.0, vel: 27240 };
let followMode = 'both'; // 'both' | 'sat1' | 'sat2' | 'sat3' | 'manual'
let initialFitDone = false;

// --- Leaflet Map Setup ---
const map = L.map('ISS_map', {
  center: [20, 77], // Initial view centered near Indian subcontinent / equator
  zoom: 2,
  minZoom: 1,
  maxZoom: 16,
  worldCopyJump: true
});

// 100% Free Public GIS Tile Layers (NO API KEY REQUIRED)
const TILE_PROVIDERS = {
  satellite: {
    name: '🛰️ Map: Satellite Imagery',
    base: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
      maxZoom: 17
    }),
    overlay: L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 17
    })
  },
  dark: {
    name: '🌌 Map: Dark Space',
    base: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
      maxZoom: 16
    }),
    overlay: null
  },
  topo: {
    name: '🗺️ Map: World Topo / Street',
    base: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong)',
      maxZoom: 17
    }),
    overlay: null
  }
};

let currentMapStyle = 'satellite';
const btnToggleTheme = document.querySelector('#btn_toggle_map_theme');

// Apply Initial Tile Layer (Satellite by default)
TILE_PROVIDERS.satellite.base.addTo(map);
TILE_PROVIDERS.satellite.overlay.addTo(map);
if (btnToggleTheme) {
  btnToggleTheme.textContent = TILE_PROVIDERS.satellite.name;
}

// Function to switch tile styles cleanly without API keys
function setMapStyle(styleKey) {
  Object.values(TILE_PROVIDERS).forEach(p => {
    if (map.hasLayer(p.base)) map.removeLayer(p.base);
    if (p.overlay && map.hasLayer(p.overlay)) map.removeLayer(p.overlay);
  });

  const p = TILE_PROVIDERS[styleKey];
  p.base.addTo(map);
  if (p.overlay) p.overlay.addTo(map);
  currentMapStyle = styleKey;
  if (btnToggleTheme) {
    btnToggleTheme.textContent = p.name;
  }
}

// Custom Marker Creators for 1A, 1B, and 1C
function createSatMarker(badgeText, pinClass, badgeClass, ringClass, iconSrc) {
  return L.divIcon({
    className: 'custom-sat-marker',
    html: `
      <div class="marker-pulse-ring ${ringClass}"></div>
      <div class="marker-pin ${pinClass}">
        <span class="marker-label-badge ${badgeClass}">${badgeText}</span>
        <img src="${iconSrc}" class="marker-icon-img" alt="Sat ${badgeText}"/>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });
}

const sat1Icon = createSatMarker('1A', 'pin-1a', 'badge-pin-1a', 'ring-1a', './icon/International_Space_Station.svg');
const sat2Icon = createSatMarker('1B', 'pin-1b', 'badge-pin-1b', 'ring-1b', './icon/tiangong.svg');
const sat3Icon = createSatMarker('1C', 'pin-1c', 'badge-pin-1c', 'ring-1c', './icon/isro_satellite.svg');

const markerSat1 = L.marker([0, 0], { icon: sat1Icon }).addTo(map);
const markerSat2 = L.marker([0, 0], { icon: sat2Icon }).addTo(map);
const markerSat3 = L.marker([0, 0], { icon: sat3Icon }).addTo(map);

markerSat1.bindPopup('<b>[1A] International Space Station (ISS)</b><br>NASA / ESA / JAXA / Roscosmos / CSA<br>NORAD ID: 25544');
markerSat2.bindPopup('<b>[1B] Tiangong Space Station (CSS)</b><br>CNSA Real-Time Telemetry<br>NORAD ID: 48274');
markerSat3.bindPopup('<b>[1C] Cartosat-3 (ISRO 🇮🇳)</b><br>High-Resolution Earth Observation Satellite<br>NORAD ID: 44804');

// Orbit Trail Polylines
const trailSat1 = L.polyline([], {
  color: '#00f0ff',
  weight: 2.5,
  opacity: 0.9,
  dashArray: '6, 6'
}).addTo(map);

const trailSat2 = L.polyline([], {
  color: '#f59e0b',
  weight: 2.5,
  opacity: 0.9,
  dashArray: '6, 6'
}).addTo(map);

const trailSat3 = L.polyline([], {
  color: '#10b981',
  weight: 2.5,
  opacity: 0.95,
  dashArray: '6, 6'
}).addTo(map);

const MAX_TRAIL_POINTS = 70;

// --- Official NORAD TLE Data for SGP4 Propagation ---
const SATELLITE_CONFIGS = {
  iss: {
    name: 'International Space Station (ISS)',
    badge: '1A',
    noradId: '25544',
    inc: '51.6°',
    subInfo: 'NASA • ESA • JAXA • Roscosmos • CSA | NORAD #25544',
    tleLine1: '1 25544U 98067A   26293.66080995  .00008635  00000+0  16489-3 0  9997',
    tleLine2: '2 25544  51.6326  39.1774 0006750 287.9320  72.0932 15.48959761591200'
  },
  tiangong: {
    name: 'Tiangong Space Station (CSS)',
    badge: '1B',
    noradId: '48274',
    inc: '41.5°',
    subInfo: 'CNSA | NORAD #48274',
    tleLine1: '1 48274U 21035A   26293.93857812  .00026468  00000+0  30903-3 0  9994',
    tleLine2: '2 48274  41.4687 278.1407 0002043 188.4553 171.6252 15.61007672312802'
  },
  hubble: {
    name: 'Hubble Space Telescope (HST)',
    badge: '1B',
    noradId: '20580',
    inc: '28.5°',
    subInfo: 'NASA / ESA | NORAD #20580',
    tleLine1: '1 20580U 90037B   26293.46250871  .00006661  00000+0  20183-3 0  9994',
    tleLine2: '2 20580  28.4737 303.5398 0002159 109.4637 250.6193 15.32017207807791'
  },
  cartosat3: {
    name: 'Cartosat-3 (ISRO 🇮🇳)',
    badge: '1C',
    noradId: '44804',
    inc: '97.4°',
    subInfo: 'ISRO (India) | NORAD #44804',
    tleLine1: '1 44804U 19081A   26296.92064929  .00002117  00000+0  10352-3 0  9999',
    tleLine2: '2 44804  97.4162 356.5986 0013020  65.6271 294.6321 15.19243730383013'
  },
  risat2br1: {
    name: 'RISAT-2BR1 (ISRO 🇮🇳)',
    badge: '1C',
    noradId: '44857',
    inc: '37.0°',
    subInfo: 'ISRO (India) | NORAD #44857',
    tleLine1: '1 44857U 19089F   26296.78926182  .00002861  00000+0  22553-3 0  9999',
    tleLine2: '2 44857  36.9593  69.0073 0011163 149.0473 211.0929 15.01038462376538'
  }
};

let currentSat2Key = 'tiangong';
let currentSat3Key = 'cartosat3';
let sat1Satrec = null;
let sat2Satrec = null;
let sat3Satrec = null;

function initSatModels() {
  if (typeof satellite !== 'undefined') {
    sat1Satrec = satellite.twoline2satrec(SATELLITE_CONFIGS.iss.tleLine1, SATELLITE_CONFIGS.iss.tleLine2);
    const cfg2 = SATELLITE_CONFIGS[currentSat2Key];
    sat2Satrec = satellite.twoline2satrec(cfg2.tleLine1, cfg2.tleLine2);
    const cfg3 = SATELLITE_CONFIGS[currentSat3Key];
    sat3Satrec = satellite.twoline2satrec(cfg3.tleLine1, cfg3.tleLine2);
  }
}

function computeCoordinates(satrec, date) {
  if (!satrec || typeof satellite === 'undefined') return null;
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position || !pv.velocity) return null;

  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  const lat = satellite.degreesLat(gd.latitude);
  const lng = satellite.degreesLong(gd.longitude);
  const alt = gd.height;
  const v = pv.velocity;
  const vel = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3600;

  return { lat, lng, alt, vel };
}

// Update [1A] ISS
function updateSatellite1() {
  const now = new Date();
  const coords = computeCoordinates(sat1Satrec, now);
  if (coords) {
    sat1Data.lat = coords.lat;
    sat1Data.lng = coords.lng;
    sat1Data.alt = coords.alt;
    sat1Data.vel = coords.vel;

    if (sat1LatEl) sat1LatEl.textContent = `${coords.lat.toFixed(4)}°`;
    if (sat1LngEl) sat1LngEl.textContent = `${coords.lng.toFixed(4)}°`;
    if (sat1AltEl) sat1AltEl.textContent = `${coords.alt.toFixed(1)} km`;
    if (sat1VelEl) sat1VelEl.textContent = `${Math.round(coords.vel).toLocaleString()} km/h`;

    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    const normHour = (utcHour + (coords.lng / 15) + 24) % 24;
    const isDaylight = (normHour >= 6 && normHour <= 18);
    if (sat1VisibilityEl) {
      sat1VisibilityEl.innerHTML = isDaylight ? '☀️ Daylight' : '🌙 Earth Shadow';
    }
    if (camOrbitStatus) {
      camOrbitStatus.textContent = isDaylight ? '☀️ Daylight Orbit (Clear Earth View)' : '🌙 Earth Shadow Orbit (Night Pass)';
    }

    const latlng = [coords.lat, coords.lng];
    markerSat1.setLatLng(latlng);
    appendTrail(trailSat1, latlng);

    updateDistanceAndCamera();
  }
}

// Update [1B] Tiangong / Hubble
function updateSatellite2() {
  const now = new Date();
  const coords = computeCoordinates(sat2Satrec, now);
  if (coords) {
    sat2Data.lat = coords.lat;
    sat2Data.lng = coords.lng;
    sat2Data.alt = coords.alt;
    sat2Data.vel = coords.vel;

    if (sat2LatEl) sat2LatEl.textContent = `${coords.lat.toFixed(4)}°`;
    if (sat2LngEl) sat2LngEl.textContent = `${coords.lng.toFixed(4)}°`;
    if (sat2AltEl) sat2AltEl.textContent = `${coords.alt.toFixed(1)} km`;
    if (sat2VelEl) sat2VelEl.textContent = `${Math.round(coords.vel).toLocaleString()} km/h`;

    const latlng = [coords.lat, coords.lng];
    markerSat2.setLatLng(latlng);
    appendTrail(trailSat2, latlng);

    updateDistanceAndCamera();
  }
}

// Update [1C] Cartosat-3 / RISAT-2BR1 (ISRO India)
function updateSatellite3() {
  const now = new Date();
  const coords = computeCoordinates(sat3Satrec, now);
  if (coords) {
    sat3Data.lat = coords.lat;
    sat3Data.lng = coords.lng;
    sat3Data.alt = coords.alt;
    sat3Data.vel = coords.vel;

    if (sat3LatEl) sat3LatEl.textContent = `${coords.lat.toFixed(4)}°`;
    if (sat3LngEl) sat3LngEl.textContent = `${coords.lng.toFixed(4)}°`;
    if (sat3AltEl) sat3AltEl.textContent = `${coords.alt.toFixed(1)} km`;
    if (sat3VelEl) sat3VelEl.textContent = `${Math.round(coords.vel).toLocaleString()} km/h`;

    const latlng = [coords.lat, coords.lng];
    markerSat3.setLatLng(latlng);
    appendTrail(trailSat3, latlng);

    updateDistanceAndCamera();
  }
}

function appendTrail(polyline, latlng) {
  const points = polyline.getLatLngs();
  if (points.length > 0) {
    const last = points[points.length - 1];
    if (Math.abs(last.lng - latlng[1]) > 180) {
      points.length = 0;
    }
  }
  points.push(latlng);
  if (points.length > MAX_TRAIL_POINTS) {
    points.shift();
  }
  polyline.setLatLngs(points);
}

// 3D Orbital Euclidean distance calculation between two satellites
function calculate3dDistance(s1, s2) {
  const R = 6371;
  const r1 = R + (s1.alt || 415);
  const r2 = R + (s2.alt || 395);

  const phi1 = (s1.lat * Math.PI) / 180;
  const lambda1 = (s1.lng * Math.PI) / 180;
  const phi2 = (s2.lat * Math.PI) / 180;
  const lambda2 = (s2.lng * Math.PI) / 180;

  const x1 = r1 * Math.cos(phi1) * Math.cos(lambda1);
  const y1 = r1 * Math.cos(phi1) * Math.sin(lambda1);
  const z1 = r1 * Math.sin(phi1);

  const x2 = r2 * Math.cos(phi2) * Math.cos(lambda2);
  const y2 = r2 * Math.cos(phi2) * Math.sin(lambda2);
  const z2 = r2 * Math.sin(phi2);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function updateDistanceAndCamera() {
  // Distance 1A ↔ 1B
  if (sat1Data.lat !== 0 && sat2Data.lat !== 0 && interSatDistEl) {
    const distKm12 = Math.round(calculate3dDistance(sat1Data, sat2Data));
    interSatDistEl.textContent = `${distKm12.toLocaleString()} km`;
  }

  // Distance 1A ↔ 1C
  if (sat1Data.lat !== 0 && sat3Data.lat !== 0 && distSat3ValEl) {
    const distKm13 = Math.round(calculate3dDistance(sat1Data, sat3Data));
    distSat3ValEl.textContent = `${distKm13.toLocaleString()} km`;
  }

  if (!initialFitDone && sat1Data.lat !== 0 && sat2Data.lat !== 0 && sat3Data.lat !== 0) {
    fitAllSatellites();
    initialFitDone = true;
  }

  if (followMode === 'sat1') {
    map.panTo([sat1Data.lat, sat1Data.lng]);
  } else if (followMode === 'sat2') {
    map.panTo([sat2Data.lat, sat2Data.lng]);
  } else if (followMode === 'sat3') {
    map.panTo([sat3Data.lat, sat3Data.lng]);
  }
}

function fitAllSatellites() {
  const validPoints = [];
  if (sat1Data.lat !== 0 || sat1Data.lng !== 0) validPoints.push([sat1Data.lat, sat1Data.lng]);
  if (sat2Data.lat !== 0 || sat2Data.lng !== 0) validPoints.push([sat2Data.lat, sat2Data.lng]);
  if (sat3Data.lat !== 0 || sat3Data.lng !== 0) validPoints.push([sat3Data.lat, sat3Data.lng]);
  
  if (validPoints.length === 0) return;
  const bounds = L.latLngBounds(validPoints);
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 4 });
}

function updateClock() {
  const now = new Date();
  if (utcClock) {
    utcClock.textContent = `UTC: ${now.toUTCString().slice(17, 25)}`;
  }
}

// Safe Event Listener Helper
function safeOn(selector, event, handler) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (el) el.addEventListener(event, handler);
}

// --- Event Handlers ---
safeOn('#btn_fit_both', 'click', () => {
  followMode = 'both';
  fitAllSatellites();
});

// Follow / Focus Satellite 1A (ISS)
safeOn('#btn_track_sat1', 'click', () => {
  followMode = 'sat1';
  map.setView([sat1Data.lat, sat1Data.lng], 4);
});

safeOn('#btn_focus_sat1', 'click', () => {
  followMode = 'sat1';
  map.setView([sat1Data.lat, sat1Data.lng], 5);
  markerSat1.openPopup();
});

// Follow / Focus Satellite 1B (Tiangong/Hubble)
safeOn('#btn_track_sat2', 'click', () => {
  followMode = 'sat2';
  map.setView([sat2Data.lat, sat2Data.lng], 4);
});

safeOn('#btn_focus_sat2', 'click', () => {
  followMode = 'sat2';
  map.setView([sat2Data.lat, sat2Data.lng], 5);
  markerSat2.openPopup();
});

// Follow / Focus Satellite 1C (Cartosat-3 / RISAT)
safeOn('#btn_track_sat3', 'click', () => {
  followMode = 'sat3';
  map.setView([sat3Data.lat, sat3Data.lng], 4);
});

safeOn('#btn_focus_sat3', 'click', () => {
  followMode = 'sat3';
  map.setView([sat3Data.lat, sat3Data.lng], 5);
  markerSat3.openPopup();
});

// Clear Trails
safeOn('#btn_clear_trails', 'click', () => {
  trailSat1.setLatLngs([]);
  trailSat2.setLatLngs([]);
  trailSat3.setLatLngs([]);
});

// Satellite 1B Selector Dropdown
safeOn('#sat2_selector', 'change', (e) => {
  currentSat2Key = e.target.value;
  const cfg = SATELLITE_CONFIGS[currentSat2Key];
  if (distSat2NameEl) distSat2NameEl.textContent = currentSat2Key === 'tiangong' ? 'Tiangong' : 'Hubble';
  if (sat2NoradLbl) sat2NoradLbl.textContent = cfg.subInfo;
  if (sat2IncTag) sat2IncTag.textContent = `Inclination: ${cfg.inc}`;
  markerSat2.setPopupContent(`<b>[1B] ${cfg.name}</b><br>Real-Time Telemetry<br>NORAD ID: ${cfg.noradId}`);
  
  trailSat2.setLatLngs([]);
  initSatModels();
  updateSatellite2();
});

// Satellite 1C ISRO Selector Dropdown
safeOn('#sat3_selector', 'change', (e) => {
  currentSat3Key = e.target.value;
  const cfg = SATELLITE_CONFIGS[currentSat3Key];
  const distName = currentSat3Key === 'cartosat3' ? 'Cartosat-3' : 'RISAT-2BR1';
  if (distSat3NameEl) distSat3NameEl.textContent = distName;
  if (sat3NoradLbl) sat3NoradLbl.textContent = cfg.subInfo;
  if (sat3IncTag) sat3IncTag.textContent = `Inclination: ${cfg.inc}`;
  markerSat3.setPopupContent(`<b>[1C] ${cfg.name}</b><br>Real-Time ISRO Telemetry<br>NORAD ID: ${cfg.noradId}`);

  trailSat3.setLatLngs([]);
  initSatModels();
  updateSatellite3();
});

// 3-Way Cycle Toggle for Map Styles (No API key needed)
safeOn('#btn_toggle_map_theme', 'click', () => {
  if (currentMapStyle === 'satellite') {
    setMapStyle('dark');
  } else if (currentMapStyle === 'dark') {
    setMapStyle('topo');
  } else {
    setMapStyle('satellite');
  }
});

map.on('dragstart', () => {
  followMode = 'manual';
});

// --- Light / Dark Theme Switching ---
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeLabel) themeLabel.textContent = 'Dark Mode';
    localStorage.setItem('sat_theme', 'light');
    if (currentMapStyle === 'dark') {
      setMapStyle('topo');
    }
  } else {
    document.body.classList.remove('light-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (themeLabel) themeLabel.textContent = 'Light Mode';
    localStorage.setItem('sat_theme', 'dark');
    if (currentMapStyle === 'topo') {
      setMapStyle('satellite');
    }
  }
}

safeOn('#btn_theme_toggle', 'click', () => {
  const isLight = document.body.classList.contains('light-theme');
  applyTheme(isLight ? 'dark' : 'light');
});

// Check saved theme preference (default to dark)
const savedTheme = localStorage.getItem('sat_theme') || 'dark';
applyTheme(savedTheme);

// --- Live Earth Camera Controls ---
safeOn('#btn_toggle_cam', 'click', () => {
  if (liveCamWidget) {
    liveCamWidget.classList.toggle('hidden');
    if (!liveCamWidget.classList.contains('hidden')) {
      liveCamWidget.classList.remove('minimized');
      if (btnCamMinimize) btnCamMinimize.textContent = '🗕';
    }
  }
});

safeOn('#btn_cam_minimize', 'click', () => {
  if (liveCamWidget) {
    const isMin = liveCamWidget.classList.toggle('minimized');
    if (btnCamMinimize) {
      btnCamMinimize.textContent = isMin ? '🗖' : '🗕';
      btnCamMinimize.title = isMin ? 'Expand Video' : 'Minimize Video';
    }
  }
});

safeOn('#btn_cam_close', 'click', () => {
  if (liveCamWidget) {
    liveCamWidget.classList.add('hidden');
  }
});

safeOn('#cam_stream_select', 'change', (e) => {
  if (nasaCamIframe) {
    const val = e.target.value;
    const url = `https://www.youtube.com/embed/${val}?autoplay=1&mute=1&playsinline=1`;
    const popoutUrl = `https://www.youtube.com/watch?v=${val}`;
    nasaCamIframe.src = url;
    const popoutBtn = document.querySelector('#btn_cam_popout');
    if (popoutBtn) popoutBtn.href = popoutUrl;
    const camSub = document.querySelector('.cam-sub');
    if (camSub) {
      if (val === 'fO9e9jnhYK8') {
        camSub.textContent = '📡 Live 4K Ultra-HD from Sen ISS External Cameras';
      } else if (val === '4QJEibrt9B8') {
        camSub.textContent = '📡 Live from Space Station External Cameras';
      } else {
        camSub.textContent = '📡 Live NASA HD Earth from Space Stream';
      }
    }
  }
});

// --- Draggable Live Earth Camera Widget ---
function initDraggableWidget() {
  const widget = document.querySelector('#live_cam_widget');
  const header = document.querySelector('#cam_drag_header') || document.querySelector('.cam-header');
  if (!widget || !header) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  header.addEventListener('pointerdown', (e) => {
    // Avoid dragging if clicking buttons, select dropdown, or links inside the header
    if (e.target.closest('.cam-controls') || e.target.closest('select') || e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    isDragging = true;
    widget.classList.add('is-dragging');

    // Switch to fixed positioning based on exact screen coordinates
    const rect = widget.getBoundingClientRect();
    widget.style.position = 'fixed';
    widget.style.right = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left = `${rect.left}px`;
    widget.style.top = `${rect.top}px`;
    widget.style.zIndex = '9999';

    initialLeft = rect.left;
    initialTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;

    header.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  header.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    // Clamp within viewport so window cannot be dragged off-screen
    const maxLeft = window.innerWidth - widget.offsetWidth;
    const maxTop = window.innerHeight - widget.offsetHeight;

    newLeft = Math.max(10, Math.min(newLeft, maxLeft - 10));
    newTop = Math.max(10, Math.min(newTop, maxTop - 10));

    widget.style.left = `${newLeft}px`;
    widget.style.top = `${newTop}px`;
  });

  const stopDrag = (e) => {
    if (isDragging) {
      isDragging = false;
      widget.classList.remove('is-dragging');
      try {
        if (header.hasPointerCapture(e.pointerId)) {
          header.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }
  };

  header.addEventListener('pointerup', stopDrag);
  header.addEventListener('pointercancel', stopDrag);
}

// --- Bootstrapping ---
initSatModels();
initDraggableWidget();
updateClock();
updateSatellite1();
updateSatellite2();
updateSatellite3();

setInterval(updateClock, 1000);
setInterval(updateSatellite1, 1000);
setInterval(updateSatellite2, 1000);
setInterval(updateSatellite3, 1000);