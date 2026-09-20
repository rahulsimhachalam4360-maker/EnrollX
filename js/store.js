/* ==========================================================================
   Store - the MOCK backend.

   This file exists only because there is no server yet. It keeps students and
   payments in localStorage so the app survives a refresh during demos.

   >>> When the real API arrives, delete this file and remove its <script> tag.
   >>> Nothing outside js/api.js talks to it.
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY_STUDENTS = 'frs.students';
  var KEY_PAYMENTS = 'frs.payments';
  var KEY_SEQ = 'frs.seq';

  /* ---- seed data --------------------------------------------------------- */

  function seedStudents() {
    return [
      s('STU-1001', 'Aarav Sharma',    'FRS24001', 'B.Tech CSE',   2, 'A', 'aarav.sharma@example.com',   '9876543210', 'Rakesh Sharma',   '2024-07-15', 85000, 12000, 0,     4000, 2000),
      s('STU-1002', 'Diya Patel',      'FRS24002', 'B.Tech CSE',   2, 'A', 'diya.patel@example.com',     '9876543211', 'Nilesh Patel',    '2024-07-15', 85000, 0,     65000, 4000, 2000),
      s('STU-1003', 'Vihaan Reddy',    'FRS24003', 'B.Tech ECE',   1, 'B', 'vihaan.reddy@example.com',   '9876543212', 'Suresh Reddy',    '2025-07-02', 78000, 12000, 0,     4000, 1500),
      s('STU-1004', 'Ananya Iyer',     'FRS24004', 'B.Tech ECE',   1, 'B', 'ananya.iyer@example.com',    '9876543213', 'Mohan Iyer',      '2025-07-02', 78000, 0,     65000, 4000, 1500),
      s('STU-1005', 'Ishaan Verma',    'FRS24005', 'MBA',          1, 'A', 'ishaan.verma@example.com',   '9876543214', 'Anil Verma',      '2025-08-01', 120000, 15000, 0,    6000, 3000),
      s('STU-1006', 'Saanvi Nair',     'FRS24006', 'MBA',          2, 'A', 'saanvi.nair@example.com',    '9876543215', 'Rajan Nair',      '2024-08-01', 120000, 0,     72000, 6000, 3000),
      s('STU-1007', 'Kabir Singh',     'FRS24007', 'B.Sc Physics', 3, 'C', 'kabir.singh@example.com',    '9876543216', 'Harpreet Singh',  '2023-07-20', 42000, 9000,  0,     3000, 1200),
      s('STU-1008', 'Myra Joshi',      'FRS24008', 'B.Sc Physics', 1, 'C', 'myra.joshi@example.com',     '9876543217', 'Deepak Joshi',    '2025-07-20', 42000, 9000,  0,     3000, 1200),
      s('STU-1009', 'Arjun Menon',     'FRS24009', 'B.Tech CSE',   1, 'B', 'arjun.menon@example.com',    '9876543218', 'Vinod Menon',     '2025-07-16', 85000, 12000, 0,     4000, 2000)
    ];
  }

  function s(id, name, rollNo, course, year, section, email, phone, guardian, admissionDate,
             tuition, transport, hostel, exam, other) {
    return {
      id: id,
      name: name,
      rollNo: rollNo,
      course: course,
      year: year,
      section: section,
      email: email,
      phone: phone,
      guardian: guardian,
      admissionDate: admissionDate,
      status: 'active',
      fees: {
        tuition: tuition,
        transport: transport,
        hostel: hostel,
        exam: exam,
        other: other
      }
    };
  }

  function seedPayments() {
    return [
      p('RCP-2001', 'STU-1001', 50000, 'UPI',           '2025-07-18', 'UPI-8842013'),
      p('RCP-2002', 'STU-1001', 30000, 'Bank Transfer', '2025-09-10', 'NEFT-553210'),
      p('RCP-2003', 'STU-1002', 40000, 'Cheque',        '2025-07-20', 'CHQ-110293'),
      p('RCP-2004', 'STU-1003', 95500, 'Card',          '2025-07-05', 'TXN-772311'),
      p('RCP-2005', 'STU-1004', 25000, 'Cash',          '2025-07-08', ''),
      p('RCP-2006', 'STU-1005', 60000, 'UPI',           '2025-08-05', 'UPI-9013442'),
      p('RCP-2007', 'STU-1005', 40000, 'UPI',           '2026-01-12', 'UPI-9188220'),
      p('RCP-2008', 'STU-1006', 201000, 'Bank Transfer','2024-08-09', 'NEFT-441002'),
      p('RCP-2009', 'STU-1007', 30000, 'Cash',          '2025-07-25', ''),
      p('RCP-2010', 'STU-1007', 25200, 'UPI',           '2025-11-03', 'UPI-8120044'),
      p('RCP-2011', 'STU-1008', 20000, 'Card',          '2025-07-28', 'TXN-660120')
    ];
  }

  function p(id, studentId, amount, mode, date, reference) {
    return {
      id: id,
      studentId: studentId,
      amount: amount,
      mode: mode,
      date: date,
      reference: reference,
      remarks: '',
      createdAt: new Date(date).toISOString()
    };
  }

  /* ---- localStorage plumbing --------------------------------------------- */

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn('[store] could not read ' + key, err);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[store] could not write ' + key, err);
      return false;
    }
  }

  var Store = {

    /* Seeds demo data the first time the app is opened. */
    init: function () {
      if (localStorage.getItem(KEY_STUDENTS) === null) {
        write(KEY_STUDENTS, seedStudents());
        write(KEY_PAYMENTS, seedPayments());
        write(KEY_SEQ, { student: 1009, payment: 2011 });
      }
    },

    students: function () { return read(KEY_STUDENTS, []); },
    payments: function () { return read(KEY_PAYMENTS, []); },

    saveStudents: function (list) { return write(KEY_STUDENTS, list); },
    savePayments: function (list) { return write(KEY_PAYMENTS, list); },

    nextId: function (kind) {
      var seq = read(KEY_SEQ, { student: 1000, payment: 2000 });
      seq[kind] = (seq[kind] || 0) + 1;
      write(KEY_SEQ, seq);
      return (kind === 'student' ? 'STU-' : 'RCP-') + seq[kind];
    },

    /* Wipes localStorage and re-seeds. Wired to "Reset demo data". */
    reset: function () {
      localStorage.removeItem(KEY_STUDENTS);
      localStorage.removeItem(KEY_PAYMENTS);
      localStorage.removeItem(KEY_SEQ);
      Store.init();
    }
  };

  global.Store = Store;
})(window);
