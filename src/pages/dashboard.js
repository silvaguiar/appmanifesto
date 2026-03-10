// ============================================
// Dashboard Page
// ============================================

import { getEstatisticas, getMDFes, getMotoristaById, getVeiculoById } from '../store/dataStore.js';

export function renderDashboard() {
    const stats = getEstatisticas();
    const mdfes = getMDFes().sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, 8);

    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h2>Dashboard</h2>
        <p>Visão geral do sistema de emissão de MDF-e</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-card-icon">
            <i class="fa-solid fa-file-lines"></i>
          </div>
          <div class="stat-card-value">${stats.totalMDFe}</div>
          <div class="stat-card-label">Total de MDF-e</div>
        </div>
        
        <div class="stat-card success">
          <div class="stat-card-icon">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div class="stat-card-value">${stats.autorizados}</div>
          <div class="stat-card-label">Autorizados</div>
        </div>
        
        <div class="stat-card warning">
          <div class="stat-card-icon">
            <i class="fa-solid fa-lock"></i>
          </div>
          <div class="stat-card-value">${stats.encerrados}</div>
          <div class="stat-card-label">Encerrados</div>
        </div>

        <div class="stat-card info">
          <div class="stat-card-icon">
            <i class="fa-solid fa-users"></i>
          </div>
          <div class="stat-card-value">${stats.totalMotoristas}</div>
          <div class="stat-card-label">Motoristas Ativos</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <!-- Quick Actions -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-bolt" style="color:var(--warning); margin-right:8px"></i>Ações Rápidas</h3>
          </div>
          <div class="card-body">
            <div style="display:flex; flex-direction:column; gap:10px;">
              <button class="btn btn-primary btn-lg" onclick="window.navigateTo('/mdfe-emissao')" style="justify-content:center; width:100%">
                <i class="fa-solid fa-plus"></i> Emitir Novo MDF-e
              </button>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button class="btn btn-secondary" onclick="window.navigateTo('/motoristas')" style="justify-content:center">
                  <i class="fa-solid fa-id-card"></i> Motoristas
                </button>
                <button class="btn btn-secondary" onclick="window.navigateTo('/veiculos')" style="justify-content:center">
                  <i class="fa-solid fa-truck"></i> Veículos
                </button>
              </div>
            </div>

            <div style="margin-top:24px; padding:16px; background: rgba(99,102,241,0.06); border-radius:var(--radius-md); border: 1px solid rgba(99,102,241,0.12);">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <i class="fa-solid fa-chart-pie" style="color:var(--primary-300)"></i>
                <span style="font-size:0.82rem; font-weight:600; color:var(--primary-300)">Resumo de Veículos</span>
              </div>
              <div style="font-size:2rem; font-weight:700;">${stats.totalVeiculos}</div>
              <div style="font-size:0.78rem; color:var(--text-muted);">veículos cadastrados</div>
            </div>
          </div>
        </div>

        <!-- Recent MDF-e -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--info); margin-right:8px"></i>MDF-e Recentes</h3>
            <button class="btn btn-sm btn-secondary" onclick="window.navigateTo('/mdfe-lista')">Ver Todos</button>
          </div>
          <div class="card-body" style="padding: 0;">
            ${mdfes.length === 0 ? `
              <div class="empty-state">
                <i class="fa-solid fa-file-circle-plus"></i>
                <h4>Nenhum MDF-e emitido</h4>
                <p>Comece emitindo seu primeiro MDF-e</p>
              </div>
            ` : `
              <table class="table">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Motorista</th>
                    <th>Rota</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${mdfes.map(mdfe => {
        const motorista = getMotoristaById(mdfe.motoristaId);
        const statusBadge = getStatusBadge(mdfe.status);
        return `
                      <tr>
                        <td style="font-weight:600; color:var(--text-primary)">${String(mdfe.numero).padStart(6, '0')}</td>
                        <td>${motorista ? motorista.nome : '-'}</td>
                        <td>${mdfe.ufInicio || '-'} → ${mdfe.ufFim || '-'}</td>
                        <td>${statusBadge}</td>
                      </tr>
                    `;
    }).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getStatusBadge(status) {
    const badges = {
        autorizado: '<span class="badge badge-success"><i class="fa-solid fa-circle" style="font-size:6px"></i> Autorizado</span>',
        encerrado: '<span class="badge badge-warning"><i class="fa-solid fa-circle" style="font-size:6px"></i> Encerrado</span>',
        cancelado: '<span class="badge badge-danger"><i class="fa-solid fa-circle" style="font-size:6px"></i> Cancelado</span>',
    };
    return badges[status] || '<span class="badge badge-info">-</span>';
}
