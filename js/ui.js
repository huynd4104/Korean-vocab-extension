function createFlipContent(contentHTML, backButtonText, backgroundColor, flipClass, vocabItem, vocabInfo, vocabActions) {
    let backContent = vocabItem.querySelector(`.${flipClass}-back`);
    if (!backContent) {
        backContent = document.createElement('div');
        backContent.className = `${flipClass}-back`;
        backContent.style.cssText = `padding: 18px; background: ${backgroundColor}; border-radius: 12px; margin-top: 10px; width: 100%; display: none;`;
        backContent.innerHTML = `
            ${contentHTML}
            <button class="btn btn-secondary back-btn" style="margin-top:12px;">${backButtonText}</button>
        `;
        vocabItem.appendChild(backContent);

        backContent.querySelector('.back-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            vocabItem.classList.remove(flipClass);
            vocabInfo.style.display = '';
            vocabActions.style.display = '';
            backContent.style.display = 'none';
        });
    }

    const isFlipped = vocabItem.classList.toggle(flipClass);
    vocabInfo.style.display = isFlipped ? 'none' : '';
    vocabActions.style.display = isFlipped ? 'none' : '';
    backContent.style.display = isFlipped ? '' : 'none';
}


// Show a toast notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        toast.addEventListener('animationend', () => toast.remove());  
    }, 3000);
}

// Update category selector dropdown
function updateCategorySelector() {
    const select = document.getElementById('category-select');
    if (!select) return;

    const categories = window.allCategories.map(cat => cat.name).sort();
    const currentValue = select.value;

    select.innerHTML = '<option value="all">Tất cả</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    select.value = categories.includes(currentValue) || currentValue === 'all' ? currentValue : 'all';
    window.selectedCategory = select.value === 'all' ? 'all' : window.normalizeCategory(select.value);
    window.filterVocabByCategory();
    window.saveState();
}

// Update category suggestions datalist
function updateCategorySuggestions() {
    const datalist = document.getElementById('category-suggestions');
    if (!datalist) return;

    const categories = window.allCategories.map(cat => cat.name).sort();
    datalist.innerHTML = '';  
    const fragment = document.createDocumentFragment();  
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        fragment.appendChild(option);
    });
    datalist.appendChild(fragment);
}

// Update progress statistics
function updateStats() {
    const currentCountEl = document.getElementById('current-count');
    const totalCountEl = document.getElementById('total-count');
    const progressFillEl = document.getElementById('progress-fill');

    if (!currentCountEl || !totalCountEl || !progressFillEl) return;

    let current = 0;
    let total = 0;

    const filteredVocab = window.selectedCategory === 'all'
        ? window.allVocab
        : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);

    if (window.currentMode === 'game') {
        const gameState = window.modeStates.game[window.modeStates.game.currentTab];
        if (gameState) {
            current = gameState.matchedPairs?.length || gameState.correctCount || 0;
            total = gameState.shuffledVocab?.length || filteredVocab.length || 0;
        }
    } else {
        const modeState = window.modeStates[window.currentMode];
        if (modeState && modeState.shuffledVocab) {
            total = modeState.shuffledVocab.length;
            current = total > 0 ? modeState.currentIndex + 1 : 0;
        }
    }
    
    const progress = total > 0 ? (current / total) * 100 : 0;

    currentCountEl.textContent = current;
    totalCountEl.textContent = total;
    progressFillEl.style.width = `${progress}%`;
}


