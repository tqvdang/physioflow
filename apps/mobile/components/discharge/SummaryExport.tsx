import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import type DischargeSummary from '@/lib/database/models/DischargeSummary';
import type { FinalScore } from '@/lib/database/models/DischargeSummary';

interface SummaryExportProps {
  summary: DischargeSummary;
  patientName: string;
}

function generateSummaryHTML(
  summary: DischargeSummary,
  patientName: string
): string {
  const scores = summary.finalScores;
  const dischargeDate = summary.dischargeDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const scoresTableRows = scores
    .map(
      (score: FinalScore) => `
      <tr>
        <td>${score.label}</td>
        <td class="center">${score.baselineScore.toFixed(1)}</td>
        <td class="center">${score.score.toFixed(1)}</td>
        <td class="center ${score.percentImprovement >= 0 ? 'improved' : 'declined'}">
          ${score.percentImprovement >= 0 ? '+' : ''}${score.percentImprovement.toFixed(0)}%
        </td>
        <td class="center">${score.metMcid ? '&#10003;' : '-'}</td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          margin: 40px;
          color: #333;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0F766E;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .header h1 {
          color: #0F766E;
          margin: 0;
          font-size: 22px;
        }
        .header h2 {
          color: #666;
          font-size: 14px;
          font-weight: normal;
          margin: 4px 0;
        }
        .section {
          margin-bottom: 24px;
        }
        .section h3 {
          color: #0F766E;
          font-size: 16px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 6px;
          margin-bottom: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th {
          background-color: #f4f4f5;
          color: #666;
          font-size: 11px;
          text-transform: uppercase;
          padding: 8px 12px;
          text-align: left;
          border-bottom: 2px solid #ddd;
        }
        td {
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
          font-size: 13px;
        }
        .center { text-align: center; }
        .improved { color: #16A34A; font-weight: 600; }
        .declined { color: #DC2626; font-weight: 600; }
        .overall {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          margin-top: 16px;
        }
        .overall .percent {
          font-size: 32px;
          font-weight: 700;
          color: #16A34A;
        }
        .bilingual {
          margin-top: 12px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 6px;
        }
        .bilingual .vi {
          color: #666;
          font-style: italic;
          margin-top: 8px;
        }
        .footer {
          margin-top: 32px;
          text-align: center;
          color: #999;
          font-size: 11px;
          border-top: 1px solid #ddd;
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Discharge Summary / Bao Cao Xuat Vien</h1>
        <h2>PhysioFlow - Physical Therapy EHR</h2>
      </div>

      <div class="section">
        <table style="border:none;">
          <tr>
            <td style="border:none;"><strong>Patient / Benh nhan:</strong> ${patientName}</td>
            <td style="border:none; text-align:right;"><strong>Date / Ngay:</strong> ${dischargeDate}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h3>Outcome Measures / Ket Qua Do Luong</h3>
        <table>
          <thead>
            <tr>
              <th>Measure</th>
              <th class="center">Baseline</th>
              <th class="center">Discharge</th>
              <th class="center">Change</th>
              <th class="center">MCID</th>
            </tr>
          </thead>
          <tbody>
            ${scoresTableRows}
          </tbody>
        </table>

        <div class="overall">
          <div>Overall Improvement / Tien Trien Chung</div>
          <div class="percent">${summary.improvementPercent >= 0 ? '+' : ''}${summary.improvementPercent.toFixed(0)}%</div>
        </div>
      </div>

      ${summary.summaryText ? `
      <div class="section">
        <h3>Clinical Summary / Tom Tat Lam Sang</h3>
        <div class="bilingual">
          <div>${summary.summaryText}</div>
          ${summary.summaryTextVi ? `<div class="vi">${summary.summaryTextVi}</div>` : ''}
        </div>
      </div>
      ` : ''}

      ${summary.followUpRecommendations ? `
      <div class="section">
        <h3>Follow-Up Recommendations / Khuyen Nghi Theo Doi</h3>
        <div class="bilingual">
          <div>${summary.followUpRecommendations}</div>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        Generated by PhysioFlow &middot; ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `;
}

export function SummaryExport({ summary, patientName }: SummaryExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const html = generateSummaryHTML(summary, patientName);
      const { uri } = await Print.printToFileAsync({ html });

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Discharge Summary / Bao Cao Xuat Vien',
        });
      } else {
        Alert.alert(
          'Sharing Unavailable',
          'Sharing is not available on this device. The PDF has been generated at: ' + uri
        );
      }
    } catch (error) {
      Alert.alert(
        'Export Failed',
        'Failed to generate PDF. Please try again.'
      );
      console.error('PDF export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewCard}>
        <Ionicons name="document-text-outline" size={24} color={Colors.light.tint} />
        <View style={styles.previewInfo}>
          <Text style={styles.previewTitle}>Discharge Summary</Text>
          <Text style={styles.previewSubtitle}>
            {summary.dischargeDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.improvementBadge}>
          <Text style={styles.improvementText}>
            {summary.improvementPercent >= 0 ? '+' : ''}{summary.improvementPercent.toFixed(0)}%
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.exportButton, isExporting && styles.buttonDisabled]}
        onPress={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={Colors.light.background} />
        ) : (
          <Ionicons name="share-outline" size={20} color={Colors.light.background} />
        )}
        <Text style={styles.exportButtonText}>
          {isExporting ? 'Generating PDF...' : 'Share Summary PDF'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    gap: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  previewSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  improvementBadge: {
    backgroundColor: Colors.light.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  improvementText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.success,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
});
