document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector(".slides-wrapper");
  const slides = document.querySelectorAll(".slide");
  const thumbs = document.querySelectorAll(".thumbnail");
  const videoModal = document.getElementById("videoModal");
  const modalContent = document.getElementById("modalContent");
  const closeBtn = document.querySelector(".close-btn-modal");
  
  let activeIndex = 0;
  let isTransitioning = false;
  const transitionCooldown = 800; // ms
  let transitionTimeoutId = null;
  let sideMenuTimeoutId = null;
  const SLIDE_SIN_VIDEO_DWELL = 15000; // ms de permanencia antes de auto-avanzar

  // 🔹 Función para limpiar todos los timeouts de auto-slide y retraso de video
  function clearAllTimeouts() {
    if (transitionTimeoutId) {
      clearTimeout(transitionTimeoutId);
      transitionTimeoutId = null;
    }
    if (sideMenuTimeoutId) {
      clearTimeout(sideMenuTimeoutId);
      sideMenuTimeoutId = null;
    }
    slides.forEach(slide => {
      if (slide.dataset.timeoutId) {
        clearTimeout(parseInt(slide.dataset.timeoutId, 10));
        slide.dataset.timeoutId = "";
      }
    });
  }

  // 🔹 Función principal para mostrar un slide específico
  function showSlide(index) {
    clearAllTimeouts();
    activeIndex = index;

    // Resetear el estado de todos los videos e imágenes de fondo
    slides.forEach((slide) => {
      const video = slide.querySelector("video");
      const img = slide.querySelector(".image");
      if (video) {
        video.pause();
        video.currentTime = 0;
        video.style.opacity = "0";
      }
      if (img) {
        img.style.opacity = "1";
      }
    });

    // Actualizar miniaturas inferiores
    thumbs.forEach(t => {
      t.classList.remove("active");
      t.removeAttribute("aria-current");
    });
    thumbs[index].classList.add("active");
    thumbs[index].setAttribute("aria-current", "true");

    // Desplazar el contenedor wrapper verticalmente
    wrapper.style.transform = `translateY(-${index * 100}%)`;

    // Cerrar los diálogos de reparto abiertos cuando cambia la diapositiva
    document.querySelectorAll("dialog.panel-oculto[open]").forEach(dialog => {
      dialog.close();
    });

    // Controlar el menú lateral en la diapositiva 3 (Willy Fix)
    const sideMenu = document.querySelector("#slide-3 .side-menu");
    if (sideMenu) {
      if (index === 2) {
        sideMenuTimeoutId = setTimeout(() => sideMenu.classList.add("show"), 800);
      } else {
        sideMenu.classList.remove("show");
      }
    }

    // Controlar el video del acordeón en slide 6
    const accordionVideo = document.getElementById("accordionAvatarVideo");
    if (accordionVideo) {
      const activeCardWithVideo = document.querySelector(".portrait-card.is-active #accordionAvatarVideo");
      if (index === 5 && activeCardWithVideo) {
        accordionVideo.play().catch(() => {});
      } else {
        accordionVideo.pause();
      }
    }

    // Programar la reproducción automática del teaser de fondo si existe
    const slide = slides[index];
    const video = slide.querySelector("video");
    const img = slide.querySelector(".image");

    if (video && img) {
      const tid = setTimeout(() => {
        img.style.opacity = "0";
        video.style.opacity = "1";
        video.play().catch(() => {});
      }, 6000); // 6 segundos de imagen estática antes del teaser
      slide.dataset.timeoutId = tid.toString();
    } else {
      // Diapositivas sin video de fondo (ej. Willy Fix): auto-avanzar
      // tras un tiempo de permanencia para no quedar pegadas
      transitionTimeoutId = setTimeout(() => {
        const nextIdx = (index < slides.length - 1) ? index + 1 : 0;
        showSlide(nextIdx);
      }, SLIDE_SIN_VIDEO_DWELL);
    }
  }

  // 🔹 Evento cuando el video de fondo de un slide termina
  slides.forEach((slide, idx) => {
    const video = slide.querySelector("video");
    const img = slide.querySelector(".image");
    if (video && img) {
      video.addEventListener("ended", () => {
        video.pause();
        video.currentTime = 0;
        video.style.opacity = "0";
        img.style.opacity = "1";

        // Avanzar a la siguiente diapositiva automáticamente tras 5 segundos de espera
        transitionTimeoutId = setTimeout(() => {
          const nextIdx = (idx < slides.length - 1) ? idx + 1 : 0;
          showSlide(nextIdx);
        }, 5000);
      });
    }
  });

  // 🔹 Navegación mediante clic en las miniaturas
  thumbs.forEach(thumb => {
    thumb.addEventListener("click", () => {
      const idx = parseInt(thumb.dataset.index, 10);
      if (idx !== activeIndex) {
        showSlide(idx);
      }
    });
  });

  // Hacer las miniaturas operables por teclado y lectores de pantalla
  thumbs.forEach(thumb => {
    thumb.setAttribute("tabindex", "0");
    thumb.setAttribute("role", "button");
    if (!thumb.getAttribute("aria-label")) {
      thumb.setAttribute("aria-label", thumb.getAttribute("alt") || `Ir a la diapositiva ${parseInt(thumb.dataset.index, 10) + 1}`);
    }
    thumb.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const idx = parseInt(thumb.dataset.index, 10);
        if (idx !== activeIndex) {
          showSlide(idx);
        }
      }
    });
  });

  // 🔹 Función para navegar el carrusel de forma segura (con cooldown)
  function navigateCarousel(direction) {
    if (isTransitioning) return;

    let targetIndex = activeIndex;
    if (direction === "down" || direction === "next") {
      targetIndex = (activeIndex + 1) % slides.length;
    } else if (direction === "up" || direction === "prev") {
      targetIndex = (activeIndex - 1 + slides.length) % slides.length;
    }

    if (targetIndex !== activeIndex) {
      isTransitioning = true;
      showSlide(targetIndex);
      setTimeout(() => {
        isTransitioning = false;
      }, transitionCooldown);
    }
  }

  // 🔹 Listeners de Scroll (Rueda del ratón) para cambiar diapositivas
  window.addEventListener("wheel", (e) => {
    // Si hay un modal abierto (video o reparto), no navegar
    if (document.querySelector("dialog[open]")) return;

    // Permitir scroll interno en el Slide 6 si el contenido es más alto que la pantalla
    if (activeIndex === 5) {
      const corpSlide = document.querySelector(".info-slide--corp");
      if (corpSlide) {
        const isScrollable = corpSlide.scrollHeight > corpSlide.clientHeight;
        if (isScrollable) {
          const atTop = corpSlide.scrollTop === 0;
          const atBottom = Math.ceil(corpSlide.scrollTop + corpSlide.clientHeight) >= corpSlide.scrollHeight;

          if (e.deltaY > 0 && !atBottom) {
            // Desplazamiento hacia abajo dentro del slide, no cambiar de diapositiva
            return;
          }
          if (e.deltaY < 0 && !atTop) {
            // Desplazamiento hacia arriba dentro del slide, no cambiar de diapositiva
            return;
          }
        }
      }
    }

    if (Math.abs(e.deltaY) > 35) {
      const direction = e.deltaY > 0 ? "down" : "up";
      navigateCarousel(direction);
    }
  }, { passive: true });

  // 🔹 Listeners de Teclado (Flechas Arriba/Abajo)
  window.addEventListener("keydown", (e) => {
    // Cerrar paneles de reparto con Escape (los show() no-modales no lo hacen
    // de forma nativa, y closedby="any" solo existe en Chrome 133+)
    if (e.key === "Escape") {
      document.querySelectorAll("dialog.panel-oculto[open]").forEach(d => d.close());
      return;
    }

    if (document.querySelector("dialog[open]")) return;

    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      navigateCarousel("down");
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      navigateCarousel("up");
    }
  });

  // 🔹 Gestos de deslizamiento táctil (Swipe) para dispositivos móviles
  let touchStartY = 0;
  window.addEventListener("touchstart", (e) => {
    if (document.querySelector("dialog[open]")) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchend", (e) => {
    if (document.querySelector("dialog[open]")) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY - touchEndY;

    // Permitir gestos de swipe scroll internos en el Slide 6
    if (activeIndex === 5) {
      const corpSlide = document.querySelector(".info-slide--corp");
      if (corpSlide) {
        const isScrollable = corpSlide.scrollHeight > corpSlide.clientHeight;
        if (isScrollable) {
          const atTop = corpSlide.scrollTop === 0;
          const atBottom = Math.ceil(corpSlide.scrollTop + corpSlide.clientHeight) >= corpSlide.scrollHeight;

          if (diffY > 0 && !atBottom) {
            // Deslizar hacia arriba (scroll hacia abajo) dentro del slide, no cambiar
            return;
          }
          if (diffY < 0 && !atTop) {
            // Deslizar hacia abajo (scroll hacia arriba) dentro del slide, no cambiar
            return;
          }
        }
      }
    }

    if (Math.abs(diffY) > 70) { // Umbral mínimo de deslizamiento (en píxeles)
      const direction = diffY > 0 ? "down" : "up";
      navigateCarousel(direction);
    }
  }, { passive: true });

  // 🔹 Botones de Flechas visuales en pantalla
  const upArrow = document.getElementById("nav-arrow-up");
  const downArrow = document.getElementById("nav-arrow-down");
  
  if (upArrow) {
    upArrow.addEventListener("click", () => navigateCarousel("up"));
  }
  if (downArrow) {
    downArrow.addEventListener("click", () => navigateCarousel("down"));
  }

  // 🔹 Clic en logotipo vuelve al inicio (Slide 1)
  const logoTrigger = document.getElementById("logo-trigger");
  if (logoTrigger) {
    logoTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      showSlide(0);
    });
  }

  // 🔹 LÓGICA DE MODALES DE REPARTO (Nativo <dialog>)
  const castButtons = document.querySelectorAll(".btn-reparto");
  castButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const panelId = btn.getAttribute("data-panel-id");
      const dialog = document.getElementById(panelId);
      if (dialog) {
        if (dialog.hasAttribute("open")) {
          dialog.close();
          btn.classList.remove("active");
        } else {
          // Cerrar otros diálogos de reparto abiertos
          document.querySelectorAll("dialog.panel-oculto[open]").forEach(d => {
            d.close();
          });
          dialog.show(); // Usamos show() en lugar de showModal() si queremos mantener el header y carrusel clicleables
          btn.classList.add("active");
        }
      }
    });
  });

  // Manejo de eventos de cierre y clics externos para diálogos nativos
  document.querySelectorAll("dialog").forEach(dialog => {
    // Si se cierra con Esc, quitar la clase 'active' de los botones
    dialog.addEventListener("close", () => {
      const associatedBtn = document.querySelector(`[data-panel-id="${dialog.id}"]`);
      if (associatedBtn) associatedBtn.classList.remove("active");
      
      // Si es el modal de video, detener el iframe
      if (dialog.id === "videoModal") {
        modalContent.innerHTML = "";
        document.body.style.overflow = "auto";
      }

      // Re-evaluar el bloqueo de orientación (p. ej. cerrar modal en landscape)
      if (typeof verificarOrientacion === "function") {
        verificarOrientacion();
      }
    });

    // Cerrar al hacer clic en el botón interno de cierre (clase close-panel)
    const closePanelBtn = dialog.querySelector(".close-panel");
    if (closePanelBtn) {
      closePanelBtn.addEventListener("click", () => {
        dialog.close();
      });
    }

    // Fallback de Light-dismiss (clic fuera del contenido del diálogo para cerrar).
    // Para diálogos no-modales (show()), el backdrop no existe: si el clic cae
    // directamente sobre el <dialog> pero fuera de su contenido hijo, se cierra.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  });

  // 🔹 LÓGICA DEL MODAL DE VIDEO (Nativo <dialog> para Tráileres)
  function openVideoModal(videoUrl) {
    // Cancelar el arranque diferido del teaser (6s) para que no suene
    // el fondo mientras el modal está abierto
    clearAllTimeouts();

    // Detener la reproducción de los videos de fondo de la diapositiva actual
    const currentSlide = slides[activeIndex];
    const currentVideo = currentSlide.querySelector("video");
    const currentImg = currentSlide.querySelector(".image");

    if (currentVideo && currentImg) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
      currentVideo.style.opacity = "0";
      currentImg.style.opacity = "1";
    }

    // Inyectar el reproductor en el modal: <video> nativo para MP4 directos,
    // iframe de YouTube para el resto. Soporta URLs que ya traen query.
    const sep = videoUrl.includes("?") ? "&" : "?";
    const isDirectVideo = /\.mp4($|\?)/i.test(videoUrl);
    modalContent.innerHTML = isDirectVideo
      ? `<video title="Piloto Amnesia" src="${videoUrl}" controls autoplay playsinline></video>`
      : `<iframe title="Tráiler Shot 1" src="${videoUrl}${sep}autoplay=1&controls=1&modestbranding=1&rel=0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowfullscreen></iframe>`;
    
    videoModal.showModal();
    document.body.style.overflow = "hidden";
  }

  // Vincular eventos de clic para botones "Reproducir" (abren el modal)
  document.querySelectorAll(".btn-reproducir").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const videoUrl = btn.getAttribute("data-video-url");
      if (videoUrl) {
        openVideoModal(videoUrl);
      }
    });
  });

  // Botón cerrar del modal de video
  const closeVideoBtn = videoModal.querySelector(".close-btn-modal");
  if (closeVideoBtn) {
    closeVideoBtn.addEventListener("click", () => {
      videoModal.close();
    });
  }

  // Miniaturas laterales del slide 3 (Willy Fix)
  document.querySelectorAll("#slide-3 .side-thumb").forEach((thumb) => {
    const tooltipLabel = thumb.querySelector(".tooltip");
    const label = tooltipLabel ? tooltipLabel.textContent.trim() : "Ver episodio";
    thumb.setAttribute("tabindex", "0");
    thumb.setAttribute("role", "button");
    thumb.setAttribute("aria-label", label);
    const openEpisode = () => {
      const videoUrl = thumb.getAttribute("data-video");
      if (videoUrl) {
        openVideoModal(videoUrl);
      }
    };
    thumb.addEventListener("click", openEpisode);
    thumb.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEpisode();
      }
    });
  });

  // 🔹 LÓGICA DE PORTRAIT ACCORDION (De Genify)
  const accordion = document.querySelector(".portrait-accordion");
  if (accordion) {
    const cards = accordion.querySelectorAll(".portrait-card");
    const featured = accordion.querySelector(".portrait-card--featured") || cards[0];
    const accordionVideo = accordion.querySelector("video");
    const muteBtn = accordion.querySelector(".avatar-mute-btn");

    const setCardActive = (card) => {
      cards.forEach(c => c.classList.remove("is-active"));
      if (card) card.classList.add("is-active");

      // Reproducir video si está en el slide activo y la tarjeta lo contiene
      if (accordionVideo) {
        if (activeIndex === 5 && card && card.contains(accordionVideo)) {
          accordionVideo.play().catch(() => {});
        } else {
          accordionVideo.pause();
        }
      }
    };

    cards.forEach(card => {
      card.addEventListener("mouseenter", () => setCardActive(card));
      
      // En móviles/click, también permitir activarlo con click
      card.addEventListener("click", () => {
        if (!card.classList.contains("is-active")) {
          setCardActive(card);
        }
      });
    });

    accordion.addEventListener("mouseleave", () => setCardActive(featured));

    // Controlar silenciador (mute/unmute) del video del avatar
    if (muteBtn && accordionVideo) {
      muteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Evitar disparar eventos de click del card
        accordionVideo.muted = !accordionVideo.muted;
        muteBtn.textContent = accordionVideo.muted ? "🔇" : "🔊";
        muteBtn.title = accordionVideo.muted ? "Activar sonido" : "Silenciar";
      });
    }

    // Inicializar el acordeón en featured
    setCardActive(featured);
  }

  // 🔹 PWA: registro del Service Worker (caché offline + instalable)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  // 🔹 PWA: botón "Instalar app" (solo aparece si el navegador lo permite)
  let deferredPrompt = null;
  const installBtn = document.getElementById("btn-instalar");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (_) {}
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  }
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
  });

  // Iniciar en la primera diapositiva
  showSlide(0);
});

