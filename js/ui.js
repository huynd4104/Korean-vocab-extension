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
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        datalist.appendChild(option);
    });
}

// Update progress statistics
function updateStats() {
    const filteredVocab = window.selectedCategory === 'all'
        ? [...window.allVocab]
        : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);

    if (!window.modeStates[window.currentMode] && window.currentMode !== 'game') {
        document.getElementById('current-count').textContent = 0;
        document.getElementById('total-count').textContent = 0;
        document.getElementById('progress-fill').style.width = '0%';
        return;
    }

    if (window.currentMode === 'game') {
        const currentState = window.modeStates.game[window.modeStates.game.currentTab];
        document.getElementById('current-count').textContent = currentState.matchedPairs?.length || currentState.correctCount || 0;
        document.getElementById('total-count').textContent = currentState.shuffledVocab?.length || filteredVocab.length || 0;
        document.getElementById('progress-fill').style.width = currentState.shuffledVocab?.length > 0 ? ((currentState.matchedPairs?.length || currentState.correctCount || 0) / currentState.shuffledVocab.length * 100) + '%' : '0%';
        return;
    }

    const currentState = window.modeStates[window.currentMode];
    document.getElementById('current-count').textContent = currentState.shuffledVocab.length > 0 ? currentState.currentIndex + 1 : 0;
    document.getElementById('total-count').textContent = currentState.shuffledVocab.length;
    const progress = currentState.shuffledVocab.length > 0 ? ((currentState.currentIndex + 1) / currentState.shuffledVocab.length) * 100 : 0;
    document.getElementById('progress-fill').style.width = progress + '%';
}

