# GitHub Runner Migration Notice

## ⚠️ Runner Moved to Standalone Project

The GitHub Actions self-hosted runner has been **moved to a separate
repository** for better maintainability and security.

### New Location

The runner is now maintained at: `~/Desktop/github-runner-local/`

### Why the Move?

1. **Organization-Level Support**: The runner can now be shared across multiple
   repositories
2. **Security Improvements**: Enhanced security with ephemeral runners and
   better token management
3. **Independent Maintenance**: Runner updates don't affect application code
4. **Reusability**: One runner serves all your GitHub projects

### Migration Status

- ✅ All runner files moved to new location
- ✅ Security hardening applied (ephemeral mode, non-root, token rotation)
- ✅ Organization-level configuration ready
- ✅ Comprehensive documentation added
- ⚠️ Current runner container (`bigsirflrts-runner`) still running - do not
  remove until new runner tested

### For Developers

#### To Use the New Runner

1. **Clone the standalone runner project**:

   ```bash
   cd ~/Desktop
   git clone [runner-repo-url] github-runner-local
   cd github-runner-local
   ```

2. **Configure your environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your GITHUB_ORG and GITHUB_PAT
   ```

3. **Start the runner**:

   ```bash
   docker-compose -f docker-compose-org.yml up -d
   ```

4. **Update your workflows** to use the runner:

   ```yaml
   jobs:
     build:
       runs-on: [self-hosted, linux, x64, docker]
   ```

#### Key Differences

| Old Runner (Repository)  | New Runner (Organization)     |
| ------------------------ | ----------------------------- |
| Single repository only   | All repos in organization     |
| PAT with `repo` scope    | PAT with `admin:org` scope    |
| Non-ephemeral by default | Ephemeral by default (secure) |
| Basic security           | Enhanced security features    |

### Security Improvements

The new runner includes:

- **Ephemeral mode**: Clean environment for each job
- **Non-root execution**: Runs as user 1001
- **Read-only filesystem**: With specific tmpfs mounts
- **Token rotation**: Monthly rotation recommended
- **Network isolation**: Optional egress filtering
- **Resource limits**: CPU and memory constraints

### Transition Plan

1. **Phase 1** (Current): Both runners can coexist
   - Old: `bigsirflrts-runner` container
   - New: `github-runner-org` container

2. **Phase 2**: Test new runner
   - Run test workflows on new runner
   - Verify across multiple repositories

3. **Phase 3**: Decommission old runner
   - Stop and remove `bigsirflrts-runner`
   - Update all workflows to use new labels

### Important Notes

- The old runner at `bigsirflrts-runner` is still functional - don't remove it
  yet!
- Test the new runner thoroughly before decommissioning the old one
- Update your PAT to have `admin:org` scope for organization runners
- Rotate tokens monthly for security

### Need Help?

See the comprehensive README at: `~/Desktop/github-runner-local/README.md`

---

**Migration completed on**: $(date) **Migrated by**: GitHub Runner Separation
Project
