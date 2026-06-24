const express = require('express');
const axios = require('axios');
const AdvancedBaccaratPredictor = require('./AdvancedBaccaratPredictor');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// Khởi tạo
const predictors = {};

function getPredictor(tableId) {
    if (!predictors[tableId]) {
        predictors[tableId] = new AdvancedBaccaratPredictor(tableId);
    }
    return predictors[tableId];
}

// Lấy dữ liệu
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

// Phân tích cầu
function analyzePattern(history) {
    if (!history || history.length < 3) return 'Chưa đủ dữ liệu';
    
    const patterns = [];
    let currentStreak = 1;
    let streakChar = history[0];
    
    for (let i = 1; i < history.length; i++) {
        if (history[i] === history[i-1]) {
            currentStreak++;
        } else {
            if (currentStreak >= 3) {
                patterns.push(`Dây ${streakChar} x${currentStreak}`);
            }
            currentStreak = 1;
            streakChar = history[i];
        }
    }
    if (currentStreak >= 3) {
        patterns.push(`Dây ${streakChar} x${currentStreak}`);
    }
    
    let zigzag = 0;
    for (let i = 1; i < history.length - 1; i++) {
        if (history[i] !== history[i-1] && history[i] !== history[i+1]) {
            zigzag++;
        }
    }
    if (zigzag >= 3) patterns.push(`Đan xen ${zigzag} lần`);
    
    let twoTwo = 0;
    for (let i = 1; i < history.length - 2; i += 2) {
        if (i+1 < history.length && history[i] === history[i-1] && history[i+1] === history[i+2]) {
            twoTwo++;
        }
    }
    if (twoTwo >= 2) patterns.push('Cầu 2-2');
    
    let threeThree = 0;
    for (let i = 2; i < history.length - 3; i += 3) {
        if (i+2 < history.length && 
            history[i] === history[i-1] && history[i] === history[i-2] &&
            history[i+1] === history[i+2] && history[i+1] === history[i+3]) {
            threeThree++;
        }
    }
    if (threeThree >= 1) patterns.push('Cầu 3-3');
    
    if (patterns.length === 0) {
        const last10 = history.slice(-10);
        const countB = (last10.match(/B/g) || []).length;
        const countP = (last10.match(/P/g) || []).length;
        if (countB > countP + 3) patterns.push('Xu hướng Banker');
        else if (countP > countB + 3) patterns.push('Xu hướng Player');
        else patterns.push('Cầu đan xen');
    }
    
    return patterns.join(' | ') || 'Không có cầu rõ ràng';
}

// ===== API ENDPOINTS =====

// Dự đoán 1 bàn
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
        
        const predictor = getPredictor(tableId);
        const prediction = predictor.newSession(history);
        const pattern = analyzePattern(history);
        const nameMap = { 'B': 'Banker', 'P': 'Player', 'T': 'Tie' };
        
        res.json({
            success: true,
            table: `Bàn ${tableId}`,
            phiên: prediction.session,
            dự_đoán: nameMap[prediction.prediction] || prediction.prediction,
            tỉ_lệ: `${prediction.winRate}%`,
            cầu: pattern,
            confidence: `${Math.round(prediction.confidence * 100)}%`,
            methods_used: prediction.validMethods || 0,
            total_methods: prediction.totalMethods || 0,
            timestamp: new Date().toISOString(),
            id: '@tranhoang2286'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Dự đoán tất cả bàn
app.get('/api/predict/all', async (req, res) => {
    try {
        const tableIds = ['1', '5', '6', '8', '10', '11', '12'];
        const results = [];
        
        for (const id of tableIds) {
            const history = await fetchTableData(id);
            if (history) {
                const predictor = getPredictor(id);
                const prediction = predictor.newSession(history);
                const pattern = analyzePattern(history);
                const nameMap = { 'B': 'Banker', 'P': 'Player', 'T': 'Tie' };
                
                results.push({
                    table: `Bàn ${id}`,
                    phiên: prediction.session,
                    dự_đoán: nameMap[prediction.prediction] || prediction.prediction,
                    tỉ_lệ: `${prediction.winRate}%`,
                    cầu: pattern,
                    confidence: `${Math.round(prediction.confidence * 100)}%`,
                    methods_used: prediction.validMethods || 0
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

// Thống kê
app.get('/api/stats/:tableId', (req, res) => {
    try {
        const tableId = req.params.tableId;
        const predictor = getPredictor(tableId);
        const stats = predictor.getDetailedStats();
        
        res.json({
            success: true,
            table: `Bàn ${tableId}`,
            data: stats,
            id: '@tranhoang2286'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        tables: Object.keys(predictors).length,
        methods: 30,
        id: '@tranhoang2286'
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        name: 'BACCARAT PREDICTION API - SIÊU MẠNH V4.0',
        version: '4.0.0',
        author: '@tranhoang2286',
        methods: [
            'Tần suất (4)', 'Xu hướng (4)', 'Pattern (9)', 
            'Markov (4)', 'Bayesian (3)', 'Neural (3)',
            'Chuỗi (4)', 'Entropy (3)', 'Động lượng (3)',
            'Hồi quy (3)', 'Phân cụm (3)', 'Kỹ thuật (4)',
            'Khác (3)'
        ],
        total_methods: 30,
        endpoints: {
            'Dự đoán 1 bàn': '/api/predict/:tableId',
            'Dự đoán tất cả': '/api/predict/all',
            'Thống kê': '/api/stats/:tableId',
            'Health Check': '/api/health'
        },
        example: {
            url: '/api/predict/5',
            response: {
                success: true,
                table: 'Bàn 5',
                phiên: 1,
                dự_đoán: 'Banker',
                tỉ_lệ: '68%',
                cầu: 'Dây B x4 | Xu hướng Banker',
                confidence: '72%',
                methods_used: 24,
                total_methods: 30,
                id: '@tranhoang2286'
            }
        }
    });
});

// Khởi động
app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🃏 BACCARAT PREDICTION API - SIÊU MẠNH');
    console.log('========================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📊 30+ phương pháp phân tích`);
    console.log(`👤 Author: @tranhoang2286`);
    console.log('========================================');
});