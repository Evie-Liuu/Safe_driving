# Behavior Patrol 結算與回饋系統

## 📋 概述

本文件說明 behavior-patrol 遊戲的結算與回饋系統實作，包含計分機制、錯誤統計、結算畫面等功能。

## ✨ 功能特色

### 1. 計分系統

遊戲採用以下計分規則：

| 行為 | 分數 |
|------|------|
| 找到危險因子（正確點擊） | **+10 分** |
| 答對 Q1（情境理解） | **+5 分** |
| 答對 Q2（正確行為） | **+5 分** |
| 誤判（點到錯誤區域） | **-10 分** |

**最高分計算**：總危險因子數 × 20 分（每個危險因子最多可獲得 10 + 5 + 5 = 20 分）

### 2. 連續誤判機制

- 每次點擊非危險物件視為**誤判**
- 連續誤判會累計計數
- **連續誤判 3 次** → 遊戲立即結束（Game Over）
- 正確點擊危險因子會**重置**連續誤判計數

### 3. 錯誤統計追蹤

系統會追蹤以下統計數據：

#### ErrorStatistics 介面
```typescript
{
  consecutiveWrongClicks: number;  // 連續誤判次數
  totalWrongClicks: number;        // 總誤判次數
  missedDangers: string[];         // 錯過的危險因子ID列表
}
```

#### DangerResult 介面
```typescript
{
  dangerId: string;       // 危險因子ID
  dangerName: string;     // 危險因子名稱
  found: boolean;         // 是否被找到
  q1Correct?: boolean;    // Q1是否答對
  q2Correct?: boolean;    // Q2是否答對
  pointsEarned: number;   // 此危險因子獲得的總分
}
```

### 4. 結算畫面

遊戲結束後會顯示詳細的結算畫面，包含：

#### 📊 分數統計
- 找到危險因子數量（已找到 / 總數）
- 總得分（當前分數 / 最高分）
- 剩餘生命值顯示
- 誤判次數統計

#### ✅ 危險因子清單
- **已找到的危險因子**：
  - 顯示危險因子名稱
  - 顯示每題答題狀態（✅ 正確 / ❌ 錯誤）
  - 顯示該危險因子獲得的總分

- **錯過的危險因子**：
  - 以紅色警告樣式顯示
  - 顯示完整的危險因子名稱

#### 📈 錯誤類型統計
- 總誤判次數（含扣分說明）
- 錯過的危險數量（含分數影響說明）

#### 🏆 等級評定
根據正確率給予評級：

| 正確率 | 等級 | 顏色 |
|--------|------|------|
| ≥ 90% | S | 金色 (#FFD700) |
| ≥ 80% | A | 綠色 (#4CAF50) |
| ≥ 70% | B | 淺綠 (#8BC34A) |
| ≥ 60% | C | 橙色 (#FF9800) |
| ≥ 50% | D | 深橙 (#FF5722) |
| < 50% | F | 紅色 (#f44336) |

## 🔧 技術實作

### 修改的檔案

1. **types.ts**
   - 新增 `ErrorStatistics` 介面
   - 新增 `DangerResult` 介面

2. **useGameState.ts**
   - 新增錯誤統計狀態管理
   - 新增危險因子結果記錄
   - 修改計分邏輯（10 + 5 + 5）
   - 實作連續誤判檢測
   - 實作錯過危險因子追蹤

3. **ResultScreen.tsx**
   - 完全重新設計 UI
   - 新增詳細的危險因子清單顯示
   - 新增錯誤統計區塊
   - 新增錯過危險因子顯示

4. **BehaviorPatrolGame.tsx**
   - 啟用 ResultScreen 組件
   - 傳遞必要的統計數據給 ResultScreen

### 關鍵邏輯

#### 正確點擊處理
```typescript
handleCorrectClick(danger) {
  // 1. 進入問答模式
  setStatus('quiz');

  // 2. 立即獲得 10 分（找到危險因子）
  setScore(prev => prev + 10);

  // 3. 重置連續誤判計數
  setErrorStats(prev => ({
    ...prev,
    consecutiveWrongClicks: 0
  }));
}
```

#### 誤判處理
```typescript
handleWrongClick() {
  // 1. 扣除 10 分（不低於 0）
  setScore(prev => Math.max(0, prev - 10));

  // 2. 更新誤判統計
  consecutiveWrongClicks++;
  totalWrongClicks++;

  // 3. 檢查連續誤判
  if (consecutiveWrongClicks >= 3) {
    setStatus('lost'); // Game Over
  }

  // 4. 扣除生命值
  lives--;
}
```

#### 問答提交處理
```typescript
handleQuizSubmit(q1Answer, q2Answer) {
  // 1. 判斷答案正確性
  const q1Correct = q1Answer === correctIndex1;
  const q2Correct = q2Answer === correctIndex2;

  // 2. 計算問答分數（5 + 5）
  const quizPoints = (q1Correct ? 5 : 0) + (q2Correct ? 5 : 0);
  setScore(prev => prev + quizPoints);

  // 3. 記錄結果
  const totalPoints = 10 + quizPoints; // 找到 + 問答
  dangerResults.push({
    dangerId,
    dangerName,
    found: true,
    q1Correct,
    q2Correct,
    pointsEarned: totalPoints
  });
}
```

## 🎮 遊戲流程

1. **開始遊戲** → 重置所有統計數據
2. **點擊物件**：
   - 正確 → +10 分 → 進入問答
   - 錯誤 → -10 分 → 累計誤判
3. **回答問題**：
   - Q1 正確 → +5 分
   - Q2 正確 → +5 分
4. **結束條件**：
   - ✅ 找到所有危險因子 → 勝利
   - ❌ 連續誤判 3 次 → 失敗
   - ❌ 生命值歸零 → 失敗
   - ❌ 時間到 → 失敗（若未找完）
5. **結算畫面** → 顯示完整統計

## 📊 範例數據

### 完美通關範例
```
場景：5 個危險因子
結果：
- 找到 5/5 危險因子
- 所有問題全答對
- 0 次誤判
- 總分：100/100
- 等級：S (100%)
```

### 部分完成範例
```
場景：5 個危險因子
結果：
- 找到 3/5 危險因子
- Q1: 2/3 正確, Q2: 3/3 正確
- 5 次誤判（-50 分）
- 總分：45/100
  計算：(10×3) + (5×2) + (5×3) - (10×5) = 30+10+15-50 = 5
  實際：5 分（因為有負分保護，最低為 0）
- 等級：F (5%)
```

## 🚀 未來改進方向

1. **進階統計**
   - 每個危險因子的平均回答時間
   - 最常被誤判的物件類型
   - 歷史最佳成績記錄

2. **社交功能**
   - 分數排行榜
   - 成就系統
   - 分享結果到社交平台

3. **學習輔助**
   - 錯誤回顧模式
   - 危險因子重點提示
   - 自訂訓練關卡

## 📝 注意事項

1. 分數不會低於 0（即使多次誤判）
2. 連續誤判會立即結束遊戲，優先於生命值檢查
3. 結算畫面的錯過危險因子會顯示完整名稱，非 ID
4. 所有統計數據在遊戲重新開始時會完全重置

---

**最後更新**：2026-02-11
**版本**：1.0.0
