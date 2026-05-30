'use client';
export const dynamic = 'force-dynamic';

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
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AppLayout from "@/components/layout/AppLayout";
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { supabase } from "@/lib/supabase";
import { loadBranchSetting, saveBranchSetting } from "@/lib/branchSettings";

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

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

// --- 역할 목록 (시스템 역할 초기값) ---

// RBAC 표준 역할 8종 (docs4 SCR-081 기준): superAdmin, primary, owner, manager, fc, trainer, staff, readonly
const INITIAL_ROLES: Role[] = [
  { id: "1", code: "superAdmin", name: "슈퍼관리자", description: "본사 전체 권한 (수정 불가)", isSystem: true, userCount: 0 },
  { id: "2", code: "primary", name: "최고관리자", description: "모든 권한 (수정 불가)", isSystem: true, userCount: 0 },
  { id: "3", code: "owner", name: "Owner(지점장)", description: "경영/매출 전체 접근", isSystem: true, userCount: 0 },
  { id: "4", code: "manager", name: "매니저", description: "회원·상품·일정 관리", isSystem: true, userCount: 0 },
  { id: "5", code: "fc", name: "FC", description: "담당 회원·수업 접근", isSystem: true, userCount: 0 },
  { id: "6", code: "trainer", name: "트레이너", description: "담당 회원·수업 접근 (PT/GX/골프 직무)", isSystem: true, userCount: 0 },
  { id: "7", code: "staff", name: "스태프", description: "출석 체크·기본 조회", isSystem: true, userCount: 0 },
  { id: "8", code: "readonly", name: "조회전용", description: "읽기 전용 전체", isSystem: true, userCount: 0 },
];

// 민감 기능 6종 (docs4 SCR-081): superAdmin/primary 외 역할은 체크 불가·저장 차단
const SENSITIVE_FUNCTIONS = [
  { id: "member-permanent-delete", label: "회원 영구 삭제" },
  { id: "refund-process", label: "환불 처리" },
  { id: "payroll-confirm", label: "급여 확정·지급" },
  { id: "superadmin-grant", label: "슈퍼관리자 권한 부여/회수" },
  { id: "data-restore", label: "데이터 복원" },
  { id: "audit-log-export", label: "감사로그 내보내기" },
] as const;

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

