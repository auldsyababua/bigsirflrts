# OpenProject Integration and Customization Strategy

## Overview

FLRTS requires integration with OpenProject for task management, with specific
UI customizations (logo replacement, text input box for NLP). This document
outlines the approaches for achieving these customizations.

## Integration Approaches Comparison

### Option 1: API-Only Integration (Recommended) ✅

**Approach**: Build FLRTS as a separate application that communicates with
OpenProject via REST API v3

**Pros**:

- No need to fork or maintain OpenProject source code
- Clean separation of concerns
- Easier upgrades of OpenProject
- Can use hosted OpenProject or self-hosted without modification
- FLRTS remains lightweight and focused

**Cons**:

- Cannot directly modify OpenProject UI
- Need to build separate UI for FLRTS features

**Implementation**:

```javascript
// FLRTS embeds in OpenProject via:
1. Browser extension that injects FLRTS UI
2. Iframe widget in OpenProject custom fields
3. Separate companion app with deep linking
```

### Option 2: OpenProject Plugin Development 🔧

**Approach**: Develop an OpenProject plugin using their plugin API

**Pros**:

- Native integration with OpenProject UI
- Access to internal hooks and events
- Can modify UI elements directly
- Single deployment unit

**Cons**:

- Must learn Ruby on Rails (OpenProject is Rails-based)
- Plugin API may have limitations
- Tied to OpenProject release cycles
- More complex development environment

**Implementation**:

```ruby
# Create plugin at: openproject-flrts/
module OpenProject::FLRTS
  class Engine < ::Rails::Engine
    # Add text input box to work package forms
    # Replace logo in header
  end
end
```

### Option 3: Fork OpenProject (Not Recommended) ❌

**Approach**: Fork entire OpenProject repository and modify source directly

**Pros**:

- Complete control over all features
- Can make any UI changes needed

**Cons**:

- Massive maintenance burden (OpenProject is 500k+ lines of code)
- Difficult to merge upstream updates
- Need to understand entire Rails application
- Hosting and deployment complexity
- Security patches become your responsibility

## Recommended Architecture

### 1. Development Environment Setup

```bash
# FLRTS Repository Structure
bigsirflrts/
├── packages/
│   ├── flrts-core/        # Our NLP services
│   ├── flrts-ui/          # Our React UI
│   └── flrts-extension/   # Browser extension
├── tools/
│   └── openproject-cli/    # CLI for testing
└── docker/
    └── openproject/        # OpenProject test instance
```

### 2. OpenProject Test Instance (Docker)

```yaml
# docker/openproject/docker-compose.yml
version: '3.7'
services:
  openproject:
    image: openproject/community:13
    environment:
      OPENPROJECT_SECRET_KEY_BASE: secret
      OPENPROJECT_HOST__NAME: localhost:8080
      OPENPROJECT_HTTPS: false
    volumes:
      - opdata:/var/openproject/assets
    ports:
      - '8080:80'

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: openproject
      POSTGRES_USER: openproject
      POSTGRES_PASSWORD: openproject
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  opdata:
  pgdata:
```

### 3. UI Customization Strategy

#### A. Logo Replacement via CSS Injection

```javascript
// Browser Extension approach
// packages/flrts-extension/content.js
function replaceLogo() {
  const logo = document.querySelector('.op-logo');
  if (logo) {
    logo.style.backgroundImage = 'url(chrome-extension://[id]/flrts-logo.png)';
  }
}

// Custom CSS approach (if admin access)
// Admin > Settings > Custom CSS
.op-logo {
  background-image: url('/assets/flrts-logo.png') !important;
}
```

#### B. NLP Input Box Integration

```javascript
// packages/flrts-extension/inject-ui.js
function injectFLRTSInput() {
  const toolbar = document.querySelector('.toolbar-container');

  const flrtsInput = document.createElement('div');
  flrtsInput.className = 'flrts-quick-input';
  flrtsInput.innerHTML = `
    <input 
      type="text" 
      placeholder="Type task naturally (e.g., 'Task for @Taylor due tomorrow')"
      id="flrts-nlp-input"
    />
    <button onclick="parseFLRTS()">Create</button>
  `;

  toolbar.prepend(flrtsInput);
}

// Communicate with FLRTS backend
async function parseFLRTS() {
  const input = document.getElementById('flrts-nlp-input').value;
  const parsed = await fetch('https://api.flrts.local/parse', {
    method: 'POST',
    body: JSON.stringify({ input }),
  });

  // Create work package via OpenProject API
  const workPackage = await createWorkPackage(parsed);
}
```

