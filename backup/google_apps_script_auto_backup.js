/**
 * =========================================================================
 * RPM DIESEL - 24/7 CLOUD AUTO BACKUP SCRIPT FOR GOOGLE APPS SCRIPT
 * =========================================================================
 * Yeh script Google Cloud par 24/7 chalti hai (100% Free).
 * Isse backup har haal me set kiye hue time par Telegram par chala jayega chahe:
 *  - Website bilkul BAND (CLOSED) ho
 *  - Mobile ya Laptop band / off ho
 * 
 * SETUP INSTRUCTIONS (Sirf 1 Minute ka kaam):
 * 1. https://script.google.com par jaayein.
 * 2. 'New project' button par click karein.
 * 3. Default text hataakar yeh poora script PASTE karein aur Save (Ctrl+S) karein.
 * 4. Upar 'Run' button dabakar 1 baar test karein (Google permission allow karein).
 * 5. Left menu me Clock icon ('Triggers') par click karein.
 * 6. Bottom right me '+ Add Trigger' click karein:
 *    - Function: checkAndRunCloudAutoBackup
 *    - Event source: Time-driven
 *    - Type: Minutes timer -> Every 10 minutes (ya Every 15 minutes)
 * 7. Save karein. Ho gaya! Ab website band hone par bhi 24/7 auto backup chalega!
 * =========================================================================
 */

const FIREBASE_DB_URL = 'https://rpm-diesel-default-rtdb.firebaseio.com';
const DEFAULT_BOT_TOKEN = '8880618363:AAEGp8ReJEcB563j9_2XiaVvwaPHMigt1PM';
const DEFAULT_CHAT_ID = '7927138678';

