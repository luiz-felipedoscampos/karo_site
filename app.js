(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------------- estado (guardado no navegador) ---------------- */
const KEY = 'karo-estado-v2';
let S = { sacola: [], perfil: { nome: '', views: {}, favs: [], quiz: null, gravacao: '' }, mimos: {}, cupom: true };
try { const r = JSON.parse(localStorage.getItem(KEY)); if (r) S = { ...S, ...r, perfil: { ...S.perfil, ...(r.perfil || {}) }, mimos: r.mimos || {} }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
let P = [];
const por = id => P.find(p => p.id === id);
const porSlug = s => P.find(p => p.slug === s);
const unidades = () => S.sacola.reduce((s, i) => s + i.quantidade, 0);

const FRETE = 1990, GRATIS = 25000;
function calc() {
  const sub = S.sacola.reduce((s, i) => s + Math.round((por(i.id)?.preco || 0) * 100) * i.quantidade, 0);
  const cup = !!(S.cupom && S.mimos.assinatura && sub > 0);
  const desc = cup ? Math.round(sub * 0.10) : 0;
  const frete = sub === 0 || sub >= GRATIS ? 0 : FRETE;
  return { sub, desc, frete, total: sub - desc + frete, cup };
}
const c2 = v => brl(v / 100);

/* afinidade: o site aprende com o que o cliente faz */
function afinidade(slug) {
  const p = porSlug(slug); if (!p) return 0;
  let a = (S.perfil.views?.[slug] || 0);
  if (S.perfil.quiz?.slug === slug) a += 6;
  if (S.perfil.favs.includes(slug)) a += 3;
  if (S.sacola.some(i => i.id === p.id)) a += 2;
  return a;
}
function melhor() {
  const r = P.map(p => ({ slug: p.slug, a: afinidade(p.slug) })).sort((x, y) => y.a - x.a)[0];
  return r && r.a > 0 ? r.slug : null;
}

/* ---------------- avisos e mimos ---------------- */
let tt;
function toast(msg, icon = 'sparkle') {
  const t = $('#toast'); t.innerHTML = ic(icon) + `<span>${msg}</span>`; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 4200);
}
function desbloquear(chave, msg) {
  if (S.mimos[chave]) return;
  S.mimos[chave] = true; save(); toast(msg, 'gift'); renderMimos();
  const b = $('#mimos-btn'); b.classList.remove('brilha'); void b.offsetWidth; b.classList.add('brilha');
  atualizaBag();
}
function renderMimos() {
  const n = (S.mimos.amostra ? 1 : 0) + (S.mimos.assinatura ? 1 : 0);
  $('#mimos-n').textContent = n + '/2';
  $('#mimos-box').innerHTML = `
    <p class="mini" style="margin-bottom:6px">Mimos para você</p>
    <div class="mimo ${S.mimos.amostra ? 'ok' : ''}">${ic(S.mimos.amostra ? 'seal' : 'heart')}<div><b>Amostra de 2 ml</b><small>${S.mimos.amostra ? 'Liberada. Entra de cortesia no seu pedido.' : 'Favorite uma fragrância (coração).'}</small></div></div>
    <div class="mimo ${S.mimos.assinatura ? 'ok' : ''}">${ic(S.mimos.assinatura ? 'seal' : 'sparkle')}<div><b>10% na primeira compra</b><small>${S.mimos.assinatura ? 'Liberado. Aplicado na sacola (KARO10).' : 'Descubra sua assinatura olfativa.'}</small></div></div>`;
}
$('#mimos-btn').addEventListener('click', () => {
  const b = $('#mimos-box'), abrir = b.hidden; b.hidden = !abrir; $('#mimos-btn').setAttribute('aria-expanded', abrir);
});
document.addEventListener('click', e => { if (!e.target.closest('#mimos')) { $('#mimos-box').hidden = true; $('#mimos-btn').setAttribute('aria-expanded', 'false'); } });

/* ---------------- partículas (neblina do spray e confete de pétalas) ---------------- */
class Fx {
  constructor(c) { this.c = c; this.x = c.getContext('2d'); this.p = []; this.run = false; this.size(); addEventListener('resize', () => this.size()); }
  size() { const r = this.c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); this.w = r.width; this.h = r.height; this.c.width = r.width * d; this.c.height = r.height * d; this.x.setTransform(d, 0, 0, d, 0, 0); }
  add(o) { if (this.p.length < 520) this.p.push(o); if (!this.run) { this.run = true; requestAnimationFrame(() => this.tick()); } }
  tick() {
    const x = this.x; x.clearRect(0, 0, this.w, this.h);
    this.p = this.p.filter(q => (q.t += 1) < q.max);
    for (const q of this.p) {
      const k = q.t / q.max, a = Math.pow(1 - k, 1.5), [r, g, b] = q.rgb;
      q.x += q.vx; q.y += q.vy; q.rot += q.vr;
      if (q.kind === 'mist') { q.vx *= .955; q.vy = q.vy * .955 - .012; }
      else if (q.kind === 'micro') { q.vx *= .93; q.vy = q.vy * .93 + .028; }
      else if (q.kind === 'conf') { q.vy += .13; q.vx *= .992; }
      else { q.vx *= .985; q.vy = q.vy * .985 + .012; }
      x.globalCompositeOperation = q.kind === 'mist' ? 'lighter' : 'source-over';
      if (q.kind === 'micro') {
        x.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a * 1.3) * (q.al ?? 1)})`; x.beginPath(); x.arc(q.x, q.y, q.s, 0, 6.3); x.fill();
      } else if (q.kind === 'mist') {
        const R = q.s * (1 + k * 2.6), gr = x.createRadialGradient(q.x, q.y, 0, q.x, q.y, R);
        gr.addColorStop(0, `rgba(${r},${g},${b},${.085 * a * (q.al ?? 1)})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        x.fillStyle = gr; x.beginPath(); x.arc(q.x, q.y, R, 0, 6.3); x.fill();
      } else {
        x.save(); x.translate(q.x, q.y); x.rotate(q.rot); x.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a * 1.4)})`; x.strokeStyle = x.fillStyle;
        if (q.kind === 'petal' || q.kind === 'conf') { x.beginPath(); x.ellipse(0, 0, q.s * .8, q.s * .45, 0, 0, 6.3); x.fill(); }
        else if (q.kind === 'dot') { x.beginPath(); x.arc(0, 0, q.s * .38, 0, 6.3); x.fill(); x.fillStyle = `rgba(255,248,210,${a * .8})`; x.beginPath(); x.arc(-q.s * .1, -q.s * .1, q.s * .14, 0, 6.3); x.fill(); }
        else { x.lineWidth = 1.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(-q.s * .6, 0); x.lineTo(q.s * .6, 0); x.stroke(); }
        x.restore();
      }
    }
    x.globalCompositeOperation = 'source-over';
    if (this.p.length) requestAnimationFrame(() => this.tick()); else { this.run = false; x.clearRect(0, 0, this.w, this.h); }
  }
}
const CORES = { sakura: [242, 150, 176], yuzu: [248, 206, 70], hinoki: [140, 184, 108] };
const GLIFO = { sakura: 'petal', yuzu: 'dot', hinoki: 'needle' };
const neb = new Fx($('#neb-hero')), fx = new Fx($('#fx'));

function confete(x, y) {
  if (reduz) return;
  const paleta = [CORES.sakura, [246, 226, 184], [255, 255, 255], CORES.yuzu];
  for (let i = 0; i < 90; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 5 + Math.random() * 9;
    fx.add({ kind: 'conf', rgb: paleta[i % 4], x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: 90 + Math.random() * 60, s: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .3 });
  }
}

/* ---------------- sacola ---------------- */
function atualizaContador(anima) {
  const c = $('#contador'), n = unidades();
  c.textContent = n; c.setAttribute('aria-label', `${n} ${n === 1 ? 'unidade' : 'unidades'} na sacola`);
  if (anima) { c.classList.remove('pulo'); void c.offsetWidth; c.classList.add('pulo'); }
}
function adicionar(id) {
  const it = S.sacola.find(i => i.id === id);
  if (it) it.quantidade = Math.min(99, it.quantidade + 1); else S.sacola.push({ id, quantidade: 1 });
  save(); atualizaContador(true); aplicarPerfil(); if (view === 'sacola') render();
}
function atualizaBag() { if (view === 'sacola' || view === 'checkout') render(); }

/* ---------------- catálogo ---------------- */
function renderCatalogo() {
  $('#grade').innerHTML = P.map(p => `
    <article class="cartao" data-slug="${p.slug}">
      <div class="cartao-in">
        <span class="selo-card">${ic(p.slug)}<span class="rot">${esc(p.familia.split(' ')[0])}</span></span>
        <button class="fav" type="button" data-fav="${p.slug}" aria-pressed="${S.perfil.favs.includes(p.slug)}" aria-label="Favoritar ${esc(p.nome)}">${ic('heart')}</button>
        <button class="cartao-foto" type="button" data-detalhe="${p.id}" aria-label="Ver detalhes de ${esc(p.nome)}">
          <img src="${p.imagem}" alt="Frasco do perfume ${esc(p.nome)}" loading="lazy">
          <span class="sobre-notas">${esc(p.notas)}</span>
        </button>
        <div class="cartao-linha"><h3>${esc(p.nome)}</h3><span class="preco">${brl(p.preco)}</span></div>
        <p class="meta">${esc(p.familia)} · ${p.volume} ml</p>
        <p class="parc">ou 3x de ${brl(p.preco / 3)} sem juros</p>
        <div class="cartao-botoes">
          <button class="btn-vinho" type="button" data-add="${p.id}">Adicionar à sacola</button>
        </div>
      </div>
    </article>`).join('');
  aplicarPerfil();
}
/* inclinação 3D que segue o cursor */
if (!reduz && matchMedia('(pointer:fine)').matches) {
  document.addEventListener('pointermove', e => {
    const f = e.target.closest?.('.cartao-foto'); if (!f) return;
    const r = f.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, in_ = f.closest('.cartao-in');
    in_.style.transform = `rotateY(${(x - .5) * 9}deg) rotateX(${(.5 - y) * 9}deg)`; f.style.setProperty('--mx', x * 100 + '%'); f.style.setProperty('--my', y * 100 + '%');
  });
  document.addEventListener('pointerout', e => { const f = e.target.closest?.('.cartao-foto'); if (f && !f.contains(e.relatedTarget)) f.closest('.cartao-in').style.transform = ''; });
}

/* personalização: o site muda conforme o que o cliente faz */
function aplicarPerfil() {
  const m = melhor(), n = S.perfil.nome;
  const eb = $('#hero-eyebrow'), sub = $('#hero-sub');
  eb.innerHTML = `${ic('sakura')} ${n ? 'Olá, ' + esc(n) + '.' : 'Perfumaria japonesa'} · Edição numerada`;
  if (m) { const p = porSlug(m); sub.innerHTML = `Pelo que você escolheu, <b>${esc(p.nome)}</b> parece ser o seu. ${esc(p.tagline)}`; }
  $$('.cartao').forEach(c => {
    const eh = c.dataset.slug === m; c.classList.toggle('match', eh);
    $('.rot', c).textContent = eh ? 'Seu match' : porSlug(c.dataset.slug).familia.split(' ')[0];
  });
}

/* ---------------- painel lateral ---------------- */
const painel = $('#painel'), veu = $('#veu'), corpo = $('#painel-corpo'), titulo = $('#painel-titulo');
let view = null, ultimoFoco = null, ctx = null;
function abrir(v, extra) {
  if (!view) ultimoFoco = document.activeElement;
  view = v; if (extra !== undefined) ctx = extra;
  painel.hidden = false; veu.hidden = false; document.body.style.overflow = 'hidden';
  render(); requestAnimationFrame(() => { painel.classList.add('on'); veu.classList.add('on'); }); painel.focus();
}
function fechar() {
  if (!view) return;
  painel.classList.remove('on'); veu.classList.remove('on'); view = null;
  setTimeout(() => { if (!view) { painel.hidden = true; veu.hidden = true; } }, 350);
  document.body.style.overflow = ''; ultimoFoco?.focus?.();
}
function render() { ({ detalhe: rDetalhe, sacola: rSacola, checkout: rCheckout, ok: rOk })[view]?.(); }

function rDetalhe() {
  const p = por(ctx); if (!p) return fechar();
  titulo.textContent = p.nome;
  const nt = Object.entries(p.piramide), rot = { topo: 'Topo', coracao: 'Coração', fundo: 'Fundo' };
  corpo.innerHTML = `<div class="detalhe">
    <div class="detalhe-foto"><img src="${p.imagem}" alt="Frasco do perfume ${esc(p.nome)}"></div>
    <p class="detalhe-meta">${esc(p.familia)} · ${p.volume} ml</p>
    <p>${esc(p.descricao)}</p>
    <div class="pira">${nt.map(([k, v]) => `<div>${ic('sparkle')}<span><small>${rot[k]}</small><b>${esc(v)}</b></span></div>`).join('')}</div>
    <strong class="preco">${brl(p.preco)} <small style="font-weight:400;color:var(--suave)">ou 3x de ${brl(p.preco / 3)}</small></strong>
    <button class="btn-vinho" type="button" data-add="${p.id}">Adicionar à sacola</button>
  </div>`;
}
function freteHtml(t) {
  if (!t.sub) return '';
  const falta = GRATIS - t.sub;
  return `<div class="frete">${ic('truck')} ${falta > 0 ? `Faltam <b>${c2(falta)}</b> para o frete grátis.` : '<b class="verde">Você ganhou frete grátis.</b>'}<div class="barra"><i style="width:${clamp(t.sub / GRATIS * 100, 0, 100)}%"></i></div></div>`;
}
function rSacola() {
  titulo.textContent = 'Sua sacola';
  if (!S.sacola.length) { corpo.innerHTML = `<p>Sua sacola está vazia.</p><button class="btn-vinho" type="button" data-continuar>Continuar comprando</button>`; return; }
  const t = calc(), m = melhor();
  const faltam = P.filter(p => !S.sacola.some(i => i.id === p.id)).sort((a, b) => (b.slug === m) - (a.slug === m));
  corpo.innerHTML = freteHtml(t) + S.sacola.map(i => {
    const p = por(i.id); if (!p) return '';
    return `<div class="linha"><img src="${p.imagem}" alt="">
      <div><h3>${esc(p.nome)}</h3><small>${p.volume} ml · ${brl(p.preco)} por unidade</small>
        <div class="qtd"><button type="button" data-menos="${p.id}" aria-label="Diminuir quantidade de ${esc(p.nome)}">−</button><span aria-live="polite">${i.quantidade}</span><button type="button" data-mais="${p.id}" aria-label="Aumentar quantidade de ${esc(p.nome)}">+</button></div>
        <button class="remover" type="button" data-remover="${p.id}">Remover</button></div>
      <span class="subtotal">${brl(p.preco * i.quantidade)}</span></div>`;
  }).join('') +
  (faltam.length ? `<div class="upsell"><h4>Complete sua coleção</h4>${faltam.map(p => `<div class="up-item"><img src="${p.imagem}" alt=""><div><b>${esc(p.nome)}${p.slug === m ? '<span class="tag-match">Combina com você</span>' : ''}</b><small>${esc(p.familia)} · ${brl(p.preco)}</small></div><button type="button" data-add="${p.id}">Adicionar</button></div>`).join('')}</div>` : '') +
  (S.mimos.assinatura ? `<label class="cupom"><input type="checkbox" id="usar-cupom" ${S.cupom ? 'checked' : ''}> ${ic('gift')} <span>Usar meu mimo: <b>10% de desconto</b> (KARO10)</span></label>` : '') +
  `<div style="margin-top:8px"><div class="tot"><span>Subtotal</span><span>${c2(t.sub)}</span></div>
   ${t.desc ? `<div class="tot verde"><span>Desconto KARO10</span><span>− ${c2(t.desc)}</span></div>` : ''}
   <div class="tot"><span>Frete</span><span>${t.frete ? c2(t.frete) : 'Grátis'}</span></div>
   <div class="tot final"><span>Total</span><strong>${c2(t.total)}</strong></div></div>
   <p style="margin:6px 0 16px;font-size:13px">ou 3x de ${c2(Math.round(t.total / 3))} sem juros</p>
   <button class="btn-vinho" type="button" data-finalizar>Finalizar pedido</button>
   <button class="btn-contorno" type="button" data-continuar>Continuar comprando</button>`;
}
function amostraEscolhida() {
  if (!S.mimos.amostra) return '';
  const fora = P.filter(p => !S.sacola.some(i => i.id === p.id));
  const m = melhor();
  return (fora.find(p => p.slug === m) || fora[0] || P[0]).slug;
}
function rCheckout(erro = '', v = {}) {
  titulo.textContent = 'Finalizar pedido';
  const t = calc(), am = amostraEscolhida();
  const nomeV = v.nome ?? '', emailV = v.email ?? '', grV = v.gravacao ?? S.perfil.gravacao ?? '';
  corpo.innerHTML = `<p>Pedido demonstrativo. Use nome e e-mail fictícios. Nenhum pagamento será cobrado.</p>
    <div class="resumo">${S.sacola.map(i => { const p = por(i.id); return `<div><span>${i.quantidade} × ${esc(p.nome)}</span><span>${brl(p.preco * i.quantidade)}</span></div>`; }).join('')}
      ${am ? `<div><span>1 × Amostra 2 ml ${esc(porSlug(am).nome)}</span><span class="verde">Cortesia</span></div>` : ''}
      ${t.desc ? `<div class="verde"><span>Desconto KARO10</span><span>− ${c2(t.desc)}</span></div>` : ''}
      <div><span>Frete</span><span>${t.frete ? c2(t.frete) : 'Grátis'}</span></div></div>
    <div class="tot final"><span>Total do pedido</span><strong>${c2(t.total)}</strong></div>
    <form id="form" novalidate>
      <label class="l" for="nome">Nome completo</label>
      <input id="nome" name="nome" autocomplete="name" required value="${esc(nomeV)}" ${erro.includes('nome') ? 'aria-invalid="true"' : ''}>
      <label class="l" for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="email" required value="${esc(emailV)}" ${erro.toLowerCase().includes('e-mail') ? 'aria-invalid="true"' : ''}>
      <label class="l" for="grav">Gravação no frasco (cortesia, opcional)</label>
      <input id="grav" name="grav" maxlength="14" autocomplete="off" placeholder="Ex.: Ana" value="${esc(grV)}">
      <label class="opc"><input type="checkbox" id="pres" ${v.presente ? 'checked' : ''}> ${ic('gift')} É um presente (caixa, laço e cartão)</label>
      <div id="pres-box" ${v.presente ? '' : 'hidden'}><label class="l" for="msg">Mensagem do cartão</label><textarea id="msg" maxlength="120" placeholder="Escreva algo carinhoso…">${esc(v.mensagem || '')}</textarea></div>
      ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ''}
      <div class="form-botoes"><button class="btn-vinho" type="submit" id="confirmar">Confirmar pedido</button><button class="btn-contorno" type="button" data-voltar>Voltar à sacola</button></div>
    </form>`;
  const alvo = erro ? (erro.toLowerCase().includes('e-mail') ? '#email' : erro.includes('nome') ? '#nome' : null) : '#nome';
  if (alvo) $(alvo)?.focus();
}
function rOk() {
  titulo.textContent = 'Pedido confirmado';
  const o = ctx;
  corpo.innerHTML = `<div class="confirmacao"><p>Obrigada por escolher a KARO, ${esc(o.cliente)}.</p>
    <div class="resumo"><div><span>Pedido</span><strong>#${o.numero}</strong></div><div><span>Total</span><strong>${brl(o.total)}</strong></div></div>
    <p style="margin:16px 0 4px"><b>Seus frascos numerados</b></p>
    <ul class="frasco-lista">${o.frascos.map(f => `<li><span>${esc(f.perfume)}</span><span>nº ${f.numero}</span></li>`).join('')}</ul>
    ${o.gravacao ? `<p>${ic('sparkle')} Gravação: <b>${esc(o.gravacao)}</b></p>` : ''}
    ${o.amostra ? `<p>${ic('seal')} Amostra de cortesia: <b>${esc(o.amostra)}</b></p>` : ''}
    ${o.presente ? `<p>${ic('gift')} Presente com cartão${o.mensagem ? ': “' + esc(o.mensagem) + '”' : ''}</p>` : ''}
    <p>Esta compra foi uma simulação.</p>
    <button class="btn-vinho" type="button" data-continuar>Voltar à loja</button></div>`;
}

async function enviar(e) {
  e.preventDefault();
  const nome = $('#nome').value.trim(), email = $('#email').value.trim(), gravacao = $('#grav').value.trim();
  const presente = $('#pres').checked, mensagem = presente ? $('#msg').value.trim() : '';
  const v = { nome, email, gravacao, presente, mensagem };
  if (nome.length < 3 || !nome.includes(' ')) return rCheckout('Informe o nome completo.', v);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return rCheckout('Informe um e-mail válido.', v);
  const btn = $('#confirmar'); btn.disabled = true; btn.textContent = 'Enviando…';
  const t = calc();
  try {
    const r = await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      nome, email, gravacao, presente, mensagem, amostra: amostraEscolhida(), cupom: t.cup ? 'KARO10' : '',
      itens: S.sacola.map(i => ({ id: i.id, quantidade: i.quantidade })) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return rCheckout(d.erro || 'Não foi possível gravar o pedido. Tente novamente.', v);
    S.sacola = []; S.perfil.gravacao = gravacao; if (!S.perfil.nome) S.perfil.nome = nome.split(' ')[0]; save(); atualizaContador(); aplicarPerfil();
    view = 'ok'; ctx = d; render(); painel.scrollTop = 0;
    const r2 = painel.getBoundingClientRect(); confete(r2.left + r2.width / 2, 260);
  } catch { rCheckout('Falha de conexão. Seus itens foram mantidos; tente novamente.', v); }
}

/* ---------------- quiz: assinatura olfativa ---------------- */
const QS = [
  { t: 'Como você quer ser lembrada(o)?', o: [['sakura', 'Pela delicadeza', 'Um toque suave que fica na memória.'], ['yuzu', 'Pela energia', 'Alguém que ilumina o ambiente.'], ['hinoki', 'Pela presença', 'Calma e firmeza, sem pressa.']] },
  { t: 'Qual é o seu cenário ideal?', o: [['sakura', 'Jardim ao entardecer', 'Pétalas no ar e chá morno.'], ['yuzu', 'Feira de rua ao sol', 'Cores, frutas e conversa.'], ['hinoki', 'Floresta depois da chuva', 'Silêncio e terra molhada.']] },
  { t: 'Que estação é a sua cara?', o: [['sakura', 'Primavera', 'Tudo recomeçando.'], ['yuzu', 'Verão e inverno ensolarado', 'Dias claros e luminosos.'], ['hinoki', 'Outono', 'Madeira, manta e lareira.']] },
  { t: 'Que intensidade combina com você?', o: [['sakura', 'Suave', 'Perto da pele, para quem se aproxima.'], ['yuzu', 'Equilibrada', 'Presente sem pesar.'], ['hinoki', 'Marcante', 'Deixa rastro por onde passa.']] }
];
const MSG = { sakura: 'Delicado, elegante e acolhedor.', yuzu: 'Luminoso, vivo e cheio de energia.', hinoki: 'Profundo, sereno e inesquecível.' };
let qp = 0, qs = { sakura: 0, yuzu: 0, hinoki: 0 };
function renderQuiz() {
  const box = $('#quiz'), nome = S.perfil.nome;
  if (S.perfil.quiz && qp === -1) return resultado();
  const prog = `<div class="q-prog" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<i class="${i <= qp ? 'on' : ''}"></i>`).join('')}</div>`;
  if (qp === 0) {
    box.innerHTML = prog + `<h3>Como podemos te chamar?</h3><p class="sub">Para deixar a experiência com a sua cara.</p>
      <form class="q-nome" id="q-nome"><input id="q-nome-i" maxlength="20" autocomplete="given-name" placeholder="Seu primeiro nome" value="${esc(nome)}" aria-label="Seu primeiro nome"><button class="btn btn-ouro" style="color:var(--noite)" type="submit">Começar ${ic('arrow')}</button></form>
      <button class="pular" type="button" id="q-pular">Pular esta etapa</button>`;
    return;
  }
  const q = QS[qp - 1];
  box.innerHTML = prog + `<h3>${esc(q.t)}</h3><p class="sub">Pergunta ${qp} de 4</p>
    <div class="opcoes">${q.o.map(([s, a, b]) => `<button class="opcao" type="button" data-q="${s}">${ic(s)}<b>${a}</b><span>${b}</span></button>`).join('')}</div>`;
}
function resultado() {
  const slug = S.perfil.quiz.slug, p = porSlug(slug), pct = S.perfil.quiz.pct, nome = S.perfil.nome;
  $('#quiz').innerHTML = `<div class="res"><img src="${p.imagem}" alt="Frasco ${esc(p.nome)}">
    <div><p class="eyebrow">Sua assinatura olfativa</p><h3>${nome ? esc(nome) + ', o seu é ' : 'O seu é '}${esc(p.nome)}.</h3>
    <p class="sub" style="margin-bottom:4px">${MSG[slug]} ${esc(p.descricao)}</p>
    <div class="afin"><span>Afinidade ${pct}%</span><div class="barra"><i style="width:${pct}%"></i></div></div>
    <div class="presente-q">${ic('gift')} Mimo liberado: <b>10% na sua primeira compra</b>, aplicado na sacola.</div>
    <div class="btns"><button class="btn-vinho" type="button" data-add="${p.id}">Levar ${esc(p.nome)} · ${brl(p.preco)}</button><button class="pular" type="button" id="q-refazer">Refazer o teste</button></div></div></div>`;
}
$('#quiz').addEventListener('submit', e => {
  if (e.target.id !== 'q-nome') return; e.preventDefault();
  S.perfil.nome = $('#q-nome-i').value.trim().replace(/\s.*/, ''); save(); aplicarPerfil(); qp = 1; renderQuiz();
});
$('#quiz').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'q-pular') { qp = 1; renderQuiz(); }
  else if (b.id === 'q-refazer') { qp = 0; qs = { sakura: 0, yuzu: 0, hinoki: 0 }; S.perfil.quiz = null; save(); renderQuiz(); }
  else if (b.dataset.q) {
    qs[b.dataset.q]++; qp++;
    if (qp > 4) {
      const ord = Object.entries(qs).sort((a, c) => c[1] - a[1]), top = ord[0];
      S.perfil.quiz = { slug: top[0], pct: Math.round(60 + top[1] / 4 * 40) }; save(); qp = -1;
      resultado(); aplicarPerfil(); desbloquear('assinatura', 'Mimo liberado: 10% na primeira compra.');
      const r = $('#quiz').getBoundingClientRect(); confete(r.left + r.width / 2, r.top + 120);
    } else renderQuiz();
  }
});

