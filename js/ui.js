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

// Hiển thị popup xác nhận chung
function showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const messageEl = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (!modal || !messageEl || !confirmBtn || !cancelBtn) return;

    messageEl.textContent = message;
    modal.classList.remove('hidden');

    const confirmHandler = () => {
        onConfirm();
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
    };

    const cancelHandler = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', confirmHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
    };

    confirmBtn.addEventListener('click', confirmHandler);
    cancelBtn.addEventListener('click', cancelHandler);
}

// Update category selector dropdown
function updateCategorySelector() {
    const select = document.getElementById('category-select');
    if (!select) return;

    const categories = window.allCategories.map(cat => cat.name).sort();
    
    // Lấy category đã lưu từ state, thay vì từ HTML
    const savedCategory = window.selectedCategory;

    // Tìm lại tên category chưa được chuẩn hóa để hiển thị trên dropdown
    const categoryNameToSelect = savedCategory === 'all' 
        ? 'all' 
        : window.allCategories.find(cat => window.normalizeCategory(cat.name) === savedCategory)?.name || 'all';

    // Xóa các option cũ và thêm các option mới
    select.innerHTML = '<option value="all">Tất cả</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    // Đặt giá trị cho dropdown từ category đã lưu
    select.value = categoryNameToSelect;

    // Cập nhật lại state và filter (để đảm bảo tính nhất quán)
    window.selectedCategory = select.value === 'all' ? 'all' : window.normalizeCategory(select.value);
    window.filterVocabByCategory();
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
            window.showConfirmationModal(`Bạn có chắc muốn xóa từ "${word.korean}"?`, () => {
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
            });
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

// Update attention words list
function updateAttentionList() {
    const attentionList = document.getElementById('attention-list');
    const attentionHeader = document.getElementById('attention-header');
    if (!attentionList || !attentionHeader) return;

    attentionHeader.innerHTML = `
        ${window.attentionWords.length > 0 ? `<span class="attention-count">📌 ${window.attentionWords.length} từ</span>` : ''}
        <button class="btn btn-secondary" id="clear-attention-btn" style="${window.attentionWords.length === 0 ? 'display:none;' : ''}">🗑️ Xóa Tất Cả</button>
    `;

    attentionList.innerHTML = '';
    const fragment = document.createDocumentFragment(); 
    
    window.toggleEmptyState('attention', window.attentionWords.length === 0);

    if (window.attentionWords.length > 0) {
        window.attentionWords.forEach(word => {
            const item = document.createElement('div');
            item.className = 'vocab-item attention-item';
            item.innerHTML = `
                <div class="vocab-info attention-info">
                    <div class="korean-text">${word.korean}</div>
                    <div class="pronunciation-text">(${word.pronunciation})</div>
                    <div class="vietnamese-text">${word.vietnamese}</div>
                </div>
                <div class="vocab-actions">
                    <button class="btn btn-secondary delete-attention-btn">Xóa</button>
                </div>`;
            
            item.querySelector('.delete-attention-btn').addEventListener('click', () => {
                window.showConfirmationModal(`Bạn có chắc muốn xóa từ "${word.korean}" khỏi danh sách chú ý không?`, () => {
                    window.deleteAttentionWord(word.id).then(() => {
                        showToast('Đã xóa từ khỏi danh sách chú ý!', 'success');
                        window.loadAttentionWords();
                    }).catch(err => {
                        console.error('Error deleting attention word:', err);
                        showToast('Lỗi khi xóa từ!', 'error');
                    });
                });
            });
            fragment.appendChild(item);
        });
    }
    attentionList.appendChild(fragment);

    const clearButton = document.getElementById('clear-attention-btn');
    if (clearButton) {
    clearButton.onclick = window.handleDeleteAllAttention; 
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
            window.showConfirmationModal('Bạn có chắc chắn muốn xóa API Key này không?', () => {
                window.deleteApiKey(index).then(() => {
                    showToast('Xóa API Key thành công!', 'success');
                })
                .catch(error => {
                    console.error('Lỗi khi xóa API Key:', error);
                    showToast('Không thể xóa API Key. Vui lòng thử lại.', 'error');
                });
            });
        });
        fragment.appendChild(apiKeyItem);
    });
    apiKeyListDiv.appendChild(fragment);
}

