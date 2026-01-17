const PDFDocument = require('pdfkit');

class PDFService {
    // Generate proposal PDF
    async generateProposalPDF(proposal) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const chunks = [];
                
                // Collect PDF data
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(chunks);
                    resolve(pdfData);
                });
                doc.on('error', reject);
                
                // Add content to PDF
                this.addProposalContent(doc, proposal);
                
                // Finalize PDF
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Add proposal content to PDF
    addProposalContent(doc, proposal) {
        const { data } = proposal;
        const proposalData = JSON.parse(data || '{}');
        
        // Set up document
        doc.fontSize(20).text('PROJECT PROPOSAL', { align: 'center' });
        doc.moveDown();
        
        // Proposal details
        doc.fontSize(12).text(`Proposal Number: ${proposal.proposal_number}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Status: ${proposal.status.toUpperCase()}`);
        doc.moveDown();
        
        // Vendor information
        doc.fontSize(14).text('VENDOR INFORMATION', { underline: true });
        doc.fontSize(11).text(`Name: ${proposal.vendor_name}`);
        doc.text(`Email: ${proposal.vendor_email}`);
        doc.text(`Phone: ${proposal.vendor_phone}`);
        doc.moveDown();
        
        // Customer information
        doc.fontSize(14).text('CUSTOMER INFORMATION', { underline: true });
        doc.fontSize(11).text(`Name: ${proposal.customer_name}`);
        doc.moveDown();
        
        // Project details
        doc.fontSize(14).text('PROJECT DETAILS', { underline: true });
        doc.fontSize(11).text(`Project Title: ${proposal.project_title}`);
        doc.text(`Description: ${proposal.project_description}`);
        doc.moveDown();
        
        // Pricing
        doc.fontSize(14).text('PRICING', { underline: true });
        doc.fontSize(11).text(`Total Amount: £${proposal.total_amount}`);
        
        if (proposalData.milestones && proposalData.milestones.length > 0) {
            doc.moveDown();
            doc.fontSize(12).text('Payment Milestones:');
            
            proposalData.milestones.forEach((milestone, index) => {
                doc.text(`${index + 1}. ${milestone.title} - £${milestone.amount}`);
                doc.text(`   ${milestone.description}`);
                doc.moveDown(0.5);
            });
        }
        
        // Terms and conditions
        if (proposalData.terms) {
            doc.addPage();
            doc.fontSize(14).text('TERMS AND CONDITIONS', { underline: true });
            doc.fontSize(11).text(proposalData.terms);
        }
        
        // Footer
        doc.fontSize(10).text(
            `Generated on ${new Date().toLocaleDateString()} by TradeMatch Platform`,
            { align: 'center' }
        );
    }
    
    // Generate invoice PDF
    async generateInvoicePDF(invoice) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(chunks);
                    resolve(pdfData);
                });
                doc.on('error', reject);
                
                this.addInvoiceContent(doc, invoice);
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Add invoice content to PDF
    addInvoiceContent(doc, invoice) {
        // Set up document
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();
        
        // Invoice details
        doc.fontSize(12).text(`Invoice Number: ${invoice.invoice_number}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Due Date: ${invoice.due_date}`);
        doc.text(`Status: ${invoice.status}`);
        doc.moveDown();
        
        // Customer information
        doc.fontSize(14).text('BILL TO:', { underline: true });
        doc.fontSize(11).text(invoice.customer_name);
        doc.text(invoice.customer_address);
        doc.moveDown();
        
        // Invoice items
        doc.fontSize(14).text('INVOICE ITEMS', { underline: true });
        
        let totalAmount = 0;
        invoice.items.forEach(item => {
            doc.fontSize(11).text(`${item.description} - £${item.amount}`);
            totalAmount += parseFloat(item.amount);
        });
        
        doc.moveDown();
        doc.fontSize(12).text(`Total Amount: £${totalAmount.toFixed(2)}`);
        
        // Footer
        doc.fontSize(10).text(
            `Generated on ${new Date().toLocaleDateString()} by TradeMatch Platform`,
            { align: 'center' }
        );
    }
    
    // Generate contract PDF
    async generateContractPDF(contract) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument();
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(chunks);
                    resolve(pdfData);
                });
                doc.on('error', reject);
                
                this.addContractContent(doc, contract);
                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Add contract content to PDF
    addContractContent(doc, contract) {
        // Set up document
        doc.fontSize(20).text('SERVICE CONTRACT', { align: 'center' });
        doc.moveDown();
        
        // Contract details
        doc.fontSize(12).text(`Contract Number: ${contract.contract_number}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        
        // Parties
        doc.fontSize(14).text('PARTIES', { underline: true });
        doc.fontSize(11).text(`Customer: ${contract.customer_name}`);
        doc.text(`Vendor: ${contract.vendor_name}`);
        doc.moveDown();
        
        // Project scope
        doc.fontSize(14).text('PROJECT SCOPE', { underline: true });
        doc.fontSize(11).text(contract.project_description);
        doc.moveDown();
        
        // Payment terms
        doc.fontSize(14).text('PAYMENT TERMS', { underline: true });
        doc.fontSize(11).text(`Total Contract Value: £${contract.total_amount}`);
        doc.text(`Payment Schedule: ${contract.payment_schedule}`);
        doc.moveDown();
        
        // Signatures
        doc.fontSize(14).text('SIGNATURES', { underline: true });
        doc.fontSize(11).text('Customer Signature: ___________________ Date: _______');
        doc.text('Vendor Signature: ___________________ Date: _______');
        
        // Footer
        doc.fontSize(10).text(
            `Generated on ${new Date().toLocaleDateString()} by TradeMatch Platform`,
            { align: 'center' }
        );
    }
    
    // Save PDF to file
    async savePDF(pdfBuffer, filePath) {
        const fs = require('fs').promises;
        try {
            await fs.writeFile(filePath, pdfBuffer);
            return filePath;
        } catch (error) {
            console.error('Save PDF error:', error);
            throw error;
        }
    }
    
    // Get PDF info
    getPDFInfo(pdfBuffer) {
        return {
            size: pdfBuffer.length,
            pages: 1, // Basic implementation
            created: new Date(),
        };
    }
}

module.exports = new PDFService();