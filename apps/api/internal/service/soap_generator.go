package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/tqvdang/physioflow/apps/api/internal/model"
)

// SOAPGenerator generates SOAP notes from checklist responses.
type SOAPGenerator struct {
	templates map[string]SOAPTemplate
}

// SOAPTemplate defines the template for generating a SOAP note section.
type SOAPTemplate struct {
	SectionMapping map[string]string // Maps checklist section to SOAP section (S/O/A/P)
	FormatRules    []FormatRule
}

// FormatRule defines how to format a specific item type.
type FormatRule struct {
	ItemType model.ChecklistItemType
	Format   string // Template string with placeholders
}

// NewSOAPGenerator creates a new SOAP generator.
func NewSOAPGenerator() *SOAPGenerator {
	return &SOAPGenerator{
		templates: defaultSOAPTemplates(),
	}
}

// defaultSOAPTemplates returns the default SOAP templates.
func defaultSOAPTemplates() map[string]SOAPTemplate {
	return map[string]SOAPTemplate{
		"initial_eval": {
			SectionMapping: map[string]string{
				"chief_complaint":      "S",
				"history":              "S",
				"patient_goals":        "S",
				"pain_assessment":      "S",
				"rom_measurements":     "O",
				"strength_testing":     "O",
				"special_tests":        "O",
				"functional_assessment": "O",
				"clinical_impression":  "A",
				"diagnosis":            "A",
				"treatment_plan":       "P",
				"goals":                "P",
			},
		},
		"follow_up": {
			SectionMapping: map[string]string{
				"subjective_report":    "S",
				"pain_level":           "S",
				"objective_findings":   "O",
				"interventions":        "O",
				"response_to_treatment": "A",
				"progress_toward_goals": "A",
				"next_session_plan":    "P",
			},
		},
		"discharge": {
			SectionMapping: map[string]string{
				"final_status":         "S",
				"outcome_measures":     "O",
				"goals_achieved":       "A",
				"recommendations":      "P",
				"home_program":         "P",
			},
		},
	}
}

// Generate generates a SOAP note from checklist responses.
func (g *SOAPGenerator) Generate(template *model.ChecklistTemplate, responses []model.ChecklistResponse) (*GeneratedNote, error) {
	// Create response lookup by item ID
	responseMap := make(map[string]model.ChecklistResponse)
	for _, resp := range responses {
		responseMap[resp.ChecklistItemID] = resp
	}

	// Create item lookup by ID
	itemMap := make(map[string]model.ChecklistItem)
	sectionMap := make(map[string]model.ChecklistSection)
	for _, section := range template.Sections {
		sectionMap[section.ID] = section
		for _, item := range section.Items {
			itemMap[item.ID] = item
		}
	}

	// Build SOAP sections
	var subjective, objective, assessment, plan []string
	var subjectiveVi, objectiveVi, assessmentVi, planVi []string

	// Get the SOAP template for this template type
	soapTemplate := g.templates[template.TemplateType]
	if soapTemplate.SectionMapping == nil {
		// Use default mapping based on section titles
		soapTemplate = g.inferSOAPMapping(template)
	}

	for _, section := range template.Sections {
		sectionContent, sectionContentVi := g.formatSection(section, responseMap, itemMap)
		if sectionContent == "" {
			continue
		}

		// Determine which SOAP section this belongs to
		soapSection := g.getSoapSection(section, soapTemplate)

		switch soapSection {
		case "S":
			subjective = append(subjective, sectionContent)
			if sectionContentVi != "" {
				subjectiveVi = append(subjectiveVi, sectionContentVi)
			}
		case "O":
			objective = append(objective, sectionContent)
			if sectionContentVi != "" {
				objectiveVi = append(objectiveVi, sectionContentVi)
			}
		case "A":
			assessment = append(assessment, sectionContent)
			if sectionContentVi != "" {
				assessmentVi = append(assessmentVi, sectionContentVi)
			}
		case "P":
			plan = append(plan, sectionContent)
			if sectionContentVi != "" {
				planVi = append(planVi, sectionContentVi)
			}
		}
	}

	// Format the final note
	note := &GeneratedNote{
		Subjective:   strings.Join(subjective, "\n\n"),
		Objective:    strings.Join(objective, "\n\n"),
		Assessment:   strings.Join(assessment, "\n\n"),
		Plan:         strings.Join(plan, "\n\n"),
		SubjectiveVi: strings.Join(subjectiveVi, "\n\n"),
		ObjectiveVi:  strings.Join(objectiveVi, "\n\n"),
		AssessmentVi: strings.Join(assessmentVi, "\n\n"),
		PlanVi:       strings.Join(planVi, "\n\n"),
		GeneratedAt:  time.Now(),
	}

	// Generate full note
	note.FullNote = g.formatFullNote(note, "en")
	note.FullNoteVi = g.formatFullNote(note, "vi")

	return note, nil
}

