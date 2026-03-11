import { showToast } from '../components/toast.js';
import { getUsers, saveUser, deleteUser, getEmpresas, getUserEmpresas, saveUserEmpresas } from '../store/dataStore.js';
import { formatarCNPJ, formatarCPF } from '../utils/validators.js';

export async function renderConfiguracoes() {
  const content = document.getElementById('page-content');

  // Show loading state
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  // Fetch users first
  const users = await getUsers();
  const empresas = await getEmpresas();
  content.innerHTML = `<div class="fade-in">
    <div class="page-header"><h2><i class="fa-solid fa-gear" style="color:var(--primary-400);margin-right:10px"></i>Configurações do Sistema</h2><p>Gerencie o acesso de usuários e permissões de empresas.</p></div>
    
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <h3><i class="fa-solid fa-users" style="color:var(--primary-400);margin-right:8px"></i>Gestão de Usuários</h3>
      </div>
      <div class="card-body">
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Cargo</th>
                <th style="width:100px">Ações</th>
              </tr>
            </thead>
            <tbody id="users-table-body">
              ${users.map(user => `
                <tr>
                  <td>${user.nome}</td>
                  <td>${user.login}</td>
                  <td><span class="badge ${user.role === 'admin' ? 'badge-primary' : 'badge-info'}">${user.role === 'admin' ? 'Admin' : 'Padrão'}</span></td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-sm btn-info edit-user" data-id="${user.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                      ${user.login !== 'TI' ? `
                        <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                      ` : '<span style="font-size:0.7rem;color:var(--text-muted);margin-left:8px">Protegido</span>'}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top:20px;padding:20px;background:rgba(255,255,255,0.03);border-radius:var(--radius-md);border:1px solid var(--border-color)">
          <h4 id="user-form-title" style="margin-bottom:12px;font-size:0.9rem">Criar Novo Usuário</h4>
          <input type="hidden" id="edit-user-id">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome Completo</label>
              <input type="text" class="form-control" id="new-user-nome" placeholder="Ex: João Silva">
            </div>
            <div class="form-group">
              <label class="form-label">Login</label>
              <input type="text" class="form-control" id="new-user-login" placeholder="Ex: joao.silva">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Senha</label>
              <input type="password" class="form-control" id="new-user-senha" placeholder="Senha de acesso">
              <div id="edit-pwd-note" style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;display:none">Deixe em branco para manter a senha atual</div>
            </div>
            <div class="form-group">
              <label class="form-label">Cargo</label>
              <select class="form-control form-select" id="new-user-role">
                <option value="user">Padrão (Acesso à emissão)</option>
                <option value="admin">Administrador (Acesso total)</option>
              </select>
            </div>
          </div>
          <div class="form-group" id="empresa-acesso-container">
            <label class="form-label">Empresas Permitidas <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(Apenas para usuários Padrão)</span></label>
            <div style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px;">
               ${empresas.length === 0 ? '<div style="font-size:0.8rem;color:var(--text-muted)">Nenhuma empresa cadastrada</div>' : empresas.map(emp => `
                  <label style="display:flex; align-items:center; gap:8px; margin-bottom: 6px; cursor: pointer;">
                    <input type="checkbox" class="user-empresa-checkbox" value="${emp.id}" style="accent-color:var(--primary-400)">
                    <span style="font-size:0.85rem">${emp.razaoSocial} ${emp.cpf ? `(CPF: ${formatarCPF(emp.cpf)})` : `(CNPJ: ${formatarCNPJ(emp.cnpj)})`}</span>
                  </label>
               `).join('')}
            </div>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-primary" id="add-user"><i class="fa-solid fa-plus"></i> Criar Usuário</button>
            <button class="btn btn-secondary" id="cancel-edit" style="display:none">Cancelar</button>
          </div>
        </div>
      </div>
    </div>

  </div>`;



  const toggleEmpresaVisibility = () => {
    const role = document.getElementById('new-user-role').value;
    document.getElementById('empresa-acesso-container').style.opacity = role === 'admin' ? '0.5' : '1';
    document.querySelectorAll('.user-empresa-checkbox').forEach(cb => {
      cb.disabled = role === 'admin';
    });
  };
  document.getElementById('new-user-role').addEventListener('change', toggleEmpresaVisibility);
  toggleEmpresaVisibility();

  // User management handlers
  document.getElementById('add-user').addEventListener('click', async () => {
    const id = document.getElementById('edit-user-id').value;
    const nome = document.getElementById('new-user-nome').value.trim();
    const login = document.getElementById('new-user-login').value.trim();
    const senha = document.getElementById('new-user-senha').value.trim();
    const role = document.getElementById('new-user-role').value;

    if (!nome || !login || (!id && !senha)) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }

    const btn = document.getElementById('add-user');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${id ? 'Salvando...' : 'Criando...'}`;

    const userData = { nome, login, role };
    if (id) userData.id = id;
    if (senha) userData.senha = senha;

    const savedUser = await saveUser(userData);

    const selectedEmpresas = Array.from(document.querySelectorAll('.user-empresa-checkbox:checked')).map(cb => cb.value);
    await saveUserEmpresas(savedUser.id, role === 'admin' ? [] : selectedEmpresas);

    showToast(id ? 'Usuário atualizado!' : 'Usuário criado!', 'success');
    renderConfiguracoes();
  });

  document.querySelectorAll('.edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const user = users.find(u => u.id === id);
      if (!user) return;

      document.getElementById('edit-user-id').value = user.id;
      document.getElementById('new-user-nome').value = user.nome;
      document.getElementById('new-user-login').value = user.login;
      document.getElementById('new-user-senha').value = '';
      document.getElementById('new-user-role').value = user.role;

      document.getElementById('user-form-title').innerText = 'Editar Usuário';
      document.getElementById('add-user').innerHTML = '<i class="fa-solid fa-check"></i> Salvar Alterações';
      document.getElementById('cancel-edit').style.display = 'block';
      document.getElementById('edit-pwd-note').style.display = 'block';
      toggleEmpresaVisibility();
      
      // Load selected empresas
      getUserEmpresas(user.id).then(userEmpIds => {
         document.querySelectorAll('.user-empresa-checkbox').forEach(cb => {
           cb.checked = userEmpIds.includes(cb.value);
         });
      });
      
      document.getElementById('new-user-nome').focus();
    });
  });

  document.getElementById('cancel-edit').addEventListener('click', () => {
    document.getElementById('edit-user-id').value = '';
    document.getElementById('new-user-nome').value = '';
    document.getElementById('new-user-login').value = '';
    document.getElementById('new-user-senha').value = '';
    document.getElementById('new-user-role').value = 'user';

    document.getElementById('user-form-title').innerText = 'Criar Novo Usuário';
    document.getElementById('add-user').innerHTML = '<i class="fa-solid fa-plus"></i> Criar Usuário';
    document.getElementById('cancel-edit').style.display = 'none';
    document.getElementById('edit-pwd-note').style.display = 'none';
    
    document.querySelectorAll('.user-empresa-checkbox').forEach(cb => cb.checked = false);
    toggleEmpresaVisibility();
  });

  document.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Tem certeza que deseja excluir este usuário?')) {
        await deleteUser(id);
        showToast('Usuário removido', 'success');
        renderConfiguracoes();
      }
    });
  });

}

