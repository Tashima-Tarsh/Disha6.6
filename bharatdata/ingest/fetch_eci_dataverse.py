import datetime
from ingest import common, ledger

DOI = "doi:10.7910/DVN/OG47IV"
URL = f"https://dataverse.harvard.edu/api/access/dataset/:persistentId?persistentId={DOI}"
DEST = f"data/eci/raw/eci_dataverse_{datetime.date.today().isoformat()}.zip"

def main():
    common.fetch(URL, DEST)
    sha = common.sha256(DEST)
    if ledger.skip_if_unchanged(DEST, sha):
        print("no change"); return
    ledger.append(DEST, URL, 200, sha, phase="2", parser="parse_eci_dataverse")

if __name__ == "__main__":
    main()
