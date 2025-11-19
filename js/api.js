// Get available API key, avoiding rate-limited keys
function getAvailableApiKey() {
    if (!window.apiKeys || window.apiKeys.length === 0) return null;

    const now = Date.now();
    for (let i = 0; i < window.apiKeys.length; i++) {
        const index = (window.currentApiKeyIndex + i) % window.apiKeys.length;
        const key = window.apiKeys[index];
        // Kiểm tra nếu key chưa bị limit hoặc đã qua 60s
        if (key.lastRateLimit === 0 || (now - key.lastRateLimit) > 60000) {
            window.currentApiKeyIndex = index;
            return key.key;
        }
    }
    return null;
}

// Helper function to update Key status to DB immediately
async function markKeyAsRateLimited(index) {
    if (window.apiKeys[index]) {
        window.apiKeys[index].lastRateLimit = Date.now();
        // Lưu ngay vào DB để tránh việc reload extension làm mất trạng thái limit
        await window.saveApiKeysToDB();
    }
}

// Lookup word using Gemini API
async function lookupWord(koreanWord) {
    if (!koreanWord) {
        window.showToast('Vui lòng nhập từ cần tra cứu!', 'error');
        return;
    }

    let currentKey = getAvailableApiKey();
    if (!currentKey) {
        window.openApiKeyModal();
        window.showToast('Không có API Key khả dụng (tất cả đang bận hoặc chưa thêm)!', 'error');
        return;
    }

    const lookupPronunciation = document.getElementById('lookup-pronunciation').checked;
    const lookupVietnamese = document.getElementById('lookup-vietnamese').checked;
    const lookupExample = document.getElementById('lookup-example').checked;
    const lookupNote = document.getElementById('lookup-note')?.checked;

    if (!lookupPronunciation && !lookupVietnamese && !lookupExample && !lookupNote) {
        window.showToast('Vui lòng chọn ít nhất một trường để tra cứu!', 'error');
        return;
    }

    let requestText = `Hãy cung cấp thông tin chi tiết cho từ tiếng Hàn "${koreanWord}" với các trường sau:\n`;
    const fields = [];
    if (lookupPronunciation) fields.push('- Phiên âm (romaja, ngăn cách nhau bởi gạch ngang)');
    if (lookupVietnamese) fields.push('- Nghĩa tiếng Việt (ngắn gọn, phổ biến nhất)');
    if (lookupExample) fields.push('- Một câu ví dụ đơn giản phổ biến trong văn nói bằng tiếng Hàn kèm nghĩa tiếng Việt');
    if (lookupNote) fields.push('- Chú ý (nếu có)');

    requestText += fields.join('\n');
    requestText += '\nĐịnh dạng trả về (bắt buộc đúng format):\n';
    if (lookupPronunciation) requestText += 'Phiên âm: [romaja]\n';
    if (lookupVietnamese) requestText += 'Nghĩa: [nghĩa]\n';
    if (lookupExample) requestText += 'Câu ví dụ: [câu tiếng Hàn] - [nghĩa tiếng Việt]\n';
    if (lookupNote) requestText += 'Chú ý: [nội dung]';

    while (currentKey) {
        try {
            // Dùng window.currentApiKeyIndex để đảm bảo đúng biến toàn cục
            window.apiKeys[window.currentApiKeyIndex].requestCount++;
            window.showToast('🌀 Đang tra cứu...', 'success');

            const modelName = window.currentModel || 'gemini-1.5-flash';

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: requestText }] }]
                })
            });

            if (response.status === 429) {
                console.warn(`Key ${currentKey.substring(0, 5)}... bị 429. Đang chuyển key...`);
                await markKeyAsRateLimited(window.currentApiKeyIndex);

                // Tìm key mới
                currentKey = getAvailableApiKey();
                if (!currentKey) {
                    window.showToast('Tất cả API Key đều đạt giới hạn! Vui lòng đợi 1 phút.', 'error');
                    return;
                }
                continue; // Thử lại với key mới
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                const resultText = data.candidates[0].content.parts[0].text;

                // Regex linh hoạt hơn một chút
                const pronunciationMatch = lookupPronunciation ? resultText.match(/Phiên âm:\s*(.+)/i) : null;
                const meaningMatch = lookupVietnamese ? resultText.match(/Nghĩa:\s*(.+)/i) : null;
                const exampleMatch = lookupExample ? resultText.match(/Câu ví dụ:\s*(.+?)(\s*-\s*)(.+)/i) : null;
                const noteMatch = resultText.match(/Chú ý:\s*(.+)/i);

                if (lookupPronunciation && pronunciationMatch) {
                    document.getElementById('pronunciation-input').value = pronunciationMatch[1].trim();
                }
                if (lookupVietnamese && meaningMatch) {
                    document.getElementById('vietnamese-input').value = meaningMatch[1].trim();
                }
                if (lookupExample && exampleMatch) {
                    // group 1 là tiếng hàn, group 3 là tiếng việt (do group 2 là dấu gạch)
                    document.getElementById('example-input').value = `${exampleMatch[1].trim()} - ${exampleMatch[3].trim()}`;
                }
                if (noteMatch) {
                    document.getElementById('note-input').value = noteMatch[1].trim();
                }
                window.showToast('Tra cứu thành công!', 'success');

                // Lưu cập nhật requestCount
                await window.saveApiKeysToDB();
            } else {
                window.showToast('Không nhận được dữ liệu từ API!', 'error');
            }
            break; // Thoát vòng lặp while
        } catch (error) {
            window.showToast('Lỗi khi tra cứu: ' + error.message, 'error');
            break;
        }
    }
}