/* ---------------- exclusividade: gravação e hanko ---------------- */
let grScent = 'sakura';
function renderEx() {
  $('#gr-chips').innerHTML = P.map(p => `<button type="button" class="chip" data-gs="${p.slug}" aria-pressed="${p.slug === grScent}">${ic(p.slug)} ${esc(p.nome)}</button>`).join('');
  const p = porSlug(grScent), n = $('#gr-nome').value.trim();
  $('#gr-foto').src = p.imagem; $('#gr-foto').alt = 'Frasco ' + p.nome;
  $('#gr-texto').textContent = n || 'Seu nome';
  $('#hanko-t').textContent = n ? n[0].toUpperCase() : 'K';
  let h = 0; for (const ch of n + grScent) h = (h * 31 + ch.charCodeAt(0)) % 300; $('#gr-num').textContent = String(h + 1).padStart(4, '0');
}
$('#gr-nome').addEventListener('input', () => { renderEx(); const h = $('#hanko'); h.classList.remove('carimba'); void h.offsetWidth; h.classList.add('carimba'); });
$('#gr-chips').addEventListener('click', e => { const b = e.target.closest('[data-gs]'); if (b) { grScent = b.dataset.gs; renderEx(); } });
$('#gr-levar').addEventListener('click', () => {
  const n = $('#gr-nome').value.trim(), p = porSlug(grScent);
  if (!n) { $('#gr-nome').setAttribute('aria-invalid', 'true'); $('#gr-nome').focus(); return; }
  $('#gr-nome').removeAttribute('aria-invalid');
  if (!/^[\p{L}\p{N} .'-]+$/u.test(n)) { toast('Use apenas letras e números na gravação.', 'seal'); return; }
  S.perfil.gravacao = n; if (!S.perfil.nome) { S.perfil.nome = n.split(' ')[0]; } save(); adicionar(p.id); aplicarPerfil();
  toast(`${esc(p.nome)} com “${esc(n)}” na sacola.`, 'gift');
});

/* ---------------- eventos globais ---------------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return; const d = t.dataset;
  if (d.add) {
    adicionar(+d.add);
    if (t.matches('.btn-vinho') && !t.closest('.res')) { const o = t.textContent; t.textContent = 'Adicionado ✓'; setTimeout(() => { if (t.isConnected) t.textContent = o; }, 1100); }
  }
  else if (d.fav) {
    const s = d.fav, i = S.perfil.favs.indexOf(s); if (i >= 0) S.perfil.favs.splice(i, 1); else S.perfil.favs.push(s);
    save(); t.setAttribute('aria-pressed', i < 0); t.classList.remove('bate'); void t.offsetWidth; t.classList.add('bate'); aplicarPerfil();
    if (i < 0) { toast(`${esc(porSlug(s).nome)} salvo nos seus favoritos.`, 'heart'); desbloquear('amostra', 'Mimo liberado: amostra de 2 ml de cortesia no seu pedido.'); }
  }
  else if (d.detalhe) { const pp = por(+d.detalhe); if (pp) { S.perfil.views = S.perfil.views || {}; S.perfil.views[pp.slug] = (S.perfil.views[pp.slug] || 0) + 1; save(); } abrir('detalhe', +d.detalhe); }
  else if (d.mais) adicionar(+d.mais);
  else if (d.menos) { const it = S.sacola.find(i => i.id === +d.menos); if (it && --it.quantidade <= 0) S.sacola = S.sacola.filter(i => i !== it); save(); atualizaContador(); aplicarPerfil(); render(); }
  else if (d.remover) { S.sacola = S.sacola.filter(i => i.id !== +d.remover); save(); atualizaContador(); aplicarPerfil(); render(); }
  else if (d.finalizar !== undefined) { view = 'checkout'; render(); }
  else if (d.voltar !== undefined) { view = 'sacola'; render(); painel.focus(); }
  else if (d.continuar !== undefined) fechar();
  else if (t.id === 'abrir-sacola') abrir('sacola');
  else if (t.id === 'fechar') fechar();
});
document.addEventListener('change', e => {
  if (e.target.id === 'usar-cupom') { S.cupom = e.target.checked; save(); render(); }
  if (e.target.id === 'pres') $('#pres-box').hidden = !e.target.checked;
});
document.addEventListener('submit', e => { if (e.target.id === 'form') enviar(e); });
veu.addEventListener('click', fechar);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') fechar();
  if (e.key === 'Tab' && view) {
    const f = $$('button,input,a[href],textarea', painel).filter(x => !x.disabled && !x.closest('[hidden]'));
    if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || document.activeElement === painel)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
});

/* ---------------- movimento: revelações, parallax, jornada, fagulhas ---------------- */
const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .15 });
$$('[data-reveal]').forEach(el => io.observe(el));

