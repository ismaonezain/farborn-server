import subprocess, sys, os

# Find npx path
npx = "npx"
if os.name == "nt":
    # Windows: try common paths
    for p in ["npx.cmd", "npx.exe"]:
        try:
            subprocess.run([p, "--version"], capture_output=True, check=True)
            npx = p
            break
        except:
            pass

token = input("Paste Turso auth token: ").strip()
if not token:
    print("No token entered"); sys.exit(1)

# Remove old token first
subprocess.run([npx, "vercel", "env", "rm", "TURSO_AUTH_TOKEN", "production", "--yes"], shell=True)

# Add new token
proc = subprocess.Popen(
    [npx, "vercel", "env", "add", "TURSO_AUTH_TOKEN", "production", "--yes"],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True
)
out, err = proc.communicate(input=token + "\n")
print(out)
if err: print(err)

# Redeploy
print("\nRedeploying...")
result = subprocess.run([npx, "vercel", "--prod", "--yes"], capture_output=True, text=True, shell=True, cwd=os.getcwd())
print(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
if result.returncode != 0:
    print("STDERR:", result.stderr[-500:])
print("✅ Done!")