function checkAndRunCloudAutoBackup() {
  Logger.log('Starting cloud auto-backup check...');

  // 1. Fetch Auto Backup Config from Firebase RTDB
  const configUrl = FIREBASE_DB_URL + '/appConfig/telegramAutoBackup.json';
  let config;
  try {
    const configRes = UrlFetchApp.fetch(configUrl, { muteHttpExceptions: true });
    if (configRes.getResponseCode() !== 200) {
      Logger.log('Failed to fetch config. HTTP ' + configRes.getResponseCode());
      return;
    }
    config = JSON.parse(configRes.getContentText());
  } catch (err) {
    Logger.log('Error reading backup config: ' + err);
    return;
  }

  if (!config || !config.enabled) {
    Logger.log('Auto backup is disabled in appConfig.');
    return;
  }

  const botToken = (config.botToken || DEFAULT_BOT_TOKEN).trim();
  const chatId = (config.chatId || DEFAULT_CHAT_ID).trim();
  const now = Date.now();
  const nextBackupTs = Number(config.nextBackupTimestamp) || 0;

  Logger.log('Now: ' + new Date(now).toISOString() + ' | Next Scheduled: ' + new Date(nextBackupTs).toISOString());

  // If scheduled time has not arrived yet, exit
  if (nextBackupTs > 0 && now < nextBackupTs) {
    Logger.log('Scheduled time has not arrived yet. Skipping.');
    return;
  }

  // 2. Fetch full database snapshot
  Logger.log('Fetching database snapshot...');
  const dbDataRes = UrlFetchApp.fetch(FIREBASE_DB_URL + '/.json', { muteHttpExceptions: true });
  if (dbDataRes.getResponseCode() !== 200) {
    Logger.log('Failed to fetch database data: ' + dbDataRes.getResponseCode());
    return;
  }

  const rawData = JSON.parse(dbDataRes.getContentText());
  if (!rawData) {
    Logger.log('Database is empty.');
    return;
  }

  // 3. Sanitize data (strip huge base64 photos to stay under Telegram 50MB limit)
  Logger.log('Sanitizing payload...');
  const cleanData = sanitizeForBackup(rawData);
  const jsonString = JSON.stringify(cleanData);
  const jsonBlob = Utilities.newBlob(jsonString, 'application/json');
  const sizeBytes = jsonBlob.getBytes().length;
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);

  const nowObj = new Date();
  const dateStr = Utilities.formatDate(nowObj, 'Asia/Kolkata', 'yyyy-MM-dd');
  const timeStr = Utilities.formatDate(nowObj, 'Asia/Kolkata', 'HH-mm-ss');
  const fileName = 'RPM_Diesel_CloudBackup_' + dateStr + '_' + timeStr + '.json';
  jsonBlob.setName(fileName);

  const totalEntries = rawData.entries ? Object.keys(rawData.entries).length : 0;
  const totalRequests = rawData.driverRequests ? Object.keys(rawData.driverRequests).length : 0;
  const intervalDays = Number(config.intervalDays) || 1;

  const caption = '📦 <b>RPM DIESEL 24/7 CLOUD DATABASE BACKUP</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '📅 <b>Timestamp:</b> ' + Utilities.formatDate(nowObj, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a') + ' (IST)\n' +
    '💾 <b>File:</b> <code>' + fileName + '</code>\n' +
    '📊 <b>Size:</b> ' + sizeMb + ' MB\n' +
    '📝 <b>Data:</b> ' + totalEntries + ' Entries | ' + totalRequests + ' Requests\n' +
    '⏳ <b>Auto Schedule:</b> Every ' + intervalDays + ' Day(s)\n' +
    '⚙️ <b>Trigger:</b> 24/7 Google Cloud Scheduler (Website Band Hone Par Bhi)\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '✅ <i>Realtime Database snapshot delivered securely. Direct restore supported in Portal.</i>';

  // 4. Send Document to Telegram
  Logger.log('Sending backup to Telegram chat ' + chatId + ' (' + sizeMb + ' MB)...');
  const telegramUrl = 'https://api.telegram.org/bot' + botToken + '/sendDocument';
  const payload = {
    chat_id: chatId,
    document: jsonBlob,
    caption: caption,
    parse_mode: 'HTML'
  };

  const tgRes = UrlFetchApp.fetch(telegramUrl, {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  });

  Logger.log('Telegram response: ' + tgRes.getContentText());
  const tgResult = JSON.parse(tgRes.getContentText());

  if (tgResult && tgResult.ok) {
    Logger.log('Backup sent successfully!');

    // 5. Advance next scheduled timestamp in Firebase RTDB
    let nextDate = new Date(now);
    if (config.preferredTime) {
      const parts = config.preferredTime.split(':');
      if (parts.length === 2) {
        nextDate.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
      }
    }
    nextDate.setDate(nextDate.getDate() + intervalDays);
    while (nextDate.getTime() <= Date.now()) {
      nextDate.setDate(nextDate.getDate() + intervalDays);
    }

    const updates = {
      lastBackupTimestamp: now,
      lastBackupDate: Utilities.formatDate(nowObj, 'Asia/Kolkata', 'dd/MM/yyyy, hh:mm:ss a'),
      nextBackupTimestamp: nextDate.getTime()
    };

    UrlFetchApp.fetch(FIREBASE_DB_URL + '/appConfig/telegramAutoBackup.json', {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify(updates),
      muteHttpExceptions: true
    });

    Logger.log('Firebase nextBackupTimestamp updated to: ' + nextDate.toISOString());
  } else {
    Logger.log('Telegram upload failed: ' + tgRes.getContentText());
  }
}

function sanitizeForBackup(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForBackup);
  const out = {};
  for (const k in obj) {
    if (k === 'driverRequestPhotos' || k === 'entryPhotos') {
      out[k] = { _backup_info: 'Omitted base64 photo records for compact Telegram backup' };
      continue;
    }
    const v = obj[k];
    if (typeof v === 'string' && (v.indexOf('data:image') === 0 || (v.length > 2000 && /^[A-Za-z0-9+/=]+$/.test(v.slice(0, 80))))) {
      out[k] = '[BASE64_IMAGE_OMITTED_FOR_BACKUP]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = sanitizeForBackup(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
