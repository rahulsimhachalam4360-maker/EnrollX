package com.enrollx.fee.payment;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enrollx.fee.common.ApiException;
import com.enrollx.fee.common.IdGenerator;
import com.enrollx.fee.student.Student;
import com.enrollx.fee.student.StudentRepository;

@Service
public class PaymentService {

    /** The modes the UI offers; anything else is a bypassed form. */
    private static final Set<String> MODES = Set.of("Cash", "UPI", "Card", "Bank Transfer", "Cheque");

    /** Rule 5: these modes must carry a transaction or cheque number. */
    private static final Set<String> REFERENCE_REQUIRED = Set.of("UPI", "Card", "Bank Transfer", "Cheque");

    private static final int REFERENCE_MIN_LENGTH = 3;

    private final PaymentRepository payments;
    private final StudentRepository students;
    private final IdGenerator ids;

    public PaymentService(PaymentRepository payments, StudentRepository students, IdGenerator ids) {
        this.payments = payments;
        this.students = students;
        this.ids = ids;
    }

    /**
     * Every filter is applied in SQL, and each receipt's student is join-fetched
     * in the same query — one query for the whole page.
     */
    @Transactional(readOnly = true)
    public List<PaymentResponse> list(String studentId, String mode, LocalDate from, LocalDate to, String search) {
        return payments.search(blankToNull(studentId), blankToNull(mode), from, to, like(search))
                .stream()
                .map(PaymentResponse::of)
                .toList();
    }

    /**
     * Records a receipt. The outstanding due is recomputed from the database
     * inside this transaction — the balance the form showed is never trusted,
     * because a form can be bypassed with DevTools.
     */
    @Transactional
    public PaymentResponse create(PaymentRequest request) {
        Student student = students.findById(request.studentId())
                .orElseThrow(() -> ApiException.notFound("Student", request.studentId()));

        if (!MODES.contains(request.mode())) {
            throw ApiException.badRequest("Payment mode must be one of: Cash, UPI, Card, Bank Transfer, Cheque");
        }

        /* Rule 4 */
        if (request.date().isAfter(LocalDate.now())) {
            throw ApiException.badRequest("Payment date cannot be in the future");
        }

        /* Rule 5 */
        String reference = request.reference() == null ? "" : request.reference().trim();
        if (REFERENCE_REQUIRED.contains(request.mode()) && reference.length() < REFERENCE_MIN_LENGTH) {
            throw ApiException.badRequest(
                    "A reference of at least " + REFERENCE_MIN_LENGTH + " characters is required for " + request.mode()
                            + " payments");
        }

        /* Rule 1: amount > 0 is a bean-validation rule; the ceiling needs the DB. */
        long totalFee = student.getFees().total();
        long paid = payments.sumPaidByStudentId(student.getId());
        long due = Math.max(totalFee - paid, 0);

        if (request.amount() > due) {
            throw ApiException.amountExceedsDue(due);
        }

        Payment payment = new Payment();
        payment.setId(ids.nextPaymentId());
        payment.setStudent(student);
        payment.setAmount(request.amount());
        payment.setMode(request.mode());
        payment.setDate(request.date());
        payment.setReference(reference);
        payment.setRemarks(request.remarks() == null ? "" : request.remarks().trim());
        payment.setCreatedAt(Instant.now());

        payments.save(payment);

        return PaymentResponse.of(payment, due - request.amount());
    }

    /** Voids a receipt. The student's derived due rises again on the next read. */
    @Transactional
    public void delete(String id) {
        Payment payment = payments.findById(id)
                .orElseThrow(() -> ApiException.notFound("Receipt", id));
        payments.delete(payment);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static String like(String value) {
        String trimmed = blankToNull(value);
        return trimmed == null ? null : "%" + trimmed.trim().toLowerCase() + "%";
    }
}
