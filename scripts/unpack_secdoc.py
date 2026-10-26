import os
import shutil
import zipfile

sec_dir = os.path.abspath(".tmp_clones/secdoc_ai_skills")
out_dir = os.path.abspath(".agents/skills")

if os.path.exists(sec_dir):
    for f in os.listdir(sec_dir):
        if f.endswith(".skill") or f.endswith(".zip"):
            stem = f.replace(".skill", "").replace(".zip", "")
            archive_path = os.path.join(sec_dir, f)
            target_dir = os.path.join(out_dir, "secdoc-" + stem)
            os.makedirs(target_dir, exist_ok=True)
            try:
                with zipfile.ZipFile(archive_path, 'r') as z:
                    z.extractall(target_dir)

                # If extracted inside a subfolder, flatten it
                items = os.listdir(target_dir)
                if len(items) == 1 and os.path.isdir(os.path.join(target_dir, items[0])):
                    sub = os.path.join(target_dir, items[0])
                    for subf in os.listdir(sub):
                        shutil.move(os.path.join(sub, subf), os.path.join(target_dir, subf))
                    os.rmdir(sub)

                # Check SKILL.md and normalize
                skill_md = os.path.join(target_dir, "SKILL.md")
                if os.path.exists(skill_md):
                    with open(skill_md, encoding="utf-8", errors="ignore") as smf:
                        content = smf.read()
                    if not content.startswith("---"):
                        title = stem.replace("-", " ").title()
                        fm = f'---\nname: "{title}"\ndescription: "SecDoc security and network engineering skill for {title}."\ncategory: "cybersecurity"\n---\n\n'
                        with open(skill_md, "w", encoding="utf-8") as smf:
                            smf.write(fm + content)
                print(f"Extracted and configured secdoc-{stem}")
            except Exception as e:
                print(f"Error extracting {f}: {e}")
