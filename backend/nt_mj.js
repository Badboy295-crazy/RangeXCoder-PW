const admin = require("firebase-admin");
const cron = require("node-cron");
const express = require("express"); 
const axios = require("axios");

const router = express.Router();

let db = null;

// 🌐 IMPLEMENTED 3-TIER API SYSTEM (NT 1,2,3 & MJ 1,2,3) 🌐
const API_BASES = {
    nt_api_1: "https://apiserver-m8ea.onrender.com/api/nexttoppers",
    nt_api_2: "https://apis-by-invalid-ayush.onrender.com/new-nt/new-nt/api/nexttoppers",
    nt_api_3: "https://nt-api.eg-a-nm-a-e-sala-zar.workers.dev/api",
    mj_1: "https://apiserver-m8ea.onrender.com/api/missionjeet",
    mj_2: "https://apis-by-invalid-ayush.onrender.com/new-nt/new-nt/api/missionjeet",
    mj_3: "https://mj-api.eg-a-nm-a-e-sala-zar.workers.dev/api"
};

// 🧠 DYNAMIC API URL RESOLVER (PERFECT PARAMETER MAPPING)
function getApiUrls(source, courseId, folderId = null, contentId = null) {
    let baseUrl = API_BASES[source] || API_BASES['nt_api_2'];
    let batchesUrl = `${baseUrl}/batches`;
    let courseDetailsUrl = "";
    let contentUrl = "";
    let detailUrl = "";

    if (source === 'nt_api_3' || source === 'mj_3') {
        courseDetailsUrl = null; 
        contentUrl = folderId ? `${baseUrl}/full-course?course_id=${courseId}&folder_id=${folderId}` : `${baseUrl}/full-course?course_id=${courseId}`;
        detailUrl = contentId ? `${baseUrl}/content-details?course_id=${courseId}&content_id=${contentId}` : "";
    } else if (source === 'nt_api_1' || source === 'mj_1') {
        let isMj = source === 'mj_1';
        let urlParam = isMj ? `course_id=${courseId}` : `courseid=${courseId}`;
        courseDetailsUrl = `${baseUrl}/course-details?${urlParam}`;
        
        if (isMj) {
            contentUrl = folderId ? `${baseUrl}/all-content/${courseId}?id=${folderId}` : `${baseUrl}/all-content/${courseId}`;
        } else {
            contentUrl = folderId ? `${baseUrl}/all-content?courseid=${courseId}&id=${folderId}` : `${baseUrl}/all-content?courseid=${courseId}`;
        }
        detailUrl = contentId ? `${baseUrl}/content-details?content_id=${contentId}&${urlParam}` : "";
    } else {
        // API 2 Logic
        let isMj = source === 'mj_2';
        let urlParam = isMj ? `course_id=${courseId}` : `courseid=${courseId}`;
        courseDetailsUrl = `${baseUrl}/course-details?${urlParam}`;
        
        if (isMj) {
            contentUrl = folderId ? `${baseUrl}/all-content/${courseId}?id=${folderId}` : `${baseUrl}/all-content/${courseId}`;
        } else {
            contentUrl = folderId ? `${baseUrl}/all-content?courseid=${courseId}&id=${folderId}` : `${baseUrl}/all-content?courseid=${courseId}`;
        }
        detailUrl = contentId ? `${baseUrl}/content-details?content_id=${contentId}&${urlParam}` : "";
    }

    return { batchesUrl, courseDetailsUrl, contentUrl, detailUrl };
}

// --- CRASH-PROOF FIREBASE INIT ---
try {
    if (!process.env.FIREBASE_KEY_JSON) {
        console.warn("FIREBASE_KEY_JSON is missing. Waiting for Render Environment Variables...");
    } else {
        const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: "https://rangexcoder-57027-default-rtdb.firebaseio.com"
        });
        db = admin.database();
        console.log("✅ Firebase Database Connected Successfully!");
    }
} catch(error) {
    console.error("❌ Firebase Init Error:", error.message);
}

// --- SECURITY: API TOKEN VALIDATION ---
const PROXY_SECRET = process.env.PROXY_SECRET || "rangeX_secuRE_312"; 

