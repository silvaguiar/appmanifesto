import { getEmpresa, saveEmpresa } from '../store/dataStore.js';
import { validarCPF, validarCNPJ, formatarCPF, formatarCNPJ, formatarTelefone, UFS } from '../utils/validators.js';
import { showToast } from '../components/toast.js';

export async function renderEmpresa() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  const emp = await getEmpresa();

  // Determina tipo de documento salvo (cpf = pessoa física, cnpj = pessoa jurídica)
  const tipoDoc = emp.tipoDoc || (emp.cpf ? 'cpf' : 'cnpj');

  content.innerHTML = `<div class="fade-in">
    <div class="page-header"><h2><i class="fa-solid fa-building" style="color:var(--primary-400);margin-right:10px"></i>Empresa Emitente</h2><p>Dados do emitente responsável pela emissão do MDF-e</p></div>
    <div class="card"><div class="card-body">
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
              <option value="2" ${(emp.tipoTransporte === '2' || !emp.tipoTransporte) ? 'selected' : ''}>TAC — Transportador Autônomo de Cargas</option>
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
            <input type="text" class="form-control" id="emp-municipio" value="${emp.municipio || ''}" placeholder="Município">
          </div>
          <div class="form-group">
            <label class="form-label">Cód. IBGE do Município *
              <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400;margin-left:4px">7 dígitos</span>
            </label>
            <input type="text" class="form-control" id="emp-cod-municipio" value="${emp.codMunicipio || ''}" placeholder="Ex: 3550308" maxlength="7">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:3px">
              Consulte em <a href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php" target="_blank">ibge.gov.br</a>
            </div>
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

        ${emp.cnpj || emp.cpf ? `
        <div style="margin-top:8px;padding:12px 16px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.15);border-radius:var(--radius-md);display:flex;align-items:center;gap:10px">
          <i class="fa-solid fa-circle-check" style="color:var(--success)"></i>
          <span style="font-size:0.85rem;color:var(--text-secondary)">Emitente: <strong style="color:var(--text-primary)">${emp.razaoSocial || '-'}</strong> | Doc: <code>${emp.cpf ? formatarCPF(emp.cpf) : formatarCNPJ(emp.cnpj)}</code></span>
        </div>` : ''}

        <div style="display:flex;justify-content:flex-end;margin-top:24px">
          <button type="button" class="btn btn-primary" id="save-empresa"><i class="fa-solid fa-check"></i> Salvar Dados</button>
        </div>
      </form>
    </div></div>
  </div>`;

  // Toggle CPF/CNPJ
  document.querySelectorAll('input[name="tipo-doc"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isPF = radio.value === 'cpf';
      document.getElementById('campo-cpf').style.display = isPF ? '' : 'none';
      document.getElementById('campo-cnpj').style.display = isPF ? 'none' : '';
      document.getElementById('label-nome').textContent = isPF ? 'Nome Completo *' : 'Razão Social *';
      document.getElementById('emp-razao').placeholder = isPF ? 'Nome completo do motorista' : 'Razão Social da empresa';
      if (isPF) {
        // Auto-select TAC for CPF
        document.getElementById('emp-tipo-transp').value = '2';
      }
      // Update radio label styles
      const lblCpf = document.getElementById('label-tipo-cpf');
      const lblCnpj = document.getElementById('label-tipo-cnpj');

      lblCpf.style.borderColor = isPF ? 'var(--primary-400)' : 'var(--border-color)';
      lblCpf.style.background = isPF ? 'rgba(99,102,241,0.08)' : 'transparent';
      lblCnpj.style.borderColor = !isPF ? 'var(--primary-400)' : 'var(--border-color)';
      lblCnpj.style.background = !isPF ? 'rgba(99,102,241,0.08)' : 'transparent';
    });
  });

  // Toggle RNTRC visibility off for Carga Propria (4)
  document.getElementById('emp-tipo-transp').addEventListener('change', (e) => {
    const isCargaPropria = e.target.value === '4';
    document.getElementById('container-rntrc').style.display = isCargaPropria ? 'none' : '';
    if (isCargaPropria) document.getElementById('emp-rntrc').value = '';
  });

  // Masks
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

  document.getElementById('save-empresa').addEventListener('click', async () => {
    const tipoDocSel = document.querySelector('input[name="tipo-doc"]:checked')?.value || 'cnpj';
    const razaoSocial = document.getElementById('emp-razao').value.trim();
    const ie = document.getElementById('emp-ie').value.trim();
    const tipoTransporte = document.getElementById('emp-tipo-transp').value;
    const rntrc = document.getElementById('emp-rntrc').value.trim();
    const uf = document.getElementById('emp-uf').value;
    const municipio = document.getElementById('emp-municipio').value.trim();
    const codMunicipio = document.getElementById('emp-cod-municipio').value.replace(/\D/g, '');

    const btn = document.getElementById('save-empresa');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    // Validate basic required fields
    if (!razaoSocial || !ie || !uf || !municipio) {
      showToast('Preencha os campos obrigatórios', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Dados';
      return;
    }
    if (!codMunicipio || codMunicipio.length !== 7) {
      showToast('Código IBGE do Município deve ter 7 dígitos', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Dados';
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
      // Clear opposing doc type
      cpf: undefined,
      cnpj: undefined,
    };

    if (tipoDocSel === 'cpf') {
      const cpfRaw = document.getElementById('emp-cpf').value.replace(/\D/g, '');
      if (!cpfRaw) { showToast('Informe o CPF', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Dados'; return; }
      if (!validarCPF(cpfRaw)) {
        document.getElementById('cpf-error').style.display = 'block';
        cpfInput.classList.add('error');
        showToast('CPF inválido', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Dados';
        return;
      }
      dadosEmpresa.cpf = cpfRaw;
    } else {
      const cnpjRaw = document.getElementById('emp-cnpj').value.replace(/\D/g, '');
      if (!cnpjRaw) { showToast('Informe o CNPJ', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Dados'; return; }
      if (!validarCNPJ(cnpjRaw)) {
        document.getElementById('cnpj-error').style.display = 'block';
        cnpjInput.classList.add('error');
        showToast('CNPJ inválido', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Dados';
        return;
      }
      dadosEmpresa.cnpj = cnpjRaw;
    }

    await saveEmpresa(dadosEmpresa);
    showToast('Dados da empresa salvos com sucesso!', 'success');
    await renderEmpresa(); // re-render to show saved status banner
  });
}
