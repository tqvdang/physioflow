import { Q } from '@nozbe/watermelondb';
import { database } from '@/lib/database';
import type DischargePlan from '@/lib/database/models/DischargePlan';
import type DischargeSummary from '@/lib/database/models/DischargeSummary';
import type { FinalScore } from '@/lib/database/models/DischargeSummary';
import type { BaselineComparison } from '@/lib/database/models/DischargePlan';
import OutcomeMeasure, {
  MEASURE_TYPE_CONFIGS,
  type MeasureType,
} from '@/lib/database/models/OutcomeMeasure';

export interface SummaryGenerationResult {
  success: boolean;
  summaryId?: string;
  error?: string;
}

function calculateBaselineComparisons(
  measures: OutcomeMeasure[]
): BaselineComparison[] {
  // Group measures by type
  const byType = new Map<string, OutcomeMeasure[]>();
  for (const measure of measures) {
    const existing = byType.get(measure.measureType) ?? [];
    existing.push(measure);
    byType.set(measure.measureType, existing);
  }

  const comparisons: BaselineComparison[] = [];

  for (const [measureType, typeMeasures] of byType) {
    // Sort by measurement date ascending
    const sorted = typeMeasures.sort(
      (a, b) => a.measurementDate.getTime() - b.measurementDate.getTime()
    );

    // Find baseline (first measurement) and latest (last measurement)
    const baseline = sorted[0];
    const latest = sorted[sorted.length - 1];

    const config = MEASURE_TYPE_CONFIGS[measureType as MeasureType];
    if (!config) continue;

    const change = latest.currentScore - baseline.baselineScore;
    const absChange = Math.abs(change);

    // Calculate percent improvement relative to baseline
    let percentImprovement = 0;
    if (baseline.baselineScore !== 0) {
      if (config.lowerIsBetter) {
        // Lower is better: improvement = decrease from baseline
        percentImprovement = ((baseline.baselineScore - latest.currentScore) / baseline.baselineScore) * 100;
      } else {
        // Higher is better: improvement = increase from baseline
        percentImprovement = ((latest.currentScore - baseline.baselineScore) / baseline.baselineScore) * 100;
      }
    }

    const metMcid = config.lowerIsBetter
      ? (latest.currentScore < baseline.baselineScore && absChange >= baseline.mcidThreshold)
      : (latest.currentScore > baseline.baselineScore && absChange >= baseline.mcidThreshold);

    comparisons.push({
      measureType,
      label: config.abbreviation,
      baselineScore: baseline.baselineScore,
      dischargeScore: latest.currentScore,
      change,
      percentImprovement,
      metMcid,
      mcidThreshold: baseline.mcidThreshold,
      lowerIsBetter: config.lowerIsBetter,
    });
  }

  return comparisons;
}

function generateSummaryText(
  comparisons: BaselineComparison[],
  overallImprovement: number
): { en: string; vi: string } {
  const improved = comparisons.filter((c) => c.percentImprovement > 0);
  const metMcid = comparisons.filter((c) => c.metMcid);

  const en = [
    `Patient completed treatment with ${comparisons.length} outcome measures tracked.`,
    improved.length > 0
      ? `Improvement was observed in ${improved.length} of ${comparisons.length} measures.`
      : 'No significant improvement was observed in outcome measures.',
    metMcid.length > 0
      ? `Clinically meaningful improvement (MCID) was achieved in: ${metMcid.map((c) => c.label).join(', ')}.`
      : 'No measures achieved the Minimal Clinically Important Difference (MCID) threshold.',
    `Overall improvement: ${overallImprovement >= 0 ? '+' : ''}${overallImprovement.toFixed(0)}%.`,
  ].join(' ');

  const vi = [
    `Benh nhan hoan tat dieu tri voi ${comparisons.length} chi so ket qua duoc theo doi.`,
    improved.length > 0
      ? `Tien trien duoc ghi nhan o ${improved.length} trong ${comparisons.length} chi so.`
      : 'Khong ghi nhan tien trien dang ke trong cac chi so ket qua.',
    metMcid.length > 0
      ? `Tien trien co y nghia lam sang (MCID) dat duoc tai: ${metMcid.map((c) => c.label).join(', ')}.`
      : 'Khong co chi so nao dat nguong Khac Biet Lam Sang Toi Thieu (MCID).',
    `Tien trien chung: ${overallImprovement >= 0 ? '+' : ''}${overallImprovement.toFixed(0)}%.`,
  ].join(' ');

  return { en, vi };
}

