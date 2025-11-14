// normalizeTeam.js — versão universal (Node + Browser)

// Detectar ambiente
const isNode = typeof process !== "undefined" &&
               process.versions != null &&
               process.versions.node != null;

/**
 * Carrega serieA2025.json no Node.js usando fs
 * e no navegador usando fetch().
 */
async function loadTeams() {
  if (isNode) {
    // --- NODE.JS ---
    const fs = await import("node:fs/promises");
    const path = "./dados/times/serieA2025.json";
    const raw = await fs.readFile(path, "utf8");
    return JSON.parse(raw);
  } else {
    // --- BROWSER ---
    const resp = await fetch("./dados/times/serieA2025.json");
    return await resp.json();
  }
}

/**
 * Normaliza nome → objeto do time (id, aliases, etc.)
 */
export async function normalizeTeam(name) {
  if (!name || typeof name !== "string") return null;

  const teams = await loadTeams();
  const lower = name.toLowerCase().trim();

  for (const team of teams) {
    const aliases = [
      team.officialName,
      team.shortName,
      team.slug,
      ...(team.aliases || [])
    ]
      .filter(Boolean)
      .map(a => a.toLowerCase());

    if (aliases.includes(lower)) {
      return team;
    }
  }

  return null;
}
