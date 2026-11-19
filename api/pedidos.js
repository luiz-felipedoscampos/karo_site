const catalogo = require('./_catalogo');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const nome = String(b.nome || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const itens = Array.isArray(b.itens) ? b.itens : [];

  if (nome.length < 3 || !nome.includes(' ')) return res.status(400).json({ erro: 'Informe o nome completo.' });
  if (!EMAIL.test(email) || email.length > 254) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  if (!itens.length || itens.length > 20) return res.status(400).json({ erro: 'A sacola está vazia.' });

  const linhas = [];
  let totalCentavos = 0;
  for (const it of itens) {
    const p = catalogo.find(x => x.id === Number(it.id));
    const q = Number(it.quantidade);
    if (!p || !Number.isInteger(q) || q < 1 || q > 99) return res.status(400).json({ erro: 'Item ou quantidade inválidos.' });
    const unit = Math.round(p.preco * 100); // preço lido no servidor
    totalCentavos += unit * q;
    linhas.push({ perfume: p.nome, quantidade: q, precoUnitario: unit / 100 });
  }

  const numero = Math.floor(Date.now() / 1000) % 100000;
  res.status(201).json({ numero, cliente: nome, email, itens: linhas, total: totalCentavos / 100 });
};
