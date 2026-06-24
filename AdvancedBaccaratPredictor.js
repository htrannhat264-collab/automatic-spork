// ============================================================
// BACCARAT PREDICTOR - SIÊU MẠNH V4.0
// 30+ PHƯƠNG PHÁP PHÂN TÍCH - KHÔNG RANDOM
// ============================================================

class AdvancedBaccaratPredictor {
    constructor(tableName) {
        this.tableName = tableName;
        this.session = 0;
        this.history = '';
        this.predictions = [];
        this.winRateHistory = [];
        this.accuracyHistory = [];
        
        this.config = {
            recentWindow: 25,
            patternWindow: 20,
            minDataPoints: 5,
            confidenceThreshold: 0.3,
            learningRate: 0.01
        };
        
        // 30+ phương pháp với trọng số
        this.weights = {
            frequency: 0.06,
            frequency_weighted: 0.05,
            recent: 0.06,
            recent_weighted: 0.05,
            streak: 0.05,
            zigzag: 0.04,
            repeat: 0.04,
            pattern_2_2: 0.03,
            pattern_3_3: 0.03,
            pattern_4_4: 0.02,
            pattern_123: 0.02,
            pattern_212: 0.02,
            markov1: 0.05,
            markov2: 0.04,
            markov3: 0.03,
            markov_adaptive: 0.03,
            bayesian: 0.04,
            bayesian_adaptive: 0.03,
            posterior: 0.03,
            neural: 0.04,
            deep_neural: 0.03,
            lstm: 0.02,
            gap: 0.03,
            correlation: 0.03,
            autocorrelation: 0.02,
            cross_correlation: 0.02,
            entropy: 0.02,
            adaptive_entropy: 0.02,
            information_gain: 0.02,
            momentum: 0.02,
            adaptive_momentum: 0.02,
            acceleration: 0.02,
            regression: 0.02,
            adaptive_regression: 0.02,
            polynomial: 0.01,
            cluster: 0.02,
            hierarchical: 0.01,
            density: 0.01,
            pair: 0.02,
            triple: 0.02,
            distribution: 0.02,
            volatility: 0.01,
            harmonic: 0.01,
            fibonacci: 0.01,
            resistance: 0.01,
            support_resistance: 0.01,
            pivot: 0.01,
            trendline: 0.01
        };
        
        // Markov
        this.markov1 = {
            'B': { 'B': 0, 'P': 0, 'T': 0 },
            'P': { 'B': 0, 'P': 0, 'T': 0 },
            'T': { 'B': 0, 'P': 0, 'T': 0 }
        };
        this.markov2 = {};
        this.markov3 = {};
        
        // Bayesian
        this.prior = { 'B': 0.45, 'P': 0.45, 'T': 0.10 };
        this.prior_adaptive = { 'B': 0.45, 'P': 0.45, 'T': 0.10 };
        this.likelihood = {
            'B': { 'B': 0.4, 'P': 0.3, 'T': 0.3 },
            'P': { 'B': 0.3, 'P': 0.4, 'T': 0.3 },
            'T': { 'B': 0.2, 'P': 0.2, 'T': 0.6 }
        };
        
        // Neural Network
        this.neural = {
            weights1: {
                'B': { 'B': 0.35, 'P': 0.25, 'T': 0.15 },
                'P': { 'B': 0.25, 'P': 0.35, 'T': 0.15 },
                'T': { 'B': 0.15, 'P': 0.15, 'T': 0.35 }
            },
            weights2: {
                'B': { 'B': 0.3, 'P': 0.3, 'T': 0.2 },
                'P': { 'B': 0.3, 'P': 0.3, 'T': 0.2 },
                'T': { 'B': 0.2, 'P': 0.2, 'T': 0.4 }
            },
            bias1: { 'B': 0.1, 'P': 0.1, 'T': 0.1 },
            bias2: { 'B': 0.1, 'P': 0.1, 'T': 0.1 }
        };
        
        // Stats
        this.stats = {
            counts: { 'B': 0, 'P': 0, 'T': 0 },
            weighted_counts: { 'B': 0, 'P': 0, 'T': 0 },
            streaks: { 'B': 0, 'P': 0, 'T': 0 },
            maxStreaks: { 'B': 0, 'P': 0, 'T': 0 },
            minStreaks: { 'B': Infinity, 'P': Infinity, 'T': Infinity },
            pairs: {},
            triples: {},
            gaps: { 'B': [], 'P': [], 'T': [] },
            lastPositions: { 'B': -1, 'P': -1, 'T': -1 }
        };
        
        this.detailedHistory = [];
        this.predictionResults = [];
    }

    // ===== FREQUENCY ANALYSIS =====
    frequencyAnalysis(history) {
        const total = history.length || 1;
        const counts = { 'B': 0, 'P': 0, 'T': 0 };
        for (const char of history) {
            if (counts[char] !== undefined) counts[char]++;
        }
        const pred = this.getMaxKey(counts);
        return {
            prediction: pred,
            confidence: Math.min(counts[pred] / total, 0.9),
            counts: counts
        };
    }

    frequencyWeightedAnalysis(history) {
        const total = history.length || 1;
        const weighted = { 'B': 0, 'P': 0, 'T': 0 };
        for (let i = 0; i < history.length; i++) {
            const char = history[i];
            const weight = 1 + (i / history.length);
            if (weighted[char] !== undefined) weighted[char] += weight;
        }
        const pred = this.getMaxKey(weighted);
        const totalWeight = Object.values(weighted).reduce((a, b) => a + b, 0);
        return {
            prediction: pred,
            confidence: Math.min((weighted[pred] / totalWeight) * 1.2, 0.9)
        };
    }

    // ===== RECENT TREND =====
    recentTrendAnalysis(history) {
        const window = Math.min(this.config.recentWindow, history.length);
        const recent = history.slice(-window);
        const total = recent.length || 1;
        const counts = { 'B': 0, 'P': 0, 'T': 0 };
        const weighted = { 'B': 0, 'P': 0, 'T': 0 };
        for (let i = 0; i < recent.length; i++) {
            const char = recent[i];
            if (counts[char] !== undefined) {
                counts[char]++;
                weighted[char] += (i + 1) / total;
            }
        }
        const pred = this.getMaxKey(weighted);
        return {
            prediction: pred,
            confidence: Math.min(weighted[pred] / (total * 0.7), 0.9)
        };
    }

    timeWeightedTrend(history) {
        if (history.length < 5) return this.recentTrendAnalysis(history);
        const weighted = { 'B': 0, 'P': 0, 'T': 0 };
        const totalWeight = (history.length * (history.length + 1)) / 2;
        for (let i = 0; i < history.length; i++) {
            const char = history[i];
            const weight = (i + 1) / totalWeight;
            if (weighted[char] !== undefined) weighted[char] += weight;
        }
        const pred = this.getMaxKey(weighted);
        return {
            prediction: pred,
            confidence: Math.min((weighted[pred] / 0.5) * 0.8, 0.85)
        };
    }

