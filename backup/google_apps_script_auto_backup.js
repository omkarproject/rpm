/**
 * =========================================================================
 * RPM DIESEL - 24/7 CLOUD AUTO BACKUP (TELEGRAM & GOOGLE DRIVE)
 * =========================================================================
 * Runs completely in Google Cloud (100% Free on script.google.com).
 * Automatically delivers backup to Telegram AND/OR saves to Google Drive
 * folder even if the website is closed or computer/mobile is powered off!
 *
 * SETUP INSTRUCTIONS:
 * 1. Open https://script.google.com -> Click "New project"
 * 2. Replace all code with this script and Save (Ctrl+S).
 * 3. Click "Run" button once to test (grant Google permissions).
 * 4. To enable 24/7 background timer:
 *    - Click Clock icon ("Triggers") -> "+ Add Trigger"
 *    - Function: checkAndRunCloudAutoBackup
 *    - Event source: Time-driven -> Minutes timer -> Every 10 or 15 minutes
 * 5. To enable direct upload from browser:
 *    - Click "Deploy" (top right) -> "New deployment"
 *    - Select type: "Web app"
 *    - Description: "RPM Drive Backup"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 *    - Click Deploy -> Copy Web App URL -> Paste in RPM Settings!
 * =========================================================================
 */

const FIREBASE_DB_URL = "https://rpm-diesel-default-rtdb.firebaseio.com";
const DEFAULT_BOT_TOKEN = "8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM";
const DEFAULT_CHAT_ID = "7927138678";

