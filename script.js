/**
 * Blood Bank Live Radar - Core JS Code
 * Handles routing, map rendering, chart analytics, filtering, interactive components, and mock databases.
 */

// Global State
const AppState = {
  theme: localStorage.getItem('theme') || 'light',
  currentPage: 'home',
  map: null,
  mapMarkers: [],
  charts: {
    distribution: null,
    weekly: null,
    monthly: null
  },
  // API Database Cache (Fetched dynamically from backend server)
  bloodBanks: [],
  donors: [],
  sosRequests: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupNavigation();
  initLoadingScreen();
  initBackToTop();
  initScrollProgress();
  setupEventListeners();
  
  // Load real-time geodata from Tamil Nadu Node backend
  await loadData();
  
  // Show default page (Home)
  navigateTo('home');
});

// Asynchronous backend API data fetching
async function loadData() {
  try {
    const [banksRes, donorsRes, sosRes] = await Promise.all([
      fetch('/api/blood-banks'),
      fetch('/api/donors'),
      fetch('/api/sos')
    ]);

    if (banksRes.ok) AppState.bloodBanks = await banksRes.json();
    if (donorsRes.ok) AppState.donors = await donorsRes.json();
    if (sosRes.ok) AppState.sosRequests = await sosRes.json();
    
    console.log('Successfully fetched Tamil Nadu dataset from backend API server.');
  } catch (err) {
    console.warn('API connection failed. Reverting to local fallback data storage state.', err);
    // Dynamic local fallback if backend is not running
    AppState.bloodBanks = [
      {
        id: 1,
        name: "Rajiv Gandhi Government General Hospital",
        address: "E.V.R. Periyar Salai, Park Town, Chennai, TN 600003",
        lat: 13.0818,
        lng: 80.2758,
        phone: "+91 44 2530 5000",
        distance: 1.2,
        status: "available",
        stock: { "A+": 64, "A-": 12, "B+": 58, "B-": 10, "AB+": 24, "AB-": 5, "O+": 85, "O-": 22 }
      },
      {
        id: 2,
        name: "Christian Medical College (CMC)",
        address: "Ida Scudder Rd, Vellore, TN 632004",
        lat: 12.9248,
        lng: 79.1348,
        phone: "+91 416 228 1000",
        distance: 138,
        status: "available",
        stock: { "A+": 48, "A-": 8, "B+": 32, "B-": 6, "AB+": 16, "AB-": 2, "O+": 70, "O-": 15 }
      },
      {
        id: 3,
        name: "Government Rajaji Hospital",
        address: "Panagal Rd, Madurai, TN 625020",
        lat: 9.9264,
        lng: 78.1240,
        phone: "+91 452 253 2535",
        distance: 462,
        status: "low",
        stock: { "A+": 12, "A-": 2, "B+": 18, "B-": 1, "AB+": 4, "AB-": 0, "O+": 20, "O-": 3 }
      },
      {
        id: 4,
        name: "Coimbatore Medical College Hospital",
        address: "Trichy Rd, Coimbatore, TN 641018",
        lat: 11.0028,
        lng: 76.9936,
        phone: "+91 422 230 1393",
        distance: 490,
        status: "available",
        stock: { "A+": 55, "A-": 14, "B+": 42, "B-": 8, "AB+": 20, "AB-": 4, "O+": 60, "O-": 12 }
      }
    ];
    AppState.donors = [
      { name: "Adhithya Kumar", group: "O-", city: "Chennai", available: "Available", distance: "2.1 km", phone: "+91 98401 23456", avatar: "AK" },
      { name: "Priyanka Devi", group: "A+", city: "Coimbatore", available: "Available", distance: "4.5 km", phone: "+91 94440 98765", avatar: "PD" },
      { name: "Murugan Pillai", group: "B+", city: "Madurai", available: "Donated recently", distance: "8.2 km", phone: "+91 97890 12345", avatar: "MP" }
    ];
    AppState.sosRequests = [
      { id: 101, patient: "Karthik Raja", group: "O-", units: 3, hospital: "Rajiv Gandhi Government General Hospital", phone: "+91 98450 11223", location: "Chennai", time: "5 mins ago", active: true }
    ];
  }
}