// formatSection formats a single section.
func (g *SOAPGenerator) formatSection(section model.ChecklistSection, responses map[string]model.ChecklistResponse, items map[string]model.ChecklistItem) (string, string) {
	var lines []string
	var linesVi []string

	// Add section header
	sectionHeader := section.Title
	sectionHeaderVi := section.TitleVi
	if sectionHeaderVi == "" {
		sectionHeaderVi = sectionHeader
	}

	hasContent := false
	var itemLines []string
	var itemLinesVi []string

	for _, item := range section.Items {
		resp, exists := responses[item.ID]
		if !exists || len(resp.ResponseValue) == 0 {
			continue
		}

		if resp.IsSkipped {
			continue
		}

		formatted, formattedVi := g.formatResponse(item, resp)
		if formatted != "" {
			hasContent = true
			itemLines = append(itemLines, formatted)
			if formattedVi != "" {
				itemLinesVi = append(itemLinesVi, formattedVi)
			} else {
				itemLinesVi = append(itemLinesVi, formatted)
			}
		}
	}

	if !hasContent {
		return "", ""
	}

	lines = append(lines, sectionHeader+":")
	lines = append(lines, itemLines...)

	linesVi = append(linesVi, sectionHeaderVi+":")
	linesVi = append(linesVi, itemLinesVi...)

	return strings.Join(lines, "\n"), strings.Join(linesVi, "\n")
}

// formatResponse formats a single response based on item type.
func (g *SOAPGenerator) formatResponse(item model.ChecklistItem, resp model.ChecklistResponse) (string, string) {
	label := item.Label
	labelVi := item.LabelVi
	if labelVi == "" {
		labelVi = label
	}

	switch item.ItemType {
	case model.ItemTypeCheckbox:
		return g.formatCheckbox(label, labelVi, resp.ResponseValue)
	case model.ItemTypeRadio:
		return g.formatRadio(label, labelVi, item.ItemConfig, resp.ResponseValue)
	case model.ItemTypeMultiSelect:
		return g.formatMultiSelect(label, labelVi, item.ItemConfig, resp.ResponseValue)
	case model.ItemTypeText:
		return g.formatText(label, labelVi, resp.ResponseValue)
	case model.ItemTypeNumber:
		return g.formatNumber(label, labelVi, item.ItemConfig, resp.ResponseValue)
	case model.ItemTypeScale:
		return g.formatScale(label, labelVi, item.ItemConfig, resp.ResponseValue)
	case model.ItemTypeDate:
		return g.formatDate(label, labelVi, resp.ResponseValue)
	case model.ItemTypeTime:
		return g.formatTime(label, labelVi, resp.ResponseValue)
	case model.ItemTypeDuration:
		return g.formatDuration(label, labelVi, resp.ResponseValue)
	case model.ItemTypeBodyDiagram:
		return g.formatBodyDiagram(label, labelVi, resp.ResponseValue)
	default:
		return "", ""
	}
}

