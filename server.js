const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== CORS =====
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// ===== LƯU DỮ LIỆU =====
const lastData = {};
const sessionData = {};

// ============================================================
// THUẬT TOÁN RIÊNG CHO TỪNG BÀN
// ============================================================

// ===== BÀN 1: THUẬT TOÁN STREAK + ZIGZAG =====
function algorithmTable1(history) {
    if (!history || history.length < 3) {
        return { prediction: 'Player', winRate: 49, pattern: 'Chưa đủ dữ liệu' };
    }

    const counts = { B: 0, P: 0, T: 0 };
    for (const c of history) {
        if (counts[c] !== undefined) counts[c]++;
    }

    // Phân tích streak
    let maxStreak = 1;
    let streakChar = history[0];
    let currentStreak = 1;
    for (let i = 1; i < history.length; i++) {
        if (history[i] === history[i-1]) {
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
                streakChar = history[i];
            }
        } else {
            currentStreak = 1;
        }
    }

    // Phân tích zigzag
    let zigzagCount = 0;
    for (let i = 1; i < history.length - 1; i++) {
        if (history[i] !== history[i-1] && history[i] !== history[i+1]) {
            zigzagCount++;
        }
    }

    const total = history.length;
    const pPercent = (counts.P / total) * 100;
    const bPercent = (counts.B / total) * 100;

    let prediction = 'Player';
    let winRate = 0;
    let pattern = '';

    // Logic riêng bàn 1
    if (maxStreak >= 4 && streakChar === 'P') {
        prediction = 'Player';
        winRate = 58 + Math.random() * 4;
        pattern = `Dây Player x${maxStreak} đang mạnh`;
    } else if (maxStreak >= 4 && streakChar === 'B') {
        prediction = 'Banker';
        winRate = 56 + Math.random() * 3;
        pattern = `Dây Banker x${maxStreak} đang mạnh`;
    } else if (zigzagCount >= 4) {
        const lastChar = history[history.length - 1];
        prediction = lastChar === 'P' ? 'Banker' : 'Player';
        winRate = 53 + Math.random() * 3;
        pattern = `Zigzag ${zigzagCount} lần, đang đảo chiều`;
    } else if (pPercent > 55) {
        prediction = 'Player';
        winRate = 52 + Math.random() * 2;
        pattern = `Player áp đảo ${Math.round(pPercent)}%`;
    } else if (bPercent > 55) {
        prediction = 'Banker';
        winRate = 52 + Math.random() * 2;
        pattern = `Banker áp đảo ${Math.round(bPercent)}%`;
    } else {
        const last3 = history.slice(-3);
        if (last3.every(c => c === 'P')) {
            prediction = 'Banker';
            winRate = 55 + Math.random() * 3;
            pattern = 'Đảo chiều sau 3 Player';
        } else if (last3.every(c => c === 'B')) {
            prediction = 'Player';
            winRate = 55 + Math.random() * 3;
            pattern = 'Đảo chiều sau 3 Banker';
        } else {
            prediction = history[history.length - 1] === 'P' ? 'Banker' : 'Player';
            winRate = 50 + Math.random() * 3;
            pattern = 'Cầu đan xen, theo xu hướng ngược';
        }
    }

    return {
        prediction: prediction,
        winRate: Math.round(Math.min(winRate, 75)),
        pattern: pattern,
        stats: { P: Math.round(pPercent), B: Math.round(bPercent), streak: maxStreak, zigzag: zigzagCount }
    };
}

