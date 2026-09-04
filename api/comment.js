// Recibe los comentarios que se dejan al pie de cada herramienta y los reenvia
// por email via la API HTTPS de Brevo (no SMTP: Vercel, como la mayoria de los
// hosts, no deja mandar SMTP saliente). La direccion de destino y la API key
// viven SOLO aca, del lado del servidor -- el frontend nunca las ve ni las
// puede leer del bundle.
//
// Variables de entorno (configurar en el proyecto de Vercel, nunca en el repo):
//   BREVO_API_KEY       (obligatoria) la misma que ya se usa en agsanalitica.com
//   COMMENT_TO_EMAIL    (opcional) default: gfailen@agsanalitica.com
//   COMMENT_FROM_EMAIL  (opcional) default: gfailen@agsanalitica.com
//                        tiene que ser un remitente YA VERIFICADO en Brevo,
//                        si no el envio falla en silencio del lado de Brevo.

const TO_EMAIL = process.env.COMMENT_TO_EMAIL || 'gfailen@agsanalitica.com';
const FROM_EMAIL = process.env.COMMENT_FROM_EMAIL || 'gfailen@agsanalitica.com';
const MAX_LEN = 4000;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method_not_allowed' }); return; }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('comment.js: falta la variable de entorno BREVO_API_KEY');
    res.status(500).json({ ok: false, error: 'server_not_configured' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // honeypot: un campo invisible para personas, tentador para bots. Si vino
  // relleno, respondemos "ok" igual (para no delatar el filtro) pero no
  // mandamos nada.
  if (body.website) { res.status(200).json({ ok: true }); return; }

  const tool = String(body.tool || 'Herramienta sin identificar').trim().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, MAX_LEN);
  const contact = String(body.contact || '').trim().slice(0, 200);
  const page = String(body.page || '').trim().slice(0, 300);

  if (!message || message.length < 3) {
    res.status(400).json({ ok: false, error: 'empty_message' });
    return;
  }

  const html =
    '<p><b>Herramienta:</b> ' + esc(tool) + '</p>' +
    (page ? '<p><b>P&aacute;gina:</b> ' + esc(page) + '</p>' : '') +
    (contact ? '<p><b>Contacto que dej&oacute;:</b> ' + esc(contact) + '</p>' : '') +
    '<p><b>Comentario:</b></p><p>' + esc(message).replace(/\n/g, '<br>') + '</p>';

  const payload = {
    sender: { name: 'cromatografia.com.ar', email: FROM_EMAIL },
    to: [{ email: TO_EMAIL }],
    subject: 'Comentario en ' + tool + ' — cromatografia.com.ar',
    htmlContent: html
  };
  if (contact && /.+@.+\..+/.test(contact)) {
    payload.replyTo = { email: contact };
  }

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const t = await r.text().catch(function () { return ''; });
      console.error('comment.js: Brevo respondio', r.status, t);
      res.status(502).json({ ok: false, error: 'send_failed' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('comment.js: error inesperado', e);
    res.status(500).json({ ok: false, error: 'unexpected' });
  }
};
