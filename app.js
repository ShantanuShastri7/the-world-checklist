/* ============================================================
   THE WORLD CHECKLIST — APP LOGIC
   ============================================================ */

// ─── Global State ───────────────────────────────────────────
let appData = { countries: [] };
let map = null;
let mapMarkers = null;
let currentView = 'explore';
let activeTag = 'all';
let searchQuery = '';
let selectedTags = [];
let pendingMapPlace = null;
let uploadedImageDataUrl = null;

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderExplore();
  setCurrentDateTime();
});

// ─── Load Data ───────────────────────────────────────────────
async function loadData() {
  try {
    // Try fetching from file; fall back to localStorage override
    const stored = localStorage.getItem('worldChecklist_data');
    if (stored) {
      appData = JSON.parse(stored);
    } else {
      const res = await fetch('data/places.json');
      appData = await res.json();
    }
  } catch (e) {
    appData = { countries: [] };
    console.warn('Could not load places.json. Starting fresh.', e);
  }
  updateStats();
}

function saveData() {
  localStorage.setItem('worldChecklist_data', JSON.stringify(appData));
  updateStats();
}

// ─── Stats ────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-countries').textContent = appData.countries.length;
  const total = appData.countries.reduce((s, c) => s + c.places.length, 0);
  document.getElementById('stat-places').textContent = total;

  // Hero badges (one per country)
  const badgeContainer = document.getElementById('hero-badges');
  if (badgeContainer) {
    badgeContainer.innerHTML = appData.countries.map(c =>
      `<span class="hero-badge" onclick="scrollToCountry('${c.id}')">${c.flag} ${c.name} <strong style="color:var(--accent-3)">${c.places.length}</strong></span>`
    ).join('');
  }
}

// ─── View Switching ───────────────────────────────────────────
function switchView(view) {
  currentView = view;

  // Update all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const navEl = document.getElementById(`nav-${view}`);
  if (navEl) navEl.classList.add('active');

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  if (view === 'map') {
    initMap();
  }
}

