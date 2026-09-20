package com.enrollx.fee;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DashboardApiTest extends ApiTestSupport {

    @Test
    @DisplayName("GET /api/dashboard/stats totals the seeded roll")
    void statsMatchTheSeededData() throws Exception {
        mockMvc.perform(api(get(API + "/dashboard/stats")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudents").value(9))
                .andExpect(jsonPath("$.expected").value(1061400))
                .andExpect(jsonPath("$.collected").value(616700))
                .andExpect(jsonPath("$.outstanding").value(444700))
                .andExpect(jsonPath("$.defaulters").value(6));
    }

    @Test
    @DisplayName("outstandingByCourse drops settled courses and sorts by due descending")
    void outstandingByCourseIsSortedAndFiltered() throws Exception {
        mockMvc.perform(api(get(API + "/dashboard/stats")))
                .andExpect(jsonPath("$.outstandingByCourse.length()").value(4))
                .andExpect(jsonPath("$.outstandingByCourse[0].course").value("B.Tech CSE"))
                .andExpect(jsonPath("$.outstandingByCourse[0].due").value(242000))
                .andExpect(jsonPath("$.outstandingByCourse[1].due").value(123500))
                .andExpect(jsonPath("$.outstandingByCourse[2].due").value(44000))
                .andExpect(jsonPath("$.outstandingByCourse[3].due").value(35200));
    }

    @Test
    @DisplayName("A course whose students all settle up drops off the chart")
    void settledCourseIsOmitted() throws Exception {
        /* B.Sc Physics owes only Myra Joshi's 35200; settle it and the row goes. */
        mockMvc.perform(api(get(API + "/students/STU-1008")))
                .andExpect(jsonPath("$.due").value(35200));

        mockMvc.perform(api(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post(API + "/payments")
                .contextPath(API)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("""
                        {"studentId":"STU-1008","amount":35200,"mode":"Cash",
                         "date":"2025-09-15","reference":"","remarks":""}
                        """)))
                .andExpect(status().isCreated());

        mockMvc.perform(api(get(API + "/dashboard/stats")))
                .andExpect(jsonPath("$.outstandingByCourse.length()").value(3))
                .andExpect(jsonPath("$.outstandingByCourse[?(@.course=='B.Sc Physics')]").isEmpty())
                .andExpect(jsonPath("$.defaulters").value(5));
    }

    @Test
    @DisplayName("recentPayments holds the 5 newest receipts with studentName and rollNo")
    void recentPaymentsAreTheFiveNewest() throws Exception {
        mockMvc.perform(api(get(API + "/dashboard/stats")))
                .andExpect(jsonPath("$.recentPayments.length()").value(5))
                .andExpect(jsonPath("$.recentPayments[0].id").value("RCP-2007"))
                .andExpect(jsonPath("$.recentPayments[0].studentName").value("Ishaan Verma"))
                .andExpect(jsonPath("$.recentPayments[0].rollNo").value("FRS24005"))
                .andExpect(jsonPath("$.recentPayments[1].id").value("RCP-2010"))
                .andExpect(jsonPath("$.recentPayments[2].id").value("RCP-2002"))
                .andExpect(jsonPath("$.recentPayments[3].id").value("RCP-2006"))
                .andExpect(jsonPath("$.recentPayments[4].id").value("RCP-2011"));
    }

    @Test
    @DisplayName("Deleting a student moves every total, since none of them are stored")
    void statsFollowTheUnderlyingData() throws Exception {
        /* STU-1009 owes its full 103000 and has paid nothing. */
        mockMvc.perform(api(delete(API + "/students/STU-1009")))
                .andExpect(status().isNoContent());

        mockMvc.perform(api(get(API + "/dashboard/stats")))
                .andExpect(jsonPath("$.totalStudents").value(8))
                .andExpect(jsonPath("$.expected").value(958400))
                .andExpect(jsonPath("$.collected").value(616700))
                .andExpect(jsonPath("$.outstanding").value(341700))
                .andExpect(jsonPath("$.defaulters").value(5))
                .andExpect(jsonPath("$.outstandingByCourse[0].due").value(139000));
    }
}
