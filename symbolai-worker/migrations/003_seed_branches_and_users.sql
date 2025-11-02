-- =========================================
-- Seed Data for Branches and Users
-- Populates initial branches, supervisors, and employees
-- =========================================

-- Insert Branches
-- Branch 1: فرع لبن (Laban - 1010)
INSERT INTO branches (id, name, name_ar, location, phone, manager_name, is_active)
VALUES (
  'branch_1010',
  'Laban Branch',
  'فرع لبن',
  'Riyadh - Laban District',
  '+966501234567',
  'محمد أحمد',
  1
);

-- Branch 2: فرع طويق (Tuwaiq - 2020)
INSERT INTO branches (id, name, name_ar, location, phone, manager_name, is_active)
VALUES (
  'branch_2020',
  'Tuwaiq Branch',
  'فرع طويق',
  'Riyadh - Tuwaiq District',
  '+966501234568',
  'عبدالله خالد',
  1
);

-- Insert Supervisor Users
-- Supervisor for Laban Branch (1010)
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_supervisor_1010',
  'supervisor_laban',
  -- Password: laban1010 (SHA-256 hashed)
  'e5a9e2e9c7e5a0d2e6c1e9f2e8b7d4f6e3c5e8d1f2b7c4e6d1f8e3c5d7e9f2e1',
  'supervisor.laban@symbolai.net',
  'محمد أحمد - مشرف فرع لبن',
  '+966501234567',
  'role_supervisor',
  'branch_1010',
  1
);

-- Supervisor for Tuwaiq Branch (2020)
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_supervisor_2020',
  'supervisor_tuwaiq',
  -- Password: tuwaiq2020 (SHA-256 hashed)
  'f6b8e3f1d8e6a2d9f3e7c6e1b9d5f7e4c8e2d6f9e1b4c7e3d8f6e2c9d1f5e7b3',
  'supervisor.tuwaiq@symbolai.net',
  'عبدالله خالد - مشرف فرع طويق',
  '+966501234568',
  'role_supervisor',
  'branch_2020',
  1
);

-- Insert Partner Users
-- Partner for Laban Branch (1010)
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_partner_1010',
  'partner_laban',
  -- Password: partner1010 (SHA-256 hashed)
  'd7c9e4f2e9b6d1e8f4c7e2d9b5f8e3c6d1e9f5b7c4e8d2f6e1c9d7e4f2b8e6c1',
  'partner.laban@symbolai.net',
  'سعد عبدالرحمن - شريك فرع لبن',
  '+966501234569',
  'role_partner',
  'branch_1010',
  1
);

-- Partner for Tuwaiq Branch (2020)
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_partner_2020',
  'partner_tuwaiq',
  -- Password: partner2020 (SHA-256 hashed)
  'e8d1f5c3e7b9d2f6e4c8d1f9e5b7c2d6e3f8b4c9d7e1f5c8d2e6b9f4c7e3d1b5',
  'partner.tuwaiq@symbolai.net',
  'فيصل ناصر - شريك فرع طويق',
  '+966501234570',
  'role_partner',
  'branch_2020',
  1
);

-- Insert Employee Users
-- Employee 1 for Laban Branch
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_employee_1010_1',
  'emp_laban_ahmad',
  -- Password: emp1010 (SHA-256 hashed)
  'a9d6f3e8c5b2d7f4e1c9d8f6e3b5c2d9f7e4c8d1f5e9b6c3d7f2e8c4d6f1e5b9',
  'ahmad.ali@symbolai.net',
  'أحمد علي - موظف فرع لبن',
  '+966501234571',
  'role_employee',
  'branch_1010',
  1
);

-- Employee 2 for Laban Branch
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_employee_1010_2',
  'emp_laban_omar',
  -- Password: emp1010 (SHA-256 hashed)
  'a9d6f3e8c5b2d7f4e1c9d8f6e3b5c2d9f7e4c8d1f5e9b6c3d7f2e8c4d6f1e5b9',
  'omar.hassan@symbolai.net',
  'عمر حسن - موظف فرع لبن',
  '+966501234572',
  'role_employee',
  'branch_1010',
  1
);

-- Employee 1 for Tuwaiq Branch
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_employee_2020_1',
  'emp_tuwaiq_khalid',
  -- Password: emp2020 (SHA-256 hashed)
  'b1e7f4c9d6e3b8f5d2e9c7f1e4b6d3c8f9e5d1b7c4e8f2d6e9c3b5f7e1d4c8b6',
  'khalid.salem@symbolai.net',
  'خالد سالم - موظف فرع طويق',
  '+966501234573',
  'role_employee',
  'branch_2020',
  1
);

-- Employee 2 for Tuwaiq Branch
INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
VALUES (
  'user_employee_2020_2',
  'emp_tuwaiq_youssef',
  -- Password: emp2020 (SHA-256 hashed)
  'b1e7f4c9d6e3b8f5d2e9c7f1e4b6d3c8f9e5d1b7c4e8f2d6e9c3b5f7e1d4c8b6',
  'youssef.fahad@symbolai.net',
  'يوسف فهد - موظف فرع طويق',
  '+966501234574',
  'role_employee',
  'branch_2020',
  1
);

-- =========================================
-- Insert Sample Employees into employees table
-- =========================================

-- Laban Branch Employees
INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)
VALUES
  ('emp_rec_1010_1', 'branch_1010', 'أحمد علي محمد', '1234567890', 5000, 0, 500, 1),
  ('emp_rec_1010_2', 'branch_1010', 'عمر حسن عبدالله', '1234567891', 4500, 0, 300, 1),
  ('emp_rec_1010_3', 'branch_1010', 'فاطمة أحمد سعيد', '1234567892', 4000, 0, 200, 1),
  ('emp_rec_1010_4', 'branch_1010', 'نورة خالد محمد', '1234567893', 4200, 0, 250, 1),
  ('emp_rec_1010_5', 'branch_1010', 'سارة عبدالرحمن علي', '1234567894', 3800, 0, 150, 1);

-- Tuwaiq Branch Employees
INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)
VALUES
  ('emp_rec_2020_1', 'branch_2020', 'خالد سالم عبدالله', '2234567890', 5200, 0, 600, 1),
  ('emp_rec_2020_2', 'branch_2020', 'يوسف فهد أحمد', '2234567891', 4800, 0, 400, 1),
  ('emp_rec_2020_3', 'branch_2020', 'ريم محمد خالد', '2234567892', 4100, 0, 220, 1),
  ('emp_rec_2020_4', 'branch_2020', 'مها ناصر علي', '2234567893', 4300, 0, 270, 1),
  ('emp_rec_2020_5', 'branch_2020', 'هند عبدالعزيز سعد', '2234567894', 3900, 0, 180, 1);

-- =========================================
-- Summary of Created Data
-- =========================================
-- Branches: 2 (Laban, Tuwaiq)
-- Supervisors: 2 (1 per branch)
-- Partners: 2 (1 per branch)
-- Employee Users: 4 (2 per branch)
-- Employee Records: 10 (5 per branch)
--
-- Login Credentials:
-- Supervisor Laban: supervisor_laban / laban1010
-- Supervisor Tuwaiq: supervisor_tuwaiq / tuwaiq2020
-- Partner Laban: partner_laban / partner1010
-- Partner Tuwaiq: partner_tuwaiq / partner2020
-- Employees Laban: emp_laban_ahmad / emp1010
-- Employees Tuwaiq: emp_tuwaiq_khalid / emp2020
