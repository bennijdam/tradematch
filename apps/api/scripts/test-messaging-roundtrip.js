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

const findConversation = (conversations, customerId, vendorId) => {
    return conversations.find((conv) => (
        conv.customer_id === customerId && conv.vendor_id === vendorId
    )) || conversations[0];
};

const run = async () => {
    const customerEmail = process.env.CUSTOMER_EMAIL || 'testuser_1769330515@example.com';
    const customerPassword = process.env.CUSTOMER_PASSWORD || 'TestPass123!';
    const vendorEmail = process.env.VENDOR_EMAIL || 'vendor_test_1769330600@example.com';
    const vendorPassword = process.env.VENDOR_PASSWORD || 'VendorPass123!';

    const customerLogin = await login(customerEmail, customerPassword);
    const vendorLogin = await login(vendorEmail, vendorPassword);

    const customerToken = customerLogin.token;
    const vendorToken = vendorLogin.token;
    const customerId = customerLogin.user.id;
    const vendorId = vendorLogin.user.id;

    const customerConversations = await apiGet('/api/messaging/conversations', customerToken);
    if (!customerConversations.conversations || customerConversations.conversations.length === 0) {
        throw new Error('No conversations found for the customer.');
    }

    const conversation = findConversation(customerConversations.conversations, customerId, vendorId);
    const conversationId = conversation.id;
    console.log('ConversationId:', conversationId);

    const beforeMessages = await apiGet(`/api/messaging/conversations/${conversationId}/messages`, customerToken);
    console.log('Messages before:', Array.isArray(beforeMessages.messages) ? beforeMessages.messages.length : 0);

    const customerSent = await apiPost(`/api/messaging/conversations/${conversationId}/messages`, customerToken, {
        body: `Customer test message at ${new Date().toISOString()}`,
        message_type: 'text'
    });
    console.log('Customer sent:', customerSent);

    const vendorSent = await apiPost(`/api/messaging/conversations/${conversationId}/messages`, vendorToken, {
        body: `Vendor test message at ${new Date().toISOString()}`,
        message_type: 'text'
    });
    console.log('Vendor sent:', vendorSent);

    const afterMessages = await apiGet(`/api/messaging/conversations/${conversationId}/messages`, customerToken);
    console.log('Messages after:', Array.isArray(afterMessages.messages) ? afterMessages.messages.length : 0);
};

run().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
