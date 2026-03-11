// ============================================
// Data Store - Supabase persistence
// ============================================
import { supabase } from '../services/supabase.js';

const SESSION_KEY = 'mdfe_session';

// ---- Motoristas ----
export async function getMotoristas() {
    const { data } = await supabase.from('motoristas').select('*').order('criado_em', { ascending: false });
    return (data || []).map(mapMotorista);
}

export async function saveMotorista(motorista) {
    const record = {
        nome: motorista.nome,
        cpf: motorista.cpf,
        telefone: motorista.telefone,
        cnh: motorista.cnh,
        categoria_cnh: motorista.categoriaCnh || motorista.categoria_cnh,
        uf: motorista.uf,
        ativo: motorista.ativo !== false
    };
    if (motorista.id) {
        const { data } = await supabase.from('motoristas').update(record).eq('id', motorista.id).select().single();
        return mapMotorista(data);
    } else {
        const { data } = await supabase.from('motoristas').insert(record).select().single();
        return mapMotorista(data);
    }
}

export async function deleteMotorista(id) {
    await supabase.from('motoristas').delete().eq('id', id);
}

export async function getMotoristaById(id) {
    const { data } = await supabase.from('motoristas').select('*').eq('id', id).single();
    return data ? mapMotorista(data) : null;
}

function mapMotorista(row) {
    if (!row) return null;
    return { id: row.id, nome: row.nome, cpf: row.cpf, telefone: row.telefone, cnh: row.cnh, categoriaCnh: row.categoria_cnh, uf: row.uf, ativo: row.ativo, criadoEm: row.criado_em };
}

// ---- Veiculos ----
export async function getVeiculos() {
    const { data } = await supabase.from('veiculos').select('*').order('criado_em', { ascending: false });
    return (data || []).map(mapVeiculo);
}

export async function saveVeiculo(veiculo) {
    const record = {
        placa: veiculo.placa,
        uf: veiculo.uf,
        tipo_rodado: veiculo.tipoRodado || veiculo.tipo_rodado,
        tipo_carroceria: veiculo.tipoCarroceria || veiculo.tipo_carroceria,
        tara: veiculo.tara,
        cap_kg: veiculo.capKg || veiculo.cap_kg,
        cap_m3: veiculo.capM3 || veiculo.cap_m3,
        renavam: veiculo.renavam,
        ativo: veiculo.ativo !== false
    };
    if (veiculo.id) {
        const { data } = await supabase.from('veiculos').update(record).eq('id', veiculo.id).select().single();
        return mapVeiculo(data);
    } else {
        const { data } = await supabase.from('veiculos').insert(record).select().single();
        return mapVeiculo(data);
    }
}

export async function deleteVeiculo(id) {
    await supabase.from('veiculos').delete().eq('id', id);
}

export async function getVeiculoById(id) {
    const { data } = await supabase.from('veiculos').select('*').eq('id', id).single();
    return data ? mapVeiculo(data) : null;
}

function mapVeiculo(row) {
    if (!row) return null;
    return { id: row.id, placa: row.placa, uf: row.uf, tipoRodado: row.tipo_rodado, tipoCarroceria: row.tipo_carroceria, tara: row.tara, capKg: row.cap_kg, capM3: row.cap_m3, renavam: row.renavam, ativo: row.ativo, criadoEm: row.criado_em };
}

// ---- MDF-e ----
export async function getMDFes() {
    const { data } = await supabase.from('mdfes').select('*').order('criado_em', { ascending: false });
    return (data || []).map(mapMDFe);
}

export async function saveMDFe(mdfe) {
    if (mdfe.id) {
        const record = buildMDFeRecord(mdfe);
        const { data, error } = await supabase.from('mdfes').update(record).eq('id', mdfe.id).select().single();
        if (error) throw new Error(error.message);
        return mapMDFe(data);
    } else {
        // Get next number from sequence
        const { data: seqData } = await supabase.rpc('nextval', { seq_name: 'mdfe_numero_seq' });
        const numero = seqData || Date.now();
        const record = {
            ...buildMDFeRecord(mdfe),
            numero: numero,
            serie: '1',
            status: 'processando_autorizacao',
            chave_acesso: gerarChaveAcesso(numero),
            dt_emissao: new Date().toISOString()
        };
        const { data, error } = await supabase.from('mdfes').insert(record).select().single();
        if (error) throw new Error(error.message);
        return mapMDFe(data);
    }
}

