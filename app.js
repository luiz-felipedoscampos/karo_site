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
let S = { sacola: [], perfil: { nome: '', sprays: {}, favs: [], quiz: null, gravacao: '' }, mimos: {}, cupom: true };
try { const r = JSON.parse(localStorage.getItem(KEY)); if (r) S = { ...S, ...r, perfil: { ...S.perfil, ...(r.perfil || {}) }, mimos: r.mimos || {} }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
let P = [];
const por = id => P.find(p => p.id === id);
const porSlug = s => P.find(p => p.slug === s);
const totalSprays = () => Object.values(S.perfil.sprays).reduce((a, b) => a + b, 0);
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
  let a = (S.perfil.sprays[slug] || 0) * 2;
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
  const sp = Math.min(3, totalSprays());
  $('#mimos-box').innerHTML = `
    <p class="mini" style="margin-bottom:6px">Mimos para você</p>
    <div class="mimo ${S.mimos.amostra ? 'ok' : ''}">${ic(S.mimos.amostra ? 'seal' : 'spray')}<div><b>Amostra de 2 ml</b><small>${S.mimos.amostra ? 'Liberada. Entra de cortesia no seu pedido.' : `Borrife 3 vezes no ritual (${sp}/3).`}</small>${S.mimos.amostra ? '' : `<div class="barra"><i style="width:${sp / 3 * 100}%"></i></div>`}</div></div>
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
      if (q.kind === 'mist') { q.vx *= .96; q.vy = q.vy * .96 - .016; }
      else if (q.kind === 'conf') { q.vy += .13; q.vx *= .992; }
      else { q.vx *= .985; q.vy = q.vy * .985 + .012; }
      x.globalCompositeOperation = q.kind === 'mist' ? 'lighter' : 'source-over';
      if (q.kind === 'mist') {
        const R = q.s * (1 + k * 2.6), gr = x.createRadialGradient(q.x, q.y, 0, q.x, q.y, R);
        gr.addColorStop(0, `rgba(${r},${g},${b},${.065 * a})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
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
const neb = new Fx($('#neblina')), fx = new Fx($('#fx'));
new ResizeObserver(() => neb.size()).observe($('#palco'));

function confete(x, y) {
  if (reduz) return;
  const paleta = [CORES.sakura, [246, 226, 184], [255, 255, 255], CORES.yuzu];
  for (let i = 0; i < 90; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 5 + Math.random() * 9;
    fx.add({ kind: 'conf', rgb: paleta[i % 4], x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: 90 + Math.random() * 60, s: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .3 });
  }
}

/* ---------------- som do spray ---------------- */
let som = true, actx;
function psst() {
  if (!som) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const dur = .5, buf = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
    const s = actx.createBufferSource(); s.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2400;
    const g = actx.createGain(); g.gain.value = .11;
    s.connect(f); f.connect(g); g.connect(actx.destination); s.start();
  } catch {}
}
$('#som').addEventListener('click', e => {
  som = !som; const b = e.currentTarget; b.setAttribute('aria-pressed', som);
  b.innerHTML = ic(som ? 'sound' : 'mute');
});

