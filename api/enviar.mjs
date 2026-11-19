// Recibe un diagnóstico de DxLocalAI y lo guarda en Airtable.
// Variables de entorno en Vercel: AIRTABLE_TOKEN (obligatoria).
import { marcarEnviada } from './sesion.mjs';
const BASE = 'appxEkTzPxt0VGzMD';
const TABLA = 'tblo5a4hb3rzQl1Wg';
const CAMPO_PDF = 'fldoXtLvXVMqgwXpi'; // Reporte PDF
const ORIGENES = [
  'https://sensei-learning.vercel.app',
  'https://emmvace-github-io.vercel.app',
  'https://emmvace.github.io',
];
const ETAPAS = ['Exploración', 'Preparación', 'Piloto', 'Escalamiento'];
const CUADRANTES = ['Explorar', 'Listos en el aula, sin soporte', 'Equipados, sin propósito', 'Pilotear y escalar'];
const SECCIONES = ['01 Visión y gobernanza', '02 Datos, costo y conectividad', '03 Infraestructura técnica',
  '04 Operación en el aula', '05 Práctica pedagógica', '06 Formación y cultura'];

function cors(origin) {
  const ok = ORIGENES.includes(origin) || /^https:\/\/emmvace-github-[a-z0-9-]+-sensei-learning\.vercel\.app$/.test(origin || '');
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : {};
}
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const texto = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const entero = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
};
const fraccion = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null; };
const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f);

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: cors(request.headers.get('origin')) });
}

