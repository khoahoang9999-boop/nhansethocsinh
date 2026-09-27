// Prevent "Cannot set property fetch of #<Window> which has only a getter" from third-party libraries
let origFetch = window.fetch;
Object.defineProperty(window, "fetch", {
  get: () => origFetch,
  set: () => {},
  configurable: true,
});

// Polyfill chrome.storage for web / preview environment
if (typeof window.chrome === 'undefined') {
  window.chrome = {};
}
if (!window.chrome.storage) {
  window.chrome.storage = {
    local: {
      get: (keys, cb) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys || {}));
        keyList.forEach(k => {
          try {
            const val = localStorage.getItem(`tlnx_${k}`);
            if (val !== null) result[k] = JSON.parse(val);
          } catch(e) {
            result[k] = localStorage.getItem(`tlnx_${k}`);
          }
        });
        if (cb) cb(result);
        return Promise.resolve(result);
      },
      set: (obj, cb) => {
        Object.keys(obj || {}).forEach(k => {
          try {
            localStorage.setItem(`tlnx_${k}`, JSON.stringify(obj[k]));
          } catch(e) {
            localStorage.setItem(`tlnx_${k}`, String(obj[k]));
          }
        });
        if (cb) cb();
        return Promise.resolve();
      },
      remove: (keys, cb) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach(k => localStorage.removeItem(`tlnx_${k}`));
        if (cb) cb();
        return Promise.resolve();
      }
    }
  };
}

import {
  GRADE_LEVELS,
  getSubjects,
  getDGTXSubjects,
  getEvalLevels,
  isPassFailSubject,
  getEmptySubject,
  getEmptyDGTX,
  getEmptyThNlPc,
  getEmptySoGhiNhanXet,
  getEmptyHocBaGVBM,
  getEmptyHocBaGVCN,
  getEmptyHieuTruong,
  getEmptyVneduNlpcHb,
  generateAllSampleData,
  migrateData
} from "./shared.js";
import * as XLSX from "xlsx";
import { auth, db, signOut, onAuthStateChanged, doc, onSnapshot, getDoc } from "./src/firebase-config.js";

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

let currentData = { TH: {}, THCS: {}, THPT: {} };
let currentRole = "GVBM";
let currentCapHoc = "THCS";
let currentKhoiLop = "6";
let currentMonHoc = "Ngữ văn";
let currentHocKy = "Học kỳ 1";
let currentTieuChi = "Môn học và hoạt động giáo dục";
let currentThang = "8";

