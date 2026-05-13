import csv
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPREADSHEET_ID = "1CLpq6U6uLPu7lBYimDhXISSj1R0qbQxnbEx5tav-vzQ"
SHEET_NAME = "시트1"
TOKEN_PATH = ROOT / ".gsheets-token.json"
MANIFEST_PATH = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/full_massive_tc_chunks.json"
CHUNK_DIR = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/full_massive_tc_chunks"
TARGET_CLEAR_RANGE = f"{SHEET_NAME}!A1:O210000"


def request_json(url: str, method: str = "GET", headers=None, data=None):
    req = urllib.request.Request(url, method=method)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, data=body, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def refresh_access_token():
    token_data = json.loads(TOKEN_PATH.read_text())
    payload = urllib.parse.urlencode(
        {
            "client_id": token_data["client_id"],
            "client_secret": token_data["client_secret"],
            "refresh_token": token_data["refresh_token"],
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        token_data["token_uri"],
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        refreshed = json.loads(resp.read().decode("utf-8"))
    return refreshed["access_token"]


def col_index_to_a1(index: int) -> str:
    result = ""
    while index > 0:
        index, rem = divmod(index - 1, 26)
        result = chr(65 + rem) + result
    return result


def clear_range(access_token: str):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values:batchClear"
    return request_json(
        url,
        method="POST",
        headers={"Authorization": f"Bearer {access_token}"},
        data={"ranges": [TARGET_CLEAR_RANGE]},
    )


def upload_chunk(access_token: str, chunk_meta: dict):
    chunk_path = CHUNK_DIR / chunk_meta["filename"]
    with chunk_path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))

    start_cell = chunk_meta["startCellA1"]
    start_col = "".join(ch for ch in start_cell if ch.isalpha())
    start_row = int("".join(ch for ch in start_cell if ch.isdigit()))
    end_row = start_row + len(rows) - 1
    end_col = col_index_to_a1(len(rows[0]))
    range_a1 = f"{SHEET_NAME}!{start_col}{start_row}:{end_col}{end_row}"
    encoded_range = urllib.parse.quote(range_a1, safe="!'")
    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/"
        f"{encoded_range}?valueInputOption=RAW"
    )
    payload = {"range": range_a1, "majorDimension": "ROWS", "values": rows}
    return request_json(
        url,
        method="PUT",
        headers={"Authorization": f"Bearer {access_token}"},
        data=payload,
    )


def main():
    manifest = json.loads(MANIFEST_PATH.read_text())
    chunks = manifest["chunks"]
    access_token = refresh_access_token()
    clear_range(access_token)

    started = time.time()
    for index, chunk in enumerate(chunks, start=1):
        for attempt in range(3):
            try:
                upload_chunk(access_token, chunk)
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2)
                access_token = refresh_access_token()
        if index % 10 == 0 or index == len(chunks):
            elapsed = time.time() - started
            print(
                json.dumps(
                    {
                        "uploadedChunks": index,
                        "totalChunks": len(chunks),
                        "lastPart": chunk["part"],
                        "lastStartCell": chunk["startCellA1"],
                        "elapsedSec": round(elapsed, 1),
                    },
                    ensure_ascii=False,
                )
            )
            sys.stdout.flush()


if __name__ == "__main__":
    main()