function checkAndRunCloudAutoBackup() {
  Logger.log("Starting cloud auto-backup check...");

  let tgConfig = null;
  let driveConfig = null;

  try {
    const tgRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/telegramAutoBackup.json", { muteHttpExceptions: true });
    if (tgRes.getResponseCode() === 200) tgConfig = JSON.parse(tgRes.getContentText());
  } catch (e) {
    Logger.log("Error fetching telegram config: " + e);
  }

  try {
    const drRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/googleDriveAutoBackup.json", { muteHttpExceptions: true });
    if (drRes.getResponseCode() === 200) driveConfig = JSON.parse(drRes.getContentText());
  } catch (e) {
    Logger.log("Error fetching drive config: " + e);
  }

  const now = Date.now();
  const shouldRunTg = tgConfig && tgConfig.enabled && (!tgConfig.nextBackupTimestamp || now >= Number(tgConfig.nextBackupTimestamp));
  const shouldRunDrive = driveConfig && driveConfig.enabled && driveConfig.folderId && (!driveConfig.nextBackupTimestamp || now >= Number(driveConfig.nextBackupTimestamp));

  if (!shouldRunTg && !shouldRunDrive) {
    Logger.log("Neither Telegram nor Google Drive backup is due at this time.");
    return;
  }

  Logger.log("Fetching database snapshot from Firebase...");
  const dbDataRes = UrlFetchApp.fetch(FIREBASE_DB_URL + "/.json", { muteHttpExceptions: true });
  if (dbDataRes.getResponseCode() !== 200) return;

  const rawData = JSON.parse(dbDataRes.getContentText());
  if (!rawData) return;

  const cleanData = sanitizeForBackup(rawData);
  const jsonString = JSON.stringify(cleanData, null, 2);
  const jsonBlob = Utilities.newBlob(jsonString, "application/json");

  const nowObj = new Date();
  const dateStr = Utilities.formatDate(nowObj, "Asia/Kolkata", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(nowObj, "Asia/Kolkata", "HH-mm-ss");
  const fileName = "RPM_Diesel_AutoBackup_" + dateStr + "_" + timeStr + ".json";
  jsonBlob.setName(fileName);
  const sizeMb = (jsonBlob.getBytes().length / (1024 * 1024)).toFixed(2);

  // Process Telegram Backup if due
  if (shouldRunTg) {
    try {
      const botToken = (tgConfig.botToken || DEFAULT_BOT_TOKEN).trim();
      const chatId = (tgConfig.chatId || DEFAULT_CHAT_ID).trim();
      const totalEntries = rawData.entries ? Object.keys(rawData.entries).length : 0;
      const totalRequests = rawData.driverRequests ? Object.keys(rawData.driverRequests).length : 0;
      const intervalDays = Number(tgConfig.intervalDays) || 1;

      const caption = "📦 <b>RPM DIESEL 24/7 CLOUD DATABASE BACKUP</b>\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "📅 <b>Timestamp:</b> " + Utilities.formatDate(nowObj, "Asia/Kolkata", "dd MMM yyyy, hh:mm a") + " (IST)\n" +
        "💾 <b>File:</b> <code>" + fileName + "</code>\n" +
        "📊 <b>Size:</b> " + sizeMb + " MB\n" +
        "📝 <b>Data:</b> " + totalEntries + " Entries | " + totalRequests + " Requests\n" +
        "⏳ <b>Auto Schedule:</b> Every " + intervalDays + " Day(s)\n" +
        "⚙️ <b>Trigger:</b> 24/7 Google Cloud Scheduler\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
        "✅ <i>Realtime Database snapshot delivered securely.</i>";

      const telegramUrl = "https://api.telegram.org/bot" + botToken + "/sendDocument";
      const payload = {
        chat_id: chatId,
        document: jsonBlob,
        caption: caption,
        parse_mode: "HTML"
      };

      const tgRes = UrlFetchApp.fetch(telegramUrl, { method: "post", payload: payload, muteHttpExceptions: true });
      const tgResult = JSON.parse(tgRes.getContentText());

      if (tgResult && tgResult.ok) {
        Logger.log("Telegram backup delivered successfully!");
        let nextDate = new Date(now);
        if (tgConfig.preferredTime) {
          const parts = tgConfig.preferredTime.split(":");
          if (parts.length === 2) nextDate.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        }
        nextDate.setDate(nextDate.getDate() + intervalDays);
        while (nextDate.getTime() <= Date.now()) nextDate.setDate(nextDate.getDate() + intervalDays);

        const updates = {
          lastBackupTimestamp: now,
          lastBackupDate: Utilities.formatDate(nowObj, "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a"),
          nextBackupTimestamp: nextDate.getTime()
        };
        UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/telegramAutoBackup.json", {
          method: "patch", contentType: "application/json", payload: JSON.stringify(updates), muteHttpExceptions: true
        });
      }
    } catch (tgErr) {
      Logger.log("Telegram backup error: " + tgErr);
    }
  }

  // Process Google Drive Backup if due
  if (shouldRunDrive) {
    try {
      const folderId = driveConfig.folderId.trim();
      let folder;
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        Logger.log("Folder not found by ID (" + folderId + "), saving to root: " + fErr);
        folder = DriveApp.getRootFolder();
      }

      const driveFile = folder.createFile(jsonBlob);
      Logger.log("Google Drive backup saved! File ID: " + driveFile.getId() + " URL: " + driveFile.getUrl());

      const intervalDays = Number(driveConfig.intervalDays) || 1;
      let nextDate = new Date(now);
      if (driveConfig.preferredTime) {
        const parts = driveConfig.preferredTime.split(":");
        if (parts.length === 2) nextDate.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
      }
      nextDate.setDate(nextDate.getDate() + intervalDays);
      while (nextDate.getTime() <= Date.now()) nextDate.setDate(nextDate.getDate() + intervalDays);

      const updates = {
        lastBackupTimestamp: now,
        lastBackupDate: Utilities.formatDate(nowObj, "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a"),
        nextBackupTimestamp: nextDate.getTime(),
        lastFileUrl: driveFile.getUrl()
      };
      UrlFetchApp.fetch(FIREBASE_DB_URL + "/appConfig/googleDriveAutoBackup.json", {
        method: "patch", contentType: "application/json", payload: JSON.stringify(updates), muteHttpExceptions: true
      });
      Logger.log("Google Drive schedule updated in Firebase.");
    } catch (drErr) {
      Logger.log("Google Drive backup error: " + drErr);
    }
  }
}

// Web App doPost endpoint for instant uploads from RPM web application
function doPost(e) {
  try {
    let body;
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else {
      body = e.parameter || {};
    }

    const folderId = (body.folderId || "").trim();
    const fileName = body.fileName || ("RPM_Diesel_DriveBackup_" + Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd_HH-mm-ss") + ".json");
    const content = typeof body.data === "string" ? body.data : JSON.stringify(body.data, null, 2);

    let folder;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (err) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }

    const file = folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
    const output = {
      ok: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: fileName
    };
    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", service: "RPM Diesel Cloud Auto Backup Service" })).setMimeType(ContentService.MimeType.JSON);
}

function sanitizeForBackup(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForBackup);
  const out = {};
  for (const k in obj) {
    if (k === "driverRequestPhotos" || k === "entryPhotos") {
      out[k] = { _backup_info: "Omitted base64 photo records for compact backup" };
      continue;
    }
    const v = obj[k];
    if (typeof v === "string" && (v.indexOf("data:image") === 0 || (v.length > 2000 && /^[A-Za-z0-9+/=]+$/.test(v.slice(0, 80))))) {
      out[k] = "[BASE64_IMAGE_OMITTED_FOR_BACKUP]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = sanitizeForBackup(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
