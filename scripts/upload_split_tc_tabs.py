import csv
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOKEN_PATH = ROOT / ".gsheets-token.json"
SPREADSHEET_ID = "1CLpq6U6uLPu7lBYimDhXISSj1R0qbQxnbEx5tav-vzQ"
SPLIT_DIR = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/split_tabs"
CHUNK_ROWS = 1000

TARGETS = [
    {
        "sheet": "요약",
        "csv": SPLIT_DIR / "summary.csv",
        "start_col": "A",
        "clear_range": "A1:C200",
    },
    {
        "sheet": "Admin",
        "csv": SPLIT_DIR / "admin_core.csv",
        "start_col": "A",
        "clear_range": "A1:R250000",
    },
    {
        "sheet": "회원앱",
        "csv": SPLIT_DIR / "member_app.csv",
        "start_col": "A",
        "clear_range": "A1:R100000",
    },
    {
        "sheet": "Kiosk",
        "csv": SPLIT_DIR / "kiosk.csv",
        "start_col": "A",
        "clear_range": "A1:R30000",
    },
    {
        "sheet": "통합연동",
        "csv": SPLIT_DIR / "integration.csv",
        "start_col": "A",
        "clear_range": "A1:R100000",
    },
]


def request_json(url: str, method: str = "GET", headers=None, data=None):
    req = urllib.request.Request(url, method=method)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, data=body, timeout=180) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


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


def load_csv_rows(path: Path):
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.reader(f))


def get_sheet_map(access_token: str):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}?fields=sheets.properties"
    data = request_json(url, headers={"Authorization": f"Bearer {access_token}"})
    return {sheet["properties"]["title"]: sheet["properties"]["sheetId"] for sheet in data["sheets"]}


def batch_update(access_token: str, requests):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}:batchUpdate"
    return request_json(
        url,
        method="POST",
        headers={"Authorization": f"Bearer {access_token}"},
        data={"requests": requests},
    )


def ensure_sheet(access_token: str, sheet_name: str):
    sheet_map = get_sheet_map(access_token)
    if sheet_name in sheet_map:
        return sheet_map[sheet_name]
    batch_update(access_token, [{"addSheet": {"properties": {"title": sheet_name}}}])
    return get_sheet_map(access_token)[sheet_name]


def clear_values(access_token: str, a1_range: str):
    encoded_range = urllib.parse.quote(a1_range, safe="!'")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{encoded_range}:clear"
    return request_json(url, method="POST", headers={"Authorization": f"Bearer {access_token}"}, data={})


def resize_sheet(access_token: str, sheet_id: int, row_count: int, column_count: int):
    safe_rows = max(row_count + 100, 1000)
    safe_cols = max(column_count + 2, 18)
    batch_update(
        access_token,
        [
            {
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": sheet_id,
                        "gridProperties": {
                            "rowCount": safe_rows,
                            "columnCount": safe_cols,
                        },
                    },
                    "fields": "gridProperties.rowCount,gridProperties.columnCount",
                }
            }
        ],
    )


def upload_rows(access_token: str, sheet_name: str, rows):
    total_chunks = math.ceil(len(rows) / CHUNK_ROWS)
    end_col = col_index_to_a1(len(rows[0]))
    for chunk_index in range(total_chunks):
        start = chunk_index * CHUNK_ROWS
        end = min(start + CHUNK_ROWS, len(rows))
        chunk = rows[start:end]
        start_row = start + 1
        end_row = start + len(chunk)
        a1_range = f"{sheet_name}!A{start_row}:{end_col}{end_row}"
        encoded_range = urllib.parse.quote(a1_range, safe="!'")
        url = (
            f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/"
            f"{encoded_range}?valueInputOption=RAW"
        )
        request_json(
            url,
            method="PUT",
            headers={"Authorization": f"Bearer {access_token}"},
            data={"range": a1_range, "majorDimension": "ROWS", "values": chunk},
        )
        if (chunk_index + 1) % 10 == 0 or chunk_index + 1 == total_chunks:
            print(
                json.dumps(
                    {
                        "sheet": sheet_name,
                        "uploadedChunks": chunk_index + 1,
                        "totalChunks": total_chunks,
                        "lastRow": end_row,
                    },
                    ensure_ascii=False,
                )
            )
            sys.stdout.flush()


def main():
    access_token = refresh_access_token()
    for target in TARGETS:
        rows = load_csv_rows(target["csv"])
        print(json.dumps({"sheet": target["sheet"], "rows": len(rows), "phase": "start"}, ensure_ascii=False))
        sheet_id = ensure_sheet(access_token, target["sheet"])
        resize_sheet(access_token, sheet_id, len(rows), len(rows[0]))
        clear_values(access_token, f"{target['sheet']}!{target['clear_range'].split('!')[-1]}")
        upload_rows(access_token, target["sheet"], rows)
        time.sleep(1)


if __name__ == "__main__":
    main()
