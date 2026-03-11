import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Copy,
  Save,
  RotateCcw,
  Check,
  X,
  Users,
  Info,
  Trash2,
  ChevronRight,
  Search,
  AlertCircle,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import AppLayout from "@/components/AppLayout";

// --- Types ---

type PermissionType = "access" | "read" | "create" | "update" | "delete";

interface MenuPermission {
  id: string;
  group: string;
  name: string;
  permissions: {
    [key in PermissionType]?: boolean;
  };
}

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  userCount: number;
}

interface ConflictWarning {
  menuName: string;
  message: string;
}

// --- Mock Data ---

const INITIAL_ROLES: Role[] = [
  { id: "1", code: "primary", name: "최고관리자", description: "모든 권한 (수정 불가)", isSystem: true, userCount: 1 },
  { id: "2", code: "owner", name: "센터장", description: "경영/매출 전체 접근", isSystem: true, userCount: 2 },
  { id: "3", code: "manager", name: "매니저", description: "회원·상품·일정 관리", isSystem: true, userCount: 3 },
  { id: "4", code: "fc", name: "피트니스 코치", description: "담당 회원·수업 접근", isSystem: true, userCount: 8 },
  { id: "5", code: "staff", name: "스태프", description: "출석 체크·기본 조회", isSystem: true, userCount: 2 },
  { id: "6", code: "readonly", name: "조회전용", description: "읽기 전용 전체", isSystem: true, userCount: 1 },
];

const MENU_GROUPS = [
  { group: "회원", menus: ["회원 목록", "회원 상세", "회원 등록/수정"] },
  { group: "수업", menus: ["수업/캘린더"] },
  { group: "매출", menus: ["매출 현황", "POS 결제"] },
  { group: "상품", menus: ["상품 관리"] },
  { group: "직원", menus: ["직원 관리"] },
  { group: "급여", menus: ["급여 관리"] },
  { group: "시설", menus: ["락커 관리", "운동룸 관리", "밴드/카드 관리"] },
  { group: "메시지", menus: ["메시지 발송", "쿠폰 관리", "마일리지 관리"] },
  { group: "설정", menus: ["센터 설정", "키오스크 설정", "IoT 설정", "권한 설정"] },
];

const INITIAL_PERMISSIONS: Record<string, MenuPermission[]> = {
  "primary": [],
  "owner": [
    { id: "m1", group: "회원", name: "회원 목록", permissions: { access: true, read: true, create: true, update: true, delete: true } },
    { id: "m2", group: "매출", name: "매출 현황", permissions: { access: true, read: true } },
  ],
  "staff": [
    { id: "m1", group: "회원", name: "회원 목록", permissions: { access: true, read: true, create: false, update: false, delete: false } },
    { id: "m2", group: "시설", name: "락커 관리", permissions: { access: true, read: true, create: true, update: true, delete: false } },
  ]
};

const MOCK_EMPLOYEES: Record<string, string[]> = {
  "primary": ["김대표"],
  "owner": ["이센터", "박이사"],
  "manager": ["최매니저", "정팀장", "한실장"],
  "fc": ["김코치", "이강사", "박트레이너", "최필라", "정요가", "홍크로스", "임헬스", "강서핑"],
  "staff": ["장알바", "윤대리"],
  "readonly": ["감사관"],
};

