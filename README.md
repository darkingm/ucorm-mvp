# UCOrm — AI-Powered Online Reputation Management

MVP 0 (Proof of Concept) thực hiện trong 7 ngày cho UCTalent Labs. Nền tảng giúp khách sạn / F&B quản trị review Google Maps bằng AI: tự fetch review, AI sinh 3 phương án trả lời theo 3 tone khác nhau, người dùng đọc và Approve trên một dashboard duy nhất. Không đẩy reply ngược lên Google Maps (đúng acceptance criteria của UI-02).

Live demo: _(sẽ cập nhật sau khi deploy Vercel)_
Demo video: _(sẽ thêm link Loom ~2 phút)_
Author: kien4941@gmail.com

## Bài toán

Một khách sạn cỡ trung bình nhận hàng trăm Google Maps reviews mỗi tháng. Nhân viên không có thời gian trả lời từng cái, dẫn đến rating tổng thể bị bào mòn, review tiêu cực không được xử lý kịp, và tone trả lời không nhất quán giữa các nhân viên. UCOrm rút bài toán này về một thao tác duy nhất: con người chỉ đọc 3 phương án mà AI viết sẵn rồi bấm chọn — thời gian xử lý một review giảm từ khoảng 5 phút (đọc, suy nghĩ, gõ) xuống khoảng 15 giây (đọc, chọn).

## Luồng cốt lõi

```
[Nhập Place ID / Maps URL]  →  [Fetch reviews]  →  [Lưu Supabase]
                                                          │
                                                          ▼
[status = "resolved"]  ←  [Approve 1 reply]  ←  [Generate AI: 3 tone]
```

Một dashboard duy nhất hiện toàn bộ review. Mỗi review có nút "Generate AI" gọi Gemini để sinh 3 reply (Tiêu chuẩn / Thân thiện / Khắc phục lỗi). User chọn 1 reply rồi bấm Approve — status chuyển từ `pending` sang `resolved` trong database, audit-trail (tone đã chọn, thời điểm) lưu lại.

## Tech stack & lý do chọn

**Next.js 16 App Router với TypeScript.** Toàn bộ MVP nằm trong một codebase: trang dashboard là Server Component đọc Supabase trực tiếp, các thao tác có side-effect (fetch Google Maps, gọi AI, approve) đi qua Route Handler trong `app/api/`. Lựa chọn này có 3 lợi ích cụ thể cho bài 7 ngày: (1) giấu được tất cả API key ở server-side, (2) không phải bảo trì hai dự án FE/BE riêng, (3) Vercel native-support nên DoD "deploy lên Vercel" hoàn thành chỉ với một lần connect repo. TypeScript thì để bắt sai contract giữa API ↔ component ↔ DB schema ngay lúc build thay vì runtime, đặc biệt giá trị khi tốc độ iterate cao.

**Supabase (PostgreSQL) thay vì Firebase.** Dữ liệu của bài này có quan hệ rõ một-nhiều: một Place có nhiều Review. Trên Postgres, ràng buộc `foreign key`, `unique`, `check` thực thi ở DB layer; trên Firestore phải tự validate ở application layer và dễ rò. Cụ thể `reviews.google_review_id unique` chống fetch trùng khi user bấm Fetch nhiều lần, `rating between 1 and 5` và `status in ('pending','resolved')` chặn data rác ngay tại nguồn. Ngoài ra Supabase free tier rộng (500MB DB, 5GB bandwidth, không sleep) và có JS SDK kèm Row-Level Security sẵn dùng — schema chỉ cần một migration SQL ngắn là chạy.

