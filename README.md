# UCOrm — AI-Powered Online Reputation Management

Em xin gửi kết quả bài test cho UCTalent Labs. Hệ thống của em có nhờ sự hỗ trợ của Claude (Anthropic) trong quá trình code — chủ yếu cho phần boilerplate, refactor, và soạn documentation. Toàn bộ quyết định về kiến trúc, lựa chọn tech stack, các trade-off và prompt design đều do em chủ động đưa ra dựa trên việc đọc kỹ PRD. Phần dưới đây mô tả chi tiết hệ thống em đã xây và lý do em chọn các giải pháp đó.

---

MVP 0 (Proof of Concept) thực hiện trong 7 ngày cho UCTalent Labs. Nền tảng giúp khách sạn / F&B quản trị review Google Maps bằng AI: tự fetch review, AI sinh 3 phương án trả lời theo 3 tone khác nhau, người dùng đọc và Approve trên một dashboard duy nhất. Không đẩy reply ngược lên Google Maps (đúng acceptance criteria của UI-02).

Live demo: _(sẽ cập nhật sau khi deploy Vercel)_
Demo video: _(sẽ thêm link Loom ~2 phút)_
Author: kien4941@gmail.com

## Bài toán

Một khách sạn cỡ trung bình nhận hàng trăm Google Maps reviews mỗi tháng. Nhân viên không có thời gian trả lời từng cái, dẫn đến rating tổng thể bị bào mòn, review tiêu cực không được xử lý kịp, và tone trả lời không nhất quán giữa các nhân viên. UCOrm rút bài toán này về một thao tác duy nhất: con người chỉ đọc 3 phương án mà AI viết sẵn rồi bấm chọn — thời gian xử lý một review giảm từ khoảng 5 phút (đọc, suy nghĩ, gõ) xuống khoảng 15 giây (đọc, chọn).

## Luồng cốt lõi

```
┌─ TEST    : 1 nút "Nạp 5 review mẫu" ─────────┐
│                                              │
├─ REAL    : Place ID / Maps URL  → Places API ┼─→ Supabase
│                                              │       │
└─ MANUAL  : Paste review từ Maps + rating ────┘       │
                                                       ▼
[status = resolved] ← Approve 1/3 ← Gemini sinh 3 reply ← user bấm Generate AI
```

Dashboard có **3 đường nạp review** chạy song song, đều đẩy về cùng 1 bảng `reviews` trong Supabase. Sau đó pipeline AI là 1 đường duy nhất: mỗi review có nút Generate AI gọi Gemini sinh 3 reply (Tiêu chuẩn / Thân thiện / Khắc phục lỗi). User chọn 1 reply rồi bấm Approve — status chuyển từ `pending` sang `resolved`, audit trail (tone đã chọn, thời điểm) lưu lại.

Vì sao 3 đường nạp thay vì 1: PRD yêu cầu DP-01 dùng Google Places API, nhưng Definition of Done có Note cho phép sample data khi lấy review khó khăn. Em chọn tiếp cận rộng hơn — implement cả 3 cách nạp để recruiter thấy mình đang nghĩ về DP-01 như một **data ingestion problem** chứ không chỉ là "gọi 1 API theo PRD". Đặc biệt panel MANUAL giải bài toán thực tế hay gặp: "tôi vừa thấy 1 review tệ trên Google Maps, muốn xử lý ngay mà chưa kịp setup API key" — user copy nội dung trong browser, paste vào textarea, AI xử lý y hệt review fetch tự động.

## Tech stack & lý do chọn

### Framework: Next.js 16.2.6 (App Router) + React 19.2.4

Đóng vai trò cả frontend và backend trong cùng 1 codebase. Cụ thể:

- **Server Components** (`app/page.tsx`) đọc Supabase trực tiếp tại render-time, không phải gọi REST từ client → không có loading state cho danh sách review, page load thấy data ngay.
- **Route Handlers** (`app/api/.../route.ts`) đóng vai backend cho các thao tác mutate: fetch Google Maps, gọi Gemini, approve, manual insert. Tất cả API key (`GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`, `GOOGLE_PLACES_API_KEY`) chỉ tồn tại ở server-side, không lộ ra client bundle.
- **App Router** với file-based routing — không cần config thêm. Vercel auto-detect Next.js, build + deploy không cần custom config.