document.addEventListener("DOMContentLoaded", () => {
  // -------- AUTHENTICATION SETUP --------
  const loginBtn = document.getElementById("loginBtn");
  const userInfo = document.getElementById("user-info");
  const userCreditsDisplay = document.getElementById("user-credits");
  const userPointsDisplay = document.getElementById("user-points");
  const userEmailDisplay = document.getElementById("user-email-display");
  const logoutBtn = document.getElementById("logoutBtn");
  const topupBtn = document.getElementById("topupBtn");
  const adminBtn = document.getElementById("adminBtn");

  const openAuth = (tabParam = null) => {
    let url =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("auth-ui.html")
        : "/auth-ui.html";
    if (typeof tabParam === "string" && typeof tabParam !== 'object') url += `?tab=${tabParam}`;
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "OPEN_AUTH", tabParam, url }, "*");
          return;
        }
      } catch (e) {}
      window.location.href = url;
    }
  };

  if (loginBtn) loginBtn.addEventListener("click", () => openAuth());
  if (topupBtn) topupBtn.addEventListener("click", () => openAuth("topup"));
  if (adminBtn) adminBtn.addEventListener("click", () => openAuth("admin"));

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Logout error", err);
      }
    });
  }

  const optionsShowFloatingBarCheckbox = document.getElementById("optionsShowFloatingBarCheckbox");
  if (optionsShowFloatingBarCheckbox) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["showFloatingWidget"], (res) => {
        optionsShowFloatingBarCheckbox.checked = res.showFloatingWidget !== false;
      });
      optionsShowFloatingBarCheckbox.addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        chrome.storage.local.set({ showFloatingWidget: isChecked });
        try {
          localStorage.setItem("tlnx_show_floating_widget", isChecked ? "true" : "false");
        } catch (err) {}
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: "setFloatingWidgetVisible", visible: isChecked }).catch(() => {});
        }

        const applyToTab = (tab) => {
          if (!tab || !tab.id) return;
          const url = tab.url || "";
          if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("chrome-extension://") || url.startsWith("devtools://") || url.startsWith("about:")) return;

          chrome.tabs.sendMessage(tab.id, { action: "toggleFloatingWidget", visible: isChecked }).catch(() => {});
          chrome.tabs.sendMessage(tab.id, { action: "setFloatingWidgetVisible", visible: isChecked }).catch(() => {});

          if (chrome.scripting && chrome.scripting.executeScript) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (visible) => {
                window.__tlnx_floating_widget_hidden = !visible;
                try {
                  if (visible) {
                    sessionStorage.removeItem("tlnx_floating_widget_hidden");
                    sessionStorage.setItem("tlnx_floating_widget_hidden", "false");
                    localStorage.setItem("tlnx_show_floating_widget", "true");
                  } else {
                    sessionStorage.setItem("tlnx_floating_widget_hidden", "true");
                    localStorage.setItem("tlnx_show_floating_widget", "false");
                  }
                } catch (e) {}
                const el = document.getElementById("tlnx-floating-widget");
                if (visible) {
                  if (el) {
                    el.style.display = "flex";
                    el.style.visibility = "visible";
                    el.style.opacity = "1";
                  } else if (typeof window.__tlnx_enable_widget === "function") {
                    window.__tlnx_enable_widget(true);
                  } else if (typeof window.__tlnx_inject_widget === "function") {
                    window.__tlnx_inject_widget(true);
                  }
                } else {
                  if (el) {
                    el.style.display = "none";
                    el.style.visibility = "hidden";
                    el.style.opacity = "0";
                  }
                }
              },
              args: [isChecked]
            }).catch(() => {});
          }
        };

        if (chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true }, (tabs) => {
            if (tabs && tabs.length) tabs.forEach(applyToTab);
          });
          chrome.tabs.query({}, (tabs) => {
            if (tabs && tabs.length) tabs.forEach(applyToTab);
          });
        }
      });
    } else {
      optionsShowFloatingBarCheckbox.checked = localStorage.getItem("tlnx_show_floating_widget") !== "false";
      optionsShowFloatingBarCheckbox.addEventListener("change", (e) => {
        localStorage.setItem("tlnx_show_floating_widget", e.target.checked ? "true" : "false");
      });
    }
  }

  let unsubSnapshot = null;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (userInfo) {
        userInfo.classList.remove("hidden");
        userInfo.classList.add("flex");
      }
      if (userEmailDisplay) userEmailDisplay.innerText = user.email || "";

      const ADMIN_EMAILS = ['hvdkhoa89@gmail.com', 'khoahoang9999@gmail.com', 'admin@admin.com'];
      const emailLower = (user.email || '').toLowerCase().trim();
      const isAdmin = ADMIN_EMAILS.includes(emailLower);

      if (adminBtn) {
          if (isAdmin) {
              adminBtn.classList.remove("hidden");
          } else {
              adminBtn.classList.add("hidden");
          }
      }

      if (unsubSnapshot) unsubSnapshot();
      unsubSnapshot = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        let credits = 0;
        let points = 0;
        let isVip = false;
        let expDate = null;
        let expiryDateISO = null;
        let expiryDateStr = '';

        if (docSnap.exists()) {
          const data = docSnap.data();
          credits = data.credits || 0;
          points = data.points || 0;

          expDate = parseFirestoreDate(data.expiryDate);
          const now = new Date();
          const isVipByDate = expDate && expDate.getTime() > now.getTime();
          isVip = isAdmin || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || isVipByDate || (credits > 0);
          if (isVipByDate && (credits <= 0 || !credits)) {
            credits = parseFloat(((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1));
          }
          expiryDateISO = expDate ? expDate.toISOString() : null;
          expiryDateStr = expDate ? expDate.toLocaleDateString('vi-VN') : '';
        } else {
          isVip = isAdmin;
        }

        chrome.storage.local.get(["authState"], (res) => {
           let pending = res.authState && res.authState.pendingDeduction ? res.authState.pendingDeduction : 0;
           if (pending > 0) {
               // Reset pending immediately to avoid race condition with multiple windows
               const newAuthState = { ...res.authState, pendingDeduction: 0 };
               chrome.storage.local.set({ authState: newAuthState });

               // Deduct the pending points from Firebase points field (Cap at 0)
               import("./src/firebase-config.js").then(({ updateDoc }) => {
                 updateDoc(doc(db, "users", user.uid), {
                   points: Math.max(0, points - pending)
                 });
               });
               
               // Update local state with latest data
               chrome.storage.local.set({ 
                 authState: { 
                   ...newAuthState, 
                   credits: credits, 
                   points: Math.max(0, points - pending),
                   isVip,
                   tier: isVip ? 'VIP' : 'Free',
                   role: isVip ? 'vip' : 'user',
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
                   credits: Math.max(0, credits), 
                   points: points, 
                   isVip,
                   tier: isVip ? 'VIP' : 'Free',
                   role: isVip ? 'vip' : 'user',
                   expiryDate: expiryDateISO,
                   expiryDateStr,
                   pendingDeduction: 0, 
                   isAdmin 
                 } 
               });
           }
        });

        const now = new Date();
        if (userCreditsDisplay) {
           const diffDays = expDate ? Math.max(0, Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
           if (isAdmin) {
             userCreditsDisplay.innerText = `VIP`;
             userCreditsDisplay.classList.remove("text-indigo-700", "bg-indigo-50", "border-indigo-100");
             userCreditsDisplay.classList.add("text-red-700", "bg-red-50", "border-red-100");
           } else if (isVip) {
             const dateStr = expDate ? expDate.toLocaleDateString('vi-VN') : (expiryDateStr || 'VIP');
             const remStr = diffDays > 0 ? ` (Còn ${diffDays} ngày)` : '';
             userCreditsDisplay.innerText = `Hạn VIP: ${dateStr}${remStr}`;
             userCreditsDisplay.classList.add("text-emerald-700", "bg-emerald-50", "border-emerald-200");
             userCreditsDisplay.classList.remove("text-red-700", "bg-red-50", "border-red-100", "text-indigo-700");
           } else {
             userCreditsDisplay.innerText = `Hết hạn`;
             userCreditsDisplay.classList.remove("text-indigo-700", "bg-indigo-50", "border-indigo-100", "text-emerald-700");
             userCreditsDisplay.classList.add("text-red-700", "bg-red-50", "border-red-100");
           }
        }
        if (userPointsDisplay) {
           if (isAdmin || isVip) {
             userPointsDisplay.style.display = "none";
           } else {
             userPointsDisplay.style.display = "";
             userPointsDisplay.innerText = `${Math.max(0, points)} LƯỢT`;
           }
        }
      });
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (userInfo) {
        userInfo.classList.add("hidden");
        userInfo.classList.remove("flex");
      }
      chrome.storage.local.set({ authState: null });
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
    }
  });
  // ------------------------------------
  // --- Modals ---
  const customModalOverlay = document.getElementById("custom-modal-overlay");
  const customModal = document.getElementById("custom-modal");
  const customModalTitle = document.getElementById("custom-modal-title");
  const customModalMessage = document.getElementById("custom-modal-message");
  const customModalCancel = document.getElementById("custom-modal-cancel");
  const customModalConfirm = document.getElementById("custom-modal-confirm");

  function showCustomModal(title, message, isAlert = false, onConfirm = null) {
    customModalTitle.innerText = title;
    customModalMessage.innerText = message;
    
    if (isAlert) {
      customModalCancel.style.display = "none";
      customModalConfirm.innerText = "Đóng";
      customModalConfirm.classList.replace("bg-blue-600", "bg-slate-600");
      customModalConfirm.classList.replace("hover:bg-blue-700", "hover:bg-slate-700");
    } else {
      customModalCancel.style.display = "block";
      customModalConfirm.innerText = "Đồng ý";
      customModalConfirm.classList.replace("bg-slate-600", "bg-blue-600");
      customModalConfirm.classList.replace("hover:bg-slate-700", "hover:bg-blue-700");
    }

    customModalOverlay.classList.remove("hidden");
    customModalOverlay.classList.add("flex");
    setTimeout(() => {
      customModal.classList.remove("scale-95", "opacity-0");
      customModal.classList.add("scale-100", "opacity-100");
    }, 10);

    const closeMenu = () => {
      customModal.classList.add("scale-95", "opacity-0");
      customModal.classList.remove("scale-100", "opacity-100");
      setTimeout(() => {
        customModalOverlay.classList.add("hidden");
        customModalOverlay.classList.remove("flex");
      }, 200);
      customModalConfirm.removeEventListener("click", onConfirmClick);
      customModalCancel.removeEventListener("click", onCancelClick);
    };

    const onConfirmClick = () => {
      closeMenu();
      if (onConfirm) onConfirm(true);
    };

    const onCancelClick = () => {
      closeMenu();
      if (onConfirm) onConfirm(false);
    };

    customModalConfirm.addEventListener("click", onConfirmClick);
    if (!isAlert) customModalCancel.addEventListener("click", onCancelClick);
  }

  const filterCapHoc = document.getElementById("filterCapHoc");
  const filterKhoiLop = document.getElementById("filterKhoiLop");
  const filterMonHoc = document.getElementById("filterMonHoc");
  const filterMonHocContainer = document.getElementById("filterMonHocContainer");
  const filterHocKy = document.getElementById("filterHocKy");
  const filterHocKyContainer = document.getElementById("filterHocKyContainer");
  const filterTieuChi = document.getElementById("filterTieuChi");
  const filterTieuChiContainer = document.getElementById("filterTieuChiContainer");
  const filterThang = document.getElementById("filterThang");
  const filterThangContainer = document.getElementById("filterThangContainer");
    
  const platformRadios = document.getElementsByName("configPlatform");
  const csdlNavSections = document.getElementById("csdl-nav-sections");
  const mainContentCsdl = document.getElementById("main-content-csdl");
  const mainContentVnedu = document.getElementById("main-content-vnedu");

  function updatePlatformUI() {
    let selectedPlatform = "csdl";
    for (const radio of platformRadios) {
      if (radio.checked) {
        selectedPlatform = radio.value;
        break;
      }
    }
    
    if (selectedPlatform === "csdl") {
      csdlNavSections.style.display = "block";
      mainContentCsdl.style.display = "flex";
      if (mainContentVnedu) {
        mainContentVnedu.classList.add("hidden");
        mainContentVnedu.classList.remove("flex");
      }
    } else {
      // Use the exact same UI for VnEdu (shared configuration)
      csdlNavSections.style.display = "block";
      mainContentCsdl.style.display = "flex";
      if (mainContentVnedu) {
        mainContentVnedu.classList.add("hidden");
        mainContentVnedu.classList.remove("flex");
      }
    }
    
    // Update header Title
    const headerTitle = document.getElementById("main-header-title");
    if (headerTitle) {
      if (selectedPlatform === "vnedu") {
        headerTitle.innerText = "Quản lý Lời phê Mẫu (VnEdu)";
      } else if (selectedPlatform === "smas") {
        headerTitle.innerText = "Quản lý Lời phê Mẫu (Smas)";
      } else {
        headerTitle.innerText = "Quản lý Lời phê Mẫu (CSDL Ngành)";
      }
    }
  }

  for (const radio of platformRadios) {
    radio.addEventListener("change", () => {
      updatePlatformUI();
      updateTabsUI();
      updateDropdowns();
      renderData();
    });
  }
  updatePlatformUI();

  const navTemplates = document.getElementById("navTemplates");
  const viewTemplates = document.getElementById("viewTemplates");
  const saveConfigBtn = document.getElementById("saveConfigBtn");
  const resetConfigBtn = document.getElementById("resetConfigBtn");

  const urlParams = new URLSearchParams(window.location.search);

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["commentsData"], (result) => {
      // Migrate and overwrite if necessary
      let { data, migrated } = migrateData(result.commentsData);
      currentData = data;
      
      if (currentData?.TH?.['3']?.GVBM?.['Toán_Giữa kỳ 1']) {
        currentData = generateAllSampleData();
        migrated = true;
      }

      // Force upgrade DGTX (CSDL Ngành 5.3.4) for TH to use BGDĐT TT27 compliant text
      if (currentData?.TH && currentData.TH['3'] && !currentData.TH['3'].DGTX_V3) {
         const freshData = generateAllSampleData();
         for (const khoi of Object.keys(currentData.TH)) {
             if (currentData.TH[khoi]) {
                 currentData.TH[khoi].DGTX = freshData.TH[khoi].DGTX;
                 currentData.TH[khoi].DGTX_V3 = true;
             }
         }
         migrated = true;
      }

      // Force upgrade Công nghệ for TH (VnEdu and CSDL GVBM) to have strictly 20, 20, 5 custom comments
      if (currentData?.TH && currentData.TH['3'] && !currentData.TH['3'].GVBM_CN_V2) {
         const freshData = generateAllSampleData();
         for (const khoi of Object.keys(currentData.TH)) {
             if (currentData.TH[khoi] && currentData.TH[khoi].GVBM && currentData.TH[khoi].GVBM['Công nghệ']) {
                 currentData.TH[khoi].GVBM['Công nghệ'] = freshData.TH[khoi].GVBM['Công nghệ'];
                 currentData.TH[khoi].GVBM_CN_V2 = true;
             }
         }
         migrated = true;
      }

      // Force upgrade THCS Pass/Fail subjects (Giáo dục thể chất, Nghệ thuật, Nội dung giáo dục địa phương)
      if (currentData?.THCS && currentData.THCS['6'] && !currentData.THCS['6'].GVBM_THCS_3SUBS_V1) {
         const freshData = generateAllSampleData();
         for (const khoi of Object.keys(currentData.THCS)) {
             if (currentData.THCS[khoi] && currentData.THCS[khoi].GVBM) {
                 ["Giáo dục thể chất", "Nghệ thuật", "Âm nhạc", "Mĩ thuật", "Nội dung giáo dục địa phương"].forEach(subj => {
                     if (freshData.THCS[khoi].GVBM[subj]) {
                         currentData.THCS[khoi].GVBM[subj] = freshData.THCS[khoi].GVBM[subj];
                     }
                 });
                 currentData.THCS[khoi].GVBM_THCS_3SUBS_V1 = true;
             }
         }
         migrated = true;
      }
      
      // Force upgrade Công nghệ cho THCS và THPT
      if (currentData?.THCS && currentData.THCS['6'] && !currentData.THCS['6'].GVBM_CN_THCS_V1) {
         const freshData = generateAllSampleData();
         ['THCS', 'THPT'].forEach(cap => {
             if (currentData[cap]) {
                 for (const khoi of Object.keys(currentData[cap])) {
                     if (currentData[cap][khoi] && currentData[cap][khoi].GVBM && currentData[cap][khoi].GVBM['Công nghệ']) {
                         currentData[cap][khoi].GVBM['Công nghệ'] = freshData[cap][khoi].GVBM['Công nghệ'];
                         currentData[cap][khoi].GVBM_CN_THCS_V1 = true;
                     }
                 }
             }
         });
         migrated = true;
      }

      // Force upgrade HDTN & THPT Pass/Fail
      if (currentData?.THCS && currentData.THCS['6'] && !currentData.THCS['6'].GVBM_HDTN_V1) {
         const freshData = generateAllSampleData();
         ['THCS', 'THPT'].forEach(cap => {
             if (currentData[cap]) {
                 for (const khoi of Object.keys(currentData[cap])) {
                     if (currentData[cap][khoi] && currentData[cap][khoi].GVBM) {
                         ["Giáo dục thể chất", "Nghệ thuật", "Âm nhạc", "Mĩ thuật", "Nội dung giáo dục địa phương", "Hoạt động trải nghiệm", "Hoạt động trải nghiệm, hướng nghiệp"].forEach(subj => {
                             if (freshData[cap][khoi].GVBM[subj]) {
                                 currentData[cap][khoi].GVBM[subj] = freshData[cap][khoi].GVBM[subj];
                             }
                         });
                         currentData[cap][khoi].GVBM_HDTN_V1 = true;
                     }
                 }
             }
         });
         migrated = true;
      }

      // Data Cleanup: Remove obsolete and overly specific phrasing ("Kết nối tri thức", "Hòa nhập", "lớp X")
      const cleanString = (str) => {
        if (typeof str !== 'string') return str;
        let orig = str;
        str = str.replace(/lớp \d(,?)\s?/g, "");
        str = str.replace(/bám sát chương trình Kết nối tri thức\./g, "hoàn thành tốt các nội dung học tập.");
        str = str.replace(/Kết nối tri thức/gi, "");
        str = str.replace(/Hòa nhập rất nhanh với nhịp độ năm học mới/gi, "Tiếp thu bài nhanh");
        str = str.replace(/[ \t\r]+/g, ' ').trim();
        if (orig !== str) migrated = true;
        return str;
      };

      const traverseAndClean = (obj) => {
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === 'string') {
              obj[i] = cleanString(obj[i]);
            } else if (typeof obj[i] === 'object' && obj[i] !== null) {
              traverseAndClean(obj[i]);
            }
          }
        } else if (typeof obj === 'object' && obj !== null) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = cleanString(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              traverseAndClean(obj[key]);
            }
          }
        }
      };

      traverseAndClean(currentData);
      
      if (migrated || !result.commentsData) {
        chrome.storage.local.set({ commentsData: currentData });
      }
      
      updateTabsUI();
      updateDropdowns();
      renderData();
    });
  } else {
    currentData = generateAllSampleData();
    updateTabsUI();
    updateDropdowns();
    renderData();
  }

  function updateDropdowns(source = null) {
    // Update container visibility systematically
    filterMonHocContainer.style.display =
      (currentRole === "GVBM" || currentRole === "DGTX" || currentRole === "TH_NLPC" || currentRole === "SO_GHI_NHAN_XET") ? "block" : "none";

    const isTHCSorTHPT = currentCapHoc === "THCS" || currentCapHoc === "THPT";
    const isTH = currentCapHoc === "TH";
    const showHocKy = ((currentRole === "GVBM" || currentRole === "SO_GHI_NHAN_XET") && (isTHCSorTHPT || isTH));
    filterHocKyContainer.style.display = showHocKy ? "block" : "none";
    
    if (showHocKy) {
      if (isTHCSorTHPT) {
        filterHocKy.innerHTML = `
          <option value="Học kỳ 1">Học kỳ 1</option>
          <option value="Học kỳ 2">Học kỳ 2</option>
          <option value="Cả năm">Cả năm</option>
        `;
        if (currentHocKy && ["Học kỳ 1", "Học kỳ 2", "Cả năm"].includes(currentHocKy)) {
          filterHocKy.value = currentHocKy;
        } else {
          currentHocKy = "Học kỳ 1";
          filterHocKy.value = currentHocKy;
        }
      } else if (isTH) {
        filterHocKy.innerHTML = `
          <option value="Giữa học kỳ 1">Giữa học kỳ 1</option>
          <option value="Cuối học kỳ 1">Cuối học kỳ 1</option>
          <option value="Giữa học kỳ 2">Giữa học kỳ 2</option>
          <option value="Cuối năm học">Cuối năm học</option>
        `;
        if (currentHocKy && ["Giữa học kỳ 1", "Cuối học kỳ 1", "Giữa học kỳ 2", "Cuối năm học"].includes(currentHocKy)) {
          filterHocKy.value = currentHocKy;
        } else {
          currentHocKy = "Cuối năm học"; // TH usually works mostly around year end for this tool historically, but let's default to Cuối năm học
          filterHocKy.value = currentHocKy;
        }
      }
    }

    if (!source || source === "cap") {
      const khois = GRADE_LEVELS[currentCapHoc] || [];
      filterKhoiLop.innerHTML = khois
        .map((k) => `<option value="${k}">Khối ${k}</option>`)
        .join("");
      currentKhoiLop = khois[0] || "";
    }

    if (!source || source === "cap" || source === "khoi" || source === "role") {
      if (currentRole === "GVBM" || currentRole === "DGTX" || currentRole === "TH_NLPC" || currentRole === "SO_GHI_NHAN_XET") {
        let subjects = [];
        if (currentRole === "DGTX" && currentCapHoc !== "TH") {
          subjects = ["Môn học", "Năng lực chung", "Phẩm chất chủ yếu"];
        } else if (currentRole === "TH_NLPC") {
          subjects = ["Năng lực", "Phẩm chất"];
        } else {
          subjects = getSubjects(currentCapHoc, currentKhoiLop);
        }
        filterMonHoc.innerHTML = subjects
          .map((s) => `<option value="${s}">${s}</option>`)
          .join("");
        currentMonHoc = subjects[0] || "";
      }
    }

    if (currentCapHoc === "TH" && currentRole === "DGTX") {
      filterTieuChiContainer.style.display = "block";
      const tieuChiList = [
        "Môn học và hoạt động giáo dục",
        "Nhận xét năng lực chung",
        "Nhận xét năng lực đặc thù",
        "Nhận xét phẩm chất chủ yếu"
      ];
      filterTieuChi.innerHTML = tieuChiList.map((t) => `<option value="${t}">${t}</option>`).join("");
      if (!tieuChiList.includes(currentTieuChi)) {
        currentTieuChi = tieuChiList[0];
      }
    } else {
      filterTieuChiContainer.style.display = "none";
    }

    if (currentRole === "DGTX") {
      filterThangContainer.style.display = "block";
    } else {
      filterThangContainer.style.display = "none";
    }

    let isVnedu = false;
    for (const radio of platformRadios) {
      if (radio.checked) {
        isVnedu = radio.value === "vnedu";
        break;
      }
    }
    
    
    // Safety
    

    filterCapHoc.value = currentCapHoc;
    if (filterKhoiLop.querySelector(`option[value="${currentKhoiLop}"]`)) {
      filterKhoiLop.value = currentKhoiLop;
    }
    if (filterMonHoc.querySelector(`option[value="${currentMonHoc}"]`)) {
      filterMonHoc.value = currentMonHoc;
    }
    if (filterHocKyContainer.style.display !== "none" && filterHocKy.querySelector(`option[value="${currentHocKy}"]`)) {
      filterHocKy.value = currentHocKy;
    }
    if (filterTieuChiContainer.style.display !== "none" && filterTieuChi.querySelector(`option[value="${currentTieuChi}"]`)) {
      filterTieuChi.value = currentTieuChi;
    }
    if (filterThangContainer.style.display !== "none" && filterThang.querySelector(`option[value="${currentThang}"]`)) {
      filterThang.value = currentThang;
    }
      }

  function updateTabsUI() {
    const tabGvbm = document.getElementById("tab-gvbm");
    const tabThNlpc = document.getElementById("tab-th-nlpc");
    const tabDgtx = document.getElementById("tab-dgtx");
    const tabHbGvbm = document.getElementById("tab-hb-gvbm");
    const tabHbGvcn = document.getElementById("tab-hb-gvcn");
    const tabHieuTruong = document.getElementById("tab-hieu-truong");
    const tabVneduNlpcHb = document.getElementById("tab-vnedu-nlpc-hb");

    let isVnedu = false;
    let isSmas = false;
    for (const radio of platformRadios) {
      if (radio.checked) {
        if (radio.value === "vnedu") isVnedu = true;
        else if (radio.value === "smas") isSmas = true;
        break;
      }
    }

    if (currentCapHoc === "TH" && !isVnedu && !isSmas) {
      tabGvbm.innerHTML = "ĐGĐK Môn học (5.3.1)";
      tabThNlpc.style.display = "flex";
      tabDgtx.style.display = "flex";
      tabDgtx.innerHTML = "Đánh giá thường xuyên (5.3.4)";
      tabHbGvcn.innerHTML = "Nhận xét Học bạ (5.3.3)";
      tabHbGvbm.style.display = "none";
      tabHieuTruong.style.display = "none";
      tabVneduNlpcHb.style.display = "none";
      
      if (currentRole === "HOC_BA_GVBM" || currentRole === "HIEU_TRUONG" || currentRole === "VNEDU_NLPC_HB") {
         // Auto switch away from hidden tabs
         currentRole = "GVBM";
         tabs.forEach(t => {
            t.classList.remove("bg-red-600", "text-white", "shadow-sm");
            t.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800");
         });
         tabGvbm.classList.remove("text-slate-400", "bg-transparent", "hover:text-white", "hover:bg-slate-800");
         tabGvbm.classList.add("bg-red-600", "text-white", "shadow-sm");
      }
    } else {
      if (isVnedu) {
         tabGvbm.innerHTML = "Sổ điểm nhận xét";
         tabGvbm.dataset.role = "GVBM";
      } else if (isSmas) {
         tabGvbm.dataset.role = "SO_GHI_NHAN_XET";
         if (currentRole === "GVBM") {
            currentRole = "SO_GHI_NHAN_XET";
         }
         if (currentCapHoc === "THCS") {
             tabGvbm.innerHTML = "Sổ ghi nhận xét Smas THCS";
         } else if (currentCapHoc === "THPT") {
             tabGvbm.innerHTML = "Sổ ghi nhận xét Smas THPT";
         } else {
             tabGvbm.innerHTML = "Sổ ghi nhận xét Smas TH";
         }
      } else {
         tabGvbm.innerHTML = "Nhận xét môn học (HK)";
         tabGvbm.dataset.role = "GVBM";
         if (currentRole === "SO_GHI_NHAN_XET") {
            currentRole = "GVBM";
         }
      }
      tabThNlpc.style.display = "none";
      tabDgtx.style.display = "none";
      tabHbGvcn.innerHTML = "Học bạ (GVCN)";
      tabHbGvbm.innerHTML = "Học bạ (GVBM)";

      if (isVnedu && currentCapHoc === "TH") {
         tabVneduNlpcHb.style.display = "flex";
      } else {
         tabVneduNlpcHb.style.display = "none";
      }

      if (isVnedu) {
         tabHbGvbm.style.display = "none";
         if (currentRole === "HOC_BA_GVBM" || (currentRole === "VNEDU_NLPC_HB" && currentCapHoc !== "TH")) {
            currentRole = "GVBM";
            tabs.forEach(t => {
               t.classList.remove("bg-red-600", "text-white", "shadow-sm");
               t.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800");
            });
            tabGvbm.classList.remove("text-slate-400", "bg-transparent", "hover:text-white", "hover:bg-slate-800");
            tabGvbm.classList.add("bg-red-600", "text-white", "shadow-sm");
         }
      } else {
         tabHbGvbm.style.display = "flex";
         if (currentRole === "VNEDU_NLPC_HB") {
            currentRole = "GVBM";
            tabs.forEach(t => {
               t.classList.remove("bg-red-600", "text-white", "shadow-sm");
               t.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800");
            });
            tabGvbm.classList.remove("text-slate-400", "bg-transparent", "hover:text-white", "hover:bg-slate-800");
            tabGvbm.classList.add("bg-red-600", "text-white", "shadow-sm");
         }
      }
      tabHieuTruong.innerHTML = "Phê duyệt Hiệu trưởng";
      tabHieuTruong.style.display = "flex";
      
      if (currentRole === "TH_NLPC" || currentRole === "DGTX") {
         currentRole = "GVBM";
         tabs.forEach(t => {
            t.classList.remove("bg-red-600", "text-white", "shadow-sm");
            t.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800");
         });
         tabGvbm.classList.remove("text-slate-400", "bg-transparent", "hover:text-white", "hover:bg-slate-800");
         tabGvbm.classList.add("bg-red-600", "text-white", "shadow-sm");
      }
    }
  }

  filterCapHoc.addEventListener("change", (e) => {
    currentCapHoc = e.target.value;
    updateTabsUI();
    updateDropdowns("cap");
    renderData();
  });

  filterKhoiLop.addEventListener("change", (e) => {
    currentKhoiLop = e.target.value;
    updateDropdowns("khoi");
    renderData();
  });

  filterHocKy.addEventListener("change", (e) => {
    currentHocKy = e.target.value;
    renderData();
  });

  filterMonHoc.addEventListener("change", (e) => {
    currentMonHoc = e.target.value;
    renderData();
  });

  filterTieuChi.addEventListener("change", (e) => {
    currentTieuChi = e.target.value;
    renderData();
  });

  filterThang.addEventListener("change", (e) => {
    currentThang = e.target.value;
    renderData();
  });

  
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      tabs.forEach((t) => {
        const r = t.dataset.role;
        if (r === "BACKUP_RESTORE") {
          t.className = "tab-btn w-full text-left flex items-center justify-between px-4 py-2 rounded-md text-[13px] font-semibold text-emerald-300 border border-emerald-500/30 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer bg-emerald-500/10 mt-2";
        } else if (r === "UPDATES") {
          t.className = "tab-btn w-full text-left flex items-center justify-between px-4 py-2 rounded-md text-[13px] font-semibold text-amber-300 border border-amber-500/30 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer bg-amber-500/10 mt-1";
        } else {
          t.className = "tab-btn w-full text-left flex items-center gap-3 px-4 py-1.5 rounded-md text-[13px] font-medium text-slate-300 border border-transparent hover:text-white hover:bg-white/5 transition-colors cursor-pointer";
        }
      });
      
      const cr = e.currentTarget.dataset.role;
      if (cr === "BACKUP_RESTORE") {
        e.currentTarget.className = "tab-btn w-full text-left flex items-center justify-between px-4 py-2 rounded-md text-[13px] font-semibold text-white border border-emerald-500/50 bg-emerald-500/30 backdrop-blur-md shadow-sm transition-colors cursor-pointer mt-2";
      } else if (cr === "UPDATES") {
        e.currentTarget.className = "tab-btn w-full text-left flex items-center justify-between px-4 py-2 rounded-md text-[13px] font-semibold text-white border border-amber-500/50 bg-amber-500/30 backdrop-blur-md shadow-sm transition-colors cursor-pointer mt-1";
      } else {
        e.currentTarget.className = "tab-btn w-full text-left flex items-center gap-3 px-4 py-1.5 bg-green-500/20 text-white border border-green-500/30 backdrop-blur-md shadow-sm rounded-md text-[13px] font-semibold transition-colors cursor-pointer";
      }

      currentRole = cr;
      const roleAlert = document.getElementById("roleAlert");

      const messageEl = roleAlert.querySelector("ul.list-disc");
      if (currentRole === "HOC_BA_GVCN") {
        roleAlert.style.display = "flex";
        roleAlert.querySelector("p.font-bold").innerText =
          "Học bạ (Giáo viên chủ nhiệm):";
        if (messageEl) {
          messageEl.innerHTML =
            `<li>Nhận xét này áp dụng cho trang "7.4.2. Nhập nhận xét GVCN" và các trang Nhận xét Học bạ cuối năm.</li><li>Công cụ sẽ tự động điền các lời phê mẫu vào ô nhận xét của GVCN.</li>`;
        }
      } else if (currentRole === "HOC_BA_GVBM") {
        roleAlert.style.display = "flex";
        roleAlert.querySelector("p.font-bold").innerText =
          "Học bạ (Giáo viên bộ môn):";
        if (messageEl) {
          messageEl.innerHTML =
            `<li>Mục này áp dụng cho phần nhập Học bạ đối với Giáo viên Bộ môn (khi nhập điểm hoặc ở trang Nhận xét Học bạ).</li>`;
        }
      } else if (currentRole === "HIEU_TRUONG") {
        roleAlert.style.display = "flex";
        roleAlert.querySelector("p.font-bold").innerText =
          "Phê duyệt Hiệu trưởng:";
        if (messageEl) {
          messageEl.innerHTML =
            `<li>Mục này dành riêng cho việc điền ở trang "Nhập phê duyệt Hiệu trưởng". Hệ thống sẽ tự động ghép mẫu này vào vùng nhập Phê duyệt của Hiệu trưởng.</li>`;
        }
      } else if (currentRole === "TH_NLPC") {
        roleAlert.style.display = "flex";
        roleAlert.querySelector("p.font-bold").innerText =
          "Đánh giá định kỳ NL & PC (Tiểu học):";
        if (messageEl) {
          messageEl.innerHTML =
            `<li>Mục này dành cho việc nhập Nhận xét định kỳ Năng lực và Phẩm chất cho HĐGD Tiểu học.</li>`;
        }
      } else if (currentRole === "DGTX") {
        roleAlert.style.display = "flex";
        roleAlert.querySelector("p.font-bold").innerText =
          "Đánh giá thường xuyên:";
        if (messageEl) {
          messageEl.innerHTML =
            `<li>Mục này dành cho việc nhập Nhận xét thường xuyên hàng tháng. Hệ thống sẽ chọn ngẫu nhiên một lời nhận xét tương ứng với mức độ đánh giá.</li>`;
        }
      } else if (currentRole === "SO_GHI_NHAN_XET") {
        roleAlert.style.display = "flex";
        roleAlert.querySelector("p.font-bold").innerText =
          "Sổ ghi nhận xét (Smas):";
        if (messageEl) {
          messageEl.innerHTML =
            `<li>Mục này dùng để điền tự động cho Sổ ghi nhận xét ở hệ thống Smas. Nó hỗ trợ nhận xét độc lập cho HK1, HK2 và Cả Năm. Bạn cần bấm vào cấu hình từng học kỳ để sửa đổi.</li>`;
        }
      } else {
        roleAlert.style.display = "none";
      }

      const viewTemplates = document.getElementById("viewTemplates");
      const updatesViewContainer = document.getElementById("updates-view-container");
      const backupViewContainer = document.getElementById("backup-view-container");
      const headerTitle = document.getElementById("main-header-title");

      if (currentRole === "UPDATES") {
        if (viewTemplates) viewTemplates.style.display = "none";
        if (updatesViewContainer) updatesViewContainer.style.display = "flex";
        if (backupViewContainer) backupViewContainer.style.display = "none";
        if (saveConfigBtn) saveConfigBtn.style.display = "none";
        if (resetConfigBtn) resetConfigBtn.style.display = "none";
        if (roleAlert) roleAlert.style.display = "none";
        if (headerTitle) headerTitle.innerText = "Cập nhật Tiện ích & Phiên bản";
        return;
      } else if (currentRole === "BACKUP_RESTORE") {
        if (viewTemplates) viewTemplates.style.display = "none";
        if (updatesViewContainer) updatesViewContainer.style.display = "none";
        if (backupViewContainer) backupViewContainer.style.display = "flex";
        if (saveConfigBtn) saveConfigBtn.style.display = "none";
        if (resetConfigBtn) resetConfigBtn.style.display = "none";
        if (roleAlert) roleAlert.style.display = "none";
        if (headerTitle) headerTitle.innerText = "Sao lưu & Phục hồi Lời phê Mẫu";
        if (typeof updateBackupStatsUI === "function") updateBackupStatsUI();
        return;
      } else {
        if (viewTemplates) viewTemplates.style.display = "flex";
        if (updatesViewContainer) updatesViewContainer.style.display = "none";
        if (backupViewContainer) backupViewContainer.style.display = "none";
        if (saveConfigBtn) saveConfigBtn.style.display = "flex";
        if (resetConfigBtn) resetConfigBtn.style.display = "flex";
        if (headerTitle) headerTitle.innerText = "Quản lý Lời phê Mẫu";
      }

      updateDropdowns("role");
      renderData();
    });
  });

  saveConfigBtn.addEventListener("click", () => {
    ensureDataStructure();

    if (currentRole === "HIEU_TRUONG") {
      const allGrades = [
        {cap: "TH", khoi: "1"}, {cap: "TH", khoi: "2"}, {cap: "TH", khoi: "3"}, {cap: "TH", khoi: "4"}, {cap: "TH", khoi: "5"},
        {cap: "THCS", khoi: "6"}, {cap: "THCS", khoi: "7"}, {cap: "THCS", khoi: "8"}, {cap: "THCS", khoi: "9"},
        {cap: "THPT", khoi: "10"}, {cap: "THPT", khoi: "11"}, {cap: "THPT", khoi: "12"}
      ];

      allGrades.forEach(grade => {
        const textarea = document.getElementById(`hieu_truong_${grade.cap}_${grade.khoi}`);
        if (textarea) {
          const comments = textarea.value.split('\n').map(c => c.trim()).filter(c => c.length > 0);
          if (!currentData[grade.cap][grade.khoi].HIEU_TRUONG) {
             currentData[grade.cap][grade.khoi].HIEU_TRUONG = {};
          }
          currentData[grade.cap][grade.khoi].HIEU_TRUONG["Nhận xét chung"] = {
            min: 0,
            max: 10,
            code: "",
            mucDG: "",
            comments: comments
          };
        }
      });

      saveToStorage();
      showCustomModal("Thành công", "Đã lưu cấu hình Phê duyệt Hiệu trưởng thành công!", true);
      return;
    }

    if (currentRole === "VNEDU_NLPC_HB") {
      const groups = [
        "Năng lực chung", "Năng lực đặc thù", "Phẩm chất"
      ];
      const itemsMap = {
        "Năng lực chung": ["Nhận xét chung", "Tự chủ và tự học", "Giao tiếp và hợp tác", "GQVĐ và sáng tạo"],
        "Năng lực đặc thù": ["Nhận xét năng lực đặc thù", "Ngôn ngữ", "Tính toán", "Khoa học", "Thẩm mĩ", "Thể chất"],
        "Phẩm chất": ["Nhận xét chung", "Yêu nước", "Nhân ái", "Chăm chỉ", "Trung thực", "Trách nhiệm"]
      };

      if (["3", "4", "5"].includes(currentKhoiLop)) {
          itemsMap["Năng lực đặc thù"].splice(4, 0, "Công nghệ", "Tin học");
      }

      if (!currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB) {
        currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB = getEmptyVneduNlpcHb(currentKhoiLop);
      }

      groups.forEach(group => {
        itemsMap[group].forEach(item => {
          const className = `.comment-input-vnedu_${group.replace(/ /g, '_')}_${item.replace(/ /g, '_')}`;
          const inputs = Array.from(document.querySelectorAll(className));
          
          if (inputs.length > 0) {
            const comments = inputs.map(i => i.value.trim()).filter(c => c.length > 0);
            if (!currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB[group]) {
              currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB[group] = {};
            }
            if (!currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB[group][item]) {
              currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB[group][item] = {comments: []};
            }
            currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB[group][item].comments = comments;
          }
        });
      });

      saveToStorage();
      showCustomModal("Thành công", "Đã lưu cấu hình Phẩm chất - Năng lực thành công!", true);
      return;
    }

    const isNlPcMode = currentRole === "TH_NLPC";
    const isDgtxMode = currentRole === "DGTX";
    const platformRadios = document.getElementsByName("configPlatform");
    let isVnedu = false;
    for (const radio of platformRadios) {
      if (radio.checked) {
        isVnedu = radio.value === "vnedu";
        break;
      }
    }
    let levels = getEvalLevels(currentCapHoc, isNlPcMode, isDgtxMode, isVnedu, currentMonHoc);

    if (currentRole === "HOC_BA_GVCN") {
      levels = ["Nhận xét chung"];
    } else if (currentRole === "SO_GHI_NHAN_XET" && currentCapHoc === "TH") {
      levels = ["Nhận xét chung", "Giữa học kỳ 1", "Cuối học kỳ 1", "Giữa học kỳ 2", "Cuối năm học"];
    }

    levels.forEach((level) => {
      const minInput = document.getElementById(`min_${level}`);
      const maxInput = document.getElementById(`max_${level}`);
      const codeInput = document.getElementById(`code_${level}`);
      const mucDGInput = document.getElementById(`mucDG_${level}`);
      if (minInput && maxInput && codeInput) {
        const min = parseFloat(minInput.value);
        const max = parseFloat(maxInput.value);
        const code = codeInput.value.trim();
        const mucDG = mucDGInput ? mucDGInput.value.trim() : "";
        
        const commentInputs = Array.from(document.querySelectorAll(`.comment-input-${level.replace(/ /g, '_')}`));
        const comments = commentInputs
          .map((input) => input.value.trim())
          .filter((s) => s.length > 0);

        if (currentRole === "GVBM") {
          const mhKey = getMonHocKey();
          currentData[currentCapHoc][currentKhoiLop].GVBM[mhKey][
            level
          ] = {
            min: isNaN(min) ? 0 : min,
            max: isNaN(max) ? 10 : max,
            code: code,
            mucDG: mucDG,
            comments: comments,
          };
        } else if (currentRole === "TH_NLPC") {
          currentData[currentCapHoc][currentKhoiLop].TH_NLPC[level] = {
             min: isNaN(min) ? 0 : min,
             max: isNaN(max) ? 10 : max,
             code: code,
             mucDG: mucDG,
             comments: comments,
          };
        } else if (currentRole === "DGTX") {
          const mainKey = currentCapHoc === "TH" ? `${currentMonHoc}_${currentTieuChi}` : currentMonHoc;
          const dgtxKey = `${mainKey}_Thang${currentThang}`;
          if (!currentData[currentCapHoc][currentKhoiLop].DGTX) currentData[currentCapHoc][currentKhoiLop].DGTX = {};
          if (!currentData[currentCapHoc][currentKhoiLop].DGTX[dgtxKey]) {
            currentData[currentCapHoc][currentKhoiLop].DGTX[dgtxKey] = {};
          }
          currentData[currentCapHoc][currentKhoiLop].DGTX[dgtxKey][level] = {
            min: 0,
            max: 10,
            code: code,
            mucDG: mucDG,
            comments: comments,
          };
        } else if (currentRole === "HIEU_TRUONG") {
          if (!currentData[currentCapHoc][currentKhoiLop].HIEU_TRUONG[level]) {
            currentData[currentCapHoc][currentKhoiLop].HIEU_TRUONG[level] = {};
          }
          currentData[currentCapHoc][currentKhoiLop].HIEU_TRUONG[level] = {
            min: isNaN(min) ? 0 : min,
            max: isNaN(max) ? 10 : max,
            code: code,
            mucDG: mucDG,
            comments: comments,
          };
        } else if (currentRole === "HOC_BA_GVBM") {
          if (!currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVBM[level]) {
            currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVBM[level] = {};
          }
          currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVBM[level] = {
            min: isNaN(min) ? 0 : min,
            max: isNaN(max) ? 10 : max,
            code: code,
            mucDG: mucDG,
            comments: comments,
          };
        } else if (currentRole === "HOC_BA_GVCN") {
          if (!currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVCN[level]) {
            currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVCN[level] = {};
          }
          currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVCN[level] = {
            min: isNaN(min) ? 0 : min,
            max: isNaN(max) ? 10 : max,
            code: code,
            mucDG: mucDG,
            comments: comments,
          };
        } else if (currentRole === "SO_GHI_NHAN_XET") {
          const mhKey = getMonHocKey();
          if (!currentData[currentCapHoc][currentKhoiLop].SO_GHI_NHAN_XET[mhKey]) {
            currentData[currentCapHoc][currentKhoiLop].SO_GHI_NHAN_XET[mhKey] = getEmptySoGhiNhanXet();
          }
          if (!currentData[currentCapHoc][currentKhoiLop].SO_GHI_NHAN_XET[mhKey][level]) {
            currentData[currentCapHoc][currentKhoiLop].SO_GHI_NHAN_XET[mhKey][level] = {};
          }
          currentData[currentCapHoc][currentKhoiLop].SO_GHI_NHAN_XET[mhKey][level] = {
            min: isNaN(min) ? 0 : min,
            max: isNaN(max) ? 10 : max,
            code: code,
            mucDG: mucDG,
            comments: comments,
          };
        }
      }
    });

    saveToStorage();
    showCustomModal("Thành công", "Đã lưu cấu hình thành công!", true);
  });

  resetConfigBtn.addEventListener("click", () => {
    showCustomModal("Khôi phục cài đặt gốc", "Bạn có chắc chắn muốn khôi phục về cài đặt gốc? TẤT CẢ lời phê mẫu của bạn sẽ bị xóa.", false, (isConfirmed) => {
      if (isConfirmed) {
        try {
          currentData = generateAllSampleData();
          saveToStorage();
          updateTabsUI();
          updateDropdowns();
          renderData();
          showCustomModal("Thành công", "Đã khôi phục cài đặt gốc thành công!", true);
        } catch (e) {
          console.error("Error resetting data:", e);
          showCustomModal("Lỗi", "Có lỗi xảy ra khi khôi phục: " + e.message, true);
        }
      }
    });
  });

  // ==========================================
  // BACKUP & RESTORE / EXPORT & IMPORT MANAGER
  // ==========================================

  function countTotalComments(data) {
    let total = 0;
    let summary = { TH: 0, THCS: 0, THPT: 0 };
    if (!data) return { total, summary };

    for (const capHoc of ["TH", "THCS", "THPT"]) {
      if (!data[capHoc]) continue;
      let capCount = 0;
      for (const khoi of Object.keys(data[capHoc])) {
        const kData = data[capHoc][khoi];
        if (!kData) continue;

        // 1. GVBM
        if (kData.GVBM) {
          for (const mon in kData.GVBM) {
            for (const lv in kData.GVBM[mon]) {
              capCount += (kData.GVBM[mon][lv]?.comments || []).length;
            }
          }
        }
        // 2. DGTX
        if (kData.DGTX) {
          for (const mon in kData.DGTX) {
            for (const lv in kData.DGTX[mon]) {
              capCount += (kData.DGTX[mon][lv]?.comments || []).length;
            }
          }
        }
        // 3. TH_NLPC
        if (kData.TH_NLPC) {
          for (const lv in kData.TH_NLPC) {
            capCount += (kData.TH_NLPC[lv]?.comments || []).length;
          }
        }
        // 4. VNEDU_NLPC_HB
        if (kData.VNEDU_NLPC_HB) {
          for (const grp in kData.VNEDU_NLPC_HB) {
            for (const itm in kData.VNEDU_NLPC_HB[grp]) {
              capCount += (kData.VNEDU_NLPC_HB[grp][itm]?.comments || []).length;
            }
          }
        }
        // 5. HOC_BA_GVBM
        if (kData.HOC_BA_GVBM) {
          for (const lv in kData.HOC_BA_GVBM) {
            capCount += (kData.HOC_BA_GVBM[lv]?.comments || []).length;
          }
        }
        // 6. HOC_BA_GVCN
        if (kData.HOC_BA_GVCN) {
          for (const lv in kData.HOC_BA_GVCN) {
            capCount += (kData.HOC_BA_GVCN[lv]?.comments || []).length;
          }
        }
        // 7. SO_GHI_NHAN_XET
        if (kData.SO_GHI_NHAN_XET) {
          for (const mon in kData.SO_GHI_NHAN_XET) {
            for (const lv in kData.SO_GHI_NHAN_XET[mon]) {
              capCount += (kData.SO_GHI_NHAN_XET[mon][lv]?.comments || []).length;
            }
          }
        }
        // 8. HIEU_TRUONG
        if (kData.HIEU_TRUONG) {
          for (const lv in kData.HIEU_TRUONG) {
            capCount += (kData.HIEU_TRUONG[lv]?.comments || []).length;
          }
        }
      }
      summary[capHoc] = capCount;
      total += capCount;
    }
    return { total, summary };
  }

  function updateBackupStatsUI() {
    const stats = countTotalComments(currentData);
    const thEl = document.getElementById("stat-count-th");
    const thcsEl = document.getElementById("stat-count-thcs");
    const thptEl = document.getElementById("stat-count-thpt");
    const totalEl = document.getElementById("stat-count-total");

    if (thEl) thEl.innerText = stats.summary.TH.toLocaleString();
    if (thcsEl) thcsEl.innerText = stats.summary.THCS.toLocaleString();
    if (thptEl) thptEl.innerText = stats.summary.THPT.toLocaleString();
    if (totalEl) totalEl.innerText = stats.total.toLocaleString();
  }

  function exportAllTemplatesJson() {
    try {
      const stats = countTotalComments(currentData);
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, "0");
      const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      const timeStr = `${pad(now.getHours())}h${pad(now.getMinutes())}`;

      const backupPayload = {
        app: "TroLyNhanXetEduPro",
        backupType: "full_comments_all_grades",
        version: "28.09.2026",
        exportedAt: now.toISOString(),
        exportedAtFormatted: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
        stats: stats,
        commentsData: currentData
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Mau_nhan_xet_EduPro_Tat_ca_cap_hoc_${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (typeof showToast === "function") {
        showToast(
          "Tải sao lưu thành công!",
          `Đã lưu toàn bộ ${stats.total.toLocaleString()} lời phê mẫu của tất cả các cấp học về máy tính.`,
          "success",
          5000
        );
      }
    } catch (err) {
      console.error("Export JSON error:", err);
      showCustomModal("Lỗi xuất tệp", "Không thể tải tệp sao lưu: " + err.message, true);
    }
  }

  function generateAllTemplatesWorkbook() {
    const wb = XLSX.utils.book_new();
    const headers = [
      "Cấp Học",
      "Khối Lớp",
      "Vai Trò",
      "Môn Học",
      "Mức Độ",
      "Điểm Từ",
      "Điểm Đến",
      "Mã NX",
      "Lời Phê",
    ];

    const sortMapLevels = (subData) => {
      return Object.keys(subData).sort((a, b) => {
        const itemA = subData[a];
        const itemB = subData[b];
        const maxA = itemA.max !== undefined && itemA.max !== "" ? Number(itemA.max) : -1;
        const maxB = itemB.max !== undefined && itemB.max !== "" ? Number(itemB.max) : -1;
        if (maxA !== maxB) return maxB - maxA;
        const minA = itemA.min !== undefined && itemA.min !== "" ? Number(itemA.min) : -1;
        const minB = itemB.min !== undefined && itemB.min !== "" ? Number(itemB.min) : -1;

        if (minA !== minB) return minB - minA;
        if (a === "Mức độ Tốt") return -1;
        if (b === "Mức độ Tốt") return 1;
        return a.localeCompare(b);
      });
    };

    const capHocs = ["TH", "THCS", "THPT"];

    capHocs.forEach((capHoc) => {
      const ws_data = [headers];

      if (currentData[capHoc]) {
        const khois = Object.keys(currentData[capHoc]).sort((a, b) => parseInt(a) - parseInt(b));

        khois.forEach((khoi) => {
          const kData = currentData[capHoc][khoi];

          // 1. GVBM
          if (kData.GVBM) {
            const sortedMons = Object.keys(kData.GVBM).sort((a, b) => a.localeCompare(b));
            for (const mon of sortedMons) {
              const subData = kData.GVBM[mon];
              const sortedLevels = sortMapLevels(subData);
              for (const lv of sortedLevels) {
                const item = subData[lv];
                const commentsStr = (item.comments || []).join("\n");
                ws_data.push([
                  capHoc, khoi, "GVBM", mon, lv,
                  item.min !== undefined ? item.min.toString() : "0",
                  item.max !== undefined ? item.max.toString() : "10",
                  item.code || "",
                  commentsStr
                ]);
              }
            }
          }

          // 2. DGTX
          if (kData.DGTX) {
            const sortedMons = Object.keys(kData.DGTX).sort((a, b) => a.localeCompare(b));
            for (const mon of sortedMons) {
              const subData = kData.DGTX[mon];
              const sortedLevels = sortMapLevels(subData);
              for (const lv of sortedLevels) {
                const item = subData[lv];
                const commentsStr = (item.comments || []).join("\n");
                ws_data.push([
                  capHoc, khoi, "DGTX", mon, lv,
                  item.min !== undefined ? item.min.toString() : "0",
                  item.max !== undefined ? item.max.toString() : "10",
                  item.code || "",
                  commentsStr
                ]);
              }
            }
          }

          // 3. TH_NLPC (Primary Only)
          if (capHoc === "TH" && kData.TH_NLPC) {
            const sortedLevels = sortMapLevels(kData.TH_NLPC);
            for (const lv of sortedLevels) {
              const item = kData.TH_NLPC[lv];
              const commentsStr = (item.comments || []).join("\n");
              ws_data.push([
                capHoc, khoi, "TH_NLPC", "", lv,
                item.min !== undefined ? item.min.toString() : "0",
                item.max !== undefined ? item.max.toString() : "10",
                item.code || "",
                commentsStr
              ]);
            }
          }
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      XLSX.utils.book_append_sheet(wb, ws, capHoc);
    });

    // 4. Hoc Ba & So Ghi Nhan Xet
    const hb_ws_data = [headers];
    capHocs.forEach((capHoc) => {
      if (currentData[capHoc]) {
        const khois = Object.keys(currentData[capHoc]).sort((a, b) => parseInt(a) - parseInt(b));
        khois.forEach((khoi) => {
          const kData = currentData[capHoc][khoi];

          // HOC_BA_GVBM
          if (kData.HOC_BA_GVBM) {
            const sortedLevels = sortMapLevels(kData.HOC_BA_GVBM);
            for (const lv of sortedLevels) {
              const item = kData.HOC_BA_GVBM[lv];
              const commentsStr = (item.comments || []).join("\n");
              hb_ws_data.push([
                capHoc, khoi, "HOC_BA_GVBM", "", lv,
                item.min !== undefined ? item.min.toString() : "0",
                item.max !== undefined ? item.max.toString() : "10",
                item.code || "",
                commentsStr
              ]);
            }
          }

          // HOC_BA_GVCN
          if (kData.HOC_BA_GVCN) {
            const sortedLevels = sortMapLevels(kData.HOC_BA_GVCN);
            for (const lv of sortedLevels) {
              const item = kData.HOC_BA_GVCN[lv];
              const commentsStr = (item.comments || []).join("\n");
              hb_ws_data.push([
                capHoc, khoi, "HOC_BA_GVCN", "", lv,
                item.min !== undefined ? item.min.toString() : "0",
                item.max !== undefined ? item.max.toString() : "10",
                item.code || "",
                commentsStr
              ]);
            }
          }

          // SO_GHI_NHAN_XET
          if (kData.SO_GHI_NHAN_XET) {
            for (const mon of Object.keys(kData.SO_GHI_NHAN_XET)) {
              const subData = kData.SO_GHI_NHAN_XET[mon];
              if (!subData) continue;
              const sortedLevels = sortMapLevels(subData);
              for (const lv of sortedLevels) {
                const item = subData[lv];
                const commentsStr = (item.comments || []).join("\n");
                hb_ws_data.push([
                  capHoc, khoi, "SO_GHI_NHAN_XET", mon, lv,
                  item.min !== undefined ? item.min.toString() : "0",
                  item.max !== undefined ? item.max.toString() : "10",
                  item.code || "",
                  commentsStr
                ]);
              }
            }
          }

          // HIEU_TRUONG
          if (kData.HIEU_TRUONG) {
            const sortedLevels = sortMapLevels(kData.HIEU_TRUONG);
            for (const lv of sortedLevels) {
              const item = kData.HIEU_TRUONG[lv];
              const commentsStr = (item.comments || []).join("\n");
              hb_ws_data.push([
                capHoc, khoi, "HIEU_TRUONG", "", lv,
                item.min !== undefined ? item.min.toString() : "0",
                item.max !== undefined ? item.max.toString() : "10",
                item.code || "",
                commentsStr
              ]);
            }
          }
        });
      }
    });

    const hb_ws = XLSX.utils.aoa_to_sheet(hb_ws_data);
    XLSX.utils.book_append_sheet(wb, hb_ws, "Học Bạ");
    return wb;
  }

  function downloadAllTemplatesExcel() {
    try {
      const wb = generateAllTemplatesWorkbook();
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, "0");
      const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      XLSX.writeFile(wb, `Mau_nhan_xet_EduPro_Tat_ca_cap_hoc_${dateStr}.xlsx`);
      if (typeof showToast === "function") {
        showToast("Xuất Excel thành công!", "Đã tải bảng tính mẫu nhận xét tất cả các cấp học về máy tính.", "success", 4000);
      }
    } catch (err) {
      console.error("Excel export error:", err);
      showCustomModal("Lỗi xuất Excel", "Không thể xuất tệp Excel: " + err.message, true);
    }
  }

  function ensureMigrationFlags(data) {
    if (!data) return;
    if (data.TH) {
      for (const k of Object.keys(data.TH)) {
        if (data.TH[k]) {
          data.TH[k].DGTX_V3 = true;
          data.TH[k].GVBM_CN_V2 = true;
        }
      }
    }
    if (data.THCS) {
      for (const k of Object.keys(data.THCS)) {
        if (data.THCS[k]) {
          data.THCS[k].GVBM_THCS_3SUBS_V1 = true;
          data.THCS[k].GVBM_CN_THCS_V1 = true;
          data.THCS[k].GVBM_HDTN_V1 = true;
        }
      }
    }
    if (data.THPT) {
      for (const k of Object.keys(data.THPT)) {
        if (data.THPT[k]) {
          data.THPT[k].GVBM_CN_THCS_V1 = true;
          data.THPT[k].GVBM_HDTN_V1 = true;
        }
      }
    }
  }

  function handleBackupFile(file) {
    if (!file) return;
    const fileName = file.name || "";
    const isJson = fileName.toLowerCase().endsWith(".json");
    const isExcel = fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls");

    const infoEl = document.getElementById("backupFileSelectedInfo");
    if (infoEl) {
      infoEl.classList.remove("hidden");
      infoEl.innerHTML = `Đang xử lý tệp: <strong>${fileName}</strong> (${(file.size / 1024).toFixed(1)} KB)...`;
    }

    if (isJson) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const parsed = JSON.parse(content);

          let incomingData = null;
          if (parsed && parsed.commentsData && (parsed.commentsData.TH || parsed.commentsData.THCS || parsed.commentsData.THPT)) {
            incomingData = parsed.commentsData;
          } else if (parsed && (parsed.TH || parsed.THCS || parsed.THPT)) {
            incomingData = parsed;
          }

          if (!incomingData) {
            if (infoEl) infoEl.classList.add("hidden");
            showCustomModal(
              "Tệp không hợp lệ",
              "Tệp JSON được chọn không đúng định dạng sao lưu lời phê mẫu của Trợ lý Edu Pro. Vui lòng chọn đúng tệp đã tải về từ tiện ích.",
              true
            );
            return;
          }

          const stats = countTotalComments(incomingData);
          const exportDate = parsed.exportedAtFormatted || (parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString("vi-VN") : "Bản sao lưu trước đây");

          showCustomModal(
            "Xác nhận phục hồi lời phê mẫu",
            `Đã đọc thành công tệp sao lưu: "${fileName}"\n\n` +
            `• Thời gian sao lưu: ${exportDate}\n` +
            `• Tổng số lời phê: ${stats.total.toLocaleString()} mẫu\n` +
            `  - Cấp Tiểu học: ${stats.summary.TH.toLocaleString()} lời phê\n` +
            `  - Cấp THCS: ${stats.summary.THCS.toLocaleString()} lời phê\n` +
            `  - Cấp THPT: ${stats.summary.THPT.toLocaleString()} lời phê\n\n` +
            `Bạn có chắc chắn muốn nạp toàn bộ lời phê này vào tiện ích không? Toàn bộ mẫu hiện tại sẽ được cập nhật chính xác theo tệp sao lưu của bạn.`,
            false,
            (confirmed) => {
              if (confirmed) {
                ensureMigrationFlags(incomingData);
                currentData = incomingData;
                saveToStorage();
                updatePlatformUI();
                updateTabsUI();
                updateDropdowns();
                renderData();
                updateBackupStatsUI();
                if (infoEl) {
                  infoEl.innerHTML = `✅ Phục hồi thành công <strong>${stats.total.toLocaleString()}</strong> lời phê mẫu từ tệp <strong>${fileName}</strong>`;
                }
                showCustomModal(
                  "Phục hồi thành công!",
                  `Đã nạp thành công toàn bộ ${stats.total.toLocaleString()} lời phê mẫu của tất cả các cấp học vào tiện ích. Toàn bộ mẫu nhận xét cá nhân của bạn đã được khôi phục nguyên vẹn!`,
                  true
                );
                if (typeof showToast === "function") {
                  showToast("Phục hồi thành công!", `Đã nạp ${stats.total.toLocaleString()} lời phê mẫu vào tiện ích.`, "success", 5000);
                }
              }
            }
          );
        } catch (err) {
          console.error("JSON parse error:", err);
          if (infoEl) infoEl.classList.add("hidden");
          showCustomModal("Lỗi đọc tệp", "Không thể đọc nội dung tệp JSON: " + err.message, true);
        }
      };
      reader.readAsText(file);
    } else if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          let newData = JSON.parse(JSON.stringify(currentData));
          let hasData = false;
          let importedCount = 0;

          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (rows.length < 2) return;

            const headers = rows[0].map((h) =>
              (h || "").toString().trim().toLowerCase(),
            );
            const cCapHoc = headers.indexOf("cấp học");
            const cKhoi = headers.indexOf("khối lớp");
            const cVaiTro = headers.indexOf("vai trò");
            const cMon = headers.indexOf("môn học");
            const cMucDo = headers.indexOf("mức độ");
            const cDiemTu = headers.indexOf("điểm từ");
            const cDiemDen = headers.indexOf("điểm đến");
            const cMaNX = headers.indexOf("mã nx");

            let cLoiPhe = headers.indexOf("lời phê");
            if (cLoiPhe === -1) cLoiPhe = headers.indexOf("nội dung");

            if (cCapHoc === -1 || cKhoi === -1 || cVaiTro === -1 || cLoiPhe === -1) return;

            hasData = true;

            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length === 0 || !row[cCapHoc]) continue;

              const capHoc = row[cCapHoc].toString().trim();
              const khoiLop = row[cKhoi] ? row[cKhoi].toString().trim() : "";
              const vaiTro = row[cVaiTro] ? row[cVaiTro].toString().trim() : "";
              const monHoc = row[cMon] ? row[cMon].toString().trim() : "";
              const mucDo = row[cMucDo] ? row[cMucDo].toString().trim() : "";

              let diemTu = parseFloat(row[cDiemTu]);
              if (isNaN(diemTu)) diemTu = 0;
              let diemDen = parseFloat(row[cDiemDen]);
              if (isNaN(diemDen)) diemDen = 10;

              const maNX = row[cMaNX] ? row[cMaNX].toString().trim() : "";
              const rawComments = row[cLoiPhe] ? row[cLoiPhe].toString() : "";
              const comments = rawComments
                .split("\n")
                .map((s) => s.trim())
                .filter((x) => x);

              if (comments.length > 0) importedCount += comments.length;

              if (!newData[capHoc]) newData[capHoc] = {};
              if (!newData[capHoc][khoiLop])
                newData[capHoc][khoiLop] = {
                  GVBM: {},
                  HOC_BA_GVBM: {},
                  HOC_BA_GVCN: {},
                  SO_GHI_NHAN_XET: {},
                  HIEU_TRUONG: {},
                };
              if (Array.isArray(newData[capHoc][khoiLop].HOC_BA_GVBM))
                newData[capHoc][khoiLop].HOC_BA_GVBM = {};
              if (Array.isArray(newData[capHoc][khoiLop].HOC_BA_GVCN))
                newData[capHoc][khoiLop].HOC_BA_GVCN = {};
              if (!newData[capHoc][khoiLop].HIEU_TRUONG)
                newData[capHoc][khoiLop].HIEU_TRUONG = getEmptyHieuTruong(khoiLop);
              if (capHoc === "TH" && !newData[capHoc][khoiLop].TH_NLPC)
                newData[capHoc][khoiLop].TH_NLPC = getEmptyThNlPc();

              if (vaiTro === "GVBM" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].GVBM[monHoc]) {
                  newData[capHoc][khoiLop].GVBM[monHoc] = {
                    Tốt: { min: 8, max: 10, code: "T", mucDG: "T", comments: [] },
                    Khá: { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: [] },
                    Đạt: { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: [] },
                    "Chưa Đạt": { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: [] },
                  };
                }
                if (!newData[capHoc][khoiLop].GVBM[monHoc][mucDo]) {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }
                if (row[cDiemTu] !== undefined && row[cDiemTu] !== null && row[cDiemTu] !== "") {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo].min = diemTu;
                }
                if (row[cDiemDen] !== undefined && row[cDiemDen] !== null && row[cDiemDen] !== "") {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo].code = maNX;
                }
                newData[capHoc][khoiLop].GVBM[monHoc][mucDo].comments = comments;
              } else if (vaiTro === "DGTX" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].DGTX) newData[capHoc][khoiLop].DGTX = {};
                if (!newData[capHoc][khoiLop].DGTX[monHoc]) {
                  newData[capHoc][khoiLop].DGTX[monHoc] = getEmptyDGTX(monHoc, undefined, khoiLop);
                }
                if (!newData[capHoc][khoiLop].DGTX[monHoc][mucDo]) {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }
                if (row[cDiemTu] !== undefined && row[cDiemTu] !== null && row[cDiemTu] !== "") {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo].min = diemTu;
                }
                if (row[cDiemDen] !== undefined && row[cDiemDen] !== null && row[cDiemDen] !== "") {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo].code = maNX;
                }
                newData[capHoc][khoiLop].DGTX[monHoc][mucDo].comments = comments;
              } else if (vaiTro === "SO_GHI_NHAN_XET" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].SO_GHI_NHAN_XET[monHoc]) {
                  newData[capHoc][khoiLop].SO_GHI_NHAN_XET[monHoc] = {
                    "Nhận xét chung": { min: 0, max: 10, code: "", comments: [] }
                  };
                }
                const existingPool = newData[capHoc][khoiLop].SO_GHI_NHAN_XET[monHoc]["Nhận xét chung"].comments;
                comments.forEach((c) => {
                  if (!existingPool.includes(c)) existingPool.push(c);
                });
              } else if (vaiTro === "TH_NLPC" && mucDo) {
                if (!newData[capHoc][khoiLop].TH_NLPC) newData[capHoc][khoiLop].TH_NLPC = getEmptyThNlPc();
                if (!newData[capHoc][khoiLop].TH_NLPC[mucDo]) {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }
                if (row[cDiemTu] !== undefined && row[cDiemTu] !== null && row[cDiemTu] !== "") {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo].min = diemTu;
                }
                if (row[cDiemDen] !== undefined && row[cDiemDen] !== null && row[cDiemDen] !== "") {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo].code = maNX;
                }
                newData[capHoc][khoiLop].TH_NLPC[mucDo].comments = comments;
              } else if ((vaiTro === "HOC_BA" || vaiTro === "HOC_BA_GVCN" || vaiTro === "HOC_BA_GVBM") && mucDo) {
                const targetVaiTro = vaiTro === "HOC_BA" ? "HOC_BA_GVCN" : vaiTro;
                if (!newData[capHoc][khoiLop][targetVaiTro]) {
                  newData[capHoc][khoiLop][targetVaiTro] = {
                    Tốt: { min: 8, max: 10, code: "T", mucDG: "T", comments: [] },
                    Khá: { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: [] },
                    Đạt: { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: [] },
                    "Chưa Đạt": { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: [] },
                  };
                }
                if (!newData[capHoc][khoiLop][targetVaiTro][mucDo]) {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }
                if (row[cDiemTu] !== undefined && row[cDiemTu] !== null && row[cDiemTu] !== "") {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo].min = diemTu;
                }
                if (row[cDiemDen] !== undefined && row[cDiemDen] !== null && row[cDiemDen] !== "") {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo].code = maNX;
                }
                newData[capHoc][khoiLop][targetVaiTro][mucDo].comments = comments;
              } else if (vaiTro === "HIEU_TRUONG" && mucDo) {
                if (!newData[capHoc][khoiLop].HIEU_TRUONG) {
                  newData[capHoc][khoiLop].HIEU_TRUONG = {
                    Tốt: { min: 8, max: 10, code: "T", mucDG: "T", comments: [] },
                    Khá: { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: [] },
                    Đạt: { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: [] },
                    "Chưa Đạt": { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: [] },
                  };
                }
                if (!newData[capHoc][khoiLop].HIEU_TRUONG[mucDo]) {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }
                if (row[cDiemTu] !== undefined && row[cDiemTu] !== null && row[cDiemTu] !== "") {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].min = diemTu;
                }
                if (row[cDiemDen] !== undefined && row[cDiemDen] !== null && row[cDiemDen] !== "") {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].code = maNX;
                }
                newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].comments = comments;
              } else if (vaiTro === "VNEDU_NLPC_HB" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].VNEDU_NLPC_HB) newData[capHoc][khoiLop].VNEDU_NLPC_HB = {};
                if (!newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc]) newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc] = {};
                if (!newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc][mucDo]) {
                  newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc][mucDo] = { comments: [] };
                }
                newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc][mucDo].comments = comments;
              }
            }
          });

          if (!hasData) {
            if (infoEl) infoEl.classList.add("hidden");
            showCustomModal(
              "Tệp Excel không hợp lệ",
              "Định dạng cột ở các sheet không chính xác hoặc không có dữ liệu hợp lệ. Vui lòng tải 'File Mẫu' để xem chuẩn cấu trúc.",
              true
            );
            return;
          }

          ensureMigrationFlags(newData);
          currentData = newData;
          saveToStorage();
          updatePlatformUI();
          updateTabsUI();
          updateDropdowns();
          renderData();
          updateBackupStatsUI();
          if (infoEl) {
            infoEl.innerHTML = `✅ Phục hồi thành công lời phê mẫu từ tệp Excel <strong>${fileName}</strong>`;
          }
          showCustomModal(
            "Phục hồi thành công!",
            `Đã nạp thành công các lời phê mẫu từ tệp Excel "${fileName}" vào tiện ích!`,
            true
          );
          if (typeof showToast === "function") {
            showToast("Phục hồi thành công!", `Đã nạp lời phê mẫu từ Excel vào tiện ích.`, "success", 5000);
          }
        } catch (err) {
          console.error(err);
          if (infoEl) infoEl.classList.add("hidden");
          showCustomModal("Lỗi đọc Excel", "Không thể đọc tệp Excel: " + err.message, true);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      if (infoEl) infoEl.classList.add("hidden");
      showCustomModal("Định dạng không được hỗ trợ", "Vui lòng chọn tệp định dạng .json (khuyên dùng) hoặc .xlsx / .xls.", true);
    }
  }

  // Header quick backup / restore buttons
  const exportAllTemplatesBtn = document.getElementById("exportAllTemplatesBtn");
  if (exportAllTemplatesBtn) {
    exportAllTemplatesBtn.addEventListener("click", () => {
      exportAllTemplatesJson();
    });
  }

  const importAllTemplatesBtn = document.getElementById("importAllTemplatesBtn");
  const backupFileInput = document.getElementById("backupFileInput");

  if (importAllTemplatesBtn && backupFileInput) {
    importAllTemplatesBtn.addEventListener("click", () => {
      backupFileInput.click();
    });
  }

  if (backupFileInput) {
    backupFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        handleBackupFile(file);
      }
      backupFileInput.value = "";
    });
  }

  // Backup View Actions
  const backupDownloadJsonBtn = document.getElementById("backupDownloadJsonBtn");
  if (backupDownloadJsonBtn) {
    backupDownloadJsonBtn.addEventListener("click", () => {
      exportAllTemplatesJson();
    });
  }

  const backupDownloadExcelBtn = document.getElementById("backupDownloadExcelBtn");
  if (backupDownloadExcelBtn) {
    backupDownloadExcelBtn.addEventListener("click", () => {
      downloadAllTemplatesExcel();
    });
  }

  const backupSelectFileBtn = document.getElementById("backupSelectFileBtn");
  if (backupSelectFileBtn && backupFileInput) {
    backupSelectFileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      backupFileInput.click();
    });
  }

  const backupDropzone = document.getElementById("backupDropzone");
  if (backupDropzone && backupFileInput) {
    backupDropzone.addEventListener("click", () => {
      backupFileInput.click();
    });

    backupDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      backupDropzone.classList.add("border-indigo-500", "bg-indigo-50/50");
    });

    backupDropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      backupDropzone.classList.remove("border-indigo-500", "bg-indigo-50/50");
    });

    backupDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      backupDropzone.classList.remove("border-indigo-500", "bg-indigo-50/50");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleBackupFile(e.dataTransfer.files[0]);
      }
    });
  }

  const backupResetFactoryBtn = document.getElementById("backupResetFactoryBtn");
  if (backupResetFactoryBtn) {
    backupResetFactoryBtn.addEventListener("click", () => {
      showCustomModal(
        "Khôi phục cài đặt gốc",
        "Bạn có chắc chắn muốn khôi phục về cài đặt gốc? Toàn bộ lời phê tùy chỉnh hiện tại sẽ được thay thế bằng mẫu chuẩn ban đầu của tác giả.",
        false,
        (isConfirmed) => {
          if (isConfirmed) {
            try {
              currentData = generateAllSampleData();
              ensureMigrationFlags(currentData);
              saveToStorage();
              updatePlatformUI();
              updateTabsUI();
              updateDropdowns();
              renderData();
              updateBackupStatsUI();
              showCustomModal("Thành công", "Đã khôi phục cài đặt gốc thành công!", true);
              if (typeof showToast === "function") {
                showToast("Đã khôi phục cài đặt gốc", "Toàn bộ lời phê đã trở về mặc định.", "info", 4000);
              }
            } catch (e) {
              console.error("Error resetting data:", e);
              showCustomModal("Lỗi", "Có lỗi xảy ra khi khôi phục: " + e.message, true);
            }
          }
        }
      );
    });
  }

  // Excel Export Template
  const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener("click", () => {
      const wb = XLSX.utils.book_new();
      const headers = [
        "Cấp Học",
        "Khối Lớp",
        "Vai Trò",
        "Môn Học",
        "Mức Độ",
        "Điểm Từ",
        "Điểm Đến",
        "Mã NX",
        "Lời Phê",
      ];
      
      const sortMapLevels = (subData) => {
        return Object.keys(subData).sort((a, b) => {
          const itemA = subData[a];
          const itemB = subData[b];
          const maxA = itemA.max !== undefined && itemA.max !== "" ? Number(itemA.max) : -1;
          const maxB = itemB.max !== undefined && itemB.max !== "" ? Number(itemB.max) : -1;
          if (maxA !== maxB) return maxB - maxA;
          const minA = itemA.min !== undefined && itemA.min !== "" ? Number(itemA.min) : -1;
          const minB = itemB.min !== undefined && itemB.min !== "" ? Number(itemB.min) : -1;
          
          if (minA !== minB) return minB - minA;
          // default string compare
          if (a === "Mức độ Tốt") return -1;
          if (b === "Mức độ Tốt") return 1;
          return a.localeCompare(b);
        });
      };

      const capHocs = ["TH", "THCS", "THPT"];
      
      capHocs.forEach(capHoc => {
        const ws_data = [headers];
        
        if (currentData[capHoc]) {
          // Sort khoi numerically
          const khois = Object.keys(currentData[capHoc]).sort((a, b) => parseInt(a) - parseInt(b));
          
          khois.forEach(khoi => {
            const kData = currentData[capHoc][khoi];
            
            // 1. GVBM
            if (kData.GVBM) {
              const sortedMons = Object.keys(kData.GVBM).sort((a, b) => a.localeCompare(b));
              for (const mon of sortedMons) {
                const subData = kData.GVBM[mon];
                const sortedLevels = sortMapLevels(subData);
                for (const lv of sortedLevels) {
                  const item = subData[lv];
                  const commentsStr = (item.comments || []).join("\n");
                  ws_data.push([
                    capHoc, khoi, "GVBM", mon, lv, 
                    item.min !== undefined ? item.min.toString() : "", 
                    item.max !== undefined ? item.max.toString() : "", 
                    item.code || "", 
                    commentsStr
                  ]);
                }
              }
            }
            
            // 2. DGTX
            if (kData.DGTX) {
              const sortedMons = Object.keys(kData.DGTX).sort((a, b) => a.localeCompare(b));
              for (const mon of sortedMons) {
                const subData = kData.DGTX[mon];
                const sortedLevels = sortMapLevels(subData);
                for (const lv of sortedLevels) {
                  const item = subData[lv];
                  const commentsStr = (item.comments || []).join("\n");
                  ws_data.push([
                    capHoc, khoi, "DGTX", mon, lv, 
                    item.min !== undefined ? item.min.toString() : "", 
                    item.max !== undefined ? item.max.toString() : "", 
                    item.code || "", 
                    commentsStr
                  ]);
                }
              }
            }
            
            // 3. TH_NLPC
            if (kData.TH_NLPC) {
              const sortedLevels = sortMapLevels(kData.TH_NLPC);
              for (const lv of sortedLevels) {
                const item = kData.TH_NLPC[lv];
                const commentsStr = (item.comments || []).join("\n");
                ws_data.push([
                  capHoc, khoi, "TH_NLPC", "Năng lực & Phẩm chất", lv, 
                  item.min !== undefined ? item.min.toString() : "", 
                  item.max !== undefined ? item.max.toString() : "", 
                  item.code || "", 
                  commentsStr
                ]);
              }
            }

            // 4. VNEDU_NLPC_HB (exporting first so it shows up before HOC_BA)
            if (kData.VNEDU_NLPC_HB) {
              for (const group in kData.VNEDU_NLPC_HB) {
                for (const itemLbl in kData.VNEDU_NLPC_HB[group]) {
                  const item = kData.VNEDU_NLPC_HB[group][itemLbl];
                  const commentsStr = (item.comments || []).join("\n");
                  ws_data.push([
                    capHoc, khoi, "VNEDU_NLPC_HB", group, itemLbl, 
                    "", "", "", 
                    commentsStr
                  ]);
                }
              }
            }
          });
        }
        
        if (ws_data.length > 1) {
          const ws = XLSX.utils.aoa_to_sheet(ws_data);
          XLSX.utils.book_append_sheet(wb, ws, capHoc);
        }
      });
      
      // Hoc Ba Sheet
      const hb_ws_data = [headers];
      capHocs.forEach(capHoc => {
        if (currentData[capHoc]) {
          const khois = Object.keys(currentData[capHoc]).sort((a, b) => parseInt(a) - parseInt(b));
          
          khois.forEach(khoi => {
            const kData = currentData[capHoc][khoi];
            
            // HOC_BA_GVBM
            if (kData.HOC_BA_GVBM) {
              const sortedLevels = sortMapLevels(kData.HOC_BA_GVBM);
              for (const lv of sortedLevels) {
                const item = kData.HOC_BA_GVBM[lv];
                const commentsStr = (item.comments || []).join("\n");
                hb_ws_data.push([
                  capHoc, khoi, "HOC_BA_GVBM", "", lv, 
                  item.min !== undefined ? item.min.toString() : "0", 
                  item.max !== undefined ? item.max.toString() : "10", 
                  item.code || "", 
                  commentsStr
                ]);
              }
            }

            // HOC_BA_GVCN
            if (kData.HOC_BA_GVCN) {
              const sortedLevels = sortMapLevels(kData.HOC_BA_GVCN);
              for (const lv of sortedLevels) {
                const item = kData.HOC_BA_GVCN[lv];
                const commentsStr = (item.comments || []).join("\n");
                hb_ws_data.push([
                  capHoc, khoi, "HOC_BA_GVCN", "", lv, 
                  item.min !== undefined ? item.min.toString() : "0", 
                  item.max !== undefined ? item.max.toString() : "10", 
                  item.code || "", 
                  commentsStr
                ]);
              }
            }

            // SO_GHI_NHAN_XET
            if (kData.SO_GHI_NHAN_XET) {
              for (const mon of Object.keys(kData.SO_GHI_NHAN_XET)) {
                const subData = kData.SO_GHI_NHAN_XET[mon];
                if (!subData) continue;
                const sortedLevels = sortMapLevels(subData);
                for (const lv of sortedLevels) {
                  const item = subData[lv];
                  const commentsStr = (item.comments || []).join("\n");
                  hb_ws_data.push([
                    capHoc, khoi, "SO_GHI_NHAN_XET", mon, lv, 
                    item.min !== undefined ? item.min.toString() : "0", 
                    item.max !== undefined ? item.max.toString() : "10", 
                    item.code || "", 
                    commentsStr
                  ]);
                }
              }
            }

            // HIEU_TRUONG
            if (kData.HIEU_TRUONG) {
              const sortedLevels = sortMapLevels(kData.HIEU_TRUONG);
              for (const lv of sortedLevels) {
                const item = kData.HIEU_TRUONG[lv];
                const commentsStr = (item.comments || []).join("\n");
                hb_ws_data.push([
                  capHoc, khoi, "HIEU_TRUONG", "", lv, 
                  item.min !== undefined ? item.min.toString() : "0", 
                  item.max !== undefined ? item.max.toString() : "10", 
                  item.code || "", 
                  commentsStr
                ]);
              }
            }
          });
        }
      });
      
      const hb_ws = XLSX.utils.aoa_to_sheet(hb_ws_data);
      XLSX.utils.book_append_sheet(wb, hb_ws, "Học Bạ");

      XLSX.writeFile(wb, "Mau_nhap_lieu.xlsx");
    });
  }

  // Excel Import
  const importCsvBtn = document.getElementById("importCsvBtn");
  const csvFileInput = document.getElementById("csvFileInput");

  if (importCsvBtn && csvFileInput) {
    importCsvBtn.addEventListener("click", () => {
      const file = csvFileInput.files[0];
      if (!file) {
        alert("Vui lòng chọn tệp Excel trước khi tải lên.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          let newData = JSON.parse(JSON.stringify(currentData));
          let hasData = false;

          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (rows.length < 2) return;

            const headers = rows[0].map((h) =>
              (h || "").toString().trim().toLowerCase(),
            );
            const cCapHoc = headers.indexOf("cấp học");
            const cKhoi = headers.indexOf("khối lớp");
            const cVaiTro = headers.indexOf("vai trò");
            const cMon = headers.indexOf("môn học");
            const cMucDo = headers.indexOf("mức độ");
            const cDiemTu = headers.indexOf("điểm từ");
            const cDiemDen = headers.indexOf("điểm đến");
            const cMaNX = headers.indexOf("mã nx");

            let cLoiPhe = headers.indexOf("lời phê");
            if (cLoiPhe === -1) cLoiPhe = headers.indexOf("nội dung"); // fallback

            if (
              cCapHoc === -1 ||
              cKhoi === -1 ||
              cVaiTro === -1 ||
              cLoiPhe === -1
            )
              return;

            hasData = true;

            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length === 0 || !row[cCapHoc]) continue;

              const capHoc = row[cCapHoc].toString().trim();
              const khoiLop = row[cKhoi] ? row[cKhoi].toString().trim() : "";
              const vaiTro = row[cVaiTro] ? row[cVaiTro].toString().trim() : "";
              const monHoc = row[cMon] ? row[cMon].toString().trim() : "";
              const mucDo = row[cMucDo] ? row[cMucDo].toString().trim() : "";

              let diemTu = parseFloat(row[cDiemTu]);
              if (isNaN(diemTu)) diemTu = 0;
              let diemDen = parseFloat(row[cDiemDen]);
              if (isNaN(diemDen)) diemDen = 10;

              const maNX = row[cMaNX] ? row[cMaNX].toString().trim() : "";

              const rawComments = row[cLoiPhe] ? row[cLoiPhe].toString() : "";
              const comments = rawComments
                .split("\n")
                .map((s) => s.trim())
                .filter((x) => x);

              if (!newData[capHoc]) newData[capHoc] = {};
              if (!newData[capHoc][khoiLop])
                newData[capHoc][khoiLop] = {
                  GVBM: {},
                  HOC_BA_GVBM: {},
                  HOC_BA_GVCN: {},
                  SO_GHI_NHAN_XET: {},
                  HIEU_TRUONG: {},
                };
              if (Array.isArray(newData[capHoc][khoiLop].HOC_BA_GVBM))
                newData[capHoc][khoiLop].HOC_BA_GVBM = {};
              if (Array.isArray(newData[capHoc][khoiLop].HOC_BA_GVCN))
                newData[capHoc][khoiLop].HOC_BA_GVCN = {};
              if (!newData[capHoc][khoiLop].HIEU_TRUONG)
                newData[capHoc][khoiLop].HIEU_TRUONG = getEmptyHieuTruong(khoiLop);
              if (capHoc === "TH" && !newData[capHoc][khoiLop].TH_NLPC)
                newData[capHoc][khoiLop].TH_NLPC = getEmptyThNlPc();

              if (vaiTro === "GVBM" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].GVBM[monHoc]) {
                  newData[capHoc][khoiLop].GVBM[monHoc] = {
                    Tốt: { min: 8, max: 10, code: "T", mucDG: "T", comments: [] },
                    Khá: { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: [] },
                    Đạt: { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: [] },
                    "Chưa Đạt": { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: [] },
                  };
                }
                if (!newData[capHoc][khoiLop].GVBM[monHoc][mucDo]) {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }

                if (
                  row[cDiemTu] !== undefined &&
                  row[cDiemTu] !== null &&
                  row[cDiemTu] !== ""
                ) {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo].min = diemTu;
                }
                if (
                  row[cDiemDen] !== undefined &&
                  row[cDiemDen] !== null &&
                  row[cDiemDen] !== ""
                ) {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].GVBM[monHoc][mucDo].code = maNX;
                }

                newData[capHoc][khoiLop].GVBM[monHoc][mucDo].comments =
                  comments;
              } else if (vaiTro === "DGTX" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].DGTX) newData[capHoc][khoiLop].DGTX = {};
                if (!newData[capHoc][khoiLop].DGTX[monHoc]) {
                  newData[capHoc][khoiLop].DGTX[monHoc] = getEmptyDGTX(monHoc, undefined, khoiLop);
                }
                if (!newData[capHoc][khoiLop].DGTX[monHoc][mucDo]) {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }

                if (row[cDiemTu] !== undefined && row[cDiemTu] !== null && row[cDiemTu] !== "") {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo].min = diemTu;
                }
                if (row[cDiemDen] !== undefined && row[cDiemDen] !== null && row[cDiemDen] !== "") {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].DGTX[monHoc][mucDo].code = maNX;
                }

                newData[capHoc][khoiLop].DGTX[monHoc][mucDo].comments = comments;
              } else if (vaiTro === "SO_GHI_NHAN_XET" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].SO_GHI_NHAN_XET[monHoc]) {
                  newData[capHoc][khoiLop].SO_GHI_NHAN_XET[monHoc] = {
                    "Nhận xét chung": { min: 0, max: 10, code: "", comments: [] }
                  };
                }
                
                // For SO_GHI_NHAN_XET we ignore min, max, code and just pool comments
                const existingPool = newData[capHoc][khoiLop].SO_GHI_NHAN_XET[monHoc]["Nhận xét chung"].comments;
                comments.forEach(c => {
                  if (!existingPool.includes(c)) existingPool.push(c);
                });
              } else if (vaiTro === "TH_NLPC" && mucDo) {
                if (!newData[capHoc][khoiLop].TH_NLPC) {
                  newData[capHoc][khoiLop].TH_NLPC = getEmptyThNlPc();
                }
                if (!newData[capHoc][khoiLop].TH_NLPC[mucDo]) {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }

                if (row[cDiemTu] !== undefined && row[cDiemTu] !== null && row[cDiemTu] !== "") {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo].min = diemTu;
                }
                if (row[cDiemDen] !== undefined && row[cDiemDen] !== null && row[cDiemDen] !== "") {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].TH_NLPC[mucDo].code = maNX;
                }

                newData[capHoc][khoiLop].TH_NLPC[mucDo].comments = comments;
              } else if ((vaiTro === "HOC_BA" || vaiTro === "HOC_BA_GVCN" || vaiTro === "HOC_BA_GVBM") && mucDo) {
                // If old HOC_BA, default to GVCN
                const targetVaiTro = vaiTro === "HOC_BA" ? "HOC_BA_GVCN" : vaiTro;
                
                if (!newData[capHoc][khoiLop][targetVaiTro]) {
                  newData[capHoc][khoiLop][targetVaiTro] = {
                    Tốt: { min: 8, max: 10, code: "T", mucDG: "T", comments: [] },
                    Khá: { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: [] },
                    Đạt: { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: [] },
                    "Chưa Đạt": { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: [] },
                  };
                }
                if (!newData[capHoc][khoiLop][targetVaiTro][mucDo]) {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }

                if (
                  row[cDiemTu] !== undefined &&
                  row[cDiemTu] !== null &&
                  row[cDiemTu] !== ""
                ) {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo].min = diemTu;
                }
                if (
                  row[cDiemDen] !== undefined &&
                  row[cDiemDen] !== null &&
                  row[cDiemDen] !== ""
                ) {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop][targetVaiTro][mucDo].code = maNX;
                }

                newData[capHoc][khoiLop][targetVaiTro][mucDo].comments = comments;
              } else if (vaiTro === "HIEU_TRUONG" && mucDo) {
                if (!newData[capHoc][khoiLop].HIEU_TRUONG) {
                  newData[capHoc][khoiLop].HIEU_TRUONG = {
                    Tốt: { min: 8, max: 10, code: "T", mucDG: "T", comments: [] },
                    Khá: { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: [] },
                    Đạt: { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: [] },
                    "Chưa Đạt": { min: 0, max: 4.9, code: "CĐ", mucDG: "C", comments: [] },
                  };
                }
                if (!newData[capHoc][khoiLop].HIEU_TRUONG[mucDo]) {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo] = {
                    min: diemTu,
                    max: diemDen,
                    code: maNX,
                    comments: [],
                  };
                }

                if (
                  row[cDiemTu] !== undefined &&
                  row[cDiemTu] !== null &&
                  row[cDiemTu] !== ""
                ) {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].min = diemTu;
                }
                if (
                  row[cDiemDen] !== undefined &&
                  row[cDiemDen] !== null &&
                  row[cDiemDen] !== ""
                ) {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].max = diemDen;
                }
                if (row[cMaNX] !== undefined && row[cMaNX] !== null) {
                  newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].code = maNX;
                }

                newData[capHoc][khoiLop].HIEU_TRUONG[mucDo].comments = comments;
              } else if (vaiTro === "VNEDU_NLPC_HB" && monHoc && mucDo) {
                if (!newData[capHoc][khoiLop].VNEDU_NLPC_HB) {
                  newData[capHoc][khoiLop].VNEDU_NLPC_HB = {};
                }
                if (!newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc]) {
                  newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc] = {};
                }
                if (!newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc][mucDo]) {
                  newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc][mucDo] = {
                    comments: []
                  };
                }
                newData[capHoc][khoiLop].VNEDU_NLPC_HB[monHoc][mucDo].comments = comments;
              }
            }
          });

          if (!hasData) {
            alert(
              "Định dạng cột ở các sheet không chính xác hoặc không có dữ liệu hợp lệ. Vui lòng tải 'File Mẫu' để xem chuẩn cấu trúc.",
            );
            return;
          }

          currentData = newData;
          saveToStorage();
          updateDropdowns();
          renderData();
          alert("Nhập liệu Excel thành công!");
          csvFileInput.value = "";
        } catch (err) {
          console.error(err);
          alert("Lỗi khi đọc file Excel: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Event listeners for comment lists
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-comment-btn");
    if (addBtn) {
      const level = addBtn.dataset.level;
      const list = addBtn.previousElementSibling;
      const row = document.createElement("div");
      row.className = "flex gap-2 items-start comment-row";
      row.innerHTML = `
        <textarea rows="2" class="comment-input-${level.replace(/ /g, '_')} flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-sans leading-relaxed transition-colors placeholder:text-slate-400 custom-scroll min-h-[40px]" placeholder="Nhập lời nhận xét..."></textarea>
        <button type="button" class="delete-comment-btn p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0 mt-1" title="Xóa">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
        </button>
      `;
      list.appendChild(row);
      const newTextarea = row.querySelector("textarea");
      if (newTextarea) newTextarea.focus();
      updateCommentCount(level);
    }

    const delBtn = e.target.closest(".delete-comment-btn");
    if (delBtn) {
      const row = delBtn.closest(".comment-row");
      const textarea = row.querySelector("textarea");
      let levelMatch = "";
      if (textarea && textarea.className.match(/comment-input-([^ ]+)/)) {
        levelMatch = textarea.className.match(/comment-input-([^ ]+)/)[1].replace(/_/g, ' ');
      }
      row.remove();
      if (levelMatch) {
         updateCommentCount(levelMatch);
      }
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'textarea' && e.target.className.includes("comment-input-")) {
      const match = e.target.className.match(/comment-input-([^ ]+)/);
      if (match) {
        updateCommentCount(match[1].replace(/_/g, ' '));
      }
    }
  });

});

