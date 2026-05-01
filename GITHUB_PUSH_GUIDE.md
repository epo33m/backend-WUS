# GitHub Push Guide — After Fixing an Issue

Steps to follow after any fix is complete and tests are passing locally.

---

## 1. Create a Feature Branch

```bash
git checkout -b fix/<issue-id>-<short-description>
```

**Examples:**
```bash
git checkout -b fix/be1-jest-bun-compat
git checkout -b fix/be3-auth-validation
git checkout -b feat/be7-user-profile
```

> Branch naming convention:
> - Bug fix: `fix/<issue-id>-<short-description>`
> - New feature: `feat/<issue-id>-<short-description>`
> - Chore/config: `chore/<issue-id>-<short-description>`

---

## 2. Stage the Changed Files

Stage only the files related to your fix:

```bash
git add <file1> <file2> ...
```

Or stage all changes at once:

```bash
git add .
```

---

## 3. Commit with a Descriptive Message

```bash
git commit -m "<type>: <short description> (#<issue-number>)"
```

**Examples:**
```bash
git commit -m "fix: downgrade Jest to 29.7.0 for Bun compat (#5)"
git commit -m "feat: add user authentication endpoint (#12)"
git commit -m "chore: update env config (#8)"
```

> Common commit types: `fix`, `feat`, `chore`, `refactor`, `test`, `docs`

---

## 4. Push the Branch to GitHub

```bash
git push origin fix/<issue-id>-<short-description>
```

---

## 5. Open a Pull Request

1. Go to the repository on GitHub
2. Click **"Compare & pull request"** (shown after pushing)
3. Fill in the PR:
   - **Title**: `<type>: <short description> (#<issue-number>)`
   - **Description**: always include `Closes #<issue-number>` so the issue auto-closes on merge

**PR description template:**
```
## Summary
Brief explanation of what was changed and why.

## Changes
- Change 1
- Change 2
- Change 3

## Testing
Describe how you tested the fix (e.g. `bun run test`).

Closes #<issue-number>
```

---

## 6. Merge the Pull Request

Once reviewed (or self-approved), click **"Merge pull request"**.

The linked issue will close automatically because of `Closes #<issue-number>` in the PR description.

---

## 7. Clean Up (Optional)

Delete the branch locally and remotely after merging:

```bash
git branch -d fix/<issue-id>-<short-description>
git push origin --delete fix/<issue-id>-<short-description>
```
