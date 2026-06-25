const axios = require('axios');
const express = require('express');
const https = require('https');

// ======================
// CẤU HÌNH
// ======================
const BASE = "https://aibcr.me";
const LOGIN_URL = `${BASE}/login`;
const LOBBY_URL = `${BASE}/ae/lobby`;
const GETNEWRESULT_URL = `${BASE}/baccarat/getnewresult`;

const USERNAME = "Hoang2285";
const PASSWORD = "hoang2010";

const agent = new https.Agent({ rejectUnauthorized: false });
let cookieJar = '';
let baccaratData = [];
let lastUpdate = null;

const sessionData = {};
const lastData = {};
const patternHistory = {};

// ======================
// SESSION AXIOS
// ======================
const session = axios.create({
    baseURL: BASE,
    timeout: 30000,
    httpsAgent: agent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    }
});

// Interceptor lưu cookie
session.interceptors.request.use(config => {
    if (cookieJar) config.headers.Cookie = cookieJar;
    return config;
});

session.interceptors.response.use(res => {
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
        for (const cookie of setCookie) {
            const [name, value] = cookie.split(';')[0].split('=');
            if (cookieJar.includes(`${name}=`)) {
                cookieJar = cookieJar.replace(new RegExp(`${name}=[^;]+;?`), '');
            }
            cookieJar += `${name}=${value}; `;
        }
    }
    return res;
});

// ======================
// LẤY CSRF TOKEN
// ======================
function getCsrfToken(html) {
    const match = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
    return match ? match[1] : null;
}