**Gemini 2.5 Flash thay vì OpenAI GPT-4o-mini.** PRD cho phép cả hai. Chọn Gemini vì AI Studio cấp free API key không cần setup billing (15 RPM free tier — đủ cho demo), trong khi OpenAI bắt buộc nạp $5 tối thiểu mới gọi được. Về chất lượng cho task này (sinh 3 đoạn ngắn tiếng Việt theo template), hai model tương đương. Gemini có `responseMimeType: "application/json"` kèm `responseSchema` ép output đúng shape `{ standard, friendly, apologetic }` ở model level, mạnh hơn `response_format: json_object` của OpenAI vốn chỉ guarantee là JSON hợp lệ nhưng không guarantee shape. Mình gọi REST endpoint trực tiếp thay vì cài SDK `@google/generative-ai` để giảm số package phải audit.

**Tailwind CSS v4 thay vì shadcn/ui hoặc Material-UI.** Mức độ UI MVP này (form, list card, button) không đủ phức tạp để cần component library. Tailwind utility classes inline trong JSX cho phép iterate UI nhanh và recruiter đọc một file là hiểu component render thế nào, không phải nhảy qua nhiều file `*.module.css` hoặc `theme.ts`.

**Zod cho validation.** Validate body request (`/api/places/fetch` chấp nhận Place ID hoặc Maps URL), parse output của AI (`{ standard, friendly, apologetic }` với min/max length), parse body của approve route (tone phải thuộc enum cố định). Fail fast và message lỗi rõ ràng tới client thay vì lỗi 500 mơ hồ.

**Vercel deploy.** Yêu cầu của PRD. Connect GitHub là tự build và preview deploy mỗi push.

## Kiến trúc & file layout

```
app/
├── api/
│   ├── places/fetch/route.ts             POST: nhận mode + input, resolve URL, fetch, upsert
│   ├── reviews/[id]/generate/route.ts    POST: gọi Gemini, validate JSON, lưu ai_replies
│   └── reviews/[id]/approve/route.ts     POST: race-safe update status='resolved'
├── components/
│   ├── SampleFetchPanel.tsx              Test panel: 1 nút nạp sample, không gọi network
│   ├── PlaceIdForm.tsx                   Real panel: Place ID hoặc Maps URL → Fetch
│   ├── ReviewCard.tsx                    Render 1 review + SourceBadge + slot ReplyPicker
│   └── ReplyPicker.tsx                   Generate AI → 3 card → Approve
├── layout.tsx
└── page.tsx                              Dashboard SSR
lib/
├── env.ts                                Lazy + fail-fast accessor cho process.env
├── types.ts                              Database<T> + ReviewWithPlace + AITone enum
├── supabase/{server,browser}.ts          2 client: service_role (server) vs anon (client)
├── google-places/index.ts                Places API (New) GET /v1/places/{id}
├── google-places/resolve.ts              URL/short-link/raw-ID → Place ID
├── google-places/sample.ts               5 review mẫu tiếng Việt rating 1–5
└── ai/index.ts                           Gemini wrapper với responseSchema enforcement
└── ai/prompts.ts                         System prompt + buildUserPrompt
supabase/
├── migrations/0001_init.sql              2 bảng + indexes + RLS enable
└── seeds/sample.sql                      Insert seed cho dev không cần fetch
```

Dashboard chia làm hai panel song song. Panel TEST gọi backend với `{ mode: "sample" }` — backend bỏ qua resolver và Google API, dùng object `SAMPLE_PLACE` cố định ở `lib/google-places/sample.ts`. Panel REAL gọi backend với `{ mode: "real", input }` — backend chạy resolver rồi gọi Places API (New). Cách chia này có hai lợi ích: (1) demo end-to-end được kể cả khi chưa có Google Places API key (PRD chính thức cho phép qua escape clause trong Note của Definition of Done), (2) khi key Places sẵn sàng thì panel REAL hoạt động ngay không cần đổi code. ReviewCard render một badge `TEST` hay `REAL` cạnh badge status, detect bằng prefix `google_review_id` (sample data dùng prefix `places/sample/`).

## URL → Place ID resolver

PRD AC ghi "nhập Place ID", nhưng người thật khi share Google Maps đa số copy link chứ không copy Place ID. `lib/google-places/resolve.ts` chấp nhận 4 dạng input:

