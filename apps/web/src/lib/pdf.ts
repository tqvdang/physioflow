/**
 * PDF generation utility for discharge summaries
 * Uses the browser print API for A4-formatted bilingual output
 */

import type { DischargeSummary } from "@/types/discharge";

/**
 * Generate a discharge summary PDF using the browser print dialog.
 *
 * Opens a new window with a print-optimized HTML document in A4 format,
 * with bilingual content (Vietnamese primary, English secondary).
 */
export function generateDischargePDF(summary: DischargeSummary): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback to inline print if popup blocked
    window.print();
    return;
  }

  const outcomeRows = summary.outcomeComparisons
    .map(
      (c) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">
          ${c.measureVi}<br/>
          <small style="color: #6b7280;">${c.measure}</small>
        </td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${c.baseline}</td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${c.discharge}</td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb; color: ${c.percentImprovement > 0 ? '#16a34a' : c.percentImprovement < 0 ? '#dc2626' : '#6b7280'};">
          ${c.change > 0 ? "+" : ""}${c.change} (${c.percentImprovement > 0 ? "+" : ""}${c.percentImprovement.toFixed(1)}%)
        </td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">
          ${c.metMCID ? '<span style="color: #16a34a; font-weight: 600;">Dat / Met</span>' : "-"}
        </td>
      </tr>`
    )
    .join("");

  const exerciseRows = summary.hepExercises
    .map(
      (e, i) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">
          ${e.nameVi}<br/>
          <small style="color: #6b7280;">${e.nameEn}</small>
        </td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${e.sets}</td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${e.reps}</td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${e.duration ?? "-"}</td>
        <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${e.frequency}</td>
      </tr>`
    )
    .join("");

  const followUpItems = summary.followUpPlan
    .map(
      (item) => `
      <li style="margin-bottom: 8px;">
        <strong>[${item.type}]</strong> ${item.descriptionVi}
        ${item.description !== item.descriptionVi ? `<br/><small style="color: #6b7280;">${item.description}</small>` : ""}
        ${item.timeframe ? `<br/><small style="color: #6b7280;">Thoi gian / Timeframe: ${item.timeframe}</small>` : ""}
      </li>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Tom tat xuat vien - ${summary.patientNameVi}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1f2937;
      max-width: 210mm;
      margin: 0 auto;
    }
    h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
    h2 { font-size: 14px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; margin-top: 20px; }
    .subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-grid .label { color: #6b7280; }
    .info-grid .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th { padding: 8px; text-align: left; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .bilingual { color: #6b7280; font-style: italic; margin-top: 4px; }
    .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center; }
    .signature-line { border-top: 1px dashed #9ca3af; margin-top: 60px; padding-top: 8px; }
    .footer { text-align: center; color: #9ca3af; font-size: 10px; margin-top: 20px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>TOM TAT XUAT VIEN</h1>
  <p class="subtitle">Discharge Summary</p>
  <hr/>

  <h2>Thong tin benh nhan / Patient Information</h2>
  <div class="info-grid">
    <div><span class="label">Ho ten / Name:</span> <span class="value">${summary.patientNameVi}</span>${summary.patientName !== summary.patientNameVi ? ` (${summary.patientName})` : ""}</div>
    <div><span class="label">MRN:</span> <span class="value">${summary.patientMrn}</span></div>
    <div><span class="label">Ngay sinh / DOB:</span> <span class="value">${summary.patientDob}</span></div>
    <div><span class="label">Thoi gian dieu tri / Treatment Period:</span> <span class="value">${summary.dateRange}</span></div>
    <div><span class="label">Tong so buoi / Total Sessions:</span> <span class="value">${summary.totalSessions}</span></div>
    <div><span class="label">Chuyen vien / Therapist:</span> <span class="value">${summary.therapistName}</span></div>
  </div>

  <h2>Chan doan va tom tat dieu tri / Diagnosis & Treatment Summary</h2>
  <p><strong>Chan doan / Diagnosis:</strong></p>
  <p>${summary.diagnosisVi}</p>
  ${summary.diagnosis !== summary.diagnosisVi ? `<p class="bilingual">${summary.diagnosis}</p>` : ""}
  <p><strong>Tom tat dieu tri / Treatment Summary:</strong></p>
  <p>${summary.treatmentSummaryVi}</p>
  ${summary.treatmentSummary !== summary.treatmentSummaryVi ? `<p class="bilingual">${summary.treatmentSummary}</p>` : ""}

  ${summary.outcomeComparisons.length > 0 ? `
  <h2>Ket qua do luong / Outcome Measures</h2>
  <table>
    <thead>
      <tr>
        <th>Chi so / Measure</th>
        <th style="text-align:center;">Ban dau / Baseline</th>
        <th style="text-align:center;">Xuat vien / Discharge</th>
        <th style="text-align:center;">Thay doi / Change</th>
        <th style="text-align:center;">MCID</th>
      </tr>
    </thead>
    <tbody>${outcomeRows}</tbody>
  </table>
  ` : ""}

  <h2>Tinh trang chuc nang / Functional Status</h2>
  <p>${summary.functionalStatusVi}</p>
  ${summary.functionalStatus !== summary.functionalStatusVi ? `<p class="bilingual">${summary.functionalStatus}</p>` : ""}

  ${summary.hepExercises.length > 0 ? `
  <h2>Chuong trinh tap tai nha / Home Exercise Program</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Bai tap / Exercise</th>
        <th style="text-align:center;">Hiep / Sets</th>
        <th style="text-align:center;">Lan / Reps</th>
        <th style="text-align:center;">Thoi gian / Duration</th>
        <th style="text-align:center;">Tan suat / Frequency</th>
      </tr>
    </thead>
    <tbody>${exerciseRows}</tbody>
  </table>
  ` : ""}

  <h2>Khuyen nghi / Recommendations</h2>
  <p>${summary.recommendationsVi}</p>
  ${summary.recommendations !== summary.recommendationsVi ? `<p class="bilingual">${summary.recommendations}</p>` : ""}

  ${summary.followUpPlan.length > 0 ? `
  <h2>Ke hoach theo doi / Follow-up Plan</h2>
  <ul>${followUpItems}</ul>
  ` : ""}

  <div class="signature-area">
    <div>
      <p style="color: #6b7280; font-size: 11px;">Ngay / Date: _______________</p>
      <div class="signature-line">
        <p><strong>Benh nhan / Patient</strong></p>
      </div>
    </div>
    <div>
      <p style="color: #6b7280; font-size: 11px;">Ngay / Date: _______________</p>
      <div class="signature-line">
        <p><strong>${summary.therapistName}</strong></p>
        <p style="color: #6b7280; font-size: 11px;">Chuyen vien tri lieu / Therapist</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Tai lieu nay duoc tao tu dong boi PhysioFlow EMR / This document was auto-generated by PhysioFlow EMR</p>
    <p>${new Date(summary.generatedAt).toLocaleString("vi-VN")}</p>
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to render before triggering print
  printWindow.onload = () => {
    printWindow.print();
  };
}
