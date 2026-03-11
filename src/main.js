import './style.css';
import { renderSidebar } from './components/sidebar.js';
import { registerRoute, renderRoute, navigate } from './router.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderMotoristas } from './pages/motoristas.js';
import { renderVeiculos } from './pages/veiculos.js';
import { renderMDFeEmissao } from './pages/mdfe-emissao.js';
import { renderMDFeLista } from './pages/mdfe-lista.js';
import { renderEmpresa } from './pages/empresa.js';
import { renderConfiguracoes } from './pages/configuracoes.js';
import { renderLogin } from './pages/login.js';
import { getCurrentUser, login as authLogin, logout as authLogout } from './store/dataStore.js';

// Register routes
registerRoute('/dashboard', renderDashboard);
registerRoute('/motoristas', renderMotoristas);
registerRoute('/veiculos', renderVeiculos);
registerRoute('/mdfe-emissao', renderMDFeEmissao);
registerRoute('/mdfe-lista', renderMDFeLista);
registerRoute('/empresa', renderEmpresa);
registerRoute('/configuracoes', renderConfiguracoes);
registerRoute('/login', renderLogin);

// Build app layout
function initApp() {
  const app = document.getElementById('app');
  const user = getCurrentUser();

  if (!user) {
    app.innerHTML = `<div id="page-content"></div>`;
    renderRoute();
    return;
  }

  app.innerHTML = `
    <button class="mobile-menu-btn" id="mobile-menu-btn">
      <i class="fa-solid fa-bars"></i>
    </button>
    <div class="app-layout">
      ${renderSidebar()}
      <main class="main-content" id="page-content">
        <div class="loading"><div class="spinner"></div></div>
      </main>
    </div>
  `;

  // Mobile menu toggle
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  renderRoute();
}

// Global Handlers
window.handleLogin = async (username, password) => {
  const success = await authLogin(username, password);
  if (success) {
    initApp();
    navigate('/dashboard');
    return true;
  }
  return false;
};

window.handleLogout = () => {
  authLogout();
  initApp();
  navigate('/login');
};

// Start app
initApp();
