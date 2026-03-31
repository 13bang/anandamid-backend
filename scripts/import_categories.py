import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import uuid
import re

# ==============================
# CONFIG DATABASE
# ==============================
DB_CONFIG = {
    "host": "192.168.1.176",
    "database": "anandam_db",
    "user": "anandamid",
    "password": "Letmein99+",
    "port": 5432,
    "sslmode": "disable",
}

# ==============================
# CATEGORY RENAME MAPPING (CHILD)
# ==============================
CATEGORY_MAPPING = {
    "Graphic Card": "VGA",
    "Laptop": "Laptop",
    "Komputer Desktop": "Desktop PC",
    "Komputer All-in-One": "PC AIO",
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
# PARENT STRUCTURE
# ==============================
PARENT_STRUCTURE = {
    "Komputer & Laptop": [
        "Laptop", "Desktop PC", "PC AIO"
    ],
    "Komponen PC": [
        "Prosesor", "Motherboard", "RAM", "VGA",
        "Power Supply (PSU)", "Cooling (Fan & Heatsink)",
        "Thermal Paste", "Casing PC"
    ],
    "Storage": [
        "SSD", "Hard Disk (HDD)", "NAS",
        "HDD Enclosure & Docking", "Optical Drive",
        "Flashdisk & OTG", "Micro SD Card"
    ],
    "Networking": [
        "Modem & Router", "Network Switch & PoE",
        "WiFi Repeater", "WiFi Adapter & LAN Card",
        "Powerline Adapter", "Kabel & Konektor LAN",
        "KVM Switch"
    ],
    "Peripheral": [
        "Monitor", "Keyboard & Mouse", "Mousepad",
        "Webcam", "Sound Card", "Audio & Video Conference",
        "Cooling Pad", "Stand & Alas Laptop"
    ],
    "Printer & Office": [
        "Printer & Scanner", "Label Printer",
        "Tinta & Toner", "Perlengkapan Kasir & Akuntansi",
        "Aksesoris Presentasi", "Aksesoris Kantor"
    ],
    "Smart Device & Retail": [
        "Smart Retail Device", "Barcode Scanner",
        "Access Control & Attendance"
    ],
    "Mobile & Gadget": [
        "Ponsel", "Tablet", "Stilus",
        "Holder & Dudukan Telepon",
        "Charger & Adaptor Laptop",
        "Pengisi Daya USB"
    ],

    "Audio & Video": [
        "Speaker", "Earphone & Headphone",
        "Amplifier & Mixer", "Mikrofon",
        "Aksesoris Audio & Video"
    ],

    "Kamera & Security": [
        "Kamera & Sistem Keamanan",
        "Aksesoris Kamera",
        "Perawatan Kamera",
        "Drone & Aksesoris"
    ],

    "Gaming": [
        "Joystick",
        "Konsol Game Rumah",
        "Aksesoris Konsol"
    ],

    "Elektronik Rumah": [
        "Televisi",
        "Suku Cadang & Aksesori Televisi",
        "Bohlam, Tube & Strip",
        "Catu Daya"
    ],

    "Peralatan & Hardware": [
        "Tang",
        "Kawat & Kabel",
        "Capacitor"
    ],

    "Furniture": [
        "Kursi",
        "Meja & Desk"
    ],

    "Office & Retail Tambahan": [
        "Penghitung Uang",
        "Server Cetak"
    ]
    
    # "Software & Lisensi": [
    #     "TV Tuner & Capture Card"
    # ]
}

def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

# ==============================
# LOAD EXCEL
# ==============================
file_path = "../excel/tokopedia.xlsx"
df = pd.read_excel(file_path)
df.columns = df.columns.str.strip()

def extract_category(value):
    if pd.isna(value):
        return None, None

    match = re.match(r"^(.*)\s+\((\d+)\)$", str(value).strip())
    if match:
        return match.group(1).strip(), match.group(2).strip()

    return None, None

df[["raw_name", "code"]] = df["category"].apply(
    lambda x: pd.Series(extract_category(x))
)

# rename pakai mapping
df["name"] = df["raw_name"].map(CATEGORY_MAPPING)

# drop yang tidak ada mapping
df = df.dropna(subset=["name", "code"])

# hapus duplicate berdasarkan code (lebih aman)
df = df.drop_duplicates(subset=["code"])

# ==============================
# INSERT
# ==============================
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

# ==============================
# TRUNCATE TABLE
# ==============================
cursor.execute("""
    TRUNCATE TABLE categories RESTART IDENTITY CASCADE;
""")
print("Table categories berhasil di-truncate")

# Insert Parent Categories
parent_ids = {}

for parent_name in PARENT_STRUCTURE.keys():
    parent_id = str(uuid.uuid4())
    parent_ids[parent_name] = parent_id

    parent_slug = slugify(parent_name)

    cursor.execute("""
        INSERT INTO categories (id, name, code, code_slug, parent_id)
        VALUES (%s, %s, %s, %s, NULL);
    """, (
        parent_id,
        parent_name,
        parent_slug,   # code = slug juga
        parent_slug
    ))

# Insert Child Categories
for parent_name, children in PARENT_STRUCTURE.items():
    parent_id = parent_ids[parent_name]

    for child in children:
        row = df[df["name"] == child]

        if row.empty:
            continue

        excel_code = row.iloc[0]["code"]

        cursor.execute("""
            INSERT INTO categories (id, name, code, code_slug, parent_id)
            VALUES (%s, %s, %s, %s, %s);
        """, (
            str(uuid.uuid4()),
            child,
            excel_code,           
            slugify(child),         
            parent_id
        ))

# ==============================
# INSERT CATEGORIES TANPA PARENT
# ==============================

# Ambil semua child yang sudah dipakai di parent
used_children = set()
for children in PARENT_STRUCTURE.values():
    for child in children:
        used_children.add(child)

# Ambil kategori yang tidak masuk parent
remaining_categories = df[~df["name"].isin(used_children)]

for _, row in remaining_categories.iterrows():
    slug = slugify(row["name"])

    cursor.execute("""
        INSERT INTO categories (id, name, code, code_slug, parent_id)
        VALUES (%s, %s, %s, %s, NULL);
    """, (
        str(uuid.uuid4()),
        row["name"],
        row["code"],  
        slug        
    ))

conn.commit()
cursor.close()
conn.close()

print("Import categories dengan parent-child selesai!")