So với SPA + Express tách rời: tiết kiệm 1 repo, 1 deploy pipeline, 1 lần xử lý CORS. So với Remix / SvelteKit: Vercel native-support Next.js có tier free rộng nhất và build mượt nhất cho yêu cầu DoD.

### Language: TypeScript 5

Tất cả file `.ts` / `.tsx`. Type cho `Database` schema (ở `lib/types.ts`) được Supabase SDK consume → khi `select('*, places(name, address)')` thì IntelliSense biết shape kết quả. Type cho `AITone` (enum `'standard' | 'friendly' | 'apologetic'`) dùng chung cho cả backend (Zod schema, DB CHECK constraint) lẫn frontend (UI select). Bắt sai contract ngay lúc `npm run build` thay vì runtime.

### Styling: Tailwind CSS v4 (qua `@tailwindcss/postcss`)

Utility class inline trong JSX, không CSS module / styled-components / theme provider. Lý do: UI MVP này chỉ có form + card + button + grid — không đủ phức tạp để cần design system. Tailwind v4 (so với v3) có engine nhanh hơn 5–10×, không cần `tailwind.config.js` cho project nhỏ.

Cân nhắc shadcn/ui và bỏ qua: nó copy component vào repo nên thêm boilerplate; mà MVP này chỉ render ~5 component, viết tay nhanh hơn install + tweak shadcn.

### Database: Supabase (PostgreSQL 15+)

Free tier 500MB DB + 5GB bandwidth, không auto-sleep, có Auth + Storage + Realtime sẵn dùng (MVP 0 không cần nhưng plus point cho mở rộng).

So với **Firebase Firestore**: data của bài có quan hệ rõ một-nhiều (1 Place → N Reviews). Postgres enforce `foreign key`, `unique`, `check` ngay DB layer; Firestore là document store nên muốn đảm bảo tương tự phải validate ở application layer và dễ rò sót. Cụ thể:
- `reviews.google_review_id unique` chống fetch trùng khi bấm Fetch nhiều lần
- `rating between 1 and 5` chặn rating sai ngay nguồn
- `status in ('pending', 'resolved')` chặn typo
- FK `place_id` với `on delete cascade` đảm bảo không có review mồ côi

So với **Prisma + Postgres tự host**: free tier Supabase đủ; tự host phải lo migration, backup, monitoring — over-engineering cho 7 ngày.

### Database driver: `@supabase/supabase-js` 2.106

Không dùng ORM. Lý do: query của bài đơn giản (1 join, 1 filter, 1 upsert), Supabase client API đã đủ ergonomic. ORM (Prisma, Drizzle) thêm 1 layer abstraction + code generation step không cần thiết cho MVP. Type-safety vẫn có nhờ `Database<T>` generic.

Hai instance phân biệt rõ:
- `lib/supabase/server.ts` — dùng `SUPABASE_SECRET_KEY` (service_role), bypass RLS, chỉ chạy server-side. Mọi mutation và query SSR đi qua đây.
- `lib/supabase/browser.ts` — dùng `NEXT_PUBLIC_SUPABASE_ANON_KEY`, có thể chạy client. MVP 0 hiện không gọi từ browser nhưng giữ sẵn để mở rộng.

### AI: Gemini 2.5 Flash (REST API)

PRD cho cả Gemini lẫn OpenAI. Em chọn Gemini vì:

