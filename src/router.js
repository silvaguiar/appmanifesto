// ============================================
// Simple Router with Auth Support
import { getCurrentUser, isAdmin } from './store/dataStore.js';
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

export async function renderRoute() {
    const path = getCurrentRoute();
    const user = getCurrentUser();

    // 1. If not logged in and not on login page, go to login
    if (!user && path !== '/login') {
        navigate('/login');
        return;
    }

    // 2. If logged in and on login page, go to dashboard
    if (user && path === '/login') {
        navigate('/dashboard');
        return;
    }

    // 3. Admin restricted routes
    if (path === '/configuracoes' && !isAdmin()) {
        alert('Acesso negado: Somente administradores podem acessar as configurações.');
        navigate('/dashboard');
        return;
    }

    const handler = routes[path];
    if (handler) {
        await handler();
    } else {
        // Default: dashboard or login
        const defaultPath = user ? '/dashboard' : '/login';
        if (routes[defaultPath]) await routes[defaultPath]();
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
