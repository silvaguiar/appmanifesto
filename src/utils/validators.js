// ============================================
// Validators & Formatters
// ============================================

export function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf.charAt(10));
}

export function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const pesos2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(cnpj.charAt(i)) * pesos1[i];
  let resto = soma % 11;
  const d1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cnpj.charAt(12)) !== d1) return false;
  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(cnpj.charAt(i)) * pesos2[i];
  resto = soma % 11;
  const d2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(cnpj.charAt(13)) === d2;
}

export function validarPlaca(placa) {
  placa = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  // Mercosul: ABC1D23 | Antiga: ABC1234
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa);
}

export function validarChaveAcesso(chave) {
  chave = chave.replace(/\D/g, '');
  return chave.length === 44;
}

export function formatarCPF(value) {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  return nums.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (m, a, b, c, d) => {
    let r = a;
    if (b) r += '.' + b;
    if (c) r += '.' + c;
    if (d) r += '-' + d;
    return r;
  });
}

export function formatarCNPJ(value) {
  const nums = value.replace(/\D/g, '').slice(0, 14);
  return nums.replace(/(\d{2})(\d{3})?(\d{3})?(\d{4})?(\d{2})?/, (m, a, b, c, d, e) => {
    let r = a;
    if (b) r += '.' + b;
    if (c) r += '.' + c;
    if (d) r += '/' + d;
    if (e) r += '-' + e;
    return r;
  });
}

export function formatarPlaca(value) {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7);
}

export function formatarTelefone(value) {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2) return nums;
  if (nums.length <= 6) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0,2)}) ${nums.slice(2,6)}-${nums.slice(6)}`;
  return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
}

export function formatarChaveAcesso(value) {
  const nums = value.replace(/\D/g, '').slice(0, 44);
  return nums.replace(/(.{4})/g, '$1 ').trim();
}

// UFs brasileiras
export const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];

// Tipos de carroceria
export const TIPOS_CARROCERIA = [
  { value: '00', label: 'Não aplicável' },
  { value: '01', label: 'Aberta' },
  { value: '02', label: 'Fechada/Baú' },
  { value: '03', label: 'Granelera' },
  { value: '04', label: 'Porta Container' },
  { value: '05', label: 'Sider' }
];

// Tipos de rodado
export const TIPOS_RODADO = [
  { value: '01', label: 'Truck' },
  { value: '02', label: 'Toco' },
  { value: '03', label: 'Cavalo Mecânico' },
  { value: '04', label: 'VAN' },
  { value: '05', label: 'Utilitário' },
  { value: '06', label: 'Outros' }
];

// Categorias CNH
export const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

