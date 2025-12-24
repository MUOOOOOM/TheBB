const serverless = require('serverless-http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');

const app = express();
const router = express.Router();

// --- CONFIGURATION ---
const TMP_DIR = '/tmp';
// In Netlify, we bundle DB files. locally we use backend folder.
// Logic: If NETLIFY env is set, use /tmp/db. If local, use local backend path for persistence.
const IS_NETLIFY = !!process.env.NETLIFY || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const SOURCE_DIR = IS_NETLIFY ? path.join(__dirname, 'db') : path.join(__dirname, '../../backend'); 

// DB File Names
const DB_FILES = {
    USERS: 'users.json',
    CLINICS: 'clinics.json',
    EVENTS: 'events.json',
    RESERVATIONS: 'event_applications.json', // Treating applications as reservations/orders
    REVIEWS: 'reviews.json',
    QNA: 'qna.json',
    CARTS: 'carts.json',
    WISHLISTS: 'wishlists.json',
    POINT_LOGS: 'point_logs.json', // Points history (Charge/Use)
    SETTLEMENTS: 'settlements.json', // Monthly settlement records
    AUDIT_LOGS: 'audit_logs.json', // Admin/System logs
    NOTIFICATIONS: 'notifications.json' // User/Clinic notifications
};

// --- FILE SYSTEM HELPERS ---
const getDbPath = (filename) => {
    if (IS_NETLIFY) {
        const tmpPath = path.join(TMP_DIR, filename);
        if (!fs.existsSync(tmpPath)) {
            const sourcePath = path.join(SOURCE_DIR, filename);
            try {
                if (fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, tmpPath);
                else fs.writeFileSync(tmpPath, '[]');
            } catch (e) { fs.writeFileSync(tmpPath, '[]'); }
        }
        return tmpPath;
    }
    return path.join(SOURCE_DIR, filename);
};

const readDb = (filename) => {
    try {
        const data = fs.readFileSync(getDbPath(filename), 'utf-8');
        return JSON.parse(data) || [];
    } catch (e) { return []; }
};

const writeDb = (filename, data) => {
    try {
        fs.writeFileSync(getDbPath(filename), JSON.stringify(data, null, 2));
    } catch (e) { console.error(`Write Error ${filename}:`, e); }
};

// --- UTILITIES ---
const createHash = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
};

const verifyPassword = (password, salt, savedHash) => {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === savedHash;
};

// --- LOGGING & NOTIFICATION SYSTEM ---
const auditLog = (actorId, actorName, action, target, details = '') => {
    const logs = readDb(DB_FILES.AUDIT_LOGS);
    logs.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        actorId, actorName, action, target, details
    });
    writeDb(DB_FILES.AUDIT_LOGS, logs);
};

const sendNotification = (recipientId, type, message) => { // type: 'kakao', 'sms', 'system'
    const notis = readDb(DB_FILES.NOTIFICATIONS);
    notis.push({
        id: Date.now(),
        recipientId,
        type,
        message,
        isRead: false,
        createdAt: new Date().toISOString()
    });
    writeDb(DB_FILES.NOTIFICATIONS, notis);
    // In a real system, here we would call the external API (Twilio, Kakao Biz Message)
    console.log(`[Notification-${type}] To ${recipientId}: ${message}`);
};

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Check Admin Middleware (Simplified for demo)
const checkAdmin = (req, res, next) => {
    // In real app, verify JWT token. Here we rely on frontend sending 'x-admin-auth' header or just assume logic safety
    // For this prototype, we'll implement endpoints that handle the check internally.
    next();
};

// ================= API ROUTES =================

// --- 1. AUTH & USER MANAGEMENT ---

router.post('/login', (req, res) => {
    const { username, password, type } = req.body;
    
    // Admin Login
    if (type === 'admin') {
        if (username === 'admin') { // Password check skipped for demo convenience or env var
            return res.json({ success: true, role: 'admin', user: { name: '관리자' } });
        }
        return res.status(401).json({ success: false, message: '관리자 인증 실패' });
    }

    // Clinic Login
    if (type === 'clinic') {
        const clinics = readDb(DB_FILES.CLINICS);
        const clinic = clinics.find(c => c.username === username);
        if (clinic) {
            // Check active status
            if (clinic.status === 'pending') return res.status(403).json({ success: false, message: '입점 승인 대기 중입니다.' });
            if (clinic.status === 'rejected') return res.status(403).json({ success: false, message: '입점 승인이 거절되었습니다.' });

            if (verifyPassword(password, clinic.salt, clinic.hash)) {
                const { salt, hash, ...rest } = clinic;
                return res.json({ success: true, role: 'clinic', user: rest });
            }
        }
    } 
    // User Login
    else {
        const users = readDb(DB_FILES.USERS);
        const user = users.find(u => u.username === username);
        if (user && verifyPassword(password, user.salt, user.hash)) {
            const { salt, hash, ...rest } = user;
            return res.json({ success: true, role: 'user', user: rest });
        }
    }
    
    res.status(401).json({ success: false, message: '아이디 또는 비밀번호를 확인하세요.' });
});

