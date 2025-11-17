// scripts/normalizarTimes.js
export function normalizarTimes(brutoTimes) {
  // input: lista de objetos com id, nome, url_escudo (ou similar)
  const times = (Array.isArray(brutoTimes) ? brutoTimes : brutoTimes?.times || [])
    .map(t => ({
      id: Number(t.id),
      nome: t.nome || t.clube || t.name,
      escudo: t.url_escudo || t.escudo || null,
      slug: (t.nome || t.clube || "").toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    }));
  return { times };
}