// Loading Screen Dismiss
function initLoadingScreen() {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    const dismissLoader = () => {
      setTimeout(() => {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
      }, 500);
    };

    if (document.readyState === 'complete') {
      dismissLoader();
    } else {
      window.addEventListener('load', dismissLoader);
      // Fail-safe: dismiss loader after 2.5 seconds regardless of external assets loading status
      setTimeout(dismissLoader, 2500);
    }
  }
}

// Custom Theme System
function initTheme() {
  const html = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  
  if (AppState.theme === 'dark') {
    html.classList.add('dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun text-yellow-400 text-lg"></i>';
  } else {
    html.classList.remove('dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon text-slate-600 dark:text-slate-300 text-lg"></i>';
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    AppState.theme = 'light';
    localStorage.setItem('theme', 'light');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon text-slate-600 text-lg"></i>';
    showToast('Switched to Light Theme', 'info');
  } else {
    html.classList.add('dark');
    AppState.theme = 'dark';
    localStorage.setItem('theme', 'dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun text-yellow-400 text-lg"></i>';
    showToast('Switched to Dark Theme', 'info');
  }
  
  // Update charts color systems if on analytics tab
  if (AppState.currentPage === 'analytics') {
    renderAnalyticsCharts();
  }
}

// Navigation System (SPA routing)
function setupNavigation() {
  const navLinks = document.querySelectorAll('[data-target-page]');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute('data-target-page');
      navigateTo(targetPage);
      
      // Close mobile menu if open
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }
    });
  });

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

function navigateTo(pageId) {
  const sections = document.querySelectorAll('.page-section');
  const activeClass = 'active';
  
  // Find correct section
  const targetSection = document.getElementById(`page-${pageId}`);
  if (!targetSection) return;
  
  // Update nav state styling
  document.querySelectorAll('[data-target-page]').forEach(link => {
    if (link.getAttribute('data-target-page') === pageId) {
      link.classList.add('text-red-500', 'font-semibold');
      link.classList.remove('text-slate-600', 'dark:text-slate-300');
    } else {
      link.classList.remove('text-red-500', 'font-semibold');
      link.classList.add('text-slate-600', 'dark:text-slate-300');
    }
  });

  // Hide all sections with transition
  sections.forEach(sec => {
    sec.classList.remove(activeClass);
  });
  
  // Activate target section
  targetSection.classList.add(activeClass);
  AppState.currentPage = pageId;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });
  
  // Trigger sub-initializations depending on page
  if (pageId === 'home') {
    animateCounters();
  } else if (pageId === 'map') {
    initLeafletMap();
  } else if (pageId === 'availability') {
    renderBloodAvailabilityGrid();
  } else if (pageId === 'donors') {
    renderDonorDirectory();
  } else if (pageId === 'sos') {
    renderRecentSOSList();
  } else if (pageId === 'analytics') {
    renderAnalyticsCharts();
  }
}

// Custom Leaflet Map Engine
function initLeafletMap() {
  if (AppState.map) {
    // Force redraw layout in case map container size changed
    setTimeout(() => AppState.map.invalidateSize(), 150);
    return;
  }

  // Create Map instance centered around Tamil Nadu, India
  AppState.map = L.map('leaflet-map-container', {
    center: [11.1271, 78.6569],
    zoom: 7,
    zoomControl: false
  });
  
  // Add zoom control at bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(AppState.map);

  // Set OpenStreetMap tile template
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(AppState.map);

  // Render Pins
  renderMapMarkers();
}

