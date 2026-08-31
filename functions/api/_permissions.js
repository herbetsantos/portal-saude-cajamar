// Modelo de permissões por funcionalidade.
//
// - role_permissions define o "teto" (máximo permitido) por papel — editável
//   em Administração > Perfis de acesso (só Super Admin edita).
// - user_permissions guarda exceções por profissional DENTRO desse teto.
// - EXCEÇÃO: regulacao_vagas é individual e independe do papel do Portal;
//   suas responsabilidades internas são configuradas no próprio eMulti.
// - super_admin sempre tem acesso a tudo e não passa por nenhuma das duas
//   tabelas (evita a possibilidade de alguém se autobloquear por engano).

export const FEATURES = [
  { key: 'receituario', label: 'Receituário' },
  { key: 'malotes', label: 'Malotes e Remessas' },
  { key: 'facilitawhats', label: 'FacilitaWhats' },
  { key: 'mensageiro_esus', label: 'Mensageiro eSUS' },
  { key: 'documentos', label: 'Documentos Úteis' },
  { key: 'manuais', label: 'Manuais de Uso' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'regulacao_vagas', label: 'Regulação de Vagas', managedExternally: true },
  { key: 'administracao', label: 'Administração' },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);
const FEATURE_KEY_SET = new Set(FEATURE_KEYS);

export function isFeatureKey(key) {
  return FEATURE_KEY_SET.has(key);
}

function allTrue() {
  const m = {};
  FEATURE_KEYS.forEach((k) => { m[k] = true; });
  return m;
}
function allFalse() {
  const m = {};
  FEATURE_KEYS.forEach((k) => { m[k] = false; });
  return m;
}

// Teto de funcionalidades de um papel (role). super_admin sempre tudo liberado.
// Se a migração ainda não rodou (tabela não existe) ou o banco falhar por
// qualquer motivo, cai pro "tudo liberado" em vez de quebrar a página inteira —
// é assim que o site já se comportava antes desse recurso existir.
export async function getRoleCeiling(env, role) {
  if (role === 'super_admin') return allTrue();
  try {
    const { results } = await env.DB.prepare(
      'SELECT feature_key, enabled FROM role_permissions WHERE role = ?'
    ).bind(role).all();
    const ceiling = allFalse();
    results.forEach((r) => { if (isFeatureKey(r.feature_key)) ceiling[r.feature_key] = !!r.enabled; });
    // Regulação de Vagas é individual: o papel do Portal não limita essa
    // funcionalidade. Mantemos teto=true apenas para que a tela de permissões
    // individuais possa habilitá-la; o valor efetivo depende de override.
    ceiling.regulacao_vagas = true;
    return ceiling;
  } catch {
    return allTrue();
  }
}

// Permissões efetivas de um usuário: teto do papel + exceções individuais,
// nunca ultrapassando o teto do papel. Mesma lógica de fail-open acima.
export async function getUserPermissions(env, user) {
  if (user.role === 'super_admin') return allTrue();
  const ceiling = await getRoleCeiling(env, user.role);
  try {
    const { results } = await env.DB.prepare(
      'SELECT feature_key, enabled FROM user_permissions WHERE user_id = ?'
    ).bind(user.id).all();
    const overrides = {};
    results.forEach((r) => { if (isFeatureKey(r.feature_key)) overrides[r.feature_key] = !!r.enabled; });
    const effective = {};
    FEATURE_KEYS.forEach((k) => {
      if (k === 'regulacao_vagas') {
        // Exceção proposital: acesso ao eMulti é individual e independente do
        // role do Portal. Sem override explícito, fica desabilitado.
        effective[k] = overrides.hasOwnProperty(k) ? overrides[k] : false;
        return;
      }
      const wanted = overrides.hasOwnProperty(k) ? overrides[k] : ceiling[k];
      effective[k] = ceiling[k] && wanted;
    });
    return effective;
  } catch {
    return { ...ceiling, regulacao_vagas: false };
  }
}
