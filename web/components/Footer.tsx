import React from 'react';
import { BsGlobe } from 'react-icons/bs';

const Footer = () => {
  const links = [
    { label: 'Trung tâm trợ giúp', href: '#' },
    { label: 'Tài khoản', href: '#' },
    { label: 'Trung tâm truyền thông', href: '#' },
    { label: 'Quan hệ với nhà đầu tư', href: '#' },
    { label: 'Việc làm', href: '#' },
    { label: 'Điều khoản sử dụng', href: '#' },
    { label: 'Quyền riêng tư', href: '#' },
    { label: 'Tùy chọn cookie', href: '#' },
    { label: 'Thông tin doanh nghiệp', href: '#' },
    { label: 'Liên hệ với chúng tôi', href: '#' },
    { label: 'Kiểm tra tốc độ', href: '#' },
    { label: 'Thông báo pháp lý', href: '#' },
  ];

  return (
    <footer className="bg-black text-[#757575] py-16 px-4 md:px-12 border-t border-zinc-800">
      <div className="max-w-6xl mx-auto">
        <p className="mb-8 hover:underline cursor-pointer">
          Câu hỏi? Liên hệ với chúng tôi: <span className="hover:underline">1800-999-999</span>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {links.map((link, index) => (
            <a 
              key={index} 
              href={link.href} 
              className="text-sm hover:underline"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="relative inline-block mb-8 group">
          <div className="flex items-center gap-2 border border-[#333] px-4 py-2 rounded bg-black">
            <BsGlobe className="w-4 h-4" />
            <select className="bg-transparent text-sm outline-none appearance-none cursor-pointer pr-6">
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#757575]"></div>
            </div>
          </div>
        </div>

        <p className="text-xs">Netflix Việt Nam</p>
      </div>
    </footer>
  );
};

export default Footer;
