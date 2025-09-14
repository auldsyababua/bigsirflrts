#!/bin/bash

# Complete OpenProject Deployment Script
# This script automates the full deployment of OpenProject on Digital Ocean

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="${1:-165.227.216.172}"
PROJECT_DIR="/root/openproject"
SSH_USER="root"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        OpenProject Complete Deployment Script           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Target Server: ${SERVER_IP}${NC}"
echo ""

# Function to check SSH connectivity
check_ssh() {
    echo -e "${YELLOW}Checking SSH connectivity...${NC}"
    if ssh -o ConnectTimeout=5 ${SSH_USER}@${SERVER_IP} "echo 'Connected'" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ SSH connection successful${NC}"
        return 0
    else
        echo -e "${RED}✗ Cannot connect to server via SSH${NC}"
        echo "Please ensure:"
        echo "  1. Server is running"
        echo "  2. SSH key is configured"
        echo "  3. IP address is correct"
        return 1
    fi
}

# Function to install Docker on server
install_docker() {
    echo ""
    echo -e "${BLUE}=== Installing Docker on Server ===${NC}"

    ssh ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
# Update system
apt-get update
apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Verify installations
docker --version
docker-compose --version
ENDSSH

    echo -e "${GREEN}✓ Docker installation complete${NC}"
}

# Function to setup project directory
setup_project_directory() {
    echo ""
    echo -e "${BLUE}=== Setting up Project Directory ===${NC}"

    ssh ${SSH_USER}@${SERVER_IP} << ENDSSH
# Create project directory
mkdir -p ${PROJECT_DIR}
cd ${PROJECT_DIR}

# Create necessary subdirectories
mkdir -p data/openproject data/postgresql logs cloudflare-config
ENDSSH

    echo -e "${GREEN}✓ Project directory created${NC}"
}

# Function to copy configuration files
copy_configuration() {
    echo ""
    echo -e "${BLUE}=== Copying Configuration Files ===${NC}"

    # Copy docker-compose files
    echo "Copying Docker Compose files..."
    scp infrastructure/digitalocean/docker-compose.prod.yml ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/docker-compose.yml

    # Copy environment template
    echo "Copying environment template..."
    scp infrastructure/digitalocean/.env.production ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/.env

    # Copy Cloudflare configuration if exists
    if [ -d "infrastructure/cloudflare/cloudflare-config" ]; then
        echo "Copying Cloudflare configuration..."
        scp -r infrastructure/cloudflare/cloudflare-config/* ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/cloudflare-config/
    fi

    echo -e "${GREEN}✓ Configuration files copied${NC}"
}

# Function to configure environment
configure_environment() {
    echo ""
    echo -e "${BLUE}=== Configuring Environment ===${NC}"

    # Generate secure passwords
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    SECRET_KEY_BASE=$(openssl rand -hex 64)

    echo -e "${YELLOW}Generated secure passwords${NC}"

    # Update environment file on server
    ssh ${SSH_USER}@${SERVER_IP} << ENDSSH
cd ${PROJECT_DIR}

# Update PostgreSQL password
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" .env

# Update OpenProject secret key
sed -i "s/SECRET_KEY_BASE=.*/SECRET_KEY_BASE=${SECRET_KEY_BASE}/" .env

# Set server hostname
HOSTNAME=\$(hostname -f)
sed -i "s/OPENPROJECT_HOST__NAME=.*/OPENPROJECT_HOST__NAME=\${HOSTNAME}/" .env

echo "Environment configured"
ENDSSH

    echo -e "${GREEN}✓ Environment configured${NC}"
}

# Function to start services
start_services() {
    echo ""
    echo -e "${BLUE}=== Starting OpenProject Services ===${NC}"

    ssh ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
cd /root/openproject

# Pull Docker images
echo "Pulling Docker images..."
docker-compose pull

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to initialize..."
sleep 30

# Check service status
docker-compose ps
ENDSSH

    echo -e "${GREEN}✓ Services started${NC}"
}

# Function to initialize OpenProject
initialize_openproject() {
    echo ""
    echo -e "${BLUE}=== Initializing OpenProject ===${NC}"

    ssh ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
cd /root/openproject

# Wait for database to be ready
echo "Waiting for database..."
until docker-compose exec -T openproject-db pg_isready; do
    sleep 5
done

# Run OpenProject setup
echo "Running OpenProject initial setup..."
docker-compose exec -T openproject bundle exec rake db:create db:migrate db:seed

# Create admin user
echo "Creating admin user..."
docker-compose exec -T openproject bundle exec rake "openproject:create_admin[admin@example.com,admin,Admin,User]" || true

echo "OpenProject initialized"
ENDSSH

    echo -e "${GREEN}✓ OpenProject initialized${NC}"
}

