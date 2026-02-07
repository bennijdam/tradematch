# TradeMatch Settings Page - Complete Extension Guide
**Version 2.0 - Monetization & Trust Features**

---

## 📋 Executive Summary

This guide extends the existing Settings page with production-ready features for:
- ✅ Business profile & portfolio
- ✅ Verification system (£4.99/month)
- ✅ Postcode coverage caps & upsells (£9.99-£39.99/month)
- ✅ Insurance auto-validation
- ✅ Trading Standards screening
- ✅ AI-powered postcode recommendations

**Total ARPU potential: £44.98+/month per power user**

---

## 🎯 New Tab Structure

Add these tabs to the existing Settings page:

1. **Account** (existing - keep as-is)
2. **Security** (existing - keep as-is)
3. **Business Profile** ⭐ NEW
4. **Verification & Trust** ⭐ NEW
5. **Service Areas** ⭐ NEW (upgraded from basic)
6. **Notifications** (existing - keep as-is)
7. **Leads & Impressions** (existing - keep as-is)
8. **Pro Features** (existing - keep as-is)
9. **Billing** (existing - keep as-is)
10. **Advanced** (existing - keep as-is)

---

## 🏗️ 1. Business Profile Tab (NEW)

### 1.1 Business Description Section

```html
<div class="settings-section">
    <h2 class="section-title">Business Description</h2>
    <p class="section-description">
        Tell customers about your business. Clear descriptions improve trust and enquiries.
    </p>
    
    <div class="form-group">
        <label class="form-label">About Your Business</label>
        <textarea 
            id="business-description" 
            class="form-textarea" 
            maxlength="700" 
            placeholder="Describe your services, experience, and what makes your business stand out..."
            rows="6"
        ></textarea>
        <div class="char-counter">
            <span id="char-count">0</span> / 700 characters
        </div>
        <span class="form-helper">
            Shown on your profile and local service pages
        </span>
    </div>
</div>
```

**CSS Addition:**
```css
.form-textarea {
    width: 100%;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: 'Archivo', sans-serif;
    resize: vertical;
    min-height: 120px;
}

.char-counter {
    text-align: right;
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 8px;
}
```

**JavaScript:**
```javascript
// Character counter
const description = document.getElementById('business-description');
const charCount = document.getElementById('char-count');

description?.addEventListener('input', () => {
    charCount.textContent = description.value.length;
    if (description.value.length >= 700) {
        charCount.style.color = 'var(--accent-danger)';
    } else {
        charCount.style.color = 'var(--text-muted)';
    }
});

// TODO: POST /api/vendor/profile
// body: { description: text }
```

### 1.2 Business Details

```html
<div class="form-grid">
    <div class="form-group">
        <label class="form-label">Years in Business</label>
        <select id="years-in-business" class="form-select">
            <option value="">Select...</option>
            <option value="0-1">Less than 1 year</option>
            <option value="1-3">1-3 years</option>
            <option value="3-5">3-5 years</option>
            <option value="5-10">5-10 years</option>
            <option value="10+">10+ years</option>
        </select>
    </div>
    
    <div class="form-group">
        <label class="form-label">Primary Trades</label>
        <div class="multi-select-wrapper">
            <button type="button" class="multi-select-trigger" onclick="openTradeSelector()">
                <span id="selected-trades">Plumbing</span>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
        </div>
        <span class="form-helper">Select up to 3 trades</span>
    </div>
</div>
```

### 1.3 Work Photos Portfolio

```html
<div class="settings-section">
    <h2 class="section-title">Work Photos Portfolio</h2>
    <p class="section-description">
        Real work photos significantly increase customer trust and quote acceptance rates.
    </p>
    
    <!-- Upload Area -->
    <div class="upload-zone" id="photo-upload">
        <div class="upload-icon">
            <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
        </div>
        <div class="upload-text">
            <strong>Drag & drop photos here</strong> or click to browse
        </div>
        <div class="upload-meta">
            Up to 10 photos • JPG, PNG • Max 5MB each
        </div>
    </div>
    
    <!-- Photo Grid -->
    <div class="photo-grid" id="photo-grid">
        <!-- Populated dynamically -->
    </div>
    
    <div class="photo-count">
        <span id="photo-count">0</span> / 10 photos uploaded
    </div>
</div>
```

**CSS:**
```css
.upload-zone {
    border: 2px dashed var(--border);
    border-radius: 16px;
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: var(--bg-tertiary);
}

.upload-zone:hover {
    border-color: var(--accent-primary);
    background: rgba(0, 229, 160, 0.05);
}

.upload-zone.dragging {
    border-color: var(--accent-primary);
    background: rgba(0, 229, 160, 0.1);
}

.upload-icon {
    margin: 0 auto 16px;
    color: var(--text-muted);
}

.photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
    margin-top: 24px;
}

.photo-item {
    position: relative;
    aspect-ratio: 4/3;
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
}

.photo-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.photo-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.photo-item:hover .photo-actions {
    opacity: 1;
}

.photo-action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.photo-action-btn:hover {
    background: rgba(0, 0, 0, 0.9);
}
```

**JavaScript:**
```javascript
// Photo upload handler
const uploadZone = document.getElementById('photo-upload');
const photoGrid = document.getElementById('photo-grid');
let uploadedPhotos = [];

uploadZone?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.multiple = true;
    input.onchange = handlePhotoSelect;
    input.click();
});

// Drag & drop
uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragging');
});

uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragging');
});

uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    handlePhotoSelect({ target: { files: e.dataTransfer.files } });
});

function handlePhotoSelect(event) {
    const files = Array.from(event.target.files);
    
    if (uploadedPhotos.length + files.length > 10) {
        showToast('Maximum 10 photos allowed', 'error');
        return;
    }
    
    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name} is too large (max 5MB)`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const photo = {
                id: Date.now() + Math.random(),
                url: e.target.result,
                file: file,
                caption: ''
            };
            uploadedPhotos.push(photo);
            renderPhotoGrid();
            
            // TODO: Upload to server
            // POST /api/vendor/photos
            // FormData with file
        };
        reader.readAsDataURL(file);
    });
}

