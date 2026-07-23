#!/usr/bin/env bash
#
# init-repo.sh — reapply this template's protections to a repository created from it.
# GitHub does not copy repository settings when you "Use this template", so run this
# once against the new repository.
#
# Usage:
#   scripts/init-repo.sh <owner>/<repo>                 apply settings + branch protection
#   scripts/init-repo.sh <owner>/<repo> --with-checks   also require the ci and pr-title checks
#
# --with-checks needs the ci and pr-title workflows to have run at least once (open a
# pull request first): GitHub will not require a status check it has never seen.
#
# Requires the GitHub CLI (gh), authenticated with admin access to the repository.

set -euo pipefail

BRANCH="main"

usage() {
  echo "Usage: $0 <owner>/<repo> [--with-checks]" >&2
  exit 2
}

repo=""
with_checks=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --with-checks) with_checks=true ;;
    -h | --help) usage ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      ;;
    *)
      if [ -n "$repo" ]; then
        echo "Unexpected argument: $1" >&2
        usage
      fi
      repo="$1"
      ;;
  esac
  shift
done

[ -n "$repo" ] || usage

echo "Applying template protections to $repo"

gh api "repos/$repo" -X PATCH --input - >/dev/null <<'JSON'
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "delete_branch_on_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "COMMIT_MESSAGES",
  "has_wiki": false,
  "has_projects": false
}
JSON
echo "  merge strategy and surface settings applied"

gh api "repos/$repo/actions/permissions/workflow" -X PUT --input - >/dev/null <<'JSON'
{ "default_workflow_permissions": "read", "can_approve_pull_request_reviews": false }
JSON
echo "  default workflow token set to read-only"

gh api "repos/$repo/vulnerability-alerts" -X PUT >/dev/null
echo "  Dependabot alerts enabled"

if gh api "repos/$repo" -X PATCH --input - >/dev/null 2>&1 <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
then
  echo "  secret scanning and push protection enabled"
else
  echo "  secret scanning skipped (needs Advanced Security on private repos)"
fi

if [ "$with_checks" = true ]; then
  required_checks='{ "strict": true, "contexts": ["ci", "pr-title"] }'
else
  required_checks="null"
fi

gh api "repos/$repo/branches/$BRANCH/protection" -X PUT --input - >/dev/null <<JSON
{
  "required_status_checks": $required_checks,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "restrictions": null
}
JSON
echo "  branch protection applied to $BRANCH"

gh api "repos/$repo/branches/$BRANCH/protection/required_signatures" -X POST >/dev/null
echo "  signed commits required on $BRANCH"

if [ "$with_checks" = true ]; then
  echo "Done. Required checks: ci, pr-title."
else
  echo "Done. Re-run with --with-checks once ci and pr-title have run to require them."
fi