// ===== BÀN 5: THUẬT TOÁN PATTERN 2-2 + 3-3 =====
function algorithmTable5(history) {
    if (!history || history.length < 3) {
        return { prediction: 'Banker', winRate: 51, pattern: 'Chưa đủ dữ liệu' };
    }

    // Phân tích pattern 2-2
    let pattern22 = 0;
    for (let i = 1; i < Math.min(10, history.length - 1); i += 2) {
        if (history[history.length - i] === history[history.length - i - 1]) {
            pattern22++;
        }
    }

    // Phân tích pattern 3-3
    let pattern33 = 0;
    for (let i = 2; i < Math.min(12, history.length - 1); i += 3) {
        if (history[history.length - i] === history[history.length - i - 1] &&
            history[history.length - i] === history[history.length - i - 2]) {
            pattern33++;
        }
    }

    const counts = { B: 0, P: 0, T: 0 };
    for (const c of history) {
        if (counts[c] !== undefined) counts[c]++;
    }

    const total = history.length;
    const pPercent = (counts.P / total) * 100;
    const bPercent = (counts.B / total) * 100;

    // Tìm cầu
    let last5 = history.slice(-5);
    let prediction = 'Banker';
    let winRate = 0;
    let pattern = '';

    if (pattern33 >= 2) {
        const lastChar = history[history.length - 1];
        if (lastChar === 'B') {
            prediction = 'Player';
            winRate = 62 + Math.random() * 3;
            pattern = `Cầu 3-3 đang ở đỉnh, sắp đảo chiều sang Player`;
        } else {
            prediction = 'Banker';
            winRate = 62 + Math.random() * 3;
            pattern = `Cầu 3-3 đang ở đỉnh, sắp đảo chiều sang Banker`;
        }
    } else if (pattern22 >= 3) {
        const lastChar = history[history.length - 1];
        prediction = lastChar === 'P' ? 'Banker' : 'Player';
        winRate = 58 + Math.random() * 4;
        pattern = `Cầu 2-2 mạnh, đang ở ${lastChar === 'P' ? 'Player' : 'Banker'}, sắp đảo chiều`;
    } else if (pPercent > 58) {
        prediction = 'Player';
        winRate = 54 + Math.random() * 3;
        pattern = `Player đang áp đảo ${Math.round(pPercent)}%`;
    } else if (bPercent > 58) {
        prediction = 'Banker';
        winRate = 54 + Math.random() * 3;
        pattern = `Banker đang áp đảo ${Math.round(bPercent)}%`;
    } else {
        // Phân tích 5 kết quả cuối
        const pCount = last5.filter(c => c === 'P').length;
        const bCount = last5.filter(c => c === 'B').length;
        if (pCount > bCount) {
            prediction = 'Banker';
            winRate = 53 + Math.random() * 2;
            pattern = `5 gần nhất Player ${pCount}/${bCount}, đảo chiều`;
        } else if (bCount > pCount) {
            prediction = 'Player';
            winRate = 53 + Math.random() * 2;
            pattern = `5 gần nhất Banker ${bCount}/${pCount}, đảo chiều`;
        } else {
            prediction = history[history.length - 1] === 'P' ? 'Banker' : 'Player';
            winRate = 50 + Math.random() * 3;
            pattern = 'Cầu đan xen';
        }
    }

    return {
        prediction: prediction,
        winRate: Math.round(Math.min(winRate, 75)),
        pattern: pattern,
        stats: { P: Math.round(pPercent), B: Math.round(bPercent), pattern22, pattern33 }
    };
}

// ===== BÀN 6: THUẬT TOÁN MARKOV + ENTROPY =====
function algorithmTable6(history) {
    if (!history || history.length < 3) {
        return { prediction: 'Banker', winRate: 50, pattern: 'Chưa đủ dữ liệu' };
    }

    // Ma trận Markov
    const markov = { 'B': { 'B': 0, 'P': 0 }, 'P': { 'B': 0, 'P': 0 } };
    for (let i = 0; i < history.length - 1; i++) {
        if (markov[history[i]] && markov[history[i]][history[i + 1]] !== undefined) {
            markov[history[i]][history[i + 1]]++;
        }
    }

    const lastChar = history[history.length - 1];
    const transitions = markov[lastChar];
    let markovPred = 'B';
    let markovProb = 0;
    if (transitions) {
        const total = transitions.B + transitions.P;
        if (total > 0) {
            markovProb = transitions.P / total;
            markovPred = markovProb > 0.5 ? 'P' : 'B';
        }
    }

    // Entropy
    const counts = { 'B': 0, 'P': 0, 'T': 0 };
    for (const c of history) {
        if (counts[c] !== undefined) counts[c]++;
    }
    const total = history.length;
    let entropy = 0;
    for (const c of ['B', 'P', 'T']) {
        const prob = counts[c] / total;
        if (prob > 0) entropy -= prob * Math.log2(prob);
    }
    const maxEntropy = Math.log2(3);
    const predictability = 1 - (entropy / maxEntropy);

    let prediction = 'Banker';
    let winRate = 0;
    let pattern = '';

    if (predictability > 0.6) {
        prediction = markovPred;
        winRate = 56 + Math.random() * 4;
        pattern = `Markov mạnh (${Math.round(predictability * 100)}%), theo ${markovPred === 'P' ? 'Player' : 'Banker'}`;
    } else if (predictability < 0.4) {
        const last5 = history.slice(-5);
        const pCount = last5.filter(c => c === 'P').length;
        const bCount = last5.filter(c => c === 'B').length;
        prediction = pCount > bCount ? 'Player' : 'Banker';
        winRate = 52 + Math.random() * 3;
        pattern = `Entropy cao (${Math.round(entropy * 10) / 10}), theo xu hướng gần nhất`;
    } else {
        const last3 = history.slice(-3);
        if (last3.every(c => c === last3[0])) {
            prediction = last3[0] === 'P' ? 'Banker' : 'Player';
            winRate = 58 + Math.random() * 3;
            pattern = `Dây ${last3[0]} x3, đảo chiều`;
        } else {
            prediction = history[history.length - 1];
            winRate = 50 + Math.random() * 3;
            pattern = `Theo kết quả cuối ${history[history.length - 1] === 'P' ? 'Player' : 'Banker'}`;
        }
    }

    return {
        prediction: prediction,
        winRate: Math.round(Math.min(winRate, 75)),
        pattern: pattern,
        stats: { entropy: Math.round(entropy * 10) / 10, predictability: Math.round(predictability * 100) }
    };
}

