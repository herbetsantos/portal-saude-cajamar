// Lista canônica das unidades de saúde de Cajamar, na mesma ordem/códigos
// usados no <select id="unidade"> do Receituário (receituario/index.html).
// Se uma unidade nova for criada, adicione aqui e no <option> do receituário.

export const UNIDADES = [
  { code: 'upa', nome: 'UPA 24h Vereador Luiz dos Santos Faria' },
  { code: 'policlinica', nome: 'Policlínica Municipal de Cajamar' },
  { code: 'cer2', nome: 'Centro Especializado em Reabilitação CER II' },
  { code: 'portal', nome: 'ESF Carlos dos Santos' },
  { code: 'km43', nome: 'Posto de Saúde Nadília de Oliveira Santos' },
  { code: 'beloplanalto', nome: 'PSF Belo Planalto' },
  { code: 'marialuiza', nome: 'PSF Dra. Maria de Lourdes Mendonça Bravo' },
  { code: 'guaturinho', nome: 'PSF Edivaldo Soares Massagardi' },
  { code: 'parquesaoroberto', nome: 'UBS Enf. Leontina Martins França' },
  { code: 'ponunduva', nome: 'USF Maria Aparecida Missé' },
  { code: 'cajamarcento', nome: 'USF Vereador Joaquim Alves de Castro' },
  { code: 'jordanesia', nome: 'UBS Enfermeiro Carlos Moreira da Silva' },
  { code: 'polvilho', nome: 'UBS Dra. Izabel Gratieri' },
  { code: 'manoelinacio', nome: 'USF Manoel Inácio da Silva' },
  { code: 'ceo', nome: 'Centro de Especialidades Odontológicas' },
  { code: 'caps', nome: 'CAPS Cajamar' },
  { code: 'capsij', nome: 'CAPS Infanto/Juvenil' },
];

const UNIDADE_CODES = new Set(UNIDADES.map((u) => u.code));

export function isUnidadeCode(code) {
  return UNIDADE_CODES.has(code);
}

// Retorna os códigos de unidade que o usuário autenticado pode acessar.
// Admin: todas. Usuário comum: somente as atribuídas pelo administrador
// na tabela user_unidades.
export async function getUnidadesPermitidas(env, user) {
  if (user.role === 'admin') {
    return UNIDADES.map((u) => u.code);
  }
  const { results } = await env.DB.prepare(
    'SELECT unidade_code FROM user_unidades WHERE user_id = ?'
  )
    .bind(user.id)
    .all();
  return results.map((r) => r.unidade_code);
}