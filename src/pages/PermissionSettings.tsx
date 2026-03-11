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
  AlertCircle
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
  "primary": [], // All true handled in logic
  "owner": [
    { id: "m1", group: "회원", name: "회원 목록", permissions: { access: true, read: true, create: true, update: true, delete: true } },
    { id: "m2", group: "매출", name: "매출 현황", permissions: { access: true, read: true } },
    // ... more permissions
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

export default function PermissionSettings() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("2"); // Default to owner
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  const isPrimary = selectedRole.code === "primary";

  // Initialize permissions for selected role
  useEffect(() => {
    setIsLoading(true);
    // Simulate API fetch
    setTimeout(() => {
      const roleCode = selectedRole.code;
      const basePermissions: MenuPermission[] = [];
      
      MENU_GROUPS.forEach(group => {
        group.menus.forEach((menuName, idx) => {
          const id = `${group.group}-${menuName}`;
          // Default logic: Primary has all, others based on INITIAL_PERMISSIONS or false
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
      setIsDirty(false);
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

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsDirty(false);
      setIsLoading(false);
      alert("권한 설정이 저장되었습니다.");
    }, 800);
  };

  const handleReset = () => {
    setSelectedRoleId(selectedRoleId); // Trigger useEffect
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
    
    setRoles([...roles, newRole]);
    setIsCreateModalOpen(false);
    setSelectedRoleId(newRole.id);
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;
    setRoles(roles.filter(r => r.id !== roleToDelete.id));
    setSelectedRoleId(roles[0].id);
    setRoleToDelete(null);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <AppLayout >
      <div className="flex flex-col gap-md" >
        <PageHeader title="권한 설정" description="직원 역할별 메뉴 접근 및 기능 사용 권한을 관리합니다." actions={
            <div className="flex items-center gap-sm" >
              {isDirty && (
                <div className="mr-md flex items-center gap-xs rounded-full bg-warning/10 px-md py-xs text-Label text-warning" >
                  <AlertCircle size={14} />
                  <span>저장되지 않은 변경 사항이 있습니다.</span>
                </div>
              )}
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-xs rounded-button border border-border-light bg-3 px-md py-sm text-Label text-text-grey-blue hover:bg-input-bg-light transition-colors" >
                <RotateCcw size={16} />
                초기화
              </button>
              <button
                disabled={!isDirty || isPrimary}
                onClick={handleSave}
                className={cn(
                  "flex items-center gap-xs rounded-button px-md py-sm text-Label text-white transition-all",
                  isDirty && !isPrimary ? "bg-0 shadow-1 hover:opacity-90" : "bg-7 cursor-not-allowed"
                )} >
                <Save size={16} />
                변경 사항 저장
              </button>
            </div>
          }/>

        <div className="flex h-[calc(100vh-280px)] gap-lg overflow-hidden" >
          {/* A. 역할 목록 */}
          <div className="flex w-[280px] flex-col gap-md" >
            <div className="flex flex-1 flex-col overflow-hidden rounded-2 bg-3 shadow-1" >
              <div className="flex items-center justify-between border-b border-7 p-md" >
                <h2 className="text-KPI-Large text-4" >역할 목록</h2>
                <button
                  className="rounded-full bg-6 p-xs text-0 hover:bg-0 hover:text-3 transition-all" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus size={20}/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-sm space-y-xs" >
                {roles.map(role => (
                  <button
                    className={cn(
                      "group flex w-full flex-col rounded-2 p-md text-left transition-all",
                      selectedRoleId === role.id 
                        ? "bg-6" 
                        : "hover:bg-9"
                    )} key={role.id} onClick={() => setSelectedRoleId(role.id)}>
                    <div className="flex items-center justify-between" >
                      <span className={cn(
                        "text-Section-Title",
                        selectedRoleId === role.id ? "text-0" : "text-4"
                      )} >
                        {role.name}
                      </span>
                      <span className="text-Body-Primary-KR text-5" >
                        {role.userCount}명
                      </span>
                    </div>
                    <p className="mt-xs line-clamp-1 text-Body-Primary-KR text-5 opacity-70" >
                      {role.description}
                    </p>
                    {!role.isSystem && selectedRoleId === role.id && (
                      <div className="mt-sm flex justify-end gap-sm" >
                        <button
                          className="text-Body-Primary-KR text-4 hover:underline" onClick={(e) => {
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
            <div className="rounded-2 bg-3 p-md shadow-1" >
              <h3 className="mb-sm flex items-center gap-xs text-Body-Primary-KR text-4" >
                <Users className="text-5" size={14}/>
                배정 직원 ({selectedRole.userCount}명)
              </h3>
              <div className="flex flex-wrap gap-xs" >
                {(MOCK_EMPLOYEES[selectedRole.code] || []).map(name => (
                  <button
                    className="rounded-full bg-9 px-sm py-xs text-Body-Primary-KR text-5 hover:bg-0/10 hover:text-0 transition-colors" key={name} onClick={() => moveToPage(974)}>
                    {name}
                  </button>
                ))}
                {(!MOCK_EMPLOYEES[selectedRole.code] || MOCK_EMPLOYEES[selectedRole.code].length === 0) && (
                  <span className="text-Body-Primary-KR text-5 italic" >배정된 직원이 없습니다.</span>
                )}
              </div>
            </div>
          </div>

          {/* B. 권한 매트릭스 */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2 bg-3 shadow-1" >
            {isPrimary && (
              <div className="flex items-center gap-sm bg-9 p-md text-0" >
                <Shield size={20}/>
                <p className="text-Body-Primary-KR font-medium" >최고관리자는 시스템의 모든 권한을 가지며 수정할 수 없습니다.</p>
              </div>
            )}
            
            <div className="flex items-center justify-between border-b border-7 p-md" >
              <div >
                <h2 className="text-KPI-Large text-4" >
                  {selectedRole.name} 권한 설정
                </h2>
                <p className="mt-xs text-Body-Primary-KR text-5" >
                  {selectedRole.description}
                </p>
              </div>
              <div className="flex gap-sm" >
                <button
                  className="rounded-2 border border-7 px-md py-sm text-Body-Primary-KR text-5 hover:bg-9 hover:text-0 transition-colors disabled:opacity-50" disabled={isPrimary} onClick={handleAllAllow}>
                  전체 허용
                </button>
                <button
                  className="rounded-2 border border-7 px-md py-sm text-Body-Primary-KR text-5 hover:bg-6 hover:text-0 transition-colors disabled:opacity-50" disabled={isPrimary} onClick={handleAllDeny}>
                  전체 차단
                </button>
                <button
                  className="flex items-center gap-xs rounded-2 border border-7 px-md py-sm text-Body-Primary-KR text-5 hover:bg-9 transition-colors disabled:opacity-50" disabled={isPrimary}>
                  <Copy size={14}/>
                  역할 복사
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto" >
              <table className="w-full border-collapse text-left" >
                <thead className="sticky top-0 z-10 bg-3" >
                  <tr className="border-b border-7" >
                    <th className="p-md text-Body-Primary-KR text-5" >메뉴 그룹</th>
                    <th className="p-md text-Body-Primary-KR text-5" >메뉴명</th>
                    <th className="p-md text-center text-Body-Primary-KR text-5" >접근</th>
                    <th className="p-md text-center text-Body-Primary-KR text-5" >조회</th>
                    <th className="p-md text-center text-Body-Primary-KR text-5" >등록</th>
                    <th className="p-md text-center text-Body-Primary-KR text-5" >수정</th>
                    <th className="p-md text-center text-Body-Primary-KR text-5" >삭제</th>
                  </tr>
                </thead>
                <tbody >
                  {MENU_GROUPS.map((group, groupIdx) => (
                    <React.Fragment key={group.group}>
                      {group.menus.map((menuName, menuIdx) => {
                        const menuId = `${group.group}-${menuName}`;
                        const permission = permissions.find(p => p.id === menuId);
                        if (!permission) return null;

                        return (
                          <tr className="group border-b border-7/50 hover:bg-9/30" key={menuId}>
                            {menuIdx === 0 && (
                              <td 
                                className="border-r border-7 bg-2 p-md text-Body-Primary-KR font-semibold text-4" rowSpan={group.menus.length}>
                                {group.group}
                              </td>
                            )}
                            <td className="p-md text-Body-Primary-KR text-4" >
                              {menuName}
                            </td>
                            {["access", "read", "create", "update", "delete"].map((type) => {
                              const pType = type as PermissionType;
                              const isAvailable = permission.permissions[pType] !== undefined;
                              const isOn = permission.permissions[pType];

                              return (
                                <td className="p-md text-center" key={type}>
                                  {isAvailable ? (
                                    <button
                                      className={cn(
                                        "mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-all",
                                        isOn 
                                          ? "bg-6 text-0 shadow-0" 
                                          : "bg-9 text-11 hover:bg-8",
                                        isPrimary ? "cursor-default" : "cursor-pointer"
                                      )} disabled={isPrimary} onClick={() => handleToggle(menuId, pType)}>
                                      {isOn ? <Check size={16} strokeWidth={3}/> : <X size={16}/>}
                                    </button>
                                  ) : (
                                    <span className="text-11" >-</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-4/50 backdrop-blur-sm p-md" >
            <div className="w-full max-w-md rounded-2 bg-3 p-xl shadow-2" >
              <h3 className="text-KPI-Large text-4 mb-xl" >새 역할 생성</h3>
              <form className="space-y-md" onSubmit={handleCreateRole}>
                <div >
                  <label className="mb-xs block text-Body-Primary-KR text-5" >역할 이름</label>
                  <input
                    className="w-full rounded-2 border border-7 bg-9 px-md py-sm text-Body-Primary-KR focus:ring-2 focus:ring-0 focus:outline-none" name="name" required={true} placeholder="예: 필라테스 팀장"/>
                </div>
                <div >
                  <label className="mb-xs block text-Body-Primary-KR text-5" >역할 코드</label>
                  <input
                    className="w-full rounded-2 border border-7 bg-9 px-md py-sm text-Body-Primary-KR focus:ring-2 focus:ring-0 focus:outline-none" name="code" required={true} placeholder="예: pilates_lead"/>
                </div>
                <div >
                  <label className="mb-xs block text-Body-Primary-KR text-5" >설명</label>
                  <textarea
                    className="w-full rounded-2 border border-7 bg-9 px-md py-sm text-Body-Primary-KR focus:ring-2 focus:ring-0 focus:outline-none" name="description" rows={3} placeholder="역할에 대한 상세 설명을 입력하세요."/>
                </div>
                <div >
                  <label className="mb-xs block text-Body-Primary-KR text-5" >기준 역할 복사 (선택)</label>
                  <select className="w-full rounded-2 border border-7 bg-9 px-md py-sm text-Body-Primary-KR focus:ring-2 focus:ring-0 focus:outline-none" >
                    <option value="">선택 안함</option>
                    {roles.map(r => <option key={r.id} value={r.code}>{r.name}</option>)}
                  </select>
                </div>

                <div className="mt-xl flex justify-end gap-sm pt-md" >
                  <button
                    className="rounded-2 border border-7 px-md py-sm text-Body-Primary-KR text-5 hover:bg-9 transition-colors" type="button" onClick={() => setIsCreateModalOpen(false)}>
                    취소
                  </button>
                  <button
                    className="rounded-2 bg-0 px-md py-sm text-Body-Primary-KR text-3 hover:opacity-90 transition-all" type="submit">
                    역할 생성
                  </button>
                </div>
              </form>
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
