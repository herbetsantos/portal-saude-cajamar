// Protege TODA a rota /receituario/* no backend (Cloudflare Pages Function
// executada antes de servir o arquivo estático receituario/index.html).
//
// Regras:
//  - Usuário precisa estar autenticado (cookie de sessão válido), senão
//    é redirecionado para /login.html?next=...
//  - O código da unidade (?unidade=xxx) só é aceito se estiver entre as
//    unidades atribuídas ao usuário (admin: todas). Se o parâmetro estiver
//    ausente, inválido ou não permitido, escolhemos a primeira unidade
//    permitida do usuário — nunca confiamos no valor vindo da URL.
//  - Se o usuário comum não tiver nenhuma unidade atribuída, é redirecionado
//    de volta ao portal com uma mensagem.
//  - O HTML é reescrito para deixar selecionada apenas a unidade permitida e
//    remover do <select> as unidades que o usuário não pode ver. Se o
//    usuário tiver mais de uma unidade permitida, o seletor é exibido para
//    que ele escolha entre as suas; caso contrário permanece oculto.

import { getAuthUser } from '../api/_utils.js';
import { getUnidadesPermitidas } from '../api/_unidades.js';

// Cloudflare Pages chama onRequest(context) para toda requisição que bater
// nesta rota, com { request, env, next, params, ... }.
export async function onRequest(context) {
  return protectAndServe(context);
}

async function protectAndServe({ request, env, next }) {
  const url = new URL(request.url);

  const user = await getAuthUser(request, env);
  if (!user) {
    const nextParam = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(`${url.origin}/login.html?next=${nextParam}`, 302);
  }

  const permitidas = await getUnidadesPermitidas(env, user);
  if (permitidas.length === 0) {
    return Response.redirect(
      `${url.origin}/portal.html?erro=${encodeURIComponent('Você ainda não tem nenhuma unidade liberada para o Receituário. Fale com o administrador do portal.')}`,
      302
    );
  }

  const solicitada = url.searchParams.get('unidade');
  const unidadeFinal = permitidas.includes(solicitada) ? solicitada : permitidas[0];

  const response = await next();
  const permitidasSet = new Set(permitidas);
  const mostrarSeletor = permitidas.length > 1;

  return new HTMLRewriter()
    .on('select#unidade', {
      element(element) {
        if (mostrarSeletor) {
          // Remove o display:none para o usuário poder escolher entre
          // as unidades que lhe foram atribuídas.
          element.removeAttribute('style');
        }
      },
    })
    .on('select#unidade option', {
      element(element) {
        const value = element.getAttribute('value');
        if (!permitidasSet.has(value)) {
          element.remove();
          return;
        }
        if (value === unidadeFinal) {
          element.setAttribute('selected', 'selected');
        } else {
          element.removeAttribute('selected');
        }
      },
    })
    .transform(response);
}