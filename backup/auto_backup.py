import os
import urllib.request
import json
import datetime

# Define backup paths (dynamic relative to this script)
BACKUP_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_FILE = os.path.join(BACKUP_DIR, "database_backup.json")
LOG_FILE = os.path.join(BACKUP_DIR, "backup_log.txt")

# Ensure backup directory exists
os.makedirs(BACKUP_DIR, exist_ok=True)

def write_log(message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}\n"
    with open(LOG_FILE, "a", encoding="utf-8") as lf:
        lf.write(log_line)
    print(message)

def run_backup():
    db_url = "https://rpm-diesel-default-rtdb.firebaseio.com/.json"
    write_log("Starting auto-backup...")
    
    try:
        req = urllib.request.Request(db_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            raw_data = response.read().decode('utf-8')
            
            # Parse to verify it's valid JSON
            parsed_data = json.loads(raw_data)
            
            # Save and replace old database_backup.json
            with open(BACKUP_FILE, "w", encoding="utf-8") as bf:
                json.dump(parsed_data, bf, indent=2, ensure_ascii=False)
            
            write_log("SUCCESS: Database backup completed! Old backup replaced.")
    except Exception as e:
        write_log(f"ERROR: Backup failed: {str(e)}")

if __name__ == "__main__":
    run_backup()
