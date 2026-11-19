// Sesiones compartidas de DxLocalAI: un enlace ?s=<código> que varias personas del colegio pueden abrir y continuar.
// GET  /api/sesion?s=<código>                    → respuestas guardadas
// POST /api/sesion {accion:'crear', estado}      → crea la sesión y devuelve el código
// POST /api/sesion {accion:'guardar', codigo, estado} → guarda cambios (también vía sendBeacon)
const BASE = 'appxEkTzPxt0VGzMD';
const TABLA = 'tbl06Nz3hpTdcbiE5';
const SITIO = 'https://sensei-learning.vercel.app';
const ORIGENES = [SITIO, 'https://emmvace-github-io.vercel.app', 'https://emmvace.github.io'];
const CODIGO = /^[a-z0-9]{20}$/;

const origenValido = (o) => ORIGENES.includes(o) || /^https:\/\/emmvace-github-[a-z0-9-]+-sensei-learning\.vercel\.app$/.test(o || '');
const cors = (o) => origenValido(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : {};
const json = (data, status, h) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const at = (ruta, opciones = {}) => fetch(`https://api.airtable.com/v0/${BASE}/${TABLA}${ruta}`, {
  ...opciones, headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
});

function nuevoCodigo() {
  const letras = 'abcdefghijkmnpqrstuvwxyz23456789';
  const b = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(b, (x) => letras[x % letras.length]).join('');
}
function limpiarEstado(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  const s = JSON.stringify(e);
  return s.length > 50000 ? null : e;
}
const respondidas = (e) => Object.keys(e).filter((k) => /^s\d-\d+$/.test(k) && Number.isFinite(Number(e[k]))).length;

export async function buscarSesion(codigo) {
  if (!CODIGO.test(codigo || '')) return null;
  const f = encodeURIComponent(`{Código}='${codigo}'`);
  const r = await at(`?maxRecords=1&filterByFormula=${f}`);
  if (!r.ok) throw new Error(`Airtable ${r.status} ${await r.text()}`);
  return (await r.json()).records?.[0] || null;
}
export async function marcarEnviada(codigo, diagnosticoId) {
  const s = await buscarSesion(codigo);
  if (!s) return;
  const fields = { 'Estado': 'Enviada', 'Actualizada': new Date().toISOString() };
  if (diagnosticoId) fields['Diagnóstico'] = [...(s.fields['Diagnóstico'] || []), diagnosticoId];
  await at(`/${s.id}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
}

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: cors(request.headers.get('origin')) });
}

export async function GET(request) {
  const h = cors(request.headers.get('origin'));
  const codigo = new URL(request.url).searchParams.get('s');
  if (!CODIGO.test(codigo || '')) return json({ ok: false, error: 'Enlace no válido.' }, 400, h);
  try {
    const s = await buscarSesion(codigo);
    if (!s) return json({ ok: false, error: 'Este enlace no existe o ya no está disponible.' }, 404, h);
    let estado = {};
    try { estado = JSON.parse(s.fields['Respuestas (JSON)'] || '{}'); } catch {}
    return json({ ok: true, estado, actualizada: s.fields['Actualizada'] || null, enviada: s.fields['Estado'] === 'Enviada' }, 200, h);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: 'No se pudo abrir el enlace. Intenta de nuevo.' }, 502, h);
  }
}

export async function POST(request) {
  const origen = request.headers.get('origin');
  const h = cors(origen);
  if (!process.env.AIRTABLE_TOKEN) return json({ ok: false, error: 'Servicio no configurado.' }, 500, h);
  const crudo = await request.text();
  if (crudo.length > 60000) return json({ ok: false, error: 'Demasiados datos.' }, 413, h);
  let d; try { d = JSON.parse(crudo); } catch { return json({ ok: false, error: 'Datos inválidos.' }, 400, h); }
  const estado = limpiarEstado(d.estado);
  if (!estado) return json({ ok: false, error: 'Datos inválidos.' }, 400, h);
  const ahora = new Date().toISOString();
  const comunes = {
    'Respuestas (JSON)': JSON.stringify(estado),
    'Colegio': String(estado['d-nombre'] || '').trim().slice(0, 200),
    'Preguntas respondidas': respondidas(estado),
    'Actualizada': ahora,
  };
  try {
    if (d.accion === 'crear') {
      const codigo = nuevoCodigo();
      const base = origenValido(origen) ? origen : SITIO;
      const r = await at('', { method: 'POST', body: JSON.stringify({ records: [{ fields: {
        ...comunes, 'Código': codigo, 'Estado': 'En curso', 'Creada': ahora, 'Enlace': `${base}/DxLocalAI?s=${codigo}`,
      } }] }) });
      if (!r.ok) throw new Error(`Airtable ${r.status} ${await r.text()}`);
      return json({ ok: true, codigo, actualizada: ahora }, 200, h);
    }
    if (d.accion === 'guardar') {
      const s = await buscarSesion(d.codigo);
      if (!s) return json({ ok: false, error: 'Este enlace no existe o ya no está disponible.' }, 404, h);
      const r = await at(`/${s.id}`, { method: 'PATCH', body: JSON.stringify({ fields: comunes }) });
      if (!r.ok) throw new Error(`Airtable ${r.status} ${await r.text()}`);
      return json({ ok: true, actualizada: ahora }, 200, h);
    }
    return json({ ok: false, error: 'Acción no válida.' }, 400, h);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: 'No se pudo guardar. Intenta de nuevo.' }, 502, h);
  }
}
