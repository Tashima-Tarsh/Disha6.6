import csv, io, json, os, zipfile, sys
from lxml import etree

SRC = sys.argv[1] if len(sys.argv) > 1 else None
OUT = "data/eci/parsed/eci.csv"
META = "data/eci/meta/eci.json"

def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    os.makedirs(os.path.dirname(META), exist_ok=True)
    with zipfile.ZipFile(SRC) as z:
        names = [n for n in z.namelist() if n.lower().endswith(".csv")]
        with z.open(names[0]) as f:
            data = f.read()
    text = data.decode("utf-8", errors="surrogateescape")
    rdr = csv.reader(io.StringIO(text))
    rows = list(rdr)
    header, body = rows[0], rows[1:]
    with open(OUT, "w", newline="") as f:
        w = csv.writer(f); w.writerow(header); w.writerows(body)
    json.dump({"field_set": header, "column_map": {c: c for c in header}}, open(META,"w"), indent=2)

if __name__ == "__main__":
    main()
