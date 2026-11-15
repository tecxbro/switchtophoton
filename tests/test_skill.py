"""Offline consistency checks for the portable Markdown skill."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "switch-to-keiki"
SOURCES = {
    "linq", "photon", "sendblue", "inkbox", "blooio", "project-blue",
    "loopmessage", "agentphone", "chert", "zerosettle", "bluebubbles",
}
GATE = "APPROVE SWITCH TO KEIKI PLAN"


class SkillTests(unittest.TestCase):
    def test_entrypoint_and_approval_gate(self):
        md = (SKILL / "SKILL.md").read_text()
        self.assertRegex(md, r"(?m)^name: switch-to-keiki$")
        for path in (ROOT / "README.md", SKILL / "SKILL.md", SKILL / "plan-template.md"):
            self.assertIn(GATE, path.read_text(), path)
        self.assertFalse((ROOT / "skills" / "switch-to-photon").exists())

    def test_exact_provider_inventory(self):
        folder = SKILL / "providers"
        self.assertEqual({x.stem for x in folder.glob("*.md")} - {"index"}, SOURCES)
        index = (folder / "index.md").read_text()
        for name in SOURCES:
            self.assertIn(f"]({name}.md)", index)
            self.assertIn("https://", (folder / f"{name}.md").read_text())

    def test_local_links_and_stale_targets(self):
        for path in [ROOT / "README.md", *SKILL.rglob("*.md")]:
            md = path.read_text()
            self.assertNotRegex(md, r"(?i)approve switch to photon plan|photon-(targets|evidence)\.md")
            for link in re.findall(r"\]\(([^)]+)\)", md):
                local = link.partition("#")[0]
                if local and not local.startswith(("https://", "http://")):
                    with self.subTest(file=str(path), link=link):
                        self.assertTrue((path.parent / local).exists())


if __name__ == "__main__":
    unittest.main()