// formatCheckbox formats a checkbox response.
func (g *SOAPGenerator) formatCheckbox(label, labelVi string, value json.RawMessage) (string, string) {
	var resp model.CheckboxResponse
	if err := json.Unmarshal(value, &resp); err != nil {
		return "", ""
	}
	if resp.Checked {
		return fmt.Sprintf("- %s: Yes", label), fmt.Sprintf("- %s: Co", labelVi)
	}
	return fmt.Sprintf("- %s: No", label), fmt.Sprintf("- %s: Khong", labelVi)
}

// formatRadio formats a radio response.
func (g *SOAPGenerator) formatRadio(label, labelVi string, config json.RawMessage, value json.RawMessage) (string, string) {
	var resp model.RadioResponse
	if err := json.Unmarshal(value, &resp); err != nil {
		return "", ""
	}

	// Try to get the label for the selected option
	var radioConfig model.RadioConfig
	selectedLabel := resp.Selected
	selectedLabelVi := resp.Selected

	if err := json.Unmarshal(config, &radioConfig); err == nil {
		for _, opt := range radioConfig.Options {
			if opt.Value == resp.Selected {
				selectedLabel = opt.Label
				if opt.LabelVi != "" {
					selectedLabelVi = opt.LabelVi
				} else {
					selectedLabelVi = opt.Label
				}
				break
			}
		}
	}

	if resp.Other != "" {
		selectedLabel = resp.Other
		selectedLabelVi = resp.Other
	}

	return fmt.Sprintf("- %s: %s", label, selectedLabel),
		fmt.Sprintf("- %s: %s", labelVi, selectedLabelVi)
}

// formatMultiSelect formats a multi-select response.
func (g *SOAPGenerator) formatMultiSelect(label, labelVi string, config json.RawMessage, value json.RawMessage) (string, string) {
	var resp model.MultiSelectResponse
	if err := json.Unmarshal(value, &resp); err != nil || len(resp.Selected) == 0 {
		return "", ""
	}

	// Try to get labels for selected options
	var msConfig model.MultiSelectConfig
	optionLabels := make(map[string]string)
	optionLabelsVi := make(map[string]string)

	if err := json.Unmarshal(config, &msConfig); err == nil {
		for _, opt := range msConfig.Options {
			optionLabels[opt.Value] = opt.Label
			if opt.LabelVi != "" {
				optionLabelsVi[opt.Value] = opt.LabelVi
			} else {
				optionLabelsVi[opt.Value] = opt.Label
			}
		}
	}

	var selected []string
	var selectedVi []string
	for _, v := range resp.Selected {
		if l, ok := optionLabels[v]; ok {
			selected = append(selected, l)
		} else {
			selected = append(selected, v)
		}
		if l, ok := optionLabelsVi[v]; ok {
			selectedVi = append(selectedVi, l)
		} else {
			selectedVi = append(selectedVi, v)
		}
	}

	return fmt.Sprintf("- %s: %s", label, strings.Join(selected, ", ")),
		fmt.Sprintf("- %s: %s", labelVi, strings.Join(selectedVi, ", "))
}

// formatText formats a text response.
func (g *SOAPGenerator) formatText(label, labelVi string, value json.RawMessage) (string, string) {
	var resp model.TextResponse
	if err := json.Unmarshal(value, &resp); err != nil || resp.Text == "" {
		return "", ""
	}
	return fmt.Sprintf("- %s: %s", label, resp.Text),
		fmt.Sprintf("- %s: %s", labelVi, resp.Text)
}

// formatNumber formats a number response.
func (g *SOAPGenerator) formatNumber(label, labelVi string, config json.RawMessage, value json.RawMessage) (string, string) {
	var resp model.NumberResponse
	if err := json.Unmarshal(value, &resp); err != nil {
		return "", ""
	}

	var numConfig model.NumberConfig
	unit := ""
	unitVi := ""
	if err := json.Unmarshal(config, &numConfig); err == nil {
		unit = numConfig.Unit
		unitVi = numConfig.UnitVi
		if unitVi == "" {
			unitVi = unit
		}
	}

	if unit != "" {
		return fmt.Sprintf("- %s: %.1f %s", label, resp.Value, unit),
			fmt.Sprintf("- %s: %.1f %s", labelVi, resp.Value, unitVi)
	}
	return fmt.Sprintf("- %s: %.1f", label, resp.Value),
		fmt.Sprintf("- %s: %.1f", labelVi, resp.Value)
}

