# Fix OpenProject admin password
puts "Fixing OpenProject admin user..."

# Find existing admin user
admin = User.find_by(login: 'admin')
if admin
  puts "Found existing admin user, updating password..."
  admin.password = 'adminadmin123'  # Minimum 10 characters
  admin.password_confirmation = 'adminadmin123'
  admin.force_password_change = false

  if admin.save(validate: false)  # Skip validation for existing user
    puts "✅ Admin password updated successfully!"
    puts "   Login: admin"
    puts "   Password: adminadmin123"
  else
    puts "❌ Failed to update admin password:"
    puts admin.errors.full_messages
  end
else
  puts "Creating new admin user..."
  admin = User.new(
    login: 'admin',
    firstname: 'OpenProject',
    lastname: 'Admin',
    mail: 'admin@example.com',
    admin: true,
    status: 1,
    language: 'en',
    password: 'adminadmin123',
    password_confirmation: 'adminadmin123',
    force_password_change: false
  )

  if admin.save
    puts "✅ Admin user created successfully!"
    puts "   Login: admin"
    puts "   Password: adminadmin123"
  else
    puts "❌ Failed to create admin user:"
    puts admin.errors.full_messages
  end
end

# Clean up orphan user if exists
orphan = User.find_by(id: 2, login: nil)
if orphan
  orphan.destroy!
  puts "✅ Cleaned up orphan user"
end

puts "Done!"