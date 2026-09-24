/**
 * Neo-Brutalist TargetCursor Component (React Bits JS/CSS Variant)
 * Theme: Marvel Infinity Stones Neo-Brutalism
 * Pure GSAP Ticker-Driven Lock-On Architecture
 */

const gsap = typeof window !== 'undefined' ? window.gsap : null;

// Resolve containing block offsets for position: fixed elements
const getContainingBlock = (element) => {
  let node = element?.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (
      style.transform !== 'none' ||
      style.perspective !== 'none' ||
      style.filter !== 'none' ||
      style.willChange.includes('transform') ||
      style.willChange.includes('perspective') ||
      style.willChange.includes('filter') ||
      /paint|layout|strict|content/.test(style.contain)
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

const getContainingBlockOffset = (block) => {
  if (!block) return { x: 0, y: 0 };
  const rect = block.getBoundingClientRect();
  return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
};

export class TargetCursor {
  constructor(options = {}) {
    this.targetSelector = options.targetSelector || [
      // Primary Action Buttons & Links
      'button',
      '.btn',
      '.btn-brutal',
      '.btn-claim-stone',
      '.stack-ctrl-btn',
      'a',
      'a.btn-brutal',
      'a.brand-logo',
      'nav.nav-links a',
      '.footer-links a',
      '#open-leader-btn',
      '.nav-toggle-btn',
      '.modal-close',
      '#modal-close-btn',
      '#leader-modal-close-btn',
      '#toast-close',

      // Large & Medium Cards
      '.plan-card',
      '.rule-box',
      '.wanted-poster',
      '.stat-tile',
      '.stone-card',
      '.bounty-card',
      '.prize-poster',
      '.ps-card',
      '.faq-item',
      '.hero-monolith-card',
      '.modal-box',
      '.card-ps-preview-box',
      '.card-arsenal-box',
      '.admin-stat-card',

      // Smaller Divs, Badges, Chips, Pills & Timer Units
      '.clock-unit-box',
      '.hero-micro-stat',
      '.hero-tag-pill',
      '.arsenal-pill',
      '.portal-room-pill',
      '.hero-stone-chip',
      '.stamp-badge',
      '.wanted-stamp-red',
      '.wanted-badge-header',
      '.brand-box',
      '.stack-auto-status',
      '.stack-tab-stamp',
      '.countdown-stamp',
      '.hero-clearance-stamp',
      '.badge-domain',
      '.room-badge',
      '.payment-badge',
      '.cursor-target',

      // Form Controls
      'input',
      'select',
      'textarea'
    ].join(', ');

    this.spinDuration = options.spinDuration !== undefined ? options.spinDuration : 2;
    this.hideDefaultCursor = options.hideDefaultCursor !== undefined ? options.hideDefaultCursor : true;
    this.hoverDuration = options.hoverDuration !== undefined ? options.hoverDuration : 0.2;
    this.parallaxOn = options.parallaxOn !== undefined ? options.parallaxOn : true;
    this.cursorColor = options.cursorColor || '#ffffff';
    this.cursorColorOnTarget = options.cursorColorOnTarget;

    this.constants = {
      borderWidth: 3.5,
      cornerSize: 14,
      targetPadding: 4
    };

    this.cursor = null;
    this.dot = null;
    this.corners = [];
    this.spinTl = null;
    this.containingBlock = null;

    this.isActive = false;
    this.activeTarget = null;
    this.targetCornerPositions = null;
    this.activeStrength = { current: 0 };
    this.currentLeaveHandler = null;
    this.resumeTimeout = null;

    this.isMobile = this.checkMobile();

    if (!this.isMobile && typeof document !== 'undefined') {
      this.init();
    }
  }

  checkMobile() {
    if (typeof window === 'undefined') return false;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    return (hasTouchScreen && isSmallScreen) || mobileRegex.test(userAgent.toLowerCase());
  }

  getIdlePositions() {
    const { cornerSize } = this.constants;
    return [
      { x: -cornerSize * 1.4, y: -cornerSize * 1.4 }, // Top-Left
      { x: cornerSize * 0.4, y: -cornerSize * 1.4 },  // Top-Right
      { x: cornerSize * 0.4, y: cornerSize * 0.4 },   // Bottom-Right
      { x: -cornerSize * 1.4, y: cornerSize * 0.4 }   // Bottom-Left
    ];
  }

  init() {
    const _gsap = window.gsap || gsap;
    if (!_gsap) {
      console.warn('[TargetCursor] GSAP animation engine not available.');
      return;
    }

    // Build DOM structure
    this.cursor = document.createElement('div');
    this.cursor.className = 'target-cursor-wrapper';
    this.cursor.setAttribute('aria-hidden', 'true');

    this.dot = document.createElement('div');
    this.dot.className = 'target-cursor-dot';
    this.cursor.appendChild(this.dot);

    const cornerClasses = ['corner-tl', 'corner-tr', 'corner-br', 'corner-bl'];
    const idlePositions = this.getIdlePositions();

    this.corners = cornerClasses.map((cls, i) => {
      const corner = document.createElement('div');
      corner.className = `target-cursor-corner ${cls}`;
      this.cursor.appendChild(corner);
      _gsap.set(corner, { x: idlePositions[i].x, y: idlePositions[i].y });
      return corner;
    });

    document.body.appendChild(this.cursor);

    if (this.hideDefaultCursor) {
      document.body.classList.add('target-cursor-active');
    }

    this.containingBlock = getContainingBlock(this.cursor);
    const getOffset = () => getContainingBlockOffset(this.containingBlock);
    const initialOffset = getOffset();

    _gsap.set(this.cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2 - initialOffset.x,
      y: window.innerHeight / 2 - initialOffset.y
    });

    // Infinite gentle radar sweep
    this.createSpinTimeline();

    // Bind event handlers
    this.bindEvents(getOffset);
  }

  createSpinTimeline() {
    const _gsap = window.gsap || gsap;
    if (this.spinTl) {
      this.spinTl.kill();
    }
    this.spinTl = _gsap
      .timeline({ repeat: -1 })
      .to(this.cursor, { rotation: '+=360', duration: this.spinDuration, ease: 'none' });
  }

  detectBackgroundTheme(x, y) {
    if (!this.cursor) return;
    const now = performance.now();
    if (this._lastThemeCheck && now - this._lastThemeCheck < 35) return;
    this._lastThemeCheck = now;

    const el = document.elementFromPoint(x, y);
    if (!el) return;

    let node = el;
    let bg = null;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const c = style.backgroundColor;
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') {
        bg = c;
        break;
      }
      node = node.parentElement;
    }

    let theme = 'light';
    if (bg) {
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        if (r > 200 && g > 170 && b < 80) {
          theme = 'yellow';
        } else {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < 110) {
            theme = 'dark';
          }
        }
      }
    }

    if (this._currentTheme !== theme) {
      this._currentTheme = theme;
      this.cursor.classList.toggle('cursor-theme-dark', theme === 'dark');
      this.cursor.classList.toggle('cursor-theme-yellow', theme === 'yellow');
      this.cursor.classList.toggle('cursor-theme-light', theme === 'light');
    }
  }

  lockToTarget(target, getOffset) {
    if (!target || !this.cursor || !this.corners.length) return;
    if (this.activeTarget === target) return;

    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }

    const _gsap = window.gsap || gsap;
    this.activeTarget = target;
    this.cursor.classList.add('is-targeting');

    this.corners.forEach((corner) => _gsap.killTweensOf(corner, 'x,y'));
    _gsap.killTweensOf(this.cursor, 'rotation');
    this.spinTl?.pause();
    _gsap.set(this.cursor, { rotation: 0 });

    if (this.cursorColorOnTarget) {
      _gsap.to(this.corners, {
        borderColor: this.cursorColorOnTarget,
        duration: 0.15,
        ease: 'power2.out'
      });
      if (this.dot) {
        _gsap.to(this.dot, {
          backgroundColor: this.cursorColorOnTarget,
          duration: 0.15,
          ease: 'power2.out'
        });
      }
    }

    const rect = target.getBoundingClientRect();
    const { borderWidth, cornerSize, targetPadding } = this.constants;
    const pad = targetPadding || 4;
    const { x: offsetX, y: offsetY } = getOffset();
    const cursorX = _gsap.getProperty(this.cursor, 'x');
    const cursorY = _gsap.getProperty(this.cursor, 'y');

    this.targetCornerPositions = [
      { x: rect.left - pad - borderWidth - offsetX, y: rect.top - pad - borderWidth - offsetY },
      { x: rect.right + pad + borderWidth - cornerSize - offsetX, y: rect.top - pad - borderWidth - offsetY },
      { x: rect.right + pad + borderWidth - cornerSize - offsetX, y: rect.bottom + pad + borderWidth - cornerSize - offsetY },
      { x: rect.left - pad - borderWidth - offsetX, y: rect.bottom + pad + borderWidth - cornerSize - offsetY }
    ];

    this.isActive = true;
    _gsap.ticker.add(this.tickerFn);

    _gsap.to(this.activeStrength, {
      current: 1,
      duration: this.hoverDuration,
      ease: 'power2.out'
    });

    this.corners.forEach((corner, i) => {
      _gsap.to(corner, {
        x: this.targetCornerPositions[i].x - cursorX,
        y: this.targetCornerPositions[i].y - cursorY,
        duration: 0.2,
        ease: 'power2.out'
      });
    });
  }

  unlockTarget() {
    if (!this.isActive && !this.activeTarget) return;

    const _gsap = window.gsap || gsap;
    _gsap.ticker.remove(this.tickerFn);

    this.isActive = false;
    this.cursor.classList.remove('is-targeting');
    this.targetCornerPositions = null;
    _gsap.set(this.activeStrength, { current: 0, overwrite: true });
    this.activeTarget = null;

    if (this.cursorColorOnTarget && this.corners.length) {
      _gsap.to(this.corners, {
        borderColor: this.cursorColor,
        duration: 0.15,
        ease: 'power2.out'
      });
      if (this.dot) {
        _gsap.to(this.dot, {
          backgroundColor: this.cursorColor,
          duration: 0.15,
          ease: 'power2.out'
        });
      }
    }

    if (this.corners.length) {
      this.corners.forEach((corner) => _gsap.killTweensOf(corner, 'x,y'));
      const positions = this.getIdlePositions();
      const tl = _gsap.timeline();
      this.corners.forEach((corner, index) => {
        tl.to(
          corner,
          {
            x: positions[index].x,
            y: positions[index].y,
            duration: 0.3,
            ease: 'power3.out'
          },
          0
        );
      });
    }

    // Smooth spin resume
    this.resumeTimeout = setTimeout(() => {
      if (!this.activeTarget && this.cursor && this.spinTl) {
        const currentRotation = _gsap.getProperty(this.cursor, 'rotation');
        const normalizedRotation = currentRotation % 360;
        this.spinTl.kill();
        this.spinTl = _gsap
          .timeline({ repeat: -1 })
          .to(this.cursor, { rotation: '+=360', duration: this.spinDuration, ease: 'none' });
        _gsap.to(this.cursor, {
          rotation: normalizedRotation + 360,
          duration: this.spinDuration * (1 - normalizedRotation / 360),
          ease: 'none',
          onComplete: () => {
            this.spinTl?.restart();
          }
        });
      }
      this.resumeTimeout = null;
    }, 50);
  }

  bindEvents(getOffset) {
    const _gsap = window.gsap || gsap;

    // 1. Smooth Mouse Follow + Dynamic Target Lock-On
    this.moveHandler = (e) => {
      if (!this.cursor) return;
      const { x: offsetX, y: offsetY } = getOffset();
      _gsap.to(this.cursor, {
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
        duration: 0.1,
        ease: 'power3.out'
      });
      this.detectBackgroundTheme(e.clientX, e.clientY);

      // Dynamically detect element under mouse
      const el = document.elementFromPoint(e.clientX, e.clientY);
      let target = null;
      let cur = el;
      while (cur && cur !== document.body) {
        if (cur.matches && cur.matches(this.targetSelector)) {
          target = cur;
          break;
        }
        cur = cur.parentElement;
      }

      if (target) {
        if (this.activeTarget !== target) {
          this.lockToTarget(target, getOffset);
        }
      } else if (this.activeTarget) {
        this.unlockTarget();
      }
    };
    window.addEventListener('mousemove', this.moveHandler, { passive: true });

    // 2. Continuous Parallax Ticker while targeting
    this.tickerFn = () => {
      if (!this.targetCornerPositions || !this.cursor || !this.corners.length) return;

      const strength = this.activeStrength.current;
      if (strength === 0) return;

      const cursorX = _gsap.getProperty(this.cursor, 'x');
      const cursorY = _gsap.getProperty(this.cursor, 'y');

      this.corners.forEach((corner, i) => {
        const currentX = _gsap.getProperty(corner, 'x');
        const currentY = _gsap.getProperty(corner, 'y');

        const targetX = this.targetCornerPositions[i].x - cursorX;
        const targetY = this.targetCornerPositions[i].y - cursorY;

        const finalX = currentX + (targetX - currentX) * strength;
        const finalY = currentY + (targetY - currentY) * strength;

        const duration = strength >= 0.99 ? (this.parallaxOn ? 0.2 : 0) : 0.05;

        _gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? 'none' : 'power1.out',
          overwrite: 'auto'
        });
      });
    };

    // 3. Scroll Watcher: maintain locked coordinates or release
    this.scrollHandler = () => {
      if (!this.activeTarget || !this.cursor) return;
      const { x: offsetX, y: offsetY } = getOffset();
      const mouseX = _gsap.getProperty(this.cursor, 'x') + offsetX;
      const mouseY = _gsap.getProperty(this.cursor, 'y') + offsetY;
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === this.activeTarget || this.activeTarget.contains(elementUnderMouse));

      if (!isStillOverTarget) {
        this.unlockTarget();
      } else {
        const rect = this.activeTarget.getBoundingClientRect();
        const { borderWidth, cornerSize, targetPadding } = this.constants;
        const pad = targetPadding || 4;
        this.targetCornerPositions = [
          { x: rect.left - pad - borderWidth - offsetX, y: rect.top - pad - borderWidth - offsetY },
          { x: rect.right + pad + borderWidth - cornerSize - offsetX, y: rect.top - pad - borderWidth - offsetY },
          { x: rect.right + pad + borderWidth - cornerSize - offsetX, y: rect.bottom + pad + borderWidth - cornerSize - offsetY },
          { x: rect.left - pad - borderWidth - offsetX, y: rect.bottom + pad + borderWidth - cornerSize - offsetY }
        ];
      }
    };
    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    // 4. Click Feedback
    this.mouseDownHandler = () => {
      if (!this.dot) return;
      _gsap.to(this.dot, { scale: 0.7, duration: 0.2 });
      _gsap.to(this.cursor, { scale: 0.9, duration: 0.2 });
    };
    this.mouseUpHandler = () => {
      if (!this.dot) return;
      _gsap.to(this.dot, { scale: 1, duration: 0.2 });
      _gsap.to(this.cursor, { scale: 1, duration: 0.2 });
    };
    window.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);

    // 5. Window Resize
    this.resizeHandler = () => {
      this.containingBlock = getContainingBlock(this.cursor);
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  destroy() {
    const _gsap = window.gsap || gsap;
    if (this.tickerFn && _gsap) {
      _gsap.ticker.remove(this.tickerFn);
    }
    window.removeEventListener('mousemove', this.moveHandler);
    window.removeEventListener('scroll', this.scrollHandler);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);

    this.unlockTarget();

    if (this.spinTl) this.spinTl.kill();
    document.body.classList.remove('target-cursor-active');

    if (this.cursor && this.cursor.parentNode) {
      this.cursor.parentNode.removeChild(this.cursor);
    }
  }

  static init(options) {
    if (typeof window === 'undefined') return null;
    TargetCursor.instance = new TargetCursor(options);
    return TargetCursor.instance;
  }
}

if (typeof window !== 'undefined') {
  window.TargetCursor = TargetCursor;
}

export default TargetCursor;
