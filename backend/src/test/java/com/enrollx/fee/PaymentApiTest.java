package com.enrollx.fee;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class PaymentApiTest extends ApiTestSupport {

    /* ---- rule 1: never collect more than the outstanding due ---------------- */

    @Test
    @DisplayName("Rule 1: a payment above the outstanding due is rejected with 400")
    void overPaymentIsRejected() throws Exception {
        /* STU-1001 owes 103000 - 80000 = 23000. */
        Map<String, Object> payload = payment("STU-1001", 23001);

        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(
                        Matchers.startsWith("Amount exceeds the outstanding due of")))
                .andExpect(jsonPath("$.message").value(Matchers.containsString("23,000")));

        /* Nothing was written. */
        mockMvc.perform(api(get(API + "/students/STU-1001")))
                .andExpect(jsonPath("$.paid").value(80000));
    }

    @Test
    @DisplayName("The due is recomputed from the database, not taken from the request")
    void dueIsRecomputedServerSide() throws Exception {
        /* A client that smuggles in its own balance fields changes nothing. */
        Map<String, Object> payload = payment("STU-1001", 50000);
        payload.put("due", 999999);
        payload.put("balanceAfter", 0);

        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        Matchers.startsWith("Amount exceeds the outstanding due of")));
    }

    @Test
    @DisplayName("Paying exactly the due is accepted and settles the student")
    void payingExactlyTheDueSettlesTheStudent() throws Exception {
        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payment("STU-1001", 23000))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("RCP-2012"))
                .andExpect(jsonPath("$.studentId").value("STU-1001"))
                .andExpect(jsonPath("$.amount").value(23000))
                .andExpect(jsonPath("$.balanceAfter").value(0))
                /* The three joined student fields the receipt prints. */
                .andExpect(jsonPath("$.studentName").value("Aarav Sharma"))
                .andExpect(jsonPath("$.rollNo").value("FRS24001"))
                .andExpect(jsonPath("$.course").value("B.Tech CSE"))
                .andExpect(jsonPath("$.createdAt").value(Matchers.endsWith("Z")));

        mockMvc.perform(api(get(API + "/students/STU-1001")))
                .andExpect(jsonPath("$.due").value(0))
                .andExpect(jsonPath("$.feeStatus").value("paid"));
    }

    @Test
    @DisplayName("A zero or negative amount is rejected")
    void nonPositiveAmountIsRejected() throws Exception {
        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payment("STU-1001", 0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        Matchers.containsString("Amount must be greater than zero")));
    }

    /* ---- rules 4 and 5 ------------------------------------------------------ */

    @Test
    @DisplayName("Rule 4: a payment dated in the future is rejected")
    void futureDateIsRejected() throws Exception {
        Map<String, Object> payload = payment("STU-1001", 1000);
        payload.put("date", LocalDate.now().plusDays(1).toString());

        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Payment date cannot be in the future"));
    }

    @Test
    @DisplayName("Rule 5: reference is mandatory for UPI, Card, Bank Transfer and Cheque")
    void referenceIsRequiredForNonCashModes() throws Exception {
        Map<String, Object> payload = payment("STU-1001", 1000);
        payload.put("mode", "Cheque");
        payload.put("reference", "");

        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(Matchers.containsString("reference")));

        /* Too short counts as missing. */
        payload.put("reference", "ab");
        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Rule 5: Cash needs no reference")
    void cashNeedsNoReference() throws Exception {
        Map<String, Object> payload = payment("STU-1001", 1000);
        payload.put("mode", "Cash");
        payload.put("reference", "");

        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reference").value(""))
                .andExpect(jsonPath("$.balanceAfter").value(22000));
    }

    @Test
    @DisplayName("An unknown payment mode is rejected")
    void unknownModeIsRejected() throws Exception {
        Map<String, Object> payload = payment("STU-1001", 1000);
        payload.put("mode", "Crypto");

        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Paying for an unknown student is a 404")
    void paymentForUnknownStudentIsNotFound() throws Exception {
        mockMvc.perform(api(post(API + "/payments"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(payment("STU-9999", 1000))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Student STU-9999 not found"));
    }

    /* ---- listing ------------------------------------------------------------ */

    @Test
    @DisplayName("Payments come back newest first, with the joined student fields")
    void listIsNewestFirstAndJoined() throws Exception {
        mockMvc.perform(api(get(API + "/payments")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(11))
                .andExpect(jsonPath("$[0].id").value("RCP-2007"))        // 2026-01-12
                .andExpect(jsonPath("$[0].studentName").value("Ishaan Verma"))
                .andExpect(jsonPath("$[0].rollNo").value("FRS24005"))
                .andExpect(jsonPath("$[0].course").value("MBA"))
                .andExpect(jsonPath("$[1].id").value("RCP-2010"))        // 2025-11-03
                .andExpect(jsonPath("$[0].date").value("2026-01-12"))
                /* balanceAfter belongs to the POST response only. */
                .andExpect(jsonPath("$[0].balanceAfter").doesNotExist());
    }

    @Test
    @DisplayName("Payments filter by studentId, mode, date range and search")
    void listFilters() throws Exception {
        mockMvc.perform(api(get(API + "/payments").param("studentId", "STU-1001")))
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(api(get(API + "/payments").param("mode", "UPI")))
                .andExpect(jsonPath("$.length()").value(4));

        /* from/to are inclusive. */
        mockMvc.perform(api(get(API + "/payments")
                .param("from", "2025-07-18").param("to", "2025-07-20")))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("RCP-2003"))
                .andExpect(jsonPath("$[1].id").value("RCP-2001"));

        /* search matches studentName, rollNo, payment id or reference. */
        mockMvc.perform(api(get(API + "/payments").param("search", "NEFT-553210")))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("RCP-2002"));

        mockMvc.perform(api(get(API + "/payments").param("search", "rcp-2004")))
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(api(get(API + "/payments").param("search", "kabir")))
                .andExpect(jsonPath("$.length()").value(2));
    }

    /* ---- voiding ------------------------------------------------------------ */

    @Test
    @DisplayName("Voiding a receipt returns 204 and the student's due rises again")
    void deletingAPaymentRestoresTheDue() throws Exception {
        mockMvc.perform(api(delete(API + "/payments/RCP-2008")))
                .andExpect(status().isNoContent());

        /* STU-1006 was fully paid on that single 201000 receipt. */
        mockMvc.perform(api(get(API + "/students/STU-1006")))
                .andExpect(jsonPath("$.paid").value(0))
                .andExpect(jsonPath("$.due").value(201000))
                .andExpect(jsonPath("$.feeStatus").value("unpaid"));
    }

    @Test
    @DisplayName("Voiding an unknown receipt is a 404")
    void deletingUnknownPaymentIsNotFound() throws Exception {
        mockMvc.perform(api(delete(API + "/payments/RCP-9999")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Receipt RCP-9999 not found"));
    }

    /* ---- fixtures ------------------------------------------------------------ */

    private static Map<String, Object> payment(String studentId, long amount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("studentId", studentId);
        payload.put("amount", amount);
        payload.put("mode", "UPI");
        payload.put("date", "2025-09-15");
        payload.put("reference", "UPI-1234567");
        payload.put("remarks", "");
        return payload;
    }
}
