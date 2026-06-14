const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

// New auth token provided by user
const AUTH_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODE2ODM4MjQuNzk4LCJkYXRhIjp7Il9pZCI6IjY4MzEyNTQ1MDNkMzc1MmFhMzkzZWUzNyIsInVzZXJuYW1lIjoiNzM0MDMyMzM1MSIsImZpcnN0TmFtZSI6IlNhbmRlZXAiLCJsYXN0TmFtZSI6Ikt1bWFyIiwib3JnYW5pemF0aW9uIjp7Il9pZCI6IjVlYjM5M2VlOTVmYWI3NDY4YTc5ZDE4OSIsIndlYnNpdGUiOiJwaHlzaWNzd2FsbGFoLmNvbSIsIm5hbWUiOiJQaHlzaWNzd2FsbGFoIn0sInJvbGVzIjpbIjViMjdiZDk2NTg0MmY5NTBhNzc4YzZlZiJdLCJjb3VudHJ5R3JvdXAiOiJJTiIsInR5cGUiOiJVU0VSIn0sImp0aSI6Im9JVHdWeWpUUTFHbGpBRXFJcWp1TVFfNjgzMTI1NDUwM2QzNzUyYWEzOTNlZTM3IiwiaWF0IjoxNzgxMDc5MDI0fQ.6QHXJ6EyW5Mnb6R2YrekqcuTcflTfpzhYOfyzgbUsxc"; 

const COOKIE_TOKEN = "accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWZjNDk3OGE4YTZhNzg1NjYxNjNmNmYiLCJuYW1lIjoiQW1iZXIgS2FzYXVkaGFuIiwidGVsZWdyYW1JZCI6bnVsbCwiUGhvdG9VcmwiOiJodHRwczovL2Nkbi1pY29ucy1wbmcuZmxhdGljb24uY29tLzUxMi8zNjA3LzM2MDc0NDQucG5nIiwiaWF0IjoxNzc5NDYwMDk1LCJleHAiOjE3ODA3NTYwOTV9.IzAq6lmdjTUnSDh9zhyDiTr5jKRvLnp9_VC5T_XKBOI; refreshToken=97607eddff31612a163962e6d3dd4a8705ca4bd417def1177e4ca4b15f2f4dd56887d2f9069cca8260e540fc2aa4f9522a12ced0fe132c2fe4687b374038da9a";

const HEADERS = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'client-id': '5eb393ee95fab7468a79d189',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const COOKIE_HEADERS = {
    'Cookie': COOKIE_TOKEN,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ================= COMMUNITY DATABASE & CONFIGURATION =================
const POSTS_FILE = path.join(__dirname, 'posts.json');
const ADMIN_PASSWORD = "Amber708";
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

// Universal Response Obfuscation for Network Tab security
const OBFUSCATION_KEY = "pwzone_super_secret_key_2026";
function encryptPayload(data) {
    const jsonStr = JSON.stringify(data);
    const buffer = Buffer.from(jsonStr, 'utf8');
    const xorKeyBytes = Buffer.from(OBFUSCATION_KEY, 'utf8');
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] = buffer[i] ^ xorKeyBytes[i % xorKeyBytes.length];
    }
    return buffer.toString('base64');
}

function sendEncrypted(res, data) {
    res.json({
        success: true,
        payload: encryptPayload(data)
    });
}

function sendEncryptedError(res, statusCode, message) {
    res.status(statusCode).json({
        success: false,
        payload: encryptPayload({ message })
    });
}

function getPosts() {
    try {
        if (!fs.existsSync(POSTS_FILE)) {
            fs.writeFileSync(POSTS_FILE, '[]', 'utf8');
        }
        const data = fs.readFileSync(POSTS_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (e) {
        console.error("Error reading posts:", e);
        return [];
    }
}

function savePosts(posts) {
    try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 4), 'utf8');
    } catch (e) {
        console.error("Error writing posts:", e);
    }
}

