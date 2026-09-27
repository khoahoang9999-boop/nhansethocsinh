import { generateAllSampleData } from "../shared.js";

chrome.runtime.onInstalled.addListener(() => {
    console.log("Trợ lý Nhận xét Edu Pro Installed!");
    chrome.storage.local.get(["commentsData", "showFloatingWidget"], (result) => {
        if (!result.commentsData || Object.keys(result.commentsData).length === 0) {
            chrome.storage.local.set({ commentsData: generateAllSampleData() });
        }
        if (result.showFloatingWidget === undefined) {
            chrome.storage.local.set({ showFloatingWidget: true });
        }
    });
});

// Lắng nghe thay đổi authState để đồng bộ ngay lập tức tới tất cả các tab đang mở
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.authState) {
        const newAuth = changes.authState.newValue;
        if (chrome.tabs && chrome.tabs.query) {
            chrome.tabs.query({}, (tabs) => {
                if (tabs && tabs.length) {
                    tabs.forEach((tab) => {
                        if (!tab || !tab.id) return;
                        const url = tab.url || "";
                        if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("chrome-extension://") || url.startsWith("devtools://") || url.startsWith("about:")) return;
                        chrome.tabs.sendMessage(tab.id, { action: "syncAuthState", authState: newAuth }).catch(() => {});
                    });
                }
            });
        }
    }
});

// Tự động kiểm tra và đồng bộ trạng thái nạp tiền/gia hạn theo thời gian thực
async function syncUserAuthStatus() {
    try {
        chrome.storage.local.get(["authState"], async (res) => {
            if (!res || !res.authState || !res.authState.uid || res.authState.uid === 'guest') return;
            const uid = res.authState.uid;
            const email = res.authState.email || '';
            const urls = [
                `https://ais-pre-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/user/status?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`,
                `https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/user/status?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`,
                `/api/user/status?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`
            ];

            for (const u of urls) {
                try {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 3000);
                    const response = await fetch(u, { signal: controller.signal });
                    clearTimeout(timer);
                    if (response.ok) {
                        const live = await response.json();
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
                            break;
                        }
                    }
                } catch (e) {}
            }
        });
    } catch (err) {}
}