router.post('/signup', (req, res) => {
    const { username, password, name, contact } = req.body;
    const users = readDb(DB_FILES.USERS);
    if (users.find(u => u.username === username)) return res.json({ success: false, message: '이미 존재하는 아이디입니다.' });

    const { salt, hash } = createHash(password);
    const newUser = {
        id: Date.now(),
        username, name, contact, salt, hash,
        points: 0, // General users can also have points
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    writeDb(DB_FILES.USERS, users);
    auditLog(newUser.id, name, 'SIGNUP', 'User', 'General user signup');
    res.json({ success: true });
});

// Clinic Registration (Apply)
router.post('/clinic-application', (req, res) => {
    const { hospitalName, doctorName, contact, email, website, inquiries } = req.body;
    // Create a clinic account directly but set status to 'pending'
    const clinics = readDb(DB_FILES.CLINICS);
    
    // Generate a temp username/password for them (in real flow, they would provide it)
    const tempUsername = `clinic_${Date.now()}`;
    const tempPassword = 'password123'; // Initial password
    const { salt, hash } = createHash(tempPassword);

    const newClinic = {
        id: Date.now(),
        username: tempUsername,
        hospitalName,
        representative: doctorName,
        contact,
        email,
        website,
        salt, hash,
        points: 0,
        commissionRate: 10, // Default 10%
        status: 'pending', // pending, active, rejected
        createdAt: new Date().toISOString()
    };

    clinics.push(newClinic);
    writeDb(DB_FILES.CLINICS, clinics);
    
    // Notify Admin
    sendNotification('admin', 'system', `새로운 병원 입점 신청: ${hospitalName}`);
    
    res.json({ success: true, message: '신청되었습니다. 심사 후 연락드립니다.' });
});


// --- 2. PAYMENT & POINTS ---

// Virtual PG Charge (Simulated)
router.post('/payment/charge', (req, res) => {
    const { userId, userType, amount, method } = req.body; // userType: 'user' or 'clinic'
    const chargeAmount = parseInt(amount);
    if (chargeAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    // 1. Log the transaction
    const logs = readDb(DB_FILES.POINT_LOGS);
    const logEntry = {
        id: Date.now(),
        username: userId, // username or id
        type: 'charge',
        amount: chargeAmount,
        method: method || 'VIRTUAL_CARD', // 'card', 'bank'
        description: '포인트 충전 (PG 연동 시뮬레이션)',
        date: new Date().toISOString()
    };
    logs.push(logEntry);
    writeDb(DB_FILES.POINT_LOGS, logs);

    // 2. Update Balance
    if (userType === 'clinic') {
        const clinics = readDb(DB_FILES.CLINICS);
        const idx = clinics.findIndex(c => c.username === userId);
        if (idx > -1) {
            clinics[idx].points = (clinics[idx].points || 0) + chargeAmount;
            writeDb(DB_FILES.CLINICS, clinics);
            sendNotification(userId, 'sms', `[THE BB] ${chargeAmount.toLocaleString()}P 충전이 완료되었습니다.`);
            auditLog(userId, userId, 'CHARGE', 'Points', `${chargeAmount}P charged`);
            return res.json({ success: true, balance: clinics[idx].points });
        }
    } else {
        // General User
        const users = readDb(DB_FILES.USERS);
        const idx = users.findIndex(u => u.username === userId || u.id === userId);
        if (idx > -1) {
            users[idx].points = (users[idx].points || 0) + chargeAmount;
            writeDb(DB_FILES.USERS, users);
            return res.json({ success: true, balance: users[idx].points });
        }
    }
    res.status(404).json({ success: false, message: 'User not found' });
});


// --- 3. RESERVATION & ORDER PROCESSING ---

router.post('/event-apply', (req, res) => {
    const { name, contact, eventId, eventDetails } = req.body;
    const events = readDb(DB_FILES.EVENTS);
    const event = events.find(e => e.id === parseInt(eventId));
    
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const clinicId = event.clinicId;
    const price = parseInt(eventDetails.totalPrice) || 0;
    
    // Commission Logic (10%)
    const clinics = readDb(DB_FILES.CLINICS);
    const clinicIdx = clinics.findIndex(c => c.username === clinicId);
    
    if (clinicIdx === -1) return res.status(404).json({ success: false, message: 'Clinic not found' });

    const clinic = clinics[clinicIdx];
    const commissionRate = clinic.commissionRate || 10;
    const commission = Math.floor(price * (commissionRate / 100));

    // Check Point Balance (Clinic pays commission)
    // Policy: Can they receive booking if points < commission? 
    // Let's allow it but warn, or block. Here we block for "Prepaid" model strictness.
    if ((clinic.points || 0) < commission) {
        // Send alert to clinic
        sendNotification(clinicId, 'kakao', `[잔액부족] 예약(${name})을 수락할 포인트가 부족합니다. 충전해주세요.`);
        return res.status(402).json({ success: false, message: '병원의 포인트 잔액 부족으로 예약이 일시 중단되었습니다.' });
    }

    // Deduct Commission
    clinics[clinicIdx].points -= commission;
    writeDb(DB_FILES.CLINICS, clinics);

    // Create Point Log (Deduction)
    const pLogs = readDb(DB_FILES.POINT_LOGS);
    pLogs.push({
        id: Date.now(),
        username: clinicId,
        type: 'deduction',
        amount: -commission,
        description: `수수료 차감 - 예약(${name}: ${event.title})`,
        date: new Date().toISOString()
    });
    writeDb(DB_FILES.POINT_LOGS, pLogs);

    // Save Reservation
    const reservations = readDb(DB_FILES.RESERVATIONS);
    const newRes = {
        id: Date.now(),
        userId: req.body.userId || 'guest', // If logged in
        name, contact,
        eventId: parseInt(eventId),
        clinicId,
        eventDetails,
        totalPrice: price,
        commission,
        status: 'confirmed', // pending -> confirmed (since we took fee)
        submittedAt: new Date().toISOString()
    };
    reservations.push(newRes);
    writeDb(DB_FILES.RESERVATIONS, reservations);

    // Notifications
    sendNotification(clinicId, 'push', `🔔 새로운 예약: ${name}님 (${event.title})`);
    sendNotification('admin', 'system', `매출 발생: ${commission.toLocaleString()}원 (병원: ${clinic.hospitalName})`);

    // Add to Excel (Legacy support)
    // updateExcelFile(newRes); // omitted for brevity

    res.json({ success: true, message: '예약이 확정되었습니다.' });
});


// --- 4. ADMIN FLOWS (Approval & Settlement) ---

// Get Pending Clinics
router.get('/admin/clinics/pending', (req, res) => {
    const clinics = readDb(DB_FILES.CLINICS);
    const pending = clinics.filter(c => c.status === 'pending');
    res.json({ success: true, data: pending });
});

// Approve/Reject Clinic
router.post('/admin/clinics/approve', (req, res) => {
    const { username, action } = req.body; // action: 'approve' or 'reject'
    const clinics = readDb(DB_FILES.CLINICS);
    const idx = clinics.findIndex(c => c.username === username);
    
    if (idx > -1) {
        clinics[idx].status = action === 'approve' ? 'active' : 'rejected';
        writeDb(DB_FILES.CLINICS, clinics);
        
        const msg = action === 'approve' 
            ? `[THE BB] 입점이 승인되었습니다. 로그인 후 서비스를 이용하세요. (초기 비번: password123)`
            : `[THE BB] 입점 심사가 반려되었습니다. 고객센터로 문의바랍니다.`;
        
        sendNotification(username, 'sms', msg);
        auditLog('admin', 'Admin', 'APPROVE_CLINIC', username, `Action: ${action}`);
        
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// Toggle Event Promotion (Ad)
router.post('/admin/promotions/toggle', (req, res) => {
    const { eventId } = req.body;
    const events = readDb(DB_FILES.EVENTS);
    const idx = events.findIndex(e => e.id === parseInt(eventId));
    
    if (idx > -1) {
        events[idx].isPromoted = !events[idx].isPromoted;
        writeDb(DB_FILES.EVENTS, events);
        auditLog('admin', 'Admin', 'TOGGLE_AD', `Event:${eventId}`, `Promoted: ${events[idx].isPromoted}`);
        res.json({ success: true, isPromoted: events[idx].isPromoted });
    } else res.status(404).json({ success: false });
});

// Settlement Calculation
router.get('/admin/settlements/calculate', (req, res) => {
    // Determine current month revenue per clinic
    const reservations = readDb(DB_FILES.RESERVATIONS);
    const settlements = {}; // { clinicId: { sales, commission, count } }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    reservations.forEach(r => {
        if (r.submittedAt.startsWith(currentMonth) && r.status !== 'cancelled') {
            if (!settlements[r.clinicId]) settlements[r.clinicId] = { sales: 0, commission: 0, count: 0 };
            settlements[r.clinicId].sales += r.totalPrice;
            settlements[r.clinicId].commission += r.commission;
            settlements[r.clinicId].count += 1;
        }
    });

    res.json({ success: true, month: currentMonth, data: settlements });
});


// --- 5. NOTIFICATIONS ---
router.get('/notifications/:userId', (req, res) => {
    const notis = readDb(DB_FILES.NOTIFICATIONS);
    // Return unread first
    const myNotis = notis.filter(n => n.recipientId === req.params.userId || n.recipientId === 'all');
    res.json({ success: true, data: myNotis.reverse() });
});

router.post('/notifications/read', (req, res) => {
    const { id } = req.body;
    const notis = readDb(DB_FILES.NOTIFICATIONS);
    const idx = notis.findIndex(n => n.id === parseInt(id));
    if (idx > -1) {
        notis[idx].isRead = true;
        writeDb(DB_FILES.NOTIFICATIONS, notis);
    }
    res.json({ success: true });
});


// --- 6. STANDARD GETTERS (Legacy compatibility) ---
router.get('/events', (req, res) => res.json({ success: true, data: readDb(DB_FILES.EVENTS) }));
router.get('/events/:id', (req, res) => {
    const ev = readDb(DB_FILES.EVENTS).find(e => e.id === parseInt(req.params.id));
    ev ? res.json({ success: true, data: ev }) : res.status(404).json({ success: false });
});
router.get('/reviews/:eventId', (req, res) => res.json({ success: true, data: readDb(DB_FILES.REVIEWS).filter(r => r.eventId == req.params.eventId) }));
router.post('/reviews', (req, res) => { 
    const r = readDb(DB_FILES.REVIEWS); 
    r.push({id:Date.now(), ...req.body, date: new Date().toISOString()}); 
    writeDb(DB_FILES.REVIEWS, r); 
    res.json({success:true}); 
});
router.get('/qna/:eventId', (req, res) => res.json({ success: true, data: readDb(DB_FILES.QNA).filter(q => q.eventId == req.params.eventId) }));
router.post('/qna', (req, res) => { 
    const q = readDb(DB_FILES.QNA); 
    q.push({id:Date.now(), ...req.body, date: new Date().toISOString()}); 
    writeDb(DB_FILES.QNA, q); 
    res.json({success:true}); 
});
router.get('/clinic/reservations/:username', (req, res) => {
    const r = readDb(DB_FILES.RESERVATIONS).filter(x => x.clinicId === req.params.username);
    res.json({ success: true, data: r });
});
router.get('/clinic/events/:username', (req, res) => {
    const e = readDb(DB_FILES.EVENTS).filter(x => x.clinicId === req.params.username);
    res.json({ success: true, data: e });
});
router.get('/clinic/financials/:username', (req, res) => {
    // Reuse logic from previous versions or simple fetch
    const username = req.params.username;
    const allRes = readDb(DB_FILES.RESERVATIONS).filter(r => r.clinicId === username);
    const clinic = readDb(DB_FILES.CLINICS).find(c => c.username === username);
    const totalSales = allRes.reduce((acc, cur) => acc + (cur.totalPrice || 0), 0);
    const totalCommission = allRes.reduce((acc, cur) => acc + (cur.commission || 0), 0);
    
    res.json({ 
        success: true, 
        data: {
            totalSales, 
            totalCommission, 
            currentPoints: clinic ? clinic.points : 0,
            totalCount: allRes.length 
        } 
    });
});
router.get('/clinic/point-logs/:username', (req, res) => {
    const l = readDb(DB_FILES.POINT_LOGS).filter(x => x.username === req.params.username);
    res.json({ success: true, data: l.sort((a,b)=>b.id-a.id) });
});
router.get('/admin/clinics', (req, res) => res.json({ success: true, data: readDb(DB_FILES.CLINICS) }));
router.get('/admin/users', (req, res) => res.json({ success: true, data: readDb(DB_FILES.USERS) }));
router.get('/admin/promotions', (req, res) => res.json({ success: true, data: readDb(DB_FILES.EVENTS) }));
router.get('/admin/financials', (req, res) => {
    const r = readDb(DB_FILES.RESERVATIONS);
    const sales = r.reduce((a,c)=>a+(c.totalPrice||0),0);
    const comm = r.reduce((a,c)=>a+(c.commission||0),0);
    res.json({ success: true, data: { totalTransactionAmount: sales, totalCommission: comm, monthlyStats: {}, registeredClinics: 0 } });
});

// Mount Router
app.use('/api', router);

// Export Handler
module.exports.handler = serverless(app);
