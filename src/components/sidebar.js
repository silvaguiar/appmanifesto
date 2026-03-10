// ============================================
// Sidebar Component
// ============================================

import { navigate, getCurrentRoute } from '../router.js';

export function renderSidebar() {
  const menuItems = [
    { icon: 'fa-gauge-high', label: 'Dashboard', route: '/dashboard' },
    { icon: 'fa-file-lines', label: 'Emitir MDF-e', route: '/mdfe-emissao' },
    { icon: 'fa-list', label: 'MDF-e Emitidos', route: '/mdfe-lista' },
    { section: 'Cadastros' },
    { icon: 'fa-id-card', label: 'Motoristas', route: '/motoristas' },
    { icon: 'fa-truck', label: 'Veículos', route: '/veiculos' },
    { icon: 'fa-building', label: 'Empresa', route: '/empresa' },
    { section: 'Sistema' },
    { icon: 'fa-gear', label: 'Configurações', route: '/configuracoes' },
  ];

  const currentRoute = getCurrentRoute();

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">
            <i class="fa-solid fa-route"></i>
          </div>
          <div class="sidebar-logo-text">
            <h1>MDF-e</h1>
            <span>Sistema de Emissão</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Menu Principal</div>
        ${menuItems.map(item => {
    if (item.section) {
      return `<div class="nav-section-title" style="margin-top: 12px">${item.section}</div>`;
    }
    const isActive = currentRoute === item.route ? 'active' : '';
    return `
            <div class="nav-item ${isActive}" data-route="${item.route}" onclick="window.navigateTo('${item.route}')">
              <i class="fa-solid ${item.icon}"></i>
              <span>${item.label}</span>
            </div>
          `;
  }).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="user-pill">
          <div class="user-avatar">
            <i class="fa-solid fa-user"></i>
          </div>
          <div class="user-info">
            <div class="user-info-name">Administrador</div>
            <div class="user-info-role">Sistema MDF-e</div>
          </div>
          <i class="fa-solid fa-ellipsis-vertical" style="color: var(--text-muted)"></i>
        </div>
      </div>
    </aside>
  `;
}

// Global function for onclick navigation
window.navigateTo = function (route) {
  navigate(route);
};
