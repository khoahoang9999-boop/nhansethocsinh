export const GRADE_LEVELS = {
  TH: ["1", "2", "3", "4", "5"],
  THCS: ["6", "7", "8", "9"],
  THPT: ["10", "11", "12"],
};

export const SUBJECTS_MAP = {
  TH: {
    1: [
      "Tiếng Việt",
      "Toán",
      "Đạo đức",
      "Tự nhiên và Xã hội",
      "Giáo dục thể chất",
      "Âm nhạc",
      "Mĩ thuật",
      "Hoạt động trải nghiệm",
    ],
    2: [
      "Tiếng Việt",
      "Toán",
      "Đạo đức",
      "Tự nhiên và Xã hội",
      "Giáo dục thể chất",
      "Âm nhạc",
      "Mĩ thuật",
      "Hoạt động trải nghiệm",
    ],
    3: [
      "Tiếng Việt",
      "Toán",
      "Đạo đức",
      "Tự nhiên và Xã hội",
      "Ngoại ngữ",
      "Tin học",
      "Công nghệ",
      "Giáo dục thể chất",
      "Âm nhạc",
      "Mĩ thuật",
      "Hoạt động trải nghiệm",
    ],
    4: [
      "Tiếng Việt",
      "Toán",
      "Đạo đức",
      "Khoa học",
      "Lịch sử và Địa lí",
      "Ngoại ngữ",
      "Tin học",
      "Công nghệ",
      "Giáo dục thể chất",
      "Âm nhạc",
      "Mĩ thuật",
      "Hoạt động trải nghiệm",
    ],
    5: [
      "Tiếng Việt",
      "Toán",
      "Đạo đức",
      "Khoa học",
      "Lịch sử và Địa lí",
      "Ngoại ngữ",
      "Tin học",
      "Công nghệ",
      "Giáo dục thể chất",
      "Âm nhạc",
      "Mĩ thuật",
      "Hoạt động trải nghiệm",
    ],
  },
  THCS: [
    "Ngữ văn",
    "Toán",
    "Ngoại ngữ",
    "Giáo dục công dân",
    "Lịch sử và Địa lí",
    "Khoa học tự nhiên",
    "Công nghệ",
    "Tin học",
    "Giáo dục thể chất",
    "Âm nhạc",
    "Mĩ thuật",
    "Nghệ thuật",
    "Hoạt động trải nghiệm",
    "Hoạt động trải nghiệm, hướng nghiệp",
    "Nội dung giáo dục địa phương",
  ],
  THPT: [
    "Ngữ văn",
    "Toán",
    "Ngoại ngữ",
    "Lịch sử",
    "Giáo dục thể chất",
    "Giáo dục QPAN",
    "Hoạt động trải nghiệm",
    "Hoạt động trải nghiệm, hướng nghiệp",
    "Nội dung giáo dục địa phương",
    "Địa lí",
    "Giáo dục kinh tế và pháp luật",
    "Vật lí",
    "Hóa học",
    "Sinh học",
    "Công nghệ",
    "Tin học",
    "Âm nhạc",
    "Mĩ thuật",
    "Nghệ thuật",
  ],
};

export const DGTX_TONG_HOP_SUBJECTS = [
  "Sổ tổng hợp - Môn học và HĐGD",
  "Sổ tổng hợp - Năng lực chung",
  "Sổ tổng hợp - Năng lực đặc thù",
  "Sổ tổng hợp - Phẩm chất chủ yếu"
];

export function getSubjects(capHoc, khoiLop) {
  if (capHoc === "TH") {
    return SUBJECTS_MAP.TH[khoiLop] || [];
  }
  return SUBJECTS_MAP[capHoc] || [];
}

export function getDGTXSubjects(capHoc, khoiLop) {
  const subs = getSubjects(capHoc, khoiLop);
  if (capHoc === "TH") {
    return [...subs, ...DGTX_TONG_HOP_SUBJECTS];
  }
  return subs;
}

export const EVAL_LEVELS = ["Tốt", "Khá", "Đạt", "Chưa Đạt"];
export const EVAL_LEVELS_TH = ["T", "H", "C"];
export const EVAL_LEVELS_TH_NLPC = ["Tốt", "Đạt", "Cần cố gắng"];
export const EVAL_LEVELS_DGTX = ["T", "H", "C"];

export const isPassFailSubject = (capHoc, subject) => {
  if (capHoc !== "THCS" && capHoc !== "THPT") return false;
  if (!subject) return false;
  const lowerSubj = subject.toLowerCase();
  if (lowerSubj.includes("thể chất")) return true;
  if (lowerSubj.includes("nghệ thuật")) return true;
  if (lowerSubj.includes("âm nhạc")) return true;
  if (lowerSubj.includes("mĩ thuật") || lowerSubj.includes("mỹ thuật")) return true;
  if ((lowerSubj.includes("địa phương") && lowerSubj.includes("nội dung")) || lowerSubj.includes("gdđp")) return true;
  if (lowerSubj.includes("hoạt động trải nghiệm") || lowerSubj.includes("hđtn")) return true;
  return false;
}

export const getEvalLevels = (capHoc, isNlPc = false, isDgtx = false, isVnedu = false, subject = null) => {
  if (isDgtx) return EVAL_LEVELS_DGTX;
  if (capHoc === "TH") {
    if (isVnedu && !isNlPc) return EVAL_LEVELS_DGTX;
    return isNlPc ? EVAL_LEVELS_TH_NLPC : EVAL_LEVELS_TH;
  }
  if (isPassFailSubject(capHoc, subject)) {
    return ["Đạt", "Chưa Đạt"];
  }
  return EVAL_LEVELS;
};


const MOCK_PREFIXES = {
  "Ngữ văn": ["Em có khả năng cảm thụ văn học rất tốt, ", "Biết cách diễn đạt ý tưởng trôi chảy, ", "Luôn đọc diễn cảm và hiểu sâu sắc tác phẩm, ", "Thường xuyên có những bài viết sáng tạo, ", "Nắm vững ngữ pháp và từ vựng phong phú, "],
  "Giáo dục công dân": ["Em nắm vững các bài học đạo đức pháp luật, ", "Luôn có ý thức chấp hành tốt quy định, ", "Thể hiện trách nhiệm cao trong các hoạt động, ", "Biết cách ứng xử chuẩn mực với mọi người, ", "Tích cực lan tỏa những giá trị đạo đức tốt đẹp, "],
  "Khoa học tự nhiên": ["Em nắm vững kiến thức tự nhiên, ", "Luôn tò mò và tích cực thực hành thí nghiệm, ", "Biết cách giải thích sự vật hiện tượng logic, ", "Có ý thức bảo vệ môi trường rất xuất sắc, ", "Thể hiện tư duy khoa học và óc quan sát tốt, "],
  "Nội dung giáo dục địa phương": ["Em hiểu rõ các giá trị truyền thống quê hương, ", "Biết cách giới thiệu di tích lịch sử địa phương, ", "Luôn tích cực tìm hiểu văn hóa vùng miền, ", "Thể hiện tình yêu thiên nhiên và con người nơi sinh sống, ", "Nắm vững các đặc điểm kinh tế - xã hội địa phương, "],
  "Tiếng Việt": ["Em đọc to rõ ràng, ", "Có ý thức luyện chữ tốt, ", "Em biết cách diễn đạt trôi chảy, ", "Luôn tích cực phát biểu, ", "Phát huy tốt khả năng nghe hiểu, "],
  "Toán": ["Em có tư duy số học nhạy bén, ", "Biết cách giải quyết bài toán nhanh, ", "Luôn làm bài tập toán đầy đủ, ", "Em nắm vững kiến thức hình học, ", "Có khả năng tính toán chính xác, "],
  "Đạo đức": ["Em luôn ngoan ngoãn và lễ phép, ", "Có thái độ chuẩn mực với thầy cô, ", "Biết cách ứng xử hòa nhã với bạn bè, ", "Luôn có ý thức giữ gìn kỷ luật lớp, ", "Chấp hành tốt các quy định nhà trường, "],
  "Ngoại ngữ": ["Em có kỹ năng phát âm tiếng Anh tốt, ", "Biết cách lắng nghe và lặp lại từ vựng, ", "Luôn tự tin giao tiếp tiếng Anh cơ bản, ", "Phát huy tốt khả năng học từ mới, ", "Có thái độ tích cực trong giờ tiếng Anh, "],
  "Tiếng Anh": ["Em có kỹ năng phát âm tiếng Anh tốt, ", "Biết cách lắng nghe và lặp lại từ vựng, ", "Luôn tự tin giao tiếp tiếng Anh cơ bản, ", "Phát huy tốt khả năng học từ mới, ", "Có thái độ tích cực trong giờ tiếng Anh, "],
  "Tự nhiên và Xã hội": ["Em nắm vững các hiện tượng tự nhiên, ", "Luôn tò mò và yêu thích khám phá, ", "Biết cách quan sát môi trường xung quanh, ", "Có ý thức bảo vệ môi trường rất tốt, ", "Tích cực tìm hiểu kiến thức khoa học, "],
  "Khoa học": ["Em nắm vững kiến thức tự nhiên, ", "Luôn tò mò và yêu thích khám phá, ", "Biết cách quan sát môi trường phòng thí nghiệm, ", "Có ý thức bảo vệ môi trường rất tốt, ", "Tích cực tìm hiểu kiến thức khoa học, "],
  "Lịch sử và Địa lí": ["Em ghi nhớ tốt các sự kiện lịch sử, ", "Hiểu biết rõ về vị trí địa lý, ", "Biết cách liên hệ bài học với thực tế, ", "Luôn chú ý nghe giảng và phát biểu, ", "Thể hiện sự yêu thích môn học rõ rệt, "],
  "Lịch sử và Địa lý": ["Em ghi nhớ tốt các sự kiện lịch sử, ", "Hiểu biết rõ về vị trí địa lý, ", "Biết cách liên hệ bài học với thực tế, ", "Luôn chú ý nghe giảng và phát biểu, ", "Thể hiện sự yêu thích môn học rõ rệt, "],
  "Tin học và Công nghệ": ["Em sử dụng máy tính thành thạo, ", "Nắm bắt nhanh các thao tác công nghệ, ", "Biết cách thực hành tốt trên phần mềm, ", "Luôn tuân thủ quy tắc phòng máy tính, ", "Có tư duy logic tốt khi thực hành tin học, "],
  "Tin học": ["Em sử dụng máy tính thành thạo, ", "Nắm bắt nhanh các thao tác công nghệ, ", "Biết cách thực hành tốt trên phần mềm, ", "Luôn tuân thủ quy tắc phòng máy tính, ", "Có tư duy logic tốt khi thực hành tin học, "],
  "Công nghệ": ["Em biết được tầm quan trọng hệ thống, ", "Nắm bắt nhanh các thao tác sử dụng công cụ, ", "Biết cách thực hành tốt lắp ráp mô hình, ", "Luôn tuân thủ an toàn trong tiết thực hành, ", "Có tư duy thiết kế tốt khi làm sản phẩm, "],
  "Giáo dục thể chất": ["Em hoàn thành tốt các bài tập thể dục, ", "Luôn năng nổ và nhiệt tình vận động, ", "Biết cách rèn luyện sức khỏe bản thân, ", "Có tinh thần thể thao đáng biểu dương, ", "Thực hiện đúng và đẹp các động tác, "],
  "Âm nhạc": ["Em có năng khiếu âm nhạc tốt, ", "Hát đúng giai điệu và nhiệt tình, ", "Biết cách cảm thụ nhịp điệu tinh tế, ", "Luôn tích cực tham gia hát trên lớp, ", "Nắm vững các nốt nhạc trọng tâm, "],
  "Mĩ thuật": ["Em có năng khiếu vẽ rất tốt, ", "Trình bày bố cục tranh hài hòa, ", "Biết cách sử dụng màu sắc tươi sáng, ", "Luôn hoàn thành xuất sắc các sản phẩm, ", "Thể hiện sự khéo léo qua từng nét vẽ, "],
  "Nghệ thuật": ["Em có năng khiếu nghệ thuật tốt, ", "Hoàn thành xuất sắc nhiệm vụ sáng tạo, ", "Biết cách tạo hình nét vẽ thẩm mỹ, ", "Luôn tích cực tham gia làm thực hành, ", "Nắm vững kỹ năng cốt lõi của môn học, "],
  "Hoạt động trải nghiệm": ["Em tích cực tham gia các hoạt động ngoại khóa, ", "Biết cách thích ứng với hoàn cảnh tình huống mới, ", "Luôn hòa đồng và hỗ trợ bạn bè, ", "Thể hiện kỹ năng sống rất tốt trong thực tế, ", "Phát huy tốt khả năng làm việc tập thể, "],
  "Năng lực chung": ["Em có tư duy và khả năng tự học tốt, ", "Kỹ năng giao tiếp lưu loát và thân thiện, ", "Biết cách giải quyết vấn đề linh hoạt, ", "Luôn chủ động hoàn thành nhiệm vụ cá nhân, ", "Thể hiện tốt tinh thần hợp tác nhóm hiệu quả, "],
  "Phẩm chất chủ yếu": ["Em luôn thể hiện sự trung thực trong lớp, ", "Có lòng nhân ái với bạn đồng trang lứa, ", "Biết yêu thương và quan tâm mọi người xung quanh, ", "Thể hiện tinh thần trách nhiệm cao độ, ", "Luôn chăm chỉ và nỗ lực không ngừng nghỉ, "],
  "Môn học": ["Em có tư duy và kỹ năng tiếp thu xuất sắc, ", "Nắm vững kiến thức bài học rất nhanh nhẹn, ", "Giải quyết tình huống bài tập nhanh chóng, ", "Tự tin chủ động hoàn thành các bài tập, ", "Chăm chỉ hoàn thành xuất sắc nhiệm vụ, "]
};

const MOCK_MIDDLES = {
  "Ngữ văn": ["kỹ năng viết văn có tiến bộ rõ rệt, ", "hiểu nội dung bài và phân tích sắc sảo, ", "nắm rất vững cốt truyện và nghệ thuật, ", "diễn đạt mạch lạc và cực kỳ trôi chảy, "],
  "Giáo dục công dân": ["góp phần lan tỏa sự tích cực đến lớp, ", "thực hiện tốt trách nhiệm của học sinh, ", "luôn sẵn sàng giúp đỡ mọi người xung quanh, ", "có định hướng hành vi cá nhân rất chuẩn mực, "],
  "Khoa học tự nhiên": ["thường xuyên đặt ra những câu hỏi rất hay, ", "nắm vững kiến thức về vật chất và năng lượng, ", "có góc nhìn thú vị về thế giới tự nhiên, ", "luôn tuân thủ quy tắc an toàn khi thực hành, "],
  "Nội dung giáo dục địa phương": ["thường xuyên kể những câu chuyện dân gian hấp dẫn, ", "nắm vững các danh lam thắng cảnh trong tỉnh, ", "có ý thức bảo vệ và giữ gìn bản sắc văn hoá, ", "trình bày nội dung bài học rất sinh động, "],
  "Tiếng Việt": ["kỹ năng viết văn có tiến bộ rõ rệt, ", "hiểu nội dung bài và trả lời đúng trọng tâm, ", "nắm rất vững kiến thức và từ vựng, ", "đọc bài diễn cảm và cực kỳ trôi chảy, "],
  "Toán": ["chủ động tìm tòi ra cách giải hay, ", "hoàn thành rất tốt các dạng bài tập, ", "nắm rõ phương pháp suy luận logic, ", "thường xuyên đưa ra các đáp án chính xác, "],
  "Đạo đức": ["góp phần lan tỏa sự tích cực đến lớp, ", "thực hiện tốt trách nhiệm của người học sinh, ", "luôn sẵn sàng giúp đỡ mọi người xung quanh, ", "có định hướng hành vi cá nhân rất chuẩn mực, "],
  "Ngoại ngữ": ["kỹ năng đọc hiểu đoạn văn tiếng Anh khá tốt, ", "ghi nhớ tốt từ vựng và cấu trúc ngữ pháp hệ thống, ", "có phản xạ giao tiếp ngôn ngữ khá tự nhiên, ", "luôn nhiệt tình tham gia trò chơi hoạt động, "],
  "Tiếng Anh": ["kỹ năng đọc hiểu đoạn văn tiếng Anh khá tốt, ", "ghi nhớ tốt từ vựng và cấu trúc ngữ pháp hệ thống, ", "có phản xạ giao tiếp ngôn ngữ khá tự nhiên, ", "luôn nhiệt tình tham gia trò chơi hoạt động, "],
  "Tự nhiên và Xã hội": ["thường xuyên đặt ra những câu hỏi rất hay, ", "nắm vững kiến thức về đời sống động thực vật, ", "có góc nhìn rất thú vị về thực trạng tự nhiên, ", "luôn biết cách hệ thống hóa bài học chuẩn mực, "],
  "Khoa học": ["thường xuyên tìm tòi những vấn đề rất hay, ", "nắm vững cấu trúc kiến thức nền tảng, ", "có thái độ khoa học khách quan và kỹ lưỡng, ", "luôn biết cách thử nghiệm và rút kết luận đúng đắn, "],
  "Lịch sử và Địa lí": ["ghi nhớ lâu các vị anh hùng lịch sử, ", "biết xem trọn vẹn bản đồ và nhận biết vùng miền, ", "luôn hăng hái chia sẻ hiểu biết cá nhân của mình, ", "trình bày nội dung kiến thức một cách rất logic, "],
  "Lịch sử và Địa lý": ["ghi nhớ lâu các vị anh hùng lịch sử, ", "biết xem trọn vẹn bản đồ và nhận biết vùng miền, ", "luôn hăng hái chia sẻ hiểu biết cá nhân của mình, ", "trình bày nội dung kiến thức một cách rất logic, "],
  "Tin học và Công nghệ": ["tự tin thực hành trên máy không cần nhắc nhở, ", "hiểu rõ ràng chức năng các công cụ phần mềm, ", "thực hiện một loạt các thao tác máy tính rất chính xác, ", "thể hiện được khả năng tư duy hệ thống máy tính tốt, "],
  "Tin học": ["tự tin thực hành trên máy không cần nhắc nhở, ", "hiểu rõ ràng chức năng các công cụ phần mềm, ", "thực hiện một loạt các thao tác máy tính rất chính xác, ", "thể hiện được khả năng tư duy hệ thống máy tính tốt, "],
  "Công nghệ": ["tự tin lắp ráp các mô hình học cụ, ", "hiểu rõ nguyên lý hoạt động của các bộ phận, ", "thực hiện gia công vật liệu an toàn và chắc chắn, ", "thể hiện sự tỉ mỉ qua từng khâu thật nhỏ, "],
  "Giáo dục thể chất": ["phối hợp nhịp nhàng cùng các bạn bè chung lớp, ", "giữ gìn tốt vệ sinh cá nhân trong quá trình tập, ", "rất nhanh nhẹn trong tổ hợp và khéo léo bứt phá, ", "luôn cố gắng nỗ lực hết tâm sức trong các bài test, "],
  "Âm nhạc": ["thường xuyên truyền cảm hứng cho bạn bè, ", "thể hiện phong thái sự tự tin rạng rỡ khi lên sân khấu, ", "thực hành luyện tập kết hợp vận động rất xuất sắc, ", "luôn hoàn thành mục tiêu phần biểu diễn đúng kế hoạch, "],
  "Mĩ thuật": ["mang đầy cảm hứng sáng tạo lan tỏa cho bạn bè, ", "thể hiện nhiều sáng kiến độc đáo trong sản phẩm nghệ thuật, ", "phối hợp pha trộn mảng màu sắc thật sự bắt mắt, ", "luôn chỉnh chu hoàn thành tác phẩm đúng thời gian, "],
  "Nghệ thuật": ["thường xuyên bộc lộ đa dạng tư duy thẩm mỹ cao, ", "trải nghiệm mỹ cảm của em ở trạng thái rất năng động, ", "biết gắn kết chất liệu vào dự án một cách thú vị, ", "có thiên hướng thực hành thật tốt các mảng phân công, "],
  "Hoạt động trải nghiệm": ["biết cách xử lý mọi tình huống thật sự linh hoạt, ", "luôn hoàn tất xuất sắc vai trò cá nhân được giao, ", "góp phần không nhỏ tạo nên kết quả thành công của nhóm, ", "rất hay chủ động đưa ra vô số sáng kiến ý tưởng mới, "],
  "Năng lực chung": ["biết chia sẻ và chân thành lắng nghe ý kiến mọi người, ", "cực kỳ linh hoạt xử lý vô số tình huống trải nghiệm lớp học, ", "mạnh dạn tự tin trình bày phản biện quan điểm cá nhân, ", "có ý thức duy trì kỷ luật nhóm thật sự rất xuất sắc, "],
  "Phẩm chất chủ yếu": ["lan tỏa lối sống chan hòa nhân ái tới tận người xung quanh, ", "hoàn thành xuất sắc nhiệm vụ bổn phận của học sinh, ", "luôn có tinh thần dũng cảm quyết liệt bảo vệ cái đúng đắn, ", "cố gắng vươn lên mọi rào cản hoàn cảnh để vươn tới thành công, "],
  "Môn học": ["giữ vững nhiệt huyết nghiên cứu cao trong nhiều tháng liền, ", "dành được số điểm cao tuyệt đối trong bài kiểm tra định kỳ, ", "giảng giải lại cho bạn bè cùng tiến bộ thật chu đáo, ", "đạt được tất cả mọi chỉ tiêu kế hoạch năm học đã đề ra, "]
};