export async function POST(request) {
  const h = cors(request.headers.get('origin'));
  if (!process.env.AIRTABLE_TOKEN) return json({ ok: false, error: 'Servicio no configurado.' }, 500, h);

  const crudo = await request.text();
  if (crudo.length > 4400000) return json({ ok: false, error: 'Envío demasiado grande.' }, 413, h);
  let d;
  try { d = JSON.parse(crudo); } catch { return json({ ok: false, error: 'Datos inválidos.' }, 400, h); }

  if (texto(d.trampa)) return json({ ok: true }, 200, h); // campo oculto anti-spam
  if (d.consentimiento !== true) return json({ ok: false, error: 'Falta el consentimiento.' }, 400, h);
  const correo = texto(d.correo, 200);
  if (!correoValido(correo)) return json({ ok: false, error: 'Escribe un correo válido.' }, 400, h);
  const colegio = texto(d.colegio, 200);
  if (!colegio) return json({ ok: false, error: 'Escribe el nombre del colegio.' }, 400, h);
  const respondidas = entero(d.respondidas, 0, 36);
  if (!respondidas) return json({ ok: false, error: 'Responde al menos una pregunta.' }, 400, h);

  const campos = {
    'Colegio': colegio,
    'Correo de contacto': correo,
    'Personas que responden': texto(d.personas, 1000),
    'Niveles': texto(d.niveles, 200),
    'Puntaje total': entero(d.total, 0, 108),
    'Preguntas respondidas': respondidas,
    'Preparación técnica': fraccion(d.tecnica),
    'Preparación pedagógica': fraccion(d.pedagogica),
    'Primera prioridad': texto(d.prioridad, 200),
    'Resumen': texto(d.resumen, 20000),
    'Respuestas (JSON)': JSON.stringify(d.respuestas ?? {}).slice(0, 30000),
  };
  const alumnos = entero(d.alumnos, 0, 1e6), docentes = entero(d.docentes, 0, 1e5);
  if (alumnos !== null && texto(String(d.alumnos ?? ''))) campos['Alumnos'] = alumnos;
  if (docentes !== null && texto(String(d.docentes ?? ''))) campos['Docentes'] = docentes;
  if (fechaValida(texto(d.fecha, 10))) campos['Fecha del diagnóstico'] = texto(d.fecha, 10);
  if (ETAPAS.includes(d.etapa)) campos['Etapa'] = d.etapa;
  if (CUADRANTES.includes(d.cuadrante)) campos['Cuadrante'] = d.cuadrante;
  if (Array.isArray(d.secciones)) SECCIONES.forEach((s, i) => {
    const v = entero(d.secciones[i], 0, 21);
    if (v !== null) campos[s] = v;
  });
  for (const k of Object.keys(campos)) if (campos[k] === null || campos[k] === '') delete campos[k];

  // Un envío por diagnóstico: si la clave ya existe, se actualiza ese registro
  const clave = /^[sn]-[a-z0-9]{20}$/.test(d.clave || '') ? d.clave : '';
  const ahora = new Date().toISOString();
  let previo = null;
  if (clave) {
    try {
      const f = encodeURIComponent(`{Clave de envío}='${clave}'`);
      const b = await at(`?maxRecords=1&filterByFormula=${f}`);
      if (b.ok) previo = (await b.json()).records?.[0] || null;
    } catch (e) { console.error('Buscar clave', e); }
  }
  let r;
  if (previo) {
    r = await at(`/${previo.id}`, { method: 'PATCH', body: JSON.stringify({ fields: {
      ...campos, 'Actualizado': ahora, 'Envíos': (previo.fields['Envíos'] || 1) + 1, 'Reporte PDF': d.pdf ? [] : undefined,
    } }) });
  } else {
    r = await at('', { method: 'POST', body: JSON.stringify({ records: [{ fields: {
      ...campos, 'Recibido': ahora, 'Seguimiento': 'Nuevo', 'Envíos': 1, ...(clave ? { 'Clave de envío': clave } : {}),
    } }] }) });
  }
  if (!r.ok) {
    console.error('Airtable', r.status, await r.text());
    return json({ ok: false, error: 'No se pudo guardar. Intenta de nuevo en unos minutos.' }, 502, h);
  }
  const guardado = await r.json().catch(() => ({}));
  const id = previo ? previo.id : guardado.records?.[0]?.id;

  // Adjuntar el PDF al registro
  let pdf = false;
  if (id && typeof d.pdf === 'string' && d.pdf.startsWith('JVBER') && d.pdf.length < 4300000) {
    try {
      const nombre = (texto(d.pdfNombre, 120) || 'Dx IA Local.pdf').replace(/[^\p{L}\p{N} ._-]/gu, '');
      const u = await fetch(`https://content.airtable.com/v0/${BASE}/${id}/${CAMPO_PDF}/uploadAttachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'application/pdf', file: d.pdf, filename: nombre.endsWith('.pdf') ? nombre : nombre + '.pdf' }),
      });
      pdf = u.ok;
      if (!u.ok) console.error('PDF', u.status, await u.text());
    } catch (e) { console.error('PDF', e); }
  }

  try { await avisarTelegram(campos, id, previo); } catch (e) { console.error('Telegram', e); }
  if (typeof d.sesion === 'string' && d.sesion) {
    try { await marcarEnviada(d.sesion, id); } catch (e) { console.error('Sesión', e); }
  }
  return json({ ok: true, actualizado: !!previo, pdf }, 200, h);
}

const at = (ruta, opciones = {}) => fetch(`https://api.airtable.com/v0/${BASE}/${TABLA}${ruta}`, {
  ...opciones, headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
});

// Aviso al grupo de Telegram. Variables: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (si faltan, no se envía).
const html = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
async function avisarTelegram(c, id, previo) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const enlace = id ? `https://airtable.com/${BASE}/${TABLA}/${id}` : `https://airtable.com/${BASE}/${TABLA}`;
  const antes = previo?.fields?.['Puntaje total'];
  const lineas = previo ? [
    `🔄 <b>Diagnóstico actualizado</b>`,
    `<b>${html(c['Colegio'])}</b>`,
    '',
    `• <b>Puntaje:</b> ${antes != null && antes !== c['Puntaje total'] ? `${antes} → ` : ''}${c['Puntaje total'] ?? '–'} / 108 (${c['Preguntas respondidas']} de 36 preguntas)`,
    `• <b>Etapa:</b> ${html(c['Etapa'] || '–')}`,
  ] : [
    `🏫 <b>Nuevo diagnóstico de IA local</b>`,
    `<b>${html(c['Colegio'])}</b>`,
    '',
    `• <b>Puntaje:</b> ${c['Puntaje total'] ?? '–'} / 108 (${c['Preguntas respondidas']} de 36 preguntas)`,
    `• <b>Etapa:</b> ${html(c['Etapa'] || '–')}`,
    `• <b>Cuadrante:</b> ${html(c['Cuadrante'] || '–')}`,
    `• <b>Primera prioridad:</b> ${html(c['Primera prioridad'] || '–')}`,
    `• <b>Contacto:</b> ${html(c['Correo de contacto'])}`,
  ];
  if (!previo && c['Personas que responden']) lineas.push(`• <b>Responden:</b> ${html(c['Personas que responden'])}`);
  lineas.push('', `<a href="${enlace}">Ver en Airtable</a>`);
  const t = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: lineas.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!t.ok) console.error('Telegram', t.status, await t.text());
}
