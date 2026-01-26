require('dotenv').config();

async function run() {
    const health = await fetch('http://localhost:3001/api/health');
    if (!health.ok) {
        const text = await health.text();
        throw new Error(`Health failed: ${health.status} ${text}`);
    }

    const rand = Math.floor(Math.random() * 1e9);
    const email = `user${rand}@example.com`;
    const password = 'TestPass123!';

    const registerRes = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userType: 'customer',
            fullName: 'Test User',
            email,
            phone: '07123456789',
            password,
            postcode: 'SW1A 1AA',
            terms: true
        })
    });
    const registerData = await registerRes.json();
    if (!registerRes.ok) {
        throw new Error(`Register failed: ${registerRes.status} ${JSON.stringify(registerData)}`);
    }

    const token = registerData.token;
    const quoteRes = await fetch('http://localhost:3001/api/quotes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            serviceType: 'plumbing',
            title: 'Leaky tap repair',
            description: 'Kitchen tap leaking, needs replacement washer.',
            postcode: 'SW1A 1AA',
            budgetMin: 50,
            budgetMax: 150,
            urgency: 'asap'
        })
    });
    const quoteData = await quoteRes.json();
    if (!quoteRes.ok) {
        throw new Error(`Quote failed: ${quoteRes.status} ${JSON.stringify(quoteData)}`);
    }

    const result = {
        health: 'ok',
        email,
        register_message: registerData.message,
        quote_id: quoteData.quoteId,
        quote_status: quoteData.status
    };

    console.log(result);
    const fs = require('fs');
    fs.writeFileSync('logs/smoke-user-quote.json', JSON.stringify(result, null, 2));
}

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
