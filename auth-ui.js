import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';


// ======= 1. CẤU HÌNH FIREBASE =======
// Bắt buộc thay đổi thành config của bạn nếu muốn live.
// Đây là thông số giả định để demo (Lưu ý: Bạn phải tạo Firebase Project và Paste Config dưới đây)
const firebaseConfig = {
  apiKey: "AIzaSyCCvFYBNK92lbfTjE89FufJP-2xCltfa60",
  authDomain: "tien-ich-nx-csdl-vnedu.firebaseapp.com",
  databaseURL: "https://tien-ich-nx-csdl-vnedu-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tien-ich-nx-csdl-vnedu",
  storageBucket: "tien-ich-nx-csdl-vnedu.firebasestorage.app",
  messagingSenderId: "87222165808",
  appId: "1:87222165808:web:865203c65dd69a8362a8f5",
  measurementId: "G-657J85CYGL"
};

// Khởi tạo Firebase (Chỉ khởi tạo nếu chưa có)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // if already initialized, use that one
}

const auth = firebase.auth();
const db = firebase.firestore();

// ======= 2. BIẾN TOÀN CỤC =======
function getApiBaseUrl() {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        const origin = window.location.origin;
        if (origin.startsWith('http://') || origin.startsWith('https://')) {
            return origin;
        }
    }
    return "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app";
}

const ADMIN_EMAIL = 'hvdkhoa89@gmail.com';
const ADMIN_EMAILS = ['hvdkhoa89@gmail.com', 'khoahoang9999@gmail.com', 'admin@admin.com'];
const isUserAdmin = (email) => {
    if (!email) return false;
    const lower = String(email).trim().toLowerCase();
    return ADMIN_EMAILS.includes(lower);
};
let currentUserInfo = null;
let unsubscribeCredit = null;
let unsubscribeTopupConfig = null;

function generateStableDeviceId() {
    try {
        const userAgent = navigator.userAgent || '';
        const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
        const lang = navigator.language || '';
        const plat = navigator.platform || '';
        const raw = `${userAgent}|${screenRes}|${lang}|${plat}`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            hash |= 0;
        }
        return 'dev_' + Math.abs(hash).toString(36);
    } catch (e) {
        return 'dev_default';
    }
}

async function getDeviceId() {
    return new Promise((resolve) => {
        const stableId = generateStableDeviceId();
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['deviceId'], (res) => {
                if (res.deviceId) {
                    resolve(res.deviceId);
                } else {
                    chrome.storage.local.set({ deviceId: stableId }, () => resolve(stableId));
                }
            });
        } else {
            let id = localStorage.getItem('tlnx_device_id');
            if (!id) {
                id = stableId;
                localStorage.setItem('tlnx_device_id', id);
            }
            resolve(id);
        }
    });
}

const DEFAULT_TOPUP_PACKAGES = [
  {amt: 30000, pts: 1, bonus: 0, hot: false, hidden: false},
  {amt: 60000, pts: 2, bonus: 0, hot: false, hidden: false},
  {amt: 90000, pts: 3, bonus: 0, hot: true, hidden: false},
  {amt: 150000, pts: 5, bonus: 0, hot: false, hidden: false}
];

let globalTopupConfig = {
  anchorAmt: 30000,
  anchorPts: 1,
  baseRate: 30000,
  packages: [...DEFAULT_TOPUP_PACKAGES]
};

// Khôi phục bộ nhớ cache cấu hình gói nếu có
try {
  const savedTopupJson = localStorage.getItem('tlnx_saved_topup_config');
  if (savedTopupJson) {
    const parsed = JSON.parse(savedTopupJson);
    if (parsed && Array.isArray(parsed.packages) && parsed.packages.length > 0) {
      globalTopupConfig = parsed;
    }
  }
} catch (e) {}

// ======= 3. UI HANDLERS (Chuyển đổi VIEW) =======
function switchView(viewId) {
    document.querySelectorAll('#auth-container .view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if(input) {
         const isPassword = input.type === 'password';
         input.type = isPassword ? 'text' : 'password';
         
         if (btn) {
             const eyeOpen = btn.querySelector('.eye-open');
             const eyeClosed = btn.querySelector('.eye-closed');
             if (eyeOpen && eyeClosed) {
                 if (isPassword) {
                     eyeOpen.classList.add('hidden');
                     eyeClosed.classList.remove('hidden');
                 } else {
                     eyeOpen.classList.remove('hidden');
                     eyeClosed.classList.add('hidden');
                 }
             }
         }
    }
}

let loadingWatchdog = null;
function toggleLoading(show) {
    const loader = document.getElementById('auth-loading');
    if (!loader) return;
    if (loadingWatchdog) {
        clearTimeout(loadingWatchdog);
        loadingWatchdog = null;
    }
    if (show) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
        // Watchdog: Tự động tắt loading sau 3.5s để không bao giờ bị treo vĩnh viễn giao diện
        loadingWatchdog = setTimeout(() => {
            loader.classList.remove('flex');
            loader.classList.add('hidden');
            console.warn("[AuthUI] Tự động giải phóng trạng thái loading sau timeout");
        }, 3500);
    } else {
        loader.classList.remove('flex');
        loader.classList.add('hidden');
    }
}