function renderPhotoGrid() {
    photoGrid.innerHTML = uploadedPhotos.map(photo => `
        <div class="photo-item" data-id="${photo.id}">
            <img src="${photo.url}" alt="Work photo">
            <div class="photo-actions">
                <button class="photo-action-btn" onclick="deletePhoto('${photo.id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('photo-count').textContent = uploadedPhotos.length;
}

function deletePhoto(id) {
    uploadedPhotos = uploadedPhotos.filter(p => p.id !== id);
    renderPhotoGrid();
    // TODO: DELETE /api/vendor/photos/{id}
}
```

---

## 🔐 2. Verification & Trust Tab (NEW)

### 2.1 Verification Status Banner

```html
<div class="verification-banner" data-status="not-verified">
    <div class="verification-status">
        <div class="status-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
        </div>
        <div class="status-info">
            <div class="status-title">Not Verified</div>
            <div class="status-description">
                Complete verification to build trust and increase quote acceptance
            </div>
        </div>
    </div>
    <button class="btn btn-primary" onclick="startVerification()">
        Start Verification
    </button>
</div>
```

**Status Variations:**
```css
/* Not Verified - Gray/Warning */
.verification-banner[data-status="not-verified"] {
    background: rgba(255, 167, 38, 0.08);
    border: 1px solid var(--accent-warning);
}

/* Pending - Blue */
.verification-banner[data-status="pending"] {
    background: rgba(66, 165, 245, 0.08);
    border: 1px solid var(--accent-info);
}

/* Verified - Green */
.verification-banner[data-status="verified"] {
    background: rgba(0, 229, 160, 0.08);
    border: 1px solid var(--accent-success);
}

/* Rejected - Red */
.verification-banner[data-status="rejected"] {
    background: rgba(255, 71, 87, 0.08);
    border: 1px solid var(--accent-danger);
}
```

### 2.2 Company Information

```html
<div class="settings-section">
    <h2 class="section-title">Company Information</h2>
    <p class="section-description">
        Required for UK business verification
    </p>
    
    <div class="form-grid">
        <div class="form-group">
            <label class="form-label">Company Registration Number</label>
            <input 
                type="text" 
                id="company-number" 
                class="form-input" 
                placeholder="e.g., 12345678"
                pattern="[0-9A-Z]{8}"
            >
            <span class="form-helper">
                UK Companies House number (leave blank if sole trader)
            </span>
        </div>
        
        <div class="form-group">
            <label class="form-label">Trading Name</label>
            <input 
                type="text" 
                id="trading-name" 
                class="form-input" 
                placeholder="If different from business name"
            >
        </div>
    </div>
    
    <!-- Companies House Auto-Check Result -->
    <div id="companies-house-result" class="check-result" style="display: none;">
        <div class="check-result-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
        </div>
        <div class="check-result-text">
            <strong>Company Found:</strong> Doe Plumbing Limited
            <div class="check-result-meta">
                Status: Active • Incorporated: 2015
            </div>
        </div>
    </div>
</div>
```

**JavaScript for Companies House Check:**
```javascript
let companyCheckTimeout;

document.getElementById('company-number')?.addEventListener('input', (e) => {
    const number = e.target.value.trim();
    
    clearTimeout(companyCheckTimeout);
    
    if (number.length === 8) {
        companyCheckTimeout = setTimeout(async () => {
            // TODO: Call Companies House API
            // GET /api/verification/companies-house/{number}
            
            const result = await checkCompaniesHouse(number);
            displayCompanyResult(result);
        }, 500);
    }
});

async function checkCompaniesHouse(number) {
    // TODO: Implement actual API call
    // This is a placeholder for the real implementation
    
    return {
        found: true,
        name: 'Doe Plumbing Limited',
        status: 'active',
        incorporated: '2015-03-12',
        sic_codes: ['43220'], // Plumbing
        address: {
            line1: '123 High Street',
            postcode: 'SW1A 1AA'
        }
    };
}

function displayCompanyResult(result) {
    const resultEl = document.getElementById('companies-house-result');
    
    if (!result || !result.found) {
        resultEl.style.display = 'none';
        return;
    }
    
    resultEl.style.display = 'flex';
    resultEl.innerHTML = `
        <div class="check-result-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
        </div>
        <div class="check-result-text">
            <strong>Company Found:</strong> ${result.name}
            <div class="check-result-meta">
                Status: ${result.status} • Incorporated: ${new Date(result.incorporated).getFullYear()}
            </div>
        </div>
    `;
}
```

### 2.3 Insurance Information

```html
<div class="settings-section">
    <h2 class="section-title">Insurance</h2>
    <p class="section-description">
        Required for verification and customer protection
    </p>
    
    <div class="insurance-checklist">
        <div class="insurance-item">
            <input type="checkbox" id="insurance-public-liability" class="insurance-checkbox">
            <label for="insurance-public-liability">
                <strong>Public Liability Insurance</strong>
                <span>Required for all trades</span>
            </label>
            <span class="badge" data-status="pending">Upload Required</span>
        </div>
        
        <div class="insurance-item">
            <input type="checkbox" id="insurance-professional" class="insurance-checkbox">
            <label for="insurance-professional">
                <strong>Professional Indemnity Insurance</strong>
                <span>Recommended for design trades</span>
            </label>
            <span class="badge disabled">Optional</span>
        </div>
        
        <div class="insurance-item">
            <input type="checkbox" id="insurance-employers" class="insurance-checkbox">
            <label for="insurance-employers">
                <strong>Employers' Liability Insurance</strong>
                <span>Required if you employ staff</span>
            </label>
            <span class="badge disabled">Optional</span>
        </div>
    </div>
</div>
```

### 2.4 Document Upload Section

```html
<div class="settings-section">
    <h2 class="section-title">Verification Documents</h2>
    <p class="section-description">
        Upload supporting documents for verification
    </p>
    
    <div class="document-list">
        <!-- Certificate of Incorporation -->
        <div class="document-item">
            <div class="document-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            </div>
            <div class="document-info">
                <div class="document-title">Certificate of Incorporation</div>
                <div class="document-meta">PDF, JPG, or PNG • Max 5MB</div>
            </div>
            <div class="document-actions">
                <button class="btn btn-secondary" onclick="uploadDocument('incorporation')">
                    Upload
                </button>
            </div>
        </div>
        
        <!-- Insurance Certificate -->
        <div class="document-item" data-status="uploaded">
            <div class="document-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
            </div>
            <div class="document-info">
                <div class="document-title">Public Liability Insurance</div>
                <div class="document-meta">
                    insurance_certificate.pdf • Expires: 15 Dec 2026
                </div>
            </div>
            <div class="document-status">
                <span class="badge success">
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Verified
                </span>
            </div>
        </div>
        
        <!-- Trade Accreditation (Optional) -->
        <div class="document-item">
            <div class="document-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
            </div>
            <div class="document-info">
                <div class="document-title">Trade Accreditation (Optional)</div>
                <div class="document-meta">Gas Safe, NICEIC, etc.</div>
            </div>
            <div class="document-actions">
                <button class="btn btn-secondary" onclick="uploadDocument('accreditation')">
                    Upload
                </button>
            </div>
        </div>
    </div>
</div>
```

**CSS:**
```css
.document-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.document-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: all 0.2s;
}

.document-item:hover {
    border-color: var(--border-hover);
}

.document-item[data-status="uploaded"] {
    border-color: var(--accent-success);
    background: rgba(0, 229, 160, 0.05);
}

.document-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: rgba(0, 229, 160, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--accent-primary);
}

.document-info {
    flex: 1;
}

.document-title {
    font-weight: 600;
    margin-bottom: 4px;
}

.document-meta {
    font-size: 13px;
    color: var(--text-muted);
}

.insurance-checklist {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.insurance-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 12px;
}

.insurance-checkbox {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.insurance-item label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
}

.insurance-item label strong {
    font-weight: 600;
}

.insurance-item label span {
    font-size: 13px;
    color: var(--text-muted);
}
```

### 2.5 Verified Badge Upgrade CTA

```html
<div class="settings-section verified-badge-section">
    <div class="badge-header">
        <div class="badge-icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
        </div>
        <div class="badge-content">
            <h2 class="section-title" style="margin: 0;">Get Verified</h2>
            <p class="section-description" style="margin: 0;">
                Stand out as a trusted, verified business
            </p>
        </div>
        <div class="badge-price">
            <div class="price-amount">£4.99</div>
            <div class="price-period">/month</div>
        </div>
    </div>
    
    <div class="badge-benefits">
        <div class="benefit-item">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Verified badge on your profile</span>
        </div>
        <div class="benefit-item">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Verified badge on quote cards</span>
        </div>
        <div class="benefit-item">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Verified badge on local service pages</span>
        </div>
        <div class="benefit-item">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>Increase customer confidence & quote acceptance</span>
        </div>
    </div>
    
    <div class="badge-requirements">
        <div class="requirement-title">Requirements:</div>
        <ul>
            <li>✅ Company information submitted</li>
            <li>⏳ Insurance certificate uploaded</li>
            <li>⏳ Documents verified</li>
        </ul>
    </div>
    
    <button class="btn btn-primary btn-large" onclick="subscribeVerifiedBadge()" disabled>
        Complete Verification to Subscribe
    </button>
    
    <div class="badge-note">
        Cancel anytime • No long-term contract
    </div>
</div>
```

**CSS:**
```css
.verified-badge-section {
    background: linear-gradient(135deg, rgba(0, 229, 160, 0.08), rgba(66, 165, 245, 0.08));
    border: 1px solid var(--accent-primary);
}

.badge-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
}

.badge-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: var(--accent-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.badge-content {
    flex: 1;
}

.badge-price {
    text-align: right;
}

.price-amount {
    font-size: 36px;
    font-weight: 800;
    font-family: 'Space Mono', monospace;
    color: var(--accent-primary);
}

.price-period {
    font-size: 14px;
    color: var(--text-muted);
}

.badge-benefits {
    display: grid;
    gap: 12px;
    margin-bottom: 24px;
}

.benefit-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
}

.benefit-item svg {
    color: var(--accent-success);
    flex-shrink: 0;
}

.badge-requirements {
    background: var(--bg-card);
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 20px;
}

.requirement-title {
    font-weight: 600;
    margin-bottom: 8px;
}

.badge-requirements ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
}

.btn-large {
    width: 100%;
    padding: 16px 24px;
    font-size: 16px;
}

.badge-note {
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 12px;
}
```

---

## 📍 3. Service Areas Tab (ENHANCED)

### 3.1 Postcode Coverage Overview

```html
<div class="settings-section">
    <h2 class="section-title">Service Area Coverage</h2>
    <p class="section-description">
        Control where you receive work enquiries. Fair coverage ensures quality leads.
    </p>
    
    <!-- Postcode Allowance Card -->
    <div class="coverage-card">
        <div class="coverage-header">
            <div class="coverage-icon">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
            </div>
            <div class="coverage-info">
                <div class="coverage-title">Postcode Districts</div>
                <div class="coverage-meta">Included with your account</div>
            </div>
            <div class="coverage-count">
                <span class="count-current">7</span>
                <span class="count-separator">/</span>
                <span class="count-total">10</span>
            </div>
        </div>
        
        <div class="coverage-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 70%"></div>
            </div>
            <div class="progress-label">70% of allowance used</div>
        </div>
        
        <div class="coverage-note">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>
                This helps ensure fair lead distribution and higher quality enquiries for everyone.
            </span>
        </div>
    </div>
</div>
```

**CSS:**
```css
.coverage-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
}

.coverage-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
}

.coverage-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(0, 229, 160, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
}

.coverage-info {
    flex: 1;
}

.coverage-title {
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 4px;
}

.coverage-meta {
    font-size: 13px;
    color: var(--text-muted);
}

.coverage-count {
    font-size: 32px;
    font-weight: 800;
    font-family: 'Space Mono', monospace;
}

.count-current {
    color: var(--accent-primary);
}

.count-separator {
    color: var(--text-muted);
    margin: 0 4px;
}

.count-total {
    color: var(--text-secondary);
}

.coverage-progress {
    margin-bottom: 16px;
}

.progress-bar {
    height: 8px;
    background: var(--bg-primary);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-info));
    border-radius: 4px;
    transition: width 0.3s;
}

.progress-label {
    font-size: 13px;
    color: var(--text-muted);
    text-align: right;
}

.coverage-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    background: rgba(66, 165, 245, 0.08);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-secondary);
}

.coverage-note svg {
    flex-shrink: 0;
    color: var(--accent-info);
}
```

### 3.2 Current Postcodes with Saturation Warnings

```html
<div class="settings-section">
    <h2 class="section-title">Your Coverage Areas</h2>
    
    <div class="postcode-list">
        <!-- Active Postcode - Low Competition -->
        <div class="postcode-item" data-saturation="low">
            <div class="postcode-info">
                <div class="postcode-code">SW1</div>
                <div class="postcode-name">Westminster</div>
            </div>
            <div class="postcode-saturation">
                <span class="saturation-badge low">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Low competition
                </span>
                <button class="tooltip-trigger" data-tooltip="Few vendors, good opportunity for enquiries">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </button>
            </div>
            <div class="postcode-actions">
                <button class="btn-icon" onclick="removePostcode('SW1')" title="Remove">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- Moderate Competition -->
        <div class="postcode-item" data-saturation="moderate">
            <div class="postcode-info">
                <div class="postcode-code">W1</div>
                <div class="postcode-name">Mayfair</div>
            </div>
            <div class="postcode-saturation">
                <span class="saturation-badge moderate">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Moderate
                </span>
                <button class="tooltip-trigger" data-tooltip="Average vendor density, steady demand">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </button>
            </div>
            <div class="postcode-actions">
                <button class="btn-icon" onclick="removePostcode('W1')" title="Remove">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- High Competition -->
        <div class="postcode-item" data-saturation="high">
            <div class="postcode-info">
                <div class="postcode-code">SW3</div>
                <div class="postcode-name">Chelsea</div>
            </div>
            <div class="postcode-saturation">
                <span class="saturation-badge high">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    High competition
                </span>
                <button class="tooltip-trigger" data-tooltip="Many vendors, fewer leads per vendor">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </button>
            </div>
            <div class="postcode-actions">
                <button class="btn-icon" onclick="removePostcode('SW3')" title="Remove">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    
    <button class="btn btn-secondary" onclick="openPostcodeSelector()" id="add-postcode-btn">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Add Postcode District
    </button>
</div>
```

**CSS:**
```css
.postcode-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
}

.postcode-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: all 0.2s;
}

.postcode-item:hover {
    border-color: var(--border-hover);
}

.postcode-info {
    flex: 1;
}

.postcode-code {
    font-size: 18px;
    font-weight: 700;
    font-family: 'Space Mono', monospace;
    margin-bottom: 4px;
}

.postcode-name {
    font-size: 13px;
    color: var(--text-muted);
}

.postcode-saturation {
    display: flex;
    align-items: center;
    gap: 8px;
}

.saturation-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
}

.saturation-badge.low {
    background: rgba(0, 229, 160, 0.12);
    color: var(--accent-success);
}

.saturation-badge.moderate {
    background: rgba(255, 167, 38, 0.12);
    color: var(--accent-warning);
}

.saturation-badge.high {
    background: rgba(255, 71, 87, 0.12);
    color: var(--accent-danger);
}

.saturation-badge svg {
    width: 12px;
    height: 12px;
}

.tooltip-trigger {
    background: none;
    border: none;
    cursor: help;
    color: var(--text-muted);
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tooltip-trigger:hover {
    color: var(--text-primary);
}

.btn-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
}

.btn-icon:hover {
    background: var(--accent-danger);
    border-color: var(--accent-danger);
    color: white;
}
```

### 3.3 AI-Suggested Postcodes (Pro Feature)

```html
<div class="settings-section suggested-postcodes-section">
    <div class="section-header-with-badge">
        <div>
            <h2 class="section-title">Suggested Areas for You</h2>
            <p class="section-description">
                AI-powered recommendations based on demand and competition
            </p>
        </div>
        <span class="badge pro">PRO</span>
    </div>
    
    <div class="suggestions-grid">
        <!-- High Opportunity -->
        <div class="suggestion-card">
            <div class="suggestion-header">
                <div class="suggestion-postcode">E17</div>
                <div class="opportunity-score">
                    <div class="score-value">86</div>
                    <div class="score-label">Opportunity</div>
                </div>
            </div>
            <div class="suggestion-name">Walthamstow</div>
            <div class="suggestion-insights">
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    High demand for plumbers
                </div>
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    Low vendor competition
                </div>
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    5.2 miles from your areas
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="addSuggestedPostcode('E17')">
                Add E17
            </button>
        </div>
        
        <!-- Good Opportunity -->
        <div class="suggestion-card">
            <div class="suggestion-header">
                <div class="suggestion-postcode">N1</div>
                <div class="opportunity-score">
                    <div class="score-value">78</div>
                    <div class="score-label">Opportunity</div>
                </div>
            </div>
            <div class="suggestion-name">Islington</div>
            <div class="suggestion-insights">
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    Steady quote demand
                </div>
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Similar to your current success
                </div>
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    3.8 miles from your areas
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="addSuggestedPostcode('N1')">
                Add N1
            </button>
        </div>
        
        <!-- Moderate Opportunity -->
        <div class="suggestion-card">
            <div class="suggestion-header">
                <div class="suggestion-postcode">SE1</div>
                <div class="opportunity-score">
                    <div class="score-value">64</div>
                    <div class="score-label">Opportunity</div>
                </div>
            </div>
            <div class="suggestion-name">Southwark</div>
            <div class="suggestion-insights">
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    Growing demand area
                </div>
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Moderate competition
                </div>
                <div class="insight-item">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    4.5 miles from your areas
                </div>
            </div>
            <button class="btn btn-secondary btn-block" onclick="addSuggestedPostcode('SE1')">
                Add SE1
            </button>
        </div>
    </div>
    
    <div class="suggestions-disclaimer">
        Based on recent activity • No guarantees on lead volume
    </div>
</div>
```

**CSS:**
```css
.suggested-postcodes-section {
    background: linear-gradient(135deg, rgba(0, 229, 160, 0.05), rgba(66, 165, 245, 0.05));
    border: 1px solid var(--accent-info);
}

.section-header-with-badge {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
}

.suggestions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 16px;
}

.suggestion-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    transition: all 0.3s;
}

.suggestion-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent-primary);
    box-shadow: var(--shadow-md);
}

.suggestion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.suggestion-postcode {
    font-size: 28px;
    font-weight: 800;
    font-family: 'Space Mono', monospace;
}

.opportunity-score {
    text-align: right;
}

.score-value {
    font-size: 32px;
    font-weight: 800;
    font-family: 'Space Mono', monospace;
    color: var(--accent-primary);
    line-height: 1;
}

.score-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
}

.suggestion-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 16px;
}

.suggestion-insights {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
}

.insight-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
}

.insight-item svg {
    color: var(--accent-primary);
    flex-shrink: 0;
}

.btn-block {
    width: 100%;
}

.suggestions-disclaimer {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}
```

### 3.4 Postcode Expansion Packages

```html
<div class="settings-section">
    <h2 class="section-title">Expand Your Coverage</h2>
    <p class="section-description">
        Need more coverage? Add extra postcode areas to receive more enquiries.
    </p>
    
    <div class="pricing-grid">
        <!-- Starter Package -->
        <div class="pricing-card">
            <div class="pricing-header">
                <div class="pricing-name">Starter Expansion</div>
                <div class="pricing-price">
                    <span class="price-amount">£9.99</span>
                    <span class="price-period">/month</span>
                </div>
            </div>
            <div class="pricing-feature-main">
                <strong>+5</strong> extra postcode districts
            </div>
            <div class="pricing-features">
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Extends your service area
                </div>
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Cancel anytime
                </div>
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Immediate activation
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="purchaseExpansion('starter')">
                Add 5 Postcodes
            </button>
        </div>
        
        <!-- Growth Package (Most Popular) -->
        <div class="pricing-card popular">
            <div class="popular-badge">Most Popular</div>
            <div class="pricing-header">
                <div class="pricing-name">Growth Expansion</div>
                <div class="pricing-price">
                    <span class="price-amount">£24.99</span>
                    <span class="price-period">/month</span>
                </div>
            </div>
            <div class="pricing-feature-main">
                <strong>+15</strong> extra postcode districts
            </div>
            <div class="pricing-features">
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Wider service coverage
                </div>
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Cancel anytime
                </div>
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Best value per postcode
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="purchaseExpansion('growth')">
                Add 15 Postcodes
            </button>
        </div>
        
        <!-- Power Package -->
        <div class="pricing-card">
            <div class="pricing-header">
                <div class="pricing-name">Power Coverage</div>
                <div class="pricing-price">
                    <span class="price-amount">£39.99</span>
                    <span class="price-period">/month</span>
                </div>
            </div>
            <div class="pricing-feature-main">
                <strong>+30</strong> extra postcode districts
            </div>
            <div class="pricing-features">
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Maximum coverage
                </div>
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Cancel anytime
                </div>
                <div class="pricing-feature">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    For growing businesses
                </div>
            </div>
            <button class="btn btn-secondary btn-block" onclick="purchaseExpansion('power')">
                Add 30 Postcodes
            </button>
        </div>
    </div>
    
    <div class="expansion-note">
        All packages can be stacked and cancelled anytime. No long-term contracts.
    </div>
</div>
```

**CSS:**
```css
.pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
    margin-bottom: 16px;
}

.pricing-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    position: relative;
    transition: all 0.3s;
}

.pricing-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent-primary);
    box-shadow: var(--shadow-md);
}

.pricing-card.popular {
    border-color: var(--accent-primary);
    background: linear-gradient(135deg, rgba(0, 229, 160, 0.08), rgba(66, 165, 245, 0.08));
}

.popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 12px;
    background: var(--accent-primary);
    color: white;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: 6px;
}

.pricing-header {
    margin-bottom: 16px;
}

.pricing-name {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
}

.pricing-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
}

.price-amount {
    font-size: 32px;
    font-weight: 800;
    font-family: 'Space Mono', monospace;
}

.price-period {
    font-size: 14px;
    color: var(--text-muted);
}

.pricing-feature-main {
    font-size: 20px;
    text-align: center;
    padding: 16px;
    background: rgba(0, 229, 160, 0.08);
    border-radius: 10px;
    margin-bottom: 20px;
}

.pricing-feature-main strong {
    font-size: 28px;
    font-weight: 800;
    color: var(--accent-primary);
}

.pricing-features {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
}

.pricing-feature {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

.pricing-feature svg {
    color: var(--accent-success);
    flex-shrink: 0;
}

.expansion-note {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}
```

---

## 4. Public Profile Preview Tab (NEW)

```html
<div id="preview-tab" class="tab-content">
    <div class="settings-section">
        <h2 class="section-title">Public Profile Preview</h2>
        <p class="section-description">
            See how your business appears to customers
        </p>
        
        <!-- Profile Preview Card -->
        <div class="profile-preview-card">
            <div class="preview-header">
                <div class="preview-avatar">
                    <div class="avatar-placeholder">
                        JD
                    </div>
                </div>
                <div class="preview-info">
                    <div class="preview-name">
                        Doe Plumbing Services
                        <span class="verified-badge-inline">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                            </svg>
                            Verified
                        </span>
                    </div>
                    <div class="preview-meta">
                        <span>⭐ 4.9 (127 reviews)</span>
                        <span>•</span>
                        <span>10+ years in business</span>
                    </div>
                    <div class="preview-location">
                        📍 SW1, W1, SW3 +4 more areas
                    </div>
                </div>
            </div>
            
            <div class="preview-description">
                Professional plumbing services across central London. Specialising in emergency repairs, bathroom installations, and boiler servicing. All work guaranteed and fully insured.
            </div>
            
            <div class="preview-gallery">
                <div class="gallery-title">Recent Work</div>
                <div class="gallery-grid">
                    <div class="gallery-item">
                        <div class="gallery-placeholder">📷</div>
                    </div>
                    <div class="gallery-item">
                        <div class="gallery-placeholder">📷</div>
                    </div>
                    <div class="gallery-item">
                        <div class="gallery-placeholder">📷</div>
                    </div>
                </div>
            </div>
            
            <div class="preview-actions">
                <button class="btn btn-primary">Request Quote</button>
                <button class="btn btn-secondary">Send Message</button>
            </div>
        </div>
        
        <div class="preview-note">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            This is a simplified preview. Your full profile includes reviews, certifications, and response time.
        </div>
    </div>
</div>
```

**CSS:**
```css
.profile-preview-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 20px;
}

.preview-header {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
}

.preview-avatar {
    flex-shrink: 0;
}

.avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-info));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
    color: white;
}

.preview-info {
    flex: 1;
}

.preview-name {
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.verified-badge-inline {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--accent-primary);
    color: white;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
}

.verified-badge-inline svg {
    width: 14px;
    height: 14px;
}

.preview-meta {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 6px;
}

.preview-meta span {
    margin: 0 6px;
}

.preview-meta span:first-child {
    margin-left: 0;
}

.preview-location {
    font-size: 14px;
    color: var(--text-muted);
}

.preview-description {
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 24px;
    color: var(--text-secondary);
}

.preview-gallery {
    margin-bottom: 24px;
}

.gallery-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
}

.gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

.gallery-item {
    aspect-ratio: 4/3;
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg-primary);
}

.gallery-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    opacity: 0.5;
}

.preview-actions {
    display: flex;
    gap: 12px;
}

.preview-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
    background: rgba(66, 165, 245, 0.08);
    border: 1px solid var(--accent-info);
    border-radius: 12px;
    font-size: 13px;
    color: var(--text-secondary);
}

.preview-note svg {
    flex-shrink: 0;
    color: var(--accent-info);
}
```

---

## 🔌 JavaScript Integration Points

### TODO: Backend API Endpoints Required

```javascript
// =============================================
// BUSINESS PROFILE APIs
// =============================================

// Update business description
// POST /api/vendor/profile
{
  description: string,
  yearsInBusiness: string,
  trades: string[]
}

// Upload work photos
// POST /api/vendor/photos
// FormData with file
// Returns: { id, url, thumbnail_url }

// Delete work photo
// DELETE /api/vendor/photos/{id}

// Reorder photos
// PUT /api/vendor/photos/order
{ order: [id1, id2, id3...] }

// =============================================
// VERIFICATION APIs
// =============================================

// Submit verification request
// POST /api/vendor/verification/submit
{
  companyNumber: string,
  tradingName: string,
  insuranceTypes: string[]
}

// Check Companies House
// GET /api/verification/companies-house/{number}
// Returns: { found, name, status, incorporated, address }

// Upload document
// POST /api/vendor/verification/documents
// FormData with file + type
{
  type: 'incorporation' | 'insurance' | 'accreditation',
  file: File
}

// Subscribe to Verified Badge
// POST /api/subscriptions/verified-badge
// Stripe integration
// Returns: { subscription_id, status }

// =============================================
// SERVICE AREA APIs
// =============================================

// Get postcode saturation data
// GET /api/postcodes/saturation/{postcode}?trade={trade}
// Returns: { saturation: 'low' | 'moderate' | 'high' | 'locked', vendorCount, quoteVolume }

// Get AI-suggested postcodes
// GET /api/postcodes/suggestions
// Returns: [{ postcode, name, opportunityScore, insights: [], distance }]

// Add postcode to coverage
// POST /api/vendor/postcodes
{ postcode: string }

// Remove postcode from coverage
// DELETE /api/vendor/postcodes/{postcode}

// Purchase postcode expansion
// POST /api/subscriptions/postcode-expansion
{
  package: 'starter' | 'growth' | 'power'
}
// Stripe integration

// =============================================
// INSURANCE VALIDATION APIs
// =============================================

// Extract insurance data from document
// POST /api/vendor/insurance/extract
// FormData with file
// Returns: { insurer, policyNumber, expiryDate, businessName, matchScore }

// Validate insurance
// POST /api/vendor/insurance/validate
{
  insurer: string,
  policyNumber: string,
  expiryDate: string
}
// Returns: { valid: boolean, status: string }

// =============================================
// STRIPE INTEGRATION
// =============================================

// All subscriptions use Stripe
// Product IDs needed:
// - verified_badge: price_xxxx (£4.99/month)
// - postcode_starter: price_xxxx (£9.99/month)
// - postcode_growth: price_xxxx (£24.99/month)
// - postcode_power: price_xxxx (£39.99/month)

// Webhook handler
// POST /webhooks/stripe
// Handle: subscription_created, subscription_deleted, payment_failed

// =============================================
// ADMIN VERIFICATION QUEUE
// =============================================

// Admin: Get verification queue
// GET /admin/verification/queue
// Returns: [{ vendor_id, status, submittedAt, autoCheckResult, documents }]

// Admin: Approve verification
// POST /admin/verification/{vendor_id}/approve

// Admin: Reject verification
// POST /admin/verification/{vendor_id}/reject
{ reason: string }

// Admin: Request more info
// POST /admin/verification/{vendor_id}/request-info
{ message: string }
```

---

## 📊 Data Models

### Additional Database Tables Required

```sql
-- =============================================
-- BUSINESS PROFILE
-- =============================================

CREATE TABLE work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  caption TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_photos_vendor ON work_photos(vendor_id);

-- =============================================
-- VERIFICATION
-- =============================================

CREATE TYPE verification_status AS ENUM (
  'UNVERIFIED',
  'PENDING',
  'AUTO_VERIFIED',
  'MANUAL_REVIEW',
  'VERIFIED',
  'REJECTED',
  'EXPIRED'
);

CREATE TABLE vendor_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status verification_status DEFAULT 'UNVERIFIED',
  company_number VARCHAR(8),
  trading_name TEXT,
  companies_house_data JSONB,
  auto_check_result JSONB,
  manual_review_notes TEXT,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE document_status AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'incorporation', 'insurance', 'accreditation'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status document_status DEFAULT 'UPLOADED',
  extracted_data JSONB,
  rejection_reason TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- =============================================
-- INSURANCE
-- =============================================

CREATE TYPE insurance_status AS ENUM (
  'NOT_SUBMITTED',
  'PENDING',
  'AUTO_VALIDATED',
  'MANUAL_REVIEW',
  'EXPIRED',
  'REJECTED'
);

CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'public_liability', 'professional_indemnity', 'employers_liability'
  insurer TEXT,
  policy_number TEXT,
  expires_at DATE NOT NULL,
  status insurance_status DEFAULT 'PENDING',
  document_id UUID REFERENCES verification_documents(id),
  auto_check_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expiry monitoring job
CREATE INDEX idx_insurance_expiry ON insurance_policies(expires_at) WHERE status = 'AUTO_VALIDATED';

-- =============================================
-- POSTCODE COVERAGE
-- =============================================

CREATE TABLE vendor_postcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  postcode VARCHAR(4) NOT NULL, -- District only, e.g. 'SW1'
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vendor_id, postcode)
);

CREATE INDEX idx_vendor_postcodes_vendor ON vendor_postcodes(vendor_id);
CREATE INDEX idx_vendor_postcodes_postcode ON vendor_postcodes(postcode);

-- Postcode saturation analytics
CREATE TABLE postcode_saturation_cache (
  postcode VARCHAR(4) NOT NULL,
  trade VARCHAR(50) NOT NULL,
  vendor_count INT NOT NULL,
  quote_volume_30d INT NOT NULL,
  saturation_level VARCHAR(20), -- 'low', 'moderate', 'high', 'locked'
  calculated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (postcode, trade)
);

-- Refresh hourly
CREATE INDEX idx_saturation_calculated ON postcode_saturation_cache(calculated_at);

-- =============================================
-- POSTCODE SUBSCRIPTIONS
-- =============================================

CREATE TABLE postcode_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  package VARCHAR(20) NOT NULL, -- 'starter', 'growth', 'power'
  extra_postcodes INT NOT NULL, -- 5, 15, or 30
  stripe_subscription_id TEXT UNIQUE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  started_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP
);

-- =============================================
-- VERIFIED BADGE SUBSCRIPTIONS
-- =============================================

CREATE TABLE verified_badge_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP
);

-- =============================================
-- RISK SCORING (Internal Only)
-- =============================================

CREATE TABLE vendor_risk_assessments (
  vendor_id UUID PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  risk_score INT NOT NULL, -- 0-100
  risk_band VARCHAR(20), -- 'low', 'medium', 'high'
  factors JSONB, -- Detailed breakdown
  last_checked TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- =============================================
-- AUDIT LOG
-- =============================================

CREATE TABLE verification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  action VARCHAR(100) NOT NULL,
  actor_type VARCHAR(20) NOT NULL, -- 'system', 'admin', 'vendor'
  actor_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_vendor ON verification_audit_log(vendor_id);
CREATE INDEX idx_audit_created ON verification_audit_log(created_at);
```

---

## 🎯 Feature Flags

```javascript
// Feature flags to control rollout
const FEATURE_FLAGS = {
  // Business Profile
  WORK_PHOTOS_ENABLED: true,
  PORTFOLIO_MAX_PHOTOS: 10,
  
  // Verification
  AUTO_VERIFICATION_ENABLED: true,
  COMPANIES_HOUSE_CHECK_ENABLED: true,
  VERIFIED_BADGE_PRICE: 4.99,
  
  // Service Areas
  DEFAULT_POSTCODE_CAP: 10,
  POSTCODE_EXPANSIONS_ENABLED: true,
  AI_SUGGESTIONS_ENABLED: true, // Pro users only
  SATURATION_WARNINGS_ENABLED: true,
  
  // Insurance
  AUTO_INSURANCE_VALIDATION: true,
  INSURANCE_EXPIRY_WARNING_DAYS: 30,
  
  // Risk Scoring
  RISK_SCORING_ENABLED: true, // Admin only
  
  // Pricing
  POSTCODE_STARTER_PRICE: 9.99,
  POSTCODE_GROWTH_PRICE: 24.99,
  POSTCODE_POWER_PRICE: 39.99
};
```

---

## 💰 Monetization Summary

### Revenue Per Vendor (Maximum ARPU)

| Product | Price | Type |
|---------|-------|------|
| Base Account | £0.00 | Included |
| Verified Badge | £4.99/mo | Subscription |
| Postcode Starter (+5) | £9.99/mo | Subscription |
| Postcode Growth (+15) | £24.99/mo | Subscription |
| Postcode Power (+30) | £39.99/mo | Subscription |
| **Maximum Total** | **£44.98/mo** | - |

### Expected Attach Rates

- Verified Badge: 40-60% (high trust value)
- Postcode Expansion: 20-30% (growing businesses)
- Combined ARPU Target: £8-15/vendor/month

### Competitive Positioning

**vs. Checkatrade:**
- Lower barrier to entry
- More transparent pricing
- Fair postcode distribution

**vs. MyBuilder:**
- Better territorial control
- Clearer ROI
- No hidden fees

**vs. Bark:**
- Predictable costs
- No per-lead charges
- Vendor-friendly limits

---

## 🚀 Implementation Priority

### Phase 1 (MVP - Week 1-2)
1. ✅ Business Profile tab
2. ✅ Work Photos upload
3. ✅ Verification status display
4. ✅ Document upload UI
5. ✅ Postcode cap enforcement
6. ✅ Basic saturation warnings

### Phase 2 (Trust - Week 3-4)
1. ✅ Companies House integration
2. ✅ Auto-verification flow
3. ✅ Insurance validation
4. ✅ Verified Badge subscription
5. ✅ Admin verification queue

### Phase 3 (Intelligence - Week 5-6)
1. ✅ AI postcode suggestions
2. ✅ Opportunity scoring
3. ✅ Risk scoring (internal)
4. ✅ Trading Standards checks
5. ✅ Postcode expansion packages

### Phase 4 (Polish - Week 7-8)
1. ✅ Public profile preview
2. ✅ Expiry monitoring
3. ✅ Email notifications
4. ✅ Analytics dashboard integration
5. ✅ Mobile optimization

---

## 📱 Mobile Responsiveness

All new sections must be mobile-optimized:

```css
@media (max-width: 768px) {
    .pricing-grid,
    .suggestions-grid {
        grid-template-columns: 1fr;
    }
    
    .coverage-header {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .photo-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .document-item {
        flex-direction: column;
        align-items: flex-start;
    }
}
```

---

## ✅ Checklist for Implementation

### Before Launch:
- [ ] All API endpoints implemented and tested
- [ ] Stripe products created (4 products)
- [ ] Companies House API key obtained
- [ ] Document storage configured (S3/CloudFlare R2)
- [ ] OCR service integrated (if using)
- [ ] Email templates created (verification, expiry warnings)
- [ ] Admin verification queue tested
- [ ] Postcode saturation algorithm validated
- [ ] Risk scoring model calibrated
- [ ] Feature flags configured
- [ ] Mobile testing complete
- [ ] Security audit passed
- [ ] GDPR compliance verified
- [ ] Legal T&Cs updated (verification, subscriptions)
- [ ] Support documentation created

---

## 📞 Support & Documentation

### Vendor-Facing Help Articles Needed:

1. "How does business verification work?"
2. "What documents do I need for verification?"
3. "Understanding postcode coverage limits"
4. "How to choose the right expansion package"
5. "What is the Verified Business badge?"
6. "How saturation warnings work"
7. "Understanding AI postcode suggestions"
8. "Managing your insurance documents"

### Admin Training Required:

1. Manual verification workflow
2. Document review guidelines
3. Risk scoring interpretation
4. Fraud detection procedures
5. Appeals process
6. Subscription management

---

## 🎓 Key Success Metrics

### Track These:

**Verification:**
- % vendors who start verification
- % who complete verification
- Time to verification
- Auto-verification rate vs manual review rate

**Monetization:**
- Verified Badge attach rate
- Postcode expansion attach rate
- Average revenue per user (ARPU)
- Churn rate by subscription type

**Quality:**
- Postcode saturation balance
- Vendor satisfaction scores
- Customer trust metrics
- Fraud/abuse rates

---

This implementation guide provides everything needed to build a production-ready, monetizable Settings page with comprehensive verification and territory management features.