// --- 권한 충돌 검증 로직 ---
function validateConflicts(permissions: MenuPermission[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  permissions.forEach(p => {
    const perms = p.permissions;
    // 삭제 권한이 있는데 수정 권한이 없는 경우
    if (perms.delete && !perms.update) {
      warnings.push({ menuName: p.name, message: `"${p.name}": 삭제 권한이 있지만 수정 권한이 없습니다.` });
    }
    // 등록/수정/삭제가 있는데 접근 권한이 없는 경우
    if ((perms.create || perms.update || perms.delete) && !perms.access) {
      warnings.push({ menuName: p.name, message: `"${p.name}": 쓰기 권한이 있지만 접근 권한이 없습니다.` });
    }
    // 조회 없이 등록/수정/삭제가 있는 경우
    if ((perms.create || perms.update || perms.delete) && !perms.read) {
      warnings.push({ menuName: p.name, message: `"${p.name}": 조회 권한 없이 쓰기 권한이 설정되어 있습니다.` });
    }
  });

  return warnings;
}

export default function PermissionSettings() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("2");
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [savedPermissions, setSavedPermissions] = useState<MenuPermission[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 충돌 검증
  const [conflictWarnings, setConflictWarnings] = useState<ConflictWarning[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // 역할 복사 모달 상태
  const [copySourceRoleId, setCopySourceRoleId] = useState<string>("");
  const [copyNewRoleName, setCopyNewRoleName] = useState("");
  const [copyNewRoleCode, setCopyNewRoleCode] = useState("");

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  const isPrimary = selectedRole.code === "primary";

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const roleCode = selectedRole.code;
      const basePermissions: MenuPermission[] = [];

      MENU_GROUPS.forEach(group => {
        group.menus.forEach((menuName) => {
          const id = `${group.group}-${menuName}`;
          const existing = INITIAL_PERMISSIONS[roleCode]?.find(p => p.name === menuName);

          basePermissions.push({
            id,
            group: group.group,
            name: menuName,
            permissions: isPrimary
              ? { access: true, read: true, create: true, update: true, delete: true }
              : existing?.permissions || { access: false, read: false, create: false, update: false, delete: false }
          });
        });
      });

      setPermissions(basePermissions);
      setSavedPermissions(JSON.parse(JSON.stringify(basePermissions)));
      setIsDirty(false);
      setConflictWarnings([]);
      setIsLoading(false);
    }, 300);
  }, [selectedRoleId]);

  const handleToggle = (menuId: string, type: PermissionType) => {
    if (isPrimary) return;

    setPermissions(prev => prev.map(p => {
      if (p.id === menuId) {
        return {
          ...p,
          permissions: {
            ...p.permissions,
            [type]: !p.permissions[type]
          }
        };
      }
      return p;
    }));
    setIsDirty(true);
  };

  const handleAllAllow = () => {
    if (isPrimary) return;
    setPermissions(prev => prev.map(p => ({
      ...p,
      permissions: { access: true, read: true, create: true, update: true, delete: true }
    })));
    setIsDirty(true);
  };

  const handleAllDeny = () => {
    if (isPrimary) return;
    setPermissions(prev => prev.map(p => ({
      ...p,
      permissions: { access: false, read: false, create: false, update: false, delete: false }
    })));
    setIsDirty(true);
  };

  const doSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      setSavedPermissions(JSON.parse(JSON.stringify(permissions)));
      setIsDirty(false);
      setIsLoading(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleSave = () => {
    const warnings = validateConflicts(permissions);
    if (warnings.length > 0) {
      setConflictWarnings(warnings);
      setShowConflictModal(true);
    } else {
      doSave();
    }
  };

  const handleReset = () => {
    setSelectedRoleId(prev => {
      // trigger useEffect by toggling and re-setting
      return prev;
    });
    // Re-initialize by resetting to saved state
    setPermissions(JSON.parse(JSON.stringify(savedPermissions)));
    setIsDirty(false);
    setConflictWarnings([]);
    setIsResetConfirmOpen(false);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const sourceCode = formData.get("sourceRole") as string;

    const newRole: Role = {
      id: String(roles.length + 1),
      code,
      name,
      description: formData.get("description") as string,
      isSystem: false,
      userCount: 0
    };

    setRoles([...roles, newRole]);
    setIsCreateModalOpen(false);
    setSelectedRoleId(newRole.id);
  };

  const handleCopyRole = () => {
    if (!copySourceRoleId || !copyNewRoleName.trim() || !copyNewRoleCode.trim()) return;

    const sourceRole = roles.find(r => r.id === copySourceRoleId);
    if (!sourceRole) return;

    const newRole: Role = {
      id: String(roles.length + 1),
      code: copyNewRoleCode.trim(),
      name: copyNewRoleName.trim(),
      description: `${sourceRole.name} 복사본`,
      isSystem: false,
      userCount: 0
    };

    setRoles([...roles, newRole]);
    setIsCopyModalOpen(false);
    setCopyNewRoleName("");
    setCopyNewRoleCode("");
    setCopySourceRoleId("");
    setSelectedRoleId(newRole.id);
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;
    setRoles(roles.filter(r => r.id !== roleToDelete.id));
    setSelectedRoleId(roles[0].id);
    setRoleToDelete(null);
    setIsDeleteConfirmOpen(false);
  };

  // 변경된 셀 여부 확인 (diff 하이라이트)
  const isChanged = (menuId: string, type: PermissionType): boolean => {
    if (!isDirty) return false;
    const current = permissions.find(p => p.id === menuId);
    const saved = savedPermissions.find(p => p.id === menuId);
    if (!current || !saved) return false;
    return current.permissions[type] !== saved.permissions[type];
  };

  return (
    <AppLayout >
      <div className="flex flex-col gap-md" >
        <PageHeader title="권한 설정" description="직원 역할별 메뉴 접근 및 기능 사용 권한을 관리합니다." actions={
            <div className="flex items-center gap-sm" >
              {saveSuccess && (
                <div className="flex items-center gap-xs rounded-full bg-success/10 px-md py-xs text-Label text-success animate-in fade-in slide-in-from-right-2">
                  <CheckCircle2 size={14} />
                  <span>저장되었습니다.</span>
                </div>
              )}
              {isDirty && !saveSuccess && (
                <div className="mr-md flex items-center gap-xs rounded-full bg-amber-600/10 px-md py-xs text-Label text-amber-600" >
                  <AlertCircle size={14} />
                  <span>저장되지 않은 변경 사항이 있습니다.</span>
                </div>
              )}
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-Label text-content-secondary hover:bg-surface-secondary transition-colors" >
                <RotateCcw size={16} />
                초기화
              </button>
              <button
                disabled={!isDirty || isPrimary}
                onClick={handleSave}
                className={cn(
                  "flex items-center gap-xs rounded-button px-md py-sm text-Label text-white transition-all",
                  isDirty && !isPrimary ? "bg-primary shadow-sm hover:opacity-90" : "bg-surface-secondary cursor-not-allowed"
                )} >
                <Save size={16} />
                변경 사항 저장
              </button>
            </div>
          }/>

        <div className="flex h-[calc(100vh-280px)] gap-lg overflow-hidden" >
          {/* A. 역할 목록 */}
          <div className="flex w-[280px] flex-col gap-md" >
            <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-surface shadow-sm" >
              <div className="flex items-center justify-between border-b border-line p-md" >
                <h2 className="text-xl font-bold text-content" >역할 목록</h2>
                <button
                  className="rounded-full bg-primary-light p-xs text-primary hover:bg-primary hover:text-white transition-all" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus size={20}/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-sm space-y-xs" >
                {roles.map(role => (
                  <button
                    className={cn(
                      "group flex w-full flex-col rounded-lg p-md text-left transition-all",
                      selectedRoleId === role.id
                        ? "bg-primary-light"
                        : "hover:bg-surface-secondary"
                    )} key={role.id} onClick={() => setSelectedRoleId(role.id)}>
                    <div className="flex items-center justify-between" >
                      <span className={cn(
                        "text-sm font-semibold",
                        selectedRoleId === role.id ? "text-primary" : "text-content"
                      )} >
                        {role.name}
                      </span>
                      <span className="text-sm text-content-secondary" >
                        {role.userCount}명
                      </span>
                    </div>
                    <p className="mt-xs line-clamp-1 text-sm text-content-secondary opacity-70" >
                      {role.description}
                    </p>
                    {!role.isSystem && selectedRoleId === role.id && (
                      <div className="mt-sm flex justify-end gap-sm" >
                        <button
                          className="text-sm text-content hover:underline" onClick={(e) => {
                            e.stopPropagation();
                            setRoleToDelete(role);
                            setIsDeleteConfirmOpen(true);
                          }}>
                          삭제
                        </button>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* E. 역할 배정 현황 */}
            <div className="rounded-lg bg-surface p-md shadow-sm" >
              <h3 className="mb-sm flex items-center gap-xs text-sm text-content" >
                <Users className="text-content-secondary" size={14}/>
                배정 직원 ({selectedRole.userCount}명)
              </h3>
              <div className="flex flex-wrap gap-xs" >
                {(MOCK_EMPLOYEES[selectedRole.code] || []).map(name => (
                  <button
                    className="rounded-full bg-surface-secondary px-sm py-xs text-sm text-content-secondary hover:bg-primary/10 hover:text-primary transition-colors" key={name} onClick={() => moveToPage(974)}>
                    {name}
                  </button>
                ))}
                {(!MOCK_EMPLOYEES[selectedRole.code] || MOCK_EMPLOYEES[selectedRole.code].length === 0) && (
                  <span className="text-sm text-content-secondary italic" >배정된 직원이 없습니다.</span>
                )}
              </div>
            </div>
          </div>

          {/* B. 권한 매트릭스 */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-surface shadow-sm" >
            {isPrimary && (
              <div className="flex items-center gap-sm bg-surface-secondary p-md text-primary" >
                <Shield size={20}/>
                <p className="text-sm font-medium" >최고관리자는 시스템의 모든 권한을 가지며 수정할 수 없습니다.</p>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-line p-md" >
              <div >
                <h2 className="text-xl font-bold text-content" >
                  {selectedRole.name} 권한 설정
                </h2>
                <p className="mt-xs text-sm text-content-secondary" >
                  {selectedRole.description}
                </p>
              </div>
              <div className="flex gap-sm" >
                <button
                  className="rounded-lg border border-line px-md py-sm text-sm text-content-secondary hover:bg-surface-secondary hover:text-primary transition-colors disabled:opacity-50" disabled={isPrimary} onClick={handleAllAllow}>
                  전체 허용
                </button>
                <button
                  className="rounded-lg border border-line px-md py-sm text-sm text-content-secondary hover:bg-primary-light hover:text-primary transition-colors disabled:opacity-50" disabled={isPrimary} onClick={handleAllDeny}>
                  전체 차단
                </button>
                <button
                  className="flex items-center gap-xs rounded-lg border border-line px-md py-sm text-sm text-content-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
                  disabled={isPrimary}
                  onClick={() => {
                    setCopySourceRoleId(selectedRoleId);
                    setIsCopyModalOpen(true);
                  }}
                >
                  <Copy size={14}/>
                  역할 복사
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto" >
              <table className="w-full border-collapse text-left" >
                <thead className="sticky top-0 z-10 bg-surface" >
                  <tr className="border-b border-line" >
                    <th className="p-md text-sm text-content-secondary" >메뉴 그룹</th>
                    <th className="p-md text-sm text-content-secondary" >메뉴명</th>
                    <th className="p-md text-center text-sm text-content-secondary" >접근</th>
                    <th className="p-md text-center text-sm text-content-secondary" >조회</th>
                    <th className="p-md text-center text-sm text-content-secondary" >등록</th>
                    <th className="p-md text-center text-sm text-content-secondary" >수정</th>
                    <th className="p-md text-center text-sm text-content-secondary" >삭제</th>
                  </tr>
                </thead>
                <tbody >
                  {MENU_GROUPS.map((group) => (
                    <React.Fragment key={group.group}>
                      {group.menus.map((menuName, menuIdx) => {
                        const menuId = `${group.group}-${menuName}`;
                        const permission = permissions.find(p => p.id === menuId);
                        if (!permission) return null;

                        return (
                          <tr className="group border-b border-line/50 hover:bg-surface-secondary/30" key={menuId}>
                            {menuIdx === 0 && (
                              <td
                                className="border-r border-line bg-surface-secondary p-md text-sm font-semibold text-content" rowSpan={group.menus.length}>
                                {group.group}
                              </td>
                            )}
                            <td className="p-md text-sm text-content" >
                              {menuName}
                            </td>
                            {(["access", "read", "create", "update", "delete"] as PermissionType[]).map((type) => {
                              const isAvailable = permission.permissions[type] !== undefined;
                              const isOn = permission.permissions[type];
                              const changed = isChanged(menuId, type);

                              return (
                                <td
                                  className={cn(
                                    "p-md text-center",
                                    changed && "bg-amber-600/10"
                                  )}
                                  key={type}
                                >
                                  {isAvailable ? (
                                    <button
                                      className={cn(
                                        "mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-all",
                                        isOn
                                          ? "bg-primary-light text-primary shadow-0"
                                          : "bg-surface-secondary text-line hover:bg-line",
                                        isPrimary ? "cursor-default" : "cursor-pointer",
                                        changed && "ring-2 ring-amber-600"
                                      )} disabled={isPrimary} onClick={() => handleToggle(menuId, type)}>
                                      {isOn ? <Check size={16} strokeWidth={3}/> : <X size={16}/>}
                                    </button>
                                  ) : (
                                    <span className="text-line" >-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* D. 커스텀 역할 생성 모달 */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm p-md" >
            <div className="w-full max-w-md rounded-lg bg-surface p-xl shadow-md" >
              <h3 className="text-xl font-bold text-content mb-xl" >새 역할 생성</h3>
              <form className="space-y-md" onSubmit={handleCreateRole}>
                <div >
                  <label className="mb-xs block text-sm text-content-secondary" >역할 이름</label>
                  <input
                    className="w-full rounded-lg border border-line bg-surface-secondary px-md py-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none" name="name" required={true} placeholder="예: 필라테스 팀장"/>
                </div>
                <div >
                  <label className="mb-xs block text-sm text-content-secondary" >역할 코드</label>
                  <input
                    className="w-full rounded-lg border border-line bg-surface-secondary px-md py-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none" name="code" required={true} placeholder="예: pilates_lead"/>
                </div>
                <div >
                  <label className="mb-xs block text-sm text-content-secondary" >설명</label>
                  <textarea
                    className="w-full rounded-lg border border-line bg-surface-secondary px-md py-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none" name="description" rows={3} placeholder="역할에 대한 상세 설명을 입력하세요."/>
                </div>
                <div >
                  <label className="mb-xs block text-sm text-content-secondary" >기준 역할 복사 (선택)</label>
                  <select className="w-full rounded-lg border border-line bg-surface-secondary px-md py-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none" name="sourceRole">
                    <option value="">선택 안함</option>
                    {roles.map(r => <option key={r.id} value={r.code}>{r.name}</option>)}
                  </select>
                </div>

                <div className="mt-xl flex justify-end gap-sm pt-md" >
                  <button
                    className="rounded-lg border border-line px-md py-sm text-sm text-content-secondary hover:bg-surface-secondary transition-colors" type="button" onClick={() => setIsCreateModalOpen(false)}>
                    취소
                  </button>
                  <button
                    className="rounded-lg bg-primary px-md py-sm text-sm text-white hover:opacity-90 transition-all" type="submit">
                    역할 생성
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 역할 복사 모달 */}
        {isCopyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm p-md">
            <div className="w-full max-w-md rounded-lg bg-surface p-xl shadow-md">
              <h3 className="text-xl font-bold text-content mb-xl">역할 복사</h3>
              <div className="space-y-md">
                <div>
                  <label className="mb-xs block text-sm text-content-secondary">복사할 기준 역할</label>
                  <select
                    className="w-full rounded-lg border border-line bg-surface-secondary px-md py-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={copySourceRoleId}
                    onChange={e => setCopySourceRoleId(e.target.value)}
                  >
                    <option value="">선택하세요</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-xs block text-sm text-content-secondary">새 역할 이름 <span className="text-state-error">*</span></label>
                  <input
                    className="w-full rounded-lg border border-line bg-surface-secondary px-md py-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="예: 필라테스 팀장"
                    value={copyNewRoleName}
                    onChange={e => setCopyNewRoleName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-xs block text-sm text-content-secondary">새 역할 코드 <span className="text-state-error">*</span></label>
                  <input
                    className="w-full rounded-lg border border-line bg-surface-secondary px-md py-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    placeholder="예: pilates_lead"
                    value={copyNewRoleCode}
                    onChange={e => setCopyNewRoleCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-xl flex justify-end gap-sm pt-md">
                <button
                  className="rounded-lg border border-line px-md py-sm text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
                  onClick={() => setIsCopyModalOpen(false)}
                >
                  취소
                </button>
                <button
                  className="rounded-lg bg-primary px-md py-sm text-sm text-white hover:opacity-90 transition-all disabled:opacity-50"
                  disabled={!copySourceRoleId || !copyNewRoleName.trim() || !copyNewRoleCode.trim()}
                  onClick={handleCopyRole}
                >
                  역할 복사 생성
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 권한 충돌 경고 모달 */}
        {showConflictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm p-md">
            <div className="w-full max-w-md rounded-lg bg-surface p-xl shadow-md">
              <div className="flex items-center gap-md mb-lg">
                <div className="w-[48px] h-[48px] bg-amber-600/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="text-amber-600" size={24}/>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-content">권한 충돌 경고</h3>
                  <p className="text-sm text-content-secondary mt-xs">다음 권한 조합에 충돌이 감지되었습니다.</p>
                </div>
              </div>
              <div className="space-y-sm mb-xl max-h-[200px] overflow-y-auto">
                {conflictWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-xs p-sm rounded-lg bg-amber-600/5 border border-amber-600/20">
                    <AlertCircle className="text-amber-600 mt-xs flex-shrink-0" size={14}/>
                    <p className="text-sm text-content">{w.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-sm">
                <button
                  className="rounded-lg border border-line px-md py-sm text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
                  onClick={() => setShowConflictModal(false)}
                >
                  수정하기
                </button>
                <button
                  className="rounded-lg bg-amber-600 px-md py-sm text-sm text-white hover:opacity-90 transition-all"
                  onClick={() => {
                    setShowConflictModal(false);
                    doSave();
                  }}
                >
                  경고 무시하고 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Dialogs */}
        <ConfirmDialog open={isResetConfirmOpen} title="권한 설정 초기화" description={`정말로 ${selectedRole.name}의 권한을 초기화하시겠습니까?\n저장하지 않은 변경 사항은 모두 유실됩니다.`} confirmLabel="초기화 실행" onConfirm={handleReset} onCancel={() => setIsResetConfirmOpen(false)} variant="danger"/>

        <ConfirmDialog open={isDeleteConfirmOpen} title="역할 삭제" description={`'${roleToDelete?.name}' 역할을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`} confirmLabel="삭제" onConfirm={handleDeleteRole} onCancel={() => setIsDeleteConfirmOpen(false)} variant="danger" confirmationText={roleToDelete?.name}/>
      </div>
    </AppLayout>
  );
}
