/* ==========================================================================
   Receipt - shared renderer used by the Collect Fee and Payments pages.
   ========================================================================== */
(function (global) {
  'use strict';

  /* Put your institute's details here (or fetch them from /settings later). */
  var INSTITUTE = {
    name: 'Greenfield Institute of Technology',
    address: 'Plot 14, Knowledge Park, Hyderabad 500032',
    contact: '+91 40 2345 6789 &middot; accounts@greenfield.edu'
  };

  /* ---- amount in words (Indian numbering: lakh / crore) ------------------- */

  var ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  var TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy',
    'Eighty', 'Ninety'];

  function twoDigits(n) {
    if (n < 20) { return ONES[n]; }
    var tens = TENS[Math.floor(n / 10)];
    var rest = n % 10;
    return rest ? tens + ' ' + ONES[rest] : tens;
  }

  function threeDigits(n) {
    var hundreds = Math.floor(n / 100);
    var rest = n % 100;
    var parts = [];
    if (hundreds) { parts.push(ONES[hundreds] + ' Hundred'); }
    if (rest) { parts.push(twoDigits(rest)); }
    return parts.join(' ');
  }

  function inWords(amount) {
    var n = Math.floor(Math.abs(Number(amount) || 0));
    if (n === 0) { return 'Zero Rupees Only'; }

    var groups = [
      { value: Math.floor(n / 10000000), label: 'Crore' },
      { value: Math.floor(n / 100000) % 100, label: 'Lakh' },
      { value: Math.floor(n / 1000) % 100, label: 'Thousand' },
      { value: n % 1000, label: '' }
    ];

    var words = groups
      .filter(function (g) { return g.value > 0; })
      .map(function (g) {
        var text = g.label === '' ? threeDigits(g.value) : twoDigits(g.value);
        return g.label ? text + ' ' + g.label : text;
      })
      .join(' ');

    return words + ' Rupees Only';
  }

  /* ---- rendering ---------------------------------------------------------- */

  function field(label, value) {
    return '<div class="col-6">' +
      '<dt>' + label + '</dt>' +
      '<dd>' + Utils.escape(value || '-') + '</dd>' +
    '</div>';
  }

  /**
   * @param {Object} payment - a payment decorated with studentName / rollNo / course.
   *                           `balanceAfter` is optional.
   */
  function render(payment) {
    var balanceRow = typeof payment.balanceAfter === 'number'
      ? '<div class="d-flex justify-content-between small text-secondary mt-2">' +
          '<span>Balance remaining</span>' +
          '<span class="num">' + Utils.money(payment.balanceAfter) + '</span>' +
        '</div>'
      : '';

    return '<div class="receipt">' +

      '<div class="receipt__brand">' +
        '<div class="fw-semibold">' + INSTITUTE.name + '</div>' +
        '<div class="small text-secondary">' + INSTITUTE.address + '</div>' +
        '<div class="small text-secondary">' + INSTITUTE.contact + '</div>' +
      '</div>' +

      '<div class="d-flex justify-content-between align-items-start mb-3">' +
        '<div>' +
          '<div class="small text-secondary">Fee receipt</div>' +
          '<div class="fw-semibold num">' + Utils.escape(payment.id) + '</div>' +
        '</div>' +
        '<div class="text-end">' +
          '<div class="small text-secondary">Date</div>' +
          '<div>' + Utils.date(payment.date) + '</div>' +
        '</div>' +
      '</div>' +

      '<dl class="row g-0">' +
        field('Student', payment.studentName) +
        field('Roll number', payment.rollNo) +
        field('Course', payment.course) +
        field('Payment mode', payment.mode) +
        (payment.reference ? field('Reference', payment.reference) : '') +
        (payment.remarks ? field('Remarks', payment.remarks) : '') +
      '</dl>' +

      '<div class="receipt__amount d-flex justify-content-between">' +
        '<span>Amount paid</span>' +
        '<span class="num">' + Utils.money(payment.amount) + '</span>' +
      '</div>' +
      '<div class="small text-secondary fst-italic">' +
        Utils.escape(inWords(payment.amount)) +
      '</div>' +
      balanceRow +

      '<p class="small text-secondary mt-4 mb-0">' +
        'Computer-generated receipt. No signature required.' +
      '</p>' +

    '</div>';
  }

  var Receipt = {

    inWords: inWords,

    render: render,

    /* Renders into #receiptModal and shows it. */
    show: function (payment) {
      var el = document.getElementById('receiptModal');
      if (!el) { return; }
      el.querySelector('[data-receipt-body]').innerHTML = render(payment);
      bootstrap.Modal.getOrCreateInstance(el).show();
    },

    /* Wires the "Print receipt" button. Print CSS hides everything else. */
    wirePrint: function () {
      var button = document.querySelector('[data-print-receipt]');
      if (button) {
        button.addEventListener('click', function () { window.print(); });
      }
    }
  };

  global.Receipt = Receipt;
})(window);
