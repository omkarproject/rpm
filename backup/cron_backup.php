<?php
/**
 * RPM Logistics - Daily Automated Database Backup Script
 * 
 * Scheduled to run DAILY to backup Firebase RTDB to database_backup.json
 * 
 * Recommended Cron Schedules:
 * Linux/cPanel:
 *   0 9 * * * /usr/bin/php /path/to/backup/cron_backup.php > /dev/null 2>&1
 *   or via HTTP:
 *   0 9 * * * curl -s "https://your-domain.com/backup/cron_backup.php" > /dev/null 2>&1
 * 
 * Windows Command / Scheduled Task:
 *   php "c:\Users\Admin\Documents\RPM Project\rpm-diesel-spa\backup\cron_backup.php"
 */

// Set Indian Standard Timezone
date_default_timezone_set('Asia/Kolkata');

// Increase memory and execution time limits for large database dumps
ini_set('memory_limit', '512M');
set_time_limit(300);

// Configuration
$firebaseUrl = "https://rpm-diesel-default-rtdb.firebaseio.com/.json";
$backupDir   = __DIR__;
$backupFile  = $backupDir . "/database_backup.json";
$logFile     = $backupDir . "/backup_log.txt";

// Logger function
function writeLog($message) {
    global $logFile;
    $timestamp = date("Y-m-d H:i:s");
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

writeLog("Starting DAILY auto-backup from PHP cron...");

// Fetch live database data using cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $firebaseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RPM-Backup/2.0');

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response !== false && $httpCode === 200) {
    // Validate JSON integrity
    $data = json_decode($response);
    if ($data !== null) {
        $formattedJson = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $bytesWritten = file_put_contents($backupFile, $formattedJson);
        
        if ($bytesWritten !== false && $bytesWritten > 0) {
            $formattedSize = round($bytesWritten / 1024 / 1024, 2) . " MB";
            writeLog("SUCCESS: Daily database backup completed! File updated: database_backup.json ($formattedSize).");
            
            if (php_sapi_name() !== 'cli') {
                header('Content-Type: application/json');
            }
            echo json_encode([
                "status"    => "success",
                "schedule"  => "daily",
                "timestamp" => date("Y-m-d H:i:s"),
                "file"      => "database_backup.json",
                "size"      => $formattedSize,
                "message"   => "Daily backup completed successfully!"
            ], JSON_PRETTY_PRINT);
        } else {
            writeLog("ERROR: Failed to write to backup file ($backupFile).");
            echo "ERROR: Write failed.";
        }
    } else {
        writeLog("ERROR: Response data was not valid JSON.");
        echo "ERROR: Invalid JSON response.";
    }
} else {
    $errDetail = $curlError ? " cURL Error: $curlError" : "";
    writeLog("ERROR: Failed to fetch database from Firebase. HTTP Code: $httpCode.$errDetail");
    echo "ERROR: Fetch failed (HTTP $httpCode).$errDetail";
}
?>