// ======================
// ĐĂNG NHẬP
// ======================
async function login() {
    try {
        const getResp = await session.get(LOGIN_URL);
        const token = getCsrfToken(getResp.data);
        
        const formData = new URLSearchParams();
        formData.append('username', USERNAME);
        formData.append('password', PASSWORD);
        formData.append('_token', token);
        formData.append('action', 'Login');
        
        const headers = {
            'Referer': LOGIN_URL,
            'Origin': BASE,
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        
        const loginResp = await session.post(LOGIN_URL, formData.toString(), { headers });
        return loginResp.status === 200;
    } catch (error) {
        console.error('Login error:', error.message);
        return false;
    }
}

// ======================
// VÀO LOBBY
// ======================
async function goToLobby() {
    try {
        await session.get(LOBBY_URL);
        return true;
    } catch (error) {
        console.error('Lobby error:', error.message);
        return false;
    }
}

// ======================
// LẤY KẾT QUẢ BACCARAT
// ======================
async function fetchBaccaratData() {
    try {
        let xsrfToken = '';
        const xsrfMatch = cookieJar.match(/XSRF-TOKEN=([^;]+)/);
        if (xsrfMatch) xsrfToken = decodeURIComponent(xsrfMatch[1]);
        
        const headers = {
            'Referer': LOBBY_URL,
            'Origin': BASE,
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        };
        
        const formData = new URLSearchParams();
        formData.append('gameCode', 'ae');
        
        const resp = await session.post(GETNEWRESULT_URL, formData.toString(), { headers });
        
        if (resp.data && resp.data.data) {
            const oldData = { ...baccaratData };
            
            baccaratData = resp.data.data.map(item => ({
                table: item.table_name,
                result: item.result,
                shoeId: item.shoeId || '',
                round: item.round || ''
            }));
            lastUpdate = new Date().toISOString();
            
            for (const item of baccaratData) {
                const tableId = item.table;
                const oldResult = oldData.find(o => o.table === tableId);
                
                if (!sessionData[tableId]) {
                    sessionData[tableId] = 0;
                    patternHistory[tableId] = [];
                }
                
                if (oldResult && oldResult.result !== item.result) {
                    sessionData[tableId]++;
                    // Lưu pattern mới
                    const patterns = detectAllPatterns(item.result);
                    patternHistory[tableId].push({
                        session: sessionData[tableId],
                        patterns: patterns,
                        timestamp: new Date().toISOString()
                    });
                    if (patternHistory[tableId].length > 50) {
                        patternHistory[tableId].shift();
                    }
                } else if (!oldResult) {
                    sessionData[tableId]++;
                }
            }
        }
        
        return baccaratData;
    } catch (error) {
        console.error('Fetch error:', error.message);
        return [];
    }
}

// ============================================================
// NHẬN DIỆN CỰC NHIỀU CẦU BCR (25+ LOẠI CẦU)
// ============================================================

function detectAllPatterns(history) {
    if (!history || history.length < 3) return { patterns: [], count: 0 };
    
    const arr = history.split('');
    const detected = [];
    
    // ===== 1. CẦU DÂY (STREAK) =====
    let currentStreak = 1;
    let streakChar = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i-1]) {
            currentStreak++;
        } else {
            if (currentStreak >= 3) {
                detected.push({
                    type: 'DÂY',
                    value: streakChar,
                    length: currentStreak,
                    desc: `Dây ${streakChar === 'B' ? 'Banker' : streakChar === 'P' ? 'Player' : 'Tie'} x${currentStreak}`
                });
            }
            currentStreak = 1;
            streakChar = arr[i];
        }
    }
    if (currentStreak >= 3) {
        detected.push({
            type: 'DÂY',
            value: streakChar,
            length: currentStreak,
            desc: `Dây ${streakChar === 'B' ? 'Banker' : streakChar === 'P' ? 'Player' : 'Tie'} x${currentStreak}`
        });
    }
    
    // ===== 2. CẦU ĐAN XEN (ZIGZAG) =====
    let zigzagCount = 0;
    let zigzagStart = 0;
    for (let i = 1; i < arr.length - 1; i++) {
        if (arr[i] !== arr[i-1] && arr[i] !== arr[i+1]) {
            zigzagCount++;
            if (zigzagCount === 1) zigzagStart = i - 1;
        }
    }
    if (zigzagCount >= 3) {
        detected.push({
            type: 'ĐAN XEN',
            value: `${arr[zigzagStart]}↔${arr[zigzagStart+1]}`,
            length: zigzagCount,
            desc: `Đan xen ${zigzagCount} lần (${arr[zigzagStart]}↔${arr[zigzagStart+1]})`
        });
    }
    
    // ===== 3. CẦU 2-2 =====
    let twoTwoCount = 0;
    let twoTwoChar = '';
    for (let i = 1; i < arr.length - 2; i += 2) {
        if (arr[i] === arr[i-1] && arr[i+1] === arr[i+2]) {
            twoTwoCount++;
            twoTwoChar = arr[i];
        }
    }
    if (twoTwoCount >= 2) {
        detected.push({
            type: '2-2',
            value: twoTwoChar,
            length: twoTwoCount,
            desc: `Cầu 2-2 (${twoTwoChar === 'B' ? 'Banker' : 'Player'}) x${twoTwoCount}`
        });
    }
    
    // ===== 4. CẦU 3-3 =====
    let threeThreeCount = 0;
    let threeThreeChar = '';
    for (let i = 2; i < arr.length - 3; i += 3) {
        if (arr[i] === arr[i-1] && arr[i] === arr[i-2] &&
            arr[i+1] === arr[i+2] && arr[i+1] === arr[i+3]) {
            threeThreeCount++;
            threeThreeChar = arr[i];
        }
    }
    if (threeThreeCount >= 1) {
        detected.push({
            type: '3-3',
            value: threeThreeChar,
            length: threeThreeCount,
            desc: `Cầu 3-3 (${threeThreeChar === 'B' ? 'Banker' : 'Player'})`
        });
    }
    
    // ===== 5. CẦU 1-2-3 =====
    for (let i = 0; i < arr.length - 6; i++) {
        if (arr[i] !== arr[i+1] &&
            arr[i+1] === arr[i+2] &&
            arr[i+2] !== arr[i+3] &&
            arr[i+3] === arr[i+4] &&
            arr[i+4] === arr[i+5]) {
            detected.push({
                type: '1-2-3',
                value: `${arr[i]}${arr[i+1]}${arr[i+3]}`,
                length: 6,
                desc: `Cầu 1-2-3: ${arr[i]} → ${arr[i+1]}${arr[i+1]} → ${arr[i+3]}${arr[i+3]}${arr[i+3]}`
            });
            break;
        }
    }
    
    // ===== 6. CẦU 2-1-2 =====
    for (let i = 0; i < arr.length - 5; i++) {
        if (arr[i] === arr[i+1] &&
            arr[i+1] !== arr[i+2] &&
            arr[i+2] === arr[i+3] &&
            arr[i+3] === arr[i+4]) {
            detected.push({
                type: '2-1-2',
                value: `${arr[i]}${arr[i+2]}`,
                length: 5,
                desc: `Cầu 2-1-2: ${arr[i]}${arr[i]} → ${arr[i+2]} → ${arr[i+3]}${arr[i+3]}`
            });
            break;
        }
    }
    
    // ===== 7. CẦU 1-1-1-1 (HARMONIC) =====
    let harmonicCount = 0;
    for (let i = 0; i < arr.length - 3; i++) {
        if (arr[i] !== arr[i+1] && arr[i+1] !== arr[i+2] && arr[i+2] !== arr[i+3]) {
            harmonicCount++;
        }
    }
    if (harmonicCount >= 3) {
        detected.push({
            type: 'HARMONIC',
            value: arr.slice(-4).join(''),
            length: harmonicCount,
            desc: `Harmonic ${harmonicCount} lần: ${arr.slice(-4).join('')}`
        });
    }
    
    // ===== 8. CẦU 4-4 =====
    let fourFourCount = 0;
    let fourFourChar = '';
    for (let i = 3; i < arr.length - 4; i += 4) {
        if (arr[i] === arr[i-1] && arr[i] === arr[i-2] && arr[i] === arr[i-3] &&
            arr[i+1] === arr[i+2] && arr[i+1] === arr[i+3] && arr[i+1] === arr[i+4]) {
            fourFourCount++;
            fourFourChar = arr[i];
        }
    }
    if (fourFourCount >= 1) {
        detected.push({
            type: '4-4',
            value: fourFourChar,
            length: fourFourCount,
            desc: `Cầu 4-4 (${fourFourChar === 'B' ? 'Banker' : 'Player'})`
        });
    }
    
    // ===== 9. CẦU FIBONACCI =====
    const fib = [1, 1, 2, 3, 5, 8];
    for (let i = 0; i < fib.length - 1; i++) {
        const pos1 = arr.length - fib[i] - 1;
        const pos2 = arr.length - fib[i+1] - 1;
        if (pos1 >= 0 && pos2 >= 0 && arr[pos1] === arr[pos2]) {
            detected.push({
                type: 'FIBONACCI',
                value: arr[pos1],
                length: fib[i+1],
                desc: `Fibonacci: ${arr[pos1]} tại vị trí ${fib[i]} và ${fib[i+1]}`
            });
            break;
        }
    }
    
    // ===== 10. CẦU MẪU (PATTERN) =====
    const patterns = {};
    for (let len = 2; len <= 5; len++) {
        for (let i = 0; i < arr.length - len; i++) {
            const pattern = arr.slice(i, i + len).join('');
            if (!patterns[pattern]) patterns[pattern] = 0;
            patterns[pattern]++;
        }
    }
    let maxPattern = '';
    let maxCount = 0;
    for (const [p, count] of Object.entries(patterns)) {
        if (count > maxCount && count >= 2) {
            maxCount = count;
            maxPattern = p;
        }
    }
    if (maxPattern) {
        detected.push({
            type: 'MẪU',
            value: maxPattern,
            length: maxCount,
            desc: `Mẫu ${maxPattern} lặp lại ${maxCount} lần`
        });
    }
    
    // ===== 11. CẦU XEN KẼ (ALTERNATING) =====
    let altCount = 0;
    let altChar = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] !== arr[i-1]) altCount++;
        else break;
    }
    if (altCount >= 4) {
        detected.push({
            type: 'XEN KẼ',
            value: altChar,
            length: altCount,
            desc: `Xen kẽ ${altCount} lần bắt đầu từ ${altChar === 'B' ? 'Banker' : 'Player'}`
        });
    }
    
    // ===== 12. CẦU ĐỐI XỨNG =====
    for (let i = 0; i < Math.floor(arr.length / 2); i++) {
        if (arr[i] === arr[arr.length - 1 - i]) {
            detected.push({
                type: 'ĐỐI XỨNG',
                value: arr[i],
                length: i + 1,
                desc: `Đối xứng: ${arr.slice(0, i+1).join('')} ... ${arr.slice(-i-1).join('')}`
            });
            break;
        }
    }
    
    // ===== 13. CẦU LẶP =====
    for (let len = 1; len <= 3; len++) {
        const last = arr.slice(-len).join('');
        let count = 0;
        for (let i = 0; i < arr.length - len; i++) {
            if (arr.slice(i, i + len).join('') === last) count++;
        }
        if (count >= 2) {
            detected.push({
                type: 'LẶP',
                value: last,
                length: count,
                desc: `Lặp ${last} ${count} lần`
            });
            break;
        }
    }
    
    // ===== 14. CẦU HÒA (TIE PATTERN) =====
    const tiePositions = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === 'T') tiePositions.push(i);
    }
    if (tiePositions.length >= 2) {
        const gaps = [];
        for (let i = 1; i < tiePositions.length; i++) {
            gaps.push(tiePositions[i] - tiePositions[i-1]);
        }
        if (gaps.every(g => g === gaps[0])) {
            detected.push({
                type: 'TIE',
                value: 'T',
                length: tiePositions.length,
                desc: `Tie xuất hiện cách đều ${gaps[0]} lần`
            });
        }
    }
    
    // ===== 15. CẦU MARKOV =====
    const markov = { 'B': { 'B': 0, 'P': 0, 'T': 0 }, 'P': { 'B': 0, 'P': 0, 'T': 0 }, 'T': { 'B': 0, 'P': 0, 'T': 0 } };
    for (let i = 0; i < arr.length - 1; i++) {
        if (markov[arr[i]] && markov[arr[i]][arr[i+1]] !== undefined) {
            markov[arr[i]][arr[i+1]]++;
        }
    }
    const lastChar = arr[arr.length - 1];
    const trans = markov[lastChar];
    if (trans) {
        const total = trans.B + trans.P + trans.T;
        if (total > 0) {
            let maxTrans = 0;
            let maxChar = 'B';
            for (const [key, val] of Object.entries(trans)) {
                if (val > maxTrans) {
                    maxTrans = val;
                    maxChar = key;
                }
            }
            if (maxTrans / total > 0.4) {
                detected.push({
                    type: 'MARKOV',
                    value: maxChar,
                    length: maxTrans,
                    desc: `Markov: ${lastChar === 'B' ? 'Banker' : 'Player'} → ${maxChar === 'B' ? 'Banker' : 'Player'} (${Math.round(maxTrans/total*100)}%)`
                });
            }
        }
    }
    
    // ===== 16-25. CẦU NÂNG CAO =====
    
    // 16. Cầu xu hướng
    const last10 = arr.slice(-10);
    const bCount = last10.filter(c => c === 'B').length;
    const pCount = last10.filter(c => c === 'P').length;
    if (Math.abs(bCount - pCount) >= 3) {
        detected.push({
            type: 'XU HƯỚNG',
            value: bCount > pCount ? 'B' : 'P',
            length: Math.abs(bCount - pCount),
            desc: `Xu hướng ${bCount > pCount ? 'Banker' : 'Player'} (${Math.abs(bCount-pCount)}/${last10.length})`
        });
    }
    
    // 17. Cầu áp đảo
    const total = arr.length;
    if (bCount / total > 0.6) {
        detected.push({
            type: 'ÁP ĐẢO',
            value: 'B',
            length: Math.round(bCount / total * 100),
            desc: `Banker áp đảo ${Math.round(bCount/total*100)}%`
        });
    }
    if (pCount / total > 0.6) {
        detected.push({
            type: 'ÁP ĐẢO',
            value: 'P',
            length: Math.round(pCount / total * 100),
            desc: `Player áp đảo ${Math.round(pCount/total*100)}%`
        });
    }
    
    // 18. Cầu đột biến
    const recent = arr.slice(-3);
    if (recent.every(c => c === recent[0])) {
        detected.push({
            type: 'ĐỘT BIẾN',
            value: recent[0],
            length: 3,
            desc: `Đột biến ${recent[0] === 'B' ? 'Banker' : 'Player'} x${recent.length}`
        });
    }
    
    // 19. Cầu hồi phục
    if (arr.length > 10) {
        const first5 = arr.slice(0, 5);
        const last5 = arr.slice(-5);
        if (first5.every(c => c === 'B') && last5.every(c => c === 'P')) {
            detected.push({
                type: 'HỒI PHỤC',
                value: 'B→P',
                length: 5,
                desc: 'Hồi phục từ Banker sang Player'
            });
        }
        if (first5.every(c => c === 'P') && last5.every(c => c === 'B')) {
            detected.push({
                type: 'HỒI PHỤC',
                value: 'P→B',
                length: 5,
                desc: 'Hồi phục từ Player sang Banker'
            });
        }
    }
    
    // 20. Cầu song song
    if (arr.length > 8) {
        const half = Math.floor(arr.length / 2);
        const firstHalf = arr.slice(0, half);
        const secondHalf = arr.slice(half);
        let matchCount = 0;
        for (let i = 0; i < Math.min(firstHalf.length, secondHalf.length); i++) {
            if (firstHalf[i] === secondHalf[i]) matchCount++;
        }
        if (matchCount >= 3) {
            detected.push({
                type: 'SONG SONG',
                value: secondHalf.slice(0, matchCount).join(''),
                length: matchCount,
                desc: `Song song ${matchCount} lần`
            });
        }
    }
    
    // ===== TỔNG HỢP =====
    return {
        patterns: detected,
        count: detected.length,
        summary: detected.map(d => d.desc).join(' | ')
    };
}

