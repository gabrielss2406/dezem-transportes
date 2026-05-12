// ── VALIDATION UTILS ──────────────────────────────────────────────────────────

export const isValidCNPJ = (cnpj: string): boolean => {
  if (!cnpj) {
    return true
  }
  const cleanedCnpj = cnpj.replace(/[^\d]+/g, '')
  if (cleanedCnpj.length !== 14) {
    return false
  }
  if (/^(\d)\1+$/.test(cleanedCnpj)) {
    return false
  }
  let tamanho = cleanedCnpj.length - 2
  let numeros = cleanedCnpj.substring(0, tamanho)
  const digitos = cleanedCnpj.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7
  for (let i = tamanho; i >= 1; i--) {
    soma += Number(numeros.charAt(tamanho - i)) * pos--
    if (pos < 2) {
      pos = 9
    }
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado.toString() !== digitos.charAt(0)) {
    return false
  }
  tamanho = tamanho + 1
  numeros = cleanedCnpj.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7
  for (let i = tamanho; i >= 1; i--) {
    soma += Number(numeros.charAt(tamanho - i)) * pos--
    if (pos < 2) {
      pos = 9
    }
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return resultado.toString() === digitos.charAt(1)
}

export const isValidCPF = (cpf: string): boolean => {
  if (!cpf) {
    return true
  }
  const cleanedCpf = cpf.replace(/[^\d]+/g, '')
  if (cleanedCpf.length !== 11) {
    return false
  }
  if (/^(\d)\1+$/.test(cleanedCpf)) {
    return false
  }
  let sum = 0
  let rest: number
  for (let i = 1; i <= 9; i++) {
    sum = sum + Number.parseInt(cleanedCpf.substring(i - 1, i)) * (11 - i)
  }
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) {
    rest = 0
  }
  if (rest !== Number.parseInt(cleanedCpf.substring(9, 10))) {
    return false
  }
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum = sum + Number.parseInt(cleanedCpf.substring(i - 1, i)) * (12 - i)
  }
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) {
    rest = 0
  }
  return rest === Number.parseInt(cleanedCpf.substring(10, 11))
}

export const isValidPhone = (phone: string): boolean => {
  if (!phone) {
    return true
  }
  const cleaned = phone.replace(/\D/g, '')
  // Basic validation: checks for 10 or 11 digits (DDD + number)
  return cleaned.length >= 10 && cleaned.length <= 11
}