const jornada = $('#jornada'), caps = $$('.cap'), fotos = $$('.foto-j'), KJ = ['桜', '柚子', '檜'];
let ticking = false;
function aoRolar() {
  ticking = false;
  const y = scrollY;
  heroRolar();
  const r = jornada.getBoundingClientRect(), total = r.height - innerHeight, p = clamp(-r.top / total, 0, 1);
  const idx = Math.min(2, Math.floor(p * 3 * .999));
  if (jornada.dataset.idx != idx) {
    jornada.dataset.idx = idx; caps.forEach((c, i) => c.classList.toggle('on', i === idx)); fotos.forEach((f, i) => f.classList.toggle('on', i === idx)); $('#kanji').textContent = KJ[idx];
  }
  jornada.style.setProperty('--p', p); $('#kanji').style.setProperty('--p', p); $('#prog-j').style.width = p * 100 + '%';
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(aoRolar); } }, { passive: true });

if (!reduz) {
  const pet = $('#petais');
  for (let i = 0; i < 16; i++) { const s = document.createElement('i'); s.className = 'petal'; s.style.cssText = `left:${Math.random() * 100}%;--dx:${(Math.random() - .5) * 240}px;animation-duration:${9 + Math.random() * 9}s;animation-delay:-${Math.random() * 14}s;transform:scale(${.6 + Math.random() * .9})`; pet.appendChild(s); }
  if (matchMedia('(pointer:fine)').matches) {
    let ult = 0;
    addEventListener('pointermove', e => {
      const n = performance.now(); if (n - ult < 55) return; ult = n;
      const f = document.createElement('i'); f.className = 'fagulha'; f.style.left = e.clientX - 5 + 'px'; f.style.top = e.clientY - 5 + 'px';
      f.style.setProperty('--x', (Math.random() - .5) * 40 + 'px'); f.style.setProperty('--y', 10 + Math.random() * 30 + 'px'); document.body.appendChild(f); setTimeout(() => f.remove(), 800);
    }, { passive: true });
  }
}