const MOCK_NLC_H = [
  "Trong tháng này sự chủ động của em đã khá hơn, tuy nhiên đôi lúc vẫn cần thầy cô nhắc nhở nhẹ nhàng.",
  "Việc hợp tác nhóm của em đạt yêu cầu, mạnh dạn hơn nữa nhé để đóng góp được nhiều ý tưởng.",
  "Kỹ năng giao tiếp có thay đổi theo chiều hướng tốt, cần rèn luyện thêm cách truyền đạt rõ ràng.",
  "Đã biết cách tự xoay xở với bài tập khó, dù thỉnh thoảng còn lúng túng khi trình bày trên bảng.",
  "Sự tự lập trong học tập giữ ở mức ổn định, cố gắng tăng cường sự tập trung thêm ở nhà.",
  "Em thể hiện tinh thần làm việc nhóm khá tốt, cần học cách lắng nghe ý kiến bạn bè nhiều hơn.",
  "Khi có sự cố nhỏ ở lớp, em đã bắt đầu biết cách tự tìm phương án xử lý cơ bản.",
  "Giao tiếp với bạn bè rất hòa nhã, nhưng trong giờ học em còn rụt rè chưa dám giơ tay.",
  "Đang dần hình thành thói quen tự học ở nhà, kết quả trên lớp duy trì được mức độ tiến bộ đều.",
  "Tham gia tương đối nhiệt tình vào công việc chung của tổ, thỉnh thoảng còn mải chơi quên nhiệm vụ.",
  "Bộc lộ năng lực tự chủ khá tinh tế trong sinh hoạt trên lớp, cần duy trì đều đặn thói quen này.",
  "Đôi khi em còn phân tâm, nhưng nhìn chung vẫn hoàn thành đầy đủ các bài tập tự luyện.",
  "Bắt đầu nhận thức được cách giải quyết bài tập nhóm, cần tự tin đóng góp góc nhìn cá nhân hơn.",
  "Các kỹ năng tự phục vụ bản thân thực hiện đạt mức tốt, tuy vậy cần rèn thêm tính cẩn thận.",
  "Có biểu hiện tích cực trong việc chủ động lên hỏi bài thầy cô khi gặp vướng mắc khó hiểu.",
  "Hợp tác tạm ổn cùng bạn học cạnh bên, tốc độ hoàn thành công việc ở mức độ trung bình khá.",
  "Dù đôi chỗ lúng túng khi trình bày trước lớp, nhưng em đã nỗ lực hoàn thành rất tròn trịa phần nói.",
  "Biết tái hiện lại được những bước giải quyết tình huống cũ theo mẫu giáo viên đã hướng dẫn.",
  "Năng lực làm việc tập thể có đôi chút tiến bộ, biết cách dàn xếp công việc cho các bạn.",
  "Chủ động tham gia lao động vệ sinh chung, ý thức tự quản trong việc dọn dẹp tháng qua có cải thiện.",
  "Thường xuyên hoàn tất các phần việc cơ bản, hãy mạnh dạn thử nghiệm thêm những cách làm sáng tạo nhé.",
  "Em đã biết ứng xử tương đối phù hợp khi xảy ra một vài mâu thuẫn nhỏ với bạn bè lúc chơi đùa.",
  "Cần chú ý luyện tập thêm kỹ năng lắng nghe để những cuộc thảo luận nhóm đạt hiệu quả tốt hơn.",
  "Mức độ chuyên tâm khi làm bài tập độc lập khá ổn, thời gian tới cần cố gắng đẩy nhanh tốc độ viết.",
  "Bước đầu đang làm quen dần với phương pháp tự tìm kiếm tài liệu tham khảo, cần thêm sự kiên nhẫn.",
  "Rất chịu khó rèn luyện cách nói chuyện lưu loát, tăng âm lượng lên một chút xíu em sẽ làm rất tốt.",
  "Đã bước đầu nắm được cách thức phối hợp cùng hình thức tổ nhóm, cần nhiệt tình vươn lên nhận vai trò.",
  "Nhịp độ học tập và ghi chép cá nhân duy trì ở mức đạt yêu cầu, cần lưu ý cải thiện thêm độ sạch đẹp.",
  "Đã cởi mở hơn nhiều trong việc cùng nhau chia sẻ sách vở cũng như đồ dùng học tập cùng bạn bè.",
  "Khả năng quan sát bao quát vấn đề của nhóm ở mức khá, cần chú tâm học cách tổng hợp ý kiến mọi người.",
  "Luôn thực hiện đầy đủ nhiệm vụ nhỏ gọn được phân công trong tổ, nhưng thỉnh thoảng chưa tự giác nhận việc.",
  "Mức độ dạn dĩ khi hòa mình vào các trò chơi tập thể đã gia tăng đáng kể so với những tháng học trước.",
  "Đã biết nhờ đến sự trợ giúp của giáo viên rất đúng lúc khi chẳng may gặp phải nhiệm vụ quá sức.",
  "Quan hệ bạn bè tháng này duy trì sự hòa thuận, em đã biết cách làm chủ cảm xúc của bản thân tốt hơn.",
  "Có tinh thần tự xem và chuẩn bị bài cũ gần như đầy đủ trước khi lên lớp, đôi khi có sai sót nhỏ.",
  "Hoà nhập và chủ động làm quen với các bạn chuyển đến khá nhanh nhẹn, phong cách giao tiếp điềm đạm.",
  "Em đã biết tự thu xếp bảo quản đồ đạc cá nhân trong ngăn bàn gọn gàng, ít khi để thất lạc đồ đạc.",
  "Tốc độ phản xạ tương đối nhanh nhạy trước những tình huống hoặc thử thách bất ngờ ở trên lớp học.",
  "Tinh thần trách nhiệm với công việc phụ trách được duy trì tốt, một vài thời điểm có dấu hiệu lơ đãng nhẹ.",
  "Đã có một vài sáng kiến nhỏ để góp phần làm hoạt cảnh, tiếp tục phát huy mặt mạnh mẽ này em nhé."
];

const MOCK_MH_H = [
  "Em nắm được kiến thức nền tảng của bài học, tuy nhiên cần chăm chỉ giơ tay phát biểu ý kiến hơn nữa.",
  "Em hiểu bài và thực hiện khá tốt các yêu cầu của tiết học, hãy mạnh dạn tự tin trình bày trước lớp nhé.",
  "Em hoàn thành các nhiệm vụ học tập trên lớp, tuy nhiên em cần rèn luyện thêm tính cẩn thận khi làm bài.",
  "Em biết cách áp dụng lý thuyết vào bài tập cơ bản, thời gian tới cố gắng làm bài nhanh hơn một chút.",
  "Em chú ý nghe giảng và ghi chép bài đầy đủ, cố gắng phát huy thêm tinh thần xung phong xây dựng bài.",
  "Em theo kịp tiến độ chung của cả lớp, nhưng thỉnh thoảng vẫn còn lúng túng khi gặp bài tập mở rộng.",
  "Em thể hiện sự cố gắng đáng kể trong việc tiếp thu kiến thức, cần duy trì thói quen tự học ở nhà.",
  "Em hoàn thành các bài tập được giao đúng hạn, hãy tăng cường trao đổi với bạn bè để mở rộng thêm hiểu biết.",
  "Em có thái độ học tập nghiêm túc, tuy nhiên kĩ năng xử lý các tình huống khó vẫn cần được bồi dưỡng thêm.",
  "Em nắm được trọng tâm của bài giảng trên lớp, cố gắng dành thêm thời gian ôn tập để kiến thức được khắc sâu.",
  "Em thực hiện đầy đủ các yêu cầu môn học, hãy tự tin thể hiện quan điểm cá nhân trong các buổi thảo luận.",
  "Em có sự tiến bộ trong việc hiểu và vận dụng bài học, cần tiếp tục nỗ lực để đạt được kết quả cao hơn.",
  "Em cơ bản làm chủ được nội dung chương trình, tuy nhiên sự tập trung trong giờ học đôi lúc chưa cao.",
  "Em biết cách thao tác và giải quyết bài tập theo mẫu, cần rèn luyện thêm tư duy mở rộng và sáng tạo.",
  "Em thể hiện sự chăm chỉ trong quá trình học tập, nhưng đôi khi trình bày bài làm còn thiếu sự chỉn chu.",
  "Em hoàn thành tương đối tốt các nhiệm vụ nhóm, hãy cố gắng bứt phá hơn trong học kỳ tiếp theo.",
  "Em tham gia đầy đủ các hoạt động học tập trên lớp, tuy nhiên cần chủ động đặt câu hỏi khi chưa hiểu bài.",
  "Em ghi nhớ tốt các nội dung trọng điểm của bài, cần rèn luyện kỹ năng diễn đạt để câu trả lời thêm lưu loát.",
  "Em có ý thức sửa chữa bài cẩn thận mỗi khi được nhắc nhở, hãy tiếp tục phát huy tinh thần cầu tiến này nhé.",
  "Em tham gia các hoạt động tập thể ở mức trung bình khá, cần nhiệt tình hơn khi phân công các công việc.",
  "Em nắm bắt được yêu cầu của bộ môn, tuy nhiên tốc độ hoàn thành bài tập cần được cải thiện hơn nữa.",
  "Em có khả năng tự giải quyết các bài tập ở mức độ nhận biết, cần rèn thêm các dạng bài tập vận dụng.",
  "Em có thái độ cầu thị khi tiếp thu bài mới, hãy cố gắng rèn luyện thêm khả năng tư duy làm việc độc lập.",
  "Em vượt qua các khâu vận dụng ở mức khá, cần có kế hoạch ôn tập khoa học hơn để kết quả được bền vững.",
  "Em đã cố gắng hoàn thành tốt nhiệm vụ được giao, hãy mạnh dạn trình bày sáng kiến của mình với thầy cô nhé.",
  "Em có tinh thần tự học đáng khích lệ, tuy nhiên kĩ năng vận dụng cốt lõi vẫn còn lấn cấn đôi chút.",
  "Em chú tâm vào bài giảng của giáo viên khá tốt, cần phát huy sự linh hoạt trong các bài tập dự án dài hạn.",
  "Em đã biết liên hệ cơ bản kiến thức vào thực tế, tuy nhiên cách trình bày đôi khi còn chưa thực sự gãy gọn.",
  "Em nhìn chung đạt được các mục tiêu học tập đề ra, hãy cố gắng tương tác đóng góp ý kiến với các bạn trong tổ.",
  "Em có khả năng hoàn thiện bài tập ở mức độ khá, cần hạn chế nói chuyện riêng để việc thu nhận kiến thức tốt hơn.",
  "Em thực hiện đầy đủ các khâu soạn bài chuẩn bị trước khi đến lớp, hãy duy trì phong độ này một cách bền bỉ nhé.",
  "Em hiểu được các ý chính của bài học, tuy nhiên cách diễn đạt vấn đề đôi lúc vẫn còn thiếu đi sự đồng điệu logic.",
  "Em có nhiều nỗ lực vươn lên trong việc làm bài tập, hãy thật tự tin hơn nữa vào khả năng của chính bản thân mình.",
  "Em làm bài tập rèn luyện khá trọn vẹn, nhưng cần phải chú ý đọc kĩ yêu cầu để né đi những sai sót không đáng có.",
  "Em thực hiện các bước theo hướng dẫn đạt yêu cầu, nhưng đôi chỗ vẫn cần sự gợi ý chỉ dẫn của giáo viên.",
  "Em có trách nhiệm với các khâu chuẩn bị phục vụ bài học của bản thân, hãy cố gắng đa dạng hóa phương pháp rèn tư duy.",
  "Em đi đúng tiến độ kiến thức mà bài giảng hướng tới, rất mong em tự tin xung phong lên bảng giải bài tập nhiều hơn.",
  "Em có nhiều quyết tâm trong các khâu hoàn thiện kỹ năng, dù cho vài chỗ về tỉ lệ độ chính xác cần phải rèn giũa chút xíu.",
  "Em xây dựng được nền tảng kiến thức môn học một cách vững vàng, cần thật sự mạnh dạn thử thách với những yêu cầu độ khó cao.",
  "Em đảm bảo tốt nề nếp kỷ luật trong các giờ học lý thuyết, hãy cố biến những ưu điểm về sự chăm chỉ thành kết quả cao nhất.",
];

const MOCK_MH_C = [
  "Em còn gặp nhiều khó khăn trong việc lĩnh hội kiến thức môn học, gia đình cần đồng hành và kèm cặp thêm cho em tại nhà.",
  "Em chưa hoàn thành đầy đủ các bài tập được giao trên lớp, thầy cô hy vọng em sẽ nỗ lực và tập trung hơn trong thời gian tới.",
  "Em tiếp thu nội dung bài học còn khá chậm so với tiến độ chung, cần phải mạnh dạn nhờ sự hỗ trợ từ giáo viên khi chưa hiểu bài.",
  "Em chưa thể hiện được sự chủ động trong quá trình làm bài, hãy chú ý lắng nghe và làm theo đúng sự hướng dẫn của thầy cô.",
  "Em còn để mất tập trung trong các giờ học lý thuyết, cố gắng rèn luyện nề nếp kỷ luật để kết quả được cải thiện hơn em nhé."
];

const MOCK_SUFFIXES = [
  "điều này rất đáng khen ngợi.",
  "thầy cô giáo rất tự hào về em."
];

function generate40Comments(subjectName) {
  if (!subjectName) return [];
  let name = subjectName.trim();
  let matchedKey = Object.keys(MOCK_PREFIXES).find(k => name.includes(k) || k.includes(name));
  
  if (!matchedKey) {
    for(let k in MOCK_PREFIXES) {
      if(k.toLowerCase() === name.toLowerCase()) matchedKey = k;
    }
  }

  if (!matchedKey) return []; 
  
  let prefs = MOCK_PREFIXES[matchedKey];
  let mids = MOCK_MIDDLES[matchedKey];
  let sufs = MOCK_SUFFIXES;
  
  if (!prefs || !mids) return [];

  let results = [];
  for(let p = 0; p < prefs.length; p++) {
    for(let m = 0; m < mids.length; m++) {
      for(let s = 0; s < sufs.length; s++) {
        results.push(prefs[p] + mids[m] + sufs[s]);
      }
    }
  }
  return results;
}