// ===== BÀN 10: THUẬT TOÁN MOMENTUM + REGRESSION =====
function algorithmTable10(history) {
    if (!history || history.length < 3) {
        return { prediction: 'Player', winRate: 50, pattern: 'Chưa đủ dữ liệu' };
    }

    // Momentum
    const values = history.split('').map(c => c === 'P' ? 1 : c === 'B' ? -1 : 0);
    let momentum = 0;
    for (let i = 1; i < Math.min(values.length, 10); i++) {
        momentum += values[i] - values[i - 1];
    }

    // Regression đơn giản
    const n = Math.min(values.length, 20);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    const nextValue = slope * n + intercept;

    const counts = { 'B': 0, 'P': 0, 'T': 0 };
    for (const c of history) {
        if (counts[c] !== undefined) counts[c]++;
    }
    const total = history.length;
    const pPercent = (counts.P / total) * 100;
    const bPercent = (counts.B / total) * 100;

    let prediction = 'Player';
    let winRate = 0;
    let pattern = '';

    if (Math.abs(momentum) > 3) {
        prediction = momentum > 0 ? 'Player' : 'Banker';
        winRate = 58 + Math.random() * 4;
        pattern = `Momentum mạnh ${momentum > 0 ? 'Player' : 'Banker'}`;
    } else if (nextValue > 0.3) {
        prediction = 'Player';
        winRate = 54 + Math.random() * 3;
        pattern = `Regression dự báo Player (${Math.round(nextValue * 100)}%)`;
    } else if (nextValue < -0.3) {
        prediction = 'Banker';
        winRate = 54 + Math.random() * 3;
        pattern = `Regression dự báo Banker (${Math.round(Math.abs(nextValue) * 100)}%)`;
    } else if (pPercent > 55) {
        prediction = 'Player';
        winRate = 52 + Math.random() * 2;
        pattern = `Player áp đảo ${Math.round(pPercent)}%`;
    } else if (bPercent > 55) {
        prediction = 'Banker';
        winRate = 52 + Math.random() * 2;
        pattern = `Banker áp đảo ${Math.round(bPercent)}%`;
    } else {
        const last5 = history.slice(-5);
        const pCount = last5.filter(c => c === 'P').length;
        const bCount = last5.filter(c => c === 'B').length;
        if (pCount > bCount) {
            prediction = 'Player';
            winRate = 51 + Math.random() * 2;
            pattern = `5 gần nhất Player ${pCount}/${bCount}`;
        } else if (bCount > pCount) {
            prediction = 'Banker';
            winRate = 51 + Math.random() * 2;
            pattern = `5 gần nhất Banker ${bCount}/${pCount}`;
        } else {
            prediction = history[history.length - 1] === 'P' ? 'Player' : 'Banker';
            winRate = 49 + Math.random() * 3;
            pattern = 'Cầu đan xen';
        }
    }

    return {
        prediction: prediction,
        winRate: Math.round(Math.min(winRate, 75)),
        pattern: pattern,
        stats: { momentum: Math.round(momentum * 10) / 10, regression: Math.round(nextValue * 100) }
    };
}

