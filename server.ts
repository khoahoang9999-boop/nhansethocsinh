import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import admin from 'firebase-admin';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import fs from "fs";
import { execSync } from "child_process";

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

// Initialize Firebase Client SDK for reliable Node.js Firestore access
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const clientAuth = firebase.auth();
const clientDb = firebase.firestore();

// Attempt silent sign-in for client SDK to obtain authorized credentials
let isClientAuthReady = false;
clientAuth.signInWithEmailAndPassword('admin@admin.com', 'admin123456')
  .then(() => {
    isClientAuthReady = true;
    console.log("[Firebase Client SDK] Authenticated as admin service");
  })
  .catch((err) => {
    console.warn("[Firebase Client SDK] Admin auth fallback, trying anonymous:", err.message);
    clientAuth.signInAnonymously()
      .then(() => { isClientAuthReady = true; })
      .catch(() => {});
  });

// Firebase Admin initialization (if service account provided)
let adminConfig: any = {
  projectId: "tien-ich-nx-csdl-vnedu",
};

try {
  const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (envServiceAccount) {
    const serviceAccount = JSON.parse(envServiceAccount);
    adminConfig.credential = admin.credential.cert(serviceAccount);
  } else {
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      adminConfig.credential = admin.credential.cert(serviceAccount);
    }
  }
} catch (e) {
  console.error("Failed to load Firebase Admin credentials", e);
}

try {
  if (!admin.apps.length) {
    admin.initializeApp(adminConfig);
  }
} catch (e) {
  console.error("Firebase Admin initialization error:", e);
}

const adminDb = admin.firestore();

const ADMIN_EMAILS = ['hvdkhoa89@gmail.com', 'khoahoang9999@gmail.com', 'admin@admin.com'];
const isUserAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
};