function updateCommentCount(levelStr) {
  const levelId = levelStr.replace(/ /g, '_');
  const badge = document.getElementById(`count_badge_${levelId}`);
  if (badge) {
    const inputs = Array.from(document.querySelectorAll(`.comment-input-${levelId}`));
    const count = inputs.map(i => i.value.trim()).filter(s => s.length > 0).length;
    badge.textContent = count + " lời nhận xét";
  }
}

function getMonHocKey() {
  if ((currentCapHoc === "THCS" || currentCapHoc === "THPT") && (currentRole === "GVBM" || currentRole === "SO_GHI_NHAN_XET")) {
    return `${currentMonHoc}_${currentHocKy}`;
  }
  if (currentCapHoc === "TH" && currentRole === "GVBM" && currentHocKy) {
    return `${currentMonHoc}_${currentHocKy}`;
  }
  return currentMonHoc;
}

  function ensureDataStructure() {
  let modified = false;
  if (!currentData[currentCapHoc]) {
    currentData[currentCapHoc] = {};
    modified = true;
  }
  if (!currentData[currentCapHoc][currentKhoiLop]) {
    currentData[currentCapHoc][currentKhoiLop] = {
      GVBM: {},
      DGTX: {},
      SO_GHI_NHAN_XET: {},
      HOC_BA_GVBM: getEmptyHocBaGVBM(),
      HOC_BA_GVCN: getEmptyHocBaGVCN(),
      HIEU_TRUONG: getEmptyHieuTruong(currentKhoiLop),
    };
    if (currentCapHoc === "TH") {
      currentData[currentCapHoc][currentKhoiLop].TH_NLPC = getEmptyThNlPc();
    }
    modified = true;
  }
  const kData = currentData[currentCapHoc][currentKhoiLop];
  if (currentCapHoc === "TH" && !kData.TH_NLPC) {
    kData.TH_NLPC = getEmptyThNlPc();
    modified = true;
  }
  if (currentCapHoc === "TH" && !kData.VNEDU_NLPC_HB) {
    kData.VNEDU_NLPC_HB = getEmptyVneduNlpcHb(currentKhoiLop);
    modified = true;
  }
  if (!kData.DGTX) {
    kData.DGTX = {};
    modified = true;
  }
  if (!kData.HIEU_TRUONG) {
    kData.HIEU_TRUONG = getEmptyHieuTruong(currentKhoiLop);
    modified = true;
  }
  const checkKey = currentCapHoc === "TH" ? "Tiếng Việt" : "Ngữ văn_Học kỳ 1";
  if (!kData.SO_GHI_NHAN_XET || !kData.SO_GHI_NHAN_XET[checkKey] || !kData.SO_GHI_NHAN_XET[checkKey]["Nhận xét chung"]) {
    kData.SO_GHI_NHAN_XET = {};
    const subjects = getSubjects(currentCapHoc, currentKhoiLop);
    for (const mon of subjects) {
      if (currentCapHoc === "THCS" || currentCapHoc === "THPT") {
        kData.SO_GHI_NHAN_XET[`${mon}_Học kỳ 1`] = getEmptySoGhiNhanXet(mon, currentCapHoc, "Học kỳ 1");
        kData.SO_GHI_NHAN_XET[`${mon}_Học kỳ 2`] = getEmptySoGhiNhanXet(mon, currentCapHoc, "Học kỳ 2");
        kData.SO_GHI_NHAN_XET[`${mon}_Cả năm`] = getEmptySoGhiNhanXet(mon, currentCapHoc, "Cả năm");
      } else {
        kData.SO_GHI_NHAN_XET[mon] = getEmptySoGhiNhanXet(mon, currentCapHoc);
      }
    }
    modified = true;
  }
  if (Array.isArray(kData.HOC_BA_GVCN) || (kData.HOC_BA_GVCN && kData.HOC_BA_GVCN["Tốt"])) {
    // Migrate to single category "Nhận xét chung"
    const oldData = kData.HOC_BA_GVCN;
    let allComments = [];
    if (Array.isArray(oldData)) {
      allComments = oldData;
    } else {
      for (const key in oldData) {
        if (oldData[key] && oldData[key].comments) {
          allComments = allComments.concat(oldData[key].comments);
        }
      }
    }
    kData.HOC_BA_GVCN = {
      "Nhận xét chung": { min: 0, max: 10, code: "", comments: allComments.length > 0 ? allComments : getEmptyHocBaGVCN()["Nhận xét chung"].comments }
    };
    modified = true;
  }
  if (currentRole === "SO_GHI_NHAN_XET") {
    const mhKey = getMonHocKey();
    if (!kData.SO_GHI_NHAN_XET[mhKey] || !kData.SO_GHI_NHAN_XET[mhKey]["Nhận xét chung"]) {
      if (currentCapHoc === "THCS" || currentCapHoc === "THPT") {
        kData.SO_GHI_NHAN_XET[`${currentMonHoc}_Học kỳ 1`] = getEmptySoGhiNhanXet(currentMonHoc, currentCapHoc, "Học kỳ 1");
        kData.SO_GHI_NHAN_XET[`${currentMonHoc}_Học kỳ 2`] = getEmptySoGhiNhanXet(currentMonHoc, currentCapHoc, "Học kỳ 2");
        kData.SO_GHI_NHAN_XET[`${currentMonHoc}_Cả năm`] = getEmptySoGhiNhanXet(currentMonHoc, currentCapHoc, "Cả năm");
      } else {
        kData.SO_GHI_NHAN_XET[currentMonHoc] = getEmptySoGhiNhanXet(currentMonHoc, currentCapHoc);
      }
      modified = true;
    }
  }
  if (currentRole === "GVBM") {
    const mhKey = getMonHocKey();
    if (
      !kData.GVBM[mhKey] ||
      Object.keys(kData.GVBM[mhKey]).length === 0
    ) {
      const platformRadios = document.getElementsByName("configPlatform");
      let isVnedu = false;
      for (const radio of platformRadios) {
        if (radio.checked) {
          isVnedu = radio.value === "vnedu";
          break;
        }
      }
      if (isVnedu) {
        kData.GVBM[mhKey] = getEmptySubject(currentMonHoc, currentCapHoc, currentHocKy);
      } else {
        kData.GVBM[mhKey] = getEmptySubject(currentMonHoc, null, currentHocKy);
      }
      modified = true;
    } else {
      // Ensure T, H, C exists for VnEdu if missing, cloned from Tốt, Khá, Chưa Đạt
      const subjData = kData.GVBM[mhKey];
      if (!subjData["T"] && subjData["Tốt"]) {
        subjData["T"] = JSON.parse(JSON.stringify(subjData["Tốt"]));
        subjData["T"].code = "T";
        subjData["T"].mucDG = "T";
        modified = true;
      }
      if (!subjData["H"] && subjData["Khá"]) {
        subjData["H"] = JSON.parse(JSON.stringify(subjData["Khá"]));
        subjData["H"].code = "H";
        subjData["H"].mucDG = "H";
        modified = true;
      }
      if (!subjData["C"] && subjData["Chưa Đạt"]) {
        subjData["C"] = JSON.parse(JSON.stringify(subjData["Chưa Đạt"]));
        subjData["C"].code = "C";
        subjData["C"].mucDG = "C";
        modified = true;
      }
    }
  }
  if (currentRole === "DGTX") {
    // dynamically import from shared if not exists
    const mainKey = currentCapHoc === "TH" ? `${currentMonHoc}_${currentTieuChi}` : currentMonHoc;
    const dgtxKey = `${mainKey}_Thang${currentThang}`;
    if (!kData.DGTX[dgtxKey] || Object.keys(kData.DGTX[dgtxKey]).length === 0 || kData.DGTX[dgtxKey]["Chung"]) {
      kData.DGTX[dgtxKey] = getEmptyDGTX(mainKey, currentThang, currentKhoiLop);
      modified = true;
    }
  }
  if (currentRole === "TH_NLPC") {
    if (!kData.TH_NLPC) {
      kData.TH_NLPC = getEmptyThNlPc();
      modified = true;
    }
  }
  if (modified) {
    saveToStorage();
  }
}

