// Fonte única de preços no servidor. O navegador nunca define o valor cobrado.
module.exports = [
  { id: 1, slug: 'sakura', nome: 'Sakura', volume: 50, concentracao: 'Eau de Parfum', preco: 149.9, familia: 'Floral delicado', imagem: '/img/sakura.jpg', kanji: '桜',
    tagline: 'Delicadeza que se faz notar.',
    descricao: 'Uma abertura leve de flor de cerejeira, seguida pelo frescor do chá branco e por um fundo macio de almíscar.',
    notas: 'Flor de cerejeira, chá branco e almíscar',
    piramide: { topo: 'Flor de cerejeira', coracao: 'Chá branco', fundo: 'Almíscar' } },
  { id: 2, slug: 'yuzu', nome: 'Yuzu', volume: 30, concentracao: 'Eau de Parfum', preco: 99.5, familia: 'Cítrico luminoso', imagem: '/img/yuzu.jpg', kanji: '柚',
    tagline: 'Luz em forma de perfume.',
    descricao: 'Cítrico vibrante de yuzu com um toque de gengibre e um fundo suave de madeira clara.',
    notas: 'Yuzu, gengibre e madeira clara',
    piramide: { topo: 'Yuzu', coracao: 'Gengibre', fundo: 'Madeira clara' } },
  { id: 3, slug: 'hinoki', nome: 'Hinoki', volume: 50, concentracao: 'Eau de Parfum', preco: 189.9, familia: 'Amadeirado envolvente', imagem: '/img/hinoki.jpg', kanji: '檜',
    tagline: 'Presença que fica.',
    descricao: 'Madeira de cipreste japonês, envolvente e profunda, com musgo de carvalho e um traço de incenso.',
    notas: 'Cipreste hinoki, musgo de carvalho e incenso',
    piramide: { topo: 'Cipreste hinoki', coracao: 'Musgo de carvalho', fundo: 'Incenso' } }
];