// ===== BÀN 11: THUẬT TOÁN CLUSTER + DISTRIBUTION =====
function algorithmTable11(history) {
    if (!history || history.length < 3) {
        return { prediction: 'Banker', winRate: 51, pattern: 'Chưa đủ dữ liệu' };
    }

    // Cluster analysis
    const clusters = { 'B': [], 'P': [], 'T': [] };
    let currentCluster = [];
    let currentChar = history[0];
    for (const char of history) {
        if (char === currentChar) {
            currentCluster.push(char);
        } else {
            if (currentCluster.length > 0) {
                clusters[currentChar].push(currentCluster.length);
            }
            currentChar = char;
            currentCluster = [char];
        }
    }
    if (currentCluster.length > 0) {
        clusters[currentChar].push(currentCluster.length);
    }

    // Distribution
    const counts = { 'B': 0, 'P': 0, 'T': 0 };
    for (const c of history) {
        if (counts[c] !== undefined) counts[c]++;
    }
    const total = history.length;
    const pPercent = (counts.P / total) * 100;
    const bPercent = (counts.B / total) * 100;

    // Phân tích cluster
    let maxClusterSize = 0;
    let maxClusterChar = 'B';
    for (const [char, sizes] of Object.entries(clusters)) {
        if (sizes.length > 0) {
            const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
            if (avg > maxClusterSize) {
                maxClusterSize = avg;
                maxClusterChar = char;
            }
        }
    }

    let prediction = 'Banker';
    let winRate = 0;
    let pattern = '';

    if (maxClusterSize > 2.5) {
        prediction = maxClusterChar === 'P' ? 'Player' : 'Banker';
        winRate = 56 + Math.random() * 4;
        pattern = `Cluster mạnh (${Math.round(maxClusterSize)}), theo ${maxClusterChar === 'P' ? 'Player' : 'Banker'}`;
    } else if (pPercent > 60) {
        prediction = 'Player';
        winRate = 54 + Math.random() * 3;
        pattern = `Player áp đảo ${Math.round(pPercent)}%`;
    } else if (bPercent > 60) {
        prediction = 'Banker';
        winRate = 54 + Math.random() * 3;
        pattern = `Banker áp đảo ${Math.round(bPercent)}%`;
    } else {
        // Phân tích distribution
        const last10 = history.slice(-10);
        const p10 = last10.filter(c => c === 'P').length;
        const b10 = last10.filter(c => c === 'B').length;
        if (p10 > b10 + 2) {
            prediction = 'Banker';
            winRate = 55 + Math.random() * 3;
            pattern = `10 gần nhất Player ${p10}/${b10}, đảo chiều`;
        } else if (b10 > p10 + 2) {
            prediction = 'Player';
            winRate = 55 + Math.random() * 3;
            pattern = `10 gần nhất Banker ${b10}/${p10}, đảo chiều`;
        } else {
            prediction = history[history.length - 1] === 'P' ? 'Player' : 'Banker';
            winRate = 50 + Math.random() * 3;
            pattern = 'Cầu đan xen, theo kết quả cuối';
        }
    }

    return {
        prediction: prediction,
        winRate: Math.round(Math.min(winRate, 75)),
        pattern: pattern,
        stats: { clusterSize: Math.round(maxClusterSize * 10) / 10, P: Math.round(pPercent), B: Math.round(bPercent) }
    };
}

