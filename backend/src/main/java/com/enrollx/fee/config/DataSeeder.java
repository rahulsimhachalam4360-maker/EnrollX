package com.enrollx.fee.config;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.enrollx.fee.payment.Payment;
import com.enrollx.fee.payment.PaymentRepository;
import com.enrollx.fee.student.Fees;
import com.enrollx.fee.student.Student;
import com.enrollx.fee.student.StudentRepository;

/**
 * Seeds the same nine students and eleven receipts the front-end's mock store
 * shows, so switching js/api.js to live mode changes nothing on screen.
 *
 * <p>Idempotent: it only runs against an empty students table, so restarting
 * the app never duplicates or resets the demo data.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final StudentRepository students;
    private final PaymentRepository payments;

    public DataSeeder(StudentRepository students, PaymentRepository payments) {
        this.students = students;
        this.payments = payments;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (students.count() > 0) {
            log.info("Students already present - skipping seed");
            return;
        }

        List<Student> roll = List.of(
                student("STU-1001", "Aarav Sharma", "FRS24001", "B.Tech CSE", 2, "A",
                        "aarav.sharma@example.com", "9876543210", "Rakesh Sharma", "2024-07-15",
                        85000, 12000, 0, 4000, 2000),
                student("STU-1002", "Diya Patel", "FRS24002", "B.Tech CSE", 2, "A",
                        "diya.patel@example.com", "9876543211", "Nilesh Patel", "2024-07-15",
                        85000, 0, 65000, 4000, 2000),
                student("STU-1003", "Vihaan Reddy", "FRS24003", "B.Tech ECE", 1, "B",
                        "vihaan.reddy@example.com", "9876543212", "Suresh Reddy", "2025-07-02",
                        78000, 12000, 0, 4000, 1500),
                student("STU-1004", "Ananya Iyer", "FRS24004", "B.Tech ECE", 1, "B",
                        "ananya.iyer@example.com", "9876543213", "Mohan Iyer", "2025-07-02",
                        78000, 0, 65000, 4000, 1500),
                student("STU-1005", "Ishaan Verma", "FRS24005", "MBA", 1, "A",
                        "ishaan.verma@example.com", "9876543214", "Anil Verma", "2025-08-01",
                        120000, 15000, 0, 6000, 3000),
                student("STU-1006", "Saanvi Nair", "FRS24006", "MBA", 2, "A",
                        "saanvi.nair@example.com", "9876543215", "Rajan Nair", "2024-08-01",
                        120000, 0, 72000, 6000, 3000),
                student("STU-1007", "Kabir Singh", "FRS24007", "B.Sc Physics", 3, "C",
                        "kabir.singh@example.com", "9876543216", "Harpreet Singh", "2023-07-20",
                        42000, 9000, 0, 3000, 1200),
                student("STU-1008", "Myra Joshi", "FRS24008", "B.Sc Physics", 1, "C",
                        "myra.joshi@example.com", "9876543217", "Deepak Joshi", "2025-07-20",
                        42000, 9000, 0, 3000, 1200),
                student("STU-1009", "Arjun Menon", "FRS24009", "B.Tech CSE", 1, "B",
                        "arjun.menon@example.com", "9876543218", "Vinod Menon", "2025-07-16",
                        85000, 12000, 0, 4000, 2000));

        students.saveAll(roll);

        payments.saveAll(List.of(
                payment("RCP-2001", roll.get(0), 50000, "UPI", "2025-07-18", "UPI-8842013"),
                payment("RCP-2002", roll.get(0), 30000, "Bank Transfer", "2025-09-10", "NEFT-553210"),
                payment("RCP-2003", roll.get(1), 40000, "Cheque", "2025-07-20", "CHQ-110293"),
                payment("RCP-2004", roll.get(2), 95500, "Card", "2025-07-05", "TXN-772311"),
                payment("RCP-2005", roll.get(3), 25000, "Cash", "2025-07-08", ""),
                payment("RCP-2006", roll.get(4), 60000, "UPI", "2025-08-05", "UPI-9013442"),
                payment("RCP-2007", roll.get(4), 40000, "UPI", "2026-01-12", "UPI-9188220"),
                payment("RCP-2008", roll.get(5), 201000, "Bank Transfer", "2024-08-09", "NEFT-441002"),
                payment("RCP-2009", roll.get(6), 30000, "Cash", "2025-07-25", ""),
                payment("RCP-2010", roll.get(6), 25200, "UPI", "2025-11-03", "UPI-8120044"),
                payment("RCP-2011", roll.get(7), 20000, "Card", "2025-07-28", "TXN-660120")));

        log.info("Seeded {} students and {} payments", roll.size(), payments.count());
    }

    private static Student student(String id, String name, String rollNo, String course, int year,
            String section, String email, String phone, String guardian, String admissionDate,
            long tuition, long transport, long hostel, long exam, long other) {

        Student student = new Student();
        student.setId(id);
        student.setName(name);
        student.setRollNo(rollNo);
        student.setCourse(course);
        student.setYear(year);
        student.setSection(section);
        student.setEmail(email);
        student.setPhone(phone);
        student.setGuardian(guardian);
        student.setAdmissionDate(LocalDate.parse(admissionDate));
        student.setStatus("active");
        student.setFees(new Fees(tuition, transport, hostel, exam, other));
        return student;
    }

    private static Payment payment(String id, Student student, long amount, String mode,
            String date, String reference) {

        Payment payment = new Payment();
        payment.setId(id);
        payment.setStudent(student);
        payment.setAmount(amount);
        payment.setMode(mode);
        payment.setDate(LocalDate.parse(date));
        payment.setReference(reference);
        payment.setRemarks("");
        /* Matches the mock's `new Date(date).toISOString()`: UTC midnight. */
        payment.setCreatedAt(LocalDate.parse(date).atStartOfDay(ZoneOffset.UTC).toInstant());
        return payment;
    }
}