export const getEmptySubject = (mon, cap, hocKyParam) => {
  let m = mon || "";
  let hk = hocKyParam || "";
  
  // Try to parse 'mon' if it comes as "Môn học_Học kỳ X"
  if (m.includes("_")) {
    const parts = m.split("_");
    if (parts.length >= 2) {
      if (!hk) hk = parts.pop();
      m = parts.join("_");
    }
  }
  
  const safeM = m.trim().toLowerCase();
  const safeHK = hk.trim().toLowerCase();
  
  const subjectStr = safeM ? `môn ${m.replace(/^(môn\s*)/i, '')}` : "môn học";
  const skillWord = safeM ? (safeM.includes('công nghệ') || safeM.includes('tin học') || safeM.includes('khoa học') || safeM.includes('nghệ thuật') || safeM.includes('âm nhạc') || safeM.includes('mỹ thuật') || safeM.includes('mĩ thuật') || safeM.includes('giáo dục thể chất') || safeM.includes('hoạt động trải nghiệm') ? 'thực hành' : 'vận dụng') : 'vận dụng';
  
  const totComments = [
    `Em tiếp thu bài nhanh, vận dụng kiến thức linh hoạt, đạt kết quả học tốt ${subjectStr}.`,
    `Nắm vững kiến thức trọng tâm ${subjectStr}, kĩ năng ${skillWord} thành thạo.`,
    `Em luôn tự giác, có thái độ học tập tích cực và xuất sắc hoàn thành ${subjectStr}.`,
    `Tích cực tham gia xây dựng bài, thể hiện năng lực tư duy tốt ở ${subjectStr}.`,
    `Vận dụng kiến thức ${subjectStr} rất linh hoạt, đạt thành tích đáng tuyên dương.`,
    `Luôn đi đầu trong các hoạt động học tập ${subjectStr}, kết quả đánh giá rất tốt.`,
    `Em hoàn thành xuất sắc các yêu cầu cần đạt của ${subjectStr}.`,
    `Học tập chăm chỉ, phương pháp học khoa học ${subjectStr}, đạt kết quả tốt.`,
    `Thể hiện sự sáng tạo và tư duy logic cao trong ${subjectStr}.`,
    `Bài kiểm tra và bài làm ${subjectStr} luôn đạt chất lượng cao.`,
    `Năng lực học tập xuất sắc, nắm bắt nhanh các khái niệm ${subjectStr}.`,
    `Có kĩ năng phân tích và giải quyết vấn đề cực kì tốt ${subjectStr}.`,
    `Tự tin thể hiện sự vượt trội, đạt chuẩn yêu cầu tốt ${subjectStr}.`,
    `Chủ động tìm tòi, mở rộng kiến thức ${subjectStr}, xứng đáng đạt kết quả tốt.`,
    `Em luôn ý thức được việc tự học và đạt chất lượng ${subjectStr} rất cao.`,
    `Thể hiện đam mê và năng khiếu học tốt ${subjectStr} trong quá trình học.`,
    `Sự nỗ lực đạt được kết quả ấn tượng, kĩ năng ${subjectStr} rất vững.`,
    `Em hoàn thành vượt mức mong đợi các nội dung của ${subjectStr}.`,
    `Năng lực nhận thức và áp dụng ${subjectStr} rất hoàn thiện.`,
    `Luôn là tấm gương xuất sắc về thái độ và kết quả học tập ${subjectStr}.`
  ];

  const khaComments = [
    `Em có cố gắng trong học tập, hiểu và vận dụng kiến thức khá tốt ${subjectStr}.`,
    `Hoàn thành đầy đủ bài tập được giao, thái độ học nghiêm túc ${subjectStr}.`,
    `Nắm vững kiến thức cơ bản ${subjectStr}, kết quả học tập đạt mức khá.`,
    `Em chú ý nghe giảng, tiếp thu tốt các nội dung trọng tâm ${subjectStr}.`,
    `Cần phát huy hơn nữa sự tự tin ${subjectStr}, kết quả của em là khá.`,
    `Ý thức học tập tốt, kĩ năng ${skillWord} ${subjectStr} khá vững.`,
    `Đã hoàn thành các yêu cầu cần đạt ${subjectStr} ở mức độ khá.`,
    `Nỗ lực học tập, bài làm ${subjectStr} trình bày khá cẩn thận.`,
    `Đạt học sinh khá ${subjectStr}, cần tích cực hơn ở học kỳ tiếp theo.`,
    `Tư duy ${subjectStr} khá, nhưng đôi lúc cần cẩn thận hơn để đạt điểm cao.`,
    `Có sự tiến bộ trong ${subjectStr}, khả năng hiểu bài khá tốt.`,
    `Em đạt yêu cầu ${subjectStr} mức khá, thao tác tư duy khá nhanh.`,
    `Sự cố gắng của em trong ${subjectStr} được ghi nhận bằng kết quả khá.`,
    `Chăm chỉ học bài, đáp ứng mức khá các yêu cầu ${subjectStr}.`,
    `Em thể hiện tinh thần cầu tiến và nhận kết quả học khá ${subjectStr}.`,
    `Nhìn chung nắm được bài, kết quả khả quan ${subjectStr}.`,
    `Em phân tích khá tốt ${subjectStr} qua từng tiết học.`,
    `Đã biết cách vận dụng bài học ở mức độ khá đối với ${subjectStr}.`,
    `Có tinh thần tự học, kĩ năng ${subjectStr} đạt yêu cầu khá.`,
    `Cố gắng ổn định, kết quả học tập ${subjectStr} đạt chuẩn khá.`
  ];

  const datComments = [
    `Em nắm được kiến thức cơ bản ${subjectStr}, cần chủ động học tập hơn trong lớp.`,
    `Kết quả ${subjectStr} mức đạt, cần hình thành thói quen tự giác học bài.`,
    `Em đạt yêu cầu ${subjectStr}, cần tập trung và nỗ lực nhiều hơn.`,
    `Đã nắm mức kỹ năng tối thiểu, ${subjectStr} của em đạt yêu cầu.`,
    `Cần rèn luyện tính cẩn thận, kết quả học ${subjectStr} vừa đủ đạt.`,
    `Có cố gắng tiếp thu ${subjectStr}, tuy nhiên cần siêng năng hơn để nâng điểm.`,
    `Nhận thức được bài học cơ bản, ${subjectStr} đạt yêu cầu.`,
    `Học tập còn thiếu sự chủ động, ${subjectStr} đạt chuẩn cơ bản.`,
    `Cần rèn luyện thêm sự nhạy bén, ${subjectStr} đạt yêu cầu.`,
    `Em cần khắc phục sự lơ là để tiến bộ hơn, ${subjectStr} đạt yêu cầu.`,
    `Đạt được năng lực cơ bản ${subjectStr}, cần chú ý vào bài học hơn.`,
    `Hoàn thành nội dung ${subjectStr} ở mức đạt yêu cầu.`,
    `Đôi khi chưa thuộc rõ bài, nhưng nhìn chung đạt ${subjectStr}.`,
    `Thời lượng tự làm bài còn hạn chế, mức độ nắm ${subjectStr} là đạt.`,
    `Sự tiến bộ chưa thực sự rõ rệt, kết quả ${subjectStr} mức đạt.`,
    `Phương pháp học còn hạn chế nhưng đủ đạt yêu cầu ${subjectStr}.`,
    `Em thực hiện vừa đủ các bài tập ${subjectStr}, để đạt yêu cầu.`,
    `Yêu cầu chương trình ${subjectStr} được em đáp ứng chuẩn đạt.`,
    `Cần học hỏi thêm từ bè bạn để phát triển vượt mức đạt ${subjectStr}.`,
    `Duy trì được mức đánh giá Đạt ${subjectStr}, nên cố gắng hơn ở học kỳ tiếp theo.`
  ];

  const chuaDatComments = [
    `Em chưa nắm vững kiến thức trọng tâm ${subjectStr}, cần nỗ lực ôn luyện nhiều hơn.`,
    `Chưa tự giác học bài tập ${subjectStr}, mức độ tập trung chưa cao, chưa đạt.`,
    `Kĩ năng làm bài ${subjectStr} còn yếu, kết quả chưa đạt yêu cầu.`,
    `Thường xuyên thiếu tập trung, kết quả ${subjectStr} chưa đạt.`,
    `Tiếp thu bài học ${subjectStr} chậm, cần rèn luyện bồi dưỡng thêm để đạt chuẩn.`,
    `Chưa hoàn thành đầy đủ các bài tập ${subjectStr}, cần khắc phục nhanh chóng.`,
    `Phương pháp học ${subjectStr} chưa hiệu quả, cần người nhà đôn đốc thêm.`,
    `Ý thức kỷ luật trong giờ ${subjectStr} cần cải thiện để kết quả học tốt hơn.`,
    `Kiến thức nền tảng ${subjectStr} còn hổng nhiều, cần chủ động phụ đạo thêm.`,
    `Kết quả bài kiểm tra ${subjectStr} ở mức thấp, em cần ý thức hơn việc học.`,
    `Sự tiến bộ trong môn ${subjectStr} chưa rõ ràng, em phải tự học thường xuyên hơn.`,
    `Rất thụ động trong tiết học ${subjectStr}, chưa đạt yêu cầu cần có.`,
    `Em cần nghiêm túc hơn đối với các bài kiểm tra ${subjectStr}.`,
    `Lười làm bài tập về nhà môn ${subjectStr}, kiến thức chưa đạt chuẩn.`,
    `Nhận thức về tầm quan trọng của ${subjectStr} chưa cao, kết quả đánh giá yếu.`,
    `Kỹ năng ${skillWord} ${subjectStr} chưa đạt, cần phải rèn luyện nhiều hơn nữa.`,
    `Chưa đạt mức cơ bản về kiến thức ${subjectStr}, gia đình cần giám sát kỹ.`,
    `Mức độ hiểu bài ${subjectStr} hạn chế, chưa vượt qua chuẩn đánh giá.`,
    `Thái độ làm bài chưa nghiêm túc ảnh hưởng tới kết quả môn ${subjectStr}.`,
    `Sự nỗ lực là chưa đủ ở môn ${subjectStr}, cần quyết tâm nhiều hơn ở học kỳ sau.`
  ];

  const totObj = { min: 8, max: 10, code: "T", mucDG: "T", comments: totComments };
  const khaObj = { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: khaComments };
  const datObj = { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: datComments };
  const cdObj  = { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: chuaDatComments };
  
  if (isPassFailSubject(cap, mon)) {
    datObj.code = "T";
    datObj.min = 5;
    datObj.max = 10;
    
    return {
      "Đạt": datObj,
      "Chưa Đạt": cdObj,
      "Đ": datObj,
      "CĐ": cdObj
    };
  }

  const dgtxTotObj = { min: 8, max: 10, code: "T", mucDG: "T", comments: totComments };
  const dgtxDatObj = { min: 5, max: 7.9, code: "Đ", mucDG: "Đ", comments: khaComments };
  const dgtxCdObj  = { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: chuaDatComments };

  const objT = { min: 8, max: 10, code: "T", mucDG: "T", comments: totComments };
  const objH = { min: 5, max: 7.9, code: "H", mucDG: "H", comments: khaComments };
  const objC = { min: 0, max: 4.9, code: "C", mucDG: "C", comments: chuaDatComments };
  const objD = { min: 5, max: 6.4, code: "Đ", mucDG: "Đ", comments: datComments };
  const objK = { min: 6.5, max: 7.9, code: "K", mucDG: "K", comments: khaComments };
  
  return {
    "Tốt": totObj,
    "Khá": khaObj,
    "Đạt": datObj,
    "Chưa Đạt": cdObj,
    "Đ": objD,
    "K": objK,
    "T": objT,
    "H": objH,
    "C": objC
  };
}; /* getEmptySubject END */


export const getEmptyDGTX = (mon, thang, khoi) => {
  let m = mon || "";
  let isNlPc = m.includes("Năng lực chung") || m.includes("Phẩm chất") || m.includes("Năng lực đặc thù");
  
  if (isNlPc) {
    const nlpcData = getEmptyThNlPc();
    return {
      "Tốt": nlpcData["Tốt"],
      "Khá": nlpcData["Đạt"], // map Khá to Đạt
      "Đạt": nlpcData["Đạt"],
      "Chưa Đạt": nlpcData["Cần cố gắng"],
      "Đ": nlpcData["Đạt"],
      "K": nlpcData["Đạt"],
      "T": nlpcData["T"],
      "H": nlpcData["H"],
      "C": nlpcData["C"]
    };
  }
  
  return getEmptySubject(mon, khoi ? (GRADE_LEVELS.TH.includes(khoi) ? "TH" : (GRADE_LEVELS.THCS.includes(khoi) ? "THCS" : "THPT")) : undefined);
};

export const getEmptyThNlPc = () => {
  const totComments = [
    "Năng lực tự chủ tốt, giao tiếp lưu loát, tự tin. Phẩm chất đạo đức Tốt.",
    "Năng động, tích cực tham gia các hoạt động. Luôn trung thực và trách nhiệm.",
    "Có khả năng tự học tốt. Biết chia sẻ và giúp đỡ bạn bè.",
    "Mạnh dạn, tự tin, hòa đồng với bạn bè. Ý thức kỷ luật cao.",
    "Thực hiện tốt các nội quy, quy định. Vận dụng kiến thức vào thực tiễn linh hoạt.",
    "Trung thực, kỷ luật, chan hòa với bạn bè xung quanh.",
    "Thường xuyên giúp đỡ bạn bè trong học tập, đoàn kết tốt.",
    "Tự giác hoàn thành phần việc được giao, không cần nhắc nhở.",
    "Rất ngoan ngoãn, lễ phép với thầy cô và mọi người xung quanh.",
    "Tích cực tham gia các phong trào thi đua của lớp và trường.",
    "Biết quan tâm, chia sẻ với những người có hoàn cảnh khó khăn.",
    "Có ý thức bảo vệ tài sản chung, giữ gìn vệ sinh lớp học.",
    "Chủ động, tích cực trong học tập, tự tin khi thuyết trình.",
    "Khả năng làm việc nhóm xuất sắc, biết lắng nghe ý kiến người khác.",
    "Luôn gương mẫu thực hiện nội quy, có ý thức tổ chức kỷ luật tốt.",
    "Tự quản lí tốt bản thân, biết cách sắp xếp thời gian hợp lý.",
    "Nhanh nhẹn, tháo vát, thường đưa ra những ý tưởng sáng tạo.",
    "Có khả năng tự giải quyết vấn đề cá nhân hiệu quả.",
    "Luôn trung thực trong học tập và sinh hoạt hàng ngày.",
    "Biết yêu thương, trân trọng những giá trị tốt đẹp trong cuộc sống."
  ];

  const datComments = [
    "Trung thực, kỷ luật, đoàn kết với bạn bè. Có tiến bộ trong giao tiếp.",
    "Chăm chỉ học tập. Cần mạnh dạn phát biểu xây dựng bài hơn.",
    "Thực hiện đầy đủ nhiệm vụ học tập. Cần linh hoạt hơn trong xử lý tình huống.",
    "Biết hợp tác với bạn trong nhóm. Đôi lúc còn mất trật tự.",
    "Năng lực tự học đạt yêu cầu. Cần chủ động hơn trong việc tìm hiểu kiến thức bổ sung.",
    "Đạt yêu cầu phẩm chất, cần tích cực tham gia phong trào hơn.",
    "Thực hiện tốt nội quy, cần mạnh dạn diễn đạt trước đám đông.",
    "Biết tự học, tuy nhiên đôi lúc còn lơ đãng trong giờ.",
    "Hòa đồng với các bạn, cần rèn luyện tính độc lập cao hơn.",
    "Có ý thức giữ gìn vệ sinh, tuy nhiên đôi lúc còn quên lời cô dặn.",
    "Ngoan ngoãn, lễ phép, cần chủ động hơn trong giao tiếp.",
    "Tích cực tham gia trực nhật, cần tăng sự tập trung vào bài giảng.",
    "Ghi chép bài đầy đủ, đôi lúc cần người nhà nhắc nhở ôn bài.",
    "Tự giác làm vệ sinh cá nhân, cần cải thiện khả năng tập trung.",
    "Vui vẻ, hòa đồng, tuy nhiên kỹ năng tự giải quyết vấn đề chưa cao.",
    "Thực hiện đúng quy định, tuy vậy còn nhút nhát khi nêu ý kiến.",
    "Biết yêu thương bạn bè, nên rèn luyện sự quyết đoán của bản thân.",
    "Đạt yêu cầu về năng lực chung nhưng đôi lúc cần GV hỗ trợ.",
    "Năng lực giải quyết vấn đề mức cơ bản, cần tự luyện tập thêm.",
    "Có tiến bộ về ý thức kỷ luật, cần duy trì hàng ngày."
  ];

  const ccgComments = [
    "Chưa chủ động hoàn thành nhiệm vụ học tập. Cần gia đình đôn đốc thêm.",
    "Còn rụt rè, chưa mạnh dạn giao tiếp. Chưa có ý thức giữ gìn vệ sinh chung.",
    "Cần rèn luyện tính kỷ luật trong giờ học. Chưa tích cực tham gia hoạt động nhóm.",
    "Ý thức tự giác chưa cao. Cần thân thiện và hòa đồng hơn với bạn bè.",
    "Chưa hoàn thành các bài tập được giao. Cần rèn luyện thêm về kỹ năng hợp tác.",
    "Hay làm việc riêng trong giờ học, cần chú ý theo dõi bài hơn.",
    "Việc tự học ở nhà còn yếu, phụ huynh cần phối hợp kiểm tra.",
    "Giao tiếp còn hạn chế, chưa biết cách làm việc cùng nhóm.",
    "Thái độ học tập chưa nghiêm túc, đôn đốc thường xuyên mới làm.",
    "Thường xuyên quên sách vở dụng cụ học tập, thiếu ngăn nắp.",
    "Chưa biết giữ gìn tài sản cá nhân và tập thể lớp.",
    "Thường xuyên vi phạm nội quy, cần chấn chỉnh kịp thời.",
    "Nhận thức và năng lực giải quyết vấn đề còn chậm.",
    "Tinh thần đoàn kết kém, hay trêu chọc các bạn xung quanh.",
    "Khả năng tự phục vụ còn yếu, phụ thuộc vào thầy cô và cha mẹ.",
    "Cần gia đình hỗ trợ nhiều hơn trong việc tự chuẩn bị đồ dùng.",
    "Còn mải chơi, cần hướng dẫn thêm về ý thức học tập.",
    "Hiểu biết về vệ sinh cá nhân và cộng đồng còn chưa tốt.",
    "Kỹ năng thích ứng với môi trường học tập còn rất nhiều hạn chế.",
    "Phải nhắc nhở thường xuyên trong việc thực hiện nề nếp kỷ luật."
  ];

  return {
    "Tốt": {
      min: 8, max: 10, code: "T", mucDG: "T",
      comments: totComments
    },
    "Đạt": {
      min: 5, max: 7.9, code: "Đ", mucDG: "H",
      comments: datComments
    },
    "Cần cố gắng": {
      min: 0, max: 4.9, code: "C", mucDG: "C",
      comments: ccgComments
    },
    "T": {
      min: 8, max: 10, code: "T", mucDG: "T",
      comments: totComments
    },
    "H": {
      min: 5, max: 7.9, code: "H", mucDG: "H",
      comments: datComments
    },
    "C": {
      min: 0, max: 4.9, code: "C", mucDG: "C",
      comments: ccgComments
    }
  };
};

export const getEmptyHocBaGVBM = () => {
  const totComments = [
    "Tiếp thu bài nhanh, vận dụng kiến thức linh hoạt. Hoàn thành tốt nhiệm vụ học tập.",
    "Có ý thức tự giác, luôn hoàn thành xuất sắc các bài tập được giao.",
    "Tích cực phát biểu, đạt kết quả đánh giá Tốt ở bộ môn.",
    "Năng lực học tập tốt, có tư duy môn học rõ ràng, mạch lạc.",
    "Luôn đi đầu trong các phong trào học tập của lớp.",
    "Nắm bắt kiến thức một cách chắc chắn và biết cách tham khảo thêm tài liệu.",
    "Kỹ năng xử lý bài tập cực kỳ xuất sắc, đạt điểm thi rất cao.",
    "Luôn chủ động học hỏi và chia sẻ kinh nghiệm học tập với bạn.",
    "Thái độ học tập gương mẫu, khả năng hiểu bài cực tốt.",
    "Chăm ngoan, học giỏi, đứng đầu sơ kết thi đua của bộ môn.",
    "Tham gia tích cực vào việc làm các bài tự luận và dự án nhóm.",
    "Ghi chép bài đầy đủ khoa học, chất lượng bài kiểm tra tuyệt vời.",
    "Tiếp thu và mở rộng kiến thức bài giảng một cách độc lập tốt.",
    "Có tính sáng tạo cao trong việc ứng dụng bài học vào thực tế.",
    "Tố chất học tập môn này rất tốt, tiếp thu không ngừng nghỉ.",
    "Biết cách làm việc độc lập và mang lại hiệu suất tiếp thu cao.",
    "Đạt điểm số gần tuyệt đối qua các bài đánh giá năng lực.",
    "Khả năng phân tích của em rất logic và thấu đáo.",
    "Có tiềm năng phát triển sâu hơn về môn học này.",
    "Giảng viên rất hài lòng về ý thức và chất lượng học tập của em."
  ];

  const khaComments = [
    "Có cố gắng trong học tập, hiểu và vận dụng kiến thức đạt mức Khá.",
    "Hoàn thành tốt nhiệm vụ học tập. Cần tự tin hơn trong các khâu vận dụng kiến thức.",
    "Nắm được kiến thức trọng tâm bộ môn, thái độ học tập nghiêm túc.",
    "Thực hiện đầy đủ các nhiệm vụ học tập, kết quả đạt mức Khá.",
    "Chăm làm bài tập về nhà, kết quả kiểm tra tương đối khả quan.",
    "Có những bước tiến đáng kể trong quá trình tiếp thu môn học.",
    "Hiểu khá trọn vẹn lý thuyết, nhưng khi vận dụng thỉnh thoảng mắc lỗi.",
    "Tư duy ổn định, biết cách hệ thống kiến thức đã học.",
    "Học lực khá, có khả năng đạt tốt nếu tập trung thêm.",
    "Chú ý nghe giảng, có thể làm quen nhanh với định dạng bài khó.",
    "Ý thức học tập tốt, đạt kết quả khá vững chắc ở các bài đánh giá.",
    "Đáp ứng được chuẩn yêu cầu môn học ở ngưỡng khá tốt.",
    "Cách trình bày bài còn đôi chỗ cần chau chuốt nhưng tư duy đúng hướng.",
    "Chịu khó nghiên cứu tuy kết quả chưa thật sự đột phá.",
    "Tuy có lúc còn sai sót nhưng xét tổng thể em đạt mức năng lực khá.",
    "Biết sửa lỗi sau khi được góp ý, điểm số giữ mức độ sinh viên khá giỏi.",
    "Rất ham học hỏi và chăm chỉ hỏi bài những điều chưa hiểu.",
    "Chấp hành tốt các quy định về chuẩn bị bài của bộ môn.",
    "Kiến thức cốt lõi hiểu bản chất, vận dụng được mức độ khá.",
    "Lực học môn này khá đều đặn, ít bị sụt giảm phong độ."
  ];

  const datComments = [
    "Nắm được kiến thức cơ bản, tuy nhiên cần chủ động, tích cực hơn.",
    "Có cố gắng trong học tập, nhưng kĩ năng làm bài còn chậm.",
    "Đạt yêu cầu bộ môn. Cần dành thêm thời gian tự học ở nhà.",
    "Khả năng tiếp thu đạt mức khá. Cần nỗ lực ôn tập thường xuyên.",
    "Nắm được kiến thức căn bản nhất để vượt qua bài kiểm tra.",
    "Cần phát huy sự tự học cao độ hơn để nâng mức thành tích.",
    "Hiểu được một phần lý thuyết nhưng khi áp dụng vào bài tập hơi lúng túng.",
    "Em cần để tâm vào bài giảng hơn để nắm được điểm cốt yếu.",
    "Nội dung học chỉ ở mức vừa đủ đạt ngưỡng yêu cầu môn.",
    "Chưa thật sự đào sâu kiến thức, mới dừng lại ở ghi nhớ bề ngoài.",
    "Điểm số bài thi vừa đáp ứng chuẩn chương trình.",
    "Thiếu sự tự tin khi giải quyết các dạng câu hỏi phức tạp.",
    "Vẫn còn tình trạng quên bài ở vài thời điểm kiểm tra miệng.",
    "Sự cố gắng có xuất hiện nhưng chưa đủ mạnh mẽ.",
    "Mức độ tập trung chỉ đạt tầm trung, dễ bị phân tán.",
    "Cần rèn cho mình sự cẩn thận để không bị mất điểm cơ bản đáng tiếc.",
    "Thời gian tự mày mò bài học tại lớp thấp, chủ yếu thụ động nghe.",
    "Đạt chuẩn kĩ năng đầu ra nhưng hoàn toàn có thể làm tốt hơn.",
    "Hy vọng học kì sau em sẽ quyết tâm để kết quả khởi sắc.",
    "Được công nhận Đạt chỉ nhờ sự cải thiện ở phút chót."
  ];

  const cdComments = [
    "Chưa nắm vững kiến thức bộ môn. Cần nỗ lực ôn luyện và trao đổi bài nhiều hơn.",
    "Đôi lúc thiếu tập trung trong giờ. Chưa tự giác làm bài tập về nhà.",
    "Kĩ năng giải quyết vấn đề môn học hạn chế. Cần tăng cường phụ đạo.",
    "Kết quả đánh giá chưa đạt yêu cầu bộ môn. Cần thay đổi phương pháp học.",
    "Thường xuyên mất điểm vì thiếu kiến thức nền tảng trầm trọng.",
    "Không chuẩn bị kĩ lưỡng trước buổi học dẫn đến tiếp thu dưới chuẩn.",
    "Năng lực bộ môn nằm ở mức khẩn động, gia đình cần đốc thúc.",
    "Tỉ lệ làm sai bài còn quá cao, hoàn toàn chưa đạt yêu cầu môn.",
    "Em dường như không theo kịp tốc độ truyền tải kiến thức chung.",
    "Chưa ý thức được mức độ quan trọng của môn học.",
    "Bài kiểm tra thường xuyên bị liệt hoặc yếu kém.",
    "Ngại hỏi bạn bè và không nhờ giáo viên hướng dẫn khi chưa hiểu.",
    "Hành xử thụ động đến mức để hổng một mảng lớn nội dung môn.",
    "Chưa thuộc bài cũ rất nhiều lần dẫn đến không hiểu bài mới.",
    "Kỹ năng xử lý môn này hầu như chưa hiện hữu rõ rệt.",
    "Kết quả rất thấp đe dọa trực tiếp quá trình lên lớp.",
    "Hoàn toàn thiếu nghiêm túc trong các tiết ôn tập và giải bài.",
    "Ngồi nhầm điểm tựa năng lực, cần một lộ trình đặc biệt từ người dạy.",
    "Đã được nhắc nhở nhiều lần nhưng không ghi nhận sự cải thiện nào.",
    "Chưa đạt yêu cầu đề ra đối với mọi mặt của bộ môn."
  ];

  return {
    "Tốt": { min: 8, max: 10, code: "T", mucDG: "T", comments: totComments },
    "Khá": { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: khaComments },
    "Đạt": { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: datComments },
    "Chưa Đạt": { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: cdComments },
    "T": { min: 8, max: 10, code: "T", mucDG: "T", comments: totComments },
    "H": { min: 5, max: 7.9, code: "H", mucDG: "H", comments: datComments },
    "C": { min: 0, max: 4.9, code: "C", mucDG: "C", comments: cdComments },
  };
};

