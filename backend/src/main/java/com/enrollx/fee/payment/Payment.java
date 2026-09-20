package com.enrollx.fee.payment;

import java.time.Instant;
import java.time.LocalDate;

import com.enrollx.fee.student.Student;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One receipt. Deleting it voids the collection and the student's due rises again. */
@Entity
@Table(name = "payments")
public class Payment {

    /** "RCP-2001", handed out by IdGenerator. */
    @Id
    @Column(length = 32)
    private String id;

    /**
     * LAZY, and always fetched with an explicit join in the repository queries —
     * the list endpoints must not fire one query per row.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_payments_student"))
    private Student student;

    @Column(nullable = false)
    private long amount;

    @Column(nullable = false, length = 32)
    private String mode;

    @Column(nullable = false)
    private LocalDate date;

    private String reference;

    private String remarks;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public Payment() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
