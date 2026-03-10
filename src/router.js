// ============================================
// Simple Router
// ============================================

const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) {
    routes[path] = handler;
}

export function navigate(path) {
    currentRoute = path;
    window.location.hash = path;
    renderRoute();
}

export function getCurrentRoute() {
    return currentRoute || window.location.hash.slice(1) || '/dashboard';
}

export function renderRoute() {
    const path = getCurrentRoute();
    const handler = routes[path];
    if (handler) {
        handler();
    } else {
        // Default: dashboard
        if (routes['/dashboard']) routes['/dashboard']();
    }

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        const itemPath = item.getAttribute('data-route');
        item.classList.toggle('active', itemPath === path);
    });
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
    currentRoute = window.location.hash.slice(1);
    renderRoute();
});
