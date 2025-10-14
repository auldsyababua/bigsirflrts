# Frappe Cloud SSH Access for AI Agents

**Status**: Active **Audience**: AI agents (Action Agent, QA Agent) **Related**:
[Frappe Cloud Site Setup](../setup/frappe-cloud-site.md)

---

## Overview

Frappe Cloud Private Bench SSH access requires certificate-based authentication
with **6-hour validity**. AI agents must use a **heredoc pattern** for all SSH
commands due to interactive terminal restrictions.

**Current Bench**: `bench-27276-000002-f1-virginia@n1-virginia.frappe.cloud`
(port 2222) **Region**: us-east-1 (N. Virginia) **Site**:
`builder-rbt-sjk.v.frappe.cloud` → <https://ops.10nz.tools>

---

## Prerequisites (Colin Performs)

Before agents can SSH, Colin must refresh the SSH certificate:

### Step 1: Generate SSH Certificate

1. Navigate to <https://frappecloud.com>
2. Select Bench Group → **SSH Access** tab
3. Click **Generate Certificate**
4. Certificate displays in two parts:

**Part 1 - Store Certificate Locally:**

```bash
echo '<certificate-content-from-dashboard>' > ~/.ssh/id_rsa-cert.pub
```

**Part 2 - SSH Connection String:**

```bash
ssh bench-27276-000002-f1-virginia@n1-virginia.frappe.cloud -p 2222
```

### Step 2: Provide Certificate to Agent

Colin should provide the agent with:

1. The **Step 1 command** (certificate storage)
2. Confirmation that certificate is < 6 hours old

**Certificate Validity**: 6 hours from generation timestamp

---

## SSH Access Pattern for Agents

### ❌ What DOES NOT Work

**Standard SSH commands hang indefinitely:**

```bash
# DOES NOT WORK - Will hang
ssh bigsirflrts-prod "ls sites/"

# DOES NOT WORK - Will hang
ssh bigsirflrts-prod bench --version
```

**SCP is disabled:**

```bash
# DOES NOT WORK - subsystem request failed
scp file.tar.gz bigsirflrts-prod:~/
```

---

## ✅ Working Pattern: Heredoc via SSH

All SSH commands MUST use this pattern:

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
<commands here>
EOF
```

### Key Rules

1. **Use `bash -s`** - Runs commands via stdin
2. **Use single quotes** - `<< 'EOF'` prevents local variable expansion
3. **No command substitution** - `$(cmd)` does NOT work inside heredoc
4. **Multiline scripts work** - Can execute complex command sequences

---

## Examples

### Example 1: List Sites

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
ls -1 sites/ | grep -v "\.json\|\.txt\|assets"
EOF
```

### Example 2: Check Installed Apps

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud list-apps
EOF
```

### Example 3: Multi-Step Operations

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
echo "=== Checking site status ==="
bench --site builder-rbt-sjk.v.frappe.cloud scheduler status

echo "=== Listing apps ==="
bench list-apps

echo "=== Checking workers ==="
bench --site builder-rbt-sjk.v.frappe.cloud doctor
EOF
```

### Example 4: Install Custom App

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
set -e
cd ~/frappe-bench
bench get-app flrts_extensions https://github.com/auldsyababua/flrts_extensions.git
bench --site builder-rbt-sjk.v.frappe.cloud install-app flrts_extensions
bench --site builder-rbt-sjk.v.frappe.cloud migrate
bench restart
EOF
```

### Example 5: Configure Site Secrets

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
set -e
bench --site builder-rbt-sjk.v.frappe.cloud set-config telegram_bot_token "1234567890:ABCDEF..."
bench --site builder-rbt-sjk.v.frappe.cloud set-config openai_api_key "sk-..."
bench restart
EOF
```

---

## Common Operations

### Check Site Status

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud doctor
EOF
```

### View Site Config (Secrets Masked)

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
cat sites/builder-rbt-sjk.v.frappe.cloud/site_config.json
EOF
```

### Restart Services

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench restart
EOF
```

### View Error Logs (Last 50 Lines)

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
tail -50 sites/builder-rbt-sjk.v.frappe.cloud/logs/error.log
EOF
```

### Check Scheduler Status

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud scheduler status
EOF
```

---

## Troubleshooting

### Issue: "Permission denied (publickey)"

**Cause**: SSH certificate expired (> 6 hours old)

**Solution**: Colin must regenerate certificate (see Prerequisites above)

### Issue: Commands Hang

**Cause**: Not using heredoc pattern

**Solution**: Wrap commands in `ssh bigsirflrts-prod bash -s << 'EOF' ... EOF`

### Issue: "Warning: Pseudo-terminal will not be allocated"

**Cause**: Normal behavior for heredoc SSH

**Solution**: Ignore warning - commands will still execute

### Issue: Output Appears Out of Order

**Cause**: Stderr/stdout interleaving in heredoc execution

**Solution**: Redirect stderr if needed: `command 2>&1`

---

## File Transfer Workarounds

Since SCP is disabled, use these methods:

### Method 1: Git-Based Deployment (Recommended)

Push code to GitHub, then:

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
cd ~/frappe-bench
bench get-app <app-name> https://github.com/<user>/<repo>.git
EOF
```

### Method 2: Small Files via Heredoc

For files < 10KB, encode as base64 and paste directly:

```bash
# On local machine
base64 -i file.txt -o file.txt.b64

# In heredoc
ssh bigsirflrts-prod bash -s << 'EOF'
cat > /tmp/file.txt.b64 << 'FILEEOF'
<paste base64 content here>
FILEEOF
base64 -d /tmp/file.txt.b64 > /tmp/file.txt
EOF
```

**Note**: Only practical for very small files. Use Git for app deployments.

### Method 3: Manual Upload via Dashboard

Colin can upload files via Frappe Cloud dashboard file manager, then agent can
move/extract via SSH.

---

## SSH Config Reference

Local `~/.ssh/config` entry (for reference, not directly used by heredoc):

```
Host bigsirflrts-prod
    HostName n1-virginia.frappe.cloud
    Port 2222
    User bench-27276-000002-f1-virginia
    IdentityFile ~/.ssh/id_rsa
    CertificateFile ~/.ssh/id_rsa-cert.pub
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    IdentitiesOnly yes
```

---

## Security Notes

1. **Certificates expire after 6 hours** - Plan operations accordingly
2. **Never commit certificates** - Stored only in `~/.ssh/`
3. **Secrets in site_config.json** - Frappe Cloud manages access control
4. **Use `set-config` for secrets** - Never manually edit site_config.json

---

## Quick Reference Card

**Test Connection:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
pwd && whoami
EOF
```

**List Sites:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
ls sites/
EOF
```

**Check Apps:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud list-apps
EOF
```

**Site Status:**

```bash
ssh bigsirflrts-prod bash -s << 'EOF'
bench --site builder-rbt-sjk.v.frappe.cloud doctor
EOF
```

---

## Related Documentation

- [Frappe Cloud Site Setup Guide](../setup/frappe-cloud-site.md) - Human-facing
  setup
- [Frappe Cloud Operations Playbook](../infrastructure/frappe-cloud-operations.md) -
  Operational procedures
- [Frappe Cloud Deployment Guide](../deployment/FRAPPE_CLOUD_DEPLOYMENT.md) -
  Full deployment steps
- [ADR-006: ERPNext Frappe Cloud Migration](../architecture/adr/ADR-006-erpnext-frappe-cloud-migration.md) -
  Architecture decision

---

**Document Status**: Active as of 2025-10-14 **Last Verified**: 2025-10-14
(Action Agent, WB1 deployment)