// ======= 4. TOAST NOTIFICATION =======
function parseFirestoreDate(dateVal) {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (typeof dateVal.seconds === 'number') return new Date(dateVal.seconds * 1000);
    if (typeof dateVal._seconds === 'number') return new Date(dateVal._seconds * 1000);
    if (typeof dateVal === 'number') {
        const d = new Date(dateVal < 1e11 ? dateVal * 1000 : dateVal);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof dateVal === 'string') {
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bgClass = type === 'error' ? 'bg-red-500' : (type === 'success' ? 'bg-emerald-500' : 'bg-slate-800');
    let icon = type === 'error' ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';

    toast.className = `${bgClass} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform translate-x-full transition-transform duration-300 ease-out z-50`;
    toast.innerHTML = `${icon} <span class="font-medium text-sm leading-tight max-w-[250px]">${message}</span>`;
    
    container.appendChild(toast);
    
    // Slide in
    requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
    
    // Remove after 3-4s
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Chuyển đổi mã lỗi Firebase thành Tiếng Việt
function translateError(error) {
    if (!error) return 'Đã xảy ra lỗi không xác định.';
    const code = error.code || '';
    switch(code) {
        case 'auth/invalid-email': return 'Email không hợp lệ. Vui lòng nhập đúng định dạng email (VD: ten@gmail.com).';
        case 'auth/user-disabled': return 'Tài khoản này đã bị tạm khóa.';
        case 'auth/user-not-found': return 'Tài khoản không tồn tại. Vui lòng kiểm tra lại hoặc Đăng ký tài khoản mới.';
        case 'auth/wrong-password': return 'Mật khẩu không chính xác. Vui lòng thử lại.';
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials': return 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
        case 'auth/email-already-in-use': return 'Email này đã được đăng ký trên hệ thống.';
        case 'auth/weak-password': return 'Mật khẩu quá yếu (cần tối thiểu 6 ký tự).';
        case 'auth/popup-closed-by-user': return 'Đăng nhập Google bị hủy.';
        case 'auth/network-request-failed': return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.';
        case 'auth/network-timeout': return 'Quá thời gian chờ phản hồi mạng. Vui lòng kiểm tra kết nối và thử lại.';
        case 'auth/too-many-requests': return 'Quá nhiều lần thử đăng nhập không thành công. Vui lòng đợi ít phút hoặc đổi mật khẩu.';
        case 'auth/unauthorized-domain': return 'Tên miền chưa được cấp phép trong Firebase Console.';
        case 'auth/internal-error': return 'Lỗi hệ thống Nội bộ. Vui lòng thử lại sau.';
        default: return error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
    }
}

// ======= 5. KÍCH HOẠT PHIÊN ĐĂNG NHẬP & LẮNG NGHE TRẠNG THÁI AUTH =======
function activateUserSession(user) {
    const authContainer = document.getElementById('auth-container');
    const mainContainer = document.getElementById('main-container');
    const successContainer = document.getElementById('success-container');
    const adminPanel = document.getElementById('admin-panel');

    toggleLoading(false);
    currentUserInfo = user;

    if (authContainer) {
        authContainer.classList.remove('flex');
        authContainer.classList.add('hidden');
    }
    
    const realEmail = (user && user.email) ? user.email.toLowerCase().trim() : '';
    const isAdmin = isUserAdmin(realEmail);

    if (!isAdmin) {
        localStorage.removeItem('tlnx_display_email');
    }

    const currentUrlParams = new URLSearchParams(window.location.search);
    let currentTabAttr = currentUrlParams.get('tab');
    if (!currentTabAttr && window.location.hash) {
        currentTabAttr = window.location.hash.replace('#', '');
    }
    if (currentTabAttr) currentTabAttr = currentTabAttr.toLowerCase().trim();

    // Nếu người dùng yêu cầu Gia Hạn (topup) hoặc đã đăng nhập từ trước, vào thẳng giao diện chính
    const isExplicitLoginFlow = currentTabAttr === 'login' || currentTabAttr === 'register';

    if (!isAdmin && isExplicitLoginFlow) {
        if (successContainer) {
            successContainer.classList.remove('hidden');
            successContainer.classList.add('flex');
        }
        if (mainContainer) {
            mainContainer.classList.remove('flex');
            mainContainer.classList.add('hidden');
        }
        const successNameEl = document.getElementById('success-user-name');
        if (successNameEl) {
            successNameEl.textContent = `Chào mừng ${user.displayName || realEmail}`;
        }
    } else {
        if (successContainer) {
            successContainer.classList.add('hidden');
            successContainer.classList.remove('flex');
        }
        if (mainContainer) {
            mainContainer.classList.remove('hidden');
            mainContainer.classList.add('flex');
        }
        // Cuộn trực tiếp tới khung Gia Hạn Sử Dụng
        const topupSection = document.getElementById('topup-section');
        if (topupSection) {
            topupSection.classList.remove('hidden');
            setTimeout(() => {
                topupSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ 
            authState: { 
                uid: user.uid || 'admin_uid', 
                email: realEmail, 
                credits: isAdmin ? 999 : (user.credits || 0), 
                points: user.points || 0, 
                pendingDeduction: 0, 
                isAdmin 
            } 
        });
    }

    // Cập nhật Header
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('avatar-letters');
    if (userNameEl) userNameEl.textContent = user.displayName || (isAdmin ? 'Quản Trị Viên VIP' : 'Tài khoản Giáo viên');
    if (userEmailEl) userEmailEl.textContent = realEmail || (user.email || '');
    if (avatarEl) avatarEl.textContent = (user.displayName || realEmail || '?').charAt(0).toUpperCase();

    const creditEl = document.getElementById('credit-balance');
    const trialContainer = document.getElementById('trial-points-container');
    if (creditEl) {
        if (isAdmin) {
            creditEl.textContent = 'VIP';
            creditEl.parentElement.classList.remove('text-blue-700', 'bg-blue-50', 'border-blue-100');
            creditEl.parentElement.classList.add('text-red-600', 'bg-red-50', 'border-red-100');
            const labelEl = creditEl.nextElementSibling;
            if (labelEl && labelEl.textContent.trim().toUpperCase() === 'NĂM') {
                labelEl.classList.add('hidden');
            }
            if (trialContainer) trialContainer.classList.add('hidden');
            const divider = creditEl.parentElement.nextElementSibling;
            if (divider && divider.classList.contains('bg-slate-200')) divider.classList.add('hidden');
        } else {
            creditEl.parentElement.classList.add('text-blue-700', 'bg-blue-50', 'border-blue-100');
            creditEl.parentElement.classList.remove('text-red-600', 'bg-red-50', 'border-red-100');
            const labelEl = creditEl.nextElementSibling;
            if (labelEl) labelEl.classList.remove('hidden');
            if (trialContainer) trialContainer.classList.remove('hidden');
            const divider = creditEl.parentElement.nextElementSibling;
            if (divider && divider.classList.contains('bg-slate-200')) divider.classList.remove('hidden');
        }
    }

    const btnNavAdmin = document.getElementById('btn-nav-admin');
    const btnNavUsers = document.getElementById('btn-nav-users');
    const btnNavTopup = document.getElementById('btn-nav-topup');
    const adminTopupBanner = document.getElementById('admin-topup-banner');
    const topupSection = document.getElementById('topup-section');

    if (btnNavAdmin) {
        if (isAdmin) {
            btnNavAdmin.classList.remove('hidden');
        } else {
            btnNavAdmin.classList.add('hidden');
        }
    }
    if (btnNavUsers) {
        if (isAdmin) {
            btnNavUsers.classList.remove('hidden');
        } else {
            btnNavUsers.classList.add('hidden');
        }
    }

    // Quản lý hiển thị Admin Panel & Giao diện Gia Hạn
    if (isAdmin) {
        if (adminPanel) adminPanel.classList.remove('hidden');
        if (currentTabAttr === 'topup') {
            switchAdminTab('topup');
        } else if (currentTabAttr === 'users') {
            switchAdminTab('users');
        } else {
            switchAdminTab('config');
        }
        loadAdminUserList();
    } else {
        if (adminPanel) adminPanel.classList.add('hidden');
        if (topupSection) topupSection.classList.remove('hidden');
        if (adminTopupBanner) adminTopupBanner.classList.add('hidden');
        updateHeaderNavActive('topup');
    }

    initAdminPanel();
    initTopup();

    // Tự động đồng bộ phiên bản mới lên Firestore cho toàn bộ hệ thống
    if (isAdmin) {
        db.collection("system_config").doc("app_version").set({
            version: "28.9.2026",
            versionName: "28.09.2026",
            versionCode: 2026092801,
            releaseDate: "28.09.2026",
            title: "Bản cập nhật v28.09.2026",
            changelog: "Cập nhật tính năng nhập mã nhận xét trên CSDL ngành (Mục ĐGTX 5.3.4), tối ưu điền nhận xét và sửa lỗi hệ thống.",
            downloadUrl: "/api/download-extension",
            forceNotify: true,
            updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
    }

    // Đồng bộ Firestore nếu có kết nối Firebase
    if (user.uid && !String(user.uid).startsWith('admin_') && !String(user.uid).startsWith('user_')) {
        syncUserFirestore(user);
    }
}

auth.onAuthStateChanged(user => {
    const authContainer = document.getElementById('auth-container');
    const mainContainer = document.getElementById('main-container');
    const successContainer = document.getElementById('success-container');

    if (user) {
        activateUserSession(user);
    } else {
        // Chưa đăng nhập
        toggleLoading(false);
        currentUserInfo = null;
        if (unsubscribeCredit) { unsubscribeCredit(); unsubscribeCredit = null; }
        
        if (mainContainer) {
            mainContainer.classList.remove('flex');
            mainContainer.classList.add('hidden');
        }
        
        if (successContainer) {
             successContainer.classList.remove('flex');
             successContainer.classList.add('hidden');
        }

        if (authContainer) {
            authContainer.classList.remove('hidden');
            authContainer.classList.add('flex');
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const tabAttr = urlParams.get('tab');
        if (tabAttr === 'register') {
            switchView('view-register');
        } else {
            switchView('view-login');
        }
    }
});

// ======= 6. FIRESTORE SYNC & CREDITS =======
async function syncUserFirestore(user) {
    const userRef = db.collection('users').doc(user.uid);
    const deviceId = await getDeviceId();
    const isAdmin = isUserAdmin(user.email);
    const userEmail = (user.email || '').toLowerCase().trim();
    
    try {
        const doc = await userRef.get();
        const displayName = user.displayName || '';
        
        // Quét và hợp nhất mọi tài khoản pre-created hoặc trùng email do Admin tạo trước
        let preData = {};
        let docsToDelete = [];
        try {
            if (userEmail) {
                // Quét cả doc pre-create user_...
                const preDocId = 'user_' + userEmail.replace(/[^a-zA-Z0-9]/g, '_');
                try {
                    const directPreDoc = await db.collection('users').doc(preDocId).get();
                    if (directPreDoc.exists) {
                        const dData = directPreDoc.data() || {};
                        if ((dData.credits || 0) > (preData.credits || 0)) preData.credits = dData.credits;
                        if ((dData.points || 0) > (preData.points || 0)) preData.points = dData.points;
                        if (dData.isVip || dData.tier === 'VIP' || dData.role === 'vip') {
                            preData.isVip = true;
                            preData.tier = 'VIP';
                            preData.role = 'vip';
                        }
                        if (dData.expiryDate) {
                            preData.expiryDate = dData.expiryDate;
                        }
                        if (dData.bankCode) preData.bankCode = dData.bankCode;
                        docsToDelete.push(directPreDoc.ref);
                    }
                } catch(pe) {}

                const preSnap = await db.collection('users').where('email', '==', userEmail).get();
                if (!preSnap.empty) {
                    preSnap.forEach(d => {
                        if (d.id !== user.uid) {
                            const otherData = d.data() || {};
                            if ((otherData.credits || 0) > (preData.credits || 0)) preData.credits = otherData.credits;
                            if ((otherData.points || 0) > (preData.points || 0)) preData.points = otherData.points;
                            if (otherData.isVip || otherData.tier === 'VIP' || otherData.role === 'vip') {
                                preData.isVip = true;
                                preData.tier = 'VIP';
                                preData.role = 'vip';
                            }
                            if (otherData.expiryDate) {
                                // So sánh ngày hết hạn để lấy ngày xa nhất
                                if (!preData.expiryDate) {
                                    preData.expiryDate = otherData.expiryDate;
                                } else {
                                    const t1 = typeof preData.expiryDate.toDate === 'function' ? preData.expiryDate.toDate().getTime() : new Date(preData.expiryDate).getTime();
                                    const t2 = typeof otherData.expiryDate.toDate === 'function' ? otherData.expiryDate.toDate().getTime() : new Date(otherData.expiryDate).getTime();
                                    if (t2 > t1) preData.expiryDate = otherData.expiryDate;
                                }
                            }
                            if (otherData.bankCode) preData.bankCode = otherData.bankCode;
                            docsToDelete.push(d.ref);
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Lỗi kiểm tra tài khoản pre-created:", e);
        }

        if (!doc.exists) {
            const bankCode = preData.bankCode || Math.floor(100000 + Math.random() * 900000).toString();
            await userRef.set({
                email: userEmail,
                displayName: displayName || preData.displayName || (user.email ? user.email.split('@')[0] : ''),
                credits: preData.credits !== undefined ? preData.credits : 0,
                points: preData.points !== undefined ? preData.points : 0,
                expiryDate: preData.expiryDate || null,
                isVip: preData.isVip || false,
                tier: preData.tier || 'Free',
                role: preData.role || 'user',
                bankCode: bankCode,
                deviceIds: [deviceId],
                createdAt: preData.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            const data = doc.data() || {};
            const currentDevices = data.deviceIds || [];
            
            // Hợp nhất dữ liệu nếu có preData từ Admin
            let mergeUpdate = {};
            if (preData.credits !== undefined && (preData.credits || 0) > (data.credits || 0)) {
                mergeUpdate.credits = preData.credits;
            }
            if (preData.expiryDate) {
                let shouldUpdateExpiry = true;
                if (data.expiryDate) {
                    const curTime = typeof data.expiryDate.toDate === 'function' ? data.expiryDate.toDate().getTime() : new Date(data.expiryDate).getTime();
                    const preTime = typeof preData.expiryDate.toDate === 'function' ? preData.expiryDate.toDate().getTime() : new Date(preData.expiryDate).getTime();
                    if (curTime >= preTime) shouldUpdateExpiry = false;
                }
                if (shouldUpdateExpiry) {
                    mergeUpdate.expiryDate = preData.expiryDate;
                    mergeUpdate.isVip = true;
                    mergeUpdate.tier = 'VIP';
                    mergeUpdate.role = 'vip';
                }
            }
            if (preData.points !== undefined && (preData.points || 0) > (data.points || 0)) {
                mergeUpdate.points = preData.points;
            }
            if (Object.keys(mergeUpdate).length > 0) {
                await userRef.update(mergeUpdate).catch(() => {});
            }

            // Đảm bảo email luôn lưu chữ thường chuẩn hóa
            if (data.email !== userEmail) {
                await userRef.update({ email: userEmail }).catch(() => {});
            }
            if (preData.points !== undefined && (preData.points || 0) > (data.points || 0)) {
                mergeUpdate.points = preData.points;
            }
            if (Object.keys(mergeUpdate).length > 0) {
                await userRef.update(mergeUpdate).catch(() => {});
            }

            // QUẢN LÝ DANH SÁCH THIẾT BỊ (TỐI ĐA 2 THIẾT BỊ HOẠT ĐỘNG GẦN NHẤT)
            if (!isAdmin) {
                let updatedDevices = currentDevices.filter(d => typeof d === 'string' && d.length > 0);
                if (!updatedDevices.includes(deviceId)) {
                    if (updatedDevices.length >= 2) {
                        // Tự động giữ lại 1 thiết bị trước đó và thay thế thiết bị cũ nhất
                        updatedDevices = [updatedDevices[updatedDevices.length - 1], deviceId];
                    } else {
                        updatedDevices.push(deviceId);
                    }
                    await userRef.update({ deviceIds: updatedDevices }).catch(() => {});
                }
            } else if (!currentDevices.includes(deviceId)) {
                await userRef.update({
                    deviceIds: firebase.firestore.FieldValue.arrayUnion(deviceId)
                }).catch(() => {});
            }

            if (!data.bankCode) {
                const bankCode = Math.floor(100000 + Math.random() * 900000).toString();
                await userRef.update({ bankCode: bankCode, lastLoginAt: firebase.firestore.FieldValue.serverTimestamp() });
            } else {
                await userRef.update({ lastLoginAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
            if (!data.displayName && displayName) {
                await userRef.update({ displayName: displayName });
            }
            if (data.points === undefined) {
                await userRef.update({ points: 0 });
            }
        }

        // Xóa sạch các document thừa đã được hợp nhất
        for (let ref of docsToDelete) {
            await ref.delete().catch(() => {});
        }
        
        unsubscribeCredit = userRef.onSnapshot((docSnapshot) => {
            if (docSnapshot.exists) {
                const data = docSnapshot.data();
                currentUserInfo = { ...user, ...data }; // Update global info with Firestore data
                const creditEl = document.getElementById('credit-balance');
                const pointsEl = document.getElementById('trial-points');
                const trialContainer = document.getElementById('trial-points-container');
                const expiryContainer = document.getElementById('expiry-date-container');
                const expiryText = document.getElementById('expiry-date-text');
                const expiryDaysText = document.getElementById('expiry-days-text');
                
                if (typeof chrome !== 'undefined' && chrome.storage) {
                     if (!window.__pendingListenerAdded) {
                         window.__pendingListenerAdded = true;
                         chrome.storage.onChanged.addListener((changes, area) => {
                             if (area === 'local' && changes.authState) {
                                 const newVal = changes.authState.newValue;
                                 if (newVal && newVal.pendingDeduction > 0) {
                                     const pending = newVal.pendingDeduction;
                                     chrome.storage.local.set({ authState: { ...newVal, pendingDeduction: 0 } });
                                     userRef.get().then(docSnap => {
                                         if (docSnap.exists) {
                                             userRef.update({ points: Math.max(0, (docSnap.data().points || 0) - pending) });
                                         }
                                     });
                                 }
                             }
                         });
                     }
                     
                     chrome.storage.local.get(['authState'], (res) => {
                         let expDate = null;
                         if (data.expiryDate) {
                             if (typeof data.expiryDate.toDate === 'function') expDate = data.expiryDate.toDate();
                             else if (data.expiryDate.seconds) expDate = new Date(data.expiryDate.seconds * 1000);
                             else if (data.expiryDate._seconds) expDate = new Date(data.expiryDate._seconds * 1000);
                             else expDate = new Date(data.expiryDate);
                         }
                         const now = new Date();
                         const isVipByDate = expDate && !isNaN(expDate.getTime()) && expDate.getTime() > now.getTime();
                         const isAdmin = isUserAdmin(user.email);
                         const isVip = isAdmin || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || isVipByDate || ((data.credits || 0) > 0);
                         const expiryDateISO = expDate && !isNaN(expDate.getTime()) ? expDate.toISOString() : null;
                         const expiryDateStr = expDate && !isNaN(expDate.getTime()) ? expDate.toLocaleDateString('vi-VN') : '';

                         let pending = res.authState && res.authState.pendingDeduction ? res.authState.pendingDeduction : 0;
                         if (pending > 0) {
                             // Reset pending immediately to avoid race condition
                             const newAuthState = { ...res.authState, pendingDeduction: 0 };
                             chrome.storage.local.set({ authState: newAuthState });
                             
                             let currentPoints = data.points || 0;
                             userRef.update({ points: Math.max(0, currentPoints - pending) });
                             
                             chrome.storage.local.set({ 
                                authState: { 
                                    ...newAuthState, 
                                    uid: user.uid, 
                                    email: user.email, 
                                    credits: data.credits || 0, 
                                    points: Math.max(0, currentPoints - pending), 
                                    isVip,
                                    tier: isVip ? 'VIP' : (data.tier || 'Free'),
                                    role: isVip ? 'vip' : (data.role || 'user'),
                                    expiryDate: expiryDateISO,
                                    expiryDateStr,
                                    isAdmin 
                                } 
                             });
                         } else {
                             chrome.storage.local.set({ 
                                authState: { 
                                    uid: user.uid, 
                                    email: user.email, 
                                    credits: data.credits || 0, 
                                    points: data.points || 0, 
                                    isVip,
                                    tier: isVip ? 'VIP' : (data.tier || 'Free'),
                                    role: isVip ? 'vip' : (data.role || 'user'),
                                    expiryDate: expiryDateISO,
                                    expiryDateStr,
                                    pendingDeduction: 0, 
                                    isAdmin 
                                } 
                             });
                         }
                     });
                }

                if (creditEl) {
                    const isAdmin = isUserAdmin(user.email);
                    let expD = null;
                    if (data.expiryDate) {
                        if (typeof data.expiryDate.toDate === 'function') expD = data.expiryDate.toDate();
                        else if (data.expiryDate._seconds) expD = new Date(data.expiryDate._seconds * 1000);
                        else expD = new Date(data.expiryDate);
                    }
                    const now = new Date();
                    const isVipByDate = expD && !isNaN(expD.getTime()) && expD.getTime() > now.getTime();

                    if (isAdmin) {
                        creditEl.textContent = 'VIP';
                        creditEl.parentElement.classList.remove('text-blue-700', 'bg-blue-50', 'border-blue-100', 'text-emerald-700');
                        creditEl.parentElement.classList.add('text-red-600', 'bg-red-50', 'border-red-100');
                        const labelEl = creditEl.nextElementSibling;
                        if (labelEl) labelEl.classList.add('hidden');
                        if (trialContainer) trialContainer.classList.add('hidden');
                        const divider = creditEl.parentElement.nextElementSibling;
                        if (divider && divider.classList.contains('bg-slate-200')) divider.classList.add('hidden');
                    } else if (isVipByDate || (data.credits || 0) > 0) {
                        const dateStr = expD ? expD.toLocaleDateString('vi-VN') : 'VIP';
                        creditEl.textContent = dateStr;
                        creditEl.parentElement.classList.add('text-emerald-700', 'bg-emerald-50', 'border-emerald-200');
                        creditEl.parentElement.classList.remove('text-red-600', 'bg-red-50', 'border-red-100', 'text-blue-700');
                        const labelEl = creditEl.nextElementSibling;
                        if (labelEl) {
                            labelEl.textContent = 'HẠN DÙNG';
                            labelEl.classList.remove('hidden');
                        }
                        if (trialContainer) trialContainer.classList.add('hidden');
                        const divider = creditEl.parentElement.nextElementSibling;
                        if (divider && divider.classList.contains('bg-slate-200')) divider.classList.add('hidden');
                    } else {
                        creditEl.textContent = 'Hết hạn';
                        creditEl.parentElement.classList.add('text-red-600', 'bg-red-50', 'border-red-100');
                        creditEl.parentElement.classList.remove('text-blue-700', 'bg-blue-50', 'border-blue-100', 'text-emerald-700');
                        const labelEl = creditEl.nextElementSibling;
                        if (labelEl) labelEl.classList.add('hidden');
                        if (trialContainer) trialContainer.classList.remove('hidden');
                        const divider = creditEl.parentElement.nextElementSibling;
                        if (divider && divider.classList.contains('bg-slate-200')) divider.classList.remove('hidden');
                    }
                }

                if (expiryContainer && expiryText) {
                    const date = parseFirestoreDate(data.expiryDate);
                    if (date) {
                        const now = new Date();
                        const isExpired = date < now;

                        const dateStr = date.toLocaleString('vi-VN', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        expiryText.textContent = dateStr;
                        expiryContainer.classList.remove('hidden');

                        if (isExpired) {
                            expiryText.classList.add('text-red-500');
                            expiryText.classList.remove('text-blue-600', 'text-slate-600');
                        } else {
                            expiryText.classList.remove('text-red-500');
                            expiryText.classList.add('text-blue-600');
                        }
                    } else {
                        expiryContainer.classList.add('hidden');
                    }
                }
                
                if (pointsEl) {
                    const pts = data.points || 0;
                    pointsEl.textContent = pts;
                }
            }
        });
    } catch (error) {
        console.error("Lỗi đồng bộ Firestore:", error);
        const isAdmin = isUserAdmin(user ? user.email : '');
        if(error.code === 'permission-denied' || error.message.includes('API_KEY')) {
            const creditEl = document.getElementById('credit-balance');
            if (creditEl) {
                creditEl.textContent = isAdmin ? 'VIP' : 'Demo';
                if (isAdmin) {
                    creditEl.parentElement.classList.remove('text-blue-700', 'bg-blue-50', 'border-blue-100');
                    creditEl.parentElement.classList.add('text-red-600', 'bg-red-50', 'border-red-100');
                }
            }
            if (isAdmin) {
                showToast('Lưu ý: Quy tắc bảo mật (Rules) trên Firebase Console cần được cập nhật để đọc danh sách dữ liệu.', 'error');
            } else {
                showToast('CẢNH BÁO: Đang chạy với Fake Firebase Config. Bạn cần thêm Config thật.', 'error');
            }
        }
    }
}

// Trợ lý Nhận Xét Pro
// ======= 8. NẠP ĐIỂM (VIETQR) =======
function parseMoneyInput(val, defaultVal = 0) {
    if (val === null || val === undefined) return defaultVal;
    const clean = String(val).replace(/[^0-9]/g, '');
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) ? defaultVal : parsed;
}

function loadTopupConfig() {
    if (unsubscribeTopupConfig) return;

    const applyConfigData = (data) => {
        if (!data) data = {};
        const parsedAnchor = parseMoneyInput(data.anchorAmt || data.baseRate, 0);
        let bRate = parsedAnchor > 0 ? parsedAnchor : (parseMoneyInput(globalTopupConfig.anchorAmt || globalTopupConfig.baseRate, 30000));
        
        let pkgs = data.packages;
        if (!Array.isArray(pkgs) || pkgs.length === 0) {
            pkgs = [
                { amt: bRate, pts: 1, bonus: 0, hot: false, hidden: false },
                { amt: bRate * 2, pts: 2, bonus: 0, hot: false, hidden: false },
                { amt: bRate * 3, pts: 3, bonus: 0, hot: true, hidden: false },
                { amt: bRate * 5, pts: 5, bonus: 0, hot: false, hidden: false }
            ];
        } else {
            pkgs = pkgs.map(p => ({
                ...p,
                amt: parseMoneyInput(p.amt, bRate * (Number(p.pts) || 1)),
                pts: Number(p.pts) || 1,
                bonus: Number(p.bonus) || 0,
                hot: !!p.hot,
                hidden: !!p.hidden
            }));
        }

        globalTopupConfig = {
            ...globalTopupConfig,
            ...data,
            anchorAmt: bRate,
            baseRate: bRate,
            anchorPts: 1,
            packages: pkgs
        };

        try {
            localStorage.setItem('tlnx_saved_topup_config', JSON.stringify(globalTopupConfig));
        } catch (e) {}

        renderPackages();

        // Nếu là admin, điền sẵn vào form cấu hình
        const isAdmin = currentUserInfo && isUserAdmin(currentUserInfo.email);
        if (isAdmin) {
            const amtInp = document.getElementById('admin-anchor-amt');
            if (amtInp) amtInp.value = globalTopupConfig.anchorAmt;
            
            const ratePrev = document.getElementById('admin-rate-preview');
            if (ratePrev && globalTopupConfig.baseRate) {
               ratePrev.textContent = globalTopupConfig.baseRate.toLocaleString('vi-VN');
            }

            // Show last updated info
            const lastUpdatedEl = document.getElementById('admin-last-updated');
            if (lastUpdatedEl && globalTopupConfig.updatedAt) {
                try {
                    const date = typeof globalTopupConfig.updatedAt.toDate === 'function' ? globalTopupConfig.updatedAt.toDate() : new Date(globalTopupConfig.updatedAt);
                    const fromNow = date.toLocaleString('vi-VN');
                    lastUpdatedEl.innerHTML = `Lưu cuối: ${fromNow} <br class="sm:hidden"> bởi ${globalTopupConfig.updatedBy || 'admin'}`;
                } catch(e) {}
            }

            renderAdminPackages();
        }
    };

    // Also try fetching from server endpoint
    fetch('/api/topup-config')
        .then(r => r.json())
        .then(res => {
            if (res && res.success && res.data) {
                applyConfigData(res.data);
            }
        })
        .catch(() => {});

    try {
        unsubscribeTopupConfig = db.collection('config').doc('topup').onSnapshot(doc => {
            if (doc.exists) {
                applyConfigData(doc.data());
            } else {
                db.collection('system_config').doc('topup').get().then(sDoc => {
                    if (sDoc.exists) applyConfigData(sDoc.data());
                    else applyConfigData(null);
                }).catch(() => applyConfigData(null));
            }
        }, err => {
            console.warn("Firestore config/topup onSnapshot fallback:", err);
            db.collection('config').doc('topup').get().then(doc => {
                if (doc.exists) applyConfigData(doc.data());
                else applyConfigData(null);
            }).catch(() => applyConfigData(null));
        });
    } catch (e) {
        applyConfigData(null);
    }
}

function renderPackages() {
    const container = document.getElementById('packages-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const bRate = globalTopupConfig.baseRate || globalTopupConfig.anchorAmt || 30000;
    
    globalTopupConfig.packages.forEach(pkg => {
        if (pkg.hidden) return; // Skip hidden packages
        
        const years = pkg.pts || Math.round((pkg.amt || bRate) / bRate) || 1;
        const amt = pkg.amt !== undefined && pkg.amt !== null ? pkg.amt : Math.round(bRate * years);

        const pkgDiv = document.createElement('div');
        pkgDiv.className = `group border-2 ${pkg.hot ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'} hover:border-emerald-500 hover:bg-emerald-50 p-3 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center bg-white shadow-md hover:shadow-lg relative overflow-hidden h-24 sm:h-28`;
        pkgDiv.setAttribute('data-action', 'generate-qr');
        pkgDiv.setAttribute('data-pts', years);
        pkgDiv.setAttribute('data-amt', amt);
        
        const bonusTag = (pkg.bonus > 0) ? `<div class="absolute -top-0 -right-0 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-bl-xl shadow-sm animate-pulse">-${pkg.bonus}%</div>` : '';
        
        pkgDiv.innerHTML = `
            ${bonusTag}
            <div class="text-[16px] sm:text-[18px] font-black uppercase tracking-tight text-slate-800 group-hover:text-emerald-700 mb-1">${years} NĂM</div>
            <div class="text-[14px] sm:text-[16px] font-black text-rose-600">${amt.toLocaleString('vi-VN')} đ</div>
        `;
        
        container.appendChild(pkgDiv);
    });

    // Auto-update or regenerate QR for the active package button if visible
    const activeBtn = container.querySelector('[data-action="generate-qr"].ring-2') || container.querySelector('[data-action="generate-qr"]');
    if (activeBtn && currentUserInfo) {
        generateQR(activeBtn, parseFloat(activeBtn.getAttribute('data-pts')), parseInt(activeBtn.getAttribute('data-amt')));
    }
}

function initTopup() {
    loadTopupConfig();
    
    if (currentUserInfo && document.getElementById('uid-display')) {
        document.getElementById('uid-display').innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg> UID: ${currentUserInfo.uid.substring(0, 6).toUpperCase()}`;
    }
    
    // Reset state
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const qrImg = document.getElementById('qr-img');
    const qrInfo = document.getElementById('qr-info-display');
    const qrMemoText = document.getElementById('qr-memo-text');
    
    if (qrPlaceholder) qrPlaceholder.classList.remove('hidden');
    if (qrImg) {
        qrImg.classList.add('hidden');
        qrImg.src = '';
    }
    if (qrInfo) qrInfo.classList.add('hidden');
    if (qrMemoText) qrMemoText.textContent = '---';
    
    // Tự động chọn gói đầu tiên sau khi load config (qua renderPackages)
    // Coi như retry 3 lần mỗi giây nếu chưa thấy packages
    let attempts = 0;
    const autoSelect = setInterval(() => {
        const firstPackage = document.querySelector('[data-action="generate-qr"]');
        if (firstPackage && currentUserInfo) {
            generateQR(firstPackage, parseFloat(firstPackage.getAttribute('data-pts')), parseInt(firstPackage.getAttribute('data-amt')));
            clearInterval(autoSelect);
        }
        attempts++;
        if (attempts > 10) clearInterval(autoSelect); // Timeout after 10s
    }, 1000);
}

function generateQR(btn, points, amount) {
    try {
        if(!currentUserInfo) {
            console.warn("generateQR: No currentUserInfo");
            return;
        }
        const uid = currentUserInfo.uid;
        
        // Xóa active khỏi các nút khác
        document.querySelectorAll('[data-action="generate-qr"], #custom-qr-container').forEach(b => {
            b.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'border-blue-500', 'border-emerald-500');
            b.classList.add('border-slate-200');
        });
        
        // Thêm active
        if (btn) {
            btn.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'border-blue-500');
            btn.classList.remove('border-slate-200');
        }
        
        // Tự động tạo mã QR với VietQR
        let bankCode = currentUserInfo.bankCode;
        if (!bankCode) {
            bankCode = Math.floor(100000 + Math.random() * 900000).toString();
            currentUserInfo.bankCode = bankCode;
            db.collection('users').doc(uid).set({ bankCode: bankCode }, { merge: true }).catch(() => {});
        }
        
        const userPrefix = (currentUserInfo.email ? currentUserInfo.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 15) : '');
        const MEMO = `NAP ${bankCode} ${userPrefix}`.trim();
        const BANK_ID = "vietinbank"; 
        const ACCOUNT_NO = "101879516096"; 
        const ACCOUNT_NAME = "HOANG VAN DINH KHOA";

        // Ghi lại thông tin chờ nạp để Webhook nhận diện chính xác 100%
        try {
            db.collection('pending_topups').doc(bankCode).set({
                uid: currentUserInfo.uid,
                email: currentUserInfo.email || '',
                bankCode: bankCode,
                amount: amount,
                pts: points,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(() => {});
        } catch (e) {}
        
        const url = `https://qr.sepay.vn/img?bank=${BANK_ID}&acc=${ACCOUNT_NO}&template=compact&amount=${amount}&des=${encodeURIComponent(MEMO)}`;
        
        const qrImg = document.getElementById('qr-img');
        const qrPlaceholder = document.getElementById('qr-placeholder');
        const qrMemoText = document.getElementById('qr-memo-text');
        
        // QR INFO Display
        const qrInfo = document.getElementById('qr-info-display');
        const qrInfoPts = document.getElementById('qr-info-pts');
        const qrInfoAmt = document.getElementById('qr-info-amt');
        
        if (qrImg && qrPlaceholder) {
            qrImg.src = url;
            qrPlaceholder.classList.add('hidden');
            qrImg.classList.remove('hidden');
            
            if (qrInfo && qrInfoPts && qrInfoAmt) {
                qrInfo.classList.remove('hidden');
                qrInfo.classList.add('flex');
                qrInfoPts.textContent = `/ ${points} năm`;
                qrInfoAmt.textContent = `${amount.toLocaleString('vi-VN')} VNĐ`;
            }
        }
        
        if (qrMemoText) {
            qrMemoText.textContent = MEMO;
            qrMemoText.onclick = () => {
                navigator.clipboard.writeText(MEMO).then(() => {
                    showToast("Đã sao chép: " + MEMO, "success");
                });
            };
        }

        // Bắt đầu lắng nghe tự động kiểm tra trạng thái nạp tiền
        startPaymentAutoCheck(currentUserInfo);
    } catch(err) {
        console.error("QR Generation Error:", err);
        showToast("Lỗi tạo QR: " + err.message, "error");
    }
}

let paymentPollTimer = null;

async function manualCheckPayment(showFeedback = true) {
    if (!currentUserInfo) return false;
    const uid = currentUserInfo.uid;
    const email = currentUserInfo.email || '';
    const bankCode = currentUserInfo.bankCode || '';

    const btn = document.getElementById('btn-manual-check-payment');
    if (btn) {
        btn.innerHTML = `<div class="spinner w-3.5 h-3.5 border-t-white inline-block"></div> <span>Đang kiểm tra...</span>`;
        btn.disabled = true;
    }

    const resetBtn = () => {
        if (btn) {
            btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> <span>Kiểm tra giao dịch ngay</span>`;
            btn.disabled = false;
        }
    };

    const showSuccessUI = (isVip, credits, expiryDateVal, expiryStr) => {
        currentUserInfo.isVip = true;
        currentUserInfo.credits = credits;
        currentUserInfo.expiryDate = expiryDateVal;
        
        const qrPlaceholder = document.getElementById('qr-placeholder');
        const qrImg = document.getElementById('qr-img');
        if (qrImg) qrImg.classList.add('hidden');
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = `<div class="p-4 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200">
                <div class="text-3xl mb-1">🎉</div>
                <div class="text-base font-black">GIA HẠN THÀNH CÔNG!</div>
                <div class="text-xs text-emerald-600 mt-1">Hạn mới: ${expiryStr || 'Đã kích hoạt VIP'}</div>
            </div>`;
            qrPlaceholder.classList.remove('hidden');
        }

        if (showFeedback) {
            showToast(`🎉 Xác nhận thành công! Tài khoản của bạn đã được gia hạn VIP đến ${expiryStr || ''}`, "success");
        }
    };

    try {
        // 1. Kiểm tra trực tiếp dữ liệu Firestore từ Client SDK
        if (uid) {
            try {
                const userSnap = await db.collection("users").doc(uid).get();
                if (userSnap.exists) {
                    const data = userSnap.data() || {};
                    const expD = parseFirestoreDate(data.expiryDate);
                    const now = new Date();
                    const isVipByDate = expD && expD.getTime() > now.getTime();
                    const isVip = isUserAdmin(email) || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || isVipByDate || ((data.credits || 0) > 0);

                    if (isVip && expD) {
                        resetBtn();
                        showSuccessUI(true, data.credits || 0, data.expiryDate, expD.toLocaleDateString('vi-VN'));
                        return true;
                    }
                }
            } catch (fsErr) {
                console.warn("[Client DB Check] Error:", fsErr);
            }
        }

        // 2. Kiểm tra qua Backend API endpoint với nhiều URL fallback
        const candidateHosts = Array.from(new Set([
            getApiBaseUrl(),
            window.location.origin,
            "https://ais-pre-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app",
            "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app"
        ])).filter(h => h && (h.startsWith('http://') || h.startsWith('https://')));

        for (const host of candidateHosts) {
            try {
                const url = `${host}/api/check-payment?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}&bankCode=${encodeURIComponent(bankCode)}`;
                const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.success && (data.isVip || (data.credits || 0) > 0)) {
                        resetBtn();
                        showSuccessUI(data.isVip, data.credits, data.expiryDate, data.expiryDateStr);
                        return true;
                    }
                }
            } catch (err) {
                console.warn(`[Check Payment Host ${host}] Error:`, err.message);
            }
        }

        resetBtn();
        if (showFeedback) {
            showToast("Hệ thống chưa nhận được thông báo chuyển khoản từ ngân hàng. Vui lòng chờ 5-15 giây sau khi hoàn tất thanh toán rồi bấm kiểm tra lại.", "info");
        }
    } catch (e) {
        resetBtn();
        if (showFeedback) {
            showToast("Hệ thống chưa nhận được thông báo từ ngân hàng. Vui lòng kiểm tra lại sau giây lát.", "info");
        }
    }
    return false;
}

function startPaymentAutoCheck(user) {
    if (!user) return;
    if (paymentPollTimer) clearInterval(paymentPollTimer);

    paymentPollTimer = setInterval(async () => {
        try {
            const success = await manualCheckPayment(false);
            if (success) {
                clearInterval(paymentPollTimer);
                paymentPollTimer = null;
            }
        } catch (e) {}
    }, 2500);
}

function syncAdminPackagesToLiveUI() {
    const rawAnchor = document.getElementById('admin-anchor-amt')?.value;
    const anchorAmt = parseMoneyInput(rawAnchor, globalTopupConfig.anchorAmt || 1000);
    const packageRows = document.querySelectorAll('.package-row');
    const packages = [];
    
    packageRows.forEach(row => {
        const amtInput = row.querySelector('.pkg-amt-readonly');
        const yearsInput = row.querySelector('.pkg-years');
        const bonusInput = row.querySelector('.pkg-bonus');
        const hotInput = row.querySelector('.pkg-hot');
        const hiddenInput = row.querySelector('.pkg-hidden');

        if (amtInput && yearsInput && bonusInput && hotInput) {
            const amt = parseMoneyInput(amtInput.value, 0);
            const pts = parseFloat(yearsInput.value) || 1;
            const bonus = parseFloat(bonusInput.value) || 0;
            const hot = hotInput.checked;
            const hidden = hiddenInput ? hiddenInput.checked : false;
            
            if (amt > 0) {
                packages.push({ amt, pts, bonus, hot, hidden });
            }
        }
    });

    if (packages.length > 0) {
        globalTopupConfig.anchorAmt = anchorAmt;
        globalTopupConfig.baseRate = anchorAmt;
        globalTopupConfig.packages = packages.sort((a, b) => a.pts - b.pts);
        try {
            localStorage.setItem('tlnx_saved_topup_config', JSON.stringify(globalTopupConfig));
        } catch (e) {}
        renderPackages();
        
        // Auto update QR code for currently active package
        const activePkgBtn = document.querySelector('[data-action="generate-qr"].ring-2') || document.querySelector('[data-action="generate-qr"]');
        if (activePkgBtn && currentUserInfo) {
            generateQR(activePkgBtn, parseFloat(activePkgBtn.getAttribute('data-pts')), parseInt(activePkgBtn.getAttribute('data-amt')));
        }
    }
}

function setupAdminListeners() {
    const anchorAmt = document.getElementById('admin-anchor-amt');
    if (anchorAmt && !anchorAmt.__hasListener) {
        anchorAmt.__hasListener = true;
        const onAnchorInput = () => {
             const amt = parseMoneyInput(anchorAmt.value, 0);
             const ratePrev = document.getElementById('admin-rate-preview');
             if (ratePrev) ratePrev.textContent = amt.toLocaleString('vi-VN');
             
             // Update all current rows
             const packageRows = document.querySelectorAll('.package-row');
             packageRows.forEach(row => {
                 const bonus = parseFloat(row.querySelector('.pkg-bonus')?.value) || 0;
                 const years = parseFloat(row.querySelector('.pkg-years')?.value) || 0;
                 const basePrice = Math.round(amt * years);
                 const finalPrice = Math.round(basePrice * (1 - bonus / 100));
                 
                 const basePrev = row.querySelector('.base-price-preview');
                 if (basePrev) basePrev.textContent = basePrice.toLocaleString('vi-VN') + ' đ';
                 const amtInp = row.querySelector('.pkg-amt-readonly');
                 if (amtInp) amtInp.value = finalPrice;
                 const finPrev = row.querySelector('.final-price-preview');
                 if (finPrev) finPrev.textContent = finalPrice.toLocaleString('vi-VN') + ' đ';
             });

             syncAdminPackagesToLiveUI();
        };

        anchorAmt.addEventListener('input', onAnchorInput);
        anchorAmt.addEventListener('change', onAnchorInput);
    }
}

function initAdminPanel() {
    setupAdminListeners();
}

function renderAdminPackages() {
    const list = document.getElementById('admin-packages-list');
    if (!list) return;
    list.innerHTML = '';
    
    // Sort packages by years before rendering
    let packages = [...(globalTopupConfig.packages || [])];
    if (packages.length === 0) {
        const bAmt = globalTopupConfig.anchorAmt || 30000;
        packages = [
            { amt: bAmt, pts: 1, bonus: 0, hot: false, hidden: false },
            { amt: bAmt * 2, pts: 2, bonus: 0, hot: false, hidden: false },
            { amt: bAmt * 3, pts: 3, bonus: 0, hot: true, hidden: false },
            { amt: bAmt * 5, pts: 5, bonus: 0, hot: false, hidden: false }
        ];
        globalTopupConfig.packages = packages;
    }
    
    packages.sort((a, b) => a.pts - b.pts).forEach(pkg => {
        addAdminPackageRow(pkg);
    });
}

function adminResetDefaultPackages() {
    const bAmt = parseMoneyInput(document.getElementById('admin-anchor-amt')?.value, 30000);
    globalTopupConfig.packages = [
        { amt: bAmt, pts: 1, bonus: 0, hot: false, hidden: false },
        { amt: bAmt * 2, pts: 2, bonus: 0, hot: false, hidden: false },
        { amt: bAmt * 3, pts: 3, bonus: 0, hot: true, hidden: false },
        { amt: bAmt * 5, pts: 5, bonus: 0, hot: false, hidden: false }
    ];
    globalTopupConfig.anchorAmt = bAmt;
    globalTopupConfig.baseRate = bAmt;
    renderAdminPackages();
    syncAdminPackagesToLiveUI();
    showToast("Đã khôi phục 4 gói chuẩn (1, 2, 3, 5 năm) theo đơn giá " + bAmt.toLocaleString('vi-VN') + " đ/năm! Nhấn 'Lưu cấu hình' để đồng bộ toàn hệ thống.", "info");
}

function addAdminPackageRow(pkg = {amt: 30000, pts: 1, bonus: 0, hot: false, hidden: false}) {
    const list = document.getElementById('admin-packages-list');
    if (!list) return;

    // Ensure list is visible when adding new
    const container = document.getElementById('admin-packages-list-container');
    const chevron = document.getElementById('packages-chevron');
    if (container && container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
    
    const row = document.createElement('div');
    row.className = 'bg-white p-2 rounded-lg border border-slate-200 shadow-sm relative group package-row';
    
    const updatePreview = () => {
        const bonus = parseFloat(row.querySelector('.pkg-bonus')?.value) || 0;
        const years = parseFloat(row.querySelector('.pkg-years')?.value) || 0;
        
        const rawAnchor = document.getElementById('admin-anchor-amt')?.value;
        const anchorAmt = parseMoneyInput(rawAnchor, globalTopupConfig.anchorAmt || 30000);
        const basePrice = Math.round(anchorAmt * years);
        const finalPrice = Math.round(basePrice * (1 - bonus / 100));
        
        const baseEl = row.querySelector('.base-price-preview');
        if (baseEl) baseEl.textContent = basePrice.toLocaleString('vi-VN') + ' đ';
        const amtEl = row.querySelector('.pkg-amt-readonly');
        if (amtEl) amtEl.value = finalPrice;
        const finEl = row.querySelector('.final-price-preview');
        if (finEl) finEl.textContent = finalPrice.toLocaleString('vi-VN') + ' đ';

        syncAdminPackagesToLiveUI();
    };

    const curAnchor = parseMoneyInput(document.getElementById('admin-anchor-amt')?.value, globalTopupConfig.anchorAmt || 30000);
    const yrs = pkg.pts || 1;
    const initBase = Math.round(curAnchor * yrs);
    const initFinal = (pkg.amt !== undefined && pkg.amt !== null) ? pkg.amt : Math.round(initBase * (1 - (pkg.bonus || 0) / 100));

    row.innerHTML = `
        <button class="btn-delete-pkg absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all z-10 opacity-0 group-hover:opacity-100">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div class="grid grid-cols-2 gap-2 items-center">
            <div class="flex items-center gap-1.5">
                <div class="flex-1">
                    <label class="block text-[8px] text-slate-400 font-bold uppercase">Năm</label>
                    <input type="number" step="0.1" class="pkg-years w-full px-1.5 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded font-bold text-slate-700 focus:outline-none" value="${yrs}">
                </div>
                <div class="flex-1">
                    <label class="block text-[8px] text-slate-400 font-bold uppercase">Giảm %</label>
                    <input type="number" class="pkg-bonus w-full px-1.5 py-0.5 text-xs bg-rose-50 border border-rose-100 rounded font-bold text-rose-600 focus:outline-none" value="${pkg.bonus || 0}">
                </div>
            </div>
            
            <div class="flex flex-col items-end">
                <div class="base-price-preview text-[8px] font-bold text-slate-300 line-through">${initBase.toLocaleString('vi-VN')} đ</div>
                <div class="final-price-preview text-[11px] font-black text-blue-600">${initFinal.toLocaleString('vi-VN')} đ</div>
                <input type="hidden" class="pkg-amt-readonly" value="${initFinal}">
            </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 mt-1.5 pt-1">
            <div class="flex items-center gap-3">
                <label class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" class="pkg-hot w-3 h-3 rounded text-red-600 focus:ring-red-500" ${pkg.hot ? 'checked' : ''}>
                    <span class="text-[8px] font-bold text-slate-400 uppercase">HOT</span>
                </label>
                <label class="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" class="pkg-hidden w-3 h-3 rounded text-slate-400 focus:ring-slate-400" ${pkg.hidden ? 'checked' : ''}>
                    <span class="text-[8px] font-bold text-slate-400 uppercase">ẨN GÓI</span>
                </label>
            </div>
            <button class="btn-create-qr-preview text-[8px] font-black text-slate-400 hover:text-blue-600 uppercase transition-colors">Thử QR</button>
        </div>
    `;
    
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    row.querySelector('.btn-delete-pkg').addEventListener('click', () => {
        row.remove();
        syncAdminPackagesToLiveUI();
    });

    row.querySelector('.btn-create-qr-preview').addEventListener('click', () => {
        const amt = parseMoneyInput(row.querySelector('.pkg-amt-readonly')?.value, 0);
        const yVal = parseFloat(row.querySelector('.pkg-years')?.value) || 0;
        generateQR(null, yVal, amt);
        window.scrollTo({top: 0, behavior: 'smooth'});
        showToast("Đã tạo bản xem trước QR cho gói " + yVal + " năm (" + amt.toLocaleString('vi-VN') + " đ)!", "success");
    });

    list.appendChild(row);
}

async function adminSaveTopupConfig() {
    const rawAnchor = document.getElementById('admin-anchor-amt')?.value;
    const anchorAmt = parseMoneyInput(rawAnchor, 1000);
    const anchorPts = 1;
    const baseRate = anchorAmt;
    
    const packageRows = document.querySelectorAll('.package-row');
    const packages = [];
    
    packageRows.forEach(row => {
        const amtInput = row.querySelector('.pkg-amt-readonly');
        const yearsInput = row.querySelector('.pkg-years');
        const bonusInput = row.querySelector('.pkg-bonus');
        const hotInput = row.querySelector('.pkg-hot');
        const hiddenInput = row.querySelector('.pkg-hidden');

        if (amtInput && yearsInput && bonusInput && hotInput) {
            const amt = parseMoneyInput(amtInput.value, 0);
            const pts = parseFloat(yearsInput.value) || 1;
            const bonus = parseFloat(bonusInput.value) || 0;
            const hot = hotInput.checked;
            const hidden = hiddenInput ? hiddenInput.checked : false;
            
            if (amt > 0) {
                packages.push({ amt, pts, bonus, hot, hidden });
            }
        }
    });

    if (packages.length === 0) {
        return showToast("Phải có ít nhất một gói nạp", "error");
    }
    
    try {
        const newConfig = {
            anchorAmt: anchorAmt,
            anchorPts: anchorPts,
            baseRate: baseRate,
            packages: packages.sort((a, b) => a.pts - b.pts),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUserInfo ? currentUserInfo.email : 'admin'
        };
        
        await db.collection('config').doc('topup').set(newConfig, { merge: true });
        await db.collection('system_config').doc('topup').set(newConfig, { merge: true }).catch(() => {});
        
        try {
            await fetch(`${getApiBaseUrl()}/api/admin/topup-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
        } catch (e) {}

        globalTopupConfig = { ...globalTopupConfig, ...newConfig };
        try {
            localStorage.setItem('tlnx_saved_topup_config', JSON.stringify(globalTopupConfig));
        } catch (e) {}

        renderPackages();
        const firstPkg = document.querySelector('[data-action="generate-qr"]');
        if (firstPkg && currentUserInfo) {
            generateQR(firstPkg, parseFloat(firstPkg.getAttribute('data-pts')), parseInt(firstPkg.getAttribute('data-amt')));
        }
        showToast("Đã lưu và đồng bộ bảng giá mới (" + anchorAmt.toLocaleString('vi-VN') + " đ/năm) lên toàn hệ thống thành công!", "success");
    } catch (e) {
        showToast("Lỗi khi lưu: " + e.message, "error");
    }
}

let currentAdminMode = 'add'; // 'add' | 'set'

async function searchUserByEmail(forcedUid) {
    const email = document.getElementById('admin-target-email').value.trim().toLowerCase();
    const uidDiv = document.getElementById('admin-target-uid');
    uidDiv.textContent = "Đang tìm...";
    uidDiv.classList.remove('hidden');

    let userData = null;
    let docId = null;

    if (forcedUid) {
        try {
            const uDoc = await db.collection('users').doc(forcedUid).get();
            if (uDoc.exists) {
                docId = uDoc.id;
                userData = uDoc.data() || {};
            }
        } catch(e) {
            console.warn("Direct UID get error:", e);
        }
    }

    if (!userData && email) {
        try {
            const snapshot = await db.collection('users').where('email', '==', email).get();
            if(!snapshot.empty) {
                // Ưu tiên chọn document có UID thật của Firebase Auth (không bắt đầu bằng user_)
                const realDoc = snapshot.docs.find(d => !d.id.startsWith("user_"));
                const userDoc = realDoc || snapshot.docs[0];
                docId = userDoc.id;
                userData = userDoc.data() || {};
            }
        } catch(error) {
            console.warn("Firestore search fallback:", error);
        }
    }

    if (!userData && email) {
        // Search in cached rows or admin fallback
        const foundLocal = cachedUserRows.find(u => u.email && u.email.toLowerCase() === email);
        if (foundLocal) {
            docId = foundLocal.id;
            userData = {
                displayName: foundLocal.displayName,
                email: foundLocal.email,
                credits: foundLocal.credits,
                points: foundLocal.points,
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            };
        } else if (isUserAdmin(email)) {
            docId = 'admin_vip_doc';
            userData = {
                displayName: 'Quản Trị Viên VIP',
                email: email,
                credits: 999,
                points: 999,
                expiryDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
            };
        }
    }

    if (!userData) {
        if (!email) {
            uidDiv.classList.add('hidden');
            return showToast("Vui lòng nhập email hợp lệ", "error");
        }
        const targetEmail = email;
        const preDocId = 'user_' + targetEmail.replace(/[^a-zA-Z0-9]/g, '_');
        uidDiv.innerHTML = `💡 <span class="text-amber-800 font-bold">Email mới (Chưa đăng ký):</span> Bạn có thể <span class="text-red-600 font-black">chọn gói/số lượng bên dưới và bấm Xác nhận nạp</span> để tự động tạo & kích hoạt VIP trước!`;
        uidDiv.dataset.uid = preDocId;
        uidDiv.dataset.isNew = "true";
        uidDiv.dataset.email = targetEmail;
        uidDiv.dataset.credits = "0";
        uidDiv.dataset.points = "0";
        uidDiv.dataset.expiry = "";

        const oldCreditsBadge = document.getElementById('admin-old-credits-badge');
        const oldPointsBadge = document.getElementById('admin-old-points-badge');
        const oldExpiryText = document.getElementById('admin-old-expiry-text');
        if (oldCreditsBadge) oldCreditsBadge.textContent = "VIP: 0 (Mới)";
        if (oldPointsBadge) oldPointsBadge.textContent = "Điểm: 0 (Mới)";
        if (oldExpiryText) oldExpiryText.textContent = "Chưa có hạn (Tạo mới)";
        return;
    }

    uidDiv.textContent = "✅ UID: " + docId;
    uidDiv.dataset.uid = docId; // Save to dataset
    uidDiv.dataset.expiry = userData.expiryDate ? (typeof userData.expiryDate.toDate === 'function' ? userData.expiryDate.toDate().toISOString() : new Date(userData.expiryDate).toISOString()) : '';
    uidDiv.dataset.credits = (userData.credits || 0).toString();
    uidDiv.dataset.points = (userData.points || 0).toString();

    // Cập nhật badges số dư cũ
    const oldCreditsBadge = document.getElementById('admin-old-credits-badge');
    const oldPointsBadge = document.getElementById('admin-old-points-badge');
    if (oldCreditsBadge) {
        const cred = userData.credits || 0;
        oldCreditsBadge.textContent = `VIP: ${cred > 0 && cred < 1 ? Math.round(cred * 365) + ' Ngày' : cred + ' Năm'}`;
    }
    if (oldPointsBadge) oldPointsBadge.textContent = `Điểm: ${userData.points || 0} Lượt`;

    // Populate VIP start date & Custom date
    const vipStartInput = document.getElementById('admin-vip-start-date');
    const customExpiryInput = document.getElementById('admin-custom-expiry-date');
    const oldExpiryText = document.getElementById('admin-old-expiry-text');
    
    if (userData.expiryDate) {
        const date = typeof userData.expiryDate.toDate === 'function' ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        
        const now = new Date();
        const diffDays = Math.max(0, Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const remainingNote = date > now ? ` (Còn ${diffDays} ngày)` : ' (Đã hết hạn)';

        if (oldExpiryText) {
            oldExpiryText.textContent = date.toLocaleString('vi-VN', { 
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            }) + remainingNote;
        }

        if (customExpiryInput) {
            customExpiryInput.value = localISOTime;
        }

        // Set default VIP start date to current expiry if it's in future, otherwise now
        if (vipStartInput) {
            if (date > new Date()) {
                vipStartInput.value = localISOTime;
            } else {
                const nowISO = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
                vipStartInput.value = nowISO;
            }
        }
    } else {
        if (oldExpiryText) oldExpiryText.textContent = 'Trống (Mới)';
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const nowISO = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
        if (vipStartInput) vipStartInput.value = nowISO;
        if (customExpiryInput) {
            const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            customExpiryInput.value = (new Date(nextYear.getTime() - offset)).toISOString().slice(0, 16);
        }
    }
    refreshAdminVipPreview();
}

function setAdminMode(mode) {
    currentAdminMode = mode;
    const addBtn = document.getElementById('admin-mode-add');
    const setBtn = document.getElementById('admin-mode-set');
    const confirmLabel = document.getElementById('admin-confirm-btn-label');

    if (mode === 'add') {
        if (addBtn) {
            addBtn.className = "admin-mode-btn py-1 px-2 rounded-md bg-white text-indigo-700 shadow-sm transition-all font-black";
        }
        if (setBtn) {
            setBtn.className = "admin-mode-btn py-1 px-2 rounded-md text-slate-600 hover:text-slate-900 transition-all font-black";
        }
        if (confirmLabel) confirmLabel.textContent = "Xác nhận nạp thêm";
    } else {
        if (setBtn) {
            setBtn.className = "admin-mode-btn py-1 px-2 rounded-md bg-white text-indigo-700 shadow-sm transition-all font-black";
        }
        if (addBtn) {
            addBtn.className = "admin-mode-btn py-1 px-2 rounded-md text-slate-600 hover:text-slate-900 transition-all font-black";
        }
        if (confirmLabel) confirmLabel.textContent = "Xác nhận chỉnh lại (Đặt giá trị)";
    }
    refreshAdminVipPreview();
}

function refreshAdminVipPreview() {
    const type = document.getElementById('admin-credit-type')?.value;
    const amountInput = document.getElementById('admin-credit-amount');
    const amount = parseFloat(amountInput?.value) || 0;
    const startDateStr = document.getElementById('admin-vip-start-date')?.value;
    const customExpiryStr = document.getElementById('admin-custom-expiry-date')?.value;
    const resultText = document.getElementById('admin-vip-new-expiry');
    const uidDiv = document.getElementById('admin-target-uid');
    const amountGroup = document.getElementById('admin-amount-group');
    const amountLabel = document.getElementById('admin-amount-label');
    const vipStartGroup = document.getElementById('admin-vip-start-group');
    const directDateGroup = document.getElementById('admin-direct-date-group');

    // Cập nhật UI theo Loại thao tác
    if (type === 'direct_date') {
        if (amountGroup) amountGroup.classList.add('hidden');
        if (vipStartGroup) vipStartGroup.classList.add('hidden');
        if (directDateGroup) directDateGroup.classList.remove('hidden');

        if (customExpiryStr && resultText) {
            const targetDate = new Date(customExpiryStr);
            if (!isNaN(targetDate.getTime())) {
                const now = new Date();
                const diffMs = targetDate.getTime() - now.getTime();
                const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                const diffYears = (diffDays / 365).toFixed(2);
                resultText.textContent = `Hết hạn: ${targetDate.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (Còn ~${diffDays} ngày = ${diffYears} năm)`;
                resultText.className = "text-[12px] font-black text-rose-700 text-center leading-tight";
            }
        }
        return;
    }

    if (amountGroup) amountGroup.classList.remove('hidden');
    if (directDateGroup) directDateGroup.classList.add('hidden');

    if (type === 'credits') {
        if (amountLabel) amountLabel.textContent = "3. Số lượng (Năm VIP)";
        if (vipStartGroup) vipStartGroup.classList.remove('hidden');
        if (amountInput) amountInput.placeholder = "VD: 1 (hoặc 0.5 năm)";
    } else if (type === 'days') {
        if (amountLabel) amountLabel.textContent = "3. Số lượng (Số Ngày VIP)";
        if (vipStartGroup) vipStartGroup.classList.remove('hidden');
        if (amountInput) amountInput.placeholder = "VD: 30 (hoặc 90, 365 ngày)";
    } else if (type === 'points') {
        if (amountLabel) amountLabel.textContent = "3. Số lượng (Lượt / Điểm)";
        if (vipStartGroup) vipStartGroup.classList.add('hidden');
        if (amountInput) amountInput.placeholder = "VD: 50 (hoặc 100 lượt)";
    }

    if (!resultText) return;

    if (type === 'points') {
        const currentPts = uidDiv && uidDiv.dataset.points ? parseInt(uidDiv.dataset.points) : 0;
        if (currentAdminMode === 'add') {
            const newPts = currentPts + amount;
            resultText.textContent = `Cũ: ${currentPts} lượt  ➔  Mới: ${newPts} lượt (+${amount})`;
        } else {
            resultText.textContent = `Đặt lại chính xác: ${amount} lượt dùng`;
        }
        resultText.className = "text-[12px] font-black text-amber-800 text-center leading-tight";
        return;
    }

    // VIP (Năm hoặc Ngày)
    if (amount <= 0 && currentAdminMode === 'add') {
        resultText.textContent = '-- : --';
        resultText.className = "text-[12px] font-black text-slate-400 text-center leading-tight";
        return;
    }

    let baseDate = new Date();
    if (startDateStr) {
        const manualStart = new Date(startDateStr);
        if (!isNaN(manualStart.getTime())) baseDate = manualStart;
    } else if (currentAdminMode === 'add' && uidDiv && uidDiv.dataset.expiry) {
        const existingExp = new Date(uidDiv.dataset.expiry);
        if (existingExp > baseDate) baseDate = existingExp;
    }

    let msToAdd = 0;
    let daysToAdd = 0;
    if (type === 'credits') {
        daysToAdd = Math.round(amount * 365);
        msToAdd = amount * 365 * 24 * 60 * 60 * 1000;
    } else if (type === 'days') {
        daysToAdd = Math.round(amount);
        msToAdd = amount * 24 * 60 * 60 * 1000;
    }

    const end = new Date(baseDate.getTime() + msToAdd);
    const dateFormatted = end.toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });

    const now = new Date();
    const totalRemainingDays = Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const totalRemainingYears = (totalRemainingDays / 365).toFixed(2);

    resultText.textContent = `${dateFormatted} (~${totalRemainingDays} ngày / ${totalRemainingYears} năm)`;
    resultText.className = "text-[12px] font-black text-blue-700 text-center leading-tight";
}

async function adminUpdateCredit() {
    const uid = document.getElementById('admin-target-uid')?.dataset.uid;
    const amountStr = document.getElementById('admin-credit-amount')?.value;
    const type = document.getElementById('admin-credit-type')?.value; 
    const startDateStr = document.getElementById('admin-vip-start-date')?.value;
    const customExpiryStr = document.getElementById('admin-custom-expiry-date')?.value;
    const amount = parseFloat(amountStr) || 0;

    if(!uid) return showToast("Vui lòng 'Tìm User ID' hợp lệ trước.", "error");

    try {
        let userDocExists = false;
        let userData = {};
        const userRef = db.collection('users').doc(uid);

        try {
            const userSnapshot = await userRef.get();
            if (userSnapshot.exists) {
                userDocExists = true;
                userData = userSnapshot.data() || {};
            }
        } catch(e) {
            console.warn("User get from Firestore error:", e);
        }

        // Check in local cache if not found on Firestore
        const cachedUser = cachedUserRows.find(u => u.id === uid);
        if (cachedUser) {
            userData.credits = cachedUser.credits;
            userData.points = cachedUser.points;
            userData.email = cachedUser.email;
        }

        const updateData = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const targetEmail = (document.getElementById('admin-target-email')?.value || '').trim().toLowerCase();
        const saveDoc = async (data) => {
            if (userDocExists) {
                await userRef.update(data);
            } else {
                const baseNewUser = {
                    email: targetEmail,
                    displayName: targetEmail.split('@')[0],
                    credits: 0,
                    points: 0,
                    bankCode: Math.floor(100000 + Math.random() * 900000).toString(),
                    deviceIds: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                await userRef.set({ ...baseNewUser, ...data }, { merge: true });
                userDocExists = true;
            }

            // Đồng bộ toàn bộ các document khác có cùng email nếu có
            if (targetEmail) {
                try {
                    const preDocId = 'user_' + targetEmail.replace(/[^a-zA-Z0-9]/g, '_');
                    if (preDocId !== userRef.id) {
                        await db.collection('users').doc(preDocId).set({ email: targetEmail, ...data }, { merge: true }).catch(() => {});
                    }

                    const snapSame = await db.collection('users').where('email', '==', targetEmail).get();
                    for (let d of snapSame.docs) {
                        if (d.id !== userRef.id && d.id !== preDocId) {
                            await d.ref.update(data).catch(() => {});
                        }
                    }
                } catch(e) {
                    console.warn("Lỗi đồng bộ các doc trùng email:", e);
                }
            }
        };

        if (type === 'direct_date') {
            if (!customExpiryStr) return showToast("Vui lòng chọn ngày hết hạn mong muốn.", "error");
            const targetDate = new Date(customExpiryStr);
            if (isNaN(targetDate.getTime())) return showToast("Ngày hết hạn không hợp lệ.", "error");

            const now = new Date();
            const diffDays = Math.max(0, Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const yearsEq = parseFloat((diffDays / 365).toFixed(2));

            updateData.expiryDate = firebase.firestore.Timestamp.fromDate(targetDate);
            updateData.credits = yearsEq;
            updateData.isVip = true;
            updateData.tier = 'VIP';
            updateData.role = 'vip';

            await saveDoc(updateData);
            if (cachedUser) {
                cachedUser.credits = yearsEq;
                cachedUser.expiryDateStr = targetDate.toLocaleDateString('vi-VN');
                cachedUser.daysRemaining = `<div class="text-[10px] sm:text-[11px] text-emerald-600 font-black mt-0.5">Còn ${diffDays} ngày</div>`;
            }
            showToast(`Đã chỉnh ngày hết hạn VIP đến ${targetDate.toLocaleDateString('vi-VN')} (Còn ${diffDays} ngày)!`, "success");
        } else if (type === 'points') {
            if (isNaN(amount)) return showToast("Vui lòng nhập số lượng lượt/điểm.", "error");
            let finalPoints = 0;
            if (currentAdminMode === 'add') {
                finalPoints = Math.max(0, (userData.points || 0) + amount);
                updateData.points = firebase.firestore.FieldValue.increment(amount);
            } else {
                finalPoints = Math.max(0, amount);
                updateData.points = finalPoints;
            }

            await saveDoc(updateData);
            if (cachedUser) cachedUser.points = finalPoints;
            showToast(`Đã ${currentAdminMode === 'add' ? 'nạp thêm' : 'chỉnh lại'} số lượt thành ${finalPoints} lượt!`, "success");
        } else {
            // credits (Năm) hoặc days (Ngày)
            if (isNaN(amount) || amount === 0) return showToast("Vui lòng nhập số lượng cần nạp/chỉnh.", "error");

            let baseDate = new Date();
            if (startDateStr) {
                const manualStart = new Date(startDateStr);
                if (!isNaN(manualStart.getTime())) baseDate = manualStart;
            } else if (currentAdminMode === 'add' && userData.expiryDate) {
                const existingExp = typeof userData.expiryDate.toDate === 'function' ? userData.expiryDate.toDate() : new Date(userData.expiryDate);
                if (existingExp > baseDate) baseDate = existingExp;
            }

            let daysToAdd = 0;
            let yearsToAdd = 0;
            if (type === 'credits') {
                yearsToAdd = amount;
                daysToAdd = amount * 365;
            } else {
                daysToAdd = amount;
                yearsToAdd = parseFloat((amount / 365).toFixed(2));
            }

            let end = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
            const now = new Date();
            const totalDays = Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const totalYears = parseFloat((totalDays / 365).toFixed(2));

            updateData.expiryDate = firebase.firestore.Timestamp.fromDate(end);
            updateData.credits = totalYears;
            updateData.isVip = true;
            updateData.tier = 'VIP';
            updateData.role = 'vip';

            await saveDoc(updateData);
            if (cachedUser) {
                cachedUser.credits = totalYears;
                cachedUser.expiryDateStr = end.toLocaleDateString('vi-VN');
                cachedUser.daysRemaining = `<div class="text-[10px] sm:text-[11px] text-emerald-600 font-black mt-0.5">Còn ${totalDays} ngày</div>`;
            }
            showToast(`Thành công! VIP đến ${end.toLocaleDateString('vi-VN')} (~${totalDays} ngày / ${totalYears} năm)`, "success");
        }

        // Clean & reload
        const amtInput = document.getElementById('admin-credit-amount');
        if (amtInput) amtInput.value = '';
        searchUserByEmail();
        renderAdminUserList();
    } catch(error) {
        showToast("Lỗi cập nhật: " + error.message, "error");
    }
}

async function adminResetExpiry() {
    const uid = document.getElementById('admin-target-uid')?.dataset.uid;
    if(!uid) return showToast("Vui lòng 'Tìm User ID' hợp lệ trước.", "error");

    const btn = document.querySelector('[data-action="admin-reset-expiry"]');
    
    // Double confirm
    if (!window._resetConfirmMode) {
        window._resetConfirmMode = true;
        const originalText = btn.textContent;
        btn.textContent = "XÁC NHẬN XÓA VIP?";
        btn.className = "px-3.5 py-2 bg-red-600 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-tight shadow-md animate-pulse";
        
        setTimeout(() => {
            window._resetConfirmMode = false;
            btn.textContent = originalText;
            btn.className = "w-fit px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black rounded-lg transition-all uppercase tracking-tight cursor-pointer";
        }, 3000);
        return;
    }

    try {
        window._resetConfirmMode = false;
        btn.textContent = "ĐANG RESET...";
        
        await db.collection('users').doc(uid).update({
            credits: 0,
            isVip: false,
            tier: 'Free',
            role: 'user',
            expiryDate: firebase.firestore.FieldValue.delete()
        });
        showToast("Đã reset hạn VIP về 0 năm thành công.", "success");
        
        // Refresh UI
        searchUserByEmail();
        loadAdminUserList();
    } catch(error) {
        showToast("Lỗi Reset: " + error.message, "error");
    }
}

async function adminResetPoints() {
    const uid = document.getElementById('admin-target-uid')?.dataset.uid;
    if(!uid) return showToast("Vui lòng 'Tìm User ID' hợp lệ trước.", "error");

    try {
        await db.collection('users').doc(uid).update({
            points: 0
        });
        showToast("Đã reset điểm sử dụng về 0 lượt thành công.", "success");
        searchUserByEmail();
        loadAdminUserList();
    } catch(error) {
        showToast("Lỗi Reset Điểm: " + error.message, "error");
    }
}

async function adminDeleteUser(btn) {
    const uid = btn.dataset.uid;
    const email = btn.dataset.email;

    if (!uid) return;
    if (isUserAdmin(email)) return showToast("Không thể xoá tài khoản Admin gốc!", "error");

    // Double confirmation via UI state
    if (!btn._confirmDelete) {
        btn._confirmDelete = true;
        btn.classList.add('bg-red-50', 'text-red-600', 'border-red-200');
        showToast("⚠️ Nhấn một lần nữa để XÁC NHẬN XOÁ tài khoản này!", "error");
        setTimeout(() => {
            btn._confirmDelete = false;
            btn.classList.remove('bg-red-50', 'text-red-600', 'border-red-200');
        }, 3000);
        return;
    }

    try {
        await db.collection('users').doc(uid).delete();
        showToast(`Đã xoá tài khoản ${email} thành công.`, "success");
    } catch (error) {
        showToast("Lỗi xoá: " + error.message, "error");
    }
}

async function adminResetDevices(btn) {
    const uid = btn.dataset.uid || btn.getAttribute('data-uid');
    const email = btn.dataset.email || btn.getAttribute('data-email');
    if (!uid) return;

    try {
        await db.collection('users').doc(uid).update({
            deviceIds: []
        });
        showToast(`Đã Reset thiết bị cho tài khoản ${email} thành công.`, "success");
    } catch (error) {
        showToast("Lỗi Reset: " + error.message, "error");
    }
}

async function adminResetPassword() {
    const email = document.getElementById('admin-target-email').value.trim();
    if(!email) return showToast("Vui lòng nhập Email", "error");
    
    try {
        await auth.sendPasswordResetEmail(email);
        showToast("Đã gửi email Reset Password tới " + email, "success");
    } catch (error) {
        showToast(translateError(error), "error");
    }
}

async function adminFillEmail(email) {
    document.getElementById('admin-target-email').value = email;
    switchAdminTab('config');
    searchUserByEmail(); // auto search
}

async function adminCreateNewUser(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById('modal-add-user-email');
    const nameInput = document.getElementById('modal-add-user-name');
    const typeSelect = document.getElementById('modal-add-user-type');
    const valInput = document.getElementById('modal-add-user-custom-val');
    const submitBtn = document.getElementById('btn-submit-add-user');

    const email = (emailInput?.value || '').trim().toLowerCase();
    const name = (nameInput?.value || '').trim();
    const typeVal = typeSelect?.value || 'credits-1';
    const customVal = parseFloat(valInput?.value) || 1;

    if (!email || !email.includes('@')) {
        return showToast("Vui lòng nhập địa chỉ email hợp lệ!", "error");
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `Đang tạo...`;
        }

        const [packType, packNum] = typeVal.split('-');
        const val = customVal > 0 ? customVal : (parseFloat(packNum) || 1);

        let credits = 0;
        let points = 0;
        let expiryDate = null;
        const now = new Date();

        if (packType === 'credits') {
            credits = val;
            const end = new Date(now.getTime() + val * 365 * 24 * 60 * 60 * 1000);
            expiryDate = firebase.firestore.Timestamp.fromDate(end);
        } else if (packType === 'days') {
            credits = parseFloat((val / 365).toFixed(2));
            const end = new Date(now.getTime() + val * 24 * 60 * 60 * 1000);
            expiryDate = firebase.firestore.Timestamp.fromDate(end);
        } else if (packType === 'points') {
            points = Math.round(val);
        }

        const docId = 'user_' + email.replace(/[^a-zA-Z0-9]/g, '_');
        const userRef = db.collection('users').doc(docId);
        
        await userRef.set({
            email: email,
            displayName: name || email.split('@')[0],
            credits: credits,
            points: points,
            expiryDate: expiryDate,
            bankCode: Math.floor(100000 + Math.random() * 900000).toString(),
            deviceIds: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showToast(`Đã tạo & kích hoạt VIP thành công cho ${email}!`, "success");
        
        // Đóng modal & reset form
        const modal = document.getElementById('modal-add-user');
        if (modal) modal.classList.add('hidden');
        if (emailInput) emailInput.value = '';
        if (nameInput) nameInput.value = '';

        // Tải lại danh sách
        loadAdminUserList();
    } catch(err) {
        showToast("Lỗi tạo tài khoản: " + err.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Lưu & Kích Hoạt Ngay`;
        }
    }
}

function updateHeaderNavActive(mode) {
    const btnNavAdmin = document.getElementById('btn-nav-admin');
    const btnNavUsers = document.getElementById('btn-nav-users');
    const btnNavTopup = document.getElementById('btn-nav-topup');
    if (!btnNavTopup) return;
    
    const realEmail = (currentUserInfo && currentUserInfo.email) ? currentUserInfo.email.toLowerCase().trim() : '';
    const isAdmin = isUserAdmin(realEmail);

    if (btnNavAdmin) {
        btnNavAdmin.className = "px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-red-700 hover:bg-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer";
        if (isAdmin) btnNavAdmin.classList.remove('hidden');
        else btnNavAdmin.classList.add('hidden');
    }
    if (btnNavUsers) {
        btnNavUsers.className = "px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-red-700 hover:bg-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer";
        if (isAdmin) btnNavUsers.classList.remove('hidden');
        else btnNavUsers.classList.add('hidden');
    }
    btnNavTopup.className = "px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer";

    if (mode === 'admin' || mode === 'config' || mode === 'version') {
        if (btnNavAdmin) {
            btnNavAdmin.className = "px-3 py-1.5 text-xs font-bold bg-white text-red-700 rounded-lg shadow-sm border border-red-200/60 hover:bg-red-50 flex items-center gap-1.5 transition-all cursor-pointer";
        }
    } else if (mode === 'users') {
        if (btnNavUsers) {
            btnNavUsers.className = "px-3 py-1.5 text-xs font-bold bg-white text-red-700 rounded-lg shadow-sm border border-red-200/60 hover:bg-red-50 flex items-center gap-1.5 transition-all cursor-pointer";
        }
    } else if (mode === 'topup') {
        btnNavTopup.className = "px-3 py-1.5 text-xs font-bold bg-white text-blue-700 rounded-lg shadow-sm border border-blue-200/60 hover:bg-blue-50 flex items-center gap-1.5 transition-all cursor-pointer";
    }
}

function switchAdminTab(tabName) {
    const configBtn = document.getElementById('admin-tab-btn-config');
    const usersBtn = document.getElementById('admin-tab-btn-users');
    const topupBtn = document.getElementById('admin-tab-btn-topup');
    const versionBtn = document.getElementById('admin-tab-btn-version');
    const configContent = document.getElementById('admin-tab-content-config');
    const usersContent = document.getElementById('admin-tab-content-users');
    const versionContent = document.getElementById('admin-tab-content-version');
    const adminPanel = document.getElementById('admin-panel');
    const topupSection = document.getElementById('topup-section');
    const adminTopupBanner = document.getElementById('admin-topup-banner');

    const realEmail = (currentUserInfo && currentUserInfo.email) ? currentUserInfo.email.toLowerCase().trim() : '';
    const isAdmin = isUserAdmin(realEmail);

    if (!isAdmin) {
        if (adminPanel) adminPanel.classList.add('hidden');
        if (topupSection) topupSection.classList.remove('hidden');
        if (adminTopupBanner) adminTopupBanner.classList.add('hidden');
        updateHeaderNavActive('topup');
        return;
    }

    if (!configBtn || !usersBtn || !configContent || !usersContent) return;

    // Reset styles
    configBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 cursor-pointer";
    usersBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 cursor-pointer";
    if (topupBtn) topupBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 cursor-pointer";
    if (versionBtn) versionBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 cursor-pointer";

    configContent.classList.remove('block');
    configContent.classList.add('hidden');
    usersContent.classList.remove('block');
    usersContent.classList.add('hidden');
    if (versionContent) {
        versionContent.classList.remove('block');
        versionContent.classList.add('hidden');
    }

    if (adminPanel) adminPanel.classList.remove('hidden');

    if (tabName === 'config') {
        configBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 bg-red-600 text-white shadow-sm cursor-pointer";
        configContent.classList.remove('hidden');
        configContent.classList.add('block');
        if (topupSection) topupSection.classList.remove('hidden');
        if (adminTopupBanner) adminTopupBanner.classList.add('hidden');
        updateHeaderNavActive('admin');
        renderAdminPackages();
    } else if (tabName === 'users') {
        usersBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 bg-red-600 text-white shadow-sm cursor-pointer";
        usersContent.classList.remove('hidden');
        usersContent.classList.add('block');
        if (topupSection) topupSection.classList.add('hidden');
        if (adminTopupBanner) adminTopupBanner.classList.add('hidden');
        loadAdminUserList();
        updateHeaderNavActive('users');
    } else if (tabName === 'topup') {
        if (topupBtn) topupBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 bg-red-600 text-white shadow-sm cursor-pointer";
        if (topupSection) {
            topupSection.classList.remove('hidden');
            if (adminTopupBanner) adminTopupBanner.classList.remove('hidden');
            setTimeout(() => {
                topupSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
        renderPackages();
        updateHeaderNavActive('topup');
    } else if (tabName === 'version') {
        if (versionBtn) versionBtn.className = "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 bg-red-600 text-white shadow-sm cursor-pointer";
        if (versionContent) {
            versionContent.classList.remove('hidden');
            versionContent.classList.add('block');
            loadCurrentVersionConfig();
        }
        if (topupSection) topupSection.classList.add('hidden');
        if (adminTopupBanner) adminTopupBanner.classList.add('hidden');
        updateHeaderNavActive('admin');
    }
}

async function loadCurrentVersionConfig() {
    try {
        const docSnap = await db.collection("system_config").doc("app_version").get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data.version && document.getElementById('admin-ver-code')) {
                document.getElementById('admin-ver-code').value = data.version;
            }
            if (data.versionName && document.getElementById('admin-ver-name')) {
                document.getElementById('admin-ver-name').value = data.versionName;
            }
            if (data.title && document.getElementById('admin-ver-title')) {
                document.getElementById('admin-ver-title').value = data.title;
            }
            if (data.changelog && document.getElementById('admin-ver-changelog')) {
                document.getElementById('admin-ver-changelog').value = data.changelog;
            }
            if (document.getElementById('admin-ver-force')) {
                document.getElementById('admin-ver-force').checked = !!data.forceNotify;
            }
        }
    } catch (e) {}
}

async function adminPublishVersion() {
    const code = document.getElementById('admin-ver-code')?.value.trim();
    const name = document.getElementById('admin-ver-name')?.value.trim();
    const title = document.getElementById('admin-ver-title')?.value.trim();
    const changelog = document.getElementById('admin-ver-changelog')?.value.trim();
    const forceNotify = document.getElementById('admin-ver-force')?.checked || false;
    const statusEl = document.getElementById('admin-ver-status');

    if (!code) {
        alert("Vui lòng nhập mã phiên bản!");
        return;
    }

    if (statusEl) {
        statusEl.className = "text-center text-xs font-bold p-2.5 rounded-lg bg-blue-50 text-blue-700 block border border-blue-200";
        statusEl.innerText = "Đang phát hành bản cập nhật...";
    }

    try {
        const payload = {
            version: code,
            versionName: name || code,
            title: title || `Bản cập nhật v${name || code}`,
            changelog: changelog || "Cải tiến và tối ưu tiện ích.",
            forceNotify,
            downloadUrl: "/api/download-extension",
            updatedAt: new Date().toISOString()
        };

        await db.collection("system_config").doc("app_version").set(payload, { merge: true });

        if (statusEl) {
            statusEl.className = "text-center text-xs font-bold p-2.5 rounded-lg bg-emerald-50 text-emerald-700 block border border-emerald-200";
            statusEl.innerText = `✓ Đã phát hành phiên bản v${name || code} thành công! Người dùng sẽ nhận được thông báo.`;
        }
    } catch (err) {
        if (statusEl) {
            statusEl.className = "text-center text-xs font-bold p-2.5 rounded-lg bg-rose-50 text-rose-700 block border border-rose-200";
            statusEl.innerText = `Lỗi: ${err.message}`;
        }
    }
}

let unsubscribeAdminUsers = null;
let cachedAdminRows = [];
let cachedUserRows = [];

// Khôi phục bộ nhớ cache người dùng nếu có sẵn
try {
    const savedUsersJson = localStorage.getItem('tlnx_saved_user_rows');
    const savedAdminsJson = localStorage.getItem('tlnx_saved_admin_rows');
    if (savedUsersJson) cachedUserRows = JSON.parse(savedUsersJson);
    if (savedAdminsJson) cachedAdminRows = JSON.parse(savedAdminsJson);
} catch (e) {}

function renderAdminUserList(filterQuery = '') {
    const listObj = document.getElementById('admin-user-list');
    const adminContainer = document.getElementById('admin-user-row-container');
    const countBadge = document.getElementById('admin-user-count-badge');
    const totalUserText = document.getElementById('admin-total-user-text');
    
    if (!listObj) return;
    listObj.innerHTML = '';
    if (adminContainer) adminContainer.innerHTML = '';

    const totalCount = cachedUserRows.length + cachedAdminRows.length;
    if (countBadge) {
        countBadge.innerText = totalCount;
    }

    if (totalUserText) {
        totalUserText.innerText = `(Tổng cộng: ${totalCount} tài khoản)`;
    }

    // Render admins to fixed container
    if (cachedAdminRows.length > 0 && adminContainer) {
        const adminTable = document.createElement('table');
        adminTable.className = "w-full text-xs text-left border-collapse table-fixed";
        const adminTbody = document.createElement('tbody');
        cachedAdminRows.forEach(content => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-red-100 bg-red-50/20";
            tr.innerHTML = content;
            adminTbody.appendChild(tr);
        });
        adminTable.appendChild(adminTbody);
        adminContainer.appendChild(adminTable);
    }

    const q = (filterQuery || '').trim().toLowerCase();
    const filteredUsers = cachedUserRows.filter(u => {
        if (!q) return true;
        return (u.email && u.email.toLowerCase().includes(q)) || 
               (u.displayName && u.displayName.toLowerCase().includes(q));
    });

    if (filteredUsers.length === 0) {
        if (q) {
            listObj.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-slate-400 font-medium">Không tìm thấy khách hàng nào khớp với "${filterQuery}"</td></tr>`;
        } else {
            listObj.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500 font-medium">
                <div class="flex flex-col items-center justify-center gap-3 max-w-lg mx-auto p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-sm">
                    <div class="text-amber-800 font-black text-sm flex items-center gap-2">
                        <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Chưa đồng bộ danh sách 35 tài khoản từ Firebase Firestore
                    </div>
                    <p class="text-slate-600 text-xs text-center leading-relaxed">
                        Chưa tải được danh sách khách hàng từ Firestore. Vui lòng bấm nút Đăng nhập Google bên dưới để xác thực quyền Quản trị viên:
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                        <button type="button" data-action="google-login" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all">
                            <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                            Đăng nhập Google Quản trị
                        </button>
                    </div>
                </div>
            </td></tr>`;
        }
        return;
    }

    let sttCount = 1;
    filteredUsers.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
            <td class="px-2 py-3 text-center w-[5%] font-bold text-emerald-600">${sttCount++}</td>
            <td class="px-2 py-3 text-center w-[12%] font-bold text-[10px] sm:text-[11px] text-emerald-600">${u.lastLoginStr}</td>
            <td class="px-4 py-3 font-bold text-slate-800 w-[28%]">
                <div class="flex items-center gap-2">
                     <div class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">${(u.displayName || u.email || '?').charAt(0).toUpperCase()}</div>
                     <div class="flex flex-col min-w-0">
                        <span class="truncate max-w-[200px] leading-tight flex items-center gap-1">
                            ${u.displayName && u.displayName.trim() !== '' ? u.displayName : (u.email ? u.email.split('@')[0] : 'Khách')}
                        </span>
                        <span class="text-[8px] text-slate-400 font-medium truncate max-w-[200px]">${u.email}</span>
                     </div>
                </div>
            </td>
            <td class="px-4 py-3 text-center w-[12%]">
                <span class="px-2.5 py-1 ${u.isVip ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-100'} rounded-full font-black text-[12px] border shadow-inner">
                    ${(u.credits || 0) > 0 && (u.credits || 0) < 1 ? Math.round((u.credits || 0) * 365) + ' NGÀY' : ((u.credits || 0) >= 1 ? (u.credits || 0) + ' NĂM' : (u.isVip ? 'VIP' : '0 NĂM'))}
                </span>
            </td>
            <td class="px-4 py-3 text-center w-[10%]">
                <span class="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-black text-[11px] border border-amber-100 shadow-inner">${Math.max(0, (u.points || 0))} LƯỢT</span>
            </td>
            <td class="px-4 py-3 text-center w-[18%] text-[11px] sm:text-[12px] font-bold text-red-600">
                <div>${u.expiryDateStr}</div>
                ${u.daysRemaining}
            </td>
            <td class="px-4 py-3 text-right w-[15%]">
                <div class="flex items-center justify-end gap-1">
                    <button data-action="admin-fill-email" data-email="${u.email}" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[9px] uppercase font-bold transition-all shadow-sm cursor-pointer">Chọn</button>
                    <button data-action="admin-reset-devices" data-uid="${u.id}" data-email="${u.email}" class="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded transition-all cursor-pointer" title="Reset thiết bị">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    </button>
                    <button data-action="admin-delete-user" data-uid="${u.id}" data-email="${u.email}" class="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 rounded transition-all cursor-pointer" title="Xoá tài khoản">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;
        listObj.appendChild(tr);
    });
}

function loadAdminUserList() {
    const listObj = document.getElementById('admin-user-list');
    if (!listObj) return;

    // Render ngay danh sách đã lưu nếu có
    renderAdminUserList();

    if (unsubscribeAdminUsers) {
        unsubscribeAdminUsers();
        unsubscribeAdminUsers = null;
    }

    const processSnapshot = (snapshot) => {
        if (!snapshot || snapshot.empty) {
            if (cachedUserRows.length === 0 && cachedAdminRows.length === 0) {
                renderAdminUserList();
            }
            return;
        }

        const newAdminRows = [];
        const newUserRows = [];

        snapshot.forEach(doc => {
            try {
                const data = doc.data() || {};
                const isAdmin = isUserAdmin(data.email || '');
                
                const parseDate = (val) => {
                    if (!val) return null;
                    if (typeof val.toDate === 'function') return val.toDate();
                    if (val instanceof Date) return val;
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? null : d;
                };

                const expD = parseDate(data.expiryDate);
                const lastLoginD = parseDate(data.lastLoginAt);
                const createdD = parseDate(data.createdAt);

                const expiryDate = expD ? expD.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';
                const lastLoginStr = lastLoginD ? lastLoginD.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
                
                const now = new Date();
                const isVipByDate = expD && expD.getTime() > now.getTime();
                const isUserVip = isAdmin || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || isVipByDate || ((data.credits || 0) > 0);

                let daysRemaining = '';
                if (expD) {
                    const diff = expD.getTime() - now.getTime();
                    const days = Math.round(diff / (1000 * 60 * 60 * 24));
                    if (days > 0) {
                        daysRemaining = `<div class="text-[10px] sm:text-[11px] text-emerald-600 font-black mt-0.5">Còn ${days} ngày</div>`;
                    } else {
                        daysRemaining = `<div class="text-[10px] sm:text-[11px] text-red-500 font-black mt-0.5">Đã hết hạn</div>`;
                    }
                } else if (isUserVip) {
                    daysRemaining = `<div class="text-[10px] sm:text-[11px] text-emerald-600 font-black mt-0.5">VIP Vô hạn</div>`;
                }

                const sortTime = lastLoginD ? lastLoginD.getTime() : (createdD ? createdD.getTime() : 0);

                if (isAdmin) {
                    newAdminRows.push(`
                    <td class="px-2 py-3 text-center w-[5%] font-bold text-emerald-600">--</td>
                    <td class="px-2 py-3 text-center w-[12%] font-bold text-[10px] sm:text-[11px] text-emerald-600">${lastLoginStr}</td>
                    <td class="px-4 py-3 font-bold text-slate-800 w-[28%]">
                        <div class="flex items-center gap-2">
                             <div class="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-black shrink-0">${(data.displayName || data.email || '?').charAt(0).toUpperCase()}</div>
                             <div class="flex flex-col min-w-0">
                                <span class="truncate max-w-[200px] leading-tight flex items-center gap-1 font-bold">
                                    ${data.displayName && data.displayName.trim() !== '' ? data.displayName : 'VIP'}
                                    <span class="px-1 py-0.5 bg-red-600 text-white text-[7px] rounded">VIP</span>
                                </span>
                                <span class="text-[8px] text-slate-400 font-medium truncate max-w-[200px]">${data.email || ''}</span>
                             </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center w-[12%]">
                        <span class="px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-black text-[13px] border border-red-100 shadow-inner">VIP</span>
                    </td>
                    <td class="px-4 py-3 text-center w-[10%]">
                         <span class="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-black text-[11px] border border-amber-100 shadow-inner">${data.points || 0} LƯỢT</span>
                    </td>
                    <td class="px-4 py-3 text-center w-[18%] text-[10px] font-black text-red-600 uppercase">
                        Vô hạn
                    </td>
                    <td class="px-4 py-3 text-right w-[15%]">
                        <div class="flex items-center justify-end gap-1">
                            <button data-action="admin-fill-email" data-email="${data.email || ''}" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[9px] uppercase font-bold transition-all shadow-sm cursor-pointer">Chọn</button>
                        </div>
                    </td>
                    `);
                } else {
                    newUserRows.push({
                        id: doc.id,
                        email: data.email || '',
                        displayName: data.displayName || '',
                        credits: data.credits,
                        points: data.points,
                        isVip: isUserVip,
                        expiryDateStr: expiryDate,
                        daysRemaining: daysRemaining,
                        lastLoginStr: lastLoginStr,
                        sortTime: sortTime
                    });
                }
            } catch(errItem) {
                console.error("Lỗi parse dòng user:", errItem);
            }
        });

        // Sắp xếp người dùng mới đăng nhập / mới tạo lên đầu
        newUserRows.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));

        cachedAdminRows = newAdminRows;
        cachedUserRows = newUserRows;

        // Lưu vào localStorage để không bị mất khi reload hoặc offline
        try {
            localStorage.setItem('tlnx_saved_user_rows', JSON.stringify(cachedUserRows));
            localStorage.setItem('tlnx_saved_admin_rows', JSON.stringify(cachedAdminRows));
        } catch (e) {}

        const searchInput = document.getElementById('admin-user-search-input');
        const currentFilter = searchInput ? searchInput.value : '';
        renderAdminUserList(currentFilter);
    };

    try {
        // Query toàn bộ collection users trực tiếp theo thời gian thực
        unsubscribeAdminUsers = db.collection('users').onSnapshot(processSnapshot, error => {
            console.warn("Firestore onSnapshot error, trying get():", error);
            db.collection('users').get().then(processSnapshot).catch(e => {
                console.error("Firestore get() error:", e);
                renderAdminUserList();
            });
        });
    } catch(error) {
        console.warn("loadAdminUserList error:", error);
        db.collection('users').get().then(processSnapshot).catch(e => {
            console.error("loadAdminUserList get fallback error:", e);
            renderAdminUserList();
        });
    }
}

async function handleGoogleLogin() {
    toggleLoading(true);
    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        if (user) {
            activateUserSession(user);
            showToast("Đăng nhập Google thành công!", "success");
            if (isUserAdmin(user.email)) {
                loadAdminUserList();
            }
        }
    } catch (error) {
        console.error("Google Sign-In error:", error);
        if (error.code === 'auth/popup-closed-by-user') {
            showToast("Đã đóng cửa sổ đăng nhập Google.", "error");
        } else if (error.code === 'auth/popup-blocked') {
            showToast("Trình duyệt chặn mở popup. Vui lòng cho phép popup để đăng nhập!", "error");
        } else if (error.code === 'auth/network-request-failed') {
            showToast("Đang kết nối lại tài khoản Google...", "info");
        } else {
            showToast(translateError(error), "error");
        }
    } finally {
        toggleLoading(false);
    }
}

// ======= DOM READY: CSP COMPLIANT EVENT LISTENERS =======
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabAttr = urlParams.get('tab');
    if (tabAttr === 'register') {
        switchView('view-register');
    }

    document.body.addEventListener('click', (e) => {
        // We handle clicks by checking closest elements with data-action or specific IDs
        
        const dataAction = e.target.closest('[data-action]');
        if (dataAction) {
            const action = dataAction.getAttribute('data-action');
            if (action === 'google-login') {
                e.preventDefault();
                handleGoogleLogin();
            } else if (action === 'switch-view') {
                e.preventDefault();
                switchView(dataAction.getAttribute('data-view'));
            } else if (action === 'toggle-password') {
                togglePassword(dataAction.getAttribute('data-target'), dataAction);
            } else if (action === 'signout') {
                localStorage.removeItem('tlnx_saved_email');
                localStorage.removeItem('tlnx_saved_pass');
                auth.signOut();
            } else if (action === 'admin-search') {
                searchUserByEmail();
            } else if (action === 'admin-mode-add') {
                setAdminMode('add');
            } else if (action === 'admin-mode-set') {
                setAdminMode('set');
            } else if (action === 'admin-quick-preset') {
                const pType = dataAction.getAttribute('data-type');
                const pAmt = dataAction.getAttribute('data-amount');
                const typeSelect = document.getElementById('admin-credit-type');
                const amtInput = document.getElementById('admin-credit-amount');
                if (typeSelect && pType) typeSelect.value = pType;
                if (amtInput && pAmt) amtInput.value = pAmt;
                refreshAdminVipPreview();
            } else if (action === 'admin-update-credit') {
                adminUpdateCredit();
            } else if (action === 'admin-reset-expiry') {
                adminResetExpiry();
            } else if (action === 'admin-reset-points') {
                adminResetPoints();
            } else if (action === 'admin-delete-user') {
                adminDeleteUser(dataAction);
            } else if (action === 'admin-reset-devices') {
                adminResetDevices(dataAction);
            } else if (action === 'admin-reset-pw') {
                adminResetPassword();
            } else if (action === 'admin-switch-tab') {
                switchAdminTab(dataAction.getAttribute('data-tab'));
            } else if (action === 'admin-load-users') {
                loadAdminUserList();
            } else if (action === 'admin-fill-email') {
                adminFillEmail(dataAction.getAttribute('data-email'));
            } else if (action === 'admin-add-package') {
                addAdminPackageRow();
            } else if (action === 'admin-reset-default-packages') {
                adminResetDefaultPackages();
            } else if (action === 'admin-save-topup-config') {
                adminSaveTopupConfig();
            } else if (action === 'toggle-admin-price-config') {
                const body = document.getElementById('admin-price-config-body');
                const label = document.getElementById('admin-price-toggle-label');
                const chevron = document.getElementById('admin-price-chevron');
                if (body) {
                    const isHidden = body.classList.contains('hidden');
                    if (isHidden) {
                        body.classList.remove('hidden');
                        if (label) label.textContent = 'Thu gọn ▲';
                        if (chevron) chevron.style.transform = 'rotate(180deg)';
                        renderAdminPackages();
                    } else {
                        body.classList.add('hidden');
                        if (label) label.textContent = 'Hiện cấu hình ▼';
                        if (chevron) chevron.style.transform = 'rotate(0deg)';
                    }
                }
            } else if (action === 'toggle-packages') {
                const container = document.getElementById('admin-packages-list-container');
                const chevron = document.getElementById('packages-chevron');
                if (container && chevron) {
                    const isHidden = container.classList.contains('hidden');
                    if (isHidden) {
                        container.classList.remove('hidden');
                        chevron.style.transform = 'rotate(180deg)';
                    } else {
                        container.classList.add('hidden');
                        chevron.style.transform = 'rotate(0deg)';
                    }
                }
            } else if (action === 'generate-qr') {
                generateQR(dataAction, parseFloat(dataAction.getAttribute('data-pts')), parseInt(dataAction.getAttribute('data-amt')));
            } else if (action === 'nav-view-topup') {
                const isAdmin = currentUserInfo && isUserAdmin(currentUserInfo.email);
                if (isAdmin) {
                    switchAdminTab('topup');
                } else {
                    const topupSection = document.getElementById('topup-section');
                    if (topupSection) {
                        topupSection.classList.remove('hidden');
                        topupSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            } else if (action === 'nav-view-options') {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: "CLOSE_AUTH" }, "*");
                } else {
                    window.location.href = "/options.html";
                }
            } else if (action === 'admin-open-add-user') {
                const modal = document.getElementById('modal-add-user');
                if (modal) modal.classList.remove('hidden');
            } else if (action === 'admin-close-add-user') {
                const modal = document.getElementById('modal-add-user');
                if (modal) modal.classList.add('hidden');
            } else if (action === 'admin-publish-version') {
                adminPublishVersion();
            }
        }
        
        if (e.target.id === 'continue-to-system' || e.target.closest('#continue-to-system')) {
            const successBox = document.getElementById('success-container');
            const mainBox = document.getElementById('main-container');
            if (successBox) {
                successBox.classList.add('hidden');
                successBox.classList.remove('flex');
            }
            if (mainBox) {
                mainBox.classList.remove('hidden');
                mainBox.classList.add('flex');
            }
            const topupSection = document.getElementById('topup-section');
            if (topupSection) {
                topupSection.classList.remove('hidden');
                setTimeout(() => {
                    topupSection.scrollIntoView({ behavior: 'smooth' });
                }, 200);
            }
        }

        if (e.target.id === 'close-window-btn' || e.target.closest('#close-window-btn')) {
            if (typeof window.closeAuthWindow === 'function') {
                window.closeAuthWindow();
            }
        }
    });

    // Listeners for Admin VIP Preview
    const adminCreditAmtInput = document.getElementById('admin-credit-amount');
    const adminCreditTypeSelect = document.getElementById('admin-credit-type');
    const adminVipStartInput = document.getElementById('admin-vip-start-date');
    const adminCustomExpiryInput = document.getElementById('admin-custom-expiry-date');

    const adminUserSearchInput = document.getElementById('admin-user-search-input');
    if (adminUserSearchInput) {
        adminUserSearchInput.addEventListener('input', (e) => {
            renderAdminUserList(e.target.value);
        });
    }

    [adminCreditAmtInput, adminCreditTypeSelect, adminVipStartInput, adminCustomExpiryInput].forEach(el => {
        el?.addEventListener('input', refreshAdminVipPreview);
        el?.addEventListener('change', refreshAdminVipPreview);
    });

    // Form submits
    const formLogin = document.getElementById('form-login');
    if(formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rawEmail = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            const remember = document.getElementById('remember-me').checked;
            
            if (!rawEmail) {
                showToast("Vui lòng nhập Email hoặc Tài khoản.", "error");
                return;
            }
            if (!pass) {
                showToast("Vui lòng nhập Mật khẩu.", "error");
                return;
            }

            // Tự động chuẩn hóa email
            let resolvedEmail = rawEmail.trim().toLowerCase();
            if (!resolvedEmail.includes('@')) {
                resolvedEmail = resolvedEmail === 'admin' ? 'admin@admin.com' : `${resolvedEmail}@gmail.com`;
            }
            const isAdminTarget = isUserAdmin(resolvedEmail);

            if (remember) {
                localStorage.setItem('tlnx_saved_email', rawEmail);
                localStorage.setItem('tlnx_saved_pass', pass);
            } else {
                localStorage.removeItem('tlnx_saved_email');
                localStorage.removeItem('tlnx_saved_pass');
            }

            if (isAdminTarget) {
                toggleLoading(true);
                try {
                    let adminUser = null;
                    try {
                        const userCred = await auth.signInWithEmailAndPassword(resolvedEmail, pass);
                        adminUser = userCred.user;
                    } catch (authErr) {
                        // Fallback ONLY if pass matches admin master key AND rootCred succeeds
                        if (pass === 'admin123456' || pass === 'khoa123456') {
                            const rootCred = await auth.signInWithEmailAndPassword('admin@admin.com', 'admin123456').catch(() => null);
                            if (rootCred && rootCred.user) adminUser = rootCred.user;
                        }
                        if (!adminUser) {
                            throw authErr;
                        }
                    }

                    if (!adminUser) {
                        throw new Error("Tài khoản hoặc mật khẩu Quản trị viên không chính xác.");
                    }

                    localStorage.setItem('tlnx_display_email', resolvedEmail);
                    activateUserSession(adminUser);
                    showToast(`Đăng nhập Quản Trị Viên (${resolvedEmail}) thành công!`, "success");
                    loadAdminUserList();
                    return;
                } catch (adminErr) {
                    console.error("Admin login error:", adminErr);
                    showToast(translateError(adminErr), 'error');
                    return;
                } finally {
                    toggleLoading(false);
                }
            }

            toggleLoading(true);
            try {
                localStorage.removeItem('tlnx_display_email');
                const userCred = await auth.signInWithEmailAndPassword(resolvedEmail, pass);
                if (!userCred || !userCred.user) {
                    throw new Error("Tài khoản hoặc mật khẩu không chính xác.");
                }
                activateUserSession(userCred.user);
                showToast("Đăng nhập thành công!", "success");
            } catch (error) {
                console.error("Login error:", error);
                showToast(translateError(error), 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }

    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            const cfm = document.getElementById('reg-confirm').value;
            
            if (pass !== cfm) {
                return showToast("Mật khẩu xác nhận không khớp.", "error");
            }

            toggleLoading(true);
            try {
                const userCred = await auth.createUserWithEmailAndPassword(email, pass);
                const user = userCred.user;
                await user.updateProfile({ displayName: name });
                
                // Đồng bộ ngay lập tức vào Firestore sau khi update Profile
                await db.collection('users').doc(user.uid).set({
                    email: email,
                    displayName: name,
                    credits: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Cập nhật lại giao diện ngay để hiện tên
                document.getElementById('user-name').textContent = name;
                document.getElementById('avatar-letters').textContent = name.charAt(0).toUpperCase();
                
                if (!isUserAdmin(email)) {
                    showToast("Đăng ký thành công! Bạn có thể tắt trang này và mở Tiện ích Nhận xét để sử dụng.", "success");
                }
            } catch (error) {
                showToast(translateError(error), 'error');
            }
            toggleLoading(false);
        });
    }

    const formForgot = document.getElementById('form-forgot');
    if (formForgot) {
        formForgot.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            toggleLoading(true);
            try {
                await auth.sendPasswordResetEmail(email);
                showToast("Link khôi phục đã gửi vào email. Vui lòng kiểm tra hộp thư.", "success");
                switchView('view-login');
            } catch (error) {
                showToast(translateError(error), 'error');
            }
            toggleLoading(false);
        });
    }

    // Form thêm khách hàng thủ công
    const formAddUser = document.getElementById('admin-add-user-form');
    if (formAddUser) {
        formAddUser.addEventListener('submit', adminCreateNewUser);
    }

    const typeSelectModal = document.getElementById('modal-add-user-type');
    if (typeSelectModal) {
        typeSelectModal.addEventListener('change', (e) => {
            const val = e.target.value;
            const customValInput = document.getElementById('modal-add-user-custom-val');
            if (customValInput) {
                if (val === 'credits-1') customValInput.value = '1';
                else if (val === 'credits-2') customValInput.value = '2';
                else if (val === 'days-180') customValInput.value = '180';
                else if (val === 'days-30') customValInput.value = '30';
                else if (val === 'points-100') customValInput.value = '100';
                else if (val === 'points-50') customValInput.value = '50';
            }
        });
    }

    // Nút kiểm tra giao dịch ngay
    const btnCheckPayment = document.getElementById('btn-manual-check-payment');
    if (btnCheckPayment) {
        btnCheckPayment.addEventListener('click', () => {
            manualCheckPayment(true);
        });
    }

    // Khôi phục tài khoản đã nhớ
    const savedEmail = localStorage.getItem('tlnx_saved_email');
    const savedPass = localStorage.getItem('tlnx_saved_pass');
    if (savedEmail && savedPass) {
        const loginEmail = document.getElementById('login-email');
        const loginPass = document.getElementById('login-password');
        const rememberMe = document.getElementById('remember-me');
        if (loginEmail) loginEmail.value = savedEmail;
        if (loginPass) loginPass.value = savedPass;
        if (rememberMe) rememberMe.checked = true;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.closeAuthWindow = function() {
    try {
        window.close();
    } catch(e){}
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "closeCurrentTab" });
    }

    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'CLOSE_AUTH' }, '*');
        }
    } catch(e){}
};