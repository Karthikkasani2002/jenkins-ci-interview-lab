# Jenkins environment assessment (public-safe copy)

Checked on 2026-11-03 while preparing the CI interview lab. Private network addresses, internal URLs, usernames, and agent filesystem paths are omitted from this public copy.

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

There is no Docker, containerd, BuildKit, Podman, or active LXD runtime. The agent account lacks noninteractive sudo. Package downloads are available after the agent is provisioned.

## Validation already completed

- Local `npm run check` passed.
- Local tests passed: 16 tests, 100% line coverage, 98.92% branch coverage, and 100% function coverage.
- The offline, cache-based npm audit reported zero vulnerabilities; it was not a live registry audit.
- The JUnit conversion output contained 16 tests and zero failures or errors.
- Jenkins source validation passed on build #4 from local commit `109f141`: Node.js 24.18.0, `npm ci`, static checks, online npm audit (0 vulnerabilities), Gitleaks 8.30.1 (no leaks), and all 16 tests. Jenkins recorded 16 passed, 0 failed, 0 skipped, with 100% line coverage, 98.92% branch coverage, and 100% function coverage.
- Jenkins successfully connected to the agent after the pfSense network path became available. A temporary Jenkins pipeline verified the agent state and was then deleted.

## Work required before a full Jenkins run

1. Provision the dedicated agent with the tools above. Prefer a version-pinned, managed agent image or VM configuration over installing tools during every build.
2. Assign `linux` and `docker` labels only after those capabilities are available.
3. Configure a Multibranch Pipeline for the public repo `https://github.com/Karthikkasani2002/jenkins-ci-interview-lab`. Install GitHub Branch Source and configure pull-request discovery and webhooks/status reporting.
4. For controller isolation, set the built-in node executor count to zero; this assessment did not change it.

The temporary source-validation job uses a local Git bundle snapshot and is not the production Jenkinsfile-from-SCM job. The Docker build, Trivy image scan, Syft image SBOM, and container smoke test have not run because the agent does not currently have a container runtime.

