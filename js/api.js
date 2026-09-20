/* ==========================================================================
   FeeAPI - the ONLY place in the app that touches data.

   Every function is async and returns a Promise. No page script knows or cares
   how the data arrives; they all just call FeeAPI and await the result.

   Backed by the Spring Boot API in ../backend. Point API_BASE_URL at whichever
   host is serving it.

   The server owns all money arithmetic: it returns totalFee, paid, due and
   feeStatus on every student, so nothing here has to compute them.
   ========================================================================== */
(function (global) {
  'use strict';

  var API_BASE_URL = 'http://localhost:8080/api';     // <- your server

  /* ---- HTTP transport ----------------------------------------------------- */

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

  /* ======================================================================== */

  var FeeAPI = {

    ApiError: ApiError,

    /* ---- students -------------------------------------------------------- */

    /**
     * @param {{search?:string, course?:string, status?:string}} [filters]
     * @returns {Promise<Array>} students, each carrying totalFee/paid/due/feeStatus
     */
    getStudents: function (filters) {
      return request('/students', { query: filters || {} });
    },

    /** @returns {Promise<Object>} one student */
    getStudent: function (id) {
      return request('/students/' + encodeURIComponent(id));
    },

    /** @returns {Promise<Object>} the created student. Rejects 409 on a duplicate roll number. */
    createStudent: function (payload) {
      return request('/students', { method: 'POST', body: payload });
    },

    /** @returns {Promise<Object>} the updated student. Rejects 409 on a duplicate roll number. */
    updateStudent: function (id, payload) {
      return request('/students/' + encodeURIComponent(id), { method: 'PUT', body: payload });
    },

    /** Cascades to that student's receipts. @returns {Promise<void>} */
    deleteStudent: function (id) {
      return request('/students/' + encodeURIComponent(id), { method: 'DELETE' });
    },

    /** @returns {Promise<string[]>} distinct course names, for filter dropdowns */
    getCourses: function () {
      return request('/courses');
    },

    /* ---- payments -------------------------------------------------------- */

    /**
     * @param {{studentId?:string, mode?:string, from?:string, to?:string, search?:string}} [filters]
     * @returns {Promise<Array>} payments, newest first, each with student details
     */
    getPayments: function (filters) {
      return request('/payments', { query: filters || {} });
    },

    /**
     * Rejects 400 if the amount exceeds the outstanding balance - the form checks
     * this too, but the form can be bypassed, so the server's check is the real one.
     * @returns {Promise<Object>} the payment plus balanceAfter, ready to print
     */
    createPayment: function (payload) {
      return request('/payments', { method: 'POST', body: payload });
    },

    /** Voids a receipt; the student's balance due rises again. @returns {Promise<void>} */
    deletePayment: function (id) {
      return request('/payments/' + encodeURIComponent(id), { method: 'DELETE' });
    },

    /* ---- dashboard ------------------------------------------------------- */

    /**
     * @returns {Promise<{totalStudents:number, expected:number, collected:number,
     *                    outstanding:number, defaulters:number,
     *                    outstandingByCourse:Array, recentPayments:Array}>}
     */
    getDashboardStats: function () {
      return request('/dashboard/stats');
    }
  };

  global.FeeAPI = FeeAPI;
})(window);
