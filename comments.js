// Widget de comentarios al pie de las herramientas de cromatografia.com.ar.
// Uso: en la pagina de la herramienta,
//   <div class="tool-comments" data-tool="Nombre de la herramienta"></div>
//   <script src="/comments.js" defer></script>
// El comentario se manda a /api/comment (funcion serverless de Vercel), que
// lo reenvia por email. Este archivo nunca ve ni conoce la direccion de
// destino -- eso vive solo del lado del servidor.
(function () {
  var CSS =
    '.tool-comments{margin-top:1.5rem;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:14px;padding:1.5rem 1.75rem;}' +
    '.tool-comments h3{font-size:.95rem;font-weight:800;letter-spacing:-.01em;margin-bottom:.3rem;color:var(--primary,#1d4ed8);}' +
    '.tool-comments .tc-sub{font-size:.8rem;color:var(--muted,#64748b);margin-bottom:1rem;line-height:1.5;}' +
    '.tool-comments textarea{display:block;width:100%;min-height:90px;resize:vertical;font:inherit;font-size:.85rem;padding:.7rem .85rem;border:1.5px solid var(--border,#e2e8f0);border-radius:8px;color:var(--text,#0f172a);box-sizing:border-box;}' +
    '.tool-comments textarea:focus{outline:none;border-color:var(--primary,#1d4ed8);}' +
    '.tool-comments .tc-row{display:flex;gap:.75rem;margin-top:.65rem;flex-wrap:wrap;align-items:center;}' +
    '.tool-comments input[type=email]{flex:1 1 220px;min-width:180px;font:inherit;font-size:.82rem;padding:.55rem .75rem;border:1.5px solid var(--border,#e2e8f0);border-radius:8px;color:var(--text,#0f172a);box-sizing:border-box;}' +
    '.tool-comments input[type=email]:focus{outline:none;border-color:var(--primary,#1d4ed8);}' +
    '.tool-comments .tc-btn{font:inherit;font-size:.82rem;font-weight:700;padding:.6rem 1.15rem;border-radius:8px;border:none;background:var(--primary,#1d4ed8);color:#fff;cursor:pointer;white-space:nowrap;}' +
    '.tool-comments .tc-btn:disabled{opacity:.55;cursor:default;}' +
    '.tool-comments .tc-btn:hover:not(:disabled){opacity:.92;}' +
    '.tool-comments .tc-msg{font-size:.8rem;margin-top:.6rem;}' +
    '.tool-comments .tc-msg.ok{color:#15803d;}' +
    '.tool-comments .tc-msg.err{color:#b91c1c;}' +
    '.tool-comments .tc-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}';
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  function init(box) {
    var tool = box.getAttribute('data-tool') || document.title;
    box.innerHTML =
      '<h3>&iquest;Encontraste un error o ten&eacute;s una sugerencia?</h3>' +
      '<p class="tc-sub">Nos llega directo al equipo de AGS Anal&iacute;tica. No se publica en la p&aacute;gina.</p>' +
      '<textarea maxlength="4000" placeholder="Cont&aacute;nos qu&eacute; encontraste o qu&eacute; te gustar&iacute;a que agreguemos..."></textarea>' +
      '<input type="text" class="tc-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="tc-row">' +
      '<input type="email" placeholder="Tu email (opcional, por si quer&eacute;s respuesta)">' +
      '<button type="button" class="tc-btn">Enviar comentario</button>' +
      '</div>' +
      '<div class="tc-msg" style="display:none" role="status"></div>';

    var ta = box.querySelector('textarea');
    var hp = box.querySelector('.tc-hp');
    var emailEl = box.querySelector('input[type=email]');
    var btn = box.querySelector('.tc-btn');
    var msg = box.querySelector('.tc-msg');

    function show(cls, text) {
      msg.className = 'tc-msg ' + cls;
      msg.textContent = text;
      msg.style.display = 'block';
    }

    btn.addEventListener('click', function () {
      var message = ta.value.trim();
      if (!message) { show('err', 'Escribí un comentario antes de enviar.'); ta.focus(); return; }
      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = 'Enviando...';
      fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: tool,
          message: message,
          contact: emailEl.value.trim(),
          page: location.href,
          website: hp.value
        })
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            return { httpOk: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (res.httpOk && res.data && res.data.ok !== false) {
            ta.value = '';
            emailEl.value = '';
            show('ok', '¡Gracias! Lo recibimos.');
          } else {
            show('err', 'No se pudo enviar. Intentá de nuevo en un rato.');
          }
        })
        .catch(function () {
          show('err', 'No se pudo enviar. Revisá tu conexión e intentá de nuevo.');
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  }

  document.querySelectorAll('.tool-comments[data-tool]').forEach(init);
})();
