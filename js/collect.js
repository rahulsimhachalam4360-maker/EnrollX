/* ==========================================================================
   Collect Fee page - pick a student, record a payment, print the receipt.
   ========================================================================== */
(function () {
  'use strict';

  Layout.init();
  Receipt.wirePrint();

  var FEE_LABELS = {
    tuition: 'Tuition', transport: 'Transport', hostel: 'Hostel',
    exam: 'Exam', other: 'Other charges'
  };

  /* Modes where a transaction/cheque number must be captured. */
  var REFERENCE_REQUIRED = ['UPI', 'Card', 'Bank Transfer', 'Cheque'];

  var form = document.getElementById('paymentForm');
  var studentSelect = document.getElementById('studentId');
  var amountInput = document.getElementById('amount');
  var modeSelect = document.getElementById('mode');
  var dateInput = document.getElementById('date');
  var referenceInput = document.getElementById('reference');
  var submitBtn = document.querySelector('[data-submit-btn]');
  var summaryBox = document.querySelector('[data-fee-summary]');
  var amountHint = document.querySelector('[data-amount-hint]');

  /* The decorated student currently selected, or null. */
  var selected = null;

  /* The deep link is honoured once, on first load - not after every save. */
  var isFirstLoad = true;

  /* ---- student picker ------------------------------------------------------ */

  function loadStudents() {
    return FeeAPI.getStudents().then(function (students) {
      studentSelect.innerHTML =
        '<option value="">Select a student&hellip;</option>' +
        students.map(function (s) {
          var suffix = s.due > 0 ? ' - ' + Utils.money(s.due) + ' due' : ' - paid up';
          return '<option value="' + Utils.escape(s.id) + '">' +
            Utils.escape(s.rollNo) + ' &middot; ' + Utils.escape(s.name) +
            Utils.escape(suffix) +
          '</option>';
        }).join('');

      /* Deep link from the student list: collect.html?student=STU-1001 */
      if (isFirstLoad) {
        isFirstLoad = false;
        var preselect = new URLSearchParams(location.search).get('student');
        if (preselect) {
          studentSelect.value = preselect;
          if (studentSelect.value) { onStudentChange(); }
        }
      }
    });
  }

  function onStudentChange() {
    var id = studentSelect.value;

    if (!id) {
      selected = null;
      renderEmptySummary();
      setAmountState(null);
      return;
    }

    FeeAPI.getStudent(id)
      .then(function (student) {
        selected = student;
        renderSummary(student);
        setAmountState(student);
      })
      .catch(function (err) { Utils.toast(err.message, 'danger'); });
  }

  /* ---- amount field state -------------------------------------------------- */

  function setAmountState(student) {
    if (!student) {
      amountInput.disabled = true;
      amountInput.value = '';
      amountInput.removeAttribute('max');
      amountHint.textContent = 'Select a student first.';
      submitBtn.disabled = true;
      return;
    }

    if (student.due <= 0) {
      amountInput.disabled = true;
      amountInput.value = '';
      amountHint.textContent = 'This student has cleared the full fee.';
      submitBtn.disabled = true;
      return;
    }

    amountInput.disabled = false;
    amountInput.max = String(student.due);
    amountInput.value = String(student.due);   // full balance is the common case
    amountHint.textContent = 'Balance due: ' + Utils.money(student.due) +
      '. Enter less for a part payment.';
    submitBtn.disabled = false;
    Utils.setFieldValid(amountInput, true);
  }

  /* ---- fee summary panel --------------------------------------------------- */

  function renderEmptySummary() {
    summaryBox.innerHTML =
      '<p class="text-secondary small mb-0">' +
        'Select a student to see their fee structure and outstanding balance.' +
      '</p>';
  }

  function renderSummary(s) {
    var pct = s.totalFee > 0 ? Math.round((s.paid / s.totalFee) * 100) : 0;

    summaryBox.innerHTML =
      '<div class="d-flex justify-content-between align-items-start mb-3">' +
        '<div>' +
          '<div class="fw-semibold">' + Utils.escape(s.name) + '</div>' +
          '<div class="small text-secondary">' +
            Utils.escape(s.rollNo) + ' &middot; ' + Utils.escape(s.course) +
          '</div>' +
        '</div>' +
        Utils.statusBadge(s.feeStatus) +
      '</div>' +

      '<div class="d-flex justify-content-between small text-secondary mb-1">' +
        '<span>Paid so far</span><span>' + pct + '%</span>' +
      '</div>' +
      '<div class="meter__track mb-3" role="progressbar" aria-valuemin="0" ' +
        'aria-valuemax="100" aria-valuenow="' + pct + '">' +
        '<div class="meter__fill" style="width:' + pct + '%"></div>' +
      '</div>' +

      Object.keys(FEE_LABELS).map(function (key) {
        return '<div class="fee-breakdown-row">' +
          '<span class="text-secondary">' + FEE_LABELS[key] + '</span>' +
          '<span class="num">' + Utils.money((s.fees && s.fees[key]) || 0) + '</span>' +
        '</div>';
      }).join('') +

      '<div class="fee-breakdown-row fw-semibold">' +
        '<span>Total fee</span><span class="num">' + Utils.money(s.totalFee) + '</span>' +
      '</div>' +
      '<div class="fee-breakdown-row">' +
        '<span class="text-secondary">Already paid</span>' +
        '<span class="num">' + Utils.money(s.paid) + '</span>' +
      '</div>' +
      '<div class="fee-breakdown-row fw-semibold fs-5">' +
        '<span>Balance due</span><span class="num">' + Utils.money(s.due) + '</span>' +
      '</div>';
  }

  /* ---- validation ---------------------------------------------------------- */

  function referenceIsRequired() {
    return REFERENCE_REQUIRED.indexOf(modeSelect.value) > -1;
  }

  function syncReferenceRequirement() {
    var label = document.querySelector('[data-reference-label]');
    label.classList.toggle('required', referenceIsRequired());
    referenceInput.placeholder = modeSelect.value === 'Cheque'
      ? 'Cheque number'
      : 'Transaction reference';
  }

  function validate() {
    var ok = true;

    ok = Utils.setFieldValid(studentSelect, !!selected) && ok;

    var amount = Number(amountInput.value);
    var amountOk = !!selected && amount > 0 && amount <= selected.due;
    if (!amountOk && selected) {
      Utils.setFieldValid(amountInput, false,
        'Enter an amount between ' + Utils.money(1) + ' and ' + Utils.money(selected.due) + '.');
    } else {
      Utils.setFieldValid(amountInput, amountOk);
    }
    ok = amountOk && ok;

    var dateOk = !!dateInput.value && dateInput.value <= Utils.today();
    ok = Utils.setFieldValid(dateInput, dateOk) && ok;

    var referenceOk = !referenceIsRequired() || referenceInput.value.trim().length >= 3;
    ok = Utils.setFieldValid(referenceInput, referenceOk,
      'Enter the transaction or cheque number.') && ok;

    return ok;
  }

  /* ---- submit -------------------------------------------------------------- */

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!validate()) { return; }

    var payload = {
      studentId: selected.id,
      amount: Number(amountInput.value),
      mode: modeSelect.value,
      date: dateInput.value,
      reference: referenceInput.value.trim(),
      remarks: document.getElementById('remarks').value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    FeeAPI.createPayment(payload)
      .then(function (payment) {
        Utils.toast('Receipt ' + payment.id + ' created', 'success');
        Receipt.show(payment);
        form.reset();          // fires the reset handler below
        return loadStudents();
      })
      .catch(function (err) {
        Utils.toast(err.message, 'danger');
      })
      .finally(function () {
        submitBtn.textContent = 'Record payment';
        /* Re-derive rather than blindly enabling: on success the form has
           already reset itself, and there is no student to pay for. */
        submitBtn.disabled = !selected || selected.due <= 0;
      });
  });

  /*
   * Restores everything the browser's native reset does not: our own validation
   * classes, the selected-student state, and the defaulted date.
   * Never call form.reset() from in here - the reset handler calls this.
   */
  function resetFormState() {
    Utils.clearValidation(form);
    selected = null;
    studentSelect.value = '';
    dateInput.value = Utils.today();
    dateInput.max = Utils.today();
    renderEmptySummary();
    setAmountState(null);
    syncReferenceRequirement();
  }

  /* ---- events -------------------------------------------------------------- */

  studentSelect.addEventListener('change', onStudentChange);
  modeSelect.addEventListener('change', syncReferenceRequirement);

  amountInput.addEventListener('input', function () {
    if (!selected) { return; }
    var amount = Number(amountInput.value);
    Utils.setFieldValid(amountInput, amount > 0 && amount <= selected.due);
  });

  /* The reset event fires BEFORE the browser clears the fields, so defer. */
  form.addEventListener('reset', function () {
    setTimeout(resetFormState, 0);
  });

  dateInput.value = Utils.today();
  dateInput.max = Utils.today();
  syncReferenceRequirement();
  loadStudents();
})();
