(() => {
  let detectedHocKy = "Học kỳ 1";
  let isGiuaKy = false;
  let isCuoiKy = false;
  let role = "GVBM";
  let capHoc = "THCS";
  let khoiLop = "6";
  let subject = "";

  // public/content.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "syncAuthState" && request.authState) {
      if (typeof window.__tlnx_update_points_ui === "function") {
        window.__tlnx_update_points_ui(request.authState);
      }
      return;
    }
    if (request.action === "fillComments") {
      let config = request.config || {};
      fillCommentsAsync(config)
        .then((result) => {
            sendResponse({
              success: true,
              count: result.count,
              detectedMon: result.detectedMon,
              skippedNoScore: result.skippedNoScore,
            });
          })
          .catch((err) => {
            console.error(err);
            if (window === window.top && document.querySelectorAll("iframe").length > 0) {
              // If top window fails but has iframes, let the iframe's success response win.
              // We just wait a bit, if no iframe responds, we send the error.
              setTimeout(() => {
                  sendResponse({ success: false, error: err.message });
              }, 500);
            } else {
              sendResponse({ success: false, error: err.message });
            }
          });
      return true;
    }
  });
  
  const saveScrollState = () => {
     let containers = Array.from(document.querySelectorAll('*')).filter(el => {
         if (el.tagName === 'BODY' || el.tagName === 'HTML' || el.tagName === 'HEAD') return false;
         const style = window.getComputedStyle(el);
         return el.scrollHeight > el.clientHeight + 10 && 
                (style.overflowY === 'auto' || style.overflowY === 'scroll');
     });
     return {
        windowX: window.scrollX,
        windowY: window.scrollY,
        containers: containers.map(c => ({ el: c, top: c.scrollTop }))
     };
  };

  const restoreScrollState = (state) => {
      if (!state) return;
      window.scrollTo({ left: state.windowX, top: state.windowY, behavior: 'instant' });
      state.containers.forEach(s => {
          if(s.el) s.el.scrollTop = s.top;
      });
  };

  function showFloatingNotification({ title = "Thông Báo", message = "", type = "error", duration = 8000 }) {
    const oldBox = document.getElementById("tlnx-floating-msg-box");
    if (oldBox) oldBox.remove();

    const msgBox = document.createElement("div");
    msgBox.id = "tlnx-floating-msg-box";

    const isError = type === "error";
    const isSuccess = type === "success";
    const accentColor = isError ? "#ef4444" : (isSuccess ? "#10b981" : "#f59e0b");
    const badgeBg = isError ? "#fef2f2" : (isSuccess ? "#ecfdf5" : "#fffbeb");
    const badgeBorder = isError ? "#fee2e2" : (isSuccess ? "#d1fae5" : "#fef3c7");

    const iconSvg = isError
      ? `<svg style="width:18px;height:18px;color:#dc2626;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
      : (isSuccess
        ? `<svg style="width:18px;height:18px;color:#059669;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
        : `<svg style="width:18px;height:18px;color:#d97706;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`);

    msgBox.style.cssText = `
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%) translateY(-8px);
      z-index: 2147483647;
      width: 360px;
      max-width: calc(100vw - 32px);
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 35px -8px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.1);
      font-family: Arial, system-ui, -apple-system, sans-serif;
      color: #0f172a;
      padding: 14px 16px;
      box-sizing: border-box;
      opacity: 0;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: default;
    `;

    msgBox.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 8px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${iconSvg}
          </div>
          <div style="line-height: 1.2;">
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${title}</div>
            <div style="font-size: 9.5px; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px;">Tin Nhắn Trợ Lý</div>
          </div>
        </div>
        <button id="tlnx-msg-close-btn" style="background: transparent; border: none; color: #94a3b8; font-size: 15px; line-height: 1; cursor: pointer; padding: 2px 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>
      
      <div style="font-size: 12px; line-height: 1.5; color: #334155; margin-bottom: 10px; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-word;">
        ${message}
      </div>

      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
        <button id="tlnx-msg-ok-btn" style="background: #0f172a; color: #ffffff; border: none; border-radius: 6px; padding: 5px 14px; font-size: 11px; font-weight: 700; cursor: pointer; transition: background 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          Đã hiểu
        </button>
      </div>
    `;

    document.body.appendChild(msgBox);

    const closeBtn = msgBox.querySelector("#tlnx-msg-close-btn");
    const okBtn = msgBox.querySelector("#tlnx-msg-ok-btn");
    const closeBox = () => {
      msgBox.style.opacity = "0";
      msgBox.style.transform = "translateX(-50%) translateY(-8px)";
      setTimeout(() => {
        if (msgBox.parentNode) msgBox.remove();
      }, 240);
    };

    if (closeBtn) closeBtn.onclick = closeBox;
    if (okBtn) okBtn.onclick = closeBox;

    requestAnimationFrame(() => {
      msgBox.style.opacity = "1";
      msgBox.style.transform = "translateX(-50%) translateY(0)";
    });

    if (duration > 0) {
      setTimeout(() => {
        if (document.getElementById("tlnx-floating-msg-box") === msgBox) {
          closeBox();
        }
      }, duration);
    }
  }

  async function fillCommentsAsync(config) {
    const scrollState = saveScrollState();
    try {
      return await fillCommentsInner(config);
    } finally {
      // Delay restore slightly to ensure all DOM updates and scrolling have settled
      setTimeout(() => restoreScrollState(scrollState), 100);
    }
  }

  async function fillCommentsInner(config) {
    let fillCount = 0;
    let skippedNoScore = 0;
    let skippedNoInput = 0;
    const storageResult = await chrome.storage.local.get(["commentsData"]);
    let db = storageResult.commentsData;
    if (
      !db ||
      Object.keys(db).length === 0 ||
      db?.TH?.["3"]?.GVBM?.["Toán_Giữa kỳ 1"]
    ) {
      try {
        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "getDefaultData" }, resolve);
        });
        if (resp && resp.data) {
          db = resp.data;
        }
      } catch (e) {
        console.warn("Could not retrieve default commentsData from background:", e);
      }
    }
    role = "GVBM";
    capHoc = "THCS";
    khoiLop = "6";
    subject = "";
    let pageTextRaw = document.body.innerText.toLowerCase();
    let splitDoc = pageTextRaw.split("danh sách đánh giá");
    let pageText = splitDoc[0];
    pageText = pageText.split("danh sách học sinh")[0];
    pageText = pageText.split("tổng số học sinh")[0];

    // Add text from same-origin iframes
    let iframes = document.querySelectorAll("iframe");
    for (let iframe of iframes) {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          pageText += " " + iframe.contentDocument.body.innerText.toLowerCase();
        }
      } catch (e) {}
    }

    detectedHocKy = "Học kỳ 1";
    isGiuaKy = false;
    isCuoiKy = false;
    if (
      pageText.includes("học kỳ 2") ||
      pageText.includes("học kỳ ii") ||
      pageText.includes("hk2") ||
      pageText.includes("hk ii") ||
      pageText.includes("hk 2") ||
      pageText.includes("hkii")
    ) {
      detectedHocKy = "Học kỳ 2";
    }

    // Preliminary level detection from page text
    if (pageText.includes("thpt") || pageText.includes("ph\u1ED5 th\xF4ng") || pageText.includes("trung học phổ thông"))
      capHoc = "THPT";
    else if (pageText.includes("thcs") || pageText.includes("trung học cơ sở"))
      capHoc = "THCS";
    else if (pageText.includes("ti\u1EC3u h\u1ECDc"))
      capHoc = "TH";

    // Build a map of label-like text to nearby values to reliably find Khối and Môn
    const possibleInfoEls = Array.from(
      document.querySelectorAll(
        'input[type="text"], input:not([type]), select, .k-input, .rcbInput, .rcbReadOnly, .x-form-text, .select2-selection__rendered'
      )
    ).filter(el => !el.closest('table[class*="table"], .x-grid-panel, .x-grid3, .e-grid, .k-grid, .e-spreadsheet, table.table'));
    const normVal = (el) => {
      if (el.tagName?.toLowerCase() === "select")
        return el.options[el.selectedIndex]?.text?.trim() || "";
      return (el.value || el.innerText || "").trim();
    };

    // First try the traditional valSet list matching
    const valSet = Array.from(new Set(possibleInfoEls.map(normVal))).filter(v => Boolean(v) && v.length < 50);
    console.log("[Extension] Detected info values:", valSet);

    // Advanced search: Try finding label-next-to-value or value directly
    let foundKhoi = false;
    
    // Look closely at elements for explicit label-value pairs
    // Typical DOM on CSDL Ngành: <td>Khối:</td><td><input value="6"/></td>
    // Or <label>Khối học</label> ... <span class="select2-selection__rendered">6</span>
    for (let el of document.querySelectorAll('td, label, span, div')) {
      if (el.closest('table[class*="table"], .x-grid-panel, .x-grid3, .e-grid, .k-grid, .e-spreadsheet, table.table')) continue;
      let txt = (el.innerText || "").toLowerCase().trim();
      // Expanded label matching for better precision
      if (txt === "khối" || txt === "khối học" || txt === "khối:" || txt === "khối học:" || txt === "khối lớp" || txt === "khối lớp:") {
        // Try finding next sibling or an element nearby that contains the number
        let parent = el.parentElement;
        let walkArea = parent?.parentElement || parent;
        if (walkArea) {
          let inputsInArea = walkArea.querySelectorAll('input:not([type="hidden"]), select, .k-input, .select2-selection__rendered, .x-form-text, .rcbInput');
          for (let inp of inputsInArea) {
            let iv = normVal(inp).toLowerCase();
            let mt = iv.match(/^(\d+)$/);
            if (mt) {
              khoiLop = mt[1];
              foundKhoi = true;
              break;
            }
          }
        }
      }
      if (foundKhoi) break;
    }

    if (!foundKhoi) {
      for (const val of valSet) {
        const match = val.toLowerCase().match(/khối[\s:]*(\d+)/);
        if (match) {
          khoiLop = match[1];
          foundKhoi = true;
          break;
        }
        
        // Sometimes the dropdown just says "6", "6A", "10" 
        // We carefully only pick 1-12 if no explicit string "Khối X" was found.
        const numExactStrMatch = val.match(/^(\d+)[A-Za-z]?$/);
        if (numExactStrMatch && !foundKhoi) {
          let num = parseInt(numExactStrMatch[1]);
          if (num >= 1 && num <= 12) {
             // Defer assignment if possible, but keep it as a weak match
             khoiLop = numExactStrMatch[1];
          }
        }
      }

      // Explicit search for "Học kỳ" label-value
      for (let el of document.querySelectorAll('td, label, span, div')) {
        if (el.closest('table[class*="table"], .x-grid-panel, .x-grid3, .e-grid, .k-grid, .e-spreadsheet, table.table')) continue;
        let txt = (el.innerText || "").toLowerCase().trim();
        if (txt === "học kỳ" || txt === "học kỳ:" || txt === "kỳ học" || txt === "kỳ học:") {
          let parent = el.parentElement;
          let walkArea = parent?.parentElement || parent;
          if (walkArea) {
             let inps = walkArea.querySelectorAll('input:not([type="hidden"]), select, .k-input, .select2-selection__rendered, .rcbInput');
             for (let inp of inps) {
               let iv = normVal(inp).toLowerCase();
               if (iv.includes("2") || iv.includes("ii")) detectedHocKy = "Học kỳ 2";
               else if (iv.includes("1") || iv.includes("i")) detectedHocKy = "Học kỳ 1";
             }
          }
        }
      }

      // Fallback to valSet loop for semester if labels didn't find it
      for (const val of valSet) {
        const vLow = val.toLowerCase();
        if (vLow.includes("học kỳ ii") || vLow.includes("học kỳ 2") || vLow.includes("hk2") || vLow.includes("hk ii") || vLow.includes("hk 2") || vLow.includes("hkii")) {
          detectedHocKy = "Học kỳ 2";
        } else if (vLow.includes("học kỳ i") || vLow.includes("học kỳ 1") || vLow.includes("hk1") || vLow.includes("hki") || vLow.includes("hk i") || vLow.includes("hk 1")) {
          detectedHocKy = "Học kỳ 1";
        }
        
        if (vLow.includes("cuối học kỳ") || vLow.includes("cuối năm") || vLow.includes("cuối hk") || vLow.includes("cuối kỳ") || vLow.includes("ck1") || vLow.includes("ck2") || vLow === "ck") {
          isCuoiKy = true;
        }
        if (vLow.includes("giữa học kỳ") || vLow.includes("giữa hk") || vLow.includes("giữa kỳ") || vLow.includes("gk1") || vLow.includes("gk2") || vLow === "gk") {
          isGiuaKy = true;
        }
      }
      
      if (isCuoiKy) {
         isGiuaKy = false;
      }
    }

    // Fallback: search entire body text for "Khối: X" or "Khối lớp: X" in case inputs missed it
    const bodyMatch = document.body.innerText.toLowerCase().match(/khối(?:\s+lớp)?[\s:]*(\d+)/);
    if (bodyMatch && !foundKhoi) {
      khoiLop = bodyMatch[1];
      foundKhoi = true;
    }

    // Refine capHoc based on final khoiLop
    if (khoiLop) {
      const k = parseInt(khoiLop);
      if (k >= 10) capHoc = "THPT";
      else if (k >= 6 && k <= 9) capHoc = "THCS";
      else if (k >= 1 && k <= 5) capHoc = "TH";
    }

    console.log(`[Extension] Resolved: Cap=${capHoc}, Khoi=${khoiLop}`);
    const activeTitles = Array.from(
      document.querySelectorAll(
        ".x-window-header-text, .x-panel-header-text, .x-tab-strip-active, .x-tab-active, .k-window-title, h1, h2, h3, .x-title-text, .panel-title, .page-title, .page-breadcrumb, .breadcrumb, .caption-subject, .portlet-title, .title"
      ),
    );
    let activeTitleText = activeTitles
      .map((el) => el.innerText)
      .join(" ")
      .toLowerCase();

    let parentText = "";
    try {
      if (window.top !== window.self) {
        parentText = (
          window.parent.document.body.innerText || ""
        ).toLowerCase();
        parentText += " " + window.parent.location.href.toLowerCase();
      }
    } catch (e) {}

    let textToCheckRole =
      activeTitleText +
      " " +
      pageText +
      " " +
      parentText +
      " " +
      window.location.href.toLowerCase();

    let is533 =
      textToCheckRole.includes("5.3.3") ||
      activeTitleText.includes(
        "nh\u1EADn x\xE9t in h\u1ECDc b\u1EA1 c\u1EE7a gvcn",
      ) ||
      window.location.href.includes("5.3.3");
    let isTrangNLPC =
      textToCheckRole.includes("5.3.2") ||
      window.location.href.includes("5.3.2") ||
      activeTitleText.includes("n\u0103ng l\u1EF1c") ||
      textToCheckRole.includes("năng lực") ||
      textToCheckRole.includes("phẩm chất");
    let isTrangDGTX =
      textToCheckRole.includes("5.3.4") ||
      window.location.href.includes("5.3.4") ||
      activeTitleText.includes("thường xuyên") ||
      activeTitleText.includes("th\u01B0\u1EDDng xuy\xEAn") ||
      textToCheckRole.includes("đánh giá thường xuyên") ||
      textToCheckRole.includes("danh gia thuong xuyen") ||
      textToCheckRole.includes("đgtx") ||
      activeTitleText.includes("dgtx");

    const isVnEdu = window.location.hostname.includes("vnedu");

    if (isVnEdu) {
      // Enforce VnEdu specific logic (VnEdu doesn't use 5.3.1, 5.3.2, 5.3.4 schemas like SMAS)
      let titleAndTab = activeTitleText + " " + window.location.href.toLowerCase();
      let isSoDiemOrNhanXet = activeTitleText.includes("sổ nhận xét") || 
                              activeTitleText.includes("sổ điểm") || 
                              activeTitleText.includes("sổ ghi điểm") || 
                              activeTitleText.includes("nhận xét môn học");

      let isHocBaPage = (
        activeTitleText.includes("phẩm chất - năng lực") ||
        activeTitleText.includes("năng lực, phẩm chất") ||
        activeTitleText.includes("năng lực - phẩm chất") ||
        activeTitleText.includes("phẩm chất - năn") ||
        (activeTitleText.includes("học bạ") && activeTitleText.includes("năng lực") && activeTitleText.includes("phẩm chất"))
      ) && !isSoDiemOrNhanXet;

      if (isHocBaPage) {
        role = "VNEDU_NLPC_HB";
      } else if (activeTitleText.includes("hiệu trưởng") || activeTitleText.includes("phê duyệt của hiệu trưởng") || document.body.innerText.match(/Hiệu trưởng:\s/i)) {
        role = "HIEU_TRUONG";
      } else if (
        activeTitleText.includes("giáo viên chủ nhiệm") ||
        activeTitleText.includes("gvcn") ||
        activeTitleText.includes("nhận xét của giáo viên chủ nhiệm") ||
        activeTitleText.includes("đánh giá của giáo viên chủ nhiệm") ||
        activeTitleText.includes("nhận xét gvcn") ||
        (activeTitleText.includes("sổ học bạ") && !activeTitleText.includes("hiệu trưởng") && !activeTitleText.includes("phẩm chất") && !activeTitleText.includes("năng lực")) ||
        (activeTitleText.includes("sổ học bạ") && document.body.innerText.match(/Giáo viên chủ nhiệm:\s/i))
      ) {
        role = "HOC_BA_GVCN";
      } else if (isSoDiemOrNhanXet) {
        role = "GVBM";
      } else {
        role = "GVBM"; // Default for VnEdu entries
      }
    } else {
      // SMAS / CSDL Ngành logic
      let gridHeaderStr = Array.from(document.querySelectorAll("th, .x-grid3-hd, .k-header, .e-headercell, tr:first-child td, thead td")).map(h => h.innerText).join(" ").toLowerCase();
      let isSmasHost = window.location.hostname.includes("smas") || textToCheckRole.includes("smas");
      if (isTrangDGTX) {
        role = "DGTX";
      } else if (isTrangNLPC) {
        role = "TH_NLPC";
        capHoc = "TH";
      } else if (activeTitleText.includes("sổ ghi nhận xét") || activeTitleText.includes("sổ đánh giá môn học") || activeTitleText.includes("1.3") || document.title.toLowerCase().includes("sổ đánh giá môn học") || gridHeaderStr.includes("đđg") || gridHeaderStr.includes("đdg gk") || gridHeaderStr.includes("tbm hki")) {
        role = isSmasHost ? "SO_GHI_NHAN_XET" : "GVBM";
      } else if (
        is533 ||
        activeTitleText.includes("nhận xét in học bạ của gvcn") ||
        activeTitleText.includes("nhận xét của giáo viên chủ nhiệm") ||
        activeTitleText.includes("đánh giá của giáo viên chủ nhiệm") ||
        activeTitleText.includes("nhập nhận xét gvcn") ||
        activeTitleText.includes("sổ học bạ") ||
        (activeTitleText.includes("chủ nhiệm") && !activeTitleText.includes("môn học")) ||
        (activeTitleText.includes("gvcn") && !activeTitleText.includes("bộ môn")) ||
        textToCheckRole.includes("nhận xét của giáo viên chủ nhiệm") ||
        textToCheckRole.includes("nhận xét đánh giá của gvcn") ||
        textToCheckRole.includes("nhập nhận xét gvcn") ||
        textToCheckRole.includes("7.4.2")
      ) {
        role = "HOC_BA_GVCN";
      }
      else if (
        textToCheckRole.includes("hi\u1EC7u tr\u01B0\u1EDFng") ||
        activeTitleText.includes("hiệu trưởng")
      )
        role = "HIEU_TRUONG";
      else if (textToCheckRole.includes("sổ ghi nhận xét")) {
        role = window.location.hostname.includes("smas") || textToCheckRole.includes("smas") ? "SO_GHI_NHAN_XET" : "GVBM";
      }
      else if (
        textToCheckRole.includes("b\u1ED9 m\xF4n") ||
        textToCheckRole.includes("gvbm") ||
        (capHoc !== "TH" && textToCheckRole.includes("h\u1ECDc b\u1EA1")) // Only map to HOC_BA_GVBM if it explicitly says học bạ
      ) {
        role = "HOC_BA_GVBM";
      }
      else if (
        textToCheckRole.includes("5.3.1") ||
        textToCheckRole.includes("\u0111\u1ECBnh k\u1EF3 m\xF4n h\u1ECDc") ||
        textToCheckRole.includes("nh\u1EADn x\xE9t m\xF4n h\u1ECDc") ||
        textToCheckRole.includes("nhận xét môn học")
      )
        role = "GVBM";
    }

    if (db[capHoc] && db[capHoc][khoiLop] && db[capHoc][khoiLop].GVBM) {
      const availSubs = Object.keys(db[capHoc][khoiLop].GVBM);
      // ONLY use base subjects for matching the valSet initially
      const baseSubs = Array.from(
        new Set(availSubs.map((s) => s.split("_")[0])),
      ).sort((a, b) => b.length - a.length);

      const vnEduSubMap = {
        "Tiếng Anh": "Ngoại ngữ",
        "TN-XH": "Tự nhiên và Xã hội",
        "Tin học và Công nghệ (Tin học)": "Tin học",
        "Tin học và Công nghệ (Công nghệ)": "Công nghệ",
        "GDCD": "Giáo dục công dân",
        "Mỹ thuật": "Mĩ thuật",
        "Mỹ": "Mĩ thuật",
        "Mĩ": "Mĩ thuật",
        "Môn Mỹ thuật": "Mĩ thuật",
        "Môn Mĩ thuật": "Mĩ thuật"
      };

      let pageTextRaw = document.body.innerText.replace(/\s+/g, " ");
      let lowerPageTextRaw = pageTextRaw.toLowerCase();
      let splitDoc = lowerPageTextRaw.split("danh sách đánh giá");
      let lowerPageText = splitDoc[0];
      lowerPageText = lowerPageText.split("danh sách học sinh")[0];
      lowerPageText = lowerPageText.split("danh sách học sinh đánh giá")[0];
      lowerPageText = lowerPageText.split("tổng số học sinh")[0];

      // Add explicit robust check for selects first
      const getSubjectFromSelects = () => {
        const selects = document.querySelectorAll("select, input.k-input, .rcbInput, .rcbReadOnly, .select2-selection__rendered");
        for (const s of selects) {
          if (!s.offsetWidth && !s.offsetHeight) continue; // Ignore hidden elements
          if (s.closest('table[class*="table"], .x-grid-panel, .x-grid3, .e-grid, .k-grid, .e-spreadsheet, table.table')) continue; // Ignore inputs in grids
          let text = "";
          if (s.tagName?.toLowerCase() === "select") {
            text = s.options[s.selectedIndex]?.text;
          } else if (s.tagName?.toLowerCase() === "input") {
            text = s.value;
          } else {
            text = s.innerText;
          }
          text = text?.trim().toLowerCase();
          
          if (!text || text.length > 50) continue;

          let matchSpecific = text.match(/\(([^)]+)\)/);
          if (matchSpecific) {
            let inner = matchSpecific[1].trim();
            let foundBase = baseSubs.find(s => s.toLowerCase() === inner);
            if (foundBase) {
              console.log("[Extension] Matched subject from parentheses in select:", foundBase);
              return foundBase;
            }
            for (const [vnName, oName] of Object.entries(vnEduSubMap)) {
              if (vnName.toLowerCase() === inner) {
                console.log("[Extension] Matched subject from parentheses (vnEduMap) in select:", oName);
                return oName;
              }
            }
          }
          
          for (const [vnName, oName] of Object.entries(vnEduSubMap)) {
            let lowerVnName = vnName.toLowerCase();
            let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lowerVnName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
            if (text === lowerVnName || regex.test(text)) {
              console.log("[Extension] Matched subject from explicit select (vnEduMap):", oName);
              return oName;
            }
          }
          
          for (const sub of baseSubs) {
            let lowerSub = sub.toLowerCase();
            let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lowerSub.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
            if (text === lowerSub || regex.test(text)) {
              console.log("[Extension] Matched subject from explicit select:", sub);
              return sub;
            }
          }
        }
        return null;
      };
      
      // Explicit DOM Search for Labels matching "Môn"
      let foundMon = false;
      for (let el of document.querySelectorAll('td, label, span, div')) {
        if (el.closest('table[class*="table"], .x-grid-panel, .x-grid3, .e-grid, .k-grid, .e-spreadsheet, table.table')) continue;
        let txt = (el.innerText || "").toLowerCase().trim();
        if (txt.length > 50) continue; // Skip large text blocks
        
        let matchSubjectDirectly = null;
        if (txt.startsWith("môn") || txt.startsWith("môn học") || txt.startsWith("môn thi")) {
             let afterMon = txt.replace(/^(môn học\/hđgd|môn học|môn thi|môn)[\s:]*/, "").trim();
             if (afterMon) {
                 let foundBase = baseSubs.find(s => {
                      let lower = s.toLowerCase();
                      let regex = new RegExp(`^${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                      return afterMon === lower || regex.test(afterMon);
                 });
                 if (foundBase) matchSubjectDirectly = foundBase;
                 else {
                     for (const [vnName, oName] of Object.entries(vnEduSubMap)) {
                         let lower = vnName.toLowerCase();
                         let regex = new RegExp(`^${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                         if (afterMon === lower || regex.test(afterMon)) {
                             matchSubjectDirectly = oName; break;
                         }
                     }
                 }
             }
        }
        
        if (matchSubjectDirectly) {
            subject = matchSubjectDirectly;
            foundMon = true;
            console.log("[Extension] Matched subject directly from text:", subject, txt);
            break;
        }

        // Updated label matching to match user request precisely
        if (txt === "môn" || txt === "môn học" || txt === "môn:" || txt === "môn học:" || txt === "môn thi:" || txt === "môn học/hđgd:") {
          // Look at parent/sibling inputs
          let parent = el.parentElement;
          let walkArea = parent?.parentElement || parent;
          if (walkArea) {
            let inputsInArea = walkArea.querySelectorAll('input:not([type="hidden"]), select, .k-input, .select2-selection__rendered, .x-form-text, .rcbInput');
            for (let inp of inputsInArea) {
              let iv = normVal(inp).toLowerCase();
              let matchedSub = null;
              
              let matchSpecific = iv.match(/\(([^)]+)\)/);
              if (matchSpecific) {
                let inner = matchSpecific[1].trim();
                let foundBase = baseSubs.find(s => s.toLowerCase() === inner);
                if (foundBase) matchedSub = foundBase;
                else {
                  for (const [vnName, oName] of Object.entries(vnEduSubMap)) {
                    if (vnName.toLowerCase() === inner) {
                       matchedSub = oName; break;
                    }
                  }
                }
              }
              
              if (!matchedSub) {
                for (const [vnName, oName] of Object.entries(vnEduSubMap)) {
                  let lower = vnName.toLowerCase();
                  let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                  if (iv === lower || regex.test(iv)) {
                    matchedSub = oName;
                    break;
                  }
                }
              }
              
              if (!matchedSub) {
                matchedSub = baseSubs.find(s => {
                    let lower = s.toLowerCase();
                    let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                    return iv === lower || regex.test(iv);
                });
              }
              
              if (matchedSub) {
                subject = matchedSub;
                foundMon = true;
                break;
              }
            }
          }
        }
        if (foundMon) break;
      }
      
      // Check active tabs in Smas or VNPT
      if (!foundMon) {
        // Build a list of candidate active elements
        let activeElements = Array.from(document.querySelectorAll('.active, .selected, .e-active, [class*="active"], [class*="selected"], [class*="current"], .nav-link.active, .nav-tabs li.active a, .x-tab-active, .x-tab-strip-active, .Mui-selected, [aria-selected="true"]'));
        
        // Match base subjects or vnEdu maps on active tabs specifically
        for (const sub of baseSubs) {
          let sLow = sub.toLowerCase();
          // Find any active element that contains or equals the subject name
          let tab = activeElements.find(el => {
              let text = el.innerText.replace(/\s+/g, " ").toLowerCase().trim();
              if (text === sLow || text === "môn " + sLow) {
                  return true;
              }
              // Also support vnEdu formats / specific combinations
              for (const [vnName, oName] of Object.entries(vnEduSubMap)) {
                  if (oName === sub && (text === vnName.toLowerCase() || text === "môn " + vnName.toLowerCase())) {
                      return true;
                  }
              }
              return false;
          });
          if (tab) {
              subject = sub;
              foundMon = true;
              console.log("[Extension] Highly precise match for active subject tab:", subject, tab.innerText);
              break;
          }
        }

        if (!foundMon) {
          // If highly precise match didn't work, fallback to the traditional loop on elements that contain class indicating active
          let activeTabs = document.querySelectorAll('.e-item.e-active .e-tab-text, li.e-active .e-tab-text, .nav-tabs li.active a, .nav-tabs .active, .nav-item .active, .nav-link.active, .active-tab, li.active span, .x-tab-active, .x-tab-strip-active, .k-state-active, li.ui-tabs-active, .tabs-selected, ul.nav > li.active, ul.tabs > li.active, [aria-selected="true"], .Mui-selected, li.current, .current, a.current, li.active, a.active, li.selected, a.selected, .active, .selected, .e-active');
          for (let tab of activeTabs) {
            let tabTxt = tab.innerText.replace(/\s+/g, " ").toLowerCase().trim();
            if (tabTxt.length > 50) continue; 
            let matchedSub = baseSubs.find(s => {
                let lower = s.toLowerCase();
                let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                return tabTxt === lower || regex.test(tabTxt);
            });
            if (!matchedSub) {
              matchedSub = Object.keys(vnEduSubMap).find(s => {
                  let lower = s.toLowerCase();
                  let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                  return tabTxt === lower || regex.test(tabTxt);
              });
              if (matchedSub) {
                  matchedSub = vnEduSubMap[matchedSub];
              }
            }
            if (matchedSub) {
              subject = matchedSub;
              foundMon = true;
              console.log("[Extension] Matched subject from active tab fallback:", subject, tab);
              break;
            }
          }
        }
      }
      
      if (foundMon) {
        console.log("[Extension] Matched explicit subject from DOM label:", subject);
      } else {
        // Fallback to getSubjectFromSelects()
        subject = getSubjectFromSelects() || subject;
      }

      // 1. HIGHEST PRIORITY: Match explicit pattern in valSet e.g., (...)
      if (!subject) {
        for (const val of valSet) {
          let matchSpecific = val.match(/\(([^)]+)\)/);
          if (matchSpecific) {
            let inner = matchSpecific[1].trim().toLowerCase();
            let found = baseSubs.find((s) => s.toLowerCase() === inner);
            if (!found) {
              for (const [vnEduName, ourName] of Object.entries(vnEduSubMap)) {
                if (vnEduName.toLowerCase() === inner) {
                  found = ourName;
                  break;
                }
              }
            }
            if (found) {
              subject = found;
              console.log(
                "[Extension] Matched subject from parentheses priority:",
                subject,
              );
              break;
            }
          }
        }
      }

      // Try parsing headers explicitly
      if (!subject) {
          let headers = document.querySelectorAll('.page-title, h1, h2, h3, .breadcrumb, .title');
          for (let header of headers) {
              let text = header.innerText.toLowerCase();
              if (text.length > 50) continue;
              let matchedSub = baseSubs.find(s => {
                  let lower = s.toLowerCase();
                  let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                  return text === lower || regex.test(text);
              });
              if (matchedSub) { subject = matchedSub; break; }
              matchedSub = Object.keys(vnEduSubMap).find(s => {
                  let lower = s.toLowerCase();
                  let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lower.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
                  return text === lower || regex.test(text);
              });
              if (matchedSub) { subject = vnEduSubMap[matchedSub]; break; }
          }
      }

      if (!subject) {
        for (const val of valSet) {
          const lowVal = val.toLowerCase();

          // Match explicit pattern in valSet e.g., (...)
          let matchSpecific = val.match(/\(([^)]+)\)/);
          if (matchSpecific) {
            let inner = matchSpecific[1].trim().toLowerCase();
            let found = baseSubs.find((s) => s.toLowerCase() === inner);
            if (!found) {
              for (const [vnEduName, ourName] of Object.entries(vnEduSubMap)) {
                if (vnEduName.toLowerCase() === inner) {
                  found = ourName;
                  break;
                }
              }
            }
            if (found) {
              subject = found;
              break;
            }
          }

          // Match exact vnedu map in valSet
          for (const [vnEduName, ourName] of Object.entries(vnEduSubMap)) {
            let lowerVnEduName = vnEduName.toLowerCase();
            let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lowerVnEduName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
            if (lowVal === lowerVnEduName || regex.test(lowVal)) {
              subject = ourName;
              break;
            }
          }
          if (subject) break;

          // Loose match in valSet
          for (const sub of baseSubs) {
            let lowerSub = sub.toLowerCase();
            let regex = new RegExp(`^(?:môn(?:\\s+học)?(?:[\\s:]+)?)?${lowerSub.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}(?:\\s*\\(.*\\)|\\s*-.*)?$`);
            if (lowVal === lowerSub || regex.test(lowVal)) {
              subject = sub;
              break;
            }
          }

          if (subject) break;
        }
      }

      if (!subject) {
        if (Array.from(valSet).some(v => v && v.toLowerCase().includes("sổ tổng hợp các môn"))) {
          throw new Error("Môn 'Sổ tổng hợp các môn' hiện tại chưa có kho nhận xét (hoặc chưa được cấu hình). Hệ thống chưa thể tự động điền môn này.");
        }
      }

      if (!subject && !["TH_NLPC", "HOC_BA_GVCN", "HIEU_TRUONG", "VNEDU_NLPC_HB", "DGTX"].includes(role)) {
        throw new Error("Hệ thống không thể tự động nhận diện môn học. Vui lòng đảm bảo bạn đang ở Sổ đánh giá môn học, hoặc thử nhấp chuột vào một ô nhập liệu nhận xét trước khi ấn Điền.");
      }
    }

    const getEmptySubjectVnEdu = (mon, kyDanhGia) => {
      const m = mon ? mon.toLowerCase() : "môn học";
      const kyText =
        kyDanhGia === "Cả Năm Mặc định"
          ? "trong năm học này"
          : `trong ${kyDanhGia.toLowerCase()}`;

      const th_T = [
        `Em nắm vững kiến thức trọng tâm môn ${m}, thể hiện xuất sắc ${kyText}.`,
        `Có kĩ năng thực hành thành thạo môn ${m}, tư duy nhạy bén ${kyText}.`,
        `Thường xuyên chủ động, sáng tạo khi hoàn thành các bài học môn ${m} ${kyText}.`,
        `Tích cực tham gia xây dựng bài, có ý thức tự học đáng khen ngợi ${kyText}.`,
        `Tiếp thu bài nhanh môn ${m}, biết vận dụng kiến thức vào giải quyết vấn đề hiệu quả ${kyText}.`,
        `Luôn hoàn thành xuất sắc các bài tập môn ${m} được giao, là tấm gương sáng ${kyText}.`,
        `Có năng lực tư duy logic tốt đối với môn ${m}, kết quả học tập vượt trội ${kyText}.`,
        `Chăm ngoan, đánh giá môn ${m} đạt nhiều thành tích cao ${kyText}.`,
        `Khả năng nắm bắt kiến thức môn ${m} sâu sắc, trình bày mạch lạc ${kyText}.`,
        `Luôn cố gắng vươn lên, duy trì kết quả học tập môn ${m} rất xuất sắc ${kyText}.`,
        `Tiến bộ rõ rệt trong kỹ năng và kiến thức môn ${m}, kết quả rất đáng khích lệ ${kyText}.`,
        `Năng động, tự tin trong các hoạt động, nắm vững môn ${m} ${kyText}.`,
        `Phát huy tốt khả năng tự học tự rèn môn ${m}, hoàn thành xuất sắc yêu cầu ${kyText}.`,
        `Kết quả đánh giá môn ${m} phản ánh đúng sự nỗ lực ${kyText}.`,
        `Quan sát tốt, nhạy bén và xử lý linh hoạt trong môn ${m} ${kyText}.`,
        `Nắm chắc lý thuyết và vận dụng thực hành rất hiệu quả môn ${m} ${kyText}.`,
        `Thể hiện sự tập trung cao độ, thái độ học tập môn ${m} nghiêm túc ${kyText}.`,
        `Có tinh thần trách nhiệm cao môn ${m}, ghi nhớ kiến thức rất tốt ${kyText}.`,
        `Giao tiếp tự tin, trả lời các vấn đề môn ${m} rất mạch lạc ${kyText}.`,
        `Em có năng khiếu học tốt môn ${m}, tư duy sáng tạo phát triển ${kyText}.`,
      ];

      const th_H = [
        `Em nắm được kiến thức nền tảng vững vàng môn ${m}, có cố gắng ${kyText}.`,
        `Hoàn thành tốt các nhiệm vụ được giao môn ${m}, cần mạnh dạn phát biểu hơn ${kyText}.`,
        `Có ý thức học tập tốt, kĩ năng làm bài môn ${m} có tiến bộ trưởng thành ${kyText}.`,
        `Hiểu và vận dụng cơ bản kiến thức môn ${m}, thái độ học tập tích cực ${kyText}.`,
        `Làm bài môn ${m} cẩn thận, biết rèn luyện kĩ năng, kết quả đạt mức khá ${kyText}.`,
        `Cần rèn luyện thêm chút tự tin môn ${m}, thành tích em có thể vươn xa ${kyText}.`,
        `Nắm vững yêu cầu môn ${m}, chăm chỉ ôn tập ${kyText}.`,
        `Biết ứng dụng kiến thức môn ${m} vào thực tế ở mức độ khá ${kyText}.`,
        `Luôn chú ý nghe giảng môn ${m}, tự giác học tập ở nhà tốt ${kyText}.`,
        `Hiểu ý chính của bài giảng môn ${m}, nhưng cần diễn đạt trọn vẹn hơn ${kyText}.`,
        `Tiếp thu bài môn ${m} ở mức khá, cần đọc kỹ bài hơn để tránh sai sót ${kyText}.`,
        `Có tiến bộ trong quá trình học môn ${m}, tập trung hơn nữa sẽ thành công ${kyText}.`,
        `Em có khả năng môn ${m} phát triển tốt nếu khắc phục sự nhút nhát ${kyText}.`,
        `Đạt yêu cầu môn ${m}, cần trau dồi thêm kĩ năng để nâng cao thành tích ${kyText}.`,
        `Ghi chép bài đầy đủ môn ${m}, nhận thức đạt mức khá ${kyText}.`,
        `Có khả năng ghi nhớ nội dung tương đối tốt môn ${m}, hoàn thành yêu cầu ${kyText}.`,
        `Tinh thần học tập làm bài môn ${m} tích cực, duy trì điểm số ở mức tốt ${kyText}.`,
        `Biết cách học bài môn ${m} hiệu quả, nắm vững các bài học thiết yếu ${kyText}.`,
        `Nỗ lực vươn lên môn ${m} nhưng đôi lúc làm bài kiểm tra còn thiếu cẩn thận ${kyText}.`,
        `Đáp ứng được yêu cầu về kiến thức và kĩ năng môn ${m} ở mức khá ${kyText}.`,
      ];

      const th_C = [
        `Em chưa nắm vững kiến thức môn ${m}, cần cố gắng rất nhiều ${kyText}.`,
        `Kĩ năng nhận thức môn ${m} còn hạn chế, cần gia đình quan tâm hơn ${kyText}.`,
        `Đôi lúc thiếu tập trung trong giờ học môn ${m}, kết quả chưa tốt ${kyText}.`,
        `Dành khoảng thời gian ưu tiên ôn lại kiến thức cơ bản môn ${m} bị hổng ${kyText}.`,
        `Nhận thức môn ${m} chưa đạt yêu cầu, cần mạnh dạn trao đổi cùng thầy cô ${kyText}.`,
      ];

      const thcs_Tot = th_T.map((c) => c.replace(/\.$/, ` (Mức Tốt).`));
      const thcs_Kha = th_H.map((c) => c.replace(/\.$/, ` (Mức Khá).`));
      const thcs_Dat = [
        `Nắm được kiến thức cơ bản môn ${m}, biết cách làm bài nhưng chưa sáng tạo ${kyText}.`,
        `Kết quả môn ${m} đạt mức trung bình, cần rèn tư duy thêm ${kyText}.`,
        `Phần lớn các yêu cầu môn ${m} đã được hoàn thành nhưng còn sơ suất nhỏ ${kyText}.`,
      ];
      const thcs_ChuaDat = th_C.map((c) => c.replace(/\.$/, ` (Chưa Đạt).`));

      return {
        Tốt: { min: 8, max: 10, code: "T", mucDG: "T", comments: thcs_Tot },
        Khá: { min: 6.5, max: 7.9, code: "K", mucDG: "H", comments: thcs_Kha },
        Đạt: { min: 5, max: 6.4, code: "Đ", mucDG: "H", comments: thcs_Dat },
        "Chưa Đạt": {
          min: 0,
          max: 4.9,
          code: "CĐ",
          mucDG: "C",
          comments: thcs_ChuaDat,
        },
        T: { min: 8, max: 10, code: "T", mucDG: "T", comments: th_T },
        H: { min: 5, max: 7.9, code: "H", mucDG: "H", comments: th_H },
        C: { min: 0, max: 4.9, code: "C", mucDG: "C", comments: th_C },
      };
    };

    const getgetCommentsPoolInner = (poolTarget) => {
      try {
        if (poolTarget === "GVBM") {
          let hkToUse = detectedHocKy;
          if (config && config.fillCaNam) hkToUse = "Cả năm";
          
          if (capHoc === "TH") {
             if (isGiuaKy && detectedHocKy === "Học kỳ 1") hkToUse = "Giữa học kỳ 1";
             else if (!isGiuaKy && detectedHocKy === "Học kỳ 1") hkToUse = "Cuối học kỳ 1";
             else if (isGiuaKy && detectedHocKy === "Học kỳ 2") hkToUse = "Giữa học kỳ 2";
             else if (!isGiuaKy && detectedHocKy === "Học kỳ 2") hkToUse = "Cuối năm học";
          }
          
          const sObj1 = db[capHoc][khoiLop].GVBM[`${subject}_${hkToUse}`];
          const sObj2 = db[capHoc][khoiLop].GVBM[`${subject}_Học kỳ 1`];
          const sObj3 = db[capHoc][khoiLop].GVBM[`${subject}_Học kỳ 2`];
          const sObj4 = db[capHoc][khoiLop].GVBM[subject];
          const found = sObj1 || sObj2 || sObj3 || sObj4;
          if (found) return found;
        }
        if (poolTarget === "SO_GHI_NHAN_XET") {
          let hkToUse = detectedHocKy;
          if (config && config.fillCaNam) hkToUse = "Cả năm";
          const sObj1 = db[capHoc][khoiLop].SO_GHI_NHAN_XET[`${subject}_${hkToUse}`];
          const sObj2 = db[capHoc][khoiLop].SO_GHI_NHAN_XET[`${subject}_Học kỳ 1`];
          const sObj3 = db[capHoc][khoiLop].SO_GHI_NHAN_XET[`${subject}_Học kỳ 2`];
          const sObj4 = db[capHoc][khoiLop].SO_GHI_NHAN_XET[subject];
          const found = sObj1 || sObj2 || sObj3 || sObj4;
          if (found) return found;
        }
        if (poolTarget === "TH_NLPC") {
          let p = db["TH"]?.[khoiLop]?.TH_NLPC;
          if (!p && db["TH"]) {
            let firstKhoi = Object.keys(db["TH"])[0];
            p = db["TH"][firstKhoi]?.TH_NLPC;
          }
          return p || db[capHoc]?.[khoiLop]?.TH_NLPC;
        }
        if (poolTarget === "DGTX") return db[capHoc][khoiLop].DGTX;
        if (poolTarget === "HIEU_TRUONG") return db[capHoc][khoiLop].HIEU_TRUONG;
        if (poolTarget === "HOC_BA_GVBM") return db[capHoc][khoiLop].HOC_BA_GVBM;
        if (poolTarget === "HOC_BA_GVCN") return db[capHoc][khoiLop].HOC_BA_GVCN;
        if (poolTarget === "VNEDU_NLPC_HB") return db[capHoc][khoiLop].VNEDU_NLPC_HB;
      } catch (e) {
        return null;
      }
      return null;
    };
    const getCommentsPool = () => getgetCommentsPoolInner(role);
    const getGvbmPool = () => getgetCommentsPoolInner("GVBM");
    const getHocBaGvbmPool = () => getgetCommentsPoolInner("HOC_BA_GVBM");
    const getSoGhiNhanXetHk2Pool = () => db[capHoc]?.[khoiLop]?.SO_GHI_NHAN_XET?.[`${subject}_Học kỳ 2`] || db[capHoc]?.[khoiLop]?.SO_GHI_NHAN_XET?.[subject];
    const getSoGhiNhanXetCnPool = () => db[capHoc]?.[khoiLop]?.SO_GHI_NHAN_XET?.[`${subject}_Cả năm`] || db[capHoc]?.[khoiLop]?.SO_GHI_NHAN_XET?.[subject];
    const commentsPool = getCommentsPool();
    const gvbmPool = getGvbmPool();
    const hocBaGvbmPool = getHocBaGvbmPool();
    const soGhiNhanXetHk2Pool = getSoGhiNhanXetHk2Pool();
    const soGhiNhanXetCnPool = getSoGhiNhanXetCnPool();
    if (!commentsPool)
      throw new Error(
        "Kh\xF4ng t\xECm th\u1EA5y kho nh\u1EADn x\xE9t ph\xF9 h\u1EE3p.",
      );
    if (role === "DGTX") {
      return await dienNhanXetDGTXAsync(
        config,
        commentsPool,
        capHoc,
        subject,
        khoiLop,
        db,
      );
    }
    if (role === "TH_NLPC" || window.location.href.includes("5.3.2") || textToCheckRole.includes("5.3.2")) {
      return await dienNhanXetNLPCAsync(config, commentsPool, subject);
    }
    let is532 = window.location.href.includes("5.3.2") || textToCheckRole.includes("5.3.2") ||
      ((capHoc !== "TH") && (textToCheckRole.includes("nh\u1EADn x\xE9t m\xF4n h\u1ECDc") || textToCheckRole.includes("nhận xét môn học")));
    if (
      role === "HOC_BA_GVCN" ||
      (role === "HOC_BA_GVBM" && !is532) ||
      role === "HIEU_TRUONG"
    ) {
      let ctx = { capHoc, khoiLop, detectedHocKy, isGiuaKy, isCuoiKy, textToCheckRole, activeTitleText };
      return await dienNhanXetHocBaRandom(config, commentsPool, subject, role, ctx, db);
    }
    if (role === "VNEDU_NLPC_HB") {
      return await dienNhanXetVNEDUNLPC(config, commentsPool);
    }
    const getRandom = (arr) =>
      arr && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "";
    const dispatchEvents = (element) => {
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    };

    let keepScrolling = true;
    let loopProtect = 0;
    let emptyPassCount = 0;
    let successCount = 0;
    let successfulRows = new Set();
    let processedRows = new Set();
    let visibleTextareas = [];

    // PATCH VNEDU POPUPS (Avoid inline script injection that violates page CSP)
    const patchVnEduPopups = () => {
      try {
        if (window.radalert) window.radalert = function() { console.log('Suppressed radalert'); return false; };
        if (window.radconfirm) window.radconfirm = function() { console.log('Suppressed radconfirm'); return false; };
      } catch (e) {}
    };
    patchVnEduPopups();

    while (keepScrolling && loopProtect < 40) {
      loopProtect++;
      let filledInThisPass = 0;

      let selector = "textarea, input[type='text'], input:not([type]), div[contenteditable='true'], td[contenteditable='true']";
      let allTextareas = Array.from(
        document.querySelectorAll(selector)
      );
      visibleTextareas = allTextareas.filter((ta) => {
        if (ta.offsetWidth === 0 || ta.offsetHeight === 0) return false;
        if (ta.tagName.toLowerCase() === "input") {
             if (ta.offsetWidth < 50) return false;
             if (ta.maxLength > 0 && ta.maxLength <= 15) return false;
        }
        let p = ta.closest("tr, [role='row']");
        if (p && p.innerText.toLowerCase().includes("nhập vào đây và enter")) return false;
        if (ta.placeholder && ta.placeholder.toLowerCase().includes("nhập vào đây và enter")) return false;
        if (ta.value && ta.value.toLowerCase().includes("nhập vào đây và enter")) return false;
        let rect = ta.getBoundingClientRect();
        return (
          rect.width >= 50 &&
          getComputedStyle(ta).visibility !== "hidden" &&
          !ta.disabled &&
          !ta.readOnly
        );
      });

      let rowToTextareas = new Map();
      for (let ta of visibleTextareas) {
        let row = ta.closest("tr, [role='row']");
        if (!row) continue;
        if (!rowToTextareas.has(row)) rowToTextareas.set(row, []);
        rowToTextareas.get(row).push(ta);
      }

      let finalTargets = [];
      for (let tas of rowToTextareas.values()) {
        let actualTAs = tas;
        
        // If the row contains both INPUT and TEXTAREA, assume INPUT is "Mã nhận xét" and filter it out.
        let hasTextarea = actualTAs.some(ta => ta.tagName.toLowerCase() === "textarea" || ta.tagName.toLowerCase() === "div");
        if (hasTextarea) {
           actualTAs = actualTAs.filter(ta => ta.tagName.toLowerCase() !== "input");
        }

        if (actualTAs.length > 1) {
          // In SMAS 5.3.2 (HK2) or Sổ Đánh giá môn học, there are two textareas per row. Let's fill both!
          if (is532 || (window.location.hostname.includes("smas") && actualTAs.length === 2)) {
            if (activeTitleText.includes("sổ ghi nhận xét") || textToCheckRole.includes("sổ ghi nhận xét") || window.location.hostname.includes("smas")) {
              actualTAs[0].dataset.targetRole = "SO_GHI_NHAN_XET_HK2";
              actualTAs[1].dataset.targetRole = "SO_GHI_NHAN_XET_CN";
            } else {
              actualTAs[0].dataset.targetRole = "GVBM";
              actualTAs[1].dataset.targetRole = "HOC_BA_GVBM";
            }
            finalTargets.push(actualTAs[0], actualTAs[1]);
          } else if (isVnEdu) {
            // For VnEdu Sổ Nhận xét, if there's a "Ngày nhập" column, we ignore it.
            // Assuming "Nhận xét" is the first textarea.
            actualTAs[0].dataset.targetRole = "GVBM";
            finalTargets.push(actualTAs[0]);
          } else {
            finalTargets.push(...actualTAs);
          }
        } else if (actualTAs.length === 1) {
          if (is532) actualTAs[0].dataset.targetRole = "GVBM";
          finalTargets.push(actualTAs[0]);
        }
      }
      visibleTextareas = finalTargets;
      
      let dataRowsCount = document.querySelectorAll("tr, [role='row']").length;
      // CLICK-TO-EDIT / CSDL NGÀNH / SMAS / RADGRID FALLBACK
      let isSmasGridPage = window.location.hostname.includes("smas") || textToCheckRole.includes("smas") ||
                           textToCheckRole.includes("5.3.1") || textToCheckRole.includes("5.3.2") ||
                           textToCheckRole.includes("nhapdiem") || window.location.href.toLowerCase().includes("nhapdiem") ||
                           window.location.hostname.includes("edu.vn") || window.location.hostname.includes("moet.gov.vn");
      let isNhanXetGrid = activeTitleText.includes("sổ ghi nhận xét") || activeTitleText.includes("sổ đánh giá môn học") ||
                          activeTitleText.includes("nhập điểm") || textToCheckRole.includes("5.3.1") ||
                          document.title.toLowerCase().includes("sổ đánh giá môn học");
      if (loopProtect === 1 && ((isSmasGridPage && isNhanXetGrid) || visibleTextareas.length === 0 || (visibleTextareas.length <= 3 && visibleTextareas.length < (dataRowsCount / 2)))) {
          let poolToUseForGrid = config.fillCaNam ? (hocBaGvbmPool || commentsPool) : commentsPool;
          let ctx = { capHoc, khoiLop, detectedHocKy, isGiuaKy, isCuoiKy, textToCheckRole, activeTitleText };
          let smasResult = await trySmasClickToEditGrid(poolToUseForGrid, subject, config, role, db, ctx);
          if (smasResult && (smasResult.count > 0 || smasResult.gridDetected)) {
              return { 
                  count: smasResult.count, 
                  detectedMon: config.fillCaNam ? `${subject || "Học bạ"} (Cả năm)` : `${subject || "Học bạ"} (${detectedHocKy})`,
                  skippedNoScore: smasResult.skippedNoScore
              };
          }
      }

      for (let i = 0; i < visibleTextareas.length; i++) {
        let oNoiDung = visibleTextareas[i];

        // Check if already processed OR already has content that looks like ours
        let val = (
          oNoiDung.tagName.toLowerCase() === "div"
            ? oNoiDung.innerText
            : oNoiDung.value || ""
        ).trim();
        if (val.length > 10 && loopProtect > 1) continue;

        let row = oNoiDung.closest("tr, [role='row']");
        if (!row) continue;
        let studentKey = "";
        let rowCellsA = row.cells ? Array.from(row.cells) : Array.from(row.querySelectorAll("td, [role='cell']"));
        if (rowCellsA.length > 0) {
          for (let c = 0; c < Math.min(rowCellsA.length, 4); c++) {
            studentKey += (rowCellsA[c].innerText || "").trim() + "_";
          }
        }
        let key = studentKey;
        let visibleTds = Array.from(row.querySelectorAll("td, [role='cell']")).filter(
          (td) => td.offsetWidth > 0,
        );
        let tdNoiDung = oNoiDung.closest("td, [role='cell']");
        let idxNoiDung = visibleTds.indexOf(tdNoiDung);
        
        if (key) {
           key += `_${idxNoiDung}`;
        }
        if (key && processedRows.has(key)) continue;
        if (key) processedRows.add(key);

        try {
          if (idxNoiDung < 1) continue;

          let thText = "";
          let thead = row.closest("table") ? row.closest("table").querySelector("thead, tr:first-child, .x-grid3-header, .e-gridheader") : null;
          if (thead) {
              let ths = Array.from(thead.querySelectorAll("th, td, .x-grid3-hd, .e-headercell"));
              let rectTd = tdNoiDung.getBoundingClientRect();
              let matchingTh = ths.find(th => {
                   let rectTh = th.getBoundingClientRect();
                   return rectTh.width > 0 && Math.abs((rectTh.left + rectTh.width/2) - (rectTd.left + rectTd.width/2)) < Math.max(20, rectTd.width / 2);
              });
              if (matchingTh) thText = matchingTh.innerText || matchingTh.textContent;
          }
          if (!thText) {
              let match = (tdNoiDung.className || "").match(/x-grid3-td-(\d+)|e-rowcell-col(\d+)/i);
              if (match) {
                   let colId = match[1] || match[2];
                   let hd = document.querySelector(`.x-grid3-hd-${colId}, .e-headercell.e-col${colId}`);
                   if (hd) thText = hd.innerText || hd.textContent;
              }
          }
          
          let cTxtMain = (thText || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/\s+/g, "").toLowerCase();
          let cTxtTd = (tdNoiDung.className || "") + " " + (tdNoiDung.getAttribute("data-field") || "");
          cTxtTd = cTxtTd.toLowerCase();
          
          // Use td attribute heuristics as well
          if (cTxtMain.includes("manx") || cTxtMain.includes("manhanxet") || cTxtTd.includes("manx") || cTxtTd.includes("manhanxet")) {
              continue;
          }
          // Fix for center matching: if there's a previous cell and we are checking an input, sometimes it's "Mã nhận xét".
          // If we are at index 4 (before 5), it might be mã nhận xét.
          // Let's use getCellIndex logic from trySmasClickToEditGrid to be 100% sure about the column header in the fallback loop!
          if (thead) {
              let allThs = Array.from(thead.querySelectorAll("th, td"));
              let myColIndex = visibleTds.indexOf(tdNoiDung);
              // Simply check if any TH in the table contains "mã nhận xét" and has the same cellIndex or colIndex
              for(let th of allThs) {
                 if (th.cellIndex === myColIndex) {
                     let txt = (th.innerText || th.textContent || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/\s+/g, "").toLowerCase();
                     if (txt.includes("noidung")) {
                         // This is definitely Nội dung, not Mã nhận xét
                         continue;
                     }
                     if (txt.includes("manx") || txt.includes("manhanxet")) {
                         cTxtMain = "manhanxet";
                         break;
                     }
                 }
              }
          }
          if (cTxtMain.includes("manx") || cTxtMain.includes("manhanxet")) {
              continue;
          }


          let mucDatDuoc = "";
          let oMaNX = null;
          let currentManualCode = "";

          const getCellScoreValue = (cell) => {
            if (!cell) return "";
            let inputs = Array.from(
              cell.querySelectorAll("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea, select, .rcbInput, .k-input, .select2-selection__rendered")
            );
            for (let inp of inputs) {
              let val = "";
              if (inp.tagName && inp.tagName.toLowerCase() === "select") {
                val = inp.options && inp.selectedIndex >= 0 ? inp.options[inp.selectedIndex]?.text || inp.value : inp.value;
              } else if (inp.value !== undefined) {
                val = inp.value;
              } else {
                val = inp.innerText || inp.textContent;
              }
              val = (val || "").replace(/[\u00A0\u200B]/g, " ").trim().toUpperCase();
              if (val) return val;
            }
            return (cell.innerText || cell.textContent || "").replace(/[\u00A0\u200B]/g, " ").trim().toUpperCase();
          };

          const isScoreOrLevel = (val) => {
            if (!val) return false;
            let clean = val.replace(/[\u00A0\u200B]/g, " ").trim().toUpperCase();
            const validLetters = ["T", "H", "C", "Đ", "K", "G", "TB", "Y", "CĐ", "TỐT", "KHÁ", "ĐẠT", "CHƯA ĐẠT", "HTT", "HT", "CHT", "GIỎI", "TRUNG BÌNH", "YẾU", "KÉM", "HOÀN THÀNH TỐT", "HOÀN THÀNH", "CHƯA HOÀN THÀNH"];
            if (validLetters.includes(clean)) return true;
            let num = parseFloat(clean.replace(",", "."));
            if (!isNaN(num) && num >= 0 && num <= 10 && clean.match(/^[0-9]+([.,][0-9]+)?$/)) {
              return true;
            }
            return false;
          };

          if (
            isVnEdu &&
            !window.location.href.includes("5.3.2") &&
            !textToCheckRole.includes("5.3.2")
          ) {
            // vnEdu "Sổ nhận xét" & "Sổ điểm" logic
            let colMap = [];

            // First try to find explicit header text mapping by scanning header rows
            let headerRow = Array.from(document.querySelectorAll("tr")).find(
              (r) =>
                r.innerText.includes("Họ và tên") ||
                r.innerText.includes("STT"),
            );
            if (headerRow) {
              let ths = Array.from(headerRow.querySelectorAll("th, td"));
              for (let th of ths) {
                if (th.offsetWidth > 0 || th.offsetHeight > 0) {
                  let span = parseInt(th.getAttribute("colspan")) || 1;
                  let text = th.innerText.toUpperCase().replace(/\s+/g, " ");
                  for (let s = 0; s < span; s++) colMap.push(text);
                }
              }
            }

            let targetColIdx = -1;
            if (colMap.length > 0) {
              let isCaNamCol = oNoiDung.dataset.targetRole === "HOC_BA_GVBM" || config.fillCaNam;
              let evalHeaders = isCaNamCol ? [
                "TB CẢ NĂM", "TBCN", "TB CN", "TBM CN", "XL CN", "XL CK2", "KT CK2", 
                "TBM HK II", "TBM HK 2", "TBM HK2", "ĐTBMHK", "TBHK 2", "TBHK2", "XL", "KT", "ĐĐGCK", "ĐĐG CK",
                "ĐĐG CẢ NĂM", "ĐĐG CN", "ĐĐG", "ĐIỂM ĐG", "ĐIỂM CK", "ĐKT", "ĐKTCK", "ĐIỂM", "ĐIỂM SỐ"
              ] : [
                "TBM HK II", "TBM HK 2", "TBM HK2", "ĐTBMHK", "TBHK 2", "TBHK2", "TBM HK I", "TBM HK 1", "TBM HK1", "TBHK 1", "TBHK1",
                "XL CK2", "KT CK2", "XL GK2", "KT GK2", "XL CK1", "KT CK1", "XL GK1", "KT GK1",
                "XL", "KT", "TB CẢ NĂM", "TBCN", "TB CN", "TBM CN", "XL CN",
                "ĐĐGCK", "ĐĐG CK", "ĐĐGGK", "ĐĐG GK", "ĐĐG GK1", "ĐĐG GK2", "ĐĐG_CK", "ĐĐG_GK",
                "ĐĐG CẢ NĂM", "ĐĐG CN", "ĐĐG", "ĐIỂM ĐG", "ĐIỂM CK", "ĐIỂM GK", "ĐKT", "ĐKTCK", "ĐKTGK",
                "MỨC ĐẠT ĐƯỢC", "MỨC ĐG", "MỨC ĐÁNH GIÁ", "ĐÁNH GIÁ", "KẾT QUẢ", "ĐIỂM", "ĐIỂM SỐ", "KT ĐK", "KTĐK"
              ];

              for (let ext of evalHeaders) {
                for (let c = 0; c < colMap.length; c++) {
                  if (c === idxNoiDung) continue;
                  if (colMap[c].includes(ext)) {
                    targetColIdx = c;
                    break;
                  }
                }
                if (targetColIdx !== -1) break;
              }

              if (targetColIdx !== -1 && targetColIdx < visibleTds.length) {
                let cellScore = getCellScoreValue(visibleTds[targetColIdx]);
                if (isScoreOrLevel(cellScore)) {
                  mucDatDuoc = cellScore;
                }
              }
            }

            // Fallback for Sổ nhận xét if nothing matched (search forward for levels)
            if (targetColIdx === -1 && idxNoiDung + 1 < visibleTds.length) {
              for (let c = idxNoiDung + 1; c < visibleTds.length; c++) {
                let cellScore = getCellScoreValue(visibleTds[c]);
                if (isScoreOrLevel(cellScore)) {
                  mucDatDuoc = cellScore;
                  break;
                }
              }
            }

            // Fallback for Sổ điểm if nothing found (search backward for any score)
            if (targetColIdx === -1 && !mucDatDuoc && idxNoiDung > 0) {
              for (let c = idxNoiDung - 1; c >= 0; c--) {
                let cellScore = getCellScoreValue(visibleTds[c]);
                if (isScoreOrLevel(cellScore)) {
                  mucDatDuoc = cellScore;
                  break;
                }
              }
            }

            // Ưu tiên điểm số nếu tìm thấy mức chữ nhưng có cột điểm lân cận
            if (mucDatDuoc && isNaN(parseFloat(mucDatDuoc.replace(",", ".")))) {
                let colsToCheck = [];
                for (let c = 0; c < visibleTds.length; c++) {
                    if (c !== idxNoiDung) colsToCheck.push(c);
                }
                colsToCheck.sort((a, b) => Math.abs(a - idxNoiDung) - Math.abs(b - idxNoiDung));

                for (let c of colsToCheck) {
                    let val = getCellScoreValue(visibleTds[c]);
                    if (val && !isNaN(parseFloat(val.replace(",", "."))) && parseFloat(val.replace(",", ".")) <= 10 && val.match(/^[0-9]+([.,][0-9]+)?$/)) {
                        mucDatDuoc = val;
                        break;
                    }
                }
            }

            // FINAL fallback for VnEdu SMAS-style 5.3.2 tables
            if (!mucDatDuoc && idxNoiDung >= 2) {
              let tdMaNX = visibleTds[idxNoiDung - 1];
              let tdDiem = visibleTds[idxNoiDung - 2];
              oMaNX = tdMaNX
                ? tdMaNX.querySelector('input:not([type="hidden"])')
                : null;
              let scoreVal = getCellScoreValue(tdDiem);
              if (isScoreOrLevel(scoreVal)) {
                mucDatDuoc = scoreVal;
              }
              currentManualCode = oMaNX ? oMaNX.value.trim() : "";
            }
          } else {
            if (idxNoiDung < 1) continue; 
            
            // Scan backwards to find the score column
            let possibleMatches = [];
            let minC = Math.max(1, idxNoiDung - 4); // Do not scan column 0 (STT) and only scan up to 4 columns back
            for (let c = idxNoiDung - 1; c >= minC; c--) {
              let val = getCellScoreValue(visibleTds[c]);
              if (isScoreOrLevel(val)) {
                possibleMatches.push({ val: val, c: c });
              }
            }
            
            if (possibleMatches.length > 0) {
              let bestMatch = possibleMatches[0];
              
              // Nếu xuất hiện cả điểm số và mức đánh giá, ưu tiên lấy điểm số
              let numericMatch = possibleMatches.find(m => !isNaN(parseFloat(m.val.replace(",", "."))) && m.val.match(/^[0-9]+([.,][0-9]+)?$/));
              let letterMatch = possibleMatches.find(m => ["T", "H", "C", "K", "Đ", "CĐ", "TỐT", "KHÁ", "ĐẠT", "CHƯA ĐẠT", "HTT", "HT", "CHT"].includes(m.val));

              if (numericMatch) {
                bestMatch = numericMatch;
              } else if (letterMatch) {
                bestMatch = letterMatch;
              }
              
              mucDatDuoc = bestMatch.val;
              let c = bestMatch.c;
              
              // Mã NX is usually the cell right after the score
              if (c + 1 < idxNoiDung) {
                let tdMaNX = visibleTds[c + 1];
                oMaNX = tdMaNX ? tdMaNX.querySelector('input:not([type="hidden"])') : null;
                currentManualCode = oMaNX ? oMaNX.value.trim() : "";
              }
            }
          }

          if (!mucDatDuoc) {
            const roleNoScore =
              role === "HOC_BA_GVCN" ||
              role === "HIEU_TRUONG" ||
              role === "DGTX" ||
              (role === "GVBM" && is532) ||
              activeTitleText.includes("sổ ghi nhận xét") ||
              activeTitleText.includes("sổ đánh giá môn học") ||
              currentManualCode;
            if (textToCheckRole.includes("5.3.1")) {
              skippedNoScore++;
              continue;
            }
            if (!roleNoScore) {
              // Cố gắng tìm bất kỳ nhận xét nào trong pool để điền fallback thay vì bỏ qua hoàn toàn
              console.warn(
                `Hàng ${i}: Không phát hiện cột điểm rõ ràng, sẽ sử dụng nhận xét mặc định phù hợp.`,
              );
            }
          }

          let timKiemKhoNhanXet = (muc, manualCode, poolToUse) => {
            if (!poolToUse) return null;
            if (manualCode) {
              let mCodeUpper = manualCode.toUpperCase();
              for (const [lvl, conf] of Object.entries(poolToUse)) {
                if (conf.code && conf.code.toUpperCase() === mCodeUpper) {
                  return {
                    noiDungNhanXet: getRandom(conf.comments),
                    maNX: conf.code || "",
                  };
                }
              }
            }
            if (!muc) {
              let allComments = [];
              for (let p of Object.values(poolToUse)) {
                if (p && p.comments)
                  allComments = allComments.concat(p.comments);
              }
              if (allComments.length > 0) {
                return { noiDungNhanXet: getRandom(allComments), maNX: "" };
              }
              return null;
            }
            let diem = parseFloat(muc.replace(",", "."));
            let isSo = !isNaN(diem) && /^\d/.test(muc);
            for (const [lvl, conf] of Object.entries(poolToUse)) {
              if (
                ["T", "H", "C", "K", "Đ"].includes(lvl) &&
                poolToUse["Tốt"]
              )
                continue;
              if (isSo) {
                if (diem >= (conf.min ?? -1) && diem <= (conf.max ?? 11)) {
                  return {
                    noiDungNhanXet: getRandom(conf.comments),
                    maNX: conf.code || "",
                  };
                }
              } else {
                let target = (conf.mucDG || conf.code || lvl).toUpperCase();
                let m = muc.toUpperCase();
                if (target === m || lvl.toUpperCase() === m) {
                  return {
                    noiDungNhanXet: getRandom(conf.comments),
                    maNX: conf.code || "",
                  };
                }
                const groupT = [
                  "T",
                  "HTT",
                  "T\u1ED0T",
                  "HO\xC0N TH\xC0NH T\u1ED0T",
                ];
                const groupH = ["H", "HT", "HO\xC0N TH\xC0NH", "KH\xC1", "\u0110", "\u0110\u1EA0T"];
                const groupC = [
                  "C",
                  "CHT",
                  "CH\u01AFA HO\xC0N TH\xC0NH",
                  "CH\u01AFA \u0110\u1EA0T",
                  "C\u0110"
                ];
                if (
                  groupT.includes(m) &&
                  (groupT.includes(target) ||
                    groupT.includes(lvl.toUpperCase()))
                )
                  return {
                    noiDungNhanXet: getRandom(conf.comments),
                    maNX: conf.code || "",
                  };
                if (
                  groupH.includes(m) &&
                  (groupH.includes(target) ||
                    groupH.includes(lvl.toUpperCase()))
                )
                  return {
                    noiDungNhanXet: getRandom(conf.comments),
                    maNX: conf.code || "",
                  };
                if (
                  groupC.includes(m) &&
                  (groupC.includes(target) ||
                    groupC.includes(lvl.toUpperCase()))
                )
                  return {
                    noiDungNhanXet: getRandom(conf.comments),
                    maNX: conf.code || "",
                  };
              }
            }
            return null;
          };
          
          let currentPool = commentsPool;
          if (oNoiDung.dataset.targetRole === "GVBM") {
            currentPool = gvbmPool;
          } else if (oNoiDung.dataset.targetRole === "HOC_BA_GVBM") {
            currentPool = hocBaGvbmPool || commentsPool;
          } else if (oNoiDung.dataset.targetRole === "SO_GHI_NHAN_XET_HK2") {
            currentPool = soGhiNhanXetHk2Pool || commentsPool;
          } else if (oNoiDung.dataset.targetRole === "SO_GHI_NHAN_XET_CN") {
            currentPool = soGhiNhanXetCnPool || commentsPool;
          }          
          let matchedData = timKiemKhoNhanXet(mucDatDuoc, currentManualCode, currentPool);
          if (matchedData) {
            let tenHS = "Em";
            let rowCellsB = row.cells ? Array.from(row.cells) : Array.from(row.querySelectorAll("td, [role='cell']"));
            if (rowCellsB.length > 0) {
              for (let c = 1; c < Math.min(rowCellsB.length, 4); c++) {
                let tdItem = rowCellsB[c];
                let txt = tdItem ? tdItem.innerText.trim() : "";
                if (
                  txt &&
                  isNaN(parseFloat(txt)) &&
                  txt.includes(" ") &&
                  !txt.match(/^[0-9\/]+$/)
                ) {
                  tenHS = txt.split(" ").pop();
                  break;
                }
              }
            }
            let finalComment = matchedData.noiDungNhanXet
              .replace(/{HocSinh}/g, tenHS)
              .replace(/{Môn}/g, subject);
            if (oNoiDung.tagName.toLowerCase() === "div") {
              oNoiDung.innerText = finalComment;
            } else {
              oNoiDung.value = finalComment;
            }
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            if (oNoiDung.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(oNoiDung, finalComment);
            } else if (oNoiDung.tagName.toLowerCase() === 'input' && nativeInputValueSetter) {
                nativeInputValueSetter.call(oNoiDung, finalComment);
            }
            oNoiDung.dispatchEvent(new Event("input", { bubbles: true }));
            oNoiDung.dispatchEvent(new Event("change", { bubbles: true }));
            oNoiDung.dispatchEvent(new Event("blur", { bubbles: true }));
            let dienMa = config.autoFillCode !== false;
            if (oMaNX && dienMa && matchedData.maNX) {
              oMaNX.value = matchedData.maNX;
              if (oMaNX.tagName.toLowerCase() === 'input' && nativeInputValueSetter) {
                  nativeInputValueSetter.call(oMaNX, matchedData.maNX);
              }
              oMaNX.dispatchEvent(new Event("input", { bubbles: true }));
              oMaNX.dispatchEvent(new Event("change", { bubbles: true }));
              oMaNX.dispatchEvent(new Event("blur", { bubbles: true }));
            }
            if (studentKey && !successfulRows.has(studentKey)) {
              successfulRows.add(studentKey);
              successCount++;
            } else if (!studentKey) {
              successCount++;
            }
            filledInThisPass++;
            if (filledInThisPass % 15 === 0)
              await new Promise((r) => setTimeout(r, 10));
          } else {
            console.warn(
              `Hàng ${i}: Không tìm thấy lời phê phù hợp cho mức ${mucDatDuoc}`,
            );
          }
        } catch (e) {
          console.error(`L\u1ED7i t\u1EA1i h\xE0ng ${i}:`, e);
        }
      }

      if (filledInThisPass === 0) {
        emptyPassCount++;
        if (emptyPassCount > 1) keepScrolling = false;
        else {
          let containers = Array.from(document.querySelectorAll('*')).filter(el => {
             if (el.tagName === 'BODY' || el.tagName === 'HTML') return false;
             const style = getComputedStyle(el);
             return el.scrollHeight > el.clientHeight + 10 && 
                    (style.overflowY === 'auto' || style.overflowY === 'scroll');
          });
          if (containers.length === 0) {
              containers = document.querySelectorAll(
                ".rgDataDiv, .RadGrid, div[style*='overflow'], .x-grid-view, .x-grid3-scroller, .x-scroller, .x-panel-body"
              );
          }
          containers.forEach((c) => {
            c.scrollTop += 800;
            c.dispatchEvent(new Event("scroll", { bubbles: true }));
          });
          window.scrollBy(0, 800);
          
          let lastElement = visibleTextareas[visibleTextareas.length - 1];
          if (lastElement) {
             lastElement.scrollIntoView({ behavior: "instant", block: "end" });
          }
          
          await new Promise((r) => setTimeout(r, 600));
        }
      } else {
        emptyPassCount = 0;
        let lastElement = visibleTextareas[visibleTextareas.length - 1];
        if (lastElement) {
          lastElement.scrollIntoView({ behavior: "instant", block: "end" });
          let trs = Array.from(document.querySelectorAll("tbody tr")).filter(
            (tr) => tr.offsetHeight > 0,
          );
          if (trs.length > 0)
            trs[trs.length - 1].scrollIntoView({
              behavior: "instant",
              block: "end",
            });

          let containers = Array.from(document.querySelectorAll('*')).filter(el => {
             if (el.tagName === 'BODY' || el.tagName === 'HTML') return false;
             const style = getComputedStyle(el);
             return el.scrollHeight > el.clientHeight + 10 && 
                    (style.overflowY === 'auto' || style.overflowY === 'scroll');
          });
          if (containers.length === 0) {
              containers = document.querySelectorAll(
                ".rgDataDiv, .RadGrid, div[style*='overflow'], .x-grid-view, .x-grid3-scroller, .x-scroller, .x-panel-body"
              );
          }
          containers.forEach((c) => {
            if (c.scrollHeight > c.clientHeight) {
              c.scrollTop += 600;
              c.dispatchEvent(new Event("scroll", { bubbles: true }));
            }
          });
          window.scrollBy(0, 600);

          await new Promise((r) => setTimeout(r, 600));
        } else {
          keepScrolling = false;
        }
      }
    } // end while

    fillCount = successCount;
    if (fillCount === 0) {
      let row =
        visibleTextareas.length > 0 ? visibleTextareas[0].closest("tr, [role='row']") : null;
      let debugMuc = "none";
      let debugIdx = "?";
      if (row) {
        let visibleTds = Array.from(row.querySelectorAll("td, [role='cell']")).filter(
          (c) => c.offsetWidth > 0,
        );
        let tdNoiDung = visibleTextareas[0].closest("td, [role='cell']");
        let idxNoiDung = visibleTds.indexOf(tdNoiDung);
        debugIdx = idxNoiDung;
        if (idxNoiDung >= 0) {
          let nextVals = [];
          for (
            let c = idxNoiDung + 1;
            c < visibleTds.length && c <= idxNoiDung + 3;
            c++
          ) {
            let t = visibleTds[c].textContent.trim();
            let inp = visibleTds[c].querySelector("input");
            let iv = inp
              ? inp.value !== undefined
                ? inp.value.trim()
                : "no_value"
              : "no_input";
            let itype = inp ? inp.getAttribute("type") : "none";
            let h = visibleTds[c].innerHTML
              .replace(/\s+/g, " ")
              .trim()
              .substring(0, 50);
            nextVals.push(`td${c}:[${t}|${iv}|T:${itype}|${h}]`);
          }
          debugMuc = nextVals.join(", ");
        }
      }
      if (activeTitleText.toLowerCase().includes("sổ ghi nhận xét") || activeTitleText.toLowerCase().includes("sổ đánh giá môn học")) {
          if (skippedNoScore === 0) {
              throw new Error("Không tìm thấy ô nhập liệu trống. (Có thể lưới dữ liệu chưa cho phép sửa, bạn chưa vào điểm đối với Sổ Đánh giá, hoặc bạn đã điền hết).");
          }
      } else {
          if (skippedNoScore === 0) {
              throw new Error(
                `Không tìm thấy cột Điểm để nhận xét môn "${subject}". Bạn cần phải vào điểm cho HS trước.`,
              );
          }
      }
    }
    
    let resSubject = subject;
    if ((capHoc === "THCS" || capHoc === "THPT") && role === "HOC_BA_GVBM" && is532) {
      resSubject = `${subject} (${detectedHocKy} + Học bạ)`;
    } else if (capHoc === "THCS" || capHoc === "THPT") {
      resSubject = `${subject} (${detectedHocKy})`;
    }
    
    return { count: fillCount, detectedMon: resSubject, skippedNoScore: skippedNoScore };
  }

  async function trySmasClickToEditGrid(poolToUse, subject, config, role, db, context = {}) {
      let capHoc = context.capHoc || "THCS";
      let khoiLop = context.khoiLop || "6";
      let detectedHocKy = context.detectedHocKy || "Học kỳ 1";
      let isGiuaKy = context.isGiuaKy || false;
      let isCuoiKy = context.isCuoiKy || false;
      let textToCheckRole = context.textToCheckRole || (document.body ? document.body.innerText.toLowerCase() : "");
      let activeTitleText = context.activeTitleText || "";

      function removeAccents(str) {
          if (!str) return "";
          return str.normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/đ/g, "d")
                    .replace(/Đ/g, "D");
      }

      function getCellValue(cell) {
          if (!cell) return "";
          let inp = cell.querySelector("input, textarea, select");
          if (inp) {
              return (inp.value || "").trim();
          }
          return (cell.innerText || cell.textContent || "").trim();
      }

      function isElementInViewport(el) {
          let rect = el.getBoundingClientRect();
          return (
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
              rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
      }

      let defaultAllComments = [];
      if (Array.isArray(poolToUse)) {
        defaultAllComments = poolToUse;
      } else {
        let specificPoolKey = null;
        if (isGiuaKy && detectedHocKy === "Học kỳ 1") specificPoolKey = "Giữa học kỳ 1";
        else if (isGiuaKy && detectedHocKy === "Học kỳ 2") specificPoolKey = "Giữa học kỳ 2";
        else if (isCuoiKy && detectedHocKy === "Học kỳ 1") specificPoolKey = "Cuối học kỳ 1";
        else if (isCuoiKy && detectedHocKy === "Học kỳ 2") specificPoolKey = "Cuối năm học";
        
        if (specificPoolKey && poolToUse[specificPoolKey] && poolToUse[specificPoolKey].comments && poolToUse[specificPoolKey].comments.length > 0) {
            defaultAllComments = poolToUse[specificPoolKey].comments;
        } else if (poolToUse["Nhận xét chung"] && poolToUse["Nhận xét chung"].comments && poolToUse["Nhận xét chung"].comments.length > 0) {
            defaultAllComments = poolToUse["Nhận xét chung"].comments;
        } else {
            for (let p of Object.values(poolToUse)) {
              if (p && p.comments) defaultAllComments = defaultAllComments.concat(p.comments);
            }
        }
      }
      
      let count = 0;
      let headers = Array.from(document.querySelectorAll("th, td.x-grid3-hd, .k-header, .e-headercell, tr:first-child td, thead td, [role='columnheader']"));
      
      let getCellIndex = (h) => {
          let tr = h.closest("tr");
          if (tr && tr.parentElement) {
              let tbodyOrThead = tr.parentElement;
              let rows = Array.from(tbodyOrThead.children);
              let grid = [];
              let targetCol = -1;
              for (let r = 0; r < rows.length; r++) {
                  let row = rows[r];
                  if (!grid[r]) grid[r] = [];
                  let cells = Array.from(row.children);
                  let c = 0;
                  for (let td of cells) {
                      while (grid[r][c]) c++;
                      let colspan = parseInt(td.getAttribute("colspan") || "1", 10);
                      let rowspan = parseInt(td.getAttribute("rowspan") || "1", 10);
                      if (td === h) {
                          targetCol = c;
                      }
                      for (let i = 0; i < rowspan; i++) {
                          for (let j = 0; j < colspan; j++) {
                              if (!grid[r + i]) grid[r + i] = [];
                              grid[r + i][c + j] = true;
                          }
                      }
                      c += colspan;
                  }
                  if (targetCol !== -1) return targetCol;
              }
          }
          
          let cid = h.cellIndex;
          if (cid === undefined || cid < 0) {
             if (h.parentElement) {
                 cid = Array.from(h.parentElement.children).indexOf(h);
             }
             if (h.getAttribute("aria-colindex")) {
                 cid = parseInt(h.getAttribute("aria-colindex"), 10) - 1;
             }
          }
          let classes = h.className || "";
          let colMatch = classes.match(/x-grid3-td-(\d+)|x-grid3-cell-c(\d+)|e-rowcell-col(\d+)/i);
          if (colMatch) {
              return parseInt(colMatch[1] || colMatch[2] || colMatch[3], 10);
          }
          return cid;
      };

      let cleanText = (str) => (str || "").replace(/[\s\u00A0\u200B]+/g, '').trim().toLowerCase();

      let getHeaderFullText = (h) => {
          let t = (h.innerText || h.textContent || "").trim();
          let pTr = h.closest("tr");
          if (pTr && pTr.parentElement) {
              let allTrs = Array.from(pTr.parentElement.children);
              let trIdx = allTrs.indexOf(pTr);
              if (trIdx > 0) {
                  let prevTr = allTrs[trIdx - 1];
                  let prevThs = Array.from(prevTr.querySelectorAll("th, td"));
                  let rectH = h.getBoundingClientRect();
                  for (let pTh of prevThs) {
                      let rectP = pTh.getBoundingClientRect();
                      if (rectP.left <= rectH.left + 8 && rectP.right >= rectH.right - 8) {
                          t = (pTh.innerText || pTh.textContent || "").trim() + " " + t;
                          break;
                      }
                  }
              }
          }
          return t;
      };

      let thTbmHk1 = headers.findIndex(h => { 
          let t = removeAccents(cleanText(getHeaderFullText(h))); 
          return t === "tbmhki" || t === "tbmhk1" || t === "tbhk1" || t === "tbhki" || t === "diemtbhki" || t === "diemtbhk1" ||
                 t.includes("dtbmhki") || t.includes("dtbmhk1") || t.includes("dtbmhk_1") || t.includes("dtbhk1") || t.includes("dtbhki") ||
                 t.includes("ddgck") || t.includes("ddggk") || t.includes("ddgtx") || t.includes("diemgk") || t.includes("dktgk") ||
                 t === "ddghk1" || t === "ddghki"; 
      });
      let thTbmHk2 = headers.findIndex(h => { 
          let t = removeAccents(cleanText(getHeaderFullText(h))); 
          return t === "tbmhkii" || t === "tbmhk2" || t === "tbhk2" || t === "tbhkii" || t === "dtbmhk" || t === "dtbhk2" ||
                 t === "diemtbhkii" || t === "diemtbhk2" || t.includes("dtbmhk2") || t.includes("dtbmhkii") || t.includes("dtbhk2") ||
                 t.includes("dtbhkii") || t.includes("ddgck") || t.includes("diemck") || t.includes("dktck") || t === "ddghk2" || t === "ddghkii"; 
      });
      let thTbmCn  = headers.findIndex(h => { 
          let t = removeAccents(cleanText(getHeaderFullText(h))); 
          return t === "tbmcn" || t === "tbcn" || t === "tbcanam" || t === "xlcn" || t === "diemtbcn" || t === "diemtbcanam" ||
                 t.includes("dtbmcn") || t.includes("dtbcanam") || t.includes("ddgcanam") || t.includes("ddgcn") || t.includes("diemcanam"); 
      });

      let isMaNxFn = (h) => {
          let flatText = removeAccents(cleanText(getHeaderFullText(h)));
          if (flatText.includes("noidung")) return false;
          if (flatText.includes("manx") || flatText.includes("manhanxet") || flatText.includes("madinhdanh")) return true;
          return false;
      };
      let isMaNxOnly = config && config.autoFillCode;
      let targetColumns = [];
      for (let h of headers) {
          let isMaNxLocal = isMaNxFn(h);
          if (!isMaNxOnly && isMaNxLocal) {
              continue; // Skip this header if it points to a column that is a 'Mã nhận xét' column
          }

          let fullText = getHeaderFullText(h);
          let text = cleanText(fullText);
          let flatText = removeAccents(text);
          
          let isNxColumn = (
              text.includes("nhậnxét") || text.includes("nộidung") || text.includes("tiếnbộ") ||
              text.includes("ưuđiểm") || text.includes("hạnchế") || text.includes("đánhgiá") ||
              text.includes("ýkiến") || flatText.includes("nhanxet") || flatText.includes("noidung") ||
              flatText.includes("tienbo") || flatText.includes("uudiem") || flatText.includes("hanche") ||
              flatText.includes("danhgia") || flatText.includes("ykien") || flatText === "nx" ||
              flatText === "nd" || flatText.includes("noidungnx")
          );
          // Stronger check for NLPC columns to avoid "Mã nhận xét" being treated as "Nhận xét"
          if (flatText.includes("manx") || flatText.includes("manhanxet") || flatText.includes("madinhdanh")) {
              if (!flatText.includes("noidung")) {
                  isNxColumn = false; 
              }
          }
          let isMaNx = isMaNxLocal;
          let isValidCol = isMaNxOnly ? (isNxColumn || isMaNx) : (isNxColumn && !isMaNx);
          
          if (!isValidCol && flatText.includes("noidung")) {
             isValidCol = true;
          }
          if (isValidCol) {
              let isCN = text.includes("cảnăm") || text.includes("(cn)") || flatText.includes("canam") || flatText.includes("tbcảnăm");
              let isHK2 = !isCN && (text.includes("hk2") || text.includes("hkii") || text.includes("học kỳ 2") || text.includes("học kì 2") ||
                                    text.includes("họckỳ2") || text.includes("họckì2") || text.includes("hk_2") || text.includes("hk_ii") ||
                                    flatText.includes("hk2") || flatText.includes("hkii") || flatText.includes("hocky2") || flatText.includes("hocki2") ||
                                    flatText.includes("(hk2)") || flatText.includes("(hkii)"));
              let isHK1 = !isCN && !isHK2 && (text.includes("hk1") || text.includes("hki") || text.includes("học kỳ 1") || text.includes("học kì 1") ||
                                    text.includes("họckỳ1") || text.includes("họckì1") || text.includes("hk_1") || text.includes("hk_i") ||
                                    flatText.includes("hk1") || flatText.includes("hki") || flatText.includes("hocky1") || flatText.includes("hocki1") ||
                                    flatText.includes("(hk1)") || flatText.includes("(hki)"));
              let isAll = !isCN && !isHK2 && !isHK1;

              if (isAll) {
                  if (config.fillCaNam) isCN = true;
                  else if (detectedHocKy === "Học kỳ 2" || textToCheckRole.includes("học kỳ 2") || textToCheckRole.includes("hk2") || textToCheckRole.includes("hkii")) isHK2 = true;
                  else if (detectedHocKy === "Học kỳ 1" || textToCheckRole.includes("học kỳ 1") || textToCheckRole.includes("hk1") || textToCheckRole.includes("hki")) isHK1 = true;
              }

              if (isCN) {
                  targetColumns.push({ header: h, cellIndex: getCellIndex(h), scoreIndex: thTbmCn >= 0 ? getCellIndex(headers[thTbmCn]) : -1, type: "CN" });
              } else if (isHK2) {
                  targetColumns.push({ header: h, cellIndex: getCellIndex(h), scoreIndex: thTbmHk2 >= 0 ? getCellIndex(headers[thTbmHk2]) : -1, type: "HK2" });
              } else if (isHK1) {
                  targetColumns.push({ header: h, cellIndex: getCellIndex(h), scoreIndex: thTbmHk1 >= 0 ? getCellIndex(headers[thTbmHk1]) : -1, type: "HK1" });
              } else {
                  targetColumns.push({ header: h, cellIndex: getCellIndex(h), scoreIndex: -1, type: "ALL" });
              }
          }
      }

      if (targetColumns.length === 0) {
          console.log("trySmasClickToEditGrid: target Nhan Xet columns not found text:", headers.map(h => h.innerText || h.textContent));
          return 0;
      }
      
      let grid = targetColumns[0].header.closest("table, .x-grid-panel, .x-panel, .k-grid, .e-grid, [role='grid']");
      if (!grid) grid = document.querySelector("table, [role='grid']"); // Fallback
      if (!grid) {
          console.log("trySmasClickToEditGrid: grid not found");
          return 0;
      }

      let allRowsContainer = grid;
      let gridWrapper = targetColumns[0].header.closest(".k-widget, .e-grid, .x-panel, [role='grid']");
      if (gridWrapper) allRowsContainer = gridWrapper;

      let rawRows = Array.from(allRowsContainer.querySelectorAll("tr, .x-grid3-row, .e-row, [role='row']"));
      
      let filterRowsFn = r => {
          if (r.offsetHeight === 0) return false;
          let dtCells = Array.from(r.querySelectorAll("td, .x-grid3-cell, .e-rowcell, [role='gridcell'], [role='cell']"));
          if (dtCells.length < 3) return false;
          
          if (r.closest("thead")) return false;
          let hCells = r.querySelectorAll("th, .x-grid3-hd, .k-header, .e-headercell");
          if (hCells.length > dtCells.length) return false;
          
          // Fast check if this exact row is the header row
          if (targetColumns.some(col => r.contains(col.header))) return false;
          
          return true;
      };

      let rows = rawRows.filter(filterRowsFn);

      if (rows.length === 0) {
          rawRows = Array.from(document.querySelectorAll("tr, [role='row']"));
          rows = rawRows.filter(filterRowsFn);
      }

      let getCellByHeader = (row, colHeader) => {
          if (!colHeader) return null;
          
          // 1. Try class name and column index attribute matching
          let colClasses = colHeader.className || "";
          let colNumMatch = colClasses.match(/(?:x-grid3-hd-|x-grid3-td-|x-grid3-cell-c|e-rowcell-col|k-grid-col-)(\d+)/i);
          if (colNumMatch) {
              let num = colNumMatch[1];
              let matchedCell = Array.from(row.querySelectorAll("td, .x-grid3-cell, .e-rowcell, [role='gridcell'], [role='cell']")).find(el => {
                  let cls = el.className || "";
                  return cls.includes(`-${num}`) || cls.includes(`-c${num}`) || el.getAttribute("aria-colindex") === num;
              });
              if (matchedCell) return matchedCell;
          }
          
          // 2. Try visual coordinate alignment matching (extremely robust for aligned grids)
          let rectHeader = colHeader.getBoundingClientRect();
          if (rectHeader && rectHeader.width > 0) {
              let cxHeader = rectHeader.left + rectHeader.width / 2;
              let cells = Array.from(row.querySelectorAll("td, .x-grid3-cell, .e-rowcell, [role='gridcell'], [role='cell']"));
              let bestCell = null;
              let minDiff = Infinity;
              
              for (let cell of cells) {
                  let rectCell = cell.getBoundingClientRect();
                  if (rectCell && rectCell.width > 0) {
                      let cxCell = rectCell.left + rectCell.width / 2;
                      let diff = Math.abs(cxCell - cxHeader);
                      if (diff < minDiff) {
                          minDiff = diff;
                          bestCell = cell;
                      }
                  }
              }
              if (bestCell && minDiff < 45) {
                  return bestCell;
              }
          }

          // 3. Fallback to standard index matching
          let cells = Array.from(row.querySelectorAll("td, .x-grid3-cell, .e-rowcell, [role='gridcell'], [role='cell']"));
          return cells[getCellIndex(colHeader)];
      };

      let fillData = [];
      let skippedNoScore = 0;

      for (let i = 0; i < rows.length; i++) {
          try {
              let row = rows[i];
              let cells = Array.from(row.querySelectorAll("td, .x-grid3-cell, .e-rowcell, [role='gridcell'], [role='cell']"));
              
              let tenHS = "Em";
              let txts = cells.map(c => c.innerText.trim());
              for(let c=1; c<Math.min(4, txts.length); c++) {
                  if (txts[c] && isNaN(parseFloat(txts[c])) && txts[c].includes(" ") && !txts[c].match(/^[0-9\/]+$/)) {
                      tenHS = txts[c].split(" ").pop();
                      break;
                  }
              }

              for (let colDef of targetColumns) {
                  let targetCell = getCellByHeader(row, colDef.header);
                  let colHeaderText = (colDef.header.innerText || colDef.header.textContent || "").toLowerCase();
                  let cTxt = removeAccents(colHeaderText.replace(/\s+/g, ""));
                  let isCurrentColMaNx = cTxt.includes("manx") || cTxt.includes("manhanxet") || cTxt.includes("madinhdanh");
                  
                  // If we are NOT filling codes, but this is a code column, skip it
                  if (!isMaNxOnly && isCurrentColMaNx) continue;
                  if (!targetCell) continue;

                  // Evaluate score before clicking
                  let mucDatDuoc = "";
                  
                  let scoreHeader = null;
                  if (colDef.type === "HK1" && thTbmHk1 >= 0) scoreHeader = headers[thTbmHk1];
                  else if (colDef.type === "HK2" && thTbmHk2 >= 0) scoreHeader = headers[thTbmHk2];
                  else if (colDef.type === "CN" && thTbmCn >= 0) scoreHeader = headers[thTbmCn];

                  if (scoreHeader) {
                      let scoreCell = getCellByHeader(row, scoreHeader);
                      let cellText = "";
                      if (scoreCell) {
                          cellText = getCellValue(scoreCell).toUpperCase();
                      }
                      mucDatDuoc = cellText;
                  }
                  if (!mucDatDuoc) {
                      let targetCellIndex = cells.indexOf(targetCell);
                      if (targetCellIndex < 0) {
                          targetCellIndex = getCellIndex(colDef.header);
                      }
                      
                      if (targetCellIndex > 0) {
                          let minC = Math.max(1, targetCellIndex - 4); // Do not scan column 0 (STT) and scan at most 4 columns back
                          for (let c = targetCellIndex - 1; c >= minC; c--) {
                              if (!cells[c]) continue;
                              
                              let rect = cells[c].getBoundingClientRect();
                              if (!rect || rect.width === 0) {
                                  continue; // Skip hidden/invisible columns
                              }
                              
                              let cellText = getCellValue(cells[c]).toUpperCase();
                              if (cellText && !isNaN(parseFloat(cellText.replace(",", "."))) && parseFloat(cellText.replace(",", ".")) <= 10 && cellText.match(/^[0-9]+([.,][0-9]+)?$/)) {
                                  mucDatDuoc = cellText;
                                  break;
                              }
                              if (["T", "H", "C", "K", "Đ", "CĐ", "TỐT", "KHÁ", "ĐẠT", "CHƯA ĐẠT", "HTT", "HT", "CHT"].includes(cellText)) {
                                  mucDatDuoc = cellText;
                                  break;
                              }
                          }
                      }
                  }

                  if (!mucDatDuoc && textToCheckRole.includes("5.3.1")) {
                      skippedNoScore++;
                      continue;
                  }
                  // Determine specific pool for this column
                  let currentColPool = poolToUse;
                  let currentFlatComments = defaultAllComments;
                  
                  if (db && db[capHoc] && db[capHoc][khoiLop]) {
                      let baseGVBM = db[capHoc][khoiLop].GVBM;
                      let baseHBA = db[capHoc][khoiLop].HOC_BA_GVBM || db[capHoc][khoiLop].SO_GHI_NHAN_XET;
                      let baseSGNX = db[capHoc][khoiLop].SO_GHI_NHAN_XET;
                      
                      if (role === "SO_GHI_NHAN_XET" && baseSGNX) {
                          if (colDef.type === "CN") {
                              currentColPool = baseSGNX[`${subject}_Cả năm`] || baseSGNX[`Cả năm`] || baseSGNX[subject] || poolToUse;
                          } else if (colDef.type === "HK2") {
                              currentColPool = baseSGNX[`${subject}_Học kỳ 2`] || baseSGNX[`Học kỳ 2`] || poolToUse;
                          } else if (colDef.type === "HK1") {
                              currentColPool = baseSGNX[`${subject}_Học kỳ 1`] || baseSGNX[`Học kỳ 1`] || poolToUse;
                          }
                      } else {
                          if (colDef.type === "CN" && baseHBA) {
                              currentColPool = baseHBA[`${subject}_Cả năm`] || baseHBA[`Cả năm`] || baseHBA[subject] || baseHBA;
                          } else if (colDef.type === "CN" && baseGVBM) {
                              currentColPool = baseGVBM[`${subject}_Cả năm`] || baseGVBM[`Cả năm`] || (baseSGNX && baseSGNX[`${subject}_Cả năm`]) || (baseSGNX && baseSGNX[`Cả năm`]) || poolToUse;
                          } else if (colDef.type === "HK2" && baseGVBM) {
                              currentColPool = baseGVBM[`${subject}_Học kỳ 2`] || baseGVBM[`Học kỳ 2`] || (baseSGNX && baseSGNX[`${subject}_Học kỳ 2`]) || (baseSGNX && baseSGNX[`Học kỳ 2`]) || poolToUse;
                          } else if (colDef.type === "HK1" && baseGVBM) {
                              currentColPool = baseGVBM[`${subject}_Học kỳ 1`] || baseGVBM[`Học kỳ 1`] || (baseSGNX && baseSGNX[`${subject}_Học kỳ 1`]) || (baseSGNX && baseSGNX[`Học kỳ 1`]) || poolToUse;
                          }
                      }
                      
                      // Build flat comments for fallback
                      currentFlatComments = [];
                      if (Array.isArray(currentColPool)) currentFlatComments = currentColPool;
                      else if (typeof currentColPool === 'object') {
                          for (let p of Object.values(currentColPool)) {
                              if (p && p.comments) currentFlatComments = currentFlatComments.concat(p.comments);
                          }
                      }
                      if (currentFlatComments.length === 0) currentFlatComments = defaultAllComments;
                  }

                  // Determine random comment based on score/points
                  let randomComment = "";
                  if (currentColPool && !Array.isArray(currentColPool) && mucDatDuoc) {
                      let diem = parseFloat(mucDatDuoc.replace(",", "."));
                      let isSo = !isNaN(diem);
                      let matchedGroup = null;
                      for (const [lvl, conf] of Object.entries(currentColPool)) {
                          if (typeof conf !== 'object' || !conf) continue;
                          if (isSo) {
                             if (diem >= (conf.min ?? -1) && diem <= (conf.max ?? 11)) {
                                matchedGroup = conf.comments;
                                break;
                             }
                          } else {
                              let target = (conf.mucDG || conf.code || lvl).toUpperCase();
                              let m = mucDatDuoc.toUpperCase();
                              if (target === m || lvl.toUpperCase() === m) {
                                  matchedGroup = conf.comments; break;
                              }
                              const groupT = ["T", "HTT", "TỐT", "HOÀN THÀNH TỐT"];
                              const groupH = ["H", "HT", "HOÀN THÀNH", "KHÁ", "Đ", "ĐẠT"];
                              const groupC = ["C", "CHT", "CHƯA HOÀN THÀNH", "CHƯA ĐẠT", "CĐ"];
                              if (groupT.includes(m) && (groupT.includes(target) || groupT.includes(lvl.toUpperCase()))) { matchedGroup = conf.comments; break; }
                              if (groupH.includes(m) && (groupH.includes(target) || groupH.includes(lvl.toUpperCase()))) { matchedGroup = conf.comments; break; }
                              if (groupC.includes(m) && (groupC.includes(target) || groupC.includes(lvl.toUpperCase()))) { matchedGroup = conf.comments; break; }
                          }
                      }
                      if (matchedGroup && matchedGroup.length > 0) randomComment = matchedGroup[Math.floor(Math.random() * matchedGroup.length)];
                  }

                  if (!randomComment) {
                      randomComment = currentFlatComments.length > 0 ? currentFlatComments[Math.floor(Math.random() * currentFlatComments.length)] : "";
                  }

                  // Match code extraction
                  let matchedCode = "";
                  if (currentColPool && !Array.isArray(currentColPool) && mucDatDuoc) {
                      let diem = parseFloat(mucDatDuoc.replace(",", "."));
                      let isSo = !isNaN(diem);
                      for (const [lvl, conf] of Object.entries(currentColPool)) {
                          if (typeof conf !== 'object' || !conf) continue;
                          if (isSo) {
                             if (diem >= (conf.min ?? -1) && diem <= (conf.max ?? 11)) {
                                matchedCode = conf.code || "";
                                break;
                             }
                          } else {
                              let target = (conf.mucDG || conf.code || lvl).toUpperCase();
                              let m = mucDatDuoc.toUpperCase();
                              if (target === m || lvl.toUpperCase() === m) {
                                  matchedCode = conf.code || ""; break;
                              }
                              const groupT = ["T", "HTT", "TỐT", "HOÀN THÀNH TỐT"];
                              const groupH = ["H", "HT", "HOÀN THÀNH", "KHÁ", "Đ", "ĐẠT"];
                              const groupC = ["C", "CHT", "CHƯA HOÀN THÀNH", "CHƯA ĐẠT", "CĐ"];
                              if (groupT.includes(m) && (groupT.includes(target) || groupT.includes(lvl.toUpperCase()))) { matchedCode = conf.code || ""; break; }
                              if (groupH.includes(m) && (groupH.includes(target) || groupH.includes(lvl.toUpperCase()))) { matchedCode = conf.code || ""; break; }
                              if (groupC.includes(m) && (groupC.includes(target) || groupC.includes(lvl.toUpperCase()))) { matchedCode = conf.code || ""; break; }
                          }
                      }
                  }

                  let finalComment = randomComment ? randomComment.replace(/{HocSinh}/g, tenHS).replace(/{Môn}/g, subject || "Học bạ") : "";
                  
                  // Only fill the code if the user requested it AND this specific column is the code column
                  if (config && config.autoFillCode && isCurrentColMaNx) {
                      finalComment = matchedCode || " "; // if code is requested but not found, don't leave empty? Actually if matchedCode is empty, it shouldn't fill.
                      if (!matchedCode) finalComment = ""; 
                  } else if (isCurrentColMaNx) {
                      // If it's a code column but config doesn't want code, or no code found, skip filling it entirely.
                      continue;
                  } else {
                      // If it's a comment column, we MUST have a randomComment
                      if (!finalComment) {
                          throw new Error("NO_COMMENT_CONFIG");
                      }
                  }
                  if (config && config.removeTrailingPunctuation) {
                      finalComment = finalComment.replace(/[,.;:!\s]+$/, "");
                  }

                  // Only fill if current cell has no content
                  let cellCurrentVal = "";
                  let inp = targetCell.querySelector("input, textarea");
                  if (inp) {
                      cellCurrentVal = inp.value.trim();
                  } else {
                      cellCurrentVal = (targetCell.innerText || targetCell.textContent || "").trim();
                  }
                  
                  // Strip character counters from SMAS fields to detect if field is truly empty
                  let cleanVal = cellCurrentVal.replace(/^\d+\/\d+\s*(?:ký\s*tự|char|chars)?$/i, "").trim();

                  if (!cleanVal && finalComment !== "") {
                      fillData.push({
                          rowIndex: i,
                          cellIndex: colDef.cellIndex,
                          targetCell: targetCell,
                          colDef: colDef,
                          comment: finalComment,
                          tenHS: tenHS
                      });
                  }
              }
          } catch(e) {
              if (e.message === "NO_COMMENT_CONFIG") {
                 throw new Error("Không có lời nhận xét nào được cấu hình cho " + (config.fillCaNam ? "Cả năm" : (subject || "")) + ". Vui lòng vào Tuỳ Chỉnh để thêm dữ liệu mẫu!");
              }
              console.log("trySmasClickToEditGrid pre-calc error:", e);
          }
      }

      if (fillData.length === 0) {
          return { count: 0, skippedNoScore: skippedNoScore, gridDetected: rows.length > 0 };
      }

      // Try fast main world fill first (extJs/kendo/syncfusion/scope)
      const eventName = "Smas_Fast_Fill_Result_" + Date.now();
      const serializedFillData = fillData.map(item => ({
          rowIndex: item.rowIndex,
          cellIndex: item.cellIndex,
          comment: item.comment
      }));

      const fastFillResult = await new Promise((resolve) => {
          const handler = (e) => {
              document.removeEventListener(eventName, handler);
              resolve(e.detail);
          };
          document.addEventListener(eventName, handler);
          setTimeout(() => {
              document.removeEventListener(eventName, handler);
              resolve({ status: "TIMEOUT" });
          }, 1500);

          chrome.runtime.sendMessage({
              action: "executeSmasFastFill",
              config: { fillData: serializedFillData, eventName }
          });
      });

      if (fastFillResult && fastFillResult.status === "OK" && fastFillResult.count > 0) {
          console.log(`[Extension] Super-fast SMAS fill succeeded! Filled ${fastFillResult.count} comments.`);
          return { count: fastFillResult.count, skippedNoScore: skippedNoScore, gridDetected: true };
      }

      // Slow click-simulate fallback if main world fill produced 0 hits or failed
      console.log("[Extension] Falling back to simulated clicking...");
      count = 0;
      for (let item of fillData) {
          try {
              let targetCell = item.targetCell;
              let finalComment = item.comment;
              let tenHS = item.tenHS;
              let colDef = item.colDef;

              let preEditor = targetCell.querySelector("input:not([type='checkbox']):not([type='radio']), textarea, div[contenteditable='true']");

              const simulateClickOnCell = async (cell) => {
                  if (cell.focus) cell.focus();
                  if (!isElementInViewport(cell)) {
                      cell.scrollIntoView({ block: "center", behavior: "instant" });
                      await new Promise(r => setTimeout(r, 15));
                  }
                  
                  let rect = cell.getBoundingClientRect();
                  let cx = rect.left + rect.width / 2;
                  let cy = rect.top + rect.height / 2;
                  let evOpts = {bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, screenX: cx, screenY: cy};
                  
                  cell.dispatchEvent(new MouseEvent('pointerdown', evOpts));
                  cell.dispatchEvent(new MouseEvent('mousedown', evOpts));
                  
                  let clickTarget = cell.firstElementChild || cell;
                  if (clickTarget && clickTarget !== cell) {
                      clickTarget.dispatchEvent(new MouseEvent('pointerdown', evOpts));
                      clickTarget.dispatchEvent(new MouseEvent('mousedown', evOpts));
                      clickTarget.dispatchEvent(new MouseEvent('pointerup', evOpts));
                      clickTarget.dispatchEvent(new MouseEvent('mouseup', evOpts));
                      clickTarget.dispatchEvent(new MouseEvent('click', evOpts));
                      if (clickTarget.click) clickTarget.click();
                  }
                  
                  cell.dispatchEvent(new MouseEvent('pointerup', evOpts));
                  cell.dispatchEvent(new MouseEvent('mouseup', evOpts));
                  cell.dispatchEvent(new MouseEvent('click', evOpts));
                  if (cell.click) cell.click();
                  
                  cell.dispatchEvent(new MouseEvent('dblclick', evOpts));
                  if (clickTarget && clickTarget !== cell) {
                      clickTarget.dispatchEvent(new MouseEvent('dblclick', evOpts));
                  }
                  
                  cell.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true}));
              };

              let editor = preEditor;
              if (!editor) {
                  await simulateClickOnCell(targetCell);
                  
                  const findValidEditor = () => {
                      let ed = targetCell.querySelector("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea, div[contenteditable='true']");
                      if (!ed || ed.offsetHeight === 0) {
                          ed = document.querySelector(".x-editor input, .x-editor textarea, input.k-input, input.e-input, textarea.e-input, [role='gridcell'] textarea, [role='cell'] textarea, td textarea, div.x-grid3-cell textarea");
                      }
                      if (!ed || ed.offsetHeight === 0) {
                          ed = Array.from(document.querySelectorAll("textarea, input[type='text']")).find(el => {
                              if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;
                              let rect = el.getBoundingClientRect();
                              return rect.width > 50 && !el.readOnly && !el.disabled;
                          });
                      }

                      if (ed && ed.offsetHeight > 0) {
                          let isEditorValid = false;
                          if (targetCell.contains(ed)) {
                              isEditorValid = true;
                          } else {
                              let editorRow = ed.closest("tr, [role='row']");
                              let targetRow = targetCell.closest("tr, [role='row']");
                              if (editorRow && targetRow && editorRow === targetRow) {
                                  isEditorValid = true;
                              } else {
                                  let r1 = ed.getBoundingClientRect();
                                  let r2 = targetCell.getBoundingClientRect();
                                  let isOverlapping = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
                                  if (isOverlapping && r1.width > 20 && r1.height > 10) {
                                      isEditorValid = true;
                                  }
                              }
                          }
                          if (isEditorValid) return ed;
                      }
                      return null;
                  };

                  for (let wait = 0; wait < 10; wait++) {
                      await new Promise(r => setTimeout(r, 10));
                      editor = findValidEditor();
                      if (editor) break;
                  }

                  if (!editor) {
                      console.log("[Extension] Retrying click on cell...");
                      await simulateClickOnCell(targetCell);
                      for (let wait = 0; wait < 10; wait++) {
                          await new Promise(r => setTimeout(r, 10));
                          editor = findValidEditor();
                          if (editor) break;
                      }
                  }
              }
              
              if (editor) {
                  let isContentEditable = editor.isContentEditable || editor.getAttribute("contenteditable") === "true";
                  let currentVal = isContentEditable ? (editor.innerText || "") : (editor.value || "");
                  if (!currentVal.trim()) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                      
                      if (isContentEditable) {
                          editor.innerText = finalComment;
                      } else if (editor.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
                           nativeTextAreaValueSetter.call(editor, finalComment);
                      } else if (editor.tagName.toLowerCase() === 'input' && nativeInputValueSetter) {
                           nativeInputValueSetter.call(editor, finalComment);
                      } else if (editor.tagName.toLowerCase() === 'td') {
                          editor.innerText = finalComment;
                      } else {
                          editor.value = finalComment;
                      }
                      
                      editor.dispatchEvent(new Event("input", { bubbles: true }));
                      editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
                      editor.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true}));
                      editor.dispatchEvent(new Event("change", { bubbles: true }));
                      editor.blur && editor.blur();
                      editor.dispatchEvent(new Event("blur", { bubbles: true }));
                      editor.dispatchEvent(new Event("focusout", { bubbles: true }));
                      
                      if (document.body.focus) document.body.focus();
                      document.dispatchEvent(new MouseEvent('mousedown', {bubbles:true, cancelable:true, view:window}));
                      document.body.click();
                      
                      count++;
                      await new Promise(r => setTimeout(r, 20));
                  }
              } else {
                  // Direct cell fill fallback if editor could not be dynamically focused
                  let innerTarget = targetCell.querySelector("span, div, p, label") || targetCell;
                  let cur = (innerTarget.innerText || innerTarget.textContent || "").trim();
                  if (!cur) {
                      innerTarget.innerText = finalComment;
                      targetCell.setAttribute("data-val", finalComment);
                      targetCell.setAttribute("data-filled", "true");
                      targetCell.dispatchEvent(new Event("input", { bubbles: true }));
                      targetCell.dispatchEvent(new Event("change", { bubbles: true }));
                      count++;
                  }
              }
              
              targetCell.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true}));
              targetCell.dispatchEvent(new Event('blur', { bubbles: true }));
              await new Promise(r => setTimeout(r, 20));
          } catch(e) {
              console.log("trySmasClickToEditGrid fallback row error:", e);
          }
      }
      return { count: count, skippedNoScore: skippedNoScore, gridDetected: rows.length > 0 };
  }

  async function dienNhanXetVNEDUNLPC(config, commentsPool) {
    let allTextareas = Array.from(
      document.querySelectorAll("textarea")
    );
    let textareas = allTextareas.filter((ta) => {
      if (ta.offsetWidth === 0 || ta.offsetHeight === 0) return false;
      let rect = ta.getBoundingClientRect();
      let placeholder = ta.getAttribute("placeholder") || "";
      if (placeholder.toLowerCase().includes("tìm kiếm")) return false;
      return (
        rect.width >= 50 &&
        getComputedStyle(ta).visibility !== "hidden" &&
        !ta.disabled &&
        !ta.readOnly &&
        ta.className.indexOf("search") === -1 // Avoid search inputs
      );
    });

    if (textareas.length === 0) {
      throw new Error("Không tìm thấy ô nhập liệu nào. Vui lòng thử click vào một học sinh ở bên trái.");
    }

    let itemsOrderParams = [
      { group: "Năng lực chung", name: "Nhận xét chung" },
      { group: "Năng lực chung", name: "Tự chủ và tự học" },
      { group: "Năng lực chung", name: "Giao tiếp và hợp tác" },
      { group: "Năng lực chung", name: "GQVĐ và sáng tạo" },

      { group: "Năng lực đặc thù", name: "Nhận xét năng lực đặc thù" },
      { group: "Năng lực đặc thù", name: "Ngôn ngữ" },
      { group: "Năng lực đặc thù", name: "Tính toán" },
      { group: "Năng lực đặc thù", name: "Khoa học" },
      { group: "Năng lực đặc thù", name: "Công nghệ" },
      { group: "Năng lực đặc thù", name: "Tin học" },
      { group: "Năng lực đặc thù", name: "Thẩm mĩ" },
      { group: "Năng lực đặc thù", name: "Thể chất" },
      
      { group: "Phẩm chất", name: "Nhận xét chung" },
      { group: "Phẩm chất", name: "Yêu nước" },
      { group: "Phẩm chất", name: "Nhân ái" },
      { group: "Phẩm chất", name: "Chăm chỉ" },
      { group: "Phẩm chất", name: "Trung thực" },
      { group: "Phẩm chất", name: "Trách nhiệm" }
    ];

    let filledCount = 0;
    
    for (let i = 0; i < textareas.length; i++) {
        let ta = textareas[i];
        
        let matchedItem = null;
        let tempWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        tempWalker.currentNode = ta;
        
        let validTexts = [];
        let checks = 0;
        while (tempWalker.previousNode() && checks < 20) {
            let t = tempWalker.currentNode.nodeValue.trim();
            if (t.length >= 2) {
                validTexts.push(t.toLowerCase());
                if (validTexts.length >= 6) break; 
            }
            checks++;
        }
        
        for (let tLower of validTexts) {
            for (let item of itemsOrderParams) {
                if (tLower.includes(item.name.toLowerCase())) {
                    if (item.name === "Nhận xét chung") {
                        let isPhamChat = validTexts.some(x => x.includes("phẩm chất") || x.includes("yêu nước"));
                        let isNangLuc = validTexts.some(x => x.includes("năng lực") || x.includes("tự chủ"));
                        if (isPhamChat && !isNangLuc) {
                             matchedItem = itemsOrderParams.find(x => x.name === "Nhận xét chung" && x.group === "Phẩm chất");
                        } else if (isNangLuc && !isPhamChat) {
                             matchedItem = itemsOrderParams.find(x => x.name === "Nhận xét chung" && x.group === "Năng lực chung");
                        } else {
                             matchedItem = itemsOrderParams.find(x => x.name === "Nhận xét chung" && x.group === "Năng lực chung");
                        }
                    } else {
                        matchedItem = item;
                    }
                    break;
                }
            }
            if (matchedItem) break;
        }

        if (!matchedItem) {
            let fallbackOrder = itemsOrderParams;
            if (textareas.length === 16) {
                 fallbackOrder = itemsOrderParams.filter(x => x.name !== "Công nghệ" && x.name !== "Tin học");
            }
            matchedItem = fallbackOrder[i];
        }

        let currentVal = ta.tagName.toLowerCase() === "div" ? ta.innerText.trim() : ta.value.trim();
        if (currentVal || !matchedItem) continue;

        let groupData = commentsPool[matchedItem.group];
        if (groupData) {
            let itemData = groupData[matchedItem.name];
            if (itemData && itemData.comments && itemData.comments.length > 0) {
                let randomComment = itemData.comments[Math.floor(Math.random() * itemData.comments.length)];
                if (config && config.removeTrailingPunctuation) {
                  randomComment = randomComment.replace(/[,.;:!\s]+$/, "");
                }

                if (ta.tagName.toLowerCase() === "div") {
                  ta.innerText = randomComment;
                } else {
                  ta.value = randomComment;
                }
                ta.dispatchEvent(new Event("input", { bubbles: true }));
                ta.dispatchEvent(new Event("change", { bubbles: true }));
                ta.dispatchEvent(new Event("blur", { bubbles: true }));
                filledCount++;
            }
        }
    }
    
    if (filledCount === 0) {
       throw new Error("Tất cả các ô hiển thị đã có nội dung (hoặc không tìm thấy ô trống hợp lệ). Để điền lại, vui lòng xóa nội dung hiện tại.");
    }
    return { count: 1, detectedMon: "Học bạ NLPC" };
  }

  async function dienNhanXetHocBaRandom(config, commentsPool, subject, role="HOC_BA", ctx={}, db=null) {
    let allComments = [];
    if (Array.isArray(commentsPool)) {
      allComments = commentsPool;
    } else {
        let specificPoolKey = null;
        if (isGiuaKy && detectedHocKy === "Học kỳ 1") specificPoolKey = "Giữa học kỳ 1";
        else if (isGiuaKy && detectedHocKy === "Học kỳ 2") specificPoolKey = "Giữa học kỳ 2";
        else if (isCuoiKy && detectedHocKy === "Học kỳ 1") specificPoolKey = "Cuối học kỳ 1";
        else if (isCuoiKy && detectedHocKy === "Học kỳ 2") specificPoolKey = "Cuối năm học";
        
        if (specificPoolKey && commentsPool[specificPoolKey] && commentsPool[specificPoolKey].comments && commentsPool[specificPoolKey].comments.length > 0) {
            allComments = commentsPool[specificPoolKey].comments;
        } else if (commentsPool["Nhận xét chung"] && commentsPool["Nhận xét chung"].comments && commentsPool["Nhận xét chung"].comments.length > 0) {
            allComments = commentsPool["Nhận xét chung"].comments;
        } else {
            for (let p of Object.values(commentsPool)) {
              if (p && p.comments) allComments = allComments.concat(p.comments);
            }
        }
    }
    if (allComments.length === 0) {
      throw new Error(
        "Kh\xF4ng c\xF3 l\u1EDDi ph\xEA n\xE0o trong c\u1EA5u h\xECnh d\xE0nh cho ch\u1EE9c n\u0103ng n\xE0y.",
      );
    }

    let totalSuccessCount = 0;
    let keepScrolling = true;
    let loopProtect = 0;
    let emptyPassCount = 0;
    let processedRows = new Set();
    let visibleTextareas = [];
    const isVnEdu = window.location.hostname.includes("vnedu");

    while (keepScrolling && loopProtect < 30) {
      loopProtect++;
      let selector = "textarea, input[type='text'], input:not([type]), div[contenteditable='true'], td[contenteditable='true']";
      let allTextareas = Array.from(
        document.querySelectorAll(selector)
      );
      visibleTextareas = allTextareas.filter((ta) => {
        if (ta.offsetWidth === 0 || ta.offsetHeight === 0) return false;
        if (ta.tagName.toLowerCase() === "input") {
             if (ta.offsetWidth < 50) return false;
             if (ta.maxLength > 0 && ta.maxLength <= 15) return false;
        }
        let p = ta.closest("tr, [role='row']");
        if (p && p.innerText.toLowerCase().includes("nhập vào đây và enter")) return false;
        if (ta.placeholder && ta.placeholder.toLowerCase().includes("nhập vào đây và enter")) return false;
        if (ta.value && ta.value.toLowerCase().includes("nhập vào đây và enter")) return false;
        let pCell = ta.closest("td, [role='cell']");
        if (pCell) {
          let pText = (pCell.getAttribute("title") || pCell.getAttribute("aria-label") || pCell.className || "") + " " + (pCell.innerText || "");
          let n = pText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
          if (n.includes("tu chu") || n.includes("giao tiep") || n.includes("giai quyet") || n.includes("ngon ngu") || n.includes("tinh toan") || n.includes("khoa hoc") || n.includes("tham mi") || n.includes("the chat") || n.includes("yeu nuoc") || n.includes("nhan ai") || n.includes("cham chi") || n.includes("trung thuc") || n.includes("trach nhiem")) {
            return false;
          }
        }
        let rect = ta.getBoundingClientRect();
        return (
          rect.width >= 50 &&
          getComputedStyle(ta).visibility !== "hidden" &&
          !ta.disabled &&
          !ta.readOnly
        );
      });

      let filledInThisPass = 0;
      
      let dataRowsCount = document.querySelectorAll("tr, [role='row']").length;

      let isSmasGridPage = window.location.hostname.includes("smas") || (ctx.textToCheckRole && ctx.textToCheckRole.includes("smas")) ||
                           (ctx.textToCheckRole && ctx.textToCheckRole.includes("5.3.3")) || 
                           window.location.hostname.includes("edu.vn") || window.location.hostname.includes("moet.gov.vn");
      let isNhanXetGrid = (ctx.activeTitleText && (ctx.activeTitleText.includes("sổ ghi nhận xét") || ctx.activeTitleText.includes("nhận xét của giáo viên chủ nhiệm") || ctx.activeTitleText.includes("sổ học bạ") || ctx.activeTitleText.includes("sổ đánh giá môn học"))) || document.title.toLowerCase().includes("sổ đánh giá môn học");
      
      let is533 = ctx.textToCheckRole && ctx.textToCheckRole.includes("5.3.3");
      let isCsdlNganh = window.location.hostname.includes("edu.vn") || window.location.hostname.includes("moet.gov.vn");
      
      if (loopProtect === 1 && ((is533 || isCsdlNganh || (isSmasGridPage && isNhanXetGrid)) || visibleTextareas.length === 0 || (visibleTextareas.length <= 3 && visibleTextareas.length < (dataRowsCount / 2)))) {
          let smasResult = await trySmasClickToEditGrid(commentsPool, subject, config, role, db, ctx);
          if (smasResult && (smasResult.count > 0 || smasResult.gridDetected)) {
              return { 
                  count: smasResult.count, 
                  detectedMon: "Học bạ GVCN (Click-To-Edit)",
                  skippedNoScore: smasResult.skippedNoScore
              };
          }
      }

      for (let i = 0; i < visibleTextareas.length; i++) {
        let oNoiDung = visibleTextareas[i];
        let row = oNoiDung.closest("tr, [role='row']");
        if (!row) continue;
        
        try {
          let currentVal =
            oNoiDung.tagName.toLowerCase() === "div"
              ? oNoiDung.innerText.trim()
              : oNoiDung.value.trim();
          if (currentVal) continue;
          
          let tenHS = "Em";
          let studentKey = "";
          let rowCellsA = row.cells ? Array.from(row.cells) : Array.from(row.querySelectorAll("td, [role='cell']"));
        if (rowCellsA.length > 0) {
          for (let c = 0; c < Math.min(rowCellsA.length, 4); c++) {
              let tdItem = rowCellsA[c];
              let txt = tdItem ? tdItem.innerText.trim() : "";
              if (c > 0 && txt && isNaN(parseFloat(txt)) && txt.includes(" ") && !txt.match(/^[0-9\/]+$/) && tenHS === "Em") {
                tenHS = txt.split(" ").pop();
              }
              studentKey += txt + "_";
            }
          }

          let randomComment =
            allComments[Math.floor(Math.random() * allComments.length)];
          let finalComment = randomComment
            .replace(/{HocSinh}/g, tenHS)
            .replace(/{Môn}/g, subject || "H\u1ECDc b\u1EA1");

          if (config && config.removeTrailingPunctuation) {
            finalComment = finalComment.replace(/[,.;:!\s]+$/, "");
          }

          if (oNoiDung.tagName.toLowerCase() === "div") {
            oNoiDung.innerText = finalComment;
          } else {
            oNoiDung.value = finalComment;
          }
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
          if (oNoiDung.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
              nativeTextAreaValueSetter.call(oNoiDung, finalComment);
          } else if (oNoiDung.tagName.toLowerCase() === 'input' && nativeInputValueSetter) {
              nativeInputValueSetter.call(oNoiDung, finalComment);
          }
          oNoiDung.dispatchEvent(new Event("input", { bubbles: true }));
          oNoiDung.dispatchEvent(new Event("change", { bubbles: true }));
          oNoiDung.dispatchEvent(new Event("blur", { bubbles: true }));
          filledInThisPass++;
          if (studentKey && !processedRows.has(studentKey)) {
             processedRows.add(studentKey);
             totalSuccessCount++;
          } else if (!studentKey) {
             totalSuccessCount++;
          }
          if (filledInThisPass % 15 === 0)
            await new Promise((r) => setTimeout(r, 10));
        } catch (e) {
          console.error(`Lỗi tại hàng Học bạ ${i}:`, e);
        }
      } // end for

      if (filledInThisPass === 0) {
        emptyPassCount++;
        if (emptyPassCount > 1) keepScrolling = false;
        else {
          let containers = Array.from(document.querySelectorAll('*')).filter(el => {
             if (el.tagName === 'BODY' || el.tagName === 'HTML') return false;
             const style = getComputedStyle(el);
             return el.scrollHeight > el.clientHeight + 10 && 
                    (style.overflowY === 'auto' || style.overflowY === 'scroll');
          });
          if (containers.length === 0) {
              containers = document.querySelectorAll(
                ".rgDataDiv, .RadGrid, div[style*='overflow'], .x-grid-view, .x-grid3-scroller, .x-scroller, .x-panel-body"
              );
          }
          containers.forEach((c) => {
            c.scrollTop += 800;
            c.dispatchEvent(new Event("scroll", { bubbles: true }));
          });
          // Also try scrolling window
          window.scrollBy(0, 800);
          
          let lastElement = visibleTextareas[visibleTextareas.length - 1];
          if (lastElement) {
             lastElement.scrollIntoView({ behavior: "instant", block: "end" });
          }

          await new Promise((r) => setTimeout(r, 600));
        }
      } else {
        emptyPassCount = 0;
        let lastElement = visibleTextareas[visibleTextareas.length - 1];
        if (lastElement) {
          lastElement.scrollIntoView({ behavior: "instant", block: "end" });
          let trs = Array.from(document.querySelectorAll("tbody tr")).filter(
            (tr) => tr.offsetHeight > 0,
          );
          if (trs.length > 0)
            trs[trs.length - 1].scrollIntoView({
              behavior: "instant",
              block: "end",
            });

          let containers = Array.from(document.querySelectorAll('*')).filter(el => {
             if (el.tagName === 'BODY' || el.tagName === 'HTML') return false;
             const style = getComputedStyle(el);
             return el.scrollHeight > el.clientHeight + 10 && 
                    (style.overflowY === 'auto' || style.overflowY === 'scroll');
          });
          if (containers.length === 0) {
              containers = document.querySelectorAll(
                ".rgDataDiv, .RadGrid, div[style*='overflow'], .x-grid-view, .x-grid3-scroller, .x-scroller, .x-panel-body"
              );
          }
          containers.forEach((c) => {
            if (c.scrollHeight > c.clientHeight) {
              c.scrollTop += 600;
              c.dispatchEvent(new Event("scroll", { bubbles: true }));
            }
          });
          
          window.scrollBy(0, 600);

          await new Promise((r) => setTimeout(r, 600)); // wait for dom
        } else {
          keepScrolling = false;
        }
      }
    } // end while

    if (totalSuccessCount === 0) {
      throw new Error(
        "Không tìm thấy ô nhập Điểm/Nhận xét trống. (Có thể bạn chưa nhập điểm hoặc đã điền hết).",
      );
    }
    return { count: totalSuccessCount, detectedMon: "H\u1ECDc b\u1EA1 GVCN" };
  }
  async function dienNhanXetNLPCAsync(config, commentsPool, subject) {
    let successCount = 0;
    const getRandom = (arr) => (arr && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : "");
    const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();

    // Robust column header matrix builder taking into account rowspan and colspan
    const resolveTableColHeaders = (targetTable) => {
      let headerRows = [];
      if (targetTable) {
        let thead = targetTable.querySelector("thead");
        if (thead) headerRows = Array.from(thead.querySelectorAll("tr"));
        if (headerRows.length === 0) {
          headerRows = Array.from(targetTable.querySelectorAll("tr")).filter((r) => r.querySelectorAll("th").length > 0);
        }
        if (headerRows.length === 0) {
          let container = targetTable.closest(".rgMasterTableWrap, .k-grid, .grid-container, [id*='Grid'], div") || document;
          let headerTable = container.querySelector("table.rgHeaderTable, .k-grid-header table, table[id*='Header']");
          if (headerTable) {
            let hThead = headerTable.querySelector("thead") || headerTable;
            headerRows = Array.from(hThead.querySelectorAll("tr"));
          }
        }
      }
      if (headerRows.length === 0) {
        let allTrs = Array.from(document.querySelectorAll("tr"));
        headerRows = allTrs.filter((r) => {
          let txt = (r.innerText || "").toLowerCase();
          return (txt.includes("năng lực") || txt.includes("phẩm chất") || txt.includes("nhận xét")) && r.querySelectorAll("th, td").length >= 3;
        });
      }
      if (headerRows.length === 0) return [];

      let matrix = [];
      for (let r = 0; r < headerRows.length; r++) {
        matrix[r] = matrix[r] || [];
        let cells = Array.from(headerRows[r].querySelectorAll("th, td"));
        let colIdx = 0;
        for (let c = 0; c < cells.length; c++) {
          let cell = cells[c];
          while (matrix[r][colIdx] !== undefined) colIdx++;
          let colspan = parseInt(cell.getAttribute("colspan")) || 1;
          let rowspan = parseInt(cell.getAttribute("rowspan")) || 1;
          let text = (cell.innerText || cell.textContent || "").trim().replace(/\s+/g, " ");

          for (let rs = 0; rs < rowspan; rs++) {
            matrix[r + rs] = matrix[r + rs] || [];
            for (let cs = 0; cs < colspan; cs++) {
              matrix[r + rs][colIdx + cs] = text;
            }
          }
          colIdx += colspan;
        }
      }

      let maxCols = 0;
      for (let r = 0; r < matrix.length; r++) {
        if (matrix[r].length > maxCols) maxCols = matrix[r].length;
      }

      let colHeaders = [];
      for (let c = 0; c < maxCols; c++) {
        let parts = [];
        for (let r = 0; r < matrix.length; r++) {
          let txt = matrix[r] && matrix[r][c] ? matrix[r][c] : "";
          if (txt && !parts.includes(txt)) parts.push(txt);
        }
        colHeaders.push(parts.join(" > "));
      }
      return colHeaders;
    };

    const getMajFromValues = (values) => {
      let c = { "T": 0, "Đ": 0, "C": 0 };
      values.forEach((v) => {
        let text = (v || "").trim().toUpperCase();
        if (text === "H" || text.includes("ĐẠT") || text === "HT") text = "Đ";
        if (text.includes("TỐT") || text === "HTT") text = "T";
        if (text.includes("CẦN") || text.includes("CHƯA") || text === "CHT") text = "C";

        if (c[text] !== undefined) c[text]++;
        else if (text.includes("T")) c["T"]++;
        else if (text.includes("Đ")) c["Đ"]++;
        else if (text.includes("C")) c["C"]++;
      });
      if (c["T"] === 0 && c["Đ"] === 0 && c["C"] === 0) return Math.random() < 0.8 ? "T" : "Đ";
      let m = "T", mx = -1;
      for (let k of ["T", "Đ", "C"]) {
        if (c[k] > mx) {
          mx = c[k];
          m = k;
        }
      }
      return m;
    };

    const setValueToElement = (el, val) => {
      if (!el || val === undefined || val === null) return;
      if (el.readOnly) el.readOnly = false;
      if (el.disabled) el.disabled = false;

      if (el.tagName && el.tagName.toLowerCase() === "div") {
        el.innerText = val;
      } else {
        el.value = val;
      }

      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (el.tagName.toLowerCase() === "textarea" && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(el, val);
        } else if (el.tagName.toLowerCase() === "input" && nativeInputValueSetter) {
          nativeInputValueSetter.call(el, val);
        }
      } catch (e) {}

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
    };

    const setCellValueToCell = async (cell, val) => {
      if (!cell || val === undefined || val === null) return;
      let inp = cell.querySelector("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea, div[contenteditable='true']");
      if (inp) {
        setValueToElement(inp, val);
      } else {
        await fillCell(cell, val);
      }
    };

    const getCellValueFromCell = (cell) => {
      if (!cell) return "";
      let inp = cell.querySelector("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea, div[contenteditable='true']");
      if (inp) {
        if (inp.tagName.toLowerCase() === "div") return (inp.innerText || "").trim();
        return (inp.value || "").trim();
      }
      return (cell.innerText || cell.textContent || "").trim();
    };
    const getCellValue = (cell) => getCellValueFromCell(cell);

    const getCommentData = (level, domain, manualCode, excludeComment) => {
      let targetLevel = level || "T";
      if (manualCode) {
        let mUpper = manualCode.toUpperCase();
        for (const [lvl, conf] of Object.entries(commentsPool)) {
          if (conf && conf.code && conf.code.toUpperCase() === mUpper) {
            targetLevel = lvl;
            break;
          }
        }
      }

      let conf = commentsPool[targetLevel];
      if (!conf) {
        if (targetLevel === "T" || targetLevel === "HTT" || targetLevel === "TỐT") conf = commentsPool["Tốt"] || commentsPool["T"];
        else if (targetLevel === "C" || targetLevel === "CHT" || targetLevel.includes("CỐ GẮNG")) conf = commentsPool["Cần cố gắng"] || commentsPool["C"];
        else conf = commentsPool["Đạt"] || commentsPool["H"] || commentsPool["Đ"];
      }

      let list = conf?.comments || [];
      if (list.length === 0) {
        if (domain === "chung") {
          list = [
            "Năng lực tự chủ tốt, giao tiếp lưu loát, tự tin. Tích cực tham gia các hoạt động.",
            "Có khả năng tự học tốt. Biết chia sẻ và hợp tác tốt với bạn bè.",
            "Mạnh dạn, tự tin, hòa đồng với bạn bè xung quanh.",
            "Tự giác hoàn thành phần việc được giao, không cần nhắc nhở.",
            "Khả năng làm việc nhóm xuất sắc, biết lắng nghe ý kiến người khác."
          ];
        } else if (domain === "phamchat") {
          list = [
            "Chăm ngoan, lễ phép, có ý thức kỷ luật tốt và luôn trung thực.",
            "Biết quan tâm, giúp đỡ bạn bè, có tinh thần trách nhiệm cao.",
            "Tích cực tham gia các hoạt động tập thể, đoàn kết với bạn bè.",
            "Có ý thức tự giác, giữ gìn vệ sinh chung và bảo vệ của công.",
            "Gương mẫu trong thực hiện nề nếp, chan hòa và thân thiện."
          ];
        } else {
          list = [
            "Chủ động, tích cực trong học tập, tự tin khi thuyết trình.",
            "Nhanh nhẹn, tháo vát, thường đưa ra những ý tưởng sáng tạo.",
            "Có khả năng tự giải quyết vấn đề cá nhân hiệu quả.",
            "Vận dụng kiến thức vào thực hành linh hoạt, diễn đạt lưu loát.",
            "Có năng khiếu nổi bật, tiếp thu nhanh và hoàn thành tốt nhiệm vụ."
          ];
        }
      }

      let filtered = list;
      if (domain === "chung") {
        let pref = list.filter((c) => {
          let n = norm(c);
          return (
            n.includes("tu chu") ||
            n.includes("tu hoc") ||
            n.includes("giao tiep") ||
            n.includes("hop tac") ||
            n.includes("chia se") ||
            n.includes("lam viec nhom") ||
            n.includes("giai quyet")
          );
        });
        if (pref.length > 0) filtered = pref;
      } else if (domain === "phamchat") {
        let pref = list.filter((c) => {
          let n = norm(c);
          return (
            n.includes("yeu nuoc") ||
            n.includes("nhan ai") ||
            n.includes("cham chi") ||
            n.includes("trung thuc") ||
            n.includes("trach nhiem") ||
            n.includes("dao duc") ||
            n.includes("ky luat") ||
            n.includes("le phep") ||
            n.includes("doan ket") ||
            n.includes("ngoan ngoan")
          );
        });
        if (pref.length > 0) filtered = pref;
      } else if (domain === "dacthu") {
        let pref = list.filter((c) => {
          let n = norm(c);
          return (
            n.includes("ngon ngu") ||
            n.includes("tinh toan") ||
            n.includes("khoa hoc") ||
            n.includes("tham mi") ||
            n.includes("the chat") ||
            n.includes("sang tao") ||
            n.includes("thuyet trinh") ||
            n.includes("nang khieu") ||
            n.includes("y tuong")
          );
        });
        if (pref.length > 0) filtered = pref;
      }

      if (excludeComment && filtered.length > 1) {
        filtered = filtered.filter((c) => c !== excludeComment);
      }

      let chosenComment = getRandom(filtered) || getRandom(list);
      let chosenCode = manualCode || conf?.code || (targetLevel === "Đạt" ? "Đ" : targetLevel === "Cần cố gắng" ? "C" : "T");
      return { comment: chosenComment, code: chosenCode };
    };

    let bodyTextNorm = norm(document.body.innerText || "");
    let hasPhamChatCol = bodyTextNorm.includes("nhan xet pham chat") || bodyTextNorm.includes("pham chat chu yeu") || bodyTextNorm.includes("tat ca nang luc, pham chat");

    let visibleRows = Array.from(document.querySelectorAll("tbody tr, [role='row']")).filter((row) => {
      if (row.offsetHeight === 0) return false;
      let txt = (row.innerText || "").toLowerCase();
      if (txt.includes("nhập vào đây để lọc") || txt.includes("nhập vào đây và enter")) return false;
      let cells = row.querySelectorAll("td, [role='cell']");
      return cells.length >= 4;
    });

    for (let row of visibleRows) {
      try {
        let allRowCells = Array.from(row.querySelectorAll("td, [role='cell']"));
        let visibleTds = allRowCells.filter((td) => td.offsetWidth > 0 || td.offsetHeight > 0 || getComputedStyle(td).display !== "none");
        let L = visibleTds.length;
        if (L < 4) continue;

        // Student name extraction
        let tenHS = "Em";
        for (let c = 0; c < Math.min(visibleTds.length, 5); c++) {
          let txt = (visibleTds[c].innerText || visibleTds[c].textContent || "").trim();
          if (txt && isNaN(parseFloat(txt)) && txt.includes(" ") && !txt.match(/^[0-9\/\-]+$/) && txt.length >= 3 && txt.length <= 40) {
            let parts = txt.split(/\s+/);
            tenHS = parts[parts.length - 1];
            break;
          }
        }

        // Check frozen table for student name if not found in data row
        if (tenHS === "Em") {
          let container = row.closest(".rgMasterTableWrap, .RadGrid, [id*='Grid'], div");
          if (container) {
            let frozenTable = container.querySelector(".rgFrozenTable, table.rgMasterTable:not([id*='DataDiv'])");
            if (frozenTable && frozenTable.rows && frozenTable.rows[row.rowIndex]) {
              let fRow = frozenTable.rows[row.rowIndex];
              for (let c = 0; c < fRow.cells.length; c++) {
                let txt = (fRow.cells[c].innerText || "").trim();
                if (txt && isNaN(parseFloat(txt)) && txt.includes(" ") && !txt.match(/^[0-9\/\-]+$/) && txt.length >= 3) {
                  let parts = txt.split(/\s+/);
                  tenHS = parts[parts.length - 1];
                  break;
                }
              }
            }
          }
        }

        // Deterministic column mapping for 5.3.2:
        // Table layout on 5.3.2 (Tất cả năng lực & phẩm chất):
        //   Cột 1: STT, Cột 2: Họ tên, Cột 3: Ngày sinh
        //   Cột 4..16: 13 tiêu chí (Tự chủ, Giao tiếp, Giải quyết, Ngôn ngữ, Tính toán, Khoa học, Thẩm mĩ, Thể chất, Yêu nước, Nhân ái, Chăm chỉ, Trung thực, Trách nhiệm)
        //   Cột 17: Mã nhận xét năng lực chung  -> visibleTds[L - 6] (hoặc visibleTds[16])
        //   Cột 18: Nội dung nhận xét năng lực chung -> visibleTds[L - 5] (hoặc visibleTds[17])
        //   Cột 19: Mã nhận xét năng lực đặc thù -> visibleTds[L - 4] (hoặc visibleTds[18])
        //   Cột 20: Nội dung nhận xét năng lực đặc thù -> visibleTds[L - 3] (hoặc visibleTds[19])
        //   Cột 21: Mã nhận xét phẩm chất chủ yếu -> visibleTds[L - 2] (hoặc visibleTds[20])
        //   Cột 22: Nội dung nhận xét phẩm chất chủ yếu -> visibleTds[L - 1] (hoặc visibleTds[21])
        let hasPC = hasPhamChatCol || L >= 20 || (L >= 18 && L <= 19);

        let cellMaChung = null;
        let cellNoiDungChung = null;
        let cellMaDacThu = null;
        let cellNoiDungDacThu = null;
        let cellMaPhamChat = null;
        let cellNoiDungPhamChat = null;

        if (hasPC && L >= 6) {
          cellMaChung = visibleTds[L - 6];
          cellNoiDungChung = visibleTds[L - 5];
          cellMaDacThu = visibleTds[L - 4];
          cellNoiDungDacThu = visibleTds[L - 3];
          cellMaPhamChat = visibleTds[L - 2];
          cellNoiDungPhamChat = visibleTds[L - 1];
        } else if (L >= 4) {
          cellMaChung = visibleTds[L - 4];
          cellNoiDungChung = visibleTds[L - 3];
          cellMaDacThu = visibleTds[L - 2];
          cellNoiDungDacThu = visibleTds[L - 1];
        }

        if (!cellNoiDungChung && !cellNoiDungDacThu) continue;

        // CRITICAL: Criteria range and safety isolation
        // If row contains frozen columns (L >= 20), criteria are columns 3 to 15 (indices 3..15)
        // If row is only scrollable columns (L == 19), criteria are columns 0 to 12 (indices 0..12)
        let criteriaStartIdx = (L >= 20) ? 3 : 0;
        let numChung = 3;
        let numDacThu = 5;
        let numPhamChat = hasPC ? 5 : 0;
        let totalCriteria = numChung + numDacThu + numPhamChat;
        let criteriaEndIdx = criteriaStartIdx + totalCriteria;

        // AUTOMATIC CLEANUP: Clean up any criteria cell (cột 4..16) that accidentally received comment text before
        const validGrades = ["T", "Đ", "C", "HTT", "HT", "CHT", "H", "K", "1", "2", "3"];
        for (let c = criteriaStartIdx; c < criteriaEndIdx && c < visibleTds.length; c++) {
          let td = visibleTds[c];
          if (!td) continue;
          let inp = td.querySelector("input, textarea, div[contenteditable='true']");
          if (inp) {
            let rawVal = (inp.tagName.toLowerCase() === "div" ? inp.innerText : inp.value) || "";
            let trimmed = rawVal.trim().toUpperCase();
            // If value is long text or comment fragment (length > 2) or invalid grade word, clear it!
            if (trimmed.length > 2 || (!validGrades.includes(trimmed) && trimmed !== "")) {
              console.log(`[5.3.2 Cleanup] Dọn dẹp ký tự bị điền nhầm ở cột ${c + 1}: "${rawVal}"`);
              setValueToElement(inp, "");
            }
          }
        }

        // Read criteria values for majority calculation:
        let nlChungVals = [];
        let nlDacThuVals = [];
        let phamChatVals = [];

        for (let c = criteriaStartIdx; c < criteriaEndIdx && c < visibleTds.length; c++) {
          let td = visibleTds[c];
          if (!td) continue;
          let val = getCellValueFromCell(td).toUpperCase();
          if (!validGrades.includes(val)) val = "";
          let rel = c - criteriaStartIdx;
          if (rel < numChung) {
            nlChungVals.push(val);
          } else if (rel < numChung + numDacThu) {
            nlDacThuVals.push(val);
          } else {
            phamChatVals.push(val);
          }
        }

        let majNlChung = getMajFromValues(nlChungVals);
        let majNlDacThu = getMajFromValues(nlDacThuVals);
        let majPhamChat = getMajFromValues(phamChatVals);

        // Check existing manual codes or comments:
        let existingCodeChung = getCellValueFromCell(cellMaChung);
        let existingCommentChung = getCellValueFromCell(cellNoiDungChung);

        let existingCodeDacThu = getCellValueFromCell(cellMaDacThu);
        let existingCommentDacThu = getCellValueFromCell(cellNoiDungDacThu);

        let existingCodePhamChat = getCellValueFromCell(cellMaPhamChat);
        let existingCommentPhamChat = getCellValueFromCell(cellNoiDungPhamChat);

        let shouldFillChung = cellNoiDungChung && (config.overwrite === true || !existingCommentChung);
        let shouldFillDacThu = cellNoiDungDacThu && (config.overwrite === true || !existingCommentDacThu);
        let shouldFillPhamChat = cellNoiDungPhamChat && (config.overwrite === true || !existingCommentPhamChat);

        let rowFilled = false;

        // 1. Fill Nhận xét năng lực chung:
        let dataChung = null;
        if (shouldFillChung) {
          dataChung = getCommentData(majNlChung, "chung", existingCodeChung, null);
          let finalCommentChung = dataChung.comment.replace(/{HocSinh}/g, tenHS).replace(/{Môn}/g, "");
          if (config.removeTrailingPunctuation) {
            finalCommentChung = finalCommentChung.replace(/[,.;:!\s]+$/, "");
          }
          await setCellValueToCell(cellNoiDungChung, finalCommentChung);

          if (config.autoFillCode !== false && dataChung.code && cellMaChung && (!existingCodeChung || config.overwrite)) {
            await setCellValueToCell(cellMaChung, dataChung.code);
          }
          rowFilled = true;
        }

        // 2. Fill Nhận xét năng lực đặc thù:
        let dataDacThu = null;
        if (shouldFillDacThu) {
          let excludeC = dataChung ? dataChung.comment : existingCommentChung;
          dataDacThu = getCommentData(majNlDacThu, "dacthu", existingCodeDacThu, excludeC);
          let finalCommentDacThu = dataDacThu.comment.replace(/{HocSinh}/g, tenHS).replace(/{Môn}/g, "");
          if (config.removeTrailingPunctuation) {
            finalCommentDacThu = finalCommentDacThu.replace(/[,.;:!\s]+$/, "");
          }
          await setCellValueToCell(cellNoiDungDacThu, finalCommentDacThu);

          if (config.autoFillCode !== false && dataDacThu.code && cellMaDacThu && (!existingCodeDacThu || config.overwrite)) {
            await setCellValueToCell(cellMaDacThu, dataDacThu.code);
          }
          rowFilled = true;
        }

        // 3. Fill Nhận xét phẩm chất chủ yếu:
        if (shouldFillPhamChat) {
          let excludeArr = [];
          if (dataChung) excludeArr.push(dataChung.comment);
          if (dataDacThu) excludeArr.push(dataDacThu.comment);
          let dataPhamChat = getCommentData(majPhamChat, "phamchat", existingCodePhamChat, excludeArr[0]);
          let finalCommentPhamChat = dataPhamChat.comment.replace(/{HocSinh}/g, tenHS).replace(/{Môn}/g, "");
          if (config.removeTrailingPunctuation) {
            finalCommentPhamChat = finalCommentPhamChat.replace(/[,.;:!\s]+$/, "");
          }
          await setCellValueToCell(cellNoiDungPhamChat, finalCommentPhamChat);

          if (config.autoFillCode !== false && dataPhamChat.code && cellMaPhamChat && (!existingCodePhamChat || config.overwrite)) {
            await setCellValueToCell(cellMaPhamChat, dataPhamChat.code);
          }
          rowFilled = true;
        }

        if (rowFilled) {
          successCount++;
        }
      } catch (e) {
        console.error("Lỗi hàng 5.3.2:", e);
      }
    }

    if (successCount === 0) {
      throw new Error("Không tìm thấy ô nhận xét hợp lệ trên màn hình 5.3.2 hoặc các ô đã có dữ liệu (hãy bật 'Ghi đè nhận xét cũ' nếu muốn điền lại).");
    }

    return { count: successCount, detectedMon: "Năng lực & Phẩm chất (5.3.2)" };
  }

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const fillCell = async (td, value) => {
    if (!td || !value) return;

    // Cuộn ô hiển thị giữa màn hình để tránh lỗi click hụt
    td.scrollIntoView({ block: "center", behavior: "instant" });

    td.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    td.click();
    td.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await sleep(150);

    let editor = td.querySelector(
      'input.rcbInput, textarea.riTextBox, input[type="text"]',
    );
    let clientState = td.querySelector(
      'input[type="hidden"][id$="_ClientState"]',
    );

    if (editor) {
      editor.focus();
      editor.value = value;
      editor.dispatchEvent(new Event("input", { bubbles: true }));

      // GIẢ LẬP NHẤN ENTER ĐỂ CHỐT COMBOBOX
      editor.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          keyCode: 13,
          bubbles: true,
        }),
      );
      editor.dispatchEvent(new Event("change", { bubbles: true }));

      if (clientState) {
        try {
          let state = clientState.value ? JSON.parse(clientState.value) : {};
          state.text = value;
          state.value = value;
          state.validationText = value;
          state.valueAsString = value;
          state.lastSetTextBoxValue = value;
          clientState.value = JSON.stringify(state);
        } catch (e) {}
      }
      editor.dispatchEvent(new Event("blur", { bubbles: true }));
    }
    await sleep(50);
  };

  // Helper kiểm tra chính xác trạng thái VIP của người dùng (xử lý mọi định dạng expiryDate, Firestore Timestamp, ISO string, số mili-giây)
  const checkIsUserVip = (authState) => {
    if (!authState) return false;
    const email = (authState.email || "").toLowerCase().trim();
    const isAdmin = authState.isAdmin === true ||
      email === 'admin@admin.com' || email.includes('admin') ||
      email === 'hvdkhoa89@gmail.com' || email === 'khoahoang9999@gmail.com' ||
      email.startsWith('khoa') || email.includes('hvdkhoa');
    if (isAdmin) return true;
    if (authState.isVip === true || authState.tier === 'VIP' || authState.role === 'vip') return true;
    if ((authState.credits || 0) > 0) return true;
    if (authState.expiryDate) {
      try {
        let expTime = 0;
        if (typeof authState.expiryDate === 'number') {
          expTime = authState.expiryDate;
        } else if (typeof authState.expiryDate === 'string') {
          expTime = new Date(authState.expiryDate).getTime();
        } else if (authState.expiryDate.seconds) {
          expTime = authState.expiryDate.seconds * 1000;
        } else if (authState.expiryDate._seconds) {
          expTime = authState.expiryDate._seconds * 1000;
        } else if (typeof authState.expiryDate.toDate === 'function') {
          expTime = authState.expiryDate.toDate().getTime();
        } else if (authState.expiryDate instanceof Date) {
          expTime = authState.expiryDate.getTime();
        }
        if (!isNaN(expTime) && expTime > Date.now()) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  };

  // Hàm chuẩn hóa và nhận diện chính xác môn học trên CSDL Ngành (5.3.4)
  // Hàm chuẩn hóa và nhận diện chính xác môn học trên CSDL Ngành (5.3.4)
  // Tuyệt đối phân biệt rạch ròi giữa "Công nghệ" và "Mĩ thuật", không bao giờ bị lẫn lộn
  const normalizeSubjectName = (name) => {
    if (!name || typeof name !== "string") return "";
    let s = name.trim().toLowerCase();
    if (!s) return "";

    // Xóa tiền tố nhãn thông thường nếu có
    s = s.replace(/^(môn học\/hđgd|môn học|môn thi|môn)\s*[:\-]?\s*/i, "").trim();

    // 1. MĨ THUẬT / MỸ THUẬT (Ưu tiên số 1 - nhận diện chuẩn xác cả cách viết "i" và "y")
    if (
      s.includes("mĩ thuật") || s.includes("mỹ thuật") ||
      s.includes("mi thuat") || s.includes("my thuat") ||
      s === "mĩ" || s === "mỹ" || s === "mt" ||
      s.startsWith("mĩ thuật") || s.startsWith("mỹ thuật")
    ) {
      return "Mĩ thuật";
    }

    // 2. CÔNG NGHỆ (Tuyệt đối loại trừ 'Công nghệ thông tin' / 'CNTT' vì đó là tên phòng ban hoặc hệ thống phần mềm)
    if (
      (s.includes("công nghệ") || s.includes("cong nghe")) &&
      !s.includes("thông tin") && !s.includes("thong tin") && !s.includes("cntt")
    ) {
      return "Công nghệ";
    }

    // 3. TIN HỌC
    if (s.includes("tin học") || s.includes("tin hoc")) {
      return "Tin học";
    }
    // 4. TIẾNG VIỆT
    if (s.includes("tiếng việt") || s.includes("tieng viet")) {
      return "Tiếng Việt";
    }
    // 5. TOÁN
    if (s.includes("toán") || s.includes("toan")) {
      return "Toán";
    }
    // 6. ĐẠO ĐỨC
    if (s.includes("đạo đức") || s.includes("dao duc")) {
      return "Đạo đức";
    }
    // 7. TỰ NHIÊN VÀ XÃ HỘI
    if (s.includes("tự nhiên và xã hội") || s.includes("tự nhiên") || s.includes("tnxh")) {
      return "Tự nhiên và Xã hội";
    }
    // 8. KHOA HỌC
    if (s.includes("khoa học") || s.includes("khoa hoc")) {
      return "Khoa học";
    }
    // 9. LỊCH SỬ VÀ ĐỊA LÍ
    if (s.includes("lịch sử") || s.includes("địa lí") || s.includes("địa lý") || s.includes("ls&đl")) {
      return "Lịch sử và Địa lí";
    }
    // 10. NGOẠI NGỮ / TIẾNG ANH
    if (s.includes("tiếng anh") || s.includes("ngoại ngữ") || s.includes("tieng anh") || s.includes("ngoai ngu") || s.includes("english")) {
      return "Ngoại ngữ";
    }
    // 11. GIÁO DỤC THỂ CHẤT
    if (s.includes("thể chất") || s.includes("gdtc") || s.includes("the chat")) {
      return "Giáo dục thể chất";
    }
    // 12. ÂM NHẠC
    if (s.includes("âm nhạc") || s.includes("am nhac")) {
      return "Âm nhạc";
    }
    // 13. HOẠT ĐỘNG TRẢI NGHIỆM
    if (s.includes("trải nghiệm") || s.includes("trai nghiem") || s.includes("hđtn")) {
      return "Hoạt động trải nghiệm";
    }
    // 14. TỔNG HỢP
    if (s.includes("tổng hợp") || s.includes("tong hop") || s.includes("hđgd") || s.includes("hoạt động giáo dục")) {
      return "Tổng hợp";
    }
    return name.trim();
  };

  const detectCSDLSubject = (fallback) => {
    // 1. Quét trực tiếp các input và combobox Môn học trên CSDL Ngành / SMAS / Telerik
    const subjectSelectors = [
      "input[id*='cboMonHoc_Input']", "input[id*='rcbMonHoc_Input']", "input[id*='ddlMonHoc_Input']",
      "input[id*='cboMon_Input']", "input[id*='rcbMon_Input']", "input[id*='ddlMon_Input']",
      "input[name*='MonHoc']", "input[name*='cboMon']", "input[name*='rcbMon']",
      ".RadComboBox[id*='MonHoc'] input.rcbInput", ".RadComboBox[id*='Mon'] input.rcbInput",
      ".RadComboBox[id*='cboMonHoc'] input", ".RadComboBox[id*='rcbMonHoc'] input",
      "select[id*='ddlMonHoc']", "select[id*='cboMonHoc']", "select[id*='MonHoc']", "select[id*='Subject']",
      "select[name*='MonHoc']", "select[id*='cboMon']", "select[id*='ddlMon']",
      ".select2-selection__rendered[id*='MonHoc']", ".select2-selection__rendered[id*='Mon']"
    ];

    for (let sel of subjectSelectors) {
      let el = document.querySelector(sel);
      if (el) {
        let val = "";
        if (el.tagName?.toLowerCase() === "select") {
          val = el.options[el.selectedIndex]?.text?.trim() || el.value?.trim() || "";
        } else if (el.tagName?.toLowerCase() === "input") {
          val = (el.value || el.getAttribute("value") || "").trim();
        } else {
          val = (el.innerText || "").trim();
        }
        let norm = normalizeSubjectName(val);
        if (norm) {
          console.log("[CSDL Subject Detection] Khớp từ selector:", sel, "=>", norm);
          return norm;
        }
      }
    }

    // 2. Tìm theo nhãn / Text "Môn học:" hoặc "Môn:" hoặc "Môn học/HĐGD" trong DOM
    const allLabels = Array.from(document.querySelectorAll("td, th, label, span, div.form-group, div.filter-item, div"));
    for (let lbl of allLabels) {
      if (lbl.children.length > 3) continue;
      let t = (lbl.innerText || "").trim().toLowerCase();
      if (
        t === "môn học:" || t === "môn:" || t === "môn học" || t === "môn" ||
        t.startsWith("môn học/hđgd") || t.startsWith("môn/hđgd") || t.startsWith("môn học / hđgd") ||
        t.startsWith("môn học:") || t.startsWith("môn:")
      ) {
        let container = lbl.closest("tr") || lbl.parentElement;
        if (container) {
          let inp = container.querySelector("input.rcbInput, input[type='text'], select, .select2-selection__rendered");
          if (inp) {
            let val = inp.tagName?.toLowerCase() === "select"
              ? (inp.options[inp.selectedIndex]?.text?.trim() || inp.value?.trim() || "")
              : (inp.value || inp.getAttribute("value") || "").trim();
            let norm = normalizeSubjectName(val);
            if (norm) {
              console.log("[CSDL Subject Detection] Khớp từ nhãn lân cận:", t, "=>", norm);
              return norm;
            }
          }
        }
      }
    }

    // 3. Quét tiêu đề bảng, caption, breadcrumb (Ưu tiên Mĩ thuật trước, chỉ khớp Công nghệ nếu không phải CNTT)
    const headerElements = Array.from(document.querySelectorAll(".RadGrid th, .RadGrid caption, .rgCaption, table th, table caption, .page-title"));
    for (let h of headerElements) {
      let txt = (h.innerText || "").trim();
      if (!txt || txt.length > 100) continue;
      let lower = txt.toLowerCase();
      if (lower.includes("mĩ thuật") || lower.includes("mỹ thuật") || lower.includes("mi thuat") || lower.includes("my thuat")) {
        console.log("[CSDL Subject Detection] Khớp Mĩ thuật từ tiêu đề bảng:", txt);
        return "Mĩ thuật";
      }
      if ((lower.includes("công nghệ") || lower.includes("cong nghe")) && !lower.includes("thông tin") && !lower.includes("cntt")) {
        console.log("[CSDL Subject Detection] Khớp Công nghệ từ tiêu đề bảng:", txt);
        return "Công nghệ";
      }
      if (lower.includes("tin học")) return "Tin học";
    }

    // 4. Quét các ô input text visible (CHỈ lấy value của input/select)
    const visibleInputs = Array.from(document.querySelectorAll("input.rcbInput, select, input[type='text']"));
    for (let inp of visibleInputs) {
      if (!inp.offsetWidth && !inp.offsetHeight) continue;
      let val = inp.tagName?.toLowerCase() === "select"
        ? (inp.options[inp.selectedIndex]?.text?.trim() || inp.value?.trim() || "")
        : (inp.value || inp.getAttribute("value") || "").trim();
      if (!val || val.length > 50) continue;
      let norm = normalizeSubjectName(val);
      if (norm && ["Mĩ thuật", "Công nghệ", "Tin học", "Toán", "Tiếng Việt", "Đạo đức", "Khoa học", "Lịch sử và Địa lí", "Ngoại ngữ", "Giáo dục thể chất", "Âm nhạc", "Hoạt động trải nghiệm"].includes(norm)) {
        console.log("[CSDL Subject Detection] Khớp từ ô input hiển thị:", val, "=>", norm);
        return norm;
      }
    }

    // 5. Fallback nếu người gọi truyền vào (hoặc đã nhận diện từ fillCommentsInner)
    if (fallback) {
      let normFallback = normalizeSubjectName(fallback);
      if (normFallback) return normFallback;
    }

    // 6. Kiểm tra các th trong bảng xem có cột Mĩ thuật / Mỹ thuật không
    const tableThs = Array.from(document.querySelectorAll("table th, .RadGrid th")).map(th => (th.innerText || "").toLowerCase());
    if (tableThs.some(t => t.includes("mĩ thuật") || t.includes("mỹ thuật") || t.includes("mi thuat"))) {
      return "Mĩ thuật";
    }

    return fallback ? normalizeSubjectName(fallback) : "Mĩ thuật";
  };

  async function dienNhanXetDGTXAsync(
    config,
    dbDGTX,
    capHoc,
    fallbackSubject,
    khoiLop,
    dbFull,
  ) {
    let successCount = 0;

    // 1. ĐỌC HỆ TỌA ĐỘ
    let currentKhoi = "Khối " + (khoiLop || "1");
    let currentMon = detectCSDLSubject(fallbackSubject);
    let currentThang = "Tháng 8";

    let allInputs = Array.from(
      document.querySelectorAll('.rcbInput, input[type="text"], select, .select2-selection__rendered, [id*="ddl"], [id*="cbo"]'),
    ).map((el) => {
      if (el.tagName?.toLowerCase() === "select") {
        return el.options[el.selectedIndex]?.text?.trim() || el.value?.trim() || "";
      }
      return (el.value || el.innerText || "").trim();
    });

    let knownSubs = [
      "Mĩ thuật",
      "Mỹ thuật",
      "Công nghệ",
      "Tin học",
      "Tiếng Việt",
      "Toán",
      "Đạo đức",
      "Tự nhiên và Xã hội",
      "Tự nhiên",
      "Xã hội",
      "Khoa học",
      "Lịch sử và Địa lí",
      "Lịch sử",
      "Địa lí",
      "Ngoại ngữ",
      "Tiếng Anh",
      "Giáo dục thể chất",
      "Thể chất",
      "Âm nhạc",
      "Hoạt động trải nghiệm",
      "trải nghiệm",
      "tổng hợp",
      "hđgd",
      "hoạt động giáo dục"
    ];

    document.querySelectorAll("select, [id*='ddl'], [id*='cbo']").forEach((sel) => {
      let txt = sel.tagName?.toLowerCase() === "select"
        ? (sel.options[sel.selectedIndex]?.text?.trim() || sel.value?.trim() || "")
        : (sel.value || sel.innerText || "").trim();
      if (txt.includes("Khối")) currentKhoi = txt;
      if (txt.match(/(\d{1,2})\s*-\s*\d{4}/) || txt.toLowerCase().includes("tháng")) {
        let m = txt.match(/\d+/);
        if (m) currentThang = "Tháng " + parseInt(m[0], 10);
      }
    });

    let khoiMatch = allInputs.find((val) => val.includes("Khối"));
    if (khoiMatch) currentKhoi = khoiMatch;

    // Nhận diện chuẩn xác môn học (Ưu tiên cao độ phân biệt Mĩ thuật / Công nghệ)
    currentMon = detectCSDLSubject(fallbackSubject);

    let thangMatch = allInputs.find((val) =>
      val.match(/(\d{1,2})\s*-\s*\d{4}/),
    );
    if (thangMatch) {
      let m = thangMatch.match(/(\d{1,2})\s*-\s*\d{4}/);
      if (m) currentThang = "Tháng " + parseInt(m[1], 10);
    } else {
      let directThang = allInputs.find((val) =>
        val.toLowerCase().includes("tháng"),
      );
      if (directThang) {
        let m2 = directThang.match(/\d+/);
        if (m2) currentThang = "Tháng " + m2[0];
      }
    }

    console.log(
      `[Hệ tọa độ] Khối: ${currentKhoi} | Môn: ${currentMon} | Tháng: ${currentThang}`,
    );

    // 2. TÌM BẢNG, HÀNG DỮ LIỆU VÀ PHÁT HIỆN CỘT THÔNG MINH
    let radGrid = document.querySelector(".RadGrid");
    let headerRows = [];
    if (radGrid) {
      headerRows = Array.from(radGrid.querySelectorAll(".rgHeaderTable tr, thead tr")).filter(
        (r) => r.querySelectorAll("th, td").length > 0
      );
    }
    if (headerRows.length === 0) {
      let headerTable = document.querySelector(".rgHeaderTable, .RadGridHeader, .k-grid-header");
      if (headerTable) {
        headerRows = Array.from(headerTable.querySelectorAll("tr")).filter((r) => r.querySelectorAll("th, td").length > 0);
      }
    }
    if (headerRows.length === 0) {
      let thead = document.querySelector("table thead");
      if (thead) headerRows = Array.from(thead.querySelectorAll("tr"));
    }
    if (headerRows.length === 0) {
      headerRows = Array.from(document.querySelectorAll("table tr")).filter((r) => r.querySelectorAll("th").length >= 3);
    }

    let colHeaders = [];
    if (headerRows.length > 0) {
      let matrix = [];
      for (let r = 0; r < headerRows.length; r++) {
        matrix[r] = matrix[r] || [];
        let cells = Array.from(headerRows[r].querySelectorAll("th, td"));
        let colIdx = 0;
        for (let c = 0; c < cells.length; c++) {
          let cell = cells[c];
          while (matrix[r][colIdx] !== undefined) colIdx++;
          let colspan = parseInt(cell.getAttribute("colspan")) || 1;
          let rowspan = parseInt(cell.getAttribute("rowspan")) || 1;
          let text = (cell.innerText || cell.textContent || "").trim().replace(/\s+/g, " ");
          for (let rs = 0; rs < rowspan; rs++) {
            matrix[r + rs] = matrix[r + rs] || [];
            for (let cs = 0; cs < colspan; cs++) {
              matrix[r + rs][colIdx + cs] = text;
            }
          }
          colIdx += colspan;
        }
      }
      let maxCols = 0;
      for (let r = 0; r < matrix.length; r++) {
        if (matrix[r] && matrix[r].length > maxCols) maxCols = matrix[r].length;
      }
      for (let c = 0; c < maxCols; c++) {
        let parts = [];
        for (let r = 0; r < matrix.length; r++) {
          let txt = matrix[r] && matrix[r][c] ? matrix[r][c] : "";
          if (txt && !parts.includes(txt)) parts.push(txt);
        }
        colHeaders.push(parts.join(" > "));
      }
    }

    // Tìm các dòng dữ liệu học sinh
    let trs = [];
    if (radGrid) {
      trs = Array.from(
        radGrid.querySelectorAll(".rgMasterTable tbody tr.rgRow, .rgMasterTable tbody tr.rgAltRow, tbody tr.rgRow, tbody tr.rgAltRow")
      ).filter((tr) => {
        if (tr.closest("thead") || tr.querySelectorAll("th").length > 2) return false;
        let tds = tr.querySelectorAll("td");
        return tds.length >= 4 && tr.offsetHeight > 0;
      });
    }
    if (trs.length === 0) {
      trs = Array.from(
        document.querySelectorAll(
          ".RadGrid tbody tr.rgRow, .RadGrid tbody tr.rgAltRow, table tbody tr, table tr",
        ),
      ).filter((tr) => {
        if (tr.closest("thead") || tr.querySelectorAll("th").length > 2) return false;
        let tds = tr.querySelectorAll("td");
        return tds.length >= 4 && tr.offsetHeight > 0;
      });
    }

    // Kiểm tra cấu trúc ô của dòng đầu tiên (để phân biệt chính xác 100% giữa ô Textarea nhận xét và ô Input mã)
    let cellProfiles = [];
    if (trs.length > 0) {
      let sampleTds = Array.from(trs[0].querySelectorAll("td"));
      cellProfiles = sampleTds.map((td, idx) => {
        let hasTextarea = td.querySelector("textarea") !== null;
        let input = td.querySelector("input:not([type='checkbox']):not([type='radio'])");
        let hasInput = input !== null && !hasTextarea;
        let isReadonly = td.classList.contains("aspNetDisabled") || td.classList.contains("rgReadOnly") || (input && (input.disabled || input.readOnly)) || (hasTextarea && (td.querySelector("textarea").disabled || td.querySelector("textarea").readOnly));
        let className = td.className || "";
        return { idx, hasTextarea, hasInput, isReadonly, className };
      });
    }

    let colIndices = {
      monMa: -1,
      monNd: -1,
      nlcMa: -1,
      nlcNd: -1,
      nldMa: -1,
      nldNd: -1,
      pcMa: -1,
      pcNd: -1,
    };

    // 1. Nhận diện theo class tên trường đặc trưng của SMAS RadGrid
    cellProfiles.forEach((p) => {
      let cn = p.className.toLowerCase();
      if (cn.includes("manoidungmonhoc") || cn.includes("manxmonhoc")) colIndices.monMa = p.idx;
      else if (cn.includes("noidungmonhoc") || cn.includes("nhanxetmonhoc")) colIndices.monNd = p.idx;
      else if (cn.includes("manoidungnanglucchung") || cn.includes("manxnanglucchung")) colIndices.nlcMa = p.idx;
      else if (cn.includes("noidungnanglucchung") || cn.includes("nhanxetnanglucchung")) colIndices.nlcNd = p.idx;
      else if (cn.includes("manoidungnanglucdacthu") || cn.includes("manxnanglucdacthu")) colIndices.nldMa = p.idx;
      else if (cn.includes("noidungnanglucdacthu") || cn.includes("nhanxetnanglucdacthu")) colIndices.nldNd = p.idx;
      else if (cn.includes("manoidungphamchat") || cn.includes("manxphamchat")) colIndices.pcMa = p.idx;
      else if (cn.includes("noidungphamchat") || cn.includes("nhanxetphamchat")) colIndices.pcNd = p.idx;
    });

    const normHeader = (s) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();

    // 2. Nhận diện theo tiêu đề cột nếu chưa xác định được bằng class
    colHeaders.forEach((thText, idx) => {
      let normTxt = normHeader(thText);
      let parts = thText.split(" > ");
      let leafText = normHeader(parts[parts.length - 1] || thText);
      let profile = cellProfiles[idx];

      let isStudentId = leafText.includes("hoc sinh") || leafText.includes("dinh danh") || leafText.includes("ma hs") || normTxt.includes("hoc sinh") || leafText.includes("so thu tu") || leafText === "stt";
      let isMuc = (leafText.includes("muc") || leafText.includes("danh gia")) && !leafText.includes("ma") && !leafText.includes("noi dung");
      let isDiem = leafText.includes("diem") || leafText.includes("ktdk") || leafText.includes("kiem tra");

      let isMa = false;
      let isNd = false;

      if (!isStudentId && !isMuc && !isDiem) {
        if (profile && profile.hasTextarea) {
          isNd = true;
        } else if (
          leafText.includes("ma nx") ||
          leafText.includes("manx") ||
          leafText === "ma" ||
          leafText.includes("ma nhan xet") ||
          (leafText.includes("ma") && !leafText.includes("noi dung")) ||
          (profile && profile.hasInput && !profile.hasTextarea && !leafText.includes("noi dung") && !leafText.includes("ten"))
        ) {
          isMa = true;
        } else if (leafText.includes("noi dung") || leafText.includes("nhan xet")) {
          isNd = true;
        }
      }

      if (isMa) {
        if (normTxt.includes("chung")) {
          if (colIndices.nlcMa === -1) colIndices.nlcMa = idx;
        } else if (normTxt.includes("dac thu")) {
          if (colIndices.nldMa === -1) colIndices.nldMa = idx;
        } else if (normTxt.includes("pham chat")) {
          if (colIndices.pcMa === -1) colIndices.pcMa = idx;
        } else {
          if (colIndices.monMa === -1) colIndices.monMa = idx;
        }
      } else if (isNd) {
        if (normTxt.includes("chung")) {
          if (colIndices.nlcNd === -1) colIndices.nlcNd = idx;
        } else if (normTxt.includes("dac thu")) {
          if (colIndices.nldNd === -1) colIndices.nldNd = idx;
        } else if (normTxt.includes("pham chat")) {
          if (colIndices.pcNd === -1) colIndices.pcNd = idx;
        } else {
          if (colIndices.monNd === -1) colIndices.monNd = idx;
        }
      }
    });

    // 3. Fallback ghép cặp thông minh dựa trên cấu trúc DOM thực tế (Input, Textarea)
    if (colIndices.monNd === -1 && colIndices.nlcNd === -1 && colIndices.pcNd === -1) {
      let editablePairs = [];
      for (let i = 0; i < cellProfiles.length; i++) {
        if (cellProfiles[i].hasInput && cellProfiles[i + 1] && cellProfiles[i + 1].hasTextarea) {
          editablePairs.push({ ma: i, nd: i + 1 });
          i++;
        } else if (cellProfiles[i].hasTextarea) {
          editablePairs.push({ ma: i > 0 && cellProfiles[i - 1].hasInput ? i - 1 : -1, nd: i });
        }
      }
      if (editablePairs.length >= 1) {
        if (colIndices.monMa === -1) colIndices.monMa = editablePairs[0].ma;
        if (colIndices.monNd === -1) colIndices.monNd = editablePairs[0].nd;
      }
      if (editablePairs.length >= 2) {
        if (colIndices.nlcMa === -1) colIndices.nlcMa = editablePairs[1].ma;
        if (colIndices.nlcNd === -1) colIndices.nlcNd = editablePairs[1].nd;
      }
      if (editablePairs.length >= 3) {
        if (colIndices.nldMa === -1) colIndices.nldMa = editablePairs[2].ma;
        if (colIndices.nldNd === -1) colIndices.nldNd = editablePairs[2].nd;
      }
      if (editablePairs.length >= 4) {
        if (colIndices.pcMa === -1) colIndices.pcMa = editablePairs[3].ma;
        if (colIndices.pcNd === -1) colIndices.pcNd = editablePairs[3].nd;
      }
    }

    console.log("[Grid] Column detection:", colIndices, colHeaders);

    const timKiemKhoNhanXet534 = (muc, type, khoi, mon, thang, manualCode, autoPick = false, fullDb = null) => {
      const hasManualCode = Boolean(manualCode && manualCode.trim());
      // Nếu không có mã nhận xét VÀ không bật chế độ tự động điền mã -> BỎ QUA KHÔNG NHẬN XÉT
      if (!hasManualCode && !autoPick) {
        return null;
      }

      let suffix = "";
      let mThang = thang ? thang.match(/\d+/) : null;
      if (mThang) suffix = "_Thang" + parseInt(mThang[0], 10);
      else suffix = thang ? "_" + thang.replace(/\s/g, "") : "";

      const getRandom = (arr) =>
        arr && arr.length > 0
          ? arr[Math.floor(Math.random() * arr.length)]
          : "";

      const mCodeUpper = hasManualCode ? manualCode.trim().toUpperCase() : "";

      const matchCodeInPool = (p) => {
        if (!p) return null;
        for (let lk in p) {
          let lvl = p[lk];
          if (!lvl) continue;
          let code = (lvl.code || "").trim().toUpperCase();
          let keyUpper = lk.trim().toUpperCase();

          let isMatch = false;
          if (code && code === mCodeUpper) {
            isMatch = true;
          } else if (keyUpper === mCodeUpper) {
            isMatch = true;
          } else if (mCodeUpper === "T" && (keyUpper === "TỐT" || keyUpper === "TOT")) {
            isMatch = true;
          } else if (mCodeUpper === "H" && (keyUpper === "HOÀN THÀNH" || keyUpper === "HOAN THANH" || keyUpper === "ĐẠT" || keyUpper === "DAT" || keyUpper === "KHÁ" || keyUpper === "KHA")) {
            isMatch = true;
          } else if (mCodeUpper === "C" && (keyUpper === "CHƯA HOÀN THÀNH" || keyUpper === "CHUA HOAN THANH" || keyUpper === "CHƯA ĐẠT" || keyUpper === "CHUA DAT")) {
            isMatch = true;
          }

          if (isMatch && lvl.comments && lvl.comments.length > 0) {
            return { lvl, code: lvl.code || mCodeUpper };
          }
        }
        return null;
      };

      // Tự động chọn level và mã phù hợp theo mức đánh giá khi autoPick = true
      const autoPickLevelInPool = (p) => {
        if (!p) return null;
        let targetMuc = (muc || "T").trim().toUpperCase();
        // Ưu tiên 1: Khớp theo mức đánh giá targetMuc (T hoặc H hoặc C)
        for (let lk in p) {
          let lvl = p[lk];
          if (!lvl || !lvl.comments || lvl.comments.length === 0) continue;
          let code = (lvl.code || "").trim().toUpperCase();
          let keyUpper = lk.trim().toUpperCase();
          if (
            code === targetMuc ||
            keyUpper === targetMuc ||
            (targetMuc === "T" && (keyUpper === "TỐT" || keyUpper === "TOT")) ||
            (targetMuc === "H" && (keyUpper === "HOÀN THÀNH" || keyUpper === "HOAN THANH" || keyUpper === "ĐẠT" || keyUpper === "DAT" || keyUpper === "KHÁ" || keyUpper === "KHA")) ||
            (targetMuc === "C" && (keyUpper === "CHƯA HOÀN THÀNH" || keyUpper === "CHUA HOAN THANH" || keyUpper === "CHƯA ĐẠT" || keyUpper === "CHUA DAT"))
          ) {
            return { lvl, code: lvl.code || targetMuc };
          }
        }
        // Ưu tiên 2: Lấy mục đầu tiên hợp lệ trong pool
        for (let lk in p) {
          let lvl = p[lk];
          if (lvl && lvl.comments && lvl.comments.length > 0) {
            return { lvl, code: lvl.code || targetMuc };
          }
        }
        return null;
      };

      const isSubjectMatched = (poolKey, targetMon) => {
        if (!poolKey || !targetMon) return false;
        const norm = (s) => (s || "").toLowerCase()
          .replace(/mỹ thuật/g, "mĩ thuật")
          .replace(/mỹ/g, "mĩ")
          .trim();
        const p = norm(poolKey);
        const t = norm(targetMon);

        if (t.includes("công nghệ")) {
          return p.includes("công nghệ") && !p.includes("mĩ thuật") && !p.includes("tin học");
        }
        if (t.includes("mĩ thuật")) {
          return p.includes("mĩ thuật") && !p.includes("công nghệ");
        }
        if (t.includes("tin học")) {
          return p.includes("tin học") && !p.includes("công nghệ");
        }
        return p.includes(t) || t.includes(p);
      };

      // Tìm pool khớp môn & loại trong poolDGTX
      let findMatchingPool = (poolObj, searchSuffix, isStrict = true, ignoreSubject = false) => {
        let matchedKey = null;
        for (let k in poolObj) {
          let kLower = k.toLowerCase();
          if (isStrict) {
            if (searchSuffix && !k.endsWith(searchSuffix)) continue;
            if (!searchSuffix && k.includes("_Thang")) continue;
          }

          let monMatch = false;
          if (ignoreSubject) {
            monMatch = true;
          } else if (mon.toLowerCase().includes("tổng hợp")) {
            if (
              type === "MON_HOC" &&
              (kLower.includes("sổ tổng hợp - môn học") || kLower.includes("sổ tổng hợp - hđgd"))
            ) monMatch = true;
            else if (
              type === "NL_CHUNG" &&
              (kLower.includes("sổ tổng hợp - năng lực chung") || kLower.includes("sổ tổng hợp - nl chung"))
            ) monMatch = true;
            else if (
              type === "NL_DAC_THU" &&
              (kLower.includes("sổ tổng hợp - năng lực đặc thù") || kLower.includes("sổ tổng hợp - nl đặc thù"))
            ) monMatch = true;
            else if (
              type === "PHAM_CHAT" &&
              (kLower.includes("sổ tổng hợp - phẩm chất") || kLower.includes("sổ tổng hợp - pham chat"))
            ) monMatch = true;
          } else {
            monMatch = isSubjectMatched(k, mon);
          }

          if (monMatch) {
            if (type === "MON_HOC") {
              if (isSubjectMatched(k, mon)) {
                matchedKey = k; break;
              }
            }
            if (type === "NL_CHUNG" && (kLower.includes("năng lực chung") || kLower.includes("nl chung"))) {
              matchedKey = k; break;
            }
            if (type === "NL_DAC_THU" && (kLower.includes("năng lực đặc thù") || kLower.includes("nl đặc thù"))) {
              matchedKey = k; break;
            }
            if (type === "PHAM_CHAT" && (kLower.includes("phẩm chất") || kLower.includes("pham chat"))) {
              matchedKey = k; break;
            }
          }
        }
        return matchedKey;
      };

      let kFound = findMatchingPool(dbDGTX, suffix, true, false) || findMatchingPool(dbDGTX, "", true, false) || findMatchingPool(dbDGTX, suffix, false, false);
      if (!kFound && type !== "MON_HOC") kFound = findMatchingPool(dbDGTX, suffix, true, true);

      let matchedResult = null;
      if (kFound && dbDGTX[kFound]) {
        matchedResult = hasManualCode ? matchCodeInPool(dbDGTX[kFound]) : autoPickLevelInPool(dbDGTX[kFound]);
      }

      // Nếu chưa thấy, tìm trong các pool cùng loại type (TUYỆT ĐỐI CHỈ KHỚP ĐÚNG MÔN, KHÔNG NHẢY SANG MÔN KHÁC)
      if (!matchedResult) {
        for (let k in dbDGTX) {
          let kLower = k.toLowerCase();
          let typeMatch = false;
          if (type === "MON_HOC" && isSubjectMatched(k, mon)) typeMatch = true;
          if (type === "NL_CHUNG" && (kLower.includes("năng lực chung") || kLower.includes("nl chung"))) typeMatch = true;
          if (type === "NL_DAC_THU" && (kLower.includes("năng lực đặc thù") || kLower.includes("nl đặc thù"))) typeMatch = true;
          if (type === "PHAM_CHAT" && (kLower.includes("phẩm chất") || kLower.includes("pham chat"))) typeMatch = true;

          if (typeMatch && dbDGTX[k]) {
            matchedResult = hasManualCode ? matchCodeInPool(dbDGTX[k]) : autoPickLevelInPool(dbDGTX[k]);
            if (matchedResult) break;
          }
        }
      }

      // ĐẶC BIỆT CHO MÔN HỌC (Ví dụ: môn Công nghệ thuộc khối 3, 4, 5, không có ở khối 1, 2):
      // Nếu chưa thấy trong dbDGTX hiện tại, tìm đúng môn trong cơ sở dữ liệu các khối khác của Tiểu học
      if (!matchedResult && type === "MON_HOC" && fullDb?.TH) {
        for (let g of ["3", "4", "5", "1", "2"]) {
          let otherDGTX = fullDb.TH[g]?.DGTX;
          if (otherDGTX) {
            let oKey = findMatchingPool(otherDGTX, suffix, true, false) || findMatchingPool(otherDGTX, "", true, false) || findMatchingPool(otherDGTX, suffix, false, false);
            if (oKey && otherDGTX[oKey]) {
              matchedResult = hasManualCode ? matchCodeInPool(otherDGTX[oKey]) : autoPickLevelInPool(otherDGTX[oKey]);
              if (matchedResult) break;
            }
            if (!matchedResult) {
              for (let ok in otherDGTX) {
                if (isSubjectMatched(ok, mon) && otherDGTX[ok]) {
                  matchedResult = hasManualCode ? matchCodeInPool(otherDGTX[ok]) : autoPickLevelInPool(otherDGTX[ok]);
                  if (matchedResult) break;
                }
              }
            }
          }
          if (matchedResult) break;
        }
      }

      // Nếu là NL hoặc PC mà chưa thấy thì mới tìm trong toàn bộ dbDGTX
      if (!matchedResult && type !== "MON_HOC") {
        for (let k in dbDGTX) {
          if (dbDGTX[k]) {
            matchedResult = hasManualCode ? matchCodeInPool(dbDGTX[k]) : autoPickLevelInPool(dbDGTX[k]);
            if (matchedResult) break;
          }
        }
      }

      if (matchedResult && matchedResult.lvl && matchedResult.lvl.comments && matchedResult.lvl.comments.length > 0) {
        return {
          success: true,
          noiDungNhanXet: getRandom(matchedResult.lvl.comments),
          maNX: hasManualCode ? manualCode : (matchedResult.code || muc || "T"),
          isManual: hasManualCode,
        };
      } else {
        return {
          success: false,
          notFoundCode: hasManualCode ? manualCode : null,
          maNX: manualCode || "",
          isManual: hasManualCode,
        };
      }
    };

    let finalTasks = [];
    let knownSubsList = [
      "Mĩ thuật",
      "Mỹ thuật",
      "Công nghệ",
      "Tin học",
      "Tiếng Việt",
      "Toán",
      "Đạo đức",
      "Tự nhiên và Xã hội",
      "Khoa học",
      "Lịch sử",
      "Địa lí",
      "Ngoại ngữ",
      "Tiếng Anh",
      "Giáo dục thể chất",
      "Âm nhạc",
      "Hoạt động trải nghiệm",
      "Hoạt động trải nghiệm, hướng nghiệp",
      "Nội dung giáo dục địa phương",
      "Nghệ thuật",
    ];

    const getCellValue = (cell) => {
      if (!cell) return "";
      const inp = cell.querySelector("input:not([type='checkbox']):not([type='radio']), textarea, select");
      if (inp) return (inp.value || "").trim();
      return (cell.innerText || cell.textContent || "").trim();
    };

    let mucColIdx = colHeaders.findIndex((h) => {
      let parts = h.split(" > ");
      let leaf = normHeader(parts[parts.length - 1] || h);
      return (leaf.includes("muc") || leaf.includes("danh gia")) && !leaf.includes("ma") && !leaf.includes("noi dung");
    });

    trs.forEach((tr, index) => {
      tr.setAttribute("data-tlnx-row-id", index);
      let tds = Array.from(tr.querySelectorAll("td"));
      if (tds.length < 4) return;

      let monMaTd =
        tr.querySelector("td.maNoiDungMonHocHDGD") ||
        (colIndices.monMa !== -1 && tds[colIndices.monMa] ? tds[colIndices.monMa] : null);
      
      let valText = getCellValue(monMaTd).toUpperCase();
      let mucText = (mucColIdx !== -1 && tds[mucColIdx]) ? getCellValue(tds[mucColIdx]).toUpperCase() : "";

      let level = "";
      let combinedLevelText = mucText || valText;
      if (combinedLevelText.includes("Đ") || combinedLevelText.includes("H") || combinedLevelText.includes("K")) level = "H";
      else if (combinedLevelText.includes("T")) level = "T";
      else if (combinedLevelText.includes("C")) level = "C";

      let tenHS = "Em";
      if (tds) {
        for (let c = 1; c < Math.min(tds.length, 4); c++) {
          let inp = tds[c].querySelector("input, textarea");
          let txt = (inp ? inp.value : tds[c].innerText || "").trim();
          if (
            txt &&
            isNaN(parseFloat(txt)) &&
            txt.includes(" ") &&
            !txt.match(/^[0-9\/]+$/)
          ) {
            tenHS = txt.split(" ").pop();
            break;
          }
        }
      }
      if (!level) level = Math.random() > 0.2 ? "T" : "H";

      // Try to extract the specific subject from the row (for "Sổ tổng hợp" tables where multiple subjects are listed per student)
      let rowSubject = null;
      if (currentMon.toLowerCase().includes("tổng hợp")) {
        let rowText = "";
        tds.forEach((td, i) => {
          if (i > 1) {
            let inp = td.querySelector("input, textarea");
            rowText += " " + (inp ? inp.value : td.innerText || "");
          }
        });
        let found = knownSubsList.find((s) =>
          rowText.toLowerCase().includes(s.toLowerCase()),
        );
        if (found) rowSubject = found;
      }

      finalTasks.push({ rowIndex: index, level, tenHS, tr, rowSubject });
    });

    // 3. ĐÓNG GÓI DỮ LIỆU JSON ĐỂ ĐIỀN SIÊU TỐC
    let fillData = [];
    let unmatchedCodes = new Set();
    const isAutoFillCode = Boolean(config && config.autoFillCode);

    for (let task of finalTasks) {
      let { level, tenHS, rowSubject } = task;
      let monToUse = rowSubject || currentMon;

      let tds = Array.from(task.tr.querySelectorAll("td"));
      let monMaTd =
        task.tr.querySelector("td.maNoiDungMonHocHDGD") ||
        (colIndices.monMa !== -1 && tds[colIndices.monMa] ? tds[colIndices.monMa] : null);
      let nlcMaTd =
        task.tr.querySelector("td.maNoiDungNangLucChung") ||
        (colIndices.nlcMa !== -1 && tds[colIndices.nlcMa] ? tds[colIndices.nlcMa] : null);
      let nldMaTd =
        task.tr.querySelector("td.maNoiDungNangLucDacThu") ||
        (colIndices.nldMa !== -1 && tds[colIndices.nldMa] ? tds[colIndices.nldMa] : null);
      let pcMaTd =
        task.tr.querySelector("td.maNoiDungPhamChatChuYeu") ||
        (colIndices.pcMa !== -1 && tds[colIndices.pcMa] ? tds[colIndices.pcMa] : null);

      let monMaManual = getCellValue(monMaTd);
      let nlcMaManual = getCellValue(nlcMaTd);
      let nldMaManual = getCellValue(nldMaTd);
      let pcMaManual = getCellValue(pcMaTd);

      let dMon = timKiemKhoNhanXet534(
        level,
        "MON_HOC",
        currentKhoi,
        monToUse,
        currentThang,
        monMaManual,
        isAutoFillCode,
        dbFull,
      );
      let dNLC = timKiemKhoNhanXet534(
        level,
        "NL_CHUNG",
        currentKhoi,
        monToUse,
        currentThang,
        nlcMaManual,
        isAutoFillCode,
        dbFull,
      );
      let dNLD = timKiemKhoNhanXet534(
        level,
        "NL_DAC_THU",
        currentKhoi,
        monToUse,
        currentThang,
        nldMaManual,
        isAutoFillCode,
        dbFull,
      );
      let dPC = timKiemKhoNhanXet534(
        level,
        "PHAM_CHAT",
        currentKhoi,
        monToUse,
        currentThang,
        pcMaManual,
        isAutoFillCode,
        dbFull,
      );

      if (dMon && dMon.notFoundCode) unmatchedCodes.add(dMon.notFoundCode);
      if (dNLC && dNLC.notFoundCode) unmatchedCodes.add(dNLC.notFoundCode);
      if (dNLD && dNLD.notFoundCode) unmatchedCodes.add(dNLD.notFoundCode);
      if (dPC && dPC.notFoundCode) unmatchedCodes.add(dPC.notFoundCode);

      // Cleanup functions for leftover variables
      const cleanContent = (str) =>
        str
          ? str
              .replace(/{HocSinh}/g, tenHS)
              .replace(/{Môn}/g, monToUse || "")
              .replace(/\$?\{m\}/g, "")
              .replace(/\s+/g, " ")
              .trim()
          : "";

      // MẪU ĐÁNH GIÁ THƯỜNG XUYÊN (5.3.4):
      // - Khi tích vào "Điền mã nhận xét" (isAutoFillCode === true):
      //   Các môn và NL/PC sẽ TỰ ĐỘNG ĐIỀN MÃ NHẬN XÉT (Mã NX) VÀ TỰ ĐỘNG ĐIỀN NỘI DUNG NHẬN XÉT.
      // - Khi không tích (isAutoFillCode === false):
      //   Người dùng phải nhập mã nhận xét trước thì mới nhận xét được. Nếu ô mã trống -> BỎ QUA KHÔNG NHẬN XÉT!
      let monNd = "";
      let monMaFinal = monMaManual;
      if (monMaManual || isAutoFillCode) {
        if (dMon && dMon.success) {
          monNd = cleanContent(dMon.noiDungNhanXet);
          if (!monMaFinal && isAutoFillCode) monMaFinal = dMon.maNX || level || "T";
        } else if (isAutoFillCode) {
          monMaFinal = monMaManual || (dMon && dMon.maNX) || level || "T";
          if (!monNd) {
            let fallbackPool = getEmptySubjectVnEdu(monToUse, "tháng này");
            if (fallbackPool) {
              let fLvl = level === "H" ? (fallbackPool.Khá || fallbackPool.Đạt) : (level === "C" ? fallbackPool["Chưa Đạt"] : fallbackPool.Tốt);
              if (fLvl && fLvl.comments && fLvl.comments.length > 0) {
                monNd = cleanContent(fLvl.comments[Math.floor(Math.random() * fLvl.comments.length)]);
              }
            }
          }
        }
      }

      let nlcNd = "";
      let nlcMaFinal = nlcMaManual;
      if (nlcMaManual || isAutoFillCode) {
        if (dNLC && dNLC.success) {
          nlcNd = cleanContent(dNLC.noiDungNhanXet);
          if (!nlcMaFinal && isAutoFillCode) nlcMaFinal = dNLC.maNX || level || "T";
        } else if (isAutoFillCode && colIndices.nlcNd !== -1) {
          nlcMaFinal = nlcMaManual || (dNLC && dNLC.maNX) || level || "T";
        }
      }

      let nldNd = "";
      let nldMaFinal = nldMaManual;
      if (nldMaManual || isAutoFillCode) {
        if (dNLD && dNLD.success) {
          nldNd = cleanContent(dNLD.noiDungNhanXet);
          if (!nldMaFinal && isAutoFillCode) nldMaFinal = dNLD.maNX || level || "T";
        } else if (isAutoFillCode && colIndices.nldNd !== -1) {
          nldMaFinal = nldMaManual || (dNLD && dNLD.maNX) || level || "T";
        }
      }

      let pcNd = "";
      let pcMaFinal = pcMaManual;
      if (pcMaManual || isAutoFillCode) {
        if (dPC && dPC.success) {
          pcNd = cleanContent(dPC.noiDungNhanXet);
          if (!pcMaFinal && isAutoFillCode) pcMaFinal = dPC.maNX || level || "T";
        } else if (isAutoFillCode && colIndices.pcNd !== -1) {
          pcMaFinal = pcMaManual || (dPC && dPC.maNX) || level || "T";
        }
      }

      // If it's a generic table (only single column) but we know what type the user requested from the dropdown
      let requestedTypeLower = (
        fallbackSubject ||
        currentMon ||
        ""
      ).toLowerCase();
      if (colIndices.nlcNd === -1 && colIndices.pcNd === -1) {
        if (requestedTypeLower.includes("chung")) {
          monNd = ((monMaManual || isAutoFillCode) && dNLC && dNLC.success) ? cleanContent(dNLC.noiDungNhanXet) : (((monMaManual || isAutoFillCode) && dMon && dMon.success) ? cleanContent(dMon.noiDungNhanXet) : monNd);
          if (!monMaFinal && isAutoFillCode && dNLC && dNLC.success) monMaFinal = dNLC.maNX || level || "T";
        } else if (requestedTypeLower.includes("đặc thù")) {
          monNd = ((monMaManual || isAutoFillCode) && dNLD && dNLD.success) ? cleanContent(dNLD.noiDungNhanXet) : (((monMaManual || isAutoFillCode) && dMon && dMon.success) ? cleanContent(dMon.noiDungNhanXet) : monNd);
          if (!monMaFinal && isAutoFillCode && dNLD && dNLD.success) monMaFinal = dNLD.maNX || level || "T";
        } else if (requestedTypeLower.includes("phẩm chất")) {
          monNd = ((monMaManual || isAutoFillCode) && dPC && dPC.success) ? cleanContent(dPC.noiDungNhanXet) : (((monMaManual || isAutoFillCode) && dMon && dMon.success) ? cleanContent(dMon.noiDungNhanXet) : monNd);
          if (!monMaFinal && isAutoFillCode && dPC && dPC.success) monMaFinal = dPC.maNX || level || "T";
        }
      }

      fillData.push({
        rowIndex: task.rowIndex,
        level: level,
        monNd,
        nlcNd,
        nldNd,
        pcNd,
        monMa: monMaFinal || "",
        nlcMa: nlcMaFinal || "",
        nldMa: nldMaFinal || "",
        pcMa: pcMaFinal || "",
        monMaIsManual: Boolean(monMaManual),
        nlcMaIsManual: Boolean(nlcMaManual),
        nldMaIsManual: Boolean(nldMaManual),
        pcMaIsManual: Boolean(pcMaManual),
        dienMaNX: isAutoFillCode,
      });
    }

    // 4. THỰC HIỆN ĐIỀN VÀO BẢNG
    const changeValue = (el, val) => {
      if (!el || val === undefined || val === null || val === "") return false;
      const input = (el.tagName === "INPUT" || el.tagName === "TEXTAREA")
        ? el
        : el.querySelector("input:not([type='hidden']), textarea, [contenteditable='true']");

      if (input) {
        if (input.readOnly) input.readOnly = false;
        if (input.disabled) input.disabled = false;
        input.removeAttribute("readonly");
        input.removeAttribute("disabled");

        if (input.isContentEditable) {
          input.innerText = val;
        } else {
          const valueSetter = Object.getOwnPropertyDescriptor(input, 'value')?.set;
          const prototype = Object.getPrototypeOf(input);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
          if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(input, val);
          } else if (valueSetter) {
            valueSetter.call(input, val);
          } else {
            input.value = val;
          }
        }

        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
        return true;
      } else if (el.isContentEditable) {
        el.innerText = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      } else {
        el.innerText = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      return false;
    };

    // Helper an toàn ngăn ngừa điền nhầm:
    // - KHÔNG BAO GIỜ điền mã nhận xét vào ô textarea (nội dung)
    // - KHÔNG BAO GIỜ điền đoạn văn nhận xét dài vào ô input mã ngắn (maxlength <= 15)
    const setCodeSafe = (cell, code) => {
      if (!cell || !code) return false;
      if (cell.querySelector("textarea")) return false;
      return changeValue(cell, code);
    };

    const setContentSafe = (cell, content) => {
      if (!cell || !content) return false;
      let inp = cell.querySelector("input:not([type='checkbox']):not([type='radio'])");
      if (inp && !cell.querySelector("textarea") && inp.maxLength > 0 && inp.maxLength <= 15) {
        return false;
      }
      return changeValue(cell, content);
    };

    // Điền trực tiếp vào DOM cho các ô có mã nhận xét hợp lệ
    for (let task of finalTasks) {
      let { tr, rowIndex } = task;
      let pData = fillData.find((d) => d.rowIndex === rowIndex);
      if (!pData) continue;

      let tds = Array.from(tr.querySelectorAll("td"));
      let monMaTd = tr.querySelector("td.maNoiDungMonHocHDGD") || (colIndices.monMa !== -1 && tds[colIndices.monMa] ? tds[colIndices.monMa] : null);
      let monNdTd = tr.querySelector("td.noiDungMonHocHDGD") || (colIndices.monNd !== -1 && tds[colIndices.monNd] ? tds[colIndices.monNd] : null);
      let nlcMaTd = tr.querySelector("td.maNoiDungNangLucChung") || (colIndices.nlcMa !== -1 && tds[colIndices.nlcMa] ? tds[colIndices.nlcMa] : null);
      let nlcNdTd = tr.querySelector("td.noiDungNangLucChung") || (colIndices.nlcNd !== -1 && tds[colIndices.nlcNd] ? tds[colIndices.nlcNd] : null);
      let nldMaTd = tr.querySelector("td.maNoiDungNangLucDacThu") || (colIndices.nldMa !== -1 && tds[colIndices.nldMa] ? tds[colIndices.nldMa] : null);
      let nldNdTd = tr.querySelector("td.noiDungNangLucDacThu") || (colIndices.nldNd !== -1 && tds[colIndices.nldNd] ? tds[colIndices.nldNd] : null);
      let pcMaTd = tr.querySelector("td.maNoiDungPhamChatChuYeu") || (colIndices.pcMa !== -1 && tds[colIndices.pcMa] ? tds[colIndices.pcMa] : null);
      let pcNdTd = tr.querySelector("td.noiDungPhamChatChuYeu") || (colIndices.pcNd !== -1 && tds[colIndices.pcNd] ? tds[colIndices.pcNd] : null);

      if (pData.dienMaNX) {
        if (pData.monMa && monMaTd && !pData.monMaIsManual) setCodeSafe(monMaTd, pData.monMa);
        if (pData.nlcMa && nlcMaTd && !pData.nlcMaIsManual) setCodeSafe(nlcMaTd, pData.nlcMa);
        if (pData.nldMa && nldMaTd && !pData.nldMaIsManual) setCodeSafe(nldMaTd, pData.nldMa);
        if (pData.pcMa && pcMaTd && !pData.pcMaIsManual) setCodeSafe(pcMaTd, pData.pcMa);
      }

      let rowFilled = false;
      if (pData.monNd && setContentSafe(monNdTd, pData.monNd)) rowFilled = true;
      if (pData.nlcNd && setContentSafe(nlcNdTd, pData.nlcNd)) rowFilled = true;
      if (pData.nldNd && setContentSafe(nldNdTd, pData.nldNd)) rowFilled = true;
      if (pData.pcNd && setContentSafe(pcNdTd, pData.pcNd)) rowFilled = true;

      if (rowFilled || (pData.dienMaNX && (pData.monMa || pData.nlcMa || pData.nldMa || pData.pcMa))) successCount++;
    }

    // Hiển thị thông báo nếu có mã nhận xét do người dùng nhập không khớp với mẫu 5.3.4
    if (unmatchedCodes && unmatchedCodes.size > 0) {
      showFloatingNotification({
        title: "Mã Nhận Xét Không Hợp Lệ",
        message: "Hiện tại không có mã nhận xét này trên mẫu Đánh giá thường xuyên (5.3.4) người dùng phải nhập mã theo mẫu hoặc sửa mã ở mẫu nhận xét Đánh giá thường xuyên (5.3.4)",
        type: "error",
        duration: 9000
      });
    } else if (successCount === 0) {
      showFloatingNotification({
        title: "Chưa có mã nhận xét",
        message: "Mẫu ĐGTX (5.3.4) chỉ nhận xét những học sinh đã được nhập mã nhận xét. Hãy tích chọn \"Điền mã nhận xét\" trên thanh công cụ nếu muốn tự động điền mã nhận xét hàng loạt, hoặc tự nhập mã nhận xét cho học sinh trước khi ấn Điền.",
        type: "warning",
        duration: 8000
      });
    }

    const gridEl = document.querySelector(".RadGrid");
    if (gridEl) {
      // 4b. KIỂM TRA VÀ ĐỒNG BỘ QUA BATCH API DÀNH CHO TELERIK RADGRID
      const eventName = "Telerik_Fast_Fill_Result_" + Date.now();

      await new Promise((resolve) => {
        const handler = (e) => {
          document.removeEventListener(eventName, handler);
          resolve(e.detail);
        };
        document.addEventListener(eventName, handler);

        // Timeout 1.5s
        setTimeout(() => {
          document.removeEventListener(eventName, handler);
          resolve({ status: "TIMEOUT" });
        }, 1500);

        try {
          chrome.runtime.sendMessage({
            action: "executeTelerikBatch",
            config: { fillData, colIndices, eventName }
          });
        } catch (err) {
          resolve({ status: "ERROR" });
        }
      });
    }

    return { count: successCount > 0 ? successCount : finalTasks.length, detectedMon: currentMon };
  }

  // Inject floating widget
  if (window === window.top) {
    const isFloatingWidgetDisabled = () => {
      if (window.__tlnx_floating_widget_hidden === true) return true;
      try {
        if (sessionStorage.getItem("tlnx_floating_widget_hidden") === "true") return true;
        if (localStorage.getItem("tlnx_show_floating_widget") === "false") return true;
      } catch (e) {}
      return false;
    };

    const enableFloatingWidget = (force = true) => {
      window.__tlnx_floating_widget_hidden = false;
      try {
        sessionStorage.removeItem("tlnx_floating_widget_hidden");
        sessionStorage.setItem("tlnx_floating_widget_hidden", "false");
        localStorage.setItem("tlnx_show_floating_widget", "true");
      } catch (err) {}
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ showFloatingWidget: true });
      }
      const existing = document.getElementById("tlnx-floating-widget");
      if (existing) {
        existing.style.display = "flex";
        existing.style.visibility = "visible";
        existing.style.opacity = "1";
        return;
      }
      createWidgetDOM(force);
    };

    function isExtensionContextValid() {
      try {
        return Boolean(typeof chrome !== "undefined" && chrome && chrome.runtime && chrome.runtime.id);
      } catch (e) {
        return false;
      }
    }

    function isTargetSchoolDomain() {
      const currentUrl = (window.location.href || "").toLowerCase();
      const hostname = (window.location.hostname || "").toLowerCase();

      if (
        currentUrl.startsWith("chrome-extension://") ||
        currentUrl.startsWith("edge-extension://") ||
        currentUrl.startsWith("about:") ||
        currentUrl.startsWith("chrome://") ||
        hostname.includes("sepay.vn") ||
        hostname.includes("vietqr")
      ) {
        return false;
      }

      const matchesEduVn = hostname.endsWith(".edu.vn") || hostname === "edu.vn" || hostname.includes("edu.vn");
      const matchesVnEdu = hostname.includes("vnedu") || currentUrl.includes("vnedu");
      const matchesVtsmas = hostname.includes("vtsmas") || hostname.includes("smas") || currentUrl.includes("smas");
      const matchesCSDL = hostname.includes("csdl") || currentUrl.includes("csdl") || hostname.includes("moet.gov.vn");

      return matchesEduVn || matchesVnEdu || matchesVtsmas || matchesCSDL;
    }

    const disableFloatingWidget = () => {
      window.__tlnx_floating_widget_hidden = true;
      try {
        sessionStorage.setItem("tlnx_floating_widget_hidden", "true");
        localStorage.setItem("tlnx_show_floating_widget", "false");
      } catch (err) {}
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ showFloatingWidget: false });
      }
      const existing = document.getElementById("tlnx-floating-widget");
      if (existing) {
        existing.style.display = "none";
        existing.style.visibility = "hidden";
        existing.style.opacity = "0";
      }
    };

    const injectWidget = (force = false) => {
      if (!force && isFloatingWidgetDisabled()) {
        const existing = document.getElementById("tlnx-floating-widget");
        if (existing) {
          existing.style.display = "none";
          existing.style.visibility = "hidden";
          existing.style.opacity = "0";
        }
        return;
      }
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["showFloatingWidget"], (res) => {
          if (!force && res && res.showFloatingWidget === false) {
            const existing = document.getElementById("tlnx-floating-widget");
            if (existing) {
              existing.style.display = "none";
              existing.style.visibility = "hidden";
              existing.style.opacity = "0";
            }
            return;
          }
          if (!force && isFloatingWidgetDisabled()) return;
          createWidgetDOM(force);
        });
      } else {
        createWidgetDOM(force);
      }
    };

    const createWidgetDOM = (force = false) => {
      // Avoid injecting multiple times; if already in DOM, ensure it is visible
      const existing = document.getElementById("tlnx-floating-widget");
      if (existing) {
        existing.style.display = "flex";
        existing.style.visibility = "visible";
        existing.style.opacity = "1";
        return;
      }

      if (!document.body) {
        setTimeout(() => createWidgetDOM(force), 300);
        return;
      }

      // STRICT DOMAIN CHECK: Nút nổi CHỈ ĐƯỢC HIỂN THỊ ở các trang có đuôi edu.vn, vnedu.vn, vtsmas.vn (và CSDL ngành)
      if (!isTargetSchoolDomain()) {
        const existing = document.getElementById("tlnx-floating-widget");
        if (existing) existing.remove();
        return;
      }

      const widget = document.createElement("div");
      widget.id = "tlnx-floating-widget";
      widget.style.cssText = `position: fixed; top: 6px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 4px 8px 4px 10px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.35); display: flex; align-items: center; gap: 6px; font-family: Arial, system-ui, -apple-system, sans-serif; font-size: 13px; transition: all 0.25s ease; border: 1px solid rgba(255, 255, 255, 0.25); backdrop-filter: blur(10px); width: max-content; max-width: 500px; cursor: move;`;

      // Integrated Compact Run Button
      const btnRun = document.createElement("button");
      const imgLogo = `
        <svg style="width: 16px; height: 16px; margin-right: 3px; border-radius: 3.5px; flex-shrink: 0;" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="512" height="512" rx="100" ry="100" fill="#facc15" />
          <rect x="16" y="16" width="480" height="480" rx="84" ry="84" fill="none" stroke="#fef08a" stroke-width="12" stroke-opacity="0.8" />
          <text x="256" y="380" font-family="'Arial', sans-serif" font-weight="900" text-anchor="middle" fill="#ffffff" style="font-size: 340px !important;">K</text>
        </svg>
      `.replace(/\n/g, '').trim();
      btnRun.innerHTML = `${imgLogo}<span style="white-space: nowrap; font-weight: 700; margin: 0 2px;">Điền NX</span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:14px;height:14px;display:block;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
      btnRun.style.cssText = `background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); border-radius: 9999px; padding: 4px 10px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-right: 2px; font-size: 12.5px;`;
      btnRun.onmouseover = () => {
        btnRun.style.background = "rgba(255,255,255,0.28)";
        btnRun.style.transform = "scale(1.02)";
      };
      btnRun.onmouseout = () => {
        btnRun.style.background = "rgba(255,255,255,0.2)";
        btnRun.style.transform = "scale(1)";
      };
      btnRun.onmousedown = () => {
        btnRun.style.transform = "scale(0.94)";
      };
      btnRun.onmouseup = () => {
        btnRun.style.transform = "scale(1.02)";
      };

      // Settings dropdown container
      const settingsContainer = document.createElement("div");
      settingsContainer.style.cssText = `display: none; width: 100%; flex-direction: row; align-items: center; gap: 6px; margin-top: 3px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); cursor: default;`;

      let settingsOpen = false;

      // Settings toggle arrow
      const btnSettings = document.createElement("button");
      btnSettings.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>`;
      btnSettings.style.cssText = `background: transparent; color: white; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; opacity: 0.8; transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s; border-radius: 50%;`;
      btnSettings.onmouseover = () => {
        btnSettings.style.opacity = "1";
        btnSettings.style.background = "rgba(255,255,255,0.1)";
      };
      btnSettings.onmouseout = () => {
        btnSettings.style.opacity = "0.8";
        btnSettings.style.background = "transparent";
      };
      btnSettings.onmousedown = () => {
        btnSettings.style.transform = settingsOpen ? "scale(0.85) rotate(180deg)" : "scale(0.85)";
      };
      btnSettings.onmouseup = () => {
        btnSettings.style.transform = settingsOpen ? "scale(1) rotate(180deg)" : "scale(1)";
      };

      // Control Checkbox (Điền mã nhận xét)
      const labelCheckbox = document.createElement("label");
      labelCheckbox.title = "Tích chọn để tự động điền Mã nhận xét (Mã NX) cho các môn và nhận xét hàng loạt. Nếu không tích: người dùng phải tự nhập mã nhận xét trước thì mới nhận xét được.";
      labelCheckbox.style.cssText = `display: flex; align-items: center; gap: 4px; font-size: 11.5px; cursor: pointer; user-select: none; opacity: 0.95; margin-left: 2px; border-right: 1px solid rgba(255,255,255,0.2); padding-right: 5px;`;
      labelCheckbox.innerHTML = `<input type="checkbox" id="tlnx-auto-fill-code" style="cursor: pointer; accent-color: #3b82f6;"> Điền mã nhận xét`;

      chrome.storage.local.get(["autoFillCode"], (res) => {
        const checkbox = labelCheckbox.querySelector("#tlnx-auto-fill-code");
        checkbox.checked =
          res.autoFillCode !== undefined ? res.autoFillCode : false;
        checkbox.onchange = (e) => {
          chrome.storage.local.set({ autoFillCode: e.target.checked });
        };
      });

      // Settings Link (Cấu hình)
      const btnEdit = document.createElement("button");
      btnEdit.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:11px;height:11px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Sửa`;
      btnEdit.style.cssText = `background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 9999px; padding: 2px 6px; font-weight: 600; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 3px; transition: all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); white-space: nowrap; margin-left: 2px;`;
      btnEdit.onmouseover = () => {
        btnEdit.style.background = "rgba(255,255,255,0.25)";
        btnEdit.style.transform = "scale(1.05)";
      };
      btnEdit.onmouseout = () => {
        btnEdit.style.background = "rgba(255,255,255,0.15)";
        btnEdit.style.transform = "scale(1)";
      };
      btnEdit.onmousedown = () => {
        btnEdit.style.transform = "scale(0.92)";
      };
      btnEdit.onmouseup = () => {
        btnEdit.style.transform = "scale(1.05)";
      };

      // Update alert badge on floating widget (outside extension)
      const btnUpdateWidget = document.createElement("button");
      btnUpdateWidget.id = "tlnx-widget-update-badge";
      btnUpdateWidget.style.cssText = "display: none; background: #dc2626; color: white; border: 1px solid #f87171; border-radius: 9999px; padding: 2px 8px; font-weight: 800; font-size: 10.5px; cursor: pointer; align-items: center; gap: 3px; margin-left: 3px; box-shadow: 0 0 10px rgba(220,38,38,0.7);";
      btnUpdateWidget.innerHTML = `<span>🔔 Có bản mới</span>`;
      btnUpdateWidget.onclick = (e) => {
        e.stopPropagation();
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: "openOptionsTab", tab: "updates" });
        }
      };

      try {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: "checkExtensionUpdate" }, (res) => {
            if (res && res.hasUpdate) {
              btnUpdateWidget.style.display = "flex";
              btnUpdateWidget.innerHTML = `<span>🔔 Bản mới (v${res.latestVerName || res.latestVer})</span>`;
              btnUpdateWidget.title = `Đã có bản cập nhật mới v${res.latestVerName || res.latestVer}! Bấm để mở trang cập nhật.`;
            }
          });
        }
      } catch (err) {}

      // Status / Topup button
      const btnTopup = document.createElement("button");
      btnTopup.innerHTML = `Đăng nhập`;
      btnTopup.style.cssText = `background: #fbbf24; color: #78350f; border: 1px solid #f59e0b; border-radius: 9999px; padding: 3px 7px; font-weight: 700; font-size: 10.5px; cursor: pointer; display: flex; align-items: center; gap: 2px; transition: all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); white-space: nowrap; margin-left: auto;`;
      btnTopup.onmouseover = () => {
        btnTopup.style.background = "#f59e0b";
        btnTopup.style.transform = "scale(1.04)";
      };
      btnTopup.onmouseout = () => {
        btnTopup.style.background = "#fbbf24";
        btnTopup.style.transform = "scale(1)";
      };
      btnTopup.onmousedown = () => {
        btnTopup.style.transform = "scale(0.92)";
      };
      btnTopup.onmouseup = () => {
        btnTopup.style.transform = "scale(1.04)";
      };

      const openAuthSafely = (tabParam = "topup") => {
        const origText = btnTopup.innerHTML;
        btnTopup.innerHTML = `Đang mở...`;
        setTimeout(() => {
          btnTopup.innerHTML = origText;
        }, 1500);

        try {
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "openAuth", tab: tabParam }, (response) => {
              if (chrome.runtime.lastError || !response || !response.success) {
                console.warn("[Auth] Background openAuth failed, opening direct URL fallback:", chrome.runtime.lastError);
                try {
                  let url = (chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("auth-ui.html") : "/auth-ui.html";
                  if (tabParam) url += `?tab=${tabParam}#${tabParam}`;
                  window.open(url, "_blank");
                } catch (e) {
                  window.open(`/auth-ui.html?tab=${tabParam}#${tabParam}`, "_blank");
                }
              }
            });
          } else {
            let url = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("auth-ui.html") : "/auth-ui.html";
            if (tabParam) url += `?tab=${tabParam}#${tabParam}`;
            window.open(url, "_blank");
          }
        } catch (err) {
          console.error("[Auth] Exception opening auth:", err);
          try {
            let url = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("auth-ui.html") : "/auth-ui.html";
            if (tabParam) url += `?tab=${tabParam}#${tabParam}`;
            window.open(url, "_blank");
          } catch (e2) {
            window.open(`/auth-ui.html?tab=${tabParam}#${tabParam}`, "_blank");
          }
        }
      };

      btnTopup.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        openAuthSafely("topup");
      };

      const lblPoints = document.createElement("span");
      lblPoints.style.cssText = `font-size: 11px; font-weight: 600; color: #fbbf24; margin-left: auto; display: flex; align-items: center; gap: 3px; cursor: pointer; transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275);`;
      lblPoints.innerHTML = `Đang tải...`;
      
      lblPoints.onmousedown = () => {
        lblPoints.style.transform = "scale(0.9)";
      };
      lblPoints.onmouseup = () => {
        lblPoints.style.transform = "scale(1)";
      };

      btnEdit.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "openOptions" }, (response) => {
              if (chrome.runtime.lastError || !response || !response.success) {
                const url = (chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("options.html") : "/options.html";
                window.open(url, "_blank");
              }
            });
          } else {
            const url = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("options.html") : "/options.html";
            window.open(url, "_blank");
          }
        } catch (err) {
          const url = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL("options.html") : "/options.html";
          window.open(url, "_blank");
        }
      };

      lblPoints.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        openAuthSafely("topup");
      };

      settingsContainer.appendChild(labelCheckbox);
      settingsContainer.appendChild(btnEdit);

      const whiteDiamondSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 2px rgba(255,255,255,1));"><path d="M12 2L2 9L12 22L22 9L12 2Z" fill="white"/><path d="M12 2V22M2 9H22M12 2L7 9L12 22" stroke="#e2e8f0" stroke-width="1"/></svg>`;

      settingsOpen = false;
      btnSettings.onclick = (e) => {
        e.stopPropagation();
        settingsOpen = !settingsOpen;
        btnSettings.style.transform = settingsOpen
          ? "rotate(180deg)"
          : "rotate(0deg)";
        settingsContainer.style.display = settingsOpen ? "flex" : "none";
        widget.style.borderRadius = settingsOpen ? "14px" : "9999px";
      };

      const checkIsUserVip = (auth) => {
        if (!auth) return false;
        const email = (auth.email || "").toLowerCase().trim();
        const isAdmin = auth.isAdmin === true || email === 'admin@admin.com' || email === 'hvdkhoa89@gmail.com' || email === 'khoahoang9999@gmail.com';
        if (isAdmin) return true;
        let expD = null;
        if (auth.expiryDate) {
          expD = new Date(auth.expiryDate);
        }
        const now = new Date();
        const isVipByDate = expD && !isNaN(expD.getTime()) && expD.getTime() > now.getTime();
        if (isVipByDate) return true;
        if ((auth.credits || 0) > 0) return true;
        if (auth.isVip === true && (!expD || isNaN(expD.getTime()) || expD.getTime() > now.getTime())) return true;
        return false;
      };

      let updatePointsUI = () => {};
      if (typeof chrome !== "undefined" && chrome.storage) {
        updatePointsUI = (authState) => {
          if (authState && authState.uid && authState.uid !== "guest") {
            const isVip = checkIsUserVip(authState);
            
            if (isVip) {
              // Khi đã gia hạn / VIP: Chỉ hiện chữ VIP
              lblPoints.innerHTML = `<span style="color: #fbbf24; font-weight: 800; font-size: 12px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); margin-right: 2px;">VIP</span><div style="display: flex; align-items: center; margin-left: 1px;">${whiteDiamondSvg}</div>`;
              lblPoints.style.display = 'flex';
              btnTopup.style.display = 'none';
            } else {
              // Chưa gia hạn hoặc đã hết hạn: Báo "Hết hạn"
              lblPoints.style.display = 'none';
              btnTopup.style.display = 'flex';
              btnTopup.innerHTML = `Hết hạn`;
              btnTopup.style.background = "#ef4444";
              btnTopup.style.color = "#ffffff";
              btnTopup.style.border = "1px solid #dc2626";
              btnTopup.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
              btnTopup.style.padding = "3px 8px";
              btnTopup.title = "Tài khoản chưa gia hạn hoặc đã hết hạn. Bấm để gia hạn VIP.";
            }
          } else {
            lblPoints.style.display = 'none';
            btnTopup.style.display = 'flex';
            btnTopup.innerHTML = `Đăng nhập`;
            btnTopup.style.background = "#fbbf24";
            btnTopup.style.color = "#78350f";
            btnTopup.style.border = "1px solid #f59e0b";
            btnTopup.style.boxShadow = "none";
            btnTopup.style.padding = "3px 7px";
            btnTopup.title = "Bấm để đăng nhập";
          }
        };
        window.__tlnx_update_points_ui = updatePointsUI;

        chrome.storage.local.get(["authState"], (res) => {
          updatePointsUI(res.authState);
        });

        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === "local") {
            if (changes.authState) {
              updatePointsUI(changes.authState.newValue);
            }
            if (changes.autoFillCode) {
              const checkbox = labelCheckbox.querySelector("#tlnx-auto-fill-code");
              if (checkbox) checkbox.checked = changes.autoFillCode.newValue;
            }
          }
        });
      }

      btnRun.onclick = (e) => {
        e.stopPropagation();
        const originalContent = btnRun.innerHTML;
        btnRun.innerHTML = `<span style="white-space: nowrap; font-weight: 700; margin: 0 2px;">Đang chạy...</span>`;
        btnRun.style.pointerEvents = "none";
        btnRun.style.opacity = "0.7";

        chrome.storage.local.get(["authState", "autoFillCode"], (res) => {
          if (
            !res.authState ||
            (!res.authState.uid && res.authState.uid !== "guest")
          ) {
            const origBg = btnRun.style.background;
            const origBc = btnRun.style.borderColor;
            btnRun.innerHTML = `<span style="white-space: nowrap; font-weight: 700; margin: 0 2px;">Cần Đăng nhập</span>`;
            btnRun.style.background = "#eab308";
            btnRun.style.borderColor = "#ca8a04";
            showFloatingNotification({
              title: "Cần Đăng Nhập",
              message: "Vui lòng Đăng nhập để sử dụng tính năng điền nhận xét. Đang mở trang đăng nhập...",
              type: "warning"
            });
            openAuthSafely();
            setTimeout(() => {
              btnRun.innerHTML = originalContent;
              btnRun.style.background = origBg;
              btnRun.style.borderColor = origBc;
              btnRun.style.pointerEvents = "auto";
              btnRun.style.opacity = "1";
            }, 2500);
            return;
          }

          const email = (res.authState.email || "").toLowerCase().trim();
          const isAdmin = res.authState.isAdmin === true || email === 'admin@admin.com' || email.includes('admin') || email === 'hvdkhoa89@gmail.com' || email === 'khoahoang9999@gmail.com' || email.startsWith('khoa') || email.includes('hvdkhoa');
          let isVip = checkIsUserVip(res.authState);

          if (
            res.authState &&
            res.authState.uid !== "guest" &&
            !isAdmin &&
            !isVip &&
            (res.authState.credits || 0) <= 0 &&
            (res.authState.points || 0) <= 0
          ) {
            const origBg = btnRun.style.background;
            const origBc = btnRun.style.borderColor;
            btnRun.innerHTML = `<span style="white-space: nowrap; font-weight: 700; margin: 0 2px;">Hết Hạn VIP</span>`;
            btnRun.style.background = "#ef4444";
            btnRun.style.borderColor = "#dc2626";
            showFloatingNotification({
              title: "Hết Hạn Sử Dụng",
              message: "Tài khoản của bạn đã hết số lượt hoặc hết hạn gói VIP. Vui lòng mở Tiện ích để nâng cấp / gia hạn.",
              type: "error"
            });
            setTimeout(() => {
              btnRun.innerHTML = originalContent;
              btnRun.style.background = origBg;
              btnRun.style.borderColor = origBc;
              btnRun.style.pointerEvents = "auto";
              btnRun.style.opacity = "1";
            }, 2500);
            return;
          }

          // Deduct visually right away for instant feedback
          if (res.authState && res.authState.uid !== "guest") {
            const p = res.authState.points || 0;
            const c = res.authState.credits || 0;
            
            if (isAdmin || isVip || p > 0 || c > 0) {
              if (!isAdmin && !isVip && p > 0) {
                res.authState.points -= 1;
                res.authState.pendingDeduction = (res.authState.pendingDeduction || 0) + 1;
              }
              chrome.storage.local.set({ authState: res.authState });
              updatePointsUI(res.authState);
            }
          }

          const checkboxEl = document.querySelector("#tlnx-auto-fill-code");
          const autoFillCode = checkboxEl
            ? checkboxEl.checked
            : (res.autoFillCode !== undefined ? res.autoFillCode : false);
          fillCommentsAsync({ method: "template", autoFillCode })
            .then((result) => {
              let msg = `Điền xong: ${result.count}`;
              btnRun.innerHTML = `<span style="white-space: nowrap; font-weight: 700; margin: 0 2px;">${msg}</span>`;
              btnRun.style.background = "#10b981";
              btnRun.style.borderColor = "#059669";
              setTimeout(() => {
                btnRun.innerHTML = originalContent;
                btnRun.style.background = "rgba(255,255,255,0.2)";
                btnRun.style.borderColor = "rgba(255,255,255,0.4)";
                btnRun.style.pointerEvents = "auto";
                btnRun.style.opacity = "1";
              }, 3000);
            })
            .catch((err) => {
              // Rollback visual deduction on error
              const email = (res.authState.email || "").toLowerCase().trim();
              const isAdmin = res.authState.isAdmin === true || email === 'admin@admin.com' || email.includes('admin') || email === 'hvdkhoa89@gmail.com' || email === 'khoahoang9999@gmail.com' || email.startsWith('khoa') || email.includes('hvdkhoa');
              let isVip = isAdmin || res.authState.isVip === true || (res.authState.credits || 0) > 0 || res.authState.tier === 'VIP' || res.authState.role === 'vip';

              if (res.authState && res.authState.uid !== "guest" && !isAdmin && !isVip) {
                res.authState.points = (res.authState.points || 0) + 1;
                res.authState.pendingDeduction = Math.max(
                  0,
                  (res.authState.pendingDeduction || 0) - 1,
                );
                chrome.storage.local.set({ authState: res.authState });
                updatePointsUI(res.authState);
              }

              // Keep button compact without expanding width
              btnRun.innerHTML = `<span style="white-space: nowrap; font-weight: 700; margin: 0 2px;">⚠️ Lỗi Điền</span>`;
              btnRun.style.background = "#ef4444";
              btnRun.style.borderColor = "#dc2626";

              // Show clean square message box
              showFloatingNotification({
                title: "Không Thể Điền Nhận Xét",
                message: err.message,
                type: "error",
                duration: 9000
              });

              setTimeout(() => {
                btnRun.innerHTML = originalContent;
                btnRun.style.background = "rgba(255,255,255,0.2)";
                btnRun.style.borderColor = "rgba(255,255,255,0.4)";
                btnRun.style.pointerEvents = "auto";
                btnRun.style.opacity = "1";
              }, 2500);
            });
        });
      };

      const btnClose = document.createElement("button");
      btnClose.innerHTML = `✕`;
      btnClose.title = "Tạm ẩn nút nổi trên trang này";
      btnClose.style.cssText = `background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); color: #ffffff; font-size: 11px; font-weight: 900; cursor: pointer; padding: 2px 6px; line-height: 1; opacity: 0.85; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; align-items: center; justify-content: center; height: 20px; border-radius: 9999px; margin-left: 2px; flex-shrink: 0;`;
      btnClose.onmouseover = () => {
        btnClose.style.opacity = "1";
        btnClose.style.background = "rgba(239, 68, 68, 0.85)";
        btnClose.style.borderColor = "rgba(239, 68, 68, 1)";
        btnClose.style.transform = "scale(1.1)";
      };
      btnClose.onmouseout = () => {
        btnClose.style.opacity = "0.85";
        btnClose.style.background = "rgba(255,255,255,0.18)";
        btnClose.style.borderColor = "rgba(255,255,255,0.35)";
        btnClose.style.transform = "scale(1)";
      };
      btnClose.onclick = (e) => {
        e.stopPropagation();
        disableFloatingWidget();
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ showFloatingWidget: false });
          }
        } catch (err) {}
      };

      const btnUpdate = document.createElement("button");
      btnUpdate.style.cssText = `display: none; align-items: center; gap: 3px; background: #ea580c; color: #ffffff; border: 1px solid #c2410c; border-radius: 6px; padding: 3px 7px; font-size: 10.5px; font-weight: 800; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.25); white-space: nowrap;`;
      btnUpdate.innerHTML = `<span>⚡ Tải bản mới</span>`;
      btnUpdate.title = "Đã có bản cập nhật mới! Bấm để tải file zip";

      function showInPageUpdateBanner(res) {
        if (window !== window.top) return;
        if (document.getElementById("tlnx-update-banner")) return;
        const banner = document.createElement("div");
        banner.id = "tlnx-update-banner";
        banner.style.cssText = "position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); color: #ffffff; padding: 7px 14px; border-radius: 30px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 500;";
        banner.innerHTML = `
          <span style="font-size: 14px;">🎉</span>
          <span><strong>Trợ lý Edu Pro</strong> có bản mới <strong>v${res.latestVerName || res.latestVer}</strong>!</span>
          <button id="tlnx-banner-dl-btn" style="background: #f59e0b; color: #1e1b4b; border: none; border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ⬇️ Tải bản cập nhật (.zip)
          </button>
          <button id="tlnx-banner-close-btn" style="background: transparent; border: none; color: rgba(255,255,255,0.7); font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1;">✕</button>
        `;
        document.body.appendChild(banner);
        banner.querySelector("#tlnx-banner-dl-btn").onclick = () => {
          chrome.runtime.sendMessage({ action: "downloadExtensionUpdate", url: res.downloadUrl });
          banner.querySelector("#tlnx-banner-dl-btn").innerText = "✓ Đang tải...";
        };
        banner.querySelector("#tlnx-banner-close-btn").onclick = () => {
          banner.remove();
          sessionStorage.setItem("tlnx_dismiss_update_" + (res.latestVer || ""), "true");
        };
      }

      if (chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ action: "checkExtensionUpdate" }, (res) => {
            if (res && res.hasUpdate) {
              btnUpdate.style.display = "flex";
              btnUpdate.onclick = (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: "downloadExtensionUpdate", url: res.downloadUrl });
                showInPageUpdateBanner(res);
              };
              const sessionDismiss = sessionStorage.getItem("tlnx_dismiss_update_" + (res.latestVer || ""));
              if (!sessionDismiss) {
                showInPageUpdateBanner(res);
              }
            }
          });
        } catch (e) {}
      }

      const topRow = document.createElement("div");
      topRow.style.cssText = `display: flex; align-items: center; gap: 5px; width: 100%;`;
      topRow.appendChild(btnRun);
      topRow.appendChild(btnUpdate);
      topRow.appendChild(lblPoints);
      topRow.appendChild(btnTopup);
      topRow.appendChild(btnSettings);
      topRow.appendChild(btnClose);

      widget.appendChild(topRow);
      widget.appendChild(settingsContainer);

      let isDragging = false;
      let startX, startY, initialX, initialY;

      widget.onmousedown = (e) => {
        if (
          e.target.tagName.toLowerCase() === "button" ||
          e.target.tagName.toLowerCase() === "input" ||
          e.target.closest("button")
        )
          return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        widget.style.transition = "none";
        e.preventDefault();
      };

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newX = initialX + dx;
        let newY = initialY + dy;

        const maxW = window.innerWidth - widget.offsetWidth;
        const maxH = window.innerHeight - widget.offsetHeight;
        if (newX < 0) newX = 0;
        if (newX > maxW) newX = maxW;
        if (newY < 0) newY = 0;
        if (newY > maxH) newY = maxH;

        widget.style.right = "auto";
        widget.style.bottom = "auto";
        widget.style.left = newX + "px";
        widget.style.top = newY + "px";
      });

      document.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          widget.style.transition = "opacity 0.3s ease";
        }
      });

      document.body.appendChild(widget);
    };

    // Listen for toggle messages from popup/background or other tabs
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request && (request.action === "toggleFloatingWidget" || request.action === "setFloatingWidgetVisible")) {
          if (request.visible === false || request.visible === "false") {
            disableFloatingWidget();
          } else {
            enableFloatingWidget(true);
          }
          sendResponse({ success: true, visible: request.visible !== false });
        }
      });
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.showFloatingWidget !== undefined) {
          const val = changes.showFloatingWidget.newValue;
          if (val === false || val === "false") {
            disableFloatingWidget();
          } else {
            enableFloatingWidget(true);
          }
        }
      });
    }

    // Expose helpers globally on window for direct scripting execution from popup/background
    window.__tlnx_enable_widget = (force = true) => enableFloatingWidget(force);
    window.__tlnx_disable_widget = () => disableFloatingWidget();
    window.__tlnx_inject_widget = (force = true) => injectWidget(force);

    window.addEventListener("message", (event) => {
      if (event.data && (event.data.type === "TLNX_TOGGLE_FLOATING_WIDGET" || event.data.action === "toggleFloatingWidget")) {
        if (event.data.visible === false || event.data.visible === "false") {
          disableFloatingWidget();
        } else {
          enableFloatingWidget(true);
        }
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectWidget);
    } else {
      setTimeout(injectWidget, 1000); // Wait a bit for page to render fully
    }
    
    // Ensure widget stays alive and syncs visibility in Single Page Applications (like VnEdu) where DOM is heavily modified
    const widgetSyncTimer = setInterval(() => {
      if (!isExtensionContextValid()) {
        clearInterval(widgetSyncTimer);
        return;
      }

      if (!isTargetSchoolDomain()) {
        const w = document.getElementById("tlnx-floating-widget");
        if (w) w.remove();
        return;
      }

      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["showFloatingWidget"], (res) => {
            if (chrome.runtime.lastError) return;
            const isVisible = res && res.showFloatingWidget !== false;
            const w = document.getElementById("tlnx-floating-widget");
            if (!isVisible) {
              if (w) {
                w.style.display = "none";
                w.style.visibility = "hidden";
                w.style.opacity = "0";
              }
            } else {
              window.__tlnx_floating_widget_hidden = false;
              try {
                sessionStorage.removeItem("tlnx_floating_widget_hidden");
                sessionStorage.setItem("tlnx_floating_widget_hidden", "false");
                localStorage.setItem("tlnx_show_floating_widget", "true");
              } catch (e) {}
              if (w) {
                if (w.style.display === "none") {
                  w.style.display = "flex";
                  w.style.visibility = "visible";
                  w.style.opacity = "1";
                }
              } else {
                injectWidget(false);
              }
            }
          });
        } else {
          if (!isFloatingWidgetDisabled()) {
            const w = document.getElementById("tlnx-floating-widget");
            if (w && w.style.display === "none") {
              w.style.display = "flex";
              w.style.visibility = "visible";
              w.style.opacity = "1";
            } else if (!w) {
              injectWidget(false);
            }
          }
        }
      } catch (err) {
        if (err && err.message && err.message.includes("Extension context invalidated")) {
          clearInterval(widgetSyncTimer);
        }
      }
    }, 1000);
  }

  // Lắng nghe người dùng gõ mã nhận xét tự do (T/H/C) theo thời gian thực trên CSDL Ngành (5.3.4)
  function setupDGTXRealtimeInputListener() {
    let debounceTimers = new WeakMap();

    const isDGTXContext = () => {
      const href = (window.location.href || "").toLowerCase();
      const text = (document.title + " " + (document.body ? document.body.innerText.slice(0, 3000) : "")).toLowerCase();
      return (
        href.includes("5.3.4") ||
        href.includes("danhgiathuongxuyen") ||
        href.includes("dgtx") ||
        text.includes("5.3.4") ||
        text.includes("đánh giá thường xuyên") ||
        text.includes("danh gia thuong xuyen")
      );
    };

    const handleInput = async (e) => {
      const input = e.target;
      if (!input || input.tagName !== "INPUT") return;
      if (input.type === "checkbox" || input.type === "radio" || input.type === "hidden" || input.type === "button" || input.type === "submit") return;

      const td = input.closest("td");
      const tr = input.closest("tr");
      if (!td || !tr) return;

      // Xác định xem đây có phải ô mã nhận xét không
      const isCodeCell =
        td.classList.contains("maNoiDungMonHocHDGD") ||
        td.classList.contains("maNoiDungNangLucChung") ||
        td.classList.contains("maNoiDungNangLucDacThu") ||
        td.classList.contains("maNoiDungPhamChatChuYeu") ||
        td.className.toLowerCase().includes("manoidung") ||
        td.className.toLowerCase().includes("manx") ||
        (input.maxLength > 0 && input.maxLength <= 15 && tr.querySelector("textarea")) ||
        (!td.querySelector("textarea") && td.nextElementSibling && td.nextElementSibling.querySelector("textarea"));

      if (!isCodeCell) return;
      if (!isDGTXContext()) return;

      const codeVal = (input.value || "").trim().toUpperCase();

      if (debounceTimers.has(input)) {
        clearTimeout(debounceTimers.get(input));
      }

      debounceTimers.set(
        input,
        setTimeout(async () => {
          try {
            await handleRealtimeCodeFill(input, td, tr, codeVal);
          } catch (err) {
            console.warn("[DGTX] Realtime code fill error:", err);
          }
        }, 220)
      );
    };

    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
  }

  async function handleRealtimeCodeFill(input, td, tr, code) {
    let type = "MON_HOC";
    let targetTd = null;

    if (td.classList.contains("maNoiDungMonHocHDGD")) {
      type = "MON_HOC";
      targetTd = tr.querySelector("td.noiDungMonHocHDGD") || td.nextElementSibling;
    } else if (td.classList.contains("maNoiDungNangLucChung")) {
      type = "NL_CHUNG";
      targetTd = tr.querySelector("td.noiDungNangLucChung");
    } else if (td.classList.contains("maNoiDungNangLucDacThu")) {
      type = "NL_DAC_THU";
      targetTd = tr.querySelector("td.noiDungNangLucDacThu");
    } else if (td.classList.contains("maNoiDungPhamChatChuYeu")) {
      type = "PHAM_CHAT";
      targetTd = tr.querySelector("td.noiDungPhamChatChuYeu");
    } else {
      let tds = Array.from(tr.querySelectorAll("td"));
      let tdIdx = tds.indexOf(td);
      if (tdIdx !== -1 && tds[tdIdx + 1] && tds[tdIdx + 1].querySelector("textarea")) {
        targetTd = tds[tdIdx + 1];
      } else {
        targetTd = tr.querySelector("textarea") ? tr.querySelector("textarea").closest("td") : null;
      }
    }

    if (!targetTd) return;
    const textarea = targetTd.querySelector("textarea") || (targetTd.tagName === "TEXTAREA" ? targetTd : null);
    if (!textarea) return;

    // Nếu người dùng xóa mã nhận xét, xóa nội dung nhận xét tương ứng
    if (!code || !code.trim()) {
      try {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeSetter) nativeSetter.call(textarea, "");
        else textarea.value = "";
      } catch (err) {
        textarea.value = "";
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.dispatchEvent(new Event("blur", { bubbles: true }));
      return;
    }

    // Lấy cơ sở dữ liệu nhận xét
    const storageResult = await chrome.storage.local.get(["commentsData"]);
    let db = storageResult.commentsData;
    if (!db || Object.keys(db).length === 0) {
      try {
        const resp = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "getDefaultData" }, resolve);
        });
        if (resp && resp.data) db = resp.data;
      } catch (e) {}
    }
    if (!db) return;

    let pageText = (document.body ? document.body.innerText : "").toLowerCase();
    let currentKhoi = "1";
    let khoiMatch = pageText.match(/khối\s*([1-5])/i) || pageText.match(/lớp\s*([1-5])/i);
    if (khoiMatch) currentKhoi = khoiMatch[1];

    let currentThang = "9";
    let thangSelect = document.querySelector("select[id*='ddlThang'], select[id*='Thang'], select[id*='Month']");
    if (thangSelect && thangSelect.value) currentThang = thangSelect.value;
    else {
      let thangMatch = pageText.match(/tháng\s*(\d+)/i);
      if (thangMatch) currentThang = thangMatch[1];
    }

    let dbDGTX = db?.TH?.[currentKhoi]?.DGTX || db?.TH?.["1"]?.DGTX || {};

    let monToUse = detectCSDLSubject(null);

    let tenHS = "Em";
    let tenTd = tr.querySelector("td.hoVaTen, td.hoTen, td.colName, td[class*='name'], td[class*='ten']") || tr.cells[2];
    if (tenTd) {
      let rawName = tenTd.innerText.trim();
      let parts = rawName.split(/\s+/).filter(Boolean);
      if (parts.length > 0) tenHS = parts[parts.length - 1];
    }

    const isSubjectMatched = (poolKey, targetMon) => {
      if (!poolKey || !targetMon) return false;
      const norm = (s) => (s || "").toLowerCase()
        .replace(/mỹ thuật/g, "mĩ thuật")
        .replace(/mỹ/g, "mĩ")
        .trim();
      const p = norm(poolKey);
      const t = norm(targetMon);

      if (t.includes("công nghệ")) {
        return p.includes("công nghệ") && !p.includes("mĩ thuật") && !p.includes("tin học");
      }
      if (t.includes("mĩ thuật")) {
        return p.includes("mĩ thuật") && !p.includes("công nghệ");
      }
      if (t.includes("tin học")) {
        return p.includes("tin học") && !p.includes("công nghệ");
      }
      return p.includes(t) || t.includes(p);
    };

    const mCodeUpper = code;
    const matchCodeInPool = (p) => {
      if (!p) return null;
      for (let lk in p) {
        let lvl = p[lk];
        if (!lvl) continue;
        let c = (lvl.code || "").trim().toUpperCase();
        let keyUpper = lk.trim().toUpperCase();
        let isMatch = false;
        if (c && c === mCodeUpper) isMatch = true;
        else if (keyUpper === mCodeUpper) isMatch = true;
        else if (mCodeUpper === "T" && (keyUpper === "TỐT" || keyUpper === "TOT")) isMatch = true;
        else if (mCodeUpper === "H" && (keyUpper === "HOÀN THÀNH" || keyUpper === "HOAN THANH" || keyUpper === "ĐẠT" || keyUpper === "DAT" || keyUpper === "KHÁ" || keyUpper === "KHA")) isMatch = true;
        else if (mCodeUpper === "C" && (keyUpper === "CHƯA HOÀN THÀNH" || keyUpper === "CHUA HOAN THANH" || keyUpper === "CHƯA ĐẠT" || keyUpper === "CHUA DAT")) isMatch = true;

        if (isMatch && lvl.comments && lvl.comments.length > 0) return lvl;
      }
      return null;
    };

    let matchedLvl = null;
    for (let k in dbDGTX) {
      let kLower = k.toLowerCase();
      let matchType = false;
      if (type === "MON_HOC" && isSubjectMatched(k, monToUse)) matchType = true;
      if (type === "NL_CHUNG" && (kLower.includes("năng lực chung") || kLower.includes("nl chung"))) matchType = true;
      if (type === "NL_DAC_THU" && (kLower.includes("năng lực đặc thù") || kLower.includes("nl đặc thù"))) matchType = true;
      if (type === "PHAM_CHAT" && (kLower.includes("phẩm chất") || kLower.includes("pham chat"))) matchType = true;

      if (matchType && dbDGTX[k]) {
        matchedLvl = matchCodeInPool(dbDGTX[k]);
        if (matchedLvl) break;
      }
    }

    if (!matchedLvl && type === "MON_HOC" && db?.TH) {
      for (let g of ["3", "4", "5", "1", "2"]) {
        let otherDGTX = db.TH[g]?.DGTX;
        if (otherDGTX) {
          for (let k in otherDGTX) {
            if (isSubjectMatched(k, monToUse) && otherDGTX[k]) {
              matchedLvl = matchCodeInPool(otherDGTX[k]);
              if (matchedLvl) break;
            }
          }
        }
        if (matchedLvl) break;
      }
    }

    if (!matchedLvl && type !== "MON_HOC") {
      for (let k in dbDGTX) {
        if (dbDGTX[k]) {
          matchedLvl = matchCodeInPool(dbDGTX[k]);
          if (matchedLvl) break;
        }
      }
    }

    if (matchedLvl && matchedLvl.comments && matchedLvl.comments.length > 0) {
      const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
      let rawCmt = getRandom(matchedLvl.comments);
      let cmt = rawCmt.replace(/{HocSinh}/g, tenHS).replace(/{Môn}/g, monToUse).replace(/\$?\{m\}/g, "").replace(/\s+/g, " ").trim();

      try {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeSetter) nativeSetter.call(textarea, cmt);
        else textarea.value = cmt;
      } catch (err) {
        textarea.value = cmt;
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.dispatchEvent(new Event("blur", { bubbles: true }));
    } else {
      showFloatingNotification({
        title: "Mã Nhận Xét Không Hợp Lệ",
        message: "Hiện tại không có mã nhận xét này trên mẫu Đánh giá thường xuyên (5.3.4) người dùng phải nhập mà theo mẫu hoặc sửa mã ở mẫu nhận xét Đánh giá thường xuyên (5.3.4)",
        type: "error",
        duration: 9000
      });
    }
  }

  // Kích hoạt theo dõi gõ mã thời gian thực
  setupDGTXRealtimeInputListener();
})();
