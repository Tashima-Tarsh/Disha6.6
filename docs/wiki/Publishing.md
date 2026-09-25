# Publishing the GitHub Wiki

GitHub stores a repository Wiki in a **separate Git repository**. Merging `docs/wiki/*.md` into the main code repository does not create Wiki-tab pages. The versioned pages here are the source to review and publish.

A maintainer with GitHub write access should open the repository's **Wiki** tab and create the first `Home` page if the Wiki has never been initialized. Then clone the Wiki repository and copy the reviewed pages across:

```bash
git clone https://github.com/Tashima-Tarsh/Disha6.6.wiki.git
cp /path/to/Disha6.6/docs/wiki/*.md Disha6.6.wiki/
cd Disha6.6.wiki
git add .
git commit -m "docs: publish disha6.6 wiki"
git push origin HEAD
```

Use your own authorized GitHub credentials. Review the copied files before committing; do not copy `docs/internal/`, private evidence, or secrets. The `_Sidebar.md` file provides Wiki navigation. After publishing, open the Wiki Home, Architecture, Getting Started, API and Data, and Operations pages and check links and Mermaid rendering. Re-publish when versioned source changes; the repository does not currently contain an automatic Wiki sync workflow.
