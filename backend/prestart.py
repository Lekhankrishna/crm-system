import pymysql
import os

# Extract credentials from DATABASE_URL or use env vars
# Format: mysql+pymysql://admin:pass@host:3306/db_name
db_url = os.environ.get("DATABASE_URL", "")

if db_url and "://" in db_url:
    try:
        # Very basic parsing
        # mysql+pymysql://admin:password@host:3306/crm_db
        creds_part = db_url.split("://")[1].split("@")[0]
        host_part = db_url.split("@")[1].split("/")[0]
        
        user = creds_part.split(":")[0]
        password = creds_part.split(":")[1]
        
        host = host_part.split(":")[0]
        port = int(host_part.split(":")[1]) if ":" in host_part else 3306
        
        db_name = db_url.split("/")[-1]

        print(f"Checking if database '{db_name}' exists on {host}...")
        conn = pymysql.connect(host=host, port=port, user=user, password=password)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name};")
        conn.commit()
        cursor.close()
        conn.close()
        print(f"Database '{db_name}' checked/created successfully.")
    except Exception as e:
        print(f"Error checking/creating database: {e}")
else:
    print("DATABASE_URL not found or invalid format. Skipping DB creation.")