// ============================================================
// THUẬT TOÁN DỰ ĐOÁN ĐA LUỒNG VIP
// ============================================================

function predictBaccaratVIP(history) {
    if (!history || history.length < 3) {
        return {
            prediction: 'Player',
            banker: 48,
            player: 48,
            tie: 4,
            patterns: [],
            confidence: 50,
            trend: 'Chưa đủ dữ liệu'
        };
    }

    const arr = history.split('');
    const total = arr.length;
    const counts = { B: 0, P: 0, T: 0 };
    for (const c of arr) {
        if (counts[c] !== undefined) counts[c]++;
    }

    // ===== LUỒNG 1: TẦN SUẤT =====
    const pPercent = (counts.P / total) * 100;
    const bPercent = (counts.B / total) * 100;
    const tPercent = (counts.T / total) * 100;

    // ===== LUỒNG 2: STREAK =====
    let maxStreak = 1;
    let streakChar = arr[0];
    let currentStreak = 1;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i-1]) {
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
                streakChar = arr[i];
            }
        } else {
            currentStreak = 1;
        }
    }

    // ===== LUỒNG 3: ZIGZAG =====
    let zigzagCount = 0;
    for (let i = 1; i < arr.length - 1; i++) {
        if (arr[i] !== arr[i-1] && arr[i] !== arr[i+1]) {
            zigzagCount++;
        }
    }

    // ===== LUỒNG 4: PATTERN 2-2 =====
    let pattern22 = 0;
    for (let i = 1; i < Math.min(10, arr.length - 1); i += 2) {
        if (arr[arr.length - i] === arr[arr.length - i - 1]) {
            pattern22++;
        }
    }

    // ===== LUỒNG 5: PATTERN 3-3 =====
    let pattern33 = 0;
    for (let i = 2; i < Math.min(12, arr.length - 1); i += 3) {
        if (arr[arr.length - i] === arr[arr.length - i - 1] &&
            arr[arr.length - i] === arr[arr.length - i - 2]) {
            pattern33++;
        }
    }

    // ===== LUỒNG 6: MARKOV =====
    const markov = { 'B': { 'B': 0, 'P': 0, 'T': 0 }, 'P': { 'B': 0, 'P': 0, 'T': 0 }, 'T': { 'B': 0, 'P': 0, 'T': 0 } };
    for (let i = 0; i < arr.length - 1; i++) {
        if (markov[arr[i]] && markov[arr[i]][arr[i+1]] !== undefined) {
            markov[arr[i]][arr[i+1]]++;
        }
    }
    const lastChar = arr[arr.length - 1];
    const trans = markov[lastChar];
    let markovPred = 'B';
    let markovProb = 0;
    if (trans) {
        const totalTrans = trans.B + trans.P + trans.T;
        if (totalTrans > 0) {
            let maxProb = 0;
            for (const [key, val] of Object.entries(trans)) {
                if (val / totalTrans > maxProb) {
                    maxProb = val / totalTrans;
                    markovPred = key;
                    markovProb = maxProb;
                }
            }
        }
    }

    // ===== LUỒNG 7: MOMENTUM =====
    const values = arr.map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
    let momentum = 0;
    for (let i = 1; i < Math.min(values.length, 10); i++) {
        momentum += values[i] - values[i - 1];
    }

    // ===== LUỒNG 8: ENTROPY =====
    let entropy = 0;
    for (const c of ['B', 'P', 'T']) {
        const prob = counts[c] / total;
        if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    const maxEntropy = Math.log2(3);
    const predictability = 1 - (entropy / maxEntropy);

    // ===== LUỒNG 9: GAP ANALYSIS =====
    const gaps = { 'B': [], 'P': [], 'T': [] };
    const lastPos = { 'B': -1, 'P': -1, 'T': -1 };
    for (let i = 0; i < arr.length; i++) {
        const char = arr[i];
        if (lastPos[char] !== -1) {
            gaps[char].push(i - lastPos[char] - 1);
        }
        lastPos[char] = i;
    }
    const avgGaps = {};
    for (const key of ['B', 'P', 'T']) {
        if (gaps[key].length > 0) {
            avgGaps[key] = gaps[key].reduce((a, b) => a + b, 0) / gaps[key].length;
        } else {
            avgGaps[key] = 2;
        }
    }
    const currentGap = {};
    for (const key of ['B', 'P', 'T']) {
        currentGap[key] = arr.length - 1 - lastPos[key];
    }
    let gapPred = 'B';
    let gapScore = 0;
    for (const key of ['B', 'P', 'T']) {
        const score = currentGap[key] / (avgGaps[key] || 1);
        if (score > gapScore) {
            gapScore = score;
            gapPred = key;
        }
    }

    // ===== TỔNG HỢP ĐIỂM =====
    let bankerScore = 0;
    let playerScore = 0;
    let tieScore = 0;

    // Trọng số các luồng
    const weights = {
        frequency: 0.18,
        streak: 0.15,
        zigzag: 0.10,
        pattern22: 0.10,
        pattern33: 0.08,
        markov: 0.12,
        momentum: 0.10,
        entropy: 0.07,
        gap: 0.10
    };

    // Tần suất
    bankerScore += bPercent * weights.frequency;
    playerScore += pPercent * weights.frequency;
    tieScore += tPercent * weights.frequency;

    // Streak
    if (maxStreak >= 4) {
        if (streakChar === 'B') bankerScore += 100 * weights.streak;
        else if (streakChar === 'P') playerScore += 100 * weights.streak;
        else tieScore += 100 * weights.streak;
    } else {
        bankerScore += 50 * weights.streak;
        playerScore += 50 * weights.streak;
    }

    // Zigzag
    if (zigzagCount >= 4) {
        const last = arr[arr.length - 1];
        if (last === 'P') bankerScore += 100 * weights.zigzag;
        else if (last === 'B') playerScore += 100 * weights.zigzag;
        else tieScore += 100 * weights.zigzag;
    } else {
        bankerScore += 50 * weights.zigzag;
        playerScore += 50 * weights.zigzag;
    }

    // Pattern 2-2
    if (pattern22 >= 2) {
        const last = arr[arr.length - 1];
        if (last === 'P') bankerScore += 100 * weights.pattern22;
        else if (last === 'B') playerScore += 100 * weights.pattern22;
        else tieScore += 100 * weights.pattern22;
    }

    // Pattern 3-3
    if (pattern33 >= 1) {
        const last = arr[arr.length - 1];
        if (last === 'P') bankerScore += 100 * weights.pattern33;
        else if (last === 'B') playerScore += 100 * weights.pattern33;
        else tieScore += 100 * weights.pattern33;
    }

    // Markov
    if (markovProb > 0.4) {
        if (markovPred === 'B') bankerScore += 100 * weights.markov;
        else if (markovPred === 'P') playerScore += 100 * weights.markov;
        else tieScore += 100 * weights.markov;
    }

    // Momentum
    if (Math.abs(momentum) > 1.5) {
        if (momentum > 0) bankerScore += 100 * weights.momentum;
        else playerScore += 100 * weights.momentum;
    }

    // Entropy
    if (predictability > 0.6) {
        const freqPred = bPercent > pPercent ? 'B' : 'P';
        if (freqPred === 'B') bankerScore += 100 * weights.entropy;
        else playerScore += 100 * weights.entropy;
    } else if (predictability < 0.3) {
        tieScore += 100 * weights.entropy;
    }

    // Gap
    if (gapScore > 1.2) {
        if (gapPred === 'B') bankerScore += 100 * weights.gap;
        else if (gapPred === 'P') playerScore += 100 * weights.gap;
        else tieScore += 100 * weights.gap;
    }

    // ===== CHUẨN HÓA =====
    const totalScore = bankerScore + playerScore + tieScore || 1;
    let banker = (bankerScore / totalScore) * 100;
    let player = (playerScore / totalScore) * 100;
    let tie = (tieScore / totalScore) * 100;

    // Điều chỉnh theo xác suất thực tế Baccarat
    banker = banker * 0.7 + 13.76;
    player = player * 0.7 + 13.39;
    tie = tie * 0.7 + 2.86;

    const sum = banker + player + tie;
    banker = (banker / sum) * 100;
    player = (player / sum) * 100;
    tie = (tie / sum) * 100;

    // ===== XÁC ĐỊNH DỰ ĐOÁN =====
    let prediction = 'Player';
    let maxRate = Math.max(banker, player, tie);
    if (maxRate === banker) prediction = 'Banker';
    else if (maxRate === player) prediction = 'Player';
    else prediction = 'Tie';

    // ===== ĐỘ TIN CẬY =====
    const confidence = Math.min(Math.max(maxRate - 10, 25), 85);

    // ===== PHÂN TÍCH CẦU =====
    const patternResult = detectAllPatterns(history);

    // ===== XU HƯỚNG =====
    let trend = 'Cầu đan xen';
    if (bPercent > 55) trend = `Banker áp đảo (${Math.round(bPercent)}%)`;
    else if (pPercent > 55) trend = `Player áp đảo (${Math.round(pPercent)}%)`;
    else if (maxStreak >= 4) trend = `Dây ${streakChar === 'B' ? 'Banker' : 'Player'} x${maxStreak}`;
    else if (zigzagCount >= 4) trend = `Đan xen ${zigzagCount} lần`;
    else if (pattern22 >= 2) trend = `Cầu 2-2 (${pattern22} lần)`;
    else if (pattern33 >= 1) trend = `Cầu 3-3`;

    // Làm tròn
    let b = Math.round(banker);
    let p = Math.round(player);
    let t = Math.round(tie);

    // Đảm bảo không = 50%
    if (b === 50) b = 51;
    if (p === 50) p = 49;
    if (t === 50) t = 5;

    // Đảm bảo tổng = 100%
    const totalRates = b + p + t;
    if (totalRates !== 100) {
        const diff = 100 - totalRates;
        if (b > p && b > t) b += diff;
        else if (p > b && p > t) p += diff;
        else t += diff;
    }

    return {
        prediction: prediction,
        banker: Math.max(b, 3),
        player: Math.max(p, 3),
        tie: Math.max(t, 2),
        patterns: patternResult.patterns,
        patternSummary: patternResult.summary,
        confidence: Math.round(confidence),
        trend: trend,
        stats: {
            B: Math.round(bPercent),
            P: Math.round(pPercent),
            T: Math.round(tPercent),
            maxStreak: maxStreak,
            zigzag: zigzagCount,
            pattern22: pattern22,
            pattern33: pattern33,
            momentum: Math.round(momentum * 10) / 10,
            entropy: Math.round(entropy * 10) / 10,
            predictability: Math.round(predictability * 100)
        }
    };
}

