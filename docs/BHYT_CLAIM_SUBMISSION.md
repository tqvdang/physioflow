# BHYT Claim Submission (Ho So XML)

## Overview

PhysioFlow generates XML claim files for submission to VSS (Vietnam Social Security / Bao Hiem Xa Hoi) per **Decision 5937/QD-BHXH**. This enables automated insurance reimbursement for BHYT-covered physical therapy services.

## VSS XML Format

### File Naming Convention

```
HS_<facility_code>_<MM><YYYY>.xml
```

Examples:
- `HS_12345_022026.xml` (Facility 12345, February 2026)
- `HS_67890_122025.xml` (Facility 67890, December 2025)

### XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<HoSoXML>
  <ThongTinHoSo>
    <MaCSKCB>12345</MaCSKCB>           <!-- Facility code -->
    <Thang>2</Thang>                     <!-- Month -->
    <Nam>2026</Nam>                      <!-- Year -->
    <SoHoSo>15</SoHoSo>                 <!-- Number of patient records -->
    <TongTien>5250000</TongTien>         <!-- Total amount (VND) -->
    <TongBHYT>4200000</TongBHYT>         <!-- Total BHYT pays -->
    <TongBNTT>1050000</TongBNTT>         <!-- Total patient pays -->
  </ThongTinHoSo>
  <DanhSachHoSo>
    <HoSoBenhNhan>
      <BenhNhan>
        <MaBN>patient-uuid</MaBN>        <!-- Patient ID -->
        <MaThe>HC1501234567890</MaThe>   <!-- BHYT card number -->
        <TenBN>Nguyen Van A</TenBN>      <!-- Patient name -->
      </BenhNhan>
      <ChiTietDichVu>
        <Ma>PT001</Ma>                   <!-- Service code -->
        <TenDV>Danh gia va tai danh gia toan dien</TenDV>
        <SoLuong>1</SoLuong>            <!-- Quantity -->
        <DonGia>150000</DonGia>          <!-- Unit price (VND) -->
        <ThanhTien>150000</ThanhTien>    <!-- Total price -->
        <BHYTThanhToan>120000</BHYTThanhToan>  <!-- Insurance pays -->
        <BNThanhToan>30000</BNThanhToan>       <!-- Patient pays -->
        <NgayDV>10/02/2026</NgayDV>      <!-- Service date (DD/MM/YYYY) -->
      </ChiTietDichVu>
    </HoSoBenhNhan>
  </DanhSachHoSo>
</HoSoXML>
```

### Field Descriptions

| XML Element | Vietnamese | Description |
|-------------|-----------|-------------|
| `MaCSKCB` | Ma co so kham chua benh | Healthcare facility code |
| `Thang` | Thang | Billing month (1-12) |
| `Nam` | Nam | Billing year |
| `SoHoSo` | So ho so | Number of patient records |
| `TongTien` | Tong tien | Total amount in VND |
| `TongBHYT` | Tong BHYT | Total BHYT reimbursement |
| `TongBNTT` | Tong benh nhan thanh toan | Total patient copay |
| `MaBN` | Ma benh nhan | Patient identifier |
| `MaThe` | Ma the | BHYT card number |
| `TenBN` | Ten benh nhan | Patient full name |
| `Ma` | Ma dich vu | Service code |
| `TenDV` | Ten dich vu | Service name (Vietnamese) |
| `SoLuong` | So luong | Quantity |
| `DonGia` | Don gia | Unit price in VND |
| `ThanhTien` | Thanh tien | Total price in VND |
| `BHYTThanhToan` | BHYT thanh toan | Insurance payment |
| `BNThanhToan` | Benh nhan thanh toan | Patient payment |
| `NgayDV` | Ngay dich vu | Service date (DD/MM/YYYY) |

## API Endpoints

### Generate Claim

```http
POST /api/v1/billing/claims/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "facility_code": "12345",
  "month": 2,
  "year": 2026
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "facility_code": "12345",
  "month": 2,
  "year": 2026,
  "file_name": "HS_12345_022026.xml",
  "status": "pending",
  "total_amount": 5250000,
  "total_insurance_amount": 4200000,
  "total_patient_amount": 1050000,
  "line_item_count": 15,
  "line_items": [...]
}
```

### Download Claim XML

```http
GET /api/v1/billing/claims/:id/download
Authorization: Bearer <token>
```

Returns the XML file with `Content-Disposition: attachment` header.

### List Claims

```http
GET /api/v1/billing/claims?status=pending&year=2026&page=1&per_page=20
Authorization: Bearer <token>
```

### Claim Status Flow

```
pending --> submitted --> approved
                     \--> rejected
