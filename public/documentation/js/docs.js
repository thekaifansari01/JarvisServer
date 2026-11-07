(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  const PAGES = [
    'introduction', 'quick-start', 'installation', 'environment', 'voice',
    'memory', 'mcp', 'android', 'telegram', 'cli', 'tools', 'architecture',
    'agent-panel', 'typing-popup', 'stt-popup', 'input-popup',
    'ui-comparison', 'lifecycle-shutdown', 'troubleshooting', 'faq',
    'custom-prompt', 'byo-tool', 'data-model',
    'glossary', 'limitations', 'changelog'
  ];

  const PAGE_TITLES = {
    'introduction': 'Introduction',
    'quick-start': 'Quick Start',
    'installation': 'Installation',
    'environment': 'Environment Configuration',
    'voice': 'Voice Setup',
    'memory': 'Memory & RAG',
    'mcp': 'MCP Integration',
    'android': 'Android Bridge',
    'telegram': 'Telegram Bot',
    'cli': 'CLI Reference',
    'tools': 'Tools Reference',
    'architecture': 'Architecture',
    'agent-panel': 'Agent Panel',
    'typing-popup': 'Typing Popup',
    'stt-popup': 'STT Popup',
    'input-popup': 'Input Popup',
    'ui-comparison': 'UI Comparison',
    'lifecycle-shutdown': 'Lifecycle & Shutdown',
    'troubleshooting': 'Troubleshooting',
    'faq': 'Frequently Asked Questions',
    'custom-prompt': 'Custom Prompt Guide',
    'byo-tool': 'Bring Your Own Tool',
    'data-model': 'Data Model Reference',
    'glossary': 'Glossary',
    'limitations': 'Known Limitations',
    'changelog': 'Changelog'
  };

  const state = {
    currentPage: null,
    searchIndex: [],
    tocObserver: null,
    headingObserver: null,
    searchFocus: -1,
    searchFiltered: []
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function escapeHtmlKeepMarks(str) {
    return String(str).replace(/<(?!\/?mark>)/g, (m) => (m === '<' ? '&lt;' : m));
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function readTimeFor(page) {
    const text = page.textContent || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return '~' + minutes + ' min read';
  }

  function findPageForAnchor(anchorId) {
    if (!anchorId) return null;
    const target = document.getElementById(anchorId);
    if (!target) return null;
    return target.closest('.doc-page');
  }

  function getPageFromURL() {
    const hash = window.location.hash ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(window.location.search);

    const pathMatch = window.location.pathname.match(/^\/documentation\/([^\/]+)\/?$/);
    if (pathMatch) {
      const pathSection = pathMatch[1];
      if (PAGES.includes(pathSection)) {
        return { pageId: pathSection, anchorId: hash || null };
      }
    }

    const querySection = params.get('section');
    if (querySection && PAGES.includes(querySection)) {
      return { pageId: querySection, anchorId: hash || null };
    }

    if (hash) {
      if (PAGES.includes(hash)) {
        return { pageId: hash, anchorId: null };
      }
      const page = findPageForAnchor(hash);
      if (page) {
        return { pageId: page.dataset.page, anchorId: hash };
      }
    }

    return { pageId: 'introduction', anchorId: null };
  }

  function scrollToAnchor(anchorId) {
    if (!anchorId) return;
    const target = document.getElementById(anchorId);
    if (!target) return;
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60;
    const top = target.getBoundingClientRect().top + window.scrollY - navH - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
  }

  function updateURL(pageId, anchorId, mode) {
    let newPath;
    if (pageId === 'introduction' && !anchorId) {
      newPath = '/documentation';
    } else if (pageId === 'introduction') {
      newPath = '/documentation#' + anchorId;
    } else {
      newPath = '/documentation/' + pageId + (anchorId ? '#' + anchorId : '');
    }

    const currentURL = window.location.pathname + window.location.search + window.location.hash;
    if (newPath === currentURL) return;

    if (mode === 'replace') {
      history.replaceState({ pageId, anchorId }, '', newPath);
    } else if (mode === 'push') {
      history.pushState({ pageId, anchorId }, '', newPath);
    }
  }

  function buildScopedTOC(pageId) {
    const list = document.getElementById('tocList');
    if (!list) return;
    list.innerHTML = '';

    const page = document.querySelector('.doc-page[data-page="' + pageId + '"]');
    if (!page) return;

    const headings = page.querySelectorAll('h2[id], h3[id]');
    const items = [];

    headings.forEach(function (h) {
      const id = h.id;
      const text = h.textContent.replace(/\s+/g, ' ').trim().replace(/\s*link$/, '');
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = text;
      a.dataset.id = id;
      if (h.tagName === 'H3') a.classList.add('toc-h3');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.getElementById(id);
        if (!target) return;
        scrollToAnchor(id);
        updateURL(pageId, id, 'push');
      });
      li.appendChild(a);
      list.appendChild(li);
      items.push({ el: a, id: id, target: h });
    });

    const sheetList = document.getElementById('tocSheetList');
    if (sheetList) {
      sheetList.innerHTML = '';
      headings.forEach(function (h) {
        const id = h.id;
        const text = h.textContent.replace(/\s+/g, ' ').trim().replace(/\s*link$/, '');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = text;
        a.dataset.id = id;
        if (h.tagName === 'H3') a.classList.add('toc-h3');
        a.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.getElementById(id);
          if (!target) return;
          closeTocSheet();
          setTimeout(function () {
            scrollToAnchor(id);
            updateURL(pageId, id, 'push');
          }, 200);
        });
        sheetList.appendChild(a);
      });
    }

    if (state.tocObserver) state.tocObserver.disconnect();

    state.tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        list.querySelectorAll('a').forEach(function (a) {
          a.classList.toggle('active', a.dataset.id === id);
        });
        if (sheetList) {
          sheetList.querySelectorAll('a').forEach(function (a) {
            a.classList.toggle('active', a.dataset.id === id);
          });
        }
      });
    }, { rootMargin: '-30% 0px -65% 0px' });

    items.forEach(function (item) { state.tocObserver.observe(item.target); });
  }

  function showPage(pageId, options) {
    options = options || {};
    const anchorId = options.anchorId || null;
    const urlMode = options.urlMode || 'push';

    if (!PAGES.includes(pageId)) pageId = 'introduction';

    if (state.currentPage === pageId && !anchorId) {
      window.scrollTo({ top: 0, behavior: scrollBehavior });
      updateURL(pageId, null, 'replace');
      return;
    }

    if (state.currentPage && state.currentPage !== pageId) {
      try {
        localStorage.setItem('jarvis-docs-scroll-' + state.currentPage, String(window.scrollY));
      } catch (e) {}
    }

    const previousPage = document.querySelector('.doc-page.active');
    if (previousPage) previousPage.classList.remove('active');

    const page = document.querySelector('.doc-page[data-page="' + pageId + '"]');
    if (page) page.classList.add('active');

    state.currentPage = pageId;

    document.querySelectorAll('.sidebar-list a[data-page]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === pageId);
    });

    document.querySelectorAll('.sidebar-group').forEach(function (group) {
      if (group.querySelector('a[data-page="' + pageId + '"]')) {
        group.classList.remove('collapsed');
        const label = group.querySelector('.sidebar-group-label');
        if (label) label.setAttribute('aria-expanded', 'true');
        try {
          localStorage.setItem('jarvis-docs-group-' + group.dataset.group, 'open');
        } catch (e) {}
      }
    });

    injectBreadcrumbExtras(page);

    buildScopedTOC(pageId);
    updateURL(pageId, anchorId, urlMode);

    if (anchorId) {
      requestAnimationFrame(function () {
        setTimeout(function () { scrollToAnchor(anchorId); }, 30);
      });
    } else {
      let savedScroll = 0;
      try {
        savedScroll = parseInt(localStorage.getItem('jarvis-docs-scroll-' + pageId) || '0', 10);
      } catch (e) {}
      if (savedScroll > 100) {
        requestAnimationFrame(function () {
          window.scrollTo({ top: savedScroll, behavior: 'auto' });
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }

    const h1 = page ? page.querySelector('h1') : null;
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      setTimeout(function () {
        h1.focus({ preventScroll: true });
        h1.removeAttribute('tabindex');
      }, 50);
    }

    if (window.innerWidth <= 900) closeSidebar();
  }

  function injectBreadcrumbExtras(page) {
    if (!page) return;

    const trail = page.querySelector('.breadcrumb-trail');
    if (trail && !trail.querySelector('.breadcrumb-home')) {
      const homeLink = document.createElement('a');
      homeLink.href = '/documentation';
      homeLink.className = 'breadcrumb-home';
      homeLink.textContent = 'Docs';
      homeLink.addEventListener('click', function (e) {
        e.preventDefault();
        showPage('introduction', { anchorId: null });
      });
      trail.insertBefore(homeLink, trail.firstChild);
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = '›';
      trail.insertBefore(sep, homeLink.nextSibling);
    }

    const actions = page.querySelector('.breadcrumb-actions');
    const updated = page.dataset.updated || '2026-11-07';
    if (actions && !actions.querySelector('.page-updated')) {
      const date = new Date(updated);
      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const span = document.createElement('span');
      span.className = 'page-updated';
      span.textContent = 'Updated ' + formatted;
      actions.insertBefore(span, actions.firstChild);
    }
  }

  function navigateToAnchor(anchorId) {
    if (!anchorId) return;
    if (PAGES.includes(anchorId)) {
      showPage(anchorId, { anchorId: null });
      return;
    }
    const page = findPageForAnchor(anchorId);
    if (!page) return;
    if (state.currentPage === page.dataset.page) {
      scrollToAnchor(anchorId);
      updateURL(page.dataset.page, anchorId, 'push');
    } else {
      showPage(page.dataset.page, { anchorId: anchorId });
    }
  }

  function initRouter() {
    const initial = getPageFromURL();
    showPage(initial.pageId, { anchorId: initial.anchorId, urlMode: 'replace' });

    window.addEventListener('popstate', function () {
      const next = getPageFromURL();
      showPage(next.pageId, { anchorId: next.anchorId, urlMode: 'skip' });
    });
  }

  function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!toggle || !sidebar || !backdrop) return;

    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });

    backdrop.addEventListener('click', closeSidebar);

    document.querySelectorAll('.sidebar-group-label').forEach(function (label) {
      const group = label.closest('.sidebar-group');
      if (!group) return;
      const groupKey = group.dataset.group;
      let stored = null;
      try { stored = localStorage.getItem('jarvis-docs-group-' + groupKey); } catch (e) {}
      if (stored === 'closed') {
        group.classList.add('collapsed');
        label.setAttribute('aria-expanded', 'false');
      }
      label.addEventListener('click', function () {
        const collapsed = group.classList.toggle('collapsed');
        label.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        try {
          localStorage.setItem('jarvis-docs-group-' + groupKey, collapsed ? 'closed' : 'open');
        } catch (e) {}
      });
    });

    document.querySelectorAll('.sidebar-list a[data-page]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        showPage(a.dataset.page, { anchorId: null });
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && sidebar.classList.contains('open')) closeSidebar();
    });
  }

  function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function initAnchorLinks() {
    document.addEventListener('click', function (e) {
      const anchor = e.target.closest('a.anchor');
      if (anchor) {
        e.preventDefault();
        const heading = anchor.closest('h2, h3');
        if (!heading || !heading.id) return;
        const pageId = state.currentPage;
        const url = new URL(window.location.href);
        url.searchParams.set('section', pageId);
        url.hash = '#' + heading.id;
        const shareUrl = url.toString();
        navigator.clipboard.writeText(shareUrl).then(function () {
          showToast('Link copied!');
          scrollToAnchor(heading.id);
          updateURL(pageId, heading.id, 'replace');
        }).catch(function () {
          scrollToAnchor(heading.id);
        });
        return;
      }
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const id = href.slice(1);
      if (!id) return;
      if (link.closest('.sidebar') || link.closest('.toc') || link.closest('.toc-sheet')) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      navigateToAnchor(id);
    });
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const textEl = toast.querySelector('.toast-text');
    if (textEl) textEl.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    let raf = null;
    function update() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
      raf = null;
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
  }

  function initBackToTop() {
    const btn = document.getElementById('backTop');
    if (!btn) return;
    let raf = null;
    function update() {
      btn.classList.toggle('visible', window.scrollY > 400);
      raf = null;
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: scrollBehavior });
    });
  }

  function initReadTimes() {
    document.querySelectorAll('.doc-page').forEach(function (page) {
      const readEl = page.querySelector('[data-read]');
      if (readEl) readEl.textContent = readTimeFor(page);
    });
  }

  function initPagergen() {
    document.querySelectorAll('[data-pager]').forEach(function (pager) {
      const page = pager.closest('.doc-page');
      const pageId = page.dataset.page;
      const idx = PAGES.indexOf(pageId);
      pager.innerHTML = '';

      if (idx > 0) {
        const prevId = PAGES[idx - 1];
        const prev = document.createElement('a');
        prev.href = '#';
        prev.className = 'pager-link';
        prev.innerHTML =
          '<span class="pager-label">Previous</span>' +
          '<span class="pager-title"><span class="material-symbols-outlined">arrow_back</span>' +
          escapeHtml(PAGE_TITLES[prevId]) + '</span>';
        prev.addEventListener('click', function (e) {
          e.preventDefault();
          showPage(prevId, { anchorId: null });
        });
        pager.appendChild(prev);
      } else {
        pager.appendChild(el('span', 'pager-link empty'));
      }

      if (idx < PAGES.length - 1) {
        const nextId = PAGES[idx + 1];
        const next = document.createElement('a');
        next.href = '#';
        next.className = 'pager-link next';
        next.innerHTML =
          '<span class="pager-label">Next</span>' +
          '<span class="pager-title">' + escapeHtml(PAGE_TITLES[nextId]) +
          '<span class="material-symbols-outlined">arrow_forward</span></span>';
        next.addEventListener('click', function (e) {
          e.preventDefault();
          showPage(nextId, { anchorId: null });
        });
        pager.appendChild(next);
      } else {
        const help = document.createElement('a');
        help.href = 'https://github.com/thekaifansari01/Jarvis-OS-Agent/issues';
        help.target = '_blank';
        help.rel = 'noopener noreferrer';
        help.className = 'pager-link next';
        help.innerHTML =
          '<span class="pager-label">Need more help?</span>' +
          '<span class="pager-title">Open an issue<span class="material-symbols-outlined">arrow_forward</span></span>';
        pager.appendChild(help);
      }
    });
  }

  function initFeedback() {
    const STORAGE_PREFIX = 'jarvis-docs-feedback:';
    document.querySelectorAll('.feedback-bar').forEach(function (bar) {
      const pageId = bar.dataset.feedback;
      bar.querySelectorAll('.feedback-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          bar.querySelectorAll('.feedback-btn').forEach(function (b) { b.classList.remove('selected'); });
          btn.classList.add('selected');
          const value = btn.dataset.value;
          try {
            localStorage.setItem(STORAGE_PREFIX + pageId, JSON.stringify({ value: value, ts: Date.now() }));
          } catch (e) {}

          fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageId: pageId, value: value, timestamp: Date.now() })
          }).catch(function () {});

          if (value === 'yes') {
            showToast('Thanks for the feedback!');
          } else {
            showToast('Thanks — please open an issue if we can improve.');
          }
        });
      });
    });
  }

  function detectLang(codeBlockEl) {
    const langEl = codeBlockEl.querySelector('.code-block-lang');
    if (langEl) {
      const text = langEl.textContent.trim().toLowerCase();
      if (text.includes('powershell')) return 'powershell';
      if (text.includes('bash') || text.includes('shell')) return 'bash';
      if (text.includes('json')) return 'json';
      if (text.includes('.env')) return 'bash';
      if (text.includes('log')) return 'log';
      if (text.includes('browser')) return 'text';
      if (text.includes('markdown')) return 'markdown';
      if (text.includes('terminal')) return 'bash';
    }
    return '';
  }

  function inlineText(node) {
    let text = '';
    node.childNodes.forEach(function (child) {
      if (child.nodeType === 3) {
        text += child.textContent;
      } else if (child.nodeType === 1) {
        const tag = child.tagName;
        if (tag === 'STRONG' || tag === 'B') text += '**' + inlineText(child) + '**';
        else if (tag === 'EM' || tag === 'I') text += '*' + inlineText(child) + '*';
        else if (tag === 'CODE') {
          if (child.closest('pre')) text += child.textContent;
          else text += '`' + child.textContent + '`';
        }
        else if (tag === 'A') {
          if (child.classList.contains('anchor')) return;
          const href = child.getAttribute('href') || '';
          const label = inlineText(child);
          if (href.startsWith('#')) text += '`' + label + '`';
          else text += '[' + label + '](' + href + ')';
        }
        else if (tag === 'BR') text += '\n';
        else if (tag === 'IMG') {
          const alt = child.getAttribute('alt') || 'image';
          text += '![' + alt + '](' + child.src + ')';
        }
        else text += inlineText(child);
      }
    });
    return text.replace(/[ \t]+/g, ' ').replace(/\n +/g, '\n').trim();
  }

  function tableToMarkdown(table) {
    const rows = table.querySelectorAll('tr');
    if (!rows.length) return '';
    const lines = [];
    const headerCells = Array.from(rows[0].children).map(function (c) {
      return inlineText(c).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    });
    lines.push('| ' + headerCells.join(' | ') + ' |');
    lines.push('| ' + headerCells.map(function () { return '---'; }).join(' | ') + ' |');
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].children).map(function (c) {
        return inlineText(c).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      });
      lines.push('| ' + cells.join(' | ') + ' |');
    }
    return lines.join('\n');
  }

  function blockToMarkdown(node) {
    if (node.nodeType !== 1) return '';
    const tag = node.tagName;

    if (tag === 'H1') return '# ' + node.textContent.replace(/\s*link$/, '').trim();
    if (tag === 'H2') return '## ' + node.textContent.replace(/\s*link$/, '').trim();
    if (tag === 'H3') return '### ' + node.textContent.replace(/\s*link$/, '').trim();
    if (tag === 'H4') return '#### ' + node.textContent.trim();
    if (tag === 'HR') return '---';
    if (tag === 'P') return inlineText(node);

    if (tag === 'UL') {
      return Array.from(node.children).filter(function (c) { return c.tagName === 'LI'; }).map(function (li) {
        return '- ' + inlineText(li);
      }).join('\n');
    }

    if (tag === 'OL') {
      return Array.from(node.children).filter(function (c) { return c.tagName === 'LI'; }).map(function (li, i) {
        return (i + 1) + '. ' + inlineText(li).replace(/\n/g, ' ');
      }).join('\n');
    }

    if (tag === 'BLOCKQUOTE') {
      return '> ' + inlineText(node).replace(/\n/g, '\n> ');
    }

    if (node.matches('.callout')) {
      const typeMatch = node.className.match(/callout\s+(\w+)/);
      const type = typeMatch ? typeMatch[1].toUpperCase() : 'NOTE';
      const body = node.querySelector('.callout-body');
      const text = body ? inlineText(body) : '';
      return '> [!' + type + ']\n> ' + text.replace(/\n/g, '\n> ');
    }

    if (node.matches('.code-block, .code-tabs')) {
      const pre = node.querySelector('.code-tab-panel.active pre') || node.querySelector('pre');
      if (pre) {
        const lang = detectLang(node);
        const code = pre.textContent.trim();
        return '```' + lang + '\n' + code + '\n```';
      }
    }

    if (node.matches('.table-wrap')) {
      const table = node.querySelector('table');
      if (table) return tableToMarkdown(table);
    }

    if (tag === 'TABLE') {
      return tableToMarkdown(node);
    }

    if (tag === 'FIGURE') {
      const img = node.querySelector('img');
      const cap = node.querySelector('figcaption');
      if (img) {
        const alt = img.getAttribute('alt') || 'image';
        const capText = cap ? inlineText(cap) : '';
        return '![' + alt + '](' + img.src + ')' + (capText ? '\n\n*' + capText + '*' : '');
      }
    }

    if (node.matches('.feature-grid, .ui-feature-grid, .gallery-row, .anatomy-legend, .ui-mode-grid, .color-swatch-row, .storyboard, .arch-flow, .kbd-chord, .ui-hero-banner, .shot-annotated, .screenshot-frame')) {
      const plainText = node.textContent.replace(/\s+/g, ' ').trim();
      return plainText ? '_' + plainText + '_' : '';
    }

    if (node.matches('.page-breadcrumb, .feedback-bar, .pager')) return '';

    return inlineText(node);
  }

  function sectionToMarkdown(sectionEl) {
    const clone = sectionEl.cloneNode(true);
    clone.querySelectorAll('.page-breadcrumb, .feedback-bar, .pager, a.anchor, .badge, .pin').forEach(function (el) { el.remove(); });

    const parts = [];
    Array.from(clone.children).forEach(function (child) {
      const md = blockToMarkdown(child);
      if (md) parts.push(md);
    });

    return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function initCopyPage() {
    document.querySelectorAll('[data-copy-page]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const pageId = btn.dataset.copyPage;
        const page = document.querySelector('.doc-page[data-page="' + pageId + '"]');
        if (!page) return;
        const markdown = sectionToMarkdown(page);
        navigator.clipboard.writeText(markdown).then(function () {
          btn.classList.add('copied');
          const label = btn.querySelector('.copy-page-label');
          const icon = btn.querySelector('.material-symbols-outlined');
          if (label) label.textContent = 'Copied!';
          if (icon) icon.textContent = 'check';
          showToast('Page copied as Markdown');
          setTimeout(function () {
            btn.classList.remove('copied');
            if (label) label.textContent = 'Copy as Markdown';
            if (icon) icon.textContent = 'content_copy';
          }, 2000);
        }).catch(function () {
          showToast('Copy failed — try again');
        });
      });
    });
  }

  function initCopyButtons() {
    document.querySelectorAll('.code-copy, .code-tabs-copy').forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const block = btn.closest('.code-block') || btn.closest('.code-tabs');
        if (!block) return;
        let code = '';
        const activePanel = block.querySelector('.code-tab-panel.active pre');
        const pre = activePanel || block.querySelector('pre');
        if (pre) code = pre.textContent;
        navigator.clipboard.writeText(code).then(function () {
          const original = btn.innerHTML;
          btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:13px">check</span> Copied';
          btn.style.color = '#10b981';
          setTimeout(function () {
            btn.innerHTML = original;
            btn.style.color = '';
          }, 1600);
        });
      });
    });
  }

  function initCodeTabs() {
    document.querySelectorAll('.code-tabs').forEach(function (wrapper) {
      if (wrapper.dataset.bound === '1') return;
      wrapper.dataset.bound = '1';
      const tabs = wrapper.querySelectorAll('.code-tab');
      const panels = wrapper.querySelectorAll('.code-tab-panel');
      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          panels.forEach(function (p) { p.classList.remove('active'); });
          tab.classList.add('active');
          if (panels[i]) panels[i].classList.add('active');
        });
      });
    });
  }

  function initFaqAccordion() {
    document.querySelectorAll('details.faq').forEach(function (item) {
      if (item.dataset.bound === '1') return;
      item.dataset.bound = '1';
      item.addEventListener('toggle', function () {
        if (!item.open) return;
        const scope = item.closest('.doc-page') || document;
        scope.querySelectorAll('details.faq').forEach(function (other) {
          if (other !== item && other.open) other.open = false;
        });
      });
    });
  }

  function initLightbox() {
    const modal = document.getElementById('lightbox');
    if (!modal) return;
    const img = modal.querySelector('.lightbox-img');
    const closeBtn = modal.querySelector('.lightbox-close');

    let releaseLightboxFocus = null;

    function openLightbox(src, alt) {
      if (!img) return;
      img.src = src;
      img.alt = alt || '';
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      releaseLightboxFocus = trapFocus(modal, closeLightbox);
    }

    function closeLightbox() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      if (img) img.src = '';
      if (releaseLightboxFocus) {
        releaseLightboxFocus();
        releaseLightboxFocus = null;
      }
    }

    document.addEventListener('click', function (e) {
      const target = e.target.closest('.screenshot-frame img, .shot-annotated img');
      if (!target) return;
      e.preventDefault();
      openLightbox(target.src, target.alt);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeLightbox();
    });
  }

  function buildSearchIndex() {
    const index = [];
    document.querySelectorAll('.doc-page').forEach(function (page) {
      const pageId = page.dataset.page;
      const pageTitle = PAGE_TITLES[pageId] || pageId;

      page.querySelectorAll('h1[id], h2[id], h3[id]').forEach(function (h) {
        index.push({
          type: 'heading',
          text: h.textContent.replace(/\s*link$/, '').trim(),
          pageId: pageId,
          pageTitle: pageTitle,
          anchorId: h.id,
          snippet: ''
        });
      });

      page.querySelectorAll('code:not(pre code)').forEach(function (code) {
        const text = code.textContent.trim();
        if (text.length < 3 || text.length > 80) return;
        const heading = code.closest('.doc-page').querySelector('h2[id], h3[id]');
        const section = code.closest('.doc-page');
        const anchor = findClosestHeading(code) || section.querySelector('h1');
        index.push({
          type: 'inline-code',
          text: text,
          pageId: pageId,
          pageTitle: pageTitle,
          anchorId: anchor ? anchor.id : pageId,
          snippet: text
        });
      });

      page.querySelectorAll('.code-block pre, .code-tab-panel pre').forEach(function (pre) {
        const anchor = findClosestHeading(pre) || page.querySelector('h1');
        if (!pre.id) {
          pre.id = 'pre-' + Math.random().toString(36).slice(2, 10);
        }
        const lines = pre.textContent.split('\n');
        lines.forEach(function (line) {
          const trimmed = line.trim();
          if (trimmed.length < 8 || trimmed.length > 180) return;
          if (trimmed.startsWith('#')) return;
          index.push({
            type: 'code-line',
            text: trimmed,
            pageId: pageId,
            pageTitle: pageTitle,
            anchorId: anchor ? anchor.id : pageId,
            snippet: trimmed,
            preId: pre.id
          });
        });
      });

      page.querySelectorAll('table td').forEach(function (td) {
        const text = td.textContent.trim();
        if (text.length < 4 || text.length > 120) return;
        const anchor = findClosestHeading(td) || page.querySelector('h1');
        index.push({
          type: 'table',
          text: text,
          pageId: pageId,
          pageTitle: pageTitle,
          anchorId: anchor ? anchor.id : pageId,
          snippet: text
        });
      });

      page.querySelectorAll('p').forEach(function (p) {
        if (p.closest('.page-breadcrumb')) return;
        const text = p.textContent.trim();
        if (text.length < 20 || text.length > 400) return;
        const anchor = findClosestHeading(p) || page.querySelector('h1');
        index.push({
          type: 'paragraph',
          text: text,
          pageId: pageId,
          pageTitle: pageTitle,
          anchorId: anchor ? anchor.id : pageId,
          snippet: text.length > 130 ? text.slice(0, 130) + '…' : text
        });
      });
    });
    state.searchIndex = index;
  }

  function findClosestHeading(node) {
    let current = node;
    while (current) {
      let prev = current.previousElementSibling;
      while (prev) {
        if (/^H[1-3]$/.test(prev.tagName) && prev.id) return prev;
        const inner = prev.querySelector && prev.querySelector('h1[id], h2[id], h3[id]');
        if (inner) return inner;
        prev = prev.previousElementSibling;
      }
      current = current.parentElement;
      if (current && current.matches('.doc-page')) return current.querySelector('h1');
    }
    return null;
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return escapeHtml(text);
    const pre = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const post = text.slice(idx + query.length);
    return escapeHtml(pre) + '<mark>' + escapeHtml(match) + '</mark>' + escapeHtml(post);
  }

  function trapFocus(container, onEscape) {
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const previouslyFocused = document.activeElement;
    let released = false;

    function handleKeydown(e) {
      if (e.key === 'Escape') {
        if (onEscape) onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(container.querySelectorAll(focusableSelector))
        .filter(function (el) { return !el.disabled && el.offsetParent !== null; });

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeydown);

    return function release() {
      if (released) return;
      released = true;
      document.removeEventListener('keydown', handleKeydown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus(); } catch (e) {}
      }
    };
  }

  function initSearch() {
    const modal = document.getElementById('searchModal');
    const trigger = document.getElementById('searchTrigger');
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!modal || !trigger || !input || !results) return;

    function render(query) {
      const q = query.trim().toLowerCase();
      const source = state.searchIndex;

      let filtered;
      if (!q) {
        filtered = source.filter(function (item) { return item.type === 'heading'; }).slice(0, 15);
      } else {
        const scored = [];
        source.forEach(function (item) {
          const lower = item.text.toLowerCase();
          const idx = lower.indexOf(q);
          if (idx === -1) return;
          let score = 0;
          if (idx === 0) score += 100;
          if (item.type === 'heading') score += 40;
          else if (item.type === 'inline-code') score += 30;
          else if (item.type === 'table') score += 20;
          else if (item.type === 'code-line') score += 15;
          score -= idx * 0.5;
          score -= item.text.length * 0.01;
          scored.push({ item: item, score: score });
        });
        scored.sort(function (a, b) { return b.score - a.score; });
        filtered = scored.slice(0, 20).map(function (s) { return s.item; });
      }

      state.searchFiltered = filtered;
      state.searchFocus = filtered.length ? 0 : -1;

      if (!filtered.length) {
        results.innerHTML = '<div class="search-empty">' +
          '<span class="material-symbols-outlined">search_off</span>' +
          'No results for "' + escapeHtml(query) + '"' +
          '</div>';
        return;
      }

      results.innerHTML = filtered.map(function (item, i) {
        const icon = {
          'heading': 'title',
          'inline-code': 'code',
          'code-line': 'code_blocks',
          'table': 'table_chart',
          'paragraph': 'short_text'
        }[item.type] || 'article';
        const path = item.pageTitle + (item.anchorId !== item.pageId ? ' / ' + (item.text.length < 60 ? item.text : '') : '');
        return '<button type="button" class="search-result' + (i === 0 ? ' focused' : '') + '" data-index="' + i + '">' +
          '<span class="material-symbols-outlined">' + icon + '</span>' +
          '<div class="search-result-body">' +
          '<div class="search-result-title">' + highlightMatch(item.text, query) + '</div>' +
          (item.snippet && item.type !== 'heading' ? '<div class="search-result-snippet">' + highlightMatch(item.snippet, query) + '</div>' : '') +
          '<div class="search-result-path">' + escapeHtml(item.pageTitle) + '</div>' +
          '</div>' +
          '</button>';
      }).join('');

      results.querySelectorAll('.search-result').forEach(function (el2) {
        el2.addEventListener('click', function () {
          const idx = parseInt(el2.dataset.index, 10);
          goTo(filtered[idx]);
        });
      });
    }

    function goTo(item) {
      if (!item) return;
      closeSearch();

      const doNavigate = function () {
        if (item.anchorId && item.anchorId !== item.pageId) {
          scrollToAnchor(item.anchorId);
          updateURL(item.pageId, item.anchorId, 'push');
        }
        if (item.type === 'code-line' && item.preId) {
          setTimeout(function () { pulseCodeBlock(item.preId); }, 350);
        }
      };

      if (item.pageId === state.currentPage) {
        doNavigate();
      } else {
        showPage(item.pageId, { anchorId: item.anchorId !== item.pageId ? item.anchorId : null });
        setTimeout(doNavigate, 400);
      }
    }

    function pulseCodeBlock(preId) {
      const pre = document.getElementById(preId);
      if (!pre) return;
      const block = pre.closest('.code-block, .code-tabs');
      if (!block) return;
      block.classList.add('code-pulse');
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { block.classList.remove('code-pulse'); }, 2200);
    }

    function setFocus(newIdx) {
      if (!state.searchFiltered.length) return;
      if (newIdx < 0) newIdx = state.searchFiltered.length - 1;
      if (newIdx >= state.searchFiltered.length) newIdx = 0;
      state.searchFocus = newIdx;
      const items = results.querySelectorAll('.search-result');
      items.forEach(function (el2, i) { el2.classList.toggle('focused', i === state.searchFocus); });
      if (items[state.searchFocus]) items[state.searchFocus].scrollIntoView({ block: 'nearest' });
    }

    let releaseSearchFocus = null;

    function openSearch() {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { input.focus(); }, 60);
      render(input.value);
      releaseSearchFocus = trapFocus(modal.querySelector('.search-panel'), closeSearch);
    }

    function closeSearch() {
      modal.classList.remove('open');
      input.value = '';
      state.searchFocus = -1;
      document.body.style.overflow = '';
      if (releaseSearchFocus) {
        releaseSearchFocus();
        releaseSearchFocus = null;
      }
    }

    trigger.addEventListener('click', openSearch);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeSearch();
    });
    input.addEventListener('input', debounce(function () { render(input.value); }, 80));
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(state.searchFocus + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(state.searchFocus - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        goTo(state.searchFiltered[state.searchFocus]);
      }
      else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (modal.classList.contains('open')) closeSearch();
        else openSearch();
      }
    });
  }

  function initTocFab() {
    const fab = document.getElementById('tocFab');
    const sheet = document.getElementById('tocSheet');
    const closeBtn = sheet ? sheet.querySelector('.toc-sheet-close') : null;
    if (!fab || !sheet) return;

    let releaseTocFocus = null;

    fab.addEventListener('click', function () {
      sheet.classList.add('open');
      releaseTocFocus = trapFocus(sheet, closeTocSheet);
    });
    if (closeBtn) closeBtn.addEventListener('click', closeTocSheet);
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeTocSheet();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) closeTocSheet();
    });

    const originalCloseTocSheet = window.closeTocSheet;
    window.closeTocSheet = function () {
      if (releaseTocFocus) {
        releaseTocFocus();
        releaseTocFocus = null;
      }
      if (originalCloseTocSheet) originalCloseTocSheet();
    };
  }

  function closeTocSheet() {
    const sheet = document.getElementById('tocSheet');
    if (sheet) sheet.classList.remove('open');
  }

  function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea, [contenteditable]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 't' && !e.shiftKey) {
        const btn = document.getElementById('themeToggle');
        if (btn) btn.click();
        return;
      }
      if (e.key === '[') {
        const idx = PAGES.indexOf(state.currentPage);
        if (idx > 0) showPage(PAGES[idx - 1], { anchorId: null });
      } else if (e.key === ']') {
        const idx = PAGES.indexOf(state.currentPage);
        if (idx < PAGES.length - 1) showPage(PAGES[idx + 1], { anchorId: null });
      }
    });
  }

  function initTocFooter() {
    const backBtn = document.getElementById('tocBackTop');
    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: scrollBehavior });
      });
    }
    const editLink = document.getElementById('tocEditLink');
    if (editLink) {
      editLink.addEventListener('click', function (e) {
        e.preventDefault();
        const page = PAGE_TITLES[state.currentPage] || state.currentPage;
        const url = 'https://github.com/thekaifansari01/Jarvis-OS-Agent/blob/main/public/documentation/index.html';
        window.open(url, '_blank', 'noopener');
      });
    }
  }

  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    const meta = document.querySelector('meta[name="theme-color"]');

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-jarvis-theme', theme);
      if (icon) icon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
      if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f4f9' : '#05050a');
      try {
        localStorage.setItem('jarvis-theme', theme);
      } catch (e) {}
    }

    let stored = null;
    try {
      stored = localStorage.getItem('jarvis-theme');
    } catch (e) {}

    if (stored === 'light' || stored === 'dark') {
      applyTheme(stored);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      applyTheme('light');
    }

    btn.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-jarvis-theme') || 'dark';
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  function initPrintExpansion() {
    window.addEventListener('beforeprint', function () {
      document.querySelectorAll('details').forEach(function (d) {
        if (!d.open) {
          d.dataset.wasClosed = '1';
          d.open = true;
        }
      });
    });

    window.addEventListener('afterprint', function () {
      document.querySelectorAll('details[data-was-closed="1"]').forEach(function (d) {
        d.open = false;
        delete d.dataset.wasClosed;
      });
    });
  }

  function init() {
    initThemeToggle();
    initPrintExpansion();
    initReadTimes();
    initRouter();
    initSidebar();
    initAnchorLinks();
    initScrollProgress();
    initBackToTop();
    initPagergen();
    initFeedback();
    initCopyPage();
    initCopyButtons();
    initCodeTabs();
    initFaqAccordion();
    initLightbox();
    buildSearchIndex();
    initSearch();
    initTocFab();
    initKeyboardNav();
    initTocFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();