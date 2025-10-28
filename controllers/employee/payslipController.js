import Payslip from '../../models/Payslip.js';
import mongoose from 'mongoose';

import puppeteer from 'puppeteer'; // Import puppeteer
import fs from 'fs/promises';
import path from 'path';
// Optional: Install number-to-words: npm install number-to-words
import pkg from 'number-to-words';
 const { toWords } = pkg;


// ... (getMyPayslips, getMyPayslipById remain the same) ...
const formatCurrencyForTemplate = (amount) => {
    return (amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// @desc    Download a specific released payslip for logged-in employee
// @route   GET /api/employee/payslips/:payslipId/download
// @access  Private (Employee)
const downloadMyPayslip = async (req, res) => {
    const { payslipId } = req.params;
    const employeeId = req.employee._id; // ObjectId from auth

    if (!mongoose.Types.ObjectId.isValid(payslipId)) {
        return res.status(400).json({ message: 'Invalid Payslip ID format.' });
    }

     try {
        // Find the payslip, ensuring it belongs to the employee AND is released
        const payslip = await Payslip.findOne({
            _id: payslipId,
            employee: employeeId,
            isReleased: true, // Crucial check
         });

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found or not yet released.' });
        }

       // --- PDF Generation Logic (Same as admin controller) ---
        // 1. Read Template
        const templatePath = path.resolve(process.cwd(), 'templates', 'payslipTemplate.html');
        let htmlContent = await fs.readFile(templatePath, 'utf-8');

        // 2. Prepare Data
         // TODO: Get Company Details
        const companyDetails = {
            companyName: "Your Company Name",
            companyAddress: "Your Company Address",
            companyLogoHtml: '<img src="YOUR_LOGO_URL_OR_BASE64" alt="Company Logo" class="company-logo">',
        };
         const netPayInWords = toWords(Math.floor(payslip.netPay || 0)).replace(/,/g, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Only';
        const templateData = {
            ...companyDetails,
            monthYear: new Date(payslip.year, payslip.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            employeeName: payslip.employeeSnapshot.name || '-',
            employeeId: payslip.employeeSnapshot.employeeId || '-',
            designation: payslip.employeeSnapshot.designation || '-',
            department: payslip.employeeSnapshot.department || '-',
            panNumber: payslip.employeeSnapshot.panNumber || '-',
            bankAccountNo: payslip.employeeSnapshot.bankDetails?.accountNumber ? `****${payslip.employeeSnapshot.bankDetails.accountNumber.slice(-4)}` : '-',
            basic: formatCurrencyForTemplate(payslip.earnings.basic),
            hra: formatCurrencyForTemplate(payslip.earnings.hra),
            medicalAllowance: formatCurrencyForTemplate(payslip.earnings.medicalAllowance),
            specialAllowance: formatCurrencyForTemplate(payslip.earnings.specialAllowance),
            totalEarnings: formatCurrencyForTemplate(payslip.earnings.total),
            professionalTax: formatCurrencyForTemplate(payslip.deductions.professionalTax),
            totalDeductions: formatCurrencyForTemplate(payslip.deductions.total),
            netPay: formatCurrencyForTemplate(payslip.netPay),
            netPayInWords: netPayInWords,
            generatedDate: new Date(payslip.generatedAt).toLocaleString('en-IN'),
            releaseStatus: `Released on: ${new Date(payslip.releasedAt).toLocaleString('en-IN')}`, // It's guaranteed released here
        };

        // 3. Replace Placeholders
        for (const key in templateData) {
           if (key === 'companyLogoHtml') {
                 htmlContent = htmlContent.replace(`{{{${key}}}}`, templateData[key]);
            } else {
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, templateData[key]);
            }
        }

        // 4. Generate PDF with Puppeteer
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '30px', right: '40px', bottom: '30px', left: '40px' } });
        await browser.close();

        // 5. Send PDF Response
        const filename = `Payslip_${payslip.month}_${payslip.year}_${payslip.employeeSnapshot.employeeId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generating/downloading employee payslip PDF:", error);
        res.status(500).json({ message: 'Server error generating PDF.', error: error.message });
    }
};












// @desc    Get logged-in employee's released payslips (paginated)
// @route   GET /api/employee/payslips?page=1&limit=10
// @access  Private (Employee)
const getMyPayslips = async (req, res) => {
    const employeeId = req.employee._id; // From protectEmployee middleware
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
        employee: employeeId,
        isReleased: true, // Only fetch released payslips
    };

    try {
        const payslips = await Payslip.find(query)
            .select('-employee -salaryDetails -employeeSnapshot.bankAccountNo') // Exclude sensitive/redundant details for list view
            .sort({ year: -1, month: -1 }) // Sort newest first
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPayslips = await Payslip.countDocuments(query);

        res.json({
            payslips,
            currentPage: page,
            totalPages: Math.ceil(totalPayslips / limit),
            totalPayslips,
        });
    } catch (error) {
        console.error("Error fetching employee payslips:", error);
        res.status(500).json({ message: 'Server error fetching your payslips.' });
    }
};


// @desc    Get details of a specific released payslip for logged-in employee
// @route   GET /api/employee/payslips/:payslipId
// @access  Private (Employee)
const getMyPayslipById = async (req, res) => {
    const { payslipId } = req.params;
    const employeeId = req.employee._id;

    if (!mongoose.Types.ObjectId.isValid(payslipId)) {
        return res.status(400).json({ message: 'Invalid Payslip ID format.' });
    }

    try {
        // Find the specific payslip, ensuring it belongs to the employee AND is released
        const payslip = await Payslip.findOne({
            _id: payslipId,
            employee: employeeId,
            isReleased: true,
         });
        // No need to populate employee, it's the logged-in user

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found or not released.' });
        }
        res.json(payslip);
    } catch (error) {
        console.error("Error fetching employee payslip details:", error);
        res.status(500).json({ message: 'Server error fetching payslip details.' });
    }
};

export {
    getMyPayslips,
    getMyPayslipById,
    downloadMyPayslip,
};