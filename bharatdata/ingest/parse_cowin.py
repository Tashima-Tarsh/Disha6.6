import csv, json, os, sys
SRC = sys.argv[1]
OUT = "data/cowin/parsed/cowin.csv"
META = "data/cowin/meta/cowin.json"

def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    os.makedirs(os.path.dirname(META), exist_ok=True)
    with open(SRC, newline="") as f:
        rows = list(csv.reader(f))
    header, body = rows[0], rows[1:]
    with open(OUT, "w", newline="") as f:
        w = csv.writer(f); w.writerow(header); w.writerows(body)
    json.dump({"field_set": header, "column_map": {c: c for c in header}}, open(META,"w"), indent=2)

if __name__ == "__main__":
    main()
