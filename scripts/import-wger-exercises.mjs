#!/usr/bin/env node
// Importa la biblioteca de ejercicios completa desde la API pública de
// wger.de (https://wger.de/api/v2/) y la sube (upsert) a la tabla
// public.exercises de Supabase.
//
// Por qué existe este script como archivo aparte en vez de correrlo yo:
// el sandbox donde trabaja el agente tiene un firewall que solo permite
// salida a un puñado de dominios permitidos, y wger.de no está en esa
// lista — así que la biblioteca inicial (63 ejercicios) se sembró a mano
// directo en la base de datos. Este script queda listo para correr desde
// cualquier máquina con internet normal (la tuya, o un runner de CI/Vercel)
// cuando quieras ampliar la biblioteca con el catálogo completo de wger
// (varios cientos de ejercicios, muchos con imagen).
//
// Uso:
//   SUPABASE_URL=https://agrhzkwpwklycqtmdmed.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxxx \
//   node scripts/import-wger-exercises.mjs
//
// WGER_API_KEY es opcional — la lectura pública de /api/v2/exercise/ y
// /api/v2/exerciseinfo/ no requiere autenticación, pero si tienes una key
// (como la que ya tienes) puedes pasarla en WGER_API_KEY y el script la usa
// para subir el límite de rate-limiting de wger.
//
// Licencia de los datos: el contenido de wger.de está bajo CC-BY-SA 4.0 —
// si usan las imágenes/descripciones en producción, hay que dar crédito a
// wger.de en algún lugar visible (por ejemplo, un pie de página en la
// biblioteca de ejercicios del panel).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WGER_API_KEY = process.env.WGER_API_KEY || null;
const WGER_BASE = "https://wger.de/api/v2";
const SPANISH_LANGUAGE_CODE = "es";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

function wgerHeaders() {
  const headers = { Accept: "application/json" };
  if (WGER_API_KEY) headers.Authorization = `Token ${WGER_API_KEY}`;
  return headers;
}

async function wgerFetch(path) {
  const res = await fetch(`${WGER_BASE}${path}`, { headers: wgerHeaders() });
  if (!res.ok) throw new Error(`wger ${path} -> HTTP ${res.status}`);
  return res.json();
}

async function findSpanishLanguageId() {
  const data = await wgerFetch("/language/?limit=50");
  const es = (data.results ?? []).find((l) => l.short_name === SPANISH_LANGUAGE_CODE);
  if (!es) throw new Error("No se encontró el idioma español en /api/v2/language/");
  return es.id;
}

async function fetchAllCategories() {
  const data = await wgerFetch("/exercisecategory/?limit=50");
  const byId = new Map();
  for (const c of data.results ?? []) byId.set(c.id, c.name);
  return byId;
}

async function fetchAllEquipment() {
  const data = await wgerFetch("/equipment/?limit=50");
  const byId = new Map();
  for (const e of data.results ?? []) byId.set(e.id, e.name);
  return byId;
}

// exerciseinfo trae la ficha completa (traducciones, imágenes, categoría,
// equipo) en un solo request por página, en vez de armar todo a mano desde
// /exercise/ + /exercisetranslation/ + /exerciseimage/ por separado.
async function fetchAllExerciseInfo() {
  const items = [];
  let url = `/exerciseinfo/?limit=100`;
  while (url) {
    const data = await wgerFetch(url);
    items.push(...(data.results ?? []));
    url = data.next ? data.next.replace(WGER_BASE, "") : null;
  }
  return items;
}

function pickSpanishTranslation(exerciseInfo, languageId) {
  const translations = exerciseInfo.translations ?? [];
  return translations.find((t) => t.language === languageId) ?? translations[0] ?? null;
}

async function upsertToSupabase(rows) {
  const url = `${SUPABASE_URL}/rest/v1/exercises`;
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${url}?on_conflict=name`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase upsert falló (chunk ${i}): HTTP ${res.status} - ${text}`);
    }
    console.log(`Subidos ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }
}

async function main() {
  console.log("Buscando id de idioma español en wger...");
  const languageId = await findSpanishLanguageId();

  console.log("Cargando categorías y equipo...");
  const categories = await fetchAllCategories();
  const equipment = await fetchAllEquipment();

  console.log("Descargando ficha completa de ejercicios (puede tardar unos minutos)...");
  const exerciseInfos = await fetchAllExerciseInfo();
  console.log(`${exerciseInfos.length} ejercicios encontrados en wger.`);

  const rows = [];
  for (const info of exerciseInfos) {
    const translation = pickSpanishTranslation(info, languageId);
    if (!translation || !translation.name) continue; // sin nombre usable, se salta

    const equipmentNames = (info.equipment ?? []).map((id) => equipment.get(id)).filter(Boolean);
    const mainImage = (info.images ?? []).find((img) => img.is_main) ?? (info.images ?? [])[0];

    rows.push({
      name: translation.name.trim(),
      muscle_group: (categories.get(info.category) ?? "general").toLowerCase(),
      equipment: equipmentNames.length ? equipmentNames.join(", ").toLowerCase() : "peso_corporal",
      category: "fuerza",
      description: translation.description ? translation.description.replace(/<[^>]+>/g, "").trim() || null : null,
      image_url: mainImage ? mainImage.image : null,
      source: "wger",
      active: true,
    });
  }

  console.log(`Subiendo ${rows.length} ejercicios a Supabase (exercises)...`);
  await upsertToSupabase(rows);
  console.log("Listo. Recuerda dar crédito a wger.de (CC-BY-SA 4.0) en la biblioteca de ejercicios.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
