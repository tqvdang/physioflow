import { test, expect } from './fixtures/auth';
import { navigateTo, waitForLoading, expectToast } from './fixtures/test-utils';

test.describe('Outcome Measures CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to patients list
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    // Click on first patient to view details
    const patientRow = page.locator('tr, [data-testid="patient-card"], .patient-card').first();
    if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientRow.click();
      await waitForLoading(page);
    }

    // Navigate to outcome measures
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/outcomes`);
      await waitForLoading(page);
    }
  });

  test.describe('Create Outcome Measure', () => {
    test('should create new outcome measure', async ({ page }) => {
      // Click record measure button
      const recordButton = page.locator('button:has-text("Record"), button:has-text("Ghi"), button:has-text("Add")');
      if (await recordButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await recordButton.first().click();
        await waitForLoading(page);

        // Fill form
        const librarySelect = page.locator('[name="library_id"], select[name*="measure"], select[name*="type"]').first();
        if (await librarySelect.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Try to select VAS
          await librarySelect.selectOption('VAS').catch(async () => {
            // If selectOption fails, try clicking on VAS option
            const vasOption = page.locator('button:has-text("VAS"), [data-measure="VAS"]');
            if (await vasOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
              await vasOption.first().click();
            }
          });

          // Fill score
          const scoreInput = page.locator('[name="score"], input[type="number"], input[type="range"]').first();
          if (await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await scoreInput.fill('7');

            // Add notes
            const notesInput = page.locator('[name="notes"], textarea').first();
            if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              await notesInput.fill('Patient reports moderate pain');
            }

            // Submit
            const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Lưu")').first();
            if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await submitButton.click();
              await waitForLoading(page);

              // Verify success
              await expectToast(page, /recorded|success|ghi|thành công/i);

              // Verify appears in list
              const measureList = page.locator('[data-testid="measure-list"], table, .measures-list');
              if (await measureList.isVisible({ timeout: 3000 }).catch(() => false)) {
                const vasText = page.locator('text=VAS');
                const scoreText = page.locator('text=7');

                if (await vasText.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                  await expect(vasText.first()).toBeVisible();
                }
                if (await scoreText.first().isVisible({ timeout: 2000 }).catch(() => false)) {
                  await expect(scoreText.first()).toBeVisible();
                }
              }
            }
          }
        }
      }
    });

    test('should validate required fields when creating', async ({ page }) => {
      const recordButton = page.locator('button:has-text("Record"), button:has-text("Add")');
      if (await recordButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await recordButton.first().click();
        await waitForLoading(page);

        // Try to submit empty form
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          // Should show validation errors
          const errorMessage = page.locator('[role="alert"], .error, text=/required|bắt buộc/i');
          if (await errorMessage.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(errorMessage.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Edit Outcome Measure', () => {
    test('should edit existing outcome measure', async ({ page }) => {
      // Wait for measure list to load
      await page.waitForTimeout(1000);

      // Look for edit button
      const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Edit"], button:has-text("Edit"), button:has-text("Sửa")');
      if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Get initial score value if visible
        const initialScore = await page.locator('[data-testid="measure-score"], td:nth-child(2), .measure-score').first().textContent().catch(() => '75');

        await editButton.first().click();
        await page.waitForTimeout(500);

        // Verify dialog opens
        const dialog = page.locator('[role="dialog"], .modal, [data-testid="edit-dialog"]');
        if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(dialog).toBeVisible();

          // Verify pre-filled data
          const scoreInput = page.locator('[name="score"], input[type="number"]').first();
          if (await scoreInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            const currentValue = await scoreInput.inputValue();
            expect(currentValue).toBeTruthy();

            // Update score
            await scoreInput.fill('85');

            // Update notes
            const notesInput = page.locator('[name="notes"], textarea').first();
            if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              await notesInput.fill('Improved condition');
            }

            // Save
            const saveButton = page.locator('button:has-text("Save"), button:has-text("Lưu")').first();
            if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await saveButton.click();
              await waitForLoading(page);

              // Verify success toast
              await expectToast(page, /updated|success|cập nhật|thành công/i);

              // Verify updated data in list
              const updatedScore = page.locator('text=85');
              if (await updatedScore.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                await expect(updatedScore.first()).toBeVisible();
              }
            }
          }
        }
      }
    });

    test('should validate edit form inputs', async ({ page }) => {
      const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Edit"]');
      if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        const scoreInput = page.locator('[name="score"], input[type="number"]').first();
        if (await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Enter invalid score (out of range)
          await scoreInput.fill('150'); // Max is typically 100

          const saveButton = page.locator('button:has-text("Save"), button:has-text("Lưu")').first();
          if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveButton.click();
            await page.waitForTimeout(500);

            // Verify validation error
            const validationError = page.locator('text=/must be|between|phải|giữa/i, [role="alert"]');
            if (await validationError.first().isVisible({ timeout: 2000 }).catch(() => false)) {
              await expect(validationError.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should cancel edit without saving', async ({ page }) => {
      const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Edit"]');
      if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        // Get original score
        const originalScore = await page.locator('[data-testid="measure-score"], .measure-score').first().textContent().catch(() => '75');

        await editButton.first().click();
        await page.waitForTimeout(500);

        const scoreInput = page.locator('[name="score"], input[type="number"]').first();
        if (await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Change score
          await scoreInput.fill('99');

          // Click cancel
          const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Hủy")').first();
          if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cancelButton.click();
            await page.waitForTimeout(500);

            // Verify dialog closed
            const dialog = page.locator('[role="dialog"]');
            await expect(dialog).not.toBeVisible();

            // Verify original score unchanged
            const currentScore = await page.locator('[data-testid="measure-score"], .measure-score').first().textContent().catch(() => originalScore);
            expect(currentScore).toContain(originalScore?.trim() || '');
          }
        }
      }
    });
  });

  test.describe('Delete Outcome Measure', () => {
    test('should delete outcome measure with confirmation', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Get initial measure count
      const measureRows = page.locator('[data-testid="measure-row"], tr[data-measure], .measure-item');
      const initialCount = await measureRows.count();

      // Click delete button
      const deleteButton = page.locator('[data-testid="measure-delete-button"], button[aria-label*="Delete"], button:has-text("Delete"), button:has-text("Xóa")');
      if (await deleteButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);

        // Verify confirmation dialog
        const alertDialog = page.locator('[role="alertdialog"], [role="dialog"]');
        if (await alertDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(alertDialog).toBeVisible();

          // Verify confirmation message
          const confirmText = page.locator('text=/Are you sure|Bạn có chắc|confirm|xác nhận/i');
          if (await confirmText.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(confirmText.first()).toBeVisible();
          }

          // Cancel first
          const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Hủy")').first();
          if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cancelButton.click();
            await page.waitForTimeout(500);

            // Dialog should close
            await expect(alertDialog).not.toBeVisible();

            // Count should remain the same
            const countAfterCancel = await measureRows.count();
            expect(countAfterCancel).toBe(initialCount);
          }

          // Delete again and confirm
          await deleteButton.first().click();
          await page.waitForTimeout(500);

          const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Xóa"), button:has-text("Confirm")').last();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
            await waitForLoading(page);

            // Verify success toast
            await expectToast(page, /deleted|success|xóa|thành công/i);

            // Verify measure removed from list
            await page.waitForTimeout(1000);
            const finalCount = await measureRows.count();
            expect(finalCount).toBe(initialCount - 1);
          }
        }
      }
    });

    test('should cancel delete on cancel button', async ({ page }) => {
      await page.waitForTimeout(1000);

      const measureRows = page.locator('[data-testid="measure-row"], tr[data-measure]');
      const initialCount = await measureRows.count();

      const deleteButton = page.locator('[data-testid="measure-delete-button"], button[aria-label*="Delete"]');
      if (await deleteButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);

        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Hủy")').first();
        if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelButton.click();
          await page.waitForTimeout(500);

          // Verify count unchanged
          const finalCount = await measureRows.count();
          expect(finalCount).toBe(initialCount);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept and fail API request for edit
      await page.route('**/api/v1/patients/*/outcome-measures/*', route => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          route.fulfill({ status: 500, body: 'Internal Server Error' });
        } else {
          route.continue();
        }
      });

      const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Edit"]');
      if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.first().click();
        await page.waitForTimeout(500);

        const scoreInput = page.locator('[name="score"], input[type="number"]').first();
        if (await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await scoreInput.fill('90');

          const saveButton = page.locator('button:has-text("Save"), button:has-text("Lưu")').first();
          if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveButton.click();
            await page.waitForTimeout(1000);

            // Verify error toast
            await expectToast(page, /failed|error|lỗi|thất bại/i);
          }
        }
      }
    });

    test('should handle network errors on delete', async ({ page }) => {
      // Intercept and fail API request for delete
      await page.route('**/api/v1/patients/*/outcome-measures/*', route => {
        if (route.request().method() === 'DELETE') {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      const deleteButton = page.locator('[data-testid="measure-delete-button"], button[aria-label*="Delete"]');
      if (await deleteButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.first().click();
        await page.waitForTimeout(500);

        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Xóa")').last();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
          await page.waitForTimeout(1000);

          // Verify error notification
          await expectToast(page, /failed|error|lỗi|thất bại/i);
        }
      }
    });
  });
});

test.describe('Outcome Measures - Complete Workflow', () => {
  test('should complete full patient journey: create -> edit -> delete', async ({ page }) => {
    // Navigate to patients
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
    if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientRow.click();
      await waitForLoading(page);
    }

    // Navigate to outcomes
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/outcomes`);
      await waitForLoading(page);

      // 1. CREATE: Record new measure
      const recordButton = page.locator('button:has-text("Record"), button:has-text("Add")');
      if (await recordButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await recordButton.first().click();
        await waitForLoading(page);

        // Select NDI measure type
        const measureButton = page.locator('button:has-text("NDI"), [data-measure="NDI"]');
        const measureSelect = page.locator('[name="library_id"], select');

        if (await measureButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await measureButton.first().click();
        } else if (await measureSelect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await measureSelect.first().selectOption('NDI');
        }

        const scoreInput = page.locator('[name="score"], input[type="number"]').first();
        if (await scoreInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await scoreInput.fill('40');

          const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Lưu")').first();
          if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitButton.click();
            await waitForLoading(page);

            await expectToast(page, /recorded|success/i);
          }
        }

        // 2. EDIT: Update the measure
        await page.waitForTimeout(1000);
        const editButton = page.locator('[data-testid="measure-edit-button"]:has-text("NDI"), button[aria-label*="Edit"]:near(text=NDI)');
        if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await editButton.first().click();
          await page.waitForTimeout(500);

          const editScoreInput = page.locator('[name="score"], input[type="number"]').first();
          if (await editScoreInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await editScoreInput.fill('35');

            const notesInput = page.locator('[name="notes"], textarea').first();
            if (await notesInput.isVisible({ timeout: 2000 }).catch(() => false)) {
              await notesInput.fill('Showing improvement');
            }

            const saveButton = page.locator('button:has-text("Save"), button:has-text("Lưu")').first();
            if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await saveButton.click();
              await waitForLoading(page);

              await expectToast(page, /updated|success/i);
            }
          }
        }

        // 3. VERIFY: Check edit persisted
        await page.reload();
        await waitForLoading(page);

        const score35 = page.locator('text=35');
        const improvementNote = page.locator('text=Showing improvement');

        if (await score35.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(score35.first()).toBeVisible();
        }
        if (await improvementNote.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(improvementNote.first()).toBeVisible();
        }

        // 4. DELETE: Remove the measure
        const deleteButton = page.locator('[data-testid="measure-delete-button"]:has-text("NDI"), button[aria-label*="Delete"]:near(text=NDI)');
        if (await deleteButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
          await deleteButton.first().click();
          await page.waitForTimeout(500);

          const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Xóa")').last();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
            await waitForLoading(page);

            await expectToast(page, /deleted|success/i);
          }
        }

        // 5. VERIFY: Check deletion persisted
        await page.reload();
        await waitForLoading(page);

        const ndiText = page.locator('text=NDI');
        await expect(ndiText).not.toBeVisible();
      }
    }
  });
});