export const getEmptySoGhiNhanXet = (mon, cap, hocKyParam) => {
  if (cap === "THCS" || cap === "THPT") {
    return getEmptySubject(mon, cap);
  }

  let m = mon || "";
  let hk = hocKyParam || "";
  
  if (m.includes("_")) {
    const parts = m.split("_");
    if (parts.length >= 2) {
      if (!hk) hk = parts.pop();
      m = parts.join("_");
    }
  }
  
  const safeM = m.trim().toLowerCase();
  const safeHK = hk.trim().toLowerCase();
  
  const subjectStr = safeM ? `môn ${m.replace(/^(môn\s*)/i, '')}` : "môn học";
  const skillWord = safeM ? (safeM.includes('công nghệ') || safeM.includes('tin học') || safeM.includes('khoa học') || safeM.includes('nghệ thuật') || safeM.includes('âm nhạc') || safeM.includes('mỹ thuật') || safeM.includes('mĩ thuật') || safeM.includes('giáo dục thể chất') || safeM.includes('hoạt động trải nghiệm') ? 'thực hành' : 'vận dụng') : 'vận dụng';
  
  return {
      "Nhận xét chung": {
        min: 0,
        max: 10,
        code: "",
        comments: [
          `Hoàn thành tốt các nhiệm vụ học tập ${subjectStr}, tích cực phát biểu xây dựng bài.`,
          `Tiếp thu kiến thức mới nhanh chóng, có kĩ năng giải quyết vấn đề tốt ${subjectStr}.`,
          `Đi học chuyên cần, luôn có ý thức tự giác học tập ${subjectStr} và làm bài đầy đủ.`,
          `Biết vận dụng kiến thức ${subjectStr} đã học vào thực tế linh hoạt và hiệu quả.`,
          `Chăm chỉ, chịu khó tìm tòi và mở rộng hiểu biết về ${subjectStr}.`,
          `Có tinh thần hợp tác tốt trong các hoạt động nhóm, đóng góp tích cực cho ${subjectStr}.`,
          `Thể hiện thái độ học tập nghiêm túc, chú ý lắng nghe bài giảng ${subjectStr}.`,
          `Nắm chắc các nội dung cốt lõi của ${subjectStr}, tự tin trong học tập.`,
          `Có khả năng tư duy logic tốt, lập luận chặt chẽ trong các bài tập ${subjectStr}.`,
          `Biết cách tự học, tự ôn tập và củng cố kiến thức ${subjectStr} thường xuyên.`,
          `Tích cực tham gia các phong trào học tập, đạt kết quả tiến bộ rõ nét.`,
          `Có nhiều cố gắng trong việc cải thiện phương pháp học ${subjectStr} để tiến bộ hơn.`,
          `Luôn hoàn thành đúng hạn các bài tập và sản phẩm học tập ${subjectStr} được giao.`,
          `Thể hiện sự chủ động, sáng tạo trong cách trình bày và giải bài ${subjectStr}.`,
          `Nắm vững kiến thức trọng tâm, biết cách tóm tắt và ghi nhớ logic môn học.`,
          `Có năng lực ${skillWord} tốt, thao tác nhanh nhẹn và chính xác ${subjectStr}.`,
          `Nhận thức đúng và đầy đủ các chuẩn kiến thức kỹ năng ${subjectStr}.`,
          `Có ý chí vươn lên trong học tập, khắc phục tốt những điểm hạn chế của bản thân.`,
          `Thái độ trân trọng môn học, luôn nỗ lực đạt kết quả tốt nhất.`,
          `Sôi nổi, nhiệt tình, có nhiều ý tưởng sáng tạo trong giờ học ${subjectStr}.`
        ]
      },
      "Giữa học kỳ 1": { min: 0, max: 10, code: "", comments: [] },
      "Cuối học kỳ 1": { min: 0, max: 10, code: "", comments: [] },
      "Giữa học kỳ 2": { min: 0, max: 10, code: "", comments: [] },
      "Cuối năm học": { min: 0, max: 10, code: "", comments: [] }
  };
};

export const getEmptyHocBaGVCN_TH = () => {
  return {
    "Nhận xét chung": {
      min: 0,
      max: 10,
      code: "",
      comments: [
        `- Phẩm chất: Em có ý thức rèn luyện đạo đức, sống hòa đồng với bạn.\n- Năng lực: Em nắm được kiến thức kĩ năng cơ bản.\n- Hoạt động: Em tham gia các hoạt động tập thể.`,
        `- Phẩm chất: Em có cố gắng trong rèn luyện.\n- Năng lực: Em tiếp thu kiến thức ở mức đạt yêu cầu.\n- Hoạt động: Em tham gia các hoạt động của lớp.`,
        `- Phẩm chất: Ngoan ngoãn, lễ phép, chấp hành tốt nội quy trường lớp. Tích cực chủ động trong hoạt động học tập.\n- Năng lực: Có năng lực tự chủ - tự học, giao tiếp - hợp tác. Kết quả thực hiện nhiệm vụ ở mức tốt.\n- Hoạt động: Năng nổ tham gia các hoạt động ngoại khóa.`,
        `- Phẩm chất: Em có ý thức tự giác, tinh thần trách nhiệm cao.\n- Năng lực: Em hoàn thành xuất sắc các nhiệm vụ học tập.\n- Hoạt động: Em tích cực bảo vệ tài sản và môi trường học tập.`,
        `- Phẩm chất: Em chăm ngoan, có ý thức tự học và rèn luyện tốt.\n- Năng lực: Em hoàn thành tốt các bài tập và yêu cầu học tập.\n- Hoạt động: Em tích cực trong các phong trào của lớp.`,
        `- Phẩm chất: Em hòa đồng với bạn bè.\n- Năng lực: Em nắm vững kiến thức ở mức cơ bản.\n- Hoạt động: Em tham gia đầy đủ hoạt động của lớp.`,
        `- Phẩm chất: Em chăm chỉ, tự giác, có tinh thần vượt khó trong học tập.\n- Năng lực: Em học tập nghiêm túc, hoàn thành các yêu cầu học tập.\n- Hoạt động: Em tích cực tham gia sinh hoạt tập thể và giữ gìn môi trường học tập.`,
        `- Phẩm chất: Em lễ phép với thầy cô, chan hòa với bạn bè.\n- Năng lực: Em hiểu bài nhanh, làm bài tập đầy đủ và chính xác.\n- Hoạt động: Em tham gia sôi nổi vào các hoạt động nhóm.`,
        `- Phẩm chất: Em có tinh thần tương thân tương ái, hay giúp đỡ bạn.\n- Năng lực: Tư duy tốt, diễn đạt rõ ràng, hiểu nhanh các bài giảng.\n- Hoạt động: Sẵn sàng tham gia các hoạt động do trường lớp tổ chức.`,
        `- Phẩm chất: Em trung thực, thật thà trong học tập và sinh hoạt.\n- Năng lực: Chủ động tìm tòi, sáng tạo trong việc giải quyết bài tập.\n- Hoạt động: Hoạt động đội nhóm xuất sắc.`,
        `- Phẩm chất: Em ngoan, biết vâng lời, có ý thức kỷ luật cao.\n- Năng lực: Nắm chắc kiến thức, kỹ năng giải quyết tình huống tốt.\n- Hoạt động: Tham gia nhiệt tình các phong trào thi đua.`,
        `- Phẩm chất: Em luôn tự giác chấp hành các quy định của lớp.\n- Năng lực: Có khả năng tự học rất tốt, luôn chủ động nghiên cứu bài mới.\n- Hoạt động: Tích cực đóng góp ý tưởng cho hoạt động lớp.`,
        `- Phẩm chất: Em có thái độ học tập nghiêm túc, tôn trọng mọi người.\n- Năng lực: Năng lực tư duy linh hoạt, giải quyết bài tập nhanh chóng.\n- Hoạt động: Tham gia đầy đủ và tích cực các hoạt động văn nghệ.`,
        `- Phẩm chất: Em có lối sống giản dị, gọn gàng và ngăn nắp.\n- Năng lực: Cẩn thận và tỉ mỉ trong từng bài làm, đạt kết quả cao.\n- Hoạt động: Hoàn thành mọi nhiệm vụ khi được phân công.`,
        `- Phẩm chất: Em có tinh thần trách nhiệm với công việc chung.\n- Năng lực: Giao tiếp tự tin, có khả năng trình bày tốt.\n- Hoạt động: Rất hăng hái phong trào lao động, dọn vệ sinh lớp.`,
        `- Phẩm chất: Em có tinh thần đoàn kết, biết quan tâm chia sẻ.\n- Năng lực: Khả năng ghi nhớ tốt, ứng dụng linh hoạt.\n- Hoạt động: Tích cực tham gia câu lạc bộ học thuật.`,
        `- Phẩm chất: Em kiên trì, không nản chí trước bài tập khó.\n- Năng lực: Kiến thức cơ bản vững vàng, kĩ năng tính toán và ngôn ngữ ổn định.\n- Hoạt động: Tích cực trong tiết sinh hoạt lớp.`,
        `- Phẩm chất: Em ngoan ngoãn, hòa nhã với mọi người xung quanh.\n- Năng lực: Có tiến bộ rõ rệt trong các môn tính toán, tư duy.\n- Hoạt động: Tham gia đều đặn các hoạt động thể thao của lớp.`,
        `- Phẩm chất: Em tự tin, dũng cảm nhận lỗi và sửa lỗi.\n- Năng lực: Phát huy tốt thế mạnh của mình trong từng môn học đặc thù.\n- Hoạt động: Chủ động đề xuất các hoạt động tập thể thú vị.`,
        `- Phẩm chất: Em kính trọng người lớn, nhường nhịn em nhỏ hơn.\n- Năng lực: Học tập tích cực, biết cách sắp xếp thời gian hợp lý.\n- Hoạt động: Hưởng ứng nhanh chóng các đợt quyên góp, từ thiện.`,
        `- Phẩm chất: Em luôn giữ lời hứa, được bạn bè tin yêu.\n- Năng lực: Tập trung lắng nghe, ghi chép cẩn thận.\n- Hoạt động: Thường xuyên giúp đỡ bạn bè trong học tập và sinh hoạt.`,
        `- Phẩm chất: Em điềm đạm, khiêm tốn, biết lắng nghe ý kiến người khác.\n- Năng lực: Có tư duy phản biện tốt, cách giải quyết đa dạng.\n- Hoạt động: Đóng góp tích cực ở các buổi ngoại khóa ngoài trời.`,
        `- Phẩm chất: Em có ý thức giữ gìn vệ sinh cá nhân, vệ sinh chung.\n- Năng lực: Có khả năng đọc hiểu tốt, ghi nhớ nhanh.\n- Hoạt động: Tích cực trong phong trào giữ vở sạch, viết chữ đẹp.`,
        `- Phẩm chất: Em yêu lao động, có thái độ trân trọng thành quả người khác.\n- Năng lực: Học tập có phương pháp, hiệu quả tiếp thu cao.\n- Hoạt động: Hoàn thành xuất sắc nhiệm vụ của một sao đỏ.`,
        `- Phẩm chất: Em chân thành, thẳng thắn, có ý thức vươn lên.\n- Năng lực: Vận dụng tốt những kiến thức đã học vào thực tế.\n- Hoạt động: Tham gia rất nghiêm túc các buổi sinh hoạt dưới cờ.`,
        `- Phẩm chất: Em có tình yêu quê hương, đất nước qua các bài vẽ, bài văn.\n- Năng lực: Tư duy nghệ thuật tốt, chữ viết đẹp, cẩn thận.\n- Hoạt động: Thường xuyên góp bài báo tường cho lớp.`,
        `- Phẩm chất: Em có thái độ cầu thị, ham học hỏi.\n- Năng lực: Hiểu nhanh bài học, nhưng đôi lúc cần cẩn thận hơn.\n- Hoạt động: Năng lượng dồi dào trong các hoạt động vui chơi.`,
        `- Phẩm chất: Em biết tự chăm sóc bản thân, gọn gàng sạch sẽ.\n- Năng lực: Kỹ năng tính nhẩm tốt, giao tiếp rõ ràng mạch lạc.\n- Hoạt động: Có nhiều đóng góp cho phong trào thi đua của lớp.`,
        `- Phẩm chất: Em yêu thương động vật và cây cỏ, biết bảo vệ môi trường.\n- Năng lực: Năng lực thẩm mĩ, ngôn ngữ tốt.\n- Hoạt động: Rất năng nổ trong ngày hội trồng cây, dọn vệ sinh.`,
        `- Phẩm chất: Em ngoan hiền, ít nói nhưng hoàn thành tốt nhiệm vụ.\n- Năng lực: Có tiến bộ đáng kể ở môn tiếng việt, tư duy mở rộng.\n- Hoạt động: Cần cố gắng tham gia mạnh dạn hơn ở hoạt động tập thể.`,
        `- Phẩm chất: Em tự giác thực hiện nội quy lớp học, không đi học muộn.\n- Năng lực: Học đều các môn, có tư duy logic.\n- Hoạt động: Luôn hoàn thành phần việc được phân công nhanh chóng.`,
        `- Phẩm chất: Em lễ phép và thân thiện.\n- Năng lực: Khả năng hợp tác rất tốt, luôn biết phân chia nhiệm vụ.\n- Hoạt động: Là cá nhân nòng cốt của lớp trong hoạt động văn nghệ.`,
        `- Phẩm chất: Em chân thật, biết nhận xét chính xác về bạn bè.\n- Năng lực: Thông minh, có kĩ năng giải quyết vấn đề nhạy bén.\n- Hoạt động: Trưởng nhóm xuất sắc của các phong trào.`,
        `- Phẩm chất: Em có ý thức kỷ luật trong các tiết học.\n- Năng lực: Em chủ động giải quyết nhiệm vụ cơ bản.\n- Hoạt động: Bạn khá hăng hái chơi các trò chơi dân gian do trường tổ chức.`,
        `- Phẩm chất: Em gọn gàng, ngăn nắp, có tinh thần tập thể.\n- Năng lực: Diễn đạt bằng văn bản lưu loát.\n- Hoạt động: Thường xuyên nhận vai trò thư ký trong bài tập nhóm.`,
        `- Phẩm chất: Em siêng năng, biết giúp đỡ gia đình.\n- Năng lực: Lắng nghe tốt, biết học hỏi từ lỗi sai.\n- Hoạt động: Hoàn thành mọi nhiệm vụ hoạt động được giao.`,
        `- Phẩm chất: Em kiên nhẫn, luôn tìm thấy điểm tích cực ở người khác.\n- Năng lực: Nhanh nhạy với con số, tính toán giỏi.\n- Hoạt động: Đồng hành cùng lớp trong mọi phong trào lớn nhỏ.`,
        `- Phẩm chất: Em yêu cái đẹp, chăm chút góc học tập gọn gàng.\n- Năng lực: Sáng tạo tốt trong phân môn mĩ thuật.\n- Hoạt động: Hay tham gia làm các sản phẩm thủ công trang trí lớp.`,
        `- Phẩm chất: Em biết kính trọng người già, hướng dẫn em nhỏ.\n- Năng lực: Tổng hợp các kiến thức đã học rất logic.\n- Hoạt động: Đại diện tiêu biểu trong đợt phát động kế hoạch nhỏ.`,
        `- Phẩm chất: Em luôn nở nụ cười, cởi mở thân thiện với mọi người.\n- Năng lực: T tự tin thuyết trình, có tiềm năng về ngôn ngữ.\n- Hoạt động: Là một quản trò vui tính trong các hoạt động nghỉ giữa giờ.`
      ,
        `- Phẩm chất: Em hiền lành, thân thiện với bạn bè xung quanh.\n- Năng lực: Nắm vững kiến thức trọng tâm, tính toán chính xác.\n- Hoạt động: Tích cực tham gia các phong trào văn nghệ trường.`,
        `- Phẩm chất: Em biết kính trên nhường dưới, lễ phép với thầy cô.\n- Năng lực: Năng lực ngôn ngữ phát triển vượt bậc.\n- Hoạt động: Tham gia phong trào kế hoạch nhỏ rất sôi nổi.`,
        `- Phẩm chất: Em sống nhân ái, thường xuyên giúp tuổi người già.\n- Năng lực: Lắng nghe và tiếp thu bài mới nhanh chóng.\n- Hoạt động: Hoàn thành nhiệm vụ giữ gìn vệ sinh lớp học.`,
        `- Phẩm chất: Em thẳng thắn, dũng cảm nhận khuyết điểm và sửa đổi.\n- Năng lực: Cách giải bài tập logic, rõ ràng, sáng tạo.\n- Hoạt động: Đi đầu trong các buổi lao động công ích của lớp.`,
        `- Phẩm chất: Kỷ luật nề nếp tốt, đi học chuyên cần.\n- Năng lực: Nhớ lâu và ứng dụng kiến thức vào thực tế tốt.\n- Hoạt động: Thường xuyên hỗ trợ bạn trong các hoạt động nhóm.`,
        `- Phẩm chất: Gọn gàng ngăn nắp, biết tự chăm lo bản thân.\n- Năng lực: Trình bày sạch đẹp, có ý thức rèn chữ giữ vở.\n- Hoạt động: Tích cực xây dựng quỹ vì người nghèo.`,
        `- Phẩm chất: Em yêu lao động, trân trọng sản phẩm mình tạo ra.\n- Năng lực: Khả năng tự học cao, tập trung tìm tòi tài liệu.\n- Hoạt động: Năng nổ trong ngày hội thể thao của trường.`,
        `- Phẩm chất: Em khoan dung, không giận hờn bạn bè khi có xích mích.\n- Năng lực: Tiến bộ nhiều về khả năng tính nhẩm.\n- Hoạt động: Tham gia đầy đủ vào nhóm trực nhật hàng tuần.`,
        `- Phẩm chất: Em luôn giữ chữ tín với bạn bè và thầy cô.\n- Năng lực: Sáng tạo trong các môn học có tính nghệ thuật.\n- Hoạt động: Đóng góp bài viết hay cho báo tường của lớp.`,
        `- Phẩm chất: Biết chia sẻ và đồng cảm với mọi người.\n- Năng lực: Trả lời rành mạch, to rõ và lưu loát các câu hỏi.\n- Hoạt động: Hưởng ứng nhanh chóng các đợt thi đua sao đỏ.`,
        `- Phẩm chất: Em ngoan, hòa nhã, ít khi vi phạm nội quy lớp.\n- Năng lực: Đọc bài diễn cảm, hiểu bài học sâu sắc.\n- Hoạt động: Nhiệt tình tham gia chuẩn bị đạo cụ cho lớp.`,
        `- Phẩm chất: Rất kính trọng người lớn tuổi.\n- Năng lực: Phát huy hiệu quả việc tự giác học nhóm.\n- Hoạt động: Tham gia tốt các hội thi bảo vệ môi trường.`,
        `- Phẩm chất: Thể hiện tính trung thực trong kiểm tra và thi cử.\n- Năng lực: Thích khám phá, có tư duy khoa học.\n- Hoạt động: Hoàn thành xuất sắc bài tập của câu lạc bộ.`,
        `- Phẩm chất: Em rất điềm đạm, khiêm nhường.\n- Năng lực: Thể hiện vốn từ vựng phong phú, làm văn tốt.\n- Hoạt động: Luôn đồng hành cùng lớp trong dã ngoại thực tế.`,
        `- Phẩm chất: Em luôn bảo vệ của công và giữ gìn lớp học.\n- Năng lực: Tốc độ hoàn thành bài tập khá tốt.\n- Hoạt động: Nhiệt tình cùng các bạn dọn dẹp vệ sinh trường.`,
        `- Phẩm chất: Tinh thần vượt khó, nỗ lực vươn lên.\n- Năng lực: Hiểu cơ bản các vấn đề, biết cách áp dụng.\n- Hoạt động: Đóng góp công sức lớn trong ngày hội làm lồng đèn.`,
        `- Phẩm chất: Có ý thức tự giác học quy tắc ứng xử.\n- Năng lực: Có tiến bộ đáng kể ở các môn Khoa học, Tự nhiên.\n- Hoạt động: Chuyên cần trong mọi lịch sinh hoạt tập thể của đội.`,
        `- Phẩm chất: Em có lòng biết ơn và trân trọng mọi người.\n- Năng lực: Có khả năng tự nghiên cứu và phản biện.\n- Hoạt động: Xung phong làm người dẫn chương trình cho sự kiện lớp.`,
        `- Phẩm chất: Giữ được nề nếp kỷ luật tốt từ đầu năm.\n- Năng lực: Tư duy nhạy bén, biết cách xử lý bài nâng cao.\n- Hoạt động: Rất năng nổ tổ chức trò chơi cho các bạn giờ ra chơi.`,
        `- Phẩm chất: Tính tình vui vẻ, lạc quan.\n- Năng lực: Tiến bộ nhanh về mặt ngữ pháp và đọc hiểu.\n- Hoạt động: Là một trong những đội viên gương mẫu nhất.`,
        `- Phẩm chất: Sống hòa đồng, thân thiết với tập thể.\n- Năng lực: Tập trung 100% trong giờ học lý thuyết.\n- Hoạt động: Có đóng góp ý tưởng xuất sắc vào kế hoạch dã ngoại.`,
        `- Phẩm chất: Biết quý trọng thời gian học tập và sinh hoạt.\n- Năng lực: Luôn chủ động hoàn thiện kỹ năng làm bài còn yếu.\n- Hoạt động: Tham gia trồng và chăm sóc cây sân trường.`,
        `- Phẩm chất: Em sống nhân ái, có thái độ chừng mực.\n- Năng lực: Diễn đạt vấn đề khúc chiết, dễ hiểu.\n- Hoạt động: Tham gia thi kể chuyện và đạt kết quả khích lệ.`,
        `- Phẩm chất: Em ngoan ngoãn và chăm lo công việc gia đình.\n- Năng lực: Khả năng phân tích bài đọc rất vững.\n- Hoạt động: Đứng ra hòa giải các tranh cãi nhỏ khi hoạt động nhóm.`,
        `- Phẩm chất: Em có sự tự tin, luôn bảo vệ cái đúng.\n- Năng lực: Ghi nhớ công thức và vận dụng tính đúng.\n- Hoạt động: Rất tích cực vào các cuộc thi ảnh do đoàn trường phát động.`,
        `- Phẩm chất: Kính thầy, mến bạn, được đánh giá cao về đạo đức.\n- Năng lực: Khả năng hợp tác và phân chia bài tập rất khoa học.\n- Hoạt động: Thực hành vẽ lưu niệm cùng câu lạc bộ tốt.`,
        `- Phẩm chất: Em giản dị, ít nói nhưng chân thành.\n- Năng lực: Duy trì khả năng học toán ở mức giỏi lâu dài.\n- Hoạt động: Hưởng ứng đợt thu gom giấy vụn rất tốt.`,
        `- Phẩm chất: Biết yêu thương thực vật, động vật xung quanh.\n- Năng lực: Có khả năng truyền đạt kiến thức lại cho bạn bè.\n- Hoạt động: Chủ động đề nghị hỗ trợ cô giáo trong giờ ra chơi.`,
        `- Phẩm chất: Ý thức và tinh thần tập thể đứng top đầu lớp.\n- Năng lực: Khắc phục điểm yếu nhanh, học tập linh hoạt.\n- Hoạt động: Rất hòa đồng, tham gia tốt các trò múa hát tập thể.`,
        `- Phẩm chất: Có thói quen gọn gàng sạch sẽ.\n- Năng lực: Cảm thụ bài văn hay, ngôn ngữ viết đa dạng.\n- Hoạt động: Không vắng mặt trong bất kỳ phong trào đợt lễ nào.`,
        `- Phẩm chất: Nhiệt tình, có suy nghĩ thấu đáo.\n- Năng lực: Học giỏi đều các phân môn lý thuyết, khoa học.\n- Hoạt động: Quản lý nhóm mình làm việc vô cùng chuyên nghiệp.`,
        `- Phẩm chất: Thái độ ôn hòa, tránh xa các cuộc ẩu đả.\n- Năng lực: Hoàn thành vở bài tập không cần nhắc nhở.\n- Hoạt động: Tham gia trò chơi vận động vô cùng nhiệt huyết.`,
        `- Phẩm chất: Em trung thực tuyệt đối trong sinh hoạt.\n- Năng lực: Có đầu óc hệ thống, liệt kê kiến thức rõ ràng.\n- Hoạt động: Sáng tạo khi lên ý tưởng trang trí bảng tin lớp.`,
        `- Phẩm chất: Em chịu khó học hỏi, thái độ cầu thị tiến bộ.\n- Năng lực: Kết quả khảo sát định kỳ có bước đột phá.\n- Hoạt động: Phối hợp ăn ý với ban cán sự lớp lập kế hoạch tuần.`,
        `- Phẩm chất: Biết nhường nhịn, yêu trẻ nhỏ.\n- Năng lực: Thông minh nhanh nhẹn, năng lực suy luận tốt.\n- Hoạt động: Đóng vai trò hạt nhân thúc đẩy các hoạt động sinh hoạt sao.`,
        `- Phẩm chất: Tự giác giữ gìn tài sản cá nhân tốt.\n- Năng lực: Trí nhớ bền, vận dụng kĩ năng học được linh hoạt.\n- Hoạt động: Sẵn sàng trực nhật, không ngại lau dọn.`,
        `- Phẩm chất: Em có sự kiên trì bền bỉ làm bài.\n- Năng lực: Tổng kết kiến thức từng học kỳ khá vững chắc.\n- Hoạt động: Chủ động lên kịch bản múa hát cho lễ khai giảng.`,
        `- Phẩm chất: Trái tim ấm áp, sẵn sàng từ thiện.\n- Năng lực: Thuyết trình hùng biện to rõ trước lớp.\n- Hoạt động: Được khen ngợi trong chiến dịch mùa hè xanh.`,
        `- Phẩm chất: Dũng cảm đi đầu trong việc giữ nội quy.\n- Năng lực: Năng lực thích ứng và tự chủ cực kỳ mạnh mẽ.\n- Hoạt động: Là tuyên truyền viên măng non xuất sắc nhất.`,
        `- Phẩm chất: Em biết trân trọng giá trị truyền thống, lịch sử gia đình.\n- Năng lực: Hoàn thiện kỹ năng môn nghệ thuật rất thẩm mỹ.\n- Hoạt động: Xung phong làm đại sứ văn hóa đọc của lớp.`
      ]
    }
  };
};

