package service

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
	"github.com/tqvdang/physioflow/apps/api/internal/repository"
)

// ReportService defines the interface for report generation business logic.
type ReportService interface {
	GenerateDischargeSummaryPDF(ctx context.Context, summaryID, locale, userID string) ([]byte, string, error)
	GenerateInvoicePDF(ctx context.Context, invoiceID, locale, userID string) ([]byte, string, error)
}

// reportService implements ReportService.
type reportService struct {
	reportRepo    repository.ReportRepository
	dischargeRepo repository.DischargeRepository
	billingRepo   repository.BillingRepository
	patientRepo   repository.PatientRepository
	templates     map[string]*template.Template
	templatesDir  string
}

// NewReportService creates a new report service.
func NewReportService(
	reportRepo repository.ReportRepository,
	dischargeRepo repository.DischargeRepository,
	billingRepo repository.BillingRepository,
	patientRepo repository.PatientRepository,
) ReportService {
	svc := &reportService{
		reportRepo:    reportRepo,
		dischargeRepo: dischargeRepo,
		billingRepo:   billingRepo,
		patientRepo:   patientRepo,
		templates:     make(map[string]*template.Template),
	}

	// Determine templates directory relative to binary or source
	svc.templatesDir = svc.findTemplatesDir()

	// Pre-load templates
	svc.loadTemplates()

	return svc
}

// findTemplatesDir locates the templates directory.
func (s *reportService) findTemplatesDir() string {
	// Try relative to working directory first (Docker or binary run)
	candidates := []string{
		"templates",
		"./templates",
		"apps/api/templates",
		"./apps/api/templates",
	}

	// Also try relative to source file (development)
	_, filename, _, ok := runtime.Caller(0)
	if ok {
		sourceDir := filepath.Dir(filename)
		candidates = append(candidates,
			filepath.Join(sourceDir, "..", "..", "templates"),
		)
	}

	for _, dir := range candidates {
		absDir, err := filepath.Abs(dir)
		if err != nil {
			continue
		}
		pattern := filepath.Join(absDir, "*.html")
		matches, err := filepath.Glob(pattern)
		if err == nil && len(matches) > 0 {
			log.Info().Str("dir", absDir).Int("templates", len(matches)).Msg("found templates directory")
			return absDir
		}
	}

	log.Warn().Msg("templates directory not found, PDF generation will use inline templates")
	return "templates"
}

// loadTemplates parses all HTML templates with custom functions.
func (s *reportService) loadTemplates() {
	funcMap := template.FuncMap{
		"inc": func(i int) int { return i + 1 },
		"ne":  func(a, b string) bool { return a != b },
		"gt": func(a, b float64) bool { return a > b },
		"lt": func(a, b float64) bool { return a < b },
	}

	templateFiles := []string{
		"discharge_summary_vi",
		"discharge_summary_en",
		"invoice_vi",
		"invoice_en",
	}

	for _, name := range templateFiles {
		filePath := filepath.Join(s.templatesDir, name+".html")
		tmpl, err := template.New(name + ".html").Funcs(funcMap).ParseFiles(filePath)
		if err != nil {
			log.Warn().Err(err).Str("template", name).Msg("failed to load template file")
			continue
		}
		s.templates[name] = tmpl
		log.Debug().Str("template", name).Msg("loaded template")
	}
}