// Update vocabulary list in manage mode
function updateVocabList() {
    const vocabList = document.getElementById('vocab-list');
    if (!vocabList) return;

    vocabList.innerHTML = '';
    const fragment = document.createDocumentFragment();  

    let filteredVocab = window.selectedCategory === 'all' 
        ? [...window.allVocab] 
        : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);

    filteredVocab = filteredVocab.filter(word =>
        word.korean.toLowerCase().includes(window.searchQuery.toLowerCase()) ||
        word.vietnamese.toLowerCase().includes(window.searchQuery.toLowerCase())
    );

    window.toggleEmptyState('manage', filteredVocab.length === 0);

    filteredVocab.forEach(word => {
        const vocabItem = document.createElement('div');
        vocabItem.className = 'vocab-item';

        const vocabInfo = document.createElement('div');
        vocabInfo.className = 'vocab-info';
        vocabInfo.innerHTML = `
            <div class="vocab-korean">${word.korean}</div>
            <div class="vocab-pronunciation">(${word.pronunciation})</div>
            <div class="vocab-vietnamese">${word.vietnamese}</div>
            <div class="vocab-category">${word.category}</div>`;

        const vocabActions = document.createElement('div');
        vocabActions.className = 'vocab-actions';
        vocabActions.innerHTML = `
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary edit-btn">Sửa</button>
                <button class="btn btn-secondary delete-btn">Xóa</button>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
                <button class="btn btn-accent example-btn">Ví dụ</button>
                <button class="btn btn-info note-btn">Note</button>
            </div>`;
        
        vocabActions.querySelector('.edit-btn').addEventListener('click', () => window.editWord(word));
        
        vocabActions.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm(`Bạn có chắc muốn xóa từ "${word.korean}"?`)) {
                window.deleteWord(word.id).then(() => {
                    showToast('Xóa từ thành công!', 'success');
                    vocabItem.remove(); 
                    window.allVocab = window.allVocab.filter(w => w.id !== word.id);
                    updateStats();
                    window.saveState();
                }).catch(err => {
                    console.error('Error deleting word:', err);
                    showToast('Lỗi khi xóa từ!', 'error');
                });
            }
        });

        vocabActions.querySelector('.example-btn').addEventListener('click', () => {
            const [han, viet] = word.example?.includes(' - ') ? word.example.split(' - ', 2) : [word.example || 'Chưa có ví dụ', ''];
            const exampleHTML = `
                <div class="example">
                    <div style="font-size:1.5em;font-weight:bold;margin-bottom:8px;">${han}</div>
                    <div style="font-style:italic;color:#555;font-size:1.3em;">${viet}</div>
                </div>`;
            createFlipContent(exampleHTML, 'Quay lại', '#fffbe6', 'flipped', vocabItem, vocabInfo, vocabActions);
        });
        
        vocabActions.querySelector('.note-btn').addEventListener('click', () => {
            const noteHTML = `<div class="example"><div style="color:black; font-size: 1.3em;">${word.note || 'Chưa có ghi chú'}</div></div>`;
            createFlipContent(noteHTML, 'Quay lại', '#e3f2fd', 'flipped-note', vocabItem, vocabInfo, vocabActions);
        });

        vocabItem.appendChild(vocabInfo);
        vocabItem.appendChild(vocabActions);
        fragment.appendChild(vocabItem);
    });

    vocabList.appendChild(fragment);  
}

// Update unknown words list
function updateUnknownList() {
    const unknownList = document.getElementById('unknown-list');
    const unknownHeader = document.getElementById('unknown-header');
    if (!unknownList || !unknownHeader) return;

    unknownHeader.innerHTML = `
        ${window.unknownWords.length > 0 ? `<span class="unknown-count">📌 ${window.unknownWords.length} từ</span>` : ''}
        <button class="btn btn-secondary" id="clear-unknown-btn" style="${window.unknownWords.length === 0 ? 'display:none;' : ''}">🗑️ Xóa Tất Cả</button>
    `;

    unknownList.innerHTML = '';
    const fragment = document.createDocumentFragment(); 
    
    window.toggleEmptyState('unknown', window.unknownWords.length === 0);

    if (window.unknownWords.length > 0) {
        window.unknownWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'vocab-item unknown-item';
            item.innerHTML = `
                <div class="vocab-info unknown-info">
                    <div class="korean-text">${word.korean}</div>
                    <div class="pronunciation-text">(${word.pronunciation})</div>
                    <div class="vietnamese-text">${word.vietnamese}</div>
                </div>
                <div class="vocab-actions">
                    <button class="btn btn-secondary delete-unknown-btn">Xóa</button>
                </div>`;
            
            item.querySelector('.delete-unknown-btn').addEventListener('click', () => {
                if (confirm(`Bạn có chắc muốn xóa từ "${word.korean}" khỏi danh sách chưa biết không?`)) {
                    window.deleteUnknownWord(word.id).then(() => {
                        showToast('Đã xóa từ khỏi danh sách chú ý!', 'success');
                        window.loadUnknownWords();
                    }).catch(err => {
                        console.error('Error deleting unknown word:', err);
                        showToast('Lỗi khi xóa từ chưa biết!', 'error');
                    });
                }
            });
            fragment.appendChild(item);
        });
    }
    unknownList.appendChild(fragment);

    const clearButton = document.getElementById('clear-unknown-btn');
    if (clearButton) {
        clearButton.onclick = () => {
            if (confirm('Bạn có chắc muốn xóa tất cả từ chưa biết?')) {
                window.deleteAllUnknownWords().then(() => {
                    showToast('Đã xóa tất cả từ khỏi danh sách chú ý!', 'success');
                    window.loadUnknownWords();
                });
            }
        };
    }
}