export const getEmptyHocBaGVCN = () => {
  return {
    "Nhận xét chung": {
      min: 0,
      max: 10,
      code: "",
      comments: [
        `- Phẩm chất: Chăm ngoan, lễ phép, có trách nhiệm.
- Năng lực: Tự chủ và tự học tốt, giao tiếp tự tin. Hoàn thành xuất sắc nhiệm vụ học tập và rèn luyện.`,
        `- Phẩm chất: Ngoan ngoãn, hòa đồng, tích cực tham gia hoạt động lớp.
- Năng lực: Có khả năng giải quyết vấn đề sáng tạo. Kết quả rèn luyện tốt.`,
        `- Phẩm chất: Trung thực, có tinh thần đoàn kết.
- Năng lực: Hợp tác nhóm hiệu quả, ngôn ngữ lưu loát. Luôn nỗ lực vươn lên trong học tập.`,
        `- Phẩm chất: Có ý thức kỷ luật cao, tôn trọng thầy cô.
- Năng lực: Năng lực tự học tốt, tư duy logic. Hoàn thành tốt các nội dung giáo dục.`,
        `- Phẩm chất: Nhân ái, hay giúp đỡ bạn bè.
- Năng lực: Có năng khiếu đặc thù, tích cực phát biểu. Kết quả học tập và rèn luyện tiến bộ rõ rệt.`,
        `- Phẩm chất: Tác phong nhanh nhẹn, gương mẫu.
- Năng lực: Khả năng tự chủ trong học tập cao. Luôn đi đầu trong các phong trào của đội và trường.`,
        `- Phẩm chất: Chấp hành tốt nội quy, trung thực.
- Năng lực: Giao tiếp lịch sự, hợp tác tích cực. Có ý thức tự giác cao trong các hoạt động giáo dục.`,
        `- Phẩm chất: Lễ phép, khiêm tốn.
- Năng lực: Năng lực tính toán và ngôn ngữ ổn định. Cần phát huy hơn nữa tinh thần chủ động trong giờ học.`,
        `- Phẩm chất: Chăm chỉ, có trách nhiệm với việc chung.
- Năng lực: Tiếp thu bài nhanh, vận dụng kiến thức linh hoạt. Đạt kết quả học tập tốt.`,
        `- Phẩm chất: Ý thức tổ chức kỷ luật tốt, hòa nhã.
- Năng lực: Giải quyết vấn đề nhạy bén. Chủ động chuẩn bị bài chu đáo trước khi đến lớp.`,
        `- Phẩm chất: Ngoan, lễ phép, trung thực.
- Năng lực: Có năng lực tự học, tự nghiên cứu. Kết quả thực hiện các nhiệm vụ học tập ở mức tốt.`,
        `- Phẩm chất: Có tinh thần vượt khó, kiên trì.
- Năng lực: Khả năng hợp tác và chia sẻ với bạn bè tốt. Luôn hoàn thành nhiệm vụ đúng hạn.`,
        `- Phẩm chất: Tôn trọng tập thể, có nếp sống văn minh.
- Năng lực: Năng lực thẩm mỹ tốt. Tích cực tham gia các hoạt động ngoại khóa.`,
        `- Phẩm chất: Hiền lành, lễ phép, đoàn kết.
- Năng lực: Có kĩ năng làm việc nhóm hiệu quả. Cần mạnh dạn hơn trong giao tiếp trước đám đông.`,
        `- Phẩm chất: Có ý thức giữ gìn vệ sinh chung tốt.
- Năng lực: Năng lực tin học và ngoại ngữ có khởi sắc. Luôn nỗ lực đạt kết quả cao.`,
        `- Phẩm chất: Trách nhiệm, tự trọng.
- Năng lực: Tư duy phản biện khá tốt. Có ý thức tìm tòi, sáng tạo trong học tập. Rèn luyện đạo đức tốt.`,
        `- Phẩm chất: Biết vâng lời, thực hiện tốt nội quy.
- Năng lực: Năng lực giao tiếp ở mức tốt. Hoàn thành đầy đủ các yêu cầu rèn luyện.`,
        `- Phẩm chất: Tích cực tham gia lao động và vệ sinh.
- Năng lực: Có khả năng tự đánh giá và điều chỉnh hành vi. Học tập có nhiều tiến bộ.`,
        `- Phẩm chất: Lòng tự trọng cao, trung thực.
- Năng lực: Tiếp thu kiến thức nền tảng vững vàng. Luôn hăng hái tham gia xây dựng bài.`,
        `- Phẩm chất: Khiêm tốn, biết lắng nghe.
- Năng lực: Khả năng giải quyết tình huống tốt. Có tinh thần cầu tiến trong học tập.`,
        `- Phẩm chất: Ngoan, lễ phép, có lối sống lành mạnh.
- Năng lực: Có tiềm năng phát triển các môn khoa học. Kết quả học tập đạt mức khá tốt.`,
        `- Phẩm chất: Ý thức tự giác chấp hành pháp luật và nội quy.
- Năng lực: Phân tích vấn đề thấu đáo. Hoàn thành nhiệm vụ ở mức tốt.`,
        `- Phẩm chất: Đoàn kết, sẵn lòng giúp người khác.
- Năng lực: Năng lực hợp tác rất đáng khen ngợi. Có phương pháp học tập khoa học.`,
        `- Phẩm chất: Chăm ngoan, biết kính trên nhường dưới.
- Năng lực: Năng lực ngôn ngữ phát triển. Hoàn thành tốt chương trình học tập môn học.`,
        `- Phẩm chất: Tự tin, mạnh dạn trong các hoạt động.
- Năng lực: Có tố chất lãnh đạo nhóm. Cần rèn luyện tính kiên nhẫn hơn.`,
        `- Phẩm chất: Trung thực, thẳng thắn.
- Năng lực: Khả năng tự học và tự quản tốt. Luôn duy trì phong độ học tập ổn định.`,
        `- Phẩm chất: Lễ phép, có ý thức bảo vệ môi trường.
- Năng lực: Năng lực thẩm mỹ và thể chất phát triển cân đối. Rèn luyện tốt.`,
        `- Phẩm chất: Chăm chỉ học tập, nếp sống gọn gàng.
- Năng lực: Khả năng ghi nhớ và tái hiện kiến thức tốt. Đạt kết quả giáo dục cao.`,
        `- Phẩm chất: Hòa đồng, thân thiện với bạn bè.
- Năng lực: Có năng khiếu nghệ thuật, tích cực đóng góp cho lớp. Kết quả học tập khá.`,
        `- Phẩm chất: Phẩm chất đạo đức tốt, lối sống giản dị.
- Năng lực: Tư duy độc lập, sáng tạo. Hoàn thành xuất sắc vai trò cá nhân trong tổ.`,
        `- Phẩm chất: Nghiêm túc thực hiện các nhiệm vụ giáo dục.
- Năng lực: Khả năng giao tiếp bằng ngoại ngữ có tiến bộ. Cần nỗ lực hơn.`,
        `- Phẩm chất: Tôn trọng lẽ phải, trung thực.
- Năng lực: Năng lực giải quyết vấn đề hiệu quả. Có ý thức học hỏi bạn bè xung quanh.`,
        `- Phẩm chất: Ngoan, hiền, có ý thức kỷ luật.
- Năng lực: Năng lực tự học ở mức ổn định. Cần tập trung hơn vào các môn học thực hành.`,
        `- Phẩm chất: Có tinh thần tập thể cao, trung thực.
- Năng lực: Năng lực đặc thù từng môn học đạt yêu cầu. Rèn luyện đạo đức khá tốt.`,
        `- Phẩm chất: Luôn kính trọng thầy cô và người lớn.
- Năng lực: Tiếp thu bài bản, trình bày rõ ràng. Đạt mục tiêu học tập năm học.`,
        `- Phẩm chất: Chấp hành nghiêm chỉnh nề nếp trường lớp.
- Năng lực: Có sự chuyển biến tích cực trong nhận thức. Hoàn thành nhiệm vụ rèn luyện.`,
        `- Phẩm chất: Nhân ái, biết sẻ chia khó khăn.
- Năng lực: Năng lực hợp tác nhóm tiến bộ. Cần phát huy tính tự chủ trong việc chuẩn bị bài.`,
        `- Phẩm chất: Có thái độ học tập cầu thị, lễ phép.
- Năng lực: Vận dụng tốt kĩ năng đã học vào thực tế. Kết quả đạt mức khá giỏi.`,
        `- Phẩm chất: Ngoan ngoãn, ham học hỏi.
- Năng lực: Có năng lực tự học và phát hiện vấn đề tốt. Luôn duy trì thái độ tích cực.`,
        `- Phẩm chất: Biết giữ gìn danh dự bản thân và lớp.
- Năng lực: Khả năng giao tiếp linh hoạt. Luôn cố gắng hoàn thành tốt mọi nhiệm vụ.`,
      ]
    }
  };
};

export const getEmptyHieuTruong = (khoi) => {
  let comment = "Duyệt nội dung trên";
  if (khoi === "5") {
    comment = "Duyệt các nội dung trên. Học sinh đủ điều kiện dự xét Hoàn thành chương trình giáo dục Tiểu học.";
  } else if (khoi === "9") {
    comment = "Duyệt các nội dung trên. Học sinh đủ điều kiện dự xét Hoàn thành chương trình giáo dục THCS.";
  } else if (khoi === "12") {
    comment = "Duyệt các nội dung trên. Học sinh đủ điều kiện dự xét Hoàn thành chương trình giáo dục THPT.";
  }

  return {
    "Nhận xét chung": {
      min: 0,
      max: 10,
      code: "",
      mucDG: "",
      comments: [comment]
    }
  };
};

