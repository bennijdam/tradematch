import SuperAdminDashboardApp from '@/components/super-admin/SuperAdminDashboardApp';

type DashboardSearchParams = {
  view?: string | string[];
};

function normalizeViewId(view: string | string[] | undefined): 'infra-health' | 'reports-suite' {
  const value = Array.isArray(view) ? view[0] : view;
  return value === 'reports-suite' ? 'reports-suite' : 'infra-health';
}

export default async function SuperAdminDashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>;
}) {
  const params = await Promise.resolve(searchParams);
  const viewId = normalizeViewId(params?.view);

  return <SuperAdminDashboardApp viewId={viewId} />;
}
