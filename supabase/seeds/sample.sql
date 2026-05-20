-- UCOrm MVP 0 — sample data
-- Chạy SAU khi đã chạy migrations/0001_init.sql.
-- Mục đích: dev được kể cả khi Google Places API hết quota hoặc chưa setup.
-- Re-run an toàn: dùng ON CONFLICT để skip nếu đã tồn tại.

-- ============================================================
-- 1 place mẫu
-- ============================================================
insert into places (place_id, name, address)
values (
  'ChIJN1t_tDeuEmsRUsoyG83frY4',   -- Place ID giả demo
  'Khách sạn Hoa Sen Sài Gòn',
  '123 Nguyễn Huệ, Quận 1, TP.HCM'
)
on conflict (place_id) do nothing;

-- ============================================================
-- 5 reviews mẫu (đa dạng rating + nội dung)
-- ============================================================
with p as (
  select id from places where place_id = 'ChIJN1t_tDeuEmsRUsoyG83frY4'
)
insert into reviews (
  place_id, google_review_id, author_name, rating, comment, review_time, status
)
select p.id, sample.google_review_id, sample.author_name, sample.rating,
       sample.comment, sample.review_time, 'pending'
from p, (values
  (
    'rev_sample_001',
    'Nguyễn Minh Anh',
    5,
    'Phòng sạch, nhân viên thân thiện, view đẹp. Sẽ quay lại lần sau!',
    now() - interval '2 days'
  ),
  (
    'rev_sample_002',
    'Trần Văn Hùng',
    2,
    'Phòng có mùi ẩm mốc, điều hoà kêu to. Nhân viên lễ tân không nhiệt tình. Khá thất vọng so với giá tiền.',
    now() - interval '4 days'
  ),
  (
    'rev_sample_003',
    'Lê Thị Hương',
    4,
    'Vị trí trung tâm, dễ đi lại. Bữa sáng buffet ngon nhưng hơi ít món. Tổng thể ổn.',
    now() - interval '6 days'
  ),
  (
    'rev_sample_004',
    'Phạm Quốc Bảo',
    1,
    'Check-in trễ hơn 1 tiếng dù đã đặt trước. Phòng được nâng cấp sai loại. Yêu cầu đổi nhưng bị từ chối. Rất tệ.',
    now() - interval '1 day'
  ),
  (
    'rev_sample_005',
    'Đỗ Mai Lan',
    5,
    'Lần thứ 3 ở đây rồi, vẫn rất hài lòng. Cảm ơn team đã chuẩn bị bánh sinh nhật bất ngờ cho mình!',
    now() - interval '8 days'
  )
) as sample(google_review_id, author_name, rating, comment, review_time)
on conflict (google_review_id) do nothing;
