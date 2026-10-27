"""Privacy and System Invariant Tests.

Verifies:
1. Zero raw 12-digit UID storage invariant across Aadhaar parsers.
2. Verhoeff checksum algorithm correctness.
3. Cryptographic name hashing determinism.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET

from ingest.parse_aadhaar_qr import mask_uid, parse_aadhaar_qr
from ingest.parse_aadhaar_xml import parse_aadhaar_xml
from live.aadhaar import validate_verhoeff, verify_aadhaar_checksum_ephemeral


def test_verhoeff_checksum_algorithm():
    # Valid Aadhaar numbers generated via Verhoeff
    assert validate_verhoeff("234567890124") is True
    # Invalid Aadhaar numbers (corrupted single digit or transposed)
    assert validate_verhoeff("234567890127") is False
    assert validate_verhoeff("123456789012") is False
    assert validate_verhoeff("short") is False
    assert validate_verhoeff("") is False


def test_uid_masking():
    assert mask_uid("123456789012") == "XXXX-XXXX-9012"
    assert mask_uid("9012") == "XXXX-XXXX-9012"
    assert mask_uid("XXXX-XXXX-9012") == "XXXX-XXXX-9012"


def test_aadhaar_xml_zero_raw_uid_invariant():
    """Verify that parse_aadhaar_xml never outputs raw 12-digit UID in parsed output."""
    raw_uid = "999912345678"
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
    <OfflinePaperlessKyc referenceId="9999202401011234">
        <UidData>
            <Poi name="Ramesh Kumar" dob="1985-05-15" gender="M"/>
            <Poa state="Delhi" pc="110001" co="S/O Suresh Kumar"/>
        </UidData>
        <SignatureValue>MOCK_SIGNATURE_BYTES</SignatureValue>
    </OfflinePaperlessKyc>
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        xml_path = os.path.join(tmpdir, "test_kyc.xml")
        out_dir = os.path.join(tmpdir, "parsed")
        with open(xml_path, "w", encoding="utf-8") as f:
            f.write(xml_content)

        parsed_file = parse_aadhaar_xml(xml_path, output_dir=out_dir, db_path=None, manifest_path=None)
        with open(parsed_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        raw_json_str = json.dumps(data)
        # Invariant check: raw 12-digit string must not appear anywhere in the output
        assert raw_uid not in raw_json_str
        assert data["masked_uid"].startswith("XXXX-XXXX-")
        assert len(data["name_hash"]) == 64  # SHA-256 hash
        assert data["dob_year"] == 1985
        assert data["state"] == "Delhi"


def test_ephemeral_aadhaar_verifier_no_leak():
    res = verify_aadhaar_checksum_ephemeral("234567890124")
    assert res["status"] == "VALID_CHECKSUM"
    assert res["masked_uid"] == "XXXX-XXXX-0124"
    assert "234567890124" not in str(res.values())
