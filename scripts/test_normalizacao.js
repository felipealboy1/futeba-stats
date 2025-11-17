// scripts/test_normalizacao.js
// Testa normalização de uma rodada específica e imprime resumo
const { normalizeRodada } = require('../normalizers/normalizarJogos.js');
const fs = require('fs').promises;
const path = require('path');

async function test(ano='2025', rodada=1) {
  const res = await normalizeRodada(ano, rodada);
  if (!res.success) {
    console.error('Normalização falhou:', res.error);
    process.exit(1);
  }
  const outFile = res.file;
  const content = JSON.parse(await fs.readFile(outFile, 'utf8'));
  console.log(`Registros normalizados: ${content.length}`);
  console.log('Exemplo:', content[0]);
  // checagem simples de esquema
  const required = ['id','rodada','data','mandante','visitante','status'];
  const missing = content.filter(j => required.some(k => j[k] === null || j[k] === undefined));
  console.log(`Registros com campos obrigatórios faltando: ${missing.length}`);
}

if (require.main === module) {
  const ano = process.argv[2] || '2025';
  const rodada = process.argv[3] || '1';
  test(ano, rodada);
}

module.exports = test;
