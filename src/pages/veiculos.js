// ============================================
// Veículos Page (CRUD)
// ============================================

import { getVeiculos, saveVeiculo, deleteVeiculo, getVeiculoById } from '../store/dataStore.js';
import { validarPlaca, formatarPlaca, formatarCPF, formatarCNPJ, UFS, TIPOS_CARROCERIA, TIPOS_RODADO } from '../utils/validators.js';
import { showToast } from '../components/toast.js';

let searchTerm = '';

export function renderVeiculos() {
    const content = document.getElementById('page-content');
    const veiculos = getVeiculos().filter(v => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return v.placa.toLowerCase().includes(term) ||
            (v.proprietarioNome || '').toLowerCase().includes(term);
    });

    content.innerHTML = `
    <div class="fade-in">
      <div class="page-header page-header-actions">
        <div>
          <h2>Veículos</h2>
          <p>Gerencie os veículos disponíveis para transporte</p>
        </div>
        <button class="btn btn-primary" id="btn-novo-veiculo">
          <i class="fa-solid fa-plus"></i> Novo Veículo
        </button>
      </div>

      <div class="toolbar">
        <div class="search-bar">
          <i class="fa-solid fa-search"></i>
          <input type="text" class="form-control" id="search-veiculo" placeholder="Buscar por placa..." value="${searchTerm}">
        </div>
        <div class="toolbar-spacer"></div>
        <span class="text-muted" style="font-size:0.82rem">${veiculos.length} veículo(s)</span>
      </div>

      ${veiculos.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <i class="fa-solid fa-truck"></i>
            <h4>Nenhum veículo cadastrado</h4>
            <p>Adicione veículos para poder emitir MDF-e</p>
            <button class="btn btn-primary" id="btn-empty-novo-veiculo">
              <i class="fa-solid fa-plus"></i> Cadastrar Veículo
            </button>
          </div>
        </div>
      ` : `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Tipo Rodado</th>
                <th>Carroceria</th>
                <th>Tara (kg)</th>
                <th>Capac. (kg)</th>
                <th>UF</th>
                <th>Status</th>
                <th style="width:120px">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${veiculos.map(v => {
        const tipoRodado = TIPOS_RODADO.find(t => t.value === v.tipoRodado);
        const tipoCarroceria = TIPOS_CARROCERIA.find(t => t.value === v.tipoCarroceria);
        return `
                  <tr>
                    <td style="color:var(--text-primary); font-weight:600; font-family:monospace; font-size:0.95rem">${v.placa}</td>
                    <td>${tipoRodado ? tipoRodado.label : v.tipoRodado || '-'}</td>
                    <td>${tipoCarroceria ? tipoCarroceria.label : v.tipoCarroceria || '-'}</td>
                    <td>${v.tara ? Number(v.tara).toLocaleString('pt-BR') : '-'}</td>
                    <td>${v.capKg ? Number(v.capKg).toLocaleString('pt-BR') : '-'}</td>
                    <td><span class="badge badge-info">${v.uf || '-'}</span></td>
                    <td>${v.ativo !== false ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>'}</td>
                    <td>
                      <div style="display:flex; gap:6px">
                        <button class="btn btn-sm btn-secondary btn-edit-veiculo" data-id="${v.id}" title="Editar">
                          <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete-veiculo" data-id="${v.id}" title="Excluir">
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

    // Events
    document.getElementById('btn-novo-veiculo')?.addEventListener('click', () => openVeiculoModal());
    document.getElementById('btn-empty-novo-veiculo')?.addEventListener('click', () => openVeiculoModal());
    document.getElementById('search-veiculo')?.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderVeiculos();
    });
    document.querySelectorAll('.btn-edit-veiculo').forEach(btn => {
        btn.addEventListener('click', () => openVeiculoModal(btn.dataset.id));
    });
    document.querySelectorAll('.btn-delete-veiculo').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteVeiculo(btn.dataset.id));
    });
}