function saveToStorage() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ commentsData: currentData });
  }
}

function renderData() {
  const container = document.getElementById("configContainer");
  container.innerHTML = "";

  ensureDataStructure();

  if (currentRole === "HIEU_TRUONG") {
    let titlePrefix = `<span class="text-blue-600">Danh sách Mẫu Phê duyệt Hiệu trưởng</span>`;
    const mainTitle = document.getElementById("main-header-title");
    if (mainTitle) mainTitle.innerHTML = titlePrefix;

    const allGrades = [
      {cap: "TH", khoi: "1"}, {cap: "TH", khoi: "2"}, {cap: "TH", khoi: "3"}, {cap: "TH", khoi: "4"}, {cap: "TH", khoi: "5"},
      {cap: "THCS", khoi: "6"}, {cap: "THCS", khoi: "7"}, {cap: "THCS", khoi: "8"}, {cap: "THCS", khoi: "9"},
      {cap: "THPT", khoi: "10"}, {cap: "THPT", khoi: "11"}, {cap: "THPT", khoi: "12"}
    ];

    let html = `
      <div class="col-span-full mb-4 p-4 text-sm rounded-xl border bg-blue-50 text-blue-800 border-blue-200">
        <b>Hướng dẫn:</b> Cấu hình mẫu phê duyệt chung cho tất cả các Khối lớp. <br/><br/>- Mỗi khối có một ô riêng. <br/>- Mỗi dòng văn bản là 1 lời nhận xét độc lập (bấm Enter để tách dòng, phần mềm tự động xuống dòng không tính).<br/>- Khi nhấn phê duyệt học bạ, công cụ sẽ lấy ngẫu nhiên 1 lời phê ở khối lớp đang được chọn để điền vào cho học sinh.
      </div>
      <div class="flex flex-col gap-4 w-full pb-8">
    `;

    allGrades.forEach(grade => {
      let htData = currentData[grade.cap][grade.khoi].HIEU_TRUONG || {};
      let item = htData["Nhận xét chung"] || { comments: [] };
      let textVal = (item.comments || []).join('\n');
      html += `
        <div class="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row min-h-[100px]">
            <div class="bg-slate-100 border-b sm:border-b-0 sm:border-r border-slate-200 px-4 py-3 font-bold text-slate-700 flex flex-row sm:flex-col justify-between sm:justify-center items-center w-full sm:w-[140px] shrink-0">
              <span class="text-base mb-0 sm:mb-2 text-blue-800">Khối ${grade.khoi}</span>
              <span class="text-[10px] font-bold uppercase bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-slate-500 shadow-sm">${grade.cap}</span>
            </div>
            <div class="p-3 flex-1 flex flex-col">
              <textarea id="hieu_truong_${grade.cap}_${grade.khoi}" class="w-full flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[13.5px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all custom-scroll resize-y font-sans leading-relaxed tracking-wide placeholder:text-slate-400 min-h-[70px]" placeholder="Nhập lời phê... (Mỗi dòng là 1 mẫu)">${textVal}</textarea>
            </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;
    return;
  }

  if (currentRole === "VNEDU_NLPC_HB") {
    container.className = "grid grid-cols-1 gap-6 mt-4";
    let titlePrefix = `<span class="text-blue-600">Phẩm chất - Năng lực ghi học bạ (VnEdu)</span> (<span class="text-green-600">Khối ${currentKhoiLop}</span>)`;
    const mainTitle = document.getElementById("main-header-title");
    if (mainTitle) mainTitle.innerHTML = titlePrefix;

    const data = currentData[currentCapHoc][currentKhoiLop].VNEDU_NLPC_HB || getEmptyVneduNlpcHb(currentKhoiLop);

    const nlChungItems = ["Nhận xét chung", "Tự chủ và tự học", "Giao tiếp và hợp tác", "GQVĐ và sáng tạo"];
    let nlDacThuItems = ["Nhận xét năng lực đặc thù", "Ngôn ngữ", "Tính toán", "Khoa học", "Thẩm mĩ", "Thể chất"];
    const pcItems = ["Nhận xét chung", "Yêu nước", "Nhân ái", "Chăm chỉ", "Trung thực", "Trách nhiệm"];

    if (["3", "4", "5"].includes(currentKhoiLop)) {
        nlDacThuItems.splice(4, 0, "Công nghệ", "Tin học");
    }

    const renderTextarea = (groupId, itemLabel, colorClass) => {
       const groupData = data[groupId] || {};
       const itemData = groupData[itemLabel] || {comments: []};
       const comments = itemData.comments.length > 0 ? itemData.comments : [""];
       const validCount = itemData.comments.filter(c => c.trim().length > 0).length;
       
       const commentsHtml = comments.map(c => `
         <div class="flex gap-2 items-start comment-row">
           <textarea rows="2" class="comment-input-vnedu_${groupId.replace(/ /g, '_')}_${itemLabel.replace(/ /g, '_')} flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-${colorClass}-500 focus:ring-1 focus:ring-${colorClass}-500 transition-all custom-scroll resize-y font-sans leading-relaxed placeholder:text-slate-400 min-h-[40px]">${c}</textarea>
           <button type="button" class="delete-comment-btn p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0 mt-1" title="Xóa">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
           </button>
         </div>
       `).join("");

       return `
          <div class="vnedu-nlpc-item border border-slate-100 bg-white rounded-lg p-3 shadow-sm">
             <div class="flex justify-between items-center mb-3">
                 <label class="block text-[13px] font-bold text-${colorClass}-600">${itemLabel}:</label>
                 <span id="count_badge_vnedu_${groupId.replace(/ /g, '_')}_${itemLabel.replace(/ /g, '_')}" class="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-red-600 shadow-sm">${validCount} lời nhận xét</span>
             </div>
             <div class="comments-list flex flex-col gap-2">
                 ${commentsHtml}
             </div>
             <button type="button" class="add-comment-btn mt-3 text-sm text-${colorClass}-600 font-medium hover:underline flex items-center gap-1" data-level="vnedu_${groupId.replace(/ /g, '_')}_${itemLabel.replace(/ /g, '_')}">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                 Thêm nhận xét
             </button>
          </div>
       `;
    };

    let html = `
      <div class="col-span-full mb-4 p-4 text-sm rounded-xl border bg-blue-50 text-blue-800 border-blue-200">
        <b>Hướng dẫn:</b><br/>- Mỗi dòng văn bản là 1 lời nhận xét độc lập (bấm Enter để tách dòng).<br/>- Công cụ sẽ lấy ngẫu nhiên 1 lời phê ở mỗi ô để điền vào hệ thống.
      </div>
      <div class="flex flex-col gap-6 w-full pb-8">
        
        <!-- NĂNG LỰC CHUNG -->
        <div class="flex flex-col gap-4">
          <div class="bg-blue-50/50 border text-sm border-blue-100 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
            <div class="bg-blue-100/50 border-b border-blue-100 px-4 py-3 font-bold text-blue-800 text-center uppercase tracking-wide">
              1. NĂNG LỰC CHUNG
            </div>
            <div class="p-4 grid grid-cols-1 gap-4">
               ${nlChungItems.map(item => renderTextarea("Năng lực chung", item, "blue")).join("")}
            </div>
          </div>
        </div>

        <!-- NĂNG LỰC ĐẶC THÙ -->
        <div class="flex flex-col gap-4">
          <div class="bg-indigo-50/50 border text-sm border-indigo-100 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
            <div class="bg-indigo-100/50 border-b border-indigo-100 px-4 py-3 font-bold text-indigo-800 text-center uppercase tracking-wide">
              1.2 NĂNG LỰC ĐẶC THÙ
            </div>
            <div class="p-4 grid grid-cols-1 gap-4">
               ${nlDacThuItems.map(item => renderTextarea("Năng lực đặc thù", item, "indigo")).join("")}
            </div>
          </div>
        </div>

        <!-- PHẨM CHẤT -->
        <div class="flex flex-col gap-4 md:col-span-2 xl:col-span-1">
          <div class="bg-green-50/50 border text-sm border-green-100 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
            <div class="bg-green-100/50 border-b border-green-100 px-4 py-3 font-bold text-green-800 text-center uppercase tracking-wide">
              2. PHẨM CHẤT
            </div>
            <div class="p-4 grid grid-cols-1 gap-4">
               ${pcItems.map(item => renderTextarea("Phẩm chất", item, "green")).join("")}
            </div>
          </div>
        </div>

      </div>
    `;

    container.className = "flex flex-col w-full gap-4 mt-4";
    container.innerHTML = html;
    return;
  }

  let titlePrefix = `<span class="text-blue-600">Danh sách Lời nhận xét môn</span> <span class="text-green-600">${currentMonHoc}</span>`;
  if (currentRole === "DGTX")
    titlePrefix = `<span class="text-blue-600">Đánh giá thường xuyên</span> - <span class="text-green-600">${currentMonHoc}</span>`;
  if (currentRole === "TH_NLPC")
    titlePrefix = `<span class="text-blue-600">Đánh giá định kỳ NL & PC</span> - <span class="text-green-600">${currentMonHoc}</span>`;
  if (currentRole === "HOC_BA_GVBM")
    titlePrefix = `<span class="text-blue-600">Danh sách Mẫu Học bạ - GVBM</span> (<span class="text-green-600">${currentCapHoc} - Khối ${currentKhoiLop}</span>)`;
  if (currentRole === "HOC_BA_GVCN")
    titlePrefix = `<span class="text-blue-600">Danh sách Mẫu Học bạ - GVCN</span> (<span class="text-green-600">${currentCapHoc} - Khối ${currentKhoiLop}</span>)`;
  if (currentRole === "SO_GHI_NHAN_XET")
    titlePrefix = `<span class="text-blue-600">Danh sách Mẫu Sổ ghi nhận xét (Smas)</span> (<span class="text-green-600">${currentCapHoc} - Khối ${currentKhoiLop}</span>)`;
  if (currentRole === "HIEU_TRUONG")
    titlePrefix = `<span class="text-blue-600">Danh sách Mẫu Phê duyệt Hiệu trưởng</span> (<span class="text-green-600">${currentCapHoc} - Khối ${currentKhoiLop}</span>)`;

  const platformRadios = document.getElementsByName("configPlatform");
  let isVnedu = false;
  for (const radio of platformRadios) {
    if (radio.checked) {
      isVnedu = radio.value === "vnedu";
      break;
    }
  }

  const isNlPcMode = currentRole === "TH_NLPC";
  const isDgtxMode = currentRole === "DGTX";
  let levels = getEvalLevels(currentCapHoc, isNlPcMode, isDgtxMode, isVnedu, currentMonHoc);
  
  if (currentRole === "HOC_BA_GVCN") {
    // For HOC_BA_GVCN, we only have one category "Nhận xét chung"
    levels = ["Nhận xét chung"];
  } else if (currentRole === "SO_GHI_NHAN_XET" && currentCapHoc === "TH") {
    levels = ["Nhận xét chung", "Giữa học kỳ 1", "Cuối học kỳ 1", "Giữa học kỳ 2", "Cuối năm học"];
  }

  levels.forEach((l) => {
    let targetData;
    if (currentRole === "GVBM") {
      const mhKey = getMonHocKey();
      targetData =
        currentData[currentCapHoc][currentKhoiLop].GVBM[mhKey] || {};
    } else if (currentRole === "TH_NLPC") {
      targetData = currentData[currentCapHoc][currentKhoiLop].TH_NLPC || {};
    } else if (currentRole === "DGTX") {
      const mainKey = currentCapHoc === "TH" ? `${currentMonHoc}_${currentTieuChi}` : currentMonHoc;
      const dgtxKey = `${mainKey}_Thang${currentThang}`;
      targetData = currentData[currentCapHoc][currentKhoiLop].DGTX[dgtxKey] || {};
    } else if (currentRole === "HIEU_TRUONG") {
      targetData = currentData[currentCapHoc][currentKhoiLop].HIEU_TRUONG || {};
    } else if (currentRole === "HOC_BA_GVBM") {
      targetData = currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVBM || {};
    } else if (currentRole === "SO_GHI_NHAN_XET") {
      const mhKey = getMonHocKey();
      targetData = currentData[currentCapHoc][currentKhoiLop].SO_GHI_NHAN_XET[mhKey] || {};
    } else {
      targetData = currentData[currentCapHoc][currentKhoiLop].HOC_BA_GVCN || {};
    }
    const item = targetData[l] || { min: 0, max: 10, code: "", comments: [] };

    const isPassFail = isPassFailSubject(currentCapHoc, currentMonHoc);
    const hideScores = currentRole === "HOC_BA_GVCN" || (currentRole === "SO_GHI_NHAN_XET" && currentCapHoc === "TH") || isPassFail;
    const hideMinMax = currentRole === "TH_NLPC" || currentRole === "DGTX";
    const hideCode = currentRole === "SO_GHI_NHAN_XET";
    const showMucDG = (currentCapHoc === "TH" && currentRole === "GVBM") || currentRole === "TH_NLPC" || (currentRole === "SO_GHI_NHAN_XET" && currentCapHoc === "TH");
    const validCount = (item.comments && item.comments.length > 0 ? item.comments : [""]).filter(c => c.trim().length > 0).length;

    let gridColsClass = "grid-cols-3";
    if (showMucDG) {
      gridColsClass = hideMinMax ? (hideCode ? 'grid-cols-1' : 'grid-cols-2') : (hideCode ? 'grid-cols-3' : 'grid-cols-4');
    } else {
      gridColsClass = hideCode ? 'grid-cols-2' : 'grid-cols-3';
    }

    if (isVnedu) {
        if (gridColsClass === "grid-cols-4") gridColsClass = "grid-cols-3";
        else if (gridColsClass === "grid-cols-3") gridColsClass = "grid-cols-2";
        else if (gridColsClass === "grid-cols-2") gridColsClass = "grid-cols-1";
    }

    let style = "bg-stone-50 border-stone-200 text-stone-700";
    if (l === "Tốt" || l === "Giỏi" || l === "Hoàn thành Tốt" || l === "T")
      style = "bg-green-50 border-green-200 text-green-700";
    if (l === "Khá" || l === "Hoàn thành" || l === "Đạt" || l === "H") style = "bg-blue-50 border-blue-200 text-blue-700";
    if (l === "Chưa Đạt" || l === "Chưa hoàn thành" || l === "Cần cố gắng" || l === "C") style = "bg-red-50 border-red-200 text-red-700";

    container.innerHTML += `
      <div class="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div class="${style} px-5 py-3 border-b flex items-center gap-4">
              <span class="px-2.5 py-1 bg-white/50 mix-blend-multiply border border-black/5 rounded-md shadow-sm font-bold uppercase tracking-widest text-[#2f3542] text-xs">${l}</span>
              ${hideScores || currentRole === "DGTX" ? "" : `<span class="text-sm font-medium">Điểm: ${item.min} - ${item.max}</span>`}
              <div class="ml-auto">
                 <span id="count_badge_${l.replace(/ /g, '_')}" class="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-red-600 shadow-sm">${validCount} lời nhận xét</span>
              </div>
          </div>
          
          <div class="p-5 flex flex-col gap-5">
              <div class="grid ${gridColsClass} gap-4" ${hideScores ? 'style="display: none;"' : ""}>
                  <div ${hideMinMax ? 'style="display:none;"' : ''}>
                      <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Điểm TT</label>
                      <input type="number" step="0.1" id="min_${l}" value="${item.min}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono">
                  </div>
                  <div ${hideMinMax ? 'style="display:none;"' : ''}>
                      <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Điểm TĐ</label>
                      <input type="number" step="0.1" id="max_${l}" value="${item.max}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono">
                  </div>
                  ${showMucDG ? `
                  <div>
                      <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2" title="Mức độ đánh giá bằng Chữ (VD: T, Đ, C)">Mức Đánh Giá</label>
                      <input type="text" id="mucDG_${l}" value="${item.mucDG || ""}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-sans font-medium uppercase" placeholder="T/Đ/C">
                  </div>` : ""}
                  <div ${isVnedu || hideCode ? 'style="display:none;"' : ''}>
                      <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mã NX</label>
                      <input type="text" id="code_${l}" value="${item.code || ""}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-sans font-medium">
                  </div>
              </div>

              ${hideScores ? `<div class="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-xs italic">Mục này tự động lấy ngẫu nhiên lời phê mẫu để điền. Không cần cấu hình điểm.</div>` : ""}
              
              <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ngân hàng Lời nhận xét</label>
                  <div class="comments-list flex flex-col gap-2">
                     ${(item.comments && item.comments.length > 0 ? item.comments : [""]).map((c) => `
                        <div class="flex gap-2 items-start comment-row">
                          <textarea rows="2" class="comment-input-${l.replace(/ /g, '_')} flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-sans leading-relaxed transition-colors placeholder:text-slate-400 custom-scroll min-h-[40px]" placeholder="Nhập lời nhận xét...">${c}</textarea>
                          <button type="button" class="delete-comment-btn p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0 mt-1" title="Xóa">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                          </button>
                        </div>
                     `).join("")}
                  </div>
                  <button type="button" class="add-comment-btn mt-3 text-sm text-blue-600 font-medium hover:underline flex items-center gap-1" data-level="${l}">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                     Thêm nhận xét
                  </button>
              </div>
          </div>
      </div>
    `;
  });
  if (currentRole === "HOC_BA_GVCN") {
    container.className = "grid grid-cols-1 gap-6 mt-4";
  } else {
    container.className = "grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4";
  }

  // optionally prepend the title block
  const titleDiv = document.createElement("div");
  titleDiv.className =
    (currentRole === "HOC_BA_GVCN" ? "" : "xl:col-span-2 ") + "bg-white border border-slate-200 p-4 rounded-xl shadow-sm font-bold text-slate-800 tracking-wide";
  titleDiv.innerHTML = titlePrefix;
  container.insertBefore(titleDiv, container.firstChild);
}

// ================= OPTIONS UPDATE MANAGER =================
function isVersionNewer(latest, current) {
  if (!latest || !current) return false;
  if (latest === current) return false;
  const p1 = String(latest).replace(/[^\d.]/g, '').split('.').map(x => parseInt(x, 10) || 0);
  const p2 = String(current).replace(/[^\d.]/g, '').split('.').map(x => parseInt(x, 10) || 0);

  // If format is DD.MM.YYYY (e.g. 21.09.2026 or 21.9.2026)
  if (p1.length === 3 && p2.length === 3 && (p1[2] >= 2000 || p2[2] >= 2000)) {
    if (p1[2] !== p2[2]) return p1[2] > p2[2];
    if (p1[1] !== p2[1]) return p1[1] > p2[1];
    return p1[0] > p2[0];
  }

  const max = Math.max(p1.length, p2.length);
  for (let i = 0; i < max; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

function downloadZipFile(downloadUrl) {
  let url = downloadUrl;
  if (!url || url.startsWith("/")) {
    const origin = (typeof window !== "undefined" && window.location && window.location.origin && !window.location.origin.includes("chrome-extension://")) 
      ? window.location.origin 
      : "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app";
    url = `${origin}/nhan-xet-diem-v28.09.2026.zip?t=${Date.now()}`;
  }

  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.download = "nhan-xet-diem-v28.09.2026.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function initOptionsUpdateManager() {
  const sidebarVersion = document.getElementById("options-sidebar-version");
  const sidebarBadge = document.getElementById("options-sidebar-badge");
  const topBanner = document.getElementById("options-top-update-banner");
  const bannerTag = document.getElementById("banner-version-tag");
  const bannerDesc = document.getElementById("banner-version-desc");
  const bannerBtn = document.getElementById("banner-download-btn");
  const statusBadge = document.getElementById("update-status-badge");
  const currentInstalled = document.getElementById("current-installed-version");
  const latestServer = document.getElementById("latest-server-version");
  const latestRelease = document.getElementById("latest-release-date");
  const changelogEl = document.getElementById("update-changelog-content");
  const fullDlBtn = document.getElementById("full-download-update-btn");
  const recheckBtn = document.getElementById("check-update-again-btn");
  if (fullDlBtn) {
    fullDlBtn.onclick = () => downloadZipFile("/api/download-extension");
  }
  const checkIcon = document.getElementById("check-update-icon");
  const checkSpinner = document.getElementById("check-update-spinner");
  const checkBtnLabel = document.getElementById("check-update-btn-label");

  // Toast elements
  const toastContainer = document.getElementById("options-toast");
  const toastTitle = document.getElementById("options-toast-title");
  const toastDesc = document.getElementById("options-toast-desc");
  const toastIcon = document.getElementById("options-toast-icon");
  const toastClose = document.getElementById("options-toast-close");
  let toastTimeout = null;

  function showToast(title, desc, type = "info", duration = 4000) {
    if (!toastContainer) return;
    if (toastTimeout) clearTimeout(toastTimeout);

    if (toastTitle) toastTitle.innerText = title;
    if (toastDesc) toastDesc.innerText = desc;

    if (toastIcon) {
      if (type === "success") {
        toastIcon.className = "w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5";
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
      } else if (type === "warning") {
        toastIcon.className = "w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5";
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
      } else if (type === "error") {
        toastIcon.className = "w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5";
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
      } else {
        toastIcon.className = "w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5";
        toastIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
      }
    }

    toastContainer.classList.remove("hidden");
    requestAnimationFrame(() => {
      toastContainer.classList.remove("translate-y-2", "opacity-0");
      toastContainer.classList.add("translate-y-0", "opacity-100");
    });

    if (duration > 0) {
      toastTimeout = setTimeout(() => {
        hideToast();
      }, duration);
    }
  }

  function hideToast() {
    if (!toastContainer) return;
    toastContainer.classList.remove("translate-y-0", "opacity-100");
    toastContainer.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => {
      toastContainer.classList.add("hidden");
    }, 300);
  }

  if (toastClose) {
    toastClose.onclick = () => hideToast();
  }

  let currentVer = "28.9.2026";
  let currentVerName = "28.09.2026";
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    currentVer = manifest.version || currentVer;
    currentVerName = manifest.version_name || currentVer;
  }

  if (sidebarVersion) sidebarVersion.innerText = `Version ${currentVerName}`;
  if (currentInstalled) currentInstalled.innerText = `v${currentVerName}`;

  async function checkServerUpdate(isManual = false) {
    let hasCleanedUp = false;
    const cleanupUI = () => {
      if (hasCleanedUp) return;
      hasCleanedUp = true;
      if (checkSpinner) checkSpinner.classList.add("hidden");
      if (checkIcon) checkIcon.classList.remove("hidden");
      if (checkBtnLabel) checkBtnLabel.innerText = "Kiểm tra cập nhật";
      if (recheckBtn) {
        recheckBtn.style.pointerEvents = "auto";
        recheckBtn.style.opacity = "1";
      }
    };

    // Failsafe watchdog timer: will ALWAYS restore button after at most 2.5 seconds
    let watchdogTimer = null;

    if (isManual) {
      if (checkSpinner) checkSpinner.classList.remove("hidden");
      if (checkIcon) checkIcon.classList.add("hidden");
      if (checkBtnLabel) checkBtnLabel.innerText = "Đang kiểm tra...";
      if (recheckBtn) {
        recheckBtn.style.pointerEvents = "none";
        recheckBtn.style.opacity = "0.75";
      }

      watchdogTimer = setTimeout(() => {
        if (!hasCleanedUp) {
          console.warn("[UpdateCheck] Watchdog timer triggered after 2.5s");
          cleanupUI();
          showToast(
            "Phiên bản mới nhất!",
            `Bạn đang sử dụng phiên bản v${currentVerName}. Hệ thống hoạt động bình thường.`,
            "success",
            3500
          );
        }
      }, 2500);
    }

    const startTime = Date.now();
    let updateData = null;

    try {
      // 1. Direct API fetch with known Cloud endpoints
      const apiEndpoints = [
        (typeof window !== "undefined" && window.location && window.location.origin && !window.location.origin.includes("chrome-extension://")) ? `${window.location.origin}/api/version` : null,
        "https://ais-pre-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/version",
        "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/version"
      ].filter(Boolean);

      for (const endpointUrl of apiEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(`${endpointUrl}?t=${Date.now()}`, { signal: controller.signal, cache: "no-store" });
          clearTimeout(timeoutId);
          const ct = res.headers.get("content-type") || "";
          if (res.ok && ct.includes("application/json")) {
            const json = await res.json();
            if (json && (json.version || json.versionName)) {
              updateData = json;
              break;
            }
          }
        } catch (e) {}
      }

      // 2. Fast check via Chrome runtime background
      if (!updateData || !updateData.version) {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          try {
            const bgPromise = new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "checkExtensionUpdate" }, (res) => {
                if (chrome.runtime.lastError) resolve(null);
                else resolve(res);
              });
            });
            const bgTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
            const bgRes = await Promise.race([bgPromise, bgTimeout]);

            if (bgRes && (bgRes.latestVer || bgRes.version)) {
              updateData = {
                version: bgRes.latestVer || bgRes.version,
                versionName: bgRes.latestVerName || bgRes.versionName || bgRes.latestVer || bgRes.version,
                releaseDate: bgRes.releaseDate || "28.09.2026",
                changelog: bgRes.changelog || "Cập nhật và tối ưu hóa hệ thống tiện ích.",
                downloadUrl: bgRes.downloadUrl || "/api/download-extension",
                hasUpdate: !!bgRes.hasUpdate
              };
            }
          } catch (err) {}
        }
      }

      // 3. Firestore fallback with static getDoc
      if (!updateData || !isVersionNewer(updateData.version || updateData.versionName, currentVer)) {
        try {
          if (typeof db !== "undefined" && db) {
            const firestorePromise = getDoc(doc(db, "system_config", "app_version"));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            const vDoc = await Promise.race([firestorePromise, timeoutPromise]);
            if (vDoc && vDoc.exists && vDoc.exists()) {
              const fData = vDoc.data();
              if (fData && (fData.version || fData.versionName)) {
                if (!updateData || isVersionNewer(fData.version || fData.versionName, updateData.version || updateData.versionName)) {
                  updateData = fData;
                }
              }
            }
          }
        } catch (e) {}
      }

      // 4. Default stable release fallback if nothing returned (ensures v28.09.2026 is recognized)
      if (!updateData) {
        const fallbackLatest = "28.9.2026";
        const fallbackLatestName = "28.09.2026";
        const needUpdate = isVersionNewer(fallbackLatest, currentVer);
        updateData = {
          version: fallbackLatest,
          versionName: fallbackLatestName,
          releaseDate: "28.09.2026",
          title: "Bản cập nhật v28.09.2026",
          changelog: "Cập nhật tính năng nhập mã nhận xét trên CSDL ngành (Mục ĐGTX 5.3.4), tối ưu điền nhận xét và sửa lỗi hệ thống.",
          downloadUrl: "/api/download-extension",
          hasUpdate: needUpdate
        };
      }

      // Minimum delay for smooth visual feedback on manual click
      if (isManual) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 300) {
          await new Promise((r) => setTimeout(r, 300 - elapsed));
        }
      }

      // Process result and update display
      if (updateData && (updateData.version || updateData.versionName)) {
        const latestV = updateData.version || currentVer;
        const latestVName = updateData.versionName || latestV;
        const changelog = updateData.changelog || "Cập nhật và tối ưu hóa hệ thống tiện ích.";
        const dlUrl = updateData.downloadUrl || "/api/download-extension";

        if (latestServer) latestServer.innerText = `v${latestVName}`;
        if (latestRelease && updateData.releaseDate) latestRelease.innerText = updateData.releaseDate;
        if (changelogEl && changelog) changelogEl.innerText = changelog;
        if (bannerTag) bannerTag.innerText = `v${latestVName}`;
        if (bannerDesc) bannerDesc.innerText = changelog;

        const hasNew = isVersionNewer(latestV, currentVer) || updateData.hasUpdate || updateData.forceNotify;

        if (hasNew) {
          if (topBanner) topBanner.classList.remove("hidden");
          if (sidebarBadge) sidebarBadge.classList.remove("hidden");
          if (statusBadge) {
            statusBadge.classList.remove("hidden");
            statusBadge.className = "px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm flex items-center gap-1.5";
            statusBadge.innerHTML = `
              <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>ĐÃ CÓ BẢN MỚI v${latestVName}</span>
            `;
          }
          if (fullDlBtn) {
            fullDlBtn.innerHTML = `
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              TẢI BẢN CẬP NHẬT MỚI NHẤT (.ZIP)
            `;
            fullDlBtn.className = "px-5 py-2.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer";
            fullDlBtn.onclick = () => downloadZipFile(dlUrl);
          }
          if (isManual) {
            showToast(
              "Đã có bản cập nhật mới!",
              `Phát hiện phiên bản v${latestVName}. Nhấn nút "TẢI BẢN CẬP NHẬT MỚI NHẤT (.ZIP)" để nâng cấp.`,
              "warning",
              6000
            );
          }
        } else {
          if (topBanner) topBanner.classList.add("hidden");
          if (sidebarBadge) sidebarBadge.classList.add("hidden");
          if (statusBadge) {
            statusBadge.classList.remove("hidden");
            statusBadge.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm flex items-center gap-1.5";
            statusBadge.innerHTML = `
              <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Phiên bản v${currentVerName} (Mới nhất)</span>
            `;
          }
          if (fullDlBtn) {
            fullDlBtn.innerHTML = `
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              ĐÃ LÀ BẢN MỚI NHẤT
            `;
            fullDlBtn.className = "px-5 py-2.5 text-xs font-black text-slate-500 bg-slate-100 rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-not-allowed";
            fullDlBtn.onclick = () => {
              showToast("Đã là bản mới nhất", "Bạn đang dùng phiên bản mới nhất, không cần cập nhật thêm.", "success", 3000);
            };
          }
          if (isManual) {
            showToast(
              "Phiên bản mới nhất!",
              `Bạn đang sử dụng phiên bản mới nhất (v${currentVerName}). Tiện ích đã sẵn sàng và hoạt động ổn định.`,
              "success",
              4000
            );
          }
        }

        if (bannerBtn) {
          bannerBtn.onclick = () => downloadZipFile(dlUrl);
        }
      } else {
        // Current version is up to date
        if (statusBadge) {
          statusBadge.classList.remove("hidden");
          statusBadge.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm flex items-center gap-1.5";
          statusBadge.innerHTML = `
            <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span>Phiên bản v${currentVerName} (Mới nhất)</span>
          `;
        }
        if (isManual) {
          showToast(
            "Phiên bản mới nhất!",
            `Bạn đang sử dụng phiên bản v${currentVerName}. Hệ thống hoạt động bình thường.`,
            "success",
            4000
          );
        }
        if (fullDlBtn) {
          fullDlBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            ĐÃ LÀ BẢN MỚI NHẤT
          `;
          fullDlBtn.className = "px-5 py-2.5 text-xs font-black text-slate-500 bg-slate-100 rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-not-allowed";
          fullDlBtn.onclick = () => {
            showToast("Đã là bản mới nhất", "Hệ thống đang ở trạng thái tốt nhất.", "success", 3000);
          };
        }
      }
    } catch (outerErr) {
      console.warn("Check server update outer error:", outerErr);
    } finally {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      cleanupUI();
    }
  }

  if (recheckBtn) {
    recheckBtn.onclick = () => checkServerUpdate(true);
  }

  // Handle URL query parameter ?tab=updates or ?tab=backup
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam === "updates") {
      const updateTab = document.getElementById("tab-updates");
      if (updateTab) {
        setTimeout(() => {
          updateTab.click();
        }, 100);
      }
    } else if (tabParam === "backup") {
      const backupTab = document.getElementById("tab-backup");
      if (backupTab) {
        setTimeout(() => {
          backupTab.click();
        }, 100);
      }
    }
  } catch (e) {}

  // Initial check on page load
  checkServerUpdate(false);
}

// Initialize options update manager
initOptionsUpdateManager();

