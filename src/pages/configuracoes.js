import { getConfigData, saveConfig, isConfigured } from '../services/focusNfe.js';
import { showToast } from '../components/toast.js';
import { getUsers, saveUser, deleteUser } from '../store/dataStore.js';

export async function renderConfiguracoes() {
  const cfg = getConfigData();
  const content = document.getElementById('page-content');

  // Show loading state
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  // Fetch users first
  const users = await getUsers();

  content.innerHTML = `<div class="fade-in">
    <div class="page-header"><h2><i class="fa-solid fa-gear" style="color:var(--primary-400);margin-right:10px"></i>Configurações</h2><p>Configure a integração com a API Focus NFe para comunicação com a SEFAZ</p></div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <div class="card-header"><h3><i class="fa-solid fa-key" style="color:var(--warning);margin-right:8px"></i>API Focus NFe</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Token da API *</label>
            <input type="password" class="form-control" id="cfg-token" value="${cfg.token}" placeholder="Cole aqui seu token da Focus NFe">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Obtenha seu token em <a href="https://app.focusnfe.com.br" target="_blank">app.focusnfe.com.br</a></div>
          </div>
          <div class="form-group">
            <label class="form-label">Ambiente *</label>
            <select class="form-control form-select" id="cfg-ambiente">
              <option value="homologacao" ${cfg.ambiente === 'homologacao' ? 'selected' : ''}>🧪 Homologação (Testes)</option>
              <option value="producao" ${cfg.ambiente === 'producao' ? 'selected' : ''}>🔴 Produção (Real)</option>
            </select>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Use Homologação para testes antes de ir para Produção</div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px">
            <button class="btn btn-primary" id="save-config"><i class="fa-solid fa-check"></i> Salvar</button>
            <button class="btn btn-secondary" id="test-config"><i class="fa-solid fa-wifi"></i> Testar Conexão</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="fa-solid fa-circle-info" style="color:var(--info);margin-right:8px"></i>Status da Integração</h3></div>
        <div class="card-body">
          <div style="padding:20px;text-align:center">
            <div id="status-icon" style="font-size:3rem;margin-bottom:12px">${isConfigured() ? '<i class="fa-solid fa-circle-check" style="color:var(--success)"></i>' : '<i class="fa-solid fa-circle-xmark" style="color:var(--danger)"></i>'}</div>
            <h4 id="status-text" style="margin-bottom:6px">${isConfigured() ? 'API Configurada' : 'API Não Configurada'}</h4>
            <p id="status-desc" style="color:var(--text-muted);font-size:0.85rem">${isConfigured() ? 'O sistema está pronto para emitir MDF-e na SEFAZ via Focus NFe.' : 'Configure o token da API para poder emitir MDF-e na SEFAZ.'}</p>
            <div style="margin-top:16px;padding:14px;background:rgba(99,102,241,0.06);border-radius:var(--radius-md);border:1px solid rgba(99,102,241,0.12);text-align:left">
              <div style="font-size:0.78rem;font-weight:600;color:var(--primary-300);margin-bottom:8px">Ambiente atual:</div>
              <span class="badge ${cfg.ambiente === 'producao' ? 'badge-danger' : 'badge-warning'}">${cfg.ambiente === 'producao' ? '🔴 Produção' : '🧪 Homologação'}</span>
            </div>
          </div>
          
          <div style="margin-top:20px;padding:16px;background:rgba(251,191,36,0.06);border-radius:var(--radius-md);border:1px solid rgba(251,191,36,0.15)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="fa-solid fa-triangle-exclamation" style="color:var(--warning)"></i><span style="font-size:0.82rem;font-weight:600;color:var(--warning)">Importante</span></div>
            <ul style="font-size:0.78rem;color:var(--text-secondary);padding-left:16px;line-height:1.8">
              <li>Inicie o servidor proxy: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px">node server.js</code></li>
              <li>A empresa deve estar credenciada na Focus NFe</li>
              <li>Teste primeiro em Homologação antes de usar Produção</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

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
          <div style="display:flex;gap:10px">
            <button class="btn btn-primary" id="add-user"><i class="fa-solid fa-plus"></i> Criar Usuário</button>
            <button class="btn btn-secondary" id="cancel-edit" style="display:none">Cancelar</button>
          </div>
        </div>
      </div>
    </div>

  </div>`;

  document.getElementById('save-config').addEventListener('click', () => {
    const token = document.getElementById('cfg-token').value.trim();
    const ambiente = document.getElementById('cfg-ambiente').value;
    if (!token) { showToast('Informe o token da API', 'error'); return; }
    saveConfig({ token, ambiente });
    showToast('Configurações salvas!', 'success');
    renderConfiguracoes();
  });

  document.getElementById('test-config').addEventListener('click', async () => {
    const token = document.getElementById('cfg-token').value.trim();
    if (!token) { showToast('Informe o token primeiro', 'error'); return; }
    try {
      const resp = await fetch('http://localhost:3456/api/health');
      if (resp.ok) {
        showToast('Proxy conectado! Servidor rodando.', 'success');
      } else {
        showToast('Servidor proxy não respondeu corretamente', 'error');
      }
    } catch {
      showToast('Servidor proxy não encontrado. Execute: node server.js', 'error');
    }
  });

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

    await saveUser(userData);
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