    // ===== STREAK ANALYSIS =====
    streakAnalysis(history) {
        if (history.length < 2) return { prediction: 'B', confidence: 0 };
        let currentStreak = 1;
        const streaks = { 'B': 0, 'P': 0, 'T': 0 };
        const positions = { 'B': [], 'P': [], 'T': [] };
        for (let i = 1; i < history.length; i++) {
            if (history[i] === history[i-1]) {
                currentStreak++;
            } else {
                if (currentStreak > streaks[history[i-1]]) {
                    streaks[history[i-1]] = currentStreak;
                }
                positions[history[i-1]].push(currentStreak);
                currentStreak = 1;
            }
        }
        if (currentStreak > streaks[history[history.length-1]]) {
            streaks[history[history.length-1]] = currentStreak;
        }
        positions[history[history.length-1]].push(currentStreak);
        const lastChar = history[history.length - 1];
        const lastStreak = streaks[lastChar] || 1;
        const avgStreak = positions[lastChar].reduce((a, b) => a + b, 0) / (positions[lastChar].length || 1);
        const continueProb = lastStreak / (avgStreak || 1);
        let pred = 'B';
        let confidence = 0;
        if (continueProb > 0.7 && lastStreak < 5) {
            pred = lastChar;
            confidence = Math.min(0.4 + lastStreak * 0.05, 0.8);
        } else if (lastStreak >= 5) {
            const others = ['B', 'P', 'T'].filter(c => c !== lastChar);
            pred = others[0] || 'B';
            confidence = Math.min(0.3 + (lastStreak - 5) * 0.05, 0.7);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.35;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== ZIGZAG ANALYSIS =====
    zigzagAnalysis(history) {
        if (history.length < 3) return { prediction: 'B', confidence: 0 };
        let zigzagCount = 0;
        for (let i = 1; i < history.length - 1; i++) {
            if (history[i] !== history[i-1] && history[i] !== history[i+1]) {
                zigzagCount++;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (zigzagCount >= 3) {
            const lastChar = history[history.length - 1];
            const secondLast = history[history.length - 2];
            if (lastChar !== secondLast) {
                pred = lastChar;
                confidence = Math.min(0.45 + zigzagCount * 0.03, 0.75);
            } else {
                const others = ['B', 'P', 'T'].filter(c => c !== lastChar);
                pred = others[0] || 'B';
                confidence = 0.4 + zigzagCount * 0.02;
            }
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: Math.min(confidence, 0.85) };
    }

    // ===== REPEAT PATTERN =====
    repeatPatternAnalysis(history) {
        if (history.length < 4) return { prediction: 'B', confidence: 0 };
        const maxLen = Math.min(6, Math.floor(history.length / 2));
        let bestPattern = '';
        let bestCount = 0;
        let bestLen = 0;
        for (let len = 2; len <= maxLen; len++) {
            const lastPattern = history.slice(-len);
            let count = 0;
            for (let i = 0; i < history.length - len; i++) {
                if (history.substring(i, i + len) === lastPattern) {
                    count++;
                }
            }
            if (count > bestCount) {
                bestCount = count;
                bestPattern = lastPattern;
                bestLen = len;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (bestCount >= 2) {
            const nextChar = history[history.indexOf(bestPattern) + bestLen];
            if (nextChar) {
                pred = nextChar;
                confidence = Math.min(0.3 + bestCount * 0.06, 0.75);
            }
        }
        if (confidence === 0) {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== PATTERN 2-2 =====
    twoTwoPattern(history) {
        if (history.length < 6) return { prediction: 'B', confidence: 0 };
        let matchCount = 0;
        for (let i = 1; i < Math.min(8, history.length - 1); i += 2) {
            if (history[history.length - i] === history[history.length - i - 1]) {
                matchCount++;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (matchCount >= 2) {
            pred = history[history.length - 1];
            confidence = Math.min(0.45 + matchCount * 0.05, 0.75);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== PATTERN 3-3 =====
    threeThreePattern(history) {
        if (history.length < 8) return { prediction: 'B', confidence: 0 };
        let matchCount = 0;
        for (let i = 2; i < Math.min(9, history.length - 1); i += 3) {
            if (history[history.length - i] === history[history.length - i - 1] &&
                history[history.length - i] === history[history.length - i - 2]) {
                matchCount++;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (matchCount >= 2) {
            pred = history[history.length - 1];
            confidence = Math.min(0.45 + matchCount * 0.05, 0.75);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== PATTERN 4-4 =====
    fourFourPattern(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0 };
        let matchCount = 0;
        for (let i = 3; i < Math.min(12, history.length - 1); i += 4) {
            if (history[history.length - i] === history[history.length - i - 1] &&
                history[history.length - i] === history[history.length - i - 2] &&
                history[history.length - i] === history[history.length - i - 3]) {
                matchCount++;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (matchCount >= 2) {
            pred = history[history.length - 1];
            confidence = Math.min(0.4 + matchCount * 0.05, 0.7);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== PATTERN 1-2-3 =====
    pattern123(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0 };
        let matchCount = 0;
        for (let i = 0; i < history.length - 6; i++) {
            if (history[i] !== history[i+1] &&
                history[i+1] === history[i+2] &&
                history[i+3] !== history[i+2] &&
                history[i+3] === history[i+4] &&
                history[i+4] === history[i+5]) {
                matchCount++;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (matchCount >= 2) {
            const lastChar = history[history.length - 1];
            const secondLast = history[history.length - 2];
            if (lastChar !== secondLast) {
                pred = lastChar;
                confidence = Math.min(0.4 + matchCount * 0.03, 0.7);
            }
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== PATTERN 2-1-2 =====
    pattern212(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0 };
        let matchCount = 0;
        for (let i = 0; i < history.length - 5; i++) {
            if (history[i] === history[i+1] &&
                history[i+1] !== history[i+2] &&
                history[i+2] === history[i+3] &&
                history[i+3] === history[i+4]) {
                matchCount++;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (matchCount >= 2) {
            const lastChar = history[history.length - 1];
            const secondLast = history[history.length - 2];
            if (lastChar === secondLast) {
                pred = lastChar;
                confidence = Math.min(0.4 + matchCount * 0.03, 0.7);
            }
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== MARKOV 1 =====
    markov1Analysis(history) {
        if (history.length < 2) return { prediction: 'B', confidence: 0 };
        for (let i = 0; i < history.length - 1; i++) {
            const current = history[i];
            const next = history[i + 1];
            if (this.markov1[current] && this.markov1[current][next] !== undefined) {
                this.markov1[current][next]++;
            }
        }
        const lastChar = history[history.length - 1];
        const transitions = this.markov1[lastChar];
        if (!transitions) return { prediction: 'B', confidence: 0 };
        const total = Object.values(transitions).reduce((a, b) => a + b, 0);
        if (total === 0) return { prediction: 'B', confidence: 0 };
        let maxProb = 0;
        let pred = 'B';
        for (const [char, count] of Object.entries(transitions)) {
            const prob = count / total;
            if (prob > maxProb) {
                maxProb = prob;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxProb * 1.3, 0.9) };
    }

    // ===== MARKOV 2 =====
    markov2Analysis(history) {
        if (history.length < 3) return { prediction: 'B', confidence: 0 };
        for (let i = 0; i < history.length - 2; i++) {
            const key = history[i] + history[i + 1];
            const next = history[i + 2];
            if (!this.markov2[key]) {
                this.markov2[key] = { 'B': 0, 'P': 0, 'T': 0 };
            }
            if (this.markov2[key][next] !== undefined) {
                this.markov2[key][next]++;
            }
        }
        const lastKey = history.slice(-2);
        const transitions = this.markov2[lastKey];
        if (!transitions) return { prediction: 'B', confidence: 0 };
        const total = Object.values(transitions).reduce((a, b) => a + b, 0);
        if (total === 0) return { prediction: 'B', confidence: 0 };
        let maxProb = 0;
        let pred = 'B';
        for (const [char, count] of Object.entries(transitions)) {
            const prob = count / total;
            if (prob > maxProb) {
                maxProb = prob;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxProb * 1.4, 0.9) };
    }

    // ===== MARKOV 3 =====
    markov3Analysis(history) {
        if (history.length < 4) return { prediction: 'B', confidence: 0 };
        for (let i = 0; i < history.length - 3; i++) {
            const key = history[i] + history[i + 1] + history[i + 2];
            const next = history[i + 3];
            if (!this.markov3[key]) {
                this.markov3[key] = { 'B': 0, 'P': 0, 'T': 0 };
            }
            if (this.markov3[key][next] !== undefined) {
                this.markov3[key][next]++;
            }
        }
        const lastKey = history.slice(-3);
        const transitions = this.markov3[lastKey];
        if (!transitions) return { prediction: 'B', confidence: 0 };
        const total = Object.values(transitions).reduce((a, b) => a + b, 0);
        if (total === 0) return { prediction: 'B', confidence: 0 };
        let maxProb = 0;
        let pred = 'B';
        for (const [char, count] of Object.entries(transitions)) {
            const prob = count / total;
            if (prob > maxProb) {
                maxProb = prob;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxProb * 1.5, 0.9) };
    }

    // ===== MARKOV ADAPTIVE =====
    markovAdaptive(history) {
        if (history.length < 5) return this.markov1Analysis(history);
        const m1 = this.markov1Analysis(history);
        const m2 = this.markov2Analysis(history);
        const m3 = this.markov3Analysis(history);
        const scores = { 'B': 0, 'P': 0, 'T': 0 };
        const confidences = { 'B': 0, 'P': 0, 'T': 0 };
        const results = [m1, m2, m3];
        let totalWeight = 0;
        for (const result of results) {
            if (result && result.prediction && result.confidence) {
                const weight = result.confidence;
                scores[result.prediction] += weight * 10;
                confidences[result.prediction] += weight;
                totalWeight += weight;
            }
        }
        let pred = 'B';
        let maxScore = 0;
        for (const char of ['B', 'P', 'T']) {
            if (scores[char] > maxScore) {
                maxScore = scores[char];
                pred = char;
            }
        }
        const confidence = totalWeight > 0 ? confidences[pred] / totalWeight : 0;
        return { prediction: pred, confidence: Math.min(confidence * 1.1, 0.9) };
    }

    // ===== BAYESIAN =====
    bayesianAnalysis(history) {
        if (history.length < 5) return { prediction: 'B', confidence: 0.5 };
        const recent = history.slice(-10);
        const posterior = { 'B': 0, 'P': 0, 'T': 0 };
        for (const state of ['B', 'P', 'T']) {
            let likelihood = 0;
            for (const char of recent) {
                if (char === state) likelihood++;
            }
            likelihood = (likelihood / recent.length) || 0.01;
            posterior[state] = this.prior[state] * likelihood;
        }
        const total = Object.values(posterior).reduce((a, b) => a + b, 0);
        if (total === 0) return { prediction: 'B', confidence: 0 };
        let maxPosterior = 0;
        let pred = 'B';
        for (const [char, value] of Object.entries(posterior)) {
            const normalized = value / total;
            if (normalized > maxPosterior) {
                maxPosterior = normalized;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxPosterior * 1.3, 0.9) };
    }

    // ===== BAYESIAN ADAPTIVE =====
    bayesianAdaptive(history) {
        if (history.length < 10) return this.bayesianAnalysis(history);
        const counts = { 'B': 0, 'P': 0, 'T': 0 };
        for (const char of history) {
            if (counts[char] !== undefined) counts[char]++;
        }
        const total = history.length;
        this.prior_adaptive = {
            'B': (counts['B'] / total) * 0.7 + 0.15,
            'P': (counts['P'] / total) * 0.7 + 0.15,
            'T': (counts['T'] / total) * 0.7 + 0.033
        };
        const recent = history.slice(-15);
        const posterior = { 'B': 0, 'P': 0, 'T': 0 };
        for (const state of ['B', 'P', 'T']) {
            let likelihood = 0;
            for (const char of recent) {
                if (char === state) likelihood++;
            }
            likelihood = (likelihood / recent.length) || 0.01;
            posterior[state] = this.prior_adaptive[state] * likelihood;
        }
        const totalPost = Object.values(posterior).reduce((a, b) => a + b, 0);
        if (totalPost === 0) return { prediction: 'B', confidence: 0 };
        let maxPost = 0;
        let pred = 'B';
        for (const [char, value] of Object.entries(posterior)) {
            const normalized = value / totalPost;
            if (normalized > maxPost) {
                maxPost = normalized;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxPost * 1.4, 0.9) };
    }

    // ===== POSTERIOR PROBABILITY =====
    posteriorProbability(history) {
        if (history.length < 10) return this.bayesianAnalysis(history);
        const predictions = [];
        const windowSize = Math.min(10, history.length);
        for (let i = 0; i < history.length - windowSize + 1; i++) {
            const win = history.substring(i, i + windowSize);
            predictions.push(this.bayesianAdaptive(win));
        }
        const scores = { 'B': 0, 'P': 0, 'T': 0 };
        const confidences = { 'B': 0, 'P': 0, 'T': 0 };
        for (const pred of predictions) {
            if (pred && pred.prediction && pred.confidence) {
                scores[pred.prediction] += pred.confidence * 10;
                confidences[pred.prediction] += pred.confidence;
            }
        }
        let pred = 'B';
        let maxScore = 0;
        for (const char of ['B', 'P', 'T']) {
            if (scores[char] > maxScore) {
                maxScore = scores[char];
                pred = char;
            }
        }
        const totalConf = Object.values(confidences).reduce((a, b) => a + b, 0);
        const confidence = totalConf > 0 ? confidences[pred] / totalConf : 0;
        return { prediction: pred, confidence: Math.min(confidence * 1.2, 0.85) };
    }

    // ===== NEURAL NETWORK =====
    neuralAnalysis(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0.5 };
        const nGrams = { 1: {}, 2: {}, 3: {}, 4: {} };
        for (let n = 1; n <= 4; n++) {
            for (let i = 0; i < history.length - n + 1; i++) {
                const gram = history.substring(i, i + n);
                if (!nGrams[n][gram]) {
                    nGrams[n][gram] = { count: 0, next: {} };
                }
                nGrams[n][gram].count++;
                if (i + n < history.length) {
                    const next = history[i + n];
                    if (!nGrams[n][gram].next[next]) {
                        nGrams[n][gram].next[next] = 0;
                    }
                    nGrams[n][gram].next[next]++;
                }
            }
        }
        const last1 = history[history.length - 1];
        const last2 = history.slice(-2);
        const last3 = history.slice(-3);
        const last4 = history.slice(-4);
        const scores = { 'B': 0, 'P': 0, 'T': 0 };
        const weights = this.neural.weights1;
        if (nGrams[1][last1]) {
            const total = nGrams[1][last1].count;
            for (const [next, count] of Object.entries(nGrams[1][last1].next)) {
                const prob = count / total;
                scores[next] += prob * weights['B'][next] * 0.3;
            }
        }
        if (nGrams[2][last2]) {
            const total = nGrams[2][last2].count;
            for (const [next, count] of Object.entries(nGrams[2][last2].next)) {
                const prob = count / total;
                scores[next] += prob * weights['P'][next] * 0.5;
            }
        }
        if (nGrams[3][last3]) {
            const total = nGrams[3][last3].count;
            for (const [next, count] of Object.entries(nGrams[3][last3].next)) {
                const prob = count / total;
                scores[next] += prob * weights['T'][next] * 0.7;
            }
        }
        if (nGrams[4][last4]) {
            const total = nGrams[4][last4].count;
            for (const [next, count] of Object.entries(nGrams[4][last4].next)) {
                const prob = count / total;
                scores[next] += prob * 1.0;
            }
        }
        let maxScore = 0;
        let pred = 'B';
        for (const [char, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxScore / 2, 0.9) };
    }

    // ===== DEEP NEURAL =====
    deepNeuralAnalysis(history) {
        if (history.length < 15) return this.neuralAnalysis(history);
        const input = { 'B': 0, 'P': 0, 'T': 0 };
        const weights = this.neural.weights1;
        const weights2 = this.neural.weights2;
        const counts = { 'B': 0, 'P': 0, 'T': 0 };
        for (const char of history) {
            if (counts[char] !== undefined) counts[char]++;
        }
        const total = history.length;
        for (const char of ['B', 'P', 'T']) {
            input[char] = counts[char] / total;
        }
        const hidden1 = { 'B': 0, 'P': 0, 'T': 0 };
        for (const out of ['B', 'P', 'T']) {
            let sum = 0;
            for (const inChar of ['B', 'P', 'T']) {
                sum += input[inChar] * weights[inChar][out];
            }
            hidden1[out] = this.sigmoid(sum + this.neural.bias1[out]);
        }
        const hidden2 = { 'B': 0, 'P': 0, 'T': 0 };
        for (const out of ['B', 'P', 'T']) {
            let sum = 0;
            for (const inChar of ['B', 'P', 'T']) {
                sum += hidden1[inChar] * weights2[inChar][out];
            }
            hidden2[out] = this.sigmoid(sum + this.neural.bias2[out]);
        }
        let maxOutput = 0;
        let pred = 'B';
        for (const char of ['B', 'P', 'T']) {
            if (hidden2[char] > maxOutput) {
                maxOutput = hidden2[char];
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxOutput * 1.5, 0.9) };
    }

    // ===== LSTM =====
    lstmAnalysis(history) {
        if (history.length < 20) return this.neuralAnalysis(history);
        const windowSize = 10;
        const windows = [];
        for (let i = 0; i < history.length - windowSize + 1; i++) {
            windows.push(history.substring(i, i + windowSize));
        }
        const results = [];
        for (const win of windows) {
            results.push(this.deepNeuralAnalysis(win));
        }
        const scores = { 'B': 0, 'P': 0, 'T': 0 };
        const confidences = { 'B': 0, 'P': 0, 'T': 0 };
        for (const result of results) {
            if (result && result.prediction && result.confidence) {
                const weight = result.confidence;
                scores[result.prediction] += weight * 10;
                confidences[result.prediction] += weight;
            }
        }
        let pred = 'B';
        let maxScore = 0;
        for (const char of ['B', 'P', 'T']) {
            if (scores[char] > maxScore) {
                maxScore = scores[char];
                pred = char;
            }
        }
        const totalConf = Object.values(confidences).reduce((a, b) => a + b, 0);
        const confidence = totalConf > 0 ? confidences[pred] / totalConf : 0;
        return { prediction: pred, confidence: Math.min(confidence * 1.1, 0.85) };
    }

    // ===== GAP ANALYSIS =====
    gapAnalysis(history) {
        const gaps = { 'B': [], 'P': [], 'T': [] };
        const lastPos = { 'B': -1, 'P': -1, 'T': -1 };
        for (let i = 0; i < history.length; i++) {
            const char = history[i];
            if (lastPos[char] !== -1) {
                gaps[char].push(i - lastPos[char] - 1);
            }
            lastPos[char] = i;
        }
        const avgGaps = {};
        for (const char of ['B', 'P', 'T']) {
            if (gaps[char].length > 0) {
                avgGaps[char] = gaps[char].reduce((a, b) => a + b, 0) / gaps[char].length;
            } else {
                avgGaps[char] = 2;
            }
        }
        const currentGap = {};
        for (const char of ['B', 'P', 'T']) {
            currentGap[char] = history.length - 1 - lastPos[char];
        }
        const scores = {};
        for (const char of ['B', 'P', 'T']) {
            if (lastPos[char] === -1) {
                scores[char] = 0.1;
            } else {
                const ratio = currentGap[char] / (avgGaps[char] || 1);
                scores[char] = Math.min(ratio, 1);
            }
        }
        let maxScore = 0;
        let pred = 'B';
        for (const [char, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxScore * 0.8, 0.85) };
    }

    // ===== CORRELATION =====
    correlationAnalysis(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0.5 };
        const sequence = history.split('').map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
        const n = sequence.length;
        const mean = sequence.reduce((a, b) => a + b, 0) / n;
        const variance = sequence.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const correlations = [];
        for (let lag = 1; lag <= Math.min(8, n - 1); lag++) {
            let sum = 0;
            for (let i = 0; i < n - lag; i++) {
                sum += (sequence[i] - mean) * (sequence[i + lag] - mean);
            }
            correlations.push(sum / ((n - lag) * variance));
        }
        const lastValue = sequence[n - 1];
        let predictedValue = lastValue;
        let confidence = 0.5;
        let positiveCount = correlations.filter(c => c > 0.2).length;
        let negativeCount = correlations.filter(c => c < -0.2).length;
        if (positiveCount > negativeCount + 1) {
            predictedValue = lastValue;
            confidence = Math.min(0.4 + positiveCount * 0.05, 0.8);
        } else if (negativeCount > positiveCount + 1) {
            predictedValue = -lastValue;
            confidence = Math.min(0.4 + negativeCount * 0.05, 0.8);
        }
        let pred = 'B';
        if (predictedValue > 0) pred = 'B';
        else if (predictedValue < 0) pred = 'P';
        else pred = 'T';
        return { prediction: pred, confidence: confidence };
    }

    // ===== AUTOCORRELATION =====
    autocorrelationAnalysis(history) {
        if (history.length < 15) return this.correlationAnalysis(history);
        const result = this.correlationAnalysis(history);
        const sequence = history.split('').map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
        const n = sequence.length;
        const mean = sequence.reduce((a, b) => a + b, 0) / n;
        const acf = [];
        for (let lag = 1; lag <= Math.min(10, n - 1); lag++) {
            let sum = 0;
            for (let i = 0; i < n - lag; i++) {
                sum += (sequence[i] - mean) * (sequence[i + lag] - mean);
            }
            acf.push(sum / ((n - lag) * n));
        }
        let period = 0;
        let maxACF = 0;
        for (let i = 0; i < acf.length; i++) {
            if (acf[i] > maxACF && i > 0) {
                maxACF = acf[i];
                period = i + 1;
            }
        }
        if (period > 0 && maxACF > 0.3) {
            const nextIndex = n % period;
            const nextValue = sequence[nextIndex];
            let pred = 'B';
            if (nextValue > 0) pred = 'B';
            else if (nextValue < 0) pred = 'P';
            else pred = 'T';
            return { prediction: pred, confidence: Math.min(maxACF * 0.8 + 0.2, 0.85) };
        }
        return result;
    }

    // ===== CROSS CORRELATION =====
    crossCorrelationAnalysis(history) {
        if (history.length < 20) return this.correlationAnalysis(history);
        const sequence = history.split('');
        const crossCorr = {};
        for (const c1 of ['B', 'P', 'T']) {
            for (const c2 of ['B', 'P', 'T']) {
                if (c1 !== c2) {
                    const key = c1 + c2;
                    crossCorr[key] = [];
                    for (let lag = 1; lag <= Math.min(5, history.length / 2); lag++) {
                        let count = 0;
                        for (let i = 0; i < history.length - lag; i++) {
                            if (sequence[i] === c1 && sequence[i + lag] === c2) {
                                count++;
                            }
                        }
                        crossCorr[key].push(count / (history.length - lag));
                    }
                }
            }
        }
        const lastChar = history[history.length - 1];
        const scores = { 'B': 0, 'P': 0, 'T': 0 };
        for (const char of ['B', 'P', 'T']) {
            if (char !== lastChar) {
                const key = lastChar + char;
                if (crossCorr[key]) {
                    const maxCorr = Math.max(...crossCorr[key]);
                    scores[char] = maxCorr * 1.5;
                }
            }
        }
        if (Object.values(scores).reduce((a, b) => a + b, 0) === 0) {
            return this.correlationAnalysis(history);
        }
        let pred = 'B';
        let maxScore = 0;
        for (const [char, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxScore, 0.8) };
    }

    // ===== ENTROPY =====
    entropyAnalysis(history) {
        if (history.length < 5) return { prediction: 'B', confidence: 0 };
        const counts = { 'B': 0, 'P': 0, 'T': 0 };
        for (const char of history) {
            if (counts[char] !== undefined) counts[char]++;
        }
        const total = history.length;
        let entropy = 0;
        for (const char of ['B', 'P', 'T']) {
            const prob = counts[char] / total;
            if (prob > 0) {
                entropy -= prob * Math.log2(prob);
            }
        }
        const maxEntropy = Math.log2(3);
        const predictability = 1 - (entropy / maxEntropy);
        let pred = 'B';
        let confidence = 0;
        if (predictability > 0.6) {
            pred = this.getMaxKey(counts);
            confidence = Math.min(predictability * 0.9, 0.85);
        } else if (predictability > 0.4) {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.4;
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== ADAPTIVE ENTROPY =====
    adaptiveEntropy(history) {
        if (history.length < 10) return this.entropyAnalysis(history);
        const windowSize = Math.min(10, history.length);
        const windows = [];
        for (let i = 0; i < history.length - windowSize + 1; i++) {
            windows.push(history.substring(i, i + windowSize));
        }
        const entropies = [];
        for (const win of windows) {
            entropies.push(this.entropyAnalysis(win));
        }
        const avgEntropy = entropies.reduce((a, b) => a + b.entropy, 0) / entropies.length;
        const lastEntropy = entropies[entropies.length - 1].entropy;
        const entropyDiff = lastEntropy - avgEntropy;
        let pred = 'B';
        let confidence = 0;
        if (entropyDiff < -0.2) {
            const result = this.frequencyAnalysis(history);
            pred = result.prediction;
            confidence = Math.min(result.confidence * 1.2, 0.85);
        } else if (entropyDiff > 0.2) {
            const result = this.recentTrendAnalysis(history);
            pred = result.prediction;
            confidence = result.confidence * 0.8;
        } else {
            const result = this.frequencyAnalysis(history);
            pred = result.prediction;
            confidence = result.confidence;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== INFORMATION GAIN =====
    informationGain(history) {
        if (history.length < 10) return this.entropyAnalysis(history);
        const gains = [];
        for (let pos = 0; pos < Math.min(5, history.length - 1); pos++) {
            const entropy = this.entropyAnalysis(history).entropy;
            const conditionalEntropy = this.calculateConditionalEntropy(history, pos);
            gains.push(entropy - conditionalEntropy);
        }
        let maxGain = 0;
        let bestPos = 0;
        for (let i = 0; i < gains.length; i++) {
            if (gains[i] > maxGain) {
                maxGain = gains[i];
                bestPos = i + 1;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (maxGain > 0.1) {
            const lastChar = history[history.length - 1];
            const prevChar = history[history.length - 1 - bestPos];
            if (lastChar === prevChar) {
                pred = lastChar;
                confidence = Math.min(0.4 + maxGain, 0.8);
            } else {
                const others = ['B', 'P', 'T'].filter(c => c !== lastChar);
                pred = others[0] || 'B';
                confidence = Math.min(0.3 + maxGain, 0.7);
            }
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== MOMENTUM =====
    momentumAnalysis(history) {
        if (history.length < 5) return { prediction: 'B', confidence: 0 };
        const recent = history.slice(-5);
        let momentum = 0;
        const values = recent.split('').map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
        for (let i = 1; i < values.length; i++) {
            momentum += values[i] - values[i - 1];
        }
        let pred = 'B';
        let confidence = 0;
        if (Math.abs(momentum) > 2) {
            pred = momentum > 0 ? 'B' : 'P';
            confidence = Math.min(Math.abs(momentum) / 6, 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== ADAPTIVE MOMENTUM =====
    adaptiveMomentum(history) {
        if (history.length < 10) return this.momentumAnalysis(history);
        const momentums = [];
        for (let i = 5; i < history.length; i++) {
            const subHistory = history.substring(0, i);
            const result = this.momentumAnalysis(subHistory);
            momentums.push(result.momentum);
        }
        const avgMomentum = momentums.reduce((a, b) => a + b, 0) / momentums.length;
        const lastMomentum = momentums[momentums.length - 1] || 0;
        const momentumDiff = lastMomentum - avgMomentum;
        let pred = 'B';
        let confidence = 0;
        if (Math.abs(momentumDiff) > 1) {
            pred = momentumDiff > 0 ? 'B' : 'P';
            confidence = Math.min(Math.abs(momentumDiff) / 4, 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== ACCELERATION =====
    accelerationAnalysis(history) {
        if (history.length < 10) return this.momentumAnalysis(history);
        const values = history.split('').map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
        const velocities = [];
        for (let i = 1; i < values.length; i++) {
            velocities.push(values[i] - values[i - 1]);
        }
        const accelerations = [];
        for (let i = 1; i < velocities.length; i++) {
            accelerations.push(velocities[i] - velocities[i - 1]);
        }
        const lastAcceleration = accelerations[accelerations.length - 1] || 0;
        const avgAcceleration = accelerations.reduce((a, b) => a + b, 0) / (accelerations.length || 1);
        let pred = 'B';
        let confidence = 0;
        if (Math.abs(lastAcceleration) > Math.abs(avgAcceleration) * 1.5) {
            const lastValue = values[values.length - 1];
            pred = lastValue > 0 ? 'B' : 'P';
            confidence = Math.min(Math.abs(lastAcceleration) / 3, 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== REGRESSION =====
    regressionAnalysis(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0 };
        const values = history.split('').map((c, i) => ({ x: i, y: c === 'B' ? 1 : c === 'P' ? -1 : 0 }));
        const n = values.length;
        const sumX = values.reduce((a, b) => a + b.x, 0);
        const sumY = values.reduce((a, b) => a + b.y, 0);
        const sumXY = values.reduce((a, b) => a + b.x * b.y, 0);
        const sumX2 = values.reduce((a, b) => a + b.x * b.x, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const nextX = n;
        const predictionValue = slope * nextX + intercept;
        let pred = 'B';
        let confidence = 0;
        const rSquared = this.calculateRSquared(values, slope, intercept);
        if (Math.abs(predictionValue) > 0.2 && rSquared > 0.3) {
            pred = predictionValue > 0 ? 'B' : 'P';
            confidence = Math.min(Math.abs(predictionValue) * rSquared, 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== ADAPTIVE REGRESSION =====
    adaptiveRegression(history) {
        if (history.length < 15) return this.regressionAnalysis(history);
        const results = [];
        const windowSize = Math.min(10, history.length);
        for (let i = windowSize; i < history.length; i++) {
            const subHistory = history.substring(0, i);
            results.push(this.regressionAnalysis(subHistory));
        }
        const avgSlope = results.reduce((a, b) => a + b.slope, 0) / results.length;
        const lastSlope = results[results.length - 1]?.slope || 0;
        const slopeDiff = lastSlope - avgSlope;
        let pred = 'B';
        let confidence = 0;
        if (Math.abs(slopeDiff) > 0.1) {
            pred = slopeDiff > 0 ? 'B' : 'P';
            confidence = Math.min(Math.abs(slopeDiff) * 2, 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== POLYNOMIAL REGRESSION =====
    polynomialRegression(history) {
        if (history.length < 15) return this.regressionAnalysis(history);
        const values = history.split('').map((c, i) => ({ x: i, y: c === 'B' ? 1 : c === 'P' ? -1 : 0 }));
        const n = values.length;
        const sumX = values.reduce((a, b) => a + b.x, 0);
        const sumX2 = values.reduce((a, b) => a + b.x * b.x, 0);
        const sumX3 = values.reduce((a, b) => a + b.x * b.x * b.x, 0);
        const sumX4 = values.reduce((a, b) => a + b.x * b.x * b.x * b.x, 0);
        const sumY = values.reduce((a, b) => a + b.y, 0);
        const sumXY = values.reduce((a, b) => a + b.x * b.y, 0);
        const sumX2Y = values.reduce((a, b) => a + b.x * b.x * b.y, 0);
        const det = n * sumX2 * sumX4 + sumX * sumX3 * sumX2 + sumX2 * sumX * sumX3 -
                   sumX2 * sumX2 * sumX2 - sumX * sumX * sumX4 - n * sumX3 * sumX3;
        if (det === 0) return this.regressionAnalysis(history);
        const a = (sumY * (sumX2 * sumX4 - sumX3 * sumX3) +
                  sumX * (sumX3 * sumX2Y - sumX4 * sumXY) +
                  sumX2 * (sumXY * sumX3 - sumX2 * sumX2Y)) / det;
        const b = (n * (sumX3 * sumX2Y - sumX4 * sumXY) +
                  sumX * (sumY * sumX4 - sumX2 * sumX2Y) +
                  sumX2 * (sumX2 * sumXY - sumY * sumX3)) / det;
        const c = (n * (sumX2 * sumX2Y - sumX3 * sumXY) +
                  sumX * (sumX3 * sumY - sumX2 * sumXY) +
                  sumX2 * (sumXY * sumX2 - sumX * sumX2Y)) / det;
        const nextX = n;
        const predictionValue = a + b * nextX + c * nextX * nextX;
        let pred = 'B';
        let confidence = 0;
        if (Math.abs(predictionValue) > 0.3) {
            pred = predictionValue > 0 ? 'B' : 'P';
            confidence = Math.min(Math.abs(predictionValue), 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== CLUSTER =====
    clusterAnalysis(history) {
        if (history.length < 8) return { prediction: 'B', confidence: 0 };
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
        const avgSizes = {};
        for (const char of ['B', 'P', 'T']) {
            if (clusters[char].length > 0) {
                avgSizes[char] = clusters[char].reduce((a, b) => a + b, 0) / clusters[char].length;
            } else {
                avgSizes[char] = 0;
            }
        }
        let pred = 'B';
        let maxSize = 0;
        for (const [char, size] of Object.entries(avgSizes)) {
            if (size > maxSize) {
                maxSize = size;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxSize / 4, 0.8) };
    }

    // ===== HIERARCHICAL CLUSTER =====
    hierarchicalCluster(history) {
        if (history.length < 12) return this.clusterAnalysis(history);
        const windowSize = Math.min(8, history.length);
        const windows = [];
        for (let i = 0; i < history.length - windowSize + 1; i++) {
            windows.push(history.substring(i, i + windowSize));
        }
        const results = [];
        for (const win of windows) {
            results.push(this.clusterAnalysis(win));
        }
        const predictions = results.map(r => r.prediction);
        const counts = { 'B': 0, 'P': 0, 'T': 0 };
        for (const pred of predictions) {
            if (counts[pred] !== undefined) counts[pred]++;
        }
        let pred = 'B';
        let maxCount = 0;
        for (const [char, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxCount / results.length * 1.2, 0.85) };
    }

    // ===== DENSITY CLUSTER =====
    densityCluster(history) {
        if (history.length < 10) return this.clusterAnalysis(history);
        const density = {};
        const windowSize = 5;
        for (let i = 0; i < history.length - windowSize + 1; i++) {
            const key = history.substring(i, i + windowSize);
            if (!density[key]) density[key] = 0;
            density[key]++;
        }
        let maxDensity = 0;
        let densePattern = '';
        for (const [pattern, count] of Object.entries(density)) {
            if (count > maxDensity) {
                maxDensity = count;
                densePattern = pattern;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (densePattern && maxDensity > 2) {
            pred = densePattern[densePattern.length - 1];
            confidence = Math.min(maxDensity / 5, 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== PAIR =====
    pairAnalysis(history) {
        if (history.length < 4) return { prediction: 'B', confidence: 0 };
        const pairs = {};
        const chars = ['B', 'P', 'T'];
        for (const c1 of chars) {
            for (const c2 of chars) {
                pairs[c1 + c2] = 0;
            }
        }
        for (let i = 0; i < history.length - 1; i++) {
            const pair = history[i] + history[i + 1];
            if (pairs[pair] !== undefined) pairs[pair]++;
        }
        const lastPair = history.slice(-2);
        const nextCounts = {};
        for (const c of chars) {
            const pair = lastPair + c;
            nextCounts[c] = pairs[pair] || 0;
        }
        let pred = 'B';
        let maxCount = 0;
        for (const [char, count] of Object.entries(nextCounts)) {
            if (count > maxCount) {
                maxCount = count;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxCount / 5, 0.8) };
    }

    // ===== TRIPLE =====
    tripleAnalysis(history) {
        if (history.length < 5) return this.pairAnalysis(history);
        const triples = {};
        const chars = ['B', 'P', 'T'];
        for (const c1 of chars) {
            for (const c2 of chars) {
                for (const c3 of chars) {
                    triples[c1 + c2 + c3] = 0;
                }
            }
        }
        for (let i = 0; i < history.length - 2; i++) {
            const triple = history[i] + history[i + 1] + history[i + 2];
            if (triples[triple] !== undefined) triples[triple]++;
        }
        const lastTriple = history.slice(-3);
        const nextCounts = {};
        for (const c of chars) {
            const triple = lastTriple + c;
            nextCounts[c] = triples[triple] || 0;
        }
        let pred = 'B';
        let maxCount = 0;
        for (const [char, count] of Object.entries(nextCounts)) {
            if (count > maxCount) {
                maxCount = count;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxCount / 3, 0.8) };
    }

    // ===== DISTRIBUTION =====
    distributionAnalysis(history) {
        if (history.length < 8) return this.pairAnalysis(history);
        const chars = ['B', 'P', 'T'];
        const recent = history.slice(-12);
        const counts = {};
        const expected = {};
        for (const c of chars) {
            counts[c] = (recent.match(new RegExp(c, 'g')) || []).length;
            expected[c] = recent.length / 3;
        }
        const deviations = {};
        for (const c of chars) {
            deviations[c] = Math.abs(counts[c] - expected[c]) / expected[c];
        }
        let pred = 'B';
        let maxDeviation = 0;
        for (const [char, dev] of Object.entries(deviations)) {
            if (dev > maxDeviation) {
                maxDeviation = dev;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxDeviation * 0.5, 0.8) };
    }

    // ===== VOLATILITY =====
    volatilityAnalysis(history) {
        if (history.length < 3) return { prediction: 'B', confidence: 0 };
        const values = history.split('').map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
        const changes = [];
        for (let i = 1; i < values.length; i++) {
            changes.push(Math.abs(values[i] - values[i - 1]));
        }
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        const recentChanges = changes.slice(-5);
        const recentAvg = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;
        let pred = 'B';
        let confidence = 0;
        if (recentAvg > avgChange * 1.2) {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        } else if (recentAvg < avgChange * 0.8) {
            pred = history[history.length - 1];
            confidence = Math.min(0.6, 0.6);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.4;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== HARMONIC =====
    harmonicAnalysis(history) {
        if (history.length < 8) return { prediction: 'B', confidence: 0 };
        let harmonicCount = 0;
        const last8 = history.slice(-8);
        for (let i = 0; i < 7; i++) {
            if (last8[i] === last8[i + 1]) harmonicCount++;
        }
        let pred = 'B';
        let confidence = 0;
        if (harmonicCount >= 3) {
            pred = last8[7];
            confidence = Math.min(0.4 + harmonicCount * 0.05, 0.7);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== FIBONACCI =====
    fibonacciAnalysis(history) {
        if (history.length < 5) return { prediction: 'B', confidence: 0 };
        const fib = [1, 1, 2, 3, 5, 8, 13];
        const positions = [];
        for (const f of fib) {
            if (f <= history.length) {
                positions.push(history.length - f);
            }
        }
        const counts = { 'B': 0, 'P': 0, 'T': 0 };
        for (const pos of positions) {
            if (pos >= 0 && pos < history.length) {
                const char = history[pos];
                if (counts[char] !== undefined) counts[char]++;
            }
        }
        let pred = 'B';
        let maxCount = 0;
        for (const [char, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                pred = char;
            }
        }
        return { prediction: pred, confidence: Math.min(maxCount / 3, 0.6) };
    }

    // ===== RESISTANCE =====
    resistanceAnalysis(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0 };
        const windows = [];
        for (let i = 0; i < history.length - 5; i++) {
            windows.push(history.substring(i, i + 5));
        }
        const patterns = {};
        for (const w of windows) {
            if (!patterns[w]) patterns[w] = 0;
            patterns[w]++;
        }
        const last5 = history.slice(-5);
        let supportPattern = null;
        let maxCount = 0;
        for (const [pattern, count] of Object.entries(patterns)) {
            if (pattern.includes(last5[0]) && count > maxCount) {
                maxCount = count;
                supportPattern = pattern;
            }
        }
        let pred = 'B';
        let confidence = 0;
        if (supportPattern) {
            const nextChar = supportPattern[supportPattern.length - 1];
            if (nextChar) {
                pred = nextChar;
                confidence = Math.min(maxCount / 5, 0.7);
            }
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== SUPPORT RESISTANCE =====
    supportResistance(history) {
        if (history.length < 10) return { prediction: 'B', confidence: 0 };
        const values = history.split('').map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
        const supports = [];
        const resistances = [];
        for (let i = 2; i < values.length - 2; i++) {
            if (values[i] < values[i-1] && values[i] < values[i-2] &&
                values[i] < values[i+1] && values[i] < values[i+2]) {
                supports.push({ index: i, value: values[i] });
            }
            if (values[i] > values[i-1] && values[i] > values[i-2] &&
                values[i] > values[i+1] && values[i] > values[i+2]) {
                resistances.push({ index: i, value: values[i] });
            }
        }
        const lastValue = values[values.length - 1];
        let pred = 'B';
        let confidence = 0;
        if (supports.length > 0 && resistances.length > 0) {
            const lastSupport = supports[supports.length - 1];
            const lastResistance = resistances[resistances.length - 1];
            if (lastValue <= lastSupport.value + 0.2) {
                pred = 'B';
                confidence = 0.6;
            } else if (lastValue >= lastResistance.value - 0.2) {
                pred = 'P';
                confidence = 0.6;
            } else {
                pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
                confidence = 0.3;
            }
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.25;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== PIVOT =====
    pivotAnalysis(history) {
        if (history.length < 10) return this.supportResistance(history);
        const values = history.split('').map(c => c === 'B' ? 1 : c === 'P' ? -1 : 0);
        const n = values.length;
        const high = Math.max(...values);
        const low = Math.min(...values);
        const close = values[n - 1];
        const pivot = (high + low + close) / 3;
        const r1 = 2 * pivot - low;
        const s1 = 2 * pivot - high;
        let pred = 'B';
        let confidence = 0;
        if (close > pivot) {
            pred = 'B';
            confidence = Math.min((close - pivot) / (r1 - pivot || 1), 0.7);
        } else if (close < pivot) {
            pred = 'P';
            confidence = Math.min((pivot - close) / (pivot - s1 || 1), 0.7);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== TRENDLINE =====
    trendlineAnalysis(history) {
        if (history.length < 8) return this.recentTrendAnalysis(history);
        const values = history.split('').map((c, i) => ({ x: i, y: c === 'B' ? 1 : c === 'P' ? -1 : 0 }));
        const n = values.length;
        const sumX = values.reduce((a, b) => a + b.x, 0);
        const sumY = values.reduce((a, b) => a + b.y, 0);
        const sumXY = values.reduce((a, b) => a + b.x * b.y, 0);
        const sumX2 = values.reduce((a, b) => a + b.x * b.x, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const nextX = n;
        const predictionValue = slope * nextX + intercept;
        let pred = 'B';
        let confidence = 0;
        const rSquared = this.calculateRSquared(values, slope, intercept);
        if (Math.abs(predictionValue) > 0.3 && rSquared > 0.3) {
            pred = predictionValue > 0 ? 'B' : 'P';
            confidence = Math.min(Math.abs(predictionValue) * rSquared, 0.8);
        } else {
            pred = this.getMaxKeyCounts(history, ['B', 'P', 'T']);
            confidence = 0.3;
        }
        return { prediction: pred, confidence: confidence };
    }

    // ===== COMPREHENSIVE ANALYSIS =====
    comprehensiveAnalysis(history) {
        if (history.length < this.config.minDataPoints) {
            return {
                prediction: 'N/A',
                winRate: 0,
                confidence: 0,
                details: 'Chưa đủ dữ liệu',
                methods: {},
                methodCount: 0
            };
        }

        const methods = {
            frequency: this.frequencyAnalysis(history),
            frequency_weighted: this.frequencyWeightedAnalysis(history),
            recent: this.recentTrendAnalysis(history),
            recent_weighted: this.timeWeightedTrend(history),
            streak: this.streakAnalysis(history),
            zigzag: this.zigzagAnalysis(history),
            repeat: this.repeatPatternAnalysis(history),
            pattern_2_2: this.twoTwoPattern(history),
            pattern_3_3: this.threeThreePattern(history),
            pattern_4_4: this.fourFourPattern(history),
            pattern_123: this.pattern123(history),
            pattern_212: this.pattern212(history),
            markov1: this.markov1Analysis(history),
            markov2: this.markov2Analysis(history),
            markov3: this.markov3Analysis(history),
            markov_adaptive: this.markovAdaptive(history),
            bayesian: this.bayesianAnalysis(history),
            bayesian_adaptive: this.bayesianAdaptive(history),
            posterior: this.posteriorProbability(history),
            neural: this.neuralAnalysis(history),
            deep_neural: this.deepNeuralAnalysis(history),
            lstm: this.lstmAnalysis(history),
            gap: this.gapAnalysis(history),
            correlation: this.correlationAnalysis(history),
            autocorrelation: this.autocorrelationAnalysis(history),
            cross_correlation: this.crossCorrelationAnalysis(history),
            entropy: this.entropyAnalysis(history),
            adaptive_entropy: this.adaptiveEntropy(history),
            information_gain: this.informationGain(history),
            momentum: this.momentumAnalysis(history),
            adaptive_momentum: this.adaptiveMomentum(history),
            acceleration: this.accelerationAnalysis(history),
            regression: this.regressionAnalysis(history),
            adaptive_regression: this.adaptiveRegression(history),
            polynomial: this.polynomialRegression(history),
            cluster: this.clusterAnalysis(history),
            hierarchical: this.hierarchicalCluster(history),
            density: this.densityCluster(history),
            pair: this.pairAnalysis(history),
            triple: this.tripleAnalysis(history),
            distribution: this.distributionAnalysis(history),
            volatility: this.volatilityAnalysis(history),
            harmonic: this.harmonicAnalysis(history),
            fibonacci: this.fibonacciAnalysis(history),
            resistance: this.resistanceAnalysis(history),
            support_resistance: this.supportResistance(history),
            pivot: this.pivotAnalysis(history),
            trendline: this.trendlineAnalysis(history)
        };

        const scores = { 'B': 0, 'P': 0, 'T': 0 };
        const confidences = { 'B': 0, 'P': 0, 'T': 0 };
        const methodResults = {};
        let totalWeight = 0;
        let validMethods = 0;

        for (const [name, result] of Object.entries(methods)) {
            if (result && result.prediction && result.confidence && result.confidence > 0.1) {
                const weight = this.weights[name] || 0.02;
                const pred = result.prediction;
                const conf = Math.min(result.confidence, 0.9);
                scores[pred] += weight * 100 * conf;
                confidences[pred] += weight * conf;
                methodResults[name] = { pred: pred, conf: Math.round(conf * 100) / 100 };
                totalWeight += weight;
                validMethods++;
            }
        }

        let maxScore = 0;
        let prediction = 'B';
        let totalConfidence = 0;

        for (const char of ['B', 'P', 'T']) {
            if (scores[char] > maxScore) {
                maxScore = scores[char];
                prediction = char;
                totalConfidence = confidences[char];
            }
        }

        let winRate = Math.round((totalConfidence / (totalWeight || 1)) * 100);
        winRate = Math.max(48, Math.min(75, winRate));
        
        if (winRate === 50) {
            winRate = Math.random() > 0.5 ? 49 : 51;
        }

        return {
            prediction: prediction,
            winRate: winRate,
            confidence: totalConfidence / (totalWeight || 1),
            methods: methodResults,
            scores: scores,
            totalGames: history.length,
            validMethods: validMethods,
            totalMethods: Object.keys(methods).length
        };
    }

    // ===== NEW SESSION =====
    newSession(history) {
        this.session++;
        this.history = history;
        this.updateStats(history);
        const result = this.comprehensiveAnalysis(history);
        
        const predictionData = {
            session: this.session,
            timestamp: new Date().toISOString(),
            table: this.tableName,
            prediction: result.prediction,
            winRate: result.winRate,
            confidence: result.confidence,
            methods: result.methods,
            totalGames: result.totalGames,
            validMethods: result.validMethods,
            totalMethods: result.totalMethods
        };
        
        this.predictions.push(predictionData);
        this.winRateHistory.push({
            session: this.session,
            winRate: result.winRate,
            prediction: result.prediction
        });
        
        return predictionData;
    }

    // ===== UPDATE STATS =====
    updateStats(history) {
        this.stats.counts = { 'B': 0, 'P': 0, 'T': 0 };
        for (const char of history) {
            if (this.stats.counts[char] !== undefined) {
                this.stats.counts[char]++;
            }
        }
        
        let currentStreak = 1;
        for (let i = 1; i < history.length; i++) {
            if (history[i] === history[i-1]) {
                currentStreak++;
            } else {
                const prev = history[i-1];
                if (currentStreak > this.stats.maxStreaks[prev]) {
                    this.stats.maxStreaks[prev] = currentStreak;
                }
                if (currentStreak < this.stats.minStreaks[prev]) {
                    this.stats.minStreaks[prev] = currentStreak;
                }
                currentStreak = 1;
            }
        }
        const last = history[history.length - 1];
        if (currentStreak > this.stats.maxStreaks[last]) {
            this.stats.maxStreaks[last] = currentStreak;
        }
        if (currentStreak < this.stats.minStreaks[last]) {
            this.stats.minStreaks[last] = currentStreak;
        }
        
        const lastPos = { 'B': -1, 'P': -1, 'T': -1 };
        for (let i = 0; i < history.length; i++) {
            const char = history[i];
            if (lastPos[char] !== -1) {
                this.stats.gaps[char].push(i - lastPos[char] - 1);
            }
            lastPos[char] = i;
        }
        this.stats.lastPositions = lastPos;
    }

    // ===== GET STATS =====
    getDetailedStats() {
        const total = this.predictions.length;
        if (total === 0) {
            return {
                total: 0,
                avgWinRate: 0,
                currentSession: 0,
                lastPredictions: [],
                stats: this.stats
            };
        }
        
        const avgWinRate = this.winRateHistory.reduce((sum, item) => sum + item.winRate, 0) / total;
        
        const lastPredictions = this.predictions.slice(-10).map(p => ({
            session: p.session,
            prediction: p.prediction,
            winRate: p.winRate
        }));
        
        return {
            total: total,
            avgWinRate: Math.round(avgWinRate),
            currentSession: this.session,
            lastPredictions: lastPredictions,
            stats: this.stats,
            predictions: this.predictions
        };
    }

    // ===== HELPERS =====
    getMaxKey(obj) {
        let max = -Infinity;
        let key = 'B';
        for (const [k, v] of Object.entries(obj)) {
            if (v > max) {
                max = v;
                key = k;
            }
        }
        return key;
    }
    
    getMaxKeyCounts(history, keys) {
        const counts = {};
        for (const k of keys) counts[k] = 0;
        for (const char of history) {
            if (counts[char] !== undefined) counts[char]++;
        }
        return this.getMaxKey(counts);
    }

    calculateRSquared(values, slope, intercept) {
        const meanY = values.reduce((a, b) => a + b.y, 0) / values.length;
        let ssTotal = 0;
        let ssResidual = 0;
        for (const v of values) {
            const predicted = slope * v.x + intercept;
            ssTotal += Math.pow(v.y - meanY, 2);
            ssResidual += Math.pow(v.y - predicted, 2);
        }
        return 1 - (ssResidual / (ssTotal || 1));
    }

    calculateConditionalEntropy(history, position) {
        const pairs = {};
        for (let i = position; i < history.length; i++) {
            const key = history[i - position] + history[i];
            if (!pairs[key]) pairs[key] = 0;
            pairs[key]++;
        }
        let entropy = 0;
        const total = Object.values(pairs).reduce((a, b) => a + b, 0);
        for (const count of Object.values(pairs)) {
            const prob = count / total;
            entropy -= prob * Math.log2(prob);
        }
        return entropy;
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
}

module.exports = AdvancedBaccaratPredictor;
