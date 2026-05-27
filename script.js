/* ═══════════════════════════════════════════════════════════════
   STATON s.r.o. - Immersive Scroll Engine
   All scroll-driven animations, parallax, 3D background,
   number counters, and interactive behaviors
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const isTouch = navigator.maxTouchPoints > 0;
  const isMobileOrTouch = isMobile || isTouch;

  // Mobile-only GSAP global settings
  if (isMobileOrTouch && typeof gsap !== 'undefined') {
    gsap.ticker.lagSmoothing(0);
    gsap.defaults({ force3D: true });
    if (typeof ScrollTrigger !== 'undefined') {
      // normalizeScroll is required on mobile so GSAP's pin spacer works correctly.
      // Without it, async touch events cause the pinned section to freeze entirely.
      // allowNestedScroll:true prevents it from blocking scroll on child elements.
      ScrollTrigger.normalizeScroll({ normalizeScrollX: false, allowNestedScroll: true });
      // Re-calculate all trigger positions after orientation change
      window.addEventListener('orientationchange', function () {
        setTimeout(function () { ScrollTrigger.refresh(); }, 400);
      }, { passive: true });
      window.addEventListener('resize', (function () {
        var debounceTimer;
        return function () {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 300);
        };
      })(), { passive: true });
    }
  }

  // - Utility: Clamp --------------------
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // - Utility: Map range ------------------
  function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
  }

  // - Utility: Get scroll progress through element -----
  function getScrollProgress(element) {
    const rect = element.getBoundingClientRect();
    const viewH = window.innerHeight;
    const start = rect.top;
    const height = rect.height;
    // 0 = element top enters viewport bottom, 1 = element bottom exits viewport top
    return clamp((viewH - start) / (viewH + height), 0, 1);
  }

  // - Utility: Is element in viewport ------------
  function isInView(element, threshold = 0.15) {
    const rect = element.getBoundingClientRect();
    const viewH = window.innerHeight;
    return rect.top < viewH * (1 - threshold) && rect.bottom > viewH * threshold;
  }

  // - Utility: Split text into spans for reveal animations (fixes word wrapping) -
  function splitCharactersPreserveHTML(element) {
    const nodes = Array.from(element.childNodes);
    element.innerHTML = '';

    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        for (let char of text) {
          if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
            element.appendChild(document.createTextNode(char));
          } else {
            const span = document.createElement('span');
            span.textContent = char;
            element.appendChild(span);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const wrapper = node.cloneNode(false);
        const text = node.textContent;
        for (let char of text) {
          if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
            wrapper.appendChild(document.createTextNode(char));
          } else {
            const span = document.createElement('span');
            span.textContent = char;
            wrapper.appendChild(span);
          }
        }
        element.appendChild(wrapper);
      }
    });
  }


  // Initialize Split Text
  document.querySelectorAll('.opacity-reveal, .fsarc-text-title, .india-headline, .performance-headline, .roi-headline, .clients-headline').forEach(el => splitCharactersPreserveHTML(el));


  // ═══════════════════════════════════════════════════════════
  // 3D BACKGROUND CANVAS - Rotating magnetic field schematic
  // ═══════════════════════════════════════════════════════════
  let scrollY = 0;
  let targetScrollY = 0;
  let heroScrollY = 0; // separate smoothed value for hero animation (lower lerp = smoother for mouse wheel)

  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let canvasW, canvasH;

    function resizeCanvas() {
      canvasW = canvas.width = window.innerWidth;
      canvasH = canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 3D wireframe points for magnetic field + chamber shape
    class Point3D {
      constructor(x, y, z) {
        this.x = x; this.y = y; this.z = z;
      }
      rotateY(angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const x = this.x * cos - this.z * sin;
        const z = this.x * sin + this.z * cos;
        return new Point3D(x, this.y, z);
      }
      rotateX(angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const y = this.y * cos - this.z * sin;
        const z = this.y * sin + this.z * cos;
        return new Point3D(this.x, y, z);
      }
      project(cx, cy, fov) {
        const scale = fov / (fov + this.z);
        return {
          x: cx + this.x * scale,
          y: cy + this.y * scale,
          scale: scale
        };
      }
    }

    // Generate chamber (cylinder wireframe)
    function generateChamber(radius, height, segments, rings) {
      const lines = [];
      for (let r = 0; r < rings; r++) {
        const y = -height / 2 + (height / (rings - 1)) * r;
        const ringPts = [];
        for (let s = 0; s <= segments; s++) {
          const angle = (Math.PI * 2 / segments) * s;
          ringPts.push(new Point3D(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius
          ));
        }
        // horizontal ring lines
        for (let s = 0; s < ringPts.length - 1; s++) {
          lines.push([ringPts[s], ringPts[s + 1]]);
        }
      }
      // vertical lines
      for (let s = 0; s < segments; s++) {
        const angle = (Math.PI * 2 / segments) * s;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        lines.push([
          new Point3D(x, -height / 2, z),
          new Point3D(x, height / 2, z)
        ]);
      }
      return lines;
    }

    // Generate magnetic field lines (toroidal)
    function generateFieldLines(majorR, minorR, count, segments) {
      const lines = [];
      for (let i = 0; i < count; i++) {
        const theta = (Math.PI * 2 / count) * i;
        const pts = [];
        for (let s = 0; s <= segments; s++) {
          const phi = (Math.PI * 2 / segments) * s;
          const x = (majorR + minorR * Math.cos(phi)) * Math.cos(theta);
          const y = minorR * Math.sin(phi);
          const z = (majorR + minorR * Math.cos(phi)) * Math.sin(theta);
          pts.push(new Point3D(x, y, z));
        }
        for (let s = 0; s < pts.length - 1; s++) {
          lines.push([pts[s], pts[s + 1]]);
        }
      }
      return lines;
    }

    const chamberLines = generateChamber(200, 350, isMobileOrTouch ? 6 : 12, isMobileOrTouch ? 3 : 6);
    const fieldLines = generateFieldLines(160, 60, isMobileOrTouch ? 4 : 8, isMobileOrTouch ? 12 : 24);
    const allLines = [...chamberLines, ...fieldLines];

    function drawBackground(time) {
      ctx.clearRect(0, 0, canvasW, canvasH);

      const rotY = scrollY * 0.0003 + time * 0.0001;
      const rotX = 0.3 + scrollY * 0.0001;
      const cx = canvasW / 2;
      const cy = canvasH / 2;
      const fov = 600;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.7;

      for (const line of allLines) {
        const p1 = line[0].rotateY(rotY).rotateX(rotX).project(cx, cy, fov);
        const p2 = line[1].rotateY(rotY).rotateX(rotX).project(cx, cy, fov);
        const alpha = clamp(mapRange((p1.scale + p2.scale) / 2, 0.5, 1.5, 0.06, 0.35), 0.06, 0.35);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Add drawBackground to the animation loop later (throttled on mobile ~20fps)
    let _bgLastTime = 0;
    window._drawBackground = function (time) {
      if (isMobileOrTouch && time - _bgLastTime < 50) return;
      _bgLastTime = time;
      drawBackground(time);
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PARALLAX GRID
  // ═══════════════════════════════════════════════════════════
  const parallaxGrid = document.getElementById('parallax-grid');

  function updateParallaxGrid() {
    if (isMobileOrTouch) return; // Disable parallax grid on mobile
    const parallaxGrid = document.getElementById('parallax-grid');
    if (!parallaxGrid) return;
    const offset = scrollY * 0.08;
    parallaxGrid.style.transform = `translateY(${offset}px)`;
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION SCROLL EFFECT
  // ═══════════════════════════════════════════════════════════
  const nav = document.getElementById('main-nav');

  function updateNav() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    if (window.pageYOffset > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    // Sub-page specific: Fade out logo/nav when scrolling down
    const subHero = document.querySelector('.about-hero, .contact-hero, .sub-hero, .prod-hero, .app-hero, .trust-hero, .service-hero');
    if (subHero) {
      if (window.pageYOffset > 100) {
        nav.classList.add('out-of-hero');
      } else {
        nav.classList.remove('out-of-hero');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // NUMBER COUNTERS UTILITY (Used in machines section)
  // ═══════════════════════════════════════════════════════════
  function animateCounter(el, onComplete) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1500;
    const startTime = performance.now();
    const isFloat = target % 1 !== 0;

    function tick(now) {
      const progress = clamp((now - startTime) / duration, 0, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = eased * target;
      el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else if (onComplete) {
        onComplete();
      }
    }
    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════════════════════
  // WHY STATON - GSAP ANIMATIONS
  // ═══════════════════════════════════════════════════════════
  const whySection = document.querySelector('.why-staton');
  if (whySection && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    const whyTitle = whySection.querySelector('.why-title');
    const whySubtitle = whySection.querySelector('.why-subtitle');
    const whyTool = whySection.querySelector('.why-tool-container');
    const whyGlow = whySection.querySelector('.why-tool-glow');
    const leftCards = whySection.querySelectorAll('.left-cards .why-card');
    const rightCards = whySection.querySelectorAll('.right-cards .why-card');
    const whyToolWrapper = whySection.querySelector('.why-tool-wrapper');
    const whyToolImg = whyToolWrapper ? whyToolWrapper.querySelector('.why-tool-img') : null;

    let currentWhyTl = null;

    // Reset all elements to their hidden (pre-animation) state
    const isMobile = () => window.innerWidth <= 1100;

    function resetWhyElements(resetTool = true) {
      if (currentWhyTl) {
        currentWhyTl.kill();
        currentWhyTl = null;
      }
      gsap.set(whyTitle, { y: 40, opacity: 0 });
      gsap.set(whySubtitle, { opacity: 0 });

      // On mobile, if we're scrolling back, don't abruptly hide the cards
      if (window.innerWidth > 1024) {
        gsap.set(leftCards, { x: -100, y: 0, opacity: 0 });
        gsap.set(rightCards, { x: 100, y: 0, opacity: 0 });
      }

      if (resetTool) {
        if (isMobile()) {
          // Mobile: only use opacity — keep the container at y:0 so the glow stays centered
          gsap.set(whyTool, { y: 0, opacity: 0 });
        } else {
          gsap.set(whyTool, { y: 40, opacity: 0 });
        }
        gsap.set(whyGlow, { opacity: 1, y: 0 }); // Glow always stays centered, no y offset
      }
    }

    // Build timeline with direction-dependent speed
    function playWhyTimeline(fast, includeTool = true) {
      resetWhyElements(includeTool);

      const tl = gsap.timeline();
      const mob = isMobile();

      if (fast) {
        // - FAST: scrolling UP from below - snappy reveal -
        tl.to(whyTitle, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" })
          .to(whySubtitle, { opacity: 1, duration: 0.25, ease: "power2.out" }, "-=0.15")
          .to(leftCards, { x: 0, y: 0, opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.06 }, "-=0.1")
          .to(rightCards, { x: 0, y: 0, opacity: 1, duration: 0.35, ease: "power2.out", stagger: 0.06 }, "-=0.35");

        if (includeTool) {
          if (mob) {
            // Mobile: animate opacity + a small upward rise (no large y travel so glow stays centered)
            tl.fromTo(whyTool, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.4");
          } else {
            tl.fromTo(whyTool, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.4");
          }
        } else {
          // Both Desktop and Mobile: tool transitions back via scrub reverse - just restore visibility
          gsap.to([whyTool, whyGlow], { opacity: 1, y: 0, duration: 0.4 });
          if (whyToolImg) whyToolImg.classList.remove('pause-float');

        }
      } else {
        // - SLOW: scrolling DOWN from top - cinematic reveal -
        if (isMobileOrTouch) {
          // Durations increased vs before so fast mobile swipes don't cause
          // onLeave to fire mid-animation (in/out overlap → rushed look)
          tl.to(whyTitle, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
            .to(whySubtitle, { opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.4")
            .to(leftCards, { x: 0, y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.08 }, "-=0.2")
            .to(rightCards, { x: 0, y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.08 }, "-=0.6");

          if (includeTool) {
            tl.fromTo(whyTool, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, "-=0.5");
            if (whyToolImg) whyToolImg.classList.remove('pause-float');
          }
        } else {
          tl.to(whyTitle, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
            .to(whySubtitle, { opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.4")
            .to(leftCards, { x: 0, y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.15 }, "-=0.2")
            .to(rightCards, { x: 0, y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.15 }, "-=0.8");

          if (includeTool) {
            tl.fromTo(whyTool, { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5, ease: "power3.out" }, "-=0.7");
            if (whyToolImg) whyToolImg.classList.remove('pause-float');
          }
        }
      }

      currentWhyTl = tl;
    }

    // Direction-aware ScrollTrigger
    ScrollTrigger.create({
      trigger: whySection,
      start: isMobileOrTouch ? "top 75%" : "top 70%",
      end: isMobileOrTouch ? "bottom 30%" : "bottom 60%", // wider zone on mobile so onLeave can't fire mid-animation
      onEnter: () => playWhyTimeline(false),      // Scrolling DOWN into section → slow
      onEnterBack: () => playWhyTimeline(true, false), // No tool reset on reverse scroll (scrub handles it)
      onLeave: () => {
        // Keep the tool image visible for the transition to fsARC
        if (window.innerWidth > 1100) {
          // Desktop: fade out text + cards + glow (with slight upward drift)
          gsap.to([whyTitle, whySubtitle, leftCards, rightCards], { opacity: 0, y: -20, duration: 0.4, stagger: 0.05 });
          gsap.to(whyGlow, { opacity: 0, duration: 0.4 }); // Glow fades only — no y movement
        } else {
          // Mobile: fade out text only — glow stays fixed in center, tool stays for bridge anim
          gsap.to([whyTitle, whySubtitle], { opacity: 0, y: -20, duration: 0.4, stagger: 0.05 });
          gsap.to(whyGlow, { opacity: 0, duration: 0.4 }); // Glow fades in place — no y movement
        }
      },
      onLeaveBack: () => resetWhyElements()        // Scrolling back above section
    });
  }

  // ═══════════════════════════════════════════════════════════
  // fsARC™ SCROLLYTELLING ANIMATION
  // ═══════════════════════════════════════════════════════════
  const fsarcSection = document.getElementById('fsarc');
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && fsarcSection) {
    const roughTool = fsarcSection.querySelector('.rough-tool');
    const smoothTool = fsarcSection.querySelector('.smooth-tool');
    const textBlocks = fsarcSection.querySelectorAll('.fsarc-text-block');
    const leftText = textBlocks[0];
    const rightText = textBlocks[1];

    let moveX = 0;
    let moveY = 0;
    let bridgeX = 0;
    let bridgeY = 0;
    let bridgeScale = 1;

    const whyToolWrapper = document.querySelector('.why-tool-wrapper');
    const whyToolImg = whyToolWrapper ? whyToolWrapper.querySelector('.why-tool-img') : null;
    const row1Wrap = fsarcSection.querySelectorAll('.fsarc-tool-wrap')[0];

    function calculateFsarcMovement() {
      // Temporarily clear transforms to get natural positions for measurement
      const rTransform = roughTool.style.transform;
      const sTransform = smoothTool.style.transform;
      const wTransform = whyToolWrapper ? whyToolWrapper.style.transform : "";

      gsap.set([roughTool, smoothTool], { clearProps: "transform" });
      if (whyToolWrapper) gsap.set(whyToolWrapper, { clearProps: "transform" });

      const rRect = roughTool.getBoundingClientRect();
      const sRect = smoothTool.getBoundingClientRect();
      const scroll = window.pageYOffset;

      const rCenter = { x: rRect.left + rRect.width / 2, y: rRect.top + scroll + rRect.height / 2 };
      const sCenter = { x: sRect.left + sRect.width / 2, y: sRect.top + scroll + sRect.height / 2 };

      moveX = sCenter.x - rCenter.x;
      moveY = sCenter.y - rCenter.y;

      if (whyToolWrapper) {
        const wRect = whyToolWrapper.getBoundingClientRect();
        const wCenter = { x: wRect.left + wRect.width / 2, y: wRect.top + scroll + wRect.height / 2 };
        bridgeX = wCenter.x - rCenter.x;
        bridgeY = wCenter.y - rCenter.y;
        bridgeScale = wRect.width / rRect.width;

        // Restore whyToolWrapper transform
        whyToolWrapper.style.transform = wTransform;
      }

      // Restore transforms
      roughTool.style.transform = rTransform;
      smoothTool.style.transform = sTransform;
    }

    const fsarcGlows = fsarcSection.querySelectorAll('.fsarc-tool-glow');
    const fsarcGrids = fsarcSection.querySelectorAll('.fsarc-tool-grid');

    gsap.set([fsarcGlows, fsarcGrids], { opacity: 0 });
    gsap.set([leftText, rightText], { opacity: 1, x: 0 });
    gsap.set(smoothTool, { opacity: 0 });
    gsap.set(roughTool, { opacity: 0 });
    gsap.set([leftText.querySelectorAll('span'), rightText.querySelectorAll('span')], { y: 12, opacity: 0 });


    const mob = window.innerWidth <= 1100;

    const fsarcTl = gsap.timeline({
      scrollTrigger: {
        trigger: fsarcSection,
        start: mob ? "top 80%" : "top 60%",
        end: mob ? "bottom 20%" : "bottom bottom", // extend zone on mobile so animation isn't compressed
        scrub: mob ? 1.5 : 1.5,                    // match desktop scrub — mobile was 0.8 (too fast)
        onRefreshInit: calculateFsarcMovement
      }
    });

    // Mobile-specific timing constants
    const bridgeDur = mob ? 1.5 : 4;    // how long the why-tool travels to Row 1
    const blendOffset = mob ? 1.1 : 3.0;  // when Row 1 3d tool fades in
    const textOffset = mob ? 1.4 : 3.2;  // when Row 1 text reveals
    const moveDur = 1.5;
    const blend2Off = mob ? 1.5 : 1.2;  // Sync mobile to 1.5 (end of travel) to match Bridge logic

    fsarcTl
      .addLabel("bridge")
      // 1. Move the Why Staton tool to the Row 1 fsARC position
      .to(whyToolWrapper, {
        x: () => -bridgeX,
        y: () => -bridgeY,
        rotation: mob ? 0 : -6,
        zIndex: mob ? 100 : 2, // Elevate z-index on mobile
        duration: bridgeDur,
        ease: "power2.inOut",
        onStart: () => {
          if (whyToolImg) whyToolImg.classList.add('pause-float');
        }
      }, "bridge")
      // 2. Glow appears right as tool arrives
      .to([fsarcGlows[0], fsarcGrids[0]], {
        opacity: 1,
        duration: 0.8,
        ease: "power1.inOut"
      }, mob ? "bridge+=0.3" : "bridge+=3.0")
      // Soft blend: Row 1 fsARC tool fades in, why-tool fades out
      .to(roughTool, {
        opacity: 1,
        duration: mob ? 0.1 : 0.15, // Snappy transformation
        ease: "power1.inOut"
      }, mob ? "bridge+=1.5" : `bridge+=${blendOffset}`)
      .to(whyToolWrapper, {
        opacity: 0,
        duration: 0.15, // Snappy transformation
        ease: "power1.inOut"
      }, mob ? "bridge+=1.5" : `bridge+=${blendOffset}`)
      // 3. Reveal Row 1 text (character-by-character)
      .to(leftText.querySelectorAll('span'), {
        opacity: 1,
        y: 0,
        stagger: { amount: mob ? 1.0 : 1.5 },
        duration: 0.5,
        ease: "power1.inOut"
      }, mob ? "bridge+=1.5" : `bridge+=${textOffset}`)

      .addLabel("move", mob ? "bridge+=3.0" : "bridge+=5.5")
      // 4. Elevate Row 1 wrapper so tool travels over Row 2 glow
      .set(row1Wrap, { zIndex: 20 }, "move")
      // Row 1 tool travels to Row 2 position
      .to(roughTool, {
        x: () => moveX,
        y: () => moveY,
        rotation: mob ? 0 : 4,
        zIndex: mob ? 100 : 2, // Ensure it travels over mobile content
        duration: moveDur,
        ease: "power2.inOut"
      }, "move")
      // 5. Fade out Row 1 glow/grid as tool moves away
      .to([fsarcGlows[0], fsarcGrids[0]], { opacity: 0, duration: 0.8 }, mob ? "move+=0.4" : "move+=0.8")
      // 6. Glow for Row 2 appears right as tool arrives
      .to([fsarcGlows[1], fsarcGrids[1]], {
        opacity: 1,
        duration: 0.8,
        ease: "power1.inOut"
      }, mob ? "move+=0.5" : `move+=${blend2Off}`)
      .to(smoothTool, {
        opacity: 1,
        zIndex: mob ? 2 : 2,
        duration: mob ? 0.1 : 0.15, // Snappy transformation
        ease: "power1.inOut"
      }, mob ? "move+=1.5" : `move+=${blend2Off}`)
      .to(roughTool, {
        opacity: 0,
        duration: 0.15, // Snappy transformation
        ease: "power1.inOut"
      }, mob ? "move+=1.5" : `move+=${blend2Off}`)
      // 7. Reveal Row 2 text (character-by-character)
      .to(rightText.querySelectorAll('span'), {
        opacity: 1,
        y: 0,
        stagger: { amount: mob ? 0.8 : 1.2 },
        duration: 0.5,
        ease: "power1.inOut"
      }, mob ? "move+=1.5" : `move+=${mob ? 1.4 : 0.9}`)

      .to({}, { duration: 1.5 }); // Significant end pause for the final result

  }


  function updateFsarc() { }

  // ═══════════════════════════════════════════════════════════
  // MACHINE PORTFOLIO - PREMIUM ANIMATIONS
  // ═══════════════════════════════════════════════════════════
  const machineItems = document.querySelectorAll('.machine-item');
  const specCountersAnimated = new Set();

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    machineItems.forEach(item => {
      const imgWrap = item.querySelector('.machine-image-wrap');
      const machineImg = item.querySelector('.machine-image');
      const machineInfo = item.querySelector('.machine-info');
      const childElements = machineInfo ? Array.from(machineInfo.children) : [];
      const imgInner = item.querySelector('.machine-image-inner');

      // 1. Initial State (Hidden for cinematic entrance)
      gsap.set(item, { opacity: 0, y: 100 });
      if (imgWrap) gsap.set(imgWrap, { opacity: 0, scale: 0.9, x: (window.innerWidth <= 1024) ? 0 : (item.id === 'machine-octomag' ? 40 : -40) });
      if (machineInfo) gsap.set(childElements, { opacity: 0, y: 30 });

      // 2. Cinematic Entrance Animation (One-time playback)
      ScrollTrigger.create({
        trigger: item,
        start: "top 85%",
        onEnter: () => {
          const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: isMobileOrTouch ? 0.6 : 1.2 } });

          tl.to(item, { opacity: 1, y: 0 })
            .to(imgWrap, { opacity: 1, scale: 1, duration: 1.4 }, "-=0.8")
            .to(childElements, { opacity: 1, y: 0, stagger: 0.1, duration: 1 }, "-=1.2");

          // Trigger counters
          item.querySelectorAll('.spec-value[data-count]').forEach(sv => {
            if (!specCountersAnimated.has(sv)) {
              specCountersAnimated.add(sv);
              setTimeout(() => animateCounter(sv), 600);
            }
          });
        },
        once: true
      });

      if (imgWrap && !isMobileOrTouch) {
        gsap.to(imgWrap, {
          scrollTrigger: {
            trigger: item,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2
          },
          y: -60,
          ease: "none"
        });
      }

      // 4. Interactive 3D Tilt — disabled on mobile (compositor issues)
      if (imgInner && !isMobileOrTouch) {
        item.addEventListener('mousemove', e => {
          const rect = item.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;

          gsap.to(imgInner, {
            rotationY: x * 12,
            rotationX: -y * 12,
            duration: 0.6,
            ease: "power2.out"
          });
        });

        item.addEventListener('mouseleave', () => {
          gsap.to(imgInner, {
            rotationY: 0,
            rotationX: 0,
            duration: 0.8,
            ease: "power3.out"
          });
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INDUSTRY CONTINUUM - DOT PROGRESS + ITEMS
  // ═══════════════════════════════════════════════════════════
  const industrySection = document.querySelector('.industry-section');
  const industryCards = document.querySelectorAll('.industry-card');

  function updateIndustries() {
    if (!industrySection) return;

    industryCards.forEach(card => {
      if (isInView(card, 0.2)) {
        card.classList.add('visible');
      }
    });
  }

  // Industry Card Hover Tilt
  industryCards.forEach(card => {
    const bg = card.querySelector('.industry-card-bg img');

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(card, {
        rotationY: x * 8,
        rotationX: -y * 8,
        duration: 0.6,
        ease: "power2.out"
      });

      if (bg) {
        gsap.to(bg, {
          x: -x * 30,
          y: -y * 30,
          scale: 1.15,
          duration: 0.8,
          ease: "power2.out"
        });
      }
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotationY: 0,
        rotationX: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      if (bg) {
        gsap.to(bg, {
          x: 0,
          y: 0,
          scale: 1.1,
          duration: 1,
          ease: "power3.out"
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // INDIA FOOTPRINT - MAP + FEATURES REVEAL
  // ═══════════════════════════════════════════════════════════
  function initIndia() {
    const indiaSection = document.querySelector('.india-section');
    if (!indiaSection) return;

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const headline = indiaSection.querySelector('.india-headline');
    const headlineSpans = headline ? headline.querySelectorAll('span') : [];
    const cards = indiaSection.querySelectorAll('.india-glass-card');
    const particleCanvas = indiaSection.querySelector('.india-particle-canvas');
    const remoteHub = indiaSection.querySelector('.remote-hub-container');

    const indiaTl = gsap.timeline({
      scrollTrigger: {
        trigger: indiaSection,
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    gsap.set(headlineSpans, { opacity: 0, y: 20 });
    gsap.set(cards, { y: 30, opacity: 0 });
    gsap.set(remoteHub, { y: 30, opacity: 0 });
    if (particleCanvas) gsap.set(particleCanvas, { opacity: 0 });

    indiaTl.to(headlineSpans, {
      opacity: 1,
      y: 0,
      stagger: isMobileOrTouch ? 0.01 : 0.03,
      duration: 0.5,
      ease: "power2.out"
    })
      .to(particleCanvas, { scale: 1, opacity: 1, duration: 1.0, ease: "power3.out" }, "-=0.3")
      .to(cards, { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power2.out" }, "-=0.7")
      .to(remoteHub, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.4");

    if (particleCanvas && !isMobileOrTouch) {
      gsap.to(particleCanvas, {
        scrollTrigger: {
          trigger: indiaSection,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        },
        y: -40,
        ease: "none"
      });
    }
  }

  function initROI() {
    const roiSection = document.getElementById('roi');
    if (!roiSection || typeof gsap === 'undefined') return;

    const headline = roiSection.querySelector('.roi-headline');
    const headlineCharacters = headline ? headline.querySelectorAll('.char') : [];
    const tagline = roiSection.querySelector('.roi-tagline');
    const roiEngine = roiSection.querySelector('.roi-engine');
    const visualPanel = roiSection.querySelector('.roi-instrument-visual');
    const tuningPanel = roiSection.querySelector('.roi-tuning-controls');
    const meterPath = document.getElementById('roi-meter-path');
    const resultItems = roiSection.querySelectorAll('.res-item');

    const inputToolCost = document.getElementById('input-tool-cost');
    const inputToolLife = document.getElementById('input-tool-life');
    const inputMachineRate = document.getElementById('input-machine-rate');

    const valToolCost = document.getElementById('val-tool-cost');
    const valToolLife = document.getElementById('val-tool-life');
    const valMachineRate = document.getElementById('val-machine-rate');

    const resSavingPercent = document.getElementById('result-saving-percent');
    const resCurrentCpp = document.getElementById('res-current-cpp');
    const resStatonCpp = document.getElementById('res-staton-cpp');
    const resMonthlyGain = document.getElementById('res-monthly-gain');

    const circumference = 2 * Math.PI * 90; // r=90

    function updateCalculator() {
      const toolCost = parseFloat(inputToolCost.value) || 0;
      const toolLife = parseFloat(inputToolLife.value) || 1;
      const machineRate = parseFloat(inputMachineRate.value) || 0;

      // Update pills
      valToolCost.textContent = toolCost.toLocaleString();
      valToolLife.textContent = toolLife.toLocaleString();
      valMachineRate.textContent = machineRate.toLocaleString();

      const lifeFactor = 5;
      const statonCostFactor = 2;

      const currentCpp = toolCost / toolLife;
      const statonCpp = (toolCost * statonCostFactor) / (toolLife * lifeFactor);
      const savingPercent = ((currentCpp - statonCpp) / currentCpp) * 100;

      const volume = 50000;
      const monthlySaving = (currentCpp - statonCpp) * volume;

      const prevVal = parseFloat(resSavingPercent.textContent) || 0;
      const obj = { val: prevVal };
      gsap.to(obj, {
        val: savingPercent,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: () => {
          resSavingPercent.textContent = Math.round(obj.val) + '%';
          // Update SVG meter
          const offset = circumference - (obj.val / 100) * circumference;
          if (meterPath) meterPath.style.strokeDashoffset = offset;
        }
      });

      resCurrentCpp.textContent = '₹ ' + currentCpp.toFixed(2);
      resStatonCpp.textContent = '₹ ' + statonCpp.toFixed(2);
      resMonthlyGain.textContent = '₹ ' + Math.round(monthlySaving).toLocaleString();
    }

    [inputToolCost, inputToolLife, inputMachineRate].forEach(input => {
      input.addEventListener('input', updateCalculator);
    });

    // Initial run
    updateCalculator();

    // Simplified Entrance Animation
    gsap.set(headlineCharacters, { opacity: 0, y: 10 });
    gsap.set(tagline, { opacity: 0 });
    gsap.set(roiEngine, { opacity: 0, y: 30 });
    gsap.set([visualPanel, tuningPanel], { opacity: 0 });
    gsap.set(resultItems, { opacity: 0, x: 20 });

    ScrollTrigger.create({
      trigger: roiSection,
      start: "top 75%",
      onEnter: () => {
        const tl = gsap.timeline();
        tl.to(headlineCharacters, { opacity: 1, y: 0, stagger: 0.01, duration: 0.6 })
          .to(tagline, { opacity: 1, duration: 0.8 }, "-=0.3")
          .to(roiEngine, { opacity: 1, y: 0, duration: 1, ease: "power2.out" }, "-=0.5")
          .to([visualPanel, tuningPanel], { opacity: 1, stagger: 0.2, duration: 0.8 }, "-=0.6")
          .to(resultItems, { opacity: 1, x: 0, stagger: 0.1, duration: 0.5 }, "-=0.4")
          .fromTo(resSavingPercent,
            { innerText: 0 },
            {
              innerText: 60,
              duration: 2,
              snap: { innerText: 1 },
              onUpdate: function () {
                resSavingPercent.textContent = Math.round(this.targets()[0].innerText) + '%';
              },
              ease: "power2.out"
            }, "-=1.2");
      },
      once: true
    });
  }

  function initClients() {
    const clientsSection = document.getElementById('clients');
    if (!clientsSection || typeof gsap === 'undefined') return;

    const cards = clientsSection.querySelectorAll('.client-card');
    const headline = clientsSection.querySelector('.clients-headline');
    const eyebrow = clientsSection.querySelector('.clients-eyebrow');
    const headlineSpans = headline ? headline.querySelectorAll('span') : [];

    // Set initial states explicitly to avoid GSAP 'from' jump/stick issues
    gsap.set(eyebrow, { y: 20, opacity: 0 });
    gsap.set(headlineSpans, { y: 20, opacity: 0 });
    gsap.set(cards, isMobileOrTouch ? { y: 20, opacity: 0 } : { y: 40, opacity: 0, scale: 0.9 });

    // Entrance animation for the whole section
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: clientsSection,
        start: "top 85%",
        toggleActions: "play none none reverse",
        onRefresh: (self) => {
          // If already scrolled past, ensure it's visible
          if (self.progress > 0) tl.progress(1);
        }
      }
    });

    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.6 })
      .to(headlineSpans, {
        opacity: 1,
        y: 0,
        stagger: 0.02,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.4")
      .to(cards, {
        y: 0,
        opacity: 1,
        scale: isMobileOrTouch ? 1 : 1,
        duration: isMobileOrTouch ? 0.4 : 0.8,
        stagger: isMobileOrTouch ? 0.03 : 0.05,
        ease: "power2.out"
      }, "-=0.3");

    // Important: Refresh after a short delay to account for logo image loads
    setTimeout(() => ScrollTrigger.refresh(), 1500);
  }

  // ═══════════════════════════════════════════════════════════
  // TOOL LIFECYCLE - MOTION PATH & SCROLLYTELLING
  // ═══════════════════════════════════════════════════════════
  const lifecycleSection = document.getElementById('lifecycle');
  if (lifecycleSection && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof MotionPathPlugin !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

    const gearWrapper = document.getElementById('lifecycle-gear');
    const gearRotator = document.getElementById('gear-rotator');
    const gearImages = document.querySelectorAll('.gear-img');
    const stages = document.querySelectorAll('.lifecycle-stage');
    // Get the correct motion path based on screen width
    const isMobilePath = window.innerWidth <= 600;
    const motionPathEl = isMobilePath ? document.getElementById('motion-path-mobile') : document.getElementById('motion-path');

    // Mobile/tablet (≤900px): CSS class drives card + text reveal — no GSAP inline styles
    // Desktop: GSAP scrub drives everything
    const useCssTextReveal = isMobileOrTouch || window.innerWidth <= 900;

    // Desktop: GSAP owns opacity so it can animate them in via the lerp timeline.
    // Mobile: CSS already has opacity:0 on .lifecycle-stage; skip gsap.set so the
    //         active-stage class can override without fighting inline styles.
    if (!useCssTextReveal) {
      gsap.set(stages, { opacity: 0, y: 50 });
    }

    // Get path length for dash animation
    let pathLength = 0;
    try { pathLength = motionPathEl.getTotalLength(); } catch (e) { pathLength = 2500; }

    gsap.set(motionPathEl, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

    gsap.set(gearWrapper, {
      motionPath: { path: motionPathEl, align: motionPathEl, alignOrigin: [0.5, 0.5], start: 0, end: 0 }
    });

    // Reveal gear + path as soon as the section enters view
    ScrollTrigger.create({
      trigger: ".lifecycle-track",
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(gearWrapper, { opacity: 1, visibility: 'visible', duration: 0.8, ease: "power2.out" });
        gsap.to(motionPathEl, { opacity: 1, duration: 0.8, ease: "power2.out" });
      }
    });

    const tlDuration = 10;

    // Build the timeline PAUSED — driven by the lerp ticker below instead of scrub.
    // This eliminates the "stuck then releases" feeling: the gear responds the instant
    // you scroll and decelerates naturally, on both mouse-wheel and touch.
    const lifecycleTl = gsap.timeline({ paused: true });

    lifecycleTl.to(motionPathEl, { strokeDashoffset: 0, duration: tlDuration, ease: "none" }, 0);

    lifecycleTl.to(gearWrapper, {
      motionPath: { path: motionPathEl, align: motionPathEl, alignOrigin: [0.5, 0.5] },
      duration: tlDuration, ease: "none", force3D: true
    }, 0);

    lifecycleTl.to(gearRotator, { rotation: 1200, duration: tlDuration, ease: "none", force3D: true }, 0);

    // Stage card animations — desktop only (mobile uses CSS active-stage class)
    const stageTimes = [0, 3.33, 6.66, 9.2];
    const stageTextThresholds = [0.04, 0.30, 0.62, 0.85];
    stages.forEach((stage, i) => {
      const title = stage.querySelector('.stage-title');
      const desc  = stage.querySelector('.stage-desc');
      const stTl  = gsap.timeline();
      if (!useCssTextReveal) {
        stTl.to(stage, { opacity: 1, y: 0, duration: 1,   ease: "power2.out" })
            .to(title, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.7")
            .to(desc,  { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
      }
      lifecycleTl.add(stTl, Math.max(0, stageTimes[i] - 0.4));
    });

    // ScrollTrigger tracks raw scroll progress only (no scrub)
    let _sp = 0, _lp = 0;
    // Lerp factor: what fraction of the remaining distance to cover each frame.
    // Desktop: 1.0 = direct pass-through (no extra smoothing).
    //   The desktop virtual scroll driver already lerps pageYOffset (factor 0.18),
    //   so _sp is itself smoothed. Adding a second lerp here caused the gear to
    //   keep running after the user stopped scrolling ("double-momentum" bug).
    //   With 1.0, _lp = _sp every frame — the gear is exactly 1:1 with scroll.
    // Mobile: 0.08 keeps the gentle glide feel that works well with touch events.
    const _lf = isMobileOrTouch ? 0.08 : 1.0;

    ScrollTrigger.create({
      trigger: ".lifecycle-track",
      start: "top center",
      end: "bottom center",
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        _sp = self.progress;

        // Gear image crossfade (real scroll position, not lerped)
        const p = self.progress;
        let si = 0;
        if (p > 0.33 && p <= 0.66) si = 1;
        else if (p > 0.66 && p <= 0.9) si = 2;
        else if (p > 0.9) si = 3;
        gearImages.forEach((img, idx) => {
          if (idx === si) img.classList.add('active');
          else img.classList.remove('active');
        });

        // Mobile/tablet: CSS-class card + text reveal (appears/disappears on scroll)
        if (useCssTextReveal) {
          stages.forEach((stage, idx) => {
            if (p >= stageTextThresholds[idx]) stage.classList.add('active-stage');
            else stage.classList.remove('active-stage');
          });
        }
      }
    });

    // Lerp ticker: every rAF frame, nudge _lp toward _sp and update the timeline.
    // Stops computing once settled (< 0.01% difference) to save CPU.
    gsap.ticker.add(() => {
      const diff = _sp - _lp;
      if (Math.abs(diff) < 0.0001) return;
      _lp += diff * _lf;
      lifecycleTl.progress(_lp);
    });
  }

  function updateLifecycle() {
    // Keep function signature for master loop, but nothing inside as GSAP is driving it
  }

  // ─── Lifecycle: IntersectionObserver failsafe (mobile) ─────────────────────
  // GSAP's ScrollTrigger is CDN-loaded and may initialise after the user has
  // already scrolled into the lifecycle section.  This lightweight observer runs
  // independently: it fires active-stage the instant each stage card enters the
  // viewport so text never waits for GSAP.  GSAP's own onUpdate will still
  // toggle the class via scroll progress — the observer just guarantees the
  // *first* reveal is never delayed by a slow CDN response.
  if (isMobileOrTouch && lifecycleSection && 'IntersectionObserver' in window) {
    const ioStages = lifecycleSection.querySelectorAll('.lifecycle-stage');
    if (ioStages.length) {
      const stageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active-stage');
            // Keep observing so GSAP can remove the class when scrolling back up;
            // the observer re-adds it if the card re-enters the viewport.
          }
        });
      }, {
        rootMargin: '0px 0px -10% 0px', // trigger slightly before bottom of viewport
        threshold: 0.15
      });

      ioStages.forEach(stage => stageObserver.observe(stage));
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  // ═══════════════════════════════════════════════════════════
  // PERFORMANCE & ROI - PROGRESS BARS
  // ═══════════════════════════════════════════════════════════
  const roiCards = document.querySelectorAll('.roi-card');
  const roiAnimated = new Set();

  function updateROI() {
    roiCards.forEach(card => {
      if (isInView(card, 0.2)) {
        if (!roiAnimated.has(card)) {
          roiAnimated.add(card);
          const progress = card.querySelector('.roi-progress');
          // Start showing progress
          if (progress) {
            const width = progress.style.width;
            progress.style.width = '0';
            setTimeout(() => {
              progress.style.width = width;
            }, 100);
          }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CONTACT FORM INTERACTIONS
  // ═══════════════════════════════════════════════════════════
  const queryOptions = document.querySelectorAll('.query-option');
  queryOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      queryOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const name = document.getElementById('field-name').value;
      const company = document.getElementById('field-company').value;
      const email = document.getElementById('field-email').value;
      const query = document.querySelector('.query-option.selected');

      if (!name || !email) {
        submitBtn.querySelector('.submit-text').textContent = 'Please fill in your details';
        setTimeout(() => {
          submitBtn.querySelector('.submit-text').textContent = 'Send Inquiry →';
        }, 2000);
        return;
      }

      submitBtn.querySelector('.submit-text').textContent = 'Sent ✓';
      submitBtn.style.borderTopColor = 'var(--green)';
      setTimeout(() => {
        submitBtn.querySelector('.submit-text').textContent = 'Send Inquiry →';
      }, 3000);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SMOOTH NAV LINK SCROLLING
  // ═══════════════════════════════════════════════════════════
  document.querySelectorAll('.nav-links-pill a, .contact-pill').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();

        // Removed hero locking logic

        const target = document.querySelector(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // HERO IMAGE SEQUENCE & SCROLL-LINKED TYPOGRAPHY
  // ═══════════════════════════════════════════════════════════
  let heroCurrentProgress = 0;
  let heroSmoothedProgress = 0;
  let heroRafRunning = false;

  const heroSection = document.getElementById('hero');
  const heroCanvas = document.getElementById('hero-canvas');
  const heroCtx = heroCanvas ? heroCanvas.getContext('2d', { alpha: false }) : null;
  const frameCount = isMobileOrTouch ? 80 : 240;
  const frames = [];
  let imagesLoaded = 0;
  let currentFrameIndex = -1;

  if (heroCanvas) {
    // High-DPI support: Use device pixel ratio but cap at 2 for performance
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    function resizeHeroCanvas() {
      heroCanvas.width = Math.round(window.innerWidth * pixelRatio);
      heroCanvas.height = Math.round(window.innerHeight * pixelRatio);
      heroCanvas.style.width = window.innerWidth + 'px';
      heroCanvas.style.height = window.innerHeight + 'px';
      if (currentFrameIndex >= 0) drawHeroFrame(currentFrameIndex);
    }
    window.addEventListener('resize', resizeHeroCanvas);
    resizeHeroCanvas();
  }
  // Preload frames logic
  const heroLoader = document.getElementById('hero-loader');
  const loaderLogo = document.getElementById('loader-logo');
  const navLogo = document.querySelector('.nav-logo');
  const floatingNav = document.getElementById('floating-nav');
  const loadThreshold = isMobileOrTouch
    ? Math.floor(frameCount * 0.25)
    : Math.floor(frameCount * 0.35);
  const minIntroTime = isMobileOrTouch ? 1500 : 3000;
  const startTime = Date.now();
  let isHeroReady = false;

  // - SMART PRELOADER: Skip only when navigating back from another page on this site -
  // Uses Navigation API to detect reload vs internal link navigation
  const navEntry = performance.getEntriesByType('navigation')[0];
  const isReload = navEntry && navEntry.type === 'reload';
  const isSameSite = document.referrer && (() => {
    try { return new URL(document.referrer).origin === window.location.origin; } catch (e) { return false; }
  })();
  // Skip preloader ONLY when coming from another page on this site (not a refresh)
  const skipPreloader = isSameSite && !isReload;

  if (skipPreloader && heroLoader) {
    // - SKIP PRELOADER: Instant reveal for return visits -
    isHeroReady = true;
    heroLoader.classList.add('hidden');
    if (navLogo) navLogo.classList.remove('hidden');
    document.body.classList.remove('loading');

    // Still load hero frames in background, but don't gate on them
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const numStr = isMobileOrTouch
        ? (((i - 1) * 3) + 1).toString().padStart(3, '0')
        : i.toString().padStart(3, '0');
      img.src = `assets/hero/ezgif-frame-${numStr}_converted.webp`;
      img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 1 && currentFrameIndex < 0) {
          currentFrameIndex = 0;
          drawHeroFrame(0);
        }
      };
      frames.push(img);
    }
  } else if (heroLoader) {
    // - FIRST VISIT: Full cinematic preloader -
    // The loading class is already handled in HTML.

    // 1. Start Initial Bloom immediately (Slow & Cinematic)
    if (loaderLogo) {
      gsap.to(loaderLogo, {
        opacity: 1,
        scale: 1,
        filter: "none",
        duration: 2.8,
        ease: "power2.out"
      });

      // Animate the outer glow bloom
      gsap.fromTo('.loader-bloom',
        { opacity: 0, scale: 0.5 },
        {
          opacity: 0,
          scale: 1.5,
          duration: 2.5,
          ease: "power2.out",
          onComplete: () => {
            // Subtle pulse after initial bloom
            gsap.to('.loader-bloom', {
              opacity: 0,
              scale: 1.3,
              duration: 2,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut"
            });
          }
        }
      );
    }

    function checkReadiness() {
      const elapsed = Date.now() - startTime;
      if (imagesLoaded >= loadThreshold && elapsed >= minIntroTime && !isHeroReady) {
        triggerTransition();
      } else if (!isHeroReady) {
        // If not ready yet, check again in a bit
        setTimeout(checkReadiness, 100);
      }
    }

    function triggerTransition() {
      isHeroReady = true;



      // Cinematic Transition
      const tl = gsap.timeline({
        onComplete: () => {
          if (navLogo) navLogo.classList.remove('hidden');
          if (heroLoader) heroLoader.classList.add('hidden');
          // loading class removal moved to timeline for better sync
        }
      });

      // 2. Animate logo to Nav position (Top Left) & Fade Background TOGETHER
      if (loaderLogo && navLogo) {
        const targetRect = navLogo.getBoundingClientRect();
        const currentRect = loaderLogo.getBoundingClientRect();

        const dx = targetRect.left - currentRect.left;
        const dy = targetRect.top - currentRect.top;

        // Stop any active pulse animations on the bloom
        gsap.killTweensOf('.loader-bloom');

        // Sync background fade, bloom removal, and logo travel
        // Faster fade and scale-down for the bloom to ensure it doesn't linger
        tl.to('.loader-bloom', { opacity: 0, scale: 0.1, duration: 0.5, ease: "power2.in" }, "start");
        tl.to(heroLoader, { background: 'rgba(0,0,0,0)', duration: 1.2, ease: "power3.inOut" }, "start");
        tl.to(loaderLogo, {
          x: dx,
          y: dy,
          filter: "drop-shadow(0 0 0px rgba(7, 146, 58, 0))", // Instantly start fading the glow
          duration: 2.0,
          ease: "expo.inOut"
        }, "start");

        // Trigger floating nav animation so it finishes exactly when the logo arrives
        tl.call(() => {
          document.body.classList.remove('loading');
        }, null, "start+=1.2");
      }

      // Force an initial draw
      const idx = currentFrameIndex >= 0 ? currentFrameIndex : 0;
      currentFrameIndex = idx;
      drawHeroFrame(idx);
    }

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const numStr = isMobileOrTouch
        ? (((i - 1) * 3) + 1).toString().padStart(3, '0')
        : i.toString().padStart(3, '0');
      img.src = `assets/hero/ezgif-frame-${numStr}_converted.webp`;
      img.onload = () => {
        imagesLoaded++;
        checkReadiness();
      };
      frames.push(img);
    }
  } else {
    // No hero loader (subpage)
    document.body.classList.remove('loading');
  }

  // Optimized drawing with double-buffering to eliminate flicker
  const bufferCanvas = document.createElement('canvas');
  const bufferCtx = bufferCanvas.getContext('2d');

  // Set high-quality smoothing for both contexts
  if (heroCtx) {
    heroCtx.imageSmoothingEnabled = true;
    heroCtx.imageSmoothingQuality = 'high';
  }
  if (bufferCtx) {
    bufferCtx.imageSmoothingEnabled = true;
    bufferCtx.imageSmoothingQuality = 'high';
  }

  function drawHeroFrame(index) {
    if (!heroCtx || !isHeroReady) return;
    const img = frames[index];
    if (!img || !img.complete) return;

    const cw = heroCanvas.width;
    const ch = heroCanvas.height;

    // Sync buffer size
    if (bufferCanvas.width !== cw || bufferCanvas.height !== ch) {
      bufferCanvas.width = cw;
      bufferCanvas.height = ch;
    }

    const iw = img.width || 1920;
    const ih = img.height || 1080;

    let scale = Math.min(cw / iw, ch / ih);

    // Scale image up on mobile breakpoints
    if (window.innerWidth <= 1024) {
      scale *= 1.20;
    }

    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;

    // Draw to buffer
    bufferCtx.fillStyle = '#000000';
    bufferCtx.fillRect(0, 0, cw, ch);
    // Crop 2 pixels from the bottom of the source image to remove white edge artifacts
    const cropBottom = 2;
    bufferCtx.drawImage(img, 0, 0, iw, ih - cropBottom, sx, sy, sw, sh - (cropBottom * scale));

    // Apply strict black gradient at the bottom specifically for mobile
    if (window.innerWidth <= 1024) {
      const gradHeight = ch * 0.45; // Cover bottom 45% of the screen
      const gradY = ch - gradHeight;
      const grad = bufferCtx.createLinearGradient(0, gradY, 0, ch);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.3, "rgba(0,0,0,0.6)");
      grad.addColorStop(0.6, "rgba(0,0,0,0.98)");
      grad.addColorStop(1, "rgba(0,0,0,1)");

      bufferCtx.fillStyle = grad;
      bufferCtx.fillRect(0, gradY, cw, gradHeight);
    }

    // Draw buffer to main canvas in one atomic operation
    heroCtx.drawImage(bufferCanvas, 0, 0);
  }

  const chapter1 = document.getElementById('chapter-1');
  const chapter2 = document.getElementById('chapter-2');
  const chapter3 = document.getElementById('chapter-3');


  function updateHeroSequence(progress) {
    if (!heroSection || !heroCanvas) return;
    progress = clamp(progress, 0, 1);

    // Use round for smoother frame selection; avoids premature jumps
    const targetFrameIndex = Math.min(frameCount - 1, Math.round(progress * (frameCount - 1)));
    if (targetFrameIndex !== currentFrameIndex && imagesLoaded > 0) {
      currentFrameIndex = targetFrameIndex;
      drawHeroFrame(currentFrameIndex);
    }

    const setChapterState = (chapter, isActive, pSub) => {
      if (!chapter) return;
      if (isActive) {
        // Original block animation for both desktop and mobile
        if (pSub < 0.2 && chapter !== chapter1) {
          const t = pSub / 0.2;
          chapter.style.opacity = t;
          chapter.style.transform = `translateY(${50 * (1 - t)}px)`;
        } else if (pSub > 0.8) {
          const t = (pSub - 0.8) / 0.2;
          chapter.style.opacity = (1 - t);
          chapter.style.transform = `translateY(${-50 * t}px)`;
        } else {
          chapter.style.opacity = 1;
          chapter.style.transform = `translateY(0px)`;
        }
      } else {
        chapter.style.opacity = 0;
      }
    };

    if (progress < 0.3) {
      setChapterState(chapter1, true, mapRange(progress, 0, 0.3, 0, 1));
      setChapterState(chapter2, false, 0);
      setChapterState(chapter3, false, 0);
    } else if (progress >= 0.3 && progress < 0.6) {
      setChapterState(chapter1, false, 0);
      setChapterState(chapter2, true, mapRange(progress, 0.3, 0.6, 0, 1));
      setChapterState(chapter3, false, 0);
    } else {
      setChapterState(chapter1, false, 0);
      setChapterState(chapter2, false, 0);
      const p3 = mapRange(progress, 0.6, 0.95, 0, 1);
      if (progress < 0.95) {
        setChapterState(chapter3, true, p3);
      } else {
        if (chapter3) {
          chapter3.style.opacity = 0;
        }
      }
    }


  }


  // ═══════════════════════════════════════════════════════════
  // VIRTUAL SCROLL DRIVER
  // On desktop: wheel / keyboard feed targetScrollY directly and
  // window.scrollTo(0, Math.round(scrollY)) in the RAF loop drives
  // the page.  GSAP's ScrollTrigger then reads a smoothly-moving
  // pageYOffset instead of 100 px jumps, so the hero pin/unpin
  // boundary is crossed gradually — no glitch, no stuck frames.
  // Overflow containers (dropdowns, modals) are exempted so they
  // still scroll normally.  Mobile keeps the original passive listener.
  // ═══════════════════════════════════════════════════════════
  if (isMobileOrTouch) {
    window.addEventListener('scroll', () => {
      targetScrollY = window.pageYOffset || document.documentElement.scrollTop;
    }, { passive: true });
  } else {
    // Emergency resync: if something external (hash nav, GSAP refresh,
    // programmatic scrollTo) moves pageYOffset far from our driven value,
    // snap all three scroll vars back into sync so nothing gets lost.
    window.addEventListener('scroll', () => {
      const actual = window.pageYOffset;
      if (Math.abs(actual - Math.round(scrollY)) > 200) {
        targetScrollY = actual;
        scrollY      = actual;
        heroScrollY  = actual;
      }
    }, { passive: true });

    // True when el lives inside a scrollable overflow container
    function hasScrollableParent(el) {
      while (el && el !== document.documentElement) {
        const s = window.getComputedStyle(el);
        if (/auto|scroll/.test(s.overflow + s.overflowY) && el.scrollHeight > el.clientHeight) return true;
        el = el.parentElement;
      }
      return false;
    }

    const PAGE_STEP = Math.round(window.innerHeight * 0.85);

    // Wheel → accumulate into targetScrollY, suppress the native 100 px jump
    window.addEventListener('wheel', (e) => {
      if (hasScrollableParent(e.target)) return; // dropdowns / modals scroll normally
      e.preventDefault();
      const max = document.documentElement.scrollHeight - window.innerHeight;
      targetScrollY = Math.max(0, Math.min(max,
        targetScrollY + (e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY)
      ));
    }, { passive: false });

    // Keyboard → route Space / PgDn / PgUp / arrows / Home / End through targetScrollY
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.activeElement && document.activeElement.isContentEditable) return;
      if (hasScrollableParent(document.activeElement)) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      switch (e.key) {
        case 'ArrowDown': targetScrollY = Math.min(max, targetScrollY + 80);        e.preventDefault(); break;
        case 'ArrowUp':   targetScrollY = Math.max(0,   targetScrollY - 80);        e.preventDefault(); break;
        case 'PageDown':  targetScrollY = Math.min(max, targetScrollY + PAGE_STEP); e.preventDefault(); break;
        case 'PageUp':    targetScrollY = Math.max(0,   targetScrollY - PAGE_STEP); e.preventDefault(); break;
        case ' ':
          if (!e.shiftKey) targetScrollY = Math.min(max, targetScrollY + PAGE_STEP);
          else             targetScrollY = Math.max(0,   targetScrollY - PAGE_STEP);
          e.preventDefault(); break;
        case 'Home': targetScrollY = 0;   e.preventDefault(); break;
        case 'End':  targetScrollY = max; e.preventDefault(); break;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // MASTER SCROLL & ANIMATION LOOP
  // ═══════════════════════════════════════════════════════════
  let rafId;

  let _lastUpdateTime = 0;
  function animate(time) {
    rafId = requestAnimationFrame(animate);

    // Smooth scroll interpolation
    scrollY += (targetScrollY - scrollY) * (isMobileOrTouch ? 0.25 : 0.18);
    // Hero gets its own slower lerp so mouse-wheel jumps animate as smoothly as touchpad
    heroScrollY += (targetScrollY - heroScrollY) * (isMobileOrTouch ? 0.25 : 0.1);

    // On desktop, feed GSAP our lerped scrollY so pin/unpin crossings are
    // gradual (no stuck / glitch at the hero → next-section boundary).
    if (!isMobileOrTouch) {
      window.scrollTo(0, Math.round(scrollY));
    }

    // Always update nav (lightweight)
    updateNav();

    // Hero frame animation — driven by smoothed heroScrollY, not GSAP scrub
    if (window._updateHeroFromScroll) window._updateHeroFromScroll();

    // Throttle expensive updates on mobile to ~30fps
    if (!isMobileOrTouch || (time - _lastUpdateTime > 33)) {
      _lastUpdateTime = time;
      updateParallaxGrid();
      updateIndustries();
      updateLifecycle();
      if (window._drawBackground) {
        window._drawBackground(time);
      }
    }
  }

  // Setup GSAP ScrollTrigger for Hero Scrollytelling
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && heroSection) {
    gsap.registerPlugin(ScrollTrigger);

    const heroTrigger = ScrollTrigger.create({
      trigger: heroSection,
      start: "top top",
      end: isMobileOrTouch ? "+=200%" : "+=250%",
      pin: true,
      // No scrub — animation is driven manually in the RAF loop via heroScrollY
      // so mouse-wheel large jumps are smoothed the same way touchpad is.
      anticipatePin: isMobileOrTouch ? 0 : 1,
      refreshPriority: 1,
      onLeave: () => {
        nav.classList.add('out-of-hero');
      },
      onEnterBack: () => {
        nav.classList.remove('out-of-hero');
      }
    });

    // Drive hero frame animation from the RAF loop using heroScrollY.
    // heroTrigger.start/end are in raw scroll-pixel coordinates.
    window._updateHeroFromScroll = function () {
      if (!heroTrigger || heroTrigger.end <= heroTrigger.start) return;
      const progress = Math.max(0, Math.min(1,
        (heroScrollY - heroTrigger.start) / (heroTrigger.end - heroTrigger.start)
      ));
      updateHeroSequence(progress);
    };

    // Initialize first frame
    updateHeroSequence(0);
  }

  targetScrollY = window.pageYOffset || document.documentElement.scrollTop;
  scrollY = targetScrollY;
  heroScrollY = targetScrollY;
  animate(0);

  function initCTA() {
    const section = document.querySelector('.contact-section');
    if (!section || typeof gsap === 'undefined') return;

    const content = section.querySelector('.cta-content-wrapper');
    const headline = section.querySelector('.contact-headline');
    const sub = section.querySelector('.contact-sub');
    const features = section.querySelector('.contact-features');
    const buttons = section.querySelectorAll('.cta-btn');
    const form = section.querySelector('.form-glass-wrapper');

    // --- Form Submission Logic (WhatsApp Redirect) ---
    const contactForm = section.querySelector('#contact-form');
    const submitBtn = section.querySelector('#submit-btn');
    if (contactForm && submitBtn) {
      submitBtn.addEventListener('click', () => {
        const name = document.getElementById('field-name')?.value || '';
        const company = document.getElementById('field-company')?.value || '';
        const email = document.getElementById('field-email')?.value || '';
        const selectedOption = contactForm.querySelector('.query-option.active');
        const inquiryType = selectedOption ? selectedOption.innerText.trim() : 'General Inquiry';
        const textEl = submitBtn.querySelector('.submit-text');

        if (!name || !email) {
          if (textEl) textEl.textContent = 'Please fill name and email';
          gsap.fromTo(submitBtn, { x: -5 }, { x: 5, duration: 0.08, repeat: 5, yoyo: true, onComplete: () => gsap.set(submitBtn, { x: 0 }) });
          setTimeout(() => { if (textEl) textEl.textContent = 'Send Inquiry →'; }, 2500);
          return;
        }

        const waMessage = `New Inquiry from Staton Website:\n\n*Name:* ${name}\n*Company:* ${company}\n*Email:* ${email}\n*Looking for:* ${inquiryType}`;
        const waUrl = `https://wa.me/918390952895?text=${encodeURIComponent(waMessage)}`;

        if (textEl) textEl.textContent = 'Redirecting...';
        gsap.to(submitBtn, { scale: 0.95, duration: 0.2, yoyo: true, repeat: 1 });

        setTimeout(() => {
          window.open(waUrl, '_blank');
          if (textEl) textEl.textContent = 'Sent ✓';
          setTimeout(() => { if (textEl) textEl.textContent = 'Send Inquiry →'; }, 3000);
        }, 800);
      });

      const options = contactForm.querySelectorAll('.query-option');
      options.forEach(opt => {
        opt.addEventListener('click', () => {
          options.forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
        });
      });
    }

    gsap.set(section, { opacity: 0 });
    gsap.set([headline, sub, features, form], { y: 60, opacity: 0 });
    gsap.set(buttons, { y: 40, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 75%",
        toggleActions: "play none none reverse"
      }
    });

    tl.fromTo(section, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" })
      .to([headline, form], { y: 0, opacity: 1, duration: 1, ease: "power4.out" }, "-=0.8")
      .to(sub, { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.7")
      .to(features, { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.7")
      .to(buttons, { y: 0, opacity: 1, stagger: 0.15, duration: 0.8, ease: "back.out(1.7)" }, "-=0.6");
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIVE PAGE INDICATOR & MAGNETIC SLIDING NAV
  // ═══════════════════════════════════════════════════════════
  function initActiveNav() {
    const navContainer = document.querySelector('.floating-nav');
    if (!navContainer) return;

    const pill = navContainer.querySelector('.nav-links-pill');
    const contactPill = navContainer.querySelector('.contact-pill');
    if (!pill) return;

    // 1. Detect Active Link
    const currentPath = window.location.pathname;
    const links = pill.querySelectorAll('a');
    let activeLink = null;

    const currentName = currentPath.split('/').pop().replace('.html', '') || 'index';

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const pageName = href.split('/').pop().replace('.html', '') || 'index';
      if (pageName === currentName) {
        link.classList.add('active');
        activeLink = link;
      }
    });

    if (contactPill) {
      const href = contactPill.getAttribute('href');
      if (href) {
        const pageName = href.split('/').pop().replace('.html', '') || 'index';
        if (pageName === currentName) {
          contactPill.classList.add('active');
          // Note: contactPill is handled by CSS active styles, 
          // but we track it to avoid indicator staying on a random nav link
        }
      }
    }

    // 2. Setup Sliding Indicator
    if (typeof gsap === 'undefined') return;

    let indicator = pill.querySelector('.nav-hover-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'nav-hover-indicator';
      pill.prepend(indicator);
    }

    function moveIndicator(el, fast = false) {
      const parentLi = el.closest('li');
      if (!parentLi) return;

      const targetX = parentLi.offsetLeft;
      const targetW = parentLi.offsetWidth;

      if (fast) {
        gsap.set(indicator, { x: targetX, width: targetW, opacity: 1, skewX: 0 });
        return;
      }

      const currentX = gsap.getProperty(indicator, "x");
      const deltaX = targetX - currentX;

      // Flowy movement: Leaning into the direction of travel (Skew)
      const skewAmt = Math.max(Math.min(deltaX * 0.15, 15), -15);

      gsap.to(indicator, {
        x: targetX,
        width: targetW,
        duration: 0.5,
        ease: "power3.out",
        overwrite: true
      });

      // The "liquidy" momentum part
      gsap.to(indicator, {
        skewX: skewAmt,
        duration: 0.25,
        ease: "power1.out",
        onComplete: () => {
          gsap.to(indicator, {
            skewX: 0,
            duration: 0.6,
            ease: "elastic.out(1, 0.4)"
          });
        }
      });
    }

    // Initial positioning
    if (activeLink) {
      setTimeout(() => moveIndicator(activeLink, true), 50);
    }

    // Hover listeners
    links.forEach(link => {
      link.addEventListener('mouseenter', () => moveIndicator(link));
    });

    pill.addEventListener('mouseleave', () => {
      if (activeLink) {
        moveIndicator(activeLink);
      } else {
        gsap.to(indicator, { opacity: 0, duration: 0.4 });
      }
    });

    // Refresh on resize
    window.addEventListener('resize', () => {
      if (activeLink) moveIndicator(activeLink, true);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // WORKSHOPS & CONFERENCES — SCROLL ENTRANCE ANIMATIONS
  // ═══════════════════════════════════════════════════════════
  function initEvents() {
    const eventsSection = document.getElementById('events');
    if (!eventsSection) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const headline = eventsSection.querySelector('.events-headline');
    const subtext  = eventsSection.querySelector('.events-subtext');
    const cards    = eventsSection.querySelectorAll('.event-card');
    const ctaRow   = eventsSection.querySelector('.events-cta-row');

    // — Header: headline + subtext fade-up
    if (headline) {
      gsap.set(headline, { opacity: 0, y: 40 });
      ScrollTrigger.create({
        trigger: eventsSection,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(headline, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
          if (subtext) {
            gsap.to(subtext, { opacity: 1, duration: 0.8, delay: 0.18, ease: 'power3.out' });
          }
        }
      });
    }

    // — Cards: staggered translateY reveal (mimics industry-card pattern)
    if (cards.length) {
      cards.forEach((card, i) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: isMobileOrTouch ? 0.55 : 0.8,
              delay: isMobileOrTouch ? 0 : i * 0.12,
              ease: 'power3.out',
              onStart: () => card.classList.add('visible')
            });
          }
        });
      });
    }

    // — "More Events" button fade-up
    if (ctaRow) {
      gsap.set(ctaRow, { opacity: 0, y: 24 });
      ScrollTrigger.create({
        trigger: ctaRow,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          gsap.to(ctaRow, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
        }
      });
    }
  }

  // Initialize Sections
  initIndia();
  initROI();
  initClients();
  initEvents();
  initCTA();
  initActiveNav();

  // Final synchronization
  window.addEventListener('load', () => {
    ScrollTrigger.refresh(true);
  });

  // Handle mobile orientation changes
  window.addEventListener('orientationchange', () => {
    setTimeout(() => ScrollTrigger.refresh(true), 400);
  });

  // Re-refresh after images load
  setTimeout(() => ScrollTrigger.refresh(true), 500);

  // Scroll to Top Button functionality
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  const whatsappBtn = document.querySelector('.whatsapp-fab');
  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 500) {
        scrollToTopBtn.classList.add('visible');
        if (whatsappBtn) whatsappBtn.classList.add('has-scroll-top');
      } else {
        scrollToTopBtn.classList.remove('visible');
        if (whatsappBtn) whatsappBtn.classList.remove('has-scroll-top');
      }
    }, { passive: true });

    scrollToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isMobileOrTouch) {
        targetScrollY = 0; // RAF lerp handles the smooth ride
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '#top') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const navHeight = 80;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;
        if (!isMobileOrTouch) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          targetScrollY = Math.max(0, Math.min(max, targetPosition));
        } else {
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
      }
    });
  });

})();