```

- **pending**: Claim generated, not yet submitted to VSS
- **submitted**: Claim file uploaded to VSS portal
- **approved**: VSS approved the claim for reimbursement
- **rejected**: VSS rejected the claim (see `rejection_reason`)

## Submission Workflow

### Step 1: Generate Claim

1. Navigate to **Billing > BHYT Claims**
2. Click **Generate Claim**
3. Enter:
   - **Facility Code**: Your healthcare facility registration code
   - **Month**: The billing period month
   - **Year**: The billing period year
4. Click **Generate**

The system will:
- Query all BHYT-covered invoices for the period
- Group services by patient
- Build the VSS XML structure
- Store the claim record with line items

### Step 2: Download XML

1. Find the generated claim in the claims list
2. Click the **Download** button
3. Save the XML file

### Step 3: Submit to VSS

1. Log in to the VSS portal (https://gdbhyt.baohiemxahoi.gov.vn)
2. Navigate to the claim submission section
3. Upload the generated XML file
4. Update the claim status in PhysioFlow to "submitted"

### Step 4: Track Status

Monitor claim status in PhysioFlow. Update status when VSS responds:
- **Approved**: Reimbursement will be processed
- **Rejected**: Review rejection reason and resubmit if needed

## Database Schema

### bhyt_claims

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| clinic_id | UUID | Clinic reference |
| facility_code | VARCHAR(20) | Healthcare facility code |
| month | INTEGER | Billing month (1-12) |
| year | INTEGER | Billing year |
| file_path | TEXT | Storage path for XML file |
| file_name | VARCHAR(255) | Generated file name |
| status | VARCHAR(20) | pending/submitted/approved/rejected |
| total_amount | NUMERIC(15,0) | Total amount in VND |
| total_insurance_amount | NUMERIC(15,0) | BHYT reimbursement |
| total_patient_amount | NUMERIC(15,0) | Patient copay |
| line_item_count | INTEGER | Number of line items |

### bhyt_claim_line_items

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| claim_id | UUID | Parent claim reference |
| invoice_id | UUID | Source invoice |
| patient_id | UUID | Patient reference |
| patient_name | VARCHAR(200) | Patient full name |
| bhyt_card_number | VARCHAR(15) | BHYT card number |
| service_code | VARCHAR(20) | PT service code |
| service_name_vi | VARCHAR(200) | Service name (Vietnamese) |
| quantity | INTEGER | Service quantity |
| unit_price | NUMERIC(15,0) | Unit price in VND |
| total_price | NUMERIC(15,0) | Total price |
| insurance_paid | NUMERIC(15,0) | Insurance amount |
| patient_paid | NUMERIC(15,0) | Patient copay |
| service_date | DATE | Date service was provided |

## Roles and Permissions

Only the following roles can generate and manage claims:
- `clinic_admin`
- `front_desk`
- `super_admin`

Therapists can view billing data but cannot generate claim files.

## Legal Reference

- **Decision 5937/QD-BHXH**: Regulations on electronic claim submission format
- **Circular 39/2018/TT-BYT**: Healthcare service fee schedule
- **Law on Health Insurance (No. 25/2008/QH12)**: BHYT coverage rules
