# User Guide: Outcome Measures / Hướng dẫn: Công cụ Đánh giá Kết quả

## English

### Overview

The Outcome Measures feature helps you track patient progress using standardized clinical assessment tools. PhysioFlow includes 8 validated outcome measures commonly used in Vietnamese physical therapy practice.

These tools help you:
- Objectively measure patient improvement over time
- Identify when progress is clinically meaningful (MCID)
- Visualize trends with progress charts
- Make data-driven treatment decisions
- Document outcomes for discharge summaries

### Available Outcome Measures

PhysioFlow supports 8 standardized measures:

| Measure | What it measures | Score Range | Lower is Better |
|---------|------------------|-------------|-----------------|
| **VAS** - Visual Analog Scale | Pain intensity | 0-10 | Yes |
| **NDI** - Neck Disability Index | Neck pain impact on daily activities | 0-50 | Yes |
| **ODI** - Oswestry Disability Index | Low back pain disability | 0-100 | Yes |
| **LEFS** - Lower Extremity Functional Scale | Lower limb function | 0-80 | No |
| **DASH** - Disabilities of Arm, Shoulder, Hand | Upper limb disability | 0-100 | Yes |
| **QuickDASH** - Quick DASH (shortened) | Upper limb disability (short form) | 0-100 | Yes |
| **PSFS** - Patient-Specific Functional Scale | Patient-specific functional goals | 0-10 | No |
| **FIM** - Functional Independence Measure | Overall functional independence | 18-126 | No |

### Recording a New Measure

**Step 1: Navigate to Patient Profile**
1. Go to **Patients** page
2. Click on the patient name
3. Select the **Outcomes** tab

**Step 2: Record Measurement**
1. Click **Record Measure** button
2. Select the outcome measure type from the dropdown (e.g., NDI, VAS, ODI)
3. Enter the patient's score
4. (Optional) Add notes about the assessment
5. (Optional) Link to a treatment session
6. Click **Save**

**Example**:
```
Patient: Nguyễn Văn A
Measure: NDI (Neck Disability Index)
Score: 20 out of 50
Notes: Patient reports significant improvement in neck pain during daily activities
```

The system will automatically:
- Calculate the percentage score (20/50 = 40%)
- Determine severity level (Moderate disability)
- Track this as a new data point for progress trending

### Editing an Existing Measure

If you need to correct a measurement or add notes:

1. Navigate to the patient's **Outcomes** tab
2. Find the measure in the list
3. Click the **Edit** button (pencil icon)
4. Update the score or notes
5. Click **Save**

**Important**: The system uses optimistic locking to prevent conflicts. If someone else edited the same measure while you were working, you'll see a warning and need to reload the latest version.

### Deleting a Measure

To remove an incorrect measurement:

1. Navigate to the patient's **Outcomes** tab
2. Find the measure in the list
3. Click the **Delete** button (trash icon)
4. Confirm deletion

**Warning**: Deleting a measurement is permanent and cannot be undone. This action will also affect progress charts if it was the baseline measurement.

### Viewing Progress Charts

Progress charts show how the patient is improving over time.

**To view a progress chart**:
1. Navigate to the patient's **Outcomes** tab
2. Click on any measure type (e.g., "NDI", "VAS")
3. The chart will display:
   - **Blue line**: Patient's scores over time
   - **Orange dashed line**: Baseline (first measurement)
   - **Green dashed line**: Target goal (if set)
   - **Red dashed line**: MCID threshold

**Reading the chart**:
- **Upward trend** (for measures where higher is better): Patient is improving
- **Downward trend** (for measures where lower is better): Patient is improving
- **Flat trend**: No significant change

### Understanding MCID (Minimal Clinically Important Difference)

MCID tells you if progress is meaningful to the patient, not just a number change.

**What is MCID?**

MCID is the smallest change in a score that patients perceive as beneficial. For example, NDI has an MCID of 7.5 points.

**Example**:
```
Baseline NDI: 30 (severe disability)
Current NDI: 25 (moderate disability)
Change: 30 - 25 = 5 points

MCID for NDI: 7.5 points
MCID Met? 5 < 7.5 → No

Interpretation: While the score improved, the change may not be meaningful enough for the patient to notice a difference in daily life.
```

**When MCID is met**, you'll see a green checkmark (✓) indicating clinically significant improvement.

### Troubleshooting Common Issues

#### "Version conflict" error when saving

**Cause**: Another user edited the same measure while you were working on it.

**Solution**:
1. Click **Reload** to see the latest version
2. Re-apply your changes
3. Save again

#### Progress chart shows "No data available"

**Cause**: Patient needs at least 2 measurements for progress tracking.

**Solution**:
1. Record the first measurement (this becomes the baseline)
2. Record a second measurement after treatment
3. The chart will now display

#### Measure not showing in list

**Cause**: You may be viewing offline data, or the measure hasn't synced yet.

