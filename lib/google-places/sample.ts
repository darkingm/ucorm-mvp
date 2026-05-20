import type { GooglePlace } from './index';

const day = 86_400_000;

export const SAMPLE_PLACE: GooglePlace = {
  id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  displayName: { text: 'Khách sạn Hoa Sen Sài Gòn (sample)', languageCode: 'vi' },
  formattedAddress: '123 Nguyễn Huệ, Quận 1, TP.HCM',
  reviews: [
    {
      name: 'places/sample/reviews/rev_001',
      publishTime: new Date(Date.now() - 2 * day).toISOString(),
      rating: 5,
      text: { text: 'Phòng sạch, nhân viên thân thiện, view đẹp. Sẽ quay lại lần sau!', languageCode: 'vi' },
      authorAttribution: { displayName: 'Nguyễn Minh Anh' },
    },
    {
      name: 'places/sample/reviews/rev_002',
      publishTime: new Date(Date.now() - 4 * day).toISOString(),
      rating: 2,
      text: { text: 'Phòng có mùi ẩm mốc, điều hoà kêu to. Khá thất vọng so với giá tiền.', languageCode: 'vi' },
      authorAttribution: { displayName: 'Trần Văn Hùng' },
    },
    {
      name: 'places/sample/reviews/rev_003',
      publishTime: new Date(Date.now() - 6 * day).toISOString(),
      rating: 4,
      text: { text: 'Vị trí trung tâm, bữa sáng ngon. Tổng thể ổn.', languageCode: 'vi' },
      authorAttribution: { displayName: 'Lê Thị Hương' },
    },
    {
      name: 'places/sample/reviews/rev_004',
      publishTime: new Date(Date.now() - 1 * day).toISOString(),
      rating: 1,
      text: { text: 'Check-in trễ 1 tiếng, phòng nâng cấp sai loại, yêu cầu đổi bị từ chối. Rất tệ.', languageCode: 'vi' },
      authorAttribution: { displayName: 'Phạm Quốc Bảo' },
    },
    {
      name: 'places/sample/reviews/rev_005',
      publishTime: new Date(Date.now() - 8 * day).toISOString(),
      rating: 5,
      text: { text: 'Lần thứ 3 ở đây, vẫn rất hài lòng. Cảm ơn team đã chuẩn bị bánh sinh nhật bất ngờ!', languageCode: 'vi' },
      authorAttribution: { displayName: 'Đỗ Mai Lan' },
    },
  ],
};
