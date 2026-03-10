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

// Register routes
registerRoute('/dashboard', renderDashboard);
registerRoute('/motoristas', renderMotoristas);
registerRoute('/veiculos', renderVeiculos);
registerRoute('/mdfe-emissao', renderMDFeEmissao);
registerRoute('/mdfe-lista', renderMDFeLista);
registerRoute('/empresa', renderEmpresa);
registerRoute('/configuracoes', renderConfiguracoes);

// Build app layout
function initApp() {
  const app = document.getElementById('app');
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

  // Navigate to initial route
  const hash = window.location.hash.slice(1);
  if (hash) {
    renderRoute();
  } else {
    navigate('/dashboard');
  }
}

// Start app
initApp();
