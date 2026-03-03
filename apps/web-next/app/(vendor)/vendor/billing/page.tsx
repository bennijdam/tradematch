import Topbar from '@/components/layout/Topbar';

export default function VendorBillingPage() {
  return (
    <section className="container">
      <Topbar title="Billing" />
      <table className="table panel" role="table" aria-label="Billing table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Amount</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lead Credits Top-up</td>
            <td>£25.00</td>
            <td>Paid</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