**Solution**:
1. Check your internet connection
2. Look for the offline banner at the top of the screen
3. Wait for sync to complete (you'll see a green "Synced" indicator)

#### Offline mode - can I still record measures?

**Yes!** PhysioFlow works offline.

**What happens**:
1. Record measures normally while offline
2. You'll see an "Offline" banner at the top
3. Measures are saved locally on your device
4. When you reconnect, they automatically sync to the server
5. You'll see a "Syncing..." indicator, then "Synced" when complete

**Limitation**: You cannot view other users' changes until you're back online.

---

## Tiếng Việt

### Tổng quan

Tính năng Công cụ Đánh giá Kết quả giúp bạn theo dõi tiến triển của bệnh nhân bằng các công cụ đánh giá lâm sàng được tiêu chuẩn hóa. PhysioFlow bao gồm 8 công cụ đánh giá được xác thực, thường được sử dụng trong thực hành vật lý trị liệu tại Việt Nam.

Các công cụ này giúp bạn:
- Đo lường khách quan sự cải thiện của bệnh nhân theo thời gian
- Xác định khi nào tiến triển có ý nghĩa lâm sàng (MCID)
- Trực quan hóa xu hướng với biểu đồ tiến triển
- Đưa ra quyết định điều trị dựa trên dữ liệu
- Ghi chép kết quả cho bản tóm tắt xuất viện

### Các Công cụ Đánh giá Có sẵn

PhysioFlow hỗ trợ 8 công cụ đo lường được tiêu chuẩn hóa:

| Công cụ | Đánh giá gì | Thang điểm | Thấp hơn là tốt hơn |
|---------|-------------|------------|---------------------|
| **VAS** - Thang đo đau VAS | Cường độ đau | 0-10 | Có |
| **NDI** - Chỉ số khuyết tật cổ | Ảnh hưởng của đau cổ đến hoạt động hàng ngày | 0-50 | Có |
| **ODI** - Chỉ số khuyết tật Oswestry | Khuyết tật do đau thắt lưng | 0-100 | Có |
| **LEFS** - Thang chức năng chi dưới | Chức năng chi dưới | 0-80 | Không |
| **DASH** - Chỉ số khuyết tật tay-vai-cẳng tay | Khuyết tật chi trên | 0-100 | Có |
| **QuickDASH** - DASH rút gọn | Khuyết tật chi trên (dạng ngắn) | 0-100 | Có |
| **PSFS** - Thang chức năng đặc hiệu | Mục tiêu chức năng đặc hiệu của bệnh nhân | 0-10 | Không |
| **FIM** - Thang độc lập chức năng | Độc lập chức năng tổng thể | 18-126 | Không |

### Ghi nhận Kết quả Đánh giá Mới

**Bước 1: Điều hướng đến Hồ sơ Bệnh nhân**
1. Đi đến trang **Bệnh nhân**
2. Nhấp vào tên bệnh nhân
3. Chọn tab **Kết quả Đánh giá**

**Bước 2: Ghi nhận Kết quả Đo lường**
1. Nhấp nút **Ghi nhận Kết quả**
2. Chọn loại công cụ đánh giá kết quả từ menu thả xuống (ví dụ: NDI, VAS, ODI)
3. Nhập điểm số của bệnh nhân
4. (Tùy chọn) Thêm ghi chú về đánh giá
5. (Tùy chọn) Liên kết với buổi điều trị
6. Nhấp **Lưu**

**Ví dụ**:
```
Bệnh nhân: Nguyễn Văn A
Công cụ: NDI (Chỉ số khuyết tật cổ)
Điểm: 20 trên 50
Ghi chú: Bệnh nhân báo cáo cải thiện đáng kể trong đau cổ khi thực hiện hoạt động hàng ngày
```

Hệ thống sẽ tự động:
- Tính phần trăm điểm số (20/50 = 40%)
- Xác định mức độ nghiêm trọng (Khuyết tật trung bình)
- Theo dõi đây là điểm dữ liệu mới để theo dõi tiến triển

### Chỉnh sửa Kết quả Đánh giá Hiện có

Nếu bạn cần sửa một kết quả đo lường hoặc thêm ghi chú:

1. Điều hướng đến tab **Kết quả Đánh giá** của bệnh nhân
2. Tìm kết quả đo lường trong danh sách
3. Nhấp nút **Chỉnh sửa** (biểu tượng bút chì)
4. Cập nhật điểm số hoặc ghi chú
5. Nhấp **Lưu**

**Quan trọng**: Hệ thống sử dụng khóa lạc quan để ngăn chặn xung đột. Nếu người khác đã chỉnh sửa cùng một kết quả đo lường trong khi bạn đang làm việc, bạn sẽ thấy cảnh báo và cần tải lại phiên bản mới nhất.

### Xóa Kết quả Đánh giá

Để loại bỏ một kết quả đo lường không chính xác:

1. Điều hướng đến tab **Kết quả Đánh giá** của bệnh nhân
2. Tìm kết quả đo lường trong danh sách
3. Nhấp nút **Xóa** (biểu tượng thùng rác)
4. Xác nhận xóa

**Cảnh báo**: Xóa một kết quả đo lường là vĩnh viễn và không thể hoàn tác. Hành động này cũng sẽ ảnh hưởng đến biểu đồ tiến triển nếu đó là kết quả đo lường cơ sở.

### Xem Biểu đồ Tiến triển

Biểu đồ tiến triển cho thấy bệnh nhân đang cải thiện như thế nào theo thời gian.

**Để xem biểu đồ tiến triển**:
1. Điều hướng đến tab **Kết quả Đánh giá** của bệnh nhân
2. Nhấp vào bất kỳ loại công cụ đo lường nào (ví dụ: "NDI", "VAS")
3. Biểu đồ sẽ hiển thị:
   - **Đường màu xanh lam**: Điểm số của bệnh nhân theo thời gian
   - **Đường nét đứt màu cam**: Cơ sở (kết quả đo lường đầu tiên)
   - **Đường nét đứt màu xanh lá**: Mục tiêu (nếu đã đặt)
   - **Đường nét đứt màu đỏ**: Ngưỡng MCID

**Đọc biểu đồ**:
- **Xu hướng đi lên** (đối với các công cụ đo lường mà cao hơn là tốt hơn): Bệnh nhân đang cải thiện
- **Xu hướng đi xuống** (đối với các công cụ đo lường mà thấp hơn là tốt hơn): Bệnh nhân đang cải thiện
- **Xu hướng phẳng**: Không có thay đổi đáng kể

### Hiểu về MCID (Sự khác biệt Quan trọng Tối thiểu về Lâm sàng)

MCID cho bạn biết liệu tiến triển có ý nghĩa đối với bệnh nhân, không chỉ là một sự thay đổi về con số.

**MCID là gì?**

MCID là sự thay đổi nhỏ nhất trong điểm số mà bệnh nhân cảm nhận là có lợi. Ví dụ, NDI có MCID là 7,5 điểm.

**Ví dụ**:
```
NDI cơ sở: 30 (khuyết tật nghiêm trọng)
NDI hiện tại: 25 (khuyết tật trung bình)
Thay đổi: 30 - 25 = 5 điểm

MCID cho NDI: 7,5 điểm
Đạt MCID? 5 < 7,5 → Không

Diễn giải: Mặc dù điểm số cải thiện, sự thay đổi có thể không đủ ý nghĩa để bệnh nhân nhận thấy sự khác biệt trong cuộc sống hàng ngày.
```

**Khi MCID được đạt**, bạn sẽ thấy dấu kiểm màu xanh lá (✓) cho thấy sự cải thiện có ý nghĩa lâm sàng.

### Khắc phục Các Vấn đề Thường gặp

#### Lỗi "Xung đột phiên bản" khi lưu

**Nguyên nhân**: Người dùng khác đã chỉnh sửa cùng một kết quả đo lường trong khi bạn đang làm việc.

**Giải pháp**:
1. Nhấp **Tải lại** để xem phiên bản mới nhất
2. Áp dụng lại các thay đổi của bạn
3. Lưu lại

#### Biểu đồ tiến triển hiển thị "Không có dữ liệu"

**Nguyên nhân**: Bệnh nhân cần ít nhất 2 kết quả đo lường để theo dõi tiến triển.

**Giải pháp**:
1. Ghi nhận kết quả đo lường đầu tiên (đây trở thành cơ sở)
2. Ghi nhận kết quả đo lường thứ hai sau điều trị
3. Biểu đồ bây giờ sẽ hiển thị

#### Kết quả đo lường không hiển thị trong danh sách

**Nguyên nhân**: Bạn có thể đang xem dữ liệu ngoại tuyến hoặc kết quả đo lường chưa đồng bộ.

**Giải pháp**:
1. Kiểm tra kết nối internet của bạn
2. Tìm biểu ngữ ngoại tuyến ở đầu màn hình
3. Đợi đồng bộ hoàn tất (bạn sẽ thấy chỉ báo "Đã đồng bộ" màu xanh lá)

#### Chế độ ngoại tuyến - tôi có thể ghi nhận kết quả đo lường không?

**Có!** PhysioFlow hoạt động ngoại tuyến.

**Điều gì xảy ra**:
1. Ghi nhận kết quả đo lường bình thường khi ngoại tuyến
2. Bạn sẽ thấy biểu ngữ "Ngoại tuyến" ở đầu
3. Kết quả đo lường được lưu cục bộ trên thiết bị của bạn
4. Khi bạn kết nối lại, chúng tự động đồng bộ với máy chủ
5. Bạn sẽ thấy chỉ báo "Đang đồng bộ...", sau đó "Đã đồng bộ" khi hoàn tất

**Hạn chế**: Bạn không thể xem các thay đổi của người dùng khác cho đến khi bạn trực tuyến trở lại.

---

## Screenshots Reference

The following screenshot placeholders should be created:

- `./images/outcome-measures-record.png` - Recording a new measure form
- `./images/outcome-measures-list.png` - List of all measures for a patient
- `./images/outcome-measures-progress-chart.png` - Progress chart showing trend with MCID
- `./images/outcome-measures-edit.png` - Edit measure dialog
- `./images/outcome-measures-mcid-indicator.png` - MCID met indicator on chart
- `./images/outcome-measures-offline.png` - Offline banner when recording measures
