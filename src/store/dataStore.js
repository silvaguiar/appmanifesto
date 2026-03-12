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
    const record = buildMotoristaRecord(motorista);
    if (motorista.id) {
        const { data, error } = await supabase.from('motoristas').update(record).eq('id', motorista.id).select().single();
        if (error) throw new Error(error.message);
        return mapMotorista(data);
    } else {
        const { data, error } = await supabase.from('motoristas').insert(record).select().single();
        if (error) throw new Error(error.message);
        return mapMotorista(data);
    }
}

function buildMotoristaRecord(motorista) {
    return {
        nome: motorista.nome,
        cpf: motorista.cpf,
        telefone: motorista.telefone,
        cnh: motorista.cnh,
        categoria_cnh: motorista.categoriaCnh || motorista.categoria_cnh,
        uf: motorista.uf,
        ativo: motorista.ativo !== false
    };
}

export async function deleteMotorista(id) {
    // Check if motorista is in use by any MDFe
    const { count, error } = await supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('motorista_id', id);
    if (error) throw new Error(error.message);
    if (count > 0) throw new Error('Este motorista não pode ser excluído pois está vinculado a manifestos emitidos.');

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
    const record = buildVeiculoRecord(veiculo);
    if (veiculo.id) {
        const { data, error } = await supabase.from('veiculos').update(record).eq('id', veiculo.id).select().single();
        if (error) throw new Error(error.message);
        return mapVeiculo(data);
    } else {
        const { data, error } = await supabase.from('veiculos').insert(record).select().single();
        if (error) throw new Error(error.message);
        return mapVeiculo(data);
    }
}

function buildVeiculoRecord(veiculo) {
    return {
        placa: veiculo.placa,
        uf: veiculo.uf,
        tipo_rodado: veiculo.tipoRodado || veiculo.tipo_rodado,
        tipo_carroceria: veiculo.tipoCarroceria || veiculo.tipo_carroceria,
        tara: veiculo.tara,
        cap_kg: veiculo.capKg || veiculo.cap_kg,
        cap_m3: veiculo.capM3 || veiculo.cap_m3,
        renavam: veiculo.renavam,
        proprietario_nome: veiculo.proprietarioNome || veiculo.proprietario_nome,
        proprietario_doc: veiculo.proprietarioDoc || veiculo.proprietario_doc,
        ativo: veiculo.ativo !== false
    };
}

export async function deleteVeiculo(id) {
    // Check if veiculo is in use by any MDFe
    const { count, error } = await supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('veiculo_id', id);
    if (error) throw new Error(error.message);
    if (count > 0) throw new Error('Este veículo não pode ser excluído pois está vinculado a manifestos emitidos.');

    await supabase.from('veiculos').delete().eq('id', id);
}

export async function getVeiculoById(id) {
    const { data } = await supabase.from('veiculos').select('*').eq('id', id).single();
    return data ? mapVeiculo(data) : null;
}

function mapVeiculo(row) {
    if (!row) return null;
    return { 
        id: row.id, placa: row.placa, uf: row.uf, tipoRodado: row.tipo_rodado, tipoCarroceria: row.tipo_carroceria, 
        tara: row.tara, capKg: row.cap_kg, capM3: row.cap_m3, renavam: row.renavam,
        proprietarioNome: row.proprietario_nome, proprietarioDoc: row.proprietario_doc,
        ativo: row.ativo, criadoEm: row.criado_em 
    };
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
        const { data: seqData, error: seqError } = await supabase.rpc('nextval', { seq_name: 'mdfe_numero_seq' });
        if (seqError) throw new Error(`Falha ao obter número do MDF-e: ${seqError.message}`);
        
        const numero = seqData || Date.now();
        const empresa = await getEmpresaById(mdfe.empresaId || mdfe.empresa_id);
        if (!empresa) throw new Error("Empresa emitente não informada ou inválida");

        const insertRecord = {
            ...buildMDFeRecord(mdfe),
            numero: numero,
            serie: '1',
            status: 'processando_autorizacao',
            chave_acesso: gerarChaveAcesso(numero, empresa, '1'),
            dt_emissao: new Date().toISOString(),
            empresa_id: mdfe.empresaId || mdfe.empresa_id
        };
        const { data, error } = await supabase.from('mdfes').insert(insertRecord).select().single();
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
        dtCancelamento: row.dt_cancelamento, criadoEm: row.criado_em,
        empresaId: row.empresa_id
    };
}

