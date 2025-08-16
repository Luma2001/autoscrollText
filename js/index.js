 // ——— Utilidades DOM ———
    const $ = (sel, root = document) => root.querySelector(sel);

    const els = {
      toolbar: $('#toolbar'),
      viewport: $('#viewport'),
      reader: $('#reader'),
      file: $('#fileInput'),
      pasteBtn: $('#pasteBtn'),
      start: $('#startBtn'),
      pause: $('#pauseBtn'),
      toTop: $('#toTopBtn'),
      speedRange: $('#speedRange'),
      speedValue: $('#speedValue'),
      pauseOnInteract: $('#pauseOnInteract'),
      fontUpBtn: $('#fontUpBtn'),
      fontDownBtn: $('#fontDownBtn')
    };

    // Ajuste fino de la altura real de la toolbar (para móviles y cambios de zoom)
    function setToolbarHeightVar(){
      const h = els.toolbar.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--toolbar-h', h + 'px');
    }
    setToolbarHeightVar();
    addEventListener('resize', setToolbarHeightVar);

    // ——— Estado del Auto-Scroll ———
    const state = {
      running: false,//indica si el scroll automático está activo
      speed: Number(localStorage.getItem('as:speed') || 120), // px/s recupera la velocidad de desplazamiento desde el localstorage. Si no hay valor guardado utiliza 120 por defecto
      rafId: null,//guarda el ID de requestAnimationFrame para poder cancelarlo
      lastTs: 0, //Se usa para calcular cuánto tiempo pasó desde el último update y así desplazar el scroll de forma suave y consistente, independientemente de la velocidad de refresco del monitor.
      scrollAcc: 0 // 👈 acumulador de sub-píxeles
    };

    els.speedRange.value = state.speed;
    els.speedValue.textContent = state.speed;

    function updateUI(){
      els.start.setAttribute('aria-pressed', String(state.running));
    }

    // ——— Motor de desplazamiento suave (requestAnimationFrame) ———
    function tick(ts){
      if(!state.running){ return; }
      if(!state.lastTs){ state.lastTs = ts; }
      const dt = (ts - state.lastTs) / 1000; // segundos desde el último frame
      state.lastTs = ts;

      //const dy = state.speed * dt; // píxeles a desplazar en este frame
      //els.viewport.scrollTop += dy;
      // Calcular desplazamiento en píxeles fraccionarios
      state.scrollAcc += state.speed * dt;

      // Solo aplicar el scroll cuando haya al menos 1px acumulado
      if(state.scrollAcc >= 1){
        const move = Math.floor(state.scrollAcc);
        els.viewport.scrollTop += move;
        state.scrollAcc -= move;
      }

      const atEnd = Math.ceil(els.viewport.scrollTop + els.viewport.clientHeight) >= els.viewport.scrollHeight;
      if(atEnd){ pause(); return; }

      state.rafId = requestAnimationFrame(tick);
    }

    function start(){
      if(state.running) return;
      state.running = true;
      state.lastTs = 0;
      state.rafId = requestAnimationFrame(tick);
      updateUI();
    }

    function pause(){
      state.running = false;
      if(state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = null;
      updateUI();
    }

    function toggle(){ state.running ? pause() : start(); }

    function setSpeed(val){
      const v = Math.max(10, Math.min(800, Number(val) || 120));
      state.speed = v;
      els.speedRange.value = v;
      els.speedValue.textContent = v;
      localStorage.setItem('as:speed', String(v));
    }

    // ——— Carga y pegado de contenido ———
    els.file.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if(!file) return;
      try{
        const text = await file.text();
        els.reader.textContent = text; // textContent + white-space: pre-wrap
        els.viewport.scrollTop = 0; // ir arriba
      }catch(err){
        alert('No se pudo leer el archivo. Asegúrate de que sea .txt');
        console.error(err);
      }
    });

    els.pasteBtn.addEventListener('click', async () => {
      // Intentar leer desde el portapapeles (requiere https o localhost)
      if(navigator.clipboard?.readText){
        try{
          const t = await navigator.clipboard.readText();
          if(t){ els.reader.textContent = t; els.viewport.scrollTop = 0; return; }
        }catch{ /* puede fallar por permisos; fallback a prompt */ }
      }
      const fallback = prompt('Pegá aquí tu texto y presiona Aceptar:');
      if(fallback != null){ els.reader.textContent = fallback; els.viewport.scrollTop = 0; }
    });

    // También permitir Ctrl+V directo dentro del lector
    els.reader.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const t = (ev.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, t);
    });

    // ——— Ajuste de tamaño de fuente ———
      els.fontUpBtn.addEventListener('click', () => {
        const currentSize = parseFloat(getComputedStyle(els.reader).fontSize);
        els.reader.style.fontSize = (currentSize + 2) + 'px';
        els.reader.style.lineHeight = "1.5"; // relativo, siempre se ajusta
      });
      els.fontDownBtn.addEventListener('click', () => {
        const currentSize = parseFloat(getComputedStyle(els.reader).fontSize);
        els.reader.style.fontSize = Math.max(10, currentSize - 2) + 'px'; // no permitir menos de 10px
        reader.style.lineHeight = "1.5"; // relativo, siempre se ajusta
      });

    // ——— Controles ———
      els.start.addEventListener('click', start);
      els.pause.addEventListener('click', pause);
      els.toTop.addEventListener('click', () => { els.viewport.scrollTop = 0; });
      els.speedRange.addEventListener('input', (e) => setSpeed(e.target.value));

    // Pausa automática ante interacción del usuario (para no pelear con el scroll manual)
      function maybePauseOnInteract(){ if(els.pauseOnInteract.checked) pause(); }
      els.viewport.addEventListener('wheel', maybePauseOnInteract, { passive: true });
      els.viewport.addEventListener('touchstart', maybePauseOnInteract, { passive: true });
      els.viewport.addEventListener('mousedown', maybePauseOnInteract);

    // ——— Atajos de teclado globales ———
    addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowUp') { setSpeed(state.speed + 5); }
      else if (e.key === 'ArrowDown') { setSpeed(state.speed - 5); }
      else if (e.key === 'Home') { els.viewport.scrollTop = 0; }
      else if (e.key === 'End') { els.viewport.scrollTop = els.viewport.scrollHeight; }
    });

    // Exponer funciones en window para depurar (opcional)
      window.autoScrollDemo = { start, pause, setSpeed, state };