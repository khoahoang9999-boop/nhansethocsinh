import { migrateData } from "./shared.js";
import { auth, db, signOut, onAuthStateChanged, doc, onSnapshot, getDoc } from "./src/firebase-config.js";

const ADMIN_EMAILS = ['hvdkhoa89@gmail.com', 'khoahoang9999@gmail.com', 'admin@admin.com'];
function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      return origin;
    }
  }
  return "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app";
}

const isUserAdmin = (userOrEmail) => {
  if (!userOrEmail) return false;
  const email = (typeof userOrEmail === 'string' ? userOrEmail : userOrEmail.email || '').toLowerCase().trim();
  return ADMIN_EMAILS.includes(email);
};

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

document.addEventListener("DOMContentLoaded", () => {
  // Initialize sample data if it doesn't exist
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["commentsData"], (result) => {
      const { data, migrated } = migrateData(result.commentsData);
      if (migrated) {
        chrome.storage.local.set({ commentsData: data });
      }
    });
  }

  const optionsBtn = document.getElementById("optionsBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const runBtn = document.getElementById("runBtn");
  const fillCodeCheckbox = document.getElementById("fillCodeCheckbox");
  
  // Auth Elements
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const unauthButtons = document.getElementById("unauth-buttons");
  const unauthState = document.getElementById("unauth-state");
  const authState = document.getElementById("auth-state");
  const userDisplayName = document.getElementById("user-display-name");
  const userInfo = document.getElementById("user-info");
  const userCredits = document.getElementById("user-credits");
  const userPoints = document.getElementById("user-points");
  const userExpiryContainer = document.getElementById("user-expiry-container");
  const userExpiry = document.getElementById("user-expiry");
  const authStatusMessage = document.getElementById("auth-status-message");
  const logoutBtn = document.getElementById("logoutBtn");
  const topupBtn = document.getElementById("topupBtn");
  const adminBtn = document.getElementById("adminBtn");

  const openAuth = (tabParam = null) => {
    let url =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("auth-ui.html")
        : "/auth-ui.html";
    if (typeof tabParam === "string" && typeof tabParam !== 'object') {
        url += `?tab=${tabParam}#${tabParam}`;
    }
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
  if (registerBtn) registerBtn.addEventListener("click", () => {
    // We can open auth UI, probably showing register if app supports hash/query routing
    openAuth("register");
  });
  if (topupBtn) topupBtn.addEventListener("click", () => openAuth("topup"));
  if (adminBtn) adminBtn.addEventListener("click", () => openAuth("admin"));

  // Helper function to render auth UI state
  function renderAuthState(authStateData) {
    if (authStateData && (authStateData.uid || authStateData.email)) {
      if (unauthState) {
        unauthState.classList.add("hidden");
        unauthState.classList.remove("flex");
      }
      if (authState) {
        authState.classList.remove("hidden");
        authState.classList.add("flex");
      }
      const displayNameParam = authStateData.displayName || authStateData.email || "Người dùng";
      if (userDisplayName) {
        userDisplayName.innerText = displayNameParam;
      }
      const isAdmin = isUserAdmin(authStateData.email || authStateData);
      if (adminBtn) {
        if (isAdmin) {
          adminBtn.classList.remove("hidden");
          adminBtn.classList.add("flex");
        } else {
          adminBtn.classList.add("hidden");
          adminBtn.classList.remove("flex");
        }
      }
      const expD = parseFirestoreDate(authStateData.expiryDate);
      const now = new Date();
      const isVipByDate = expD && expD.getTime() > now.getTime();
      const isUserVip = isAdmin || authStateData.isVip === true || authStateData.tier === 'VIP' || authStateData.role === 'vip' || isVipByDate || (authStateData.credits || 0) > 0;
      
      let diffDays = 0;
      if (expD) {
        diffDays = Math.max(0, Math.round((expD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      if (userCredits) {
        if (isAdmin) {
          userCredits.textContent = "VIP";
          userCredits.className = "text-[11px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap text-center min-w-[55px]";
        } else if (isUserVip) {
          const dateStr = expD ? expD.toLocaleDateString('vi-VN') : (authStateData.expiryDateStr || 'VIP');
          userCredits.textContent = dateStr;
          userCredits.className = "text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap text-center";
        } else {
          userCredits.textContent = `Hết hạn`;
          userCredits.className = "text-[11px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap text-center";
        }
      }
      if (userPoints) {
        if (isAdmin || isUserVip) {
          userPoints.style.display = "none";
        } else {
          userPoints.textContent = `${authStateData.points || 0} Lượt`;
          userPoints.style.display = "";
        }
      }
      if (userExpiryContainer && userExpiry) {
        if (expD) {
          const isExpired = expD.getTime() <= now.getTime();
          const dateStr = expD.toLocaleDateString('vi-VN');
          if (isExpired && !isAdmin && !isUserVip) {
            userExpiry.textContent = `${dateStr} (Hết hạn)`;
            userExpiry.classList.add("text-red-500");
            userExpiry.classList.remove("text-blue-600", "text-emerald-700");
          } else {
            const remText = diffDays >= 365 ? `Còn ${Math.round(diffDays / 365)} năm` : `Còn ${diffDays} ngày`;
            userExpiry.textContent = `${dateStr} (${remText})`;
            userExpiry.classList.remove("text-red-500");
            userExpiry.classList.add("text-emerald-700");
          }
          userExpiryContainer.classList.remove('hidden');
        } else if (isAdmin || isUserVip) {
          userExpiry.textContent = `Thành viên VIP`;
          userExpiryContainer.classList.remove('hidden');
        } else {
          userExpiry.textContent = `Chưa gia hạn`;
          userExpiryContainer.classList.remove('hidden');
        }
      }
      if (userInfo) userInfo.classList.remove("hidden");
      if (authStatusMessage) {
        authStatusMessage.textContent = "";
        authStatusMessage.className = "hidden";
      }
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    } else {
      if (unauthState) {
        unauthState.classList.remove("hidden");
        unauthState.classList.add("flex");
      }
      if (authState) {
        authState.classList.add("hidden");
        authState.classList.remove("flex");
      }
    }
  }

  // Check existing session from local storage immediately on startup
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["authState"], (res) => {
      if (res && res.authState) {
        renderAuthState(res.authState);

        // Fetch latest live status from backend
        if (res.authState.uid && res.authState.uid !== 'guest') {
          fetch(`${getApiBaseUrl()}/api/user/status?uid=${encodeURIComponent(res.authState.uid)}&email=${encodeURIComponent(res.authState.email || '')}`)
            .then(r => r.ok ? r.json() : null)
            .then(live => {
              if (live && live.exists) {
                const updatedAuth = {
                  ...res.authState,
                  credits: live.credits,
                  points: live.points,
                  isVip: live.isVip,
                  isAdmin: live.isAdmin,
                  tier: live.tier,
                  role: live.role,
                  expiryDate: live.expiryDate,
                  expiryDateStr: live.expiryDateStr
                };
                chrome.storage.local.set({ authState: updatedAuth });
                renderAuthState(updatedAuth);
              }
            }).catch(() => {});
        }
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        if (changes.authState) {
          renderAuthState(changes.authState.newValue);
        }
        if (changes.showFloatingWidget !== undefined) {
          const chk = document.getElementById("showFloatingBarCheckbox");
          if (chk) chk.checked = changes.showFloatingWidget.newValue !== false;
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(["authState"]);
        }
        try {
          localStorage.removeItem("tlnx_saved_email");
          localStorage.removeItem("tlnx_saved_pass");
          localStorage.removeItem("tlnx_display_email");
        } catch (e) {}
        await signOut(auth);
        renderAuthState(null);
      } catch (err) {
        console.error("Logout error", err);
        renderAuthState(null);
      }
    });
  }

  // Firebase Auth Listener
  let unsubSnapshot = null;

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

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (unauthState) {
        unauthState.classList.add("hidden");
        unauthState.classList.remove("flex");
      }
      if (authState) {
        authState.classList.remove("hidden");
        authState.classList.add("flex");
      }
      
      const displayNameParam = user.displayName || user.email || "Người dùng";
      if (userDisplayName) {
        userDisplayName.innerText = displayNameParam;
      }

      if (adminBtn) {
          if (isUserAdmin(user)) {
              adminBtn.classList.remove("hidden");
              adminBtn.classList.add("flex");
          } else {
              adminBtn.classList.add("hidden");
              adminBtn.classList.remove("flex");
          }
      }

      if (unsubSnapshot) unsubSnapshot();
      unsubSnapshot = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
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
          const isAdmin = isUserAdmin(user);
          isVip = isAdmin || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || isVipByDate || (credits > 0);
          if (isVipByDate && (credits <= 0 || !credits)) {
            credits = parseFloat(((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1));
          }
          expiryDateISO = expDate ? expDate.toISOString() : null;
          expiryDateStr = expDate ? expDate.toLocaleDateString('vi-VN') : '';

          // QUẢN LÝ THIẾT BỊ (TỐI ĐA 2 THIẾT BỊ HOẠT ĐỘNG GẦN NHẤT)
          const deviceId = await getDeviceId();
          let currentDevices = (data.deviceIds || []).filter(d => typeof d === 'string' && d.length > 0);

          if (!isAdmin && !currentDevices.includes(deviceId)) {
              if (currentDevices.length >= 2) {
                  currentDevices = [currentDevices[currentDevices.length - 1], deviceId];
              } else {
                  currentDevices.push(deviceId);
              }
              import("./src/firebase-config.js").then(({ updateDoc }) => {
                  updateDoc(doc(db, "users", user.uid), {
                      deviceIds: currentDevices
                  }).catch(() => {});
              });
          }

          if (authStatusMessage) {
              authStatusMessage.textContent = "";
              authStatusMessage.className = "hidden";
          }
          if (userInfo) userInfo.classList.remove("hidden");
          if (runBtn) {
              runBtn.disabled = false;
              runBtn.classList.remove("opacity-50", "cursor-not-allowed");
          }
        }
        
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          if (!window.__pendingListenerAddedPopup) {
              window.__pendingListenerAddedPopup = true;
              chrome.storage.onChanged.addListener((changes, area) => {
                  if (area === 'local' && changes.authState) {
                      const newVal = changes.authState.newValue;
                      if (newVal && newVal.pendingDeduction > 0) {
                          const pending = newVal.pendingDeduction;
                          chrome.storage.local.set({ authState: { ...newVal, pendingDeduction: 0 } });
                          import("./src/firebase-config.js").then(({ updateDoc }) => {
                              getDoc(doc(db, "users", user.uid)).then(docSnap => {
                                  if (docSnap.exists()) {
                                      updateDoc(doc(db, "users", user.uid), {
                                          points: Math.max(0, (docSnap.data().points || 0) - pending)
                                      });
                                  }
                              });
                          });
                      }
                  }
              });
          }
          chrome.storage.local.get(["authState"], (res) => {
              const pending = res.authState && res.authState.pendingDeduction ? res.authState.pendingDeduction : 0;
              if (pending > 0) {
                  // RESET PENDING IMMEDIATELY TO AVOID RACE CONDITION
                  const newAuthState = { ...res.authState, pendingDeduction: 0 };
                  chrome.storage.local.set({ authState: newAuthState });

                  // Deduct from POINTS then CREDITS (Logic: only points for now)
                  let currentPoints = points || 0;
                  let updateData = {};
                  
                  if (currentPoints >= pending) {
                      updateData.points = currentPoints - pending;
                  } else {
                      updateData.points = 0;
                  }

                  import("./src/firebase-config.js").then(({ updateDoc }) => {
                    updateDoc(doc(db, "users", user.uid), updateData);
                  });
                  // We already reset pendingDeduction above, but let's ensure authState is synced with latest data
                  const isAdmin = isUserAdmin(user);
                  chrome.storage.local.set({ 
                    authState: { 
                      ...newAuthState,
                      credits: credits, 
                      points: updateData.points,
                      isVip,
                      expiryDate: expiryDateISO,
                      expiryDateStr,
                      isAdmin
                    } 
                  });
              } else {
                  const isAdmin = isUserAdmin(user);
                  chrome.storage.local.set({ 
                    authState: { 
                      uid: user.uid, 
                      email: user.email, 
                      credits: credits, 
                      points: points,
                      isVip,
                      expiryDate: expiryDateISO,
                      expiryDateStr,
                      pendingDeduction: 0,
                      isAdmin
                    } 
                  });
              }
          });
        }

        if (userCredits) {
           const isAdmin = isUserAdmin(user);
           if (isAdmin || isVip) {
               const displayCred = credits > 0 ? (credits < 1 ? Math.round(credits * 365) + " Ngày" : (credits % 1 === 0 ? credits : credits.toFixed(1)) + " Năm") : "VIP";
               userCredits.textContent = displayCred;
               userCredits.classList.add("text-red-600", "font-black");
           } else {
               userCredits.textContent = `0 Năm`;
               userCredits.classList.remove("text-red-600", "font-black");
           }
        }
        if (userPoints) {
           const isAdmin = isUserAdmin(user);
           if (isAdmin || isVip) {
               userPoints.style.display = "none";
           } else {
               userPoints.textContent = `${points} Lượt`;
               userPoints.style.display = "";
           }
        }
        
        if (userExpiryContainer && userExpiry) {
           if (expDate && !isNaN(expDate.getTime())) {
               const now = new Date();
               const isExpired = expDate < now;
               userExpiry.textContent = expiryDateStr + (isExpired ? " (Hết hạn)" : "");
               userExpiryContainer.classList.remove('hidden');
               if (isExpired) {
                   userExpiry.classList.add("text-red-500");
                   userExpiry.classList.remove("text-blue-600");
               } else {
                   userExpiry.classList.remove("text-red-500");
                   userExpiry.classList.add("text-blue-600");
               }
           } else {
               userExpiryContainer.classList.add('hidden');
           }
        }
      }, (error) => {
          console.error("Snapshot error:", error);
          if (userCredits) userCredits.textContent = "Lỗi";
          if (userPoints) userPoints.textContent = "Lỗi";
      });
    } else {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["authState"], (res) => {
          if (res && res.authState && (res.authState.uid || res.authState.email)) {
            renderAuthState(res.authState);
          } else {
            renderAuthState(null);
          }
        });
      } else {
        renderAuthState(null);
      }
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
    }
  });

  const showFloatingBarCheckbox = document.getElementById("showFloatingBarCheckbox");
  if (showFloatingBarCheckbox) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["showFloatingWidget"], (res) => {
        const isVisible = res.showFloatingWidget !== false;
        showFloatingBarCheckbox.checked = isVisible;
        if (res.showFloatingWidget === undefined) {
          chrome.storage.local.set({ showFloatingWidget: true });
        }
      });
      showFloatingBarCheckbox.addEventListener("change", (e) => {
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

          // 1. Send direct runtime messages
          chrome.tabs.sendMessage(tab.id, { action: "toggleFloatingWidget", visible: isChecked }).catch(() => {});
          chrome.tabs.sendMessage(tab.id, { action: "setFloatingWidgetVisible", visible: isChecked }).catch(() => {});

          // 2. Direct script execution via chrome.scripting for instantaneous DOM toggle without waiting
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
          chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs && tabs.length) tabs.forEach(applyToTab);
          });
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length) tabs.forEach(applyToTab);
          });
          chrome.tabs.query({}, (tabs) => {
            if (tabs && tabs.length) tabs.forEach(applyToTab);
          });
        }
      });
    } else {
      showFloatingBarCheckbox.checked = localStorage.getItem("tlnx_show_floating_widget") !== "false";
      showFloatingBarCheckbox.addEventListener("change", (e) => {
        localStorage.setItem("tlnx_show_floating_widget", e.target.checked ? "true" : "false");
      });
    }
  }

  if (fillCodeCheckbox && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["autoFillCode"], (result) => {
      if (result.autoFillCode !== undefined) {
        fillCodeCheckbox.checked = result.autoFillCode;
      }
    });

    fillCodeCheckbox.addEventListener("change", (e) => {
      chrome.storage.local.set({ autoFillCode: e.target.checked });
    });
  }

  const openOptions = (tabParam = null) => {
    let url =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("options.html")
        : "/options.html";
    if (typeof tabParam === "string" && typeof tabParam !== 'object') url += `?tab=${tabParam}`;
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  };

  if (optionsBtn) optionsBtn.addEventListener("click", () => openOptions());
  if (settingsBtn) settingsBtn.addEventListener("click", () => openOptions());
  const popupBackupBtn = document.getElementById("popupBackupBtn");
  if (popupBackupBtn) popupBackupBtn.addEventListener("click", () => openOptions("backup"));

  const setStatus = (msg, type) => {
    const area = document.getElementById("statusArea");
    const text = document.getElementById("statusText");
    const dot = document.getElementById("statusDot");
    if (!area) return;
    
    area.classList.remove("hidden");
    text.innerText = msg;
    if (type === "error") {
      text.className = "text-[11px] font-bold text-red-500";
      dot.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
    } else if (type === "success") {
      text.className = "text-[11px] font-bold text-green-600";
      dot.className = "w-2 h-2 rounded-full bg-green-500";
    } else {
      text.className = "text-[11px] font-medium text-slate-500";
      dot.className = "w-2 h-2 rounded-full bg-slate-300";
    }
  };

  if (runBtn) {
    runBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        setStatus("Vui lòng đăng nhập để sử dụng tính năng này!", "error");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data() || {};
          const credits = data.credits || 0;
          const points = data.points || 0;
          const email = (data.email || user.email || "").toLowerCase().trim();
          const isAdmin = isUserAdmin(email) || data.isAdmin === true || data.role === 'admin';
          let isVip = isAdmin || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || credits > 0;
          if (!isVip && data.expiryDate) {
            try {
              let exp = null;
              if (typeof data.expiryDate.toDate === 'function') exp = data.expiryDate.toDate();
              else if (data.expiryDate.seconds) exp = new Date(data.expiryDate.seconds * 1000);
              else if (data.expiryDate._seconds) exp = new Date(data.expiryDate._seconds * 1000);
              else exp = new Date(data.expiryDate);
              if (exp && !isNaN(exp.getTime()) && exp.getTime() > Date.now()) {
                isVip = true;
              }
            } catch (e) {}
          }

          if (!isAdmin && !isVip && credits <= 0 && points <= 0) {
            setStatus("Bạn đã hết lượt sử dụng và hạn VIP. Vui lòng gia hạn để tiếp tục!", "error");
            return;
          }
        } else {
           setStatus("Không tìm thấy thông tin tài khoản!", "error");
           return;
        }

        const method = "template";
        const autoFillCode = fillCodeCheckbox ? fillCodeCheckbox.checked : true;
        // Proceed to execute logic
        executeLogic({ method, autoFillCode });
      } catch (err) {
        setStatus("Lỗi kiểm tra điểm: " + err.message, "error");
      }
    });
  }

  function executeLogic(config) {
    setStatus("Đang quét trang và xử lý dữ liệu...", "default");
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && !tabs[0].url.startsWith("chrome://")) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "fillComments",
              config,
            },
            async (response) => {
              if (chrome.runtime.lastError) {
                setStatus("Lỗi kết nối. Hãy đảm bảo bạn đang ở đúng trang web tra điểm!", "error");
              } else if (response && response.success) {
                if (response.count > 0) {
                  // Deduct point if success
                  const user = auth.currentUser;
                  if (user) {
                      chrome.storage.local.get(['authState'], (res) => {
                          const state = res.authState || {};
                          const email = (state.email || user.email || "").toLowerCase().trim();
                          const isAdmin = state.isAdmin === true || isUserAdmin(email);
                          let isVip = isAdmin || state.isVip === true || (state.credits || 0) > 0 || state.tier === 'VIP' || state.role === 'vip';
                          const p = state.points || 0;
                          const c = state.credits || 0;

                          if (!isAdmin && !isVip && p > 0 && c <= 0) {
                              state.points -= 1;
                              state.pendingDeduction = (state.pendingDeduction || 0) + 1;
                              chrome.storage.local.set({ authState: state });
                          }
                      });
                  }

                  let msg = "";
                  if (response.count > 0 || response.skippedNoScore > 0) {
                      let hCount = response.count || 0;
                      msg = `Điền thành công: ${hCount} học sinh.`;
                  }

                  setStatus(
                    msg,
                    "success"
                  );
                } else if (response.skippedNoScore > 0) {
                  let msg = `Điền thành công: 0 học sinh.`;
                  setStatus(msg, "success");
                } else {
                  setStatus("Không tìm thấy ô nhập nhận xét phù hợp trên trang!", "error");
                }
              } else {
                const errDesc = response?.error || "Lỗi không xác định";
                setStatus(errDesc.replace("Error: ", ""), "error");
              }
            }
          );
        } else {
          setStatus("Không thể chạy tự động trên trang web này.", "error");
        }
      });
    } else {
      setStatus("Chỉ hoạt động khi chạy như Extension thật.", "error");
      
      // MOCK for Web Env
      setTimeout(async () => {
        setStatus("Chế độ Demo Web: Đã mô phỏng điền 40 dòng thành công!", "success");
      }, 1000);
    }
  }

  // ================= UPDATE CHECKING LOGIC =================
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

  function downloadExtensionZip(downloadUrl) {
    let url = downloadUrl;
    if (!url || url.startsWith("/")) {
      const origin = (typeof window !== "undefined" && window.location && window.location.origin && !window.location.origin.includes("chrome-extension://")) 
        ? window.location.origin 
        : "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app";
      url = `${origin}/nhan-xet-diem-v28.09.2026.zip?t=${Date.now()}`;
    }

    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }

    setStatus("Đang tải bản v28.09.2026... Hãy giải nén thư mục Nhan-xet-diem-v28.09.2026 và bấm Reload lại tiện ích.", "success");
  }

  async function checkAppUpdates(isManual = false) {
    const banner = document.getElementById("update-notification-banner");
    const verText = document.getElementById("update-new-version");
    const logText = document.getElementById("update-changelog");
    const dlBtn = document.getElementById("downloadUpdateBtn");
    const dismissBtn = document.getElementById("dismissUpdateBtn");
    const headerVer = document.getElementById("popup-current-version");
    const headerPill = document.getElementById("popup-update-badge-pill");
    const checkBtn = document.getElementById("popupCheckUpdateBtn");
    const checkIcon = document.getElementById("popup-check-icon");
    const checkSpinner = document.getElementById("popup-check-spinner");
    const checkLabel = document.getElementById("popup-check-label");
    const feedbackEl = document.getElementById("popup-update-feedback");

    let currentVer = "28.9.2026";
    let currentVerName = "28.09.2026";
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      currentVer = manifest.version || currentVer;
      currentVerName = manifest.version_name || currentVer;
    }

    if (headerVer) {
      headerVer.innerText = `Version ${currentVerName}`;
    }

    let hasCleanedUp = false;
    const cleanupUI = () => {
      if (hasCleanedUp) return;
      hasCleanedUp = true;
      if (checkSpinner) checkSpinner.classList.add("hidden");
      if (checkIcon) checkIcon.classList.remove("hidden");
      if (checkLabel) checkLabel.innerText = "Kiểm tra bản mới";
      if (checkBtn) {
        checkBtn.style.pointerEvents = "auto";
        checkBtn.style.opacity = "1";
      }
    };

    let watchdogTimer = null;

    if (isManual) {
      if (checkSpinner) checkSpinner.classList.remove("hidden");
      if (checkIcon) checkIcon.classList.add("hidden");
      if (checkLabel) checkLabel.innerText = "Đang kiểm tra...";
      if (checkBtn) {
        checkBtn.style.pointerEvents = "none";
        checkBtn.style.opacity = "0.7";
      }
      if (feedbackEl) {
        feedbackEl.classList.add("hidden");
      }

      watchdogTimer = setTimeout(() => {
        if (!hasCleanedUp) {
          console.warn("[PopupCheck] Watchdog timer triggered after 2.5s");
          cleanupUI();
          if (feedbackEl) {
            feedbackEl.className = "mt-2 p-2 rounded-xl text-xs font-bold text-center bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm";
            feedbackEl.innerText = `✓ Bạn đang sử dụng bản mới nhất (v${currentVerName})!`;
            feedbackEl.classList.remove("hidden");
            setTimeout(() => {
              feedbackEl.classList.add("hidden");
            }, 3500);
          }
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

      // 2. Try background script via runtime message
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
          } catch (e) {}
        }
      }

      // 3. Try Firestore system_config/app_version
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
        } catch (err) {}
      }

      // 4. Default stable release fallback if nothing returned
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

      if (updateData && (updateData.version || updateData.versionName)) {
        const latestV = updateData.version || currentVer;
        const latestVName = updateData.versionName || latestV;
        const changelog = updateData.changelog || "Cập nhật và tối ưu hóa hệ thống tiện ích.";
        const dlUrl = updateData.downloadUrl || "/api/download-extension";
        const hasNew = isVersionNewer(latestV, currentVer);

        if (hasNew) {
          if (headerPill) {
            headerPill.classList.remove("hidden");
            headerPill.innerText = `Bản mới v${latestVName}`;
            headerPill.onclick = () => {
              if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              }
            };
          }
          if (banner) {
            banner.classList.remove("hidden");
            if (verText) verText.innerText = `v${latestVName}`;
            if (logText && changelog) logText.innerText = changelog;
            if (dlBtn) dlBtn.onclick = () => downloadExtensionZip(dlUrl);
            if (dismissBtn) {
              dismissBtn.onclick = () => {
                banner.classList.add("hidden");
                localStorage.setItem("dismissed_update_" + latestV, "true");
              };
            }
          }
          if (feedbackEl && isManual) {
            feedbackEl.className = "mt-2 p-2 rounded-xl text-xs font-bold text-center bg-amber-100 text-amber-900 border border-amber-300 shadow-sm";
            feedbackEl.innerText = `🔔 Đã có bản mới v${latestVName}! Hãy nhấn nút tải ở thông báo trên.`;
            feedbackEl.classList.remove("hidden");
          }
        } else {
          if (headerPill) headerPill.classList.add("hidden");
          if (banner) banner.classList.add("hidden");
          if (feedbackEl && isManual) {
            feedbackEl.className = "mt-2 p-2 rounded-xl text-xs font-bold text-center bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm";
            feedbackEl.innerText = `✓ Bạn đang sử dụng bản mới nhất (v${currentVerName})!`;
            feedbackEl.classList.remove("hidden");
            setTimeout(() => {
              feedbackEl.classList.add("hidden");
            }, 3500);
          }
        }
      } else if (isManual && feedbackEl) {
        feedbackEl.className = "mt-2 p-2 rounded-xl text-xs font-semibold text-center bg-slate-100 text-slate-700 border border-slate-200";
        feedbackEl.innerText = `✓ Phiên bản hiện tại: v${currentVerName} (Đã sẵn sàng)`;
        feedbackEl.classList.remove("hidden");
        setTimeout(() => {
          feedbackEl.classList.add("hidden");
        }, 3500);
      }
    } catch (err) {
      console.warn("Check update error:", err);
      if (isManual && feedbackEl) {
        feedbackEl.className = "mt-2 p-2 rounded-xl text-xs font-semibold text-center bg-slate-100 text-slate-700 border border-slate-200";
        feedbackEl.innerText = `✓ Phiên bản hiện tại: v${currentVerName}`;
        feedbackEl.classList.remove("hidden");
      }
    } finally {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      cleanupUI();
    }
  }

  const manualCheckBtn = document.getElementById("popupCheckUpdateBtn");
  if (manualCheckBtn) {
    manualCheckBtn.onclick = () => checkAppUpdates(true);
  }

  // Trigger update check on startup
  checkAppUpdates(false);
});