function gerarChaveAcesso(numero, empresa, serie = '1') {
    const ufStr = empresa.uf_ibge || '35'; // Default SP
    const now = new Date();
    const aamm = now.toISOString().slice(2, 4) + now.toISOString().slice(5, 7);
    const cnpj = (empresa.cnpj || '00000000000000').replace(/\D/g, '').padStart(14, '0');
    const mod = '58';
    const serieStr = String(serie).padStart(3, '0');
    const nMDF = String(numero).padStart(9, '0');
    const tpEmis = '1';
    const cMDF = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    
    const base = ufStr + aamm + cnpj + mod + serieStr + nMDF + tpEmis + cMDF;
    
    // Modulo 11 check digit
    let soma = 0;
    let peso = 2;
    for (let i = base.length - 1; i >= 0; i--) {
        soma += parseInt(base[i]) * peso;
        peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    const dv = (resto === 0 || resto === 1) ? 0 : 11 - resto;
    
    return base + dv;
}

// ---- Empresa Emitente ----
export async function getEmpresas() {
    const { data, error } = await supabase.from('empresa').select('*').order('id');
    if (error) { console.error(error); return []; }
    return (data || []).map(mapEmpresa);
}

export async function getEmpresaById(id) {
    const { data } = await supabase.from('empresa').select('*').eq('id', id).single();
    return data ? mapEmpresa(data) : null;
}

export async function saveEmpresa(empresa) {
    const record = {
        razao_social: empresa.razaoSocial || empresa.razao_social,
        nome_fantasia: empresa.nomeFantasia || empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        cpf: empresa.cpf,
        ie: empresa.ie,
        uf: empresa.uf,
        municipio: empresa.municipio,
        cod_municipio: empresa.codMunicipio || empresa.cod_municipio,
        tipo_transporte: empresa.tipoTransporte || empresa.tipo_transporte,
        rntrc: empresa.rntrc,
        telefone: empresa.telefone,
        endereco: empresa.endereco,
        cep: empresa.cep,
        seguradora_nome: empresa.seguradoraNome || empresa.seguradora_nome,
        seguradora_cnpj: empresa.seguradoraCnpj || empresa.seguradora_cnpj,
        numero_apolice: empresa.numeroApolice || empresa.numero_apolice,
        responsavel_seguro: empresa.responsavelSeguro || empresa.responsavel_seguro,
        focus_token: empresa.focusToken || empresa.focus_token,
        focus_ambiente: empresa.focusAmbiente || empresa.focus_ambiente || 'homologacao'
    };
    
    if (empresa.id) {
        const { data, error } = await supabase.from('empresa').update(record).eq('id', empresa.id).select().single();
        if (error) throw new Error(error.message);
        return mapEmpresa(data);
    } else {
        const { data, error } = await supabase.from('empresa').insert(record).select().single();
        if (error) throw new Error(error.message);
        return mapEmpresa(data);
    }
}

export async function deleteEmpresa(id) {
    const { count, error } = await supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('empresa_id', id);
    if (error) throw new Error(error.message);
    if (count > 0) throw new Error('Esta empresa não pode ser excluída pois está vinculada a manifestos emitidos.');

    await supabase.from('empresa').delete().eq('id', id);
}

function mapEmpresa(row) {
    if (!row) return {};
    return {
        id: row.id, razaoSocial: row.razao_social, nomeFantasia: row.nome_fantasia,
        cnpj: row.cnpj, cpf: row.cpf, ie: row.ie, uf: row.uf, municipio: row.municipio,
        codMunicipio: row.cod_municipio, tipoTransporte: row.tipo_transporte, rntrc: row.rntrc,
        telefone: row.telefone, endereco: row.endereco, cep: row.cep,
        seguradoraNome: row.seguradora_nome, seguradoraCnpj: row.seguradora_cnpj,
        numeroApolice: row.numero_apolice, responsavelSeguro: row.responsavel_seguro,
        focusToken: row.focus_token, focusAmbiente: row.focus_ambiente
    };
}

// ---- Estatísticas ----
export async function getEstatisticas() {
    try {
        const [
            { count: totalMDFe },
            { count: autorizados },
            { count: encerrados },
            { count: cancelados },
            { count: rejeicoes },
            { count: totalMotoristas },
            { count: totalVeiculos }
        ] = await Promise.all([
            supabase.from('mdfes').select('*', { count: 'exact', head: true }),
            supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('status', 'autorizado'),
            supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('status', 'encerrado'),
            supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('status', 'cancelado'),
            supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('status', 'erro_autorizacao'),
            supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('ativo', true),
            supabase.from('mdfes').select('*', { count: 'exact', head: true }).eq('ativo', true)
        ]);

        return {
            totalMDFe: totalMDFe || 0,
            autorizados: autorizados || 0,
            encerrados: encerrados || 0,
            cancelados: cancelados || 0,
            rejeicoes: rejeicoes || 0,
            totalMotoristas: totalMotoristas || 0,
            totalVeiculos: totalVeiculos || 0,
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
            totalMDFe: 0, autorizados: 0, encerrados: 0, cancelados: 0, 
            rejeicoes: 0, totalMotoristas: 0, totalVeiculos: 0
        };
    }
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
    const pepper = "MDFE_SECRET_2026"; 
    const encoder = new TextEncoder();
    const data = encoder.encode(password + pepper);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function login(loginStr, senha) {
    const hashedSenha = await hashPassword(senha);
    let { data } = await supabase.from('users').select('*').eq('login', loginStr).eq('senha', hashedSenha).single();
    
    // Fallback para hashes antigos (sem pepper) criados antes da atualização de segurança
    if (!data) {
        const encoder = new TextEncoder();
        const oldHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(senha));
        const oldHashedSenha = Array.from(new Uint8Array(oldHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const { data: oldData } = await supabase.from('users').select('*').eq('login', loginStr).eq('senha', oldHashedSenha).single();
        if (oldData) {
            data = oldData;
            // Atualiza o hash no banco para usar o novo esquema com pepper
            await supabase.from('users').update({ senha: hashedSenha }).eq('id', data.id);
        }
    }

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

// ---- Relacionamento Usuário <> Empresas ----
export async function getUserEmpresas(userId) {
    const { data, error } = await supabase.from('user_empresas').select('empresa_id').eq('user_id', userId);
    if (error) return [];
    return data.map(r => r.empresa_id);
}

export async function saveUserEmpresas(userId, empresaIds) {
    await supabase.from('user_empresas').delete().eq('user_id', userId);
    if (empresaIds && empresaIds.length > 0) {
        const inserts = empresaIds.map(eid => ({ user_id: userId, empresa_id: eid }));
        await supabase.from('user_empresas').insert(inserts);
    }
}
