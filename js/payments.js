/* ==========================================================================
   Payments page - history, filters, receipt view / print, void a receipt.
   ========================================================================== */
(function () {
  'use strict';

  Layout.init();
  Receipt.wirePrint();

  var tableBody = document.querySelector('[data-payment-rows]');
  var searchInput = document.getElementById('filterSearch');
  var modeFilter = document.getElementById('filterMode');
  var fromInput = document.getElementById('filterFrom');
  var toInput = document.getElementById('filterTo');

  /* Rows currently on screen, so the receipt modal needs no extra round trip. */
  var visible = [];

  function currentFilters() {
    return {
      search: searchInput.value,
      mode: modeFilter.value,
      from: fromInput.value,
      to: toInput.value
    };
  }

  function loadPayments() {
    tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">Loading&hellip;</td></tr>';

    FeeAPI.getPayments(currentFilters())
      .then(function (rows) {
        visible = rows;
        renderRows(rows);
        renderTotals(rows);
      })
      .catch(function (err) {
        tableBody.innerHTML =
          '<tr><td colspan="7" class="table-empty text-danger">' +
          Utils.escape(err.message) + '</td></tr>';
      });
  }

  function renderTotals(rows) {
    var total = rows.reduce(function (sum, r) { return sum + r.amount; }, 0);
    var average = rows.length ? Math.round(total / rows.length) : 0;

    document.querySelector('[data-stat="count"]').textContent = rows.length;
    document.querySelector('[data-stat="total"]').textContent = Utils.money(total);
    document.querySelector('[data-stat="average"]').textContent = Utils.money(average);
  }

  function renderRows(rows) {
    if (!rows.length) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="table-empty">No receipts match these filters.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map(function (p) {
      return '<tr>' +
          '<td class="num text-start fw-medium">' + Utils.escape(p.id) + '</td>' +
          '<td class="text-nowrap">' + Utils.date(p.date) + '</td>' +
          '<td>' +
            '<div class="fw-medium">' + Utils.escape(p.studentName) + '</div>' +
            '<div class="small text-secondary">' +
              Utils.escape(p.rollNo) + ' &middot; ' + Utils.escape(p.course) +
            '</div>' +
          '</td>' +
          '<td>' + Utils.escape(p.mode) + '</td>' +
          '<td class="small text-secondary">' + Utils.escape(p.reference || '-') + '</td>' +
          '<td class="num fw-semibold">' + Utils.money(p.amount) + '</td>' +
          '<td class="text-end text-nowrap">' +
            '<button class="btn btn-sm btn-outline-secondary ms-1" type="button" ' +
              'data-action="receipt" data-id="' + Utils.escape(p.id) + '">Receipt</button>' +
            '<button class="btn btn-sm btn-outline-danger ms-1" type="button" ' +
              'data-action="void" data-id="' + Utils.escape(p.id) + '">Void</button>' +
          '</td>' +
        '</tr>';
    }).join('');
  }

  /* ---- receipt ------------------------------------------------------------- */

  function showReceipt(id) {
    var payment = visible.find(function (p) { return p.id === id; });
    if (!payment) { return; }

    /* Show the balance as it stands now, so a reprint stays truthful. */
    FeeAPI.getStudent(payment.studentId)
      .then(function (student) {
        Receipt.show(Object.assign({}, payment, { balanceAfter: student.due }));
      })
      .catch(function () {
        Receipt.show(payment);   // student deleted - print without the balance line
      });
  }

  /* ---- void ---------------------------------------------------------------- */

  function voidReceipt(id) {
    var payment = visible.find(function (p) { return p.id === id; });
    if (!payment) { return; }

    Utils.confirm(
      'Void receipt ' + id + ' for ' + Utils.money(payment.amount) + '? ' +
      'The amount goes back to the student’s balance due.',
      'Void receipt'
    ).then(function (ok) {
      if (!ok) { return; }
      return FeeAPI.deletePayment(id).then(function () {
        Utils.toast('Receipt ' + id + ' voided', 'success');
        loadPayments();
      });
    }).catch(function (err) { Utils.toast(err.message, 'danger'); });
  }

  /* ---- events -------------------------------------------------------------- */

  tableBody.addEventListener('click', function (event) {
    var button = event.target.closest('[data-action]');
    if (!button) { return; }

    if (button.dataset.action === 'receipt') { showReceipt(button.dataset.id); }
    if (button.dataset.action === 'void') { voidReceipt(button.dataset.id); }
  });

  searchInput.addEventListener('input', Utils.debounce(loadPayments, 300));
  modeFilter.addEventListener('change', loadPayments);
  fromInput.addEventListener('change', loadPayments);
  toInput.addEventListener('change', loadPayments);

  document.querySelector('[data-clear-filters]').addEventListener('click', function () {
    searchInput.value = '';
    modeFilter.value = '';
    fromInput.value = '';
    toInput.value = '';
    loadPayments();
  });

  loadPayments();
})();
