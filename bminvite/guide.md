
---

````text
### CONTEXT & YÊU CẦU CHUNG
  
App hiện có các tab: Dashboard, List Profile, Via, BM Trung Gian, Link Invite, Report.

Trong code hiện tại, mình đã có:
- Hệ thống lưu profile VIA / BM trung gian, cookies, proxy, user-agent, password, 2FA, ...
- ĐÃ CẢI TIẾN: **lưu sẵn UID BM trung gian của profile BM trung gian** dùng để tạo link vào dashboard set role.
  → Hãy tìm trong code chỗ đang dùng UID BM trung gian của profile BM trung gian để mở trang settings / dashboard, TÁI SỬ DỤNG lại field và helper đó, KHÔNG tự tạo field mới.

MỤC TIÊU:
- Tạo một tab/module mới để user chạy kịch bản auto share BM bằng các VIA đã add.
- BM trung gian có **rate limit cứng**: mỗi lượt (**round**) chỉ được set role cho **tối đa 2 VIA** (tức 2 Via-UID-Ad-Account). Không dùng limit theo thời gian.

---

### BƯỚC 1 – ĐỌC CODE HIỆN TẠI

1. Tìm các file layout/navigation:
   - Component chứa top menu / sidebar nơi khai báo các tab: `Dashboard`, `List Profile`, `BM Trung Gian`, `Report`, ...
   - Ghi nhớ cách thêm một tab mới (router / component mapping).

2. Tìm định nghĩa profile:
   - Type/Interface cho profile VIA và profile BM trung gian:
     - ví dụ: `Profile`, `ViaProfile`, `BmProfile`, `ProfileType = 'VIA' | 'BM'`, …
   - Xác định:
     - field lưu UID tài khoản / UID BM trung gian (dùng để mở link dashboard).
     - field lưu password facebook của VIA (sẽ dùng cho bước login lại).

3. Tìm code automation / runner:
   - Ở các tab hiện có, xem cách:
     - "Run All", "Run Selected", v.v… đang mở session và chạy script theo profile.
   - Tái sử dụng abstraction hiện có để:
     - Mở browser theo profile (cookies, proxy, user-agent).
     - Thực thi script trên DOM (click, type, wait…).

KHÔNG viết driver mới nếu không cần, hãy dùng cùng pattern.

---

### BƯỚC 2 – TẠO TAB MỚI “AUTO BM SCRIPT”

1. Thêm 1 tab mới cạnh `Report`:
   - Label: `"Auto BM Script"` (hoặc `"Auto Share BM"`, miễn consistent).
   - Tab này trỏ tới 1 page component mới, ví dụ `AutoBmPage`.

2. Trong `AutoBmPage`:

   - **Chọn BM trung gian**:
     - Dropdown nguồn từ list profile type BM trung gian.
     - Dùng đúng field UID BM trung gian đã lưu để sau build URL:
       - `https://business.facebook.com/latest/settings/ad_accounts?business_id={YOUR_BM_UID}`

   - **Chọn VIA**:
     - Table/list các profile type VIA, có checkbox multiple select.
     - Hiển thị UID, proxy, status, … theo style tab List Profile.

   - **Nhập danh sách link invite**:
     - Textarea multi-line, mỗi dòng 1 link invite từ DB.

   - **Control**:
     - Nút `Run Script` (bắt đầu).
     - Nút `Stop` (set flag cancel để dừng ở round tiếp theo).
     - Optional: `Clear Log`.

   - **Log & tiến trình**:
     - Hiển thị:
       - progress: `X/Y link đã xử lý`
       - bảng log: time, VIA UID, BM trung gian UID, invite link, Via-BM-ID, Via-UID-Ad-Account, status, error.

UI chỉ làm việc với 1 hàm core `runAutoBmScript` (xem dưới).

---

### BƯỚC 3 – MODULE CORE: runAutoBmScript

Tạo file mới, ví dụ: `src/modules/autoBmScript.ts` (tùy convention).

Trong đó:

```ts
export const BM_RATE_LIMIT_PER_ROUND = 2 as const;

export type TaskResultStatus = 'pending' | 'running' | 'success' | 'error';

export interface TaskResult {
  id: string;
  viaUid: string;
  bmUid: string;
  inviteLink: string;
  viaBmId?: string;          // business_id của BM trên VIA (Via-BM-ID)
  viaAdAccountUid?: string;  // UID ad account lấy được từ VIA
  status: TaskResultStatus;
  errorMessage?: string;
  timestamp: number;
}

export interface AutoBmOptions {
  bm: BmProfile;              // dùng đúng type BM của project
  vias: ViaProfile[];         // type VIA hiện có
  inviteLinks: string[];
  onLog?: (log: TaskResult) => void;
  onProgress?: (done: number, total: number) => void;
  isCancelled?: () => boolean;
}

export async function runAutoBmScript(opts: AutoBmOptions): Promise<void>;
````

Logic `runAutoBmScript`:

* Chia `inviteLinks` cho các VIA theo round-robin (VIA1→link1, VIA2→link2,…).
* Tạo danh sách cặp VIA: `[ [via1, via2], [via3, via4], ... ]` (VIA lẻ cuối cùng chạy 1 mình).
* Duyệt từng cặp:

  * Trong mỗi cặp, lặp nhiều **round**:

    * Round = tối đa 1 link cho mỗi VIA trong cặp → **tối đa 2 link / round**.
    * Nếu `isCancelled` → break.
    * Gọi `processRound(bm, tasks, hooks)`.

---

### BƯỚC 4 – CÁC HÀM AUTOMATION & SELECTOR CỤ THỂ

Dùng abstraction driver hiện có để chạy script trên DOM của từng profile.
Phần dưới là flow chi tiết kèm selector để Cursor code click/type/wait luôn.

#### 4.1 Giai đoạn 1.1 – Chuẩn bị LOGIN cho VIA

```ts
// VIA đã có cookie, nhưng cần login lại bằng password đã lưu trong profile.
export async function prepareViaSession(via: ViaProfile): Promise<void> {
  // pseudo:
  // browserClient.runWithProfile(via, async (page) => {
  //   await page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });
  //   await page.waitForTimeout(5000);
  //   await page.reload();
  //
  //   // Click avatar để hiện form login
  //   // CSS:
  //   //   #u_0_3_RL > img._s0._4ooo._1x2_._1ve7._1gax.img
  //   // Xpath:
  //   //   //*[@id="u_0_3_RL"]/img[1]
  //
  //   // Điền password từ via.password vào:
  //   // CSS:  #pass
  //   // Xpath: //*[@id="u_0_q_CD"]/div[2]/div[1]/input[1]
  //
  //   // Nhấn Enter, chờ ~5s
  // });
}
```

#### 4.2 Giai đoạn 1.2 – Chuẩn bị session BM trung gian (dùng UID đã lưu)

```ts
export async function prepareBmSession(bm: BmProfile): Promise<void> {
  // browserClient.runWithProfile(bm, async (page) => {
  //   await page.goto('https://www.facebook.com');
  //   await page.waitForTimeout(2000);
  //   await page.waitForTimeout(3000); // tổng 5s
  //
  //   // Set cookie BM từ DB (profile đã lưu cookie)
  //   // ... apply cookies ...
  //   await page.reload();
  //
  //   // Sử dụng UID BM trung gian đã có sẵn trong profile
  //   // ví dụ bm.businessId hoặc field tương đương mà project đang dùng
  //   const bmId = bm.businessId;
  //   if (bmId) {
  //     await page.goto(
  //       `https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id=${bmId}`
  //     );
  //   }
  // });
}
```

---

### 4.3 Giai đoạn 2.1 – VIA xử lý link invite, tạo Via-BM-ID & lấy Via-UID-Ad-Account

```ts
export async function viaHandleInviteAndExtractIds(
  via: ViaProfile,
  inviteLink: string
): Promise<{ viaBmId: string; viaAdAccountUid: string }> {
  // browserClient.runWithProfile(via, async (page) => {
  //   // Bước 1: paste link invite & open
  //   await page.goto(inviteLink);
  //
  //   // Click block accept đầu tiên:
  //   // CSS:
  //   //   #login-panel-container > div.x1ey2m1c... > div.x1ja2u2z...
  //   // Xpath:
  //   //   //*[@id="login-panel-container"]/div/div/div/div[3]/div/div
  //
  //   // Bước 2: điền first name & last name
  //   // First name 'ok':
  //   //   CSS:  #js_5
  //   //   Xpath: //*[@id="js_5"]
  //   // Last name 'oka':
  //   //   CSS:  #js_a
  //   //   Xpath: //*[@id="js_a"]
  //
  //   // Bước 3: Click nút Continue lần 1
  //   //   Xpath ví dụ:
  //   //   //*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/span/div/div/div[1]
  //
  //   // Bước 4: Click nút Continue lần 2
  //   //   (selector tương tự đoạn trên – xem spec, dùng lại Xpath/CSS dài đã cung cấp)
  //
  //   // Bước 5: Click Accept invitation:
  //   //   dùng 1 trong các selector sau:
  //   //   - Xpath: //*[@id="globalContainer"]/div/div/div/div[2]/div/div/div/div[1]/div[3]/div[3]/div
  //   //   - hoặc CSS dài đã cho ở bước 5.
  //
  //   // Bước 6: chờ URL chứa "business_id="
  //   //   https://business.facebook.com/latest/home?nav_ref=bm_home_redirect&business_id={Via-BM-ID}
  //   //   parse {Via-BM-ID} từ query.
  //
  //   // Bước 7: vào settings ad_accounts của Via-BM-ID:
  //   //   https://business.facebook.com/latest/settings/ad_accounts?business_id={Via-BM-ID}
  //
  //   // Bước 8: lấy Via-UID-Ad-Account
  //   //   CSS:
  //   //     #js_6g  hoặc  #js_6g > a
  //   //   Xpath:
  //   //     //*[@id="js_6g"]/a   hoặc  //*[@id="js_6g"]
  //   //   text ở đây là Via-UID-Ad-Account.
  //
  //   // return { viaBmId, viaAdAccountUid };
  // });
}
```

---

### 4.4 Giai đoạn 2.2 – BM trung gian add ad account & set role (RATE LIMIT = 2)

```ts
export async function bmAddAdAccountAndSetRole(
  bm: BmProfile,
  viaAdAccountUid: string
): Promise<void> {
  // browserClient.runWithProfile(bm, async (page) => {
  //   const bmId = bm.businessId; // lấy UID BM trung gian đã lưu
  //   await page.goto(
  //     `https://business.facebook.com/latest/settings/ad_accounts?business_id=${bmId}`
  //   );
  //
  //   // Bước 2: Click nút +Add
  //   //   Dùng 1 trong các selector đã cung cấp (CSS dài ở "2.2 Bước 2").
  //
  //   // Bước 3: Trong dialog, chọn kiểu "Add an ad account"
  //   //   Click:
  //   //   - CSS: #js_7l  hoặc  #js_7m
  //   //   - hoặc selector: #js_7k > div... (đã cho)
  //
  //   // Bước 4: Nhập Via-UID-Ad-Account:
  //   //   CSS:  #js_8m
  //   //   Xpath: //*[@id="js_8m"]
  //
  //   // Bước 4b: Nhấn Next:
  //   //   Sử dụng 1 trong các CSS path ở phần "Sau đó nhấn next".
  //
  //   // Bước 5: Toggle full access role:
  //   //   CSS: chuỗi dài ở “Bước 5: Click vào để toggle full access role”.
  //   //   Xpath: //*[@id="js_95"] hoặc path tương ứng.
  //
  //   // Bước 5b: Confirm:
  //   //   CSS: #js_8y hoặc #js_8y > span...
  //   //   Xpath: //*[@id="js_8y"]/span/div/div/div
  //
  //   // Bước 6: Click Done:
  //   //   CSS/Xpath: block dài ở "Bước 6: Click done để hoàn tất".
  // });
}
```

**Lưu ý rate limit:**

* `runAutoBmScript` khi gọi `bmAddAdAccountAndSetRole` phải đảm bảo:

  * Một **round** chỉ gọi hàm này tối đa 2 lần (cho tối đa 2 viaAdAccountUid).
  * Đây là nơi áp dụng `BM_RATE_LIMIT_PER_ROUND = 2`.

---

### 4.5 Giai đoạn 2.3 – VIA approve role setup

```ts
export async function viaApproveRoleSetup(
  via: ViaProfile,
  viaBmId: string
): Promise<void> {
  // browserClient.runWithProfile(via, async (page) => {
  //   // Vào trang request:
  //   await page.goto(
  //     `https://business.facebook.com/latest/settings/requests?business_id=${viaBmId}`
  //   );
  //
  //   // Bước 1: Click dòng request trong bảng
  //   //   Dùng 1 trong các CSS:
  //   //   - selector dài bắt đầu bằng #mount_0_0_6U...
  //   //   hoặc Xpath:
  //   //   - //*[@id="mount_0_0_OJ"]/div/.../table/tbody/tr
  //
  //   // Bước 2: Click nút Approve
  //   //   CSS dài bắt đầu bằng #mount_0_0_1J...
  //   //   Xpath:
  //   //   - //*[@id="mount_0_0_1J"]/div/.../div[2]/div
  // });
}
```

---

### BƯỚC 5 – LOG & BÁO CÁO

Trong `runAutoBmScript`, mỗi khi 1 chu trình hoàn tất cho 1 invite link:

* Nhận từ `viaHandleInviteAndExtractIds`:

  * `viaBmId` (Via-BM-ID),
  * `viaAdAccountUid` (Via-UID-Ad-Account).
* Biết sẵn:

  * `bmUid` (YOUR_BM_UID từ profile BM trung gian),
  * `inviteLink`.
* Tạo `TaskResult`:

  * `status = 'success'` hoặc `'error'`.
* Gọi `onLog(result)`, cập nhật `onProgress(done, total)`.

UI tab `"Auto BM Script"`:

* Subcribe vào callback này để render log.
* Nếu project có module Report lưu lại vào DB/log, hãy reuse cùng service để:

  * Lưu `{ viaBmId, bmUid, viaAdAccountUid, inviteLink, timestamp }` đánh dấu hoàn tất share nhận.

---

### TỔNG KẾT CHO CURSOR

1. Đọc cấu trúc project, tìm type profile VIA/BM và field lưu UID BM trung gian (dùng để mở dashboard set role).
2. Thêm tab `"Auto BM Script"` với UI chọn BM, VIA, list link, nút Run/Stop, log.
3. Tạo module `autoBmScript.ts` với `runAutoBmScript` và các hàm:

   * `prepareViaSession`
   * `prepareBmSession`
   * `viaHandleInviteAndExtractIds`
   * `bmAddAdAccountAndSetRole`
   * `viaApproveRoleSetup`
4. Cài flow:

   * Chia link cho VIA.
   * Chạy theo **cặp 2 VIA**, mỗi round tối đa 2 link → tối đa 2 lần set role cho BM.
   * Gọi đúng thứ tự:

     * VIA: Giai đoạn 1.1 → 2.1 (login + invite + lấy Via-BM-ID & Via-UID-Ad-Account)
     * BM: 1.2 → 2.2 (add ad-account & set role)
     * VIA: 2.3 (approve).
5. Sử dụng các **selector cụ thể đã cung cấp** để click/type/wait trong từng step (ưu tiên selector dạng `#id`, dùng CSS/Xpath dài làm fallback).

```

---

Nếu sau khi cho Cursor chạy xong, bạn có file `autoBmScript.ts` và component `AutoBmPage`, bạn có thể gửi lại mình, mình giúp bạn soi tiếp luồng / tối ưu thêm.
::contentReference[oaicite:0]{index=0}
```