function broadcast(event) {
    const payload = JSON.stringify(event);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// WebSocket Connection
wss.on('connection', (ws) => {
    console.log('Client connected to WebSockets community space.');
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to PW Zone Community' }));
});

// ================= EXISTING LOGIC & APIS =================

// Fetch all batches
// Fetch all batches
app.get(['/api/batches', '/api/batche'], async (req, res) => {
    try {
        const response = await axios.get("https://rarestudy.github.io/rarestudy/batches.json?v=1781369266137", { timeout: 5000 });
        const data = response.data;
        if (data && data.batches) {
            data.batches = data.batches.map(b => {
                if (b._id) b._id = safeEncrypt(b._id);
                if (b.subBatches) {
                    b.subBatches = b.subBatches.map(sb => {
                        if (sb._id) sb._id = safeEncrypt(sb._id);
                        return sb;
                    });
                }
                return b;
            });
        }
        sendEncrypted(res, data);
    } catch (error) {
        console.error("Fetch batches error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch batches from source URL");
    }
});

// Fetch batch details
app.get('/api/batch-details', async (req, res) => {
    const { batchId } = req.query;
    const decryptedBatchId = safeDecrypt(batchId);
    try {
        const response = await axios.get(`https://api.penpencil.co/v3/batches/${decryptedBatchId}/details`, { headers: HEADERS });
        const data = response.data;
        if (data && data.data && data.data.subjects) {
            data.data.subjects = data.data.subjects.map(s => {
                if (s._id) s._id = safeEncrypt(s._id);
                if (s.batchId) s.batchId = safeEncrypt(s.batchId);
                return s;
            });
        }
        sendEncrypted(res, data);
    } catch (error) {
        console.error("Fetch batch details error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch batch details");
    }
});

// Fetch today's schedule
app.get('/api/todays-schedule', async (req, res) => {
    const { batchId } = req.query;
    const decryptedBatchId = safeDecrypt(batchId);
    try {
        const response = await axios.get(`https://api.penpencil.co/v2/batches/${decryptedBatchId}/todays-schedule`, { headers: HEADERS });
        const data = response.data;
        if (data && data.data) {
            data.data = data.data.map(item => {
                if (item._id) item._id = safeEncrypt(item._id);
                if (item.batchId) item.batchId = safeEncrypt(item.batchId);
                if (item.subjectId) {
                    if (typeof item.subjectId === 'string') {
                        item.subjectId = safeEncrypt(item.subjectId);
                    } else if (typeof item.subjectId === 'object') {
                        if (item.subjectId._id) item.subjectId._id = safeEncrypt(item.subjectId._id);
                    }
                }
                if (item.chapterId) item.chapterId = safeEncrypt(item.chapterId);
                return item;
            });
        }
        sendEncrypted(res, data);
    } catch (error) {
        console.error("Fetch todays schedule error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch schedule");
    }
});

// Fetch topics / chapters
app.get('/api/topics', async (req, res) => {
    const { batchId, subjectId, page } = req.query;
    const decryptedBatchId = safeDecrypt(batchId);
    const decryptedSubjectId = safeDecrypt(subjectId);
    try {
        const targetURL = `https://api.penpencil.co/v2/batches/${decryptedBatchId}/subject/${decryptedSubjectId}/topics?page=${page || 1}`;
        const response = await axios.get(targetURL, { headers: HEADERS });
        const data = response.data;
        if (data && data.data) {
            data.data = data.data.map(t => {
                if (t._id) t._id = safeEncrypt(t._id);
                return t;
            });
        }
        sendEncrypted(res, data);
    } catch (error) {
        console.error("Fetch topics error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch topics");
    }
});

// Fetch subject contents (lectures, notes, DPPs)
app.get('/api/contents', async (req, res) => {
    const { batchId, subjectId, contentType, tag, page } = req.query;
    const decryptedBatchId = safeDecrypt(batchId);
    const decryptedSubjectId = safeDecrypt(subjectId);
    const decryptedTag = safeDecrypt(tag);
    try {
        const targetURL = `https://api.penpencil.co/v2/batches/${decryptedBatchId}/subject/${decryptedSubjectId}/contents?page=${page || 1}&contentType=${contentType}&tag=${decryptedTag}`;
        const response = await axios.get(targetURL, { headers: HEADERS });
        const data = response.data;
        if (data && data.data) {
            data.data = data.data.map(c => {
                if (c._id) c._id = safeEncrypt(c._id);
                return c;
            });
        }
        sendEncrypted(res, data);
    } catch (error) {
        console.error("Fetch contents error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch contents");
    }
});

// Fetch DPP tests list
app.get('/api/dpp-tests', async (req, res) => {
    const { batchId, batchSubjectId, chapterId, page } = req.query;
    const decryptedBatchId = safeDecrypt(batchId);
    const decryptedBatchSubjectId = safeDecrypt(batchSubjectId);
    const decryptedChapterId = safeDecrypt(chapterId);
    try {
        const targetURL = `https://api.penpencil.co/v3/test-service/tests/dpp?batchId=${decryptedBatchId}&batchSubjectId=${decryptedBatchSubjectId}&chapterId=${decryptedChapterId}&isSubjective=false&page=${page || 1}`;
        const response = await axios.get(targetURL, { headers: HEADERS });
        const data = response.data;
        if (data && data.data) {
            data.data = data.data.map(item => {
                if (item.test && item.test._id) {
                    item.test._id = safeEncrypt(item.test._id);
                }
                return item;
            });
        }
        sendEncrypted(res, data);
    } catch (error) {
        console.error("Fetch dpp tests error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch DPP tests");
    }
});

// Get Video URL (legacy)
app.get('/api/get-video-url', async (req, res) => {
    const { batchId, subjectId, childId } = req.query;
    const decryptedBatchId = safeDecrypt(batchId);
    const decryptedSubjectId = safeDecrypt(subjectId);
    const decryptedChildId = safeDecrypt(childId);
    try {
        const targetURL = `https://www.squidstudy.eu.org/api/get-video-url?batchId=${decryptedBatchId}&subjectId=${decryptedSubjectId}&childId=${decryptedChildId}`;
        const response = await axios.get(targetURL, { headers: COOKIE_HEADERS });
        sendEncrypted(res, response.data);
    } catch (error) {
        console.error("Fetch video URL error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch legacy video URL");
    }
});

// Video Timeline Slides
app.get('/api/video-timeline', async (req, res) => {
    const { batchId, subjectId, videoId } = req.query;
    const decryptedBatchId = safeDecrypt(batchId);
    const decryptedSubjectId = safeDecrypt(subjectId);
    const decryptedVideoId = safeDecrypt(videoId);
    try {
        const response = await axios.get(`https://www.squidstudy.eu.org/api/timeline?batchId=${decryptedBatchId}&subjectId=${decryptedSubjectId}&videoId=${decryptedVideoId}`, { headers: COOKIE_HEADERS });
        sendEncrypted(res, response.data);
    } catch (error) {
        console.error("Fetch video timeline error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch timeline slides");
    }
});

// Video Comments
app.get('/api/comments', async (req, res) => {
    const { videoId, page } = req.query;
    const decryptedVideoId = safeDecrypt(videoId);
    try {
        const response = await axios.get(`https://www.squidstudy.eu.org/api/comments?videoId=${decryptedVideoId}&page=${page || 1}`, { headers: COOKIE_HEADERS });
        sendEncrypted(res, response.data);
    } catch (error) {
        console.error("Fetch comments error:", error.message);
        sendEncryptedError(res, 500, "Failed to fetch comments stack");
    }
});

// ================= AES-256-CBC ENCRYPTION/DECRYPTION SYSTEM =================
const SECRET_KEY = "rangexcoder_secret_key_fixed_32b"; 
const IV_LENGTH = 16; 

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + '-' + encrypted.toString('hex');
}

