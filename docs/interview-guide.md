# Interview guide: Jenkins CI at senior and principal scope

## 30-second answer

“I use Jenkins as an orchestration control plane and run builds on isolated agents. Every change gets fast, deterministic feedback: syntax and dependency checks, API tests with coverage, secret scanning, a container build, vulnerability scanning, an SBOM, and a smoke test. The pipeline stores evidence and cleans up. Jenkins does not deploy; a GitOps controller will later reconcile an immutable image digest. I measure feedback time, flakiness, queue delay, and recovery time, then improve the slowest bottleneck.”

## Two-minute walkthrough

1. Source control: short-lived branches and pull requests into protected main. Jenkins Multibranch discovers branch and PR revisions. The merge rule requires a successful CI status and review.
2. Orchestration: the controller schedules work but does not execute repository code. A dedicated Linux agent supplies Node, Docker, and pinned scanners.
3. Quality gates: independent checks run in parallel and return JUnit and coverage evidence. The gates include dependency and secret scanning.
4. Artifact: the Dockerfile runs tests in a build stage, then copies only the runtime files into a non-root image.
5. Validation: Trivy scans the image, Syft generates an SPDX SBOM, and a constrained container smoke test verifies readiness and an API request.
6. Delivery boundary: Jenkins stops after CI evidence. A separate GitOps workflow will promote the immutable image digest.

## Decisions and tradeoffs

### Why Declarative Pipeline?

Declarative Pipeline makes stages, agents, options, post actions, and parallel work visible during review. Keep business logic in tested scripts or a versioned shared library instead of embedding a large Groovy program in the Jenkinsfile.

### Why split controller and agent?

Source-controlled build code is executable code. Running it on the controller gives it access to the controller's filesystem and process identity. Agents isolate the controller and let the platform scale compute separately.

### Why not blindly retry a failed test?

A retry can hide flakiness and burn capacity. Retry only a known transient infrastructure operation with a bounded attempt count, capture the first failure, and track retry rate as a reliability signal.

### How do you handle untrusted pull requests?

Do not expose secrets or a shared privileged Docker daemon. Use disposable agents and a separate builder for untrusted changes. Reserve signing, publishing, and release credentials for protected, reviewed revisions.

### How do you keep pipelines fast?

Measure queue and stage durations first. Parallelize independent checks, use deterministic dependency caches with trust-aware keys, right-size agents, and remove redundant work. Keep a p95 feedback target and validate that optimizations do not reduce coverage or security.

### How do you handle a failing vulnerability gate?

Identify the affected package and exploitability, check whether a fixed version exists, and record an owner and expiry for any exception. Do not turn off the scanner or add a broad permanent ignore. Keep scan output and SBOM tied to the exact image digest.

## Metrics to discuss

- Queue delay and p50/p95 time from commit to result.
- Flaky-test and retry rate.
- Agent saturation and capacity by workload class.
- Failure rate by stage and actionable versus infrastructure failures.
- Time to restore a broken main branch.
- Vulnerability age and exception age.
- Cache hit rate, image build duration, and storage use.

## Growth plan

With three years of experience, show senior-level scope through one end-to-end system you can explain and operate: design, implementation, failure modes, metrics, and follow-up improvements. For lead or principal interviews, connect local pipeline decisions to platform-wide standards, trust boundaries, cost, developer experience, migration strategy, and measurable reliability goals. Be clear about what you personally built and what you would change at larger scale.

## Follow-up scenario prompts

- Jenkins queue time doubles after adding integration tests. What do you measure before scaling?
- A pull request can run arbitrary Docker build steps. How do you isolate it?
- A test flakes only on one agent. How do you prove whether it is code, environment, or resource contention?
- A critical image CVE has no fix. What is the response and who owns the exception?
- GitOps fails to reconcile after a new image is published. Which system owns rollback and how is the digest traced?
- Jenkins controller disk is full. Which data is disposable, which is durable, and how do you prevent recurrence?
