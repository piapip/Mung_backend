const INTENT = [
  {
    // #0
    name: "Cấp lại mật khẩu",
    slot: ["digital_bank"],
  },
  {
    // #1
    name: "Chương trình ưu đãi",
    slot: ["card_type"],
  },
  {
    // #2
    name: "Điều kiện vay vốn",
    slot: ["loan_purpose", "loan_type"],
  },
  {
    // #3
    name: "Điểm đặt ATM",
    slot: ["city", "district"],
  },
  {
    // #4
    name: "Điểm giao dịch",
    slot: ["city", "district"],
  },
  {
    // #5
    name: "Hồ sơ phát hành thẻ",
    slot: ["card_type", "card_usage"],
  },
  {
    // #6
    name: "Hồ sơ vay vốn",
    slot: ["loan_purpose", "loan_type"],
  },
  {
    // #7
    name: "Hủy chi tiêu thẻ",
    slot: ["name", "cmnd", "four_last_digits"],
  },
  {
    // #8
    name: "Hướng dẫn mở thẻ",
    slot: ["card_activation_type"],
  },
  {
    // #9
    name: "Khái niệm sản phẩm",
    slot: ["card_type", "card_usage"],
  },
  {
    // #10
    name: "Kích hoạt thẻ tự động",
    slot: ["name", "cmnd", "four_last_digits"],
  },
  {
    // #11
    name: "Khóa thẻ khẩn cấp",
    slot: ["name", "cmnd", "four_last_digits"],
  },
  {
    // #12
    name: "Kích hoạt chi tiêu thẻ",
    slot: ["name", "cmnd", "four_last_digits"],
  },
  {
    // #13
    name: "Phí chuyển tiền",
    slot: ["digital_bank"],
  },
  {
    // #14
    name: "Phương thức hủy dịch vụ Ngân hàng điện tử",
    slot: ["digital_bank"],
  },
  {
    // #15
    name: "Tính năng dịch vụ Ngân hàng điện tử",
    slot: ["digital_bank"],
  },
  {
    // #16
    name: "Tra cứu số dư",
    slot: ["name", "cmnd", "four_last_digits"],
  },
  {
    // #17
    name: "Thay đổi hạn mức chi tiêu thẻ",
    slot: ["name", "cmnd", "four_last_digits"],
  },
];

const SLOT_LABEL = [
  {
    name: "Ý định",
    tag: "intent",
  },
  {
    name: "Ý định",
    tag: "generic_intent",
  },
  {
    name: "Mục đích cho vay",
    tag: "LOAN_PURPOSE",
  },
  {
    name: "Hình thức cho vay",
    tag: "LOAN_TYPE",
  },
  {
    name: "Nhóm thẻ",
    tag: "CARD_TYPE",
  },
  {
    name: "Hình thức thẻ",
    tag: "CARD_USAGE",
  },
  {
    name: "Ngân hàng điện tử",
    tag: "DIGITAL_BANK",
  },
  {
    name: "Tính chất mở",
    tag: "CARD_ACTIVATION_TYPE",
  },
  {
    name: "Quận",
    tag: "DISTRICT",
  },
  {
    name: "Tỉnh thành",
    tag: "CITY",
  },
  {
    name: "Họ và tên",
    tag: "NAME",
  },
  {
    name: "CMND",
    tag: "CMND",
  },
  {
    name: "4 số cuối tài khoản",
    tag: "FOUR_LAST_DIGITS",
  },
];

const LOAN_PURPOSE = [
  {
    name: "Vay mua xe",
    tag: "vay_mua_xe",
    hint: "mua xe, mua ô tô, mua xe ô tô",
  },
  {
    name: "Vay mua bất động sản",
    tag: "vay_mua_bds",
    hint: "mua nhà, mua văn hộ, mua chung cư, mua nhà đất, mua bất động sản",
  },
  {
    name: "Vay kinh doanh",
    tag: "vay_kinh_doanh",
    hint: "kinh doanh, làm ăn",
  },
  {
    name: "Vay tiêu dùng",
    tag: "vay_tieu_dung",
    hint: "tiêu dùng",
  },
];

const LOAN_TYPE = [
  {
    name: "Vay thế chấp",
    tag: "vay_the_chap",
    hint: "thế chấp, có tài sản đảm bảo",
  },
  {
    name: "Vay tín chấp",
    tag: "vay_tin_chap",
    hint: "tín chấp, không tài sản đảm bảo",
  },
  {
    name: "Vay cầm cố giấy tờ có giá",
    tag: "vay_cam_co_GTCG",
    hint: "cầm cố giấy tờ có giá, có giấy tờ có giá",
  },
];