function decrypt(text) {
    try {
        let separator = text.includes('-') ? '-' : ':';
        let textParts = text.split(separator);
        if (textParts.length < 2) return null;
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(separator), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return null;
    }
}

function safeEncrypt(text) {
    if (!text) return text;
    try {
        return encrypt(String(text));
    } catch (e) {
        return text;
    }
}

function safeDecrypt(text) {
    if (!text) return text;
    try {
        const decrypted = decrypt(String(text));
        return decrypted || text;
    } catch (e) {
        return text;
    }
}

function renderConnectionErrorPage(res) {
    res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Connection Error — RangeXCoder</title>
            <style>
                body {
                    background: #0b0c16;
                    color: #ffffff;
                    font-family: 'Poppins', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                }
                .error-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                h2 {
                    color: #ff3366;
                    margin-top: 0;
                }
                p {
                    color: #a0a5c0;
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 24px;
                }
                .btn {
                    background: #5c5be5;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                }
                .btn:hover {
                    background: #4a49c6;
                }
            </style>
        </head>
        <body>
            <div class="error-card">
                <h2>Connection Error</h2>
                <p>Failed to establish a secure connection to the stream server. Please try reloading or check your connection.</p>
                <button class="btn" onclick="window.location.reload()">Retry Connection</button>
            </div>
        </body>
        </html>
    `);
}

function getLocalRouteForUrl(targetUrl, hostUrl) {
    let localPath = "/schedule-details";
    if (targetUrl.includes("get-dpp-quiz")) {
        localPath = "/get-dpp-quiz";
    } else if (targetUrl.includes("get-test-solution-video")) {
        localPath = "/get-test-solution-video";
    }
    const encryptedToken = encrypt(targetUrl);
    return `${hostUrl}${localPath}?token=${encodeURIComponent(encryptedToken)}`;
}

function encryptUrlsInHtml(html, hostUrl) {
    if (typeof html !== 'string') return html;
    const urlRegex = /(https:\/\/stream\.testuk\.org\/[a-zA-Z0-9_-]+)(\?[^"\s'>]+)/g;
    return html.replace(urlRegex, (match, base, query) => {
        try {
            const fullUrl = base + query;
            const encryptedToken = encrypt(fullUrl);
            let localPath = "/schedule-details";
            if (base.includes("get-dpp-quiz")) {
                localPath = "/get-dpp-quiz";
            } else if (base.includes("get-test-solution-video")) {
                localPath = "/get-test-solution-video";
            }
            return `${hostUrl}${localPath}?token=${encodeURIComponent(encryptedToken)}`;
        } catch (e) {
            return match;
        }
    });
}

// Generate secure encrypted token for target URLs
app.get('/api/get-token', (req, res) => {
    const { type, batchId, subjectId, scheduleId, testId, tag } = req.query;
    const decBatchId = safeDecrypt(batchId);
    const decSubjectId = safeDecrypt(subjectId);
    const decScheduleId = safeDecrypt(scheduleId);
    const decTestId = safeDecrypt(testId);
    const decTag = safeDecrypt(tag);
    
    let targetURL = "";
    if (type === 'video') {
        targetURL = `https://stream.testuk.org/schedule-details?batchId=${decBatchId}&subjectId=${decSubjectId}&scheduleId=${decScheduleId}&tap=video&tag=${decTag || ''}`;
    } else if (type === 'note') {
        targetURL = `https://stream.testuk.org/schedule-details?batchId=${decBatchId}&subjectId=${decSubjectId}&scheduleId=${decScheduleId}&tap=note&noteIndex=0&isDpp=false`;
    } else if (type === 'dpp-pdf') {
        targetURL = `https://stream.testuk.org/schedule-details?batchId=${decBatchId}&subjectId=${decSubjectId}&scheduleId=${decScheduleId}&tap=note&noteIndex=0&isDpp=true`;
    } else if (type === 'dpp-quiz') {
        targetURL = `https://stream.testuk.org/get-dpp-quiz?batchId=${decBatchId}&scheduleId=${decScheduleId}&testId=${decTestId}&tag=${decTag || 'Start'}&isFreeTest=false`;
    }
    
    if (!targetURL) {
        return res.status(400).json({ success: false, message: "Invalid type or parameters" });
    }
    
    try {
        const encryptedToken = encrypt(targetURL);
        res.json({ success: true, token: encryptedToken });
    } catch (error) {
        console.error("Encryption error:", error.message);
        res.status(500).json({ success: false, message: "Failed to secure stream URL" });
    }
});

