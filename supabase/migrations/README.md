# Migration History

This directory contains the complete schema history for Parking Meeters.

There are two historical duplicate filename prefixes:

- `00019_live_location_sharing.sql` and `00019_spot_waitlist.sql`
- `00020_recurring_schedules.sql` and `00020_admin_rls_policies.sql`

Do not rename these files after a project has been deployed. Supabase tracks
migrations by filename version, so renaming them can make already-applied SQL
look new and cause it to run again. Before using the Supabase CLI, compare the
local files with `supabase_migrations.schema_migrations` and reconcile the
history in a controlled maintenance migration or a fresh development database.

For new schema work, use a unique version greater than `00053`.
