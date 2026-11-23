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
let S = { sacola: [], perfil: { nome: '', views: {} } };
try { const r = JSON.parse(localStorage.getItem(KEY)); if (r) S = { ...S, ...r, perfil: { ...S.perfil, ...(r.perfil || {}) } }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
let P = [];
const por = id => P.find(p => p.id === id);
const porSlug = s => P.find(p => p.slug === s);
const unidades = () => S.sacola.reduce((s, i) => s + i.quantidade, 0);

const FRETE = 1990, GRATIS = 25000;
function calc() {
  const sub = S.sacola.reduce((s, i) => s + Math.round((por(i.id)?.preco || 0) * 100) * i.quantidade, 0);
  const frete = sub === 0 || sub >= GRATIS ? 0 : FRETE;
  return { sub, frete, total: sub + frete };
}
const c2 = v => brl(v / 100);

/* afinidade: o site aprende com o que o cliente faz */
function afinidade(slug) {
  const p = porSlug(slug); if (!p) return 0;
  let a = (S.perfil.views?.[slug] || 0);
  if (S.perfil.quiz?.slug === slug) a += 6;
  if (S.sacola.some(i => i.id === p.id)) a += 2;
  return a;
}
function melhor() {
  const r = P.map(p => ({ slug: p.slug, a: afinidade(p.slug) })).sort((x, y) => y.a - x.a)[0];
  return r && r.a > 0 ? r.slug : null;
}

/* ---------------- avisos ---------------- */
let tt;
function toast(msg, icon = 'sparkle') {
  const t = $('#toast'); t.innerHTML = ic(icon) + `<span>${msg}</span>`; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 4200);
}

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
function adicionar(id, adiar) {
  const it = S.sacola.find(i => i.id === id);
  if (it) it.quantidade = Math.min(99, it.quantidade + 1); else S.sacola.push({ id, quantidade: 1 });
  save(); if (!adiar) atualizaContador(true); aplicarPerfil(); if (view === 'sacola') render();
}
/* um medalhão dourado com o frasco sai do botão, desenha uma curva suave e acende a sacola */
function voar(origem, p) {
  const cont = $('#contador'); if (reduz || !cont || view) return false;
  const a = origem.getBoundingClientRect(), b = cont.getBoundingClientRect(), T = 64;
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const cx = (x0 + x1) / 2 + (x1 - x0) * .12, cy = Math.min(y0, y1) - Math.max(90, Math.abs(y1 - y0) * .35);
  const f = document.createElement('div'); f.className = 'voador'; f.style.backgroundImage = `url(${p.imagem})`; document.body.appendChild(f);
  const D = 950, t0 = performance.now(), suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; let ult = 0;
  (function passo(agora) {
    const t = Math.min(1, (agora - t0) / D), e = suave(t), u = 1 - e;
    const x = u * u * x0 + 2 * u * e * cx + e * e * x1, y = u * u * y0 + 2 * u * e * cy + e * e * y1, s = 1 - .7 * e;
    f.style.transform = `translate(${x - T / 2}px,${y - T / 2}px) scale(${s})`;
    f.style.opacity = t < .12 ? t / .12 : t > .88 ? (1 - t) / .12 : 1;
    if (agora - ult > 40 && t < .93) { ult = agora; const r = document.createElement('i'); r.className = 'rastro'; r.style.left = x + 'px'; r.style.top = y + 'px'; r.style.setProperty('--s', s); document.body.appendChild(r); setTimeout(() => r.remove(), 700); }
    if (t < 1) requestAnimationFrame(passo);
    else {
      f.remove();
      const o = document.createElement('i'); o.className = 'onda'; o.style.left = x1 + 'px'; o.style.top = y1 + 'px'; document.body.appendChild(o); setTimeout(() => o.remove(), 900);
      const bt = $('.btn-sacola'); bt.classList.remove('bate'); void bt.offsetWidth; bt.classList.add('bate'); atualizaContador(true);
    }
  })(t0);
  return true;
}
/* ficha técnica (frase e linhas vêm do catálogo) */
function fichaHtml(p) {
  const n = p.piramide, l = (k, v) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
  return `<section class="ficha"><h4>Ficha técnica</h4><dl>` + l('Concentração', p.concentracao || 'Eau de Parfum') + l('Volume', p.volume + ' ml')
    + l('Topo', n.topo) + l('Coração', n.coracao) + l('Fundo', n.fundo) + l('Edição', '300 frascos numerados') + `</dl></section>`;
}

