-- Khuyến nghị: tạo admin bằng API register rồi sửa role = 'admin'.
-- Nếu muốn seed trực tiếp, hãy thay password_hash bên dưới bằng bcrypt hash của mật khẩu bạn chọn.
-- Có thể tạo hash bằng trang/dev tool hoặc script Node.js dùng bcryptjs.

INSERT INTO users (name, email, phone, password_hash, role)
VALUES (
  'Artemis Admin',
  'admin@artemisbot.com',
  '0000000000',
  '$2a$10$replace_this_with_your_real_bcrypt_hash',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO affiliate_profiles (user_id, ref_code, commission_type, commission_value, status)
SELECT id, 'ARTADMIN', 'percent', 20, 'active'
FROM users
WHERE email = 'admin@artemisbot.com'
ON CONFLICT (ref_code) DO NOTHING;

INSERT INTO wallets (user_id, pending_balance, available_balance, total_earned, total_withdrawn)
SELECT id, 0, 0, 0, 0
FROM users
WHERE email = 'admin@artemisbot.com'
ON CONFLICT (user_id) DO NOTHING;