const parseServerDate = (dVal: any): Date | null => {
  if (!dVal) return null;
  if (dVal instanceof Date) return isNaN(dVal.getTime()) ? null : dVal;
  if (typeof dVal.toDate === 'function') return dVal.toDate();
  if (typeof dVal._seconds === 'number') return new Date(dVal._seconds * 1000);
  if (typeof dVal.seconds === 'number') return new Date(dVal.seconds * 1000);
  const d = new Date(dVal);
  return isNaN(d.getTime()) ? null : d;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for Chrome Extension and all clients
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Cache-Control");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use((req, res, next) => {
    // If body is raw string, try parsing as JSON
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {}
    }
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Explicitly serve the ZIP file with robust fallback and packaging
  const getExistingZip = (): string | null => {
    const publicZip28 = path.join(process.cwd(), "public/nhan-xet-diem-v28.09.2026.zip");
    const distZip28 = path.join(process.cwd(), "dist/nhan-xet-diem-v28.09.2026.zip");
    const publicZip21 = path.join(process.cwd(), "public/nhan-xet-diem-v21.09.2026.zip");
    const distZip21 = path.join(process.cwd(), "dist/nhan-xet-diem-v21.09.2026.zip");
    const publicZip = path.join(process.cwd(), "public/nhan-xet-diem-v3.zip");
    const distZip = path.join(process.cwd(), "dist/nhan-xet-diem-v3.zip");

    if (fs.existsSync(publicZip28) && fs.statSync(publicZip28).size > 50000) {
      return publicZip28;
    }
    if (fs.existsSync(distZip28) && fs.statSync(distZip28).size > 50000) {
      return distZip28;
    }
    if (fs.existsSync(publicZip21) && fs.statSync(publicZip21).size > 50000) {
      return publicZip21;
    }
    if (fs.existsSync(distZip21) && fs.statSync(distZip21).size > 50000) {
      return distZip21;
    }
    if (fs.existsSync(publicZip) && fs.statSync(publicZip).size > 50000) {
      return publicZip;
    }
    if (fs.existsSync(distZip) && fs.statSync(distZip).size > 50000) {
      return distZip;
    }
    return null;
  };

  const packageZipIfMissing = () => {
    let targetZip = getExistingZip();
    if (!targetZip) {
      console.log("ZIP file missing or invalid. Packaging extension now...");
      try {
        if (fs.existsSync(path.join(process.cwd(), "zip.js"))) {
          execSync("node zip.js", { stdio: "inherit", cwd: process.cwd() });
        } else if (fs.existsSync(path.join(process.cwd(), "package_extension.cjs"))) {
          execSync("node package_extension.cjs", { stdio: "inherit", cwd: process.cwd() });
        }
      } catch (err: any) {
        console.error("Packaging extension error:", err);
      }
    }
    return getExistingZip();
  };

  // Pre-package on server startup if not present
  packageZipIfMissing();

  const serveExtensionZip = (req: express.Request, res: express.Response) => {
    let targetZip = packageZipIfMissing();

    if (targetZip) {
      const stats = fs.statSync(targetZip);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="nhan-xet-diem-v28.09.2026.zip"');
      res.setHeader("Content-Length", stats.size);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(targetZip);
    }

    return res.status(503).json({ error: "File tiện ích đang được cập nhật, vui lòng nhấn tải lại sau vài giây." });
  };

  app.get("/nhan-xet-diem-v28.09.2026.zip", serveExtensionZip);
  app.get("/nhan-xet-diem-v21.09.2026.zip", serveExtensionZip);
  app.get("/nhan-xet-diem-v3.zip", serveExtensionZip);
  app.get("/api/download-extension", serveExtensionZip);

  // Topup Configuration Endpoints
  app.get("/api/topup-config", async (req, res) => {
    try {
      let configData: any = null;
      try {
        const c1 = await clientDb.collection("config").doc("topup").get();
        if (c1.exists) configData = c1.data();
      } catch (e) {}

      if (!configData) {
        try {
          const c2 = await clientDb.collection("system_config").doc("topup").get();
          if (c2.exists) configData = c2.data();
        } catch (e) {}
      }

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return res.json({ success: true, data: configData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/admin/topup-config", async (req, res) => {
    try {
      const payload = req.body || {};
      try {
        await clientDb.collection("config").doc("topup").set(payload, { merge: true });
        await clientDb.collection("system_config").doc("topup").set(payload, { merge: true }).catch(() => {});
      } catch (e) {
        await adminDb.collection("config").doc("topup").set(payload, { merge: true }).catch(() => {});
      }
      return res.json({ success: true, message: "Đã cập nhật bảng giá trên server" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Version and Update Information Endpoint
  app.get("/api/version", async (req, res) => {
    try {
      let versionData: any = {
        version: "28.9.2026",
        versionName: "28.09.2026",
        versionCode: 2026092801,
        releaseDate: "28.09.2026",
        title: "Bản cập nhật v28.09.2026",
        changelog: "Cập nhật tính năng nhập mã nhận xét trên CSDL ngành (Mục ĐGTX 5.3.4), tối ưu điền nhận xét và sửa lỗi hệ thống.",
        downloadUrl: "/api/download-extension",
        zipName: "nhan-xet-diem-v28.09.2026.zip",
        forceNotify: true,
        hasUpdate: true,
        updatedAt: new Date().toISOString()
      };

      try {
        const manifestPath = path.join(process.cwd(), "public/manifest.json");
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
          if (manifest.version) versionData.version = manifest.version;
          if (manifest.version_name) versionData.versionName = manifest.version_name;
        }
      } catch (mErr) {
        console.warn("Could not read manifest.json for version:", mErr);
      }

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.json({ success: true, ...versionData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin endpoint to save/update version notification
  app.post("/api/admin/update-version", async (req, res) => {
    try {
      const { version, versionName, title, changelog, downloadUrl, forceNotify } = req.body;
      if (!version) {
        return res.status(400).json({ error: "Thiếu thông tin phiên bản (version)" });
      }

      const updatePayload = {
        version,
        versionName: versionName || version,
        title: title || `Bản cập nhật v${versionName || version}`,
        changelog: changelog || "Cập nhật và cải tiến tính năng tiện ích.",
        downloadUrl: downloadUrl || "/api/download-extension",
        forceNotify: !!forceNotify,
        updatedAt: new Date().toISOString(),
      };

      try {
        await clientDb.collection("system_config").doc("app_version").set(updatePayload, { merge: true });
      } catch (e) {
        await adminDb.collection("system_config").doc("app_version").set(updatePayload, { merge: true }).catch(() => {});
      }
      return res.json({ success: true, message: "Đã phát hành thông báo phiên bản mới thành công!", data: updatePayload });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * Webhook Payment Endpoint (SePay / Casso / Bank / VietQR)
   */
  const handlePaymentWebhook = async (req: express.Request, res: express.Response) => {
    // If GET or HEAD (used by Sepay / webhook testers for verification), return 200 OK immediately
    if (req.method === "GET" || req.method === "HEAD") {
      return res.status(200).json({ 
        success: true, 
        message: "SePay Payment Webhook Endpoint is ACTIVE and READY",
        time: new Date().toISOString()
      });
    }

    try {
      console.log(`[PAYMENT WEBHOOK START] URL: ${req.url}, Method: ${req.method}`);
      console.log(`[PAYMENT WEBHOOK] Body:`, JSON.stringify(req.body));

      let bodyData: any = req.body || {};
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch (e) {}
      }
      if (bodyData.data && Array.isArray(bodyData.data) && bodyData.data.length > 0) {
        bodyData = bodyData.data[0];
      } else if (bodyData.transfer && typeof bodyData.transfer === 'object') {
        bodyData = bodyData.transfer;
      } else if (bodyData.transaction && typeof bodyData.transaction === 'object') {
        bodyData = bodyData.transaction;
      }

      const content = bodyData.content || bodyData.transactionContent || bodyData.transaction_content || bodyData.description || bodyData.memo || bodyData.msg || bodyData.notes || bodyData.text || "";
      let rawAmount = bodyData.transferAmount || bodyData.amountIn || bodyData.amount || bodyData.value || bodyData.money || bodyData.total || bodyData.transfer_amount;
      const memo = String(content || "").trim();

      // Normalize amount
      let amount = 0;
      if (typeof rawAmount === 'string') {
        amount = Number(rawAmount.replace(/[^0-9.-]+/g, ""));
      } else if (typeof rawAmount === 'number') {
        amount = rawAmount;
      }
      
      const txId = bodyData.id || bodyData.transaction_id || bodyData.tid || bodyData.referenceCode || bodyData.ref || bodyData.refId || bodyData.orderCode;
      
      console.log(`[PAYMENT WEBHOOK] Parsed amount: ${amount} VNĐ, Memo: "${memo}", txId: ${txId}`);

      // Idempotency check
      if (txId) {
        try {
          const txDoc = await clientDb.collection("processed_transactions").doc(String(txId)).get();
          if (txDoc.exists) {
            console.log(`[PAYMENT WEBHOOK] Transaction ${txId} already processed. Ignoring.`);
            return res.status(200).json({ success: true, message: "Already processed" });
          }
        } catch (e) {}
      }

      // Log payment attempts in background
      try {
        await clientDb.collection("payment_logs").add({
          amount,
          memo,
          txId: txId || null,
          fullBody: req.body,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {}

      if (!memo && !bodyData.code && !bodyData.referenceCode) {
        return res.status(200).json({ 
          success: true, 
          message: "SePay Payment Webhook Endpoint is ACTIVE and READY",
          time: new Date().toISOString()
        });
      }

      // 1. Ultra-Robust Parsing of BankCode and Email
      const candidateBankCodes: Set<string> = new Set();
      let detectedEmail: string | null = null;

      // Extract Sepay specific code field if present
      if (bodyData.code) {
        candidateBankCodes.add(String(bodyData.code).trim());
        const cleanCode = String(bodyData.code).replace(/[^0-9]/g, '');
        if (cleanCode.length >= 4) candidateBankCodes.add(cleanCode);
      }

      // Extract email from memo if present
      const emailMatch = memo.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        detectedEmail = emailMatch[0].toLowerCase().trim();
      }

      const upperMemo = memo.toUpperCase();

      // Match patterns like "SEVQR NAP <code", "SEVQR <code", "NAP <code", "NAP<code", "EDU <code", "VIP <code", "NX <code"
      const specificPatterns = [
        /SEVQR\s*NAP\s*([A-Z0-9]{3,12})/i,
        /SEVQR\s*([A-Z0-9]{3,12})/i,
        /NAP\s*([A-Z0-9]{3,12})/i,
        /EDU\s*([A-Z0-9]{3,12})/i,
        /VIP\s*([A-Z0-9]{3,12})/i,
        /NX\s*([A-Z0-9]{3,12})/i,
        /SEPAY\s*NAP\s*([A-Z0-9]{3,12})/i,
        /SEPAY\s*([A-Z0-9]{3,12})/i
      ];

      for (const pat of specificPatterns) {
        const m = upperMemo.match(pat);
        if (m && m[1]) {
          const c = m[1].trim();
          if (!['NAP', 'SEVQR', 'SEPAY', 'CASSO', 'CHUYEN', 'TIEN', 'TK'].includes(c)) {
            candidateBankCodes.add(c);
            const digits = c.replace(/[^0-9]/g, '');
            if (digits.length >= 4) candidateBankCodes.add(digits);
            if (c.length > 6 && /^\d{6}/.test(c)) {
              candidateBankCodes.add(c.substring(0, 6));
            }
          }
        }
      }

      // Also extract all 4 to 10 character number tokens (e.g. 6-digit bank codes like 123456)
      const numMatches = upperMemo.match(/\b\d{4,10}\b/g);
      if (numMatches) {
        numMatches.forEach(n => candidateBankCodes.add(n));
      }

      // Also extract 6-character alphanumeric tokens
      const words = upperMemo.split(/[\s\-_:,./\\]+/).filter(w => w.length >= 3 && !['NAP', 'SEVQR', 'SEPAY', 'CASSO', 'CHUYEN', 'TIEN', 'TK', 'MBVCB', 'VCB', 'TCB', 'ACB', 'VIB'].includes(w));
      for (const w of words) {
        if (w.length === 6 && /^[A-Z0-9]{6}$/.test(w)) {
          candidateBankCodes.add(w);
        }
      }

      console.log(`[PAYMENT WEBHOOK] Parsed candidateBankCodes:`, Array.from(candidateBankCodes), "detectedEmail:", detectedEmail);

      // 2. Ultra-flexible user finder in Firestore
      let matchedUsers: Array<{ id: string; ref: any; data: any }> = [];

      const tryFindUsers = async () => {
        // 2a. Check pending_topups collection first
        for (const code of candidateBankCodes) {
          try {
            let pendingDoc: any = await adminDb.collection("pending_topups").doc(code).get();
            if (!pendingDoc.exists) {
              pendingDoc = await clientDb.collection("pending_topups").doc(code).get();
            }
            if (pendingDoc.exists) {
              const pData = pendingDoc.data() || {};
              if (pData.uid) {
                let uDoc: any = await adminDb.collection("users").doc(pData.uid).get();
                if (!uDoc.exists) uDoc = await clientDb.collection("users").doc(pData.uid).get();
                if (uDoc.exists && !matchedUsers.some(m => m.id === uDoc.id)) {
                  matchedUsers.push({ id: uDoc.id, ref: uDoc.ref, data: uDoc.data() });
                }
              }
              if (pData.email) {
                detectedEmail = pData.email.toLowerCase().trim();
              }
            }
          } catch (e) {}
        }

        // 2b. Direct bankCode queries
        for (const code of candidateBankCodes) {
          try {
            let snap1: any = await adminDb.collection("users").where("bankCode", "==", code).get();
            if (snap1.empty) snap1 = await clientDb.collection("users").where("bankCode", "==", code).get();
            if (!snap1.empty) {
              snap1.docs.forEach((d: any) => {
                if (!matchedUsers.some(m => m.id === d.id)) matchedUsers.push({ id: d.id, ref: d.ref, data: d.data() });
              });
            }

            const numCode = Number(code);
            if (!isNaN(numCode)) {
              let snap2: any = await adminDb.collection("users").where("bankCode", "==", numCode).get();
              if (snap2.empty) snap2 = await clientDb.collection("users").where("bankCode", "==", numCode).get();
              if (!snap2.empty) {
                snap2.docs.forEach((d: any) => {
                  if (!matchedUsers.some(m => m.id === d.id)) matchedUsers.push({ id: d.id, ref: d.ref, data: d.data() });
                });
              }
            }

            // Direct doc ID
            let docDirect: any = await adminDb.collection("users").doc(code).get();
            if (!docDirect.exists) docDirect = await clientDb.collection("users").doc(code).get();
            if (docDirect.exists) {
              if (!matchedUsers.some(m => m.id === docDirect.id)) matchedUsers.push({ id: docDirect.id, ref: docDirect.ref, data: docDirect.data() });
            }
          } catch (e) {
            console.warn("User search error:", e);
          }
        }

        // 2c. Query by exact email
        if (detectedEmail && matchedUsers.length === 0) {
          try {
            let snapEmail: any = await adminDb.collection("users").where("email", "==", detectedEmail).get();
            if (snapEmail.empty) snapEmail = await clientDb.collection("users").where("email", "==", detectedEmail).get();
            if (!snapEmail.empty) {
              snapEmail.docs.forEach((d: any) => {
                if (!matchedUsers.some(m => m.id === d.id)) matchedUsers.push({ id: d.id, ref: d.ref, data: d.data() });
              });
            }
          } catch (e) {}
        }

        // 2d. In-memory deep scan of all users if not found yet
        if (matchedUsers.length === 0) {
          try {
            let allUsersSnap: any = await adminDb.collection("users").get();
            if (allUsersSnap.empty) allUsersSnap = await clientDb.collection("users").get();
            if (!allUsersSnap.empty) {
              for (const d of allUsersSnap.docs) {
                const uData = d.data() || {};
                const uEmail = (uData.email || "").toLowerCase().trim();
                const uEmailPrefix = uEmail.split('@')[0];
                const uBankCode = String(uData.bankCode || "").trim();
                const uDisplayName = (uData.displayName || "").toLowerCase().trim();

                let isMatch = false;

                // Match bankCode
                if (uBankCode && candidateBankCodes.has(uBankCode)) isMatch = true;

                // Match email or username prefix
                for (const word of words) {
                  const wLow = word.toLowerCase();
                  if (wLow.length >= 3) {
                    if (uEmailPrefix && (uEmailPrefix === wLow || uEmailPrefix.startsWith(wLow) || wLow.startsWith(uEmailPrefix))) {
                      isMatch = true;
                      break;
                    }
                    if (uEmail && uEmail.includes(wLow)) {
                      isMatch = true;
                      break;
                    }
                    if (uDisplayName && uDisplayName.includes(wLow)) {
                      isMatch = true;
                      break;
                    }
                  }
                }

                // Check if upperMemo contains email prefix or bankCode
                if (uBankCode && upperMemo.includes(uBankCode.toUpperCase())) isMatch = true;
                if (uEmailPrefix && uEmailPrefix.length >= 3 && upperMemo.includes(uEmailPrefix.toUpperCase())) isMatch = true;
                if (d.id && d.id.length >= 5 && upperMemo.includes(d.id.toUpperCase())) isMatch = true;

                if (isMatch) {
                  if (!matchedUsers.some(m => m.id === d.id)) {
                    matchedUsers.push({ id: d.id, ref: d.ref, data: uData });
                  }
                }
              }
            }
          } catch (e) {
            console.warn("In-memory user scan error:", e);
          }
        }

        // 2e. Fallback: match with most recent pending_topup if amount matches exactly
        if (matchedUsers.length === 0 && amount > 0) {
          try {
            let recentPending: any = await adminDb.collection("pending_topups").orderBy("createdAt", "desc").limit(5).get();
            if (recentPending.empty) recentPending = await clientDb.collection("pending_topups").orderBy("createdAt", "desc").limit(5).get();
            if (!recentPending.empty) {
              for (const pDoc of recentPending.docs) {
                const pData = pDoc.data() || {};
                if (pData.amount === amount && pData.uid) {
                  let uDoc: any = await adminDb.collection("users").doc(pData.uid).get();
                  if (!uDoc.exists) uDoc = await clientDb.collection("users").doc(pData.uid).get();
                  if (uDoc.exists && !matchedUsers.some(m => m.id === uDoc.id)) {
                    console.log(`[PAYMENT WEBHOOK] Matched user by pending_topup amount fallback:`, uDoc.id);
                    matchedUsers.push({ id: uDoc.id, ref: uDoc.ref, data: uDoc.data() });
                    break;
                  }
                }
              }
            }
          } catch (e) {}
        }
      };

      await tryFindUsers();

      if (matchedUsers.length === 0) {
        console.warn(`[PAYMENT] No user found for memo: "${memo}", candidateBankCodes:`, Array.from(candidateBankCodes));
        return res.status(200).json({ success: false, message: "User not found for payment memo" });
      }

      const primaryUser = matchedUsers[0];
      const userData = primaryUser.data || {};
      const userEmail = (userData.email || "").toLowerCase().trim();

      // Find other docs for the same email
      if (userEmail) {
        try {
          const preDocId = 'user_' + userEmail.replace(/[^a-zA-Z0-9]/g, '_');
          const preDoc = await clientDb.collection("users").doc(preDocId).get();
          if (preDoc.exists && !matchedUsers.some(m => m.id === preDoc.id)) {
            matchedUsers.push({ id: preDoc.id, ref: preDoc.ref, data: preDoc.data() });
          }

          const sameEmailSnap = await clientDb.collection("users").where("email", "==", userEmail).get();
          sameEmailSnap.docs.forEach(d => {
            if (!matchedUsers.some(m => m.id === d.id)) matchedUsers.push({ id: d.id, ref: d.ref, data: d.data() });
          });
        } catch (e) {}
      }

      // 3. Logic nạp: Lấy bảng giá từ config Firebase
      let packages: any[] = [];
      let baseRate = 30000;
      try {
        let configDoc = await clientDb.collection("config").doc("topup").get();
        if (!configDoc.exists) {
          configDoc = await clientDb.collection("system_config").doc("topup").get();
        }
        if (configDoc.exists) {
          const configData = configDoc.data() || {};
          if (configData.packages && Array.isArray(configData.packages)) {
            packages = configData.packages;
          }
          if (configData.baseRate || configData.anchorAmt) {
            baseRate = Number(configData.baseRate || configData.anchorAmt) || 30000;
          }
        }
      } catch (e) {}

      // Sắp xếp các gói giảm dần theo số tiền
      packages.sort((a, b) => (Number(b.amt) || 0) - (Number(a.amt) || 0));

      if (packages.length === 0) {
        packages = [
          { amt: baseRate * 5, pts: 5 },
          { amt: baseRate * 3, pts: 3 },
          { amt: baseRate * 2, pts: 2 },
          { amt: baseRate, pts: 1 },
        ];
      }

      let addedYearsForCredit = 0;
      let remainingAmount = amount;

      for (const pkg of packages) {
        const pkgAmt = Number(pkg.amt) || baseRate;
        const pkgPts = Number(pkg.pts) || 1;
        if (pkgAmt > 0 && remainingAmount >= pkgAmt) {
          const packs = Math.floor(remainingAmount / pkgAmt);
          if (packs > 0) {
            addedYearsForCredit += packs * pkgPts;
            remainingAmount %= pkgAmt;
          }
        }
      }

      // Fallback: Nếu không khớp trọn vẹn gói, tính theo tỷ lệ baseRate
      if (addedYearsForCredit <= 0 && amount > 0) {
        const calculatedYears = amount / (Number(baseRate) || 30000);
        addedYearsForCredit = parseFloat(calculatedYears.toFixed(2));
      }

      if (addedYearsForCredit <= 0) {
        addedYearsForCredit = 1; // Tối thiểu 1 năm cho giao dịch hợp lệ
      }

      const addedDays = Math.max(30, Math.round(addedYearsForCredit * 365));

      // 4. Update User Data: Cộng dồn thời hạn VIP
      const now = new Date();
      let startDateMillis = now.getTime();
      if (userData.expiryDate) {
        let existingMillis = 0;
        if (typeof userData.expiryDate.toDate === 'function') {
          existingMillis = userData.expiryDate.toDate().getTime();
        } else if (userData.expiryDate instanceof Date) {
          existingMillis = userData.expiryDate.getTime();
        } else if (userData.expiryDate._seconds) {
          existingMillis = userData.expiryDate._seconds * 1000;
        } else if (userData.expiryDate.seconds) {
          existingMillis = userData.expiryDate.seconds * 1000;
        } else if (typeof userData.expiryDate === 'string' || typeof userData.expiryDate === 'number') {
          existingMillis = new Date(userData.expiryDate).getTime();
        }

        // Chỉ cộng nối từ ngày cũ nếu ngày cũ vẫn còn trong tương lai
        if (!isNaN(existingMillis) && existingMillis > startDateMillis) {
          startDateMillis = existingMillis;
        }
      }
      
      const newExpiryMillis = startDateMillis + (addedDays * 24 * 60 * 60 * 1000);
      const newExpiryDate = new Date(newExpiryMillis);

      const currentCredits = Number(userData.credits) || 0;
      const finalCredits = Math.max(addedYearsForCredit, parseFloat((currentCredits + addedYearsForCredit).toFixed(2)));

      const updatePayload = {
        credits: finalCredits,
        expiryDate: newExpiryDate,
        isVip: true,
        tier: 'VIP',
        role: 'vip',
        updatedAt: new Date(),
        lastPaymentAt: new Date(),
        lastTransaction: {
          amount,
          memo: memo,
          txId: txId || null,
          addedDays,
          addedYears: addedYearsForCredit,
          timestamp: new Date()
        }
      };

      for (const u of matchedUsers) {
        try {
          await adminDb.collection("users").doc(u.id).set(updatePayload, { merge: true }).catch(() => {});
          await clientDb.collection("users").doc(u.id).set(updatePayload, { merge: true }).catch(() => {});
        } catch (err) {
          console.warn(`Failed to update doc ${u.id}:`, err);
        }
      }
      
      if (txId) {
        try {
          const txData = {
            amount,
            memo,
            bankCode: Array.from(candidateBankCodes).join(",") || "",
            user: primaryUser.id,
            email: userEmail,
            addedYearsForCredit,
            timestamp: new Date()
          };
          await adminDb.collection("processed_transactions").doc(String(txId)).set(txData).catch(() => {});
          await clientDb.collection("processed_transactions").doc(String(txId)).set(txData).catch(() => {});
        } catch (e) {}
      }

      console.log(`[PAYMENT] Success: Added ${addedYearsForCredit} years (${addedDays} days) to user ${userData.email || primaryUser.id}. New expiry: ${newExpiryDate.toISOString()}`);
      return res.json({ 
        success: true, 
        message: `Đã tự động gia hạn thành công +${addedYearsForCredit} năm cho tài khoản ${userData.email || ''}! Hạn mới: ${newExpiryDate.toLocaleDateString('vi-VN')}`,
        newExpiryDate: newExpiryDate.toISOString(),
        addedYears: addedYearsForCredit
      });

    } catch (err: any) {
      console.error("[PAYMENT ERROR]", err);
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  };

  // Register Webhook endpoints with wildcard matching for full SePay / Bank compatibility
  const webhookPaths = [
    "/api/webhook*",
    "/api/payment*",
    "/api/sepay*",
    "/api/casso*",
    "/webhook*",
    "/sepay*",
    "/casso*",
    "/payment*"
  ];

  webhookPaths.forEach(p => {
    app.all(p, handlePaymentWebhook);
  });

  // Manual payment check endpoint for instant verification
  app.get("/api/check-payment", async (req, res) => {
    try {
      const email = ((req.query.email as string) || "").trim().toLowerCase();
      const uid = ((req.query.uid as string) || "").trim();
      const bankCode = ((req.query.bankCode as string) || "").trim();

      if (!email && !uid && !bankCode) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
      }

      let userDoc: any = null;
      if (uid) {
        try {
          const d = await adminDb.collection("users").doc(uid).get();
          if (d.exists) userDoc = d;
        } catch (e) {}
        if (!userDoc) {
          try {
            const d2 = await clientDb.collection("users").doc(uid).get();
            if (d2.exists) userDoc = d2;
          } catch (e) {}
        }
      }

      if (!userDoc && email) {
        try {
          const snap = await adminDb.collection("users").where("email", "==", email).get();
          if (!snap.empty) userDoc = snap.docs[0];
        } catch (e) {}
        if (!userDoc) {
          try {
            const snap2 = await clientDb.collection("users").where("email", "==", email).get();
            if (!snap2.empty) userDoc = snap2.docs[0];
          } catch (e) {}
        }
      }

      if (!userDoc && bankCode) {
        try {
          const snap = await adminDb.collection("users").where("bankCode", "==", bankCode).get();
          if (!snap.empty) userDoc = snap.docs[0];
        } catch (e) {}
        if (!userDoc) {
          try {
            const snap2 = await clientDb.collection("users").where("bankCode", "==", bankCode).get();
            if (!snap2.empty) userDoc = snap2.docs[0];
          } catch (e) {}
        }
      }

      if (!userDoc || !userDoc.exists) {
        return res.json({ success: false, exists: false, message: "User not found" });
      }

      let data = userDoc.data() || {};
      let expDate: Date | null = parseServerDate(data.expiryDate);

      let now = new Date();
      let isVipByDate = expDate ? (!isNaN(expDate.getTime()) && expDate.getTime() > now.getTime()) : false;
      const isAdmin = isUserAdmin(data.email);
      let isVip = isAdmin || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || isVipByDate || ((data.credits || 0) > 0);

      // Quét tự động các log nạp tiền gần nhất nếu chưa thấy VIP bật
      if (!isVip && !isAdmin) {
        try {
          const targetBankCode = String(bankCode || data.bankCode || '').trim();
          const targetEmail = String(email || data.email || '').trim().toLowerCase();
          const emailPrefix = targetEmail ? targetEmail.split('@')[0] : '';

          let logsSnap: any = await adminDb.collection("payment_logs").orderBy("timestamp", "desc").limit(20).get();
          if (logsSnap.empty) {
            logsSnap = await clientDb.collection("payment_logs").orderBy("timestamp", "desc").limit(20).get();
          }

          if (!logsSnap.empty) {
            for (const logDoc of logsSnap.docs) {
              const log = logDoc.data() || {};
              const memoStr = String(log.memo || '').toUpperCase();
              const logAmt = Number(log.amount) || 0;

              let isLogMatch = false;
              if (targetBankCode && targetBankCode.length >= 4 && memoStr.includes(targetBankCode)) isLogMatch = true;
              if (emailPrefix && emailPrefix.length >= 3 && memoStr.includes(emailPrefix.toUpperCase())) isLogMatch = true;

              if (isLogMatch && logAmt > 0) {
                // Tự động gia hạn ngay cho tài khoản
                const addedYears = logAmt >= 150000 ? 5 : (logAmt >= 90000 ? 3 : (logAmt >= 60000 ? 2 : 1));
                const addedDays = addedYears * 365;
                const newExpMillis = Date.now() + (addedDays * 24 * 60 * 60 * 1000);
                const newExpDate = new Date(newExpMillis);

                const updatePayload = {
                  credits: Math.max(addedYears, (data.credits || 0) + addedYears),
                  expiryDate: newExpDate,
                  isVip: true,
                  tier: 'VIP',
                  role: 'vip',
                  updatedAt: new Date(),
                  lastPaymentAt: new Date(),
                  lastTransaction: {
                    amount: logAmt,
                    memo: log.memo,
                    txId: log.txId || null,
                    addedDays,
                    addedYears,
                    timestamp: new Date()
                  }
                };

                await adminDb.collection("users").doc(userDoc.id).set(updatePayload, { merge: true }).catch(() => {});
                await clientDb.collection("users").doc(userDoc.id).set(updatePayload, { merge: true }).catch(() => {});

                // Refetch user doc
                const reDoc = await adminDb.collection("users").doc(userDoc.id).get();
                if (reDoc.exists) {
                  data = reDoc.data() || {};
                  expDate = parseServerDate(data.expiryDate);
                  isVip = true;
                }
                break;
              }
            }
          }
        } catch (scanErr) {
          console.warn("Check payment log scan error:", scanErr);
        }
      }

      return res.json({
        success: true,
        exists: true,
        uid: userDoc.id,
        email: data.email,
        credits: data.credits || 0,
        isVip,
        isAdmin,
        expiryDate: expDate ? expDate.toISOString() : null,
        expiryDateStr: expDate ? expDate.toLocaleDateString('vi-VN') : '',
        lastTransaction: data.lastTransaction || null
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // User status endpoint: Syncs & returns live status from Firestore
  app.get("/api/user/status", async (req, res) => {
    try {
      const email = ((req.query.email as string) || "").trim().toLowerCase();
      const uid = ((req.query.uid as string) || "").trim();

      if (!email && !uid) {
        return res.status(400).json({ error: "Missing email or uid parameter" });
      }

      let userDoc: any = null;

      if (uid) {
        try {
          const docById = await clientDb.collection("users").doc(uid).get();
          if (docById.exists) userDoc = docById;
        } catch (e) {}
      }

      if (email && !userDoc) {
        try {
          const snap = await clientDb.collection("users").where("email", "==", email).get();
          if (!snap.empty) {
            userDoc = snap.docs.find(d => !d.id.startsWith("user_")) || snap.docs[0];
          }
        } catch (e) {}
      }

      if (!userDoc || !userDoc.exists) {
        return res.json({ exists: false, isVip: false, credits: 0, points: 0 });
      }

      const data = userDoc.data() || {};
      const expDate: Date | null = parseServerDate(data.expiryDate);

      const now = new Date();
      const isVipByDate = expDate ? (!isNaN(expDate.getTime()) && expDate.getTime() > now.getTime()) : false;
      const isAdmin = isUserAdmin(data.email);
      const isVip = isAdmin || data.isVip === true || data.tier === 'VIP' || data.role === 'vip' || isVipByDate || ((data.credits || 0) > 0);

      return res.json({
        exists: true,
        uid: userDoc.id,
        email: data.email,
        credits: data.credits || 0,
        points: data.points || 0,
        isVip,
        isAdmin,
        tier: isVip ? 'VIP' : (data.tier || 'Free'),
        role: isVip ? 'vip' : (data.role || 'user'),
        expiryDate: expDate ? expDate.toISOString() : null,
        expiryDateStr: expDate ? expDate.toLocaleDateString('vi-VN') : '',
        daysRemaining: expDate ? Math.max(0, Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Temporary endpoint to debug payment logs
  app.get("/api/webhook/logs", async (req, res) => {
    try {
      const snapshot = await clientDb.collection("payment_logs").orderBy("timestamp", "desc").limit(10).get();
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Serve static UI or Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
