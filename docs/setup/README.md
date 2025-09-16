# FLRTS Setup Documentation

This directory contains all setup and configuration guides for the FLRTS (Field Reports, Lists, Reminders, Tasks, and Sub-Tasks) system.

## 🏗️ Current Architecture (2025)

```
Telegram Bot API
    ↓ HTTPS Webhook
Supabase Edge Functions
    ↓ HTTP Request
Self-hosted n8n (single instance)
    ↓ API Calls
OpenProject + PostgreSQL
```

## 📋 Setup Order

Follow these guides in sequence for initial system setup:

1. **[OpenProject Setup](./openproject.md)** - Core task management system
2. **[Webhook Integration](./webhook-integration.md)** - Supabase Edge Functions → n8n → OpenProject sync
3. **[Telegram Bot](./telegram-bot.md)** - Bot configuration for field communication

## 🔧 Component Setup Guides

### Core Systems

- **[OpenProject](./openproject.md)** - Task management backend
  - Docker setup with PostgreSQL
  - Admin configuration
  - API token generation
  - Work package types and statuses

### Integration Layer

- **[Webhook Integration](./webhook-integration.md)** - Event-driven sync architecture
  - Supabase Edge Functions (telegram-webhook, database-webhook, openproject-sync)
  - Self-hosted n8n workflow configuration
  - Database triggers and change notifications
  - Bidirectional OpenProject API integration

### Communication Interfaces

- **[Telegram Bot](./telegram-bot.md)** - Field communication interface
  - BotFather setup and credentials
  - Edge Function webhook handlers
  - Command processing via n8n
  - Security implementation (rate limiting, webhook verification)

## 🚀 Quick Start

For a minimal working system:

1. Set up OpenProject (Docker with PostgreSQL)
2. Deploy Supabase Edge Functions for webhook handling
3. Configure self-hosted n8n with webhook endpoints
4. Set up Telegram bot with webhook integration

## 📝 Environment Variables

Each component requires specific environment variables. See individual setup guides for details:

- **OpenProject**: API tokens, base URLs, work package configurations
- **Supabase Edge Functions**: Bot tokens, webhook secrets, n8n URLs, OpenProject API keys
- **n8n**: Webhook paths, OpenProject API endpoints
- **Telegram Bot**: Bot tokens (via BotFather), webhook verification secrets

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
*Last Updated: January 2025 - Updated for current Supabase Edge Functions + self-hosted n8n architecture*
