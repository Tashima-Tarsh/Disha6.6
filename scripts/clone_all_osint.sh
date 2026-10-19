#!/bin/bash
set -e
BASE="/home/nitish.kumar/OSINT-Laboratory"
mkdir -p "$BASE"
ln -sfn "$BASE" /home/nitish.kumar/Desktop/OSINT-Laboratory

clone_repo() {
    local cat="$1"
    local url="$2"
    local name=$(basename "$url" .git)
    local target="$BASE/$cat/$name"
    mkdir -p "$BASE/$cat"
    if [ -d "$target/.git" ]; then
        echo "[EXISTS] $target"
    else
        echo "[CLONING] $url -> $target"
        git clone --depth 1 "$url" "$target" 2>&1 || echo "[FAILED] $url"
    fi
}

echo "=== CATEGORY 1: Master OSINT / Investigation ==="
clone_repo "1-master-osint" "https://github.com/jivoi/awesome-osint.git"
clone_repo "1-master-osint" "https://github.com/bellingcat/toolkit.git"
clone_repo "1-master-osint" "https://github.com/lockfale/OSINT-Framework.git"
clone_repo "1-master-osint" "https://github.com/cipher387/osint_stuff_tool_collection.git"
clone_repo "1-master-osint" "https://github.com/smicallef/spiderfoot.git"
clone_repo "1-master-osint" "https://github.com/lanmaster53/recon-ng.git"
clone_repo "1-master-osint" "https://github.com/lanmaster53/recon-ng-marketplace.git"
clone_repo "1-master-osint" "https://github.com/AnonCatalyst/Coeus-OSINT-ToolBox.git"

echo "=== CATEGORY 2: Person / Username / Identity Footprint ==="
clone_repo "2-person-identity" "https://github.com/sherlock-project/sherlock.git"
clone_repo "2-person-identity" "https://github.com/soxoj/maigret.git"
clone_repo "2-person-identity" "https://github.com/WebBreacher/WhatsMyName.git"
clone_repo "2-person-identity" "https://github.com/qeeqbox/social-analyzer.git"
clone_repo "2-person-identity" "https://github.com/iojw/socialscan.git"
clone_repo "2-person-identity" "https://github.com/p1ngul1n0/blackbird.git"
clone_repo "2-person-identity" "https://github.com/megadose/holehe.git"
clone_repo "2-person-identity" "https://github.com/mxrch/GHunt.git"
clone_repo "2-person-identity" "https://github.com/khast3x/h8mail.git"
clone_repo "2-person-identity" "https://github.com/sundowndev/PhoneInfoga.git"

echo "=== CATEGORY 3: Domain, Org & Infrastructure OSINT ==="
clone_repo "3-infrastructure-domain" "https://github.com/owasp-amass/amass.git"
clone_repo "3-infrastructure-domain" "https://github.com/projectdiscovery/subfinder.git"
clone_repo "3-infrastructure-domain" "https://github.com/laramies/theHarvester.git"
clone_repo "3-infrastructure-domain" "https://github.com/michenriksen/aquatone.git"
clone_repo "3-infrastructure-domain" "https://github.com/projectdiscovery/httpx.git"
clone_repo "3-infrastructure-domain" "https://github.com/projectdiscovery/dnsx.git"
clone_repo "3-infrastructure-domain" "https://github.com/projectdiscovery/katana.git"
clone_repo "3-infrastructure-domain" "https://github.com/projectdiscovery/nuclei.git"
clone_repo "3-infrastructure-domain" "https://github.com/blechschmidt/massdns.git"
clone_repo "3-infrastructure-domain" "https://github.com/zmap/zmap.git"
clone_repo "3-infrastructure-domain" "https://github.com/robertdavidgraham/masscan.git"

echo "=== CATEGORY 4: Metadata, Documents, Images & Geolocation ==="
clone_repo "4-metadata-geolocation" "https://github.com/exiftool/exiftool.git"
clone_repo "4-metadata-geolocation" "https://github.com/ElevenPaths/FOCA.git"
clone_repo "4-metadata-geolocation" "https://github.com/ianare/exif-py.git"
clone_repo "4-metadata-geolocation" "https://github.com/mapillary/mapillary-python-sdk.git"
clone_repo "4-metadata-geolocation" "https://github.com/gboeing/osmnx.git"
clone_repo "4-metadata-geolocation" "https://github.com/openstreetmap/osm2pgsql.git"

echo "=== CATEGORY 5: Aircraft, Radio & Maritime Surveillance ==="
clone_repo "5-radio-aircraft-maritime" "https://github.com/flightaware/dump1090.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/wiedehopf/tar1090.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/Ysurac/FlightAirMap.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/jvde-github/AIS-catcher.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/dgiardini/rtl-ais.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/merbanan/rtl_433.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/osmocom/rtl-sdr.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/f4exb/sdrangel.git"
clone_repo "5-radio-aircraft-maritime" "https://github.com/gqrx-sdr/gqrx.git"

echo "=== CATEGORY 6: Threat Intelligence Datasets ==="
clone_repo "6-threat-intelligence-datasets" "https://github.com/facebook/threat-research.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/infobloxopen/threat-intelligence.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/invictus-ir/IOCs.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/Jam0k/Threat-Intelligence-Datasets.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/MISP/misp-galaxy.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/MISP/misp-warninglists.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/Bert-JanP/Open-Source-Threat-Intel-Feeds.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/kraloveckey/threat-intelligence-feeds.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/emtoen/IOC-Feeds.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/elchacal801/threat-intel-reference.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/pan-unit42/iocs.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/eset/malware-ioc.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/executemalware/Malware-IOCs.git"
clone_repo "6-threat-intelligence-datasets" "https://github.com/firehol/blocklist-ipsets.git"

echo "=== CATEGORY 7: Security Datasets & Wordlists ==="
clone_repo "7-security-datasets" "https://github.com/boozallen/MOTIF.git"
clone_repo "7-security-datasets" "https://github.com/elastic/ember.git"
clone_repo "7-security-datasets" "https://github.com/HaveIBeenPwned/PwnedPasswordsDownloader.git"

echo "=== ALL REPOSITORIES CLONED SUCCESSFULLY ==="
ls -lh "$BASE"
df -h /
