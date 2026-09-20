package com.enrollx.fee.common;

import org.springframework.stereotype.Component;

import com.enrollx.fee.payment.PaymentRepository;
import com.enrollx.fee.student.StudentRepository;

/**
 * Sequential, human-readable ids: "STU-" + n and "RCP-" + n.
 *
 * <p>Backed by the database rather than a counter in memory — it asks for the
 * highest existing number and continues from there, so restarting the app (or
 * running a second instance) never reissues an id. Callers run inside the
 * service transaction, which serialises the read-then-insert.
 */
@Component
public class IdGenerator {

    static final String STUDENT_PREFIX = "STU-";
    static final String PAYMENT_PREFIX = "RCP-";

    /** First ids handed out on an empty database: STU-1001 and RCP-2001. */
    private static final int STUDENT_START = 1000;
    private static final int PAYMENT_START = 2000;

    private final StudentRepository students;
    private final PaymentRepository payments;

    public IdGenerator(StudentRepository students, PaymentRepository payments) {
        this.students = students;
        this.payments = payments;
    }

    public String nextStudentId() {
        return STUDENT_PREFIX + next(students.findMaxIdSequence(), STUDENT_START);
    }

    public String nextPaymentId() {
        return PAYMENT_PREFIX + next(payments.findMaxIdSequence(), PAYMENT_START);
    }

    private int next(Integer highest, int start) {
        return Math.max(highest == null ? start : highest, start) + 1;
    }
}