1. **Free tier không cần billing**: AI Studio cấp key ngay tại https://aistudio.google.com/apikey, 15 RPM miễn phí. OpenAI bắt buộc nạp $5 mới gọi được.
2. **JSON mode mạnh hơn**: Gemini có `responseSchema` ép output đúng shape `{ standard, friendly, apologetic }` ở model level. OpenAI `response_format: json_object` chỉ guarantee JSON hợp lệ chứ không guarantee shape — vẫn phải Zod parse fallback.
3. **Tắt được thinking mode**: `thinkingConfig: { thinkingBudget: 0 }` trong `generationConfig` giảm latency từ ~5s xuống ~2s. Task này (template 3 đoạn ngắn) không cần reasoning sâu.
4. **Direct REST call**: không cài SDK `@google/generative-ai` — giảm 1 dependency, 1 file API design phải học. Code chỉ là `fetch()` với header `Content-Type: application/json` và URL query `?key=...`.

Folder đặt tên `lib/ai/` thay vì `lib/gemini/` để provider-neutral — sau này muốn swap chỉ đổi `lib/ai/index.ts`.

### Validation: Zod 4.4

Validate ở 3 chỗ:
1. **Body request** của `/api/places/fetch`, `/api/reviews/[id]/approve`, `/api/reviews/manual` — fail fast với 400 + message rõ ràng nếu shape sai.
2. **Output Gemini** ở `lib/ai/index.ts` — kiểm tra mỗi reply có length 10–800 ký tự sau khi Gemini đã trả JSON. Là tầng phòng thủ thứ 2 sau `responseSchema`.
3. **Inference type** từ schema (`z.infer<typeof bodySchema>`) — không phải declare type 2 lần ở 2 chỗ.

### External APIs

- **Google Places API (New)** v1 — endpoint `places/{placeId}` lấy review. Optional, panel REAL dùng. Code implement đầy đủ kể cả khi key không tồn tại trong env (Test panel và Manual panel vẫn chạy).
- **Gemini API** v1beta — endpoint `models/gemini-2.5-flash:generateContent`. Bắt buộc cho Generate AI.
- **No third-party**: không SerpAPI, không Apify, không Cloudflare Workers AI. Mọi external call đều là Google.

### Deploy: Vercel (Hobby tier free)

DoD bắt buộc. Connect repo GitHub, auto-deploy mỗi `git push origin main`. Preview deploy cho mỗi branch khác. Env vars set qua dashboard, không commit vào repo.

### Dev tools

- **ESLint 9** với config `eslint-config-next` cho rule chuẩn Next.js
- **PostCSS** + `@tailwindcss/postcss` cho Tailwind v4
- **Turbopack** (mặc định trong Next.js 16) cho dev server và build — nhanh hơn Webpack đáng kể

## Kiến trúc & file layout

```
app/
├── api/
│   ├── places/fetch/route.ts             POST: TEST/REAL ingest, resolve URL, upsert
│   ├── reviews/manual/route.ts           POST: MANUAL ingest, insert dạng paste tay
│   ├── reviews/[id]/generate/route.ts    POST: gọi Gemini, validate JSON, lưu ai_replies
│   └── reviews/[id]/approve/route.ts     POST: race-safe update status='resolved'
├── components/
│   ├── SampleFetchPanel.tsx              Panel TEST: 1 nút nạp sample, không gọi network
│   ├── PlaceIdForm.tsx                   Panel REAL: Place ID hoặc Maps URL → Fetch
│   ├── ManualReviewForm.tsx              Panel MANUAL: textarea + rating + author + source
│   ├── ReviewCard.tsx                    Render 1 review + SourceBadge (TEST/REAL/MANUAL)
│   └── ReplyPicker.tsx                   Generate AI → 3 card → Approve, optimistic state
├── layout.tsx
└── page.tsx                              Dashboard SSR, 3 panel + list review
lib/
├── env.ts                                Lazy + fail-fast accessor cho process.env
├── types.ts                              Database<T> + ReviewWithPlace + AITone enum
├── supabase/{server,browser}.ts          2 client: service_role (server) vs anon (client)
├── google-places/index.ts                Places API (New) GET /v1/places/{id}
├── google-places/resolve.ts              URL/short-link/raw-ID → Place ID
├── google-places/sample.ts               5 review mẫu tiếng Việt rating 1–5
├── ai/index.ts                           Gemini wrapper với responseSchema enforcement
└── ai/prompts.ts                         System prompt + buildUserPrompt
supabase/
├── migrations/0001_init.sql              2 bảng + indexes + RLS enable
└── seeds/sample.sql                      Insert seed cho dev không cần fetch
```