// HÀM: Tách logic gọi API Game điền từ
async function fetchFillGameQuestion(correctWord) {
    const sentenceDiv = document.getElementById('fill-sentence');
    const resultDiv = document.getElementById('fill-result');
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');
    const optionsContainer = document.getElementById('fill-options');

    // Hiển thị loading
    sentenceDiv.innerHTML = '<div style="text-align:center; padding: 20px;">⏳ Đang tạo câu hỏi với AI...</div>';

    let currentKey = getAvailableApiKey();
    if (!currentKey) {
        resultDiv.innerHTML = `
        <div class="api-key-error">
            <div class="error-icon">🔑</div>
            <div class="error-content">
                <h3 class="error-title">Không có API Key khả dụng!</h3>
                <p class="error-description">Hãy thêm key mới hoặc đợi 1 phút để key cũ hồi phục.</p>
                <div class="error-actions">
                    <button id="addKeyBtn" class="get-api-key-btn">Thêm API Key</button>
                </div>
            </div>
        </div>`;
        document.getElementById('addKeyBtn')?.addEventListener('click', window.openApiKeyModal);
        if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
        return;
    }

    const requestText = `Tạo một câu tiếng Hàn sử dụng chính xác từ "${correctWord.korean}" và thay thế từ đó bằng một chỗ trống "___". Chỗ trống này phải nằm đúng tại vị trí của từ "${correctWord.korean}" trong câu. Cung cấp bản dịch tiếng Việt tương ứng. Định dạng trả về:\nCâu: [Câu tiếng Hàn]\nDịch: [Bản dịch tiếng Việt]`;

    while (currentKey) {
        try {
            window.apiKeys[window.currentApiKeyIndex].requestCount++;
            window.showToast('🌀 Đang tạo câu hỏi...', 'success');

            const modelName = window.currentModel || 'gemini-1.5-flash';

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: requestText }] }] })
            });

            // Xử lý lỗi 429 (Too Many Requests)
            if (response.status === 429) {
                console.warn(`Key ${currentKey.substring(0, 5)}... bị 429 (Game). Đang chuyển key...`);
                await markKeyAsRateLimited(window.currentApiKeyIndex);

                currentKey = getAvailableApiKey();
                if (!currentKey) {
                    window.showToast('Tất cả API Key đều đạt giới hạn! Vui lòng đợi.', 'error');
                    if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
                    sentenceDiv.innerHTML = '<div style="color:red; text-align:center;">Hết API Key khả dụng</div>';
                    return;
                }
                continue; // Retry với key mới
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                const resultText = data.candidates[0].content.parts[0].text;
                const sentenceMatch = resultText.match(/Câu:\s*(.+)/i);
                const translationMatch = resultText.match(/Dịch:\s*(.+)/i);

                if (sentenceMatch && translationMatch) {
                    window.modeStates.game.fill.currentSentence = `${sentenceMatch[1].trim()} (${translationMatch[1].trim()})`;

                    // Hiển thị câu hỏi
                    window.displayFillGame();

                    // Mở khóa các nút bấm
                    const optionButtons = optionsContainer.querySelectorAll('button');
                    optionButtons.forEach(btn => btn.disabled = false);

                    if (resetFillGameBtn) resetFillGameBtn.classList.remove('hidden');
                    window.showToast('Tạo câu hỏi thành công!', 'success');
                    window.saveState();

                    // Lưu thống kê request
                    await window.saveApiKeysToDB();
                } else {
                    window.showToast('AI trả về định dạng không đúng, đang thử lại...', 'warning');
                    // Có thể retry logic ở đây nếu muốn, hoặc chỉ báo lỗi
                }
            } else {
                window.showToast('Không nhận được dữ liệu từ API!', 'error');
            }
            break; // Thành công hoặc lỗi không phải 429 thì thoát loop
        } catch (error) {
            window.showToast('Lỗi kết nối: ' + error.message, 'error');
            break;
        }
    }
}

