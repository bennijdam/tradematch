require('dotenv').config();

async function run() {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@tradematch.com', password: 'ChangeMe123!' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
        console.error('Login failed:', loginData);
        process.exit(1);
    }

    const changeRes = await fetch('http://localhost:3001/api/admin/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loginData.token}`
        },
        body: JSON.stringify({ current_password: 'ChangeMe123!', new_password: 'TempPass123!' })
    });
    const changeData = await changeRes.json();
    console.log({ status: changeRes.status, body: changeData });
}

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
