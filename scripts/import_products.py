import pandas as pd
import psycopg2
import re
from psycopg2.extras import execute_values
from bs4 import BeautifulSoup
import hashlib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "..", "excel", "tokopedia.xlsx")

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
# HELPERS (WAJIB DI ATAS)
# ==============================
def parse_kategori_code(value):
    if pd.isna(value):
        return None
    match = re.search(r"\((\d+)\)", str(value))
    return match.group(1) if match else None

def generate_product_id(name):
    return hashlib.md5(name.encode()).hexdigest()[:12]

# ==============================
# LOAD EXCEL
# ==============================
df = pd.read_excel(
    file_path,
    sheet_name="Template",
    header=2
)

df.columns = df.columns.str.strip()
print(df.columns)

# ==============================
# CLEAN HTML DESCRIPTION
# ==============================
def merge_empty_colon_lines(lines):
    result = []
    i = 0
    while i < len(lines):
        current = lines[i].strip()
        if current.endswith(":") and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if not (next_line.isupper() or next_line.endswith(":")):
                result.append(f"{current} {next_line}")
                i += 2
                continue
        result.append(current)
        i += 1
    return result

def merge_key_value_lines(lines):
    result = []
    i = 0
    while i < len(lines):
        current = lines[i].strip()
        if i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            is_value = (
                re.match(r"^[0-9]", next_line) or
                next_line.lower() in ["yes", "no"] or
                re.search(r"\d", next_line) or
                "," in next_line
            )
            if not current.endswith(":") and is_value and not current.isupper():
                result.append(f"{current}: {next_line}")
                i += 2
                continue
        result.append(current)
        i += 1
    return result

def clean_html(text):
    if pd.isna(text):
        return "-"

    soup = BeautifulSoup(str(text), "html.parser")
    raw_text = soup.get_text(separator="\n")

    match = re.search(r"Spesifikasi\s*:?\s*(.*)", raw_text, re.I | re.S)
    if not match:
        return "-"

    raw_text = match.group(1)
    raw_text = re.sub(r"\n{2,}", "\n", raw_text)

    lines = [line.strip("•-* ").strip() for line in raw_text.split("\n") if line.strip()]
    lines = merge_empty_colon_lines(lines)
    lines = merge_key_value_lines(lines)

    return "\n".join(lines) or "-"

# ==============================
# PREP DATA (WAJIB SEBELUM GROUPING)
# ==============================
df["category_code"] = df["Kategori"].apply(parse_kategori_code)
df["description_clean"] = df["Deskripsi Produk"].apply(clean_html)

# DEBUG (optional tapi disarankan)
print(df[["Kategori", "category_code"]].head(5))

# ==============================
# HANDLE VARIASI
# ==============================
df["Nilai Variasi"] = df["Nilai Variasi"].fillna("default").astype(str).str.strip()

# ==============================
# GROUP PRODUK
# ==============================
grouped_products = {}

for _, row in df.iterrows():
    name = row["Nama Produk"]

    if name not in grouped_products:
        grouped_products[name] = {
            "row": row,
            "rows": [],
            "variasi_set": set()
        }

    grouped_products[name]["rows"].append(row)

    variasi = row["Nilai Variasi"]
    if variasi.lower() != "default":
        grouped_products[name]["variasi_set"].add(variasi)

# ==============================
# CONNECT DB
# ==============================
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

print("Menghapus data lama...")
cursor.execute("TRUNCATE TABLE product_images RESTART IDENTITY CASCADE;")
cursor.execute("TRUNCATE TABLE products RESTART IDENTITY CASCADE;")
conn.commit()

# ==============================
# CATEGORY MAP
# ==============================
cursor.execute("SELECT id, code FROM categories;")
category_map = {code: id for (id, code) in cursor.fetchall()}

# ==============================
# BUILD PRODUCT RECORDS
# ==============================
records = []

for name, data in grouped_products.items():
    row = data["row"]

    category_id = category_map.get(row["category_code"])
    if not category_id:
        continue

    variasi_list = [
        str(v).strip()
        for v in data["variasi_set"]
        if str(v).strip().lower() != "nan"
    ]

    variasi_value = variasi_list if variasi_list else None

    product_id = generate_product_id(name)

    total_stock = sum(
        int(r["Kuantitas"]) for r in data["rows"]
        if pd.notna(r["Kuantitas"]) and str(r["Kuantitas"]).isdigit()
    )

    records.append((
        product_id,
        name,
        row["description_clean"],
        row["Harga Ritel (Mata Uang Lokal)"],
        None,
        total_stock,
        row["SKU Penjual"],
        row["Jenis Garansi"],
        variasi_value,
        category_id
    ))

# ==============================
# INSERT PRODUCTS
# ==============================
execute_values(cursor, """
INSERT INTO products (
    product_id,
    name,
    description,
    price_normal,
    price_discount,
    stock,
    sku_seller,
    warranty,
    variasi,
    category_id
)
VALUES %s
ON CONFLICT (product_id) DO NOTHING;
""", records)

# ==============================
# PRODUCT MAP
# ==============================
cursor.execute("SELECT id, product_id FROM products;")
product_map = {pid: id for (id, pid) in cursor.fetchall()}

# ==============================
# BUILD IMAGE RECORDS
# ==============================
image_columns = [
    "Gambar Produk Utama","Gambar Produk 2","Gambar Produk 3",
    "Gambar Produk 4","Gambar Produk 5","Gambar Produk 6",
    "Gambar Produk 7","Gambar Produk 8","Gambar Produk 9"
]

image_records = []

for name, data in grouped_products.items():
    product_id = generate_product_id(name)
    product_uuid = product_map.get(product_id)

    if not product_uuid:
        continue

    sort_index = 0

    for row in data["rows"]:
        for col in image_columns:
            if col in df.columns:
                val = row[col]
                if pd.notna(val):
                    url = str(val).strip()
                    if url:
                        image_records.append((url, product_uuid, sort_index))
                        sort_index += 1

# ==============================
# INSERT IMAGES
# ==============================
if image_records:
    execute_values(cursor, """
    INSERT INTO product_images (image_url, product_id, sort_order)
    VALUES %s
    ON CONFLICT DO NOTHING;
    """, image_records)

    print(f"Images inserted: {len(image_records)}")

conn.commit()
cursor.close()
conn.close()

print(f"Products inserted: {len(records)}")