setInterval(syncUserAuthStatus, 8000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openOptions") {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
            sendResponse({ success: true });
        } else {
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }, (tab) => {
                sendResponse({ success: true, tabId: tab ? tab.id : null });
            });
            return true;
        }
    } else if (request.action === "openAuth") {
        let authUrl = chrome.runtime.getURL('auth-ui.html');
        if (request.tab) {
            authUrl += `?tab=${request.tab}#${request.tab}`;
        }
        chrome.tabs.create({ url: authUrl }, (tab) => {
            sendResponse({ success: true, tabId: tab ? tab.id : null });
        });
        return true;
    } else if (request.action === "getDefaultData") {
        chrome.storage.local.get(["commentsData"], (result) => {
            if (!result.commentsData || Object.keys(result.commentsData).length === 0) {
                const newData = generateAllSampleData();
                chrome.storage.local.set({ commentsData: newData }, () => {
                    sendResponse({ data: newData });
                });
            } else {
                sendResponse({ data: result.commentsData });
            }
        });
        return true; 
    } else if (request.action === "closeCurrentTab") {
        if (sender.tab) {
            chrome.tabs.remove(sender.tab.id);
        }
        sendResponse({ success: true });
    } else if (request.action === "setFloatingWidgetVisible") {
        const visible = request.visible !== false;
        chrome.storage.local.set({ showFloatingWidget: visible }, () => {
            if (chrome.tabs && chrome.tabs.query) {
                chrome.tabs.query({}, (tabs) => {
                    if (tabs && tabs.length) {
                        tabs.forEach((tab) => {
                            if (!tab || !tab.id) return;
                            const url = tab.url || "";
                            if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("chrome-extension://") || url.startsWith("devtools://") || url.startsWith("about:")) return;

                            chrome.tabs.sendMessage(tab.id, { action: "toggleFloatingWidget", visible }).catch(() => {});
                            chrome.tabs.sendMessage(tab.id, { action: "setFloatingWidgetVisible", visible }).catch(() => {});

                            if (chrome.scripting && chrome.scripting.executeScript) {
                                chrome.scripting.executeScript({
                                    target: { tabId: tab.id },
                                    func: (v) => {
                                        window.__tlnx_floating_widget_hidden = !v;
                                        try {
                                            if (v) {
                                                sessionStorage.removeItem("tlnx_floating_widget_hidden");
                                                sessionStorage.setItem("tlnx_floating_widget_hidden", "false");
                                                localStorage.setItem("tlnx_show_floating_widget", "true");
                                            } else {
                                                sessionStorage.setItem("tlnx_floating_widget_hidden", "true");
                                                localStorage.setItem("tlnx_show_floating_widget", "false");
                                            }
                                        } catch (e) {}
                                        const el = document.getElementById("tlnx-floating-widget");
                                        if (v) {
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
                                            }
                                        }
                                    },
                                    args: [visible]
                                }).catch(() => {});
                            }
                        });
                    }
                });
            }
            sendResponse({ success: true, visible });
        });
        return true;
    } else if (request.action === "executeTelerikBatch") {
        if (sender.tab && sender.tab.id) {
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                world: "MAIN",
                func: (data, colMap, eventName) => {
                    // PATCH VNEDU POPUPS IN MAIN WORLD
                    if (window.radalert) window.radalert = function() { return false; };
                    if (window.radconfirm) window.radconfirm = function() { return false; };
                    if (window.confirm) {
                        var oldConfirm = window.confirm;
                        window.confirm = function(msg) {
                            if (msg.includes('đóng ứng dụng') || msg.includes('chưa lưu')) return true;
                            return oldConfirm(msg);
                        };
                    }
                    
                    try {
                        var gridEl = document.querySelector('.RadGrid');
                        var grid = null;
                        if (gridEl && gridEl.id && typeof window.$find === 'function') {
                            grid = window.$find(gridEl.id);
                        }
                        if (!grid && window.Telerik && window.Telerik.Web && window.Telerik.Web.UI && window.Telerik.Web.UI.RadGrid && window.Telerik.Web.UI.RadGrid.get_allGrids) {
                            var allGrids = window.Telerik.Web.UI.RadGrid.get_allGrids();
                            if (allGrids && allGrids.length > 0) grid = allGrids[0];
                        }
                        
                        var batchManager = (grid && typeof grid.get_batchEditingManager === 'function') ? grid.get_batchEditingManager() : null;
                        
                        function setCell(cell, val, isCode) {
                            if (!cell || val === undefined || val === null || val === '') return;
                            if (cell.classList && (cell.classList.contains('aspNetDisabled') || cell.classList.contains('rgReadOnly'))) return;
                            var textarea = cell.querySelector('textarea');
                            var inp = cell.querySelector('input:not([type="checkbox"]):not([type="radio"]), textarea, div[contenteditable="true"]');
                            if (inp && (inp.disabled || inp.readOnly)) return;
                            if (isCode && textarea) return; // Do not write code into comment textarea
                            if (!isCode && inp && !textarea && inp.maxLength > 0 && inp.maxLength <= 15) return; // Do not write comment text into code input
                            
                            if (batchManager) {
                                try {
                                    batchManager.changeCellValue(cell, val);
                                } catch(err) {}
                            }
                            if (inp) {
                                try {
                                    var valueSetter = Object.getOwnPropertyDescriptor(inp, 'value')?.set;
                                    var prototype = Object.getPrototypeOf(inp);
                                    var prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
                                    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
                                        prototypeValueSetter.call(inp, val);
                                    } else if (valueSetter) {
                                        valueSetter.call(inp, val);
                                    } else {
                                        inp.value = val;
                                    }
                                } catch(e) {
                                    inp.value = val;
                                }
                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                                inp.dispatchEvent(new Event('change', { bubbles: true }));
                                inp.dispatchEvent(new Event('blur', { bubbles: true }));
                            } else if (cell.isContentEditable) {
                                cell.innerText = val;
                                cell.dispatchEvent(new Event('input', { bubbles: true }));
                            } else {
                                cell.innerText = val;
                                cell.dispatchEvent(new Event('input', { bubbles: true }));
                                cell.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }

                        data.forEach(function(item) {
                            var tr = document.querySelector('tr[data-tlnx-row-id="' + item.rowIndex + '"]');
                            if (!tr) return;
                            var tds = Array.from(tr.querySelectorAll('td'));
                            
                            var map = {
                                monMa: tr.querySelector('td.maNoiDungMonHocHDGD') || (colMap.monMa !== -1 && tds[colMap.monMa] ? tds[colMap.monMa] : null),
                                monNd: tr.querySelector('td.noiDungMonHocHDGD') || (colMap.monNd !== -1 && tds[colMap.monNd] ? tds[colMap.monNd] : null),
                                nlcMa: tr.querySelector('td.maNoiDungNangLucChung') || (colMap.nlcMa !== -1 && tds[colMap.nlcMa] ? tds[colMap.nlcMa] : null),
                                nlcNd: tr.querySelector('td.noiDungNangLucChung') || (colMap.nlcNd !== -1 && tds[colMap.nlcNd] ? tds[colMap.nlcNd] : null),
                                nldMa: tr.querySelector('td.maNoiDungNangLucDacThu') || (colMap.nldMa !== -1 && tds[colMap.nldMa] ? tds[colMap.nldMa] : null),
                                nldNd: tr.querySelector('td.noiDungNangLucDacThu') || (colMap.nldNd !== -1 && tds[colMap.nldNd] ? tds[colMap.nldNd] : null),
                                pcMa:  tr.querySelector('td.maNoiDungPhamChatChuYeu') || (colMap.pcMa !== -1 && tds[colMap.pcMa] ? tds[colMap.pcMa] : null),
                                pcNd:  tr.querySelector('td.noiDungPhamChatChuYeu') || (colMap.pcNd !== -1 && tds[colMap.pcNd] ? tds[colMap.pcNd] : null)
                            };

                            if (item.dienMaNX) {
                                if (map.monMa && item.monMa && !item.monMaIsManual) setCell(map.monMa, item.monMa, true);
                                if (map.nlcMa && item.nlcMa && !item.nlcMaIsManual) setCell(map.nlcMa, item.nlcMa, true);
                                if (map.nldMa && item.nldMa && !item.nldMaIsManual) setCell(map.nldMa, item.nldMa, true);
                                if (map.pcMa && item.pcMa && !item.pcMaIsManual)   setCell(map.pcMa, item.pcMa, true);
                            }
                            
                            if (map.monNd && item.monNd) setCell(map.monNd, item.monNd, false);
                            if (map.nlcNd && item.nlcNd) setCell(map.nlcNd, item.nlcNd, false);
                            if (map.nldNd && item.nldNd) setCell(map.nldNd, item.nldNd, false);
                            if (map.pcNd && item.pcNd)   setCell(map.pcNd, item.pcNd, false);
                        });

                        document.dispatchEvent(new CustomEvent(eventName, { detail: { status: "OK" } }));
                    } catch(e) {
                        console.error("Batch Fill Error:", e);
                        document.dispatchEvent(new CustomEvent(eventName, { detail: { status: "ERROR", message: e.message } }));
                    }
                },
                args: [request.config.fillData, request.config.colIndices, request.config.eventName]
            }).catch(err => {
                console.error("Script injection failed:", err);
            });
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "No active tab" });
        }
    } else if (request.action === "executeSmasFastFill") {
        if (sender.tab && sender.tab.id) {
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                world: "MAIN",
                func: (fillData, eventName) => {
                    function removeAccents(str) {
                        if (!str) return "";
                        return str.normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                                  .replace(/đ/g, "d")
                                  .replace(/Đ/g, "D");
                    }
                    try {
                        var count = 0;
                        var $ = window.jQuery;
                        var kGridEl = document.querySelector(".k-grid");
                        var hasKendo = $ && kGridEl && $(kGridEl).data("kendoGrid");
                        
                        var sfGridEl = document.querySelector(".e-grid");
                        var hasSyncfusion = sfGridEl && (sfGridEl.ej2_instances || sfGridEl.ej_instances);
                        
                        var rows = Array.from(document.querySelectorAll("tr, .x-grid3-row, .e-row, [role='row']")).filter(r => {
                            if (r.offsetHeight === 0) return false;
                            if (r.closest("thead")) return false;
                            var tds = r.querySelectorAll("td, [role='gridcell'], [role='cell']");
                            return tds.length >= 3;
                        });

                        if (hasKendo) {
                            console.log("[FastFill] Kendo Grid detected!");
                            var grid = $(kGridEl).data("kendoGrid");
                            var gridRows = Array.from(kGridEl.querySelectorAll("tbody tr[role='row'], tbody tr.k-master-row"));
                            if (gridRows.length === 0) gridRows = Array.from(kGridEl.querySelectorAll("tbody tr"));
                            
                            fillData.forEach(function(item) {
                                var rowEl = gridRows[item.rowIndex] || rows[item.rowIndex];
                                if (!rowEl) return;
                                var dataItem = grid.dataItem(rowEl);
                                if (dataItem) {
                                    var colDef = grid.columns[item.cellIndex];
                                    if (colDef && colDef.field) {
                                        dataItem.set(colDef.field, item.comment);
                                        count++;
                                    }
                                }
                            });
                        } else if (hasSyncfusion) {
                            console.log("[FastFill] Syncfusion Grid detected!");
                            var grid = sfGridEl.ej2_instances ? sfGridEl.ej2_instances[0] : (sfGridEl.ej_instances ? sfGridEl.ej_instances[0] : null);
                            var sfRows = Array.from(sfGridEl.querySelectorAll(".e-row"));
                            
                            fillData.forEach(function(item) {
                                var rowEl = sfRows[item.rowIndex] || rows[item.rowIndex];
                                if (!rowEl) return;
                                var rowUid = rowEl.getAttribute("data-uid");
                                var colDef = grid.columns && grid.columns[item.cellIndex];
                                if (colDef && colDef.field) {
                                    if (rowUid && typeof grid.setCellValue === "function") {
                                        grid.setCellValue(rowUid, colDef.field, item.comment);
                                        count++;
                                    } else if (typeof grid.updateCell === "function") {
                                        grid.updateCell(item.rowIndex, colDef.field, item.comment);
                                        count++;
                                    }
                                }
                            });
                        } else {
                            console.log("[FastFill] Generic grid or AngularJS context!");
                            fillData.forEach(function(item) {
                                var rowEl = rows[item.rowIndex];
                                if (!rowEl) return;
                                var cells = Array.from(rowEl.querySelectorAll("td, [role='gridcell'], [role='cell']"));
                                var cell = cells[item.cellIndex];
                                if (!cell) return;
                                
                                var inp = cell.querySelector("input:not([type='checkbox']):not([type='radio']), textarea, div[contenteditable='true']");
                                if (inp) {
                                    if (inp.isContentEditable || inp.getAttribute("contenteditable") === "true") {
                                        inp.innerText = item.comment;
                                    } else {
                                        inp.value = item.comment;
                                    }
                                    inp.dispatchEvent(new Event("input", { bubbles: true }));
                                    inp.dispatchEvent(new Event("change", { bubbles: true }));
                                    inp.dispatchEvent(new Event("blur", { bubbles: true }));
                                    count++;
                                } else {
                                    cell.innerText = item.comment;
                                    cell.dispatchEvent(new Event("change", { bubbles: true }));
                                    cell.dispatchEvent(new Event("blur", { bubbles: true }));
                                    
                                    if (window.angular) {
                                        var cellScope = window.angular.element(cell).scope();
                                        if (cellScope) {
                                            var updated = false;
                                            if (cellScope.dataItem) {
                                                var keys = Object.keys(cellScope.dataItem);
                                                for (var k = 0; k < keys.length; k++) {
                                                    if (keys[k].toLowerCase().includes("nhanxet") || keys[k].toLowerCase().includes("comment")) {
                                                        cellScope.dataItem[keys[k]] = item.comment;
                                                        updated = true;
                                                    }
                                                }
                                            }
                                            if (updated) {
                                                cellScope.$apply();
                                            }
                                        }
                                    }
                                    count++;
                                }
                            });
                        }
                        
                        document.dispatchEvent(new CustomEvent(eventName, { detail: { status: "OK", count: count } }));
                    } catch (e) {
                        console.error("SMAS Fast Fill Exception:", e);
                        document.dispatchEvent(new CustomEvent(eventName, { detail: { status: "ERROR", message: e.message } }));
                    }
                },
                args: [request.config.fillData, request.config.eventName]
            }).catch(err => {
                console.error("Script injection failed:", err);
            });
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "No active tab" });
        }
    } else if (request.action === "checkExtensionUpdate") {
        checkVersionUpdate().then((info) => {
            sendResponse({ success: true, ...info });
        }).catch((err) => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    } else if (request.action === "downloadExtensionUpdate") {
        const downloadUrl = request.url || "https://ais-pre-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/download-extension";
        chrome.tabs.create({ url: downloadUrl });
        sendResponse({ success: true });
    } else if (request.action === "openOptionsTab") {
        const tabUrl = chrome.runtime.getURL('options.html') + (request.tab ? `?tab=${request.tab}` : '');
        chrome.tabs.create({ url: tabUrl });
        sendResponse({ success: true });
    }
});

