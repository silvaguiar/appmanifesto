// ============================================
// Focus NFe API Service
// ============================================
// Handles all communication with Focus NFe API
// through the local proxy server.

const PROXY_URL = '/api/focus';

function getConfig() {
    try {
        const cfg = JSON.parse(localStorage.getItem('mdfe_focus_config') || '{}');
        return {
            token: cfg.token || '',
            ambiente: cfg.ambiente || 'homologacao',
        };
    } catch { return { token: '', ambiente: 'homologacao' }; }
}

export function saveConfig(config) {
    localStorage.setItem('mdfe_focus_config', JSON.stringify(config));
}

export function getConfigData() {
    return getConfig();
}

export function isConfigured() {
    const cfg = getConfig();
    return !!cfg.token;
}

async function request(method, path, body = null, cfg = null) {
    const apiCfg = cfg || getConfig();
    if (!apiCfg.token) throw new Error('Token da API Focus NFe não configurado. Vá em Empresa > Editar Empresa para configurar.');

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Focus-Token': apiCfg.token,
            'X-Focus-Ambiente': apiCfg.ambiente
        }
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(body);
    }

    // O proxy na Vercel (/api/focus.js) espera o caminho via query param ?path=
    // Se anexarmos direto (ex: /api/focus/v2/mdfe), a Vercel retorna 404 pois procura um arquivo/pasta "v2"
    const targetUrl = `${PROXY_URL}?path=${encodeURIComponent(path)}`;
    
    const resp = await fetch(targetUrl, options);
    const contentType = resp.headers.get('content-type') || '';

    // Trata respostas JSON
    if (contentType.includes('application/json')) {
        const data = await resp.json();
        if (!resp.ok && !data.status) {
            const apiErrorMsg = data.mensagem || data.error || data.mensagem_sefaz || data.codigo || '';
            throw new Error(apiErrorMsg ? `${apiErrorMsg} (HTTP ${resp.status})` : `Erro HTTP ${resp.status}`);
        }
        return data;
    }

    // Respostas não-JSON (ex: erros em texto)
    const text = await resp.text();
    if (!resp.ok) {
        throw new Error(text || `Erro HTTP ${resp.status}`);
    }
    return { status: 'ok', raw: text };
}

/**
 * Testa a conexão com a API Focus NFe enviando credenciais
 */
export async function testarConexao(token, ambiente) {
    // A Focus NFe devolve 404 para GET de /v2/empresas sem ID.
    // Para testar um token puro, o jeito mais seguro e neutro é listar os hooks
    return request('GET', '/v2/hooks', null, { token, ambiente });
}

// ---- MDF-e Operations ----

/**
 * Emitir MDF-e na SEFAZ via Focus NFe
 * @param {string} ref - Referência única (usamos o ID local)
 * @param {object} dados - Dados do MDF-e no formato Focus NFe
 * @param {object} cfg - Configuração da empresa (token, ambiente)
 */
export async function emitirMDFe(ref, dados, cfg = null) {
    return request('POST', `/v2/mdfe?ref=${ref}`, dados, cfg);
}

/**
 * Consultar status do MDF-e na Focus NFe
 * @param {string} ref - Referência
 * @param {boolean} completa - Se true, retorna dados completos
 * @param {object} cfg - Configuração da empresa (token, ambiente)
 */
export async function consultarMDFe(ref, completa = false, cfg = null) {
    const param = completa ? '?completa=1' : '';
    return request('GET', `/v2/mdfe/${ref}${param}`, null, cfg);
}

/**
 * Cancelar MDF-e
 * @param {string} ref - Referência
 * @param {string} justificativa - Motivo (15-255 chars)
 * @param {object} cfg - Configuração da empresa (token, ambiente)
 */
export async function cancelarMDFe(ref, justificativa, cfg = null) {
    return request('DELETE', `/v2/mdfe/${ref}`, { justificativa }, cfg);
}

/**
 * Encerrar MDF-e
 * @param {string} ref - Referência
 * @param {object} dados - { data, sigla_uf, nome_municipio }
 * @param {object} cfg - Configuração da empresa (token, ambiente)
 */
export async function encerrarMDFe(ref, dados, cfg = null) {
    return request('POST', `/v2/mdfe/${ref}/encerrar`, dados, cfg);
}