Dashboard chia làm **3 panel song song** trên grid `md:grid-cols-2 lg:grid-cols-3`:

- **Panel TEST** (`SampleFetchPanel`) — gọi `/api/places/fetch` với `{ mode: "sample" }`. Backend bỏ qua resolver và Google API, dùng object `SAMPLE_PLACE` cố định ở `lib/google-places/sample.ts`. Mục đích: demo end-to-end không cần API key.

- **Panel REAL** (`PlaceIdForm`) — gọi `/api/places/fetch` với `{ mode: "real", input }`. Backend resolve input (Place ID thô / short link / URL Maps) thành Place ID rồi gọi Places API (New). Khi `GOOGLE_PLACES_API_KEY` không tồn tại, panel báo lỗi rõ ràng — phần code Places API vẫn implement đầy đủ.

- **Panel MANUAL** (`ManualReviewForm`) — gọi `/api/reviews/manual` với `{ author?, rating, comment, source? }`. Backend upsert 1 `place` tổng hợp (id `manual/inbox`) và insert review với `google_review_id = manual/{uuid}`. Mục đích: cho user copy review từ Google Maps trong browser (không gọi bất kỳ API nào) rồi paste vào textarea — AI vẫn xử lý y hệt review fetch tự động. Field `source` (optional) cho user ghi nguồn (vd tên khách sạn) sẽ được prepend vào comment dạng `[Nguồn: ...]` để hiển thị inline, không cần thêm cột DB.

`ReviewCard` render `SourceBadge` cạnh `StatusBadge`, detect bằng prefix của `google_review_id`:
- `places/sample/...` → badge `TEST` (amber)
- `manual/...` → badge `MANUAL` (violet)
- else (gồm cả `places/{real-id}/reviews/...` từ Google) → badge `REAL` (sky blue)

Phân loại này không cần thêm column DB — tận dụng prefix sẵn có. Sample data trong `sample.ts` đặt `name: 'places/sample/reviews/rev_001'`, manual route generate `manual/<uuid>`, Google trả về `places/<real-id>/reviews/<hash>`.

## Database schema

```sql
create table places (
  id          uuid primary key default gen_random_uuid(),
  place_id    text unique not null,
  name        text,
  address     text,
  created_at  timestamptz not null default now()
);

create table reviews (
  id                uuid primary key default gen_random_uuid(),
  place_id          uuid not null references places(id) on delete cascade,
  google_review_id  text unique,
  author_name       text,
  rating            int check (rating between 1 and 5),
  comment           text,
  review_time       timestamptz,
  status            text not null default 'pending'
                    check (status in ('pending', 'resolved')),
  ai_replies        jsonb,
  approved_reply    text,
  approved_tone     text check (approved_tone in ('standard', 'friendly', 'apologetic')),
  approved_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index reviews_place_id_idx on reviews(place_id);
create index reviews_status_idx on reviews(status);
create index reviews_created_at_idx on reviews(created_at desc);

alter table places enable row level security;
alter table reviews enable row level security;
```

`ai_replies` dùng JSONB lưu cả ba phương án trong một cột, không cần bảng phụ — phù hợp pattern "data có ít structure, ít query field-level". `approved_tone` lưu lại để biết user đã chọn tone nào — audit trail cho việc đánh giá hiệu quả prompt sau này.

RLS bật trên cả hai bảng nhưng cố tình không tạo bất kỳ policy nào cho anon role — đây là defense in depth: mọi mutation đi qua Next.js Route Handler bằng `SUPABASE_SECRET_KEY` (service_role) bypass RLS. Kể cả khi `NEXT_PUBLIC_SUPABASE_ANON_KEY` bị lộ ở client bundle (vốn là chuyện bình thường), attacker không đọc / ghi gì được trực tiếp.