function buildMDFeRecord(mdfe) {
    return {
        uf_inicio: mdfe.ufInicio || mdfe.uf_inicio,
        uf_fim: mdfe.ufFim || mdfe.uf_fim,
        mun_carregamento: mdfe.munCarregamento || mdfe.mun_carregamento,
        mun_descarregamento: mdfe.munDescarregamento || mdfe.mun_descarregamento,
        cod_mun_carregamento: mdfe.codMunCarregamento || mdfe.cod_mun_carregamento,
        cod_mun_descarregamento: mdfe.codMunDescarregamento || mdfe.cod_mun_descarregamento,
        motorista_id: mdfe.motoristaId || mdfe.motorista_id,
        veiculo_id: mdfe.veiculoId || mdfe.veiculo_id,
        documentos: mdfe.documentos || [],
        percurso: mdfe.percurso || [],
        peso_bruto: mdfe.pesoBruto || mdfe.peso_bruto,
        valor_carga: mdfe.valorCarga || mdfe.valor_carga,
        info_complementar: mdfe.infoComplementar || mdfe.info_complementar,
        emitido_por: mdfe.emitidoPor || mdfe.emitido_por
    };
}

export async function deleteMDFe(id) {
    await supabase.from('mdfes').delete().eq('id', id);
}

export async function getMDFeById(id) {
    const { data } = await supabase.from('mdfes').select('*').eq('id', id).single();
    return data ? mapMDFe(data) : null;
}

export async function encerrarMDFe(id) {
    await supabase.from('mdfes').update({ status: 'encerrado', dt_encerramento: new Date().toISOString() }).eq('id', id);
}

export async function cancelarMDFe(id) {
    await supabase.from('mdfes').update({ status: 'cancelado', dt_cancelamento: new Date().toISOString() }).eq('id', id);
}

export async function updateMDFeStatus(id, updates) {
    const record = {};
    if (updates.status) record.status = updates.status;
    if (updates.statusSefaz) record.status_sefaz = updates.statusSefaz;
    if (updates.mensagemSefaz) record.mensagem_sefaz = updates.mensagemSefaz;
    if (updates.chaveMdfe) record.chave_mdfe = updates.chaveMdfe;
    if (updates.numeroSefaz) record.numero_sefaz = updates.numeroSefaz;
    if (updates.serieSefaz) record.serie_sefaz = updates.serieSefaz;
    if (updates.caminhoDAMDFE) record.caminho_damdfe = updates.caminhoDAMDFE;
    if (updates.caminhoXml) record.caminho_xml = updates.caminhoXml;
    if (updates.focusRef) record.focus_ref = updates.focusRef;
    await supabase.from('mdfes').update(record).eq('id', id);
}

function mapMDFe(row) {
    if (!row) return null;
    return {
        id: row.id, numero: row.numero, serie: row.serie, status: row.status,
        ufInicio: row.uf_inicio, ufFim: row.uf_fim,
        munCarregamento: row.mun_carregamento, munDescarregamento: row.mun_descarregamento,
        codMunCarregamento: row.cod_mun_carregamento, codMunDescarregamento: row.cod_mun_descarregamento,
        motoristaId: row.motorista_id, veiculoId: row.veiculo_id,
        documentos: row.documentos || [], percurso: row.percurso || [],
        pesoBruto: row.peso_bruto, valorCarga: row.valor_carga,
        infoComplementar: row.info_complementar,
        chaveAcesso: row.chave_acesso, chaveMdfe: row.chave_mdfe,
        numeroSefaz: row.numero_sefaz, serieSefaz: row.serie_sefaz,
        statusSefaz: row.status_sefaz, mensagemSefaz: row.mensagem_sefaz,
        focusRef: row.focus_ref, caminhoDAMDFE: row.caminho_damdfe, caminhoXml: row.caminho_xml,
        emitidoPor: row.emitido_por,
        dtEmissao: row.dt_emissao, dtEncerramento: row.dt_encerramento,
        dtCancelamento: row.dt_cancelamento, criadoEm: row.criado_em
    };
}