// ======================
// KHỞI TẠO API SERVER
// ======================
const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// ===== API LẤY TẤT CẢ BÀN (CÓ PHIÊN) =====
app.get('/api/baccarat', (req, res) => {
    const dataWithSession = baccaratData.map(item => ({
        ...item,
        session: sessionData[item.table] || 0
    }));
    
    res.json({
        success: true,
        data: dataWithSession,
        lastUpdate: lastUpdate,
        total: baccaratData.length
    });
});

// ===== API LẤY 1 BÀN CỤ THỂ =====
app.get('/api/baccarat/:table', (req, res) => {
    const tableName = req.params.table;
    const found = baccaratData.find(item => item.table === tableName);
    
    if (found) {
        res.json({ 
            success: true, 
            data: {
                ...found,
                session: sessionData[tableName] || 0
            }
        });
    } else {
        res.json({ success: false, message: 'Không tìm thấy bàn ' + tableName });
    }
});

// ===== API DỰ ĐOÁN VIP 1 BÀN =====
app.get('/api/predict/:table', (req, res) => {
    const tableName = req.params.table;
    const found = baccaratData.find(item => item.table === tableName);
    
    if (!found) {
        return res.json({ 
            success: false, 
            message: 'Không tìm thấy bàn ' + tableName 
        });
    }

    const result = predictBaccaratVIP(found.result);
    const session = sessionData[tableName] || 0;
    
    // Lấy 5 pattern gần nhất
    const recentPatterns = patternHistory[tableName] ? patternHistory[tableName].slice(-5) : [];

    res.json({
        success: true,
        table: `Bàn ${tableName}`,
        phiên: session,
        dự_đoán: result.prediction,
        banker: `${result.banker}%`,
        player: `${result.player}%`,
        tie: `${result.tie}%`,
        tỉ_lệ: `${Math.max(result.banker, result.player, result.tie)}%`,
        cầu: result.trend,
        chi_tiết_cầu: result.patternSummary || 'Không có cầu rõ ràng',
        danh_sách_cầu: result.patterns.map(p => p.desc),
        số_lượng_cầu: result.patterns.length,
        confidence: `${result.confidence}%`,
        stats: result.stats,
        lịch_sử_cầu: recentPatterns,
        data_length: found.result.length,
        timestamp: new Date().toISOString(),
        id: '@tranhoang2286'
    });
});

