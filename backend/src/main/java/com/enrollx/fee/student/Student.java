package com.enrollx.fee.student;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * A registered student.
 *
 * <p>Note what is NOT here: totalFee, paid, due and feeStatus. They are derived
 * on every read from {@link Fees} and the student's payments. Storing {@code due}
 * would go stale the moment a receipt is voided.
 */
@Entity
@Table(name = "students", uniqueConstraints = @UniqueConstraint(name = "uk_students_roll_no", columnNames = "roll_no"))
public class Student {

    /** "STU-1001", handed out by IdGenerator. */
    @Id
    @Column(length = 32)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "roll_no", nullable = false)
    private String rollNo;

    @Column(nullable = false)
    private String course;

    /** YEAR is a reserved word in H2 2.x and a type name in MySQL — hence the column name. */
    @Column(name = "academic_year", nullable = false)
    private int year;

    private String section;

    private String email;

    @Column(length = 10)
    private String phone;

    private String guardian;

    @Column(name = "admission_date")
    private LocalDate admissionDate;

    @Column(nullable = false, length = 16)
    private String status = "active";

    @Embedded
    private Fees fees = new Fees();

    public Student() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRollNo() {
        return rollNo;
    }

    public void setRollNo(String rollNo) {
        this.rollNo = rollNo;
    }

    public String getCourse() {
        return course;
    }

    public void setCourse(String course) {
        this.course = course;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getGuardian() {
        return guardian;
    }

    public void setGuardian(String guardian) {
        this.guardian = guardian;
    }

    public LocalDate getAdmissionDate() {
        return admissionDate;
    }

    public void setAdmissionDate(LocalDate admissionDate) {
        this.admissionDate = admissionDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Fees getFees() {
        return fees;
    }

    public void setFees(Fees fees) {
        this.fees = fees == null ? new Fees() : fees;
    }
}
