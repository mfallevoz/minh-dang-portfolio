import type { Dictionary } from "./en";

// Vietnamese dictionary. Must satisfy the `Dictionary` type (same shape as en).
const vi: Dictionary = {
  nav: {
    about: "Giới thiệu",
    contact: "Liên hệ",
    home: "Trang chủ",
  },
  about: {
    label: "Giới thiệu",
    body: [
      "Đạo diễn hình ảnh & dựng phim. Fashion film, MV và TVC — tôi kể chuyện bằng hình ảnh, từ ý tưởng đến thành phẩm.",
      "Hoạt động tại Sài Gòn · Nhận dự án toàn cầu.",
    ],
  },
  contact: {
    label: "Liên hệ",
    title: "Cùng hợp tác nhé?",
    links: {
      email: "Email",
      instagram: "Instagram",
      zalo: "Zalo",
    },
  },
};

export default vi;