// Initialize fill game with Manual Button
async function initFillGame() {
    const sentenceDiv = document.getElementById('fill-sentence');
    const optionsContainer = document.getElementById('fill-options');
    const resultDiv = document.getElementById('fill-result');
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');

    if (!sentenceDiv || !optionsContainer || !resultDiv) return;

    let gameVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);
    window.toggleEmptyState('fill', gameVocab.length === 0);

    if (gameVocab.length === 0) {
        optionsContainer.innerHTML = '';
        resultDiv.innerHTML = '';
        if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
        return;
    }

    // Reset UI
    resultDiv.innerHTML = '';
    optionsContainer.innerHTML = '';
    if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');

    // Chọn từ đúng ngẫu nhiên
    const correctWord = gameVocab[Math.floor(Math.random() * gameVocab.length)];
    window.modeStates.game.fill.correctWord = correctWord;

    const wrongOptions = window.fisherYatesShuffle
        ? window.fisherYatesShuffle(gameVocab.filter(w => w.id !== correctWord.id)).slice(0, 3)
        : gameVocab.filter(w => w.id !== correctWord.id).sort(() => 0.5 - Math.random()).slice(0, 3);

    const allOptions = window.fisherYatesShuffle
        ? window.fisherYatesShuffle([correctWord, ...wrongOptions])
        : [correctWord, ...wrongOptions].sort(() => 0.5 - Math.random());

    window.modeStates.game.fill.options = allOptions;

    // Hiện nút bấm thay vì gọi API ngay
    sentenceDiv.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <button id="start-fill-btn" class="btn btn-primary" style="font-size: 1.1em; padding: 10px 25px;">
                ✨ Tạo câu hỏi với AI
            </button>
        </div>
    `;

    // Gán sự kiện cho nút vừa tạo
    document.getElementById('start-fill-btn').addEventListener('click', () => {
        fetchFillGameQuestion(correctWord);
    });

    // Hiển thị các lựa chọn (nhưng disable)
    window.modeStates.game.fill.options.forEach(word => {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.textContent = word.korean;
        button.disabled = true; // Khóa nút lại
        optionsContainer.appendChild(button);
    });
}

// Export functions to global scope
window.getAvailableApiKey = getAvailableApiKey;
window.lookupWord = lookupWord;
window.initFillGame = initFillGame;
window.fetchFillGameQuestion = fetchFillGameQuestion;