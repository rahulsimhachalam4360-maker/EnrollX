/* ==========================================================================
   Students page - list, filter, register, edit, delete.
   ========================================================================== */
(function () {
  'use strict';

  Layout.init();

  var FEE_KEYS = ['tuition', 'transport', 'hostel', 'exam', 'other'];

  var form = document.getElementById('studentForm');
  var modalEl = document.getElementById('studentModal');
  var modal = new bootstrap.Modal(modalEl);
  var detailEl = document.getElementById('detailModal');
  var detailModal = new bootstrap.Modal(detailEl);

  var tableBody = document.querySelector('[data-student-rows]');
  var rowCount = document.querySelector('[data-row-count]');
  var submitBtn = document.querySelector('[data-submit-btn]');

  var searchInput = document.getElementById('filterSearch');
  var courseFilter = document.getElementById('filterCourse');
  var statusFilter = document.getElementById('filterStatus');

  /* id of the student being edited; null while registering a new one */
  var editingId = null;

  /*
   * Always reach fields through form.elements. Plain `form.name` would return
   * the form's own name property, not the input called "name".
   */
  function el(fieldName) {
    return form.elements[fieldName];
  }

  /* ---- list ---------------------------------------------------------------- */

  function currentFilters() {
    return {
      search: searchInput.value,
      course: courseFilter.value,
      status: statusFilter.value
    };
  }

  function loadStudents() {
    tableBody.innerHTML = '<tr><td colspan="8" class="table-empty">Loading&hellip;</td></tr>';

    FeeAPI.getStudents(currentFilters())
      .then(renderRows)
      .catch(function (err) {
        tableBody.innerHTML =
          '<tr><td colspan="8" class="table-empty text-danger">' +
          Utils.escape(err.message) + '</td></tr>';
      });
  }

  function renderRows(rows) {
    if (!rows.length) {
      tableBody.innerHTML =
        '<tr><td colspan="8" class="table-empty">No students match these filters.</td></tr>';
      rowCount.textContent = '0 students';
      return;
    }

    tableBody.innerHTML = rows.map(function (s) {
      return '<tr>' +
          '<td class="num text-start">' + Utils.escape(s.rollNo) + '</td>' +
          '<td>' +
            '<div class="fw-medium">' + Utils.escape(s.name) + '</div>' +
            '<div class="small text-secondary">' + Utils.escape(s.email) + '</div>' +
          '</td>' +
          '<td>' +
            Utils.escape(s.course) +
            '<div class="small text-secondary">Year ' + Utils.escape(s.year) +
              (s.section ? ' &middot; Sec ' + Utils.escape(s.section) : '') +
            '</div>' +
          '</td>' +
          '<td class="num">' + Utils.money(s.totalFee) + '</td>' +
          '<td class="num">' + Utils.money(s.paid) + '</td>' +
          '<td class="num fw-semibold">' + Utils.money(s.due) + '</td>' +
          '<td>' + Utils.statusBadge(s.feeStatus) + '</td>' +
          '<td class="text-end text-nowrap">' +
            btn('view', s.id, 'View') +
            btn('edit', s.id, 'Edit') +
            btn('delete', s.id, 'Delete', 'btn-outline-danger') +
          '</td>' +
        '</tr>';
    }).join('');

    rowCount.textContent = rows.length + (rows.length === 1 ? ' student' : ' students');
  }

  function btn(action, id, label, variant) {
    return '<button class="btn btn-sm ' + (variant || 'btn-outline-secondary') + ' ms-1" ' +
      'type="button" data-action="' + action + '" data-id="' + Utils.escape(id) + '">' +
      label + '</button>';
  }

  /* ---- filters ------------------------------------------------------------- */

  function loadCourseOptions() {
    FeeAPI.getCourses().then(function (courses) {
      var options = courses.map(function (c) {
        return '<option value="' + Utils.escape(c) + '">' + Utils.escape(c) + '</option>';
      }).join('');

      courseFilter.innerHTML = '<option value="">All courses</option>' + options;
      document.getElementById('courseOptions').innerHTML = options;
    });
  }

  searchInput.addEventListener('input', Utils.debounce(loadStudents, 300));
  courseFilter.addEventListener('change', loadStudents);
  statusFilter.addEventListener('change', loadStudents);

  document.querySelector('[data-clear-filters]').addEventListener('click', function () {
    searchInput.value = '';
    courseFilter.value = '';
    statusFilter.value = '';
    loadStudents();
  });

  /* ---- add / edit ---------------------------------------------------------- */

  function openCreate() {
    editingId = null;
    form.reset();
    Utils.clearValidation(form);
    document.querySelector('[data-modal-title]').textContent = 'Register student';
    submitBtn.textContent = 'Save student';
    el('admissionDate').value = Utils.today();
    hideFeeWarning();
    recalcTotal();
    modal.show();
  }

  function openEdit(id) {
    FeeAPI.getStudent(id).then(function (s) {
      editingId = id;
      form.reset();
      Utils.clearValidation(form);

      document.querySelector('[data-modal-title]').textContent = 'Edit ' + s.name;
      submitBtn.textContent = 'Update student';

      el('name').value = s.name;
      el('rollNo').value = s.rollNo;
      el('course').value = s.course;
      el('year').value = s.year;
      el('section').value = s.section || '';
      el('email').value = s.email || '';
      el('phone').value = s.phone || '';
      el('guardian').value = s.guardian || '';
      el('admissionDate').value = s.admissionDate || '';

      FEE_KEYS.forEach(function (key) {
        el(key).value = (s.fees && s.fees[key]) || 0;
      });

      /* Lowering the fee structure below what the student already paid would
         produce a negative balance - warn while editing, block on submit. */
      modalEl.dataset.alreadyPaid = String(s.paid);
      recalcTotal();
      modal.show();
    }).catch(function (err) {
      Utils.toast(err.message, 'danger');
    });
  }

  function readFees() {
    var fees = {};
    FEE_KEYS.forEach(function (key) {
      fees[key] = Number(el(key).value) || 0;
    });
    return fees;
  }

  function feeTotal(fees) {
    return FEE_KEYS.reduce(function (sum, key) { return sum + fees[key]; }, 0);
  }

  function recalcTotal() {
    var total = feeTotal(readFees());
    document.querySelector('[data-fee-total]').textContent = Utils.money(total);

    var paid = Number(modalEl.dataset.alreadyPaid || 0);
    if (editingId && paid > total) {
      showFeeWarning(
        'This student has already paid ' + Utils.money(paid) +
        ', which is more than the new total of ' + Utils.money(total) + '.'
      );
    } else {
      hideFeeWarning();
    }
  }

  function showFeeWarning(message) {
    var box = document.querySelector('[data-fee-warning]');
    box.textContent = message;
    box.classList.remove('d-none');
  }

  function hideFeeWarning() {
    document.querySelector('[data-fee-warning]').classList.add('d-none');
  }

  form.querySelectorAll('.fee-input').forEach(function (input) {
    input.addEventListener('input', recalcTotal);
  });

  modalEl.addEventListener('hidden.bs.modal', function () {
    delete modalEl.dataset.alreadyPaid;
  });

  /* ---- validation ---------------------------------------------------------- */

  function validate() {
    var ok = true;

    ok = Utils.setFieldValid(el('name'), el('name').value.trim().length >= 2) && ok;
    ok = Utils.setFieldValid(el('rollNo'), el('rollNo').value.trim().length >= 2) && ok;
    ok = Utils.setFieldValid(el('course'), el('course').value.trim().length >= 2) && ok;
    ok = Utils.setFieldValid(el('email'), Utils.isEmail(el('email').value)) && ok;
    ok = Utils.setFieldValid(el('phone'), Utils.isPhone(el('phone').value)) && ok;
    ok = Utils.setFieldValid(el('admissionDate'), !!el('admissionDate').value) && ok;

    FEE_KEYS.forEach(function (key) {
      var input = el(key);
      var value = Number(input.value);
      ok = Utils.setFieldValid(input, input.value !== '' && value >= 0) && ok;
    });

    if (ok) {
      var total = feeTotal(readFees());
      var paid = Number(modalEl.dataset.alreadyPaid || 0);

      if (total <= 0) {
        showFeeWarning('The fee structure must add up to more than zero.');
        ok = false;
      } else if (editingId && total < paid) {
        showFeeWarning(
          'Total fee cannot be lower than the ' + Utils.money(paid) + ' already collected.'
        );
        ok = false;
      }
    }

    return ok;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!validate()) { return; }

    var payload = {
      name: el('name').value.trim(),
      rollNo: el('rollNo').value.trim().toUpperCase(),
      course: el('course').value.trim(),
      year: Number(el('year').value),
      section: el('section').value.trim().toUpperCase(),
      email: el('email').value.trim(),
      phone: el('phone').value.replace(/\D/g, ''),
      guardian: el('guardian').value.trim(),
      admissionDate: el('admissionDate').value,
      fees: readFees()
    };

    submitBtn.disabled = true;

    var action = editingId
      ? FeeAPI.updateStudent(editingId, payload)
      : FeeAPI.createStudent(payload);

    action
      .then(function (student) {
        modal.hide();
        Utils.toast(
          editingId ? 'Updated ' + student.name : 'Registered ' + student.name +
            ' (' + student.id + ')',
          'success'
        );
        loadCourseOptions();
        loadStudents();
      })
      .catch(function (err) {
        if (err.status === 409) {
          Utils.setFieldValid(el('rollNo'), false, err.message);
        } else {
          Utils.toast(err.message, 'danger');
        }
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  /* ---- detail -------------------------------------------------------------- */

  function openDetail(id) {
    Promise.all([FeeAPI.getStudent(id), FeeAPI.getPayments({ studentId: id })])
      .then(function (results) {
        var s = results[0];
        var payments = results[1];

        document.querySelector('[data-detail-collect]').href =
          'collect.html?student=' + encodeURIComponent(s.id);

        document.querySelector('[data-detail-body]').innerHTML =
          '<div class="d-flex justify-content-between align-items-start mb-3">' +
            '<div>' +
              '<h4 class="h5 mb-1">' + Utils.escape(s.name) + '</h4>' +
              '<div class="text-secondary small">' +
                Utils.escape(s.rollNo) + ' &middot; ' + Utils.escape(s.course) +
                ' &middot; Year ' + Utils.escape(s.year) +
              '</div>' +
            '</div>' +
            Utils.statusBadge(s.feeStatus) +
          '</div>' +

          '<div class="row g-3 mb-4">' +
            detailField('Email', s.email) +
            detailField('Phone', s.phone) +
            detailField('Guardian', s.guardian || '-') +
            detailField('Admitted', Utils.date(s.admissionDate)) +
          '</div>' +

          '<h6 class="text-secondary small text-uppercase mb-2">Fee structure</h6>' +
          '<div class="mb-4">' +
            FEE_KEYS.map(function (key) {
              return feeRow(key, (s.fees && s.fees[key]) || 0);
            }).join('') +
            '<div class="fee-breakdown-row fw-semibold">' +
              '<span>Total</span><span class="num">' + Utils.money(s.totalFee) + '</span>' +
            '</div>' +
            '<div class="fee-breakdown-row text-success">' +
              '<span>Paid</span><span class="num">' + Utils.money(s.paid) + '</span>' +
            '</div>' +
            '<div class="fee-breakdown-row fw-semibold">' +
              '<span>Balance due</span><span class="num">' + Utils.money(s.due) + '</span>' +
            '</div>' +
          '</div>' +

          '<h6 class="text-secondary small text-uppercase mb-2">Payment history</h6>' +
          paymentHistory(payments);

        detailModal.show();
      })
      .catch(function (err) { Utils.toast(err.message, 'danger'); });
  }

  function detailField(label, value) {
    return '<div class="col-6 col-md-3">' +
      '<div class="small text-secondary">' + label + '</div>' +
      '<div>' + Utils.escape(value) + '</div>' +
    '</div>';
  }

  function feeRow(key, amount) {
    var labels = {
      tuition: 'Tuition', transport: 'Transport', hostel: 'Hostel',
      exam: 'Exam', other: 'Other charges'
    };
    return '<div class="fee-breakdown-row">' +
      '<span class="text-secondary">' + labels[key] + '</span>' +
      '<span class="num">' + Utils.money(amount) + '</span>' +
    '</div>';
  }

  function paymentHistory(payments) {
    if (!payments.length) {
      return '<p class="text-secondary small mb-0">No payments recorded for this student yet.</p>';
    }

    return '<div class="table-responsive"><table class="table table-sm mb-0">' +
      '<thead><tr><th>Receipt</th><th>Date</th><th>Mode</th>' +
      '<th class="text-end">Amount</th></tr></thead><tbody>' +
      payments.map(function (p) {
        return '<tr>' +
          '<td class="num text-start">' + Utils.escape(p.id) + '</td>' +
          '<td>' + Utils.date(p.date) + '</td>' +
          '<td>' + Utils.escape(p.mode) + '</td>' +
          '<td class="num">' + Utils.money(p.amount) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* ---- delete -------------------------------------------------------------- */

  function confirmDelete(id) {
    FeeAPI.getStudent(id).then(function (s) {
      var extra = s.paid > 0
        ? ' Their ' + Utils.money(s.paid) + ' of receipts will be deleted too.'
        : '';

      return Utils.confirm('Delete ' + s.name + ' (' + s.rollNo + ')?' + extra, 'Delete')
        .then(function (ok) {
          if (!ok) { return; }
          return FeeAPI.deleteStudent(id).then(function () {
            Utils.toast('Deleted ' + s.name, 'success');
            loadStudents();
          });
        });
    }).catch(function (err) { Utils.toast(err.message, 'danger'); });
  }

  /* ---- events -------------------------------------------------------------- */

  document.querySelector('[data-add-student]').addEventListener('click', openCreate);

  /* One delegated listener - rows are re-rendered on every filter change. */
  tableBody.addEventListener('click', function (event) {
    var button = event.target.closest('[data-action]');
    if (!button) { return; }

    var id = button.dataset.id;
    if (button.dataset.action === 'view') { openDetail(id); }
    if (button.dataset.action === 'edit') { openEdit(id); }
    if (button.dataset.action === 'delete') { confirmDelete(id); }
  });

  loadCourseOptions();
  loadStudents();
})();
