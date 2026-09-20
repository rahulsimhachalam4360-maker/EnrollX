/* ==========================================================================
   Utils - formatting, validation and small UI helpers.
   Plain script (no ES modules) so the app also runs straight off file://
   ========================================================================== */
(function (global) {
  'use strict';

  /* Change these two lines to re-locale the whole app. */
  var LOCALE = 'en-IN';
  var CURRENCY = 'INR';

  var moneyFmt = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0
  });

  var Utils = {

    /* ---- formatting ---------------------------------------------------- */

    money: function (value) {
      var n = Number(value) || 0;
      return moneyFmt.format(n);
    },

    /*
     * Dates are stored date-only ("2026-09-19"). `new Date(that)` parses it as
     * UTC midnight, which renders as the PREVIOUS day anywhere west of UTC - so
     * build the date from its parts and keep it local.
     */
    date: function (iso) {
      if (!iso) { return '-'; }

      var parts = String(iso).slice(0, 10).split('-');
      var d = parts.length === 3
        ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        : new Date(iso);

      if (isNaN(d.getTime())) { return '-'; }
      return d.toLocaleDateString(LOCALE, {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    },

    today: function () {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + m + '-' + day;
    },

    /* Always run user-supplied text through this before putting it in HTML. */
    escape: function (value) {
      if (value === null || value === undefined) { return ''; }
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /* ---- misc ------------------------------------------------------------ */

    debounce: function (fn, wait) {
      var timer;
      return function () {
        var ctx = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
      };
    },

    /* Payment state for a student. Drives both the badge and the filters. */
    feeStatus: function (totalFee, paid) {
      if (paid <= 0) { return 'unpaid'; }
      if (paid >= totalFee) { return 'paid'; }
      return 'partial';
    },

    statusBadge: function (status) {
      var labels = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' };
      var label = labels[status] || 'Unknown';
      return '<span class="badge-status badge-status--' + status + '">' + label + '</span>';
    },

    /* ---- validation ------------------------------------------------------ */

    isEmail: function (value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
    },

    isPhone: function (value) {
      return /^[0-9]{10}$/.test(String(value).replace(/\D/g, ''));
    },

    /*
     * Marks one field valid/invalid using Bootstrap's validation classes.
     * Returns the boolean so callers can && them together.
     */
    setFieldValid: function (input, isValid, message) {
      input.classList.toggle('is-invalid', !isValid);
      input.classList.toggle('is-valid', isValid);
      if (!isValid && message) {
        var feedback = input.parentElement.querySelector('.invalid-feedback');
        if (feedback) { feedback.textContent = message; }
      }
      return isValid;
    },

    clearValidation: function (form) {
      form.querySelectorAll('.is-invalid, .is-valid').forEach(function (el) {
        el.classList.remove('is-invalid', 'is-valid');
      });
    },

    /* ---- feedback -------------------------------------------------------- */

    toast: function (message, variant) {
      var stack = document.querySelector('.toast-stack');
      if (!stack) {
        stack = document.createElement('div');
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
      }

      var tone = { success: 'text-bg-success', danger: 'text-bg-danger', info: 'text-bg-dark' };
      var el = document.createElement('div');
      el.className = 'toast align-items-center border-0 ' + (tone[variant] || tone.info);
      el.setAttribute('role', 'alert');
      el.innerHTML =
        '<div class="d-flex">' +
          '<div class="toast-body">' + Utils.escape(message) + '</div>' +
          '<button type="button" class="btn-close btn-close-white me-2 m-auto" ' +
            'data-bs-dismiss="toast" aria-label="Close"></button>' +
        '</div>';

      stack.appendChild(el);
      var toast = new bootstrap.Toast(el, { delay: 3000 });
      el.addEventListener('hidden.bs.toast', function () { el.remove(); });
      toast.show();
    },

    /* Promise-based confirm so callers can `await` it like a real dialog. */
    confirm: function (message, confirmLabel) {
      return new Promise(function (resolve) {
        var el = document.getElementById('confirmModal');
        var body = el.querySelector('[data-confirm-body]');
        var okBtn = el.querySelector('[data-confirm-ok]');

        body.textContent = message;
        okBtn.textContent = confirmLabel || 'Confirm';

        var modal = bootstrap.Modal.getOrCreateInstance(el);
        var settled = false;

        function onOk() { settled = true; modal.hide(); cleanup(); resolve(true); }
        function onHidden() { if (!settled) { cleanup(); resolve(false); } }
        function cleanup() {
          okBtn.removeEventListener('click', onOk);
          el.removeEventListener('hidden.bs.modal', onHidden);
        }

        okBtn.addEventListener('click', onOk);
        el.addEventListener('hidden.bs.modal', onHidden);
        modal.show();
      });
    }
  };

  global.Utils = Utils;
})(window);