/* ---------------- ritual do spray ---------------- */
const ritual = $('#ritual'), frasco = $('#frasco');
let scent = 'sakura', nivel = 1, aperta = false, ate = 0, ultimo = 0, timers = [];
const REACOES = {
  sakura: ['Suave, não é?', 'Dá vontade de ficar mais perto.', 'Primavera na pele.'],
  yuzu: ['Que frescor!', 'Parece luz do sol.', 'Energia que contagia.'],
  hinoki: ['Calma e profundidade.', 'Uma floresta depois da chuva.', 'Presença que fica.']
};
function trocarScent(s) {
  scent = s; ritual.dataset.scent = s; nivel = 1; setLiquido();
  $$('.aba').forEach(b => b.setAttribute('aria-selected', b.dataset.scent === s));
  const p = porSlug(s);
  $('#frasco-nome').textContent = (p?.nome || s).toUpperCase();
  $('#afin-nome').textContent = p?.nome || s;
  if (p) $$('#piramide .nota').forEach((n, i) => { $('b', n).textContent = Object.values(p.piramide)[i]; n.classList.remove('on'); });
  atualizaRitual(true);
}
function setLiquido() { const h = 198 * nivel; const l = $('#liquido'); l.setAttribute('y', 204 + 198 - h); l.setAttribute('height', h); }
function bico() { const n = $('#bico').getBoundingClientRect(), c = $('#neblina').getBoundingClientRect(); return { x: n.left - c.left, y: n.top + n.height / 2 - c.top }; }
function emitir(qtd) {
  const o = bico(), rgb = CORES[scent];
  for (let i = 0; i < qtd; i++) {
    const a = Math.PI + (Math.random() - .5) * .6 - .1, v = 2.2 + Math.random() * 4.6, g = Math.random() < .12;
    neb.add({ kind: g ? GLIFO[scent] : 'mist', rgb, x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, max: g ? 90 + Math.random() * 60 : 46 + Math.random() * 56, s: g ? 7 + Math.random() * 9 : 7 + Math.random() * 16, rot: Math.random() * 6, vr: (Math.random() - .5) * .22 });
  }
}
function laco() {
  if (aperta || performance.now() < ate) { emitir(reduz ? 2 : 5); requestAnimationFrame(laco); } else loop = false;
}
let loop = false;
function iniciar() {
  const agora = performance.now();
  aperta = true; ate = agora + 380; frasco.classList.add('apertado'); $('#dica').classList.add('sumiu');
  if (!loop) { loop = true; requestAnimationFrame(laco); }
  if (agora - ultimo > 750) { ultimo = agora; borrifou(); }
}
function parar() { aperta = false; frasco.classList.remove('apertado'); }
function borrifou() {
  psst(); if (navigator.vibrate) navigator.vibrate(18);
  S.perfil.sprays[scent] = (S.perfil.sprays[scent] || 0) + 1; save();
  nivel = Math.max(.35, nivel - .03); setLiquido();
  timers.forEach(clearTimeout); timers = [];
  $$('#piramide .nota').forEach((n, i) => { n.classList.remove('on'); timers.push(setTimeout(() => n.classList.add('on'), 250 + i * 1000)); });
  atualizaRitual();
  if (totalSprays() >= 3) desbloquear('amostra', 'Mimo liberado: amostra de 2 ml de cortesia no seu pedido.');
  aplicarPerfil();
}
function atualizaRitual(troca) {
  const n = S.perfil.sprays[scent] || 0, p = porSlug(scent);
  const pct = clamp(n * 34, 0, 100);
  $('#barra-i').style.width = pct + '%'; $('#barra').setAttribute('aria-valuenow', pct);
  $('#reacao').textContent = n ? REACOES[scent][(n - 1) % 3] : 'Borrife para sentir.';
  const cta = $('#cta-ritual'); cta.hidden = n < 1 || !p;
  if (p) $('#levar-ritual').innerHTML = `${ic('bag')} Levar ${esc(p.nome)} · ${brl(p.preco)}`;
  if (troca) $('#dica').classList.toggle('sumiu', totalSprays() > 0);
}
frasco.addEventListener('pointerdown', e => { e.preventDefault(); frasco.setPointerCapture?.(e.pointerId); iniciar(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => frasco.addEventListener(ev, parar));
frasco.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); iniciar(); } });
frasco.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') parar(); });
frasco.addEventListener('blur', parar);
$$('.aba').forEach(b => b.addEventListener('click', () => trocarScent(b.dataset.scent)));
$('#levar-ritual').addEventListener('click', () => { const p = porSlug(scent); adicionar(p.id); toast(`${esc(p.nome)} na sacola. Boa escolha.`, 'bag'); });
$('#outra').addEventListener('click', () => { const ordem = ['sakura', 'yuzu', 'hinoki']; trocarScent(ordem[(ordem.indexOf(scent) + 1) % 3]); });

function irRitual(slug) { trocarScent(slug); $('#ritual').scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' }); }

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
          <button class="btn-prova" type="button" data-prova="${p.slug}" aria-label="Provar ${esc(p.nome)} no ritual">${ic('spray')} Provar</button>
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
  if (m) { const p = porSlug(m); sub.innerHTML = `Pelo que você sentiu, <b>${esc(p.nome)}</b> parece ser o seu. ${esc(p.tagline)}`; }
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
    <button class="btn-contorno" type="button" data-prova="${p.slug}">${ic('spray')} Provar no ritual do spray</button>
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
  (faltam.length ? `<div class="upsell"><h4>Complete seu ritual</h4>${faltam.map(p => `<div class="up-item"><img src="${p.imagem}" alt=""><div><b>${esc(p.nome)}${p.slug === m ? '<span class="tag-match">Combina com você</span>' : ''}</b><small>${esc(p.familia)} · ${brl(p.preco)}</small></div><button type="button" data-add="${p.id}">Adicionar</button></div>`).join('')}</div>` : '') +
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
    <div class="btns"><button class="btn-vinho" type="button" data-add="${p.id}">Levar ${esc(p.nome)} · ${brl(p.preco)}</button><button class="btn-contorno" type="button" data-prova="${p.slug}">${ic('spray')} Provar no ritual</button><button class="pular" type="button" id="q-refazer">Refazer o teste</button></div></div></div>`;
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
    if (i < 0) toast(`${esc(porSlug(s).nome)} salvo nos seus favoritos.`, 'heart');
  }
  else if (d.detalhe) abrir('detalhe', +d.detalhe);
  else if (d.prova) { if (view) fechar(); irRitual(d.prova); }
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
  if (!reduz) $('.hero-bg').style.transform = `translate3d(0,${clamp(y, 0, 900) * .22}px,0) scale(${1 + clamp(y, 0, 900) / 6000})`;
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

/* ---------------- início ---------------- */
atualizaContador(); renderMimos(); renderQuiz(); aoRolar();
if (S.perfil.quiz) { qp = -1; renderQuiz(); }
if (S.perfil.gravacao) $('#gr-nome').value = S.perfil.gravacao;
fetch('/api/perfumes').then(r => r.json()).then(d => {
  P = d; S.sacola = S.sacola.filter(i => por(i.id)); save();
  renderCatalogo(); trocarScent('sakura'); renderEx(); atualizaContador(); aplicarPerfil(); renderMimos();
  $('#som').innerHTML = ic('sound');
}).catch(() => { $('#grade').innerHTML = '<p class="carregando">Não foi possível carregar o catálogo. Recarregue a página.</p>'; });
})();
