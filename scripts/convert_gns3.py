import os
import yaml

gns3_dir = os.path.abspath(".tmp_clones/gns3_skills/injection")
out_dir = os.path.abspath(".agents/skills")

if os.path.exists(gns3_dir):
    for f in os.listdir(gns3_dir):
        if not (f.endswith(".yaml") or f.endswith(".yml")):
            continue
        stem = f.replace(".yaml", "").replace(".yml", "")
        full_path = os.path.join(gns3_dir, f)
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as yf:
                data = yaml.safe_load(yf)
            if not data:
                continue
            name = data.get("name", stem.replace("_", " ").title())
            desc = data.get("description", "GNS3 Network protocol fault injection and troubleshooting skill.")
            protocols = data.get("protocols", [])
            issues = data.get("issues", {})
            
            target_dir = os.path.join(out_dir, f"gns3-{stem.replace('_', '-')}")
            os.makedirs(target_dir, exist_ok=True)
            
            proto_list = "\n".join([f"- {p}" for p in protocols]) if protocols else "- General IP Routing"
            md_content = f"""---
name: "{name}"
description: "{desc}"
category: "computer-networking"
---

# {name}

{desc}

## Supported Protocols
{proto_list}

## Fault Injection Scenarios & Troubleshooting Procedures

"""
            if isinstance(issues, dict):
                for issue_key, issue_info in issues.items():
                    if not isinstance(issue_info, dict):
                        continue
                    i_name = issue_info.get("name", issue_key)
                    i_desc = issue_info.get("description", "")
                    i_sev = issue_info.get("severity", "medium")
                    i_symptoms = issue_info.get("symptoms", [])
                    i_hints = issue_info.get("troubleshooting_hints", [])
                    
                    md_content += f"### {i_name} (Severity: {i_sev.upper()})\n\n"
                    md_content += f"{i_desc}\n\n"
                    if i_symptoms:
                        md_content += "**Diagnostic Symptoms:**\n"
                        for s in i_symptoms:
                            md_content += f"- {s}\n"
                        md_content += "\n"
                    if i_hints:
                        md_content += "**Troubleshooting Commands & Remediation:**\n"
                        for h in i_hints:
                            md_content += f"- `{h}`\n"
                        md_content += "\n"
            
            with open(os.path.join(target_dir, "SKILL.md"), "w", encoding="utf-8") as outf:
                outf.write(md_content)
            print(f"Configured gns3-{stem.replace('_', '-')}")
        except Exception as e:
            print(f"Error converting {f}: {e}")

