// --- 遊戲常數 ---
const INITIAL_TIME = 60; 
const BONUS_SCORE_INTERVAL = 5; 
const HIGH_SCORE_KEY = 'batteryGameHighScore'; 
const SLOT_UPGRADE_THRESHOLD = 5; // 完成 5 個電池後升級到 2 個槽位
const BONUS_TIME = 5; 

let correctCount = 0;
let draggedItem = null;
let timeLeft = INITIAL_TIME;
let timerInterval = null; 
let isGameActive = false; 
let lastBonusCount = 0; 
let currentHighScore = 0;
let slotsFilledCount = 0; 
let currentNumSlots = 1; // 預設從 1 個槽位開始

// 模擬拖曳專用變數
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// --- DOM 元素 ---
const slotsContainer = document.getElementById('slots-container'); 
const batteryContainer = document.getElementById('battery-container'); 
const correctCountSpan = document.getElementById('correct-count');
const timeRemainingSpan = document.getElementById('time-remaining'); 
const messageArea = document.getElementById('message-area');
const resetButton = document.getElementById('reset-button');
const highScoreSpan = document.getElementById('high-score');


// --- 輔助函數 ---

function loadHighScore() {
    const score = localStorage.getItem(HIGH_SCORE_KEY);
    currentHighScore = score ? parseInt(score, 10) : 0;
    if (highScoreSpan) highScoreSpan.textContent = currentHighScore;
}

function saveHighScore() {
    if (correctCount > currentHighScore) {
        currentHighScore = correctCount;
        localStorage.setItem(HIGH_SCORE_KEY, currentHighScore);
        if (highScoreSpan) highScoreSpan.textContent = currentHighScore;
        return true; 
    }
    return false; 
}

function showMessage(text, isSuccess) {
    if (messageArea) {
        messageArea.textContent = text;
        messageArea.style.color = isSuccess ? 'green' : 'red';
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = Math.max(0, timeLeft);
    if (timeRemainingSpan) timeRemainingSpan.textContent = timeLeft;
    if (timeRemainingSpan) timeRemainingSpan.classList.remove('time-low');

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) timeLeft = 0;
        if (timeRemainingSpan) timeRemainingSpan.textContent = timeLeft;
        if (timeLeft <= 10 && timeRemainingSpan) timeRemainingSpan.classList.add('time-low');

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleGameOver('timeup');
        }
    }, 1000);
}

function handleGameOver(reason) {
    isGameActive = false;
    if (timerInterval) clearInterval(timerInterval);

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // 移除電池的拖曳監聽器
    if (batteryContainer) {
        batteryContainer.querySelectorAll('.battery').forEach(b => {
            b.removeEventListener('mousedown', handleMouseDown);
            b.style.cursor = 'default';
        });
    }

    const isNewRecord = saveHighScore();
    let message = `✅ 時間到！您成功安裝了 ${correctCount} 個電池。挑戰結束！`;
    if (isNewRecord) message += ` 🏆 恭喜您打破紀錄！新紀錄是 ${currentHighScore}！`;
    else if (currentHighScore > 0) message += ` 您的最高紀錄是 ${currentHighScore}。`;
    showMessage(message, true);
}

function checkForBonusTime() {
    const currentBonusMultiplier = Math.floor(correctCount / BONUS_SCORE_INTERVAL);
    if (currentBonusMultiplier > lastBonusCount) {
        timeLeft += BONUS_TIME;
        if (timeRemainingSpan) timeRemainingSpan.textContent = timeLeft;
        if (timeRemainingSpan) timeRemainingSpan.classList.remove('time-low');
        lastBonusCount = currentBonusMultiplier;
        showMessage(`🎉 時間獎勵 +${BONUS_TIME} 秒！您已成功安裝 ${correctCount} 個電池。`, true);
    }
}


// --- 模擬拖曳核心函數 ---