// GenerateDischargeSummaryPDF generates a PDF for a discharge summary.
func (s *reportService) GenerateDischargeSummaryPDF(ctx context.Context, summaryID, locale, userID string) ([]byte, string, error) {
	// Validate locale
	if locale != "vi" && locale != "en" {
		locale = "vi"
	}

	// Fetch discharge summary
	summary, err := s.dischargeRepo.GetSummaryByID(ctx, summaryID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get discharge summary: %w", err)
	}

	// Fetch discharge plan for additional data
	plan, err := s.dischargeRepo.GetPlanByPatientID(ctx, summary.PatientID)
	if err != nil {
		log.Warn().Err(err).Str("patient_id", summary.PatientID).Msg("failed to get discharge plan for PDF")
		// Non-fatal: continue without plan details
	}

	// Fetch patient for name/MRN
	patient, err := s.patientRepo.GetByID(ctx, summary.ClinicID, summary.PatientID)
	if err != nil {
		log.Warn().Err(err).Str("patient_id", summary.PatientID).Msg("failed to get patient for PDF")
	}

	// Build template data
	data := s.buildDischargeSummaryData(summary, plan, patient)

	// Render HTML
	html, err := s.renderTemplate("discharge_summary_"+locale, data)
	if err != nil {
		return nil, "", fmt.Errorf("failed to render discharge summary template: %w", err)
	}

	// Convert to PDF
	pdfBytes, err := s.htmlToPDF(html)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate PDF: %w", err)
	}

	// Build filename
	patientName := "patient"
	if patient != nil {
		patientName = sanitizeFilename(patient.FirstName + "_" + patient.LastName)
	}
	filename := fmt.Sprintf("discharge_summary_%s_%s.pdf", patientName, time.Now().Format("20060102"))

	// Record the generated report
	report := &model.GeneratedReport{
		ID:            uuid.New().String(),
		ReportType:    "discharge_summary_pdf",
		SourceID:      summaryID,
		SourceType:    "discharge_summary",
		Locale:        locale,
		FileSizeBytes: int64(len(pdfBytes)),
		MimeType:      "application/pdf",
		GeneratedBy:   &userID,
	}
	if err := s.reportRepo.CreateGeneratedReport(ctx, report); err != nil {
		log.Warn().Err(err).Msg("failed to record generated report")
		// Non-fatal: still return the PDF
	}

	log.Info().
		Str("summary_id", summaryID).
		Str("locale", locale).
		Int("pdf_size", len(pdfBytes)).
		Msg("discharge summary PDF generated")

	return pdfBytes, filename, nil
}

// GenerateInvoicePDF generates a PDF for an invoice.
func (s *reportService) GenerateInvoicePDF(ctx context.Context, invoiceID, locale, userID string) ([]byte, string, error) {
	// Validate locale
	if locale != "vi" && locale != "en" {
		locale = "vi"
	}

	// Fetch invoice
	invoice, err := s.billingRepo.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get invoice: %w", err)
	}

	// Fetch patient for name
	patient, err := s.patientRepo.GetByID(ctx, invoice.ClinicID, invoice.PatientID)
	if err != nil {
		log.Warn().Err(err).Str("patient_id", invoice.PatientID).Msg("failed to get patient for invoice PDF")
	}

	// Build template data
	data := s.buildInvoiceData(invoice, patient, locale)

	// Render HTML
	html, err := s.renderTemplate("invoice_"+locale, data)
	if err != nil {
		return nil, "", fmt.Errorf("failed to render invoice template: %w", err)
	}

	// Convert to PDF
	pdfBytes, err := s.htmlToPDF(html)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate PDF: %w", err)
	}

	// Build filename
	filename := fmt.Sprintf("invoice_%s_%s.pdf", invoice.InvoiceNumber, time.Now().Format("20060102"))

	// Record the generated report
	report := &model.GeneratedReport{
		ID:            uuid.New().String(),
		ReportType:    "invoice_pdf",
		SourceID:      invoiceID,
		SourceType:    "invoice",
		Locale:        locale,
		FileSizeBytes: int64(len(pdfBytes)),
		MimeType:      "application/pdf",
		GeneratedBy:   &userID,
	}
	if err := s.reportRepo.CreateGeneratedReport(ctx, report); err != nil {
		log.Warn().Err(err).Msg("failed to record generated report")
	}

	log.Info().
		Str("invoice_id", invoiceID).
		Str("invoice_number", invoice.InvoiceNumber).
		Str("locale", locale).
		Int("pdf_size", len(pdfBytes)).
		Msg("invoice PDF generated")

	return pdfBytes, filename, nil
}