### 4. OpenProject CLI Integration

```bash
# Install OpenProject CLI globally
cd tools/openproject-cli
go build -o op-cli main.go
sudo mv op-cli /usr/local/bin/

# Configure CLI
op-cli config set --url http://localhost:8080
op-cli config set --apikey <your-api-key>

# Test integration
op-cli work-package create --subject "Test from CLI" --project "flrts"
```

### 5. FLRTS + OpenProject Integration Points

```typescript
// packages/flrts-core/src/integrations/openproject.ts
export class OpenProjectIntegration {
  private cli = '/usr/local/bin/op-cli';
  private api = 'http://localhost:8080/api/v3';

  async createTask(parsed: ParsedTask) {
    // Option 1: Via REST API
    const response = await fetch(`${this.api}/work_packages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.mapToWorkPackage(parsed)),
    });

    // Option 2: Via CLI
    const result = await exec(`${this.cli} work-package create \
      --subject "${parsed.subject}" \
      --assignee "${parsed.assignee}" \
      --due-date "${parsed.dueDate}"`);

    return result;
  }
}
```

## Implementation Phases

### Phase 1: API Integration (Week 1-2)

- Set up OpenProject Docker instance
- Install and configure CLI
- Build basic API client
- Test CRUD operations

### Phase 2: Browser Extension (Week 3-4)

- Create Chrome/Firefox extension
- Inject FLRTS input box
- Replace logo via CSS
- Handle authentication

### Phase 3: Standalone UI (Week 5-6)

- Build React app with FLRTS UI
- Embed via iframe or popup
- Deep linking to OpenProject

### Phase 4: Plugin Exploration (Future)

- If deeper integration needed
- Develop Ruby plugin
- Native UI modifications

## Decision: API-First Approach

**We should NOT install OpenProject source code in our repo because:**

1. **Separation of Concerns**: FLRTS is an NLP layer, not a project management
   system
2. **Maintainability**: Avoid maintaining 500k+ lines of Rails code
3. **Flexibility**: Can work with hosted or self-hosted OpenProject
4. **Technology Stack**: Stay in TypeScript/Node.js comfort zone
5. **Upgrade Path**: Easy to upgrade OpenProject independently

**Instead, we will:**

1. Use OpenProject's Docker image for development
2. Integrate via REST API v3
3. Build browser extension for UI injection
4. Use OpenProject CLI for advanced operations
5. Keep FLRTS as a lightweight, focused NLP service

## Custom Branding Implementation

### Without Forking OpenProject:

1. **Admin Panel Customization**
   - Upload custom logo via Admin > Settings
   - Add custom CSS for styling
   - Use announcement banner for FLRTS messaging

2. **Browser Extension**
   - Inject CSS to override styles
   - Add FLRTS input box to toolbar
   - Modify DOM elements as needed

3. **Reverse Proxy Approach**
   - Use Nginx to inject custom headers/footers
   - Serve custom assets
   - Rewrite certain URLs

### Example Nginx Configuration:

```nginx
server {
  listen 80;
  server_name openproject.company.com;

  # Serve custom logo
  location /assets/flrts-logo.png {
    alias /var/www/flrts/logo.png;
  }

  # Inject custom CSS
  location / {
    proxy_pass http://openproject:8080;
    sub_filter '</head>' '<link rel="stylesheet" href="/flrts-custom.css"></head>';
    sub_filter_once off;
  }

  # FLRTS API endpoint
  location /api/flrts/ {
    proxy_pass http://flrts-api:3000/;
  }
}
```

## Conclusion

The recommended approach is to:

1. **Keep FLRTS separate** from OpenProject source
2. **Use API integration** for backend functionality
3. **Build browser extension** for UI enhancements
4. **Deploy OpenProject via Docker** for development
5. **Consider plugin development** only if absolutely necessary

This maintains clean architecture, reduces maintenance burden, and allows both
systems to evolve independently while providing the desired user experience.
