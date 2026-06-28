import type { Dictionary } from "./en";

// Vietnamese dictionary. Must satisfy the `Dictionary` type (same shape as en).
const vi: Dictionary = {
  seo: {
    title: "Minh Dang — Đạo diễn, Quay phim & Dựng phim | Phim thương hiệu & Fashion Film",
    description:
      "Minh Dang — đạo diễn, quay phim và dựng phim tại Việt Nam, nhận dự án quốc tế. Phim thương hiệu, TVC quảng cáo và fashion film.",
    keywords: [
      "Minh Dang",
      "đạo diễn Việt Nam",
      "quay phim",
      "dựng phim",
      "đạo diễn hình ảnh",
      "phim thương hiệu",
      "TVC",
      "quảng cáo",
      "fashion film",
      "Việt Nam",
      "quốc tế",
    ],
  },
  nav: {
    about: "Giới thiệu",
    contact: "Liên hệ",
    home: "Trang chủ",
  },
  about: {
    label: "Giới thiệu",
    title: "Minh Dang",
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