// 🔹 PANTALLA DE BLOQUEO HORIZONTAL (Detección de Orientación)
const overlay = document.getElementById("bloqueo-horizontal");
const videoBloqueo = document.getElementById("video-fondo");
const mensajeBloqueo = document.getElementById("mensaje-bloqueo");

function detectarTipoDispositivo() {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/i.test(ua) || (window.innerWidth > 600 && window.innerWidth < 1024)) {
    return "tablet";
  } else if (/mobi|iphone|android/i.test(ua)) {
    return "telefono";
  } else {
    return "desktop";
  }
}

function esDispositivoMovil() {
  const tipo = detectarTipoDispositivo();
  return tipo === "telefono" || tipo === "tablet";
}

function verificarOrientacion() {
  // No bloquear cuando hay un video a pantalla completa / modal abierto:
  // en landscape el usuario probablemente está viendo un tráiler.
  const modalAbierto = document.querySelector("dialog.modal-video-dialog[open]");
  if (modalAbierto) {
    overlay.classList.remove("mostrar");
    if (videoBloqueo) {
      videoBloqueo.pause();
    }
    return;
  }
  if (esDispositivoMovil() && window.matchMedia("(orientation: landscape)").matches) {
    const tipo = detectarTipoDispositivo();
    mensajeBloqueo.textContent = tipo === "tablet"
      ? "Por favor, gira tu dispositivo en posición vertical 📲"
      : "Por favor, gira tu teléfono en posición vertical 📱";
    overlay.classList.add("mostrar");
    if (videoBloqueo && videoBloqueo.style.display !== "none") {
      videoBloqueo.play().catch(() => {});
    }
  } else {
    overlay.classList.remove("mostrar");
    if (videoBloqueo) {
      videoBloqueo.pause();
    }
  }
}

// Escuchar cambios de tamaño y orientación
window.addEventListener("orientationchange", verificarOrientacion);
window.addEventListener("resize", verificarOrientacion);
verificarOrientacion();

// Intentar reproducir el video de fondo de bloqueo, si falla aplicar fallback CSS animado
if (videoBloqueo) {
  videoBloqueo.play().catch(() => {
    overlay.classList.add("fondo-fallback");
    videoBloqueo.style.display = "none";
  });
}