// Decrypt secure token back to raw target URL
app.get('/api/decrypt-token', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return sendEncryptedError(res, 400, "Token is required");
    }
    const decryptedUrl = decrypt(token);
    if (!decryptedUrl) {
        return sendEncryptedError(res, 400, "Invalid or expired token");
    }
    sendEncrypted(res, { url: decryptedUrl });
});

// Instant redirect (rewriting domain to keep user on our domain)
app.get('/api/go', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send("Access token is missing.");
    }
    const decryptedUrl = decrypt(token);
    if (!decryptedUrl) {
        return res.status(400).send("Invalid or expired access token.");
    }
    
    let localPath = "/schedule-details";
    if (decryptedUrl.includes("get-dpp-quiz")) {
        localPath = "/get-dpp-quiz";
    } else if (decryptedUrl.includes("get-test-solution-video")) {
        localPath = "/get-test-solution-video";
    }
    res.redirect(`${localPath}?token=${encodeURIComponent(token)}`);
});

// Server-side fetching to proxy content and hide domain
app.get('/api/play', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send("Access token is missing.");
    }
    const decryptedUrl = decrypt(token);
    if (!decryptedUrl) {
        return res.status(400).send("Invalid or expired access token.");
    }

    let localPath = "/schedule-details";
    if (decryptedUrl.includes("get-dpp-quiz")) {
        localPath = "/get-dpp-quiz";
    } else if (decryptedUrl.includes("get-test-solution-video")) {
        localPath = "/get-test-solution-video";
    }
    const localFallbackUrl = `${localPath}?token=${encodeURIComponent(token)}`;

    try {
        const response = await axios.get(decryptedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const contentType = response.headers['content-type'] || '';
        const finalUrl = response.request.res.responseUrl;

        if (contentType.includes('text/html')) {
            let html = response.data;
            const hostUrl = req.protocol + '://' + req.get('host');
            if (typeof html === 'string') {
                html = encryptUrlsInHtml(html, hostUrl);
                html = html.replace(/https:\/\/stream\.testuk\.org/g, hostUrl);
                html = html.replace(/https:\/\/stream\.pimaxer\.in/g, `${hostUrl}/stream-proxy`);
            }
            res.send(html);
        } else {
            const hostUrl = req.protocol + '://' + req.get('host');
            const localFinalUrl = getLocalRouteForUrl(finalUrl, hostUrl);
            res.redirect(localFinalUrl);
        }
    } catch (error) {
        console.error("Secure stream proxy failed, redirecting to local fallback URL:", error.message);
        res.redirect(localFallbackUrl);
    }
});

