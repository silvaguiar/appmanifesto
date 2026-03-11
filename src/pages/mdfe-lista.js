import { getMDFes, getMotoristaById, getVeiculoById, getMDFeById, deleteMDFe, updateMDFeStatus, getEmpresa, getMotoristas, getVeiculos } from '../store/dataStore.js';
import { formatarCPF, formatarChaveAcesso, UFS } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import * as focus from '../services/focusNfe.js';
import { navigate } from '../router.js';

let filterStatus = 'todos';
let searchTerm = '';
let cacheMotoristas = [];
let cacheVeiculos = [];

export async function renderMDFeLista() {
  // Check if a filter was set by the dashboard cards
  if (window.mdfeFilter) {
    filterStatus = window.mdfeFilter;
    window.mdfeFilter = null; // consume it
  }

  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const [allMdfes, allMotoristas, allVeiculos] = await Promise.all([
    getMDFes(),
    getMotoristas(),
    getVeiculos()
  ]);

  cacheMotoristas = allMotoristas;
  cacheVeiculos = allVeiculos;

  let mdfes = allMdfes.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

  if (filterStatus !== 'todos') mdfes = mdfes.filter(m => m.status === filterStatus);
  if (searchTerm) {
    const t = searchTerm.toLowerCase();
    mdfes = mdfes.filter(m => {
      const mot = cacheMotoristas.find(x => x.id === m.motoristaId);
      return String(m.numero).includes(t) || (mot && mot.nome.toLowerCase().includes(t)) || (m.chaveMdfe || m.chaveAcesso || '').includes(t);
    });
  }

  const statusFilters = ['todos', 'processando_autorizacao', 'autorizado', 'encerrado', 'erro_autorizacao', 'cancelado'];
  const statusLabels = { todos: 'Todos', processando_autorizacao: 'Processando', autorizado: 'Autorizados', encerrado: 'Encerrados', erro_autorizacao: 'Rejeitados', cancelado: 'Cancelados' };

  content.innerHTML = `<div class="fade-in">
    <div class="page-header page-header-actions">
      <div><h2>MDF-e Emitidos</h2><p>Consulte e gerencie os manifestos eletrônicos</p></div>
      <button class="btn btn-primary" id="btn-novo-mdfe"><i class="fa-solid fa-plus"></i> Novo MDF-e</button>
    </div>
    <div class="toolbar">
      <div class="search-bar"><i class="fa-solid fa-search"></i><input type="text" class="form-control" id="search-mdfe" placeholder="Buscar por nº, motorista..." value="${searchTerm}"></div>
      <div class="filter-pills">
        ${statusFilters.map(f => `<button class="filter-pill ${filterStatus === f ? 'active' : ''}" data-filter="${f}">${statusLabels[f]}</button>`).join('')}
      </div>
      <div class="toolbar-spacer"></div>
      <span class="text-muted" style="font-size:0.82rem">${mdfes.length} registro(s)</span>
    </div>
    ${mdfes.length === 0 ? `<div class="card"><div class="empty-state"><i class="fa-solid fa-file-lines"></i><h4>Nenhum MDF-e encontrado</h4><p>Emita seu primeiro MDF-e ou ajuste os filtros</p></div></div>` : `
    <div class="table-container"><table class="table"><thead><tr>
      <th>Número</th><th>Data</th><th>Motorista</th><th>Veículo</th><th>Rota</th><th>Valor</th><th>Status</th><th style="width:200px">Ações</th>
    </tr></thead><tbody>
      ${mdfes.map(m => {
    const mot = cacheMotoristas.find(x => x.id === m.motoristaId);
    const veic = cacheVeiculos.find(x => x.id === m.veiculoId);
    const dt = new Date(m.dtEmissao || m.criadoEm).toLocaleDateString('pt-BR');
    return `<tr>
          <td style="font-weight:700;color:var(--text-primary);font-family:monospace">${m.numeroSefaz || String(m.numero).padStart(6, '0')}</td>
          <td>${dt}</td>
          <td>${mot ? mot.nome : '-'}</td>
          <td style="font-family:monospace">${veic ? veic.placa : '-'}</td>
          <td>${m.ufInicio} → ${m.ufFim}</td>
          <td>R$ ${Number(m.valorCarga || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td>${getStatusBadge(m.status)}</td>
          <td><div class="actions">
            ${m.status === 'erro_autorizacao' || m.status === 'encerrado' || m.status === 'cancelado' || m.status === 'autorizado' || m.status === 'processando_autorizacao' ? `
              <button class="btn btn-sm btn-info btn-duplicar" data-id="${m.id}" title="Duplicar / Criar Novo" style="color:#fff"><i class="fa-solid fa-copy"></i></button>
            `: ''}
            <button class="btn btn-sm btn-light btn-view" data-id="${m.id}" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
            ${m.status === 'autorizado' ? `
              <button class="btn btn-sm btn-secondary btn-print" data-id="${m.id}" title="Imprimir DAMDFE"><i class="fa-solid fa-print"></i></button>
              <button class="btn btn-sm btn-success btn-encerrar" data-id="${m.id}" title="Encerrar na SEFAZ"><i class="fa-solid fa-lock"></i></button>
              <button class="btn btn-sm btn-danger btn-cancelar" data-id="${m.id}" title="Cancelar na SEFAZ"><i class="fa-solid fa-ban"></i></button>
            `: ''}
            ${m.status === 'processando_autorizacao' ? `
              <button class="btn btn-sm btn-secondary btn-refresh" data-id="${m.id}" title="Atualizar Status"><i class="fa-solid fa-arrows-rotate"></i></button>
              <button class="btn btn-sm btn-danger btn-delete-local" data-id="${m.id}" title="Excluir (sem vínculo SEFAZ)"><i class="fa-solid fa-trash"></i></button>
            `: ''}
            ${(m.status === 'processando_autorizacao' || m.status === 'erro_autorizacao') ? `
              <button class="btn btn-sm btn-primary btn-reprocessar" data-id="${m.id}" title="Reprocessar / Reenviar para SEFAZ"><i class="fa-solid fa-paper-plane"></i></button>
            `: ''}
            ${m.status === 'erro_autorizacao' ? `
              <button class="btn btn-sm btn-warning btn-manutencao" data-id="${m.id}" title="Manutenção / Editar"><i class="fa-solid fa-wrench"></i></button>
            `: ''}
          </div></td>
        </tr>
        ${m.status === 'erro_autorizacao' && m.mensagemSefaz ? `<tr><td colspan="8" style="padding:8px 18px;background:rgba(248,113,113,0.06);border-bottom:1px solid rgba(248,113,113,0.1)">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-circle-exclamation" style="color:var(--danger)"></i>
            <span style="font-size:0.8rem;color:var(--danger)"><strong>Rejeição SEFAZ${m.statusSefaz ? ' (' + m.statusSefaz + ')' : ''}:</strong> ${m.mensagemSefaz}</span>
          </div>
        </td></tr>`: ''}`;
  }).join('')}
    </tbody></table></div>`}
  </div>`;

  // Events
  document.getElementById('btn-novo-mdfe')?.addEventListener('click', () => navigate('/mdfe-emissao'));
  document.getElementById('search-mdfe')?.addEventListener('input', e => { searchTerm = e.target.value; renderMDFeLista(); });
  document.querySelectorAll('.filter-pill').forEach(p => p.addEventListener('click', () => { filterStatus = p.dataset.filter; renderMDFeLista(); }));
  document.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', () => viewMDFe(b.dataset.id)));
  document.querySelectorAll('.btn-print').forEach(b => b.addEventListener('click', () => printDAMDFE(b.dataset.id)));
  document.querySelectorAll('.btn-encerrar').forEach(b => b.addEventListener('click', () => doEncerrar(b.dataset.id)));
  document.querySelectorAll('.btn-cancelar').forEach(b => b.addEventListener('click', () => doCancelar(b.dataset.id)));
  document.querySelectorAll('.btn-refresh').forEach(b => b.addEventListener('click', () => refreshStatus(b.dataset.id)));
  document.querySelectorAll('.btn-manutencao').forEach(b => b.addEventListener('click', () => doManutencao(b.dataset.id)));
  document.querySelectorAll('.btn-reprocessar').forEach(b => b.addEventListener('click', () => doReprocessar(b.dataset.id)));
  document.querySelectorAll('.btn-duplicar').forEach(b => b.addEventListener('click', () => doDuplicar(b.dataset.id)));
  document.querySelectorAll('.btn-delete-local').forEach(b => b.addEventListener('click', () => doDeleteLocal(b.dataset.id)));
}

