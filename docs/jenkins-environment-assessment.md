# Jenkins environment assessment (public-safe copy)

Initial check on 2026-11-03; live recheck on 2026-11-05. Private network addresses, internal URLs, usernames, and agent filesystem paths are omitted from this public copy.

## Live recheck on 2026-11-05

A temporary read-only Jenkins job confirmed that the worker accepts builds and captured its current capabilities. The diagnostic job was deleted after the check.

- Jenkins controller and worker are online; the worker runs Ubuntu 24.04.1 with one executor.
- Node.js, npm, Docker, Podman, Buildah, BuildKit, nerdctl, Gitleaks, Trivy, and Syft are unavailable on the worker.
- Unprivileged user namespaces are disabled, rootless build helpers are absent, and noninteractive sudo is unavailable.
- The controller still has two built-in executors. GitHub Branch Source and Docker Pipeline are not installed.

No container build, image scan, SBOM, or container smoke test ran during this recheck.
## Controller and nodes

- Jenkins is reachable inside the private Hyper-V lab. Its private URL and exact version are omitted here.
- A temporary local-only `jenkins-source-validation` job passed build #4. The production Jenkinsfile is not yet configured as a permanent SCM job.
- The built-in node is online with 2 executors.
- The static Ubuntu agent runs Ubuntu 24.04 on x86_64 with one executor. Its lab address and home path are omitted.
- Its configured label is only `agent-static-1`; the project Jenkinsfile expects `linux && docker`.
- The Git, Pipeline, and JUnit plugins are installed. GitHub Branch Source and Docker Pipeline are not installed.

## Agent toolchain

The agent has Git and curl. These required pipeline tools are missing:

- Node.js and npm
- Docker CLI and Docker daemon
- Gitleaks
- Trivy
- Syft

No pipeline-ready container builder/runtime is configured for this agent. The rootless build path is unavailable, and noninteractive sudo is not available for host-level provisioning.

## Validation already completed

- Local `npm run check` passed.
- Local tests passed: 16 tests, 100% line coverage, 98.92% branch coverage, and 100% function coverage.
- The offline, cache-based npm audit reported zero vulnerabilities; it was not a live registry audit.
- The JUnit conversion output contained 16 tests and zero failures or errors.
- Jenkins source validation passed on build #4 from local commit `109f141`: Node.js 24.18.0, `npm ci`, static checks, online npm audit (0 vulnerabilities), Gitleaks 8.30.1 (no leaks), and all 16 tests. Jenkins recorded 16 passed, 0 failed, 0 skipped, with 100% line coverage, 98.92% branch coverage, and 100% function coverage.
- Jenkins successfully connected to the agent after the pfSense network path became available. A temporary Jenkins pipeline verified the agent state and was then deleted.

## Work required before a full Jenkins run

1. Provision the dedicated agent with the tools above. The current worker account cannot install host packages through noninteractive sudo, so use a managed agent image or provide a controlled OS-level provisioning path.
2. Assign `linux` and `docker` labels only after those capabilities are available.
3. Configure a Multibranch Pipeline for the public repo `https://github.com/Karthikkasani2002/jenkins-ci-interview-lab`. Install GitHub Branch Source and configure pull-request discovery and webhooks/status reporting.
4. For controller isolation, set the built-in node executor count to zero; this assessment did not change it.

The temporary source-validation job uses a local Git bundle snapshot and is not the production Jenkinsfile-from-SCM job. The Docker build, Trivy image scan, Syft image SBOM, and container smoke test have not run because the agent does not currently have a container runtime.