/* ---------------- abertura: luz que segue o cursor, profundidade e aproximação ao rolar ---------------- */
const cab = $('.cabecalho'), wrap = $('#hero-wrap'), heroEl = $('.hero'), cena = $('#cena'), luz = $('#luz'), svgCena = cena.querySelector('svg'), conteudo = $('.hero-conteudo');
const ease = t => t * t * (3 - 2 * t);
let tx = .68, ty = .42, mx = .68, my = .42, ativo = false, tocou = false, prog = 0, visivel = true;
function layoutCena() {
  document.documentElement.style.setProperty('--cab', cab.offsetHeight + 'px');
  const W = heroEl.clientWidth, H = heroEl.clientHeight, mob = W < 1000;
  if (mob) {   // celular: foto preenche a tela
    const s = Math.max(W / 1536, H / 1024), w = 1536 * s, h = 1024 * s;
    Object.assign(cena.style, { width: w + 'px', height: h + 'px', left: (W - w) * .72 + 'px', top: '0px' });
  } else {     // computador: frasco inteiro, encostado à direita; o escuro da foto se funde ao fundo
    const s = H / 1024 * 1.1, w = 1536 * s, h = 1024 * s;
    Object.assign(cena.style, { width: w + 'px', height: h + 'px', left: (W - w + 16) + 'px', top: (H - h) * .55 + 'px' });
  }
}
function quadro(t) {
  if (!visivel) { ativo = false; return; }
  if (!tocou) { tx = .68 + Math.sin(t / 2600) * .09; ty = .42 + Math.cos(t / 3300) * .07; }   // respira sozinha (celular e sem mouse)
  mx += (tx - mx) * .06; my += (ty - my) * .06;
  const W = heroEl.clientWidth, H = heroEl.clientHeight, mob = W < 1000, z = (mob ? 1.045 : 1) + (mob ? .6 : 1.05) * ease(prog);
  luz.style.setProperty('--lx', mx * W + 'px'); luz.style.setProperty('--ly', my * H + 'px');
  svgCena.style.transform = `translate3d(${(.5 - mx) * -22}px,${(.5 - my) * -14}px,0) scale(${z})`;
  requestAnimationFrame(quadro);
}
function acorda() { if (!ativo && !reduz) { ativo = true; requestAnimationFrame(quadro); } }
heroEl.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const r = heroEl.getBoundingClientRect(); tocou = true; tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; acorda();
});
heroEl.addEventListener('pointerleave', () => { tocou = false; });
new IntersectionObserver(([en]) => { visivel = en.isIntersecting; if (visivel) acorda(); }).observe(heroEl);
function heroRolar() {
  const D = wrap.offsetHeight - heroEl.offsetHeight, topo = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cab')) || 104;
  prog = clamp((topo - wrap.getBoundingClientRect().top) / D, 0, 1);
  $('#mimos').classList.toggle('esconde', wrap.getBoundingClientRect().bottom > innerHeight * .92);
  if (reduz) return;
  conteudo.style.opacity = 1 - clamp(prog * 1.35, 0, 1);
  conteudo.style.transform = `translate3d(0,${-prog * 46}px,0)`;
  $('#rolar').style.opacity = prog > .04 ? 0 : 1;
  const f = clamp((prog - .5) / .3, 0, 1), fim = $('#hero-fim');
  fim.style.opacity = f; fim.style.transform = `translate3d(0,${(1 - f) * 26}px,0)`; fim.style.pointerEvents = f > .6 ? 'auto' : 'none';
  fim.setAttribute('aria-hidden', f > .6 ? 'false' : 'true'); fim.querySelector('a').tabIndex = f > .6 ? 0 : -1;
  heroEl.style.setProperty('--escuro', (prog * .55).toFixed(3));
  acorda();
}
addEventListener('resize', layoutCena);

/* ---------------- início ---------------- */
layoutCena(); atualizaContador(); renderMimos(); renderQuiz(); aoRolar();
if (S.perfil.quiz) { qp = -1; renderQuiz(); }
if (S.perfil.gravacao) $('#gr-nome').value = S.perfil.gravacao;
fetch('/api/perfumes').then(r => r.json()).then(d => {
  P = d; S.sacola = S.sacola.filter(i => por(i.id)); save();
  renderCatalogo(); renderEx(); atualizaContador(); aplicarPerfil(); renderMimos();
}).catch(() => { $('#grade').innerHTML = '<p class="carregando">Não foi possível carregar o catálogo. Recarregue a página.</p>'; });
})();