// formatScale formats a scale response.
func (g *SOAPGenerator) formatScale(label, labelVi string, config json.RawMessage, value json.RawMessage) (string, string) {
	var resp model.ScaleResponse
	if err := json.Unmarshal(value, &resp); err != nil {
		return "", ""
	}

	var scaleConfig model.ScaleConfig
	maxVal := 10
	if err := json.Unmarshal(config, &scaleConfig); err == nil {
		maxVal = scaleConfig.Max
	}

	return fmt.Sprintf("- %s: %d/%d", label, resp.Value, maxVal),
		fmt.Sprintf("- %s: %d/%d", labelVi, resp.Value, maxVal)
}

// formatDate formats a date response.
func (g *SOAPGenerator) formatDate(label, labelVi string, value json.RawMessage) (string, string) {
	var resp model.DateResponse
	if err := json.Unmarshal(value, &resp); err != nil || resp.Date == "" {
		return "", ""
	}
	return fmt.Sprintf("- %s: %s", label, resp.Date),
		fmt.Sprintf("- %s: %s", labelVi, resp.Date)
}

// formatTime formats a time response.
func (g *SOAPGenerator) formatTime(label, labelVi string, value json.RawMessage) (string, string) {
	var resp model.TimeResponse
	if err := json.Unmarshal(value, &resp); err != nil || resp.Time == "" {
		return "", ""
	}
	return fmt.Sprintf("- %s: %s", label, resp.Time),
		fmt.Sprintf("- %s: %s", labelVi, resp.Time)
}

// formatDuration formats a duration response.
func (g *SOAPGenerator) formatDuration(label, labelVi string, value json.RawMessage) (string, string) {
	var resp model.DurationResponse
	if err := json.Unmarshal(value, &resp); err != nil {
		return "", ""
	}

	hours := resp.Minutes / 60
	mins := resp.Minutes % 60

	if hours > 0 {
		return fmt.Sprintf("- %s: %dh %dm", label, hours, mins),
			fmt.Sprintf("- %s: %d gio %d phut", labelVi, hours, mins)
	}
	return fmt.Sprintf("- %s: %d minutes", label, resp.Minutes),
		fmt.Sprintf("- %s: %d phut", labelVi, resp.Minutes)
}

// formatBodyDiagram formats a body diagram response.
func (g *SOAPGenerator) formatBodyDiagram(label, labelVi string, value json.RawMessage) (string, string) {
	var resp model.BodyDiagramResponse
	if err := json.Unmarshal(value, &resp); err != nil || len(resp.Points) == 0 {
		return "", ""
	}

	var locations []string
	for _, p := range resp.Points {
		if p.Label != "" {
			locations = append(locations, p.Label)
		}
	}

	if len(locations) == 0 {
		return fmt.Sprintf("- %s: %d location(s) marked", label, len(resp.Points)),
			fmt.Sprintf("- %s: %d vi tri duoc danh dau", labelVi, len(resp.Points))
	}

	return fmt.Sprintf("- %s: %s", label, strings.Join(locations, ", ")),
		fmt.Sprintf("- %s: %s", labelVi, strings.Join(locations, ", "))
}