// ===== API DỰ ĐOÁN VIP TẤT CẢ BÀN =====
app.get('/api/predict/all', (req, res) => {
    const results = [];
    
    for (const item of baccaratData) {
        const result = predictBaccaratVIP(item.result);
        const session = sessionData[item.table] || 0;
        
        results.push({
            table: `Bàn ${item.table}`,
            phiên: session,
            dự_đoán: result.prediction,
            banker: `${result.banker}%`,
            player: `${result.player}%`,
            tie: `${result.tie}%`,
            tỉ_lệ: `${Math.max(result.banker, result.player, result.tie)}%`,
            cầu: result.trend,
            số_lượng_cầu: result.patterns.length,
            confidence: `${result.confidence}%`,
            data_length: item.result.length
        });
    }
    
    res.json({
        success: true,
        data: results,
        total: results.length,
        timestamp: new Date().toISOString(),
        id: '@tranhoang2286'
    });
});

// ===== API NHẬN DIỆN CẦU CHI TIẾT =====
app.get('/api/patterns/:table', (req, res) => {
    const tableName = req.params.table;
    const found = baccaratData.find(item => item.table === tableName);
    
    if (!found) {
        return res.json({ 
            success: false, 
            message: 'Không tìm thấy bàn ' + tableName 
        });
    }

    const patterns = detectAllPatterns(found.result);
    
    res.json({
        success: true,
        table: `Bàn ${tableName}`,
        total_patterns: patterns.count,
        patterns: patterns.patterns,
        summary: patterns.summary,
        history: patternHistory[tableName] || [],
        id: '@tranhoang2286'
    });
});

