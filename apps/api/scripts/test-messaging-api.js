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

const apiGet = async (path, token) => {
    const response = await fetcher(`${httpBase}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GET ${path} failed (${response.status}): ${text}`);
    }
    return response.json();
};

const apiPost = async (path, token, payload) => {
    const response = await fetcher(`${httpBase}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`POST ${path} failed (${response.status}): ${text}`);
    }
    return response.json();
};

const run = async () => {
    const customerEmail = process.env.CUSTOMER_EMAIL || 'testuser_1769330515@example.com';
    const customerPassword = process.env.CUSTOMER_PASSWORD || 'TestPass123!';

    const loginResult = await login(customerEmail, customerPassword);
    const token = loginResult.token;
    const user = loginResult.user;

    const conversations = await apiGet('/api/messaging/conversations', token);
    if (!conversations.conversations || conversations.conversations.length === 0) {
        throw new Error('No conversations found for the customer.');
    }

    const conversationId = conversations.conversations[0].id;
    console.log('ConversationId:', conversationId);

    const messages = await apiGet(`/api/messaging/conversations/${conversationId}/messages`, token);
    console.log('Messages fetched:', Array.isArray(messages.messages) ? messages.messages.length : 0);

    const sent = await apiPost(`/api/messaging/conversations/${conversationId}/messages`, token, {
        body: `Test message from customer at ${new Date().toISOString()}`,
        message_type: 'text'
    });
    console.log('Message sent:', sent);
};

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