// Proxy route for schedule-details
app.get('/schedule-details', async (req, res) => {
    const { token } = req.query;
    let targetUrl = "";
    
    if (token) {
        targetUrl = decrypt(token);
        if (!targetUrl) {
            return res.status(400).send("Invalid or expired access token.");
        }
    } else {
        const queryParams = new URLSearchParams(req.query).toString();
        targetUrl = `https://stream.testuk.org/schedule-details?${queryParams}`;
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        let html = response.data;
        const hostUrl = req.protocol + '://' + req.get('host');
        if (typeof html === 'string') {
            html = encryptUrlsInHtml(html, hostUrl);
            html = html.replace(/https:\/\/stream\.testuk\.org/g, hostUrl);
            html = html.replace(/https:\/\/stream\.pimaxer\.in/g, `${hostUrl}/stream-proxy`);
        }
        res.send(html);
    } catch (error) {
        console.error("schedule-details proxy failed, rendering error page:", error.message);
        renderConnectionErrorPage(res);
    }
});

// Proxy route for get-dpp-quiz
app.get('/get-dpp-quiz', async (req, res) => {
    const { token } = req.query;
    let targetUrl = "";
    
    if (token) {
        targetUrl = decrypt(token);
        if (!targetUrl) {
            return res.status(400).send("Invalid or expired access token.");
        }
    } else {
        const queryParams = new URLSearchParams(req.query).toString();
        targetUrl = `https://stream.testuk.org/get-dpp-quiz?${queryParams}`;
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        let html = response.data;
        const hostUrl = req.protocol + '://' + req.get('host');
        if (typeof html === 'string') {
            html = encryptUrlsInHtml(html, hostUrl);
            html = html.replace(/https:\/\/stream\.testuk\.org/g, hostUrl);
            html = html.replace(/https:\/\/stream\.pimaxer\.in/g, `${hostUrl}/stream-proxy`);
        }
        res.send(html);
    } catch (error) {
        console.error("get-dpp-quiz proxy failed, rendering error page:", error.message);
        renderConnectionErrorPage(res);
    }
});