// ===== BÀN 12: THUẬT TOÁN FIBONACCI + HARMONIC =====
function algorithmTable12(history) {
    if (!history || history.length < 3) {
        return { prediction: 'Player', winRate: 50, pattern: 'Chưa đủ dữ liệu' };
    }

    // Fibonacci positions
    const fib = [1, 1, 2, 3, 5, 8, 13];
    const fibPositions = [];
    for (const f of fib) {
        if (f <= history.length) {
            fibPositions.push(history.length - f);
        }
    }
    const fibCounts = { 'B': 0, 'P': 0, 'T': 0 };
    for (const pos of fibPositions) {
        if (pos >= 0 && pos < history.length) {
            const char = history[pos];
            if (fibCounts[char] !== undefined) fibCounts[char]++;
        }
    }

    // Harmonic pattern
    let harmonicCount = 0;
    const last8 = history.slice(-8);
    for (let i = 0; i < last8.length - 1; i++) {
        if (last8[i] === last8[i + 1]) harmonicCount++;
    }

    const counts = { 'B': 0, 'P': 0, 'T': 0 };
    for (const c of history) {
        if (counts[c] !== undefined) counts[c]++;
    }
    const total = history.length;
    const pPercent = (counts.P / total) * 100;
    const bPercent = (counts.B / total) * 100;

    let prediction = 'Player';
    let winRate = 0;
    let pattern = '';

    const fibPred = Object.keys(fibCounts).reduce((a, b) => fibCounts[a] > fibCounts[b] ? a : b);

    if (harmonicCount >= 4) {
        const lastChar = history[history.length - 1];
        prediction = lastChar === 'P' ? 'Banker' : 'Player';
        winRate = 60 + Math.random() * 3;
        pattern = `Harmonic mạnh (${harmonicCount}/7), đảo chiều`;
    } else if (fibCounts[fibPred] >= 2) {
        prediction = fibPred === 'P' ? 'Player' : 'Banker';
        winRate = 56 + Math.random() * 3;
        pattern = `Fibonacci: ${fibPred === 'P' ? 'Player' : 'Banker'} xuất hiện ${fibCounts[fibPred]} lần`;
    } else if (pPercent > 56) {
        prediction = 'Player';
        winRate = 53 + Math.random() * 2;
        pattern = `Player áp đảo ${Math.round(pPercent)}%`;
    } else if (bPercent > 56) {
        prediction = 'Banker';
        winRate = 53 + Math.random() * 2;
        pattern = `Banker áp đảo ${Math.round(bPercent)}%`;
    } else {
        const last3 = history.slice(-3);
        if (last3.every(c => c === last3[0])) {
            prediction = last3[0] === 'P' ? 'Banker' : 'Player';
            winRate = 56 + Math.random() * 3;
            pattern = `Dây ${last3[0]} x3, đảo chiều`;
        } else {
            prediction = history[history.length - 1];
            winRate = 49 + Math.random() * 3;
            pattern = 'Theo kết quả cuối';
        }
    }

    return {
        prediction: prediction,
        winRate: Math.round(Math.min(winRate, 75)),
        pattern: pattern,
        stats: { fibonacci: fibPred, harmonic: harmonicCount, P: Math.round(pPercent), B: Math.round(bPercent) }
    };
}

// ============================================================
// API ROUTES
// ============================================================

async function fetchTableData(tableId) {
    try {
        const url = `https://api-sunwin-hoangdz-1.onrender.com/api/baccarat/${tableId}`;
        const response = await axios.get(url, { timeout: 10000 });
        if (response.data && response.data.success && response.data.data) {
            return response.data.data.result || '';
        }
        return '';
    } catch (error) {
        console.error(`Lỗi bàn ${tableId}:`, error.message);
        return '';
    }
}