// ---- Duplicar MDF-e ----
async function doDuplicar(id) {
  const m = await getMDFeById(id);
  if (!m) return;

  // Clone object
  const clone = JSON.parse(JSON.stringify(m));

  // Remove fields specific to the old emission
  delete clone.id;
  delete clone.numero;
  delete clone.numeroSefaz;
  delete clone.chaveMdfe;
  delete clone.chaveAcesso;
  delete clone.caminhoDAMDFE;
  delete clone.caminhoXml;
  delete clone.status;
  delete clone.dtEmissao;
  delete clone.dtEncerramento;
  delete clone.dtCancelamento;
  delete clone.focusRef;
  delete clone.statusSefaz;
  delete clone.mensagemSefaz;

  // Create an explicit draft via window variable for `mdfe-emissao.js`
  window.mdfeDraftData = clone;
  showToast('MDF-e duplicado! Você pode alterar os dados agora.', 'success');
  window.location.hash = '#/mdfe-emissao';
}

// ---- Excluir MDF-e local (sem vínculo SEFAZ) ----
async function doDeleteLocal(id) {
  const m = await getMDFeById(id); if (!m) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal" style="max-width:420px"><div class="modal-header"><h3><i class="fa-solid fa-trash" style="color:var(--danger);margin-right:8px"></i>Excluir MDF-e</h3><button class="modal-close" id="close-del-local"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <div style="padding:14px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:var(--radius-md);margin-bottom:16px;display:flex;align-items:center;gap:10px">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);font-size:1.2rem"></i>
        <span style="font-size:0.88rem;color:var(--text-secondary)">Este MDF-e <strong>não foi enviado à SEFAZ</strong> e será excluído apenas no banco.</span>
      </div>
      <div style="font-size:0.85rem;color:var(--text-muted)">MDF-e nº <strong>${m.numeroSefaz || String(m.numero).padStart(6, '0')}</strong> será removido permanentemente.</div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" id="cancel-del-local">Cancelar</button><button class="btn btn-danger" id="btn-confirm-delete"><i class="fa-solid fa-trash"></i> Excluir</button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('close-del-local').addEventListener('click', () => overlay.remove());
  document.getElementById('cancel-del-local').addEventListener('click', () => overlay.remove());

  document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    await deleteMDFe(id);
    showToast('MDF-e excluído', 'warning');
    overlay.remove();
    renderMDFeLista();
  });
}