/**
 * Incluir condutor no MDF-e
 * @param {string} ref - Referência
 * @param {object} dados - { nome, cpf }
 * @param {object} cfg - Configuração da empresa (token, ambiente)
 */
export async function incluirCondutor(ref, dados, cfg = null) {
    return request('POST', `/v2/mdfe/${ref}/incluir_condutor`, dados, cfg);
}

/**
 * Monta o objeto MDF-e no formato Focus NFe API
 * Suporta emitente pessoa física (CPF) ou jurídica (CNPJ)
 */
export function montarPayloadMDFe(formData, motorista, veiculo, empresa) {
    const isPessoaFisica = empresa.tipoDoc === 'cpf' || (empresa.cpf && empresa.cpf.trim() !== '');
    const isCargaPropria = empresa.tipoTransporte === '4';
    const tipoTransporte = isCargaPropria ? undefined : (empresa.tipoTransporte || (isPessoaFisica ? '2' : '1'));

    const ufInicio = formData.ufInicio || empresa.uf;
    const ufFim = formData.ufFim || empresa.uf;

    let percursosList = [...new Set((formData.percurso || []) // Changed from string to array, assuming formData.percurso is an array of UFs
        .map(s => s.trim().toUpperCase())
        .filter(Boolean))];

    // Regra da SEFAZ (Rejeição 663): UF de Percurso não pode ser igual à UF de Início ou Fim.
    percursosList = percursosList.filter(uf => uf !== ufInicio && uf !== ufFim);

    const payload = {
        // A documentação oficial da FocusNFe mapeia a tag <tpEmit> como apenas `emitente`
        emitente: isCargaPropria ? 2 : 1,
        
        // Tipo de transportador: ausente p/ Carga Própria
        ...(tipoTransporte ? { tipo_transporte: tipoTransporte } : {}),

        modal: 1, // Rodoviário
        serie: '1',
        numero: null, // Focus auto-gera
        data_emissao: new Date().toISOString().slice(0, 10),
        uf_inicio: ufInicio,
        uf_fim: ufFim,

        // Emitente — usa CPF (TAC) ou CNPJ (ETC/CTC), sem máscaras
        ...(isPessoaFisica
            ? { cpf_emitente: (empresa.cpf || '').replace(/\D/g, '') }
            : { cnpj_emitente: (empresa.cnpj || '').replace(/\D/g, '') }),
        razao_social_emitente: (empresa.razaoSocial || '').trim(),
        inscricao_estadual_emitente: (empresa.ie || '').replace(/\D/g, ''),
        uf_emitente: empresa.uf || '',
        municipio_emitente: empresa.municipio || '',
        ...(empresa.codMunicipio ? { codigo_municipio_emitente: empresa.codMunicipio } : {}),
        ...(empresa.rntrc ? { rntrc_emitente: empresa.rntrc } : {}),

        // Municípios
        municipios_carregamento: [{
            codigo: formData.codMunCarregamento || '0000000',
            nome: formData.munCarregamento
        }],

        municipios_descarregamento: [{
            codigo: formData.codMunDescarregamento || '0000000',
            nome: formData.munDescarregamento,
            ...(formData.documentos.filter(d => d.tipo === 'nfe').length > 0 ? {
                notas_fiscais: formData.documentos.filter(d => d.tipo === 'nfe').map(d => ({
                    chave_nfe: d.chave
                }))
            } : {}),
            ...(formData.documentos.filter(d => d.tipo === 'cte').length > 0 ? {
                conhecimentos_transporte: formData.documentos.filter(d => d.tipo === 'cte').map(d => ({
                    chave_cte: d.chave
                }))
            } : {})
        }],

        // Percurso filtrado (sem UF_Inicio ou UF_Fim)
        ...(percursosList.length > 0 ? {
            percursos: percursosList.map(uf => ({ uf_percurso: uf }))
        } : {}),

        // Totais
        quantidade_total_cte: formData.documentos.filter(d => d.tipo === 'cte').length,
        quantidade_total_nfe: formData.documentos.filter(d => d.tipo === 'nfe').length,
        valor_total_carga: parseFloat(formData.valorCarga) || 0,
        codigo_unidade_medida_peso_bruto: '01', // KG
        peso_bruto: parseFloat(formData.pesoBruto) || 0,

        // Info complementar — evita string "null" literal
        ...(formData.infoComplementar && formData.infoComplementar !== 'null' ? {
            informacoes_adicionais_fisco: formData.infoComplementar.trim()
        } : {}),

        // Seguro de Carga (Obrigatório para prestadores de serviço - TAC/ETC/CTC)
        // Regra SEFAZ (Rej 698): Seguro é obrigatório para Prestador de Serviço de Transporte no modal rodoviário.
        ...(tipoTransporte && tipoTransporte !== '4' && empresa.numeroApolice ? {
            seguros_carga: [{
                responsavel_seguro: empresa.responsavelSeguro || '1',
                ...(empresa.responsavelSeguro === '2' 
                    ? (empresa.cnpj ? { cnpj_responsavel: empresa.cnpj } : { cpf_responsavel: empresa.cpf }) 
                    : {}),
                nome_seguradora: empresa.seguradoraNome,
                cnpj_seguradora: (empresa.seguradoraCnpj || '').replace(/\D/g, ''),
                numero_apolice: empresa.numeroApolice,
                // Número de averbação é o próprio número da apólice ou um gerado
                numero_averbacao: empresa.numeroApolice 
            }]
        } : {}),

        // Modal Rodoviário
        modal_rodoviario: {
            placa_veiculo: veiculo.placa,
            ...(veiculo.renavam ? { renavam_veiculo: veiculo.renavam } : {}),
            tara_veiculo: parseInt(veiculo.tara) || 0,
            capacidade_kg_veiculo: parseInt(veiculo.capKg) || 0,
            ...(veiculo.capM3 ? { capacidade_m3_veiculo: parseFloat(veiculo.capM3) } : {}),
            tipo_rodado_veiculo: veiculo.tipoRodado,
            tipo_carroceria_veiculo: veiculo.tipoCarroceria,
            uf_licenciamento_veiculo: veiculo.uf,

            // Condutor
            condutores: [{
                nome: motorista.nome,
                cpf: motorista.cpf.replace(/\D/g, '')
            }],

            // Proprietário
            // Regra SEFAZ (Rej 745): Se tpTransp for TAC (2) ou CTC (3), o grupo Proprietário é OBRIGATÓRIO, mesmo que seja o próprio emitente.
            ...(() => {
                if (isCargaPropria) return {}; // Carga própria não envia transportador, logo não preenche proprietário sob a regra 745
                
                let doc = (veiculo.proprietarioDoc || '').replace(/\D/g, '');
                let nome = veiculo.proprietarioNome || '';
                let rntrc = veiculo.proprietarioRntrc || '00000000';
                let ie = veiculo.proprietarioIe || 'ISENTO';
                let ufProp = veiculo.uf;
                
                const emitenteDoc = (isPessoaFisica ? (empresa.cpf || '') : (empresa.cnpj || '')).replace(/\D/g, '');
                
                // Se não há dados do proprietário do veículo, assume que o dono é o próprio emitente/motorista.
                if (!doc) {
                    doc = emitenteDoc;
                    nome = empresa.razaoSocial || empresa.nomeFantasia || motorista.nome || 'PROPRIETARIO';
                    rntrc = empresa.rntrc || '00000000';
                    ie = empresa.ie || 'ISENTO';
                    ufProp = empresa.uf || veiculo.uf;
                }

                // Se o emitente é ETC (1) e dono do veículo, a tag SEFAZ deve ser omitida.
                if (tipoTransporte === '1' && doc === emitenteDoc) {
                    return {};
                }
                
                return {
                    ...(doc.length === 11 || doc.length <= 11 // Garantir que mesmo CPFs sem 0 à esquerda tentem ir como CPF
                        ? { cpf_proprietario_veiculo: doc.padStart(11, '0') }
                        : { cnpj_proprietario_veiculo: doc.padStart(14, '0') }),
                    razao_social_proprietario_veiculo: nome,
                    rntrc_proprietario_veiculo: rntrc,
                    inscricao_estadual_proprietario_veiculo: ie,
                    uf_proprietario_veiculo: ufProp,
                    tipo_proprietario_veiculo: doc.length <= 11 ? '0' : '1' // 0-TAC(CPF), 1-ETC(CNPJ), 2-CTC
                };
            })()
        }
    };

    return payload;
}

