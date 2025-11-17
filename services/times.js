// services/times.js
// Carrega dados/times.json e expõe helpers para buscar times.
// Usa ESM; espera arquivo dados/times.json existir.
import path from "path";
import { readJson } from "./utils.js";

const TIMES_PATH = path.join("dados", "times.json");

let _cache = null;

async function loadTimes(force = false) {
  if (_cache && !force) return _cache;
  const obj = (await readJson(TIMES_PATH)) || {};
  // normalize to maps
  const byId = new Map();
  const bySlug = new Map();
  const byName = new Map();
  for (const id of Object.keys(obj)) {
    const t = obj[id];
    byId.set(Number(t.id), t);
    if (t.slug) bySlug.set(t.slug, t);
    if (t.nome) byName.set(String(t.nome).toLowerCase(), t);
  }
  _cache = { raw: obj, byId, bySlug, byName };
  return _cache;
}

async function getAllTimes() {
  const idx = await loadTimes();
  return Array.from(idx.byId.values());
}

async function getTimeById(id) {
  if (id === null || id === undefined) return null;
  const idx = await loadTimes();
  return idx.byId.get(Number(id)) ?? null;
}

async function getTimeBySlug(slug) {
  if (!slug) return null;
  const idx = await loadTimes();
  return idx.bySlug.get(slug) ?? null;
}

async function searchTimes(term) {
  if (!term) return [];
  const idx = await loadTimes();
  const t = String(term).toLowerCase();
  const out = [];
  for (const team of idx.byId.values()) {
    if (team.nome.toLowerCase().includes(t) || team.nome_completo.toLowerCase().includes(t) || (team.slug && team.slug.includes(t))) out.push(team);
  }
  return out;
}

export { loadTimes, getAllTimes, getTimeById, getTimeBySlug, searchTimes };
