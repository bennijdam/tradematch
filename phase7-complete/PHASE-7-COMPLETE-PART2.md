# 🚀 TradeMatch Phase 7 - Part 2: AI, Proposals, Analytics & Milestones

## 🤖 **Feature 3: AI Job Enhancement (OpenAI Integration)**

### **Backend Service: openai.service.js**

```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Enhance Quote Description with AI
 */
async function enhanceQuoteDescription(originalDescription, serviceType) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are a professional home improvement consultant. 
                             Enhance the following quote description to be more detailed, 
                             professional, and comprehensive. Include typical considerations, 
                             potential challenges, and best practices for ${serviceType} projects.
                             Keep it under 200 words.`
                },
                {
                    role: "user",
                    content: originalDescription
                }
            ],
            temperature: 0.7,
            max_tokens: 300
        });
        
        return {
            enhanced: completion.choices[0].message.content,
            original: originalDescription
        };
        
    } catch (error) {
        console.error('AI enhancement error:', error);
        throw error;
    }
}

/**
 * Generate Project Cost Estimate
 */
async function generateCostEstimate(projectDetails) {
    try {
        const { serviceType, description, postcode, urgency } = projectDetails;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `You are a construction cost estimator. Provide a realistic 
                             UK price range (in GBP) for the following project. 
                             Consider labor, materials, and typical markups. 
                             Response format: {"min": NUMBER, "max": NUMBER, "breakdown": "text"}`
                },
                {
                    role: "user",
                    content: `Service: ${serviceType}
                             Description: ${description}
                             Location: ${postcode}
                             Urgency: ${urgency}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.5
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('Cost estimate error:', error);
        throw error;
    }
}

/**
 * Generate Project Timeline
 */
async function generateProjectTimeline(projectDetails) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Generate a realistic project timeline with milestones. 
                             Return JSON: {"duration_weeks": NUMBER, "milestones": [{"title": "", "description": "", "week": NUMBER}]}`
                },
                {
                    role: "user",
                    content: JSON.stringify(projectDetails)
                }
            ],
            response_format: { type: "json_object" }
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('Timeline generation error:', error);
        throw error;
    }
}

/**
 * Analyze Quote for Red Flags
 */
async function analyzeQuoteForIssues(quoteText) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Analyze this quote for potential red flags, unclear terms, 
                             or missing information. Return JSON: 
                             {"risk_level": "low|medium|high", "issues": ["..."], "recommendations": ["..."]}`
                },
                {
                    role: "user",
                    content: quoteText
                }
            ],
            response_format: { type: "json_object" }
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('Quote analysis error:', error);
        throw error;
    }
}

/**
 * Generate SEO-Optimized Service Page Content
 */
async function generateServicePageContent(service, location) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: `Generate SEO-optimized content for a service page. 
                             Include: title, meta description, H1, introduction (150 words), 
                             key benefits (5 points), typical cost range, and FAQs (3).
                             Return as JSON.`
                },
                {
                    role: "user",
                    content: `Service: ${service}, Location: ${location}`
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1500
        });
        
        return JSON.parse(completion.choices[0].message.content);
        
    } catch (error) {
        console.error('SEO content generation error:', error);
        throw error;
    }
}

module.exports = {
    enhanceQuoteDescription,
    generateCostEstimate,
    generateProjectTimeline,
    analyzeQuoteForIssues,
    generateServicePageContent
};
```

### **Backend Route: ai.js**

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const aiService = require('../services/openai.service');

/**
 * Enhance Quote with AI
 * POST /api/ai/enhance-quote
 */
router.post('/enhance-quote', authenticate, async (req, res) => {
    const { description, serviceType } = req.body;
    
    try {
        const enhanced = await aiService.enhanceQuoteDescription(description, serviceType);
        
        res.json({
            success: true,
            original: enhanced.original,
            enhanced: enhanced.enhanced
        });
        
    } catch (error) {
        console.error('AI enhancement error:', error);
        res.status(500).json({ error: 'Failed to enhance quote' });
    }
});