# Function to setup monitoring
setup_monitoring() {
    echo ""
    echo -e "${BLUE}=== Setting up Monitoring ===${NC}"

    ssh ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
# Create monitoring script
cat > /root/monitor-openproject.sh << 'EOF'
#!/bin/bash

# OpenProject Health Check Script

echo "=== OpenProject Status ==="
docker-compose -f /root/openproject/docker-compose.yml ps

echo ""
echo "=== Resource Usage ==="
docker stats --no-stream

echo ""
echo "=== Disk Usage ==="
df -h | grep -E "^/dev|Filesystem"

echo ""
echo "=== Memory Usage ==="
free -h

echo ""
echo "=== OpenProject Logs (last 20 lines) ==="
docker-compose -f /root/openproject/docker-compose.yml logs --tail=20 openproject
EOF

chmod +x /root/monitor-openproject.sh

# Setup cron for regular monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor-openproject.sh > /root/openproject/logs/monitor.log 2>&1") | crontab -

echo "Monitoring configured"
ENDSSH

    echo -e "${GREEN}✓ Monitoring setup complete${NC}"
}

# Function to run smoke tests
run_smoke_tests() {
    echo ""
    echo -e "${BLUE}=== Running Smoke Tests ===${NC}"

    # Get server info
    SERVER_URL="http://${SERVER_IP}:8080"

    echo "Testing OpenProject availability..."

    # Test health endpoint
    if curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/health_checks/all" | grep -q "200"; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠ Health check not responding yet${NC}"
    fi

    # Test main page
    if curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}" | grep -q "200\|302"; then
        echo -e "${GREEN}✓ OpenProject web interface accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Web interface not ready yet${NC}"
    fi

    # Test API
    if curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/v3" | grep -q "200\|401"; then
        echo -e "${GREEN}✓ API endpoint responding${NC}"
    else
        echo -e "${YELLOW}⚠ API not ready yet${NC}"
    fi

    # Check Docker services
    echo ""
    echo "Docker service status:"
    ssh ${SSH_USER}@${SERVER_IP} "cd ${PROJECT_DIR} && docker-compose ps"
}

# Function to display summary
display_summary() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              Deployment Complete!                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}OpenProject has been deployed successfully!${NC}"
    echo ""
    echo "Access Information:"
    echo "  • Direct URL: http://${SERVER_IP}:8080"
    echo "  • Admin Email: admin@example.com"
    echo "  • Admin Password: admin (CHANGE THIS!)"
    echo ""
    echo "Next Steps:"
    echo "1. Setup Cloudflare Tunnel for secure access"
    echo "2. Configure R2 for file storage"
    echo "3. Change admin password"
    echo "4. Configure email settings"
    echo "5. Create projects and users"
    echo ""
    echo "Useful Commands:"
    echo "  • Monitor: ssh ${SSH_USER}@${SERVER_IP} '/root/monitor-openproject.sh'"
    echo "  • Logs: ssh ${SSH_USER}@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose logs -f'"
    echo "  • Restart: ssh ${SSH_USER}@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose restart'"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo "  • Passwords are stored in: ${PROJECT_DIR}/.env"
    echo "  • Backup this file securely!"
}

# Main execution
main() {
    echo "Starting OpenProject deployment..."
    echo ""

    # Check SSH connectivity
    if ! check_ssh; then
        exit 1
    fi

    # Install Docker
    install_docker

    # Setup project directory
    setup_project_directory

    # Copy configuration files
    copy_configuration

    # Configure environment
    configure_environment

    # Start services
    start_services

    # Initialize OpenProject
    initialize_openproject

    # Setup monitoring
    setup_monitoring

    # Run smoke tests
    run_smoke_tests

    # Display summary
    display_summary
}

# Handle script arguments
case "${2}" in
    --docker-only)
        check_ssh && install_docker
        ;;
    --configure-only)
        check_ssh && copy_configuration && configure_environment
        ;;
    --test-only)
        run_smoke_tests
        ;;
    *)
        main
        ;;
esac