// ─── Sidebar (mobile) ─────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── Scroll to Country ────────────────────────────────────────
function scrollToCountry(id) {
  const el = document.getElementById(`country-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Auto-open it
    if (!el.classList.contains('open')) toggleCountry(id);
  }
}

// ─── Render Explore ───────────────────────────────────────────
function renderExplore() {
  updateStats();
  renderCountries();
}

function renderCountries() {
  const grid = document.getElementById('countries-grid');
  const noResults = document.getElementById('no-results');

  const filtered = getFilteredData();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'flex';
    noResults.style.flexDirection = 'column';
    noResults.style.alignItems = 'center';
    return;
  }

  noResults.style.display = 'none';

  grid.innerHTML = filtered.map((country, ci) =>
    `<div class="country-card" id="country-${country.id}" style="animation-delay:${ci * 0.05}s">
      <div class="country-header" onclick="toggleCountry('${country.id}')">
        <div class="country-cover" style="background-image:url('${country.coverImage}')"></div>
        <div class="country-header-overlay"></div>
        <div class="country-header-content">
          <span class="country-flag">${country.flag}</span>
          <div class="country-info">
            <div class="country-name">${country.name}</div>
            <div class="country-place-count">${country.places.length} place${country.places.length !== 1 ? 's' : ''} visited</div>
          </div>
        </div>
        <span class="country-chevron">▼</span>
      </div>
      <div class="places-list" id="places-list-${country.id}">
        <div class="places-grid">
          ${country.places.map(place => renderPlaceCard(place, country)).join('')}
        </div>
      </div>
    </div>`
  ).join('');
}

function renderPlaceCard(place, country) {
  const date = formatDate(place.visitedAt);
  const tags = (place.tags || []).slice(0, 3).map(t =>
    `<span class="place-tag">${t}</span>`
  ).join('');

  return `
    <div class="place-card" onclick="openPlaceModal('${place.id}', '${country.id}')">
      <div class="place-image-wrap">
        <img class="place-image" src="${place.image}" alt="${place.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=60'" />
        <div class="place-image-overlay"></div>
        <span class="place-image-date">📅 ${date}</span>
      </div>
      <div class="place-card-body">
        <div class="place-card-name">${place.name}</div>
        <div class="place-card-address">📌 ${place.address}</div>
        <p class="place-card-desc">${place.description}</p>
        <div class="place-card-tags">${tags}</div>
      </div>
    </div>`;
}

// ─── Toggle Country ───────────────────────────────────────────
function toggleCountry(id) {
  const card = document.getElementById(`country-${id}`);
  card.classList.toggle('open');
}

// ─── Filtering ────────────────────────────────────────────────
function getFilteredData() {
  return appData.countries
    .map(country => ({
      ...country,
      places: country.places.filter(place => {
        const matchesTag = activeTag === 'all' || (place.tags || []).includes(activeTag);
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
          place.name.toLowerCase().includes(q) ||
          place.address.toLowerCase().includes(q) ||
          (place.description || '').toLowerCase().includes(q) ||
          (place.tags || []).some(t => t.includes(q)) ||
          country.name.toLowerCase().includes(q);
        return matchesTag && matchesSearch;
      })
    }))
    .filter(c => c.places.length > 0);
}

function handleSearch(val) {
  searchQuery = val;
  document.getElementById('search-clear').style.display = val ? 'block' : 'none';
  renderCountries();
}

function clearSearch() {
  searchQuery = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').style.display = 'none';
  renderCountries();
}

function filterByTag(tag, btn) {
  activeTag = tag;
  document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCountries();
}

// ─── Place Detail Modal ────────────────────────────────────────
function openPlaceModal(placeId, countryId) {
  const country = appData.countries.find(c => c.id === countryId);
  const place = country?.places.find(p => p.id === placeId);
  if (!place || !country) return;

  document.getElementById('modal-image').src = place.image;
  document.getElementById('modal-image').alt = place.name;
  document.getElementById('modal-name').textContent = place.name;
  document.getElementById('modal-country-flag').textContent = country.flag;
  document.getElementById('modal-country-name').textContent = country.name;
  document.getElementById('modal-date').textContent = formatDateLong(place.visitedAt);
  document.getElementById('modal-address').textContent = place.address;
  document.getElementById('modal-coords').textContent = place.location;
  document.getElementById('modal-description').textContent = place.description;

  const tagsEl = document.getElementById('modal-tags');
  tagsEl.innerHTML = (place.tags || []).map(t =>
    `<span class="place-tag" style="font-size:11px;padding:3px 10px;">${t}</span>`
  ).join('');

  // Store for map button
  pendingMapPlace = { lat: place.lat, lng: place.lng, name: place.name };

  document.getElementById('place-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePlaceModal() {
  document.getElementById('place-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function goToMapPlace() {
  closePlaceModal();
  switchView('map');
  if (pendingMapPlace && map) {
    setTimeout(() => {
      map.setView([pendingMapPlace.lat, pendingMapPlace.lng], 13, { animate: true });
    }, 300);
  }
}

// ─── Map ─────────────────────────────────────────────────────
function initMap() {
  if (map) return; // Already initialised

  map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: true,
  });

  // Dark tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  mapMarkers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
  });

  const colors = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#14b8a6', '#8b5cf6', '#ec4899'];

  appData.countries.forEach((country, ci) => {
    const color = colors[ci % colors.length];

    country.places.forEach(place => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;
          background:${color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid rgba(255,255,255,0.9);
          box-shadow:0 4px 12px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([place.lat, place.lng], { icon });

      const popupContent = `
        <div class="map-popup">
          <img class="map-popup-image" src="${place.image}" alt="${place.name}" onerror="this.style.display='none'" />
          <div style="padding:4px 4px 8px">
            <div class="map-popup-country">${country.flag} ${country.name}</div>
            <div class="map-popup-name">${place.name}</div>
            <div class="map-popup-date">${formatDateLong(place.visitedAt)}</div>
            <button class="map-popup-btn" onclick="openPlaceModal('${place.id}','${country.id}');switchView('explore')">View Details →</button>
          </div>
        </div>`;

      marker.bindPopup(popupContent, {
        maxWidth: 220,
        className: 'custom-leaflet-popup',
      });

      mapMarkers.addLayer(marker);
    });
  });

  map.addLayer(mapMarkers);
}

// ─── Add Entry Modal ──────────────────────────────────────────
function openAddModal() {
  document.getElementById('add-modal-overlay').classList.add('open');
  document.getElementById('add-success').style.display = 'none';
  document.getElementById('add-form').style.display = 'block';
  document.querySelector('.add-modal-header').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeAddModal() {
  document.getElementById('add-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  resetAddForm();
}

function resetAddForm() {
  document.getElementById('add-form').reset();
  selectedTags = [];
  document.querySelectorAll('.tag-pick').forEach(b => b.classList.remove('selected'));
  uploadedImageDataUrl = null;
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('image-upload-placeholder').style.display = 'flex';
}

function setCurrentDateTime() {
  const now = new Date();
  const local = new Date(now - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  const el = document.getElementById('form-date');
  if (el) el.value = local;
}

function toggleTag(btn) {
  const tag = btn.dataset.tag;
  if (selectedTags.includes(tag)) {
    selectedTags = selectedTags.filter(t => t !== tag);
    btn.classList.remove('selected');
  } else {
    selectedTags.push(tag);
    btn.classList.add('selected');
  }
}

function handleImageFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    uploadedImageDataUrl = e.target.result;
    showImagePreview(uploadedImageDataUrl);
  };
  reader.readAsDataURL(file);
}

function handleImageUrl(url) {
  if (url.trim()) {
    uploadedImageDataUrl = null;
    showImagePreview(url.trim());
  }
}

function showImagePreview(src) {
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-upload-placeholder');
  preview.src = src;
  preview.style.display = 'block';
  placeholder.style.display = 'none';
}

function handleAddSubmit(e) {
  e.preventDefault();

  const countryName = document.getElementById('form-country-name').value.trim();
  const countryFlag = document.getElementById('form-country-flag').value.trim() || '🌍';
  const placeName = document.getElementById('form-place-name').value.trim();
  const address = document.getElementById('form-address').value.trim();
  const lat = parseFloat(document.getElementById('form-lat').value);
  const lng = parseFloat(document.getElementById('form-lng').value);
  const visitedAt = document.getElementById('form-date').value;
  const description = document.getElementById('form-description').value.trim();
  const imageUrl = document.getElementById('form-image-url').value.trim();

  const imageSource = uploadedImageDataUrl || imageUrl || 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=60';

  const newPlace = {
    id: slugify(`${countryName}-${placeName}`),
    name: placeName,
    location: `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`,
    address,
    lat,
    lng,
    visitedAt,
    image: imageSource,
    description,
    tags: selectedTags,
  };

  // Find or create country
  const countryId = slugify(countryName);
  let country = appData.countries.find(c => c.id === countryId);

  if (!country) {
    country = {
      id: countryId,
      name: countryName,
      flag: countryFlag,
      coverImage: imageSource,
      places: [],
    };
    appData.countries.push(country);
  }

  country.places.push(newPlace);

  // Save to localStorage (live preview)
  saveData();

  // Download updated JSON (without base64 images for large files)
  const exportData = JSON.parse(JSON.stringify(appData));
  // Replace base64 image with placeholder hint
  exportData.countries.forEach(c => {
    c.places.forEach(p => {
      if (p.image && p.image.startsWith('data:')) {
        p.image = `data/images/${p.id}.jpg`;
      }
    });
  });

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'places.json';
  a.click();
  URL.revokeObjectURL(url);

  // Show success
  document.getElementById('add-form').style.display = 'none';
  document.querySelector('.add-modal-header').style.display = 'none';
  document.getElementById('add-success').style.display = 'block';

  // Refresh explore view
  renderExplore();

  // Reset map so it re-initialises with new markers
  if (map) {
    map.remove();
    map = null;
    mapMarkers = null;
  }
}

// ─── Google Takeout Import ────────────────────────────────────
let takeoutRawPlaces = [];
let takeoutReviewItems = [];

function openTakeoutModal() {
  document.getElementById('takeout-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTakeoutModal() {
  document.getElementById('takeout-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  // Reset to step 1
  showTakeoutStep(1);
  takeoutRawPlaces = [];
  takeoutReviewItems = [];
}

function showTakeoutStep(n) {
  document.querySelectorAll('.takeout-step').forEach((el, i) => {
    el.style.display = (i + 1 === n) ? 'block' : 'none';
  });
  document.querySelectorAll('.takeout-step-dot').forEach((el, i) => {
    el.classList.toggle('active', i + 1 <= n);
  });
}

function handleTakeoutFile(input) {
  const file = input.files[0];
  if (!file) return;

  const btn = document.getElementById('takeout-parse-btn');
  btn.textContent = 'Parsing…';
  btn.disabled = true;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const raw = JSON.parse(e.target.result);
      takeoutRawPlaces = parseTakeoutJson(raw);
      populateTakeoutReview();
      showTakeoutStep(2);
    } catch (err) {
      alert('Could not parse the file. Please make sure you selected the correct Google Takeout JSON file.\n\nExpected files: Records.json or Semantic Location History JSON files.');
      console.error(err);
    }
    btn.textContent = 'Parse File →';
    btn.disabled = false;
  };
  reader.readAsText(file);
}

function parseTakeoutJson(raw) {
  const places = [];

  // Format 1: Semantic Location History (timelineObjects array)
  if (raw.timelineObjects) {
    raw.timelineObjects.forEach(obj => {
      if (obj.placeVisit) {
        const pv = obj.placeVisit;
        const loc = pv.location || {};
        if (!loc.name) return;

        const lat = (loc.latitudeE7 || 0) / 1e7;
        const lng = (loc.longitudeE7 || 0) / 1e7;
        const startTs = pv.duration?.startTimestamp || pv.duration?.startTimestampMs;
        const visitedAt = startTs ? new Date(isNaN(startTs) ? startTs : Number(startTs)).toISOString() : null;

        places.push({
          name: loc.name || 'Unknown Place',
          address: loc.address || '',
          lat,
          lng,
          visitedAt: visitedAt || new Date().toISOString(),
          country: guessCountry(loc.address || ''),
          confidence: pv.visitConfidence || 0,
        });
      }
    });
  }

  // Format 2: Records.json (locations array with activity)
  else if (Array.isArray(raw.locations)) {
    // Group by ~1km proximity into "visits"
    // This is a simpler parser; just show raw points with timestamps
    const significant = raw.locations.filter(l =>
      l.activity && l.activity.some(a =>
        a.activity && a.activity.some(aa => ['STILL', 'IN_VEHICLE'].includes(aa.type))
      )
    ).slice(0, 200); // Limit

    significant.forEach(l => {
      places.push({
        name: `Visit at ${(l.latitudeE7 / 1e7).toFixed(3)}, ${(l.longitudeE7 / 1e7).toFixed(3)}`,
        address: '',
        lat: l.latitudeE7 / 1e7,
        lng: l.longitudeE7 / 1e7,
        visitedAt: new Date(Number(l.timestampMs)).toISOString(),
        country: '',
        confidence: 100,
      });
    });
  }

  return places;
}

function guessCountry(address) {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  return parts[parts.length - 1] || '';
}

// Active filters for takeout review
let takeoutFilterCountry = 'all';
let takeoutFilterSearch = '';
let takeoutSelected = new Set();

function populateTakeoutReview() {
  takeoutReviewItems = takeoutRawPlaces;
  takeoutSelected = new Set(takeoutRawPlaces.map((_, i) => i)); // select all by default

  // Build country filter list
  const countries = [...new Set(takeoutRawPlaces.map(p => p.country).filter(Boolean))].sort();
  const countrySelect = document.getElementById('takeout-country-filter');
  countrySelect.innerHTML = `<option value="all">All Countries (${countries.length})</option>` +
    countries.map(c => `<option value="${c}">${c}</option>`).join('');

  renderTakeoutReview();

  document.getElementById('takeout-count-badge').textContent = `${takeoutRawPlaces.length} places found`;
}

function renderTakeoutReview() {
  const list = document.getElementById('takeout-review-list');
  const q = takeoutFilterSearch.toLowerCase();

  const visible = takeoutRawPlaces
    .map((p, i) => ({ ...p, _i: i }))
    .filter(p => {
      const matchCountry = takeoutFilterCountry === 'all' || p.country === takeoutFilterCountry;
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
      return matchCountry && matchSearch;
    });

  if (visible.length === 0) {
    list.innerHTML = `<p style="color:var(--text-4);text-align:center;padding:40px 0;">No places match your filter.</p>`;
    return;
  }

  list.innerHTML = visible.map(p => `
    <label class="takeout-item ${takeoutSelected.has(p._i) ? 'checked' : ''}">
      <input type="checkbox" ${takeoutSelected.has(p._i) ? 'checked' : ''}
        onchange="toggleTakeoutItem(${p._i}, this.checked)"
        style="accent-color:var(--accent);width:16px;height:16px;flex-shrink:0;" />
      <div class="takeout-item-info">
        <div class="takeout-item-name">${p.name}</div>
        <div class="takeout-item-meta">
          ${p.country ? `<span>🌍 ${p.country}</span>` : ''}
          ${p.visitedAt ? `<span>📅 ${formatDateLong(p.visitedAt)}</span>` : ''}
          ${p.address ? `<span>📌 ${p.address.substring(0, 50)}…</span>` : ''}
        </div>
      </div>
    </label>
  `).join('');

  const selectedCount = visible.filter(p => takeoutSelected.has(p._i)).length;
  document.getElementById('takeout-selected-count').textContent =
    `${takeoutSelected.size} of ${takeoutRawPlaces.length} selected`;
}

function toggleTakeoutItem(i, checked) {
  if (checked) takeoutSelected.add(i);
  else takeoutSelected.delete(i);
  document.getElementById('takeout-selected-count').textContent =
    `${takeoutSelected.size} of ${takeoutRawPlaces.length} selected`;
  // Update row style
  renderTakeoutReview();
}

function selectAllTakeout() {
  takeoutRawPlaces.forEach((_, i) => takeoutSelected.add(i));
  renderTakeoutReview();
}

function selectNoneTakeout() {
  takeoutSelected.clear();
  renderTakeoutReview();
}

function applyTakeoutImport() {
  const toImport = takeoutRawPlaces.filter((_, i) => takeoutSelected.has(i));
  if (toImport.length === 0) {
    alert('Please select at least one place to import.');
    return;
  }
  showTakeoutStep(3);
  renderTakeoutConfirm(toImport);
}

function renderTakeoutConfirm(toImport) {
  const byCountry = {};
  toImport.forEach(p => {
    const key = p.country || 'Unknown';
    if (!byCountry[key]) byCountry[key] = [];
    byCountry[key].push(p);
  });

  let html = '';
  Object.entries(byCountry).forEach(([country, places]) => {
    html += `<div class="confirm-country">
      <div class="confirm-country-name">🌍 ${country} (${places.length} places)</div>
      <ul class="confirm-place-list">
        ${places.map(p => `<li>${p.name}</li>`).join('')}
      </ul>
    </div>`;
  });

  document.getElementById('takeout-confirm-list').innerHTML = html;
  document.getElementById('takeout-import-count').textContent = toImport.length;
}

function confirmTakeoutImport() {
  const toImport = takeoutRawPlaces.filter((_, i) => takeoutSelected.has(i));

  toImport.forEach(p => {
    const countryId = slugify(p.country || 'unknown');
    const countryName = p.country || 'Unknown';
    let country = appData.countries.find(c => c.id === countryId);

    if (!country) {
      country = {
        id: countryId,
        name: countryName,
        flag: '🌍',
        coverImage: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=60',
        places: [],
      };
      appData.countries.push(country);
    }

    // Avoid duplicates
    const exists = country.places.some(existing =>
      Math.abs(existing.lat - p.lat) < 0.001 && Math.abs(existing.lng - p.lng) < 0.001
    );
    if (exists) return;

    country.places.push({
      id: slugify(`${countryName}-${p.name}-${Date.now()}`),
      name: p.name,
      location: `${Math.abs(p.lat).toFixed(4)}° ${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lng).toFixed(4)}° ${p.lng >= 0 ? 'E' : 'W'}`,
      address: p.address || '',
      lat: p.lat,
      lng: p.lng,
      visitedAt: p.visitedAt,
      image: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=60',
      description: 'Imported from Google Takeout. Add your story here!',
      tags: [],
    });
  });

  saveData();

  // Download updated JSON
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'places.json';
  a.click();
  URL.revokeObjectURL(url);

  showTakeoutStep(4);
  renderExplore();

  if (map) { map.remove(); map = null; mapMarkers = null; }
}

// ─── Helpers ──────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateLong(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
