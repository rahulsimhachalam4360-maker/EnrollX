package com.enrollx.fee.student;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * The five heads a student's fee is broken into. Embedded in the students
 * table, and reused verbatim as the {@code fees} object in the JSON contract.
 *
 * <p>Money is whole rupees in {@code long} — never double, never float.
 * {@link #total()} is derived on every read; it is not a column.
 */
@Embeddable
public class Fees {

    @PositiveOrZero(message = "Tuition fee cannot be negative")
    @Column(nullable = false)
    private long tuition;

    @PositiveOrZero(message = "Transport fee cannot be negative")
    @Column(nullable = false)
    private long transport;

    @PositiveOrZero(message = "Hostel fee cannot be negative")
    @Column(nullable = false)
    private long hostel;

    @PositiveOrZero(message = "Exam fee cannot be negative")
    @Column(nullable = false)
    private long exam;

    @PositiveOrZero(message = "Other fees cannot be negative")
    @Column(nullable = false)
    private long other;

    public Fees() {
    }

    public Fees(long tuition, long transport, long hostel, long exam, long other) {
        this.tuition = tuition;
        this.transport = transport;
        this.hostel = hostel;
        this.exam = exam;
        this.other = other;
    }

    /** totalFee = tuition + transport + hostel + exam + other. */
    public long total() {
        return tuition + transport + hostel + exam + other;
    }

    public long getTuition() {
        return tuition;
    }

    public void setTuition(long tuition) {
        this.tuition = tuition;
    }

    public long getTransport() {
        return transport;
    }

    public void setTransport(long transport) {
        this.transport = transport;
    }

    public long getHostel() {
        return hostel;
    }

    public void setHostel(long hostel) {
        this.hostel = hostel;
    }

    public long getExam() {
        return exam;
    }

    public void setExam(long exam) {
        this.exam = exam;
    }

    public long getOther() {
        return other;
    }

    public void setOther(long other) {
        this.other = other;
    }
}
