import os
import re

def find_hook_violations(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    violations = []
    has_return = False
    return_line = -1

    for i, line in enumerate(lines):
        if re.search(r'^\s*return\b(?!(\s*\(?\s*=>|\s*{|\s*null|\s*undefined))', line):
            if not has_return:
                has_return = True
                return_line = i + 1

        if re.search(r'\b(use[A-Z][a-zA-Z0-9]+|useState|useEffect|useMemo|useCallback|useContext|useRef)\s*\(', line):
            if has_return:
                violations.append((return_line, i + 1, line.strip()))

    return violations


def scan_project(root_dir):
    all_violations = {}
    skip_dirs = {'node_modules', '.next', 'dist', '.expo', 'assets'}

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                path = os.path.join(root, file)
                try:
                    v = find_hook_violations(path)
                    if v:
                        all_violations[path] = v
                except Exception:
                    pass

    return all_violations


violations = scan_project(r'h:\site\bookyourground')
for path, v in violations.items():
    print(f"File: {path}")
    for vr, vh, line in v:
        print(f" Return at line {vr} -> Hook at line {vh}: {line}")