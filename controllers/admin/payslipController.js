import Payslip from '../../models/Payslip.js';
import Salary from '../../models/Salary.js';
import Employee from '../../models/Employee.js';
import mongoose from 'mongoose';
import fs from 'fs/promises'; // For reading the HTML template
import path from 'path'; 
import puppeteer from 'puppeteer';
import pkg from 'number-to-words';
 const { toWords } = pkg;
 import moment from 'moment-timezone';
import * as XLSX from 'xlsx';




const formatCurrencyForTemplate = (amount) => {
    return (amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// @desc    Download a specific payslip as PDF
// @route   GET /api/admin/payslips/:payslipId/download
// @access  Private (Admin)
const downloadPayslip = async (req, res) => {
    const { payslipId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(payslipId)) {
        return res.status(400).json({ message: 'Invalid Payslip ID format.' });
    }

    try {
        const payslip = await Payslip.findById(payslipId);
        // Removed employee populate, using snapshot
        // .populate('employee', 'employeeInfo.name employeeInfo.employeeId');

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found.' });
        }

        // --- PDF Generation Logic ---

        // 1. Read HTML Template
        // Ensure correct path relative to this file or use absolute path
        const templatePath = path.resolve(process.cwd(), 'templates', 'payslipTemplate.html');
        let htmlContent = await fs.readFile(templatePath, 'utf-8');

        const companyDetails = {
  companyName: "Soul Skool",
  companyAddress: "Flat No 301, TVH Vista Heights, Tower 6, Trichy Rd, Kallimadai, Coimbatore, Tamil Nadu 641005",
  companyLogoHtml: '<img src="https://lms-anyonecandance.b-cdn.net/public%20data%20lobo/soulskool.png" alt="Company Logo" class="company-logo" />',
};


        const netPayInWords = toWords(Math.floor(payslip.netPay || 0)).replace(/,/g, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Only'; // Basic conversion

        const templateData = {
            ...companyDetails,
            monthYear: new Date(payslip.year, payslip.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            employeeName: payslip.employeeSnapshot.name || '-',
            employeeId: payslip.employeeSnapshot.employeeId || '-',
            designation: payslip.employeeSnapshot.designation || '-',
            department: payslip.employeeSnapshot.department || '-',
            panNumber: payslip.employeeSnapshot.panNumber || '-',
            // Use snapshot bank details
            bankAccountNo: payslip.employeeSnapshot.bankDetails?.accountNumber ? payslip.employeeSnapshot.bankDetails.accountNumber : '-', // Simple masking
            // Earnings
            basic: formatCurrencyForTemplate(payslip.earnings.basic),
            hra: formatCurrencyForTemplate(payslip.earnings.hra),
            medicalAllowance: formatCurrencyForTemplate(payslip.earnings.medicalAllowance),
            specialAllowance: formatCurrencyForTemplate(payslip.earnings.specialAllowance),
            totalEarnings: formatCurrencyForTemplate(payslip.earnings.total),
            // Deductions
            professionalTax: formatCurrencyForTemplate(payslip.deductions.professionalTax),
            totalDeductions: formatCurrencyForTemplate(payslip.deductions.total),
            // Net Pay
            netPay: formatCurrencyForTemplate(payslip.netPay),
            netPayInWords: netPayInWords,
            // Footer
            generatedDate: new Date(payslip.generatedAt).toLocaleString('en-IN'),
            releaseStatus: payslip.isReleased ? `Released on: ${new Date(payslip.releasedAt).toLocaleString('en-IN')}` : 'Not Released',
        };

        // 3. Replace Placeholders (Basic Replacement)
        // for (const key in templateData) {
        //     // Use {{{key}}} for HTML injection like logo
        //     if (key === 'companyLogoHtml') {
        //          htmlContent = htmlContent.replace(`{{{${key}}}}`, templateData[key]);
        //     } else {
        //          // Use {{key}} for text replacement
        //         const regex = new RegExp(`{{${key}}}`, 'g');
        //         htmlContent = htmlContent.replace(regex, templateData[key]);
        //     }

        // }



        htmlContent = htmlContent.replace(/\{\{\{\s*companyLogoHtml\s*\}\}\}/g, companyDetails.companyLogoHtml);

// 2) Replace the simple text placeholders
for (const [key, val] of Object.entries(templateData)) {
  if (key === 'companyLogoHtml') continue;
  const safeVal = String(val ?? '');
  const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
  htmlContent = htmlContent.replace(re, safeVal);
}

        // 4. Launch Puppeteer and Generate PDF
        const browser = await puppeteer.launch({
            headless: true, // Use new headless mode
             args: ['--no-sandbox', '--disable-setuid-sandbox'] // Important for Linux/Docker environments
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Wait for images/fonts
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // Include background colors/images
             margin: { // Optional margins
                 top: '30px',
                 right: '40px',
                 bottom: '30px',
                 left: '40px'
            }
        });
        await browser.close();

        // 5. Send PDF Response
        const filename = `Payslip_${payslip.month}_${payslip.year}_${payslip.employeeSnapshot.employeeId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generating/downloading payslip PDF:", error);
        res.status(500).json({ message: 'Server error generating PDF.', error: error.message });
    }
};





// Payslip Calculation Logic
const calculatePayslipDetails = (monthlySalary, professionalTax) => {
    const basic = Math.round(monthlySalary * 0.40 * 100) / 100; // Round to 2 decimal places
    const hra = Math.round(basic * 0.40 * 100) / 100;
    const medicalAllowance = 1250.00; // Fixed
    // Calculate special allowance ensuring total earnings match monthly salary
    const specialAllowance = Math.round((monthlySalary - (basic + hra + medicalAllowance)) * 100) / 100;

    const totalEarnings = Math.round((basic + hra + medicalAllowance + specialAllowance) * 100) / 100; // Should equal monthlySalary
    const totalDeductions = Math.round(professionalTax * 100) / 100;
    const netPay = Math.round((totalEarnings - totalDeductions) * 100) / 100;

    // Sanity check for special allowance calculation
    if (specialAllowance < 0) {
        console.warn(`Warning: Special allowance calculated as negative (${specialAllowance}) for monthly salary ${monthlySalary}. Adjusting to 0.`);
        // Recalculate if negative special allowance is not allowed (depends on company policy)
        // This might mean basic/hra percentages need adjustment for lower salaries
        // For now, let's proceed but log the warning.
        // specialAllowance = 0; // Optionally enforce non-negative
        // Recalculate totalEarnings and netPay if specialAllowance is adjusted
    }


    return {
        earnings: { basic, hra, medicalAllowance, specialAllowance, total: totalEarnings },
        deductions: { professionalTax, total: totalDeductions },
        netPay,
    };
};


// @desc    Generate a payslip for an employee for a specific month/year
// @route   POST /api/admin/payslips/generate
// @access  Private (Admin)
const generatePayslip = async (req, res) => {
    const { employeeId, month, year } = req.body; // Expect Employee ObjectId

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'Invalid Employee ID format.' });
    }
    if (!month || !year || month < 1 || month > 12 || year < 2000) {
        return res.status(400).json({ message: 'Valid Month (1-12) and Year are required.' });
    }

    try {
        // 1. Check if payslip already exists
        const existingPayslip = await Payslip.findOne({ employee: employeeId, month, year });
        if (existingPayslip) {
            return res.status(400).json({ message: `Payslip for ${month}/${year} already exists for this employee.` });
        }

        // 2. Find Employee and their Salary details
        const employee = await Employee.findById(employeeId)
            .select('employeeInfo identificationDetails addresses jobDetails');
        const salary = await Salary.findOne({ employee: employeeId });

        if (!employee) return res.status(404).json({ message: 'Employee not found.' });
        if (!salary) return res.status(404).json({ message: 'Salary details not found for this employee. Cannot generate payslip.' });
        if (!salary.bankDetails) {
             return res.status(400).json({ message: 'Bank details not found in the employee salary record. Please update salary details first.' });
        }


        // 3. Perform Calculations
        const { earnings, deductions, netPay } = calculatePayslipDetails(salary.monthlySalary, salary.professionalTax);

         // 4. Create Employee Snapshot
         const employeeSnapshot = {
            name: employee.employeeInfo.name,
            employeeId: employee.employeeInfo.employeeId,
            designation: employee.jobDetails?.currentPosition,
            department: employee.jobDetails?.department,
            panNumber: employee.identificationDetails?.panCardNo,
           bankDetails: {
                bankName: salary.bankDetails.bankName,
                accountNumber: salary.bankDetails.accountNumber, 
                ifscCode: salary.bankDetails.ifscCode,
                
            }
        };

        // 5. Create and Save Payslip
        const newPayslip = await Payslip.create({
            employee: employeeId,
            employeeIdString: employee.employeeInfo.employeeId,
            salaryDetails: salary._id,
            month,
            year,
            earnings,
            deductions,
            netPay,
            employeeSnapshot, // Store the snapshot
            isReleased: false, // Default to not released
        });

        res.status(201).json({ message: 'Payslip generated successfully.', payslip: newPayslip });

    } catch (error) {
        console.error("Error generating payslip:", error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error generating payslip.' });
    }
};

// @desc    Get a list of generated payslips (paginated, sorted)
// @route   GET /api/admin/payslips?page=1&limit=10&employeeId=...&status=...
// @access  Private (Admin)
const getPayslips = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { employeeId, status } = req.query; // Optional filters: employee ObjectId, status (Released/Pending)

    let query = {};
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
        query.employee = employeeId;
    }
    if (status === 'Released') {
        query.isReleased = true;
    } else if (status === 'Pending') {
        query.isReleased = false;
    }

    try {
        const payslips = await Payslip.find(query)
            .populate('employee', 'employeeInfo.name employeeInfo.employeeId') // Populate basic info
            .sort({ year: -1, month: -1, createdAt: -1 }) // Sort newest month/year first
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
        console.error("Error fetching payslips:", error);
        res.status(500).json({ message: 'Server error fetching payslips.' });
    }
};

// @desc    Get details of a single payslip by ID
// @route   GET /api/admin/payslips/:payslipId
// @access  Private (Admin)
const getPayslipById = async (req, res) => {
    const { payslipId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(payslipId)) {
        return res.status(400).json({ message: 'Invalid Payslip ID format.' });
    }

    try {
        const payslip = await Payslip.findById(payslipId)
            .populate('employee', 'employeeInfo.name employeeInfo.employeeId'); // Populate employee info

        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found.' });
        }
        res.json(payslip);
    } catch (error) {
        console.error("Error fetching payslip details:", error);
        res.status(500).json({ message: 'Server error fetching payslip.' });
    }
};


// @desc    Mark a payslip as released
// @route   PATCH /api/admin/payslips/:payslipId/release
// @access  Private (Admin)
const releasePayslip = async (req, res) => {
    const { payslipId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(payslipId)) {
        return res.status(400).json({ message: 'Invalid Payslip ID format.' });
    }

    try {
        const payslip = await Payslip.findById(payslipId);
        if (!payslip) {
            return res.status(404).json({ message: 'Payslip not found.' });
        }
        if (payslip.isReleased) {
            return res.status(400).json({ message: 'Payslip is already released.' });
        }

        payslip.isReleased = true;
        payslip.releasedAt = new Date();
        const updatedPayslip = await payslip.save();

        res.json({ message: 'Payslip released successfully.', payslip: updatedPayslip });

    } catch (error) {
        console.error("Error releasing payslip:", error);
        res.status(500).json({ message: 'Server error releasing payslip.' });
    }
};

// @desc    Delete a generated payslip
// @route   DELETE /api/admin/payslips/:payslipId
// @access  Private (Admin)
const deletePayslip = async (req, res) => {
    const { payslipId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(payslipId)) {
        return res.status(400).json({ message: 'Invalid Payslip ID format.' });
    }

    try {
        const deletedPayslip = await Payslip.findByIdAndDelete(payslipId);
        if (!deletedPayslip) {
            return res.status(404).json({ message: 'Payslip not found.' });
        }
        res.json({ message: 'Payslip deleted successfully.' });
    } catch (error) {
        console.error("Error deleting payslip:", error);
        res.status(500).json({ message: 'Server error deleting payslip.' });
    }
};







const tz = 'Asia/Kolkata';
const ist = (d) => moment(d).tz(tz);

const getMonthBoundsIST = (year, month1to12) => {
  const m0 = month1to12 - 1;
  const start = moment.tz({ year, month: m0, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 }, tz);
  const end = start.clone().endOf('month');
  return { start: start.toDate(), end: end.toDate() };
};

// Choose which field drives the month filtering.
// If your schema has numeric month/year on payslip, prefer that for direct match:
//    query = { month, year }
// Otherwise, fallback to a timestamp field range (generatedAt or releasedAt).
const buildMonthQuery = (year, month, useNumericMonthYear, dateFieldForRange = 'generatedAt') => {
  if (useNumericMonthYear) {
    return { month, year };
  }
  const { start, end } = getMonthBoundsIST(year, month);
  return { [dateFieldForRange]: { $gte: start, $lte: end } };
};

// GET /api/admin/payslips/statement?year=2025&month=10
export const getMonthlyPayslipStatement = async (req, res) => {
  try {
    const rawYear = req.query.year;
const rawMonth = req.query.month;
const year = Number(rawYear);
const month = Number(rawMonth);
if (!Number.isFinite(year) || !Number.isInteger(year)) {
  return res.status(400).json({ message: 'Invalid year.' });
}
if (!Number.isFinite(month) || !Number.isInteger(month) || month < 1 || month > 12) {
  return res.status(400).json({ message: 'Invalid month (1-12).' });
}

    // Toggle this based on your Payslip schema:
    const USE_NUMERIC_MONTH_YEAR = true; // set true if Payslip has month (1-12) and year (YYYY)
    const query = buildMonthQuery(year, month, USE_NUMERIC_MONTH_YEAR, 'generatedAt');

    // Pull payslips; using employeeSnapshot for stable reporting (no populate needed).
    const slips = await Payslip.find(query)
      .select('employeeSnapshot month year earnings deductions netPay isReleased generatedAt releasedAt employeeIdString')
      .lean();

    // Normalize rows for UI
    const rows = slips.map(p => ({
      employeeId: p.employeeSnapshot?.employeeId ?? p.employeeIdString ?? '-',
      employeeName: p.employeeSnapshot?.name ?? '-',
      designation: p.employeeSnapshot?.designation ?? '-',
      department: p.employeeSnapshot?.department ?? '-',
      month: p.month,
      year: p.year,
      totalEarnings: p.earnings?.total ?? 0,
      totalDeductions: p.deductions?.total ?? 0,
      netPay: p.netPay ?? 0,
      released: !!p.isReleased,
      generatedAt: p.generatedAt ? ist(p.generatedAt).format('YYYY-MM-DD HH:mm') : '',
      releasedAt: p.releasedAt ? ist(p.releasedAt).format('YYYY-MM-DD HH:mm') : '',
      payslipId: String(p._id),
    }));

    return res.json({
      year,
      month,
      count: rows.length,
      payslips: rows,
    });
  } catch (err) {
    console.error('Salary statement fetch failed:', err);
    return res.status(500).json({ message: 'Failed to fetch salary statement.' });
  }
};

// GET /api/admin/payslips/statement/export?year=2025&month=10
export const exportMonthlyPayslipStatement = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // 1..12
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Provide valid year and month (1-12).' });
    }

    const USE_NUMERIC_MONTH_YEAR = true; // set true if your Payslip has month/year numeric fields
    const query = buildMonthQuery(year, month, USE_NUMERIC_MONTH_YEAR, 'generatedAt');

    const slips = await Payslip.find(query)
      .select('employeeSnapshot month year earnings deductions netPay isReleased generatedAt releasedAt employeeIdString')
      .lean();

    const header = [
      'Employee ID',
      'Employee Name',
      'Designation',
      'Department',
      'Month',
      'Year',
      'Total Earnings',
      'Total Deductions',
      'Net Pay',
      'Released',
      'Generated At',
      'Released At',
      'Payslip ID',
    ];

    const rows = slips.map(p => {
      const empId = p.employeeSnapshot?.employeeId ?? p.employeeIdString ?? '';
      const name = p.employeeSnapshot?.name ?? '';
      const desig = p.employeeSnapshot?.designation ?? '';
      const dept = p.employeeSnapshot?.department ?? '';
      const gen = p.generatedAt ? ist(p.generatedAt).format('YYYY-MM-DD HH:mm') : '';
      const rel = p.releasedAt ? ist(p.releasedAt).format('YYYY-MM-DD HH:mm') : '';
      return [
        empId,
        name,
        desig,
        dept,
        p.month,
        p.year,
        p.earnings?.total ?? 0,
        p.deductions?.total ?? 0,
        p.netPay ?? 0,
        p.isReleased ? 'Yes' : 'No',
        gen,
        rel,
        String(p._id),
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [
      { wch: 14 }, // Employee ID
      { wch: 24 }, // Employee Name
      { wch: 18 }, // Designation
      { wch: 18 }, // Department
      { wch: 8 },  // Month
      { wch: 8 },  // Year
      { wch: 16 }, // Total Earnings
      { wch: 16 }, // Total Deductions
      { wch: 14 }, // Net Pay
      { wch: 10 }, // Released
      { wch: 20 }, // Generated At
      { wch: 20 }, // Released At
      { wch: 24 }, // Payslip ID
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = `Payslips_${year}-${String(month).padStart(2, '0')}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const filename = `${sheetName}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    return res.send(wbout);
  } catch (err) {
    console.error('Salary statement export failed:', err);
    return res.status(500).json({ message: 'Failed to export salary statement.' });
  }
};











export {
    generatePayslip,
    downloadPayslip,
    getPayslips,
    getPayslipById,
    releasePayslip,
    deletePayslip,
};