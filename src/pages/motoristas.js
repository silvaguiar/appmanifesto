// ============================================
// Motoristas Page (CRUD)
// ============================================

import { getMotoristas, saveMotorista, deleteMotorista, getMotoristaById } from '../store/dataStore.js';
import { validarCPF, formatarCPF, formatarTelefone, UFS, CATEGORIAS_CNH } from '../utils/validators.js';
import { showToast } from '../components/toast.js';

let searchTerm = '';

export function renderMotoristas() {
    const content = document.getElementById('page-content');
    const motoristas = getMotoristas().filter(m => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return m.nome.toLowerCase().includes(term) ||
            m.cpf.includes(term.replace(/\D/g, ''));
    });

    content.innerHTML = `
    <div class="fade-in">
      <div class="page-header page-header-actions">
        <div>
          <h2>Motoristas</h2>
          <p>Gerencie os motoristas autônomos cadastrados</p>
        </div>
        <button class="btn btn-primary" id="btn-novo-motorista">
          <i class="fa-solid fa-plus"></i> Novo Motorista
        </button>
      </div>

      <div class="toolbar">
        <div class="search-bar">
          <i class="fa-solid fa-search"></i>
          <input type="text" class="form-control" id="search-motorista" placeholder="Buscar por nome ou CPF..." value="${searchTerm}">
        </div>
        <div class="toolbar-spacer"></div>
        <span class="text-muted" style="font-size:0.82rem">${motoristas.length} motorista(s)</span>
      </div>

      ${motoristas.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <i class="fa-solid fa-id-card"></i>
            <h4>Nenhum motorista cadastrado</h4>
            <p>Adicione motoristas para poder emitir MDF-e</p>
            <button class="btn btn-primary" id="btn-empty-novo-motorista">
              <i class="fa-solid fa-plus"></i> Cadastrar Motorista
            </button>
          </div>
        </div>
      ` : `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>CNH</th>
                <th>Categoria</th>
                <th>Telefone</th>
                <th>Status</th>
                <th style="width:120px">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${motoristas.map(m => `
                <tr>
                  <td style="color:var(--text-primary); font-weight:500">${m.nome}</td>
                  <td style="font-family:monospace">${formatarCPF(m.cpf)}</td>
                  <td>${m.cnh || '-'}</td>
                  <td><span class="badge badge-primary">${m.categoriaCnh || '-'}</span></td>
                  <td>${m.telefone ? formatarTelefone(m.telefone) : '-'}</td>
                  <td>${m.ativo !== false ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>'}</td>
                  <td>
                    <div style="display:flex; gap:6px">
                      <button class="btn btn-sm btn-secondary btn-edit-motorista" data-id="${m.id}" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button class="btn btn-sm btn-danger btn-delete-motorista" data-id="${m.id}" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

    // Event listeners
    document.getElementById('btn-novo-motorista')?.addEventListener('click', () => openMotoristaModal());
    document.getElementById('btn-empty-novo-motorista')?.addEventListener('click', () => openMotoristaModal());
    document.getElementById('search-motorista')?.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderMotoristas();
    });

    document.querySelectorAll('.btn-edit-motorista').forEach(btn => {
        btn.addEventListener('click', () => openMotoristaModal(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete-motorista').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteMotorista(btn.dataset.id));
    });
}

function openMotoristaModal(editId = null) {
    const motorista = editId ? getMotoristaById(editId) : {};
    const isEdit = !!editId;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'motorista-modal';
    overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Motorista' : 'Novo Motorista'}</h3>
        <button class="modal-close" id="close-motorista-modal"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <form id="form-motorista">
          <div class="form-row">
            <div class="form-group" style="grid-column: 1 / -1">
              <label class="form-label">Nome Completo *</label>
              <input type="text" class="form-control" id="mot-nome" value="${motorista.nome || ''}" required placeholder="Nome completo do motorista">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">CPF *</label>
              <input type="text" class="form-control" id="mot-cpf" value="${motorista.cpf ? formatarCPF(motorista.cpf) : ''}" required placeholder="000.000.000-00" maxlength="14">
              <div class="form-error" id="cpf-error" style="display:none">CPF inválido</div>
            </div>
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input type="text" class="form-control" id="mot-telefone" value="${motorista.telefone || ''}" placeholder="(00) 00000-0000" maxlength="15">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nº CNH *</label>
              <input type="text" class="form-control" id="mot-cnh" value="${motorista.cnh || ''}" required placeholder="Número da CNH" maxlength="11">
            </div>
            <div class="form-group">
              <label class="form-label">Categoria CNH *</label>
              <select class="form-control form-select" id="mot-categoria-cnh" required>
                <option value="">Selecione</option>
                ${CATEGORIAS_CNH.map(c => `<option value="${c}" ${motorista.categoriaCnh === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">UF da CNH</label>
              <select class="form-control form-select" id="mot-uf-cnh">
                <option value="">Selecione</option>
                ${UFS.map(uf => `<option value="${uf}" ${motorista.ufCnh === uf ? 'selected' : ''}>${uf}</option>`).join('')}
              </select>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-motorista-modal">Cancelar</button>
        <button class="btn btn-primary" id="save-motorista">
          <i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar'}
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    // CPF formatting
    const cpfInput = document.getElementById('mot-cpf');
    cpfInput.addEventListener('input', () => {
        cpfInput.value = formatarCPF(cpfInput.value);
        document.getElementById('cpf-error').style.display = 'none';
        cpfInput.classList.remove('error');
    });

    // Phone formatting
    const telInput = document.getElementById('mot-telefone');
    telInput.addEventListener('input', () => {
        telInput.value = formatarTelefone(telInput.value);
    });

    // Close
    const closeModal = () => overlay.remove();
    document.getElementById('close-motorista-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-motorista-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Save
    document.getElementById('save-motorista').addEventListener('click', () => {
        const nome = document.getElementById('mot-nome').value.trim();
        const cpfRaw = document.getElementById('mot-cpf').value.replace(/\D/g, '');
        const telefone = document.getElementById('mot-telefone').value.replace(/\D/g, '');
        const cnh = document.getElementById('mot-cnh').value.trim();
        const categoriaCnh = document.getElementById('mot-categoria-cnh').value;
        const ufCnh = document.getElementById('mot-uf-cnh').value;

        if (!nome || !cpfRaw || !cnh || !categoriaCnh) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (!validarCPF(cpfRaw)) {
            document.getElementById('cpf-error').style.display = 'block';
            cpfInput.classList.add('error');
            showToast('CPF inválido', 'error');
            return;
        }

        const data = {
            nome, cpf: cpfRaw, telefone, cnh, categoriaCnh, ufCnh,
            ...(isEdit ? { id: editId } : {})
        };

        saveMotorista(data);
        showToast(isEdit ? 'Motorista atualizado com sucesso!' : 'Motorista cadastrado com sucesso!', 'success');
        closeModal();
        renderMotoristas();
    });
}

function confirmDeleteMotorista(id) {
    const motorista = getMotoristaById(id);
    if (!motorista) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-body text-center" style="padding:32px">
        <div class="confirm-icon text-danger">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 style="margin-bottom:8px">Excluir Motorista</h3>
        <p style="color:var(--text-secondary); font-size:0.9rem">
          Tem certeza que deseja excluir <strong>${motorista.nome}</strong>?<br>
          <span class="text-muted">Esta ação não pode ser desfeita.</span>
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
        deleteMotorista(id);
        showToast('Motorista excluído', 'success');
        overlay.remove();
        renderMotoristas();
    });
}
