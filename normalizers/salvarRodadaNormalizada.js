import fs from "fs";
import { normalizarRodada } from "./normalizarRodada.js";

export function salvarRodadaNormalizada(inputPath, outputPath) {
  const bruto = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const normalizado = normalizarRodada(bruto);

  fs.writeFileSync(outputPath, JSON.stringify(normalizado, null, 2));
  console.log(`✅ Rodada normalizada salva em: ${outputPath}`);
}
