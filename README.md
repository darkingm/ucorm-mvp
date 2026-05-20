# UCOrm — AI-Powered Online Reputation Management

> MVP 0 (Proof of Concept) — bài test 7 ngày cho UCTalent Labs.
> Nền tảng giúp doanh nghiệp quản trị review Google Maps bằng AI: tự fetch review → AI sinh 3 phương án trả lời → user duyệt trên 1 dashboard duy nhất.

- **Live demo:** _(sẽ cập nhật sau khi deploy lên Vercel)_
- **Demo video:** _(sẽ thêm link Loom ~2 phút)_
- **Author:** kien4941@gmail.com

---

## 1. Bối cảnh & bài toán

Một khách sạn/F&B trung bình nhận hàng trăm Google reviews mỗi tháng. Nhân viên không có thời gian trả lời từng cái, dẫn đến:

- Khách hàng cảm thấy bị bỏ rơi → ảnh hưởng rating tổng thể.
- Review tiêu cực không được xử lý kịp → khủng hoảng truyền thông.
- Trả lời thủ công không nhất quán về tone/voice.

**UCOrm giải quyết** bằng cách dùng AI để gợi ý 3 phương án trả lời (Tiêu chuẩn / Thân thiện / Khắc phục lỗi) — con người chỉ cần đọc và Approve, thời gian xử lý 1 review giảm từ ~5 phút xuống ~15 giây.

---

## 2. Luồng tính năng cốt lõi

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Nhập Place ID  │───▶│  Fetch reviews   │───▶│   Lưu vào DB    │
│   (dashboard)   │    │  (Google Places) │    │   (Supabase)    │
└─────────────────┘    └──────────────────┘    └────────┬────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ status =        │◀───│  Bấm Approve     │◀───│  User chọn 1    │
│ "resolved"      │    │  (lưu reply)     │    │  trong 3 reply  │
└─────────────────┘    └──────────────────┘    └────────▲────────┘
                                                        │
                                               ┌────────┴────────┐
                                               │  Generate AI    │
                                               │  (OpenAI JSON)  │
                                               │  3 tones        │
                                               └─────────────────┘
```

**Lưu ý:** MVP 0 KHÔNG đẩy reply ngược lên Google Maps — chỉ cập nhật status trong DB (theo Acceptance Criteria của UI-02).

---

## 3. Tech Stack & Trade-offs

| Layer        | Lựa chọn                       | Tại sao chọn cái này thay vì lựa chọn khác                                                                                                                       |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | **Next.js 16 (App Router)**    | API Routes làm backend → 1 codebase duy nhất, đỡ phải tách FE/BE. Server Components giúp giấu API key. Vercel native support.                                  |
| Language     | **TypeScript**                 | Type safety cho contract giữa API ↔ UI ↔ DB schema, giảm bug runtime trong giai đoạn 7 ngày gấp.                                                                |
| Styling      | **Tailwind CSS v4**            | Style inline trong JSX → iterate UI nhanh, không tốn thời gian quản lý file CSS riêng.                                                                          |
| Database     | **Supabase (PostgreSQL)**      | Free tier rộng, setup < 5 phút, có JS SDK + RLS sẵn. Chọn SQL thay Firestore vì data có quan hệ rõ (Place 1—N Review) và dễ giải thích schema khi phỏng vấn.    |
| AI           | **OpenAI GPT-4o-mini**         | Rẻ (~$0.15/1M input tokens), nhanh (< 3s cho 3 reply), hỗ trợ `response_format: json_object` → đảm bảo output đúng format JSON ngay từ API, không cần parse fallback. |
| External API | **Google Places API (New)**    | Endpoint `places/{place_id}` trả về reviews trực tiếp. Có quota free tier đủ test.                                                                              |
| Deploy       | **Vercel**                     | Yêu cầu của PRD. Connect GitHub → auto-deploy mỗi push, có preview URL cho mỗi PR.                                                                              |
| Validation   | **Zod**                        | Validate Place ID đầu vào + parse JSON response từ OpenAI an toàn — fail-fast nếu AI trả về sai format.                                                          |

### Vì sao không chọn...

- **Gemini API:** PRD cho cả 2 lựa chọn, mình chọn OpenAI vì JSON mode ổn định hơn và tài liệu prompt engineering nhiều hơn cho production use case.
- **Firebase:** Schema flexible quá đôi khi là điểm yếu — với data có cấu trúc rõ (Place ↔ Review ↔ AI replies), SQL constraint giúp bắt bug sớm.
- **Prisma ORM:** Over-engineering cho MVP 7 ngày. Supabase JS client + raw SQL migrations là đủ.
- **shadcn/ui:** Cân nhắc nhưng chọn Tailwind thuần để code rõ ràng hơn, recruiter dễ đọc code components.

---

## 4. Database schema

```sql
-- Lưu các place đã fetch
places (
  id              uuid primary key default gen_random_uuid(),
  place_id        text unique not null,          -- Google Place ID
  name            text,
  address         text,
  created_at      timestamptz default now()
);

