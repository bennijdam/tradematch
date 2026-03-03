import Topbar from '@/components/layout/Topbar';

export default function VendorLeadsPage() {
  return (
    <section className="container">
      <Topbar title="New Leads" />
      <table className="table panel" role="table" aria-label="Leads table">
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Trade</th>
            <th scope="col">Budget</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lead #1024</td>
            <td>Kitchen Fitter</td>
            <td>£3,500</td>
          </tr>
          <tr>
            <td>Lead #1025</td>
            <td>Electrician</td>
            <td>£1,200</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