function gerarChaveAcesso(numero) {
    const uf = '35';
    const aamm = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
    const cnpj = '00000000000000';
    const mod = '58';
    const serie = '001';
    const num = String(numero).padStart(9, '0');
    const tpEmis = '1';
    const cNF = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    const base = uf + aamm + cnpj + mod + serie + num + tpEmis + cNF;
    const dv = String(Math.floor(Math.random() * 10));
    return (base + dv).slice(0, 44);
}

// ---- Empresa Emitente ----
export async function getEmpresa() {
    const { data } = await supabase.from('empresa').select('*').limit(1).single();
    return data ? mapEmpresa(data) : {};
}

export async function saveEmpresa(empresa) {
    const record = {
        razao_social: empresa.razaoSocial || empresa.razao_social,
        nome_fantasia: empresa.nomeFantasia || empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        ie: empresa.ie,
        uf: empresa.uf,
        municipio: empresa.municipio,
        telefone: empresa.telefone,
        endereco: empresa.endereco,
        cep: empresa.cep
    };
    // Check if exists
    const { data: existing } = await supabase.from('empresa').select('id').limit(1).single();
    if (existing) {
        const { data } = await supabase.from('empresa').update(record).eq('id', existing.id).select().single();
        return mapEmpresa(data);
    } else {
        const { data } = await supabase.from('empresa').insert(record).select().single();
        return mapEmpresa(data);
    }
}

function mapEmpresa(row) {
    if (!row) return {};
    return { id: row.id, razaoSocial: row.razao_social, nomeFantasia: row.nome_fantasia, cnpj: row.cnpj, ie: row.ie, uf: row.uf, municipio: row.municipio, telefone: row.telefone, endereco: row.endereco, cep: row.cep };
}

// ---- Estatísticas ----
export async function getEstatisticas() {
    const mdfes = await getMDFes();
    const motoristas = await getMotoristas();
    const veiculos = await getVeiculos();

    return {
        totalMDFe: mdfes.length,
        autorizados: mdfes.filter(m => m.status === 'autorizado').length,
        encerrados: mdfes.filter(m => m.status === 'encerrado').length,
        cancelados: mdfes.filter(m => m.status === 'cancelado').length,
        rejeicoes: mdfes.filter(m => m.status === 'erro_autorizacao').length,
        totalMotoristas: motoristas.filter(m => m.ativo !== false).length,
        totalVeiculos: veiculos.filter(v => v.ativo !== false).length,
    };
}

// ---- Usuários e Autenticação ----
export async function getUsers() {
    const { data } = await supabase.from('users').select('*').order('criado_em');
    return (data || []).map(mapUser);
}

export async function saveUser(user) {
    const record = { login: user.login, nome: user.nome, role: user.role || 'user', ativo: user.ativo !== false };
    if (user.senha) {
        record.senha = await hashPassword(user.senha);
    }

    if (user.id) {
        const { data } = await supabase.from('users').update(record).eq('id', user.id).select().single();
        return mapUser(data);
    } else {
        const { data } = await supabase.from('users').insert(record).select().single();
        return mapUser(data);
    }
}

export async function deleteUser(id) {
    await supabase.from('users').delete().eq('id', id);
}

async function hashPassword(password) {
    if (!password) return '';
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function login(loginStr, senha) {
    const hashedSenha = await hashPassword(senha);
    const { data } = await supabase.from('users').select('*').eq('login', loginStr).eq('senha', hashedSenha).single();
    if (data) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...mapUser(data), senha: null }));
        return true;
    }
    return false;
}

export function logout() {
    sessionStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
    try {
        const data = sessionStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
}

export function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function mapUser(row) {
    if (!row) return null;
    return { id: row.id, login: row.login, senha: row.senha, nome: row.nome, role: row.role, ativo: row.ativo };
}