export async function generateDischargeSummary(
  patientId: string
): Promise<SummaryGenerationResult> {
  try {
    // Fetch all outcome measures for this patient
    const measures = await database
      .get<OutcomeMeasure>('outcome_measures')
      .query(Q.where('patient_id', patientId))
      .fetch();

    if (measures.length === 0) {
      return {
        success: false,
        error: 'No outcome measures found for this patient',
      };
    }

    // Calculate baseline comparisons
    const comparisons = calculateBaselineComparisons(measures);

    // Calculate overall improvement (average of all measure improvements)
    const overallImprovement =
      comparisons.length > 0
        ? comparisons.reduce((sum, c) => sum + c.percentImprovement, 0) / comparisons.length
        : 0;

    // Generate bilingual summary text
    const summaryText = generateSummaryText(comparisons, overallImprovement);

    // Build final scores array
    const finalScores: FinalScore[] = comparisons.map((c) => ({
      measureType: c.measureType,
      label: c.label,
      score: c.dischargeScore,
      baselineScore: c.baselineScore,
      change: c.change,
      percentImprovement: c.percentImprovement,
      metMcid: c.metMcid,
    }));

    // Generate follow-up recommendations based on results
    const followUp = generateFollowUpRecommendations(comparisons);

    // Create discharge summary in database
    let summaryId = '';
    await database.write(async () => {
      const created = await database
        .get<DischargeSummary>('discharge_summaries')
        .create((record) => {
          record.remoteId = '';
          record.patientId = patientId;
          record.dischargeDate = new Date();
          record.summaryText = summaryText.en;
          record.summaryTextVi = summaryText.vi;
          record.finalScoresRaw = JSON.stringify(finalScores);
          record.improvementPercent = overallImprovement;
          record.followUpRecommendations = followUp;
          record.isSynced = false;
        });
      summaryId = created.id;
    });

    return { success: true, summaryId };
  } catch (error) {
    console.error('Failed to generate discharge summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function generateFollowUpRecommendations(comparisons: BaselineComparison[]): string {
  const recommendations: string[] = [];

  const notMetMcid = comparisons.filter((c) => !c.metMcid);
  const declined = comparisons.filter((c) => c.percentImprovement < 0);

  if (notMetMcid.length > 0) {
    recommendations.push(
      `Continue monitoring: ${notMetMcid.map((c) => c.label).join(', ')} did not reach MCID threshold.`
    );
  }

  if (declined.length > 0) {
    recommendations.push(
      `Re-evaluate: ${declined.map((c) => c.label).join(', ')} showed decline from baseline.`
    );
  }

  recommendations.push('Continue prescribed home exercise program as directed.');
  recommendations.push('Follow up with physician if symptoms worsen.');

  return recommendations.join('\n');
}

export async function createDischargePlan(
  patientId: string
): Promise<{ success: boolean; planId?: string; error?: string }> {
  try {
    // Fetch outcome measures for baseline comparisons
    const measures = await database
      .get<OutcomeMeasure>('outcome_measures')
      .query(Q.where('patient_id', patientId))
      .fetch();

    const comparisons = calculateBaselineComparisons(measures);

    // Build outcome trending data
    const trendingByType = new Map<string, { date: string; score: number }[]>();
    for (const measure of measures) {
      const key = measure.measureType;
      const existing = trendingByType.get(key) ?? [];
      existing.push({
        date: measure.measurementDate.toISOString(),
        score: measure.currentScore,
      });
      trendingByType.set(key, existing);
    }

    const outcomeTrending = Array.from(trendingByType.entries()).map(
      ([measureType, dataPoints]) => {
        const config = MEASURE_TYPE_CONFIGS[measureType as MeasureType];
        return {
          measureType,
          label: config?.abbreviation ?? measureType,
          dataPoints: dataPoints.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
        };
      }
    );

    // Create the discharge plan
    let planId = '';
    await database.write(async () => {
      const created = await database
        .get<DischargePlan>('discharge_plans')
        .create((record) => {
          record.remoteId = '';
          record.patientId = patientId;
          record.plannedDate = new Date();
          record.baselineComparisonRaw = JSON.stringify(comparisons);
          record.outcomeTrendingRaw = JSON.stringify(outcomeTrending);
          record.hepExercisesRaw = JSON.stringify([]);
          record.recommendations = '';
          record.recommendationsVi = '';
          record.version = 1;
          record.isSynced = false;
        });
      planId = created.id;
    });

    return { success: true, planId };
  } catch (error) {
    console.error('Failed to create discharge plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
