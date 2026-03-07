import FullViewportFrame from '@/components/layout/FullViewportFrame';
import CustomerLiteralSkeleton from '@/components/customer/CustomerLiteralSkeleton';

const USE_NATIVE_UI = process.env.NEXT_PUBLIC_UI_MODE === 'native';
const ENABLE_CUSTOMER_NATIVE_EXPERIMENT =
  process.env.NEXT_PUBLIC_CUSTOMER_NATIVE_EXPERIMENT === 'true';

type DashboardSearchParams = {
  'test-native'?: string | string[];
};

function shouldUseNative(testNative: string | string[] | undefined) {
  if (!ENABLE_CUSTOMER_NATIVE_EXPERIMENT) {
    return false;
  }

  if (USE_NATIVE_UI) {
    return true;
  }

  if (Array.isArray(testNative)) {
    return testNative.includes('true') || testNative.includes('1');
  }

  return testNative === 'true' || testNative === '1';
}

export default async function CustomerDashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams | Promise<DashboardSearchParams>;
}) {
  const params = await Promise.resolve(searchParams);
  const nativeMode = shouldUseNative(params?.['test-native']);

  if (nativeMode) {
    return <CustomerLiteralSkeleton />;
  }

  return (
    <FullViewportFrame
      src="/customer-dashboard-new/user-dashboard.html"
      title="Customer Dashboard"
      background="#0A0E14"
    />
  );
}
