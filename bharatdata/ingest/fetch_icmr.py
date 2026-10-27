import datetime, os
from ingest import common, ledger

KEY = os.environ.get("DATA_GOV_IN_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
URL = f"https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key={KEY}&format=csv&limit=all"
DEST = f"data/icmr/raw/icmr_{datetime.date.today().isoformat()}.csv"

def main():
    common.fetch(URL, DEST)
    sha = common.sha256(DEST)
    if ledger.skip_if_unchanged(DEST, sha):
        print("no change"); return
    ledger.append(DEST, URL, 200, sha, phase="2", parser="parse_icmr")

if __name__ == "__main__":
    main()
