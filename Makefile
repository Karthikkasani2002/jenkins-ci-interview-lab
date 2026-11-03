.PHONY: check test container-build container-smoke

check:
	npm run check

test:
	npm test

container-build:
	docker build --pull --tag jenkins-ci-interview-lab:local .

container-smoke: container-build
	@set -eu; name="jenkins-ci-interview-lab-smoke"; docker rm --force "$$name" >/dev/null 2>&1 || true; \
	  docker run --detach --name "$$name" --publish 127.0.0.1::3000 \
	    --read-only --tmpfs /tmp --cap-drop=ALL --security-opt=no-new-privileges:true \
	    jenkins-ci-interview-lab:local >/dev/null; \
	  trap 'docker rm --force "$$name" >/dev/null 2>&1 || true' EXIT INT TERM; \
	  port=$$(docker port "$$name" 3000/tcp | sed 's/.*://'); \
	  for attempt in $$(seq 1 30); do \
	    curl --fail --silent "http://127.0.0.1:$$port/health/ready" >/dev/null && break; \
	    sleep 1; \
	  done; \
	  curl --fail --silent --show-error "http://127.0.0.1:$$port/health/live"
