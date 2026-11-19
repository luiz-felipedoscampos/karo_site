(() => {
  const $ = s => document.querySelector(s);
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const KEY = 'karo-sacola';
  let perfumes = [];
  let sacola = [];           // [{id, quantidade}]
  let view = null, ultimoFoco = null, pedidoAtual = null;

  try { sacola = JSON.parse(localStorage.getItem(KEY)) || []; } catch { sacola = []; }
  const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(sacola)); } catch {} };
  const por = id => perfumes.find(p => p.id === id);
  const unidades = () => sacola.reduce((s, i) => s + i.quantidade, 0);
  const total = () => sacola.reduce((s, i) => s + (por(i.id)?.preco || 0) * i.quantidade, 0);
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function atualizaContador(anima) {
    const c = $('#contador'), n = unidades();
    c.textContent = n;
    c.setAttribute('aria-label', `${n} ${n === 1 ? 'unidade' : 'unidades'} na sacola`);
    if (anima) { c.classList.remove('pulo'); void c.offsetWidth; c.classList.add('pulo'); }
  }

  function adicionar(id) {
    const it = sacola.find(i => i.id === id);
    if (it) it.quantidade = Math.min(99, it.quantidade + 1); else sacola.push({ id, quantidade: 1 });
    salvar(); atualizaContador(true);
    if (view === 'sacola') render();
  }

  /* ---------- catálogo ---------- */
  function renderCatalogo() {
    $('#grade').innerHTML = perfumes.map(p => `
      <article class="cartao">
        <button class="cartao-foto" type="button" data-detalhe="${p.id}" aria-label="Ver detalhes de ${esc(p.nome)}">
          <img src="${p.imagem}" alt="Frasco do perfume ${esc(p.nome)}" loading="lazy">
        </button>
        <div class="cartao-linha"><h3>${esc(p.nome)}</h3><span class="preco">${brl(p.preco)}</span></div>
        <p class="meta">${esc(p.familia)} · ${p.volume} ml</p>
        <button class="btn-vinho" type="button" data-add="${p.id}">Adicionar à sacola</button>
      </article>`).join('');
  }

  /* ---------- painel lateral ---------- */
  const painel = $('#painel'), veu = $('#veu'), corpo = $('#painel-corpo'), titulo = $('#painel-titulo');

  function abrir(v, extra) {
    if (!view) ultimoFoco = document.activeElement;
    view = v; if (extra !== undefined) pedidoAtual = extra;
    painel.hidden = false; veu.hidden = false;
    document.body.style.overflow = 'hidden';
    render();
    requestAnimationFrame(() => { painel.classList.add('on'); veu.classList.add('on'); });
    painel.focus();
  }
  function fechar() {
    if (!view) return;
    painel.classList.remove('on'); veu.classList.remove('on');
    const v = view; view = null;
    setTimeout(() => { if (!view) { painel.hidden = true; veu.hidden = true; } }, 280);
    document.body.style.overflow = '';
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function render() {
    if (view === 'detalhe') return renderDetalhe();
    if (view === 'sacola') return renderSacola();
    if (view === 'checkout') return renderCheckout();
    if (view === 'ok') return renderOk();
  }

  function renderDetalhe() {
    const p = por(pedidoAtual); if (!p) return fechar();
    titulo.textContent = p.nome;
    corpo.innerHTML = `<div class="detalhe">
      <div class="detalhe-foto"><img src="${p.imagem}" alt="Frasco do perfume ${esc(p.nome)}"></div>
      <p class="detalhe-meta">${esc(p.familia)} · ${p.volume} ml</p>
      <p>${esc(p.descricao)}</p>
      <h3>Notas</h3>
      <p class="notas">${esc(p.notas)}</p>
      <strong class="preco">${brl(p.preco)}</strong>
      <button class="btn-vinho" type="button" data-add="${p.id}">Adicionar à sacola</button>
    </div>`;
  }

  function renderSacola() {
    titulo.textContent = 'Sua sacola';
    if (!sacola.length) {
      corpo.innerHTML = `<p>Sua sacola está vazia.</p><button class="btn-vinho" type="button" data-continuar>Continuar comprando</button>`;
      return;
    }
    corpo.innerHTML = sacola.map(i => {
      const p = por(i.id); if (!p) return '';
      return `<div class="linha">
        <img src="${p.imagem}" alt="">
        <div>
          <h3>${esc(p.nome)}</h3>
          <small>${p.volume} ml · ${brl(p.preco)} por unidade</small>
          <div class="qtd">
            <button type="button" data-menos="${p.id}" aria-label="Diminuir quantidade de ${esc(p.nome)}">−</button>
            <span aria-live="polite">${i.quantidade}</span>
            <button type="button" data-mais="${p.id}" aria-label="Aumentar quantidade de ${esc(p.nome)}">+</button>
          </div>
          <button class="remover" type="button" data-remover="${p.id}">Remover</button>
        </div>
        <span class="subtotal">${brl(p.preco * i.quantidade)}</span>
      </div>`;
    }).join('') + `
      <div class="total"><span>Total</span><strong>${brl(total())}</strong></div>
      <button class="btn-vinho" type="button" data-finalizar>Finalizar pedido</button>
      <button class="btn-contorno" type="button" data-continuar>Continuar comprando</button>`;
  }

  function resumoHtml() {
    return `<div class="resumo">${sacola.map(i => { const p = por(i.id); return `<div><span>${i.quantidade} × ${esc(p.nome)}</span><span>${brl(p.preco * i.quantidade)}</span></div>`; }).join('')}</div>`;
  }

  function renderCheckout(erro = '', vals = {}) {
    titulo.textContent = 'Finalizar pedido';
    corpo.innerHTML = `<p>Pedido demonstrativo. Use nome e e-mail fictícios. Nenhum pagamento será cobrado.</p>
      ${resumoHtml()}
      <div class="total"><span>Total do pedido</span><strong>${brl(total())}</strong></div>
      <form id="form" novalidate>
        <label for="nome">Nome completo</label>
        <input id="nome" name="nome" autocomplete="name" required value="${esc(vals.nome || '')}" ${erro.includes('nome') ? 'aria-invalid="true"' : ''}>
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" autocomplete="email" required value="${esc(vals.email || '')}" ${erro.toLowerCase().includes('e-mail') ? 'aria-invalid="true"' : ''}>
        ${erro ? `<p class="erro" role="alert">${esc(erro)}</p>` : ''}
        <div class="form-botoes">
          <button class="btn-vinho" type="submit" id="confirmar">Confirmar pedido</button>
          <button class="btn-contorno" type="button" data-voltar>Voltar à sacola</button>
        </div>
      </form>`;
    const alvo = erro ? (erro.toLowerCase().includes('e-mail') ? '#email' : '#nome') : '#nome';
    $(alvo)?.focus();
  }

  function renderOk() {
    titulo.textContent = 'Pedido confirmado';
    const o = pedidoAtual;
    corpo.innerHTML = `<div class="confirmacao"><p>Obrigada por escolher a KARO, ${esc(o.cliente)}.</p>
      <div class="resumo"><div><span>Pedido</span><strong>#${o.numero}</strong></div><div><span>Total</span><strong>${brl(o.total)}</strong></div></div>
      <p style="margin-top:14px">Esta compra foi uma simulação.</p>
      <button class="btn-vinho" type="button" data-continuar>Voltar à loja</button></div>`;
  }

  async function enviar(e) {
    e.preventDefault();
    const nome = $('#nome').value.trim(), email = $('#email').value.trim();
    const vals = { nome, email };
    if (nome.length < 3 || !nome.includes(' ')) return renderCheckout('Informe o nome completo.', vals);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return renderCheckout('Informe um e-mail válido.', vals);
    const btn = $('#confirmar'); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await fetch('/api/pedidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, itens: sacola.map(i => ({ id: i.id, quantidade: i.quantidade })) })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return renderCheckout(d.erro || 'Não foi possível gravar o pedido. Tente novamente.', vals);
      sacola = []; salvar(); atualizaContador();   // só esvazia após gravar com sucesso
      view = 'ok'; pedidoAtual = d; render();
    } catch {
      renderCheckout('Falha de conexão. Seus itens foram mantidos; tente novamente.', vals);
    }
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a'); if (!t) return;
    const d = t.dataset;
    if (d.add) { adicionar(+d.add); if (!view) { t.textContent = 'Adicionado ✓'; setTimeout(() => t.textContent = 'Adicionar à sacola', 1100); } else if (view === 'detalhe') { t.textContent = 'Adicionado ✓'; setTimeout(() => { if (t.isConnected) t.textContent = 'Adicionar à sacola'; }, 1100); } }
    else if (d.detalhe) abrir('detalhe', +d.detalhe);
    else if (d.mais) { adicionar(+d.mais); }
    else if (d.menos) { const it = sacola.find(i => i.id === +d.menos); if (it && --it.quantidade <= 0) sacola = sacola.filter(i => i !== it); salvar(); atualizaContador(); render(); }
    else if (d.remover) { sacola = sacola.filter(i => i.id !== +d.remover); salvar(); atualizaContador(); render(); }
    else if (d.finalizar !== undefined) { view = 'checkout'; render(); }
    else if (d.voltar !== undefined) { view = 'sacola'; render(); painel.focus(); }
    else if (d.continuar !== undefined) { fechar(); }
    else if (t.id === 'abrir-sacola') abrir('sacola');
    else if (t.id === 'fechar') fechar();
  });
  document.addEventListener('submit', e => { if (e.target.id === 'form') enviar(e); });
  veu.addEventListener('click', fechar);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fechar();
    if (e.key === 'Tab' && view) {   // mantém o foco dentro do painel
      const f = [...painel.querySelectorAll('button,input,a[href]')].filter(x => !x.disabled);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === painel)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ---------- início ---------- */
  atualizaContador();
  fetch('/api/perfumes').then(r => r.json()).then(d => {
    perfumes = d;
    sacola = sacola.filter(i => por(i.id));   // descarta itens que já não existem no catálogo
    salvar(); renderCatalogo(); atualizaContador();
  }).catch(() => { $('#grade').innerHTML = '<p class="carregando">Não foi possível carregar o catálogo. Recarregue a página.</p>'; });
})();