// ---- Reprocessar MDF-e ----
async function doReprocessar(id) {
  const m = await getMDFeById(id); if (!m) return;

  if (!focus.isConfigured()) {
    showToast('API Focus NFe não está configurada.', 'error');
    return;
  }

  const num = m.numeroSefaz || String(m.numero).padStart(6, '0');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal" style="max-width:420px"><div class="modal-header"><h3><i class="fa-solid fa-paper-plane" style="color:var(--primary);margin-right:8px"></i>Reprocessar MDF-e</h3><button class="modal-close" id="close-rep"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px">Deseja reenviar este MDF-e para a SEFAZ utilizando os dados originais?</p>
      <div style="font-size:0.85rem;color:var(--text-muted)">MDF-e nº <strong>${num}</strong> será reenviado.</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="cancel-rep">Cancelar</button>
      <button class="btn btn-primary" id="btn-confirm-reprocess"><i class="fa-solid fa-paper-plane"></i> Reenviar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('close-rep').addEventListener('click', () => overlay.remove());
  document.getElementById('cancel-rep').addEventListener('click', () => overlay.remove());

  document.getElementById('btn-confirm-reprocess').addEventListener('click', async () => {
    const btnConfirm = document.getElementById('btn-confirm-reprocess');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reenviando...';

    try {
      showToast('Reprocessando MDF-e...', 'info');

      const empresa = await getEmpresa();
      const motorista = await getMotoristaById(m.motoristaId);
      const veiculo = await getVeiculoById(m.veiculoId);

      const payload = focus.montarPayloadMDFe(m, motorista, veiculo, empresa);
      const ref = m.focusRef || m.id;

      const result = await focus.emitirMDFe(ref, payload);

      const updates = {
        focusRef: ref,
        status: result.status || 'processando_autorizacao',
        statusSefaz: result.status_sefaz,
        mensagemSefaz: result.mensagem_sefaz,
        chaveMdfe: result.chave_mdfe,
        numeroSefaz: result.numero,
        caminhoDAMDFE: result.caminho_damdfe
      };

      await updateMDFeStatus(id, updates);

      if (result.status === 'erro_autorizacao') {
        showToast(`Rejeição: ${result.mensagem_sefaz}`, 'error');
      } else if (result.status === 'autorizado') {
        showToast('MDF-e autorizado com sucesso!', 'success');
      } else {
        showToast('MDF-e enviado para processamento.', 'success');
      }

      overlay.remove();
      renderMDFeLista();
    } catch (err) {
      showToast(`Erro ao reenviar: ${err.message}`, 'error');
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Reenviar';
    }
  });
}