// getSoapSection determines which SOAP section a checklist section belongs to.
func (g *SOAPGenerator) getSoapSection(section model.ChecklistSection, template SOAPTemplate) string {
	// Check section mapping by title (lowercase, no spaces)
	key := strings.ToLower(strings.ReplaceAll(section.Title, " ", "_"))
	if soap, ok := template.SectionMapping[key]; ok {
		return soap
	}

	// Infer from section title keywords
	titleLower := strings.ToLower(section.Title)

	// Subjective indicators
	if strings.Contains(titleLower, "subjective") ||
		strings.Contains(titleLower, "complaint") ||
		strings.Contains(titleLower, "history") ||
		strings.Contains(titleLower, "patient report") ||
		strings.Contains(titleLower, "pain") {
		return "S"
	}

	// Objective indicators
	if strings.Contains(titleLower, "objective") ||
		strings.Contains(titleLower, "rom") ||
		strings.Contains(titleLower, "range of motion") ||
		strings.Contains(titleLower, "strength") ||
		strings.Contains(titleLower, "measurement") ||
		strings.Contains(titleLower, "vital") ||
		strings.Contains(titleLower, "special test") ||
		strings.Contains(titleLower, "functional") ||
		strings.Contains(titleLower, "intervention") {
		return "O"
	}

	// Assessment indicators
	if strings.Contains(titleLower, "assessment") ||
		strings.Contains(titleLower, "diagnosis") ||
		strings.Contains(titleLower, "impression") ||
		strings.Contains(titleLower, "progress") ||
		strings.Contains(titleLower, "response") {
		return "A"
	}

	// Plan indicators
	if strings.Contains(titleLower, "plan") ||
		strings.Contains(titleLower, "goal") ||
		strings.Contains(titleLower, "recommendation") ||
		strings.Contains(titleLower, "home program") ||
		strings.Contains(titleLower, "follow") ||
		strings.Contains(titleLower, "next") {
		return "P"
	}

	// Default to Objective
	return "O"
}

// inferSOAPMapping creates a default SOAP mapping based on section titles.
func (g *SOAPGenerator) inferSOAPMapping(template *model.ChecklistTemplate) SOAPTemplate {
	mapping := make(map[string]string)
	for _, section := range template.Sections {
		key := strings.ToLower(strings.ReplaceAll(section.Title, " ", "_"))
		mapping[key] = g.getSoapSection(section, SOAPTemplate{})
	}
	return SOAPTemplate{SectionMapping: mapping}
}

// formatFullNote formats the complete SOAP note.
func (g *SOAPGenerator) formatFullNote(note *GeneratedNote, lang string) string {
	var sb strings.Builder

	if lang == "vi" {
		sb.WriteString("=== GHI CHU SOAP ===\n\n")

		if note.SubjectiveVi != "" {
			sb.WriteString("CHU QUAN:\n")
			sb.WriteString(note.SubjectiveVi)
			sb.WriteString("\n\n")
		}

		if note.ObjectiveVi != "" {
			sb.WriteString("KHACH QUAN:\n")
			sb.WriteString(note.ObjectiveVi)
			sb.WriteString("\n\n")
		}

		if note.AssessmentVi != "" {
			sb.WriteString("DANH GIA:\n")
			sb.WriteString(note.AssessmentVi)
			sb.WriteString("\n\n")
		}

		if note.PlanVi != "" {
			sb.WriteString("KE HOACH:\n")
			sb.WriteString(note.PlanVi)
			sb.WriteString("\n")
		}
	} else {
		sb.WriteString("=== SOAP NOTE ===\n\n")

		if note.Subjective != "" {
			sb.WriteString("SUBJECTIVE:\n")
			sb.WriteString(note.Subjective)
			sb.WriteString("\n\n")
		}

		if note.Objective != "" {
			sb.WriteString("OBJECTIVE:\n")
			sb.WriteString(note.Objective)
			sb.WriteString("\n\n")
		}

		if note.Assessment != "" {
			sb.WriteString("ASSESSMENT:\n")
			sb.WriteString(note.Assessment)
			sb.WriteString("\n\n")
		}

		if note.Plan != "" {
			sb.WriteString("PLAN:\n")
			sb.WriteString(note.Plan)
			sb.WriteString("\n")
		}
	}

	return sb.String()
}
