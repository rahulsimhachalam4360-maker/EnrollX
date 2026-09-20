/* ==========================================================================
   Layout - shared chrome. Renders the navbar and the confirm dialog into
   every page so the markup lives in exactly one place.
   ========================================================================== */
(function (global) {
  'use strict';

  var NAV = [
    { href: 'index.html',    label: 'Dashboard' },
    { href: 'students.html', label: 'Students' },
    { href: 'collect.html',  label: 'Collect Fee' },
    { href: 'payments.html', label: 'Payments' }
  ];

  var THEME_KEY = 'frs.theme';

  function currentPage() {
    var file = location.pathname.split('/').pop();
    return file === '' ? 'index.html' : file;
  }

  function renderNav() {
    var mount = document.querySelector('[data-app-nav]');
    if (!mount) { return; }

    var active = currentPage();

    var links = NAV.map(function (item) {
      var isActive = item.href === active;
      return '<li class="nav-item">' +
        '<a class="nav-link' + (isActive ? ' active fw-semibold' : '') + '" ' +
          'href="' + item.href + '"' + (isActive ? ' aria-current="page"' : '') + '>' +
          item.label +
        '</a></li>';
    }).join('');

    mount.innerHTML =
      '<nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom">' +
        '<div class="container">' +
          '<a class="navbar-brand fw-semibold" href="index.html">' +
            '<span class="me-1">&#9679;</span> Fee Registration' +
          '</a>' +
          '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" ' +
            'data-bs-target="#appNavLinks" aria-controls="appNavLinks" ' +
            'aria-expanded="false" aria-label="Toggle navigation">' +
            '<span class="navbar-toggler-icon"></span>' +
          '</button>' +
          '<div class="collapse navbar-collapse" id="appNavLinks">' +
            '<ul class="navbar-nav me-auto">' + links + '</ul>' +
            '<div class="d-flex gap-2 align-items-center">' +
              '<button class="btn btn-sm btn-outline-secondary" type="button" ' +
                'data-theme-toggle title="Toggle light / dark" ' +
                'aria-label="Toggle light or dark theme">' +
                '<span data-theme-icon>Dark</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</nav>';
  }

  function renderConfirmModal() {
    if (document.getElementById('confirmModal')) { return; }

    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered modal-sm">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title">Please confirm</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" ' +
                'aria-label="Close"></button>' +
            '</div>' +
            '<div class="modal-body" data-confirm-body></div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>' +
              '<button type="button" class="btn btn-danger" data-confirm-ok>Confirm</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrapper.firstChild);
  }

  /* ---- theme -------------------------------------------------------------- */

  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (err) { return null; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    /* Label the action, not the current state. */
    var icon = document.querySelector('[data-theme-icon]');
    if (icon) { icon.textContent = theme === 'dark' ? 'Light' : 'Dark'; }
  }

  function initTheme() {
    var prefersDark = global.matchMedia &&
      global.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(storedTheme() || (prefersDark ? 'dark' : 'light'));
  }

  function wireChrome() {
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-bs-theme') === 'dark'
          ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* private mode */ }
      });
    }
  }

  var Layout = {
    /* Called at the top of every page script. */
    init: function () {
      renderNav();
      renderConfirmModal();
      initTheme();
      wireChrome();
    }
  };

  global.Layout = Layout;
})(window);