function openVeiculoModal(editId = null) {
    const veiculo = editId ? getVeiculoById(editId) : {};
    const isEdit = !!editId;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Veículo' : 'Novo Veículo'}</h3>
        <button class="modal-close" id="close-veiculo-modal"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <form id="form-veiculo">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Placa *</label>
              <input type="text" class="form-control" id="veic-placa" value="${veiculo.placa || ''}" required placeholder="ABC1D23" maxlength="7" style="text-transform:uppercase">
              <div class="form-error" id="placa-error" style="display:none">Placa inválida</div>
            </div>
            <div class="form-group">
              <label class="form-label">RENAVAM</label>
              <input type="text" class="form-control" id="veic-renavam" value="${veiculo.renavam || ''}" placeholder="Nº RENAVAM" maxlength="11">
            </div>
            <div class="form-group">
              <label class="form-label">UF do Veículo *</label>
              <select class="form-control form-select" id="veic-uf" required>
                <option value="">Selecione</option>
                ${UFS.map(uf => `<option value="${uf}" ${veiculo.uf === uf ? 'selected' : ''}>${uf}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tipo de Rodado *</label>
              <select class="form-control form-select" id="veic-tipo-rodado" required>
                <option value="">Selecione</option>
                ${TIPOS_RODADO.map(t => `<option value="${t.value}" ${veiculo.tipoRodado === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Carroceria *</label>
              <select class="form-control form-select" id="veic-tipo-carroceria" required>
                <option value="">Selecione</option>
                ${TIPOS_CARROCERIA.map(t => `<option value="${t.value}" ${veiculo.tipoCarroceria === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tara (kg) *</label>
              <input type="number" class="form-control" id="veic-tara" value="${veiculo.tara || ''}" required placeholder="Peso em kg">
            </div>
            <div class="form-group">
              <label class="form-label">Capacidade em kg *</label>
              <input type="number" class="form-control" id="veic-cap-kg" value="${veiculo.capKg || ''}" required placeholder="Capacidade em kg">
            </div>
            <div class="form-group">
              <label class="form-label">Capacidade em m³</label>
              <input type="number" class="form-control" id="veic-cap-m3" value="${veiculo.capM3 || ''}" placeholder="Capacidade em m³">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">CPF/CNPJ Proprietário</label>
              <input type="text" class="form-control" id="veic-prop-doc" value="${veiculo.proprietarioDoc || ''}" placeholder="CPF ou CNPJ do proprietário">
            </div>
            <div class="form-group">
              <label class="form-label">Nome do Proprietário</label>
              <input type="text" class="form-control" id="veic-prop-nome" value="${veiculo.proprietarioNome || ''}" placeholder="Nome do proprietário">
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-veiculo-modal">Cancelar</button>
        <button class="btn btn-primary" id="save-veiculo">
          <i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar'}
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    // Placa formatting
    const placaInput = document.getElementById('veic-placa');
    placaInput.addEventListener('input', () => {
        placaInput.value = formatarPlaca(placaInput.value);
        document.getElementById('placa-error').style.display = 'none';
        placaInput.classList.remove('error');
    });

    // Close
    const closeModal = () => overlay.remove();
    document.getElementById('close-veiculo-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-veiculo-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Save
    document.getElementById('save-veiculo').addEventListener('click', () => {
        const placa = document.getElementById('veic-placa').value.trim().toUpperCase();
        const renavam = document.getElementById('veic-renavam').value.trim();
        const uf = document.getElementById('veic-uf').value;
        const tipoRodado = document.getElementById('veic-tipo-rodado').value;
        const tipoCarroceria = document.getElementById('veic-tipo-carroceria').value;
        const tara = document.getElementById('veic-tara').value;
        const capKg = document.getElementById('veic-cap-kg').value;
        const capM3 = document.getElementById('veic-cap-m3').value;
        const proprietarioDoc = document.getElementById('veic-prop-doc').value.trim();
        const proprietarioNome = document.getElementById('veic-prop-nome').value.trim();

        if (!placa || !uf || !tipoRodado || !tipoCarroceria || !tara || !capKg) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (!validarPlaca(placa)) {
            document.getElementById('placa-error').style.display = 'block';
            placaInput.classList.add('error');
            showToast('Placa inválida (Use formato ABC1D23 ou ABC1234)', 'error');
            return;
        }

        const data = {
            placa, renavam, uf, tipoRodado, tipoCarroceria, tara, capKg, capM3,
            proprietarioDoc, proprietarioNome,
            ...(isEdit ? { id: editId } : {})
        };

        saveVeiculo(data);
        showToast(isEdit ? 'Veículo atualizado!' : 'Veículo cadastrado!', 'success');
        closeModal();
        renderVeiculos();
    });
}

function confirmDeleteVeiculo(id) {
    const veiculo = getVeiculoById(id);
    if (!veiculo) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-body text-center" style="padding:32px">
        <div class="confirm-icon text-danger">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 style="margin-bottom:8px">Excluir Veículo</h3>
        <p style="color:var(--text-secondary); font-size:0.9rem">
          Tem certeza que deseja excluir o veículo <strong>${veiculo.placa}</strong>?
        </p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="cancel-delete">Cancelar</button>
          <button class="btn btn-danger" id="confirm-delete">
            <i class="fa-solid fa-trash"></i> Excluir
          </button>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);
    document.getElementById('cancel-delete').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('confirm-delete').addEventListener('click', () => {
        deleteVeiculo(id);
        showToast('Veículo excluído', 'success');
        overlay.remove();
        renderVeiculos();
    });
}
