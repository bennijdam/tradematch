import FullViewportFrame from '@/components/layout/FullViewportFrame';
import CustomerLiteralSkeleton from '@/components/customer/CustomerLiteralSkeleton';

const USE_NATIVE_UI = process.env.NEXT_PUBLIC_UI_MODE === 'native';
const ENABLE_CUSTOMER_NATIVE_EXPERIMENT =
  process.env.NEXT_PUBLIC_CUSTOMER_NATIVE_EXPERIMENT === 'true';

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
  searchParams?: Promise<{ 'test-native'?: string | string[] }>;
}) {
  const params = await (searchParams ?? Promise.resolve({}));
  const testNative = params?.['test-native'];
  
  const nativeMode = shouldUseNative(testNative);

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