function handleMouseDown(e) {
    if (!isGameActive) return;
    if (e.button !== 0) return; 

    isDragging = true;
    draggedItem = e.target.closest('.battery'); 
    
    if (draggedItem) {
        draggedItem.classList.add('dragging'); 
        const rect = draggedItem.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        draggedItem.style.cursor = 'grabbing';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
}

function handleMouseMove(e) {
    if (!isDragging || !draggedItem) return;
    e.preventDefault();
    draggedItem.style.left = (e.clientX - dragOffsetX) + 'px';
    draggedItem.style.top = (e.clientY - dragOffsetY) + 'px';
}

function handleMouseUp(e) {
    if (!isDragging || !draggedItem) return;
    isDragging = false;
    draggedItem.style.cursor = 'grab';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    checkPlacement(e.clientX, e.clientY);
}

// 輔助函數：將拖曳失敗的電池送回容器內
function resetBatteryPosition(batteryElement, message, isSuccess = false) {
    setTimeout(() => {
        batteryElement.classList.remove('dragging');
        batteryElement.style.left = ''; 
        batteryElement.style.top = ''; 
        batteryElement.style.opacity = '1';
        draggedItem = null;
    }, 50); 
    showMessage(message, isSuccess);
}

// 輔助函數：將電池固定在目標槽位上
function anchorBatteryToSlot(batteryElement, targetSlot) {
    batteryElement.classList.remove('dragging');
    batteryElement.style.left = '';
    batteryElement.style.top = '';
    
    // 2. 將電池從原容器移除，移動到槽位容器中
    if (batteryContainer && batteryContainer.contains(batteryElement)) {
        batteryContainer.removeChild(batteryElement);
    }
    targetSlot.appendChild(batteryElement);

    // 3. 調整樣式 (與 style.css 的 .slot-filled 配合，實現視覺無縫嵌入)
    batteryElement.style.position = 'static'; 
    batteryElement.style.width = '100%'; 
    batteryElement.style.height = '100%';
    
    // 阻止再次被拖曳
    batteryElement.removeEventListener('mousedown', handleMouseDown);
    batteryElement.style.cursor = 'default';
    
    // 4. 標記槽位已完成
    targetSlot.classList.add('slot-filled');
}


// 核心邏輯：放置檢查 
function checkPlacement(dropX, dropY) {
    if (!draggedItem) return;

    const batteryRect = draggedItem.getBoundingClientRect();
    const batteryElement = draggedItem;
    
    const isReversed = batteryElement.classList.contains('battery-reversed'); 
    const batteryLeftPolarity = isReversed ? '-' : '+'; 

    const targetSlot = Array.from(slotsContainer.children).find(slot => {
        if (slot.classList.contains('slot-filled')) return false;

        const slotRect = slot.getBoundingClientRect();
        return (
            batteryRect.left < slotRect.right &&
            batteryRect.right > slotRect.left &&
            batteryRect.top < slotRect.bottom &&
            batteryRect.bottom > slotRect.top
        );
    });

    if (!targetSlot) {
        resetBatteryPosition(batteryElement, '請將電池拖曳到電池槽內！');
        return;
    }

    const requiredLeftPolarity = targetSlot.dataset.slotLeftPolarity;
    const isCorrectlyInstalled = (batteryLeftPolarity === requiredLeftPolarity);

    if (isCorrectlyInstalled) {
        // --- 成功邏輯 ---
        correctCount++;
        if (correctCountSpan) correctCountSpan.textContent = correctCount; 
        
        checkForBonusTime(); 
        showMessage('✅ 安裝成功！', true);
       
        anchorBatteryToSlot(batteryElement, targetSlot);

        slotsFilledCount++;
        
        if (slotsFilledCount >= currentNumSlots) { 
             
             if (currentNumSlots === 1 && correctCount >= SLOT_UPGRADE_THRESHOLD) {
                 currentNumSlots = 2; 
                 showMessage(`🎉 恭喜！您已成功安裝 ${SLOT_UPGRADE_THRESHOLD} 個電池！難度升級到 2 個槽位！準備下一輪...`, true);
             } else {
                 showMessage(`🎉 成功完成本輪 ${currentNumSlots} 個槽位！準備下一輪...`, true);
             }
             
             setTimeout(() => {
                resetForNextRound(); 
            }, 500); 
        } else {
             draggedItem = null;
             showMessage(`✅ 安裝成功！還剩下 ${currentNumSlots - slotsFilledCount} 個槽位。`, true);
        }

    } else {
        // --- 失敗邏輯 ---
        resetBatteryPosition(batteryElement, '❌ 選擇的電池方向錯誤，請選擇正確方向的電池！');
    }
}


// 輔助函數：創建電池 DOM 元素
function createBatteryElement(isReversed) {
    const newBattery = document.createElement('div');
    newBattery.className = 'battery';
    if (isReversed) {
        newBattery.classList.add('battery-reversed');
    }
    
    const positiveCap = document.createElement('div');
    positiveCap.className = 'battery-cap positive-cap';
    const label = document.createElement('div');
    label.className = 'battery-label';
    label.textContent = 'AA 電池';
    const negativeCap = document.createElement('div');
    negativeCap.className = 'battery-cap negative-cap';

    if (isReversed) {
        // 反轉朝向: [-] [標籤] [+]
        newBattery.appendChild(negativeCap);
        newBattery.appendChild(label);
        newBattery.appendChild(positiveCap);
    } else {
        // 正常朝向: [+] [標籤] [-]
        newBattery.appendChild(positiveCap);
        newBattery.appendChild(label);
        newBattery.appendChild(negativeCap);
    }

    return newBattery;
}

// 輔助函數：創建電池槽 DOM 元素 (可接受強制極性)
function createSlotElement(slotIndex, forcedLeftPolarity = null) {
    let leftPolarity;
    
    if (forcedLeftPolarity) {
        // 使用傳入的固定極性
        leftPolarity = forcedLeftPolarity;
    } else {
        // 使用原有的隨機極性
        const isLeftPositive = Math.random() < 0.5; 
        leftPolarity = isLeftPositive ? '+' : '-';
    }

    const rightPolarity = leftPolarity === '+' ? '-' : '+'; 

    const slot = document.createElement('div');
    slot.className = 'slot-container';
    slot.dataset.slotLeftPolarity = leftPolarity; 
    slot.id = `slot-${slotIndex}`;

    const slotLeftEnd = document.createElement('div');
    slotLeftEnd.className = `slot-end slot-left-end ${leftPolarity === '+' ? 'positive-end' : 'negative-end'}`;
    slotLeftEnd.textContent = leftPolarity;

    const slotBody = document.createElement('div');
    slotBody.className = 'slot-body';
    slotBody.textContent = `槽位 ${slotIndex + 1} / ${currentNumSlots}`; 

    const slotRightEnd = document.createElement('div');
    slotRightEnd.className = `slot-end slot-right-end ${rightPolarity === '+' ? 'positive-end' : 'negative-end'}`;
    slotRightEnd.textContent = rightPolarity;

    slot.appendChild(slotLeftEnd);
    slot.appendChild(slotBody);
    slot.appendChild(slotRightEnd);
    
    return slot;
}


// 遊戲重置/生成下一輪邏輯 (雙槽位固定極性)
function resetForNextRound() {
    
    // 1. 清除舊槽位並生成新槽位
    if (slotsContainer) {
        slotsContainer.innerHTML = '';
        
        if (currentNumSlots === 2) { 
            // FIXED DUAL SLOT MODE: 確保一個 '+ -' 和一個 '- +'
            const requiredPolarities = ['+', '-'];
            // 隨機排列順序，確保 Slot 1/2 的位置是隨機的
            requiredPolarities.sort(() => Math.random() - 0.5); 
            
            const slot1 = createSlotElement(0, requiredPolarities[0]); // 左側極性為 '+' 或 '-'
            const slot2 = createSlotElement(1, requiredPolarities[1]); // 左側極性為剩下的那一個
            
            slotsContainer.appendChild(slot1);
            slotsContainer.appendChild(slot2);

        } else {
            // 單槽位模式 (仍為隨機)
            for (let i = 0; i < currentNumSlots; i++) {
                slotsContainer.appendChild(createSlotElement(i)); 
            }
        }
    }
    slotsFilledCount = 0; 

    // 2. 清除舊電池並生成**兩個**不同朝向的電池
    if (batteryContainer) {
        batteryContainer.innerHTML = ''; 
        draggedItem = null; 
    
        const battery1 = createBatteryElement(false); // 正常朝向 (+ -)
        const battery2 = createBatteryElement(true);  // 反轉朝向 (- +)
    
        // 固定順序添加，確保 + - 在左，- + 在右
        batteryContainer.appendChild(battery1);
        initializeBatteryEvents(battery1);
        
        batteryContainer.appendChild(battery2);
        initializeBatteryEvents(battery2);
    }
    
    showMessage(`新的挑戰開始！請填滿所有 ${currentNumSlots} 個槽位。`, true);
}


// 核心重置函數 (用於遊戲開始或重新開始按鈕)
function resetGame() {
    loadHighScore(); 
    isGameActive = true; 
    timeLeft = INITIAL_TIME;
    correctCount = 0;
    lastBonusCount = 0; 
    currentNumSlots = 1; 
    if (correctCountSpan) correctCountSpan.textContent = correctCount;
    
    resetForNextRound(); 
    startTimer(); 
    showMessage(`遊戲開始！請在 ${INITIAL_TIME} 秒內盡可能多地填滿 ${currentNumSlots} 個槽位。`, true);
}


// 初始化事件監聽器 (模擬拖曳)
function initializeBatteryEvents(batteryElement) {
    batteryElement.removeEventListener('mousedown', handleMouseDown);
    batteryElement.addEventListener('mousedown', handleMouseDown);
}


// 遊戲初始化
document.addEventListener('DOMContentLoaded', () => {
    resetGame(); 
    if (resetButton) resetButton.addEventListener('click', resetGame);
});