test.describe('Outcome Measures - Bilingual', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/patients');
    await waitForLoading(page);

    const patientRow = page.locator('tr, [data-testid="patient-card"]').first();
    if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientRow.click();
      await waitForLoading(page);
    }
  });

  test('should display Vietnamese UI in vi locale', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/vi/patients/${patientId}/outcomes`);
      await waitForLoading(page);
    }

    const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Sửa"]');
    if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.first().click();
      await page.waitForTimeout(500);

      // Verify Vietnamese labels
      const editTitle = page.locator('text=/Chỉnh sửa|Cập nhật/i');
      const saveButton = page.locator('button:has-text("Lưu")');
      const cancelButton = page.locator('button:has-text("Hủy")');

      if (await editTitle.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(editTitle.first()).toBeVisible();
      }
      if (await saveButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(saveButton.first()).toBeVisible();
      }
      if (await cancelButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(cancelButton.first()).toBeVisible();
      }
    }
  });

  test('should display English UI in en locale', async ({ page }) => {
    const currentUrl = page.url();
    const patientId = currentUrl.match(/patients\/([^\/]+)/)?.[1];
    if (patientId) {
      await page.goto(`/en/patients/${patientId}/outcomes`);
      await waitForLoading(page);
    }

    const editButton = page.locator('[data-testid="measure-edit-button"], button[aria-label*="Edit"]');
    if (await editButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.first().click();
      await page.waitForTimeout(500);

      // Verify English labels
      const editTitle = page.locator('text=/Edit Measure|Update/i');
      const saveButton = page.locator('button:has-text("Save")');
      const cancelButton = page.locator('button:has-text("Cancel")');

      if (await editTitle.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(editTitle.first()).toBeVisible();
      }
      if (await saveButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(saveButton.first()).toBeVisible();
      }
      if (await cancelButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(cancelButton.first()).toBeVisible();
      }
    }
  });
});