function getStatusBadge(status) {
  const map = {
    autorizado: '<span class="badge badge-success"><i class="fa-solid fa-circle" style="font-size:6px"></i> Autorizado</span>',
    encerrado: '<span class="badge badge-warning"><i class="fa-solid fa-circle" style="font-size:6px"></i> Encerrado</span>',
    cancelado: '<span class="badge badge-danger"><i class="fa-solid fa-circle" style="font-size:6px"></i> Cancelado</span>',
    processando_autorizacao: '<span class="badge badge-info"><i class="fa-solid fa-spinner fa-spin" style="font-size:6px"></i> Processando</span>',
    erro_autorizacao: '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation" style="font-size:8px"></i> Rejeitado</span>',
    denegado: '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark" style="font-size:8px"></i> Denegado</span>'
  };
  return map[status] || `<span class="badge badge-info">${status}</span>`;
}

async function viewMDFe(id) {
  const m = await getMDFeById(id); if (!m) return;
  const mot = await getMotoristaById(m.motoristaId);
  const veic = await getVeiculoById(m.veiculoId);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal modal-lg"><div class="modal-header"><h3>MDF-e nº ${m.numeroSefaz || String(m.numero).padStart(6, '0')}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      ${m.status === 'erro_autorizacao' ? `<div style="padding:14px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:var(--radius-md);margin-bottom:18px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i><strong style="color:var(--danger)">MDF-e Rejeitado pela SEFAZ</strong></div>
        <div style="font-size:0.85rem;color:var(--text-secondary)"><strong>Código:</strong> ${m.statusSefaz || '-'}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary)"><strong>Motivo:</strong> ${m.mensagemSefaz || '-'}</div>
      </div>`: ''}
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Status</div><div class="detail-item-value">${getStatusBadge(m.status)}</div></div>
        <div class="detail-item"><div class="detail-item-label">Chave de Acesso</div><div class="detail-item-value" style="font-family:monospace;font-size:0.82rem">${m.chaveMdfe || m.chaveAcesso || '-'}</div></div>
        <div class="detail-item"><div class="detail-item-label">Data Emissão</div><div class="detail-item-value">${new Date(m.dtEmissao || m.criadoEm).toLocaleString('pt-BR')}</div></div>
        <div class="detail-item"><div class="detail-item-label">Rota</div><div class="detail-item-value">${m.ufInicio} → ${(m.percurso || []).join(' → ')}${(m.percurso || []).length ? ' → ' : ''}${m.ufFim}</div></div>
        <div class="detail-item"><div class="detail-item-label">Motorista</div><div class="detail-item-value">${mot ? `${mot.nome} (CPF: ${formatarCPF(mot.cpf)})` : '-'}</div></div>
        <div class="detail-item"><div class="detail-item-label">Veículo</div><div class="detail-item-value">${veic ? veic.placa : '-'}</div></div>
        <div class="detail-item"><div class="detail-item-label">Peso Bruto</div><div class="detail-item-value">${Number(m.pesoBruto || 0).toLocaleString('pt-BR')} kg</div></div>
        <div class="detail-item"><div class="detail-item-label">Valor Carga</div><div class="detail-item-value">R$ ${Number(m.valorCarga || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div>
        ${m.statusSefaz ? `<div class="detail-item"><div class="detail-item-label">Status SEFAZ</div><div class="detail-item-value">${m.statusSefaz} - ${m.mensagemSefaz || ''}</div></div>` : ''}
      </div>
      ${(m.documentos || []).length > 0 ? `<div style="margin-top:20px"><h4 style="font-size:0.85rem;color:var(--text-accent);margin-bottom:10px">Documentos Vinculados</h4><div class="doc-list">${m.documentos.map(d => `<div class="doc-item"><span class="badge ${d.tipo === 'nfe' ? 'badge-primary' : 'badge-info'}">${d.tipo.toUpperCase()}</span><span class="doc-item-key">${formatarChaveAcesso(d.chave)}</span></div>`).join('')}</div></div>` : ''}
      <div class="modal-footer" style="padding:16px 0 0">
        ${m.status === 'autorizado' ? `<button class="btn btn-secondary btn-print-modal" data-id="${m.id}"><i class="fa-solid fa-print"></i> Imprimir DAMDFE</button>` : ''}
      </div>
    </div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.btn-print-modal')?.addEventListener('click', () => { overlay.remove(); printDAMDFE(id); });
}

// ---- DAMDFE Print ----
async function printDAMDFE(id) {
  const m = await getMDFeById(id); if (!m) return;

  if (m.caminhoDAMDFE) {
    window.open(m.caminhoDAMDFE, '_blank');
    return;
  }

  if (!focus.isConfigured()) {
    showToast('Configure a API Focus NFe para imprimir o DAMDFE', 'warning');
    return;
  }

  try {
    showToast('Obtendo DAMDFE...', 'info');
    const result = await focus.consultarMDFe(m.focusRef || m.id);
    if (result.caminho_damdfe) {
      await updateMDFeStatus(id, { caminhoDAMDFE: result.caminho_damdfe });
      window.open(result.caminho_damdfe, '_blank');
    } else {
      showToast('DAMDFE não disponível ainda', 'warning');
    }
  } catch (err) {
    showToast(`Erro ao obter DAMDFE: ${err.message}`, 'error');
  }
}

// ---- Encerrar MDF-e na SEFAZ ----
async function doEncerrar(id) {
  const m = await getMDFeById(id); if (!m) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal" style="max-width:480px"><div class="modal-header"><h3><i class="fa-solid fa-lock" style="color:var(--warning);margin-right:8px"></i>Encerrar MDF-e</h3><button class="modal-close" id="close-enc"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px">Informe os dados do encerramento para registrar na SEFAZ:</p>
      <div class="form-group"><label class="form-label">Data do Encerramento *</label><input type="date" class="form-control" id="enc-data" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">UF *</label><select class="form-control form-select" id="enc-uf"><option value="">Selecione</option>${UFS.map(u => `<option value="${u}" ${u === m.ufFim ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Município *</label><input type="text" class="form-control" id="enc-mun" value="${m.munDescarregamento || ''}" placeholder="Município"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" id="cancel-enc">Cancelar</button><button class="btn btn-success" id="btn-enc-confirm"><i class="fa-solid fa-lock"></i> Encerrar na SEFAZ</button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('close-enc').addEventListener('click', () => overlay.remove());
  document.getElementById('cancel-enc').addEventListener('click', () => overlay.remove());

  document.getElementById('btn-enc-confirm').addEventListener('click', async () => {
    const data = document.getElementById('enc-data').value;
    const uf = document.getElementById('enc-uf').value;
    const mun = document.getElementById('enc-mun').value.trim();
    if (!data || !uf || !mun) { showToast('Preencha todos os campos', 'error'); return; }

    if (!focus.isConfigured()) {
      await updateMDFeStatus(id, { status: 'encerrado', dtEncerramento: new Date().toISOString() });
      showToast('MDF-e encerrado (local)', 'success');
      overlay.remove(); renderMDFeLista(); return;
    }

    try {
      const btn = document.getElementById('btn-enc-confirm');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Encerrando...';
      const result = await focus.encerrarMDFe(m.focusRef || m.id, { data, sigla_uf: uf, nome_municipio: mun });

      await updateMDFeStatus(id, {
        status: result.status || 'encerrado',
        statusSefaz: result.status_sefaz,
        mensagemSefaz: result.mensagem_sefaz,
        dtEncerramento: new Date().toISOString()
      });

      showToast('MDF-e encerrado na SEFAZ!', 'success');
      overlay.remove(); renderMDFeLista();
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
      const btn = document.getElementById('btn-enc-confirm');
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-lock"></i> Encerrar na SEFAZ';
    }
  });
}

