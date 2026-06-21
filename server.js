const express = require('express');
const cors = require('cors');
const path = require('path');
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

app.get('/api/ping', (req, res) => {
    res.status(200).json({ success: true, message: 'alive' });
});

// WebSocket Connection
wss.on('connection', (ws) => {
    console.log('Client connected to WebSockets community space.');
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to PW Zone Community' }));
});

// Import and mount modular routers
const pwRouter = require('./backend/pw')(wss);
const ntMjRouter = require('./backend/nt_mj');

app.use('/', pwRouter);
app.use('/', ntMjRouter);

// Serve HTML routing for PW
app.get('/pw/batches', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'pw', 'batches.html')); });
app.get('/pw/subjects', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'pw', 'subjects.html')); });
app.get('/pw/content', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'pw', 'content.html')); });
app.get('/pw/stream', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'pw', 'stream.html')); });
app.get('/pw/watch', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'pw', 'watch.html')); });

// Serve HTML routing for NT
app.get('/nexttoppers/batches', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'nexttoppers', 'batches.html')); });

// Serve HTML routing for MJ
app.get('/missonjeet/batches', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'missonjeet', 'batches.html')); });

// Self-ping interval to keep the Render free tier awake
const selfPingUrl = process.env.RENDER_EXTERNAL_URL || 'https://rangexcoder-backend.onrender.com';
setInterval(() => {
    const https = require('https');
    https.get(`${selfPingUrl}/api/ping`, (res) => {
        console.log(`[Self-Ping] Sent keep-awake request. Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error('[Self-Ping] Request failed:', err.message);
    });
}, 10 * 60 * 1000); // 10 minutes

server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`   RangeXCoder Portal Engine Active!`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`===================================================`);
});