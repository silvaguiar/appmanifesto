// ============================================
// Dashboard Page
// ============================================

import { getEstatisticas, getMDFes, getMotoristaById } from '../store/dataStore.js';
import { navigate } from '../router.js';

function goToLista(filter) {
  window.mdfeFilter = filter || 'todos';
  navigate('/mdfe-lista');
}

export async function renderDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const stats = await getEstatisticas();
  const allMdfes = await getMDFes();
  const mdfes = allMdfes.slice(0, 8);

  // Pre-fetch motorista names for recent MDFes
  const motoristaNames = {};
  for (const mdfe of mdfes) {
    if (mdfe.motoristaId && !motoristaNames[mdfe.motoristaId]) {
      const mot = await getMotoristaById(mdfe.motoristaId);
      motoristaNames[mdfe.motoristaId] = mot ? mot.nome : '-';
    }
  }

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h2>Dashboard</h2>
        <p>Visão geral do sistema de emissão de MDF-e</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card primary" onclick="window.goToLista('todos')" style="cursor:pointer" title="Ver todos os MDF-e">
          <div class="stat-card-icon">
            <i class="fa-solid fa-file-lines"></i>
          </div>
          <div class="stat-card-value">${stats.totalMDFe}</div>
          <div class="stat-card-label">Total de MDF-e</div>
        </div>
        
        <div class="stat-card success" onclick="window.goToLista('autorizado')" style="cursor:pointer" title="Ver autorizados">
          <div class="stat-card-icon">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <div class="stat-card-value">${stats.autorizados}</div>
          <div class="stat-card-label">Autorizados</div>
        </div>
        
        <div class="stat-card warning" onclick="window.goToLista('encerrado')" style="cursor:pointer" title="Ver encerrados">
          <div class="stat-card-icon">
            <i class="fa-solid fa-lock"></i>
          </div>
          <div class="stat-card-value">${stats.encerrados}</div>
          <div class="stat-card-label">Encerrados</div>
        </div>

        <div class="stat-card danger" onclick="window.goToLista('erro_autorizacao')" style="cursor:pointer" title="Ver MDF-e rejeitados">
          <div class="stat-card-icon">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="stat-card-value">${stats.rejeicoes}</div>
          <div class="stat-card-label">Com Rejeição</div>
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
                  ${mdfes.map(mdfe => `
                      <tr>
                        <td style="font-weight:600; color:var(--text-primary)">${String(mdfe.numero).padStart(6, '0')}</td>
                        <td>${motoristaNames[mdfe.motoristaId] || '-'}</td>
                        <td>${mdfe.ufInicio || '-'} → ${mdfe.ufFim || '-'}</td>
                        <td>${getStatusBadge(mdfe.status)}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  window.goToLista = goToLista;
}

function getStatusBadge(status) {
  const badges = {
    autorizado: '<span class="badge badge-success"><i class="fa-solid fa-circle" style="font-size:6px"></i> Autorizado</span>',
    encerrado: '<span class="badge badge-warning"><i class="fa-solid fa-circle" style="font-size:6px"></i> Encerrado</span>',
    cancelado: '<span class="badge badge-danger"><i class="fa-solid fa-circle" style="font-size:6px"></i> Cancelado</span>',
    processando_autorizacao: '<span class="badge badge-info"><i class="fa-solid fa-spinner fa-spin" style="font-size:6px"></i> Processando</span>',
    erro_autorizacao: '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation" style="font-size:8px"></i> Rejeitado</span>',
  };
  return badges[status] || '<span class="badge badge-info">-</span>';
}