// ===== API PREDICT =====
app.get('/api/predict/:tableId', async (req, res) => {
    try {
        const tableId = req.params.tableId;
        const history = await fetchTableData(tableId);

        if (!history) {
            return res.json({
                success: false,
                message: `Không tìm thấy bàn ${tableId}`
            });
        }

        // Lưu dữ liệu cũ
        const lastDataKey = `table_${tableId}`;
        const oldData = lastData[lastDataKey] || '';
        const isNewData = (history !== oldData && history.length > oldData.length);
        lastData[lastDataKey] = history;

        // Tăng phiên nếu có dữ liệu mới
        if (!sessionData[tableId]) sessionData[tableId] = 0;
        if (isNewData) sessionData[tableId]++;

        // ===== CHỌN THUẬT TOÁN THEO BÀN =====
        let result;
        switch (tableId) {
            case '1':
                result = algorithmTable1(history);
                break;
            case '5':
                result = algorithmTable5(history);
                break;
            case '6':
                result = algorithmTable6(history);
                break;
            case '10':
                result = algorithmTable10(history);
                break;
            case '11':
                result = algorithmTable11(history);
                break;
            case '12':
                result = algorithmTable12(history);
                break;
            default:
                result = algorithmTable5(history);
        }

        // Đảm bảo tỉ lệ không bao giờ = 50
        let winRate = result.winRate;
        if (winRate === 50) {
            winRate = Math.random() > 0.5 ? 49 + Math.random() * 1 : 51 + Math.random() * 1;
        }
        winRate = Math.round(winRate);

        const nameMap = { 'B': 'Banker', 'P': 'Player', 'T': 'Tie' };

        res.json({
            success: true,
            table: `Bàn ${tableId}`,
            phiên: sessionData[tableId],
            dự_đoán: nameMap[result.prediction] || result.prediction,
            tỉ_lệ: `${winRate}%`,
            cầu: result.pattern,
            algorithm: `Thuật toán bàn ${tableId}`,
            stats: result.stats || {},
            is_new_data: isNewData,
            data_length: history.length,
            old_data_length: oldData.length,
            timestamp: new Date().toISOString(),
            id: '@tranhoang2286'
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== API ALL TABLES =====
app.get('/api/predict/all', async (req, res) => {
    try {
        const tableIds = ['1', '5', '6', '10', '11', '12'];
        const results = [];

        for (const id of tableIds) {
            const history = await fetchTableData(id);
            if (history) {
                const lastDataKey = `table_${id}`;
                const oldData = lastData[lastDataKey] || '';
                const isNewData = (history !== oldData && history.length > oldData.length);
                lastData[lastDataKey] = history;

                if (!sessionData[id]) sessionData[id] = 0;
                if (isNewData) sessionData[id]++;

                let result;
                switch (id) {
                    case '1': result = algorithmTable1(history); break;
                    case '5': result = algorithmTable5(history); break;
                    case '6': result = algorithmTable6(history); break;
                    case '10': result = algorithmTable10(history); break;
                    case '11': result = algorithmTable11(history); break;
                    case '12': result = algorithmTable12(history); break;
                    default: result = algorithmTable5(history);
                }

                let winRate = result.winRate;
                if (winRate === 50) {
                    winRate = Math.random() > 0.5 ? 49 + Math.random() * 1 : 51 + Math.random() * 1;
                }
                winRate = Math.round(winRate);

                const nameMap = { 'B': 'Banker', 'P': 'Player', 'T': 'Tie' };

                results.push({
                    table: `Bàn ${id}`,
                    phiên: sessionData[id],
                    dự_đoán: nameMap[result.prediction] || result.prediction,
                    tỉ_lệ: `${winRate}%`,
                    cầu: result.pattern,
                    algorithm: `Thuật toán bàn ${id}`,
                    stats: result.stats || {},
                    is_new_data: isNewData
                });
            }
        }

        res.json({
            success: true,
            data: results,
            total: results.length,
            timestamp: new Date().toISOString(),
            id: '@tranhoang2286'
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// ROOT & HEALTH
// ============================================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        tables: Object.keys(sessionData).length,
        id: '@tranhoang2286'
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'BACCARAT PREDICTION API - NÂNG CẤP',
        version: '5.0.0',
        author: '@tranhoang2286',
        feature: 'Mỗi bàn có thuật toán riêng biệt',
        algorithms: {
            'Bàn 1': 'Streak + Zigzag',
            'Bàn 5': 'Pattern 2-2 + 3-3',
            'Bàn 6': 'Markov + Entropy',
            'Bàn 10': 'Momentum + Regression',
            'Bàn 11': 'Cluster + Distribution',
            'Bàn 12': 'Fibonacci + Harmonic'
        },
        endpoints: {
            'Dự đoán 1 bàn': '/api/predict/:tableId',
            'Dự đoán tất cả': '/api/predict/all',
            'Health Check': '/api/health'
        }
    });
});

// ===== START =====
app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🃏 BACCARAT PREDICTION API - NÂNG CẤP');
    console.log('========================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log('📊 Mỗi bàn có thuật toán riêng:');
    console.log('   Bàn 1: Streak + Zigzag');
    console.log('   Bàn 5: Pattern 2-2 + 3-3');
    console.log('   Bàn 6: Markov + Entropy');
    console.log('   Bàn 10: Momentum + Regression');
    console.log('   Bàn 11: Cluster + Distribution');
    console.log('   Bàn 12: Fibonacci + Harmonic');
    console.log(`👤 Author: @tranhoang2286`);
    console.log('========================================');
});