/**
 * Get AI Cost Estimate
 * POST /api/ai/estimate-cost
 */
router.post('/estimate-cost', authenticate, async (req, res) => {
    const projectDetails = req.body;
    
    try {
        const estimate = await aiService.generateCostEstimate(projectDetails);
        
        res.json({
            success: true,
            estimate
        });
        
    } catch (error) {
        console.error('Cost estimate error:', error);
        res.status(500).json({ error: 'Failed to generate estimate' });
    }
});

/**
 * Generate Project Timeline
 * POST /api/ai/generate-timeline
 */
router.post('/generate-timeline', authenticate, async (req, res) => {
    const projectDetails = req.body;
    
    try {
        const timeline = await aiService.generateProjectTimeline(projectDetails);
        
        res.json({
            success: true,
            timeline
        });
        
    } catch (error) {
        console.error('Timeline generation error:', error);
        res.status(500).json({ error: 'Failed to generate timeline' });
    }
});

/**
 * Analyze Quote for Issues
 * POST /api/ai/analyze-quote
 */
router.post('/analyze-quote', authenticate, async (req, res) => {
    const { quoteText } = req.body;
    
    try {
        const analysis = await aiService.analyzeQuoteForIssues(quoteText);
        
        res.json({
            success: true,
            analysis
        });
        
    } catch (error) {
        console.error('Quote analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze quote' });
    }
});

