"""Exercise the actual publication script against disposable local Git remotes."""
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/commit-honour-roll.sh"
DATA = "public/data/regular-budget-contributors-2026.json"
EVIDENCE = "data/honour-roll/honourroll-2026.html"


class HonourRollCommitTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.remote, self.work = root / "origin.git", root / "work"
        self.work.mkdir()
        self.git("init", "--bare", str(self.remote))
        self.git("init", "--initial-branch=main")
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("remote", "add", "origin", str(self.remote))
        self.write(DATA, '{"accepted":"old"}\n')
        self.write("unrelated.txt", "preserve\n")
        self.git("add", ".")
        self.git("commit", "-m", "baseline")
        self.git("push", "-u", "origin", "main")
        self.initial = self.git("rev-parse", "HEAD")
        diagnostics = root / "diagnostics"
        diagnostics.mkdir()
        (diagnostics / "report.json").write_text(json.dumps({"year": 2026, "check_only": False}))
        self.env = {**os.environ, "HONOUR_ROLL_DIAGNOSTICS": str(diagnostics)}

    def git(self, *args, **kwargs):
        result = subprocess.run(["git", *args], cwd=self.work, text=True, capture_output=True, **kwargs)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def write(self, relative, content):
        path = self.work / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def run_commit(self):
        return subprocess.run(["bash", str(SCRIPT)], cwd=self.work, env=self.env, capture_output=True, text=True)

    def remote_head(self):
        return self.git("--git-dir", str(self.remote), "rev-parse", "main")

    def test_only_accepted_data_and_evidence_are_committed_and_pushed(self):
        self.write(DATA, '{"accepted":"new"}\n')
        self.write(EVIDENCE, "validated source\n")
        self.write("unexpected-untracked.txt", "must never be staged\n")
        result = self.run_commit()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotEqual(self.remote_head(), self.initial)
        changed = self.git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").splitlines()
        self.assertEqual(set(changed), {DATA, EVIDENCE})
        self.assertEqual(self.git("status", "--porcelain"), "?? unexpected-untracked.txt")

    def test_no_change_is_successful_without_fabricating_dates_or_commits(self):
        result = self.run_commit()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.remote_head(), self.initial)
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_unexpected_tracked_changes_stop_publication(self):
        self.write(DATA, "new\n")
        self.write("unrelated.txt", "unexpected build mutation\n")
        result = self.run_commit()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unexpected changes", result.stdout)
        self.assertEqual(self.remote_head(), self.initial)

    def test_preexisting_staged_changes_stop_publication(self):
        self.write("unrelated.txt", "staged by another process\n")
        self.git("add", "unrelated.txt")
        result = self.run_commit()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unexpected staged", result.stdout)
        self.assertEqual(self.remote_head(), self.initial)

    def test_concurrent_main_update_fails_instead_of_rebasing_untested_data(self):
        other = self.work.parent / "other"
        self.git("clone", "--branch=main", str(self.remote), str(other))
        subprocess.run(["git", "-C", str(other), "config", "user.name", "Concurrent"], check=True)
        subprocess.run(["git", "-C", str(other), "config", "user.email", "concurrent@example.invalid"], check=True)
        (other / "new-source-rule.txt").write_text("new review rule\n")
        for args in [("add", "."), ("commit", "-m", "concurrent change"), ("push", "origin", "main")]:
            result = subprocess.run(["git", "-C", str(other), *args], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
        concurrent_head = self.remote_head()
        self.write(DATA, "new based on old source rules\n")
        result = self.run_commit()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("main changed", result.stdout)
        self.assertEqual(self.remote_head(), concurrent_head)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.initial)

    def test_branch_protection_rejection_is_fatal(self):
        hook = self.remote / "hooks/pre-receive"
        hook.write_text("#!/bin/sh\nexit 1\n")
        hook.chmod(0o755)
        self.write(DATA, "new\n")
        result = self.run_commit()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("pre-receive hook declined", result.stderr)
        self.assertEqual(self.remote_head(), self.initial)

    def test_schedule_keepalive_does_not_modify_website_data(self):
        old = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
        self.git("commit", "--amend", "--no-edit", env={**os.environ, "GIT_AUTHOR_DATE": old, "GIT_COMMITTER_DATE": old})
        self.git("push", "--force", "origin", "main")
        result = self.run_commit()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git("log", "-1", "--format=%s"), "chore: keep nightly honour-roll schedule active")
        self.assertEqual(self.git("diff", "HEAD~", "HEAD"), "")


if __name__ == "__main__":
    unittest.main()
