# OpenProject Setup Guide for FLRTS

## ✅ Status: OpenProject is Running

Your OpenProject instance is now successfully running at:
**<http://localhost:8080>**

## 🔑 Login Credentials

- **URL**: <http://localhost:8080>
- **Username**: admin
- **Password**: admin
- **Email**: <admin@flrts.local>

## 🚀 Quick Start Steps

### 1. Access OpenProject

Open your browser and go to: <http://localhost:8080>

### 2. Initial Setup

1. Login with the admin credentials above
2. Create your first project (e.g., "FLRTS Development")
3. Go to **My Account** → **Access Tokens**
4. Generate an API token for FLRTS integration
5. Save the token - you'll need it for API calls

### 3. Install Browser Extension (Optional)

To add the FLRTS input box and logo customization:

```bash
# For Chrome:
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: packages/flrts-extension/

# For Firefox:
1. Open about:debugging
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select: packages/flrts-extension/manifest.json
```

## 🛠️ Docker Management

### View Logs

```bash
docker logs -f flrts-openproject
```

### Stop OpenProject

```bash
cd docker/openproject
docker-compose down
```

### Start OpenProject

```bash
cd docker/openproject
docker-compose up -d
```

### Reset Everything (Warning: Deletes all data)

```bash
cd docker/openproject
docker-compose down -v
docker-compose up -d
```

## 🔧 OpenProject CLI Setup

If you have Go installed, build the CLI:

```bash
cd tools/openproject-cli
go build -o op-cli main.go

# Configure CLI
export OPENPROJECT_URL=http://localhost:8080
export OPENPROJECT_APIKEY=<your-api-key-from-step-2>

# Test CLI
./op-cli work-package list
```

## 📝 Integration Points for FLRTS

### API Endpoints

- Base URL: `http://localhost:8080/api/v3`
- Authentication: Bearer token or Basic auth with API key
- Main endpoints:
  - `/work_packages` - Create/manage tasks
  - `/projects` - List projects
  - `/users` - Get user information

### Custom Fields

OpenProject supports custom fields which we'll use for:

- `facility_id` - Mining facility identifier
- `equipment_type` - Type of mining equipment
- `maintenance_type` - Preventive/Corrective/Emergency
- `downtime_impact` - None/Partial/Full

### Example API Call

```bash
# Create a work package
curl -X POST http://localhost:8080/api/v3/work_packages \
  -H "Authorization: Basic $(echo -n 'apikey:YOUR_API_KEY' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test task from FLRTS",
    "_links": {
      "type": {"href": "/api/v3/types/2"},
      "project": {"href": "/api/v3/projects/1"}
    }
  }'
```

## 🎨 UI Customization (Without Forking)

### Option 1: Browser Extension (Recommended)

The browser extension in `packages/flrts-extension/` will:

- Replace OpenProject logo with FLRTS branding
- Add floating NLP input box
- Enable keyboard shortcut (Cmd+K)
- Support voice input

### Option 2: Admin Panel CSS

1. Login as admin
2. Go to **Administration** → **Settings** → **Design**
3. Add custom CSS from `docker/openproject/custom-css/flrts-custom.css`

### Option 3: Reverse Proxy

Use Nginx to inject custom headers and CSS (advanced)

## 🔍 Troubleshooting

### Can't connect to <http://localhost:8080>

1. Check containers are running: `docker ps`
2. Check logs: `docker logs flrts-openproject`
3. Wait 2-3 minutes for initialization
4. Try: <http://127.0.0.1:8080>

### Port 8080 already in use

```bash
# Change port in docker-compose.yml
ports:
  - "8081:80"  # Change 8080 to 8081
```

### Reset admin password

```bash
docker exec -it flrts-openproject bundle exec rails c
# In Rails console:
User.find_by(login: 'admin').update(password: 'newpassword')
```

## 📚 Next Steps

1. **Create API Integration**
   - Build NLP service in `packages/nlp-service/`
   - Connect to OpenProject API

2. **Test Browser Extension**
   - Load extension in browser
   - Test NLP input box

3. **Configure Team Members**
   - Add users for Taylor, Colin, Joel, Bryan
   - Set timezone preferences

4. **Create Custom Fields**
   - Go to Administration → Custom Fields
   - Add mining-specific fields

## 🔗 Useful Links

- OpenProject API Docs: <https://www.openproject.org/docs/api/>
- OpenProject User Guide: <https://www.openproject.org/docs/user-guide/>
- FLRTS Architecture: [docs/architecture/](../architecture/)

---

**Remember**: We're using OpenProject as a backend service via API. No need to
fork or modify OpenProject source code!