// ---- Cancelar MDF-e na SEFAZ ----
async function doCancelar(id) {
  const m = await getMDFeById(id); if (!m) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal" style="max-width:460px"><div class="modal-header"><h3><i class="fa-solid fa-ban" style="color:var(--danger);margin-right:8px"></i>Cancelar MDF-e</h3><button class="modal-close" id="close-canc"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px">Esta ação será registrada na SEFAZ e não pode ser desfeita.</p>
      <div class="form-group"><label class="form-label">Justificativa (15-255 caracteres) *</label><textarea class="form-control" id="canc-just" placeholder="Informe o motivo do cancelamento..." minlength="15" maxlength="255"></textarea>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;text-align:right"><span id="canc-count">0</span>/255</div></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" id="cancel-canc">Voltar</button><button class="btn btn-danger" id="btn-canc-confirm"><i class="fa-solid fa-ban"></i> Cancelar MDF-e</button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('close-canc').addEventListener('click', () => overlay.remove());
  document.getElementById('cancel-canc').addEventListener('click', () => overlay.remove());

  document.getElementById('canc-just').addEventListener('input', e => {
    document.getElementById('canc-count').textContent = e.target.value.length;
  });

  document.getElementById('btn-canc-confirm').addEventListener('click', async () => {
    const just = document.getElementById('canc-just').value.trim();
    if (just.length < 15) { showToast('Justificativa deve ter no mínimo 15 caracteres', 'error'); return; }

    if (!focus.isConfigured()) {
      await updateMDFeStatus(id, { status: 'cancelado', dtCancelamento: new Date().toISOString() });
      showToast('MDF-e cancelado (local)', 'warning');
      overlay.remove(); renderMDFeLista(); return;
    }

    try {
      const btn = document.getElementById('btn-canc-confirm');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelando...';
      const result = await focus.cancelarMDFe(m.focusRef || m.id, just);

      await updateMDFeStatus(id, {
        status: result.status || 'cancelado',
        statusSefaz: result.status_sefaz,
        mensagemSefaz: result.mensagem_sefaz,
        dtCancelamento: new Date().toISOString()
      });

      showToast('MDF-e cancelado na SEFAZ', 'warning');
      overlay.remove(); renderMDFeLista();
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
      const btn = document.getElementById('btn-canc-confirm');
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-ban"></i> Cancelar MDF-e';
    }
  });
}

