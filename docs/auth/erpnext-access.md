# ERPNext / Frappe Cloud Access Guide

This document captures the steps required to regain administrative access to the
BigSirFLRTS ERPNext environment hosted on Frappe Cloud.

## Environment Overview

- **Production domain**: <https://ops.10nz.tools>
- **Bench hostname**: `builder-rbt-sjk.v.frappe.cloud` (single production bench)
- **SSH user**: `bench-27276-000002-f1-virginia`
- **Site folder**:
  `/home/frappe/frappe-bench/sites/builder-rbt-sjk.v.frappe.cloud`
- **Administrator account**: `Administrator`
- **Current password location**: stored in `.env` (gitignored). Do **not**
  commit actual credentials here.

---

## Frappe Cloud Dashboard Access

1. Go to <https://frappecloud.com> and log in with team credentials.
2. Navigate to **Sites → ops.10nz.tools** for site-specific actions (domains,
   backups, config, etc.).
3. Navigate to **Bench Groups → bench-27276-000002-f1-virginia** for SSH
   certificate generation, environment variables, and bench-level operations.

---

## Generating SSH Access (valid for ~6 hours)

Frappe Cloud issues short-lived SSH certificates. Regenerate one whenever access
is needed.

1. In the dashboard, open **Bench Groups → bench-27276-000002-f1-virginia → SSH
   Access**.
2. Click **Generate Certificate**. Run the emitted command locally. Example
   (generated 2025-10-07):

   ```bash
   echo 'ssh-rsa-cert-v01@openssh.com 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 colin@10netzero.com' > ~/.ssh/id_rsa-cert.pub
   ```

   (Certificates expire in ~6 hours; regenerate as needed.)

3. SSH into the bench:

   ```bash
   ssh -tt bench-27276-000002-f1-virginia@n1-virginia.frappe.cloud -p 2222
   ```

````
4. After login, change to the bench directory and confirm the site folder:
   ```bash
cd /home/frappe/frappe-bench
ls sites
# expect: builder-rbt-sjk.v.frappe.cloud
````

5. Launch the bench console for the site:

   ```bash
   bench --site builder-rbt-sjk.v.frappe.cloud console
   ```

````

**Note:** Persistent certificates aren't supported on Frappe Cloud. Every agent session requires a fresh certificate via the dashboard.

---

## Running Non-Interactive Commands via SSH

For programmatic access (scripts, automation, Claude Code), use piped commands instead of interactive sessions:

```bash
printf 'cd /home/frappe/frappe-bench\nbench version\nexit\n' | \
  ssh -tt bench-27276-000002-f1-virginia@n1-virginia.frappe.cloud -p 2222
````

**Why This Works:**

- Commands are sent as stdin to the SSH session
- The `-tt` flag allocates a pseudo-terminal (required by bench CLI)
- Commands execute sequentially
- The `exit` command closes the connection cleanly
- All output returns before timeout

**Example - Get Installed Versions:**

```bash
printf 'cd /home/frappe/frappe-bench\nbench version\nexit\n' | \
  ssh -tt bench-27276-000002-f1-virginia@n1-virginia.frappe.cloud -p 2222
```

Output:

```
builder 1.19.0
email_delivery_service 0.0.1
erpnext 15.81.3
erpnext_telegram_integration 1.2.0
frappe 15.84.0
hr_addon 0.0.1
hrms 15.50.2
insights 2.2.9
wiki 2.0.0
```

**Current Versions (as of 2025-10-07):**

- **ERPNext**: 15.81.3 (version-15 branch)
- **Frappe**: 15.84.0 (version-15 branch)

---

## Resetting Administrator Password via Bench Console

1. SSH to the bench and open the console as above.
2. Run:

   ```python
   import frappe
   frappe.connect()
   from frappe.utils.password import update_password
   update_password("Administrator", "<NEW_PASSWORD>")
   frappe.db.commit()
   ```

````
3. Exit console (`exit()`) and SSH (`exit`).

---

## Restoring Username/Password Login (after OAuth changes)
1. From bench console:
   ```python
frappe.db.sql("DELETE FROM `tabSocial Login Key`")
frappe.db.set_single_value("Website Settings", "show_login", 1)
frappe.db.set_single_value("Website Settings", "disable_signup", 0)
frappe.db.commit()
````

2. Clear caches:

   ```bash
   bench --site builder-rbt-sjk.v.frappe.cloud clear-website-cache
   bench --site builder-rbt-sjk.v.frappe.cloud clear-cache
   ```

```
3. Verify at https://ops.10nz.tools that the username/password form is visible and login works.

---

## Creating a New Google OAuth Client (optional)
1. Visit https://console.cloud.google.com and create a **new** OAuth client ID for the ERPNext site (do not reuse credentials from other apps).
2. Authorized redirect URI: `https://ops.10nz.tools/api/method/frappe.integrations.oauth2_logins.custom/google`
3. In ERPNext desk, go to **Settings → Social Login Key** and add the new Google credentials.
4. Confirm both username/password and Google login buttons appear.

---

## Generating ERPNext API Tokens
1. Log into the ERPNext desk as Administrator.
2. Open the avatar menu → **My Profile** → **API Keys**.
3. Click **Generate Keys**; store API Key/Secret securely (e.g., password manager).
4. Update `.env` (`ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`) if automation uses these tokens.

---

## Troubleshooting Checklist
- **Blank login page**: ensure `show_login = 1`, `disable_signup = 0`, no entries in `tabSocial Login Key`. Clear website cache.
- **OAuth redirect error**: configure a unique Google client with correct redirect URI.
- **SSH permission denied**: regenerate certificate after uploading matching public key.
- **Domain issues**: Cloudflare DNS must point CNAME `ops` to `builder-rbt-sjk.v.frappe.cloud` with proxy disabled during verification.
- **Site not found**: confirm site folder name via `ls /home/frappe/frappe-bench/sites`; use the exact folder name in all `bench --site` commands.

Keep this document updated whenever access procedures change.
```
