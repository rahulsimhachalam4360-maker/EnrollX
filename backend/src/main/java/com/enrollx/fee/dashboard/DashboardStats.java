package com.enrollx.fee.dashboard;

import java.util.List;

import com.enrollx.fee.payment.PaymentResponse;

/**
 * The dashboard payload.
 *
 * <pre>
 *   expected    = sum of every student's totalFee
 *   collected   = sum of every payment amount
 *   outstanding = max(expected - collected, 0)
 *   defaulters  = students with due &gt; 0
 * </pre>
 */
public record DashboardStats(
        long totalStudents,
        long expected,
        long collected,
        long outstanding,
        long defaulters,
        List<CourseDue> outstandingByCourse,
        List<PaymentResponse> recentPayments) {

    /** One row of the outstanding-by-course chart. Courses with due = 0 are omitted. */
    public record CourseDue(String course, long due) {
    }
}
