import prisma from './prisma';

const movies = [
  {
    title: 'Tuyển Thủ Dê',
    description: 'Bộ phim hài thể thao kể về hành trình của một đội bóng đá nghiệp dư với giấc mơ vươn tới đỉnh cao.',
    studio: 'Galaxy Studio',
    director: 'Lê Thanh Sơn',
    cast: ['Trấn Thành', 'Anh Tú', 'Khả Như'],
    categories: ['Hài', 'Thể thao'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2024-04-26'),
    duration: 120,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder1.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'hai', 'hot-2024'],
  },
  {
    title: 'Quật Mộ Trùng Ma',
    description: 'Phim kinh dị Hàn Quốc về nhóm pháp sư phải đối mặt với thế lực siêu nhiên khi khai quật ngôi mộ cổ.',
    studio: 'Showbox',
    director: 'Jang Jae-hyun',
    cast: ['Choi Min-sik', 'Kim Go-eun', 'Yoo Hae-jin'],
    categories: ['Kinh dị', 'Tâm linh'],
    status: 'published',
    ageRating: 'T18',
    releaseDate: new Date('2024-02-22'),
    duration: 134,
    language: ['Tiếng Hàn'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder2.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['kinh-di', 'han-quoc', 'hot-2024'],
  },
  {
    title: 'Lật Mặt 7: Một Điều Ước',
    description: 'Phần 7 series Lật Mặt - câu chuyện cảm động về tình cảm gia đình và ước mơ.',
    studio: 'Lý Hải Production',
    director: 'Lý Hải',
    cast: ['Trấn Thành', 'Lý Hải', 'Ốc Thanh Vân'],
    categories: ['Gia đình', 'Tình cảm'],
    status: 'published',
    ageRating: 'P',
    releaseDate: new Date('2024-04-26'),
    duration: 132,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder3.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'gia-dinh', 'lat-mat'],
  },
  {
    title: 'Mai',
    description: 'Câu chuyện tình cảm sâu sắc về cô gái massage tên Mai và cuộc gặp gỡ định mệnh.',
    studio: 'Trấn Thành Town',
    director: 'Trấn Thành',
    cast: ['Phương Anh Đào', 'Tuấn Trần', 'Trấn Thành'],
    categories: ['Tình cảm', 'Tâm lý'],
    status: 'published',
    ageRating: 'T16',
    releaseDate: new Date('2024-02-10'),
    duration: 131,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder4.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'tinh-cam', 'tran-thanh'],
  },
  {
    title: 'Đào, Phở và Piano',
    description: 'Bộ phim tái hiện Hà Nội trong những ngày đầu kháng chiến chống Pháp mùa đông 1946.',
    studio: 'Bộ VH-TT-DL',
    director: 'Phi Tiến Sơn',
    cast: ['Doãn Quốc Đam', 'Cao Thùy Linh'],
    categories: ['Chiến tranh', 'Lịch sử', 'Tình cảm'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2024-02-12'),
    duration: 96,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder5.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'lich-su', 'chien-tranh'],
  },
  {
    title: 'Công Tử Bạc Liêu',
    description: 'Câu chuyện về cuộc đời hào hoa của Công Tử Bạc Liêu - Trần Trinh Huy trong thập niên 1930.',
    studio: 'BHD',
    director: 'Phạm Ngọc Lân',
    cast: ['Song Luân', 'Kaity Nguyễn'],
    categories: ['Lịch sử', 'Tình cảm'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2024-01-01'),
    duration: 115,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder6.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'lich-su'],
  },
  {
    title: 'Avengers: Doomsday',
    description: 'Biệt đội Avengers trở lại để đối đầu với mối đe dọa lớn nhất từ trước đến nay.',
    studio: 'Marvel Studios',
    director: 'Joe Russo, Anthony Russo',
    cast: ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson'],
    categories: ['Hành động', 'Khoa học viễn tưởng'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2025-05-01'),
    duration: 150,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder7.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['marvel', 'avengers', 'blockbuster'],
  },
  {
    title: 'Nhà Bà Nữ',
    description: 'Phim hài gia đình kể về cuộc sống hỗn loạn trong một gia đình Việt Nam nhiều thế hệ.',
    studio: 'Trấn Thành Town',
    director: 'Trấn Thành',
    cast: ['Trấn Thành', 'Lê Giang', 'NSƯT Ngọc Giàu'],
    categories: ['Hài', 'Gia đình'],
    status: 'published',
    ageRating: 'P',
    releaseDate: new Date('2023-01-28'),
    duration: 128,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder8.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'hai', 'gia-dinh'],
  },
  {
    title: 'Hai Muối',
    description: 'Bộ phim tài liệu nghệ thuật khám phá cuộc sống của ngư dân làm muối ven biển miền Trung.',
    studio: 'CGV',
    director: 'Trịnh Đình Lê Minh',
    cast: ['Hoàng Yến Chibi', 'Lạc Hoàng Long'],
    categories: ['Tâm lý', 'Tình cảm'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2023-11-17'),
    duration: 95,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder9.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'tam-ly'],
  },
  {
    title: 'Thanh Sói',
    description: 'Phim hành động Việt Nam về nữ sát thủ trẻ tuổi và thế giới ngầm đầy nguy hiểm.',
    studio: 'Studio68',
    director: 'Ngô Thanh Vân',
    cast: ['Đồng Ánh Quỳnh', 'Ngô Thanh Vân'],
    categories: ['Hành động', 'Tội phạm'],
    status: 'published',
    ageRating: 'T18',
    releaseDate: new Date('2022-12-30'),
    duration: 105,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder10.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'hanh-dong'],
  },
  {
    title: 'Dune: Part Two',
    description: 'Paul Atreides cùng người Fremen chiến đấu chống lại âm mưu của gia tộc Harkonnen.',
    studio: 'Warner Bros.',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Austin Butler'],
    categories: ['Khoa học viễn tưởng', 'Phiêu lưu'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2024-03-01'),
    duration: 166,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder11.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['sci-fi', 'blockbuster', 'dune'],
  },
  {
    title: 'Inside Out 2',
    description: 'Riley bước vào tuổi thiếu niên với những cảm xúc mới: Lo Lắng, Ghen Tị, Chán Nản, Xấu Hổ.',
    studio: 'Pixar',
    director: 'Kelsey Mann',
    cast: ['Amy Poehler', 'Maya Hawke'],
    categories: ['Hoạt hình', 'Gia đình', 'Hài'],
    status: 'published',
    ageRating: 'P',
    releaseDate: new Date('2024-06-14'),
    duration: 96,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder12.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['hoat-hinh', 'pixar', 'gia-dinh'],
  },
  {
    title: 'Deadpool & Wolverine',
    description: 'Deadpool hợp tác với Wolverine trong cuộc phiêu lưu đa vũ trụ điên rồ nhất MCU.',
    studio: 'Marvel Studios',
    director: 'Shawn Levy',
    cast: ['Ryan Reynolds', 'Hugh Jackman'],
    categories: ['Hành động', 'Hài'],
    status: 'published',
    ageRating: 'T18',
    releaseDate: new Date('2024-07-26'),
    duration: 127,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder13.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['marvel', 'hanh-dong', 'hai'],
  },
  {
    title: 'Tiệc Trăng Máu',
    description: 'Remake Việt của Intimate Strangers - nhóm bạn thân chia sẻ bí mật qua điện thoại.',
    studio: 'Lotte Entertainment',
    director: 'Nguyễn Quang Dũng',
    cast: ['Thái Hòa', 'Thu Trang', 'Kiều Minh Tuấn'],
    categories: ['Hài', 'Tâm lý'],
    status: 'published',
    ageRating: 'T16',
    releaseDate: new Date('2020-10-23'),
    duration: 110,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder14.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'hai', 'tam-ly'],
  },
  {
    title: 'Oppenheimer',
    description: 'Câu chuyện về J. Robert Oppenheimer và dự án Manhattan phát triển bom nguyên tử.',
    studio: 'Universal Pictures',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Robert Downey Jr.', 'Emily Blunt'],
    categories: ['Tiểu sử', 'Lịch sử', 'Chính kịch'],
    status: 'published',
    ageRating: 'T16',
    releaseDate: new Date('2023-07-21'),
    duration: 180,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder15.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['oscar', 'nolan', 'lich-su'],
  },
  {
    title: 'Spider-Man: Across the Spider-Verse',
    description: 'Miles Morales du hành qua đa vũ trụ và gặp gỡ hàng loạt phiên bản Spider-Man.',
    studio: 'Sony Pictures',
    director: 'Joaquim Dos Santos',
    cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac'],
    categories: ['Hoạt hình', 'Hành động', 'Phiêu lưu'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2023-06-02'),
    duration: 140,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder16.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['hoat-hinh', 'spider-man', 'marvel'],
  },
  {
    title: 'Bố Già',
    description: 'Phim điện ảnh chuyển thể từ web drama - câu chuyện về người cha già và mối quan hệ cha con.',
    studio: 'Trấn Thành Town',
    director: 'Trấn Thành, Vũ Ngọc Đãng',
    cast: ['Trấn Thành', 'Tuấn Trần', 'Ngân Chi'],
    categories: ['Gia đình', 'Tình cảm', 'Hài'],
    status: 'published',
    ageRating: 'P',
    releaseDate: new Date('2021-03-12'),
    duration: 128,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder17.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'gia-dinh', 'tran-thanh'],
  },
  {
    title: 'The Batman',
    description: 'Bruce Wayne phải điều tra một loạt vụ giết người tàn bạo của Riddler tại Gotham.',
    studio: 'Warner Bros.',
    director: 'Matt Reeves',
    cast: ['Robert Pattinson', 'Zoë Kravitz', 'Paul Dano'],
    categories: ['Hành động', 'Tội phạm', 'Bí ẩn'],
    status: 'published',
    ageRating: 'T16',
    releaseDate: new Date('2022-03-04'),
    duration: 176,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder18.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['dc', 'batman', 'toi-pham'],
  },
  {
    title: 'Trạng Tí',
    description: 'Phiêu lưu kỳ thú của cậu bé Tí và những người bạn trong thế giới cổ tích Việt Nam.',
    studio: 'Ngô Thanh Vân Production',
    director: 'Phan Gia Nhật Linh',
    cast: ['Ngô Thanh Vân', 'Trần Ngọc Vàng'],
    categories: ['Phiêu lưu', 'Gia đình', 'Hoạt hình'],
    status: 'draft',
    ageRating: 'P',
    releaseDate: new Date('2021-09-17'),
    duration: 100,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder19.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'thieu-nhi'],
  },
  {
    title: 'The Marvels',
    description: 'Captain Marvel, Ms. Marvel và Monica Rambeau phải hợp tác khi sức mạnh của họ bị hoán đổi.',
    studio: 'Marvel Studios',
    director: 'Nia DaCosta',
    cast: ['Brie Larson', 'Iman Vellani', 'Teyonah Parris'],
    categories: ['Hành động', 'Khoa học viễn tưởng'],
    status: 'draft',
    ageRating: 'T13',
    releaseDate: new Date('2023-11-10'),
    duration: 105,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder20.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['marvel', 'hanh-dong'],
  },
  {
    title: 'Người Vợ Cuối Cùng',
    description: 'Chuyện tình bi thương trong bối cảnh Việt Nam thế kỷ 19, dựa trên tiểu thuyết nổi tiếng.',
    studio: 'BHD',
    director: 'Victor Vũ',
    cast: ['Kaity Nguyễn', 'Quốc Huy'],
    categories: ['Lịch sử', 'Tình cảm', 'Chính kịch'],
    status: 'published',
    ageRating: 'T16',
    releaseDate: new Date('2023-10-20'),
    duration: 117,
    language: ['Tiếng Việt'],
    subtitles: ['Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder21.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['phim-viet', 'lich-su', 'tinh-cam'],
  },
  {
    title: 'Wonka',
    description: 'Câu chuyện về tuổi trẻ của Willy Wonka và hành trình trở thành nhà sản xuất chocolate vĩ đại.',
    studio: 'Warner Bros.',
    director: 'Paul King',
    cast: ['Timothée Chalamet', 'Hugh Grant'],
    categories: ['Gia đình', 'Phiêu lưu', 'Hài'],
    status: 'published',
    ageRating: 'P',
    releaseDate: new Date('2023-12-15'),
    duration: 116,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder22.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['gia-dinh', 'phieu-luu'],
  },
  {
    title: 'Exhuma (Quật Mộ Trùng Ma)',
    description: 'Một nhóm pháp sư Hàn Quốc đối đầu với lời nguyền cổ đại khi khai quật mộ phần bí ẩn.',
    studio: 'Showbox',
    director: 'Jang Jae-hyun',
    cast: ['Choi Min-sik', 'Kim Go-eun'],
    categories: ['Kinh dị', 'Tâm linh'],
    status: 'hidden',
    ageRating: 'T18',
    releaseDate: new Date('2024-01-18'),
    duration: 133,
    language: ['Tiếng Hàn'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder23.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['kinh-di', 'han-quoc'],
  },
  {
    title: 'Godzilla x Kong: Đế Chế Mới',
    description: 'Godzilla và Kong phải hợp sức đối đầu mối đe dọa chưa từng thấy từ Trái Đất rỗng.',
    studio: 'Warner Bros.',
    director: 'Adam Wingard',
    cast: ['Rebecca Hall', 'Brian Tyree Henry', 'Dan Stevens'],
    categories: ['Hành động', 'Khoa học viễn tưởng'],
    status: 'published',
    ageRating: 'T13',
    releaseDate: new Date('2024-03-29'),
    duration: 115,
    language: ['Tiếng Anh'],
    subtitles: ['Tiếng Việt', 'Tiếng Anh'],
    imageUrl: 'https://image.tmdb.org/t/p/w500/placeholder24.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: ['monster', 'hanh-dong', 'blockbuster'],
  },
];

async function main() {
  const shouldTruncate = process.argv.includes('--truncate');
  if (shouldTruncate) {
    console.log('[seed] Truncate mode: deleting existing movies...');
    await prisma.movie.deleteMany();
  } else {
    console.log('[seed] Safe mode: keep existing movies and upsert by slug.');
  }

  const existingCodeRows = await prisma.movie.findMany({
    select: { code: true },
  });
  const usedCodes = new Set(
    existingCodeRows
      .map((row) => String(row.code || '').trim())
      .filter(Boolean)
  );

  let nextCodeNum = 1;
  for (const code of usedCodes) {
    const match = code.match(/^MOV-(\d+)$/);
    if (!match) continue;
    const parsed = parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed >= nextCodeNum) {
      nextCodeNum = parsed + 1;
    }
  }

  let created = 0;
  let updated = 0;
  console.log(`[seed] Processing ${movies.length} movies...`);
  for (const movie of movies) {
    const slug = movie.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const existing = await prisma.movie.findUnique({
      where: { slug },
      select: { id: true, code: true },
    });

    if (existing) {
      await prisma.movie.update({
        where: { id: existing.id },
        data: {
          ...movie,
          slug,
          releaseDate: movie.releaseDate,
        },
      });
      updated++;
      console.log(`  [updated] ${existing.code} - ${movie.title}`);
      continue;
    }

    let code = '';
    do {
      code = `MOV-${String(nextCodeNum).padStart(4, '0')}`;
      nextCodeNum++;
    } while (usedCodes.has(code));
    usedCodes.add(code);

    await prisma.movie.create({
      data: {
        ...movie,
        code,
        slug,
        releaseDate: movie.releaseDate,
      },
    });
    created++;
    console.log(`  [created] ${code} - ${movie.title}`);
  }

  console.log(
    `\n[seed] Done. source=${movies.length}, created=${created}, updated=${updated}, mode=${shouldTruncate ? 'truncate' : 'safe'}`
  );
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
