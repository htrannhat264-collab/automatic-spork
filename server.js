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
const historyCache = {};

// ============================================================
// HÀM CHUYỂN STRING -> ARRAY
// ============================================================
function toArray(str) {
    return str ? str.split('') : [];
}

// ============================================================
// LỚP THUẬT TOÁN ĐA LUỒNG VIP
// ============================================================
class VIPAlgorithm {
    constructor(tableId) {
        this.tableId = tableId;
        this.predictions = [];
        this.confidenceHistory = [];
        this.patternHistory = [];
    }

    // ===== PHÂN TÍCH TẦN SUẤT NÂNG CAO =====
    frequencyAnalysis(arr) {
        const total = arr.length || 1;
        const counts = { B: 0, P: 0, T: 0 };
        for (const c of arr) {
            if (counts[c] !== undefined) counts[c]++;
        }
        
        // Tính xác suất có điều kiện
        const probs = {
            B: counts.B / total,
            P: counts.P / total,
            T: counts.T / total
        };
        
        // Điều chỉnh theo xác suất thực tế của Baccarat (Banker ~45.86%, Player ~44.62%, Tie ~9.52%)
        const adjusted = {
            B: probs.B * 0.4586 + 0.1,
            P: probs.P * 0.4462 + 0.1,
            T: probs.T * 0.0952 + 0.05
        };
        
        // Chuẩn hóa về 100%
        const sum = adjusted.B + adjusted.P + adjusted.T;
        return {
            B: (adjusted.B / sum) * 100,
            P: (adjusted.P / sum) * 100,
            T: (adjusted.T / sum) * 100
        };
    }

    // ===== PHÂN TÍCH STREAK (DÂY) =====
    streakAnalysis(arr) {
        if (arr.length < 2) return { B: 33.3, P: 33.3, T: 33.3 };
        
        let currentStreak = 1;
        const streaks = { B: [], P: [], T: [] };
        let currentChar = arr[0];
        
        for (let i = 1; i < arr.length; i++) {
            if (arr[i] === currentChar) {
                currentStreak++;
            } else {
                streaks[currentChar].push(currentStreak);
                currentChar = arr[i];
                currentStreak = 1;
            }
        }
        streaks[currentChar].push(currentStreak);
        
        // Tính xác suất streak tiếp tục
        const avgStreaks = {};
        const maxStreaks = {};
        for (const key of ['B', 'P', 'T']) {
            if (streaks[key].length > 0) {
                avgStreaks[key] = streaks[key].reduce((a, b) => a + b, 0) / streaks[key].length;
                maxStreaks[key] = Math.max(...streaks[key]);
            } else {
                avgStreaks[key] = 1;
                maxStreaks[key] = 1;
            }
        }
        
        const lastChar = arr[arr.length - 1];
        const lastStreak = streaks[lastChar] ? streaks[lastChar][streaks[lastChar].length - 1] : 1;
        const continueProb = lastStreak / (avgStreaks[lastChar] || 1);
        
        // Xác suất đảo chiều
        const reverseProb = 1 - Math.min(continueProb, 1);
        
        let result = { B: 0, P: 0, T: 0 };
        const others = ['B', 'P', 'T'].filter(c => c !== lastChar);
        
        // Nếu streak dài, khả năng đảo chiều cao
        if (lastStreak >= 4) {
            const rev = Math.min(0.7 + (lastStreak - 4) * 0.05, 0.85);
            result[others[0]] = rev * 0.5;
            result[others[1]] = rev * 0.3;
            result[lastChar] = (1 - rev) * 0.8;
        } else {
            result[lastChar] = continueProb * 0.7;
            result[others[0]] = (1 - continueProb) * 0.5;
            result[others[1]] = (1 - continueProb) * 0.3;
        }
        
        // Chuẩn hóa
        const sum = result.B + result.P + result.T;
        if (sum > 0) {
            return {
                B: (result.B / sum) * 100,
                P: (result.P / sum) * 100,
                T: (result.T / sum) * 100
            };
        }
        return { B: 33.3, P: 33.3, T: 33.3 };
    }

