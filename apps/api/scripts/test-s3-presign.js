const httpBase = process.env.API_BASE || 'http://localhost:3001';

const getFetch = () => {
    if (typeof fetch === 'function') return fetch;
    try {
        return require('node-fetch');
    } catch (error) {
        throw new Error('Fetch API not available. Use Node 18+ or install node-fetch.');
    }
};

const fetcher = getFetch();

const login = async (email, password) => {
    const response = await fetcher(`${httpBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Login failed (${response.status}): ${text}`);
    }
    return response.json();
};

const run = async () => {
    const email = process.env.CUSTOMER_EMAIL || 'testuser_1769330515@example.com';
    const password = process.env.CUSTOMER_PASSWORD || 'TestPass123!';
    const loginResult = await login(email, password);

    const response = await fetcher(`${httpBase}/api/uploads/presign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loginResult.token}`
        },
        body: JSON.stringify({
            filename: 'test-image.png',
            contentType: 'image/png',
            folder: 'test-uploads',
            contentLength: 1024
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Presign failed');
    }

    console.log('Presign response:', data);
};

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
