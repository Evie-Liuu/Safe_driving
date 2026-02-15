# 滑鼠操作說明設計文檔

**日期：** 2026-02-15
**功能：** 在遊戲說明面板中增加滑鼠操作說明
**狀態：** 設計已批准

## 概述

在 Behavior Patrol 遊戲的說明面板（`PatrolInstructionsPanel`）中添加滑鼠操作說明區域，向玩家清晰展示四種主要滑鼠操作方式。

## 用戶需求

玩家需要了解以下滑鼠操作：
1. **左鍵點擊** - 點擊危險行為物件
2. **拖曳移動** - 移動視野觀察場景
3. **右鍵旋轉** - 旋轉視角
4. **滾輪縮放** - 縮放畫面

## 設計方案

### 方案選擇

**選定方案：** 簡潔圖標條

在三張遊戲玩法卡片下方、「開始遊戲」按鈕上方，添加一個獨立的滑鼠操作說明區域。

**為何選擇此方案：**
- 簡潔明瞭，不搶主要卡片的視覺焦點
- 易於實現和維護
- 視覺層次清晰，與整體設計協調
- 信息密度適中，易於快速瀏覽

## 視覺設計規格

### 位置與佈局

- **位置：** 三張遊戲玩法卡片下方，「開始遊戲/繼續遊戲」按鈕上方
- **對齊：** 居中對齊，寬度與上方卡片區域一致
- **間距：** 上方 margin 與卡片容器保持一致（`mb-8`）

### 容器樣式

```css
背景色: rgba(59, 130, 246, 0.08) /* 淡藍色，呼應面板主題 */
圓角: 16px (rounded-2xl)
內邊距: px-6 py-5
邊框: 1px solid #DBEAFE (border-blue-100)
陰影: shadow-sm
```

### 內容結構

**左側 - 標題區域：**
- 文字：「🖱️ 滑鼠操作」
- 字體：`font-bold text-lg text-gray-700`

**右側 - 操作列表：**

橫向排列四個操作項目，每個包含：
- 圖標（20x20px SVG 或 emoji）
- 說明文字（`text-sm text-gray-600 font-medium`）
- 項目間距：`gap-6` 到 `gap-8`

四個操作項目：

1. **左鍵點擊**
   - 圖標：🖱️ 或點擊手勢 SVG
   - 文字：「左鍵點擊危險」

2. **移動視野**
   - 圖標：↔️ 或拖曳手勢 SVG
   - 文字：「拖曳移動視野」

3. **右鍵旋轉**
   - 圖標：🔄 或旋轉手勢 SVG
   - 文字：「右鍵旋轉視角」

4. **滾輪縮放**
   - 圖標：🔍 或滾輪 SVG
   - 文字：「滾輪縮放畫面」

### 響應式設計

**桌面版（md 及以上）：**
```tsx
<div className="flex items-center justify-between">
  <div>標題</div>
  <div className="flex gap-8">操作列表</div>
</div>
```

**平板/手機版（md 以下）：**
```tsx
<div className="flex flex-col items-center gap-4">
  <div>標題</div>
  <div className="grid grid-cols-2 gap-4">操作列表</div>
</div>
```

## 技術實現

### 修改文件

**文件：** `src/games/behavior-patrol/BehaviorPatrolGame.tsx`
**組件：** `PatrolInstructionsPanel`

### 實現位置

在以下代碼之間插入新區域：

**之前：**
```tsx
</div> {/* Cards Container 結束 */}

{/* Play Button */}
<button onClick={...}>
```

**之後：**
```tsx
</div> {/* Cards Container 結束 */}

{/* 滑鼠操作說明區域 - 新增 */}
<MouseControlsSection />

{/* Play Button */}
<button onClick={...}>
```

### 組件結構

```tsx
{/* 滑鼠操作說明 */}
<div className="w-full mb-8 bg-blue-50/50 rounded-2xl px-6 py-5 border border-blue-100 shadow-sm">
  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
    {/* 標題 */}
    <div className="font-bold text-lg text-gray-700 flex items-center gap-2">
      <span>🖱️</span>
      <span>滑鼠操作</span>
    </div>

    {/* 操作列表 */}
    <div className="grid grid-cols-2 md:flex gap-4 md:gap-8">
      {/* 左鍵點擊 */}
      <div className="flex items-center gap-2">
        <MouseClickIcon />
        <span className="text-sm text-gray-600 font-medium">左鍵點擊危險</span>
      </div>

      {/* 拖曳移動 */}
      <div className="flex items-center gap-2">
        <DragIcon />
        <span className="text-sm text-gray-600 font-medium">拖曳移動視野</span>
      </div>

      {/* 右鍵旋轉 */}
      <div className="flex items-center gap-2">
        <RotateIcon />
        <span className="text-sm text-gray-600 font-medium">右鍵旋轉視角</span>
      </div>

      {/* 滾輪縮放 */}
      <div className="flex items-center gap-2">
        <ZoomIcon />
        <span className="text-sm text-gray-600 font-medium">滾輪縮放畫面</span>
      </div>
    </div>
  </div>
</div>
```

### SVG 圖標

圖標設計應與現有卡片中的圖標（眼睛、手、獎盃）風格保持一致：
- 簡潔的線條設計
- 2-2.5px stroke width
- rounded linecap 和 linejoin
- 20x20px 視窗尺寸

可以使用內聯 SVG 或作為臨時方案使用 emoji。

## 可訪問性

- 使用語義化 HTML 結構
- 圖標添加適當的 `aria-label` 屬性
- 確保文字與背景對比度符合 WCAG AA 標準（至少 4.5:1）
- 支持鍵盤導航（雖然目前是靜態顯示）

## 驗證測試

實現後需要驗證：

1. ✅ **視覺呈現** - 說明面板中正確顯示滑鼠操作區域
2. ✅ **內容完整** - 四個操作的圖標和文字都清晰可見
3. ✅ **響應式** - 在桌面、平板、手機上佈局正常
4. ✅ **設計協調** - 顏色、字體、間距與整體面板協調
5. ✅ **顯示時機** - 遊戲開始前和遊戲中點擊 ❓ 按鈕時都能看到
6. ✅ **不影響現有功能** - 不影響關閉按鈕、開始按鈕等現有功能

## 邊界情況

- **長文字處理：** 在小螢幕上使用 `text-xs` 或允許文字換行
- **圖標缺失：** 使用 emoji 作為 fallback
- **面板高度：** 確保添加後面板高度適中，不超出視窗（必要時調整其他區域的間距）
- **不同語言：** 預留足夠空間以支持未來的多語言文字

## 未來擴展可能性

- 添加動畫效果（如懸停時圖標輕微放大）
- 支持自定義鍵位設置
- 添加「首次遊玩」教學提示
- 遊戲中的浮動操作提示

## 參考

- 現有組件：`src/games/behavior-patrol/BehaviorPatrolGame.tsx` (PatrolInstructionsPanel)
- 現有組件：`src/games/behavior-patrol/components/GameHUD.tsx`
- 設計風格參考：PatrolInstructionsPanel 中的三張卡片設計