// ---- Refresh (consultar status) ----
async function refreshStatus(id) {
  const m = await getMDFeById(id); if (!m) return;
  if (!focus.isConfigured()) { showToast('Configure a API Focus NFe', 'warning'); return; }

  try {
    showToast('Consultando SEFAZ...', 'info');
    const result = await focus.consultarMDFe(m.focusRef || m.id);

    await updateMDFeStatus(id, {
      status: result.status,
      statusSefaz: result.status_sefaz,
      mensagemSefaz: result.mensagem_sefaz,
      chaveMdfe: result.chave_mdfe,
      numeroSefaz: result.numero,
      serieSefaz: result.serie,
      caminhoDAMDFE: result.caminho_damdfe,
      caminhoXml: result.caminho_xml
    });

    showToast(`Status: ${result.status} - ${result.mensagem_sefaz || ''}`, 'success');
    renderMDFeLista();
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  }
}

// ---- Manutenção (editar e reenviar MDF-e rejeitado) ----
async function doManutencao(id) {
  const m = await getMDFeById(id); if (!m) return;
  const mot = await getMotoristaById(m.motoristaId);
  const veic = await getVeiculoById(m.veiculoId);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal modal-lg"><div class="modal-header"><h3><i class="fa-solid fa-wrench" style="color:var(--warning);margin-right:8px"></i>Manutenção MDF-e #${m.numeroSefaz || String(m.numero).padStart(6, '0')}</h3><button class="modal-close" id="close-man"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      <div style="padding:14px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:var(--radius-md);margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i><strong style="color:var(--danger)">Motivo da Rejeição</strong></div>
        <div style="font-size:0.88rem;color:var(--text-secondary)"><strong>Código ${m.statusSefaz || ''}:</strong> ${m.mensagemSefaz || 'Sem informação'}</div>
      </div>
      
      <h4 style="font-size:0.9rem;color:var(--text-accent);margin-bottom:14px">Dados do MDF-e (edite conforme necessário)</h4>
      
      <div class="form-row">
        <div class="form-group"><label class="form-label">UF Início</label><select class="form-control form-select" id="man-uf-inicio">${UFS.map(u => `<option value="${u}" ${u === m.ufInicio ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">UF Fim</label><select class="form-control form-select" id="man-uf-fim">${UFS.map(u => `<option value="${u}" ${u === m.ufFim ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Mun. Carregamento</label><input type="text" class="form-control" id="man-mun-c" value="${m.munCarregamento || ''}"></div>
        <div class="form-group"><label class="form-label">Mun. Descarregamento</label><input type="text" class="form-control" id="man-mun-d" value="${m.munDescarregamento || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Cód. Mun. Carregamento (IBGE)</label><input type="text" class="form-control" id="man-cod-c" value="${m.codMunCarregamento || ''}" placeholder="Ex: 3550308" maxlength="7"></div>
        <div class="form-group"><label class="form-label">Cód. Mun. Descarregamento (IBGE)</label><input type="text" class="form-control" id="man-cod-d" value="${m.codMunDescarregamento || ''}" placeholder="Ex: 3550308" maxlength="7"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Peso Bruto (kg)</label><input type="number" class="form-control" id="man-peso" value="${m.pesoBruto || ''}" step="0.01"></div>
        <div class="form-group"><label class="form-label">Valor Carga (R$)</label><input type="number" class="form-control" id="man-valor" value="${m.valorCarga || ''}" step="0.01"></div>
      </div>
      <div class="form-group"><label class="form-label">Info Complementar</label><textarea class="form-control" id="man-info">${m.infoComplementar || ''}</textarea></div>
      
      <div style="display:flex;gap:12px;margin-top:8px">
        <div style="flex:1;padding:12px;background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:var(--radius-sm)">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Motorista</div>
          <div style="font-weight:600">${mot ? mot.nome : '-'}</div>
        </div>
        <div style="flex:1;padding:12px;background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:var(--radius-sm)">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Veículo</div>
          <div style="font-weight:600;font-family:monospace">${veic ? veic.placa : '-'}</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="cancel-man">Cancelar</button>
      <button class="btn btn-danger btn-sm" id="btn-man-delete" style="margin-right:auto"><i class="fa-solid fa-trash"></i> Excluir</button>
      <button class="btn btn-primary" id="btn-man-reenviar"><i class="fa-solid fa-paper-plane"></i> Salvar e Reenviar à SEFAZ</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('close-man').addEventListener('click', () => overlay.remove());
  document.getElementById('cancel-man').addEventListener('click', () => overlay.remove());

  document.getElementById('btn-man-delete').addEventListener('click', async () => {
    await deleteMDFe(id);
    showToast('MDF-e excluído', 'warning');
    overlay.remove(); renderMDFeLista();
  });

  document.getElementById('btn-man-reenviar').addEventListener('click', async () => {
    const dataUpdates = {
      ufInicio: document.getElementById('man-uf-inicio').value,
      ufFim: document.getElementById('man-uf-fim').value,
      munCarregamento: document.getElementById('man-mun-c').value,
      munDescarregamento: document.getElementById('man-mun-d').value,
      codMunCarregamento: document.getElementById('man-cod-c').value,
      codMunDescarregamento: document.getElementById('man-cod-d').value,
      pesoBruto: document.getElementById('man-peso').value,
      valorCarga: document.getElementById('man-valor').value,
      infoComplementar: document.getElementById('man-info').value
    };

    if (!focus.isConfigured()) {
      await updateMDFeStatus(id, { ...dataUpdates, status: 'autorizado' });
      showToast('MDF-e atualizado (local)', 'success');
      overlay.remove(); renderMDFeLista(); return;
    }

    try {
      const btn = document.getElementById('btn-man-reenviar');
      btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reenviando...';

      const empresa = await getEmpresa();
      const motorista = await getMotoristaById(m.motoristaId);
      const veiculo = await getVeiculoById(m.veiculoId);

      const payload = focus.montarPayloadMDFe({ ...m, ...dataUpdates }, motorista, veiculo, empresa);

      // Reenviar com mesma ref (Focus permite para erro_autorizacao)
      const ref = m.focusRef || m.id;
      const result = await focus.emitirMDFe(ref, payload);

      await updateMDFeStatus(id, {
        ...dataUpdates,
        status: result.status || 'processando_autorizacao',
        statusSefaz: result.status_sefaz,
        mensagemSefaz: result.mensagem_sefaz,
        chaveMdfe: result.chave_mdfe
      });

      if (result.status === 'erro_autorizacao') {
        showToast(`Rejeição: ${result.mensagem_sefaz}`, 'error');
      } else {
        showToast('MDF-e reenviado! Consulte o status em instantes.', 'success');
      }
      overlay.remove(); renderMDFeLista();
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
      const btn = document.getElementById('btn-man-reenviar');
      btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Salvar e Reenviar à SEFAZ';
    }
  });
}

