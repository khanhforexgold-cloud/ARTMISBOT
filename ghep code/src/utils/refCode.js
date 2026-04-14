function generateRefCode(name = 'ART') {
  const prefix = String(name).replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'ART';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

module.exports = { generateRefCode };
