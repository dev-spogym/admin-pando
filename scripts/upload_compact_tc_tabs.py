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
COMPACT_DIR = ROOT / "docs/admin/testcases/admin-docs-tc/_generated/compact_tabs"
CHUNK_ROWS = 2000

TARGETS = [
    {"sheet": "시트1", "csv": COMPACT_DIR / "시트1.csv", "clear_range": "A1:F250000"},
    {"sheet": "Admin", "csv": COMPACT_DIR / "Admin.csv", "clear_range": "A1:F200000"},
    {"sheet": "회원앱", "csv": COMPACT_DIR / "회원앱.csv", "clear_range": "A1:F80000"},
    {"sheet": "Kiosk", "csv": COMPACT_DIR / "Kiosk.csv", "clear_range": "A1:F20000"},
    {"sheet": "통합연동", "csv": COMPACT_DIR / "통합연동.csv", "clear_range": "A1:F60000"},
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


def load_rows(path: Path):
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


def clear_values(access_token: str, a1_range: str):
    encoded = urllib.parse.quote(a1_range, safe="!'")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{encoded}:clear"
    return request_json(url, method="POST", headers={"Authorization": f"Bearer {access_token}"}, data={})


def resize_sheet(access_token: str, sheet_id: int, rows: int):
    batch_update(
        access_token,
        [
            {
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": sheet_id,
                        "gridProperties": {"rowCount": max(rows + 100, 1000), "columnCount": 6},
                    },
                    "fields": "gridProperties.rowCount,gridProperties.columnCount",
                }
            }
        ],
    )


def upload_rows(access_token: str, sheet_name: str, rows):
    total_chunks = math.ceil(len(rows) / CHUNK_ROWS)
    for chunk_index in range(total_chunks):
        start = chunk_index * CHUNK_ROWS
        end = min(start + CHUNK_ROWS, len(rows))
        chunk = rows[start:end]
        start_row = start + 1
        end_row = start + len(chunk)
        a1_range = f"{sheet_name}!A{start_row}:F{end_row}"
        encoded = urllib.parse.quote(a1_range, safe="!'")
        url = (
            f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/"
            f"{encoded}?valueInputOption=RAW"
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


def format_sheets(access_token: str, sheet_ids):
    requests = []
    for sheet_id in sheet_ids:
        requests.extend(
            [
                {"clearBasicFilter": {"sheetId": sheet_id}},
                {
                    "updateSheetProperties": {
                        "properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}},
                        "fields": "gridProperties.frozenRowCount",
                    }
                },
                {
                    "repeatCell": {
                        "range": {
                            "sheetId": sheet_id,
                            "startRowIndex": 0,
                            "endRowIndex": 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": 6,
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": {"red": 0.12, "green": 0.16, "blue": 0.22},
                                "textFormat": {
                                    "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                                    "bold": True,
                                },
                                "horizontalAlignment": "CENTER",
                                "wrapStrategy": "WRAP",
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)",
                    }
                },
                {
                    "setBasicFilter": {
                        "filter": {
                            "range": {
                                "sheetId": sheet_id,
                                "startRowIndex": 0,
                                "startColumnIndex": 0,
                                "endColumnIndex": 6,
                            }
                        }
                    }
                },
            ]
        )
        for start, end, size in [(0, 1, 190), (1, 2, 160), (2, 3, 260), (3, 6, 520)]:
            requests.append(
                {
                    "updateDimensionProperties": {
                        "range": {
                            "sheetId": sheet_id,
                            "dimension": "COLUMNS",
                            "startIndex": start,
                            "endIndex": end,
                        },
                        "properties": {"pixelSize": size},
                        "fields": "pixelSize",
                    }
                }
            )
    batch_update(access_token, requests)


def main():
    access_token = refresh_access_token()
    sheet_map = get_sheet_map(access_token)
    formatted_sheet_ids = []
    for target in TARGETS:
        rows = load_rows(target["csv"])
        sheet_id = sheet_map[target["sheet"]]
        print(json.dumps({"sheet": target["sheet"], "rows": len(rows), "phase": "start"}, ensure_ascii=False))
        resize_sheet(access_token, sheet_id, len(rows))
        clear_values(access_token, f"{target['sheet']}!{target['clear_range']}")
        upload_rows(access_token, target["sheet"], rows)
        formatted_sheet_ids.append(sheet_id)
        time.sleep(1)
    format_sheets(access_token, formatted_sheet_ids)
    print(json.dumps({"formattedSheets": [t["sheet"] for t in TARGETS]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
