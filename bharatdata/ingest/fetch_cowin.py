import datetime
from ingest import common, ledger

URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b&format=csv&limit=all"
DEST = f"data/cowin/raw/cowin_{datetime.date.today().isoformat()}.csv"

def main():
    common.fetch(URL, DEST)
    sha = common.sha256(DEST)
    if ledger.skip_if_unchanged(DEST, sha):
        print("no change"); return
    ledger.append(DEST, URL, 200, sha, phase="2", parser="parse_cowin")

if __name__ == "__main__":
    main()
