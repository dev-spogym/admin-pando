// ============================================================
// FitGenie CRM 2.0 - Virtual Server 사용 가이드 (예제 코드)
// ============================================================
// 이 파일은 실행용이 아닌 참고용 예제 파일입니다.

import React from 'react';
import {
  memberApi,
  salesApi,
  productApi,
  staffApi,
  attendanceApi,
  lockerApi,
  dashboardApi,
  systemApi,
  useQuery,
  useMutation,
  useInfiniteQuery,
  configureClient,
} from '@/server';
import type { Member, Sale, Product } from '@/server';

// ============================================================
// 예제 1: 회원 목록 조회 (useQuery)
// ============================================================
function MemberListExample() {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');

  // useQuery: 데이터 조회
  const { data: members, isLoading, isError, error, refetch } = useQuery(
    () => memberApi.getAll({ search, status: statusFilter }),
    [search, statusFilter] // deps가 변경되면 자동 재조회
  );

  if (isLoading) return <div>로딩 중...</div>;
  if (isError) return <div>에러: {error}</div>;

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="회원 검색..."
      />
      <button onClick={() => refetch()}>새로고침</button>

      <ul>
        {members?.map((m) => (
          <li key={m.id}>{m.name} - {m.statusLabel} - {m.phone}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 예제 2: 회원 등록 (useMutation)
// ============================================================
function MemberCreateExample() {
  const { mutate, isLoading, isSuccess, isError, error } = useMutation(
    (newMember: Omit<Member, 'id'>) => memberApi.create(newMember),
    {
      onSuccess: (data) => {
        alert(`회원 등록 완료! ID: ${data.id}`);
        // 목록 새로고침 등 후속 작업
      },
      onError: (err) => {
        alert(`등록 실패: ${err}`);
      },
    }
  );

  const handleSubmit = () => {
    mutate({
      name: '홍길동',
      gender: '남',
      birthDate: '1990-01-01',
      age: 34,
      phone: '010-0000-0000',
      status: 'active',
      statusLabel: '활성',
      tickets: [{ name: '헬스 1개월', status: '대기', expiry: '2026-04-10' }],
      rental: '-',
      subscription: '-',
      lockerNo: '-',
      finalExpiryDate: '2026-04-10',
      remainingDays: 30,
      lastVisit: '-',
      lastContract: '2026-03-10',
      firstRegDate: '2026-03-10',
      manager: '김철수',
      attendanceNo: '9999',
      company: '-',
    });
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? '등록 중...' : '회원 등록'}
      </button>
      {isSuccess && <p>등록 성공!</p>}
      {isError && <p>에러: {error}</p>}
    </div>
  );
}

// ============================================================
// 예제 3: 회원 수정 (useMutation)
// ============================================================
function MemberUpdateExample({ memberId }: { memberId: number }) {
  const { data: member, isLoading: isLoadingMember } = useQuery(
    () => memberApi.getById(memberId),
    [memberId]
  );

  const { mutateAsync, isLoading: isSaving } = useMutation(
    (data: Partial<Member>) => memberApi.update(memberId, data)
  );

  const handleSave = async () => {
    try {
      await mutateAsync({ phone: '010-9999-8888', memo: '연락처 변경' });
      alert('수정 완료!');
    } catch {
      alert('수정 실패');
    }
  };

  if (isLoadingMember) return <div>로딩...</div>;

  return (
    <div>
      <p>이름: {member?.name}</p>
      <p>전화: {member?.phone}</p>
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? '저장 중...' : '전화번호 변경'}
      </button>
    </div>
  );
}

// ============================================================
// 예제 4: 회원 삭제 (useMutation)
// ============================================================
function MemberDeleteExample({ memberId }: { memberId: number }) {
  const { mutate, isLoading } = useMutation(
    () => memberApi.delete(memberId),
    {
      onSuccess: () => alert('삭제 완료'),
      onError: (err) => alert(`삭제 실패: ${err}`),
    }
  );

  return (
    <button onClick={() => mutate(undefined)} disabled={isLoading}>
      {isLoading ? '삭제 중...' : '회원 삭제'}
    </button>
  );
}

// ============================================================
// 예제 5: 매출 페이지네이션 (useQuery + pagination)
// ============================================================
function SalesListExample() {
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery(
    () => salesApi.getPage(page, pageSize, { status: '정상' }),
    [page]
  );

  return (
    <div>
      {isLoading && <p>로딩...</p>}
      <table>
        <tbody>
          {data?.data?.map((s: Sale) => (
            <tr key={s.id}>
              <td>{s.buyer}</td>
              <td>{s.productName}</td>
              <td>{s.salePrice.toLocaleString()}원</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))}>이전</button>
        <span>{page} / {data?.totalPages ?? 1}</span>
        <button onClick={() => setPage((p) => p + 1)}>다음</button>
      </div>
    </div>
  );
}

// ============================================================
// 예제 6: 대시보드 (다중 useQuery)
// ============================================================
function DashboardExample() {
  const { data: stats } = useQuery(() => dashboardApi.getStats(), []);
  const { data: birthdays } = useQuery(() => dashboardApi.getBirthdayMembers(), []);
  const { data: unpaid } = useQuery(() => dashboardApi.getUnpaidMembers(), []);
  const { data: holding } = useQuery(() => dashboardApi.getHoldingMembers(), []);
  const { data: expiring } = useQuery(() => dashboardApi.getExpiringMembers(), []);

  return (
    <div>
      <h2>회원 현황</h2>
      <p>전체: {(stats as any)?.totalMembers}</p>
      <p>활성: {(stats as any)?.activeMembers}</p>

      <h2>생일자</h2>
      {(birthdays as any)?.map((b: any) => <p key={b.id}>{b.name} ({b.birth})</p>)}

      <h2>미수금</h2>
      {(unpaid as any)?.map((u: any) => <p key={u.id}>{u.name}: {u.amount}원</p>)}
    </div>
  );
}

// ============================================================
// 예제 7: 상품 CRUD
// ============================================================
function ProductCrudExample() {
  const { data: products, refetch } = useQuery(
    () => productApi.getAll({ categoryKey: 'facility' }),
    []
  );

  const createMutation = useMutation(
    (data: Omit<Product, 'id'>) => productApi.create(data),
    { onSuccess: () => refetch() }
  );

  const deleteMutation = useMutation(
    (id: number) => productApi.delete(id),
    { onSuccess: () => refetch() }
  );

  return (
    <div>
      <button onClick={() => createMutation.mutate({
        category: '시설이용', categoryKey: 'facility', subCategory: '헬스',
        name: '헬스 6개월', cashPrice: 350000, cardPrice: 385000,
        period: '6개월', kioskExposure: true, status: '사용', createdAt: '2026-03-10',
      })}>
        상품 추가
      </button>

      <ul>
        {products?.map((p) => (
          <li key={p.id}>
            {p.name} - {p.cashPrice.toLocaleString()}원
            <button onClick={() => deleteMutation.mutate(p.id)}>삭제</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 예제 8: 무한 스크롤 (useInfiniteQuery)
// ============================================================
function InfiniteScrollExample() {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery<Member>(
      (page, pageSize) => memberApi.getPage(page, pageSize),
      [],
      { pageSize: 5 }
    );

  return (
    <div>
      {isLoading && <p>로딩...</p>}
      <ul>
        {data.map((m) => <li key={m.id}>{m.name}</li>)}
      </ul>
      {hasNextPage && (
        <button onClick={fetchNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '로딩...' : '더 보기'}
        </button>
      )}
    </div>
  );
}

// ============================================================
// 예제 9: 데이터 초기화 & 서버 전환
// ============================================================
function SystemExample() {
  // 모든 데이터 초기화 (시드 데이터로 복원)
  const resetMutation = useMutation(() => systemApi.reset(), {
    onSuccess: () => alert('모든 데이터가 초기화되었습니다!'),
  });

  // 실제 서버로 전환
  const switchToRealServer = () => {
    configureClient({
      useVirtual: false,
      baseUrl: 'https://api.fitgenie.com',
    });
    alert('실제 서버 모드로 전환되었습니다.');
  };

  // 가상 서버로 복원
  const switchToVirtualServer = () => {
    configureClient({ useVirtual: true });
    alert('가상 서버 모드로 전환되었습니다.');
  };

  return (
    <div>
      <button onClick={() => resetMutation.mutate(undefined)}>
        데이터 초기화
      </button>
      <button onClick={switchToRealServer}>실제 서버 전환</button>
      <button onClick={switchToVirtualServer}>가상 서버 전환</button>
    </div>
  );
}

// ============================================================
// 예제 10: 기존 페이지를 가상 서버로 마이그레이션하는 방법
// ============================================================
//
// [Before] 기존 방식 - 컴포넌트 내 MOCK_DATA 직접 사용:
//
//   const MOCK_MEMBERS = [ ... ];
//   function MemberList() {
//     const filteredData = MOCK_MEMBERS.filter(...);
//     return <DataTable data={filteredData} />;
//   }
//
// [After] 가상 서버 방식:
//
//   import { memberApi, useQuery } from '@/server';
//
//   function MemberList() {
//     const { data: members, isLoading } = useQuery(
//       () => memberApi.getAll({ status: 'active' }),
//       []
//     );
//
//     if (isLoading) return <LoadingSpinner />;
//
//     return <DataTable data={members ?? []} />;
//   }
//
// 장점:
// 1. 로딩 상태 자동 관리
// 2. 에러 핸들링
// 3. 데이터 CRUD가 실제 서버와 동일하게 동작
// 4. localStorage에 자동 영속화
// 5. 나중에 configureClient({ useVirtual: false }) 한 줄로 실제 서버 전환
//

export {
  MemberListExample,
  MemberCreateExample,
  MemberUpdateExample,
  MemberDeleteExample,
  SalesListExample,
  DashboardExample,
  ProductCrudExample,
  InfiniteScrollExample,
  SystemExample,
};
