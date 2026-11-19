// Fonte única de preços no servidor. O navegador nunca define o valor cobrado.
module.exports = [
  { id: 1, slug: 'sakura', nome: 'Sakura', volume: 50, preco: 149.9, familia: 'Floral delicado', imagem: '/img/sakura.jpg',
    descricao: 'Uma abertura leve de flor de cerejeira, seguida pelo frescor do chá branco e por um fundo macio de almíscar.',
    notas: 'Flor de cerejeira, chá branco e almíscar' },
  { id: 2, slug: 'yuzu', nome: 'Yuzu', volume: 30, preco: 99.5, familia: 'Cítrico luminoso', imagem: '/img/yuzu.jpg',
    descricao: 'Cítrico vibrante de yuzu com um toque de gengibre e um fundo suave de madeira clara.',
    notas: 'Yuzu, gengibre e madeira clara' },
  { id: 3, slug: 'hinoki', nome: 'Hinoki', volume: 50, preco: 189.9, familia: 'Amadeirado envolvente', imagem: '/img/hinoki.jpg',
    descricao: 'Madeira de cipreste japonês, envolvente e profunda, com musgo de carvalho e um traço de incenso.',
    notas: 'Cipreste hinoki, musgo de carvalho e incenso' }
];
