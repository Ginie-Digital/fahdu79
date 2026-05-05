import json

old_path = '/Users/giniedigital/Documents/fahdu_latest/fahdu/package.json'
new_path = '/Users/giniedigital/Documents/fahdu79/package.json'

with open(old_path, 'r') as f:
    old_pkg = json.load(f)

with open(new_path, 'r') as f:
    new_pkg = json.load(f)

old_deps = old_pkg.get('dependencies', {})
new_deps = new_pkg.get('dependencies', {})

old_dev_deps = old_pkg.get('devDependencies', {})
new_dev_deps = new_pkg.get('devDependencies', {})

missing_deps = [pkg for pkg in old_deps if pkg not in new_deps]
missing_dev_deps = [pkg for pkg in old_dev_deps if pkg not in new_dev_deps]

print("### Dependencies present in OLD but missing in NEW:")
for dep in sorted(missing_deps):
    print(f"- {dep}: {old_deps[dep]}")

print("\n### DevDependencies present in OLD but missing in NEW:")
for dep in sorted(missing_dev_deps):
    print(f"- {dep}: {old_dev_deps[dep]}")