// Hiển thị từ hiện tại dựa trên chế độ
function displayCurrentWord() {
    if (!window.modeStates[window.currentMode] && window.currentMode !== 'attention' && window.currentMode !== 'manage') {
        return;
    }

    if (window.currentMode === 'attention') {
        window.toggleEmptyState('attention', window.attentionWords.length === 0);
        updateStats();
        return;
    }

    if (window.currentMode === 'manage') {
        window.toggleEmptyState('manage', window.allVocab.length === 0);
        updateStats();
        return;
    }

    const currentState = window.modeStates[window.currentMode];
    window.toggleEmptyState(window.currentMode, currentState.shuffledVocab.length === 0);

    if (currentState.shuffledVocab.length === 0) {
        updateStats();
        // Đảm bảo ẩn các phần tử giao diện chính
        if (window.currentMode === 'study') {
            const studyCard = document.getElementById('study-card');
            const buttonContainer = document.querySelector('#study-mode .button-container');
            if (studyCard) studyCard.classList.add('hidden');
            if (buttonContainer) buttonContainer.classList.add('hidden');
        } else if (window.currentMode === 'quiz') {
            const quizCard = document.querySelector('#quiz-mode .card');
            const playTtsQuizBtn = document.getElementById('play-tts-quiz-btn');
            if (quizCard) quizCard.classList.add('hidden');
            if (playTtsQuizBtn) playTtsQuizBtn.classList.add('hidden');
        } else if (window.currentMode === 'flashcard') {
            const flashcard = document.getElementById('flashcard');
            const controls = document.querySelector('#flashcard-mode .controls');
            if (flashcard) flashcard.classList.add('hidden');
            if (controls) controls.classList.add('hidden');
        }
        return;
    }

    // Logic hiển thị từ vựng hiện tại (giữ nguyên phần còn lại của hàm)
    if (window.currentMode === 'study') {
        const word = currentState.shuffledVocab[currentState.currentIndex];
        const studyCategory = document.getElementById('study-category');
        if (studyCategory) studyCategory.textContent = word.category;
        const studyKorean = document.getElementById('study-korean');
        if (studyKorean) studyKorean.textContent = word.korean;
        const studyPronunciation = document.getElementById('study-pronunciation');
        if (studyPronunciation) studyPronunciation.textContent = word.pronunciation;
        const studyVietnamese = document.getElementById('study-vietnamese');
        if (studyVietnamese) studyVietnamese.textContent = word.vietnamese;
        const studyExample = document.getElementById('study-example');
        if (studyExample) {
            const example = word.example || '';
            let koreanSentence = '';
            let vietnameseSentence = '';
            if (example && example.includes(' - ')) {
                [koreanSentence, vietnameseSentence] = example.split(' - ', 2);
            } else {
                koreanSentence = example;
            }
            const koreanDiv = document.getElementById('study-example-korean');
            const vietnameseDiv = document.getElementById('study-example-vietnamese');
            if (koreanDiv) koreanDiv.textContent = koreanSentence.trim() || 'Chưa có câu ví dụ';
            if (vietnameseDiv) vietnameseDiv.textContent = vietnameseSentence.trim();
        }
        const studyCard = document.getElementById('study-card');
        if (studyCard) studyCard.classList.remove('flipped');
        if (studyCard) studyCard.addEventListener('click', window.flipStudyCard);
    } else if (window.currentMode === 'quiz') {
        if (window.modeStates.quiz.shuffledVocab.length > 0) {
            window.displayQuiz(window.modeStates.quiz.shuffledVocab[window.modeStates.quiz.currentIndex]);
        }
    } else if (window.currentMode === 'flashcard') {
        const word = currentState.shuffledVocab[currentState.currentIndex];
        const flashcardCategory = document.getElementById('flashcard-category');
        if (flashcardCategory) flashcardCategory.textContent = word.category;
        const flashcardKorean = document.getElementById('flashcard-korean');
        if (flashcardKorean) flashcardKorean.textContent = word.korean;
        const flashcardPronunciation = document.getElementById('flashcard-pronunciation');
        if (flashcardPronunciation) flashcardPronunciation.textContent = word.pronunciation;
        const flashcardVietnamese = document.getElementById('flashcard-vietnamese');
        if (flashcardVietnamese) flashcardVietnamese.textContent = word.vietnamese;
        const flashcardBackKorean = document.getElementById('flashcard-back-korean');
        if (flashcardBackKorean) flashcardBackKorean.textContent = word.korean;
        const flashcardBackPronunciation = document.getElementById('flashcard-back-pronunciation');
        if (flashcardBackPronunciation) flashcardBackPronunciation.textContent = word.pronunciation;
        const flashcardBackVietnamese = document.getElementById('flashcard-back-vietnamese');
        if (flashcardBackVietnamese) flashcardBackVietnamese.textContent = word.vietnamese;

        if (currentState.flashcardDisplayMode === 'word') {
            if (flashcardKorean) flashcardKorean.classList.remove('hidden');
            if (flashcardPronunciation) flashcardPronunciation.classList.remove('hidden');
            if (flashcardVietnamese) flashcardVietnamese.classList.add('hidden');
            if (flashcardBackKorean) flashcardBackKorean.classList.add('hidden');
            if (flashcardBackPronunciation) flashcardBackPronunciation.classList.add('hidden');
            if (flashcardBackVietnamese) flashcardBackVietnamese.classList.remove('hidden');
            const frontHint = document.querySelector('#flashcard .flip-card-front .flip-hint');
            if (frontHint) frontHint.textContent = 'Nhấn để xem nghĩa';
            const backHint = document.querySelector('#flashcard .flip-card-back .flip-hint');
            if (backHint) backHint.textContent = 'Nhấn để xem từ';
        } else {
            if (flashcardKorean) flashcardKorean.classList.add('hidden');
            if (flashcardPronunciation) flashcardPronunciation.classList.add('hidden');
            if (flashcardVietnamese) flashcardVietnamese.classList.remove('hidden');
            if (flashcardBackKorean) flashcardBackKorean.classList.remove('hidden');
            if (flashcardBackPronunciation) flashcardBackPronunciation.classList.remove('hidden');
            if (flashcardBackVietnamese) flashcardBackVietnamese.classList.add('hidden');
            const frontHint = document.querySelector('#flashcard .flip-card-front .flip-hint');
            if (frontHint) frontHint.textContent = 'Nhấn để xem từ';
            const backHint = document.querySelector('#flashcard .flip-card-back .flip-hint');
            if (backHint) backHint.textContent = 'Nhấn để xem nghĩa';
        }
        const flashcard = document.getElementById('flashcard');
        if (flashcard) flashcard.classList.remove('flipped');
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
        attention: ['#attention-mode .card'],
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

function updateCategoryList(searchTerm = '') {
    const categoryListDiv = document.getElementById('category-list');
    if (!categoryListDiv) return;

    categoryListDiv.innerHTML = ''; 
    
    const normalizedSearchTerm = searchTerm.toLowerCase();
    const filteredCategories = (window.allCategories || []).filter(category => 
        category.name.toLowerCase().includes(normalizedSearchTerm)
    );

    if (filteredCategories.length === 0) {
        if (searchTerm === '') {
            categoryListDiv.innerHTML = `
                <div class="empty-state-api">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-message">Chưa có danh mục nào. Hãy thêm danh mục mới!</div>
                </div>`;
        } else {
            categoryListDiv.innerHTML = `
                <div class="empty-state-api">
                    <div class="empty-state-icon">🧐</div>
                    <div class="empty-state-message">Không tìm thấy danh mục nào khớp với "${searchTerm}".</div>
                </div>`;
        }
        return;
    }
    
    const fragment = document.createDocumentFragment(); 
    filteredCategories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item vocab-item';  
        categoryItem.dataset.categoryId = category.id; 

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
            window.showConfirmationModal(`Bạn có chắc chắn muốn xóa danh mục\n "${category.name}"`, () => {
                window.deleteCategory(category.id).catch(err => {
                    showToast('Lỗi khi xóa danh mục!', 'error');
                });
            });
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
window.updateAttentionList = updateAttentionList;
window.updateApiKeyList = updateApiKeyList;
window.displayCurrentWord = displayCurrentWord;
window.toggleEmptyState = toggleEmptyState;
window.updateCategoryList = updateCategoryList;