    // ===== PHÂN TÍCH PATTERN 2-2, 3-3 =====
    patternAnalysis(arr) {
        if (arr.length < 6) return { B: 33.3, P: 33.3, T: 33.3 };
        
        let pattern22 = 0;
        let pattern33 = 0;
        let pattern22Char = '';
        let pattern33Char = '';
        
        // Phát hiện pattern 2-2
        for (let i = 1; i < Math.min(10, arr.length - 1); i += 2) {
            if (arr[arr.length - i] === arr[arr.length - i - 1]) {
                pattern22++;
                pattern22Char = arr[arr.length - i];
            }
        }
        
        // Phát hiện pattern 3-3
        for (let i = 2; i < Math.min(12, arr.length - 1); i += 3) {
            if (arr[arr.length - i] === arr[arr.length - i - 1] &&
                arr[arr.length - i] === arr[arr.length - i - 2]) {
                pattern33++;
                pattern33Char = arr[arr.length - i];
            }
        }
        
        let result = { B: 0, P: 0, T: 0 };
        
        if (pattern33 >= 2) {
            // Pattern 3-3 mạnh -> khả năng đảo chiều
            const rev = 0.65 + pattern33 * 0.03;
            const otherChars = ['B', 'P', 'T'].filter(c => c !== pattern33Char);
            result[otherChars[0]] = rev * 0.5;
            result[otherChars[1]] = rev * 0.3;
            result[pattern33Char] = (1 - rev) * 0.8;
        } else if (pattern22 >= 3) {
            // Pattern 2-2 mạnh
            const rev = 0.55 + pattern22 * 0.02;
            const otherChars = ['B', 'P', 'T'].filter(c => c !== pattern22Char);
            result[otherChars[0]] = rev * 0.5;
            result[otherChars[1]] = rev * 0.3;
            result[pattern22Char] = (1 - rev) * 0.8;
        } else {
            // Không có pattern rõ ràng
            const counts = { B: 0, P: 0, T: 0 };
            for (const c of arr) {
                if (counts[c] !== undefined) counts[c]++;
            }
            const total = arr.length;
            result.B = counts.B / total;
            result.P = counts.P / total;
            result.T = counts.T / total;
        }
        
        const sum = result.B + result.P + result.T;
        if (sum > 0) {
            return {
                B: (result.B / sum) * 100,
                P: (result.P / sum) * 100,
                T: (result.T / sum) * 100
            };
        }
        return { B: 33.3, P: 33.3, T: 33.3 };
    }

    // ===== PHÂN TÍCH MARKOV BẬC 2 =====
    markovAnalysis(arr) {
        if (arr.length < 4) return { B: 33.3, P: 33.3, T: 33.3 };
        
        const markov2 = {};
        for (let i = 0; i < arr.length - 2; i++) {
            const key = arr[i] + arr[i + 1];
            const next = arr[i + 2];
            if (!markov2[key]) {
                markov2[key] = { B: 0, P: 0, T: 0 };
            }
            if (markov2[key][next] !== undefined) {
                markov2[key][next]++;
            }
        }
        
        const lastKey = arr.slice(-2).join('');
        const transitions = markov2[lastKey];
        
        if (!transitions) return { B: 33.3, P: 33.3, T: 33.3 };
        
        const total = transitions.B + transitions.P + transitions.T;
        if (total === 0) return { B: 33.3, P: 33.3, T: 33.3 };
        
        // Làm mượt xác suất (smoothing)
        const smoothing = 1;
        return {
            B: ((transitions.B + smoothing) / (total + smoothing * 3)) * 100,
            P: ((transitions.P + smoothing) / (total + smoothing * 3)) * 100,
            T: ((transitions.T + smoothing) / (total + smoothing * 3)) * 100
        };
    }