/* ---------------- catálogo ---------------- */
function renderCatalogo() {
  if (!$('#grade')) return;
  $('#grade').innerHTML = P.map(p => `
    <article class="cartao" data-slug="${p.slug}">
      <div class="cartao-in">
        <span class="selo-card">${ic(p.slug)}<span class="rot">${esc(p.familia.split(' ')[0])}</span></span>
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
  const m = melhor();
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
function render() { ({ detalhe: rDetalhe, sacola: rSacola, checkout: rCheckout, pagamento: rPagamento, ok: rOk })[view]?.(); }

function rDetalhe() {
  const p = por(ctx); if (!p) return fechar();
  titulo.textContent = p.nome;
  corpo.innerHTML = `<div class="detalhe">
    <button class="vsacola" type="button" data-vsacola>← Sua sacola</button>
    <div class="detalhe-foto"><img src="${p.imagem}" alt="Frasco do perfume ${esc(p.nome)}"></div>
    <p class="detalhe-meta">${esc(p.familia)}</p>
    <p class="detalhe-desc">${esc(p.descricao)}</p>
    <strong class="preco">${brl(p.preco)} <small style="font-weight:400;color:var(--suave)">ou 3x de ${brl(p.preco / 3)}</small></strong>
    <button class="btn-vinho" type="button" data-add="${p.id}">Adicionar à sacola</button>
    ${fichaHtml(p)}
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
    return `<div class="linha"><button class="ir-produto foto" type="button" data-detalhe="${p.id}" aria-label="Abrir ${esc(p.nome)}"><img src="${p.imagem}" alt=""></button>
      <div><h3><button class="ir-produto" type="button" data-detalhe="${p.id}" aria-label="Abrir ${esc(p.nome)}">${esc(p.nome)}</button></h3><small>${p.volume} ml · ${brl(p.preco)} por unidade</small>
        <div class="qtd"><button type="button" data-menos="${p.id}" aria-label="Diminuir quantidade de ${esc(p.nome)}">−</button><span aria-live="polite">${i.quantidade}</span><button type="button" data-mais="${p.id}" aria-label="Aumentar quantidade de ${esc(p.nome)}">+</button></div>
        <button class="remover" type="button" data-remover="${p.id}">Remover</button></div>
      <span class="subtotal">${brl(p.preco * i.quantidade)}</span></div>`;
  }).join('') +
  (faltam.length ? `<div class="upsell"><h4>Complete sua coleção</h4>${faltam.map(p => `<div class="up-item"><button class="ir-produto foto" type="button" data-detalhe="${p.id}" aria-label="Abrir ${esc(p.nome)}"><img src="${p.imagem}" alt=""></button><div><b><button class="ir-produto" type="button" data-detalhe="${p.id}" aria-label="Abrir ${esc(p.nome)}">${esc(p.nome)}</button>${p.slug === m ? '<span class="tag-match">Combina com você</span>' : ''}</b><small>${esc(p.familia)} · ${brl(p.preco)}</small></div><button type="button" data-add="${p.id}">Adicionar</button></div>`).join('')}</div>` : '') +
  `<div style="margin-top:8px"><div class="tot"><span>Subtotal</span><span>${c2(t.sub)}</span></div>
   <div class="tot"><span>Frete</span><span>${t.frete ? c2(t.frete) : 'Grátis'}</span></div>
   <div class="tot final"><span>Total</span><strong>${c2(t.total)}</strong></div></div>
   <p style="margin:6px 0 16px;font-size:13px">ou 3x de ${c2(Math.round(t.total / 3))} sem juros</p>
   <button class="btn-vinho" type="button" data-finalizar>Finalizar pedido</button>
   <button class="btn-contorno" type="button" data-continuar>Continuar comprando</button>`;
}
function rCheckout(erro = '', v = {}) {
  titulo.textContent = 'Finalizar pedido';
  const t = calc();
  const nomeV = v.nome ?? '', emailV = v.email ?? '', en = v.endereco || {};
  corpo.innerHTML = `<p>Pedido demonstrativo. Use nome e e-mail fictícios. Nenhum pagamento será cobrado.</p>
    <div class="resumo">${S.sacola.map(i => { const p = por(i.id); return `<div><span>${i.quantidade} × ${esc(p.nome)}</span><span>${brl(p.preco * i.quantidade)}</span></div>`; }).join('')}
      <div><span>Frete</span><span>${t.frete ? c2(t.frete) : 'Grátis'}</span></div></div>
    <div class="tot final"><span>Total do pedido</span><strong>${c2(t.total)}</strong></div>
    <form id="form" novalidate>
      <label class="l" for="nome">Nome completo</label>
      <input id="nome" name="nome" autocomplete="name" required value="${esc(nomeV)}" ${erro.includes('nome') ? 'aria-invalid="true"' : ''}>
      <label class="l" for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="email" required value="${esc(emailV)}" ${erro.toLowerCase().includes('e-mail') ? 'aria-invalid="true"' : ''}>
      <label class="l" for="cep">CEP</label>
      <input id="cep" name="cep" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" value="${esc(en.cep || '')}" ${erro.includes('endereço') ? 'aria-invalid="true"' : ''}>
      <p class="cep-msg" id="cep-msg" aria-live="polite"></p>
      <label class="l" for="rua">Rua</label>
      <input id="rua" name="rua" autocomplete="address-line1" value="${esc(en.rua || '')}">
      <div class="duas"><div><label class="l" for="numero">Número</label><input id="numero" name="numero" autocomplete="off" maxlength="10" value="${esc(en.numero || '')}"></div>
        <div><label class="l" for="comp">Complemento</label><input id="comp" name="comp" autocomplete="address-line2" maxlength="60" value="${esc(en.complemento || '')}"></div></div>
      <label class="l" for="bairro">Bairro</label>
      <input id="bairro" name="bairro" value="${esc(en.bairro || '')}">
      <div class="duas cid"><div><label class="l" for="cidade">Cidade</label><input id="cidade" name="cidade" autocomplete="address-level2" value="${esc(en.cidade || '')}"></div>
        <div><label class="l" for="uf">UF</label><input id="uf" name="uf" maxlength="2" autocomplete="address-level1" value="${esc(en.uf || '')}"></div></div>
      ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ''}
      <div class="form-botoes"><button class="btn-vinho" type="submit" id="confirmar">Confirmar pedido</button><button class="btn-contorno" type="button" data-voltar>Voltar à sacola</button></div>
    </form>`;
  const alvo = erro ? (erro.toLowerCase().includes('e-mail') ? '#email' : erro.includes('nome') ? '#nome' : erro.includes('endereço') ? '#cep' : null) : '#nome';
  if (alvo) $(alvo)?.focus();
  ligaCep();
}
// CEP -> endereço pela ViaCEP (API pública e gratuita). Se falhar, o cliente preenche à mão.
function ligaCep() {
  const cep = $('#cep'), msg = $('#cep-msg'); if (!cep) return;
  let ultimo = '';
  cep.addEventListener('input', () => {
    const d = cep.value.replace(/\D/g, '').slice(0, 8);
    cep.value = d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
    cep.removeAttribute('aria-invalid'); msg.textContent = ''; msg.className = 'cep-msg';
    if (d.length === 8 && d !== ultimo) { ultimo = d; busca(d); }
  });
  async function busca(d) {
    msg.textContent = 'Buscando endereço…';
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { msg.textContent = 'CEP não encontrado. Preencha o endereço manualmente.'; msg.className = 'cep-msg err'; return; }
      $('#rua').value = j.logradouro || $('#rua').value; $('#bairro').value = j.bairro || $('#bairro').value;
      $('#cidade').value = j.localidade || ''; $('#uf').value = j.uf || '';
      msg.textContent = ''; $('#numero').focus();
    } catch { msg.textContent = 'Não foi possível buscar o CEP. Preencha o endereço manualmente.'; msg.className = 'cep-msg err'; }
  }
}
function rPagamento() {
  const o = ctx; titulo.textContent = 'Pagamento';
  const parc = [1, 2, 3].map(n => `<option value="${n}">${n}x de ${brl(o.total / n)} sem juros</option>`).join('');
  corpo.innerHTML = `<div class="pag">
    <div class="resumo"><div><span>Pedido</span><strong>#${o.numero}</strong></div><div><span>Total a pagar</span><strong>${brl(o.total)}</strong></div></div>
    <div class="pag-abas" role="tablist" aria-label="Forma de pagamento">
      <button type="button" role="tab" class="on" data-pag="pix" aria-selected="true">Pix</button>
      <button type="button" role="tab" data-pag="cartao" aria-selected="false">Cartão de crédito</button>
    </div>
    <div id="pag-pix" class="pag-painel">
      <div class="pix-qr" id="pix-qr" aria-live="polite">Gerando o Pix…</div>
      <label class="l" for="pix-codigo">Pix copia e cola</label>
      <textarea id="pix-codigo" readonly rows="3"></textarea>
      <button class="btn-contorno" type="button" data-copiar>Copiar código</button>
      <p class="pag-nota">Abra o app do seu banco, escolha pagar com Pix e leia o QR code ou cole o código. Esta é uma loja de demonstração: use o botão abaixo para simular a confirmação do pagamento.</p>
      <p class="erro" id="pix-erro" role="alert" hidden></p>
      <button class="btn-vinho" type="button" data-simpix>Simular pagamento aprovado</button>
    </div>
    <form id="pag-cartao" class="pag-painel" novalidate hidden>
      <label class="l" for="c-num">Número do cartão</label>
      <input id="c-num" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="0000 0000 0000 0000">
      <label class="l" for="c-nome">Nome impresso no cartão</label>
      <input id="c-nome" autocomplete="cc-name" maxlength="40">
      <div class="duas"><div><label class="l" for="c-val">Validade</label><input id="c-val" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/AA"></div>
        <div><label class="l" for="c-cvv">CVV</label><input id="c-cvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" placeholder="000"></div></div>
      <label class="l" for="c-parc">Parcelas</label>
      <select id="c-parc">${parc}</select>
      <p class="erro" id="c-erro" role="alert" hidden></p>
      <p class="pag-nota">Pagamento de demonstração: use o cartão de teste 4111 1111 1111 1111 com qualquer validade futura e CVV. O número do cartão não é enviado nem guardado; só os 4 últimos dígitos entram no pedido.</p>
      <button class="btn-vinho" type="submit" id="pagar-cartao">Pagar ${brl(o.total)}</button>
    </form>
  </div>`;
  gerarPix();
}
async function gerarPix() {
  const o = ctx, box = $('#pix-qr'); if (!box) return;
  try {
    const r = await fetch('/api/pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numero: o.numero, email: o.email, acao: 'pix' }) });
    const d = await r.json(); if (!r.ok) throw 0;
    if (view !== 'pagamento' || !$('#pix-qr')) return;
    box.innerHTML = d.qrSvg; box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'QR code do Pix'); $('#pix-codigo').value = d.payload;
  } catch { if ($('#pix-qr')) box.textContent = 'Não foi possível gerar o Pix agora. Tente o cartão ou volte a abrir a sacola.'; }
}
async function pagar(metodo, extra = {}) {
  const o = ctx;
  const r = await fetch('/api/pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numero: o.numero, email: o.email, acao: 'pagar', metodo, ...extra }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro || 'Não foi possível concluir o pagamento. Tente novamente.');
  S.pendente = null; save(); view = 'ok'; ctx = d; render(); painel.scrollTop = 0;
  const r2 = painel.getBoundingClientRect(); confete(r2.left + r2.width / 2, 260);
}
const luhn = n => { let s = 0, d = false; for (let i = n.length - 1; i >= 0; i--) { let x = +n[i]; if (d && (x *= 2) > 9) x -= 9; s += x; d = !d; } return n.length >= 13 && s % 10 === 0; };
async function enviarCartao(e) {
  e.preventDefault();
  const num = $('#c-num').value.replace(/\D/g, ''), nome = $('#c-nome').value.trim(), val = $('#c-val').value, cvv = $('#c-cvv').value, erro = $('#c-erro');
  const m = /^(\d{2})\/(\d{2})$/.exec(val), agora = new Date();
  const validade = m && +m[1] >= 1 && +m[1] <= 12 && (2000 + +m[2] > agora.getFullYear() || (2000 + +m[2] === agora.getFullYear() && +m[1] >= agora.getMonth() + 1));
  const msg = !luhn(num) ? 'Confira o número do cartão.' : nome.length < 3 ? 'Informe o nome impresso no cartão.' : !validade ? 'Confira a validade (MM/AA).' : !/^\d{3,4}$/.test(cvv) ? 'Confira o CVV.' : '';
  if (msg) { erro.textContent = msg; erro.hidden = false; return; }
  erro.hidden = true; const btn = $('#pagar-cartao'), txt = btn.textContent; btn.disabled = true; btn.textContent = 'Processando…';
  try { await pagar('cartao', { parcelas: +$('#c-parc').value, final4: num.slice(-4) }); }
  catch (ex) { erro.textContent = ex.message; erro.hidden = false; btn.disabled = false; btn.textContent = txt; }
}
function rOk() {
  titulo.textContent = 'Pagamento aprovado';
  const o = ctx, pg = o.pagamento || {};
  const forma = pg.metodo === 'cartao' ? `Cartão final ${esc(pg.final4)}, ${pg.parcelas}x de ${brl(o.total / pg.parcelas)} sem juros` : 'Pix';
  corpo.innerHTML = `<div class="confirmacao"><p>Obrigada por escolher a KARO, ${esc(o.cliente)}.</p>
    <div class="resumo"><div><span>Pedido</span><strong>#${o.numero}</strong></div><div><span>Total</span><strong>${brl(o.total)}</strong></div><div><span>Pagamento</span><strong>${forma}</strong></div></div>
    <p style="margin:16px 0 4px"><b>Seus frascos numerados</b></p>
    <ul class="frasco-lista">${o.frascos.map(f => `<li><span>${esc(f.perfume)}</span><span>nº ${f.numero}</span></li>`).join('')}</ul>
    ${o.endereco ? `<p>Entrega em <b>${esc(o.endereco.rua)}, ${esc(o.endereco.numero)}${o.endereco.complemento ? ' – ' + esc(o.endereco.complemento) : ''}</b>${o.endereco.bairro ? ', ' + esc(o.endereco.bairro) : ''} · ${esc(o.endereco.cidade)}/${esc(o.endereco.uf)}</p>` : ''}
    ${o.gravacao ? `<p>${ic('sparkle')} Gravação: <b>${esc(o.gravacao)}</b></p>` : ''}
    <p>Esta compra foi uma simulação.</p>
    <button class="btn-vinho" type="button" data-continuar>Voltar à loja</button></div>`;
}

async function enviar(e) {
  e.preventDefault();
  const nome = $('#nome').value.trim(), email = $('#email').value.trim(), gravacao = '';
  const endereco = { cep: $('#cep').value.trim(), rua: $('#rua').value.trim(), numero: $('#numero').value.trim(), complemento: $('#comp').value.trim(),
    bairro: $('#bairro').value.trim(), cidade: $('#cidade').value.trim(), uf: $('#uf').value.trim().toUpperCase() };
  const v = { nome, email, gravacao, endereco };
  if (nome.length < 3 || !nome.includes(' ')) return rCheckout('Informe o nome completo.', v);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return rCheckout('Informe um e-mail válido.', v);
  if (endereco.cep.replace(/\D/g, '').length !== 8 || endereco.rua.length < 3 || !endereco.numero || endereco.cidade.length < 2 || !/^[A-Z]{2}$/.test(endereco.uf)) return rCheckout('Confira o endereço de entrega (CEP, rua, número, cidade e UF).', v);
  const btn = $('#confirmar'); btn.disabled = true; btn.textContent = 'Enviando…';
  const t = calc();
  try {
    const r = await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      nome, email, endereco, gravacao,
      itens: S.sacola.map(i => ({ id: i.id, quantidade: i.quantidade })) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return rCheckout(d.erro || 'Não foi possível gravar o pedido. Tente novamente.', v);
    S.sacola = []; S.perfil.gravacao = gravacao; if (!S.perfil.nome) S.perfil.nome = nome.split(' ')[0]; save(); atualizaContador(); aplicarPerfil();
    S.pendente = d; save(); view = 'pagamento'; ctx = d; render(); painel.scrollTop = 0;
  } catch { rCheckout('Falha de conexão. Seus itens foram mantidos; tente novamente.', v); }
}

/* ---------------- eventos globais ---------------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t) return; const d = t.dataset;
  if (d.add) {
    const pr = por(+d.add), vai = pr && !t.closest('#painel') ? voar(t, pr) : false;
    adicionar(+d.add, vai);
    if (t.matches('.btn-vinho') && !t.closest('.res')) { const o = t.textContent; t.textContent = 'Adicionado ✓'; setTimeout(() => { if (t.isConnected) t.textContent = o; }, 1100); }
  }
  else if (d.vsacola !== undefined) { view = 'sacola'; render(); painel.focus(); }
  else if (d.detalhe) { const pp = por(+d.detalhe); if (pp) { S.perfil.views = S.perfil.views || {}; S.perfil.views[pp.slug] = (S.perfil.views[pp.slug] || 0) + 1; save(); } abrir('detalhe', +d.detalhe); }
  else if (d.mais) adicionar(+d.mais);
  else if (d.menos) { const it = S.sacola.find(i => i.id === +d.menos); if (it && --it.quantidade <= 0) S.sacola = S.sacola.filter(i => i !== it); save(); atualizaContador(); aplicarPerfil(); render(); }
  else if (d.remover) { S.sacola = S.sacola.filter(i => i.id !== +d.remover); save(); atualizaContador(); aplicarPerfil(); render(); }
  else if (d.finalizar !== undefined) { view = 'checkout'; render(); }
  else if (d.voltar !== undefined) { view = 'sacola'; render(); painel.focus(); }
  else if (d.continuar !== undefined) fechar();
  else if (d.pag) {
    $$('.pag-abas button').forEach(b => { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('#pag-pix').hidden = d.pag !== 'pix'; $('#pag-cartao').hidden = d.pag !== 'cartao';
  }
  else if (d.copiar !== undefined) { const c = $('#pix-codigo'); if (c.value) { c.select(); (navigator.clipboard?.writeText(c.value) || Promise.reject()).catch(() => document.execCommand('copy')); t.textContent = 'Código copiado ✓'; setTimeout(() => { if (t.isConnected) t.textContent = 'Copiar código'; }, 1600); } }
  else if (d.simpix !== undefined) { t.disabled = true; t.textContent = 'Confirmando…'; pagar('pix').catch(ex => { t.disabled = false; t.textContent = 'Simular pagamento aprovado'; const e2 = $('#pix-erro'); e2.textContent = ex.message; e2.hidden = false; }); }
  else if (t.id === 'abrir-sacola') { if (S.pendente && !S.sacola.length) abrir('pagamento', S.pendente); else abrir('sacola'); }
  else if (t.id === 'fechar') fechar();
});
document.addEventListener('submit', e => { if (e.target.id === 'pag-cartao') enviarCartao(e); });
document.addEventListener('input', e => {
  if (e.target.id === 'c-num') { const d = e.target.value.replace(/\D/g, '').slice(0, 16); e.target.value = d.replace(/(.{4})/g, '$1 ').trim(); }
  if (e.target.id === 'c-val') { const d = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }
});
document.addEventListener('change', e => {
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
    jornada.dataset.idx = idx; caps.forEach((c, i) => c.classList.toggle('on', i === idx)); fotos.forEach((f, i) => f.classList.toggle('on', i === idx)); $('#kanji').textContent = KJ[idx]; $('#num-gigante').textContent = '0' + (idx + 1); $$('.idx-j button').forEach((b, k) => b.classList.toggle('on', k === idx));
  }
  jornada.style.setProperty('--p', p); $('#kanji').style.setProperty('--p', p); $('#prog-j').style.width = p * 100 + '%';
}
$$('.idx-j button').forEach(b => b.addEventListener('click', () => {
  const r = jornada.getBoundingClientRect(), total = r.height - innerHeight;
  scrollTo({ top: scrollY + r.top + total * (+b.dataset.ir / 3 + .05), behavior: reduz ? 'auto' : 'smooth' });
}));
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
    const s = Math.max(W / 1536, H / 1024) * .84, w = 1536 * s, h = 1024 * s;
    Object.assign(cena.style, { width: w + 'px', height: h + 'px', left: (W - w) * .84 + 'px', top: (H * .02) + 'px' });
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
  if (reduz) return;
  conteudo.style.opacity = 1 - clamp(prog * 1.35, 0, 1); $('#selo-hero').style.opacity = 1 - clamp(prog * 2.2, 0, 1);
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
layoutCena(); atualizaContador(); aoRolar();
fetch('/api/perfumes').then(r => r.json()).then(d => {
  P = d; S.sacola = S.sacola.filter(i => por(i.id)); save();
  renderCatalogo(); atualizaContador(); aplicarPerfil();
  $$('[data-parc]').forEach(e => { const p = por(+e.dataset.parc); if (p) e.textContent = 'ou 3x de ' + brl(p.preco / 3) + ' sem juros'; });
  $$('[data-ficha-j]').forEach(e => { const p = por(+e.dataset.fichaJ); if (!p) return; const n = p.piramide;
    e.innerHTML = `<p class="rot-j">Ficha técnica</p><ul class="pira-j"><li><small>Topo</small><b>${esc(n.topo)}</b></li><li><small>Coração</small><b>${esc(n.coracao)}</b></li><li><small>Fundo</small><b>${esc(n.fundo)}</b></li></ul><p class="base-j">${esc(p.concentracao || 'Eau de Parfum')} · ${p.volume} ml · Edição de 300 frascos numerados</p>`; });
  $$('[data-preco]').forEach(e => { const p = por(+e.dataset.preco); if (p) e.textContent = '· ' + brl(p.preco); });
}).catch(() => { if ($('#grade')) $('#grade').innerHTML = '<p class="carregando">Não foi possível carregar o catálogo. Recarregue a página.</p>'; });
})();