const CARD_TYPE = [
  {
    name: "Quốc tế",
    tag: "quoc_te",
    hint: "quốc tế, nước ngoài",
  },
  {
    name: "Nội địa",
    tag: "noi_dia",
    hint: "nội địa, trong nước",
  },
  {
    name: "Mastercard",
    tag: "master",
    hint: "master card, master, master quốc tế, quốc tế mastercard",
  },
  {
    name: "Visa",
    tag: "visa",
    hint: "visa, visa card, visa quốc tế, quốc tế visa, visa card quốc tế",
  },
  {
    name: "Amex",
    tag: "amex",
    hint: "amex, american express, amex quốc tế",
  },
  {
    name: "JCB",
    tag: "jcb",
    hint: "jcb, quốc tế jcb, jcb quốc tế",
  },
  {
    name: "UnionPay",
    tag: "unionpay",
    hint: "unionpay, quốc tế union pay, union pay quốc tế",
  },
];

const CARD_USAGE = [
  {
    name: "Ghi nợ",
    tag: "ghi_no",
    hint: "ghi nợ, debit",
  },
  {
    name: "Tín dụng",
    tag: "tin_dung",
    hint: "tín dụng, credit",
  },
];

const DIGITAL_BANK = [
  {
    name: "SMS Banking",
    tag: "SMS Banking",
    hint: "sms banking, sms",
  },
  {
    name: "Internet Banking",
    tag: "Internet Banking",
    hint: "ibanking, internet banking, eb, ib",
  },
  {
    name: "Mobile Banking",
    tag: "Mobile Banking",
    hint: "mobile banking, MB",
  },
  {
    name: "VCBPAY",
    tag: "VCBPAY",
    hint: "VCBPay, VCB Pay",
  },
];

const CARD_ACTIVATION_TYPE = [
  {
    name: "Mở mới",
    tag: "mo_moi",
    hint: "mở mới, lần đầu, mở thẻ mới, làm thẻ mới, phát hành mới",
  },
  {
    name: "Cấp lại",
    tag: "cap_lai",
    hint: "cấp lại, làm lại, phát lại, mở lại, phát hành lại",
  },
];

const CITY = [
  'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
];

const DISTRICT = {
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Tây Hồ', 'Cầu Giấy', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Bắc Từ Liêm', 'Thanh Trì', 'Gia Lâm', 'Đông Anh', 'Sóc Sơn', 'Hà Đông', 'Sơn Tây', 'Ba Vì', 'Phúc Thọ', 'Thạch Thất', 'Quốc Oai', 'Chương Mỹ', 'Đan Phượng', 'Hoài Đức', 'Thanh Oai', 'Mỹ Đức', 'Ứng Hòa', 'Thường Tín', 'Phú Xuyên', 'Mê Linh', 'Nam Từ Liêm'],
  'Hồ Chí Minh': ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Bình Thạnh', 'Phú Nhuận', 'Thủ Đức', 'Bình Tân', 'Bình Chánh', 'Củ Chi', 'Hóc Môn', 'Nhà Bè', 'Cần Giờ'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Hòa Vang', 'Cẩm Lệ', 'Hoàng Sa'],
  'Hải Phòng': ['Hồng Bàng', 'Lê Chân', 'Ngô Quyền', 'Kiến An', 'Hải An', 'Đồ Sơn', 'An Lão', 'Kiến Thụy', 'Thủy Nguyên', 'An Dương', 'Tiên Lãng', 'Vĩnh Bảo', 'Cát Hải', 'Bạch Long Vĩ', 'Dương Kinh'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Phong Điền', 'Cờ Đỏ', 'Vĩnh Thạnh', 'Thốt Nốt', 'Thới Lai'],
};

const GENERIC_INTENT = [
  "Chào hỏi",
  "Bot làm được gì?",
  "Khen",
  "Chê",
  "Tạm biệt",
  "Câu hỏi thông thường khác",
]

module.exports = {
  INTENT,
  SLOT_LABEL,
  LOAN_PURPOSE,
  LOAN_TYPE,
  CARD_TYPE,
  CARD_USAGE,
  DIGITAL_BANK,
  CARD_ACTIVATION_TYPE,
  CITY,
  DISTRICT,
  GENERIC_INTENT,
}
