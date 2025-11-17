// services/utils.js
// Pequenas utilidades e cache para leitura de JSON em disco.
import fs from "fs/promises";
import path from "path";

const CACHE = new Map();
const CACHE_TTL_MS = 1000 * 60; // 1 minuto - você pode ajustar

function cacheKey(filePath) {
  return path.resolve(filePath);
}

async function readJson(filePath, { useCache = true } = {}) {
  const key = cacheKey(filePath);
  if (useCache && CACHE.has(key)) {
    const { ts, value } = CACHE.get(key);
    if (Date.now() - ts < CACHE_TTL_MS) return value;
  }
  try {
    const txt = await fs.readFile(filePath, "utf8");
    const obj = JSON.parse(txt);
    if (useCache) CACHE.set(key, { ts: Date.now(), value: obj });
    return obj;
  } catch (err) {
    // retorna nulo se não existir
    return null;
  }
}

function listFiles(dir) {
  return fs.readdir(dir).catch(() => []);
}

export { readJson, listFiles, CACHE };
