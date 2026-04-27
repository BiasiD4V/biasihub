"""
Download Node.js portable and use supabase-js to check if tables exist,
then create them via a workaround if possible.
"""
import urllib.request
import zipfile
import os
import sys
import json

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPTS_DIR)
NODE_DIR = os.path.join(SCRIPTS_DIR, "node")
NODE_EXE = os.path.join(NODE_DIR, "node.exe")

# Download Node.js if not already present
if not os.path.exists(NODE_EXE):
    print("Downloading Node.js portable...")
    url = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
    zip_path = os.path.join(SCRIPTS_DIR, "node.zip")
    urllib.request.urlretrieve(url, zip_path)
    print("Extracting...")
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(SCRIPTS_DIR)
    # Rename extracted folder
    extracted = os.path.join(SCRIPTS_DIR, "node-v20.18.0-win-x64")
    os.rename(extracted, NODE_DIR)
    os.remove(zip_path)
    print(f"Node.js extracted to {NODE_DIR}")
else:
    print(f"Node.js already at {NODE_EXE}")

# Verify node works
import subprocess
result = subprocess.run([NODE_EXE, "--version"], capture_output=True, text=True)
print(f"Node.js version: {result.stdout.strip()}")

# Now install supabase CLI
NPM_EXE = os.path.join(NODE_DIR, "npm.cmd")
print("\nInstalling @supabase/supabase-js locally...")

# Create a small JS script to create the tables using the management API
# Actually, let's install the supabase CLI
print("Installing supabase CLI...")
result = subprocess.run(
    [NPM_EXE, "install", "-g", "supabase"],
    capture_output=True, text=True, cwd=NODE_DIR,
    env={**os.environ, "PATH": NODE_DIR + ";" + os.environ.get("PATH", "")}
)
print(f"Install output: {result.stdout[-500:]}")
if result.returncode != 0:
    print(f"Install error: {result.stderr[-500:]}")

SUPABASE_CMD = os.path.join(NODE_DIR, "supabase.cmd")
if not os.path.exists(SUPABASE_CMD):
    SUPABASE_CMD = os.path.join(NODE_DIR, "npx.cmd")

print(f"\nDone. Node at: {NODE_EXE}")