module.exports = router;
```

### **Frontend: AI Enhancement Button**

```html
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
```

---

## 📄 **Feature 4: Proposal System (Professional PDF Generation)**

### **Backend Service: pdf.service.js**

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate Professional Proposal PDF
 */
async function generateProposal(proposalData, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });
            
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);
            
            // Header
            doc.fontSize(24)
               .fillColor('#FF385C')
               .text('PROJECT PROPOSAL', { align: 'center' });
            
            doc.moveDown();
            doc.fontSize(10)
               .fillColor('#666')
               .text(`Proposal #${proposalData.proposalNumber}`, { align: 'center' });
            
            doc.moveDown(2);
            
            // Company Details
            doc.fontSize(14)
               .fillColor('#1A1A1A')
               .text('From:', { underline: true });
            
            doc.moveDown(0.5);
            doc.fontSize(11)
               .text(proposalData.vendor.companyName);
            doc.fontSize(10)
               .fillColor('#666')
               .text(proposalData.vendor.address)
               .text(`Email: ${proposalData.vendor.email}`)
               .text(`Phone: ${proposalData.vendor.phone}`);
            
            doc.moveDown(1.5);
            
            // Client Details
            doc.fontSize(14)
               .fillColor('#1A1A1A')
               .text('To:', { underline: true });
            
            doc.moveDown(0.5);
            doc.fontSize(11)
               .text(proposalData.customer.name);
            doc.fontSize(10)
               .fillColor('#666')
               .text(proposalData.customer.address)
               .text(`Email: ${proposalData.customer.email}`);
            
            doc.moveDown(2);
            
            // Project Overview
            doc.fontSize(16)
               .fillColor('#1A1A1A')
               .text('Project Overview', { underline: true });
            
            doc.moveDown(0.5);
            doc.fontSize(12)
               .fillColor('#1A1A1A')
               .text(proposalData.projectTitle, { bold: true });
            
            doc.moveDown(0.5);
            doc.fontSize(10)
               .fillColor('#333')
               .text(proposalData.projectDescription, {
                   align: 'justify',
                   lineGap: 2
               });
            
            doc.moveDown(2);
            
            // Scope of Work
            doc.fontSize(16)
               .fillColor('#1A1A1A')
               .text('Scope of Work', { underline: true });
            
            doc.moveDown(0.5);
            proposalData.scopeItems.forEach((item, index) => {
                doc.fontSize(11)
                   .fillColor('#1A1A1A')
                   .text(`${index + 1}. ${item.title}`, { bold: true });
                
                doc.fontSize(10)
                   .fillColor('#666')
                   .text(`   ${item.description}`, { indent: 20 });
                
                doc.moveDown(0.5);
            });
            
            doc.moveDown(1);
            
            // Timeline
            doc.fontSize(16)
               .fillColor('#1A1A1A')
               .text('Project Timeline', { underline: true });
            
            doc.moveDown(0.5);
            doc.fontSize(10)
               .fillColor('#333')
               .text(`Start Date: ${proposalData.timeline.startDate}`)
               .text(`Completion Date: ${proposalData.timeline.endDate}`)
               .text(`Duration: ${proposalData.timeline.duration}`);
            
            doc.moveDown(2);
            
            // Pricing Table
            doc.fontSize(16)
               .fillColor('#1A1A1A')
               .text('Pricing Breakdown', { underline: true });
            
            doc.moveDown(0.5);
            
            const tableTop = doc.y;
            const itemX = 50;
            const descX = 200;
            const priceX = 450;
            
            // Table Header
            doc.fontSize(10)
               .fillColor('#FFFFFF')
               .rect(itemX, tableTop, 495, 25)
               .fill('#FF385C');
            
            doc.fillColor('#FFFFFF')
               .text('Item', itemX + 10, tableTop + 8)
               .text('Description', descX + 10, tableTop + 8)
               .text('Amount', priceX + 10, tableTop + 8);
            
            let currentY = tableTop + 30;
            
            proposalData.priceItems.forEach((item, index) => {
                const bgColor = index % 2 === 0 ? '#F7F7F7' : '#FFFFFF';
                
                doc.rect(itemX, currentY, 495, 30)
                   .fill(bgColor);
                
                doc.fillColor('#1A1A1A')
                   .fontSize(10)
                   .text(item.name, itemX + 10, currentY + 10, { width: 140 })
                   .text(item.description, descX + 10, currentY + 10, { width: 240 })
                   .text(`£${item.amount.toFixed(2)}`, priceX + 10, currentY + 10);
                
                currentY += 30;
            });
            
            // Total
            doc.rect(itemX, currentY, 495, 35)
               .fill('#1A1A1A');
            
            doc.fillColor('#FFFFFF')
               .fontSize(12)
               .text('TOTAL', itemX + 10, currentY + 10, { bold: true })
               .text(`£${proposalData.totalAmount.toFixed(2)}`, priceX + 10, currentY + 10, { bold: true });
            
            doc.moveDown(3);
            currentY += 50;
            
            // Payment Terms
            doc.y = currentY;
            doc.fontSize(16)
               .fillColor('#1A1A1A')
               .text('Payment Terms', { underline: true });
            
            doc.moveDown(0.5);
            doc.fontSize(10)
               .fillColor('#333')
               .text(proposalData.paymentTerms, {
                   align: 'justify',
                   lineGap: 2
               });
            
            doc.moveDown(2);
            
            // Terms & Conditions
            doc.addPage();
            doc.fontSize(16)
               .fillColor('#1A1A1A')
               .text('Terms & Conditions', { underline: true });
            
            doc.moveDown(0.5);
            doc.fontSize(10)
               .fillColor('#333')
               .text(proposalData.termsAndConditions, {
                   align: 'justify',
                   lineGap: 2
               });
            
            doc.moveDown(3);
            
            // Signature Section
            doc.fontSize(12)
               .fillColor('#1A1A1A')
               .text('Acceptance', { underline: true });
            
            doc.moveDown(1);
            doc.fontSize(10)
               .text('By signing below, you agree to the terms outlined in this proposal.');
            
            doc.moveDown(2);
            
            const signatureY = doc.y;
            
            // Client Signature
            doc.text('Client Signature:', 50, signatureY);
            doc.moveTo(150, signatureY + 15)
               .lineTo(300, signatureY + 15)
               .stroke();
            doc.text('Date:', 50, signatureY + 25);
            doc.moveTo(150, signatureY + 40)
               .lineTo(300, signatureY + 40)
               .stroke();
            
            // Vendor Signature
            doc.text('Vendor Signature:', 320, signatureY);
            doc.moveTo(420, signatureY + 15)
               .lineTo(570, signatureY + 15)
               .stroke();
            doc.text('Date:', 320, signatureY + 25);
            doc.moveTo(420, signatureY + 40)
               .lineTo(570, signatureY + 40)
               .stroke();
            
            // Footer
            doc.fontSize(8)
               .fillColor('#999')
               .text(
                   'This proposal is valid for 30 days from the date of issue.',
                   50,
                   doc.page.height - 50,
                   { align: 'center' }
               );
            
            doc.end();
            
            stream.on('finish', () => resolve(outputPath));
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generateProposal
};
```

### **Backend Route: proposals.js**

```javascript
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const pdfService = require('../services/pdf.service');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Create Proposal
 * POST /api/proposals
 */
