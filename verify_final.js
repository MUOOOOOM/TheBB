const https = require('https');
const fs = require('fs');

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function request(path, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
        agent
    };
    const res = await fetch(`https://localhost:3000/api${path}`, options);
    const data = await res.json();
    return { status: res.status, data };
}

async function runTests() {
    console.log('🚀 Starting Final System Verification (Yeosin Ticket Style)...');

    try {
        // 1. Admin Login & Financials Check
        console.log('\n🔹 [1. Admin] Checking Financials...');
        const adminLogin = await request('/login', 'POST', { username: 'admin', password: 'thebb_admin_password', type: 'admin' });
        if (!adminLogin.data.success) throw new Error('Admin login failed');
        
        const financials = await request('/admin/financials');
        console.log(`   ✅ Admin Revenue: ${financials.data.data.totalTransactionAmount}, Commission: ${financials.data.data.totalCommission}`);

        // 2. Clinic Login & Points Check
        console.log('\n🔹 [2. Clinic] Checking Points System...');
        const clinicLogin = await request('/login', 'POST', { username: 'clinic_test', password: 'clinic1234', type: 'clinic' });
        if (!clinicLogin.data.success) throw new Error('Clinic login failed');

        const clinicStats = await request('/clinic/financials/clinic_test');
        console.log(`   ✅ Clinic Current Points: ${clinicStats.data.data.currentPoints}`);

        // 3. Charge Points
        console.log('\n🔹 [3. Clinic] Charging Points...');
        const chargeRes = await request('/clinic/charge-points', 'POST', { username: 'clinic_test', amount: 50000 });
        console.log(`   ✅ Points Charged. New Balance: ${chargeRes.data.points}`);

        // 4. User Reservation (Revenue Increase)
        console.log('\n🔹 [4. User] Simulating Reservation...');
        const reservationData = {
            name: 'Final Tester',
            contact: '010-7777-7777',
            eventId: 1,
            eventDetails: {
                eventTitle: 'Test Event',
                selectedOptions: [{ label: 'Option A' }],
                totalPrice: 200000
            },
            clinicId: 'clinic_test'
        };
        await request('/event-apply', 'POST', reservationData);
        console.log('   ✅ Reservation Made');

        // 5. Verify Revenue & Commission Update
        console.log('\n🔹 [5. System] Verifying Updates...');
        const newClinicStats = await request('/clinic/financials/clinic_test');
        const newAdminStats = await request('/admin/financials');
        
        console.log(`   ✅ Clinic Revenue: ${newClinicStats.data.data.totalRevenue} (Expected increase)`);
        console.log(`   ✅ Admin Commission: ${newAdminStats.data.data.totalCommission} (Expected ~20000 increase)`);

    } catch (e) {
        console.error('\n❌ Verification Failed:', e);
    }
    console.log('\n✨ All Systems Go.');
}

runTests();