Approve route có chống race condition cụ thể: update có thêm `.eq('status', 'pending')` ngoài `.eq('id', id)` — nếu hai tab đồng thời approve một review, chỉ tab đầu thành công, tab sau nhận lỗi 409 "đã resolved" thay vì ghi đè reply của tab đầu.

## AI prompt

System prompt đặt vai trò "chuyên gia tư vấn brand voice cho doanh nghiệp dịch vụ" rồi liệt kê ràng buộc cứng: ngôn ngữ output phải match review (review tiếng Việt → reply tiếng Việt), độ dài 2–4 câu không quá 80 từ, cấm bịa thông tin cụ thể (giá phòng, tên nhân viên cụ thể) không có trong review, cấm hứa hẹn refund / upgrade / quà tặng vì không biết policy thật. Ngôi xưng "chúng tôi" cho tone standard và apologetic, cho phép "mình" / "team" cho friendly. Kết bằng lời cảm ơn hoặc mời quay lại.

User prompt build từ context cụ thể của review: `Doanh nghiệp: {placeName}`, `Đánh giá: {rating}/5 sao`, `Review: {comment}`.

Output đi qua hai tầng validate: tầng đầu là `responseSchema` ở Gemini API ép Gemini phải trả JSON đúng `{ standard, friendly, apologetic }`; tầng hai là `repliesSchema` (Zod) phía server kiểm tra mỗi field có length 10–800 ký tự. Sai bất kỳ tầng nào đều throw error rõ ràng trả 502 về client.

## Setup local

