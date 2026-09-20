/* ==========================================================================
   FeeAPI - the ONLY place in the app that touches data.

   Every function is async and returns a Promise, exactly as it will when it is
   backed by a real server. No page script knows whether the data came from
   localStorage or from HTTP - so switching to the real API is a change to this
   file alone.

   HOW TO GO LIVE
   --------------
   1. Set API_MODE = 'live' and point API_BASE_URL at your server.
   2. In each method, delete the `mock*` branch and uncomment the `request(...)`
      line above it. The real call is already written out for every endpoint.
   3. Delete js/store.js and its <script> tag.
   4. Nothing else in the codebase changes.
   ========================================================================== */
(function (global) {
  'use strict';

  var API_MODE = 'mock';                              // 'mock' | 'live'
  var API_BASE_URL = 'https://localhost:8080/api';    // <- your server
  var MOCK_LATENCY = 220;                             // ms, so loaders are real

  /* ---- HTTP transport (already wired, unused until API_MODE = 'live') ----- */

  function request(path, options) {
    options = options || {};

    var config = {
      method: options.method || 'GET',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        authHeader(),
        options.headers || {}
      )
    };
    if (options.body) { config.body = JSON.stringify(options.body); }

    var url = API_BASE_URL + path + buildQuery(options.query);

    return fetch(url, config).then(function (res) {
      if (res.status === 204) { return null; }
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          throw new ApiError((data && data.message) || res.statusText, res.status, data);
        }
        return data;
      });
    });
  }

  function authHeader() {
    var token = localStorage.getItem('frs.token');
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  function buildQuery(params) {
    if (!params) { return ''; }
    var parts = Object.keys(params)
      .filter(function (k) { return params[k] !== '' && params[k] != null; })
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      });
    return parts.length ? '?' + parts.join('&') : '';
  }

  function ApiError(message, status, body) {
    this.name = 'ApiError';
    this.message = message || 'Request failed';
    this.status = status || 0;
    this.body = body || null;
  }
  ApiError.prototype = Object.create(Error.prototype);

  /* ---- mock transport ----------------------------------------------------- */

  /* Resolves after a short delay so spinners and disabled buttons behave the
     way they will against a real network. */
  function mock(producer) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try { resolve(producer()); }
        catch (err) { reject(err); }
      }, MOCK_LATENCY);
    });
  }

  function isLive() { return API_MODE === 'live'; }

  /* ---- derived values ----------------------------------------------------- */

  /*
   * The server will send these computed fields on each student. Until then we
   * compute them here, so page scripts can rely on them either way.
   */
  function decorate(student, payments) {
    var fees = student.fees || {};
    var totalFee = ['tuition', 'transport', 'hostel', 'exam', 'other']
      .reduce(function (sum, key) { return sum + (Number(fees[key]) || 0); }, 0);

    var paid = payments
      .filter(function (pay) { return pay.studentId === student.id; })
      .reduce(function (sum, pay) { return sum + (Number(pay.amount) || 0); }, 0);

    var due = Math.max(totalFee - paid, 0);

    return Object.assign({}, student, {
      totalFee: totalFee,
      paid: paid,
      due: due,
      feeStatus: Utils.feeStatus(totalFee, paid)
    });
  }

  function notFound(entity, id) {
    throw new ApiError(entity + ' ' + id + ' not found', 404, null);
  }

  /* ======================================================================== */
  /*  STUDENTS                                                                */
  /* ======================================================================== */

  var FeeAPI = {

    ApiError: ApiError,

    /**
     * @param {{search?:string, course?:string, status?:string}} [filters]
     * @returns {Promise<Array>} students, each decorated with totalFee/paid/due
     */
    getStudents: function (filters) {
      filters = filters || {};

      if (isLive()) {
        return request('/students', { query: filters });
      }

      return mock(function () {
        var payments = Store.payments();
        var rows = Store.students().map(function (stu) {
          return decorate(stu, payments);
        });

        var term = (filters.search || '').trim().toLowerCase();
        if (term) {
          rows = rows.filter(function (r) {
            return r.name.toLowerCase().indexOf(term) > -1 ||
                   r.rollNo.toLowerCase().indexOf(term) > -1 ||
                   (r.phone || '').indexOf(term) > -1;
          });
        }
        if (filters.course) {
          rows = rows.filter(function (r) { return r.course === filters.course; });
        }
        if (filters.status) {
          rows = rows.filter(function (r) { return r.feeStatus === filters.status; });
        }

        return rows.sort(function (a, b) { return a.rollNo.localeCompare(b.rollNo); });
      });
    },

    /** @returns {Promise<Object>} one decorated student */
    getStudent: function (id) {
      if (isLive()) {
        return request('/students/' + encodeURIComponent(id));
      }

      return mock(function () {
        var stu = Store.students().find(function (s) { return s.id === id; });
        if (!stu) { notFound('Student', id); }
        return decorate(stu, Store.payments());
      });
    },

    /** @returns {Promise<Object>} the created student */
    createStudent: function (payload) {
      if (isLive()) {
        return request('/students', { method: 'POST', body: payload });
      }

      return mock(function () {
        var list = Store.students();

        var clash = list.some(function (s) { return s.rollNo === payload.rollNo; });
        if (clash) {
          throw new ApiError('Roll number ' + payload.rollNo + ' already exists', 409, null);
        }

        var student = Object.assign({}, payload, {
          id: Store.nextId('student'),
          status: payload.status || 'active'
        });

        list.push(student);
        Store.saveStudents(list);
        return decorate(student, Store.payments());
      });
    },

    /** @returns {Promise<Object>} the updated student */
    updateStudent: function (id, payload) {
      if (isLive()) {
        return request('/students/' + encodeURIComponent(id), { method: 'PUT', body: payload });
      }

      return mock(function () {
        var list = Store.students();
        var index = list.findIndex(function (s) { return s.id === id; });
        if (index === -1) { notFound('Student', id); }

        var clash = list.some(function (s) {
          return s.rollNo === payload.rollNo && s.id !== id;
        });
        if (clash) {
          throw new ApiError('Roll number ' + payload.rollNo + ' already exists', 409, null);
        }

        list[index] = Object.assign({}, list[index], payload, { id: id });
        Store.saveStudents(list);
        return decorate(list[index], Store.payments());
      });
    },

    /** @returns {Promise<void>} */
    deleteStudent: function (id) {
      if (isLive()) {
        return request('/students/' + encodeURIComponent(id), { method: 'DELETE' });
      }

      return mock(function () {
        var list = Store.students();
        var index = list.findIndex(function (s) { return s.id === id; });
        if (index === -1) { notFound('Student', id); }

        list.splice(index, 1);
        Store.saveStudents(list);

        /* Cascade: a receipt cannot outlive its student. */
        Store.savePayments(Store.payments().filter(function (p) {
          return p.studentId !== id;
        }));
      });
    },

    /** @returns {Promise<string[]>} distinct course names, for filter dropdowns */
    getCourses: function () {
      if (isLive()) {
        return request('/courses');
      }

      return mock(function () {
        var seen = {};
        Store.students().forEach(function (s) { seen[s.course] = true; });
        return Object.keys(seen).sort();
      });
    },

    /* ====================================================================== */
    /*  PAYMENTS                                                              */
    /* ====================================================================== */

    /**
     * @param {{studentId?:string, mode?:string, from?:string, to?:string, search?:string}} [filters]
     * @returns {Promise<Array>} payments, newest first, each with student details
     */
    getPayments: function (filters) {
      filters = filters || {};

      if (isLive()) {
        return request('/payments', { query: filters });
      }

      return mock(function () {
        var students = Store.students();

        var rows = Store.payments().map(function (pay) {
          var stu = students.find(function (s) { return s.id === pay.studentId; });
          return Object.assign({}, pay, {
            studentName: stu ? stu.name : 'Deleted student',
            rollNo: stu ? stu.rollNo : '-',
            course: stu ? stu.course : '-'
          });
        });

        if (filters.studentId) {
          rows = rows.filter(function (r) { return r.studentId === filters.studentId; });
        }
        if (filters.mode) {
          rows = rows.filter(function (r) { return r.mode === filters.mode; });
        }
        if (filters.from) {
          rows = rows.filter(function (r) { return r.date >= filters.from; });
        }
        if (filters.to) {
          rows = rows.filter(function (r) { return r.date <= filters.to; });
        }

        var term = (filters.search || '').trim().toLowerCase();
        if (term) {
          rows = rows.filter(function (r) {
            return r.studentName.toLowerCase().indexOf(term) > -1 ||
                   r.rollNo.toLowerCase().indexOf(term) > -1 ||
                   r.id.toLowerCase().indexOf(term) > -1 ||
                   (r.reference || '').toLowerCase().indexOf(term) > -1;
          });
        }

        return rows.sort(function (a, b) {
          if (a.date === b.date) { return b.id.localeCompare(a.id); }
          return a.date < b.date ? 1 : -1;
        });
      });
    },

    /** @returns {Promise<Object>} the created payment, ready to print as a receipt */
    createPayment: function (payload) {
      if (isLive()) {
        return request('/payments', { method: 'POST', body: payload });
      }

      return mock(function () {
        var students = Store.students();
        var stu = students.find(function (s) { return s.id === payload.studentId; });
        if (!stu) { notFound('Student', payload.studentId); }

        var amount = Number(payload.amount);
        if (!(amount > 0)) {
          throw new ApiError('Amount must be greater than zero', 400, null);
        }

        /* Server-side guard: never accept more than the outstanding balance.
           The form checks this too, but the form can be bypassed. */
        var current = decorate(stu, Store.payments());
        if (amount > current.due) {
          throw new ApiError(
            'Amount exceeds the outstanding due of ' + Utils.money(current.due), 400, null
          );
        }

        var payment = {
          id: Store.nextId('payment'),
          studentId: payload.studentId,
          amount: amount,
          mode: payload.mode,
          date: payload.date,
          reference: payload.reference || '',
          remarks: payload.remarks || '',
          createdAt: new Date().toISOString()
        };

        var list = Store.payments();
        list.push(payment);
        Store.savePayments(list);

        return Object.assign({}, payment, {
          studentName: stu.name,
          rollNo: stu.rollNo,
          course: stu.course,
          balanceAfter: current.due - amount
        });
      });
    },

    /** @returns {Promise<void>} */
    deletePayment: function (id) {
      if (isLive()) {
        return request('/payments/' + encodeURIComponent(id), { method: 'DELETE' });
      }

      return mock(function () {
        var list = Store.payments();
        var index = list.findIndex(function (p) { return p.id === id; });
        if (index === -1) { notFound('Receipt', id); }

        list.splice(index, 1);
        Store.savePayments(list);
      });
    },

    /* ====================================================================== */
    /*  DASHBOARD                                                             */
    /* ====================================================================== */

    /**
     * @returns {Promise<{totalStudents:number, expected:number, collected:number,
     *                    outstanding:number, defaulters:number,
     *                    outstandingByCourse:Array, recentPayments:Array}>}
     */
    getDashboardStats: function () {
      if (isLive()) {
        return request('/dashboard/stats');
      }

      return mock(function () {
        var payments = Store.payments();
        var students = Store.students().map(function (s) { return decorate(s, payments); });

        var expected = 0, collected = 0, defaulters = 0;
        var byCourse = {};

        students.forEach(function (s) {
          expected += s.totalFee;
          collected += s.paid;
          if (s.due > 0) { defaulters += 1; }
          byCourse[s.course] = (byCourse[s.course] || 0) + s.due;
        });

        var outstandingByCourse = Object.keys(byCourse)
          .map(function (course) { return { course: course, due: byCourse[course] }; })
          .filter(function (row) { return row.due > 0; })
          .sort(function (a, b) { return b.due - a.due; });

        var recentPayments = payments
          .slice()
          .sort(function (a, b) {
            if (a.date === b.date) { return b.id.localeCompare(a.id); }
            return a.date < b.date ? 1 : -1;
          })
          .slice(0, 5)
          .map(function (pay) {
            var stu = students.find(function (s) { return s.id === pay.studentId; });
            return Object.assign({}, pay, {
              studentName: stu ? stu.name : 'Deleted student',
              rollNo: stu ? stu.rollNo : '-'
            });
          });

        return {
          totalStudents: students.length,
          expected: expected,
          collected: collected,
          outstanding: Math.max(expected - collected, 0),
          defaulters: defaulters,
          outstandingByCourse: outstandingByCourse,
          recentPayments: recentPayments
        };
      });
    }
  };

  global.FeeAPI = FeeAPI;
})(window);