async function getPWVideoData(batchId, subjectId, scheduleId, tag) {
    let match = null;
    if (tag) {
        const contentsUrl = `https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents?page=1&contentType=videos&tag=${tag}`;
        const res = await axios.get(contentsUrl, { headers: HEADERS, timeout: 5000 });
        const items = res.data?.data || [];
        match = items.find(item => item._id === scheduleId);
    }
    
    if (!match) {
        // Fallback search
        const topicsUrl = `https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/topics?page=1`;
        const topicsRes = await axios.get(topicsUrl, { headers: HEADERS, timeout: 5000 });
        const topics = topicsRes.data?.data || [];
        
        const reqs = topics.map(t => 
            axios.get(`https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents?page=1&contentType=videos&tag=${t._id}`, { headers: HEADERS, timeout: 5000 })
                .then(res => res.data?.data || [])
                .catch(() => [])
        );
        const results = await Promise.all(reqs);
        for (const items of results) {
            const found = items.find(item => item._id === scheduleId);
            if (found) {
                match = found;
                break;
            }
        }
    }
    
    if (!match) {
        throw new Error("Lecture schedule ID not found in batch contents.");
    }
    
    const videoId = match.videoDetails?._id || match.videoDetails?.id;
    if (!videoId) {
        throw new Error("No videoId found in lecture details.");
    }
    
    let videoRes = null;
    try {
        videoRes = await axios.get(`https://api.penpencil.co/v1/videos/${videoId}`, { headers: HEADERS, timeout: 5000 });
    } catch (e) {
        console.error("Video details fetch error:", e.message);
        throw e;
    }

    const videoUrl = videoRes?.data?.data?.videoUrl;
    if (!videoUrl) {
        throw new Error("No videoUrl returned from PW API.");
    }
    
    const uuidMatch = videoUrl.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (!uuidMatch) {
        throw new Error("Failed to extract UUID from videoUrl.");
    }
    const uuid = uuidMatch[1];
    
    const constructedHlsUrl = `/stream-proxy/${uuid}/master.m3u8`;
    
    return {
        videoData: {
            url: constructedHlsUrl,
            drmType: "ClearKey",
            keys: []
        },
        pwHeaders: {},
        notes: [],
        dppNotes: [],
        topicName: match.topic || "Stream Player",
        slides: []
    };
}

