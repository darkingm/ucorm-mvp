import type { GooglePlace } from './index';

const day = 86_400_000;

// 5 review mẫu mô phỏng phong cách thật của Google Maps Việt Nam:
//   - Đa dạng độ dài (1 câu cộc lốc → đoạn dài kể chi tiết).
//   - Mix register (chính thống có dấu / casual không dấu / có CAPS rant).
//   - Trải đều rating 1–5 để AI sinh đủ 3 tone (positive/mixed/negative).
//   - review_time phân bố trong 2 tuần gần đây, sort theo thời gian gần nhất trước.
//
// Không gắn vào khách sạn thật để tránh vấn đề đạo đức / pháp lý.
export const SAMPLE_PLACE: GooglePlace = {
  id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  displayName: { text: 'Khách sạn Hoa Sen Sài Gòn (sample)', languageCode: 'vi' },
  formattedAddress: '123 Nguyễn Huệ, Quận 1, TP.HCM',
  reviews: [
    {
      name: 'places/sample/reviews/rev_001',
      publishTime: new Date(Date.now() - 1 * day).toISOString(),
      rating: 5,
      text: {
        text: 'Lần thứ 3 ở đây rồi, vẫn rất hài lòng. Nhân viên lễ tân (anh Phong ca chiều) nhớ tên khách quen, check-in nhanh, có chuẩn bị bánh sinh nhật bất ngờ cho mình. Bữa sáng buffet đầy đặn, đặc biệt phở bò ngon hơn nhiều khách sạn 5 sao mình từng ở. Phòng deluxe view sông, sạch sẽ, khăn tắm thơm. Sẽ giới thiệu cho đồng nghiệp.',
        languageCode: 'vi',
      },
      authorAttribution: { displayName: 'Đỗ Mai Lan' },
    },
    {
      name: 'places/sample/reviews/rev_002',
      publishTime: new Date(Date.now() - 2 * day).toISOString(),
      rating: 1,
      text: {
        text: 'CỰC KỲ THẤT VỌNG. Đặt phòng deluxe trên Booking, đến nơi nhân viên báo "hết phòng deluxe" và đẩy mình sang phòng tiêu chuẩn nhỏ hơn — KHÔNG GIẢM GIÁ, không lời xin lỗi tử tế. Phòng cũ, máy lạnh kêu cả đêm không ngủ được. Yêu cầu đổi phòng bị từ chối thẳng thừng. Đây là lần cuối tôi đặt khách sạn này.',
        languageCode: 'vi',
      },
      authorAttribution: { displayName: 'Phạm Quốc Bảo' },
    },
    {
      name: 'places/sample/reviews/rev_003',
      publishTime: new Date(Date.now() - 4 * day).toISOString(),
      rating: 4,
      text: {
        text: 'vi tri trung tam, di bo ra cho Ben Thanh 5 phut. phong ok, sach. buffet sang ngon nhung hoi it mon cho khach nuoc ngoai. 1 diem tru la wifi tang 8 yeu, phai dung 4G. tong the 4 sao.',
        languageCode: 'vi',
      },
      authorAttribution: { displayName: 'Lê Thị Hương' },
    },
    {
      name: 'places/sample/reviews/rev_004',
      publishTime: new Date(Date.now() - 7 * day).toISOString(),
      rating: 2,
      text: {
        text: 'Phòng có mùi ẩm mốc rõ, mình bị viêm xoang nên cả đêm hắt hơi không ngủ được. Báo lễ tân thì được đổi phòng nhưng phòng mới cũng tương tự. Có vẻ hệ thống thông gió cả tầng có vấn đề. Bữa sáng ổn nhưng giá phòng tầm này thì kỳ vọng cao hơn.',
        languageCode: 'vi',
      },
      authorAttribution: { displayName: 'Trần Văn Hùng' },
    },
    {
      name: 'places/sample/reviews/rev_005',
      publishTime: new Date(Date.now() - 12 * day).toISOString(),
      rating: 3,
      text: { text: 'Tạm ổn. Không có gì nổi bật. Lần sau chắc tìm chỗ khác.', languageCode: 'vi' },
      authorAttribution: { displayName: 'Nguyễn Minh Anh' },
    },
  ],
};
