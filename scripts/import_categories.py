import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ==============================
# CONFIG DATABASE
# ==============================
DB_CONFIG = {
    "host": "192.168.1.176",
    "database": "anandam_db",
    "user": "anandamid",
    "password": "Letmein99+",
    "port": 5432,
}

# ==============================
# CATEGORY RENAME MAPPING
# ==============================
CATEGORY_MAPPING = {
    "Graphic Card": "VGA / Graphic Card",
    "Laptop": "Laptop",
    "Komputer Desktop": "Desktop PC",
    "Komputer All-in-One": "All-in-One PC",
    "Motherboard": "Motherboard",
    "Prosesor": "Prosesor",
    "RAM": "RAM",
    "SSD": "SSD",
    "Hard Drive": "Hard Disk (HDD)",
    "Network Attached Storage (NAS)": "NAS",
    "Drive Optik": "Optical Drive",
    "Unit Catu Daya": "Power Supply (PSU)",
    "UPS & Stabilizer": "UPS & Stabilizer",
    "Kipas & Heatsink": "Cooling (Fan & Heatsink)",
    "Bantalan Pendingin": "Cooling Pad",
    "Pasta & Bantalan Termal": "Thermal Paste",
    "Keyboard & Mouse": "Keyboard & Mouse",
    "Alas Mouse": "Mousepad",
    "Monitor": "Monitor",
    "Webcam": "Webcam",
    "Sound Card": "Sound Card",
    "Perangkat Video & Audio untuk Konferensi": "Audio & Video Conference",
    "Printer & Scanner": "Printer & Scanner",
    "Printer Label": "Label Printer",
    "Kartrid Tinta & Toner": "Tinta & Toner",
    "Perlengkapan Akuntansi": "Perlengkapan Kasir & Akuntansi",
    "Komponen Peralatan Kantor": "Aksesoris Kantor",
    "Perlengkapan Presentasi Kantor": "Aksesoris Presentasi",
    "Sakelar Network & PoE": "Network Switch & PoE",
    "Modem & Router Wireless": "Modem & Router",
    "Repeater": "WiFi Repeater",
    "Adaptor Wireless & Network Card": "WiFi Adapter & LAN Card",
    "Adaptor Powerline": "Powerline Adapter",
    "Sakelar KVM": "KVM Switch",
    "Kabel & Konektor Network": "Kabel & Konektor LAN",
    "Flash Drive & Kabel OTG": "Flashdisk & OTG",
    "USB Hub & Card Reader": "USB Hub & Card Reader",
    "Kartu SD Mikro": "Micro SD Card",
    "Hard Disk Enclosure & Docking Station": "HDD Enclosure & Docking",
    "Casing PC": "Casing PC",
    "Perlengkapan Penataan & Aksesori Meja": "Aksesoris Meja & Rak",
    "Dudukan & Alas Laptop": "Stand & Alas Laptop",
    "Perangkat Kontrol Akses & Kehadiran": "Access Control & Attendance",
    "Peralatan Ritel Pintar": "Smart Retail Device",
    "Pemindai Barcode": "Barcode Scanner",
    "Software": "Software & Lisensi",
    "Penala TV & Kartu Perekam Video": "TV Tuner & Capture Card",
    "Charger & Adaptor Laptop": "Charger & Adaptor Laptop",
}

# ==============================
# LOAD EXCEL
# ==============================
file_path = "../excel/tokopedia.xlsx"
df = pd.read_excel(file_path)

# ==============================
# RENAME CATEGORY
# ==============================
df["name"] = df["name"].map(CATEGORY_MAPPING)

# Hapus yang tidak ada mapping
df = df.dropna(subset=["name"])

# Hapus duplicate
df = df.drop_duplicates(subset=["name"])

# ==============================
# INSERT TO POSTGRES
# ==============================
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

records = df[["name"]].to_records(index=False)

insert_query = """
    INSERT INTO categories (name)
    VALUES %s
    ON CONFLICT (name) DO NOTHING;
"""

execute_values(cursor, insert_query, records)

conn.commit()
cursor.close()
conn.close()

print("Import categories selesai!")
print(f"Total inserted: {len(df)}")