    // ===== PHÂN TÍCH KHOẢNG CÁCH (GAP) =====
    gapAnalysis(arr) {
        if (arr.length < 5) return { B: 33.3, P: 33.3, T: 33.3 };
        
        const gaps = { B: [], P: [], T: [] };
        const lastPos = { B: -1, P: -1, T: -1 };
        
        for (let i = 0; i < arr.length; i++) {
            const char = arr[i];
            if (lastPos[char] !== -1) {
                gaps[char].push(i - lastPos[char] - 1);
            }
            lastPos[char] = i;
        }
        
        const avgGaps = {};
        const stdGaps = {};
        for (const key of ['B', 'P', 'T']) {
            if (gaps[key].length > 0) {
                avgGaps[key] = gaps[key].reduce((a, b) => a + b, 0) / gaps[key].length;
                const variance = gaps[key].reduce((a, b) => a + Math.pow(b - avgGaps[key], 2), 0) / gaps[key].length;
                stdGaps[key] = Math.sqrt(variance);
            } else {
                avgGaps[key] = 2;
                stdGaps[key] = 1;
            }
        }
        
        const currentGap = {};
        for (const key of ['B', 'P', 'T']) {
            currentGap[key] = arr.length - 1 - lastPos[key];
        }
        
        // Tính z-score cho từng cửa
        const zScores = {};
        for (const key of ['B', 'P', 'T']) {
            if (lastPos[key] === -1) {
                zScores[key] = 0.5;
            } else {
                zScores[key] = (currentGap[key] - avgGaps[key]) / (stdGaps[key] || 1);
            }
        }
        
        // Cửa nào có z-score cao nhất -> khả năng xuất hiện cao
        const result = { B: 0, P: 0, T: 0 };
        const zSum = Math.abs(zScores.B) + Math.abs(zScores.P) + Math.abs(zScores.T) || 1;
        for (const key of ['B', 'P', 'T']) {
            result[key] = (Math.abs(zScores[key]) / zSum) * 100;
        }
        
        return result;
    }

    // ===== PHÂN TÍCH MOMENTUM =====
    momentumAnalysis(arr) {
        if (arr.length < 5) return { B: 33.3, P: 33.3, T: 33.3 };
        
        const values = arr.map(c => {
            if (c === 'B') return 1;
            if (c === 'P') return -1;
            return 0;
        });
        
        // Tính momentum (đạo hàm bậc 1)
        const momentum = [];
        for (let i = 1; i < values.length; i++) {
            momentum.push(values[i] - values[i - 1]);
        }
        
        // Tính acceleration (đạo hàm bậc 2)
        const acceleration = [];
        for (let i = 1; i < momentum.length; i++) {
            acceleration.push(momentum[i] - momentum[i - 1]);
        }
        
        // Lấy giá trị gần nhất
        const lastMomentum = momentum[momentum.length - 1] || 0;
        const lastAcceleration = acceleration[acceleration.length - 1] || 0;
        
        // Dự đoán dựa trên momentum và acceleration
        let result = { B: 0, P: 0, T: 0 };
        
        // Momentum mạnh -> xu hướng tiếp tục
        if (Math.abs(lastMomentum) > 1.5) {
            const strength = Math.min(Math.abs(lastMomentum) / 3, 0.8);
            if (lastMomentum > 0) {
                result.B = strength * 100;
                result.P = (1 - strength) * 50;
                result.T = (1 - strength) * 20;
            } else {
                result.P = strength * 100;
                result.B = (1 - strength) * 50;
                result.T = (1 - strength) * 20;
            }
        } else if (Math.abs(lastAcceleration) > 0.8) {
            // Acceleration mạnh -> chuẩn bị đảo chiều
            const strength = Math.min(Math.abs(lastAcceleration) / 2, 0.7);
            if (lastAcceleration > 0) {
                result.B = strength * 100;
                result.P = (1 - strength) * 50;
                result.T = (1 - strength) * 20;
            } else {
                result.P = strength * 100;
                result.B = (1 - strength) * 50;
                result.T = (1 - strength) * 20;
            }
        } else {
            // Không có momentum rõ ràng -> dùng tần suất
            const freq = this.frequencyAnalysis(arr);
            result = freq;
        }
        
        const sum = result.B + result.P + result.T || 1;
        return {
            B: (result.B / sum) * 100,
            P: (result.P / sum) * 100,
            T: (result.T / sum) * 100
        };
    }

    // ===== PHÂN TÍCH ENTROPY =====
    entropyAnalysis(arr) {
        if (arr.length < 5) return { B: 33.3, P: 33.3, T: 33.3 };
        
        const counts = { B: 0, P: 0, T: 0 };
        for (const c of arr) {
            if (counts[c] !== undefined) counts[c]++;
        }
        
        const total = arr.length;
        let entropy = 0;
        const probs = {};
        for (const key of ['B', 'P', 'T']) {
            probs[key] = counts[key] / total;
            if (probs[key] > 0) {
                entropy -= probs[key] * Math.log2(probs[key]);
            }
        }
        
        const maxEntropy = Math.log2(3);
        const predictability = 1 - (entropy / maxEntropy);
        
        // Entropy thấp -> dễ dự đoán, entropy cao -> khó dự đoán
        if (predictability > 0.6) {
            // Dễ dự đoán -> dùng tần suất
            return this.frequencyAnalysis(arr);
        } else if (predictability < 0.3) {
            // Khó dự đoán -> ưu tiên Tie
            return { B: 30, P: 30, T: 40 };
        } else {
            // Trung bình -> kết hợp
            const freq = this.frequencyAnalysis(arr);
            return {
                B: freq.B * 0.6 + 20,
                P: freq.P * 0.6 + 20,
                T: freq.T * 0.8 + 15
            };
        }
    }

