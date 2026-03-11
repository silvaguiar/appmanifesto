import { getMotoristas, getVeiculos, getMotoristaById, getVeiculoById, saveMDFe, getEmpresa, updateMDFeStatus } from '../store/dataStore.js';
import { UFS, formatarCPF, formatarChaveAcesso, validarChaveAcesso, TIPOS_RODADO, TIPOS_CARROCERIA } from '../utils/validators.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import * as focus from '../services/focusNfe.js';

const STEPS = [
  { label: 'Dados Gerais' }, { label: 'Motorista' }, { label: 'Veículo' },
  { label: 'Documentos' }, { label: 'Carga' }, { label: 'Percurso' }, { label: 'Revisão' }
];

let currentStep = 0;
let formData = {};
let motoristasLivre = [];
let veiculosLivre = [];

async function resetForm() {
  currentStep = 0;

  if (window.mdfeDraftData) {
    formData = window.mdfeDraftData;
    window.mdfeDraftData = null; // consume
  } else {
    formData = {
      ufInicio: '', ufFim: '', munCarregamento: '', munDescarregamento: '',
      codMunCarregamento: '', codMunDescarregamento: '',
      motoristaId: '', veiculoId: '', documentos: [], pesoBruto: '', valorCarga: '', infoComplementar: '', percurso: []
    };
  }

  // Pre-fetch data for the wizard
  motoristasLivre = await getMotoristas();
  veiculosLivre = await getVeiculos();
}

export async function renderMDFeEmissao() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  await resetForm();
  await renderWizard();
}

