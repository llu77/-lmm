#!/bin/bash

# Apply Database Updates
# This script applies all necessary migrations to update:
# 1. Admin password to Omar101010
# 2. Supervisor names (Tuwaiq: محمد إسماعيل, Laban: عبدالحي جلال)

echo "╔════════════════════════════════════════════════════╗"
echo "║     Applying Database Updates                      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install -g wrangler
fi

echo "📝 Step 1: Update Admin Password to Omar101010"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Apply migration 006 (admin password)
echo "Applying migration 006_update_admin_password.sql..."
npx wrangler d1 execute DB --local --file=./migrations/006_update_admin_password.sql

echo ""
echo "✅ Admin password updated!"
echo ""

echo "📝 Step 2: Update Supervisor Names"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Apply migration 007 (supervisor names)
echo "Applying migration 007_update_supervisors_names.sql..."
npx wrangler d1 execute DB --local --file=./migrations/007_update_supervisors_names.sql

echo ""
echo "✅ Supervisor names updated!"
echo ""

echo "📊 Step 3: Verify Updates"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify admin
echo "Admin user:"
npx wrangler d1 execute DB --local --command="SELECT id, username, full_name, role_id FROM users_new WHERE username = 'admin';"

echo ""
echo "Supervisors:"
npx wrangler d1 execute DB --local --command="SELECT id, username, full_name, role_id, branch_id FROM users_new WHERE role_id = 'role_supervisor';"

echo ""
echo "Branches:"
npx wrangler d1 execute DB --local --command="SELECT id, name_ar, manager_name FROM branches WHERE id IN ('branch_1010', 'branch_2020');"

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║     ✅ All Updates Applied Successfully!           ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

echo "🔑 Login Credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Admin:"
echo "  Username: admin"
echo "  Password: Omar101010"
echo "  Access: All branches (full permissions)"
echo ""
echo "Supervisor Tuwaiq (محمد إسماعيل):"
echo "  Username: supervisor_tuwaiq"
echo "  Password: tuwaiq2020"
echo "  Access: Only branch_2020 (Tuwaiq Branch)"
echo ""
echo "Supervisor Laban (عبدالحي جلال):"
echo "  Username: supervisor_laban"
echo "  Password: laban1010"
echo "  Access: Only branch_1010 (Laban Branch)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Next Steps:"
echo "1. Run: npm run dev"
echo "2. Test login with admin credentials"
echo "3. Test supervisor access and branch isolation"
echo "4. Apply to remote database: npx wrangler d1 execute DB --remote --file=./migrations/006_update_admin_password.sql"
echo ""
