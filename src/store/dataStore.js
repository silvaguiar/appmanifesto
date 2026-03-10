// ============================================
// Data Store - localStorage persistence
// ============================================

const STORAGE_KEYS = {
    MOTORISTAS: 'mdfe_motoristas',
    VEICULOS: 'mdfe_veiculos',
    MDFES: 'mdfe_mdfes',
    EMPRESA: 'mdfe_empresa',
    NUMERO_MDFE: 'mdfe_ultimo_numero',
    USERS: 'mdfe_users',
    SESSION: 'mdfe_session',
};

// Limpa sessão antiga salva em localStorage (versões anteriores)
localStorage.removeItem('mdfe_session');


function getItem(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ---- Motoristas ----
export function getMotoristas() {
    return getItem(STORAGE_KEYS.MOTORISTAS) || [];
}

export function saveMotorista(motorista) {
    const motoristas = getMotoristas();
    if (motorista.id) {
        const idx = motoristas.findIndex(m => m.id === motorista.id);
        if (idx !== -1) motoristas[idx] = { ...motoristas[idx], ...motorista };
    } else {
        motorista.id = crypto.randomUUID();
        motorista.criadoEm = new Date().toISOString();
        motorista.ativo = true;
        motoristas.push(motorista);
    }
    setItem(STORAGE_KEYS.MOTORISTAS, motoristas);
    return motorista;
}

export function deleteMotorista(id) {
    const motoristas = getMotoristas().filter(m => m.id !== id);
    setItem(STORAGE_KEYS.MOTORISTAS, motoristas);
}

export function getMotoristaById(id) {
    return getMotoristas().find(m => m.id === id) || null;
}

// ---- Veiculos ----
export function getVeiculos() {
    return getItem(STORAGE_KEYS.VEICULOS) || [];
}

export function saveVeiculo(veiculo) {
    const veiculos = getVeiculos();
    if (veiculo.id) {
        const idx = veiculos.findIndex(v => v.id === veiculo.id);
        if (idx !== -1) veiculos[idx] = { ...veiculos[idx], ...veiculo };
    } else {
        veiculo.id = crypto.randomUUID();
        veiculo.criadoEm = new Date().toISOString();
        veiculo.ativo = true;
        veiculos.push(veiculo);
    }
    setItem(STORAGE_KEYS.VEICULOS, veiculos);
    return veiculo;
}

export function deleteVeiculo(id) {
    const veiculos = getVeiculos().filter(v => v.id !== id);
    setItem(STORAGE_KEYS.VEICULOS, veiculos);
}

export function getVeiculoById(id) {
    return getVeiculos().find(v => v.id === id) || null;
}

// ---- MDF-e ----
export function getMDFes() {
    return getItem(STORAGE_KEYS.MDFES) || [];
}

export function saveMDFe(mdfe) {
    const mdfes = getMDFes();
    if (mdfe.id) {
        const idx = mdfes.findIndex(m => m.id === mdfe.id);
        if (idx !== -1) mdfes[idx] = { ...mdfes[idx], ...mdfe };
    } else {
        mdfe.id = crypto.randomUUID();
        mdfe.numero = getProximoNumeroMDFe();
        mdfe.serie = '1';
        mdfe.criadoEm = new Date().toISOString();
        mdfe.dtEmissao = new Date().toISOString();
        mdfe.status = 'processando_autorizacao';
        mdfe.chaveAcesso = gerarChaveAcesso(mdfe);
        mdfes.push(mdfe);
    }
    setItem(STORAGE_KEYS.MDFES, mdfes);
    return mdfe;
}

export function deleteMDFe(id) {
    const mdfes = getMDFes().filter(m => m.id !== id);
    setItem(STORAGE_KEYS.MDFES, mdfes);
}

export function getMDFeById(id) {
    return getMDFes().find(m => m.id === id) || null;
}

export function encerrarMDFe(id) {
    const mdfes = getMDFes();
    const idx = mdfes.findIndex(m => m.id === id);
    if (idx !== -1) {
        mdfes[idx].status = 'encerrado';
        mdfes[idx].dtEncerramento = new Date().toISOString();
        setItem(STORAGE_KEYS.MDFES, mdfes);
    }
}

export function cancelarMDFe(id) {
    const mdfes = getMDFes();
    const idx = mdfes.findIndex(m => m.id === id);
    if (idx !== -1) {
        mdfes[idx].status = 'cancelado';
        mdfes[idx].dtCancelamento = new Date().toISOString();
        setItem(STORAGE_KEYS.MDFES, mdfes);
    }
}

// ---- Empresa Emitente ----
export function getEmpresa() {
    return getItem(STORAGE_KEYS.EMPRESA) || {};
}

export function saveEmpresa(empresa) {
    setItem(STORAGE_KEYS.EMPRESA, empresa);
    return empresa;
}

// ---- Numeração ----
function getProximoNumeroMDFe() {
    let num = getItem(STORAGE_KEYS.NUMERO_MDFE) || 0;
    num++;
    setItem(STORAGE_KEYS.NUMERO_MDFE, num);
    return num;
}

function gerarChaveAcesso(mdfe) {
    // Simulação da chave de 44 dígitos
    const uf = '35'; // SP default
    const aamm = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
    const cnpj = '00000000000000';
    const mod = '58'; // modelo MDF-e
    const serie = (mdfe.serie || '1').padStart(3, '0');
    const num = String(mdfe.numero).padStart(9, '0');
    const tpEmis = '1';
    const cNF = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    const base = uf + aamm + cnpj + mod + serie + num + tpEmis + cNF;
    // dígito verificador (simplificado)
    const dv = String(Math.floor(Math.random() * 10));
    return (base + dv).slice(0, 44);
}
// ---- Estatísticas ----
export function getEstatisticas() {
    const mdfes = getMDFes();
    const motoristas = getMotoristas();
    const veiculos = getVeiculos();

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
const INITIAL_USERS = [
    { id: '1', login: 'TI', senha: '286284', nome: 'TI Administrador', role: 'admin' },
    { id: '2', login: 'padrao', senha: '123', nome: 'Operador Padrão', role: 'user' }
];

export function getUsers() {
    let users = getItem(STORAGE_KEYS.USERS);
    if (!users) {
        users = INITIAL_USERS;
        setItem(STORAGE_KEYS.USERS, users);
    }
    return users;
}

export function saveUser(user) {
    const users = getUsers();
    if (user.id) {
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) users[idx] = { ...users[idx], ...user };
    } else {
        user.id = crypto.randomUUID();
        users.push(user);
    }
    setItem(STORAGE_KEYS.USERS, users);
    return user;
}

export function deleteUser(id) {
    const users = getUsers().filter(u => u.id !== id);
    setItem(STORAGE_KEYS.USERS, users);
}

export function login(login, senha) {
    const users = getUsers();
    const user = users.find(u => u.login === login && u.senha === senha);
    if (user) {
        // sessionStorage: session clears when browser is closed
        sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ ...user, senha: null }));
        return true;
    }
    return false;
}

export function logout() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function getCurrentUser() {
    try {
        const data = sessionStorage.getItem(STORAGE_KEYS.SESSION);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
}

export function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}