-- Review + AI replies + trạng thái duyệt
reviews (
  id                uuid primary key default gen_random_uuid(),
  place_id          uuid references places(id) on delete cascade,
  google_review_id  text unique,                 -- chống duplicate khi re-fetch
  author_name       text,
  rating            int check (rating between 1 and 5),
  comment           text,
  review_time       timestamptz,
  status            text default 'pending'       -- 'pending' | 'resolved'
                    check (status in ('pending', 'resolved')),
  ai_replies        jsonb,                       -- { standard, friendly, apologetic }
  approved_reply    text,
  approved_tone     text,                        -- tone đã chọn (audit trail)
  approved_at       timestamptz,
  created_at        timestamptz default now()
);

create index reviews_place_id_idx on reviews(place_id);
create index reviews_status_idx   on reviews(status);
```

Lý do `ai_replies` dùng JSONB: lưu cả 3 phương án trong 1 column, không cần bảng phụ — phù hợp pattern "data ít structure, ít query field-level".

---

## 5. AI prompt design

Prompt được thiết kế theo principle:

- **System prompt** đặt vai trò ("brand voice consultant") + ngôn ngữ output (tiếng Việt, match ngôn ngữ review).
- **User prompt** đưa context: tên place, rating, nội dung review.
- **JSON mode** ép output đúng schema `{ standard: string, friendly: string, apologetic: string }`.
- **Zod parse** ở server-side → nếu AI trả sai format, raise error rõ ràng thay vì crash UI.

Chi tiết prompt nằm trong [`lib/openai/prompts.ts`](lib/openai/prompts.ts) _(sẽ tạo)_.

---

## 6. Project structure

```
ucorm/
├── app/
│   ├── api/
│   │   ├── places/fetch/route.ts             # POST: fetch reviews từ Google + lưu DB
│   │   ├── reviews/[id]/generate/route.ts    # POST: gọi OpenAI sinh 3 replies
│   │   └── reviews/[id]/approve/route.ts     # POST: chọn reply + đổi status → resolved
│   ├── components/
│   │   ├── PlaceIdForm.tsx                   # Client: ô input + Fetch + states
│   │   ├── ReviewCard.tsx                    # Server: render 1 review + slot ReplyPicker
│   │   └── ReplyPicker.tsx                   # Client: Generate AI → 3 cards → Approve
│   ├── layout.tsx
│   ├── page.tsx                              # Dashboard (Server Component đọc DB)
│   └── globals.css
├── lib/
│   ├── env.ts                                # Lazy + fail-fast env var access
│   ├── types.ts                              # Database types cho Supabase typed client
│   ├── supabase/{server,browser}.ts          # 2 client (service_role vs anon)
│   ├── google-places/{index,sample}.ts       # Places API (New) + sample fallback
│   └── openai/{index,prompts}.ts             # GPT-4o-mini wrapper + prompt template
└── supabase/
    ├── migrations/0001_init.sql              # 2 bảng + indexes + RLS enable
    └── seeds/sample.sql                      # 1 place + 5 review tiếng Việt
