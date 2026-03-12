// ============================================
// Empresa Page (CRUD)
// ============================================

import { getEmpresas, saveEmpresa, deleteEmpresa, getEmpresaById } from '../store/dataStore.js';
import { validarCPF, validarCNPJ, formatarCPF, formatarCNPJ, formatarTelefone, UFS } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import * as focus from '../services/focusNfe.js';

let searchTerm = '';

export async function renderEmpresa() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const allEmpresas = await getEmpresas();
  
  const empresas = allEmpresas.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (e.razaoSocial || '').toLowerCase().includes(term) ||
           (e.nomeFantasia || '').toLowerCase().includes(term) ||
           (e.cnpj || '').includes(term.replace(/\D/g, '')) ||
           (e.cpf || '').includes(term.replace(/\D/g, ''));
  });

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header page-header-actions">
        <div>
          <h2><i class="fa-solid fa-building" style="color:var(--primary-400);margin-right:10px"></i>Empresas Emitentes</h2>
          <p>Gerencie as empresas responsáveis pela emissão do MDF-e</p>
        </div>
        <button class="btn btn-primary" id="btn-nova-empresa">
          <i class="fa-solid fa-plus"></i> Nova Empresa
        </button>
      </div>

      <div class="toolbar">
        <div class="search-bar">
          <i class="fa-solid fa-search"></i>
          <input type="text" class="form-control" id="search-empresa" placeholder="Buscar por razão, fantasia, CPF ou CNPJ..." value="${searchTerm}">
        </div>
        <div class="toolbar-spacer"></div>
        <span class="text-muted" style="font-size:0.82rem">${empresas.length} empresa(s)</span>
      </div>

      ${empresas.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <i class="fa-solid fa-building"></i>
            <h4>Nenhuma empresa cadastrada</h4>
            <p>Adicione empresas emitentes para poder emitir MDF-e</p>
            <button class="btn btn-primary" id="btn-empty-nova-empresa">
              <i class="fa-solid fa-plus"></i> Cadastrar Empresa
            </button>
          </div>
        </div>
      ` : `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Emitente</th>
                <th>Documento</th>
                <th>IE</th>
                <th>UF</th>
                <th>Município</th>
                <th style="width:120px">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${empresas.map(e => `
                <tr>
                  <td style="color:var(--text-primary); font-weight:500">${e.razaoSocial} ${e.nomeFantasia ? `<br><small class="text-muted">${e.nomeFantasia}</small>` : ''}</td>
                  <td style="font-family:monospace">${e.cpf ? formatarCPF(e.cpf) : formatarCNPJ(e.cnpj)}</td>
                  <td>${e.ie || '-'}</td>
                  <td>${e.uf || '-'}</td>
                  <td>${e.municipio || '-'}</td>
                  <td>
                    <div style="display:flex; gap:6px">
                      <button class="btn btn-sm btn-secondary btn-edit-empresa" data-id="${e.id}" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button class="btn btn-sm btn-danger btn-delete-empresa" data-id="${e.id}" title="Excluir">
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

  document.getElementById('btn-nova-empresa')?.addEventListener('click', () => openEmpresaModal());
  document.getElementById('btn-empty-nova-empresa')?.addEventListener('click', () => openEmpresaModal());
  document.getElementById('search-empresa')?.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderEmpresa();
  });

  document.querySelectorAll('.btn-edit-empresa').forEach(btn => {
    btn.addEventListener('click', () => openEmpresaModal(btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete-empresa').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteEmpresa(btn.dataset.id));
  });
}

async function openEmpresaModal(editId = null) {
  const emp = editId ? await getEmpresaById(editId) : {};
  const isEdit = !!editId;

  // Determina tipo de documento salvo (cpf = pessoa física, cnpj = pessoa jurídica)
  const tipoDoc = emp.tipoDoc || (emp.cpf ? 'cpf' : 'cnpj');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'empresa-modal';
  overlay.innerHTML = `
    <div class="modal modal-lg" style="width: 800px; max-width: 95%">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Empresa' : 'Nova Empresa'}</h3>
        <button class="modal-close" id="close-empresa-modal"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
        <form id="form-empresa">
          <div class="form-group" style="margin-bottom:24px">
            <label class="form-label">Tipo de Emitente *</label>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <label id="label-tipo-cpf" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 18px;border:2px solid ${tipoDoc === 'cpf' ? 'var(--primary-400)' : 'var(--border-color)'};border-radius:var(--radius-md);background:${tipoDoc === 'cpf' ? 'rgba(99,102,241,0.08)' : 'transparent'};transition:all 0.2s">
                <input type="radio" name="tipo-doc" value="cpf" ${tipoDoc === 'cpf' ? 'checked' : ''} style="accent-color:var(--primary-400)">
                <span><strong>Pessoa Física (CPF)</strong> <span style="font-size:0.78rem;color:var(--text-muted)">— TAC Autônomo</span></span>
              </label>
              <label id="label-tipo-cnpj" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 18px;border:2px solid ${tipoDoc === 'cnpj' ? 'var(--primary-400)' : 'var(--border-color)'};border-radius:var(--radius-md);background:${tipoDoc === 'cnpj' ? 'rgba(99,102,241,0.08)' : 'transparent'};transition:all 0.2s">
                <input type="radio" name="tipo-doc" value="cnpj" ${tipoDoc === 'cnpj' ? 'checked' : ''} style="accent-color:var(--primary-400)">
                <span><strong>Pessoa Jurídica (CNPJ)</strong> <span style="font-size:0.78rem;color:var(--text-muted)">— ETC / CTC</span></span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" id="label-nome">${tipoDoc === 'cpf' ? 'Nome Completo *' : 'Razão Social *'}</label>
              <input type="text" class="form-control" id="emp-razao" value="${emp.razaoSocial || ''}" placeholder="${tipoDoc === 'cpf' ? 'Nome completo do motorista' : 'Razão Social da empresa'}">
            </div>
            <div class="form-group">
              <label class="form-label">Nome Fantasia</label>
              <input type="text" class="form-control" id="emp-fantasia" value="${emp.nomeFantasia || ''}" placeholder="Nome fantasia (opcional)">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" id="campo-cpf" style="${tipoDoc !== 'cpf' ? 'display:none' : ''}">
              <label class="form-label">CPF *</label>
              <input type="text" class="form-control" id="emp-cpf" value="${emp.cpf ? formatarCPF(emp.cpf) : ''}" placeholder="000.000.000-00" maxlength="14">
              <div class="form-error" id="cpf-error" style="display:none">CPF inválido</div>
            </div>
            <div class="form-group" id="campo-cnpj" style="${tipoDoc !== 'cnpj' ? 'display:none' : ''}">
              <label class="form-label">CNPJ *</label>
              <input type="text" class="form-control" id="emp-cnpj" value="${emp.cnpj ? formatarCNPJ(emp.cnpj) : ''}" placeholder="00.000.000/0000-00" maxlength="18">
              <div class="form-error" id="cnpj-error" style="display:none">CNPJ inválido</div>
            </div>
            <div class="form-group">
              <label class="form-label">Inscrição Estadual *</label>
              <input type="text" class="form-control" id="emp-ie" value="${emp.ie || ''}" placeholder="Inscrição Estadual">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tipo de Transportador *</label>
              <select class="form-control form-select" id="emp-tipo-transp">
                <option value="1" ${emp.tipoTransporte === '1' ? 'selected' : ''}>ETC — Empresa de Transporte de Cargas</option>
                <option value="2" ${(emp.tipoTransporte === '2' || (!emp.tipoTransporte && tipoDoc === 'cpf')) ? 'selected' : ''}>TAC — Transportador Autônomo de Cargas</option>
                <option value="3" ${emp.tipoTransporte === '3' ? 'selected' : ''}>CTC — Cooperativa de Transporte de Cargas</option>
                <option value="4" ${emp.tipoTransporte === '4' ? 'selected' : ''}>TCP — Transportador de Carga Própria (Isento RNTRC)</option>
              </select>
            </div>
            <div class="form-group" id="container-rntrc" style="${emp.tipoTransporte === '4' ? 'display:none' : ''}">
              <label class="form-label">RNTRC * <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400;margin-left:4px">Obrigatório p/ ETC, TAC, CTC</span></label>
              <input type="text" class="form-control" id="emp-rntrc" value="${emp.rntrc || ''}" placeholder="8 dígitos numéricos" maxlength="8">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">UF *</label>
              <select class="form-control form-select" id="emp-uf">
                <option value="">Selecione</option>
                ${UFS.map(u => `<option value="${u}" ${emp.uf === u ? 'selected' : ''}>${u}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Município *</label>
              <input type="text" class="form-control" id="emp-municipio" list="dl-emp-mun" value="${emp.municipio || ''}" placeholder="Selecione a UF origem e digite a Cidade" autocomplete="off">
              <datalist id="dl-emp-mun"></datalist>
            </div>
            <div class="form-group">
              <label class="form-label">Cód. IBGE do Município *
                <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400;margin-left:4px">7 dígitos</span>
              </label>
              <input type="text" class="form-control" id="emp-cod-municipio" value="${emp.codMunicipio || ''}" placeholder="Ex: 3550308" readonly style="background:rgba(255,255,255,0.03);color:var(--text-muted);cursor:not-allowed">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input type="text" class="form-control" id="emp-telefone" value="${emp.telefone || ''}" placeholder="(00) 00000-0000" maxlength="15">
            </div>
            <div class="form-group">
              <label class="form-label">CEP</label>
              <input type="text" class="form-control" id="emp-cep" value="${emp.cep || ''}" placeholder="00000-000" maxlength="9">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Endereço</label>
            <input type="text" class="form-control" id="emp-endereco" value="${emp.endereco || ''}" placeholder="Rua, número, bairro">
          </div>

          <div id="secao-seguro" style="margin-top:20px;padding:16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md); ${emp.tipoTransporte === '4' ? 'display:none' : ''}">
            <h4 style="font-size:0.9rem;margin-bottom:12px;color:var(--text-primary)"><i class="fa-solid fa-shield-halved" style="color:var(--primary-400);margin-right:8px"></i>Seguro de Carga (Obrigatório p/ Transportadores)</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Responsável pelo Seguro</label>
                <select class="form-control form-select" id="emp-seg-resp">
                  <option value="1" ${emp.responsavelSeguro === '1' ? 'selected' : ''}>Emitente do MDF-e</option>
                  <option value="2" ${emp.responsavelSeguro === '2' ? 'selected' : ''}>Responsável pela contratação (Contratante)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">CNPJ da Seguradora</label>
                <input type="text" class="form-control" id="emp-seg-cnpj" value="${emp.seguradoraCnpj || ''}" placeholder="00.000.000/0000-00" maxlength="18">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nome da Seguradora</label>
                <input type="text" class="form-control" id="emp-seg-nome" value="${emp.seguradoraNome || ''}" placeholder="Ex: Porto Seguro">
              </div>
              <div class="form-group">
                <label class="form-label">Número da Apólice</label>
                <input type="text" class="form-control" id="emp-seg-apolice" value="${emp.numeroApolice || ''}" placeholder="Número da apólice">
              </div>
            </div>
          </div>

          <div style="margin-top:20px;padding:16px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md)">
            <h4 style="font-size:0.9rem;margin-bottom:12px;color:var(--text-primary)"><i class="fa-solid fa-key" style="color:var(--warning);margin-right:8px"></i>Integração Focus NFe (SEFAZ)</h4>
            <div class="form-group">
              <label class="form-label">Token da API <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(Opcional neste momento)</span></label>
              <div style="display:flex; gap:10px">
                <input type="password" class="form-control" id="emp-focus-token" style="flex:1" value="${emp.focusToken || emp.focus_token || ''}" placeholder="Cole aqui o token da API da Focus NFe">
                <button type="button" class="btn btn-secondary" id="btn-test-api" title="Testar Token da API" style="padding: 11px 16px"><i class="fa-solid fa-plug" id="icon-test-api"></i></button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Ambiente da SEFAZ</label>
              <select class="form-control form-select" id="emp-focus-ambiente">
                <option value="homologacao" ${(!emp.focusAmbiente && !emp.focus_ambiente) || emp.focusAmbiente === 'homologacao' || emp.focus_ambiente === 'homologacao' ? 'selected' : ''}>🧪 Homologação (Testes)</option>
                <option value="producao" ${emp.focusAmbiente === 'producao' || emp.focus_ambiente === 'producao' ? 'selected' : ''}>🔴 Produção (Validade Jurídica)</option>
              </select>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancel-empresa-modal">Cancelar</button>
        <button class="btn btn-primary" id="save-empresa">
          <i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Masks & Interactivity
  document.querySelectorAll('input[name="tipo-doc"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isPF = radio.value === 'cpf';
      document.getElementById('campo-cpf').style.display = isPF ? '' : 'none';
      document.getElementById('campo-cnpj').style.display = isPF ? 'none' : '';
      document.getElementById('label-nome').textContent = isPF ? 'Nome Completo *' : 'Razão Social *';
      document.getElementById('emp-razao').placeholder = isPF ? 'Nome completo do motorista' : 'Razão Social da empresa';
      if (isPF) {
        document.getElementById('emp-tipo-transp').value = '2'; // TAC
        document.getElementById('container-rntrc').style.display = '';
        document.getElementById('secao-seguro').style.display = '';
      }
      
      const lblCpf = document.getElementById('label-tipo-cpf');
      const lblCnpj = document.getElementById('label-tipo-cnpj');
      lblCpf.style.borderColor = isPF ? 'var(--primary-400)' : 'var(--border-color)';
      lblCpf.style.background = isPF ? 'rgba(99,102,241,0.08)' : 'transparent';
      lblCnpj.style.borderColor = !isPF ? 'var(--primary-400)' : 'var(--border-color)';
      lblCnpj.style.background = !isPF ? 'rgba(99,102,241,0.08)' : 'transparent';
    });
  });

  document.getElementById('emp-tipo-transp').addEventListener('change', (e) => {
    const isCargaPropria = e.target.value === '4';
    document.getElementById('container-rntrc').style.display = isCargaPropria ? 'none' : '';
    document.getElementById('secao-seguro').style.display = isCargaPropria ? 'none' : '';
    if (isCargaPropria) document.getElementById('emp-rntrc').value = '';
  });

  const cpfInput = document.getElementById('emp-cpf');
  cpfInput.addEventListener('input', () => {
    cpfInput.value = formatarCPF(cpfInput.value);
    document.getElementById('cpf-error').style.display = 'none';
    cpfInput.classList.remove('error');
  });

  const cnpjInput = document.getElementById('emp-cnpj');
  cnpjInput.addEventListener('input', () => {
    cnpjInput.value = formatarCNPJ(cnpjInput.value);
    document.getElementById('cnpj-error').style.display = 'none';
    cnpjInput.classList.remove('error');
  });

  const telInput = document.getElementById('emp-telefone');
  telInput.addEventListener('input', () => { telInput.value = formatarTelefone(telInput.value); });
  
  // IBGE Autocomplete
  const fetchCidades = async (uf, datalistId, stateVar, clearFields) => {
    if (!uf) return;
    if (clearFields && document.getElementById(clearFields.mun)) document.getElementById(clearFields.mun).value = '';
    if (clearFields && document.getElementById(clearFields.cod)) document.getElementById(clearFields.cod).value = '';
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const data = await res.json();
      window[stateVar] = data;
      const dl = document.getElementById(datalistId);
      if (dl) dl.innerHTML = data.map(c => `<option value="${c.nome}"></option>`).join('');
    } catch (err) { console.error('Erro IBGE:', err); }
  };

  const ufInput = document.getElementById('emp-uf');
  if (ufInput) {
    ufInput.addEventListener('change', () => fetchCidades(ufInput.value, 'dl-emp-mun', 'empMunList', { mun: 'emp-municipio', cod: 'emp-cod-municipio' }));
  }

  // Initial load for edit
  if (emp.uf && !window.empMunList) {
    fetchCidades(emp.uf, 'dl-emp-mun', 'empMunList', null);
  } else if (emp.uf && window.empMunList) {
    const dl = document.getElementById('dl-emp-mun');
    if (dl) dl.innerHTML = window.empMunList.map(c => `<option value="${c.nome}"></option>`).join('');
  }

  const munInput = document.getElementById('emp-municipio');
  if (munInput) {
    munInput.addEventListener('change', () => {
      if (!window.empMunList) return;
      const cid = window.empMunList.find(c => c.nome.toLowerCase() === munInput.value.toLowerCase());
      if (cid) document.getElementById('emp-cod-municipio').value = cid.id;
    });
  }

  // API Tester Logic
  const btnTestApi = document.getElementById('btn-test-api');
  if (btnTestApi) {
    btnTestApi.addEventListener('click', async () => {
      const token = document.getElementById('emp-focus-token').value.trim();
      const ambiente = document.getElementById('emp-focus-ambiente').value;
      
      if (!token) {
        showToast('Cole o token primeiro antes de testar.', 'warning');
        return;
      }
      
      const icon = document.getElementById('icon-test-api');
      icon.className = 'fa-solid fa-spinner fa-spin text-primary';
      btnTestApi.disabled = true;

      try {
        await focus.testarConexao(token, ambiente);
        
        showToast('Conexão com a Focus NFe bem-sucedida!', 'success');
        icon.className = 'fa-solid fa-check text-success';
      } catch (err) {
        showToast(`Falha na conexão: ${err.message}`, 'error');
        icon.className = 'fa-solid fa-xmark text-danger';
      } finally {
        setTimeout(() => {
          btnTestApi.disabled = false;
          if (icon.className.includes('fa-check')) return; // keep check until edit
          icon.className = 'fa-solid fa-plug';
        }, 3000);
      }
    });

    document.getElementById('emp-focus-token').addEventListener('input', () => {
      const icon = document.getElementById('icon-test-api');
      if (icon) icon.className = 'fa-solid fa-plug';
    });
  }

  // Close rules
  const closeModal = () => overlay.remove();
  document.getElementById('close-empresa-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-empresa-modal').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Save changes
  document.getElementById('save-empresa').addEventListener('click', async () => {
    const btn = document.getElementById('save-empresa');
    const tipoDocSel = document.querySelector('input[name="tipo-doc"]:checked')?.value || 'cnpj';
    const razaoSocial = document.getElementById('emp-razao').value.trim();
    const ie = document.getElementById('emp-ie').value.trim();
    const tipoTransporte = document.getElementById('emp-tipo-transp').value;
    const rntrc = document.getElementById('emp-rntrc').value.trim();
    const uf = document.getElementById('emp-uf').value;
    const municipio = document.getElementById('emp-municipio').value.trim();
    const codMunicipio = document.getElementById('emp-cod-municipio').value.replace(/\D/g, '');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    if (!razaoSocial || !ie || !uf || !municipio) {
      showToast('Preencha os campos obrigatórios', 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}`;
      return;
    }
    if (!codMunicipio || codMunicipio.length !== 7) {
      showToast('Código IBGE do Município deve ter 7 dígitos', 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}`;
      return;
    }
    
    // For type 1, 2, 3 RNTRC is required according to form logic (unless skipped sometimes, but let's encourage it)
    if (tipoTransporte !== '4' && (!rntrc || rntrc.length < 8)) {
      showToast('RNTRC inválido ou não informado (8 dígitos numéricos)', 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}`;
      return;
    }

    const dadosEmpresa = {
      tipoDoc: tipoDocSel,
      razaoSocial,
      nomeFantasia: document.getElementById('emp-fantasia').value.trim(),
      ie, uf, municipio, codMunicipio, tipoTransporte, rntrc,
      telefone: document.getElementById('emp-telefone').value.replace(/\D/g, ''),
      endereco: document.getElementById('emp-endereco').value.trim(),
      cep: document.getElementById('emp-cep').value.trim(),
      focusToken: document.getElementById('emp-focus-token').value.trim(),
      focusAmbiente: document.getElementById('emp-focus-ambiente').value,
      responsavelSeguro: document.getElementById('emp-seg-resp').value,
      seguradoraCnpj: document.getElementById('emp-seg-cnpj').value.replace(/\D/g, ''),
      seguradoraNome: document.getElementById('emp-seg-nome').value.trim(),
      numeroApolice: document.getElementById('emp-seg-apolice').value.trim(),
      ...(isEdit ? { id: editId } : {})
    };

    if (tipoDocSel === 'cpf') {
      const cpfRaw = document.getElementById('emp-cpf').value.replace(/\D/g, '');
      if (!cpfRaw) { showToast('Informe o CPF', 'error'); btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}`; return; }
      if (!validarCPF(cpfRaw)) {
        document.getElementById('cpf-error').style.display = 'block';
        cpfInput.classList.add('error');
        showToast('CPF inválido', 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}`;
        return;
      }
      dadosEmpresa.cpf = cpfRaw;
      dadosEmpresa.cnpj = null;
    } else {
      const cnpjRaw = document.getElementById('emp-cnpj').value.replace(/\D/g, '');
      if (!cnpjRaw) { showToast('Informe o CNPJ', 'error'); btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}`; return; }
      if (!validarCNPJ(cnpjRaw)) {
        document.getElementById('cnpj-error').style.display = 'block';
        cnpjInput.classList.add('error');
        showToast('CNPJ inválido', 'error');
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Salvar Alterações' : 'Cadastrar Empresa'}`;
        return;
      }
      dadosEmpresa.cnpj = cnpjRaw;
      dadosEmpresa.cpf = null;
    }

    await saveEmpresa(dadosEmpresa);
    showToast(isEdit ? 'Empresa atualizada!' : 'Empresa cadastrada!', 'success');
    closeModal();
    renderEmpresa();
  });
}

async function confirmDeleteEmpresa(id) {
  const emp = await getEmpresaById(id);
  if (!emp) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-body text-center" style="padding:32px">
        <div class="confirm-icon text-danger">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 style="margin-bottom:8px">Excluir Empresa</h3>
        <p style="color:var(--text-secondary); font-size:0.9rem">
          Tem certeza que deseja excluir a empresa <strong>${emp.razaoSocial}</strong>?<br>
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

  document.getElementById('confirm-delete').addEventListener('click', async () => {
    try {
        await deleteEmpresa(id);
        showToast('Empresa excluída', 'success');
        overlay.remove();
        renderEmpresa();
    } catch(err) {
        showToast(err.message, 'error');
        overlay.remove();
    }
  });
}
