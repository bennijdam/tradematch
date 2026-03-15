/**
 * TEST PAGE - Verifies HTML serving is working
 * 
 * This page confirms that the Direct HTML approach is active
 */

export default function TestPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>Dashboard Test Page</h1>
      <p>This React page should NOT be showing if rewrites are working.</p>
      <p>If you see this page, the rewrites are NOT working correctly.</p>
      
      <h2>Try these URLs:</h2>
      <ul>
        <li><a href="/dashboards/vendor">/dashboards/vendor</a> - Should show vendor-dashboard.html</li>
        <li><a href="/dashboards/user">/dashboards/user</a> - Should show user-dashboard.html</li>
        <li><a href="/dashboards/super-admin">/dashboards/super-admin</a> - Should show super-admin-dashboard.html</li>
      </ul>
      
      <h2>Direct HTML URLs:</h2>
      <ul>
        <li><a href="/vendor-dashboard.html">/vendor-dashboard.html</a> - Direct file access</li>
        <li><a href="/user-dashboard.html">/user-dashboard.html</a> - Direct file access</li>
        <li><a href="/super-admin-dashboard.html">/super-admin-dashboard.html</a> - Direct file access</li>
      </ul>
      
      <p style={{ marginTop: '40px', padding: '20px', background: '#ffeb3b' }}>
        <strong>Note:</strong> If the rewrites work, visiting /dashboards/vendor should serve<br/>
        the HTML file directly WITHOUT showing this React component.
      </p>
    </div>
  );
}
