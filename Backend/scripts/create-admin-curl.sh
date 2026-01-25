#!/bin/bash

# Script to create admin user using curl
# This registers a user first, then you need to update role in database

# Configuration
API_URL="${API_URL:-http://localhost:5000}"
EMAIL="${1:-admin@example.com}"
PASSWORD="${2:-admin123}"
NAME="${3:-Admin User}"

echo "Creating admin user..."
echo "Email: $EMAIL"
echo "Name: $NAME"
echo ""

# Step 1: Register user
echo "Step 1: Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$NAME\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'

# Check if registration was successful
if echo "$REGISTER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo ""
  echo "✅ User registered successfully!"
  echo ""
  echo "⚠️  IMPORTANT: You need to update the user role to 'admin' in MongoDB:"
  echo ""
  echo "   db.users.updateOne("
  echo "     { email: \"$EMAIL\" },"
  echo "     { \$set: { role: \"admin\" } }"
  echo "   )"
  echo ""
  echo "Or use the Node.js script instead:"
  echo "   node scripts/create-admin.js \"$EMAIL\" \"$PASSWORD\" \"$NAME\""
else
  echo ""
  echo "❌ Registration failed. User might already exist."
  echo "If user exists, update role manually in MongoDB or use the Node.js script."
fi