export const getEmptyVneduNlpcHb = (khoi) => {
  return {
    "Năng lực chung": {
      "Nhận xét chung": { comments: [
        "Em hình thành và phát triển tốt các năng lực cốt lõi; luôn chủ động, tự giác và hoàn thành xuất sắc các nhiệm vụ học tập.",
        "Có ý thức tự chủ cao trong học tập, biết phối hợp nhịp nhàng cùng bạn bè và linh hoạt xử lý tốt các tình huống trên lớp.",
        "Phát huy tốt các năng lực chung, tích cực tham gia xây dựng bài và luôn nỗ lực vượt qua khó khăn để đạt kết quả tốt nhất.",
        "Khả năng tự học và làm việc nhóm tiến bộ rõ rệt; luôn chủ động, sáng tạo và hoàn thành tốt mọi nhiệm vụ được giao.",
        "Biết cách tự quản lý thời gian học tập khoa học, mạnh dạn trao đổi ý kiến và tích cực hợp tác với thầy cô, bạn bè."
      ] },
      "Tự chủ và tự học": { comments: [
        "Có ý thức tự giác học tập và chuẩn bị bài chu đáo; biết tự kiểm tra, đánh giá kết quả làm bài của bản thân.",
        "Tích cực, chủ động tìm tòi kiến thức mới; luôn hoàn thành tốt các bài tập và nhiệm vụ được giao mà không cần nhắc nhở.",
        "Biết tự lập kế hoạch học tập cá nhân hợp lý, chú ý lắng nghe thầy cô giảng bài và chăm chỉ rèn luyện mỗi ngày.",
        "Tự tin thực hiện các bài tập độc lập, biết tự khắc phục khó khăn và luôn nỗ lực vươn lên đạt thành tích cao trong học tập.",
        "Rèn luyện tốt nền nếp tự học ở lớp cũng như ở nhà; luôn chủ động hỏi thầy cô khi gặp những nội dung bài học chưa hiểu."
      ] },
      "Giao tiếp và hợp tác": { comments: [
        "Giao tiếp tự tin, diễn đạt rõ ràng và mạch lạc; biết lắng nghe, tôn trọng và chia sẻ ý kiến với các bạn trong nhóm.",
        "Có tinh thần đồng đội cao, nhiệt tình hỗ trợ bạn bè cùng tiến bộ và biết phân công công việc hiệu quả khi thảo luận.",
        "Mạnh dạn bày tỏ quan điểm cá nhân trước lớp, luôn hòa đồng, thân thiện và tạo được sự gắn kết chặt chẽ với tập thể.",
        "Kỹ năng làm việc nhóm rất tốt, luôn biết lắng nghe ý kiến đóng góp của người khác để hoàn thiện nhiệm vụ chung của tổ.",
        "Diễn đạt lưu loát, lời nói lễ phép, nhã nhặn; phối hợp nhịp nhàng, trách nhiệm cùng bạn bè trong mọi hoạt động của lớp."
      ] },
      "GQVĐ và sáng tạo": { comments: [
        "Tư duy linh hoạt, nhanh nhạy trong xử lý tình huống; biết vận dụng sáng tạo kiến thức đã học vào thực tế bài học.",
        "Chủ động phát hiện vấn đề mới và đề xuất nhiều ý tưởng giải quyết độc đáo, hiệu quả trong quá trình học tập trên lớp.",
        "Biết phân tích, lựa chọn giải pháp tối ưu cho bài tập; không ngại thử thách với các câu hỏi gợi mở, phát triển tư duy.",
        "Có khả năng quan sát tinh tế và liên hệ thực tiễn tốt; luôn tìm tòi nhiều cách làm hay, mới lạ và phong phú cho bài làm.",
        "Nhanh nhẹn ứng biến trước các tình huống bất ngờ; biết cách tháo gỡ khó khăn và hoàn thành nhiệm vụ với kết quả cao."
      ] }
    },
    "Năng lực đặc thù": {
      "Nhận xét năng lực đặc thù": { comments: [
        "Nắm vững kiến thức các môn học đặc thù, có khả năng tư duy ngôn ngữ, tính toán và vận dụng thực hành rất tốt.",
        "Phát triển toàn diện về tư duy logic, cảm thụ thẩm mỹ và năng lực thể chất; luôn hoàn thành xuất sắc các nội dung học tập.",
        "Tiếp thu nhanh các môn khoa học, tính toán chuẩn xác và thể hiện năng khiếu nổi bật ở các môn học mang tính thực hành.",
        "Có sự tiến bộ vượt bậc ở các kỹ năng đặc thù; biết kết hợp hài hòa giữa kiến thức lý thuyết và thực hành vào cuộc sống.",
        "Năng lực đặc thù phát triển đồng đều, đạt chuẩn kiến thức kỹ năng môn học và có nhiều đóng góp tích cực cho phong trào lớp."
      ] },
      "Ngôn ngữ": { comments: [
        "Vốn từ phong phú, đọc to rõ, diễn cảm tốt; biết dùng từ đặt câu chuẩn xác và viết đoạn văn giàu cảm xúc, sinh động.",
        "Khả năng cảm thụ văn học tốt, diễn đạt gãy gọn, lưu loát; có thói quen đọc sách và giữ gìn vở sạch, viết chữ đẹp cẩn thận.",
        "Phát âm chuẩn, giao tiếp lưu loát và tự tin; bài viết trình bày khoa học, đúng ngữ pháp và sử dụng từ ngữ giàu hình ảnh.",
        "Biết cách tóm tắt và trình bày lại nội dung bài học mạch lạc; tích cực phát biểu, giọng đọc tự nhiên và truyền cảm.",
        "Nắm chắc các quy tắc chính tả và ngữ pháp; biết lựa chọn từ ngữ phù hợp để chia sẻ suy nghĩ, tình cảm của mình trước lớp."
      ] },
      "Tính toán": { comments: [
        "Kỹ năng tính nhẩm nhanh và chính xác; nắm chắc các công thức toán học và biết trình bày lời giải rõ ràng, mạch lạc, logic.",
        "Có tư duy toán học nhạy bén, hiểu đề nhanh; biết phân tích dữ liệu và tìm ra phương pháp giải tối ưu cho bài toán.",
        "Thực hiện thành thạo các phép tính cơ bản và nâng cao; cẩn thận, tỉ mỉ và luôn kiểm tra kỹ kết quả trước khi nộp bài.",
        "Khả năng suy luận logic tốt, biết vận dụng kiến thức số học và hình học vào giải quyết các bài toán thực tế đời sống.",
        "Nắm vững quy trình giải toán có lời văn; trình bày bài giải sạch đẹp, chữ số rõ ràng và đạt độ chính xác rất cao."
      ] },
      "Khoa học": { comments: [
        "Say mê tìm hiểu thế giới tự nhiên xung quanh; biết quan sát, làm thí nghiệm đơn giản và rút ra kết luận đúng đắn.",
        "Hiểu rõ mối quan hệ giữa con người và môi trường; luôn có ý thức giữ gìn, bảo vệ cây xanh và tài nguyên thiên nhiên.",
        "Nắm chắc các hiện tượng tự nhiên và xã hội cơ bản; biết áp dụng kiến thức vệ sinh phòng bệnh vào chăm sóc bản thân.",
        "Thích khám phá, tích cực đặt câu hỏi khoa học; biết thu thập thông tin và giải thích các hiện tượng thực tế đơn giản.",
        "Có ý thức bảo vệ môi trường sống sạch đẹp; tích cực tham gia các phong trào chăm sóc bồn hoa, cây cảnh của trường lớp."
      ] },
      "Công nghệ": { comments: [
        "Hiểu rõ quy trình sử dụng các vật liệu, dụng cụ công nghệ; thao tác lắp ghép mô hình cẩn thận, an toàn và chắc chắn.",
        "Yêu thích sáng tạo kỹ thuật, khéo léo hoàn thiện các sản phẩm học cụ; biết bảo quản, giữ gìn tốt đồ dùng thực hành.",
        "Nắm vững nguyên lý hoạt động cơ bản của sản phẩm công nghệ trong gia đình; có ý thức sử dụng đồ điện tiết kiệm, an toàn.",
        "Thực hành lắp ráp nhanh nhẹn, chuẩn xác theo sơ đồ hướng dẫn; luôn giữ gìn vệ sinh nơi học tập sau giờ thực hành."
      ] },
      "Tin học": { comments: [
        "Thao tác chuột và bàn phím thành thạo, đúng tư thế; nắm bắt nhanh các thao tác cơ bản trên phần mềm học tập trên máy.",
        "Có kỹ năng sử dụng máy tính tốt, tự giác chấp hành nghiêm chỉnh nội quy phòng tin học và bảo vệ thiết bị cẩn thận.",
        "Biết tìm kiếm và xử lý thông tin đơn giản phục vụ học tập; hứng thú với các phần mềm luyện gõ và đồ họa thiếu nhi.",
        "Thực hiện chuẩn xác các bước lưu trữ và mở tệp; vận dụng linh hoạt kỹ năng tin học để hoàn thành tốt bài tập trên lớp."
      ] },
      "Thẩm mĩ": { comments: [
        "Có năng khiếu mỹ thuật và cảm thụ âm nhạc tốt; biết phối hợp màu sắc hài hòa và thể hiện bức vẽ giàu tính sáng tạo.",
        "Cảm nhận tinh tế về cái đẹp xung quanh; tự tin biểu diễn các giai điệu bài hát và hào hứng tham gia hoạt động văn nghệ.",
        "Bàn tay khéo léo, sản phẩm mỹ thuật trình bày sạch đẹp, độc đáo; biết tôn trọng và gìn giữ thành quả sáng tạo của bạn bè.",
        "Biết bộc lộ cảm xúc trong sáng qua nét vẽ và tiếng hát; đóng góp nhiều ý tưởng trang trí bảng tin, lớp học đẹp mắt.",
        "Có gu thẩm mỹ phong phú, nét vẽ sinh động, hồn nhiên; luôn hoàn thành tốt các tác phẩm nghệ thuật đúng thời gian."
      ] },
      "Thể chất": { comments: [
        "Thể lực tốt, tác phong nhanh nhẹn, hoạt bát; luôn tích cực tham gia các bài tập rèn luyện thể chất và trò chơi vận động.",
        "Thực hiện chuẩn xác các động tác thể dục cơ bản; có ý thức rèn luyện thân thể hàng ngày và giữ gìn vệ sinh cá nhân sạch sẽ.",
        "Chăm chỉ vận động, yêu thích thể thao; biết phối hợp nhịp nhàng cùng các bạn trong các bài tập phối hợp đội hình đội ngũ.",
        "Có thói quen ăn mặc phù hợp với thời tiết; biết cách tự chăm sóc, bảo vệ sức khỏe và phòng tránh chấn thương khi vận động.",
        "Năng nổ, bền bỉ trong các hoạt động thể dục thể thao; luôn giữ tinh thần thoải mái, sảng khoái và tràn đầy năng lượng."
      ] }
    },
    "Phẩm chất": {
      "Nhận xét chung": { comments: [
        "Em có phẩm chất đạo đức tốt, chăm ngoan, lễ phép với thầy cô và luôn đoàn kết, hòa nhã, giúp đỡ bạn bè xung quanh.",
        "Ý thức kỷ luật cao, gương mẫu chấp hành tốt nội quy trường lớp; luôn thể hiện lối sống trung thực, giản dị và trách nhiệm.",
        "Phát triển toàn diện các phẩm chất cốt lõi; luôn giữ chữ tín, giàu lòng nhân ái và có tinh thần vượt khó trong học tập.",
        "Ngoan ngoãn, trung thực, có tinh thần trách nhiệm cao với tập thể; tích cực tham gia các phong trào thi đua của lớp và trường.",
        "Lễ phép với người lớn, chan hòa cùng bạn bè; có lối sống lành mạnh, giàu lòng yêu thương và có tinh thần trách nhiệm."
      ] },
      "Yêu nước": { comments: [
        "Có lòng tự hào về quê hương đất nước; biết kính trọng các thế hệ đi trước và có ý thức giữ gìn bản sắc văn hóa dân tộc.",
        "Nghiêm túc khi chào cờ và hát Quốc ca; có ý thức bảo vệ của công, giữ gìn cảnh quan môi trường học đường xanh sạch đẹp.",
        "Kính trọng thầy cô giáo, yêu thương gia đình; tích cực tìm hiểu về lịch sử, truyền thống tốt đẹp của quê hương, đất nước.",
        "Luôn tự giác bảo vệ tài sản chung của trường lớp; có thái độ trân trọng và tôn vinh những nét đẹp văn hóa truyền thống.",
        "Thể hiện tình yêu quê hương qua từng việc làm nhỏ; hăng hái tham gia các hoạt động kỷ niệm, phong trào đền ơn đáp nghĩa."
      ] },
      "Nhân ái": { comments: [
        "Sống chan hòa, ấm áp và giàu lòng vị tha; luôn sẵn lòng lắng nghe, chia sẻ và tương trợ bạn bè gặp hoàn cảnh khó khăn.",
        "Kính trọng người lớn tuổi, nhường nhịn các em nhỏ; tích cực hưởng ứng các hoạt động thiện nguyện, quyên góp giúp đỡ cộng đồng.",
        "Biết cảm thông và chia sẻ niềm vui, nỗi buồn cùng bạn bè; không phân biệt đối xử và luôn xây dựng tình bạn trong sáng, lành mạnh.",
        "Biết nói lời cảm ơn, xin lỗi chân thành; tôn trọng sự khác biệt của mọi người và luôn gìn giữ mối quan hệ bạn bè hòa thuận.",
        "Có trái tim nhân hậu, yêu thương con người và vạn vật xung quanh; luôn cư xử lịch thiệp, nhã nhặn và mang niềm vui đến cho mọi người."
      ] },
      "Chăm chỉ": { comments: [
        "Chăm ngoan, đi học chuyên cần, đúng giờ; luôn tập trung chú ý nghe giảng và hoàn thành đầy đủ bài vở trước khi đến lớp.",
        "Chịu khó tìm tòi học hỏi, có tinh thần vượt khó trong học tập; luôn kiên trì, nhẫn nại hoàn thành tốt mọi bài tập được giao.",
        "Tự giác lao động vệ sinh trường lớp sạch sẽ; biết đỡ đần cha mẹ những công việc vừa sức tại gia đình một cách nhiệt tình.",
        "Luôn duy trì thói quen đọc sách và tự ôn tập hàng ngày; có ý thức vươn lên đạt kết quả học tập ngày càng tiến bộ hơn.",
        "Chăm chỉ tham gia các hoạt động tập thể; cần cù, siêng năng trong từng việc làm và luôn giữ thái độ học tập nghiêm túc, bền bỉ."
      ] },
      "Trung thực": { comments: [
        "Thật thà, ngay thẳng trong học tập và rèn luyện; không gian lận trong kiểm tra, luôn dũng cảm nhận lỗi và quyết tâm sửa đổi.",
        "Luôn nói đúng sự thật, biết giữ lời hứa với thầy cô và bạn bè; được tập thể lớp hết sức tin yêu và quý trọng.",
        "Tôn trọng lẽ phải, biết bảo vệ cái đúng; khi nhặt được của rơi luôn chủ động đem trả lại cho người đánh mất.",
        "Có lòng tự trọng cao, thành thật chia sẻ suy nghĩ của bản thân; không bao che cho những hành vi sai trái của bạn bè.",
        "Thể hiện sự ngay thẳng trong từng lời nói và việc làm; luôn bảo đảm tính chính xác và trung thực trong mọi kết quả học tập."
      ] },
      "Trách nhiệm": { comments: [
        "Có tinh thần trách nhiệm cao đối với bản thân và tập thể; luôn chủ động hoàn thành xuất sắc các phần việc được giao.",
        "Tự giác chấp hành nghiêm chỉnh nội quy, quy định trường lớp; biết tự bảo quản đồ dùng học tập và tài sản chung của lớp.",
        "Nhiệt tình với công việc chung của tổ, lớp; sẵn sàng đứng ra nhận trách nhiệm và tìm cách khắc phục tồn tại kịp thời.",
        "Biết lắng nghe và tiếp thu chân thành những lời góp ý của thầy cô, bạn bè để tự hoàn thiện bản thân mỗi ngày.",
        "Luôn gương mẫu thực hiện nếp sống văn minh; có ý thức bảo vệ môi trường và đóng góp tích cực xây dựng tập thể lớp vững mạnh."
      ] }
    }
  };
};

