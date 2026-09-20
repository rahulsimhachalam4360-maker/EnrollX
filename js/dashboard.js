/* ==========================================================================
   Dashboard page
   ========================================================================== */
(function () {
  'use strict';

  Layout.init();

  function setText(name, value) {
    var el = document.querySelector('[data-stat="' + name + '"]');
    if (el) { el.textContent = value; }
  }

  function renderStats(stats) {
    var pct = stats.expected > 0
      ? Math.round((stats.collected / stats.expected) * 100)
      : 0;

    setText('students', stats.totalStudents);
    setText('students-note', stats.defaulters + ' with a pending balance');
    setText('expected', Utils.money(stats.expected));
    setText('collected', Utils.money(stats.collected));
    setText('collected-note', pct + '% of the total fee');
    setText('outstanding', Utils.money(stats.outstanding));
    setText('outstanding-note', (100 - pct) + '% still to collect');
    setText('progress-label', pct + '%');

    var fill = document.querySelector('[data-meter-fill]');
    var track = document.querySelector('[data-meter-role]');
    if (fill) { fill.style.width = pct + '%'; }
    if (track) { track.setAttribute('aria-valuenow', String(pct)); }
  }

  /*
   * Horizontal bars, one hue, longest first. Built as plain HTML rather than a
   * chart library - it is a single-series magnitude comparison, so a library
   * would only add weight.
   */
  function renderOutstandingChart(rows) {
    var mount = document.querySelector('[data-chart="outstanding-by-course"]');
    if (!mount) { return; }

    if (!rows.length) {
      mount.innerHTML = '<p class="viz-empty">Every course is fully paid up.</p>';
      return;
    }

    var max = rows[0].due;

    mount.innerHTML = rows.map(function (row) {
      var width = Math.max((row.due / max) * 100, 1);
      var tip = Utils.escape(row.course) + ': ' + Utils.money(row.due) + ' outstanding';

      return '<div class="viz-bar">' +
          '<div class="viz-bar__label" title="' + Utils.escape(row.course) + '">' +
            Utils.escape(row.course) +
          '</div>' +
          '<div class="viz-bar__track">' +
            '<div class="viz-bar__fill" style="width:' + width.toFixed(1) + '%" ' +
              'data-bs-toggle="tooltip" title="' + tip + '"></div>' +
          '</div>' +
          '<div class="viz-bar__value">' + Utils.money(row.due) + '</div>' +
        '</div>';
    }).join('');

    mount.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
      new bootstrap.Tooltip(el);
    });
  }

  function renderRecentPayments(rows) {
    var body = document.querySelector('[data-recent-payments]');
    if (!body) { return; }

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="3" class="table-empty">No payments recorded yet.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (pay) {
      return '<tr>' +
          '<td>' +
            '<div class="fw-medium">' + Utils.escape(pay.studentName) + '</div>' +
            '<div class="small text-secondary">' + Utils.escape(pay.rollNo) + '</div>' +
          '</td>' +
          '<td class="small text-secondary">' + Utils.date(pay.date) + '</td>' +
          '<td class="num">' + Utils.money(pay.amount) + '</td>' +
        '</tr>';
    }).join('');
  }

  function load() {
    FeeAPI.getDashboardStats()
      .then(function (stats) {
        renderStats(stats);
        renderOutstandingChart(stats.outstandingByCourse);
        renderRecentPayments(stats.recentPayments);
      })
      .catch(function (err) {
        console.error(err);
        Utils.toast('Could not load the dashboard: ' + err.message, 'danger');
      });
  }

  load();
})();
