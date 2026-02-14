import pandas as pd
import re
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
# LOAD EXCEL
# ==============================
file_path = "../excel/tokopedia.xlsx"

df = pd.read_excel(file_path)

# ==============================
# PARSE CATEGORY
# ==============================
def parse_kategori(value):
    if pd.isna(value):
        return None, None

    text = str(value).strip()

    match = re.search(r"\((\d+)\)", text)
    code = match.group(1) if match else None

    name = re.sub(r"\s*\(\d+\)", "", text).strip()

    return name, code


parsed = df["category"].apply(parse_kategori)
result_df = pd.DataFrame(parsed.tolist(), columns=["name", "code"])

# Bersihkan
result_df = result_df.dropna(subset=["name", "code"])
result_df = result_df.drop_duplicates(subset=["code"])

# ==============================
# INSERT TO POSTGRES
# ==============================
conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

records = result_df.to_records(index=False)

insert_query = """
    INSERT INTO categories (name, code)
    VALUES %s
    ON CONFLICT (code) DO NOTHING;
"""

execute_values(cursor, insert_query, records)

conn.commit()
cursor.close()
conn.close()

print("Import categories selesai!")
print(f"Total inserted (attempted): {len(result_df)}")