// ================= PERIODIC UPDATE CHECKER =================
function isVersionNewer(latest, current) {
    if (!latest || !current) return false;
    if (latest === current) return false;
    const p1 = String(latest).replace(/[^\d.]/g, '').split('.').map(x => parseInt(x, 10) || 0);
    const p2 = String(current).replace(/[^\d.]/g, '').split('.').map(x => parseInt(x, 10) || 0);

    // If format is DD.MM.YYYY (e.g. 28.09.2026 or 28.9.2026)
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

async function checkVersionUpdate() {
    const currentManifest = chrome.runtime.getManifest();
    const currentVer = currentManifest.version || "28.9.2026";
    const currentVerName = currentManifest.version_name || currentVer;

    const endpoints = [
        "https://ais-pre-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/version",
        "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/version"
    ];

    let data = null;
    for (const url of endpoints) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);
            const res = await fetch(url, { cache: "no-store", signal: controller.signal });
            clearTimeout(timer);
            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
                const json = await res.json();
                if (json && (json.version || json.versionName)) {
                    data = json;
                    break;
                }
            }
        } catch (e) {}
    }

    if (!data) {
        const fallbackLatest = "28.9.2026";
        const fallbackLatestName = "28.09.2026";
        data = {
            version: fallbackLatest,
            versionName: fallbackLatestName,
            releaseDate: "28.09.2026",
            title: "Bản cập nhật v28.09.2026",
            changelog: "Cập nhật tính năng nhập mã nhận xét trên CSDL ngành (Mục ĐGTX 5.3.4), tối ưu điền nhận xét và sửa lỗi hệ thống.",
            downloadUrl: "/api/download-extension",
            forceNotify: isVersionNewer(fallbackLatest, currentVer)
        };
    }

    const latestVer = data.version || "28.9.2026";
    const latestVerName = data.versionName || "28.09.2026";
    const hasUpdate = isVersionNewer(latestVer, currentVer) || (data.forceNotify && latestVer !== currentVer);

    if (chrome.action) {
        if (hasUpdate) {
            chrome.action.setBadgeText({ text: "NEW" });
            chrome.action.setBadgeBackgroundColor({ color: "#DC2626" });
            chrome.action.setTitle({ title: `Đã có bản cập nhật mới v${latestVerName}!` });
            
            const notifiedKey = "notified_update_" + latestVer;
            chrome.storage.local.get([notifiedKey], (items) => {
                if (!items[notifiedKey] && chrome.notifications) {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon_v3_128.png",
                        title: "Trợ lý Nhận xét Edu Pro",
                        message: `Đã có bản cập nhật mới (v${latestVerName})! Nhấp để mở và tải về.`,
                        priority: 2
                    }, () => {
                        chrome.storage.local.set({ [notifiedKey]: true });
                    });
                }
            });
        } else {
            chrome.action.setBadgeText({ text: "" });
            chrome.action.setTitle({ title: `Trợ lý Nhận xét Edu Pro (v${currentVerName})` });
        }
    }

    return {
        hasUpdate,
        currentVer,
        currentVerName,
        latestVer,
        latestVerName,
        releaseDate: data.releaseDate || "28.09.2026",
        changelog: data.changelog || "Cập nhật và tối ưu tính năng mới.",
        downloadUrl: data.downloadUrl || "https://ais-dev-vmofb6ya65r63mfv77fhe2-224220661159.asia-southeast1.run.app/api/download-extension"
    };
}

if (chrome.notifications && chrome.notifications.onClicked) {
    chrome.notifications.onClicked.addListener(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html?tab=updates') });
    });
}

// Check update on startup and periodically every 20 minutes
setTimeout(() => {
    checkVersionUpdate();
}, 2000);

setInterval(() => {
    checkVersionUpdate();
}, 20 * 60 * 1000);
