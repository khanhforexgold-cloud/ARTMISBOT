
# ARTEMIS bản Postgres

## Có gì khác
- Không dùng file JSON để lưu nội dung nữa
- Tín hiệu và gói giá lưu trong Postgres
- Không bị tự quay về dữ liệu cũ khi service restart hoặc ngủ

## Cần biến môi trường
- `ADMIN_PASSWORD`
- `DATABASE_URL`

## Chạy local
```bash
npm install
npm start
```

## Deploy trên Render
1. Tạo PostgreSQL database trên Render
2. Copy `Internal Database URL` hoặc `External Database URL`
3. Dán vào biến môi trường `DATABASE_URL`
4. Thêm `ADMIN_PASSWORD`
5. Deploy lại service

## Truy cập
- `/` web chính
- `/admin.html` admin
- `/api/packages`
- `/api/signals`