function verifyRequest(req, res, next) {
    const token = req.query.token || req.headers['x-secure-token'];
    if (token !== PROXY_SECRET) {
        return res.status(403).json({ success: false, message: "Unauthorized Request: Security Token Mismatch!" });
    }
    next();
}

function getBaseTarget(req) {
    const source = req.query.source || 'nt_api_2';
    return API_BASES[source] || API_BASES['nt_api_2'];
}

// Helper to fetch JSON data using axios
async function fetchAPI(url) {
    try {
        const response = await axios.get(url, { 
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000 
        });
        return response.data;
    } catch(error) {
        console.error("Fetch API Error for URL:", url, error.message);
        return null;
    }
}

// Proxy routes
router.get('/api/proxy/content-details', verifyRequest, async (req, res) => {
    try {
        const { content_id, courseid } = req.query;
        if(!content_id || !courseid) return res.status(400).json({success: false, message: "Missing params"});
        const source = req.query.source || 'nt_api_2';
        
        const urls = getApiUrls(source, courseid, null, content_id);
        const data = await fetchAPI(urls.detailUrl);
        res.json(data);
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/api/proxy/batches', verifyRequest, async (req, res) => {
    try {
        const source = req.query.source || 'nt_api_2';
        const urls = getApiUrls(source, "null");
        const data = await fetchAPI(urls.batchesUrl);
        res.json(data);
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/api/proxy/course-details', verifyRequest, async (req, res) => {
    try {
        const { courseid } = req.query;
        const source = req.query.source || 'nt_api_2';
        
        const urls = getApiUrls(source, courseid);
        if(!urls.courseDetailsUrl) return res.json({data: null});
        const data = await fetchAPI(urls.courseDetailsUrl);
        res.json(data);
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/api/proxy/all-content', verifyRequest, async (req, res) => {
    try {
        const { courseid, id } = req.query;
        const source = req.query.source || 'nt_api_2';
        
        const urls = getApiUrls(source, courseid, id);
        const data = await fetchAPI(urls.contentUrl);
        res.json(data);
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/api/run-sync', async (req, res) => {
    if(isSyncing) return res.json({ message: "Sync already in progress" });
    startSync();
    syncGlobalLiveLectures();
    res.json({ message: "Background sync triggered manually!" });
});

// ---------------------------
// --- SEQUENTIAL CRON SYNC LOGIC ---
// ---------------------------
let isSyncing = false; 
let syncStartTime = 0; 

async function pushSyncLog(msg, source = 'Auto Sync') {
    if (!db) return;
    try {
        await db.ref('syncLogs').push({ message: msg, timestamp: Date.now(), source: source });
        const logsSnap = await db.ref('syncLogs').orderByChild('timestamp').once('value');
        if(logsSnap.numChildren() > 300) {
            let count = 0;
            let excess = logsSnap.numChildren() - 300;
            let updates = {};
            logsSnap.forEach(child => { if(count < excess) { updates[child.key] = null; count++; } });
            await db.ref('syncLogs').update(updates);
        }
    } catch(e){}
}

// 🔥 GLOBAL INDEPENDENT LIVE LECTURE SYNC 🔥
async function syncGlobalLiveLectures() {
    if (!db) return;
    try {
        let ntRes = await fetchAPI(`${API_BASES['nt_api_2']}/live`);
        if (ntRes && Array.isArray(ntRes.data)) {
            await db.ref('globalLiveLectures/nexttoppers').set(ntRes.data);
            console.log(`✅ [Next Topper Live] Synced ${ntRes.data.length} lectures.`);
        }

        let mjRes = await fetchAPI(`${API_BASES['mj_2']}/live`);
        if (mjRes && Array.isArray(mjRes.data)) {
            await db.ref('globalLiveLectures/missionjeet').set(mjRes.data);
            console.log(`✅ [Mission Jeet Live] Synced ${mjRes.data.length} lectures.`);
        }
        
    } catch(e) {
        console.error("Global Live Sync Error:", e);
    }
}

// 🔥 DYNAMIC FOLDER CREATOR (Absolute Sync Isolation) 🔥
async function getOrCreateSection(batchFbId, subjectFbId, parentFolderId, folderName, sectionOriginalId, subjectCache, folderApiIndex = 100) {
    if (!db) return null;
    let sectionKey = `${subjectFbId}_${(parentFolderId||'root')}_${String(sectionOriginalId)}`;
    
    let sectionFbId = subjectCache.sections[String(sectionOriginalId)] || 
                      subjectCache.sectionKeys[sectionKey] || 
                      Object.keys(subjectCache.folderNames || {}).find(k => subjectCache.folderNames[k] === `${parentFolderId || 'root'}_${folderName.trim().toLowerCase()}`);
    
    if(!sectionFbId) {
        const sectionRef = await db.ref('sections').push({
            batchId: batchFbId, subjectId: subjectFbId, 
            parentFolderId: parentFolderId || subjectFbId, 
            name: folderName, 
            originalId: String(sectionOriginalId), 
            order: folderApiIndex, 
            createdAt: Date.now(), isHidden: false 
        });
        sectionFbId = sectionRef.key;
        
        // Update cache instantly to prevent loop duplicates
        subjectCache.sections[String(sectionOriginalId)] = sectionFbId; 
        subjectCache.sectionKeys[sectionKey] = sectionFbId;
        subjectCache.folderNames[sectionFbId] = `${parentFolderId || 'root'}_${folderName.trim().toLowerCase()}`;
    } else {
        await db.ref('sections/' + sectionFbId).update({ order: folderApiIndex }); // Update strict sequence
    }
    return sectionFbId;
}

// 🚀 STRICT SEQUENTIAL ULTRA FAST FETCH 🚀
async function processSequentiallyIntoSection(filesArray, parentFolderId, apiSource, baseUrl, apiCourseId, subjectFbId, batchFbId, processedEntities, subjectCache, isSilent = false) {
    if (!db) return;
    if(!filesArray || filesArray.length === 0) return;

    for (let i = 0; i < filesArray.length; i++) {
        let item = filesArray[i];
        let f = item.data || {};
        let title = (item.title || f.title || 'Untitled').trim();
        let rawId = item.entity_id || item.id || f.id;
        
        let safeStr = (title + (item.url || f.file_url || f.url || '')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
        let eid = String(rawId || `det_${safeStr}_${i}`);
        
        let matchByNameKey = Object.keys(subjectCache.contentNames || {}).find(k => subjectCache.contentNames[k] === `${parentFolderId}_${title.toLowerCase()}`);
        let existingRecordKey = subjectCache.entityToKey[eid] || matchByNameKey; 

        let finalUrl = item.url || f.file_url || f.url || '';
        let fileTypeStr = String(item.file_type || f.file_type || item.content_type || f.content_type || '').toLowerCase();
        let isVideoExt = item.video_type || f.video_type;
        let rootDUrls = f.download_urls || item.download_urls;

        if(!finalUrl || finalUrl.trim() === '') {
            let fetchId = rawId;
            if(fetchId && !String(fetchId).startsWith('fallback')) {
                try {
                    let urls = getApiUrls(apiSource, apiCourseId, null, fetchId);
                    if(urls.detailUrl) {
                        let dRes = await fetchAPI(urls.detailUrl); 
                        if(dRes && dRes.data) {
                            let dData = Array.isArray(dRes.data) ? dRes.data[0] : dRes.data;
                            if(dData) {
                                finalUrl = dData.file_url || dData.url || (dData.data && (dData.data.file_url || dData.data.url)) || finalUrl;
                                let deepUrlsStr = dData.download_urls || (dData.data && dData.data.download_urls);
                                
                                if((!finalUrl || !finalUrl.startsWith('http')) && deepUrlsStr) {
                                    try {
                                        let dUrls = typeof deepUrlsStr === 'string' ? JSON.parse(deepUrlsStr) : deepUrlsStr;
                                        if(Array.isArray(dUrls) && dUrls.length > 0) {
                                            let best = dUrls.find(d => String(d.title).includes('720')) || dUrls[dUrls.length - 1];
                                            if(best && best.url) finalUrl = best.url;
                                        }
                                    }catch(e){}
                                }
                            }
                        }
                    }
                } catch(err) {}
            }
        }

        if ((!finalUrl || !finalUrl.startsWith('http')) && rootDUrls) {
            try {
                let dUrlsParsed = typeof rootDUrls === 'string' ? JSON.parse(rootDUrls) : rootDUrls;
                if(Array.isArray(dUrlsParsed) && dUrlsParsed.length > 0) {
                    let best = dUrlsParsed.find(d => String(d.title).includes('720')) || dUrlsParsed[dUrlsParsed.length - 1];
                    if(best && best.url) finalUrl = best.url;
                }
            } catch(e){}
        }

        let isVid = false;
        if (fileTypeStr === '2') isVid = true;
        if (finalUrl.toLowerCase().includes('.m3u8') || finalUrl.toLowerCase().includes('.mp4') || fileTypeStr === 'video' || isVideoExt) isVid = true;
        if (rootDUrls && (typeof rootDUrls === 'string' && rootDUrls.length > 5) || (Array.isArray(rootDUrls) && rootDUrls.length > 0)) isVid = true;
        if (!isVid && finalUrl.length >= 11 && finalUrl.length <= 13 && !finalUrl.includes('http') && !finalUrl.includes(' ')) isVid = true;

        let transformedFinalUrl = finalUrl;
        if (isVid && finalUrl.startsWith('http') && !finalUrl.includes('rangexcoder-mediaplayer') && !finalUrl.includes('youtube.com')) {
            transformedFinalUrl = `https://rangexcoder-mediaplayer.netlify.app/?url=${encodeURIComponent(finalUrl)}`;
        } else if (isVid && finalUrl.length >= 11 && finalUrl.length <= 13 && !finalUrl.includes('http')) {
            transformedFinalUrl = `https://www.youtube.com/watch?v=${finalUrl}`;
        }

        if (existingRecordKey) {
            let existingLink = subjectCache.keyToLink[existingRecordKey];
            let existingOrder = subjectCache.keyToOrder ? subjectCache.keyToOrder[existingRecordKey] : null;
            let updates = {};
            
            if (transformedFinalUrl && transformedFinalUrl.trim() !== '' && transformedFinalUrl !== existingLink) {
                updates.link = transformedFinalUrl;
                updates.isVideo = isVid;
                subjectCache.keyToLink[existingRecordKey] = transformedFinalUrl; 
            }
            if (existingOrder !== i) {
                updates.order = i; // Enforce exact API matching
            }

            if(Object.keys(updates).length > 0) {
                await db.ref('contents/' + existingRecordKey).update(updates);
                await pushSyncLog(`🔄 Updated for: ${title}`, 'Auto Sync');
            }
            continue; 
        }

        if (processedEntities.has('cnt_'+eid)) continue;
        processedEntities.add('cnt_'+eid);

        subjectCache.entityToKey[eid] = 'temp_new';
        subjectCache.keyToLink['temp_new'] = transformedFinalUrl;

        // Force Order Index Directly mapped from API sequence `i`
        let newItemObj = {
            batchId: batchFbId, subjectId: subjectFbId, sectionId: parentFolderId, title: title, 
            link: transformedFinalUrl, thumbnail: item.thumbnail || f.thumbnail || '', isVideo: isVid,
            source: 'server_sync', order: i, 
            createdAt: Date.now(), entityId: eid, apiCourseId: apiCourseId
        };

        let pushRef = await db.ref('contents').push(newItemObj);
        subjectCache.contentNames[pushRef.key] = `${parentFolderId}_${title.toLowerCase()}`;
    }
}

// 🔥 N-LEVEL RECURSIVE FOLDER ENGINE 🔥
async function recursiveFolderCrawl(currentFolderId, currentFolderName, apiSource, baseUrl, apiCourseId, subjectFbId, batchFbId, processedEntities, subjectCache, parentFolderFbId, folderApiIndex) {
    let urls = getApiUrls(apiSource, apiCourseId, currentFolderId);

    let innerRes = await fetchAPI(urls.contentUrl);
    if(innerRes && innerRes.data && Array.isArray(innerRes.data)) {
        
        let files = innerRes.data.filter(x => x.type !== 'folder' && x.is_folder !== true);
        if(files.length > 0) {
            await processSequentiallyIntoSection(files, parentFolderFbId, apiSource, baseUrl, apiCourseId, subjectFbId, batchFbId, processedEntities, subjectCache, false);
        }

        let subFolders = innerRes.data.filter(x => x.type === 'folder' || x.is_folder === true);
        for(let i=0; i<subFolders.length; i++) {
            let sf = subFolders[i];
            let sfId = sf.entity_id || sf.id;
            if(!processedEntities.has('sec_'+sfId)) {
                processedEntities.add('sec_'+sfId);
                
                let newFolderFbId = await getOrCreateSection(batchFbId, subjectFbId, parentFolderFbId, sf.title, sfId, subjectCache, i);
                await recursiveFolderCrawl(sfId, sf.title, apiSource, baseUrl, apiCourseId, subjectFbId, batchFbId, processedEntities, subjectCache, newFolderFbId, i);
            }
        }
    }
}

async function startSync() {
    if (!db) {
        console.log("⚠️ Firebase database not initialized. Skipping sync.");
        return;
    }

    if(isSyncing) {
        if(Date.now() - syncStartTime > 10 * 60 * 1000) {
            console.log("⚠️ Sync Watchdog: Resetting stuck auto-sync.");
            isSyncing = false;
        } else {
            return;
        }
    }
    
    isSyncing = true;
    syncStartTime = Date.now();

    try {
        const now = Date.now();
        await db.ref('systemStatus/lastSyncTime').set(now);

        const sessionsSnap = await db.ref('sessions').once('value');
        const sessions = sessionsSnap.val() || {};
        for (const [sid, sData] of Object.entries(sessions)) {
            if (now > sData.expiresAt) await db.ref('sessions/' + sid).remove();
        }

        const batchesSnap = await db.ref('batches').once('value');
        const batches = batchesSnap.val() || {};

        for (const [batchId, batchData] of Object.entries(batches)) {
            if (batchData.apiCourseId) {
                // STRICT ISOLATION PER BATCH
                const processedEntities = new Set();
                let apiSource = batchData.apiSource || 'nt_api_2';
                let baseUrl = API_BASES[apiSource] || API_BASES['nt_api_2'];
                
                let urls = getApiUrls(apiSource, batchData.apiCourseId);

                // COMPREHENSIVE BATCH METADATA UPDATE
                if (urls.courseDetailsUrl) {
                    let detailRes = await fetchAPI(urls.courseDetailsUrl);
                    if(detailRes && detailRes.data) {
                        let newDesc = '', newPrice = '', newThumb = '', newTitle = '';
                        let overview = Array.isArray(detailRes.data) ? detailRes.data.find(d => d.type === 'overview') : detailRes.data;
                        
                        if(overview && overview.data) {
                            let lDetails = Array.isArray(overview.data) ? overview.data.find(l => l.layout_type === 'details') : overview.data;
                            if(lDetails && lDetails.layout_data && lDetails.layout_data.length > 0) {
                                let core = lDetails.layout_data[0];
                                newDesc = core.description || core.about || '';
                                newPrice = core.offer_price || core.price || '';
                                newThumb = core.thumbnail || '';
                                newTitle = core.title || core.name || '';
                            }
                        } 
                        if (!newDesc && !Array.isArray(detailRes.data)) {
                            newDesc = detailRes.data.description || detailRes.data.about || (detailRes.data.course_details ? detailRes.data.course_details.description : '');
                            newPrice = detailRes.data.offer_price || detailRes.data.price || '';
                            newThumb = detailRes.data.thumbnail || '';
                            newTitle = detailRes.data.title || detailRes.data.name || '';
                        }

                        let updates = {};
                        if (newDesc && newDesc !== batchData.fullDescription) updates.fullDescription = newDesc;
                        if (newPrice && newPrice.toString() !== batchData.price) updates.price = newPrice.toString().replace(/[^0-9.]/g, '');
                        if (newThumb && newThumb !== batchData.thumbnail) updates.thumbnail = newThumb;
                        if (newTitle && newTitle !== batchData.name) updates.name = newTitle;

                        if(Object.keys(updates).length > 0) {
                            await db.ref(`batches/${batchId}`).update(updates);
                            await pushSyncLog(`🔄 Auto-Updated Metadata for: ${batchData.name}`, 'Auto Sync');
                        }
                    }
                }

                let subRes = await fetchAPI(urls.contentUrl);
                
                if (subRes && subRes.data) {
                    const subjectCache = { sections: {}, sectionKeys: {}, folderNames: {}, entityToKey: {}, keyToLink: {}, contentNames: {}, keyToOrder: {} };
                    
                    const secSnap = await db.ref('sections').orderByChild('batchId').equalTo(batchId).once('value');
                    if(secSnap.exists()) {
                        Object.entries(secSnap.val()).forEach(([k, v]) => {
                            subjectCache.sections[String(v.originalId)] = k;
                            let sKey = `${v.subjectId}_${(v.parentFolderId||'root')}_${v.originalId}`;
                            subjectCache.sectionKeys[sKey] = k;
                            subjectCache.folderNames[k] = `${v.parentFolderId || 'root'}_${(v.name||'').trim().toLowerCase()}`;
                        });
                    }
                    
                    const cntSnap = await db.ref('contents').orderByChild('batchId').equalTo(batchId).once('value');
                    if(cntSnap.exists()) {
                        Object.entries(cntSnap.val()).forEach(([k, v]) => {
                            if(v.entityId) subjectCache.entityToKey[String(v.entityId)] = k;
                            subjectCache.keyToLink[k] = v.link;
                            subjectCache.keyToOrder[k] = v.order;
                            subjectCache.contentNames[k] = `${v.sectionId}_${(v.title||'').trim().toLowerCase()}`;
                        });
                    }

                    const rootOrphanFiles = subRes.data.filter(s => s.type !== 'folder' && s.is_folder !== true);
                    if(rootOrphanFiles.length > 0) {
                        let miscSubjectId;
                        const fbSubSnap = await db.ref('subjects').orderByChild('batchId').equalTo(batchId).once('value');
                        const fbSubs = fbSubSnap.val() || {};
                        miscSubjectId = Object.keys(fbSubs).find(k => fbSubs[k].name === "Direct Course Content");
                        
                        if(!miscSubjectId) {
                            let newSub = await db.ref('subjects').push({ batchId: batchId, name: "Direct Course Content", order: -1, icon: 'fa-layer-group', createdAt: Date.now() });
                            miscSubjectId = newSub.key;
                        }
                        await processSequentiallyIntoSection(rootOrphanFiles, miscSubjectId, apiSource, baseUrl, batchData.apiCourseId, miscSubjectId, batchId, processedEntities, subjectCache, false);
                    }

                    const validSubjects = subRes.data.filter(s => s.type === 'folder' || s.is_folder === true);

                    // ✅ FIX: Fetch subjects ONCE outside the loop to avoid N repeated Firebase queries per sync
                    const fbSubSnapOnce = await db.ref('subjects').orderByChild('batchId').equalTo(batchId).once('value');
                    let existingSubsMap = {}; // name.toLowerCase() -> fbId
                    if (fbSubSnapOnce.exists()) {
                        Object.entries(fbSubSnapOnce.val()).forEach(([k, v]) => {
                            existingSubsMap[(v.name || '').trim().toLowerCase()] = k;
                        });
                    }

                    for (let i = 0; i < validSubjects.length; i++) {
                        let sub = validSubjects[i];
                        let subCleanName = (sub.title || '').trim().toLowerCase();
                        let subjectFbId = existingSubsMap[subCleanName];
                        
                        if(!subjectFbId) {
                            let newSub = await db.ref('subjects').push({ batchId: batchId, name: sub.title.trim(), order: i, icon: 'fa-folder-open', createdAt: Date.now() });
                            subjectFbId = newSub.key;
                            existingSubsMap[subCleanName] = subjectFbId; // update local map
                        } else {
                            await db.ref('subjects/' + subjectFbId).update({ order: i }); // Blind strictly to API array index
                        }
                        
                        await recursiveFolderCrawl(sub.entity_id || sub.id, sub.title, apiSource, baseUrl, batchData.apiCourseId, subjectFbId, batchId, processedEntities, subjectCache, subjectFbId, i);
                    }
                }
            }
        }
    } catch(e) {
        console.error("Sync Engine Error:", e);
    } finally {
        isSyncing = false; 
    }
}

// ✅ SAFE CRON: Runs every 1 minute, but skips if previous sync is still running
cron.schedule('* * * * *', async () => {
    if (!db) return;
    if (isSyncing) {
        console.log(`[${new Date().toLocaleTimeString()}] ⏭️  Skipping — previous sync still running.`);
        return;
    }
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 1-Min Auto Dual-API Sync Started...`);
    startSync();
    syncGlobalLiveLectures();
});

console.log("🚀 Next Toppers & Mission Jeet sync router loaded.");

module.exports = router;
