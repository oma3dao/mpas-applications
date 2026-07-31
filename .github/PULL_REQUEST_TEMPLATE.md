## Risk Level

<!-- Choose one: low / medium / high / red-zone -->

**Risk:** low

## Summary

<!-- What does this PR do? Keep it brief. -->

## Testing Performed

<!-- What did you test? Manual steps, automated tests, etc. -->

## CI Status

<!-- Confirm CI is green before merging. -->

- [ ] All required checks pass

## Self-Merge

<!-- If you are merging this without a second reviewer, fill out this section. Otherwise delete it. -->

- [ ] This is a self-merge
- **Reason for emergency self-merge:**
  <!-- e.g., failed build blocking work, docs correction, low-risk typo -->
- **Post-merge reviewer:** @<!-- tag someone to review after merge -->

---

### Self-Merge Policy Reference

**Allowed self-merge examples:**
- Failed build blocking work
- Low-risk typo / config fix
- Docs or ROADMAP correction
- Dependency / security patch in a bridge `package.json`
- Test-only or fixture-only changes
- CI / workflow fixes that do not broaden permissions

**Never self-merge (red-zone):**
- Plugin operation classification / impact changes
- Governed vs pass-through tool surface changes
- `plugin.json`, `registry-entry.json`, or `artifactDid` changes
- Bridge dispatch or approval-gating behavior
- Credential / secrets in configs or examples
- GitHub Actions permission changes
- Deployment credentials

---

### Labels

Apply any that fit:
`self-merged` · `emergency` · `post-merge-review-needed` · `launch-blocker` · `low-risk` · `security` · `red-zone` · `plugin-change` · `bridge-change`