export const migrateData = (data) => {
  if (!data || Object.keys(data).length === 0 || !data.THCS) return { data: generateAllSampleData(), migrated: true };
  
  let migrated = false;
  // Migrate for new roles if missing
  for (const cap in data) {
    if (cap === "migrated_v3") continue;
    for (const khoi in data[cap]) {
      if (!data[cap][khoi]) continue;
      if (data[cap][khoi].HOC_BA) {
        delete data[cap][khoi].HOC_BA;
        migrated = true;
      }
      if (!data[cap][khoi].HOC_BA_GVBM) {
        data[cap][khoi].HOC_BA_GVBM = getEmptyHocBaGVBM();
        migrated = true;
      }
      if (!data[cap][khoi].HOC_BA_GVCN) {
        data[cap][khoi].HOC_BA_GVCN = getEmptyHocBaGVCN();
        migrated = true;
      }
      if (!data[cap][khoi].HIEU_TRUONG) {
        data[cap][khoi].HIEU_TRUONG = getEmptyHieuTruong(khoi);
        migrated = true;
      }
      const checkKey = cap === "TH" ? "Tiếng Việt" : "Ngữ văn_Học kỳ 1";
      if (!data[cap][khoi].SO_GHI_NHAN_XET || !data[cap][khoi].SO_GHI_NHAN_XET[checkKey] || !data[cap][khoi].SO_GHI_NHAN_XET[checkKey]["Nhận xét chung"]) {
        data[cap][khoi].SO_GHI_NHAN_XET = {};
        const subjects = getSubjects(cap, khoi);
        for (const mon of subjects) {
          if (cap === "THCS" || cap === "THPT") {
            data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 1`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 1");
            data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 2`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 2");
            data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Cả năm`] = getEmptySoGhiNhanXet(mon, cap, "Cả năm");
          } else {
            data[cap][khoi].SO_GHI_NHAN_XET[mon] = getEmptySoGhiNhanXet(mon, cap);
          }
        }
        migrated = true;
      }
      if (!data[cap][khoi].DGTX) {
        data[cap][khoi].DGTX = {};
        migrated = true;
      }
      if (cap === "TH" && !data[cap][khoi].TH_NLPC) {
        data[cap][khoi].TH_NLPC = getEmptyThNlPc();
        migrated = true;
      }
    }
  }

  if (!data.migrated_v5) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
          if (data[cap][khoi]) {
            data[cap][khoi].HOC_BA_GVBM = getEmptyHocBaGVBM();
            data[cap][khoi].HOC_BA_GVCN = getEmptyHocBaGVCN();
            data[cap][khoi].HIEU_TRUONG = getEmptyHieuTruong(khoi);
            if (cap === "TH") data[cap][khoi].TH_NLPC = getEmptyThNlPc();
          }
      }
    }
    data.migrated_v5 = true;
    migrated = true;
  }

  if (!data.migrated_v6) {
    for (const cap in data) {
      if (cap.startsWith("migrated_") || cap !== "TH") continue;
      for (const khoi in data[cap]) {
          if (data[cap][khoi]) {
            // Update GVBM
            const subjects = getSubjects(cap, khoi);
            const emptyHocBaGVBM = getEmptyHocBaGVBM();
            const emptyHocBaGVCN = getEmptyHocBaGVCN();
            const emptyHieuTruong = getEmptyHieuTruong(khoi);
            
            for (const mon of subjects) {
              if (!data[cap][khoi].GVBM[mon]) {
                data[cap][khoi].GVBM[mon] = getEmptySubject(mon, cap);
              } else {
                const emptySb = getEmptySubject(mon, cap);
                for (const lv of EVAL_LEVELS_TH) {
                  if (!data[cap][khoi].GVBM[mon][lv]) {
                    data[cap][khoi].GVBM[mon][lv] = emptySb[lv];
                  }
                }
              }
            }

            for (const lv of EVAL_LEVELS_TH) {
              if (!data[cap][khoi].HOC_BA_GVBM[lv]) data[cap][khoi].HOC_BA_GVBM[lv] = emptyHocBaGVBM[lv];
              if (!data[cap][khoi].HOC_BA_GVCN[lv]) data[cap][khoi].HOC_BA_GVCN[lv] = emptyHocBaGVCN[lv];
              if (!data[cap][khoi].HIEU_TRUONG[lv]) data[cap][khoi].HIEU_TRUONG[lv] = emptyHieuTruong[lv];
            }
          }
      }
    }
    data.migrated_v6 = true;
    migrated = true;
  }

  if (!data.migrated_v7) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (data[cap][khoi]) {
          if (!data[cap][khoi].DGTX) {
            data[cap][khoi].DGTX = {};
          }
          const subjects = getSubjects(cap, khoi);
          for (const mon of subjects) {
            if (!data[cap][khoi].DGTX[mon]) {
              data[cap][khoi].DGTX[mon] = getEmptyDGTX(mon);
            }
          }
        }
      }
    }
    data.migrated_v7 = true;
    migrated = true;
  }

  if (!data.migrated_v8) {
    for (const khoi in data["TH"] || {}) {
      if (data["TH"][khoi] && data["TH"][khoi].HOC_BA_GVCN) {
        const emptyHocBaGVCN = getEmptyHocBaGVCN();
        for (const lv of EVAL_LEVELS_TH) {
           data["TH"][khoi].HOC_BA_GVCN[lv] = emptyHocBaGVCN[lv];
        }
      }
    }
    data.migrated_v8 = true;
    migrated = true;
  }

  if (!data.migrated_v9) {
    for (const khoi in data["TH"] || {}) {
      if (data["TH"][khoi]) {
        if (!data["TH"][khoi].DGTX) data["TH"][khoi].DGTX = {};
        for (const subj of DGTX_TONG_HOP_SUBJECTS) {
           data["TH"][khoi].DGTX[subj] = getEmptyDGTX(subj);
        }
      }
    }
    data.migrated_v9 = true;
    migrated = true;
  }

  if (!data.migrated_v10) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi]) continue;
        
        // Reset HOC_BA_GVBM
        if (data[cap][khoi].HOC_BA_GVBM) {
          data[cap][khoi].HOC_BA_GVBM = getEmptyHocBaGVBM();
        }
        
        // Reset HOC_BA_GVCN
        if (data[cap][khoi].HOC_BA_GVCN) {
          data[cap][khoi].HOC_BA_GVCN = getEmptyHocBaGVCN();
        }

        if (cap === "TH") {
          data[cap][khoi].TH_NLPC = getEmptyThNlPc();
          
          // Migrate TH GVBM to have periods
          const subjects = getSubjects(cap, khoi);
          for (const mon of subjects) {
             if (!data[cap][khoi].GVBM[`${mon}_Giữa học kỳ 1`]) data[cap][khoi].GVBM[`${mon}_Giữa học kỳ 1`] = getEmptySubject(mon, cap, "Giữa học kỳ 1");
             if (!data[cap][khoi].GVBM[`${mon}_Cuối học kỳ 1`]) data[cap][khoi].GVBM[`${mon}_Cuối học kỳ 1`] = getEmptySubject(mon, cap, "Cuối học kỳ 1");
             if (!data[cap][khoi].GVBM[`${mon}_Giữa học kỳ 2`]) data[cap][khoi].GVBM[`${mon}_Giữa học kỳ 2`] = getEmptySubject(mon, cap, "Giữa học kỳ 2");
             if (!data[cap][khoi].GVBM[`${mon}_Cuối năm học`]) data[cap][khoi].GVBM[`${mon}_Cuối năm học`] = getEmptySubject(mon, cap, "Cuối năm học");
          }
        }

        // Reset DGTX
        if (data[cap][khoi].DGTX) {
          const subjects = getSubjects(cap, khoi);
          for (const mon of subjects) {
             data[cap][khoi].DGTX[mon] = getEmptyDGTX(mon);
          }
          if (cap === "TH") {
            for (const subj of DGTX_TONG_HOP_SUBJECTS) {
               data[cap][khoi].DGTX[subj] = getEmptyDGTX(subj);
            }
          }
        }
      }
    }
    data.migrated_v10 = true;
    migrated = true;
  }

  if (!data.migrated_v11) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi]) continue;
        if (data[cap][khoi].DGTX) {
          for (const subj in data[cap][khoi].DGTX) {
            if (data[cap][khoi].DGTX[subj] && data[cap][khoi].DGTX[subj]["Chung"]) {
              data[cap][khoi].DGTX[subj] = getEmptyDGTX(subj);
            }
          }
        }
      }
    }
    data.migrated_v11 = true;
    migrated = true;
  }

  if (!data.migrated_v12) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi]) continue;
        
        // Reset DGTX
        if (data[cap][khoi].DGTX) {
          const subjects = getDGTXSubjects(cap, khoi);
          for (const mon of subjects) {
             data[cap][khoi].DGTX[mon] = getEmptyDGTX(mon);
          }
        }
      }
    }
    data.migrated_v12 = true;
    migrated = true;
  }

  if (!data.migrated_v16) {
    if (data.TH) {
      for (const khoi in data.TH) {
        if (!data.TH[khoi]) continue;
        const renameKeys = (obj) => {
          if (!obj) return;
          if (obj["Hoàn thành Tốt"] && !obj["T"]) { obj["T"] = obj["Hoàn thành Tốt"]; delete obj["Hoàn thành Tốt"]; }
          if (obj["Hoàn thành"] && !obj["H"]) { obj["H"] = obj["Hoàn thành"]; delete obj["Hoàn thành"]; }
          if (obj["Chưa hoàn thành"] && !obj["C"]) { obj["C"] = obj["Chưa hoàn thành"]; delete obj["Chưa hoàn thành"]; }
        };
        
        if (data.TH[khoi].GVBM) {
          for (const mon in data.TH[khoi].GVBM) {
            renameKeys(data.TH[khoi].GVBM[mon]);
          }
        }
        renameKeys(data.TH[khoi].HOC_BA_GVBM);
        renameKeys(data.TH[khoi].HOC_BA_GVCN);
        renameKeys(data.TH[khoi].HIEU_TRUONG);
      }
    }
    data.migrated_v16 = true;
    migrated = true;
  }

  // Handle old array formats in GVBM Toán
  try {
    const testObj = data.THCS["6"].GVBM["Toán"];
    if (testObj && (Array.isArray(testObj["Giỏi"]) || Array.isArray(testObj["Tốt"])), undefined, khoi) {
       // Deeply corrupted with old version format, just regenerate
       return { data: generateAllSampleData(), migrated: true };
    }
  } catch (e) {}

  if (!data.migrated_v15) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi]) continue;
        data[cap][khoi].HOC_BA_GVCN = getEmptyHocBaGVCN();
      }
    }
    data.migrated_v15 = true;
    migrated = true;
  }

  if (!data.migrated_v17) {
    if (data.TH) {
      for (const khoi in data.TH) {
        if (!data.TH[khoi]) continue;
        const renameV17 = (obj) => {
          if (!obj) return;
          if (obj["T"] && !obj["Tốt"]) { obj["Tốt"] = obj["T"]; delete obj["T"]; }
          if (obj["H"] && !obj["Khá"]) { obj["Khá"] = obj["H"]; delete obj["H"]; }
          // If we also want to provide "Đạt" as a clone of "H" if missing:
          if (obj["Khá"] && !obj["Đạt"]) { obj["Đạt"] = JSON.parse(JSON.stringify(obj["Khá"])); obj["Đạt"].code = "Đ"; obj["Đạt"].min = 5; obj["Đạt"].max = 6.4; obj["Đạt"].mucDG = "H"; }
          if (obj["C"] && !obj["Chưa Đạt"]) { obj["Chưa Đạt"] = obj["C"]; delete obj["C"]; }
        };
        
        if (data.TH[khoi].GVBM) {
          for (const mon in data.TH[khoi].GVBM) {
            renameV17(data.TH[khoi].GVBM[mon]);
          }
        }
        if (data.TH[khoi].DGTX) {
          for (const mon in data.TH[khoi].DGTX) {
            renameV17(data.TH[khoi].DGTX[mon]);
          }
        }
        renameV17(data.TH[khoi].HOC_BA_GVBM);
        renameV17(data.TH[khoi].HOC_BA_GVCN);
        renameV17(data.TH[khoi].HIEU_TRUONG);
      }
    }
    data.migrated_v17 = true;
    migrated = true;
  }

  
  if (!data.migrated_v18) {
    const addMucDG = (obj) => {
      if (!obj) return;
      for (const key in obj) {
          if (obj[key] && typeof obj[key] === 'object') {
              if (obj[key].mucDG === undefined) {
                  const c = (obj[key].code || "").toUpperCase();
                  if (c === "T" || c === "TỐT") obj[key].mucDG = "T";
                  else if (c === "K" || c === "KHÁ" || c === "H" || c === "HT") obj[key].mucDG = "H";
                  else if (c === "Đ" || c === "D" || c === "ĐẠT") obj[key].mucDG = "Đ";
                  else if (c === "CĐ" || c === "C" || c === "CHT" || c === "Y") obj[key].mucDG = "C";
                  else obj[key].mucDG = "";
              }
          }
      }
    };
    for (const cap in data) {
       if (cap.startsWith('migrated_')) continue;
       for (const khoi in data[cap]) {
           if (!data[cap][khoi]) continue;
           
           if (data[cap][khoi].GVBM) {
              for (const mon in data[cap][khoi].GVBM) addMucDG(data[cap][khoi].GVBM[mon]);
           }
           if (data[cap][khoi].DGTX) {
              for (const mon in data[cap][khoi].DGTX) addMucDG(data[cap][khoi].DGTX[mon]);
           }
           addMucDG(data[cap][khoi].HOC_BA_GVBM);
           addMucDG(data[cap][khoi].HIEU_TRUONG);
           if (data[cap][khoi].TH_NLPC) addMucDG(data[cap][khoi].TH_NLPC);
       }
    }
    data.migrated_v18 = true;
    migrated = true;
  }

  if (!data.migrated_v19) {
    const updateMucDGDat = (obj) => {
      if (!obj) return;
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && obj[key].code === 'Đ') {
           if (obj[key].mucDG === 'Đ') {
               obj[key].mucDG = 'H';
           }
        }
      }
    };
    for (const cap in data) {
       if (cap.startsWith('migrated_')) continue;
       for (const khoi in data[cap]) {
           if (!data[cap][khoi]) continue;
           
           if (data[cap][khoi].GVBM) {
              for (const mon in data[cap][khoi].GVBM) updateMucDGDat(data[cap][khoi].GVBM[mon]);
           }
           if (data[cap][khoi].DGTX) {
              for (const mon in data[cap][khoi].DGTX) updateMucDGDat(data[cap][khoi].DGTX[mon]);
           }
           updateMucDGDat(data[cap][khoi].HOC_BA_GVBM);
           updateMucDGDat(data[cap][khoi].HIEU_TRUONG);
           // TH_NLPC uses 'Đ' not 'H'
       }
    }
    data.migrated_v19 = true;
    migrated = true;
  }

  if (!data.migrated_v20) {
    for (const khoi in data.TH || {}) {
      if (data.TH[khoi] && data.TH[khoi].TH_NLPC) {
        const dObj = data.TH[khoi].TH_NLPC["Đạt"];
        if (dObj && dObj.code === "D") {
          dObj.code = "Đ";
        }
      }
    }
    data.migrated_v20 = true;
    migrated = true;
  }

  if (!data.migrated_v23) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi] || !data[cap][khoi].DGTX) continue;
        const dgtxKeys = Object.keys(data[cap][khoi].DGTX);
        const existingMainKeys = new Set();
        
        for (const k of dgtxKeys) {
          if (k.endsWith("_Thang9")) {
            const mainKey = k.replace("_Thang9", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 9, khoi);
          } else if (k.endsWith("_Thang10")) {
            const mainKey = k.replace("_Thang10", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 10, khoi);
          }
        }
        
        // Ensure that any main key that exists has both Thang9 and Thang10
        for (const mainKey of existingMainKeys) {
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang9`]) data[cap][khoi].DGTX[`${mainKey}_Thang9`] = getEmptyDGTX(mainKey, 9, khoi);
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang10`]) data[cap][khoi].DGTX[`${mainKey}_Thang10`] = getEmptyDGTX(mainKey, 10, khoi);
        }
        // Also ensure all subjects have _Thang9 and _Thang10 initialized
        const subjects = getDGTXSubjects(cap, khoi);
        for (const mon of subjects) {
           const t9Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang9` : `${mon}_Thang9`;
           data[cap][khoi].DGTX[t9Key] = getEmptyDGTX(mon, 9, khoi);
           
           const t10Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang10` : `${mon}_Thang10`;
           data[cap][khoi].DGTX[t10Key] = getEmptyDGTX(mon, 10, khoi);
           
           if (cap === "TH") {
               const nlcKey = `${mon}_Nhận xét năng lực chung_Thang9`;
               const nldKey = `${mon}_Nhận xét năng lực đặc thù_Thang9`;
               const pcKey = `${mon}_Nhận xét phẩm chất chủ yếu_Thang9`;
               data[cap][khoi].DGTX[nlcKey] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 9, khoi);
               data[cap][khoi].DGTX[nldKey] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 9, khoi);
               data[cap][khoi].DGTX[pcKey] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 9, khoi);

               const nlc10Key = `${mon}_Nhận xét năng lực chung_Thang10`;
               const nld10Key = `${mon}_Nhận xét năng lực đặc thù_Thang10`;
               const pc10Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang10`;
               data[cap][khoi].DGTX[nlc10Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 10, khoi);
               data[cap][khoi].DGTX[nld10Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 10, khoi);
               data[cap][khoi].DGTX[pc10Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 10, khoi);
           }
        }
        
        if (cap === "TH") {
             const thSubjects = ["Sổ tổng hợp - Môn học và HĐGD", "Sổ tổng hợp - Năng lực chung", "Sổ tổng hợp - Năng lực đặc thù", "Sổ tổng hợp - Phẩm chất chủ yếu"];
             for (const subj of thSubjects) {
                  data[cap][khoi].DGTX[`${subj}_Thang9`] = getEmptyDGTX(subj, 9, khoi);
                  data[cap][khoi].DGTX[`${subj}_Thang10`] = getEmptyDGTX(subj, 10, khoi);
             }
        }
      }
    }
    data.migrated_v23 = true;
    migrated = true;
  }


  if (!data.migrated_v24) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi] || !data[cap][khoi].DGTX) continue;
        const dgtxKeys = Object.keys(data[cap][khoi].DGTX);
        const existingMainKeys = new Set();
        
        for (const k of dgtxKeys) {
          if (k.endsWith("_Thang9")) {
            const mainKey = k.replace("_Thang9", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 9, khoi);
          } else if (k.endsWith("_Thang10")) {
            const mainKey = k.replace("_Thang10", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 10, khoi);
          } else if (k.endsWith("_Thang11")) {
            const mainKey = k.replace("_Thang11", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 11, khoi);
          } else if (k.endsWith("_Thang12")) {
            const mainKey = k.replace("_Thang12", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 12, khoi);
          }
        }
        
        // Ensure that any main key that exists has 9, 10, 11, 12
        for (const mainKey of existingMainKeys) {
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang9`]) data[cap][khoi].DGTX[`${mainKey}_Thang9`] = getEmptyDGTX(mainKey, 9, khoi);
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang10`]) data[cap][khoi].DGTX[`${mainKey}_Thang10`] = getEmptyDGTX(mainKey, 10, khoi);
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang11`]) data[cap][khoi].DGTX[`${mainKey}_Thang11`] = getEmptyDGTX(mainKey, 11, khoi);
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang12`]) data[cap][khoi].DGTX[`${mainKey}_Thang12`] = getEmptyDGTX(mainKey, 12, khoi);
        }
        
        const subjects = getDGTXSubjects(cap, khoi);
        for (const mon of subjects) {
           const t11Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang11` : `${mon}_Thang11`;
           data[cap][khoi].DGTX[t11Key] = getEmptyDGTX(mon, 11, khoi);
           
           const t12Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang12` : `${mon}_Thang12`;
           data[cap][khoi].DGTX[t12Key] = getEmptyDGTX(mon, 12, khoi);
           
           if (cap === "TH") {
               const nlc11Key = `${mon}_Nhận xét năng lực chung_Thang11`;
               const nld11Key = `${mon}_Nhận xét năng lực đặc thù_Thang11`;
               const pc11Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang11`;
               data[cap][khoi].DGTX[nlc11Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 11, khoi);
               data[cap][khoi].DGTX[nld11Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 11, khoi);
               data[cap][khoi].DGTX[pc11Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 11, khoi);

               const nlc12Key = `${mon}_Nhận xét năng lực chung_Thang12`;
               const nld12Key = `${mon}_Nhận xét năng lực đặc thù_Thang12`;
               const pc12Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang12`;
               data[cap][khoi].DGTX[nlc12Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 12, khoi);
               data[cap][khoi].DGTX[nld12Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 12, khoi);
               data[cap][khoi].DGTX[pc12Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 12, khoi);
           }
        }
        
        if (cap === "TH") {
             const thSubjects = ["Sổ tổng hợp - Môn học và HĐGD", "Sổ tổng hợp - Năng lực chung", "Sổ tổng hợp - Năng lực đặc thù", "Sổ tổng hợp - Phẩm chất chủ yếu"];
             for (const subj of thSubjects) {
                  data[cap][khoi].DGTX[`${subj}_Thang11`] = getEmptyDGTX(subj, 11, khoi);
                  data[cap][khoi].DGTX[`${subj}_Thang12`] = getEmptyDGTX(subj, 12, khoi);
             }
        }
      }
    }
    data.migrated_v24 = true;
    migrated = true;
  }


  if (!data.migrated_v25) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi] || !data[cap][khoi].DGTX) continue;
        const dgtxKeys = Object.keys(data[cap][khoi].DGTX);
        const existingMainKeys = new Set();
        
        for (const k of dgtxKeys) {
          if (k.endsWith("_Thang9")) {
            const mainKey = k.replace("_Thang9", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 9, khoi);
          } else if (k.endsWith("_Thang10")) {
            const mainKey = k.replace("_Thang10", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 10, khoi);
          } else if (k.endsWith("_Thang11")) {
            const mainKey = k.replace("_Thang11", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 11, khoi);
          } else if (k.endsWith("_Thang12")) {
            const mainKey = k.replace("_Thang12", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 12, khoi);
          } else if (k.endsWith("_Thang1")) {
            const mainKey = k.replace("_Thang1", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 1, khoi);
          } else if (k.endsWith("_Thang2")) {
            const mainKey = k.replace("_Thang2", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 2, khoi);
          }
        }
        
        // Ensure that any main key that exists has 1, 2
        for (const mainKey of existingMainKeys) {
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang1`]) data[cap][khoi].DGTX[`${mainKey}_Thang1`] = getEmptyDGTX(mainKey, 1, khoi);
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang2`]) data[cap][khoi].DGTX[`${mainKey}_Thang2`] = getEmptyDGTX(mainKey, 2, khoi);
        }
        
        const subjects = getDGTXSubjects(cap, khoi);
        for (const mon of subjects) {
           const t1Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang1` : `${mon}_Thang1`;
           data[cap][khoi].DGTX[t1Key] = getEmptyDGTX(mon, 1, khoi);
           
           const t2Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang2` : `${mon}_Thang2`;
           data[cap][khoi].DGTX[t2Key] = getEmptyDGTX(mon, 2, khoi);
           
           if (cap === "TH") {
               const nlc1Key = `${mon}_Nhận xét năng lực chung_Thang1`;
               const nld1Key = `${mon}_Nhận xét năng lực đặc thù_Thang1`;
               const pc1Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang1`;
               data[cap][khoi].DGTX[nlc1Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 1, khoi);
               data[cap][khoi].DGTX[nld1Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 1, khoi);
               data[cap][khoi].DGTX[pc1Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 1, khoi);

               const nlc2Key = `${mon}_Nhận xét năng lực chung_Thang2`;
               const nld2Key = `${mon}_Nhận xét năng lực đặc thù_Thang2`;
               const pc2Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang2`;
               data[cap][khoi].DGTX[nlc2Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 2, khoi);
               data[cap][khoi].DGTX[nld2Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 2, khoi);
               data[cap][khoi].DGTX[pc2Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 2, khoi);
           }
        }
        
        if (cap === "TH") {
             const thSubjects = ["Sổ tổng hợp - Môn học và HĐGD", "Sổ tổng hợp - Năng lực chung", "Sổ tổng hợp - Năng lực đặc thù", "Sổ tổng hợp - Phẩm chất chủ yếu"];
             for (const subj of thSubjects) {
                  data[cap][khoi].DGTX[`${subj}_Thang1`] = getEmptyDGTX(subj, 1, khoi);
                  data[cap][khoi].DGTX[`${subj}_Thang2`] = getEmptyDGTX(subj, 2, khoi);
             }
        }
      }
    }
    data.migrated_v25 = true;
    migrated = true;
  }


  if (!data.migrated_v26) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi] || !data[cap][khoi].DGTX) continue;
        const dgtxKeys = Object.keys(data[cap][khoi].DGTX);
        const existingMainKeys = new Set();
        
        for (const k of dgtxKeys) {
          if (k.endsWith("_Thang3")) {
            const mainKey = k.replace("_Thang3", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 3, khoi);
          } else if (k.endsWith("_Thang4")) {
            const mainKey = k.replace("_Thang4", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 4, khoi);
          }
        }
        
        // Ensure that any main key that exists has 3, 4
        for (const mainKey of existingMainKeys) {
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang3`]) data[cap][khoi].DGTX[`${mainKey}_Thang3`] = getEmptyDGTX(mainKey, 3, khoi);
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang4`]) data[cap][khoi].DGTX[`${mainKey}_Thang4`] = getEmptyDGTX(mainKey, 4, khoi);
        }
        
        const subjects = getDGTXSubjects(cap, khoi);
        for (const mon of subjects) {
           const t3Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang3` : `${mon}_Thang3`;
           data[cap][khoi].DGTX[t3Key] = getEmptyDGTX(mon, 3, khoi);
           
           const t4Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang4` : `${mon}_Thang4`;
           data[cap][khoi].DGTX[t4Key] = getEmptyDGTX(mon, 4, khoi);
           
           if (cap === "TH") {
               const nlc3Key = `${mon}_Nhận xét năng lực chung_Thang3`;
               const nld3Key = `${mon}_Nhận xét năng lực đặc thù_Thang3`;
               const pc3Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang3`;
               data[cap][khoi].DGTX[nlc3Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 3, khoi);
               data[cap][khoi].DGTX[nld3Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 3, khoi);
               data[cap][khoi].DGTX[pc3Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 3, khoi);

               const nlc4Key = `${mon}_Nhận xét năng lực chung_Thang4`;
               const nld4Key = `${mon}_Nhận xét năng lực đặc thù_Thang4`;
               const pc4Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang4`;
               data[cap][khoi].DGTX[nlc4Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 4, khoi);
               data[cap][khoi].DGTX[nld4Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 4, khoi);
               data[cap][khoi].DGTX[pc4Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 4, khoi);
           }
        }
        
        if (cap === "TH") {
             const thSubjects = ["Sổ tổng hợp - Môn học và HĐGD", "Sổ tổng hợp - Năng lực chung", "Sổ tổng hợp - Năng lực đặc thù", "Sổ tổng hợp - Phẩm chất chủ yếu"];
             for (const subj of thSubjects) {
                  data[cap][khoi].DGTX[`${subj}_Thang3`] = getEmptyDGTX(subj, 3, khoi);
                  data[cap][khoi].DGTX[`${subj}_Thang4`] = getEmptyDGTX(subj, 4, khoi);
             }
        }
      }
    }
    data.migrated_v26 = true;
    migrated = true;
  }


  if (!data.migrated_v27) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (!data[cap][khoi] || !data[cap][khoi].DGTX) continue;
        const dgtxKeys = Object.keys(data[cap][khoi].DGTX);
        const existingMainKeys = new Set();
        
        for (const k of dgtxKeys) {
          if (k.endsWith("_Thang5")) {
            const mainKey = k.replace("_Thang5", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 5, khoi);
          } else if (k.endsWith("_Thang8")) {
            const mainKey = k.replace("_Thang8", "");
            existingMainKeys.add(mainKey);
            data[cap][khoi].DGTX[k] = getEmptyDGTX(mainKey, 8, khoi);
          }
        }
        
        // Ensure that any main key that exists has 5, 8
        for (const mainKey of existingMainKeys) {
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang5`]) data[cap][khoi].DGTX[`${mainKey}_Thang5`] = getEmptyDGTX(mainKey, 5, khoi);
           if (!data[cap][khoi].DGTX[`${mainKey}_Thang8`]) data[cap][khoi].DGTX[`${mainKey}_Thang8`] = getEmptyDGTX(mainKey, 8, khoi);
        }
        
        const subjects = getDGTXSubjects(cap, khoi);
        for (const mon of subjects) {
           const t5Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang5` : `${mon}_Thang5`;
           data[cap][khoi].DGTX[t5Key] = getEmptyDGTX(mon, 5, khoi);
           
           const t8Key = cap === "TH" ? `${mon}_Môn học và hoạt động giáo dục_Thang8` : `${mon}_Thang8`;
           data[cap][khoi].DGTX[t8Key] = getEmptyDGTX(mon, 8, khoi);
           
           if (cap === "TH") {
               const nlc5Key = `${mon}_Nhận xét năng lực chung_Thang5`;
               const nld5Key = `${mon}_Nhận xét năng lực đặc thù_Thang5`;
               const pc5Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang5`;
               data[cap][khoi].DGTX[nlc5Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 5, khoi);
               data[cap][khoi].DGTX[nld5Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 5, khoi);
               data[cap][khoi].DGTX[pc5Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 5, khoi);

               const nlc8Key = `${mon}_Nhận xét năng lực chung_Thang8`;
               const nld8Key = `${mon}_Nhận xét năng lực đặc thù_Thang8`;
               const pc8Key = `${mon}_Nhận xét phẩm chất chủ yếu_Thang8`;
               data[cap][khoi].DGTX[nlc8Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực chung`, 8, khoi);
               data[cap][khoi].DGTX[nld8Key] = getEmptyDGTX(`${mon}_Nhận xét năng lực đặc thù`, 8, khoi);
               data[cap][khoi].DGTX[pc8Key] = getEmptyDGTX(`${mon}_Nhận xét phẩm chất chủ yếu`, 8, khoi);
           }
        }
        
        if (cap === "TH") {
             const thSubjects = ["Sổ tổng hợp - Môn học và HĐGD", "Sổ tổng hợp - Năng lực chung", "Sổ tổng hợp - Năng lực đặc thù", "Sổ tổng hợp - Phẩm chất chủ yếu"];
             for (const subj of thSubjects) {
                  data[cap][khoi].DGTX[`${subj}_Thang5`] = getEmptyDGTX(subj, 5, khoi);
                  data[cap][khoi].DGTX[`${subj}_Thang8`] = getEmptyDGTX(subj, 8, khoi);
             }
        }
      }
    }
    data.migrated_v27 = true;
    migrated = true;
  }

  
  if (!data.migrated_v29) {
    for (const khoi in data.TH || {}) {
      if (data.TH[khoi] && data.TH[khoi].HOC_BA_GVCN) {
        data.TH[khoi].HOC_BA_GVCN = getEmptyHocBaGVCN_TH();
      }
    }
    data.migrated_v29 = true;
    migrated = true;
  }

  if (!data.migrated_v30) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap] || {}) {
        if (data[cap][khoi] && data[cap][khoi].HIEU_TRUONG) {
          const oldHT = data[cap][khoi].HIEU_TRUONG;
          if (oldHT["Tốt"] || oldHT["T"]) {
            let allComments = [];
            for (const key in oldHT) {
              if (oldHT[key] && oldHT[key].comments) {
                allComments = allComments.concat(oldHT[key].comments);
              }
            }
            allComments = [...new Set(allComments)];
            if (allComments.length === 0) {
              data[cap][khoi].HIEU_TRUONG = getEmptyHieuTruong(khoi);
            } else {
              data[cap][khoi].HIEU_TRUONG = {
                "Nhận xét chung": {
                  min: 0, max: 10, code: "", mucDG: "", comments: allComments
                }
              };
            }
          }
        }
      }
    }
    data.migrated_v30 = true;
    migrated = true;
  }

  if (!data.migrated_v31) {
    for (const khoi in data.TH || {}) {
      if (data.TH[khoi]) {
        if (!data.TH[khoi].VNEDU_NLPC_HB) {
          data.TH[khoi].VNEDU_NLPC_HB = getEmptyVneduNlpcHb(khoi);
        }
      }
    }
    data.migrated_v31 = true;
    migrated = true;
  }

  if (!data.migrated_v32) {
    for (const khoi in data.TH || {}) {
      if (data.TH[khoi]) {
        // Force overwrite to apply standard PDF comments
        data.TH[khoi].VNEDU_NLPC_HB = getEmptyVneduNlpcHb(khoi);
      }
    }
    data.migrated_v32 = true;
    migrated = true;
  }

  if (!data.migrated_v33) {
    // Force upgrade THCS Pass/Fail subjects
    if (data.THCS) {
        for (const khoi in data.THCS) {
            if (data.THCS[khoi] && data.THCS[khoi].GVBM) {
                ["Giáo dục thể chất", "Nghệ thuật", "Âm nhạc", "Mĩ thuật", "Nội dung giáo dục địa phương"].forEach(subj => {
                    data.THCS[khoi].GVBM[subj] = getEmptySubject(subj, 'THCS');
                });
            }
        }
    }
    // Force upgrade Cong Nghe THCS/THPT
    ['THCS', 'THPT'].forEach(cap => {
        if (data[cap]) {
            for (const khoi in data[cap]) {
                if (data[cap][khoi] && data[cap][khoi].GVBM && data[cap][khoi].GVBM['Công nghệ']) {
                    data[cap][khoi].GVBM['Công nghệ'] = getEmptySubject('Công nghệ', cap);
                }
            }
        }
    });
    data.migrated_v33 = true;
    migrated = true;
  }

  if (!data.migrated_v6_hocky) {
    for (const cap of ["THCS", "THPT"]) {
      if (data[cap]) {
        for (const khoi in data[cap]) {
          if (data[cap][khoi] && data[cap][khoi].GVBM) {
            const gvbm = data[cap][khoi].GVBM;
            const subs = SUBJECTS_MAP[cap] || [];
            for (const sub of subs) {
              if (gvbm[sub]) {
                const subData = gvbm[sub];
                gvbm[`${sub}_Học kỳ 1`] = JSON.parse(JSON.stringify(subData));
                gvbm[`${sub}_Học kỳ 2`] = JSON.parse(JSON.stringify(subData));
                gvbm[`${sub}_Cả năm`] = JSON.parse(JSON.stringify(subData));
                delete gvbm[sub];
              } else {
                gvbm[`${sub}_Học kỳ 1`] = getEmptySubject(sub);
                gvbm[`${sub}_Học kỳ 2`] = getEmptySubject(sub);
                gvbm[`${sub}_Cả năm`] = getEmptySubject(sub);
              }
            }
          }
        }
      }
    }
    data.migrated_v6_hocky = true;
    migrated = true;
  }

  if (!data.migrated_v34) {
    // Force upgrade pass/fail subjects in THCS and THPT for Hoạt động trải nghiệm
    ['THCS', 'THPT'].forEach(cap => {
        if (data[cap]) {
            for (const khoi in data[cap]) {
                if (data[cap][khoi] && data[cap][khoi].GVBM) {
                    ["Giáo dục thể chất", "Nghệ thuật", "Âm nhạc", "Mĩ thuật", "Nội dung giáo dục địa phương", "Hoạt động trải nghiệm", "Hoạt động trải nghiệm, hướng nghiệp"].forEach(subj => {
                        data[cap][khoi].GVBM[subj] = getEmptySubject(subj, cap);
                    });
                }
            }
        }
    });
    data.migrated_v34 = true;
    migrated = true;
  }

  if (!data.migrated_v35) {
    ['THCS', 'THPT'].forEach(cap => {
        if (data[cap]) {
            for (const khoi in data[cap]) {
                if (data[cap][khoi] && data[cap][khoi].GVBM) {
                    ["Giáo dục thể chất", "Nghệ thuật", "Âm nhạc", "Mĩ thuật", "Mỹ thuật", "Nội dung giáo dục địa phương", "Hoạt động trải nghiệm"].forEach(subj => {
                        if (data[cap][khoi].GVBM[`${subj}_Học kỳ 1`]) data[cap][khoi].GVBM[`${subj}_Học kỳ 1`] = getEmptySubject(subj, cap);
                        if (data[cap][khoi].GVBM[`${subj}_Học kỳ 2`]) data[cap][khoi].GVBM[`${subj}_Học kỳ 2`] = getEmptySubject(subj, cap);
                        if (data[cap][khoi].GVBM[`${subj}_Cả năm`]) data[cap][khoi].GVBM[`${subj}_Cả năm`] = getEmptySubject(subj, cap);
                    });
                }
            }
        }
    });
    data.migrated_v35 = true;
    migrated = true;
  }

  if (!data.migrated_v36) {
    ['THCS', 'THPT'].forEach(cap => {
        if (data[cap]) {
            for (const khoi in data[cap]) {
                if (data[cap][khoi] && data[cap][khoi].GVBM) {
                    ["Giáo dục thể chất", "Nghệ thuật", "Âm nhạc", "Mĩ thuật", "Mỹ thuật", "Nội dung giáo dục địa phương", "Hoạt động trải nghiệm", "Hoạt động trải nghiệm, hướng nghiệp", "HĐTN", "GDĐP"].forEach(subj => {
                        if (data[cap][khoi].GVBM[`${subj}_Học kỳ 1`]) data[cap][khoi].GVBM[`${subj}_Học kỳ 1`] = getEmptySubject(subj, cap);
                        if (data[cap][khoi].GVBM[`${subj}_Học kỳ 2`]) data[cap][khoi].GVBM[`${subj}_Học kỳ 2`] = getEmptySubject(subj, cap);
                        if (data[cap][khoi].GVBM[`${subj}_Cả năm`]) data[cap][khoi].GVBM[`${subj}_Cả năm`] = getEmptySubject(subj, cap);
                        if (data[cap][khoi].GVBM[subj]) data[cap][khoi].GVBM[subj] = getEmptySubject(subj, cap);
                    });
                }
            }
        }
    });
    data.migrated_v36 = true;
    migrated = true;
  }

  if (!data.migrated_v37) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (data[cap][khoi]) {
          const checkKey = cap === "TH" ? "Tiếng Việt" : "Ngữ văn_Học kỳ 1";
          if (!data[cap][khoi].SO_GHI_NHAN_XET || !data[cap][khoi].SO_GHI_NHAN_XET[checkKey] || !data[cap][khoi].SO_GHI_NHAN_XET[checkKey]["Nhận xét chung"]) {
            data[cap][khoi].SO_GHI_NHAN_XET = {};
            const subjects = getSubjects(cap, khoi);
            for (const mon of subjects) {
              if (cap === "THCS" || cap === "THPT") {
                data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 1`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 1");
                data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 2`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 2");
              } else {
                data[cap][khoi].SO_GHI_NHAN_XET[mon] = getEmptySoGhiNhanXet(mon, cap);
              }
            }
          }
        }
      }
    }
    data.migrated_v37 = true;
    migrated = true;
  }

  if (!data.migrated_v38) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (data[cap][khoi]) {
          // Force regenerate SO_GHI_NHAN_XET to use subject-specific comments
          data[cap][khoi].SO_GHI_NHAN_XET = {};
          const subjects = getSubjects(cap, khoi);
          for (const mon of subjects) {
            if (cap === "THCS" || cap === "THPT") {
              data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 1`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 1");
              data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 2`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 2");
            } else {
              data[cap][khoi].SO_GHI_NHAN_XET[mon] = getEmptySoGhiNhanXet(mon, cap);
            }
          }
        }
      }
    }
    data.migrated_v38 = true;
    migrated = true;
  }

  if (!data.migrated_v39) {
    for (const cap in data) {
      if (cap.startsWith("migrated_")) continue;
      for (const khoi in data[cap]) {
        if (data[cap][khoi] && (cap === "THCS" || cap === "THPT")) {
          // Force regenerate SO_GHI_NHAN_XET for THCS/THPT to get the scale points
          data[cap][khoi].SO_GHI_NHAN_XET = {};
          const subjects = getSubjects(cap, khoi);
          for (const mon of subjects) {
            data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 1`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 1");
            data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Học kỳ 2`] = getEmptySoGhiNhanXet(mon, cap, "Học kỳ 2");
            data[cap][khoi].SO_GHI_NHAN_XET[`${mon}_Cả năm`] = getEmptySoGhiNhanXet(mon, cap, "Cả năm");
          }
        }
      }
    }
    data.migrated_v39 = true;
    migrated = true;
  }

  if (!data.migrated_v40) {
    if (data.TH) {
      for (const khoi in data.TH) {
        if (data.TH[khoi]) {
          data.TH[khoi].VNEDU_NLPC_HB = getEmptyVneduNlpcHb(khoi);
        }
      }
    }
    data.migrated_v40 = true;
    migrated = true;
  }

  return { data, migrated };
};

