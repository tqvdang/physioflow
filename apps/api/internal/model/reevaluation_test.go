package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCalculateChange(t *testing.T) {
	tests := []struct {
		name         string
		baseline     float64
		current      float64
		wantChange   float64
		wantPctNil   bool
		wantPctApprox float64
	}{
		{
			name:         "Improvement in ROM (higher is better)",
			baseline:     90.0,
			current:      120.0,
			wantChange:   30.0,
			wantPctApprox: 33.33,
		},
		{
			name:         "Decline in ROM",
			baseline:     120.0,
			current:      100.0,
			wantChange:   -20.0,
			wantPctApprox: -16.67,
		},
		{
			name:         "No change",
			baseline:     100.0,
			current:      100.0,
			wantChange:   0.0,
			wantPctApprox: 0.0,
		},
		{
			name:         "Pain scale improvement (score went down)",
			baseline:     8.0,
			current:      3.0,
			wantChange:   -5.0,
			wantPctApprox: -62.5,
		},
		{
			name:         "Baseline is zero",
			baseline:     0.0,
			current:      50.0,
			wantChange:   50.0,
			wantPctNil:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			change, pct := CalculateChange(tt.baseline, tt.current)
			assert.InDelta(t, tt.wantChange, change, 0.01)

			if tt.wantPctNil {
				assert.Nil(t, pct)
			} else {
				assert.NotNil(t, pct)
				assert.InDelta(t, tt.wantPctApprox, *pct, 0.1)
			}
		})
	}
}

func TestDetermineInterpretation(t *testing.T) {
	mcid2 := 2.0
	mcid5 := 5.0
	mcid10 := 10.0

	tests := []struct {
		name             string
		change           float64
		mcid             *float64
		higherIsBetter   bool
		wantInterp       Interpretation
		wantMCIDAchieved bool
	}{
		{
			name:             "ROM improved, exceeds MCID",
			change:           15.0,
			mcid:             &mcid10,
			higherIsBetter:   true,
			wantInterp:       InterpretationImproved,
			wantMCIDAchieved: true,
		},
		{
			name:             "ROM improved, does not exceed MCID (stable)",
			change:           5.0,
			mcid:             &mcid10,
			higherIsBetter:   true,
			wantInterp:       InterpretationStable,
			wantMCIDAchieved: false,
		},
		{
			name:             "ROM declined, exceeds MCID",
			change:           -15.0,
			mcid:             &mcid10,
			higherIsBetter:   true,
			wantInterp:       InterpretationDeclined,
			wantMCIDAchieved: true,
		},
		{
			name:             "Pain scale improved (lower is better), exceeds MCID",
			change:           -3.0,
			mcid:             &mcid2,
			higherIsBetter:   false,
			wantInterp:       InterpretationImproved,
			wantMCIDAchieved: true,
		},
		{
			name:             "Pain scale worsened (higher score, lower is better), exceeds MCID",
			change:           3.0,
			mcid:             &mcid2,
			higherIsBetter:   false,
			wantInterp:       InterpretationDeclined,
			wantMCIDAchieved: true,
		},
		{
			name:             "Pain scale small change, below MCID (stable)",
			change:           -1.0,
			mcid:             &mcid2,
			higherIsBetter:   false,
			wantInterp:       InterpretationStable,
			wantMCIDAchieved: false,
		},
		{
			name:             "No MCID, positive change, higher is better",
			change:           5.0,
			mcid:             nil,
			higherIsBetter:   true,
			wantInterp:       InterpretationImproved,
			wantMCIDAchieved: false,
		},
		{
			name:             "No MCID, negative change, higher is better",
			change:           -5.0,
			mcid:             nil,
			higherIsBetter:   true,
			wantInterp:       InterpretationDeclined,
			wantMCIDAchieved: false,
		},
		{
			name:             "No MCID, zero change",
			change:           0.0,
			mcid:             nil,
			higherIsBetter:   true,
			wantInterp:       InterpretationStable,
			wantMCIDAchieved: false,
		},
		{
			name:             "No MCID, essentially zero change",
			change:           0.00001,
			mcid:             nil,
			higherIsBetter:   true,
			wantInterp:       InterpretationStable,
			wantMCIDAchieved: false,
		},
		{
			name:             "MMT improved from 3 to 4 (exactly MCID)",
			change:           1.0,
			mcid:             nil,
			higherIsBetter:   true,
			wantInterp:       InterpretationImproved,
			wantMCIDAchieved: false,
		},
		{
			name:             "Outcome measure improved, MCID exactly met",
			change:           5.0,
			mcid:             &mcid5,
			higherIsBetter:   true,
			wantInterp:       InterpretationImproved,
			wantMCIDAchieved: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			interp, mcidAchieved := DetermineInterpretation(tt.change, tt.mcid, tt.higherIsBetter)
			assert.Equal(t, tt.wantInterp, interp, "interpretation mismatch")
			assert.Equal(t, tt.wantMCIDAchieved, mcidAchieved, "MCID achieved mismatch")
		})
	}
}