// Update vocabulary list in manage mode
function updateVocabList() {
    const vocabList = document.getElementById('vocab-list');
    if (!vocabList) return;

    vocabList.innerHTML = '';

    let filteredVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);

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
        <div class="vocab-category">${word.category}</div>
        `;

        const vocabActions = document.createElement('div');
        vocabActions.className = 'vocab-actions';
        vocabActions.style.flexDirection = 'column';
        vocabActions.style.gap = '6px';

        const topActions = document.createElement('div');
        topActions.style.display = 'flex';
        topActions.style.gap = '8px';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-primary';
        editBtn.textContent = 'Sửa';
        editBtn.addEventListener('click', () => window.editWord(word));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-secondary';
        deleteBtn.textContent = 'Xóa';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Bạn có chắc muốn xóa từ "${word.korean}"?`)) {
                window.deleteWord(word.id).then(() => {
                    window.loadVocabulary().then(() => {
                        window.filterVocabByCategory();
                        updateVocabList();
                        window.saveState();
                    });
                }).catch(err => console.error('Error deleting word:', err));
            }
        });

        topActions.appendChild(editBtn);
        topActions.appendChild(deleteBtn);

        const bottomActions = document.createElement('div');
        bottomActions.style.display = 'flex';
        bottomActions.style.gap = '8px';

        const exampleBtn = document.createElement('button');
        exampleBtn.className = 'btn btn-accent';
        exampleBtn.textContent = 'Ví dụ';
        exampleBtn.addEventListener('click', () => {
            let back = vocabItem.querySelector('.vocab-back');
            if (!back) {
                back = document.createElement('div');
                back.className = 'vocab-back';
                back.style.padding = '18px';
                back.style.background = '#fffbe6';
                back.style.borderRadius = '12px';
                back.style.marginTop = '10px';
                back.style.width = '100%';
                let han = '';
                let viet = '';
                if (word.example && word.example.includes(' - ')) {
                    [han, viet] = word.example.split(' - ', 2);
                } else {
                    han = word.example || '';
                    viet = '';
                }
                back.innerHTML = `
                <div class="example">
                <div style="font-size:1.5em;font-weight:bold;margin-bottom:8px;">${han || 'Chưa có ví dụ'}</div>
                <div style="font-style:italic;color:#555;font-size:1.3em;">${viet}</div>
                </div>
                <button class="btn btn-secondary back-btn" style="margin-top:12px;">Quay lại</button>
                `;
                vocabItem.appendChild(back);

                back.querySelector('.back-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    vocabItem.classList.remove('flipped');
                    vocabInfo.style.display = '';
                    vocabActions.style.display = '';
                    back.style.display = 'none';
                });
            }
            const isFlipped = vocabItem.classList.toggle('flipped');
            if (isFlipped) {
                vocabInfo.style.display = 'none';
                vocabActions.style.display = 'none';
                back.style.display = '';
            } else {
                vocabInfo.style.display = '';
                vocabActions.style.display = '';
                back.style.display = 'none';
            }
        });

        const noteBtn = document.createElement('button');
        noteBtn.className = 'btn btn-info';
        noteBtn.textContent = 'Note';
        noteBtn.addEventListener('click', () => {
            let noteBack = vocabItem.querySelector('.vocab-note-back');
            if (!noteBack) {
                noteBack = document.createElement('div');
                noteBack.className = 'vocab-note-back';
                noteBack.style.padding = '18px';
                noteBack.style.background = '#e3f2fd';
                noteBack.style.borderRadius = '12px';
                noteBack.style.marginTop = '10px';
                noteBack.style.width = '100%';
                noteBack.innerHTML = `
                <div class="example">
                    <div style="color:black; font-size: 1.3em;">${word.note ? word.note : 'Chưa có ghi chú'}</div>
                </div>
                <button class="btn btn-secondary note-back-btn" style="margin-top:12px;">Quay lại</button>
                `;
                vocabItem.appendChild(noteBack);

                noteBack.querySelector('.note-back-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    vocabItem.classList.remove('flipped-note');
                    vocabInfo.style.display = '';
                    vocabActions.style.display = '';
                    noteBack.style.display = 'none';
                });
            }
            const isFlipped = vocabItem.classList.toggle('flipped-note');
            if (isFlipped) {
                vocabInfo.style.display = 'none';
                vocabActions.style.display = 'none';
                noteBack.style.display = '';
            } else {
                vocabInfo.style.display = '';
                vocabActions.style.display = '';
                noteBack.style.display = 'none';
            }
        });

        bottomActions.appendChild(exampleBtn);
        bottomActions.appendChild(noteBtn);

        vocabActions.appendChild(topActions);
        vocabActions.appendChild(bottomActions);

        vocabItem.appendChild(vocabInfo);
        vocabItem.appendChild(vocabActions);
        vocabList.appendChild(vocabItem);
    });
}

// Update unknown words list
function updateUnknownList() {
    const unknownList = document.getElementById('unknown-list');
    const unknownHeader = document.getElementById('unknown-header');
    
    if (!unknownList || !unknownHeader) return;

    const headerHTML = `
        ${window.unknownWords.length > 0 ? `<span class="unknown-count">📌 ${window.unknownWords.length} từ</span>` : ''}
        <button class="btn btn-secondary" id="clear-unknown-btn" style="${window.unknownWords.length === 0 ? 'display:none;' : ''}">🗑️ Xóa Tất Cả</button>
    `;
    unknownHeader.innerHTML = headerHTML;
    
    unknownList.innerHTML = '';
    
    window.toggleEmptyState('unknown', window.unknownWords.length === 0);

    let wordsHTML = '';
    if (window.unknownWords.length > 0) {
        window.unknownWords.forEach(word => {
            wordsHTML += `
                <div class="vocab-item unknown-item">
                    <div class="vocab-info unknown-info">
                        <div class="korean-text">${word.korean}</div>
                        <div class="pronunciation-text">(${word.pronunciation})</div>
                        <div class="vietnamese-text">${word.vietnamese}</div>
                    </div>
                    <div class="vocab-actions">
                        <button class="btn btn-secondary delete-unknown-btn" data-id="${word.id}">Xóa</button>
                    </div>
                </div>
            `;
        });
    }

    // Cập nhật chỉ phần danh sách từ
    unknownList.innerHTML = wordsHTML;

    // Xử lý sự kiện cho các button
    const clearButton = document.getElementById('clear-unknown-btn');
    if (clearButton) {
        clearButton.onclick = function () {
            if (confirm('Bạn có chắc muốn xóa tất cả từ chưa biết?')) {
                window.deleteAllUnknownWords().then(() => {
                    window.loadUnknownWords();
                });
            }
        };
    }

    document.querySelectorAll('.delete-unknown-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wordId = parseInt(e.target.getAttribute('data-id'));
            const word = window.unknownWords.find(w => w.id === wordId);
            if (confirm(`Bạn có chắc muốn xóa từ "${word.korean}" khỏi danh sách chưa biết không?`)) {
                window.deleteUnknownWord(wordId).then(() => {
                    window.loadUnknownWords();
                }).catch(err => {
                    console.error('Error deleting unknown word:', err);
                    document.getElementById('form-message').textContent = 'Lỗi khi xóa từ chưa biết!';
                });
            }
        });
    });
}