// buildDischargeSummaryData constructs the template data from domain objects.
func (s *reportService) buildDischargeSummaryData(
	summary *model.DischargeSummary,
	plan *model.DischargePlan,
	patient *model.Patient,
) *model.DischargeSummaryPDFData {
	data := &model.DischargeSummaryPDFData{
		Diagnosis:          summary.Diagnosis,
		DiagnosisVi:        summary.DiagnosisVi,
		TreatmentSummary:   summary.TreatmentSummary,
		TreatmentSummaryVi: summary.TreatmentSummaryVi,
		TotalSessions:      summary.TotalSessions,
		TreatmentDuration:  summary.TreatmentDuration,
		FirstVisitDate:     summary.FirstVisitDate.Format("02/01/2006"),
		LastVisitDate:      summary.LastVisitDate.Format("02/01/2006"),
		DateRange:          fmt.Sprintf("%s - %s", summary.FirstVisitDate.Format("02/01/2006"), summary.LastVisitDate.Format("02/01/2006")),
		BaselineComparisons: summary.BaselineComparison,
		FunctionalStatus:   summary.FunctionalStatus,
		FunctionalStatusVi: summary.FunctionalStatusVi,
		DischargeReason:    string(summary.DischargeReason),
		Prognosis:          summary.Prognosis,
		PrognosisVi:        summary.PrognosisVi,
		GeneratedAt:        time.Now().Format("02/01/2006 15:04"),
	}

	// Patient info
	if patient != nil {
		data.PatientName = patient.FirstName + " " + patient.LastName
		if patient.FirstNameVi != "" || patient.LastNameVi != "" {
			data.PatientNameVi = patient.LastNameVi + " " + patient.FirstNameVi
		} else {
			data.PatientNameVi = data.PatientName
		}
		data.PatientMRN = patient.MRN
		if !patient.DateOfBirth.IsZero() {
			data.PatientDOB = patient.DateOfBirth.Format("02/01/2006")
		}
		data.PatientPhone = patient.Phone
	}

	// Plan details
	if plan != nil {
		data.HomeProgram = plan.HomeProgram
		data.Recommendations = plan.Recommendations
		data.FollowUp = plan.FollowUp
	}

	// Discharge reason localization
	data.DischargeReasonVi = localizeDischargeReason(summary.DischargeReason)

	return data
}

// buildInvoiceData constructs the template data from an invoice.
func (s *reportService) buildInvoiceData(
	invoice *model.Invoice,
	patient *model.Patient,
	locale string,
) *model.InvoicePDFData {
	data := &model.InvoicePDFData{
		InvoiceNumber:  invoice.InvoiceNumber,
		InvoiceDate:    invoice.IssuedAt.Format("02/01/2006"),
		Status:         string(invoice.Status),
		StatusVi:       localizeInvoiceStatus(invoice.Status),
		Subtotal:       formatVND(invoice.Subtotal),
		SubtotalRaw:    invoice.Subtotal,
		TaxRate:        invoice.TaxRate,
		TaxAmount:      formatVND(invoice.TaxAmount),
		TaxAmountRaw:   invoice.TaxAmount,
		TotalAmount:    formatVND(invoice.TotalAmount),
		TotalAmountRaw: invoice.TotalAmount,
		InsuranceAmount: formatVND(invoice.InsuranceAmount),
		PatientAmount:  formatVND(invoice.PatientAmount),
		Currency:       invoice.Currency,
		Notes:          invoice.Notes,
		NotesVi:        invoice.NotesVi,
		HasBHYT:        invoice.BHYTCardID != nil,
		GeneratedAt:    time.Now().Format("02/01/2006 15:04"),
	}

	if invoice.DueAt != nil {
		data.DueDate = invoice.DueAt.Format("02/01/2006")
	}

	if invoice.DiscountAmount > 0 {
		data.DiscountAmount = formatVND(invoice.DiscountAmount)
		data.DiscountReason = invoice.DiscountReason
	}

	if invoice.PaidAmount > 0 {
		data.PaidAmount = formatVND(invoice.PaidAmount)
	}

	if invoice.BalanceDue > 0 {
		data.BalanceDue = formatVND(invoice.BalanceDue)
	}

	// Patient info
	if patient != nil {
		data.PatientName = patient.FirstName + " " + patient.LastName
		if patient.FirstNameVi != "" || patient.LastNameVi != "" {
			data.PatientNameVi = patient.LastNameVi + " " + patient.FirstNameVi
		} else {
			data.PatientNameVi = data.PatientName
		}
		data.PatientMRN = patient.MRN
		data.PatientPhone = patient.Phone
	}

	// Line items
	for i, item := range invoice.Items {
		pdfItem := model.InvoicePDFItem{
			Index:         i + 1,
			Description:   item.Description,
			DescriptionVi: item.DescriptionVi,
			Quantity:      item.Quantity,
			UnitPrice:     formatVND(item.UnitPrice),
			TotalPrice:    formatVND(item.TotalPrice),
			BHYTCoverable: item.BHYTCoverable,
		}
		if item.BHYTAmount > 0 {
			pdfItem.BHYTAmount = formatVND(item.BHYTAmount)
		}
		data.Items = append(data.Items, pdfItem)
	}

	return data
}

