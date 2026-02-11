package service

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

func TestFormatVND(t *testing.T) {
	tests := []struct {
		name     string
		amount   float64
		expected string
	}{
		{"zero", 0, "0 VND"},
		{"small amount", 500, "500 VND"},
		{"thousands", 1500, "1.500 VND"},
		{"tens of thousands", 50000, "50.000 VND"},
		{"hundreds of thousands", 150000, "150.000 VND"},
		{"millions", 1500000, "1.500.000 VND"},
		{"typical PT session", 250000, "250.000 VND"},
		{"expensive treatment", 3500000, "3.500.000 VND"},
		{"exact thousands", 1000, "1.000 VND"},
		{"negative amount", -150000, "-150.000 VND"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatVND(tt.amount)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"simple name", "Nguyen Van", "Nguyen_Van"},
		{"with special chars", "Dr. Tran/Nguyen", "Dr._Tran_Nguyen"},
		{"with spaces", "  John Doe  ", "John_Doe"},
		{"with colons", "report:2024", "report_2024"},
		{"empty", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeFilename(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestLocalizeDischargeReason(t *testing.T) {
	tests := []struct {
		reason   model.DischargeReason
		expected string
	}{
		{model.DischargeReasonGoalsMet, "Dat muc tieu dieu tri"},
		{model.DischargeReasonPlateau, "Dat dinh chuc nang"},
		{model.DischargeReasonPatientChoice, "Theo yeu cau benh nhan"},
		{model.DischargeReasonReferral, "Chuyen tuyen"},
		{model.DischargeReasonNonCompliance, "Khong tuan thu dieu tri"},
		{model.DischargeReasonInsurance, "Het quyen loi bao hiem"},
		{model.DischargeReasonRelocated, "Chuyen noi cu tru"},
		{model.DischargeReasonMedical, "Thay doi tinh trang suc khoe"},
		{model.DischargeReasonOther, "Ly do khac"},
		{model.DischargeReason("unknown_reason"), "Ly do khac"},
	}

	for _, tt := range tests {
		t.Run(string(tt.reason), func(t *testing.T) {
			result := localizeDischargeReason(tt.reason)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestLocalizeInvoiceStatus(t *testing.T) {
	tests := []struct {
		status   model.InvoiceStatus
		expected string
	}{
		{model.InvoiceStatusDraft, "Nhap"},
		{model.InvoiceStatusPending, "Cho thanh toan"},
		{model.InvoiceStatusPartial, "Thanh toan mot phan"},
		{model.InvoiceStatusPaid, "Da thanh toan"},
		{model.InvoiceStatusOverdue, "Qua han"},
		{model.InvoiceStatusCancelled, "Da huy"},
		{model.InvoiceStatusRefunded, "Da hoan tien"},
	}

	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			result := localizeInvoiceStatus(tt.status)
			assert.Equal(t, tt.expected, result)
		})
	}
}
