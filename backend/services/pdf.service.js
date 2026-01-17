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
               .text('By signing below, you agree to terms outlined in this proposal.');
            
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
                   'This proposal is valid for 30 days from date of issue.',
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