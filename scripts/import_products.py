import pandas as pd
import psycopg2
import re
from psycopg2.extras import execute_values
from bs4 import BeautifulSoup
import hashlib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "..", "excel", "Tiktoksellercenter_batchedit_20260402_all_information_template_9.xlsx")
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# file_path = os.path.join(BASE_DIR, "..", "excel","excel2", "Tiktoksellercenter_batchedit_20260402_all_information_template_12.xlsx")

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

def parse_kategori_name(value):
    if pd.isna(value):
        return None
    return re.sub(r"\s*\(\d+\)", "", str(value)).strip()

def generate_product_id(name):
    clean_name = (
        str(name)
        .strip()
        .lower()
        .replace("\xa0", " ") 
    )
    return hashlib.md5(clean_name.encode()).hexdigest()[:12]

def safe_get(row, column):
    if column not in row or pd.isna(row[column]):
        return None
    val = str(row[column]).strip()
    return val if val else None

def safe_numeric(val):
    try:
        return float(val)
    except:
        return None

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

df = df[
    df["Nama produk"].notna() &
    (df["Nama produk"].astype(str).str.strip() != "") &
    ~df["Nama produk"].astype(str).str.contains("Wajib|Opsional|Tambahkan|Example|Contoh", case=False)
]

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
# df["category_code"] = df["Kategori"].apply(parse_kategori_code)
# df["category_name"] = df["Kategori"].apply(parse_kategori_name)
df["description_clean"] = df["Deskripsi produk"].apply(clean_html)

# DEBUG (optional tapi disarankan)
# print(df[["Kategori", "category_code"]].head(5))

# ==============================
# HANDLE VARIASI
# ==============================
df["Nilai Variasi"] = df["Nilai Variasi"].fillna("default").astype(str).str.strip()

# ==============================
# GROUP PRODUK
# ==============================
grouped_products = {}

for _, row in df.iterrows():
    name = row["Nama produk"]

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

# ==============================
# CATEGORY MAP
# ==============================
# cursor.execute("SELECT id, code FROM categories;")
# category_map = {code: id for (id, code) in cursor.fetchall()}

# ==============================
# AUTO INSERT CATEGORY DARI EXCEL
# ==============================
# new_categories = []

# for _, row in df.iterrows():
#     code = row["category_code"]
#     name = row["category_name"]

#     if pd.isna(code) or not name:
#         continue

#     if code not in category_map:
#         new_categories.append((name, code))

# # remove duplicate
# new_categories = list(set(new_categories))

# if new_categories:
#     print(f"Insert kategori baru: {len(new_categories)}")

#     execute_values(cursor, """
#         INSERT INTO categories (name, code)
#         VALUES %s
#         ON CONFLICT (code) DO NOTHING;
#     """, new_categories)

#     conn.commit()

#     # reload category_map
#     cursor.execute("SELECT id, code FROM categories;")
#     category_map = {code: id for (id, code) in cursor.fetchall()}

# ==============================
# BUILD PRODUCT RECORDS
# ==============================
records = []

for name, data in grouped_products.items():
    row = data["row"]

    category_id = None

    variasi_list = [
        str(v).strip()
        for v in data["variasi_set"]
        if str(v).strip().lower() != "nan"
    ]

    variasi_value = variasi_list if variasi_list else None

    product_id = generate_product_id(name)

    total_stock = sum(
        int(r["Kuantitas"])
        for r in data["rows"]
        if pd.notna(r["Kuantitas"]) and str(r["Kuantitas"]).isdigit()
    )

    records.append((
        product_id,
        name,
        row["description_clean"],
        safe_numeric(row["Harga Ritel (Mata Uang Lokal)"]),
        None,
        total_stock,
        row["SKU Penjual"],
        safe_get(row, "Jenis Garansi"),
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
ON CONFLICT (product_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_normal = EXCLUDED.price_normal,
    price_discount = EXCLUDED.price_discount,
    stock = EXCLUDED.stock,
    sku_seller = EXCLUDED.sku_seller,
    warranty = EXCLUDED.warranty,
    variasi = EXCLUDED.variasi,
    category_id = EXCLUDED.category_id;
""", records)

# ==============================
# PRODUCT MAP
# ==============================
cursor.execute("SELECT id, product_id FROM products;")
product_map = {pid: id for (id, pid) in cursor.fetchall()}

print("Sample data gambar:")
for col in df.columns:
    if "gambar" in col.lower():
        print(col, "=>", df[col].dropna().head(3).tolist())

# ==============================
# BUILD IMAGE RECORDS
# ==============================
image_columns = [
    ["Gambar Produk Utama", "Gambar utama"],
    ["Gambar Produk 2", "Gambar 2"],
    ["Gambar Produk 3", "Gambar 3"],
    ["Gambar Produk 4", "Gambar 4"],
    ["Gambar Produk 5", "Gambar 5"],
    ["Gambar Produk 6", "Gambar 6"],
    ["Gambar Produk 7", "Gambar 7"],
    ["Gambar Produk 8"],
    ["Gambar Produk 9"]
]

image_records = []

for name, data in grouped_products.items():
    product_id = generate_product_id(name)
    product_uuid = product_map.get(product_id)

    if not product_uuid:
        continue

    sort_index = 0

    for row in data["rows"]:  
        for col_options in image_columns:
            val = None

            for col in col_options:
                if col in df.columns:
                    temp = row[col]
                    if pd.notna(temp) and str(temp).strip():
                        val = temp
                        break

            if val is not None:
                url = str(val).strip()

                if (
                    url.lower() == "nan"
                    or "http" not in url
                    or "Tambahkan" in url
                    or "Wajib" in url
                    or "Opsional" in url
                ):
                    continue

                image_records.append((url, product_uuid, sort_index))
                sort_index += 1

# hapus gambar lama per product
product_ids = [
    product_map[generate_product_id(name)]
    for name in grouped_products
    if generate_product_id(name) in product_map
]

if product_ids:
    cursor.execute("""
        DELETE FROM product_images
        WHERE product_id = ANY(%s::uuid[])
    """, (product_ids,))

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