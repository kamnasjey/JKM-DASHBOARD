#!/usr/bin/env python3
"""Fix corrupted StartScanRequest and add userId properly"""

SCAN_ENGINE_PATH = "/opt/JKM-AI-BOT/core/scan_engine_v2.py"

with open(SCAN_ENGINE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the corrupted line
old_corrupted = '''class StartScanRequest(BaseModel):
     \\Request to start scanner\\\\n    userId: str = \\
    """Request to start scanner"""
    strategyId: str'''

new_fixed = '''class StartScanRequest(BaseModel):
    """Request to start scanner"""
    userId: str = ""
    strategyId: str'''

if old_corrupted in content:
    content = content.replace(old_corrupted, new_fixed)
    print("✅ Fixed corrupted StartScanRequest")
else:
    # Try alternate fix
    if '\\Request to start scanner' in content:
        lines = content.split('\n')
        new_lines = []
        skip_next = False
        for i, line in enumerate(lines):
            if '\\Request to start scanner' in line:
                skip_next = True
                continue
            if skip_next and line.strip().startswith('"""Request'):
                skip_next = False
                new_lines.append('    """Request to start scanner"""')
                new_lines.append('    userId: str = ""')
                continue
            new_lines.append(line)
        content = '\n'.join(new_lines)
        print("✅ Fixed via line-by-line")
    else:
        print("⚠️ No corruption found or already fixed")

with open(SCAN_ENGINE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
