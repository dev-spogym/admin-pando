# Codex CLI에서 Google Sheets MCP 사용하기

> 목적: 시트 1개를 공유해서 Claude Code 사용자(주인)와 Codex 사용자(협력자)가
> 같은 데이터를 읽고 쓸 수 있게 한다.

## 결론 먼저

- **서비스 계정 방식**으로 통일한다. (OAuth는 사용자마다 토큰을 따로 만들어야 해서 협업에 불편)
- 서비스 계정 JSON 키 파일 1개 + 시트 공유 1번이면 끝.
- JSON 키 파일은 **절대 커밋 금지** (`.gitignore`에 등록).

---

## 1. 사전 준비 (관리자 1회만)

### 1-1. Google Cloud에서 서비스 계정 만들기

1. https://console.cloud.google.com/ 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택
3. **APIs & Services → Library**에서 다음 2개 활성화
   - Google Sheets API
   - Google Drive API
4. **APIs & Services → Credentials → Create Credentials → Service Account**
   - 이름: `pando-sheets-bot` (자유)
   - 역할(Role): 비워둬도 됨 (시트별로 권한 줄 거라)
5. 생성된 서비스 계정 클릭 → **Keys 탭 → Add Key → Create new key → JSON**
6. 다운로드된 JSON 파일을 안전한 위치로 이동
   - 예: `~/.config/gcp/pando-sheets-sa.json`

### 1-2. 서비스 계정 이메일에 시트 공유

1. JSON 파일 열어서 `client_email` 값 복사
   - 예: `pando-sheets-bot@my-project.iam.gserviceaccount.com`
2. Google Sheets에서 공유할 시트 열기
3. **공유 → 위 이메일 추가 → 편집자 권한 부여**

### 1-3. 협력자에게 키 전달

JSON 키 파일은 **비밀**이므로 안전한 채널로 전달한다.
- 권장: 1Password, Bitwarden 공유, 회사 비밀 관리 시스템
- **금지**: Slack/Discord/이메일 평문, Git 커밋

---

## 2. Codex CLI 설정 (협력자 작업)

### 2-1. uv 설치 (uvx 명령용)

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 설치 확인
uvx --version
```

### 2-2. 키 파일 배치

전달받은 JSON 키를 본인 컴퓨터의 안전한 위치에 저장한다.

```bash
mkdir -p ~/.config/gcp
mv ~/Downloads/pando-sheets-sa.json ~/.config/gcp/pando-sheets-sa.json
chmod 600 ~/.config/gcp/pando-sheets-sa.json
```

### 2-3. Codex MCP 설정

`~/.codex/config.toml` 파일을 열고(없으면 생성) 다음 섹션을 추가한다.

```toml
[mcp_servers.gsheets]
command = "uvx"
args = ["mcp-google-sheets@latest"]

[mcp_servers.gsheets.env]
SERVICE_ACCOUNT_PATH = "/Users/<본인계정>/.config/gcp/pando-sheets-sa.json"
DRIVE_FOLDER_ID = ""   # (선택) 특정 폴더만 노출하려면 폴더 ID 입력
```

> `<본인계정>` 부분은 본인 macOS 사용자명으로 바꾸기. `~`는 TOML에서 자동 치환되지 않으므로 **절대 경로로 적어야 한다.**

### 2-4. Codex 재시작 후 확인

```bash
codex
# 새 세션 시작 후
> 사용 가능한 MCP 도구를 보여줘
```

`gsheets` 관련 도구(`get_sheet_data`, `update_cells` 등)가 목록에 나오면 성공.

---

## 3. Claude Code 쪽도 같은 방식으로 통일 (관리자 작업)

기존 `.mcp.json`에서 OAuth 방식 → 서비스 계정 방식으로 교체.

```json
{
  "mcpServers": {
    "gsheets": {
      "command": "/Users/simjaehyeong/.local/bin/uvx",
      "args": ["mcp-google-sheets@latest"],
      "env": {
        "SERVICE_ACCOUNT_PATH": "/Users/simjaehyeong/.config/gcp/pando-sheets-sa.json"
      }
    }
  }
}
```

기존의 `.gsheets-credentials.json`, `.gsheets-token.json` 파일은 더 이상 필요 없으니 삭제 가능.

---

## 4. .gitignore 확인

프로젝트 루트 `.gitignore`에 다음이 있는지 확인:

```
# Google API credentials
.gsheets-credentials.json
.gsheets-token.json
*.sa.json
*-sa.json
```

서비스 계정 키를 프로젝트 디렉토리에 두는 경우에 대비한 패턴이다.
**홈 디렉토리(`~/.config/gcp/`)에 두면 애초에 커밋 위험이 없으므로 그쪽을 권장.**

---

## 5. 사용 예시

양쪽(Claude / Codex) 다 동일하게 자연어로 호출하면 된다.

```
> 시트 ID 1AbC...xYz의 "작업현황" 탭에서 A1:D20 범위 읽어줘
> "작업현황" 탭 B5 셀을 "완료"로 업데이트해줘
> 새 행 추가: ["2026-05-06", "기능명세서 동기화", "심재형", "진행중"]
```

> 시트 ID는 시트 URL의 `/d/` 다음 부분.
> 예: `https://docs.google.com/spreadsheets/d/1AbC...xYz/edit` → `1AbC...xYz`

---

## 6. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `403 The caller does not have permission` | 시트를 서비스 계정 이메일에 **편집자**로 공유했는지 확인 |
| `API has not been used in project ...` | Google Sheets API / Drive API 활성화 누락 |
| `uvx: command not found` | uv 설치 후 셸 재시작 또는 `source ~/.zshrc` |
| `gsheets` 도구가 Codex에 안 보임 | `~/.codex/config.toml` 들여쓰기/섹션명 확인, Codex 완전 재시작 |
| 키 파일 경로 오류 | `~` 대신 **절대 경로** 사용 (`/Users/<name>/...`) |

---

## 7. 권한 회수 (필요 시)

- 특정 협력자만 빼고 싶으면: 시트 공유 설정에서 해당 이메일 제거… 가 아니라
  **서비스 계정은 공유 1개라서 개별 차단이 안 된다.** 빼려면:
  1. 새 서비스 계정 키를 만들어서 남은 사람에게만 전달
  2. 기존 키는 GCP 콘솔에서 **Disable / Delete**
- 즉, 인원 변동이 잦으면 OAuth + 각자 Google 계정 방식이 맞다.
  지금처럼 2명 고정이면 서비스 계정이 운영상 가장 편함.
