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
      "Đạo diễn hình ảnh & dựng phim. Phim thương hiệu, MV và phim tài liệu — tôi kể chuyện bằng hình ảnh, từ quay đến dựng.",
      "Sống tại Paris · Nhận dự án tại Pháp và quốc tế.",
      "(Văn bản mẫu — sẽ được thay bằng tiểu sử thật.)",
    ],
  },
  contact: {
    label: "Liên hệ",
    title: "Cùng hợp tác nhé?",
    links: {
      email: "Email",
      instagram: "Instagram",
      vimeo: "Vimeo",
    },
    note: "(Thông tin mẫu — sẽ được thay.)",
  },
};

export default vi;
