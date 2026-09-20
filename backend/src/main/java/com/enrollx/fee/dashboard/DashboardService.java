package com.enrollx.fee.dashboard;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enrollx.fee.payment.PaymentRepository;
import com.enrollx.fee.payment.PaymentResponse;
import com.enrollx.fee.student.Student;
import com.enrollx.fee.student.StudentRepository;

@Service
public class DashboardService {

    private static final int RECENT_PAYMENTS = 5;

    private final StudentRepository students;
    private final PaymentRepository payments;

    public DashboardService(StudentRepository students, PaymentRepository payments) {
        this.students = students;
        this.payments = payments;
    }

    /**
     * Four queries, whatever the size of the school: the students, one grouped
     * sum of payments per student, one total, and the five newest receipts with
     * their students join-fetched.
     */
    @Transactional(readOnly = true)
    public DashboardStats stats() {
        List<Student> roll = students.findAll();

        Map<String, Long> paidByStudent = new LinkedHashMap<>();
        for (PaymentRepository.PaidTotal row : payments.findPaidTotals()) {
            paidByStudent.put(row.getStudentId(), row.getPaid());
        }

        long expected = 0;
        long defaulters = 0;
        Map<String, Long> dueByCourse = new LinkedHashMap<>();

        for (Student student : roll) {
            long totalFee = student.getFees().total();
            long paid = paidByStudent.getOrDefault(student.getId(), 0L);
            long due = Math.max(totalFee - paid, 0);

            expected += totalFee;
            if (due > 0) {
                defaulters++;
            }
            dueByCourse.merge(student.getCourse(), due, Long::sum);
        }

        long collected = payments.sumAllAmounts();

        List<DashboardStats.CourseDue> outstandingByCourse = dueByCourse.entrySet().stream()
                .filter(entry -> entry.getValue() > 0)
                .map(entry -> new DashboardStats.CourseDue(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingLong(DashboardStats.CourseDue::due).reversed())
                .toList();

        List<PaymentResponse> recentPayments = payments.findRecent(PageRequest.of(0, RECENT_PAYMENTS))
                .stream()
                .map(PaymentResponse::of)
                .toList();

        return new DashboardStats(
                roll.size(),
                expected,
                collected,
                Math.max(expected - collected, 0),
                defaulters,
                outstandingByCourse,
                recentPayments);
    }
}
