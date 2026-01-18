<!-- Add to quote-engine.html -->
<button onclick="enhanceWithAI()" class="ai-enhance-btn">
    ✨ Enhance with AI
</button>

<script>
async function enhanceWithAI() {
    const description = document.getElementById('quoteDescription').value;
    const serviceType = document.getElementById('serviceType').value;
    
    if (!description) {
        alert('Please enter a description first');
        return;
    }
    
    // Show loading
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⚙️ Enhancing...';
    
    try {
        const response = await fetch(`${API_URL}/api/ai/enhance-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ description, serviceType })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show comparison modal
            showEnhancementModal(data.original, data.enhanced);
        }
        
    } catch (error) {
        console.error('AI enhancement error:', error);
        alert('Failed to enhance quote');
    } finally {
        btn.disabled = false;
        btn.textContent = '✨ Enhance with AI';
    }
}

function showEnhancementModal(original, enhanced) {
    const modal = document.createElement('div');
    modal.className = 'ai-modal';
    modal.innerHTML = `
        <div class="ai-modal-content">
            <h2>✨ AI Enhanced Description</h2>
            
            <div class="comparison">
                <div class="original">
                    <h3>Original</h3>
                    <p>${original}</p>
                </div>
                
                <div class="enhanced">
                    <h3>Enhanced</h3>
                    <p>${enhanced}</p>
                </div>
            </div>
            
            <div class="modal-actions">
                <button onclick="this.closest('.ai-modal').remove()">Keep Original</button>
                <button onclick="applyEnhancement('${enhanced.replace(/'/g, "\\'")}')">Use Enhanced</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function applyEnhancement(enhanced) {
    document.getElementById('quoteDescription').value = enhanced;
    document.querySelector('.ai-modal').remove();
}
</script>

<style>
.ai-enhance-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    margin: 10px 0;
}

.ai-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.ai-modal-content {
    background: white;
    padding: 40px;
    border-radius: 16px;
    max-width: 800px;
    width: 90%;
}

.comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 30px 0;
}

.comparison > div {
    padding: 20px;
    border-radius: 12px;
    background: #F7F7F7;
}

.enhanced {
    background: #E8F5E9 !important;
    border: 2px solid #4CAF50;
}
</style>