    // ============================================================
    // TỔNG HỢP ĐA LUỒNG
    // ============================================================
    comprehensiveAnalysis(history) {
        const arr = toArray(history);
        if (arr.length < 3) {
            return {
                banker: 48,
                player: 45,
                tie: 7,
                prediction: 'Player',
                pattern: 'Chưa đủ dữ liệu',
                confidence: 50
            };
        }

        // ===== CHẠY 6 LUỒNG PHÂN TÍCH SONG SONG =====
        const results = [
            this.frequencyAnalysis(arr),
            this.streakAnalysis(arr),
            this.patternAnalysis(arr),
            this.markovAnalysis(arr),
            this.gapAnalysis(arr),
            this.momentumAnalysis(arr),
            this.entropyAnalysis(arr)
        ];

        // ===== TRỌNG SỐ CHO TỪNG LUỒNG =====
        const weights = [0.18, 0.17, 0.15, 0.15, 0.12, 0.12, 0.11];
        
        // ===== TỔNG HỢP KẾT QUẢ =====
        let bankerScore = 0;
        let playerScore = 0;
        let tieScore = 0;
        let totalWeight = 0;

        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const w = weights[i];
            bankerScore += r.B * w;
            playerScore += r.P * w;
            tieScore += r.T * w;
            totalWeight += w;
        }

        // Chuẩn hóa về 100%
        const sum = bankerScore + playerScore + tieScore;
        let banker = (bankerScore / sum) * 100;
        let player = (playerScore / sum) * 100;
        let tie = (tieScore / sum) * 100;

        // ===== ĐIỀU CHỈNH THEO XÁC SUẤT THỰC TẾ =====
        // Banker: 45.86%, Player: 44.62%, Tie: 9.52%
        banker = banker * 0.7 + 13.76;
        player = player * 0.7 + 13.39;
        tie = tie * 0.7 + 2.86;

        // Chuẩn hóa lại
        const total = banker + player + tie;
        banker = (banker / total) * 100;
        player = (player / total) * 100;
        tie = (tie / total) * 100;

        // ===== XÁC ĐỊNH DỰ ĐOÁN =====
        let prediction = 'Player';
        let maxRate = Math.max(banker, player, tie);
        if (maxRate === banker) prediction = 'Banker';
        else if (maxRate === player) prediction = 'Player';
        else prediction = 'Tie';

        // ===== TÍNH ĐỘ TIN CẬY =====
        const confidence = Math.max(banker, player, tie) - 10;
        const finalConfidence = Math.min(Math.max(confidence, 20), 80);

        // ===== PHÂN TÍCH CẦU =====
        let pattern = '';
        const last5 = arr.slice(-5);
        const last3 = arr.slice(-3);
        
        if (last3.every(c => c === last3[0])) {
            pattern = `Dây ${last3[0]} x${last3.length}`;
        } else if (last5.length >= 5 && 
                   last5[0] === last5[2] && last5[1] === last5[3] && last5[2] === last5[4]) {
            pattern = `Cầu 1-2-3: ${last5.join('')}`;
        } else if (last5.length >= 4 && 
                   last5[0] === last5[2] && last5[1] === last5[3]) {
            pattern = `Cầu 2-2: ${last5.slice(0, 4).join('')}`;
        } else if (last5.length >= 6 && 
                   last5[0] === last5[3] && last5[1] === last5[4] && last5[2] === last5[5]) {
            pattern = `Cầu 3-3: ${last5.slice(0, 6).join('')}`;
        } else {
            const diff = Math.abs(banker - player);
            if (diff > 10) {
                pattern = `Xu hướng ${prediction} (${Math.round(diff)}%)`;
            } else {
                pattern = 'Cầu đan xen';
            }
        }