router.post('/', authenticate, async (req, res) => {
    const proposalData = req.body;
    const vendorId = req.user.userId;
    
    try {
        const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const proposalNumber = `TM-${Date.now().toString().slice(-6)}`;
        
        // Store proposal in database
        await pool.query(
            `INSERT INTO proposals (
                id, quote_id, vendor_id, proposal_number, 
                project_title, project_description, total_amount,
                data, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')`,
            [
                proposalId,
                proposalData.quoteId,
                vendorId,
                proposalNumber,
                proposalData.projectTitle,
                proposalData.projectDescription,
                proposalData.totalAmount,
                JSON.stringify(proposalData)
            ]
        );
        
        // Generate PDF
        const pdfDir = path.join(__dirname, '../pdfs/proposals');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }
        
        const pdfPath = path.join(pdfDir, `${proposalId}.pdf`);
        
        proposalData.proposalNumber = proposalNumber;
        await pdfService.generateProposal(proposalData, pdfPath);
        
        // Update with PDF path
        await pool.query(
            'UPDATE proposals SET pdf_path = $1 WHERE id = $2',
            [pdfPath, proposalId]
        );
        
        res.json({
            success: true,
            proposalId,
            proposalNumber,
            pdfUrl: `/api/proposals/${proposalId}/pdf`
        });
        
    } catch (error) {
        console.error('Create proposal error:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

/**
 * Get Proposal PDF
 * GET /api/proposals/:proposalId/pdf
 */
router.get('/:proposalId/pdf', async (req, res) => {
    const { proposalId } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT pdf_path FROM proposals WHERE id = $1',
            [proposalId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        
        const pdfPath = result.rows[0].pdf_path;
        
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ error: 'PDF file not found' });
        }
        
        res.contentType('application/pdf');
        res.sendFile(pdfPath);
        
    } catch (error) {
        console.error('Get proposal PDF error:', error);
        res.status(500).json({ error: 'Failed to retrieve PDF' });
    }
});

/**
 * Send Proposal to Customer
 * POST /api/proposals/:proposalId/send
 */
router.post('/:proposalId/send', authenticate, async (req, res) => {
    const { proposalId } = req.params;
    const vendorId = req.user.userId;
    
    try {
        // Update status
        await pool.query(
            `UPDATE proposals 
             SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND vendor_id = $2`,
            [proposalId, vendorId]
        );
        
        // TODO: Send email notification to customer
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Send proposal error:', error);
        res.status(500).json({ error: 'Failed to send proposal' });
    }
});

/**
 * Accept Proposal (Customer)
 * POST /api/proposals/:proposalId/accept
 */
router.post('/:proposalId/accept', authenticate, async (req, res) => {
    const { proposalId } = req.params;
    const customerId = req.user.userId;
    
    try {
        await pool.query(
            `UPDATE proposals 
             SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [proposalId]
        );
        
        // Update quote status
        await pool.query(
            `UPDATE quotes 
             SET status = 'accepted' 
             WHERE id = (SELECT quote_id FROM proposals WHERE id = $1)`,
            [proposalId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Accept proposal error:', error);
        res.status(500).json({ error: 'Failed to accept proposal' });
    }
});

module.exports = router;
```

*Continuing with Features 5 & 6...*