export const generateAllSampleData = () => {
  const currentData = { TH: {}, THCS: {}, THPT: {}, migrated_v5: true, migrated_v6: true, migrated_v6_hocky: true, migrated_v7: true, migrated_v8: true, migrated_v9: true, migrated_v10: true, migrated_v11: true, migrated_v12: true, migrated_v13: true, migrated_v14: true, migrated_v15: true, migrated_v16: true, migrated_v17: true, migrated_v18: true, migrated_v19: true, migrated_v20: true, migrated_v21: true, migrated_v22: true, migrated_v23: true, migrated_v24: true, migrated_v25: true, migrated_v26: true, migrated_v27: true, migrated_v28: true, migrated_v29: true, migrated_v30: true, migrated_v31: true, migrated_v32: true, migrated_v33: true, migrated_v34: true, migrated_v35: true, migrated_v36: true, migrated_v37: true, migrated_v38: true, migrated_v39: true, migrated_v40: true };
  for (const capHoc of Object.keys(GRADE_LEVELS)) {
    for (const khoi of GRADE_LEVELS[capHoc]) {
      const h = khoi;
      currentData[capHoc][h] = {
        GVBM: {},
        DGTX: {},
        SO_GHI_NHAN_XET: {},
        HOC_BA_GVBM: getEmptyHocBaGVBM(),
        HOC_BA_GVCN: capHoc === "TH" ? getEmptyHocBaGVCN_TH() : getEmptyHocBaGVCN(),
        HIEU_TRUONG: getEmptyHieuTruong(h),
      };
      
      if (capHoc === "TH") {
        currentData[capHoc][h].TH_NLPC = getEmptyThNlPc();
        currentData[capHoc][h].VNEDU_NLPC_HB = getEmptyVneduNlpcHb(h);
      }

      // Add GVBM samples for all subjects
      const subjects = getSubjects(capHoc, h);
      for (const mon of subjects) {
        if (capHoc === "THCS" || capHoc === "THPT") {
          currentData[capHoc][h].GVBM[`${mon}_Học kỳ 1`] = getEmptySubject(mon, capHoc);
          currentData[capHoc][h].GVBM[`${mon}_Học kỳ 2`] = getEmptySubject(mon, capHoc);
          currentData[capHoc][h].GVBM[`${mon}_Cả năm`] = getEmptySubject(mon, capHoc);
          currentData[capHoc][h].SO_GHI_NHAN_XET[`${mon}_Học kỳ 1`] = getEmptySoGhiNhanXet(mon, capHoc, "Học kỳ 1");
          currentData[capHoc][h].SO_GHI_NHAN_XET[`${mon}_Học kỳ 2`] = getEmptySoGhiNhanXet(mon, capHoc, "Học kỳ 2");
          currentData[capHoc][h].SO_GHI_NHAN_XET[`${mon}_Cả năm`] = getEmptySoGhiNhanXet(mon, capHoc, "Cả năm");
        } else {
          currentData[capHoc][h].GVBM[mon] = getEmptySubject(mon, capHoc);
          currentData[capHoc][h].SO_GHI_NHAN_XET[mon] = getEmptySoGhiNhanXet(mon, capHoc);
        }
      }
      const dgtxSubjects = getDGTXSubjects(capHoc, h);
      for (const mon of dgtxSubjects) {
        currentData[capHoc][h].DGTX[mon] = getEmptyDGTX(mon, undefined, khoi);
      }
    }
  }
  return currentData;
};