// Get extracted stream data
app.get('/api/video-data', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({ success: false, message: "Access token is missing." });
    }
    const decryptedUrl = decrypt(token);
    if (!decryptedUrl) {
        return res.status(400).json({ success: false, message: "Invalid or expired access token." });
    }

    try {
        const parsedUrl = new URL(decryptedUrl);
        const batchId = parsedUrl.searchParams.get('batchId');
        const subjectId = parsedUrl.searchParams.get('subjectId');
        const scheduleId = parsedUrl.searchParams.get('scheduleId');
        const tag = parsedUrl.searchParams.get('tag');

        if (!batchId || !subjectId || !scheduleId) {
            throw new Error("Missing query parameters in decrypted token URL.");
        }

        const data = await getPWVideoData(batchId, subjectId, scheduleId, tag);
        const encrypted = encryptPayload(data);
        res.json({
            success: true,
            payload: encrypted
        });

    } catch (error) {
        console.error("Video data extraction failed, returning fallback:", error.message);
        const fallbackData = {
            fallbackUrl: decryptedUrl
        };
        const encryptedFallback = encryptPayload(fallbackData);
        res.json({
            success: false,
            message: error.message,
            payload: encryptedFallback
        });
    }
});

// Proxy Solution videos
app.get('/get-test-solution-video', async (req, res) => {
    const { token } = req.query;
    let targetUrl = "";
    
    if (token) {
        targetUrl = decrypt(token);
        if (!targetUrl) {
            return res.status(400).send("Invalid or expired access token.");
        }
    } else {
        const queryParams = new URLSearchParams(req.query).toString();
        targetUrl = `https://stream.testuk.org/get-test-solution-video?${queryParams}`;
    }

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        let html = response.data;
        if (typeof html === 'string') {
            const hostUrl = req.protocol + '://' + req.get('host');
            html = encryptUrlsInHtml(html, hostUrl);
            html = html.replace(/https:\/\/stream\.testuk\.org/g, hostUrl);
            html = html.replace(/https:\/\/stream\.pimaxer\.in/g, `${hostUrl}/stream-proxy`);
        }
        res.send(html);
    } catch (error) {
        console.error("Solution video proxy failed, rendering error page:", error.message);
        renderConnectionErrorPage(res);
    }
});

// Proxy dynamic HLS stream files and video segments from stream.pimaxer.in
app.get(/^\/stream-proxy\/([a-zA-Z0-9_-]+)\/(.+)$/, async (req, res) => {
    const uuid = req.params[0];
    const subPath = req.params[1];
    const extraPath = subPath.split('?')[0];
    const queryParams = new URLSearchParams(req.query).toString();
    const targetUrl = `https://stream.pimaxer.in/${uuid}/${subPath}${queryParams ? '?' + queryParams : ''}`;
    
    try {
        const isM3U8 = extraPath.endsWith('.m3u8') || extraPath.includes('m3u8');
        
        if (isM3U8) {
            const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                responseType: 'text'
            });
            let playlistText = response.data;
            if (typeof playlistText === 'string') {
                const hostUrl = req.protocol + '://' + req.get('host');
                // Rewrite absolute stream URLs if any
                playlistText = playlistText.replace(/https:\/\/stream\.pimaxer\.in/g, `${hostUrl}/stream-proxy`);
            }
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(playlistText);
        } else {
            // Fetch and return binary files (.ts, etc.) using arraybuffer for reliability
            const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                responseType: 'arraybuffer'
            });
            
            if (response.headers['content-type']) {
                res.setHeader('Content-Type', response.headers['content-type']);
            }
            if (response.headers['content-length']) {
                res.setHeader('Content-Length', response.headers['content-length']);
            }
            res.send(response.data);
        }
    } catch (error) {
        console.error("Stream proxy fetch failed:", error.message);
        res.status(404).send("Stream resource not found.");
    }
});

