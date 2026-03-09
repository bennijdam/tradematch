import FullViewportFrame from '@/components/layout/FullViewportFrame';
import NativeVendorDashboard from '@/components/vendor/NativeVendorDashboard';

const USE_NATIVE_UI = process.env.NEXT_PUBLIC_UI_MODE === 'native';
const ENABLE_VENDOR_NATIVE_EXPERIMENT =
  process.env.NEXT_PUBLIC_VENDOR_NATIVE_EXPERIMENT === 'true';

type DashboardSearchParams = {
  'test-native'?: string | string[];
};

function shouldUseNative(testNative: string | string[] | undefined) {
  if (!ENABLE_VENDOR_NATIVE_EXPERIMENT) {
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

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const params: DashboardSearchParams = searchParams ? await searchParams : {};
  const nativeMode = shouldUseNative(params?.['test-native']);

  if (nativeMode) {
    return <NativeVendorDashboard />;
  }

  return (
    <FullViewportFrame
      src="/vendor-dashboard-new/vendor-dashboard.html"
      title="Vendor Dashboard"
      background="#080C12"
    />
  );
}