```

---

## 7. Setup local

### Yêu cầu
- Node.js >= 20
- Tài khoản Supabase (free tier)
- OpenAI API key (~$5 là đủ test cả tuần)
- Google Cloud project có enable "Places API (New)"

### Các bước

```bash
git clone https://github.com/<user>/ucorm-mvp.git
cd ucorm-mvp/ucorm
npm install
cp .env.example .env.local   # điền các key bên dưới
npm run dev
```

### Environment variables

```bash
# .env.local — KHÔNG commit file này
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # public — dùng ở client
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # server-only — bypass RLS cho seed/admin
OPENAI_API_KEY=sk-...                       # server-only
GOOGLE_PLACES_API_KEY=AIza...               # server-only
```

> Các key không có tiền tố `NEXT_PUBLIC_` sẽ KHÔNG bị expose ra client bundle — đây là tuyến phòng thủ chính cho API key.

---

## 8. Tiến độ vs Definition of Done

| Hạng mục (theo PRD)                                                  | Trạng thái |
| -------------------------------------------------------------------- | ---------- |
| Source code trên GitHub, commit rõ ràng                              | ✅          |
| Deploy thực tế trên Vercel, click không lỗi                          | ⬜          |
| Luồng Place ID → Fetch → AI → Approve hoạt động end-to-end           | ✅          |
| Hoàn thành trong 7 ngày lịch (deadline 2026-05-26)                   | ✅          |

### Feature checklist (theo Epic của PRD)

**Epic 1 — Data Pipeline**
- [x] DP-01: Nhập Place ID → Fetch → lưu 5 review mới nhất vào Supabase (có fallback sample data)

**Epic 2 — AI Engine**
- [x] AI-01: Nút "Generate AI" → OpenAI sinh 3 reply (Standard/Friendly/Apologetic) JSON, tốc độ < 5s

**Epic 3 — Dashboard**
- [x] UI-01: 1 màn hình duy nhất, list review, status badge Pending/Resolved, counter
- [x] UI-02: Chọn 1 trong 3 reply → Approve → status chuyển Resolved trong DB

---

## 9. Decisions log

Ghi lại các quyết định kỹ thuật quan trọng + lý do, để recruiter hiểu cách suy nghĩ chứ không chỉ thấy kết quả:

| # | Quyết định                                            | Lý do                                                                                                                              |
| - | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1 | KHÔNG implement authentication ở MVP 0                 | PRD chỉ nhắc "1 dashboard duy nhất", không yêu cầu user accounts. Tránh scope creep. Sẽ note rõ trong demo là assumption.            |
| 2 | KHÔNG đẩy reply lên Google Maps                       | UI-02 ghi rõ "Không cần đẩy ngược lên Google ở bản này".                                                                            |
| 3 | Dùng OpenAI JSON mode thay vì regex parse             | Đảm bảo format reply hợp lệ ngay từ API → giảm error handling phía client.                                                          |
| 4 | Server-side fetch Google Places (qua API route)        | Giấu API key, tránh CORS, dễ rate-limit.                                                                                            |
| 5 | Sample data fallback nếu Google quota hết             | PRD cho phép. Có flag env `USE_SAMPLE_DATA=true` để demo offline.                                                                   |
| 6 | Chọn Next.js 16 thay vì 14/15                          | Project init với `create-next-app@latest` → mặc định v16. Có rủi ro API breaking, mitigate bằng cách đọc `node_modules/next/dist/docs/`. |

---

## 10. Nếu có thêm thời gian (out of scope MVP 0)

- **Auth + multi-tenant:** mỗi khách sạn có account, RLS theo `tenant_id`.
- **Webhook Google Business Profile API** để fetch real-time thay vì manual.
- **Approve → push lên Google** thật (cần Google Business Profile API verification).
- **Analytics:** sentiment trends, response rate KPI, dashboard chart.
- **Edit reply trước khi Approve:** hiện tại bắt buộc chọn 1 trong 3, có thể cho user chỉnh text.
- **Multi-language support** cho review tiếng Anh/Hàn/Nhật.
- **Unit + E2E tests** (Playwright cho golden path).

---

## 11. Giả định (Assumptions)

Để tránh ambiguity, dưới đây là các giả định mình đã đưa ra (nếu sai, please ping mình):

1. MVP 0 public — không cần login/auth.
2. 1 user duy nhất (không phân quyền owner/staff).
3. Review chỉ ở tiếng Việt là chính (AI prompt match theo ngôn ngữ review).
4. Không cần i18n cho UI.
5. Browser hỗ trợ Chrome/Edge/Safari mới nhất — không support IE.

---

## License

Private — bài test cho UCTalent Labs.