// ===== API LẤY KẾT QUẢ MỚI NHẤT =====
app.get('/api/latest', (req, res) => {
    const latest = [...baccaratData].sort((a, b) => {
        const numA = parseInt(a.table) || 0;
        const numB = parseInt(b.table) || 0;
        return numB - numA;
    });
    
    const dataWithSession = latest.map(item => ({
        ...item,
        session: sessionData[item.table] || 0
    }));
    
    res.json({ 
        success: true, 
        data: dataWithSession.slice(0, 10), 
        lastUpdate: lastUpdate 
    });
});

// ===== API RESET PHIÊN =====
app.get('/api/reset/:table', (req, res) => {
    const tableName = req.params.table;
    if (sessionData[tableName] !== undefined) {
        sessionData[tableName] = 0;
        patternHistory[tableName] = [];
        res.json({
            success: true,
            message: `Đã reset phiên bàn ${tableName}`,
            id: '@tranhoang2286'
        });
    } else {
        res.json({
            success: false,
            message: `Không tìm thấy bàn ${tableName}`
        });
    }
});

// ===== API HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        tables: baccaratData.length,
        sessions: sessionData,
        id: '@tranhoang2286'
    });
});

// ===== ROOT =====
app.get('/', (req, res) => {
    res.json({
        name: 'BACCARAT VIP PREDICTION - SIÊU CẦU',
        version: '3.0.0',
        author: '@tranhoang2286',
        features: {
            phiên: 'Tự động tăng khi có kết quả mới cho từng bàn',
            đa_luồng: '9 luồng phân tích song song',
            nhận_diện_cầu: '20+ loại cầu BCR',
            dự_đoán: 'Dự đoán cả 3 cửa Banker, Player, Tie'
        },
        cầu_phát_hiện: [
            'DÂY', 'ĐAN XEN', '2-2', '3-3', '1-2-3', '2-1-2',
            'HARMONIC', '4-4', 'FIBONACCI', 'MẪU', 'XEN KẼ',
            'ĐỐI XỨNG', 'LẶP', 'TIE', 'MARKOV', 'XU HƯỚNG',
            'ÁP ĐẢO', 'ĐỘT BIẾN', 'HỒI PHỤC', 'SONG SONG'
        ],
        endpoints: {
            'Lấy tất cả bàn': '/api/baccarat',
            'Lấy 1 bàn': '/api/baccarat/:table',
            'Dự đoán VIP': '/api/predict/:table',
            'Dự đoán tất cả': '/api/predict/all',
            'Nhận diện cầu': '/api/patterns/:table',
            'Kết quả mới nhất': '/api/latest',
            'Reset phiên': '/api/reset/:table'
        },
        example: {
            url: '/api/predict/5',
            response: {
                success: true,
                table: 'Bàn 5',
                phiên: 7,
                dự_đoán: 'Banker',
                banker: '58%',
                player: '37%',
                tie: '5%',
                tỉ_lệ: '58%',
                cầu: 'Dây Banker x4',
                chi_tiết_cầu: 'Dây Banker x4 | Cầu 2-2 (Banker) x2 | Markov: Banker → Banker (65%)',
                danh_sách_cầu: ['Dây Banker x4', 'Cầu 2-2 (Banker) x2', 'Markov: Banker → Banker (65%)'],
                số_lượng_cầu: 3,
                confidence: '72%',
                id: '@tranhoang2286'
            }
        }
    });
});