// Update API key list
function updateApiKeyList() {
    const apiKeyListDiv = document.getElementById('api-key-list');
    if (!apiKeyListDiv) return;

    apiKeyListDiv.innerHTML = ''; 
    
    if (!window.apiKeys || window.apiKeys.length === 0) {
         apiKeyListDiv.innerHTML = `
            <div class="empty-state-api">
                <div class="empty-state-icon">🔑</div>
                <div class="empty-state-message">Chưa có API Key nào. Hãy thêm key mới!</div>
                <div class="empty-state-message"><a href="https://aistudio.google.com/apikey" target="_blank" style="text-decoration: none;">Nhấn vào đây hoặc tiêu đề để lấy API Key</a></div>
            </div>`;
        return;
    }

    const fragment = document.createDocumentFragment(); 
    window.apiKeys.forEach((keyData, index) => {
        const apiKeyItem = document.createElement('div');
        apiKeyItem.className = 'api-key-item vocab-item';

        const dateObj = keyData.dateAdded ? new Date(keyData.dateAdded) : null;
        const formattedDate = dateObj ? `${dateObj.toLocaleDateString('vi-VN')} ${dateObj.toLocaleTimeString('vi-VN')}` : 'N/A';
        
        const isRateLimited = keyData.lastRateLimit && (Date.now() - keyData.lastRateLimit < 60000);
        const statusText = isRateLimited
            ? '<span style="color: #ff6b6b; font-weight: 600;">Giới hạn truy cập</span>'
            : '<span style="color: #4ecdc4; font-weight: 600;">Hoạt động</span>';
        
        const requestCountText = `Số yêu cầu: ${keyData.requestCount ?? 'N/A'}`; 

        apiKeyItem.innerHTML = `
            <div class="vocab-info">
                <div class="api-key-display">
                    <span class="key-label" style="font-weight: bold;">Key ${index + 1}:</span>
                    <span class="api-key-value">${keyData.key.substring(0, 3)}•••••${keyData.key.substring(keyData.key.length - 5)}</span>
                </div>
                <div class="key-details" style="font-size: 0.9em; color: #666; margin-top: 5px;">
                    <div>Ngày thêm: ${formattedDate}</div> <div>${requestCountText}</div>
                    <div>Trạng thái: ${statusText}</div>
                </div>
            </div>
            <div class="vocab-buttons">
                <button class="btn btn-secondary btn-small delete-key-btn">Xóa</button>
            </div>`;

        apiKeyItem.querySelector('.delete-key-btn').addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa API Key này không?')) {
                window.deleteApiKey(index).catch(error => {
                    console.error('Lỗi khi xóa API Key:', error);
                    alert('Không thể xóa API Key. Vui lòng thử lại.');
                });
            }
        });
        fragment.appendChild(apiKeyItem);
    });
    apiKeyListDiv.appendChild(fragment);
}