// --- 권한 충돌 검증 로직 ---
function validateConflicts(permissions: MenuPermission[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  permissions.forEach(p => {
    const perms = p.permissions;
    if (perms.delete && !perms.update) {
      warnings.push({ menuName: p.name, message: `"${p.name}": 삭제 권한이 있지만 수정 권한이 없습니다.` });
    }
    if ((perms.create || perms.update || perms.delete) && !perms.access) {
      warnings.push({ menuName: p.name, message: `"${p.name}": 쓰기 권한이 있지만 접근 권한이 없습니다.` });
    }
    if ((perms.create || perms.update || perms.delete) && !perms.read) {
      warnings.push({ menuName: p.name, message: `"${p.name}": 조회 권한 없이 쓰기 권한이 설정되어 있습니다.` });
    }
  });

  return warnings;
}

export default function PermissionSettings() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("1");
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  // 민감 기능 6종 체크 상태 (역할별, 목업: 로컬 상태)
  const [sensitiveChecked, setSensitiveChecked] = useState<Record<string, boolean>>({});
  const [showSensitiveBlock, setShowSensitiveBlock] = useState(false);
  const [savedPermissions, setSavedPermissions] = useState<MenuPermission[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 역할별 직원 목록 (Supabase에서 조회)
  const [employeesByRole, setEmployeesByRole] = useState<Record<string, string[]>>({});

  const [conflictWarnings, setConflictWarnings] = useState<ConflictWarning[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSourceRole, setCreateSourceRole] = useState('');
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const [copySourceRoleId, setCopySourceRoleId] = useState<string>("");
  const [copyNewRoleName, setCopyNewRoleName] = useState("");
  const [copyNewRoleCode, setCopyNewRoleCode] = useState("");

  useEffect(() => {
    let mounted = true;
    loadBranchSetting<Role[]>('permission_roles', INITIAL_ROLES).then((savedRoles) => {
      if (!mounted) return;
      setRoles(savedRoles);
    });
    return () => { mounted = false; };
  }, []);

  const persistRoles = async (nextRoles: Role[]) => {
    const error = await saveBranchSetting('permission_roles', nextRoles);
    if (error) console.error('역할 목록 저장 실패:', error);
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  // superAdmin·primary는 매트릭스 잠금(읽기 전용)
  const isPrimary = selectedRole.code === "primary" || selectedRole.code === "superAdmin";
  // 민감 기능을 부여할 수 있는 역할 (superAdmin/primary만 허용)
  const canHoldSensitive = selectedRole.code === "superAdmin" || selectedRole.code === "primary";

  // 직원 목록을 role별로 조회
  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase
        .from("users")
        .select("name, role")
        .eq("branchId", getBranchId());
      if (error) {
        console.error("직원 권한 목록 로드 실패:", error);
        return;
      }
      if (data) {
        const grouped: Record<string, string[]> = {};
        data.forEach((u: any) => {
          const role = u.role ?? "staff";
          if (!grouped[role]) grouped[role] = [];
          grouped[role].push(u.name);
        });
        setEmployeesByRole(grouped);
      }
    }
    fetchEmployees();
  }, []);

  useEffect(() => {
    setRoles(prev => prev.map(role => ({
      ...role,
      userCount: employeesByRole[role.code]?.length ?? 0,
    })));
  }, [employeesByRole]);

  useEffect(() => {
    let mounted = true;
    const loadPermissions = async () => {
      setIsLoading(true);
      const roleCode = selectedRole.code;
      const savedPerms = await loadBranchSetting<Record<string, MenuPermission['permissions']>>(`permissions_${roleCode}`, {});

      const basePermissions: MenuPermission[] = [];
      MENU_GROUPS.forEach(group => {
        group.menus.forEach((menuName) => {
          const id = `${group.group}-${menuName}`;
          const fromStorage = savedPerms[id];
          const existing = INITIAL_PERMISSIONS[roleCode]?.find(p => p.name === menuName);

          basePermissions.push({
            id,
            group: group.group,
            name: menuName,
            permissions: isPrimary
              ? { access: true, read: true, create: true, update: true, delete: true }
              : fromStorage || existing?.permissions || { access: false, read: false, create: false, update: false, delete: false }
          });
        });
      });

      const defaults: Record<string, boolean> = {};
      if (roleCode === "superAdmin" || roleCode === "primary") {
        SENSITIVE_FUNCTIONS.forEach(f => { defaults[f.id] = true; });
      }
      const savedSensitive = await loadBranchSetting<Record<string, boolean>>(`sensitive_${roleCode}`, defaults);

      if (!mounted) return;
      setPermissions(basePermissions);
      setSavedPermissions(JSON.parse(JSON.stringify(basePermissions)));
      setIsDirty(false);
      setConflictWarnings([]);
      setShowSensitiveBlock(false);
      setSensitiveChecked(savedSensitive);
      setIsLoading(false);
    };

    loadPermissions();
    return () => { mounted = false; };
  }, [selectedRoleId, selectedRole.code, isPrimary]);

  // 민감 기능 토글 (목업)
  const handleSensitiveToggle = (id: string) => {
    if (isPrimary) return; // superAdmin/primary 매트릭스 잠금
    setSensitiveChecked(prev => ({ ...prev, [id]: !prev[id] }));
    setShowSensitiveBlock(false);
    setIsDirty(true);
  };

  // 비허용 역할이 민감 기능을 체크했는지 (저장 차단 대상)
  const hasBlockedSensitive = !canHoldSensitive &&
    SENSITIVE_FUNCTIONS.some(f => sensitiveChecked[f.id]);

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

  const doSave = async () => {
    const permMap: Record<string, MenuPermission['permissions']> = {};
    permissions.forEach(p => { permMap[p.id] = p.permissions; });
    const permError = await saveBranchSetting(`permissions_${selectedRole.code}`, permMap);
    const sensitiveError = await saveBranchSetting(`sensitive_${selectedRole.code}`, sensitiveChecked);
    if (permError || sensitiveError) {
      console.error("권한 저장 실패:", permError ?? sensitiveError);
      return;
    }

    setSavedPermissions(JSON.parse(JSON.stringify(permissions)));
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSave = () => {
    // 민감 기능 6종은 superAdmin/primary 외 역할이 보유한 상태로 저장 차단
    if (hasBlockedSensitive) {
      setShowSensitiveBlock(true);
      return;
    }
    const warnings = validateConflicts(permissions);
    if (warnings.length > 0) {
      setConflictWarnings(warnings);
      setShowConflictModal(true);
    } else {
      void doSave();
    }
  };

  const handleReset = () => {
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

    const newRole: Role = {
      id: String(roles.length + 1),
      code,
      name,
      description: formData.get("description") as string,
      isSystem: false,
      userCount: 0
    };

    const nextRoles = [...roles, newRole];
    setRoles(nextRoles);
    persistRoles(nextRoles);
    setIsCreateModalOpen(false);
    setCreateSourceRole('');
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

    const nextRoles = [...roles, newRole];
    setRoles(nextRoles);
    persistRoles(nextRoles);
    setIsCopyModalOpen(false);
    setCopyNewRoleName("");
    setCopyNewRoleCode("");
    setCopySourceRoleId("");
    setSelectedRoleId(newRole.id);
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;
    const nextRoles = roles.filter(r => r.id !== roleToDelete.id);
    setRoles(nextRoles);
    persistRoles(nextRoles);
    setSelectedRoleId(roles[0].id);
    setRoleToDelete(null);
    setIsDeleteConfirmOpen(false);
  };

  const isChanged = (menuId: string, type: PermissionType): boolean => {
    if (!isDirty) return false;
    const current = permissions.find(p => p.id === menuId);
    const saved = savedPermissions.find(p => p.id === menuId);
    if (!current || !saved) return false;
    return current.permissions[type] !== saved.permissions[type];
  };

  const permissionImpactSummary = (() => {
    const addedAccess: string[] = [];
    const removedAccess: string[] = [];
    const writeExpanded: string[] = [];

    permissions.forEach((current) => {
      const saved = savedPermissions.find((item) => item.id === current.id);
      if (!saved) return;

      if ((current.permissions.access ?? false) && !(saved.permissions.access ?? false)) {
        addedAccess.push(current.name);
      }
      if (!(current.permissions.access ?? false) && (saved.permissions.access ?? false)) {
        removedAccess.push(current.name);
      }
      const currentWrite = Boolean(current.permissions.create || current.permissions.update || current.permissions.delete);
      const savedWrite = Boolean(saved.permissions.create || saved.permissions.update || saved.permissions.delete);
      if (currentWrite && !savedWrite) {
        writeExpanded.push(current.name);
      }
    });

    return {
      changedMenus: permissions.filter((current) => {
        const saved = savedPermissions.find((item) => item.id === current.id);
        return saved ? JSON.stringify(current.permissions) !== JSON.stringify(saved.permissions) : false;
      }).length,
      addedAccess,
      removedAccess,
      writeExpanded,
      affectedUsers: employeesByRole[selectedRole.code]?.length ?? 0,
    };
  })();

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
                disabled={!isDirty || isPrimary || hasBlockedSensitive}
                onClick={handleSave}
                className={cn(
                  "flex items-center gap-xs rounded-button px-md py-sm text-Label text-white transition-all",
                  isDirty && !isPrimary && !hasBlockedSensitive ? "bg-primary shadow-sm hover:opacity-90" : "bg-surface-secondary cursor-not-allowed"
                )} >
                <Save size={16} />
                변경 사항 저장
              </button>
            </div>
          }/>

        <div className="rounded-2xl border border-line bg-surface p-lg shadow-sm">
          <div className="flex items-start justify-between gap-md">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">Impact Preview</p>
              <h2 className="mt-xs text-[18px] font-bold text-content">권한 변경 영향도</h2>
              <p className="mt-xs text-[13px] leading-relaxed text-content-secondary">
                저장 전에 어떤 메뉴 접근이 열리거나 막히고, 몇 명의 직원이 영향을 받는지 확인합니다.
              </p>
            </div>
            <div className={cn(
              "rounded-full px-sm py-xs text-[11px] font-semibold",
              isDirty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            )}>
              {isDirty ? '저장 전 검토 필요' : '저장본과 동일'}
            </div>
          </div>

          <div className="mt-md grid gap-md md:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface-secondary/60 p-md">
              <p className="text-[11px] text-content-tertiary">변경된 메뉴</p>
              <p className="mt-xs text-[22px] font-bold text-content">{permissionImpactSummary.changedMenus}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-secondary/60 p-md">
              <p className="text-[11px] text-content-tertiary">열리는 메뉴</p>
              <p className="mt-xs text-[22px] font-bold text-emerald-700">{permissionImpactSummary.addedAccess.length}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-secondary/60 p-md">
              <p className="text-[11px] text-content-tertiary">막히는 메뉴</p>
              <p className="mt-xs text-[22px] font-bold text-state-error">{permissionImpactSummary.removedAccess.length}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-secondary/60 p-md">
              <p className="text-[11px] text-content-tertiary">영향 직원</p>
              <p className="mt-xs text-[22px] font-bold text-content">{permissionImpactSummary.affectedUsers}명</p>
            </div>
          </div>

          <div className="mt-md grid gap-md lg:grid-cols-3">
            <div className="rounded-xl border border-line bg-white/80 p-md">
              <div className="flex items-center gap-xs">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <p className="text-[13px] font-semibold text-content">새로 접근 가능</p>
              </div>
              <p className="mt-xs text-[12px] leading-relaxed text-content-secondary">
                {permissionImpactSummary.addedAccess.length > 0
                  ? permissionImpactSummary.addedAccess.slice(0, 3).join(', ')
                  : '새로 열리는 메뉴가 없습니다.'}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white/80 p-md">
              <div className="flex items-center gap-xs">
                <AlertTriangle size={15} className="text-amber-600" />
                <p className="text-[13px] font-semibold text-content">쓰기 권한 확대</p>
              </div>
              <p className="mt-xs text-[12px] leading-relaxed text-content-secondary">
                {permissionImpactSummary.writeExpanded.length > 0
                  ? permissionImpactSummary.writeExpanded.slice(0, 3).join(', ')
                  : '새로 쓰기 권한이 열린 메뉴가 없습니다.'}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-white/80 p-md">
              <div className="flex items-center gap-xs">
                <AlertCircle size={15} className="text-state-error" />
                <p className="text-[13px] font-semibold text-content">접근 차단 예정</p>
              </div>
              <p className="mt-xs text-[12px] leading-relaxed text-content-secondary">
                {permissionImpactSummary.removedAccess.length > 0
                  ? permissionImpactSummary.removedAccess.slice(0, 3).join(', ')
                  : '막히는 메뉴가 없습니다.'}
              </p>
            </div>
          </div>
        </div>

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
                배정 직원 ({employeesByRole[selectedRole.code]?.length ?? 0}명)
              </h3>
              <div className="flex flex-wrap gap-xs" >
                {(employeesByRole[selectedRole.code] || []).map(name => (
                  <button
                    className="rounded-full bg-surface-secondary px-sm py-xs text-sm text-content-secondary hover:bg-primary/10 hover:text-primary transition-colors" key={name} onClick={() => moveToPage(974)}>
                    {name}
                  </button>
                ))}
                {(!employeesByRole[selectedRole.code] || employeesByRole[selectedRole.code].length === 0) && (
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
                <p className="text-sm font-medium" >{selectedRole.name}은(는) 시스템의 모든 권한을 가지며 수정할 수 없습니다.</p>
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
                                    <div className="relative group/perm inline-flex mx-auto">
                                      <button
                                        className={cn(
                                          "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                                          isOn
                                            ? "bg-primary-light text-primary shadow-0"
                                            : "bg-surface-secondary text-line hover:bg-line",
                                          isPrimary ? "cursor-default" : "cursor-pointer",
                                          changed && "ring-2 ring-amber-600"
                                        )} disabled={isPrimary} onClick={() => handleToggle(menuId, type)}>
                                        {isOn ? <Check size={16} strokeWidth={3}/> : <X size={16}/>}
                                      </button>
                                      {isPrimary && (
                                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-xs hidden group-hover/perm:block z-50">
                                          <div className="whitespace-nowrap rounded-lg bg-content px-sm py-xs text-[11px] text-surface shadow-md">
                                            최고 관리자 권한은 변경할 수 없습니다
                                          </div>
                                          <div className="mx-auto mt-[2px] h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-content" />
                                        </div>
                                      )}
                                    </div>
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

            {/* 민감 기능 6종 (docs4 SCR-081) */}
            <div className="border-t border-line p-md">
              <div className="flex items-center gap-xs mb-sm">
                <Shield size={16} className="text-state-error" />
                <h3 className="text-sm font-bold text-content">민감 기능</h3>
                <span className="text-[11px] text-content-secondary">슈퍼관리자·최고관리자만 보유 가능</span>
              </div>
              <p className="mb-sm text-[12px] leading-relaxed text-content-secondary">
                아래 6종은 민감 기능으로, <span className="font-semibold text-state-error">superAdmin / primary</span> 외 역할에서는 부여할 수 없으며 체크된 상태로 저장이 차단됩니다.
              </p>
              <div className="grid gap-sm md:grid-cols-2">
                {SENSITIVE_FUNCTIONS.map(fn => {
                  const checked = Boolean(sensitiveChecked[fn.id]);
                  const blocked = checked && !canHoldSensitive;
                  return (
                    <button
                      key={fn.id}
                      type="button"
                      disabled={isPrimary}
                      onClick={() => handleSensitiveToggle(fn.id)}
                      className={cn(
                        "flex items-center gap-sm rounded-lg border p-sm text-left transition-all",
                        blocked
                          ? "border-state-error bg-state-error/5"
                          : checked
                            ? "border-primary bg-primary-light"
                            : "border-line bg-surface hover:bg-surface-secondary",
                        isPrimary ? "cursor-default opacity-90" : "cursor-pointer"
                      )}
                    >
                      <span className={cn(
                        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-all",
                        checked ? (blocked ? "bg-state-error text-white" : "bg-primary text-white") : "bg-surface-secondary text-line"
                      )}>
                        {checked ? <Check size={14} strokeWidth={3} /> : <X size={14} />}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm text-content">{fn.label}</span>
                        {blocked && (
                          <span className="text-[11px] text-state-error">권한 부족 — 저장 차단됨</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasBlockedSensitive && (
                <div className="mt-sm flex items-start gap-xs rounded-lg border border-state-error/30 bg-state-error/5 p-sm">
                  <AlertCircle className="text-state-error mt-xs flex-shrink-0" size={14} />
                  <p className="text-[12px] text-state-error">
                    민감 기능은 superAdmin / primary 권한에서만 부여할 수 있습니다. 체크를 해제하거나 superAdmin/primary 권한 부여를 요청하세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 민감 기능 저장 차단 알림 모달 */}
        {showSensitiveBlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm p-md">
            <div className="w-full max-w-md rounded-lg bg-surface p-xl shadow-md">
              <div className="flex items-center gap-md mb-lg">
                <div className="w-[48px] h-[48px] bg-state-error/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="text-state-error" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-content">민감 기능 저장 차단</h3>
                  <p className="text-sm text-content-secondary mt-xs">superAdmin / primary 외 역할은 민감 기능을 보유할 수 없습니다.</p>
                </div>
              </div>
              <div className="space-y-sm mb-xl max-h-[200px] overflow-y-auto">
                {SENSITIVE_FUNCTIONS.filter(f => sensitiveChecked[f.id]).map(f => (
                  <div key={f.id} className="flex items-start gap-xs p-sm rounded-lg bg-state-error/5 border border-state-error/20">
                    <AlertCircle className="text-state-error mt-xs flex-shrink-0" size={14} />
                    <p className="text-sm text-content">{f.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-sm">
                <button
                  className="rounded-lg bg-primary px-md py-sm text-sm text-white hover:opacity-90 transition-all"
                  onClick={() => setShowSensitiveBlock(false)}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <Textarea name="description" rows={3} placeholder="역할에 대한 상세 설명을 입력하세요."/>
                </div>
                <div >
                  <label className="mb-xs block text-sm text-content-secondary" >기준 역할 복사 (선택)</label>
                  <Select
                    options={[{ value: '', label: '선택 안함' }, ...roles.map(r => ({ value: r.code, label: r.name }))]}
                    value={createSourceRole}
                    onChange={setCreateSourceRole}
                  />
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
                  <Select
                    options={roles.map(r => ({ value: r.id, label: r.name }))}
                    value={copySourceRoleId}
                    onChange={v => setCopySourceRoleId(v)}
                    placeholder="선택하세요"
                  />
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
                    void doSave();
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
