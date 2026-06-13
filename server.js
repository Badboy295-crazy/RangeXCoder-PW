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
const ADMIN_PASSWORD = "pwzoneadmin123";
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

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
    console.log('Client connected to WebSockets community Lounge.');
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to PW Zone Lounge' }));
});

// ================= EXISTING LOGIC & APIS =================

// Fetch all batches
app.get('/api/batches', async (req, res) => {
    try {
        const response = await axios.get("https://rarestudy.github.io/rarestudy/batches.json?v=1781102563428", { timeout: 5000 });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch batches error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch batches from source URL" });
    }
});

// Fetch batch details
app.get('/api/batch-details', async (req, res) => {
    const { batchId } = req.query;
    try {
        const response = await axios.get(`https://api.penpencil.co/v3/batches/${batchId}/details`, { headers: HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch batch details error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch batch details" });
    }
});

// Fetch today's schedule
app.get('/api/todays-schedule', async (req, res) => {
    const { batchId } = req.query;
    try {
        // Redirecting to Penpencil API for dynamic schedule
        const response = await axios.get(`https://api.penpencil.co/v2/batches/${batchId}/todays-schedule`, { headers: HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch todays schedule error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch schedule" });
    }
});

// Fetch topics / chapters
app.get('/api/topics', async (req, res) => {
    const { batchId, subjectId, page } = req.query;
    try {
        const targetURL = `https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/topics?page=${page || 1}`;
        const response = await axios.get(targetURL, { headers: HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch topics error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch topics" });
    }
});

// Fetch subject contents (lectures, notes, DPPs)
app.get('/api/contents', async (req, res) => {
    const { batchId, subjectId, contentType, tag, page } = req.query;
    try {
        const targetURL = `https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents?page=${page || 1}&contentType=${contentType}&tag=${tag}`;
        const response = await axios.get(targetURL, { headers: HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch contents error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch contents" });
    }
});

// Fetch DPP tests list
app.get('/api/dpp-tests', async (req, res) => {
    const { batchId, batchSubjectId, chapterId, page } = req.query;
    try {
        const targetURL = `https://api.penpencil.co/v3/test-service/tests/dpp?batchId=${batchId}&batchSubjectId=${batchSubjectId}&chapterId=${chapterId}&isSubjective=false&page=${page || 1}`;
        const response = await axios.get(targetURL, { headers: HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch dpp tests error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch DPP tests" });
    }
});

// Get Video URL (legacy)
app.get('/api/get-video-url', async (req, res) => {
    const { batchId, subjectId, childId } = req.query;
    try {
        const targetURL = `https://www.squidstudy.eu.org/api/get-video-url?batchId=${batchId}&subjectId=${subjectId}&childId=${childId}`;
        const response = await axios.get(targetURL, { headers: COOKIE_HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch video URL error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch legacy video URL" });
    }
});

// Video Timeline Slides
app.get('/api/video-timeline', async (req, res) => {
    const { batchId, subjectId, videoId } = req.query;
    try {
        const response = await axios.get(`https://www.squidstudy.eu.org/api/timeline?batchId=${batchId}&subjectId=${subjectId}&videoId=${videoId}`, { headers: COOKIE_HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch video timeline error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch timeline slides" });
    }
});

// Video Comments
app.get('/api/comments', async (req, res) => {
    const { videoId, page } = req.query;
    try {
        const response = await axios.get(`https://www.squidstudy.eu.org/api/comments?videoId=${videoId}&page=${page || 1}`, { headers: COOKIE_HEADERS });
        res.json(response.data);
    } catch (error) {
        console.error("Fetch comments error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch comments stack" });
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
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    try {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return null;
    }
}

// Generate secure encrypted token for target URLs
app.get('/api/get-token', (req, res) => {
    const { type, batchId, subjectId, scheduleId, testId, tag } = req.query;
    
    let targetURL = "";
    if (type === 'video') {
        targetURL = `https://stream.testuk.org/schedule-details?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}&tap=video&tag=${tag || ''}`;
    } else if (type === 'note') {
        targetURL = `https://stream.testuk.org/schedule-details?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}&tap=note&noteIndex=0&isDpp=false`;
    } else if (type === 'dpp-pdf') {
        targetURL = `https://stream.testuk.org/schedule-details?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}&tap=note&noteIndex=0&isDpp=true`;
    } else if (type === 'dpp-quiz') {
        targetURL = `https://stream.testuk.org/get-dpp-quiz?batchId=${batchId}&scheduleId=${scheduleId}&testId=${testId}&tag=${tag || 'Start'}&isFreeTest=false`;
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
        return res.status(400).json({ success: false, message: "Token is required" });
    }
    const decryptedUrl = decrypt(token);
    if (!decryptedUrl) {
        return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }
    res.json({ success: true, url: decryptedUrl });
});

// Instant redirect
app.get('/api/go', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send("Access token is missing.");
    }
    const decryptedUrl = decrypt(token);
    if (!decryptedUrl) {
        return res.status(400).send("Invalid or expired access token.");
    }
    res.redirect(decryptedUrl);
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

    try {
        const response = await axios.get(decryptedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const contentType = response.headers['content-type'] || '';
        const finalUrl = response.request.res.responseUrl;

        if (contentType.includes('text/html')) {
            res.send(response.data);
        } else {
            res.redirect(finalUrl);
        }
    } catch (error) {
        console.error("Secure stream proxy failed, falling back to direct redirect:", error.message);
        res.redirect(decryptedUrl);
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
    
    const targetTag = tag || match.tags?.[0]?._id || match.topicId;
    let rawNotes = [];
    let rawDpps = [];
    let videoRes = null;

    try {
        const [vRes, notesRes, dppsRes] = await Promise.all([
            axios.get(`https://api.penpencil.co/v1/videos/${videoId}`, { headers: HEADERS, timeout: 5000 }),
            targetTag ? axios.get(`https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents?page=1&contentType=notes&tag=${targetTag}`, { headers: HEADERS, timeout: 5000 }).catch(() => null) : null,
            targetTag ? axios.get(`https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents?page=1&contentType=DppNotes&tag=${targetTag}`, { headers: HEADERS, timeout: 5000 }).catch(() => null) : null
        ]);
        videoRes = vRes;
        rawNotes = notesRes?.data?.data || [];
        rawDpps = dppsRes?.data?.data || [];
    } catch (e) {
        console.error("Parallel details and notes fetch error:", e.message);
        if (!videoRes) {
            videoRes = await axios.get(`https://api.penpencil.co/v1/videos/${videoId}`, { headers: HEADERS, timeout: 5000 });
        }
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
    
    const constructedHlsUrl = `https://stream.pimaxer.in/${uuid}/master.m3u8`;
    
    const parseNotes = (items) => {
        const result = [];
        for (const item of items) {
            const hw = item.homeworkIds?.[0];
            if (hw) {
                const att = hw.attachmentIds?.[0];
                if (att) {
                    const fileKey = att.key;
                    const url = fileKey ? `${att.baseUrl || "https://static.pw.live/"}${fileKey}` : "";
                    result.push({
                        name: hw.topic || att.name,
                        url: url
                    });
                }
            }
        }
        return result;
    };
    
    const notes = parseNotes(rawNotes);
    const dppNotes = parseNotes(rawDpps);
    
    return {
        videoData: {
            url: constructedHlsUrl,
            drmType: "ClearKey",
            keys: []
        },
        pwHeaders: {},
        notes: notes,
        dppNotes: dppNotes,
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
        res.json({
            success: true,
            ...data
        });

    } catch (error) {
        console.error("Video data extraction failed, returning fallback:", error.message);
        res.json({
            success: false,
            message: error.message,
            fallbackUrl: decryptedUrl
        });
    }
});

// Proxy Solution videos
app.get('/get-test-solution-video', async (req, res) => {
    const queryParams = new URLSearchParams(req.query).toString();
    const targetUrl = `https://stream.testuk.org/get-test-solution-video?${queryParams}`;
    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        res.send(response.data);
    } catch (error) {
        console.error("Solution video proxy failed, falling back to direct redirect:", error.message);
        res.redirect(targetUrl);
    }
});

// ================= COMMUNITY ROUTERS =================

// GET posts
app.get('/api/posts', (req, res) => {
    res.json({ success: true, posts: getPosts() });
});

// POST post
app.post('/api/posts', (req, res) => {
    const { name, userClass, content, imageLink } = req.body;
    if (!name || !content) {
        return res.status(400).json({ success: false, message: "Name and content are required." });
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
    res.json({ success: true, post: newPost });
});

// POST like toggler
app.post('/api/posts/like', (req, res) => {
    const { postId, clientId } = req.body;
    if (!postId || !clientId) {
        return res.status(400).json({ success: false, message: "postId and clientId are required." });
    }
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) {
        return res.status(404).json({ success: false, message: "Post not found." });
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
    res.json({ success: true, likes: post.likes, likedBy: post.likedBy });
});

// POST comment
app.post('/api/posts/comment', (req, res) => {
    const { postId, name, userClass, content } = req.body;
    if (!postId || !name || !content) {
        return res.status(400).json({ success: false, message: "postId, name and content are required." });
    }
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) {
        return res.status(404).json({ success: false, message: "Post not found." });
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
    res.json({ success: true, comment: comment });
});

// POST admin auth check
app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.status(401).json({ success: false, message: "Invalid administrator password." });
    }
});

// POST admin delete post
app.post('/api/admin/delete-post', (req, res) => {
    const { postId, token } = req.body;
    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({ success: false, message: "Unauthorized access." });
    }
    let posts = getPosts();
    const exists = posts.some(p => p.id === postId);
    if (!exists) {
        return res.status(404).json({ success: false, message: "Post not found." });
    }
    posts = posts.filter(p => p.id !== postId);
    savePosts(posts);
    
    broadcast({ type: 'delete_post', data: { postId } });
    res.json({ success: true });
});

// Serve HTML routing
app.get('/subjects', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'subjects.html')); });
app.get('/content', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'content.html')); });
app.get('/stream', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'stream.html')); });
app.get('/watch', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'watch.html')); });

server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`   PW Zone Engine Active with Real-Time Lounge!`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`===================================================`);
});