package com.enrollx.fee;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class StudentApiTest extends ApiTestSupport {

    /* ---- derived fields --------------------------------------------------- */

    @Test
    @DisplayName("GET /api/students derives totalFee, paid, due and feeStatus per student")
    void listDerivesFeeFigures() throws Exception {
        /* STU-1001: 85000+12000+0+4000+2000 = 103000, paid 50000+30000 = 80000. */
        mockMvc.perform(api(get(API + "/students")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(9))
                .andExpect(jsonPath("$[?(@.id=='STU-1001')].totalFee").value(103000))
                .andExpect(jsonPath("$[?(@.id=='STU-1001')].paid").value(80000))
                .andExpect(jsonPath("$[?(@.id=='STU-1001')].due").value(23000))
                .andExpect(jsonPath("$[?(@.id=='STU-1001')].feeStatus").value("partial"))
                /* Fully settled. */
                .andExpect(jsonPath("$[?(@.id=='STU-1003')].due").value(0))
                .andExpect(jsonPath("$[?(@.id=='STU-1003')].feeStatus").value("paid"))
                /* Never paid anything. */
                .andExpect(jsonPath("$[?(@.id=='STU-1009')].paid").value(0))
                .andExpect(jsonPath("$[?(@.id=='STU-1009')].due").value(103000))
                .andExpect(jsonPath("$[?(@.id=='STU-1009')].feeStatus").value("unpaid"));
    }

    @Test
    @DisplayName("Students come back sorted by rollNo ascending")
    void listIsSortedByRollNo() throws Exception {
        mockMvc.perform(api(get(API + "/students")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].rollNo").value("FRS24001"))
                .andExpect(jsonPath("$[8].rollNo").value("FRS24009"));
    }

    @Test
    @DisplayName("The derived fields are not persisted as columns")
    void derivedFieldsAreNotColumns() throws Exception {
        /* If `due` were stored, voiding a receipt would leave it stale. */
        mockMvc.perform(api(delete(API + "/payments/RCP-2001")))
                .andExpect(status().isNoContent());

        mockMvc.perform(api(get(API + "/students/STU-1001")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paid").value(30000))
                .andExpect(jsonPath("$.due").value(73000))
                .andExpect(jsonPath("$.feeStatus").value("partial"));
    }

    /* ---- filters ---------------------------------------------------------- */

    @Test
    @DisplayName("search matches name, rollNo or phone, case-insensitively and partially")
    void searchMatchesNameRollNoOrPhone() throws Exception {
        mockMvc.perform(api(get(API + "/students").param("search", "aarav")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("STU-1001"));

        mockMvc.perform(api(get(API + "/students").param("search", "frs2400")))
                .andExpect(jsonPath("$.length()").value(9));

        mockMvc.perform(api(get(API + "/students").param("search", "9876543218")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("STU-1009"));
    }

    @Test
    @DisplayName("course filters exactly and status filters on the derived feeStatus")
    void courseAndStatusFilters() throws Exception {
        mockMvc.perform(api(get(API + "/students").param("course", "MBA")))
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(api(get(API + "/students").param("status", "unpaid")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("STU-1009"));

        mockMvc.perform(api(get(API + "/students").param("status", "paid")))
                .andExpect(jsonPath("$.length()").value(3));

        /* Blank means no filter. */
        mockMvc.perform(api(get(API + "/students").param("search", "").param("course", "")))
                .andExpect(jsonPath("$.length()").value(9));
    }

    @Test
    @DisplayName("GET /api/courses lists distinct course names, sorted")
    void coursesAreDistinctAndSorted() throws Exception {
        mockMvc.perform(api(get(API + "/courses")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0]").value("B.Sc Physics"))
                .andExpect(jsonPath("$[1]").value("B.Tech CSE"));
    }

    /* ---- create / update -------------------------------------------------- */

    @Test
    @DisplayName("POST /api/students returns 201 and the next sequential id")
    void createReturnsCreated() throws Exception {
        mockMvc.perform(api(post(API + "/students"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(newStudent("FRS24010"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("STU-1010"))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.totalFee").value(60000))
                .andExpect(jsonPath("$.paid").value(0))
                .andExpect(jsonPath("$.due").value(60000))
                .andExpect(jsonPath("$.feeStatus").value("unpaid"))
                .andExpect(jsonPath("$.admissionDate").value("2025-07-01"));
    }

    @Test
    @DisplayName("A duplicate rollNo is rejected with 409 on create")
    void duplicateRollNoOnCreateIsConflict() throws Exception {
        Map<String, Object> payload = newStudent("FRS24001");

        mockMvc.perform(api(post(API + "/students"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Roll number FRS24001 already exists"))
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    @DisplayName("A rollNo already held by another student is rejected with 409 on update")
    void duplicateRollNoOnUpdateIsConflict() throws Exception {
        Map<String, Object> payload = newStudent("FRS24001");

        mockMvc.perform(api(put(API + "/students/STU-1002"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Roll number FRS24001 already exists"));
    }

    @Test
    @DisplayName("Keeping your own rollNo on update is not a conflict")
    void ownRollNoOnUpdateIsAllowed() throws Exception {
        Map<String, Object> payload = newStudent("FRS24001");
        payload.put("name", "Aarav S Sharma");
        payload.put("fees", fees(90000, 12000, 0, 4000, 2000));

        mockMvc.perform(api(put(API + "/students/STU-1001"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Aarav S Sharma"))
                .andExpect(jsonPath("$.totalFee").value(108000))
                .andExpect(jsonPath("$.paid").value(80000))
                .andExpect(jsonPath("$.due").value(28000))
                /* The form sends no `status`, so the stored one survives. */
                .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    @DisplayName("Rule 3: the fee structure cannot be edited below what is already paid")
    void totalFeeBelowPaidIsRejected() throws Exception {
        Map<String, Object> payload = newStudent("FRS24001");
        payload.put("fees", fees(10000, 0, 0, 0, 0));   // 10000 < the 80000 paid

        mockMvc.perform(api(put(API + "/students/STU-1001"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("Total fee cannot be lower than")))
                .andExpect(jsonPath("$.status").value(400));
    }

    /* ---- delete / cascade -------------------------------------------------- */

    @Test
    @DisplayName("Rule 6: deleting a student cascades to that student's payments")
    void deleteCascadesToPayments() throws Exception {
        /* STU-1001 owns RCP-2001 and RCP-2002; 11 receipts exist in total. */
        mockMvc.perform(api(get(API + "/payments")))
                .andExpect(jsonPath("$.length()").value(11));

        mockMvc.perform(api(delete(API + "/students/STU-1001")))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        mockMvc.perform(api(get(API + "/students/STU-1001")))
                .andExpect(status().isNotFound());

        mockMvc.perform(api(get(API + "/payments").param("studentId", "STU-1001")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(api(get(API + "/payments")))
                .andExpect(jsonPath("$.length()").value(9))
                .andExpect(jsonPath("$[?(@.id=='RCP-2001')]").isEmpty())
                .andExpect(jsonPath("$[?(@.id=='RCP-2002')]").isEmpty());
    }

    /* ---- errors ------------------------------------------------------------ */

    @Test
    @DisplayName("Rule 7: an unknown id is a 404 in the shared error shape")
    void unknownStudentIsNotFound() throws Exception {
        mockMvc.perform(api(get(API + "/students/STU-9999")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Student STU-9999 not found"))
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("Validation failures collapse into one readable message")
    void validationFailuresCollapseIntoOneMessage() throws Exception {
        Map<String, Object> payload = newStudent("FRS24011");
        payload.put("phone", "12345");
        payload.put("email", "not-an-email");

        mockMvc.perform(api(post(API + "/students"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("Phone must be exactly 10 digits")))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("valid email")));
    }

    /* ---- fixtures ---------------------------------------------------------- */

    private static Map<String, Object> newStudent(String rollNo) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", "Test Student");
        payload.put("rollNo", rollNo);
        payload.put("course", "B.Tech CSE");
        payload.put("year", 1);
        payload.put("section", "A");
        payload.put("email", "test.student@example.com");
        payload.put("phone", "9000000000");
        payload.put("guardian", "Test Guardian");
        payload.put("admissionDate", "2025-07-01");
        payload.put("fees", fees(50000, 5000, 0, 3000, 2000));
        return payload;
    }

    private static Map<String, Object> fees(long tuition, long transport, long hostel, long exam, long other) {
        Map<String, Object> fees = new LinkedHashMap<>();
        fees.put("tuition", tuition);
        fees.put("transport", transport);
        fees.put("hostel", hostel);
        fees.put("exam", exam);
        fees.put("other", other);
        return fees;
    }
}
