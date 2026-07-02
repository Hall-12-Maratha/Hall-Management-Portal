
### Extras Booking Module Updates

#### 1. Booking Window

* Each extra item will be associated with a **specific date and meal** (Breakfast/Lunch/Dinner).
* While creating an extra, the Mess Staff will specify only the **closing time**.
* The **opening time will be automatically set to 48 hours before the closing time**.
* Students can book extras only while the booking window is active.
* Students can **modify(increase or decrease) or cancel bookings (fully or partially)** until the booking closes.
*after the closing time , the student can not modify or cancel the booking but request booking cancellation.this request will be approved or rejected by the Mess Staff.
*after the booking window closes , automatically mark the item as served or missed or cancelled.

#### 2. Student Booking & Billing

* Extras will be displayed grouped by:

  * **Date**
  * **Meal Type (Breakfast/Lunch/Dinner)**
* The interface will show **only the current meal onwards until tomorrow's dinner**, ensuring students are not shown bookings too far in advance.
* If a student partially or fully cancels a booking before the deadline, the payable amount will be updated automatically.
* During serving, if an item is not delivered, it will be marked as **Missed**, and billing will still be added fully for food wastage.

**Example**

* On **2 June**, students can book extras for:

  * 2 June – Breakfast, Lunch, Dinner
  * 3 June – Breakfast, Lunch, Dinner
* Suppose a student books **3 Ladoos** and **1 Dosa** for **3 June Lunch**.
* Before the booking deadline, they may reduce or cancel any quantity.
* If, during service, only the Ladoos are served and the Dosa is marked **Missed**, the final bill will include the cost of **3 Ladoos** marked served and 1 Dosa marked as missed.

---

### Mess Staff Features

* Display the **total quantity booked** for each extra item once bookings close.
* Allow **single booking deletion** (for individual student requests) without confirmation.
* Provide a **Bulk Delete All Bookings** option for an extra item, protected by:

  * Confirmation dialog.
  * Password verification before execution.

---

### User Interface Improvements

#### Student Portal

* Organize booking history using clear sections containing:

  * Date
  * Day of the week
  * Meal Type (Breakfast/Lunch/Dinner)
* Display the total price prominently in a highlighted box on the right for quick visibility.

#### Mess Worker Portal

* Make booked quantities **large, bold, and color-highlighted** for faster recognition during serving.
* Optimize the serving screen for quick scanning and minimal interaction.

---

### Session Management

The current authentication token expires after only a few minutes of inactivity, resulting in frequent logins.

**Proposed Solution**

* Implement **Refresh Token Authentication**.
* Use:

  * **Short-lived Access Token** (10–15 minutes) for API authorization.
  * **HTTP-only Refresh Token Cookie** valid for **7 days**.
* When the access token expires, the frontend will automatically request a new one using the refresh token, keeping users logged in for up to one week without requiring repeated logins.
* Users will only need to log in again after:

  * Explicit logout.
  * Refresh token expiry (7 days).
  * Password change or account invalidation.

This approach provides a significantly better user experience while maintaining strong security.
