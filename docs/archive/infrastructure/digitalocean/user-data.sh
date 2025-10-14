#!/bin/bash
# Digital Ocean User Data Script for OpenProject Setup
# This script runs automatically on first boot

set -e

# Add SSH key for remote access
mkdir -p /root/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC3WeTfx2WBHBm0deRkfHKY30MLDcijtwLZnYz6xLPkZDQPq3tr/dNzQ1Wv+l0w9TMzzhlNdyp3pCNJ2vxK74fIsCs94h8mmt1asdF+ZDukr5Kx2ZZfUQ3Z7xOCpokgAXzdlsEXiTDledcr2PA7Ir+J3dXxwadGlXvjPqK1+9C9Byn9Tu0XcIYmThF7EtuXn1yxpoY0jTRceDitqhu/xi2zVmHJG21iE7OFffpYEIjjvCqANHqt4ZS0xz2yavBQ8IBlyjCFmU+UYR6ATGB2Jn9wHzNTEMAjCXNEYVpC0kRFP6HovLxIUzNnksqV7T9e12gw1jao6B3ZkQwa8AwlyPA+7kteDnLyTNgF2uUbx/wTffR8YciSC+Lp7JlToVOHOYnGYxQ9HIwz0ydLR+3CF6RgmmA2CHQ/8gqyd8UrDAUhPRO3HVv3FrtL1zYhf5lJpVpQt8j9Yb8HWsocE6og7VjMz2eLgGoszcMp9gQUS+qopS5pciJRwCAtUptev77JE2iVeplkIHUto3clqsmWdnDMOYf5Y2aVVon/23bEb+RmgvsBJ+mOwqwUBnTphaA5Fd1mNxz3vfG3zQxuLRP2I0uoLqBjWJtaeRZcRX0YYafHhsNDgQxHImT11Bo+cNgdTPmk3ZZxZ0qLeEhNfBLlR5ngjdgGuCii4OHiXzYmn+9McQ== openproject@flrts.dev" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create project directory
mkdir -p /root/openproject
cd /root/openproject

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  openproject:
    image: openproject/community:14
    container_name: openproject
    restart: unless-stopped
    environment:
      - OPENPROJECT_SECRET_KEY_BASE=changeme1234567890abcdef
      - OPENPROJECT_HOST__NAME=165.227.216.172
      - OPENPROJECT_PROTOCOL=http
      - DATABASE_URL=postgresql://openproject:changeme@openproject-db/openproject
      - OPENPROJECT_CACHE__MEMCACHE__SERVER=memcached:11211
      - OPENPROJECT_RAILS__CACHE__STORE=memcache
      - OPENPROJECT_SEED_ADMIN_USER__PASSWORD=admin
      - OPENPROJECT_SEED_ADMIN_USER__NAME=admin
    ports:
      - "8080:8080"
    volumes:
      - openproject-data:/var/openproject/assets
    depends_on:
      - openproject-db
      - memcached
    networks:
      - openproject_network
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'

  openproject-db:
    image: postgres:16-alpine
    container_name: openproject-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=openproject
      - POSTGRES_USER=openproject
      - POSTGRES_PASSWORD=changeme
    volumes:
      - openproject-db-data:/var/lib/postgresql/data
    networks:
      - openproject_network
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  memcached:
    image: memcached:alpine
    container_name: memcached
    restart: unless-stopped
    networks:
      - openproject_network
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.125'

volumes:
  openproject-data:
  openproject-db-data:

networks:
  openproject_network:
    driver: bridge
EOF

# Start services
docker-compose pull
docker-compose up -d

# Create status script
cat > /root/check-status.sh << 'EOF'
#!/bin/bash
echo "=== Docker Services ==="
docker-compose ps
echo ""
echo "=== System Resources ==="
free -h
df -h | grep -E "^/dev|Filesystem"
echo ""
echo "=== OpenProject Logs (last 10 lines) ==="
docker-compose logs --tail=10 openproject
EOF
chmod +x /root/check-status.sh

# Signal completion
touch /root/setup-complete.flag

echo "OpenProject setup complete!"