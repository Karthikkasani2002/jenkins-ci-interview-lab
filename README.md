# Jenkins CI Interview Lab

A portfolio-ready CI exercise for a Node.js HTTP API. It demonstrates Jenkins Pipeline as Code, isolated agent execution, parallel quality gates, container build and smoke testing, security scanning, SBOM generation, test reports, and cleanup.

The service is intentionally small so the discussion can focus on CI architecture and operational tradeoffs. It stores tasks in memory and is not a production business service.

## Git choice

This public portfolio repository is `Karthikkasani2002/jenkins-ci-interview-lab`. Its `main` branch contains the CI lab and interview material; pull requests and branch protection are the recommended team workflow.

## What the API covers

- GET /health/live and GET /health/ready
- GET /api/v1/tasks with open or done filtering
- POST /api/v1/tasks with JSON, length, and field validation
- GET, PATCH, and DELETE /api/v1/tasks/:id
- Request IDs, safe error responses, size limits, and readiness failures

## CI flow

GitHub branch or pull request revision -> Jenkins Pipeline as Code -> dedicated Linux Docker agent -> preflight and dependency audit -> parallel tests, static checks, and secret scan -> build tested container image -> Trivy scan and SPDX SBOM -> container health and API smoke checks -> JUnit, SBOM, and image metadata.

| Stage | Gate or evidence |
|---|---|
| Checkout and preflight | Clean workspace, Node/npm/Docker/scanner versions, reachable Docker daemon |
| Source checks | Syntax check, dependency audit, 100% line coverage, 95%+ branch coverage, secret scan |
| Container build | Multi-stage build reruns the test suite; runtime image excludes tests |
| Image security and SBOM | Trivy blocks high/critical findings; Syft writes SPDX JSON |
| Container smoke test | Health endpoint, API request, non-root user, read-only root filesystem |
| Post actions | JUnit report, archived SBOM/labels, container and image cleanup |

The Jenkinsfile uses Declarative Pipeline with a Jenkinsfile checked into source control, as recommended by the [Jenkins Pipeline documentation](https://www.jenkins.io/doc/book/pipeline/). The pipeline builds and verifies an image but does not publish or deploy it. That keeps the later GitOps delivery integration as a separate step.


## Current lab execution

The local Jenkins controller's `jenkins-source-validation` job passed build #4 from commit `109f141`: live dependency audit, Gitleaks, static checks, and all 16 tests with JUnit and coverage results. That job used a local Git bundle snapshot; it is a validation job, not the permanent Jenkinsfile-from-SCM job. The full Jenkinsfile's Docker build, Trivy image scan, Syft SBOM, and container smoke test still require the agent to be provisioned with a container runtime and the listed tools. See [the environment assessment](docs/jenkins-environment-assessment.md) for sanitized controller and agent status.
## Run locally

Requirements: Node.js 24 or newer. There are no third-party npm dependencies.

    npm ci
    npm run check
    npm test

The tests call the request handler in-process, so they do not need a local listening port. For a JUnit report:

    mkdir -p test-results
    node --test --test-reporter=junit > test-results/node-junit.xml
    node scripts/junit-to-suite.js test-results/node-junit.xml test-results/junit.xml

With Docker installed, build and run the container:

    docker build --pull --tag jenkins-ci-interview-lab:local .
    docker run --rm --publish 3000:3000 jenkins-ci-interview-lab:local
    curl --fail http://127.0.0.1:3000/health/ready

The image uses a non-root user, a read-only runtime filesystem, a health check, and a separate test build stage. Docker recommends multi-stage builds, excluding irrelevant files with .dockerignore, and switching to a non-root user when possible; see [Docker build best practices](https://docs.docker.com/build/building/best-practices/).

## Connect Jenkins

1. Configure a Multibranch Pipeline for `https://github.com/Karthikkasani2002/jenkins-ci-interview-lab` and point it at `Jenkinsfile`. The repo is public, so source checkout does not need a read credential.
2. Install GitHub Branch Source and configure branch and pull-request discovery plus webhooks/status reporting. The current controller does not yet have this plugin or a permanent SCM job; its successful source-validation job used a local Git bundle snapshot.
3. Configure the agent label `linux && docker` only after the worker has Node.js 24+, npm, Docker CLI and daemon, curl, sed, seq, Gitleaks, Trivy, and Syft.
4. Keep Node and scanner versions in a managed agent image. Pin base images and scanner binaries by digest or version.
5. Set the built-in Jenkins node executor count to zero. Run builds on agents, not the controller. Jenkins documents this controller-isolation recommendation in [Managing Nodes](https://www.jenkins.io/doc/book/managing/nodes/) and [Controller Isolation](https://www.jenkins.io/doc/book/security/controller-isolation/).
### Agent security

Docker daemon access is privileged. The demo uses a static Docker agent label, so restrict it to this trusted lab repository. For untrusted pull requests in production, use disposable isolated agents and a separated builder; do not share a privileged Docker socket or deployment credentials with arbitrary pull-request code. Keep controller credentials out of build workspaces.

## Branch model

- Short-lived feature branches.
- Pull requests into protected main.
- Require Jenkins checks and review before merge.
- Use squash merge for a readable mainline.
- Add release tags and registry publication later, with immutable image digests.

## Senior and principal-level discussion

Treat Jenkins as a developer platform, not just a sequence of shell commands. Track queue time, p50/p95 feedback time, flaky-test rate, agent utilization, failure category, time to restore a broken main branch, and vulnerability age. Set a feedback-time target, then optimize bottlenecks with measured caches, parallelism, and agent capacity.

Discuss trust boundaries before speed: controller isolation, ephemeral agents, separate untrusted and trusted workloads, credential scope, and provenance of build artifacts. Avoid blind retries on test failures; retry only a known transient operation and preserve the original failure evidence.

See docs/architecture.md and docs/interview-guide.md for the system design and interview narrative.


## Roadmap and tracker

Use the [DevOps platform engineering roadmap](docs/platform-engineering-roadmap.md) to track Jenkins completion and the next integrated phases across Terraform, Kubernetes/GitOps, Ansible, observability, middleware, and Python/shell SRE automation. The tracker distinguishes demonstrated work from designs and pending environment setup.
