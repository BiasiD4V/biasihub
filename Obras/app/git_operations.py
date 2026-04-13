import subprocess, os

cwd = r"c:\Users\rodrigo\OneDrive - BIASI\Documentos\Claude\Gestão Obra\erp-biasi"

# Stage all
r1 = subprocess.run(["git", "add", "-A"], cwd=cwd, capture_output=True, text=True)
print("add:", r1.stdout, r1.stderr)

# Status
r2 = subprocess.run(["git", "status", "--short"], cwd=cwd, capture_output=True, text=True)
print("status:", r2.stdout)

# Commit
commit_msg = """feat: notifications bell, user dropdown menu, scroll-to-top, fix manage-user Edge Function

- Header.jsx: notifications panel with read/unread state, click-outside close
- Header.jsx: user avatar dropdown with profile info and logout
- Layout.jsx + ScrollToTop.jsx: auto scroll-to-top on sidebar navigation
- manage-user/index.ts: replace getUser() with JWT decode to fix 401 auth error
- Usuarios.jsx: improved error handling in chamarManageUser helper
- vercel.json: add /api/* rewrite rule

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"""

r3 = subprocess.run(["git", "commit", "-m", commit_msg], cwd=cwd, capture_output=True, text=True)
print("commit:", r3.stdout, r3.stderr)

# Push
r4 = subprocess.run(["git", "push"], cwd=cwd, capture_output=True, text=True)
print("push:", r4.stdout, r4.stderr)
