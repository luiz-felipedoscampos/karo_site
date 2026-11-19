const catalogo = require('./_catalogo');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(catalogo);
};
