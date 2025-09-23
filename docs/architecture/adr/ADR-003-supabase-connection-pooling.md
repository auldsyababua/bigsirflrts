# ADR-003: Supabase Direct Connection with IPv4 Add-on

**Date**: 2025-09-18 **Status**: Adopted

## Context

The production DigitalOcean droplet for OpenProject failed to connect to the
Supabase database. The standard database hostname
(`db.thnwlykidzhrsagyjncc.supabase.co`) resolves to an IPv6 address, which the
Docker containers on the droplet cannot reach.

An initial proposal was to use the Supabase connection pooler to get an IPv4
address. However, further research revealed that the pooler runs in "transaction
mode," which does not support prepared statements. OpenProject, as a Ruby on
Rails application, relies on ActiveRecord, which uses prepared statements by
default for security and performance. This makes the connection pooler
incompatible with the application.

## Decision

To resolve the connectivity and compatibility issues, we will use the **direct
Supabase database connection** and enable the **IPv4 add-on** for the project.
This provides a dedicated, stable IPv4 address for the main database host,
solving the original network reachability problem without sacrificing
application compatibility.

The correct `DATABASE_URL` will now use the standard direct-connection hostname:

`postgresql://postgres:${OPENPROJECT_SUPABASE_PASSWORD}@db.thnwlykidzhrsagyjncc.supabase.co:5432/postgres`

The password should be provided via the `OPENPROJECT_SUPABASE_PASSWORD`
environment variable.

## Consequences

**Positive**:

- Establishes a stable, IPv4-based connection to the Supabase database that is
  fully compatible with OpenProject's requirements.
- Unblocks the critical path for deploying and migrating the OpenProject
  application.
- Avoids potential application-level errors that would have occurred due to the
  lack of prepared statement support in the connection pooler.

**Negative**:

- May incur a small additional cost for the Supabase IPv4 add-on. This cost is
  acceptable to ensure system stability.

**Action Items**:

- The **user** must enable the **IPv4 add-on** in the Supabase project dashboard
  for project `thnwlykidzhrsagyjncc`.
- The **Dev Agent (James)** will update the environment configuration on the
  DigitalOcean droplet to use the direct `DATABASE_URL`.
- The `openproject-migrate` container must be re-run to validate the connection
  and apply migrations.
- Once migrations succeed, the `openproject` and `openproject-worker` services
  must be restarted to use the new database connection.