        return {
            banker: Math.round(Math.max(banker, 3)),
            player: Math.round(Math.max(player, 3)),
            tie: Math.round(Math.max(tie, 2)),
            prediction: prediction,
            pattern: pattern,
            confidence: Math.round(finalConfidence),
            totalGames: arr.length,
            stats: {
                B: Math.round(arr.filter(c => c === 'B').length / arr.length * 100),
                P: Math.round(arr.filter(c => c === 'P').length / arr.length * 100),
                T: Math.round(arr.filter(c => c === 'T').length / arr.length * 100)
            }
        };
    }
}

// ============================================================
// TẠO INSTANCE CHO TỪNG BÀN
// ============================================================
const algorithms = {};

function getAlgorithm(tableId) {
    if (!algorithms[tableId]) {
        algorithms[tableId] = new VIPAlgorithm(tableId);
    }
    return algorithms[tableId];
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

        // Kiểm tra dữ liệu mới
        const lastDataKey = `table_${tableId}`;
        const oldData = lastData[lastDataKey] || '';
        const isNewData = (history !== oldData && history.length > oldData.length);
        lastData[lastDataKey] = history;

        // Tăng phiên nếu có dữ liệu mới
        if (!sessionData[tableId]) sessionData[tableId] = 0;
        if (isNewData) sessionData[tableId]++;

        // Chạy thuật toán VIP
        const algorithm = getAlgorithm(tableId);
        const result = algorithm.comprehensiveAnalysis(history);

        const nameMap = { 'Banker': 'Banker', 'Player': 'Player', 'Tie': 'Tie' };

        res.json({
            success: true,
            table: `Bàn ${tableId}`,
            phiên: sessionData[tableId],
            dự_đoán: result.prediction,
            banker: `${result.banker}%`,
            player: `${result.player}%`,
            tie: `${result.tie}%`,
            tỉ_lệ: `${Math.max(result.banker, result.player, result.tie)}%`,
            cầu: result.pattern,
            confidence: `${result.confidence}%`,
            stats: result.stats,
            is_new_data: isNewData,
            data_length: history.length,
            old_data_length: oldData.length,
            algorithm: `VIP Multi-Thread (7 luồng)`,
            timestamp: new Date().toISOString(),
            id: '@tranhoang2286'
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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

                const algorithm = getAlgorithm(id);
                const result = algorithm.comprehensiveAnalysis(history);

                results.push({
                    table: `Bàn ${id}`,
                    phiên: sessionData[id],
                    dự_đoán: result.prediction,
                    banker: `${result.banker}%`,
                    player: `${result.player}%`,
                    tie: `${result.tie}%`,
                    tỉ_lệ: `${Math.max(result.banker, result.player, result.tie)}%`,
                    cầu: result.pattern,
                    confidence: `${result.confidence}%`,
                    is_new_data: isNewData
                });
            }
        }

        res.json({
            success: true,
            data: results,
            total: results.length,
            algorithm: `VIP Multi-Thread (7 luồng)`,
            timestamp: new Date().toISOString(),
            id: '@tranhoang2286'
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        tables: Object.keys(sessionData).length,
        threads: 7,
        id: '@tranhoang2286'
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'BACCARAT VIP PREDICTION API',
        version: '6.0.0',
        author: '@tranhoang2286',
        feature: 'Đa luồng + VIP - Không Random',
        threads: [
            'Tần suất nâng cao',
            'Streak Analysis',
            'Pattern 2-2 / 3-3',
            'Markov bậc 2',
            'Gap Analysis',
            'Momentum & Acceleration',
            'Entropy Analysis'
        ],
        endpoints: {
            'Dự đoán 1 bàn': '/api/predict/:tableId',
            'Dự đoán tất cả': '/api/predict/all',
            'Health Check': '/api/health'
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
                cầu: 'Cầu 2-2 mạnh, sắp đảo chiều sang Banker',
                confidence: '72%',
                algorithm: 'VIP Multi-Thread (7 luồng)',
                id: '@tranhoang2286'
            }
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🃏 BACCARAT VIP PREDICTION API');
    console.log('========================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log('🧵 7 LUỒNG PHÂN TÍCH SONG SONG:');
    console.log('   1. Tần suất nâng cao');
    console.log('   2. Streak Analysis');
    console.log('   3. Pattern 2-2 / 3-3');
    console.log('   4. Markov bậc 2');
    console.log('   5. Gap Analysis');
    console.log('   6. Momentum & Acceleration');
    console.log('   7. Entropy Analysis');
    console.log('========================================');
    console.log(`👤 Author: @tranhoang2286`);
    console.log('========================================');
});
