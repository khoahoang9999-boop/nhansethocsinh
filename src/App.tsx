/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ExternalLink, Monitor, Download, X, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'options' | 'popup' | 'auth' | 'topup'>('options');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OPEN_AUTH') {
        if (event.data.tabParam === 'topup') {
          setActiveTab('topup');
        } else {
          setActiveTab('auth');
        }
      } else if (event.data && event.data.type === 'CLOSE_AUTH') {
        setActiveTab('options');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let response = await fetch(`/api/download-extension?t=${Date.now()}`);
      
      // If server was packaging on demand (status 503 or json), wait 2.5s and retry automatically
      if (!response.ok || (response.headers.get("content-type") || "").includes("application/json")) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        response = await fetch(`/api/download-extension?t=${Date.now()}`);
      }

      if (!response.ok) {
        let errDetail = `Mã lỗi ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.error) errDetail = errJson.error;
        } catch (e) {}
        throw new Error(errDetail);
      }
      
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        throw new Error("Hệ thống đang chuẩn bị file tiện ích mới nhất, vui lòng bấm thử lại sau vài giây.");
      }

      const blob = await response.blob();
      if (blob.size < 50000) {
        throw new Error("File tải về chưa hoàn tất. Vui lòng bấm thử lại sau vài giây.");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = "nhan-xet-diem-v28.09.2026.zip";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 1000);
    } catch (error: any) {
      console.error("Download failed", error);
      // Fallback to direct download link
      window.location.href = `/nhan-xet-diem-v28.09.2026.zip?t=${Date.now()}`;
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-50 w-full min-h-screen flex flex-col font-sans text-slate-800">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center shadow-md grow-0 shrink-0">
            <span className="text-white text-xl font-black">K</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Trợ lý Nhận xét Edu Pro</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setActiveTab('options')}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'options' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Màn hình Quản lý
            </button>
            <button 
              onClick={() => setActiveTab('popup')}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'popup' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Giao diện Tiện ích
            </button>
            <button 
              onClick={() => setActiveTab('topup')}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'topup' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Gia Hạn (Mua Gói)
            </button>
            <button 
              onClick={() => setActiveTab('auth')}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${activeTab === 'auth' ? 'bg-white text-red-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Quản Trị Admin
            </button>
          </div>

          <a 
            href={activeTab === 'topup' ? '/auth-ui.html?tab=topup' : activeTab === 'auth' ? '/auth-ui.html' : activeTab === 'popup' ? '/popup.html' : '/options.html'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-slate-700 rounded-md shadow-sm cursor-pointer"
            title="Mở toàn màn hình trong tab mới"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" /> Mở Tab Riêng
          </a>

          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-slate-700 rounded-md shadow-sm cursor-pointer"
            onClick={() => setShowInstallGuide(true)}
          >
            <Download className="w-4 h-4" /> HD Cài Đặt
          </button>
          <button
            disabled={isDownloading}
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 border border-transparent hover:bg-blue-700 disabled:opacity-70 disabled:cursor-wait transition-all text-white rounded-md shadow drop-shadow-sm"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? "Đang chuẩn bị file..." : "Tải Bản Mới v28.09.2026"}
          </button>

        </div>
      </header>

      {/* Global Update Notification Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-8 py-2.5 shadow-inner border-b border-blue-600/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-300"></span>
          </span>
          <span className="font-bold text-amber-300 bg-blue-900/60 px-2 py-0.5 rounded-full border border-blue-500/40 font-mono">
            v28.09.2026
          </span>
          <span className="font-medium text-blue-50">
            <strong>Bản cập nhật mới:</strong> Cập nhật tính năng nhập mã nhận xét trên CSDL ngành (Mục ĐGTX 5.3.4).
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-blue-950 font-black px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Tải Bản Cập Nhật v28.09.2026 (.zip)
          </button>
        </div>
      </div>

      {showInstallGuide && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Hướng Dẫn Cài Đặt v28.09.2026</h3>
              <button onClick={() => setShowInstallGuide(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
              <ul className="list-decimal pl-5 space-y-3 font-medium text-slate-700">
                <li>Nhấn vào nút <strong>Tải Bản Mới v28.09.2026</strong> ở trên để tải file <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-bold">nhan-xet-diem-v28.09.2026.zip</code> về máy.</li>
                <li>Giải nén file ZIP vừa tải về, bạn sẽ nhận được thư mục <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-bold">Nhan-xet-diem-v28.09.2026</code>.</li>
                <li>Mở trình duyệt Chrome hoặc Cốc Cốc, gõ vào thanh địa chỉ: <code>chrome://extensions/</code></li>
                <li>Bật <strong>Developer mode (Chế độ dành cho nhà phát triển)</strong> ở góc trên bên phải màn hình.</li>
                <li>Nhấn vào nút <strong>Load unpacked (Tải tiện ích đã giải nén)</strong> và chọn thư mục <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-bold">Nhan-xet-diem-v28.09.2026</code> vừa giải nén (hoặc nút Cập nhật lại/Reload nếu đã có).</li>
                <li>Mở trang VnEdu hoặc CSDL, mở tính năng nhận xét để công cụ bắt đầu làm việc.</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowInstallGuide(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-sm transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex bg-slate-200/50 p-2 sm:p-3 md:p-4 justify-center overflow-auto h-[calc(100vh-64px)] relative w-full">

        {activeTab === 'options' ? (
          <div className="w-full h-full bg-[#F8FAFC] rounded-xl shadow-xl shadow-slate-300/60 overflow-hidden ring-1 ring-slate-200 flex flex-col">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 bg-white px-3 py-1 text-xs text-slate-500 rounded border border-slate-200 flex items-center gap-2 shadow-sm font-mono tracking-widest">
                  <Monitor className="w-3 h-3" /> options.html (Toàn màn hình)
                </div>
              </div>
            </div>
            <iframe src="/options.html" className="w-full flex-1 min-h-[850px] border-0 bg-white" title="Options Preview" />
          </div>
        ) : activeTab === 'popup' ? (
          <div className="w-[360px] h-fit bg-white rounded-[2.5rem] shadow-2xl shadow-slate-400 ring-[8px] ring-slate-900 overflow-hidden relative flex flex-col my-auto">
            <div className="w-24 h-6 bg-slate-900 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-10 hidden sm:block"></div>
            <div className="bg-slate-50 mt-6 px-4 py-2 border-y border-slate-200 flex justify-center text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              popup.html
            </div>
            <div className="w-[320px] mx-auto min-h-[400px] bg-slate-100 flex pb-4">
               <iframe src="/popup.html" className="w-[320px] min-h-[420px] border-0 mx-auto block bg-white shadow py-2" title="Popup Preview" />
            </div>
          </div>
        ) : activeTab === 'topup' ? (
          <div className="w-full h-full bg-[#F8FAFC] rounded-xl shadow-xl shadow-slate-300/60 overflow-hidden ring-1 ring-slate-200 flex flex-col">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 bg-white px-3 py-1 text-xs text-slate-500 rounded border border-slate-200 flex items-center gap-2 shadow-sm font-mono tracking-widest">
                  <Monitor className="w-3 h-3" /> auth-ui.html?tab=topup (Giao diện Gia Hạn / Nạp Điểm)
                </div>
              </div>
              <button
                onClick={() => setActiveTab('options')}
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm transition-colors cursor-pointer"
              >
                ← Quay lại Màn hình Quản lý
              </button>
            </div>
            <iframe key="topup-frame" src="/auth-ui.html?tab=topup" className="w-full flex-1 min-h-[850px] border-0 bg-white" title="Topup Preview" />
          </div>
        ) : (
          <div className="w-full h-full bg-[#F8FAFC] rounded-xl shadow-xl shadow-slate-300/60 overflow-hidden ring-1 ring-slate-200 flex flex-col">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 bg-white px-3 py-1 text-xs text-slate-500 rounded border border-slate-200 flex items-center gap-2 shadow-sm font-mono tracking-widest">
                  <Monitor className="w-3 h-3" /> auth-ui.html (Bảng Quản Trị Hệ Thống)
                </div>
              </div>
              <button
                onClick={() => setActiveTab('options')}
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm transition-colors cursor-pointer"
              >
                ← Quay lại Màn hình Quản lý
              </button>
            </div>
            <iframe key="auth-frame" src="/auth-ui.html" className="w-full flex-1 min-h-[850px] border-0 bg-white" title="Auth Preview" />
          </div>
        )}
      </main>
    </div>
  );
}