function renderMapMarkers(filterStatus = 'all') {
  // Clear old markers
  AppState.mapMarkers.forEach(m => AppState.map.removeLayer(m));
  AppState.mapMarkers = [];

  const banks = AppState.bloodBanks;
  const filtered = filterStatus === 'all' ? banks : banks.filter(b => b.status === filterStatus);

  filtered.forEach(bank => {
    // Set customized pin color depending on stock status
    let pinColor = '#22c55e'; // Green
    if (bank.status === 'low') pinColor = '#eab308'; // Yellow
    if (bank.status === 'out') pinColor = '#ef4444'; // Red

    const customMarkerSvg = `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <span class="absolute w-8 h-8 rounded-full opacity-30 animate-ping" style="background-color: ${pinColor}"></span>
        <span class="absolute w-6 h-6 rounded-full flex items-center justify-center shadow-lg text-white font-bold text-xs" style="background-color: ${pinColor}">
          <i class="fas fa-hospital text-[10px]"></i>
        </span>
      </div>
    `;

    const icon = L.divIcon({
      html: customMarkerSvg,
      className: 'custom-leaflet-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([bank.lat, bank.lng], { icon }).addTo(AppState.map);
    
    // Bind popup markup
    const popupContent = `
      <div class="p-3 max-w-[280px]">
        <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">${bank.name}</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-2"><i class="fas fa-map-marker-alt text-red-500 mr-1"></i> ${bank.address}</p>
        
        <div class="bg-slate-50 dark:bg-slate-800 rounded p-2 mb-3 border border-slate-100 dark:border-slate-700">
          <div class="grid grid-cols-4 gap-1 text-center">
            ${Object.entries(bank.stock).slice(0, 4).map(([grp, val]) => `
              <div>
                <span class="block text-[10px] text-slate-500 dark:text-slate-400">${grp}</span>
                <span class="font-bold text-xs ${val === 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}">${val}u</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-3">
          <span><i class="fas fa-route text-blue-500 mr-1"></i> ${bank.distance} km away</span>
          <span><i class="fas fa-phone text-green-500 mr-1"></i> ${bank.phone.split(' ')[1]}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <button onclick="triggerMockNavigation('${bank.name}')" class="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded shadow transition flex items-center justify-center gap-1">
            <i class="fas fa-directions"></i> Route
          </button>
          <button onclick="prefillSOSForm('${bank.name}', '${bank.phone}')" class="px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded shadow transition flex items-center justify-center gap-1">
            <i class="fas fa-heart"></i> Request
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 300 });
    AppState.mapMarkers.push(marker);
  });
}

function filterMap(status) {
  // Update filter buttons UI
  document.querySelectorAll('#map-filter-buttons button').forEach(btn => {
    btn.classList.remove('bg-red-500', 'text-white', 'shadow-md');
    btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
  });

  const activeBtn = document.getElementById(`map-filter-${status}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
    activeBtn.classList.add('bg-red-500', 'text-white', 'shadow-md');
  }

  renderMapMarkers(status);
}

function handleMapSearch(e) {
  e.preventDefault();
  const query = document.getElementById('map-search-input').value.toLowerCase();
  const match = AppState.bloodBanks.find(b => b.name.toLowerCase().includes(query) || b.address.toLowerCase().includes(query));
  
  if (match) {
    AppState.map.setView([match.lat, match.lng], 15);
    // Find matching marker and trigger click popup
    const idx = AppState.bloodBanks.indexOf(match);
    if (AppState.mapMarkers[idx]) {
      AppState.mapMarkers[idx].openPopup();
    }
  } else {
    showToast('No hospital found matching search criteria.', 'error');
  }
}

// Global functions accessible from Map Marker HTML template
window.triggerMockNavigation = (hospitalName) => {
  showToast(`Initiating navigation route to ${hospitalName}...`, 'info');
};

window.prefillSOSForm = (hospitalName, contact) => {
  navigateTo('sos');
  document.getElementById('sos-hospital').value = hospitalName;
  document.getElementById('sos-contact').value = contact;
  showToast(`Form prefilled with details for ${hospitalName}`, 'success');
};


// Blood Availability List & Search
function renderBloodAvailabilityGrid() {
  const container = document.getElementById('availability-grid');
  const searchInput = document.getElementById('availability-search');
  const groupFilter = document.getElementById('availability-filter-group');
  
  if (!container) return;

  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedGroup = groupFilter ? groupFilter.value : 'all';

  // Aggregate total availability for each blood group across all banks
  const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  
  let outputHtml = '';

  groups.forEach(group => {
    // If filtering by specific group, skip others
    if (selectedGroup !== 'all' && selectedGroup !== group) return;

    let totalUnits = 0;
    let occurrences = 0;

    // Filter banks by text search query
    const matchingBanks = AppState.bloodBanks.filter(b => 
      b.name.toLowerCase().includes(searchQuery) || b.address.toLowerCase().includes(searchQuery)
    );

    matchingBanks.forEach(b => {
      if (b.stock[group] !== undefined) {
        totalUnits += b.stock[group];
        occurrences++;
      }
    });

    // Compute status indicators
    let status = "Stable";
    let statusColor = "bg-green-500";
    let textColor = "text-green-500";
    let barColor = "bg-green-500";
    let percentage = Math.min((totalUnits / 120) * 100, 100);

    if (totalUnits < 15) {
      status = "Critical Outage";
      statusColor = "bg-red-500 animate-pulse";
      textColor = "text-red-500";
      barColor = "bg-red-500";
    } else if (totalUnits < 35) {
      status = "Low Reserves";
      statusColor = "bg-yellow-500";
      textColor = "text-yellow-500";
      barColor = "bg-yellow-500";
    }

    outputHtml += `
      <div class="glass p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 relative overflow-hidden group">
        <!-- Top accent decoration -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${totalUnits < 15 ? 'from-red-500 to-rose-400' : (totalUnits < 35 ? 'from-yellow-400 to-amber-300' : 'from-emerald-400 to-teal-400')}"></div>
        
        <div class="flex items-center justify-between mb-4">
          <!-- Blood group drop display -->
          <div class="relative w-12 h-12 flex items-center justify-center">
            <i class="fas fa-tint text-4xl text-red-500 group-hover:scale-110 transition duration-300"></i>
            <span class="absolute font-bold text-white text-xs pt-1">${group}</span>
          </div>
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full ${statusColor} text-white">
            ${status}
          </span>
        </div>

        <div class="mb-4">
          <div class="flex items-baseline gap-1">
            <span class="text-3xl font-extrabold text-slate-800 dark:text-slate-100">${totalUnits}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Units</span>
          </div>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Monitored in ${occurrences} centers</p>
        </div>

        <!-- Progress bar stock visualizer -->
        <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
          <div class="h-full rounded-full ${barColor}" style="width: ${percentage}%"></div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span><i class="far fa-clock mr-1"></i> Live Radar Active</span>
          <button onclick="triggerQuickRefresh('${group}')" class="hover:text-red-500 transition"><i class="fas fa-sync-alt"></i></button>
        </div>
      </div>
    `;
  });

  if (!outputHtml) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500">
        <i class="fas fa-search-minus text-4xl mb-3 text-slate-300"></i>
        <p>No results found for blood groups or hospital search query.</p>
      </div>
    `;
  } else {
    container.innerHTML = outputHtml;
  }
}