1. **Place ID thô** (`ChIJN1t_tDeuEmsRUsoyG83frY4`): detect bằng regex base64url-style không chứa `://`, return as-is.
2. **Short link** (`maps.app.goo.gl/...`, `goo.gl/maps/...`, `g.page/...`): server-side `fetch` với `redirect: "follow"`, đọc `response.url` ra URL dài. Whitelist hostname trước khi follow để tránh SSRF qua URL người dùng paste.
3. **URL dài chứa `place_id=` hoặc chuỗi `ChIJ...`**: regex extract trực tiếp.
4. **URL dài kiểu "share place"** (`/maps/place/Tên+Khách+sạn/@lat,lng,17z/data=!4m...!1s0xHEX:0xHEX`): URL này không chứa Place ID thật mà chỉ có FTID. Fallback gọi `places:searchText` với `textQuery` là tên đã decode và `locationBias` lấy từ `lat,lng` trong URL — lấy place đầu tiên trả về.

Tất cả request gắn `AbortSignal.timeout(10_000)` để không treo client. Lỗi resolve trả 400 với message rõ ràng để user biết paste lại.

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

## Test mode vs Real mode

Khi mở dashboard, hai panel song song trên cùng. Panel bên trái (TEST, viền vàng) chỉ có một nút "Nạp 5 review mẫu" — bấm là backend upsert một place cố định kèm 5 review tiếng Việt rating từ 1 đến 5 (mix tích cực và tiêu cực để demo đủ 3 tone reply). Re-bấm idempotent. Panel bên phải (REAL, viền xanh) có ô input nhận Place ID hoặc bất kỳ link Google Maps nào — backend resolve về Place ID rồi gọi Places API (New).

Lý do chia đôi: PRD note rõ "nếu việc lấy dữ liệu review khó khăn thì có thể bỏ qua và tạo sample data trong DB". Khi link credit card vào Google Cloud Billing trả `OR_BACR2_31` (lỗi reject phía Google không phải bank), việc tiếp tục đốt thời gian setup billing không hiệu quả cho deadline 7 ngày. Code Places API vẫn implement đầy đủ — chỉ thiếu key. Set `GOOGLE_PLACES_API_KEY` vào `.env.local` là panel REAL hoạt động.

## PRD coverage

**Definition of Done.** Source code trên GitHub với commit theo convention `feat / fix / chore / docs` rõ ràng từng tính năng. Luồng end-to-end (nạp sample → Generate AI → chọn reply → Approve → status đổi sang resolved) đã chạy được trên local, build pass. Deploy Vercel đang để cuối — sau khi có URL sẽ cập nhật vào đầu README. Đang trong 7 ngày lịch (start 2026-05-19, deadline 2026-05-26).

**Epic 1 — Data Pipeline / DP-01.** Có ô nhập + nút Fetch trong Real panel. Backend gọi Places API (New) `GET /v1/places/{placeId}` với `X-Goog-FieldMask: id,displayName,formattedAddress,reviews` (chỉ xin field cần thiết, giảm cost / latency), `.slice(0, 5)` đúng yêu cầu lấy 5 review mới nhất, upsert vào DB với `onConflict: google_review_id, ignoreDuplicates: true` chống trùng khi fetch lại. Sample mode bypass toàn bộ tầng network.

**Epic 2 — AI Engine / AI-01.** Mỗi review pending có nút "Generate AI" trong ReplyPicker. Backend gọi Gemini 2.5 Flash với `responseSchema` ép shape `{ standard, friendly, apologetic }`, `temperature: 0.7`. AbortSignal timeout 15s. Verified live với smoke request — response time đo được khoảng 2–4 giây, dưới ngưỡng <5s của PRD.

**Epic 3 — Dashboard / UI-01.** Một dashboard duy nhất hiện toàn bộ review thứ tự `created_at desc`. Mỗi review có badge status `Pending` (amber) hoặc `Resolved` (emerald), thêm badge `TEST` / `REAL` để phân biệt nguồn. Header có counter tổng + breakdown pending vs resolved.

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
