#!/usr/bin/env python3
"""
Create admin user for Donaciones Ieshiva
"""

import psycopg2
import hashlib
import os
import base64

DB_CONFIG = {
    'host': 'localhost',
    'database': 'donaciones_dev',
    'user': 'ariel'
}

def hash_password(password):
    """Hash password using PBKDF2 (matching .NET implementation)"""
    salt = os.urandom(16)
    iterations = 100000
    hash_size = 32
    
    # PBKDF2 with SHA256
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations, hash_size)
    
    # Format: salt + hash (same as .NET Core Identity default)
    combined = salt + pwd_hash
    return base64.b64encode(combined).decode('utf-8')

def main():
    print("Creating default admin user...")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Check if admin user already exists
        cur.execute("SELECT COUNT(*) FROM users WHERE email = 'admin@aliot.com'")
        count = cur.fetchone()[0]
        
        if count > 0:
            print("✓ Admin user already exists")
            return
        
        # Create admin user
        password_hash = hash_password("123456")
        
        cur.execute("""
            INSERT INTO users (id, email, password_hash, role, full_name, is_active, created_at)
            VALUES (gen_random_uuid(), 'admin@aliot.com', %s, 1, 'System Administrator', true, NOW())
        """, (password_hash,))
        
        conn.commit()
        print("✓ Admin user created successfully")
        print("  Email: admin@aliot.com")
        print("  Password: 123456")
        print("  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!")
        
    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
