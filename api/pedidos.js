const catalogo = require('./_catalogo');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CUPONS = { KARO10: 10 };      // % de desconto
const FRETE = 1990, FRETE_GRATIS = 25000; // centavos
const TEXTO = /[\u0000-\u001f\u007f]/g;

// Banco de dados: Vercel Blob (gratuito). Cada pedido vira um arquivo JSON privado em pedidos/<numero>.json.
// Sem BLOB_READ_WRITE_TOKEN (ambiente local) o pedido é calculado normalmente, só não é gravado.
const temBanco = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const blob = () => require('@vercel/blob');

async function gravar(pedido) {
  const { put } = blob();
  for (let i = 0; i < 5; i++) {
    const numero = String(10000 + Math.floor(Math.random() * 90000));
    try {
      await put(`pedidos/${numero}.json`, JSON.stringify({ ...pedido, numero: Number(numero) }), {
        access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
      return Number(numero);
    } catch (e) {
      if (!/exist|already/i.test(String(e && e.message))) throw e;
    }
  }
  throw new Error('sem número livre');
}

async function consultar(req, res) {
  const numero = String((req.query && req.query.numero) || '').replace(/\D/g, '');
  const email = String((req.query && req.query.email) || '').trim().toLowerCase();
  if (!numero || !EMAIL.test(email)) return res.status(400).json({ erro: 'Informe o número do pedido e o e-mail.' });
  if (!temBanco()) return res.status(503).json({ erro: 'Banco de dados indisponível.' });
  try {
    const r = await blob().get(`pedidos/${numero}.json`, { access: 'private', useCache: false });
    if (!r || !r.stream) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    const txt = await new Response(r.stream).text();
    const p = JSON.parse(txt);
    if (p.email !== email) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    return res.status(200).json(p);
  } catch { return res.status(404).json({ erro: 'Pedido não encontrado.' }); }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return consultar(req, res);
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const nome = String(b.nome || '').replace(TEXTO, '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const itens = Array.isArray(b.itens) ? b.itens : [];
  const cupom = String(b.cupom || '').trim().toUpperCase();
  const gravacao = String(b.gravacao || '').replace(TEXTO, '').trim();
  const presente = b.presente === true;
  const mensagem = presente ? String(b.mensagem || '').replace(TEXTO, ' ').trim() : '';
  const amostraSlug = String(b.amostra || '').trim();
  const e = b.endereco && typeof b.endereco === 'object' ? b.endereco : {};
  const lim = (v, n) => String(v || '').replace(TEXTO, ' ').trim().slice(0, n);
  const endereco = {
    cep: String(e.cep || '').replace(/\D/g, ''), rua: lim(e.rua, 120), numero: lim(e.numero, 10),
    complemento: lim(e.complemento, 60), bairro: lim(e.bairro, 80), cidade: lim(e.cidade, 80), uf: lim(e.uf, 2).toUpperCase()
  };

  if (nome.length < 3 || !nome.includes(' ') || nome.length > 80) return res.status(400).json({ erro: 'Informe o nome completo.' });
  if (!EMAIL.test(email) || email.length > 254) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  if (!itens.length || itens.length > 20) return res.status(400).json({ erro: 'A sacola está vazia.' });
  if (cupom && !(cupom in CUPONS)) return res.status(400).json({ erro: 'Cupom inválido.' });
  if (gravacao.length > 14 || !/^[\p{L}\p{N} .'-]*$/u.test(gravacao)) return res.status(400).json({ erro: 'A gravação aceita até 14 letras ou números.' });
  if (endereco.cep.length !== 8 || endereco.rua.length < 3 || !endereco.numero || endereco.cidade.length < 2 || !/^[A-Z]{2}$/.test(endereco.uf))
    return res.status(400).json({ erro: 'Confira o endereço de entrega (CEP, rua, número, cidade e UF).' });
  if (mensagem.length > 120) return res.status(400).json({ erro: 'A mensagem do cartão aceita até 120 caracteres.' });
  const amostra = amostraSlug ? catalogo.find(p => p.slug === amostraSlug) : null;
  if (amostraSlug && !amostra) return res.status(400).json({ erro: 'Amostra inválida.' });

  const linhas = [];
  const vistos = new Set();
  let subCent = 0;
  for (const it of itens) {
    const p = catalogo.find(x => x.id === Number(it.id));
    const q = Number(it.quantidade);
    if (!p || vistos.has(p.id) || !Number.isInteger(q) || q < 1 || q > 99) return res.status(400).json({ erro: 'Item ou quantidade inválidos.' });
    vistos.add(p.id);
    const unit = Math.round(p.preco * 100); // preço lido no servidor
    subCent += unit * q;
    linhas.push({ perfume: p.nome, quantidade: q, precoUnitario: unit / 100 });
  }

  const descCent = cupom ? Math.round(subCent * CUPONS[cupom] / 100) : 0;
  const freteCent = subCent >= FRETE_GRATIS ? 0 : FRETE;
  const totalCent = subCent - descCent + freteCent;

  // cada unidade recebe um número de frasco da edição (0001–0300)
  const usados = new Set();
  const frascos = [];
  for (const l of linhas) for (let i = 0; i < l.quantidade; i++) {
    let n; do { n = 1 + Math.floor(Math.random() * 300); } while (usados.has(l.perfume + n));
    usados.add(l.perfume + n);
    frascos.push({ perfume: l.perfume, numero: String(n).padStart(4, '0') + '/300' });
  }

  const pedido = {
    cliente: nome, email, itens: linhas, endereco,
    subtotal: subCent / 100, desconto: descCent / 100, frete: freteCent / 100, total: totalCent / 100,
    cupom: cupom || null, gravacao, presente, mensagem, amostra: amostra ? amostra.nome : null, frascos,
    status: 'aguardando_pagamento', criadoEm: new Date().toISOString()
  };

  let numero = Math.floor(Date.now() / 1000) % 100000, salvo = false;
  if (temBanco()) {
    try { numero = await gravar(pedido); salvo = true; }
    catch { return res.status(503).json({ erro: 'Não foi possível gravar o pedido agora. Tente novamente em instantes.' }); }
  }
  if (!salvo) { global.__pedidos = global.__pedidos || new Map(); global.__pedidos.set(String(numero), { ...pedido, numero }); }
  res.status(201).json({ numero, ...pedido, salvo });
};