// renderTemplate renders an HTML template with the given data.
func (s *reportService) renderTemplate(name string, data interface{}) (string, error) {
	tmpl, ok := s.templates[name]
	if !ok {
		return "", fmt.Errorf("template %q not found", name)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute template %q: %w", name, err)
	}

	return buf.String(), nil
}

// htmlToPDF converts HTML to PDF using wkhtmltopdf.
func (s *reportService) htmlToPDF(html string) ([]byte, error) {
	// Check if wkhtmltopdf is available
	wkhtmlPath, err := exec.LookPath("wkhtmltopdf")
	if err != nil {
		return nil, fmt.Errorf("wkhtmltopdf not found in PATH: %w", err)
	}

	// Create command: read from stdin, write to stdout
	cmd := exec.Command(wkhtmlPath,
		"--quiet",
		"--page-size", "A4",
		"--margin-top", "15mm",
		"--margin-bottom", "15mm",
		"--margin-left", "15mm",
		"--margin-right", "15mm",
		"--encoding", "UTF-8",
		"--enable-local-file-access",
		"--no-stop-slow-scripts",
		"--print-media-type",
		"-", // stdin
		"-", // stdout
	)

	// Set input
	cmd.Stdin = strings.NewReader(html)

	// Capture output
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("wkhtmltopdf failed: %s (stderr: %s)", err.Error(), stderr.String())
	}

	return stdout.Bytes(), nil
}

// formatVND formats a float64 as Vietnamese Dong currency string.
func formatVND(amount float64) string {
	// Format with dot separators for thousands
	intPart := int64(amount)
	if intPart == 0 {
		return "0 VND"
	}

	// Build string with dot separators
	negative := intPart < 0
	if negative {
		intPart = -intPart
	}

	s := fmt.Sprintf("%d", intPart)
	n := len(s)

	if n <= 3 {
		if negative {
			return "-" + s + " VND"
		}
		return s + " VND"
	}

	// Insert dots every 3 digits from right
	var result []byte
	for i, c := range s {
		if i > 0 && (n-i)%3 == 0 {
			result = append(result, '.')
		}
		result = append(result, byte(c))
	}

	if negative {
		return "-" + string(result) + " VND"
	}
	return string(result) + " VND"
}

// sanitizeFilename removes or replaces characters not suitable for filenames.
func sanitizeFilename(name string) string {
	replacer := strings.NewReplacer(
		" ", "_",
		"/", "_",
		"\\", "_",
		":", "_",
		"*", "_",
		"?", "_",
		"\"", "_",
		"<", "_",
		">", "_",
		"|", "_",
	)
	return replacer.Replace(strings.TrimSpace(name))
}

// localizeDischargeReason returns a Vietnamese label for a discharge reason.
func localizeDischargeReason(reason model.DischargeReason) string {
	switch reason {
	case model.DischargeReasonGoalsMet:
		return "Dat muc tieu dieu tri"
	case model.DischargeReasonPlateau:
		return "Dat dinh chuc nang"
	case model.DischargeReasonPatientChoice:
		return "Theo yeu cau benh nhan"
	case model.DischargeReasonReferral:
		return "Chuyen tuyen"
	case model.DischargeReasonNonCompliance:
		return "Khong tuan thu dieu tri"
	case model.DischargeReasonInsurance:
		return "Het quyen loi bao hiem"
	case model.DischargeReasonRelocated:
		return "Chuyen noi cu tru"
	case model.DischargeReasonMedical:
		return "Thay doi tinh trang suc khoe"
	default:
		return "Ly do khac"
	}
}

// localizeInvoiceStatus returns a Vietnamese label for an invoice status.
func localizeInvoiceStatus(status model.InvoiceStatus) string {
	switch status {
	case model.InvoiceStatusDraft:
		return "Nhap"
	case model.InvoiceStatusPending:
		return "Cho thanh toan"
	case model.InvoiceStatusPartial:
		return "Thanh toan mot phan"
	case model.InvoiceStatusPaid:
		return "Da thanh toan"
	case model.InvoiceStatusOverdue:
		return "Qua han"
	case model.InvoiceStatusCancelled:
		return "Da huy"
	case model.InvoiceStatusRefunded:
		return "Da hoan tien"
	default:
		return string(status)
	}
}
