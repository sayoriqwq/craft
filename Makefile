.PHONY: test verify-framework verify-generated verify-routing verify-scripts package regenerate install-codex-plugin install-codex-skill

test: verify-framework verify-generated verify-routing verify-scripts

verify-framework:
	python3 scripts/verify_skills.py --root .

regenerate:
	python3 scripts/build_metadata.py --root .

verify-generated:
	python3 scripts/build_metadata.py --root . --check

verify-routing:
	python3 scripts/check_routing_drift.py --root .

verify-scripts:
	git diff --check
	bash -n scripts/package-skill.sh
	python3 -m py_compile \
	  scripts/verify_skills.py \
	  scripts/skill_frontmatter.py \
	  scripts/build_metadata.py \
	  scripts/packaging_filter.py \
	  scripts/check_routing_drift.py \
	  scripts/validate_package.py

package:
	./scripts/package-skill.sh dist/mini-waza.zip

install-codex-plugin:
	python3 scripts/install-codex-plugin.py --root .
	codex plugin marketplace add ~

install-codex-skill:
	npx skills add . -a codex -g --skill ym-aiming -y --full-depth
