// Add to server.js after OAuth routes to debug registration

// Debug endpoint to check OAuth user data
app.get('/api/auth/debug-oauth', (req, res) => {
    res.json({
        message: 'OAuth Debug Endpoint',
        available_endpoints: [
            '/api/auth/register',
            '/api/auth/login', 
            '/api/auth/google',
            '/api/auth/microsoft'
        ],
        instructions: {
            test_direct_registration: 'POST /api/auth/register',
            test_oauth_flow: 'Visit /auth/google or /auth/microsoft',
            check_database_logs: 'View logs in Render dashboard'
        }
    });
});