async function renderWizard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="fade-in">
    <div class="page-header"><h2><i class="fa-solid fa-file-circle-plus" style="color:var(--primary-400);margin-right:10px"></i>Emitir MDF-e</h2><p>Preencha os dados para gerar o Manifesto Eletrônico</p></div>
    <div class="card"><div class="card-body">
      <div class="wizard-steps">${STEPS.map((s, i) => `<div class="wizard-step ${i < currentStep ? 'completed' : i === currentStep ? 'active' : ''}"><div class="wizard-step-number">${i < currentStep ? '<i class="fa-solid fa-check" style="font-size:0.75rem"></i>' : i + 1}</div><span class="wizard-step-label">${s.label}</span></div>`).join('')}</div>
      <div class="wizard-content" id="wizard-content">${await renderStepContent(currentStep)}</div>
      <div class="wizard-actions">
        <button class="btn btn-secondary" id="btn-prev" ${currentStep === 0 ? 'disabled style="opacity:0.5"' : ''}><i class="fa-solid fa-arrow-left"></i> Anterior</button>
        <div>${currentStep === 6 ? '<button class="btn btn-success btn-lg" id="btn-emit"><i class="fa-solid fa-paper-plane"></i> Emitir MDF-e</button>' : '<button class="btn btn-primary" id="btn-next">Próximo <i class="fa-solid fa-arrow-right"></i></button>'}</div>
      </div>
    </div></div></div>`;
  document.getElementById('btn-prev')?.addEventListener('click', () => { if (currentStep > 0) { saveStep(); currentStep--; renderWizard(); } });
  document.getElementById('btn-next')?.addEventListener('click', () => { if (validateStep()) { saveStep(); currentStep++; renderWizard(); } });
  document.getElementById('btn-emit')?.addEventListener('click', emitMDFe);
  setupEvents();
}

async function renderStepContent(step) {
  if (step === 0) return `<div><h3 style="font-size:1.1rem;margin-bottom:20px"><i class="fa-solid fa-map-location-dot" style="color:var(--primary-300);margin-right:8px"></i>Dados Gerais</h3>
    <div class="form-row"><div class="form-group"><label class="form-label">UF Início *</label><select class="form-control form-select" id="wiz-uf-inicio"><option value="">Selecione a UF origem</option>${UFS.map(u => `<option value="${u}" ${formData.ufInicio === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">UF Fim *</label><select class="form-control form-select" id="wiz-uf-fim"><option value="">Selecione a UF destino</option>${UFS.map(u => `<option value="${u}" ${formData.ufFim === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div></div>
    
    <div class="form-row"><div class="form-group"><label class="form-label">Município Carregamento *</label>
        <input type="text" class="form-control" id="wiz-mun-c" list="dl-mun-c" value="${formData.munCarregamento}" placeholder="Selecione a UF origem e digite a Cidade" autocomplete="off">
        <datalist id="dl-mun-c"></datalist>
    </div>
    <div class="form-group"><label class="form-label">Município Descarregamento *</label>
        <input type="text" class="form-control" id="wiz-mun-d" list="dl-mun-d" value="${formData.munDescarregamento}" placeholder="Selecione a UF destino e digite a Cidade" autocomplete="off">
        <datalist id="dl-mun-d"></datalist>
    </div></div>
    
    <div class="form-row"><div class="form-group"><label class="form-label">Cód. IBGE Mun. Carregamento *</label>
        <input type="text" class="form-control" id="wiz-cod-c" value="${formData.codMunCarregamento}" placeholder="Automático ao escolher Cidade" readonly style="background:rgba(255,255,255,0.03);color:var(--text-muted);cursor:not-allowed">
    </div>
    <div class="form-group"><label class="form-label">Cód. IBGE Mun. Descarregamento *</label>
        <input type="text" class="form-control" id="wiz-cod-d" value="${formData.codMunDescarregamento}" placeholder="Automático ao escolher Cidade" readonly style="background:rgba(255,255,255,0.03);color:var(--text-muted);cursor:not-allowed">
    </div></div></div>`;

  if (step === 1) {
    const mots = motoristasLivre.filter(m => m.ativo !== false);
    return `<div><h3 style="font-size:1.1rem;margin-bottom:20px"><i class="fa-solid fa-id-card" style="color:var(--primary-300);margin-right:8px"></i>Selecione o Motorista</h3>
    ${mots.length === 0 ? '<div class="empty-state"><i class="fa-solid fa-user-slash"></i><h4>Nenhum motorista</h4><p>Cadastre motoristas primeiro</p><button class="btn btn-primary" onclick="window.navigateTo(\'/motoristas\')"><i class="fa-solid fa-plus"></i> Cadastrar</button></div>'
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">${mots.map(m => `<div class="card motorista-card" data-id="${m.id}" style="cursor:pointer;${formData.motoristaId === m.id ? 'border-color:var(--primary-400);background:rgba(99,102,241,0.08)' : ''}"><div class="card-body" style="padding:16px;display:flex;align-items:center;gap:14px"><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary-500),#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1rem">${m.nome.charAt(0)}</div><div style="flex:1"><div style="font-weight:600;color:var(--text-primary)">${m.nome}</div><div style="font-size:0.78rem;color:var(--text-muted)">CPF: ${formatarCPF(m.cpf)}</div><div style="font-size:0.75rem;color:var(--text-muted)">CNH: ${m.cnh} | ${m.categoriaCnh}</div></div>${formData.motoristaId === m.id ? '<i class="fa-solid fa-circle-check" style="color:var(--primary-400);font-size:1.2rem"></i>' : ''}</div></div>`).join('')}</div>`}</div>`;
  }

  if (step === 2) {
    const veics = veiculosLivre.filter(v => v.ativo !== false);
    return `<div><h3 style="font-size:1.1rem;margin-bottom:20px"><i class="fa-solid fa-truck" style="color:var(--primary-300);margin-right:8px"></i>Selecione o Veículo</h3>
    ${veics.length === 0 ? '<div class="empty-state"><i class="fa-solid fa-truck-ramp-box"></i><h4>Nenhum veículo</h4><button class="btn btn-primary" onclick="window.navigateTo(\'/veiculos\')"><i class="fa-solid fa-plus"></i> Cadastrar</button></div>'
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">${veics.map(v => { const tr = TIPOS_RODADO.find(t => t.value === v.tipoRodado); return `<div class="card veiculo-card" data-id="${v.id}" style="cursor:pointer;${formData.veiculoId === v.id ? 'border-color:var(--primary-400);background:rgba(99,102,241,0.08)' : ''}"><div class="card-body" style="padding:16px;display:flex;align-items:center;gap:14px"><div style="width:44px;height:44px;border-radius:var(--radius-sm);background:rgba(96,165,250,0.12);display:flex;align-items:center;justify-content:center;color:var(--info);font-size:1.1rem"><i class="fa-solid fa-truck"></i></div><div style="flex:1"><div style="font-weight:700;font-family:monospace;font-size:1.05rem;color:var(--text-primary)">${v.placa}</div><div style="font-size:0.78rem;color:var(--text-muted)">${tr ? tr.label : '-'} | ${v.uf}</div><div style="font-size:0.75rem;color:var(--text-muted)">Cap: ${Number(v.capKg).toLocaleString('pt-BR')} kg</div></div>${formData.veiculoId === v.id ? '<i class="fa-solid fa-circle-check" style="color:var(--primary-400);font-size:1.2rem"></i>' : ''}</div></div>` }).join('')}</div>`}</div>`;
  }

  if (step === 3) return `<div><h3 style="font-size:1.1rem;margin-bottom:20px"><i class="fa-solid fa-file-invoice" style="color:var(--primary-300);margin-right:8px"></i>Documentos Fiscais</h3>
    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:flex-end">
      <div class="form-group" style="flex:0 0 120px;margin-bottom:0"><label class="form-label">Tipo</label><select class="form-control form-select" id="wiz-doc-tipo"><option value="nfe">NF-e</option><option value="cte">CT-e</option></select></div>
      <div class="form-group" style="flex:1;margin-bottom:0;min-width:250px"><label class="form-label">Chave de Acesso (44 dígitos)</label><input type="text" class="form-control" id="wiz-doc-chave" placeholder="Chave de 44 dígitos" maxlength="55"></div>
      <button class="btn btn-primary" id="btn-add-doc"><i class="fa-solid fa-plus"></i> Adicionar</button>
    </div>
    <div class="doc-list" id="doc-list">${formData.documentos.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fa-solid fa-file-circle-plus" style="font-size:2rem;margin-bottom:8px;opacity:0.4"></i><p>Nenhum documento</p></div>'
      : formData.documentos.map((d, i) => `<div class="doc-item"><span class="doc-item-type badge ${d.tipo === 'nfe' ? 'badge-primary' : 'badge-info'}">${d.tipo.toUpperCase()}</span><span class="doc-item-key">${formatarChaveAcesso(d.chave)}</span><button class="btn btn-sm btn-danger btn-rm-doc" data-i="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}</div></div>`;

  if (step === 4) return `<div><h3 style="font-size:1.1rem;margin-bottom:20px"><i class="fa-solid fa-box" style="color:var(--primary-300);margin-right:8px"></i>Informações da Carga</h3>
    <div class="form-row"><div class="form-group"><label class="form-label">Peso Bruto (kg) *</label><input type="number" class="form-control" id="wiz-peso" value="${formData.pesoBruto}" placeholder="15000" step="0.01"></div>
    <div class="form-group"><label class="form-label">Valor da Carga (R$) *</label><input type="number" class="form-control" id="wiz-valor" value="${formData.valorCarga}" placeholder="50000.00" step="0.01"></div></div>
    <div class="form-group"><label class="form-label">Info Complementar</label><textarea class="form-control" id="wiz-info" placeholder="Observações...">${formData.infoComplementar}</textarea></div></div>`;

  if (step === 5) return `<div><h3 style="font-size:1.1rem;margin-bottom:20px"><i class="fa-solid fa-route" style="color:var(--primary-300);margin-right:8px"></i>Percurso</h3>
    <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px">UFs por onde o veículo passará</p>
    <div style="display:flex;gap:10px;margin-bottom:20px;align-items:flex-end">
      <div class="form-group" style="flex:0 0 200px;margin-bottom:0"><label class="form-label">UF</label><select class="form-control form-select" id="wiz-perc-uf"><option value="">Selecione</option>${UFS.map(u => `<option value="${u}">${u}</option>`).join('')}</select></div>
      <button class="btn btn-primary" id="btn-add-perc"><i class="fa-solid fa-plus"></i> Adicionar</button>
    </div>
    <div class="percurso-tags" id="perc-tags">${formData.percurso.length === 0 ? '<span style="color:var(--text-muted);font-size:0.85rem">Nenhuma UF adicionada</span>'
      : formData.percurso.map((u, i) => `<div class="percurso-tag"><i class="fa-solid fa-location-dot"></i> ${u} <span class="remove-tag" data-i="${i}"><i class="fa-solid fa-xmark"></i></span></div>`).join('')}</div>
    ${formData.percurso.length > 0 ? `<div style="margin-top:20px;padding:14px;background:rgba(99,102,241,0.06);border-radius:var(--radius-md);border:1px solid rgba(99,102,241,0.12)"><div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">Rota:</div><div style="font-size:0.95rem;font-weight:600;color:var(--primary-300)">${formData.ufInicio} → ${formData.percurso.join(' → ')} → ${formData.ufFim}</div></div>` : ''}</div>`;

  if (step === 6) {
    const mot = motoristasLivre.find(m => m.id === formData.motoristaId);
    const veic = veiculosLivre.find(v => v.id === formData.veiculoId);
    return `<div><h3 style="font-size:1.1rem;margin-bottom:20px"><i class="fa-solid fa-check-double" style="color:var(--success);margin-right:8px"></i>Revisão Final</h3>
    <div class="review-section"><h4><i class="fa-solid fa-map-location-dot"></i> Dados Gerais</h4>
      <div class="review-row"><span class="label">UF Início / Fim</span><span class="value">${formData.ufInicio} → ${formData.ufFim}</span></div>
      <div class="review-row"><span class="label">Carregamento</span><span class="value">${formData.munCarregamento}</span></div>
      <div class="review-row"><span class="label">Descarregamento</span><span class="value">${formData.munDescarregamento}</span></div></div>
    <div class="review-section"><h4><i class="fa-solid fa-id-card"></i> Motorista</h4>
      <div class="review-row"><span class="label">Nome</span><span class="value">${mot ? mot.nome : '-'}</span></div>
      <div class="review-row"><span class="label">CPF</span><span class="value">${mot ? formatarCPF(mot.cpf) : '-'}</span></div></div>
    <div class="review-section"><h4><i class="fa-solid fa-truck"></i> Veículo</h4>
      <div class="review-row"><span class="label">Placa</span><span class="value">${veic ? veic.placa : '-'}</span></div></div>
    <div class="review-section"><h4><i class="fa-solid fa-box"></i> Carga</h4>
      <div class="review-row"><span class="label">Peso</span><span class="value">${Number(formData.pesoBruto).toLocaleString('pt-BR')} kg</span></div>
      <div class="review-row"><span class="label">Valor</span><span class="value">R$ ${Number(formData.valorCarga).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div></div>
    <div class="review-section"><h4><i class="fa-solid fa-file-invoice"></i> Documentos (${formData.documentos.length})</h4>
      ${formData.documentos.map(d => `<div class="review-row"><span class="label">${d.tipo.toUpperCase()}</span><span class="value" style="font-family:monospace;font-size:0.8rem">${formatarChaveAcesso(d.chave)}</span></div>`).join('') || '<span style="color:var(--text-muted)">Nenhum</span>'}</div></div>`;
  }
  return '';
}

function setupEvents() {
  // Config IBGE autocompletes if step 0
  if (currentStep === 0) {
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

    const ufIni = document.getElementById('wiz-uf-inicio');
    const ufFim = document.getElementById('wiz-uf-fim');
    if (ufIni) ufIni.addEventListener('change', () => fetchCidades(ufIni.value, 'dl-mun-c', 'munListC', { mun: 'wiz-mun-c', cod: 'wiz-cod-c' }));
    if (ufFim) ufFim.addEventListener('change', () => fetchCidades(ufFim.value, 'dl-mun-d', 'munListD', { mun: 'wiz-mun-d', cod: 'wiz-cod-d' }));

    // Initial load for draft edits
    if (formData.ufInicio && !window.munListC) fetchCidades(formData.ufInicio, 'dl-mun-c', 'munListC', null);
    else if (formData.ufInicio && window.munListC) { const dl = document.getElementById('dl-mun-c'); if (dl) dl.innerHTML = window.munListC.map(c => `<option value="${c.nome}"></option>`).join(''); }

    if (formData.ufFim && !window.munListD) fetchCidades(formData.ufFim, 'dl-mun-d', 'munListD', null);
    else if (formData.ufFim && window.munListD) { const dl = document.getElementById('dl-mun-d'); if (dl) dl.innerHTML = window.munListD.map(c => `<option value="${c.nome}"></option>`).join(''); }

    const munC = document.getElementById('wiz-mun-c');
    if (munC) munC.addEventListener('change', () => {
      if (!window.munListC) return;
      const cid = window.munListC.find(c => c.nome.toLowerCase() === munC.value.toLowerCase());
      if (cid) document.getElementById('wiz-cod-c').value = cid.id;
    });

    const munD = document.getElementById('wiz-mun-d');
    if (munD) munD.addEventListener('change', () => {
      if (!window.munListD) return;
      const cid = window.munListD.find(c => c.nome.toLowerCase() === munD.value.toLowerCase());
      if (cid) document.getElementById('wiz-cod-d').value = cid.id;
    });
  }

  document.querySelectorAll('.motorista-card').forEach(c => c.addEventListener('click', () => { formData.motoristaId = c.dataset.id; renderWizard(); }));
  document.querySelectorAll('.veiculo-card').forEach(c => c.addEventListener('click', () => { formData.veiculoId = c.dataset.id; renderWizard(); }));
  const ch = document.getElementById('wiz-doc-chave');
  if (ch) ch.addEventListener('input', () => { ch.value = formatarChaveAcesso(ch.value); });
  document.getElementById('btn-add-doc')?.addEventListener('click', () => {
    const t = document.getElementById('wiz-doc-tipo').value; const k = document.getElementById('wiz-doc-chave').value.replace(/\D/g, '');
    if (!validarChaveAcesso(k)) { showToast('Chave deve ter 44 dígitos', 'error'); return; }
    if (formData.documentos.some(d => d.chave === k)) { showToast('Chave já adicionada', 'warning'); return; }
    formData.documentos.push({ tipo: t, chave: k }); renderWizard(); showToast('Documento adicionado', 'success');
  });
  document.querySelectorAll('.btn-rm-doc').forEach(b => b.addEventListener('click', () => { formData.documentos.splice(parseInt(b.dataset.i), 1); renderWizard(); }));
  document.getElementById('btn-add-perc')?.addEventListener('click', () => {
    const u = document.getElementById('wiz-perc-uf').value; if (!u) return;
    if (formData.percurso.includes(u)) { showToast('UF já no percurso', 'warning'); return; }
    formData.percurso.push(u); renderWizard();
  });
  document.querySelectorAll('.remove-tag').forEach(t => t.addEventListener('click', () => { formData.percurso.splice(parseInt(t.dataset.i), 1); renderWizard(); }));
}

function saveStep() {
  if (currentStep === 0) { formData.ufInicio = document.getElementById('wiz-uf-inicio')?.value || ''; formData.ufFim = document.getElementById('wiz-uf-fim')?.value || ''; formData.munCarregamento = document.getElementById('wiz-mun-c')?.value || ''; formData.munDescarregamento = document.getElementById('wiz-mun-d')?.value || ''; formData.codMunCarregamento = document.getElementById('wiz-cod-c')?.value || ''; formData.codMunDescarregamento = document.getElementById('wiz-cod-d')?.value || ''; }
  if (currentStep === 4) { formData.pesoBruto = document.getElementById('wiz-peso')?.value || ''; formData.valorCarga = document.getElementById('wiz-valor')?.value || ''; formData.infoComplementar = document.getElementById('wiz-info')?.value || ''; }
}

function validateStep() {
  saveStep();
  if (currentStep === 0 && (!formData.ufInicio || !formData.ufFim || !formData.munCarregamento || !formData.munDescarregamento || !formData.codMunCarregamento || !formData.codMunDescarregamento)) { showToast('Preencha todos os campos incluindo código IBGE', 'error'); return false; }
  if (currentStep === 1 && !formData.motoristaId) { showToast('Selecione um motorista', 'error'); return false; }
  if (currentStep === 2 && !formData.veiculoId) { showToast('Selecione um veículo', 'error'); return false; }
  if (currentStep === 4 && (!formData.pesoBruto || !formData.valorCarga)) { showToast('Preencha peso e valor', 'error'); return false; }
  return true;
}

async function emitMDFe() {
  const btn = document.getElementById('btn-emit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Emitindo...';

  // Save in Supabase first
  try {
    const mdfe = await saveMDFe({ ...formData });

    if (!focus.isConfigured()) {
      showToast(`MDF-e nº ${String(mdfe.numero).padStart(6, '0')} salvo no banco. Configure a API para emitir na SEFAZ.`, 'warning');
      setTimeout(() => navigate('/mdfe-lista'), 800);
      return;
    }

    const empresa = await getEmpresa();
    const motorista = await getMotoristaById(formData.motoristaId);
    const veiculo = await getVeiculoById(formData.veiculoId);
    const payload = focus.montarPayloadMDFe(formData, motorista, veiculo, empresa);

    const ref = mdfe.id;
    const result = await focus.emitirMDFe(ref, payload);

    // Update Supabase record with SEFAZ response
    const updates = {
      focusRef: ref,
      status: result.status || 'processando_autorizacao',
      statusSefaz: result.status_sefaz,
      mensagemSefaz: result.mensagem_sefaz,
      chaveMdfe: result.chave_mdfe,
      numeroSefaz: result.numero,
      serieSefaz: result.serie,
      caminhoDAMDFE: result.caminho_damdfe,
      caminhoXml: result.caminho_xml
    };

    await updateMDFeStatus(mdfe.id, updates);

    if (result.status === 'erro_autorizacao') {
      showToast(`Rejeição SEFAZ: ${result.mensagem_sefaz}`, 'error');
    } else if (result.status === 'autorizado') {
      showToast('MDF-e autorizado na SEFAZ!', 'success');
    } else {
      showToast('MDF-e enviado! Aguarde processamento na SEFAZ.', 'info');
    }
    setTimeout(() => navigate('/mdfe-lista'), 1200);
  } catch (err) {
    showToast(`Erro ao emitir: ${err.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Emitir MDF-e';
  }
}