function handleAvailabilitySearch() {
  renderBloodAvailabilityGrid();
}

window.triggerQuickRefresh = (grp) => {
  showToast(`Refreshed live data packets for blood group ${grp}`, 'success');
  // Visual shimmer re-load
  const grid = document.getElementById('availability-grid');
  grid.style.opacity = '0.5';
  setTimeout(() => {
    grid.style.opacity = '1';
    renderBloodAvailabilityGrid();
  }, 300);
};


// Donor Directory Search & Details
function renderDonorDirectory() {
  const container = document.getElementById('donor-grid');
  const searchInput = document.getElementById('donor-search');
  const groupFilter = document.getElementById('donor-filter-group');
  const cityFilter = document.getElementById('donor-filter-city');

  if (!container) return;

  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedGroup = groupFilter ? groupFilter.value : 'all';
  const selectedCity = cityFilter ? cityFilter.value : 'all';

  const filtered = AppState.donors.filter(donor => {
    const matchesSearch = donor.name.toLowerCase().includes(searchQuery) || donor.city.toLowerCase().includes(searchQuery);
    const matchesGroup = selectedGroup === 'all' || donor.group === selectedGroup;
    const matchesCity = selectedCity === 'all' || donor.city.toLowerCase() === selectedCity.toLowerCase();
    return matchesSearch && matchesGroup && matchesCity;
  });

  let outputHtml = '';

  filtered.forEach(donor => {
    const isAvail = donor.available === 'Available';
    outputHtml += `
      <div class="glass p-5 rounded-2xl shadow-sm border border-white/20 hover:shadow-lg transition duration-300 flex items-start gap-4">
        <!-- Avatar circular display -->
        <div class="w-12 h-12 rounded-full bg-gradient-to-tr ${isAvail ? 'from-emerald-400 to-teal-500' : 'from-slate-400 to-slate-500'} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
          ${donor.avatar}
        </div>

        <div class="flex-grow min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <h4 class="font-bold text-slate-800 dark:text-slate-100 truncate text-sm hover:text-red-500 transition">${donor.name}</h4>
            <span class="px-2 py-0.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs font-bold rounded-md shrink-0">
              ${donor.group}
            </span>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
            <i class="fas fa-map-marker-alt text-slate-400 mr-1"></i> ${donor.city} (${donor.distance})
          </p>

          <div class="flex items-center gap-2 mb-3">
            <span class="w-2.5 h-2.5 rounded-full ${isAvail ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}"></span>
            <span class="text-xs font-semibold ${isAvail ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}">${donor.available}</span>
          </div>

          <button onclick="contactDonor('${donor.name}', '${donor.phone}')" class="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg shadow-sm transition duration-200 flex items-center justify-center gap-1.5">
            <i class="fas fa-paper-plane text-[10px]"></i> Contact Donor
          </button>
        </div>
      </div>
    `;
  });

  if (!outputHtml) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500">
        <i class="fas fa-users-slash text-4xl mb-3 text-slate-300"></i>
        <p>No donors found matching criteria.</p>
      </div>
    `;
  } else {
    container.innerHTML = outputHtml;
  }
}

window.contactDonor = (name, phone) => {
  // Show secure contact modal details
  const modal = document.getElementById('contact-modal');
  const modalText = document.getElementById('contact-modal-text');
  
  if (modal && modalText) {
    modalText.innerHTML = `
      <div class="text-center py-4">
        <div class="w-16 h-16 bg-red-50 dark:bg-red-950 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
          <i class="fas fa-shield-alt"></i>
        </div>
        <h4 class="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">Encrypted Contact Portal</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">Your connection with <strong>${name}</strong> is anonymized for privacy.</p>
        
        <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mb-4 flex items-center justify-center gap-2">
          <i class="fas fa-phone-alt text-green-500"></i>
          <span class="font-bold text-slate-700 dark:text-slate-200 tracking-wider">${phone}</span>
        </div>
        
        <div class="flex gap-2">
          <a href="tel:${phone}" class="flex-grow py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-md">
            <i class="fas fa-phone-alt"></i> Direct Call
          </a>
          <button onclick="sendMockSMS('${name}')" class="flex-grow py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-md">
            <i class="fas fa-comment-alt"></i> Send Anonymized Text
          </button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closeContactModal = () => {
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.sendMockSMS = (name) => {
  closeContactModal();
  showToast(`SMS request successfully queued to ${name}`, 'success');
};


// SOS Emergency Form Broadcast system
function renderRecentSOSList() {
  const container = document.getElementById('sos-recent-list');
  if (!container) return;

  let outputHtml = '';

  AppState.sosRequests.forEach(req => {
    outputHtml += `
      <div class="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-red-100 dark:border-red-950/50 flex items-center justify-between gap-4 hover:shadow-md transition">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">Urgently Required</span>
            <span class="text-xs font-bold text-red-500">${req.group}</span>
          </div>
          <h4 class="font-bold text-slate-800 dark:text-slate-100 text-sm">${req.patient} (${req.units} Units Needed)</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <i class="fas fa-hospital text-slate-400 mr-1"></i> ${req.hospital} &bull; <i class="fas fa-map-marker-alt text-slate-400 mr-1"></i> ${req.location}
          </p>
        </div>

        <div class="text-right shrink-0">
          <span class="text-[10px] text-slate-400 dark:text-slate-500 block mb-2"><i class="far fa-clock mr-1"></i> ${req.time}</span>
          <button onclick="volunteerForSOS('${req.patient}', '${req.group}')" class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-md shadow-md transition">
            Donate
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = outputHtml;
}

window.volunteerForSOS = (patient, grp) => {
  showToast(`Thank you! Request details sent. Contacting guardians of ${patient}...`, 'success');
};

function handleSOSBroadcast(e) {
  e.preventDefault();

  const nameInput = document.getElementById('sos-name');
  const groupInput = document.getElementById('sos-group');
  const unitsInput = document.getElementById('sos-units');
  const hospitalInput = document.getElementById('sos-hospital');
  const contactInput = document.getElementById('sos-contact');
  const locationInput = document.getElementById('sos-location');

  if (!nameInput.value || !hospitalInput.value || !contactInput.value || !locationInput.value) {
    showToast('Please fill in all details before broadcasting.', 'error');
    return;
  }

  // Trigger loading broadcast radar simulation popup
  const radarPopup = document.getElementById('sos-radar-popup');
  if (radarPopup) {
    radarPopup.classList.remove('hidden');
    radarPopup.classList.add('flex');

    // Step 1: Scan
    setTimeout(async () => {
      try {
        const response = await fetch('/api/sos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            patient: nameInput.value,
            group: groupInput.value,
            units: parseInt(unitsInput.value) || 1,
            hospital: hospitalInput.value,
            phone: contactInput.value,
            location: locationInput.value
          })
        });

        if (response.ok) {
          const resData = await response.json();
          AppState.sosRequests.unshift(resData.request);
        } else {
          // Fallback if backend server error
          const newReq = {
            id: Date.now(),
            patient: nameInput.value,
            group: groupInput.value,
            units: parseInt(unitsInput.value) || 1,
            hospital: hospitalInput.value,
            phone: contactInput.value,
            location: locationInput.value,
            time: "Just now",
            active: true
          };
          AppState.sosRequests.unshift(newReq);
        }
      } catch (err) {
        console.warn('API POST failed. Registering SOS request locally.', err);
        // Fallback if backend server unreachable
        const newReq = {
          id: Date.now(),
          patient: nameInput.value,
          group: groupInput.value,
          units: parseInt(unitsInput.value) || 1,
          hospital: hospitalInput.value,
          phone: contactInput.value,
          location: locationInput.value,
          time: "Just now",
          active: true
        };
        AppState.sosRequests.unshift(newReq);
      }
      
      // Clear form
      nameInput.value = '';
      unitsInput.value = '1';
      hospitalInput.value = '';
      contactInput.value = '';
      locationInput.value = '';

      // Hide loading pop, show success alert
      radarPopup.classList.add('hidden');
      radarPopup.classList.remove('flex');

      const successPopup = document.getElementById('sos-success-popup');
      if (successPopup) {
        successPopup.classList.remove('hidden');
        successPopup.classList.add('flex');
      }

      renderRecentSOSList();
      showToast('SOS Broadcast sent to nearby network registers.', 'success');
    }, 3200); // 3.2s scan animation
  }
}

window.closeSOSSuccessPopup = () => {
  const popup = document.getElementById('sos-success-popup');
  if (popup) {
    popup.classList.add('hidden');
    popup.classList.remove('flex');
  }
};


// Chart.js Analytics Dashboard rendering
function renderAnalyticsCharts() {
  const ctxDistribution = document.getElementById('chart-distribution');
  const ctxWeekly = document.getElementById('chart-weekly');
  const ctxMonthly = document.getElementById('chart-monthly');

  if (!ctxDistribution || !ctxWeekly || !ctxMonthly) return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  // Destroy old charts to prevent duplicate draw glitch
  if (AppState.charts.distribution) AppState.charts.distribution.destroy();
  if (AppState.charts.weekly) AppState.charts.weekly.destroy();
  if (AppState.charts.monthly) AppState.charts.monthly.destroy();

  // Chart 1: Blood Group Distribution
  AppState.charts.distribution = new Chart(ctxDistribution, {
    type: 'doughnut',
    data: {
      labels: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      datasets: [{
        label: 'Stock distribution',
        data: [119, 39, 99, 32, 66, 16, 140, 54],
        backgroundColor: [
          '#ef4444', '#f87171', '#0ea5e9', '#38bdf8',
          '#a855f7', '#c084fc', '#f97316', '#fb923c'
        ],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, font: { family: 'Outfit', size: 11 } }
        }
      }
    }
  });

  // Chart 2: Weekly Requests
  AppState.charts.weekly = new Chart(ctxWeekly, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Urgent SOS Signals',
        data: [12, 19, 8, 15, 22, 14, 25],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: '#ef4444',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Outfit' } },
          border: { dash: [4, 4] }
        }
      }
    }
  });

  // Chart 3: Monthly Donations
  AppState.charts.monthly = new Chart(ctxMonthly, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Donated Units',
        data: [250, 310, 480, 400, 520, 680],
        backgroundColor: 'rgba(14, 165, 233, 0.85)',
        hoverBackgroundColor: '#0ea5e9',
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Outfit' } },
          border: { dash: [4, 4] }
        }
      }
    }
  });
}


// Animated Counters Engine
function animateCounters() {
  const counters = document.querySelectorAll('.counter-value');
  
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target')) || 0;
    const duration = 1500; // 1.5s
    const stepTime = 20; // 20ms steps
    const stepCount = duration / stepTime;
    const increment = target / stepCount;
    
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = Math.round(target).toLocaleString();
        clearInterval(interval);
      } else {
        counter.textContent = Math.round(current).toLocaleString();
      }
    }, stepTime);
  });
}


// Toast Notifications Engine
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item glass flex items-center gap-3 p-4 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 text-sm max-w-sm pointer-events-auto transition duration-300`;
  
  let icon = '<i class="fas fa-info-circle text-blue-500 text-base"></i>';
  if (type === 'success') icon = '<i class="fas fa-check-circle text-green-500 text-base"></i>';
  if (type === 'error') icon = '<i class="fas fa-exclamation-circle text-red-500 text-base"></i>';

  toast.innerHTML = `
    <div class="shrink-0">${icon}</div>
    <div class="flex-grow font-medium text-slate-700 dark:text-slate-200">${message}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"><i class="fas fa-times"></i></button>
  `;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}


// Scroll Progress and Back-to-top Tracker
function initScrollProgress() {
  const scrollProgress = document.getElementById('scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight <= 0) return;
      const scrolled = (window.scrollY / windowHeight) * 100;
      scrollProgress.style.width = `${scrolled}%`;
    });
  }
}

function initBackToTop() {
  const backToTopBtn = document.getElementById('btn-back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}


// Setup Form Handlers & FAQ accordions
function setupEventListeners() {
  // Theme Toggle Button
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  // FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        // Close others
        faqItems.forEach(other => {
          if (other !== item) other.classList.remove('active');
        });
        item.classList.toggle('active');
      });
    }
  });

  // Home Page Location Search Form
  const homeSearchForm = document.getElementById('home-search-form');
  if (homeSearchForm) {
    homeSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const loc = document.getElementById('home-location').value;
      const grp = document.getElementById('home-blood-group').value;
      
      showToast(`Searching for blood type ${grp} near ${loc || 'current location'}...`, 'info');
      
      // Transfer search query to map or availability and navigate
      navigateTo('map');
      if (loc) {
        const mapSearch = document.getElementById('map-search-input');
        if (mapSearch) {
          mapSearch.value = loc;
          // Trigger search after Leaflet loads
          setTimeout(() => {
            handleMapSearch(e);
          }, 300);
        }
      }
    });
  }

  // Map Filter Button Click Bindings
  const mapFilterAll = document.getElementById('map-filter-all');
  const mapFilterAvail = document.getElementById('map-filter-available');
  const mapFilterLow = document.getElementById('map-filter-low');
  const mapFilterOut = document.getElementById('map-filter-out');

  if (mapFilterAll) mapFilterAll.addEventListener('click', () => filterMap('all'));
  if (mapFilterAvail) mapFilterAvail.addEventListener('click', () => filterMap('available'));
  if (mapFilterLow) mapFilterLow.addEventListener('click', () => filterMap('low'));
  if (mapFilterOut) mapFilterOut.addEventListener('click', () => filterMap('out'));

  const mapSearchForm = document.getElementById('map-search-form');
  if (mapSearchForm) mapSearchForm.addEventListener('submit', handleMapSearch);

  // Blood Availability Search Form
  const availSearchInput = document.getElementById('availability-search');
  const availGroupSelect = document.getElementById('availability-filter-group');
  
  if (availSearchInput) availSearchInput.addEventListener('input', handleAvailabilitySearch);
  if (availGroupSelect) availGroupSelect.addEventListener('change', handleAvailabilitySearch);

  // Donor Search Filters
  const donorSearchInput = document.getElementById('donor-search');
  const donorGroupSelect = document.getElementById('donor-filter-group');
  const donorCitySelect = document.getElementById('donor-filter-city');

  if (donorSearchInput) donorSearchInput.addEventListener('input', renderDonorDirectory);
  if (donorGroupSelect) donorGroupSelect.addEventListener('change', renderDonorDirectory);
  if (donorCitySelect) donorCitySelect.addEventListener('change', renderDonorDirectory);

  // SOS Broadcast Form Submit
  const sosForm = document.getElementById('sos-broadcast-form');
  if (sosForm) sosForm.addEventListener('submit', handleSOSBroadcast);
}
