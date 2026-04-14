# Artemis Affiliate Backend

Backend Node.js + Express + PostgreSQL cho hệ thống:
- đăng ký / đăng nhập
- link affiliate / ref code
- ví hoa hồng
- admin chỉnh % hoa hồng
- cộng trừ hoa hồng thủ công
- rút tiền thủ công

## 1) Cài đặt

```bash
npm install
cp .env.example .env
```

Sửa file `.env`:

```env
PORT=4000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=doi_secret_that_dai_va_kho_doan
APP_BASE_URL=https://artemisbot.com
DEFAULT_COMMISSION_TYPE=percent
DEFAULT_COMMISSION_VALUE=20
MIN_WITHDRAW_AMOUNT=500000
```

## 2) Tạo database

Chạy file `sql/001_init.sql` trước.

File `sql/002_seed_admin.sql` chỉ dùng khi bạn đã thay `password_hash` bằng bcrypt hash thật của mật khẩu admin.

## 3) Chạy local

```bash
npm run dev
```

Health check:

```bash
GET /health
```

## 4) API chính

### Auth
- `POST /api/register`
- `POST /api/login`
- `GET /api/me`

### Affiliate
- `GET /api/affiliate/profile`
- `GET /api/affiliate/stats`
- `GET /api/affiliate/commissions`

### Wallet
- `GET /api/wallet`

### Withdraw
- `POST /api/withdraw`
- `GET /api/withdraw/history`

### Admin
- `GET /api/admin/users`
- `POST /api/admin/commission/add`
- `POST /api/admin/commission/approve`
- `POST /api/admin/commission/reject`
- `POST /api/admin/affiliate/update-rate`
- `GET /api/admin/withdraws`
- `POST /api/admin/withdraw/approve`
- `POST /api/admin/withdraw/reject`
- `POST /api/admin/withdraw/pay`

## 5) Mẫu request nhanh

### Đăng ký có ref
```json
{
  "name": "Nguyen Van A",
  "email": "a@gmail.com",
  "phone": "0900000000",
  "password": "12345678",
  "ref": "ARTADMIN"
}
```

### Admin cộng hoa hồng thủ công
```json
{
  "user_id": 2,
  "source_user_id": 5,
  "amount": 200000,
  "note": "Hoa hồng đơn gói Pro tháng 4",
  "auto_approve": false
}
```

### Admin chỉnh % hoa hồng
```json
{
  "user_id": 2,
  "commission_type": "percent",
  "commission_value": 25,
  "status": "active"
}
```

### User gửi yêu cầu rút
```json
{
  "amount": 500000,
  "bank_name": "MB Bank",
  "bank_account_name": "NGUYEN HOANG DUONG",
  "bank_account_number": "123456789"
}
```

## 6) Cách ghép với web hiện tại

Frontend có thể gọi các API này để dựng các trang:
- `/register`
- `/login`
- `/dashboard`
- `/affiliate`
- `/wallet`
- `/withdraw`
- `/admin/affiliates`
- `/admin/withdrawals`

## 7) Lưu ý quan trọng
- Đây là backend MVP production-ready ở mức khởi đầu.
- File `sql/002_seed_admin.sql` đang để placeholder cho `password_hash`, bạn cần thay bằng bcrypt hash thật trước khi chạy.
- Chưa có reset password, email verify, rate limit, audit log, file upload chứng từ.
- Nên thêm rate limit + captcha + log admin trước khi chạy traffic lớn.
- Nên ẩn route admin phía frontend và kiểm tra role bằng token.
