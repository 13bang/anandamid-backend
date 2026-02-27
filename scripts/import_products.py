import pandas as pd
import psycopg2
import re
from psycopg2.extras import execute_values
from bs4 import BeautifulSoup

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
# LOAD EXCEL
# ==============================
file_path = "../excel/tokopedia.xlsx"
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
def clean_html(text):
    if pd.isna(text):
        return None

    soup = BeautifulSoup(str(text), "html.parser")

    # Ambil semua paragraf
    paragraphs = []

    for p in soup.find_all("p"):
        content = p.get_text(strip=True)

        # Skip paragraf kosong
        if content:
            paragraphs.append(content)

    # Gabungkan pakai newline
    clean_text = "\n".join(paragraphs)

    return clean_text if clean_text else None

# ==============================
# PARSE CATEGORY CODE
# ==============================
def parse_kategori_code(value):
    if pd.isna(value):
        return None

    match = re.search(r"\((\d+)\)", str(value))
    return match.group(1) if match else None


def clean_url(value):
    if pd.isna(value):
        return None

    value = str(value).strip()

    if value.lower() == "nan" or value == "":
        return None
    return value

df["category_code"] = df["Kategori"].apply(parse_kategori_code)
df["description_clean"] = df["Deskripsi Produk"].apply(clean_html)

# ==============================
# CONNECT DB
# ==============================
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

# ==============================
# TRUNCATE TABLES
# ==============================
print("Menghapus data lama...")

cursor.execute("TRUNCATE TABLE product_images RESTART IDENTITY CASCADE;")
cursor.execute("TRUNCATE TABLE products RESTART IDENTITY CASCADE;")

conn.commit()

print("Tabel berhasil dikosongkan.")

# ==============================
# AMBIL SEMUA CATEGORY DARI DB
# ==============================
cursor.execute("SELECT id, code FROM categories;")
categories = cursor.fetchall()

# bikin mapping {code: id}
category_map = {code: id for (id, code) in categories}

# ==============================
# BUILD DATA INSERT
# ==============================
records = []

for _, row in df.iterrows():

    category_id = category_map.get(row["category_code"])

    if not category_id:
        # kalau kategori gak ketemu, skip
        continue

    records.append((
        row["ID Produk"],                           # product_id
        row["Nama Produk"],                         # name
        row["description_clean"],                   # description
        row["Harga Ritel (Mata Uang Lokal)"],       # price_normal
        None,                                       # price_discount
        row["Kuantitas"],                           # stock
        row["SKU Penjual"],                         # sku_seller
        row["Jenis Garansi"],                       # warranty
        category_id                                 # FK category_id
    ))

# ==============================
# INSERT PRODUCTS
# ==============================
insert_query = """
INSERT INTO products (
    product_id,
    name,
    description,
    price_normal,
    price_discount,
    stock,
    sku_seller,
    warranty,
    category_id
)
VALUES %s
ON CONFLICT (product_id) DO NOTHING;
"""

execute_values(cursor, insert_query, records)

# ==============================
# AMBIL MAPPING PRODUCT_ID -> UUID
# ==============================
cursor.execute("SELECT id, product_id FROM products;")
product_rows = cursor.fetchall()

# mapping {product_id_string: uuid}
product_map = {product_id: id for (id, product_id) in product_rows}

# ==============================
# BUILD IMAGE RECORDS
# ==============================
image_columns = [
    "Gambar Produk Utama",
    "Gambar Produk 2",
    "Gambar Produk 3",
    "Gambar Produk 4",
    "Gambar Produk 5",
    "Gambar Produk 6",
    "Gambar Produk 7",
    "Gambar Produk 8",
    "Gambar Produk 9",
]

image_records = []

for _, row in df.iterrows():

    product_uuid = product_map.get(row["ID Produk"])
    if not product_uuid:
        continue

    sort_index = 0

    for col in image_columns:
        if col in df.columns:
            image_url = row[col]

            if pd.notna(image_url):
                image_url = str(image_url).strip()
                if image_url != "":
                    image_records.append((
                        image_url,
                        product_uuid,
                        sort_index
                    ))
                    sort_index += 1 
# ==============================
# INSERT PRODUCT IMAGES
# ==============================
if image_records:
    insert_images_query = """
    INSERT INTO product_images (image_url, product_id, sort_order)
    VALUES %s
    ON CONFLICT DO NOTHING;
    """

    execute_values(cursor, insert_images_query, image_records)

    print("Import product images selesai!")
    print(f"Total images inserted: {len(image_records)}")
else:
    print("Tidak ada gambar untuk diinsert.")

conn.commit()
cursor.close()
conn.close()

print("Import products selesai!")
print(f"Total inserted (attempted): {len(records)}")
print(df.columns)
exit()