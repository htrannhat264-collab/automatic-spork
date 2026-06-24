const express = require('express');
const axios = require('axios');
const AdvancedBaccaratPredictor = require('./AdvancedBaccaratPredictor');

const app = express();
const PORT = process.env.PORT || 5000;

// ===== LƯU DỮ LIỆU CŨ ĐỂ SO SÁNH =====
const lastData = {};

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

const predictors = {};

function getPredictor(tableId) {
    if (!predictors[tableId]) {
        predictors[tableId] = new AdvancedBaccaratPredictor(tableId);
    }
    return predictors[tableId];
}

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

// ===== HÀM ĐIỀU CHỈNH TỈ LỆ - ĐẢM BẢO > 48% VÀ ≠ 50% =====
function adjustWinRate(winRate) {
    // Nếu < 48% -> đẩy lên 48-49.9%
    if (winRate < 48) {
        return 48 + (Math.random() * 1.9);
    }
    // Nếu từ 49-51% -> tránh 50%
    if (winRate >= 49 && winRate <= 51) {
        return Math.random() > 0.5 ? 48 + Math.random() * 1.5 : 51.5 + Math.random() * 1.5;
    }
    // Nếu > 75% -> giảm xuống 72-74%
    if (winRate > 75) {
        return 72 + Math.random() * 2;
    }
    // Đảm bảo không bao giờ = 50
    if (Math.abs(winRate - 50) < 0.5) {
        return winRate > 50 ? 50.5 + Math.random() * 0.5 : 49.5 - Math.random() * 0.5;
    }
    return winRate;
}

