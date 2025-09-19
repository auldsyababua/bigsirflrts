#!/bin/bash

# FLRTS Monitoring Stack Deployment Script
# Deploys monitoring services to existing OpenProject DigitalOcean droplet

set -e

# Configuration
SERVER_IP="165.227.216.172"
MONITORING_DIR="/root/openproject/monitoring"
DOMAIN="${CLOUDFLARE_DOMAIN:-10nz.tools}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        FLRTS Monitoring Stack Deployment                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    # Check SSH access
    if ! ssh -o ConnectTimeout=5 root@${SERVER_IP} "echo 'SSH connection successful'" > /dev/null 2>&1; then
        echo -e "${RED}✗ Cannot connect to server ${SERVER_IP}${NC}"
        echo "Please ensure SSH access is configured"
        return 1
    fi

    # Check if OpenProject is running
    if ! ssh root@${SERVER_IP} "docker-compose -f /root/openproject/docker-compose.supabase.yml ps | grep -q openproject" > /dev/null 2>&1; then
        echo -e "${RED}✗ OpenProject not found on server${NC}"
        echo "Please ensure OpenProject is deployed first"
        return 1
    fi

    # Check cloudflared command
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${RED}✗ cloudflared not found${NC}"
        echo "Please install cloudflared for tunnel configuration"
        return 1
    fi

    echo -e "${GREEN}✓ All prerequisites met${NC}"
    return 0
}

# Function to deploy configuration files
deploy_configs() {
    echo -e "${YELLOW}Deploying monitoring configuration...${NC}"

    # Create monitoring directory on server
    ssh root@${SERVER_IP} "mkdir -p ${MONITORING_DIR}"

    # Copy monitoring configuration
    scp -r monitoring/ root@${SERVER_IP}:${MONITORING_DIR}/
    scp docker-compose.monitoring.prod.yml root@${SERVER_IP}:/root/openproject/

    # Copy additional configs
    scp cloudflare-monitoring-config.yml root@${SERVER_IP}:/root/openproject/cloudflare-config/tunnel-config.yml

    echo -e "${GREEN}✓ Configuration files deployed${NC}"
}

# Function to setup Cloudflare Tunnel
setup_tunnel() {
    echo -e "${YELLOW}Setting up Cloudflare Tunnel for monitoring...${NC}"

    # Get existing tunnel info
    TUNNEL_NAME="flrts-openproject-tunnel"
    TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')

    if [ -z "$TUNNEL_ID" ]; then
        echo -e "${RED}✗ Tunnel '${TUNNEL_NAME}' not found${NC}"
        echo "Please run OpenProject setup first"
        return 1
    fi

    echo -e "${GREEN}Found tunnel: ${TUNNEL_NAME} (${TUNNEL_ID})${NC}"

    # Create DNS records for monitoring services
    echo -e "${YELLOW}Creating DNS records...${NC}"
    cloudflared tunnel route dns "${TUNNEL_NAME}" "prometheus.monitoring.${DOMAIN}" || true
    cloudflared tunnel route dns "${TUNNEL_NAME}" "grafana.monitoring.${DOMAIN}" || true
    cloudflared tunnel route dns "${TUNNEL_NAME}" "jaeger.monitoring.${DOMAIN}" || true
    cloudflared tunnel route dns "${TUNNEL_NAME}" "n8n-monitor.monitoring.${DOMAIN}" || true

    echo -e "${GREEN}✓ DNS records created${NC}"
}

# Function to deploy monitoring stack
deploy_monitoring() {
    echo -e "${YELLOW}Deploying monitoring stack...${NC}"

    # Build n8n-monitor image on server
    ssh root@${SERVER_IP} "cd /root/openproject && docker-compose -f docker-compose.monitoring.prod.yml build n8n-monitor"

    # Start monitoring services
    ssh root@${SERVER_IP} "cd /root/openproject && docker-compose -f docker-compose.supabase.yml -f docker-compose.monitoring.prod.yml up -d"

    # Wait for services to start
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 30

    # Check service status
    ssh root@${SERVER_IP} "cd /root/openproject && docker-compose ps"

    echo -e "${GREEN}✓ Monitoring stack deployed${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"

    # Check if services are healthy
    local services=("prometheus" "grafana" "jaeger" "node-exporter" "cadvisor" "n8n-monitor")
    local failed_services=()

    for service in "${services[@]}"; do
        if ssh root@${SERVER_IP} "docker-compose -f /root/openproject/docker-compose.monitoring.prod.yml ps ${service} | grep -q 'Up'" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ ${service} is running${NC}"
        else
            echo -e "${RED}✗ ${service} is not running${NC}"
            failed_services+=("${service}")
        fi
    done

    if [ ${#failed_services[@]} -gt 0 ]; then
        echo -e "${RED}Some services failed to start: ${failed_services[*]}${NC}"
        echo "Check logs with: ssh root@${SERVER_IP} 'cd /root/openproject && docker-compose logs <service>'"
        return 1
    fi

    # Check resource usage
    echo -e "${YELLOW}Checking resource usage...${NC}"
    ssh root@${SERVER_IP} "free -h && echo '' && df -h | head -5"

    echo -e "${GREEN}✓ All services are healthy${NC}"
    return 0
}

# Function to restart cloudflared with new config
update_tunnel() {
    echo -e "${YELLOW}Updating Cloudflare Tunnel configuration...${NC}"

    # Restart cloudflared to pick up new config
    ssh root@${SERVER_IP} "cd /root/openproject && docker-compose restart cloudflared"

    # Wait for tunnel to reconnect
    sleep 10

    echo -e "${GREEN}✓ Tunnel configuration updated${NC}"
}

# Function to display access URLs
display_urls() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  Deployment Complete!                   ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Monitoring Services:${NC}"
    echo "  📊 Prometheus:  https://prometheus.monitoring.${DOMAIN}"
    echo "  📈 Grafana:     https://grafana.monitoring.${DOMAIN}"
    echo "  🔍 Jaeger:      https://jaeger.monitoring.${DOMAIN}"
    echo "  🔔 n8n Monitor: https://n8n-monitor.monitoring.${DOMAIN}"
    echo ""
    echo -e "${GREEN}Default Credentials:${NC}"
    echo "  Grafana: admin / admin (change on first login)"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Login to Grafana and change default password"
    echo "2. Import monitoring dashboards"
    echo "3. Configure alert rules if needed"
    echo "4. Monitor resource usage: ssh root@${SERVER_IP} 'docker stats'"
    echo ""
    echo -e "${GREEN}Documentation: infrastructure/digitalocean/MONITORING_DEPLOYMENT_GUIDE.md${NC}"
}

# Main execution
main() {
    echo "Deploying monitoring stack to ${SERVER_IP}..."
    echo ""

    # Check prerequisites
    if ! check_prerequisites; then
        exit 1
    fi

    # Deploy configuration files
    if ! deploy_configs; then
        echo -e "${RED}Configuration deployment failed${NC}"
        exit 1
    fi

    # Setup Cloudflare Tunnel
    if ! setup_tunnel; then
        echo -e "${RED}Tunnel setup failed${NC}"
        exit 1
    fi

    # Deploy monitoring stack
    if ! deploy_monitoring; then
        echo -e "${RED}Monitoring deployment failed${NC}"
        exit 1
    fi

    # Update tunnel configuration
    if ! update_tunnel; then
        echo -e "${RED}Tunnel update failed${NC}"
        exit 1
    fi

    # Verify deployment
    if ! verify_deployment; then
        echo -e "${RED}Deployment verification failed${NC}"
        exit 1
    fi

    # Display success message
    display_urls
}

# Run main function
main "$@"