// Update API key list
function updateApiKeyList() {
    const apiKeyListDiv = document.getElementById('api-key-list');
    if (!apiKeyListDiv) return;

    apiKeyListDiv.innerHTML = ''; // Xóa nội dung cũ

    if (window.apiKeys && window.apiKeys.length > 0) {
        window.apiKeys.forEach((keyData, index) => {
            const apiKeyItem = document.createElement('div');
            apiKeyItem.classList.add('api-key-item');
            apiKeyItem.classList.add('vocab-item');

            // Định dạng ngày
            const dateObj = keyData.dateAdded ? new Date(keyData.dateAdded) : null;
            let formattedDate = 'N/A';
            const statusText = keyData.lastRateLimit && (Date.now() - keyData.lastRateLimit < 60000)
                ? '<span style="color: #ff6b6b; font-weight: 600;">Giới hạn truy cập</span>'
                : '<span style="color: #4ecdc4; font-weight: 600;">Hoạt động</span>';
            const requestCountText = typeof keyData.requestCount === 'number' ? `Số yêu cầu: ${keyData.requestCount}` : 'Số yêu cầu: N/A';

            if (dateObj) {
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
                const year = dateObj.getFullYear();
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                const seconds = String(dateObj.getSeconds()).padStart(2, '0');

                formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            }

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
                    <button class="btn btn-secondary btn-small delete-key-btn" data-index="${index}">Xóa</button>
                </div>
            `;
            apiKeyListDiv.appendChild(apiKeyItem);
        });

        // Gắn lại sự kiện cho các nút xóa
        apiKeyListDiv.querySelectorAll('.delete-key-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToDelete = event.target.dataset.index;
                if (confirm('Bạn có chắc chắn muốn xóa API Key này không?')) {
                    window.deleteApiKey(parseInt(indexToDelete)).catch(error => {
                        console.error('Lỗi khi xóa API Key:', error);
                        alert('Không thể xóa API Key. Vui lòng thử lại.');
                    });
                }
            });
        });

    } else {
        apiKeyListDiv.innerHTML = `
            <div class="empty-state-api">
                <div class="empty-state-icon">🔑</div>
                <div class="empty-state-message">Chưa có API Key nào. Hãy thêm key mới!</div>
                <div class="empty-state-message"><a href="https://aistudio.google.com/apikey" target="_blank" style="text-decoration: none;">Nhấn vào đây hoặc tiêu đề để lấy API Key</a></div>
            </div>
        `;
    }
}

// Hiển thị từ hiện tại dựa trên chế độ
function displayCurrentWord() {
    if (!window.modeStates[window.currentMode] && window.currentMode !== 'unknown' && window.currentMode !== 'manage') {
        return;
    }

    if (window.currentMode === 'unknown') {
        window.toggleEmptyState('unknown', window.unknownWords.length === 0);
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

    // Ẩn các phần tử giao diện chính khi danh sách từ vựng rỗng
    if (mode === 'study') {
        const studyCard = document.getElementById('study-card');
        const buttonContainer = document.querySelector('#study-mode .button-container');
        if (studyCard) studyCard.classList.toggle('hidden', isEmpty);
        if (buttonContainer) buttonContainer.classList.toggle('hidden', isEmpty);
    } else if (mode === 'quiz') {
        const quizCard = document.querySelector('#quiz-mode .card');
        const playTtsQuizBtn = document.getElementById('play-tts-quiz-btn');
        if (quizCard) quizCard.classList.toggle('hidden', isEmpty);
        if (playTtsQuizBtn) playTtsQuizBtn.classList.toggle('hidden', isEmpty);
    } else if (mode === 'flashcard') {
        const flashcard = document.getElementById('flashcard');
        const controls = document.querySelector('#flashcard-mode .controls');
        if (flashcard) flashcard.classList.toggle('hidden', isEmpty);
        if (controls) controls.classList.toggle('hidden', isEmpty);
    } else if (mode === 'matching') {
        const matchingGameDiv = document.getElementById('matching-game');
        if (matchingGameDiv) matchingGameDiv.style.display = isEmpty ? 'none' : '';
    } else if (mode === 'fill') {
        const fillGameDiv = document.getElementById('fill-game');
        if (fillGameDiv) fillGameDiv.style.display = isEmpty ? 'none' : '';
    } else if (mode === 'unknown') {
        const unknownCard = document.querySelector('#unknown-mode .card');
        if (unknownCard) unknownCard.classList.toggle('hidden', isEmpty);
    }
}

function updateCategoryList() {
    const categoryListDiv = document.getElementById('category-list');

    categoryListDiv.innerHTML = ''; // Xóa nội dung cũ

    if (window.allCategories && window.allCategories.length > 0) {
        window.allCategories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-item', 'vocab-item');

            categoryItem.innerHTML = `
                <div class="vocab-info">
                    <div class="category-display">
                        <div class="category-name">${category.name}</div>
                    </div>
                </div>
                <div class="vocab-buttons">
                    <button class="btn btn-primary btn-small edit-category-btn" data-id="${category.id}">Sửa</button>
                    <button class="btn btn-secondary btn-small delete-category-btn" data-id="${category.id}">Xóa</button>
                </div>
            `;
            categoryListDiv.appendChild(categoryItem);
        });

        // Gắn lại sự kiện cho các nút
        categoryListDiv.querySelectorAll('.edit-category-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const categoryId = parseInt(event.target.dataset.id);
                const category = window.allCategories.find(cat => cat.id === categoryId);
                if (category) {
                    window.editCategory(category);
                }
            });
        });

        categoryListDiv.querySelectorAll('.delete-category-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const categoryId = parseInt(event.target.dataset.id);
                const category = window.allCategories.find(cat => cat.id === categoryId);
                if (confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"? Các từ vựng thuộc danh mục này sẽ không còn danh mục.`)) {
                    window.deleteCategory(categoryId).catch(err => {
                        const categoryMessage = document.getElementById('category-message');
                        if (categoryMessage) {
                            categoryMessage.textContent = 'Lỗi khi xóa danh mục!';
                            categoryMessage.style.color = '#ff0000';
                        }
                    });
                }
            });
        });
    } else {
        categoryListDiv.innerHTML = `
            <div class="empty-state-api">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-message">Chưa có danh mục nào. Hãy thêm danh mục mới!</div>
            </div>
        `;
    }
}

// Export functions to global scope
window.updateCategorySelector = updateCategorySelector;
window.updateCategorySuggestions = updateCategorySuggestions;
window.updateStats = updateStats;
window.updateVocabList = updateVocabList;
window.updateUnknownList = updateUnknownList;
window.updateApiKeyList = updateApiKeyList;
window.displayCurrentWord = displayCurrentWord;
window.toggleEmptyState = toggleEmptyState;
window.updateCategoryList = updateCategoryList;