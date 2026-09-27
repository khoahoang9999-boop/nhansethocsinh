const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
if (!serviceAccount) process.exit(1);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
async function run() {
  await db.collection("system_config").doc("app_version").set({
    version: "28.9.2026",
    versionName: "28.09.2026",
    releaseDate: "28.09.2026",
    title: "Bản cập nhật v28.09.2026",
    changelog: "Cập nhật và tối ưu hóa hệ thống tiện ích.",
    downloadUrl: "/api/download-extension",
    hasUpdate: false
  }, { merge: true });
  console.log("Version updated in Firestore!");
  process.exit(0);
}
run();
