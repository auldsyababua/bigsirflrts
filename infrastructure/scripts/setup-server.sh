#!/bin/bash
# FLRTS OpenProject Server Setup Script
# For Ubuntu 22.04 LTS on Digital Ocean

set -e  # Exit on error

echo "==========================================
FLRTS OpenProject Server Setup
=========================================="

# Update system packages
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "🔧 Installing prerequisites..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    ufw \
    fail2ban \
    htop \
    vim \
    git

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "Docker already installed"
fi

# Install Docker Compose v2
echo "🐳 Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

# Configure Docker daemon
echo "⚙️  Configuring Docker daemon..."
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "metrics-addr": "127.0.0.1:9323"
}
EOF

# Restart Docker
systemctl restart docker
systemctl enable docker

# Configure firewall
echo "🔒 Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp  # OpenProject (temporary, will be removed after Cloudflare Tunnel)
ufw reload

# Configure fail2ban for SSH protection
echo "🛡️  Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/flrts-openproject
cd /opt/flrts-openproject

# Create Docker volumes
echo "💾 Creating Docker volumes..."
docker volume create openproject_data
docker volume create openproject_logs

# Set up swap (recommended for 8GB RAM)
echo "💾 Configuring swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo "Swap created: 4GB"
else
    echo "Swap already exists"
fi

# Configure sysctl for production
echo "⚙️  Optimizing system parameters..."
cat > /etc/sysctl.d/99-flrts.conf <<EOF
# Network optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.core.netdev_max_backlog = 65536
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535

# Memory optimizations
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# File descriptor limits
fs.file-max = 2097152
EOF
sysctl -p /etc/sysctl.d/99-flrts.conf

# Configure systemd limits
echo "⚙️  Configuring systemd limits..."
cat > /etc/systemd/system/docker.service.d/override.conf <<EOF
[Service]
LimitNOFILE=1048576
LimitNPROC=1048576
LimitCORE=infinity
TasksMax=infinity
TimeoutStartSec=0
EOF
mkdir -p /etc/systemd/system/docker.service.d/
systemctl daemon-reload

# Create deployment user (optional, for CI/CD)
echo "👤 Creating deployment user..."
if ! id -u flrts-deploy &>/dev/null; then
    useradd -m -s /bin/bash -G docker flrts-deploy
    echo "Deployment user created"
fi

# Install monitoring tools
echo "📊 Installing monitoring tools..."
docker pull prom/node-exporter:latest
docker run -d \
    --name node-exporter \
    --restart unless-stopped \
    --net="host" \
    --pid="host" \
    -v "/:/host:ro,rslave" \
    prom/node-exporter:latest \
    --path.rootfs=/host

# Create environment file template
echo "📝 Creating environment template..."
cat > /opt/flrts-openproject/.env.example <<'EOF'
# Supabase Database Configuration
SUPABASE_HOST=aws-0-us-east-1.pooler.supabase.com
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_PROJECT_REF=your_project_ref
SUPABASE_DB_PASSWORD=your_password

# OpenProject Configuration
OPENPROJECT_SECRET_KEY_BASE=generate_with_openssl_rand_hex_64
OPENPROJECT_HOST_NAME=openproject.yourdomain.com
OPENPROJECT_HTTPS=true

# Cloudflare R2 Storage
R2_PROVIDER=AWS
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=openproject-files
STORAGE_TYPE=fog
DIRECT_UPLOADS=true

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token

# n8n Configuration (optional)
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure_password

# Email Configuration (optional)
EMAIL_DELIVERY_METHOD=smtp
SMTP_ADDRESS=smtp.example.com
SMTP_PORT=587
SMTP_DOMAIN=example.com
SMTP_USERNAME=notifications@example.com
SMTP_PASSWORD=smtp_password
EOF

echo "==========================================
✅ Server setup complete!

Next steps:
1. Copy your .env file to /opt/flrts-openproject/.env
2. Copy docker-compose.yml to /opt/flrts-openproject/
3. Run: cd /opt/flrts-openproject && docker compose up -d

Server Information:
- IP Address: $(curl -s ifconfig.me)
- Docker version: $(docker --version)
- Docker Compose version: $(docker compose version)
- System: $(lsb_release -ds)

Security Notes:
- Firewall is enabled (UFW)
- Fail2ban is protecting SSH
- Docker logs are limited to prevent disk fill
- Swap is configured (4GB)
==========================================
"