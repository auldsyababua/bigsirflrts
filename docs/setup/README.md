# FLRTS Setup Documentation

This directory contains all setup and configuration guides for the FLRTS (Field Reports, Lists, Reminders, Tasks, and Sub-Tasks) system.

## 📋 Setup Order

Follow these guides in sequence for initial system setup:

1. **[OpenProject Setup](./openproject.md)** - Core task management system
2. **[Webhook Integration](./webhook-integration.md)** - Supabase → n8n → OpenProject sync
3. **[Telegram Bot](./telegram-bot.md)** - Bot configuration for field communication

## 🔧 Component Setup Guides

### Core Systems
- **[OpenProject](./openproject.md)** - Task management backend
  - Docker setup
  - Admin configuration
  - API token generation
  - Browser extension (optional)

### Integration Layer
- **[Webhook Integration](./webhook-integration.md)** - Event-driven sync
  - n8n workflow configuration
  - Supabase database webhooks
  - OpenProject API integration

### Communication Interfaces
- **[Telegram Bot](./telegram-bot.md)** - Field communication interface
  - Bot credentials
  - Command configuration
  - Webhook endpoints
  - Security settings

## 🚀 Quick Start

For a minimal working system:
1. Set up OpenProject (locally or cloud)
2. Configure webhooks for task synchronization
3. Deploy Telegram bot for field access

## 📝 Environment Variables

Each component requires specific environment variables. See individual setup guides for details:
- OpenProject: API tokens, base URLs
- n8n: Workflow IDs, webhook URLs
- Telegram: Bot tokens, webhook secrets
- Supabase: Service keys, project URLs

## 🔒 Security Notes

- Store all credentials in `.env` files (never commit)
- Use environment-specific configurations
- Implement rate limiting on all public endpoints
- Verify webhook signatures where applicable

## 📚 Additional Resources

- [Integration Points Documentation](../integration-points.md)
- [Architecture Overview](../architecture/)
- [PRD Documentation](../prd/)

---
*Last Updated: January 13, 2025*