// Proxy route for DRM HLS decryption keys
app.get('/:uuid/hls-key', async (req, res) => {
    const { uuid } = req.params;
    const queryParams = new URLSearchParams(req.query).toString();
    const targetUrl = `https://stream.pimaxer.in/${uuid}/hls-key?${queryParams}`;
    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            responseType: 'arraybuffer'
        });
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        res.send(response.data);
    } catch (error) {
        console.error("DRM Key proxy failed:", error.message);
        res.status(404).send("Key not found.");
    }
});

// ================= COMMUNITY ROUTERS =================

// GET posts
app.get('/api/posts', (req, res) => {
    sendEncrypted(res, { posts: getPosts() });
});

// POST post
app.post('/api/posts', (req, res) => {
    const { name, userClass, content, imageLink } = req.body;
    if (!name || !content) {
        return sendEncryptedError(res, 400, "Name and content are required.");
    }
    const posts = getPosts();
    const newPost = {
        id: crypto.randomUUID(),
        name: name,
        class: userClass || 'General',
        content: content,
        imageLink: imageLink || '',
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        comments: []
    };
    posts.unshift(newPost);
    savePosts(posts);
    
    broadcast({ type: 'new_post', data: newPost });
    sendEncrypted(res, { post: newPost });
});

// POST like toggler
app.post('/api/posts/like', (req, res) => {
    const { postId, clientId } = req.body;
    if (!postId || !clientId) {
        return sendEncryptedError(res, 400, "postId and clientId are required.");
    }
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) {
        return sendEncryptedError(res, 404, "Post not found.");
    }
    
    if (!post.likedBy) post.likedBy = [];
    const idx = post.likedBy.indexOf(clientId);
    if (idx === -1) {
        post.likedBy.push(clientId);
    } else {
        post.likedBy.splice(idx, 1);
    }
    post.likes = post.likedBy.length;
    savePosts(posts);
    
    broadcast({ type: 'like_update', data: { postId: post.id, likes: post.likes, likedBy: post.likedBy } });
    sendEncrypted(res, { likes: post.likes, likedBy: post.likedBy });
});

// POST comment
app.post('/api/posts/comment', (req, res) => {
    const { postId, name, userClass, content } = req.body;
    if (!postId || !name || !content) {
        return sendEncryptedError(res, 400, "postId, name and content are required.");
    }
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) {
        return sendEncryptedError(res, 404, "Post not found.");
    }
    
    const comment = {
        id: crypto.randomUUID(),
        name: name,
        class: userClass || 'General',
        content: content,
        timestamp: new Date().toISOString()
    };
    
    if (!post.comments) post.comments = [];
    post.comments.push(comment);
    savePosts(posts);
    
    broadcast({ type: 'new_comment', data: { postId: post.id, comment: comment } });
    sendEncrypted(res, { comment: comment });
});

// POST admin auth check
app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        sendEncrypted(res, { token: ADMIN_TOKEN });
    } else {
        sendEncryptedError(res, 401, "Invalid administrator password.");
    }
});

// POST admin delete post
app.post('/api/admin/delete-post', (req, res) => {
    const { postId, token } = req.body;
    if (token !== ADMIN_TOKEN) {
        return sendEncryptedError(res, 403, "Unauthorized access.");
    }
    let posts = getPosts();
    const exists = posts.some(p => p.id === postId);
    if (!exists) {
        return sendEncryptedError(res, 404, "Post not found.");
    }
    posts = posts.filter(p => p.id !== postId);
    savePosts(posts);
    
    broadcast({ type: 'delete_post', data: { postId } });
    sendEncrypted(res, {});
});

// Serve HTML routing
app.get('/subjects', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'subjects.html')); });
app.get('/content', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'content.html')); });
app.get('/stream', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'stream.html')); });
app.get('/watch', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'watch.html')); });

server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`   PW Zone Engine Active with Real-Time Community!`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`===================================================`);
});