// ======================
// VÒNG LẶP TỰ ĐỘNG CẬP NHẬT
// ======================
async function autoUpdate() {
    while (true) {
        await fetchBaccaratData();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// ======================
// KHỞI ĐỘNG
// ======================
async function start() {
    console.log('========================================');
    console.log('🃏 BACCARAT VIP PREDICTION - SIÊU CẦU');
    console.log('========================================');
    
    console.log('[1] Đang đăng nhập...');
    const loginOk = await login();
    if (!loginOk) {
        console.error('[ERROR] Đăng nhập thất bại!');
        process.exit(1);
    }
    console.log('[OK] Đăng nhập thành công');
    
    console.log('[2] Vào lobby...');
    await goToLobby();
    console.log('[OK] Vào lobby thành công');
    
    console.log('[3] Lấy dữ liệu lần đầu...');
    await fetchBaccaratData();
    console.log(`[OK] Đã lấy ${baccaratData.length} bàn`);
    
    console.log('\n📊 DANH SÁCH BÀN & PHIÊN:');
    baccaratData.forEach(item => {
        const session = sessionData[item.table] || 0;
        console.log(`   Bàn ${item.table.padEnd(4)} | Phiên: ${session} | Độ dài: ${item.result.length}`);
    });
    
    console.log('\n🧵 9 LUỒNG PHÂN TÍCH:');
    console.log('   1. Tần suất      2. Streak      3. Zigzag');
    console.log('   4. Pattern 2-2   5. Pattern 3-3 6. Markov');
    console.log('   7. Momentum      8. Entropy     9. Gap Analysis');
    
    console.log('\n🔮 20+ LOẠI CẦU PHÁT HIỆN:');
    console.log('   DÂY, ĐAN XEN, 2-2, 3-3, 1-2-3, 2-1-2,');
    console.log('   HARMONIC, 4-4, FIBONACCI, MẪU, XEN KẼ,');
    console.log('   ĐỐI XỨNG, LẶP, TIE, MARKOV, XU HƯỚNG,');
    console.log('   ÁP ĐẢO, ĐỘT BIẾN, HỒI PHỤC, SONG SONG');
    
    // Chạy auto update background
    autoUpdate();
    
    // Khởi động server
    const PORT = 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 API SERVER ĐANG CHẠY:`);
        console.log(`   http://localhost:${PORT}/api/baccarat`);
        console.log(`   http://localhost:${PORT}/api/predict/5`);
        console.log(`   http://localhost:${PORT}/api/predict/all`);
        console.log(`   http://localhost:${PORT}/api/patterns/5`);
        console.log(`   http://localhost:${PORT}/api/latest`);
        console.log(`\n⏰ Auto update mỗi 2 giây`);
        console.log(`📌 Phiên tự động tăng khi có kết quả mới`);
        console.log('========================================');
    });
}

start();
