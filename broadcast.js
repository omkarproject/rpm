(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Inject HTML
    const broadcastHTML = `
      <!-- Banner -->
      <div id="sys-broadcast-banner" class="fixed top-0 left-0 right-0 z-[100000] hidden transform -translate-y-full transition-transform duration-500 shadow-2xl">
        <div class="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div class="flex items-center gap-4">
            <div id="sys-broadcast-icon" class="text-2xl text-white">🔔</div>
            <div>
              <h4 id="sys-broadcast-banner-title" class="text-white font-black text-sm md:text-base leading-tight"></h4>
              <p id="sys-broadcast-banner-desc" class="text-white/90 font-medium text-xs md:text-sm mt-0.5"></p>
            </div>
          </div>
          <button id="sys-broadcast-banner-close" class="text-white/80 hover:text-white p-2">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>

      <!-- Modal (Red) -->
      <div id="sys-broadcast-modal" class="fixed inset-0 z-[100000] hidden flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
        <!-- Content -->
        <div class="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-zoomIn border-2 border-red-500">
          <div class="bg-red-500 p-6 flex flex-col items-center text-center">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl text-white mb-4 animate-pulse">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h2 id="sys-broadcast-modal-title" class="text-white text-2xl font-black"></h2>
          </div>
          <div class="p-6 md:p-8 text-center">
            <p id="sys-broadcast-modal-desc" class="text-slate-600 dark:text-slate-300 text-base md:text-lg mb-8 font-medium"></p>
            <button id="sys-broadcast-modal-close" class="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
              Acknowledge & Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', broadcastHTML);

    const banner = document.getElementById('sys-broadcast-banner');
    const modal = document.getElementById('sys-broadcast-modal');
    
    let currentDisplayedId = null;
    let hideTimeout;

    // Identify current app
    let currentApp = 'admin';
    const path = window.location.pathname;
    if (path.includes('driver_request')) currentApp = 'driver';
    else if (path.includes('diesel_filled')) currentApp = 'station';

    // Helper: get seen broadcasts array
    // Store in-memory only so it resets on page reload/reopen
    const inMemorySeenList = [];
    function getSeenList() {
      return inMemorySeenList;
    }
    
    function markAsSeen(id) {
      if (!inMemorySeenList.includes(id)) {
        inMemorySeenList.push(id);
      }
    }

    document.getElementById('sys-broadcast-banner-close').addEventListener('click', () => {
      banner.classList.add('-translate-y-full');
      setTimeout(() => banner.classList.add('hidden'), 500);
      if (currentDisplayedId) markAsSeen(currentDisplayedId);
      currentDisplayedId = null;
    });

    document.getElementById('sys-broadcast-modal-close').addEventListener('click', () => {
      modal.classList.add('hidden');
      if (currentDisplayedId) markAsSeen(currentDisplayedId);
      currentDisplayedId = null;
      // Refresh listener to check for next queued broadcasts
      if (window._triggerBroadcastCheck) window._triggerBroadcastCheck();
    });

    setTimeout(() => {
      if (typeof db !== 'undefined') {
        startBroadcastListener(db);
        startBrandingListener(db);
      } else if (typeof firebase !== 'undefined') {
        startBroadcastListener(firebase.database());
        startBrandingListener(firebase.database());
      }
    }, 1000);

    function startBroadcastListener(database) {
      // Create a global trigger to re-check queue when a modal is closed
      let lastSnapData = {};
      window._triggerBroadcastCheck = function() {
        processBroadcasts(lastSnapData);
      };

      database.ref('broadcasts/active').on('value', snap => {
        const data = snap.val() || {};
        lastSnapData = data;
        processBroadcasts(data);
      });

      function processBroadcasts(data) {
        // If current broadcast was deleted by admin, hide it immediately!
        if (currentDisplayedId && !data[currentDisplayedId]) {
          banner.classList.add('-translate-y-full');
          setTimeout(() => banner.classList.add('hidden'), 500);
          modal.classList.add('hidden');
          currentDisplayedId = null;
        }

        const seenList = getSeenList();

        // Find the oldest broadcast that is active, matches our target, and we haven't seen yet
        let broadcastToShow = null;
        const keys = Object.keys(data).sort();
        
        for (const key of keys) {
          const b = data[key];
          if (b.target !== 'all' && b.target !== currentApp) continue;
          if (seenList.includes(b.id)) continue;
          
          broadcastToShow = b;
          break; // Stop at the first unseen one
        }

        // Show it if we aren't already displaying something
        if (broadcastToShow && !currentDisplayedId) {
          currentDisplayedId = broadcastToShow.id;
          
          clearTimeout(hideTimeout);
          banner.classList.add('hidden', '-translate-y-full');
          modal.classList.add('hidden');

          if (broadcastToShow.level === 'red') {
            document.getElementById('sys-broadcast-modal-title').innerText = broadcastToShow.header;
            document.getElementById('sys-broadcast-modal-desc').innerText = broadcastToShow.description;
            modal.classList.remove('hidden');
            // Red modals are marked as seen ONLY when user clicks Acknowledge & Close
          } else {
            document.getElementById('sys-broadcast-banner-title').innerText = broadcastToShow.header;
            document.getElementById('sys-broadcast-banner-desc').innerText = broadcastToShow.description;
            
            banner.className = 'fixed top-0 left-0 right-0 z-[100000] transform transition-transform duration-500 shadow-2xl';
            if (broadcastToShow.level === 'yellow') {
              banner.classList.add('bg-amber-500', 'animate-pulse');
            } else {
              banner.classList.add('bg-emerald-600');
            }
            
            requestAnimationFrame(() => {
              banner.classList.remove('-translate-y-full');
            });

            // Auto hide and mark as seen for non-red after 10s
            hideTimeout = setTimeout(() => {
              banner.classList.add('-translate-y-full');
              setTimeout(() => banner.classList.add('hidden'), 500);
              markAsSeen(broadcastToShow.id);
              currentDisplayedId = null;
              if (window._triggerBroadcastCheck) window._triggerBroadcastCheck(); // Check for more
            }, 10000);
          }
        }
      }
    }

    // Global Branding Listener
    function startBrandingListener(database) {
      database.ref('settings/branding').on('value', snap => {
        let rawData = snap.val();
        if (!rawData) return;
        
        // Handle migration from old format where it wasn't keyed by target
        if (rawData.appName || rawData.logoUrl || rawData.faviconUrl) {
          if (!rawData.all && !rawData.admin && !rawData.driver && !rawData.station) {
            rawData = { all: rawData };
          }
        }

        const globalConfig = rawData['all'] || {};
        const appConfig = rawData[currentApp] || {};

        // Merge appConfig over globalConfig
        const data = {
          appName: appConfig.appName || globalConfig.appName,
          faviconUrl: appConfig.faviconUrl || globalConfig.faviconUrl,
          logoUrl: appConfig.logoUrl || globalConfig.logoUrl
        };

        // 1. Update Title
        if (data.appName) {
          document.title = data.appName;
          
          const nameElements = document.querySelectorAll('.sys-brand-name');
          nameElements.forEach(el => el.textContent = data.appName);
        }

        // 2. Update Favicon
        if (data.faviconUrl) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          } else {
            // Remove the old link completely to force Chrome/WebKit to refresh the favicon
            link.parentNode.removeChild(link);
            let newLink = document.createElement('link');
            newLink.rel = 'icon';
            link = newLink;
            document.head.appendChild(link);
          }
          link.href = data.faviconUrl;
        }

        // 3. Update Logos
        if (data.logoUrl) {
          const logoElements = document.querySelectorAll('.sys-brand-logo');
          logoElements.forEach(img => {
            img.src = data.logoUrl;
          });
        }
      });
    }

  });
})();