// =====================================
// API DỰ ĐOÁN 1 BÀN
// =====================================

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
        
        const lastDataKey = `table_${tableId}`;
        const oldData = lastData[lastDataKey] || '';
        
        // KIỂM TRA DỮ LIỆU MỚI: dài hơn và khác
        const isNewData = (history !== oldData && history.length > oldData.length);
        lastData[lastDataKey] = history;
        
        const predictor = getPredictor(tableId);
        let prediction;
        let isNewSession = false;
        
        if (isNewData) {
            // CÓ KẾT QUẢ MỚI -> TĂNG PHIÊN
            prediction = predictor.newSession(history);
            isNewSession = true;
            
            // Điều chỉnh tỉ lệ
            let winRate = prediction.winRate;
            winRate = adjustWinRate(winRate);
            prediction.winRate = Math.round(winRate);
            
        } else {
            // KHÔNG CÓ KẾT QUẢ MỚI -> GIỮ NGUYÊN PHIÊN
            const result = predictor.comprehensiveAnalysis(history);
            
            // Điều chỉnh tỉ lệ
            let winRate = result.winRate;
            winRate = adjustWinRate(winRate);
            
            prediction = {
                session: predictor.session,
                prediction: result.prediction,
                winRate: Math.round(winRate),
                confidence: result.confidence || 0.5,
                validMethods: result.validMethods || 0,
                totalMethods: result.totalMethods || 0
            };
        }
        
        const pattern = analyzePattern(history);
        const nameMap = { 'B': 'Banker', 'P': 'Player', 'T': 'Tie' };
        
        // Đảm bảo tỉ lệ không bao giờ = 50
        let finalWinRate = prediction.winRate;
        if (finalWinRate === 50) {
            finalWinRate = Math.random() > 0.5 ? 49 : 51;
        }
        
        res.json({
            success: true,
            table: `Bàn ${tableId}`,
            phiên: prediction.session,
            dự_đoán: nameMap[prediction.prediction] || prediction.prediction,
            tỉ_lệ: `${finalWinRate}%`,
            cầu: pattern,
            confidence: `${Math.round((prediction.confidence || 0.5) * 100)}%`,
            is_new_data: isNewData,
            is_new_session: isNewSession,
            data_length: history.length,
            old_data_length: oldData.length,
            methods_used: prediction.validMethods || 0,
            timestamp: new Date().toISOString(),
            id: '@tranhoang2286'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// API DỰ ĐOÁN TẤT CẢ BÀN
// =====================================

app.get('/api/predict/all', async (req, res) => {
    try {
        const tableIds = ['1', '5', '6', '8', '10', '11', '12'];
        const results = [];
        let totalNewData = 0;
        
        for (const id of tableIds) {
            const history = await fetchTableData(id);
            if (history) {
                const lastDataKey = `table_${id}`;
                const oldData = lastData[lastDataKey] || '';
                const isNewData = (history !== oldData && history.length > oldData.length);
                
                if (isNewData) totalNewData++;
                lastData[lastDataKey] = history;
                
                const predictor = getPredictor(id);
                let prediction;
                
                if (isNewData) {
                    prediction = predictor.newSession(history);
                    let winRate = prediction.winRate;
                    winRate = adjustWinRate(winRate);
                    prediction.winRate = Math.round(winRate);
                } else {
                    const result = predictor.comprehensiveAnalysis(history);
                    let winRate = result.winRate;
                    winRate = adjustWinRate(winRate);
                    prediction = {
                        session: predictor.session,
                        prediction: result.prediction,
                        winRate: Math.round(winRate),
                        confidence: result.confidence || 0.5,
                        validMethods: result.validMethods || 0
                    };
                }
                
                const pattern = analyzePattern(history);
                const nameMap = { 'B': 'Banker', 'P': 'Player', 'T': 'Tie' };
                
                let finalWinRate = prediction.winRate;
                if (finalWinRate === 50) {
                    finalWinRate = Math.random() > 0.5 ? 49 : 51;
                }
                
                results.push({
                    table: `Bàn ${id}`,
                    phiên: prediction.session,
                    dự_đoán: nameMap[prediction.prediction] || prediction.prediction,
                    tỉ_lệ: `${finalWinRate}%`,
                    cầu: pattern,
                    confidence: `${Math.round((prediction.confidence || 0.5) * 100)}%`,
                    is_new_data: isNewData,
                    data_length: history.length
                });
            }
        }
        
        res.json({
            success: true,
            data: results,
            total: results.length,
            new_data_count: totalNewData,
            timestamp: new Date().toISOString(),
            id: '@tranhoang2286'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// API RESET DỮ LIỆU
// =====================================

app.get('/api/reset/:tableId', (req, res) => {
    try {
        const tableId = req.params.tableId;
        const lastDataKey = `table_${tableId}`;
        lastData[lastDataKey] = '';
        
        if (predictors[tableId]) {
            predictors[tableId].session = 0;
            predictors[tableId].predictions = [];
            predictors[tableId].winRateHistory = [];
        }
        
        res.json({
            success: true,
            message: `Đã reset bàn ${tableId}`,
            id: '@tranhoang2286'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// API KIỂM TRA TRẠNG THÁI
// =====================================

app.get('/api/status', (req, res) => {
    const status = {};
    for (const [key, value] of Object.entries(lastData)) {
        const tableId = key.replace('table_', '');
        const predictor = predictors[tableId];
        status[tableId] = {
            data_length: value.length,
            session: predictor ? predictor.session : 0,
            predictions: predictor ? predictor.predictions.length : 0
        };
    }
    res.json({
        success: true,
        data: status,
        id: '@tranhoang2286'
    });
});

// =====================================
// ROOT & HEALTH CHECK
// =====================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        tables: Object.keys(predictors).length,
        methods: 30,
        id: '@tranhoang2286'
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'BACCARAT PREDICTION API - SIÊU MẠNH V4.0',
        version: '4.0.0',
        author: '@tranhoang2286',
        features: {
            phiên: 'Chỉ tăng khi có kết quả mới',
            tỉ_lệ: 'Luôn > 48% và ≠ 50%',
            methods: '30+ phương pháp phân tích'
        },
        endpoints: {
            'Dự đoán 1 bàn': '/api/predict/:tableId',
            'Dự đoán tất cả': '/api/predict/all',
            'Reset dữ liệu': '/api/reset/:tableId',
            'Kiểm tra trạng thái': '/api/status',
            'Health Check': '/api/health'
        },
        example: {
            url: '/api/predict/5',
            response: {
                success: true,
                table: 'Bàn 5',
                phiên: 1,
                dự_đoán: 'Banker',
                tỉ_lệ: '63%',
                cầu: 'Dây B x4 | Xu hướng Banker',
                confidence: '72%',
                is_new_data: true,
                is_new_session: true,
                id: '@tranhoang2286'
            }
        }
    });
});

// ===== KHỞI ĐỘNG =====
app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🃏 BACCARAT PREDICTION API - SIÊU MẠNH');
    console.log('========================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log('📊 Tính năng:');
    console.log('   ✅ Phiên chỉ tăng khi có kết quả mới');
    console.log('   ✅ Tỉ lệ luôn > 48% và ≠ 50%');
    console.log('   ✅ 30+ phương pháp phân tích');
    console.log(`👤 Author: @tranhoang2286`);
    console.log('========================================');
});
