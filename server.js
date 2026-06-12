const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Fetch all batches - Updated to new dynamic link
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
        const response = await axios.get(`https://api.penpencil.co/v1/batches/${batchId}/todays-schedule`, { headers: HEADERS });
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



// Get Video URL (fallback or legacy)
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
const SECRET_KEY = "rangexcoder_secret_key_fixed_32b"; // Exactly 32 characters
const IV_LENGTH = 16; // AES block size

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

// Instant redirect - decrypts and immediately 302 redirects, no external fetch
app.get('/api/go', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send("Access token is missing.");
    }
    const decryptedUrl = decrypt(token);
    if (!decryptedUrl) {
        return res.status(400).send("Invalid or expired access token.");
    }
    // Instant redirect, no server-side fetch or proxy attempt
    res.redirect(decryptedUrl);
});

// Server-side fetching to proxy content and hide stream.testuk.org domain
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
            // Serve the player/quiz HTML directly from our domain
            res.send(response.data);
        } else {
            // Redirect directly to static files (like PDFs on PW CDN)
            res.redirect(finalUrl);
        }
    } catch (error) {
        console.error("Secure stream proxy failed, falling back to direct redirect:", error.message);
        // Fail-safe fallback: redirect directly to the target URL so it plays anyway
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
        // Fallback: parallel search over all topics
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
    
    const videoRes = await axios.get(`https://api.penpencil.co/v1/videos/${videoId}`, { headers: HEADERS, timeout: 5000 });
    const videoUrl = videoRes.data?.data?.videoUrl;
    if (!videoUrl) {
        throw new Error("No videoUrl returned from PW API.");
    }
    
    const uuidMatch = videoUrl.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (!uuidMatch) {
        throw new Error("Failed to extract UUID from videoUrl.");
    }
    const uuid = uuidMatch[1];
    
    const constructedHlsUrl = `https://stream.pimaxer.in/${uuid}/master.m3u8`;
    
    // Fetch notes & DPPs in parallel
    const targetTag = tag || match.tags?.[0]?._id || match.topicId;
    let rawNotes = [];
    let rawDpps = [];
    
    if (targetTag) {
        try {
            const [notesRes, dppsRes] = await Promise.all([
                axios.get(`https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents?page=1&contentType=notes&tag=${targetTag}`, { headers: HEADERS, timeout: 5000 }).catch(() => null),
                axios.get(`https://api.penpencil.co/v2/batches/${batchId}/subject/${subjectId}/contents?page=1&contentType=DppNotes&tag=${targetTag}`, { headers: HEADERS, timeout: 5000 }).catch(() => null)
            ]);
            rawNotes = notesRes?.data?.data || [];
            rawDpps = dppsRes?.data?.data || [];
        } catch (e) {
            console.error("Notes fetch error:", e.message);
        }
    }
    
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

// Get extracted stream and DRM keys for the custom player
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

// Proxy DPP quiz solution videos to keep them on our domain
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

// Serve HTML routing
app.get('/subjects', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'subjects.html')); });
app.get('/content', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'content.html')); });
app.get('/stream', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'stream.html')); });
app.get('/watch', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'watch.html')); });

app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`   RangeXCoder System Engine Active & Fully Fixed!`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`===================================================`);
});