Cần Node 20+, Supabase project (free tier), Gemini API key (free ở https://aistudio.google.com/apikey, không cần billing). Google Places API key là tùy chọn — không có vẫn demo được qua Test panel.

```bash
git clone <repo-url>
cd ucorm
npm install
cp .env.example .env.local      # rồi điền key
npm run dev
```

Tạo schema Supabase bằng cách paste nội dung `supabase/migrations/0001_init.sql` vào SQL Editor của Supabase Dashboard rồi Run. Migration idempotent (`if not exists`) nên chạy lại lần hai không hỏng.

Environment variables (đã chú thích trong `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_pub_...   # hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY=sb_secret_...                 # hoặc SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY=AIzaSy...
GOOGLE_PLACES_API_KEY=                            # để trống nếu chưa có; chỉ ảnh hưởng Real panel
USE_SAMPLE_DATA=true                              # default mode khi request không có "mode"
```

Code chấp nhận cả tên mới (`sb_pub_`, `sb_secret_`) và tên cũ (`anon`, `service_role`) của Supabase vì họ vừa thay naming.

## Ba đường nạp review

### TEST — Sample data (viền vàng)

Một nút duy nhất "Nạp 5 review mẫu". Bấm là backend upsert place `ChIJN1t_tDeuEmsRUsoyG83frY4` (Khách sạn Hoa Sen Sài Gòn, sample) kèm 5 review tiếng Việt rating 1–5. Bấm lại idempotent vì upsert theo `google_review_id` unique.

5 review mẫu được viết với phong cách thật của Google Maps Việt Nam: 1 review 5 sao kể chi tiết về dịch vụ, 1 review 1 sao rant CAPS-LOCK về overbooking, 1 review không dấu kiểu gõ điện thoại, 1 review 2 sao phàn nàn có cause cụ thể (mùi ẩm mốc), 1 review 3 sao 1 câu cộc lốc. Mục đích: AI có content đủ phong phú để sinh 3 tone reply khác biệt thật.

### REAL — Google Places API (viền xanh)

Ô input chấp nhận **4 dạng đầu vào**:

1. **Place ID thô** (`ChIJN1t_tDeuEmsRUsoyG83frY4`): detect bằng regex base64url-style không chứa `://`, return as-is.
2. **Short link** (`maps.app.goo.gl/...`, `goo.gl/maps/...`, `g.page/...`): server-side `fetch` với `redirect: "follow"`, đọc `response.url` ra URL dài. Whitelist hostname trước khi follow để tránh SSRF qua URL người dùng paste.
3. **URL dài chứa `place_id=` hoặc chuỗi `ChIJ...`**: regex extract trực tiếp.
4. **URL share thông thường** (`/maps/place/Tên+Khách+sạn/@lat,lng,17z/data=!4m...!1s0xHEX:0xHEX`): URL này không chứa Place ID thật mà chỉ có FTID. Fallback gọi `places:searchText` với `textQuery` là tên đã decode và `locationBias` lấy từ `lat,lng` trong URL — lấy place đầu tiên trả về.

Sau khi resolve, gọi `GET /v1/places/{id}` với `X-Goog-FieldMask: id,displayName,formattedAddress,reviews` (chỉ xin field cần — giảm cost theo SKU Google), `.slice(0, 5)` đúng AC, upsert với `onConflict: google_review_id, ignoreDuplicates: true`.

Trạng thái hiện tại: code đầy đủ nhưng panel báo lỗi "Missing required env" do em chưa có `GOOGLE_PLACES_API_KEY`. Google Cloud Billing reject thẻ với mã `OR_BACR2_31` — lỗi phía Google không phải bank, đốt thời gian fix billing không hiệu quả cho deadline 7 ngày. PRD Definition of Done có Note **chính thức cho phép** dùng sample data thay thế: _"Nếu việc lấy dữ liệu review khó khăn thì có thể bỏ qua và tạo sample data trong DB."_ Em chọn cách này. Khi nào key sẵn sàng, chỉ cần set vào `.env.local` là panel REAL hoạt động, không phải đổi code.

### MANUAL — Paste review thủ công (viền tím)

Form gồm 4 field:
- **Tên người review** (optional, default `Khách`, max 100 ký tự)
- **Rating** select 1–5 sao (default 5)
- **Nguồn** (optional, vd tên khách sạn user đang xem trên Maps, max 200 ký tự)
- **Nội dung review** (textarea, min 10 max 4000 ký tự — mirror giới hạn của Google Maps)

Use case: em đang xem review của 1 khách sạn trên Google Maps trong browser, thấy 1 review tệ muốn xử lý ngay → chỉ cần copy text, paste vào panel này, kèm rating + tên khách sạn → review xuất hiện ngay trong list với badge tím `MANUAL` → bấm Generate AI → Approve. **Không gọi bất kỳ API ngoài nào** (không Google, không scrape), không vi phạm ToS — em đang xử lý content em đang xem.

Vì sao đây là path quan trọng: đây là cách **lấy được review thật** mà không phụ thuộc Google Cloud Billing. Recruiter mở demo có thể paste review thật của 1 hotel bất kỳ vào, AI xử lý content thật → khác hẳn cảm giác "demo data fake". Field `source` được prepend vào comment dạng `[Nguồn: Khách sạn ABC]\n{nội dung}` để hiển thị inline mà không cần thêm column DB.

### Quy về cùng pipeline

3 đường nạp khác nhau nhưng **insert vào cùng 1 bảng `reviews`** với cùng schema. Từ điểm đó trở đi (Generate AI, Approve) là cùng 1 code path, cùng 1 component `ReplyPicker`. Đây là pattern **strategy** ở tầng ingest — DP-01 chỉ là 1 case của data ingestion, không phải định nghĩa toàn bộ data layer.

## PRD coverage

**Definition of Done.** Source code trên GitHub với commit theo convention `feat / fix / chore / docs` rõ ràng từng tính năng. Luồng end-to-end (nạp sample → Generate AI → chọn reply → Approve → status đổi sang resolved) đã chạy được trên local, build pass. Deploy Vercel đang để cuối — sau khi có URL sẽ cập nhật vào đầu README. Đang trong 7 ngày lịch (start 2026-05-19, deadline 2026-05-26).

**Epic 1 — Data Pipeline / DP-01.** Mở rộng từ "1 ô input Place ID" thành **3 đường nạp** (TEST / REAL / MANUAL) chạy song song. Panel REAL giữ nguyên acceptance criteria gốc: Places API (New) `GET /v1/places/{placeId}` với `X-Goog-FieldMask: id,displayName,formattedAddress,reviews`, `.slice(0, 5)`, upsert với `onConflict: google_review_id, ignoreDuplicates: true`. Panel TEST dùng sample data theo escape clause của PRD. Panel MANUAL nhận paste tay từ user (cho case real reviews không fetch được). Cả 3 đều insert vào cùng bảng `reviews` và được xử lý đồng nhất ở các step sau.

**Epic 2 — AI Engine / AI-01.** Mỗi review pending có nút "Generate AI" trong ReplyPicker. Backend gọi Gemini 2.5 Flash với `responseSchema` ép shape `{ standard, friendly, apologetic }`, `temperature: 0.7`. AbortSignal timeout 15s. Verified live với smoke request — response time đo được khoảng 2–4 giây, dưới ngưỡng <5s của PRD.

**Epic 3 — Dashboard / UI-01.** Một dashboard duy nhất hiện toàn bộ review thứ tự `created_at desc`, kèm 3 panel ingest ở trên. Mỗi review có badge status `Pending` (amber) hoặc `Resolved` (emerald), thêm badge nguồn `TEST` / `REAL` / `MANUAL` (amber / sky / violet) để phân biệt review đến từ đâu. Header có counter tổng + breakdown pending vs resolved.

**Epic 3 — Dashboard / UI-02.** Sau khi Generate, ba reply hiện ra dạng 3 card có thể click chọn — card được chọn có ring đậm. Nút Approve disabled cho đến khi chọn. Approve POST `/api/reviews/[id]/approve` với `{ tone, reply }`, backend update status với guard `.eq('status', 'pending')`. Có nút Regenerate để gọi lại Gemini nếu không hài lòng. Không đẩy reply lên Google Maps (đúng AC).

## Quyết định kỹ thuật khác đáng note

Không implement authentication vì PRD chỉ nói "1 dashboard duy nhất" không có user accounts. Đây là assumption đã viết rõ trong phần Assumptions phía dưới.

Folder `lib/ai/` thay vì `lib/gemini/` để provider-neutral — nếu sau này muốn swap sang Claude hoặc OpenAI thì chỉ đổi `lib/ai/index.ts`, các tầng khác không động đến (prompts.ts hoàn toàn provider-agnostic, route handler chỉ import `generateReplies` từ `@/lib/ai`).

Server Component đọc Supabase trực tiếp ở `page.tsx` thay vì gọi qua API route — vì SSR và data không cần serialize qua HTTP layer. Mutation thì bắt buộc qua API route vì cần xài service_role key (chỉ tồn tại server-side).

Sample mode không sinh row mới mỗi lần bấm: dùng Place ID cố định `ChIJN1t_tDeuEmsRUsoyG83frY4` rồi upsert. User bấm nhiều lần chỉ refresh dữ liệu, không spam DB.

Chấp nhận warning của Next.js về "multiple lockfiles detected" — có một `package-lock.json` ở `C:\Users\Asus\` (rác do trước đó chạy `npm install` ngoài project). Không fix vì không ảnh hưởng build, chỉ cleanup local sau MVP.

## Assumptions

Để tránh ambiguity, các giả định đã đưa ra trong quá trình implement:

1. MVP 0 public, không cần authentication.
2. Một user duy nhất, không phân quyền owner / staff.
3. Review chính ở tiếng Việt; AI prompt yêu cầu match ngôn ngữ của review nên review tiếng Anh vẫn được reply tiếng Anh.
4. Không cần i18n cho UI dashboard.
5. Recruiter test trên Chrome / Edge / Safari hiện đại, không support IE.

## Nếu có thêm thời gian

Auth + multi-tenant với RLS theo `tenant_id`. Webhook Google Business Profile để fetch realtime thay vì manual. Approve thật sự đẩy reply lên Google (cần Google Business Profile API verification, ngoài scope MVP 0). Cho phép user edit reply trước khi Approve thay vì bắt buộc chọn 1 trong 3. Sentiment trend dashboard. E2E test Playwright cho golden path Fetch → Generate → Approve.

## License

Private — bài test cho UCTalent Labs.
