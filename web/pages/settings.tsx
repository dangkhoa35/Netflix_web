import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import Navbar from '../components/Navbar';
import useCurrentUser from '../hooks/useCurrentUser';

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [language, setLanguage] = useState('vi');
  const [quality, setQuality] = useState('auto');
  const [savedMessage, setSavedMessage] = useState('');

  const handleSaveSettings = () => {
    // Luồng logic:
    // 1. Collect tất cả settings từ form
    // 2. Validate dữ liệu
    // 3. Lưu vào localStorage hoặc call API
    // 4. Show success message
    const settings = {
      notifications,
      autoplay,
      language,
      quality,
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    setSavedMessage('✓ Cài đặt đã được lưu');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  if (!currentUser) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Cài đặt - Nextflix</title>
        <link rel="shortcut icon" href="/images/favicon.png" />
      </Head>
      <Navbar />
      
      <div className="min-h-screen bg-zinc-900 pt-20 pb-20">
        {/* Header */}
        <div className="px-4 md:px-12 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white hover:text-red-500 transition-colors mb-6"
          >
            <AiOutlineArrowLeft size={24} />
            <span className="text-lg font-semibold">Quay lại</span>
          </button>
          
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-2">
            Cài đặt
          </h1>
          <p className="text-gray-400">Quản lý tài khoản và tùy chọn của bạn</p>
        </div>

        {/* Content */}
        <div className="px-4 md:px-12 max-w-2xl">
          {/* User Profile Section */}
          <div className="bg-black/40 rounded-lg p-6 md:p-8 mb-6 border border-gray-700">
            <h2 className="text-white text-2xl font-bold mb-4">Thông tin tài khoản</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Tên người dùng</label>
                <p className="text-white text-lg font-semibold">{currentUser.name}</p>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Email</label>
                <p className="text-white text-lg font-semibold">{currentUser.email}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Ngày tạo tài khoản</label>
                <p className="text-white text-lg font-semibold">
                  {currentUser.createdAt 
                    ? new Date(currentUser.createdAt).toLocaleDateString('vi-VN')
                    : 'Không có dữ liệu'}
                </p>
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-black/40 rounded-lg p-6 md:p-8 mb-6 border border-gray-700">
            <h2 className="text-white text-2xl font-bold mb-6">Tùy chọn phát lại</h2>
            
            <div className="space-y-6">
              {/* Autoplay */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-semibold inline-block">Tự động phát tiếp theo</label>
                  <p className="text-gray-400 text-sm mt-1">Tự động phát tập/phim tiếp theo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(e) => setAutoplay(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {/* Quality */}
              <div>
                <label className="text-white font-semibold block mb-2">Chất lượng phát lại</label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { value: 'auto', label: 'Tự động' },
                    { value: '1080p', label: '1080p' },
                    { value: '720p', label: '720p' },
                    { value: '480p', label: '480p' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setQuality(option.value)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        quality === option.value
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="text-white font-semibold block mb-2">Ngôn ngữ</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full md:w-48 bg-gray-700 text-white rounded-lg px-4 py-2 outline-none hover:bg-gray-600 transition-colors"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div>
                  <label className="text-white font-semibold inline-block">Thông báo</label>
                  <p className="text-gray-400 text-sm mt-1">Nhận thông báo về phim và series mới</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveSettings}
              className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Lưu cài đặt
            </button>
            
            {savedMessage && (
              <div className="flex items-center text-green-400 font-semibold">
                {savedMessage}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mt-8">
            <h3 className="text-white font-semibold mb-2">💡 Gợi ý</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Chất lượng phát lại phụ thuộc vào tốc độ kết nối internet của bạn</li>
              <li>• Bật "Tự động phát" để tiếp tục xem không cần bấm nút</li>
              <li>• Thay đổi ngôn ngữ sẽ áp dụng ngay lập tức</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