// Hiển thị từ hiện tại dựa trên chế độ
function displayCurrentWord() {
    const mode = window.currentMode;
    const modeState = window.modeStates[mode];

    if (mode === 'manage' || mode === 'unknown') {
        const hasVocab = mode === 'manage' ? window.allVocab.length > 0 : window.unknownWords.length > 0;
        toggleEmptyState(mode, !hasVocab);
        updateStats();
        return;
    }
    
    if (!modeState) return;

    const { shuffledVocab, currentIndex } = modeState;
    const isEmpty = shuffledVocab.length === 0;
    toggleEmptyState(mode, isEmpty);

    if (isEmpty) {
        updateStats();
        return;
    }

    const word = shuffledVocab[currentIndex];

    if (mode === 'study') {
        document.getElementById('study-category').textContent = word.category;
        document.getElementById('study-korean').textContent = word.korean;
        document.getElementById('study-pronunciation').textContent = word.pronunciation;
        document.getElementById('study-vietnamese').textContent = word.vietnamese;
        const [koreanSentence, vietnameseSentence] = word.example?.includes(' - ') ? word.example.split(' - ', 2) : [word.example || 'Chưa có câu ví dụ', ''];
        document.getElementById('study-example-korean').textContent = koreanSentence.trim();
        document.getElementById('study-example-vietnamese').textContent = vietnameseSentence.trim();
        const studyCard = document.getElementById('study-card');
        studyCard.classList.remove('flipped');
        studyCard.addEventListener('click', () => studyCard.classList.toggle('flipped'));
    } else if (mode === 'quiz') {
        window.displayQuiz(word);
    } else if (mode === 'flashcard') {
        const isWordMode = modeState.flashcardDisplayMode === 'word';
        document.getElementById('flashcard-category').textContent = word.category;

        document.getElementById('flashcard-korean').textContent = word.korean;
        document.getElementById('flashcard-pronunciation').textContent = word.pronunciation;
        document.getElementById('flashcard-vietnamese').textContent = word.vietnamese;
        document.getElementById('flashcard-back-korean').textContent = word.korean;
        document.getElementById('flashcard-back-pronunciation').textContent = word.pronunciation;
        document.getElementById('flashcard-back-vietnamese').textContent = word.vietnamese;
        
        document.getElementById('flashcard-korean').classList.toggle('hidden', !isWordMode);
        document.getElementById('flashcard-pronunciation').classList.toggle('hidden', !isWordMode);
        document.getElementById('flashcard-vietnamese').classList.toggle('hidden', isWordMode);
        document.getElementById('flashcard-back-korean').classList.toggle('hidden', isWordMode);
        document.getElementById('flashcard-back-pronunciation').classList.toggle('hidden', isWordMode);
        document.getElementById('flashcard-back-vietnamese').classList.toggle('hidden', !isWordMode);

        document.querySelector('#flashcard .flip-card-front .flip-hint').textContent = isWordMode ? 'Nhấn để xem nghĩa' : 'Nhấn để xem từ';
        document.querySelector('#flashcard .flip-card-back .flip-hint').textContent = isWordMode ? 'Nhấn để xem từ' : 'Nhấn để xem nghĩa';
        
        document.getElementById('flashcard').classList.remove('flipped');
    }

    updateStats();
}


function toggleEmptyState(mode, isEmpty) {
    const emptyStateElement = document.getElementById(`${mode}-empty-state`);
    if (emptyStateElement) {
        emptyStateElement.classList.toggle('hidden', !isEmpty);
    }

    const UIMap = {
        study: ['#study-card', '#study-mode .button-container'],
        quiz: ['#quiz-mode .card', '#play-tts-quiz-btn'],
        flashcard: ['#flashcard', '#flashcard-mode .controls'],
        matching: ['#matching-game'],
        fill: ['#fill-game'],
        unknown: ['#unknown-mode .card'],
    };

    if (UIMap[mode]) {
        UIMap[mode].forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                if (selector.endsWith('-game')) {
                     element.style.display = isEmpty ? 'none' : '';
                } else {
                    element.classList.toggle('hidden', isEmpty);
                }
            }
        });
    }
}


function updateCategoryList() {
    const categoryListDiv = document.getElementById('category-list');
    if (!categoryListDiv) return;

    categoryListDiv.innerHTML = ''; 

    if (!window.allCategories || window.allCategories.length === 0) {
        categoryListDiv.innerHTML = `
            <div class="empty-state-api">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-message">Chưa có danh mục nào. Hãy thêm danh mục mới!</div>
            </div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment(); 
    window.allCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item vocab-item';

        categoryItem.innerHTML = `
            <div class="vocab-info">
                <div class="category-name">${category.name}</div>
            </div>
            <div class="vocab-buttons">
                <button class="btn btn-primary btn-small edit-category-btn">Sửa</button>
                <button class="btn btn-secondary btn-small delete-category-btn">Xóa</button>
            </div>`;
        
        categoryItem.querySelector('.edit-category-btn').addEventListener('click', () => window.editCategory(category));
        
        categoryItem.querySelector('.delete-category-btn').addEventListener('click', () => {
            if (confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"? Các từ vựng thuộc danh mục này sẽ không còn danh mục.`)) {
                window.deleteCategory(category.id).catch(err => {
                    showToast('Lỗi khi xóa danh mục!', 'error');
                });
            }
        });
        
        fragment.appendChild(categoryItem);
    });
    
    categoryListDiv.appendChild(fragment);
}


// Export functions to global scope
window.showToast = showToast;
window.updateCategorySelector = updateCategorySelector;
window.updateCategorySuggestions = updateCategorySuggestions;
window.updateStats = updateStats;
window.updateVocabList = updateVocabList;
window.updateUnknownList = updateUnknownList;
window.updateApiKeyList = updateApiKeyList;
window.displayCurrentWord = displayCurrentWord;
window.toggleEmptyState = toggleEmptyState;
window.updateCategoryList = updateCategoryList;