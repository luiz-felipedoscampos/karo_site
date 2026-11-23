// Pagamento (demonstração). Pix: gera o BR Code (copia e cola + QR). Cartão: aprovação simulada.
// Nenhum dado de cartão chega ao servidor: só os 4 últimos dígitos e as parcelas.
const QRCode = require('qrcode');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PIX_CHAVE = process.env.PIX_CHAVE || 'pagamentos@karo.demo';

const temBanco = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const blob = () => require('@vercel/blob');
const memoria = () => (global.__pedidos = global.__pedidos || new Map());

async function ler(numero) {
  if (!temBanco()) return memoria().get(numero) || null;
  try {
    const r = await blob().get(`pedidos/${numero}.json`, { access: 'private', useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch { return null; }
}
async function salvar(numero, pedido) {
  if (!temBanco()) { memoria().set(numero, pedido); return; }
  await blob().put(`pedidos/${numero}.json`, JSON.stringify(pedido), {
    access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
}

// BR Code (EMV) do Pix, com CRC16-CCITT
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
function brcode({ chave, nome, cidade, valor, txid }) {
  const p = tlv('00', '01') + tlv('01', '11') +
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', chave)) +
    tlv('52', '0000') + tlv('53', '986') + tlv('54', valor.toFixed(2)) + tlv('58', 'BR') +
    tlv('59', nome.slice(0, 25)) + tlv('60', cidade.slice(0, 15)) + tlv('62', tlv('05', txid.slice(0, 25))) + '6304';
  return p + crc16(p);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const numero = String(b.numero || '').replace(/\D/g, '');
  const email = String(b.email || '').trim().toLowerCase();
  if (!numero || !EMAIL.test(email)) return res.status(400).json({ erro: 'Pedido inválido.' });
  const p = await ler(numero);
  if (!p || p.email !== email) return res.status(404).json({ erro: 'Pedido não encontrado.' });

  if (b.acao === 'pix') {
    if (p.status === 'pago') return res.status(409).json({ erro: 'Este pedido já foi pago.' });
    const payload = brcode({ chave: PIX_CHAVE, nome: 'KARO PERFUMES', cidade: 'BELO HORIZONTE', valor: Number(p.total), txid: 'KARO' + numero });
    const qrSvg = await QRCode.toString(payload, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2a1209', light: '#ffffff' } });
    return res.status(200).json({ payload, qrSvg, total: p.total });
  }

  if (b.acao === 'pagar') {
    const metodo = b.metodo === 'cartao' ? 'cartao' : b.metodo === 'pix' ? 'pix' : null;
    if (!metodo) return res.status(400).json({ erro: 'Escolha a forma de pagamento.' });
    if (p.status === 'pago') return res.status(200).json(p);
    const pag = { metodo, em: new Date().toISOString() };
    if (metodo === 'cartao') {
      const parcelas = Number(b.parcelas), final4 = String(b.final4 || '');
      if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 3 || !/^\d{4}$/.test(final4)) return res.status(400).json({ erro: 'Confira os dados do cartão.' });
      pag.parcelas = parcelas; pag.final4 = final4;
    }
    p.status = 'pago'; p.pagamento = pag;
    try { await salvar(numero, p); } catch { return res.status(503).json({ erro: 'Não foi possível registrar o pagamento agora. Tente novamente.' }); }
    return res.status(200).json(p);
  }
  return res.status(400).json({ erro: 'Ação inválida.' });
};
