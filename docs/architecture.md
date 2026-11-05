# CI architecture and operational model

## System view

GitHub PR -> Jenkins controller -> disposable untrusted CI agent -> parallel tests/security -> container build/scan/SBOM/smoke -> JUnit evidence. Protected main -> trusted release worker -> registry digest/signature/attestations -> reviewed GitOps PR -> Argo CD reconciliation.

The repository is public. The current Jenkins source-validation job still uses a local bundle snapshot; GitHub Branch Source, webhooks, and a permanent SCM job are not configured yet.
The release job publishes the image and requests a GitOps change; Argo CD owns deployment reconciliation. Neither PR CI nor Jenkins directly applies application manifests.

## Trust boundaries

1. Jenkins controller stores job configuration and credentials. It schedules work and should not execute repository code.
2. Agent workspaces execute source-controlled scripts and tests. Treat that code as untrusted until reviewed.
3. Docker daemon access can control the host. The PR pipeline label must resolve only to disposable single-build agents; do not point it at the current shared static worker. Keep a separate trusted release pool.
4. Credentials should be scoped to the stage that needs them. PR CI has no release credentials. The protected release job scopes registry and GitOps write identities to the stages that need them; KMS signing uses a restricted worker identity.
5. The release output is evidence plus a signed immutable digest. A reviewed Git change promotes it; Argo CD reconciles environment configuration.

Jenkins recommends running builds on agents and setting the built-in node executor count to zero; see [Controller Isolation](https://www.jenkins.io/doc/book/security/controller-isolation/).

## Gate design

- Syntax and dependency audit: catch invalid JavaScript and vulnerable direct/transitive packages.
- Unit/API tests: exercise health checks, CRUD, filtering, validation, invalid requests, response headers, and body limits.
- Secret scan: reject committed credentials before image construction.
- Container build: the test stage reruns the test suite; the runtime stage copies only the application.
- Image scan: retain all high/critical findings and fail on those with available fixes; time-bound and assign an owner to unfixed risk.
- SBOM: create SPDX JSON for downstream tracking and release evidence.
- Smoke test: start with constrained privileges, wait for health, call the API, and assert the runtime user.

The test report and SBOM are useful evidence, but they are not proof of artifact authenticity. A later supply-chain phase can add signed provenance and attestations.

## Reliability and scaling

- Bound each run with a pipeline timeout.
- Keep independent checks parallel; allow them to finish so a failed pull request still produces useful diagnostics.
- Prevent overlapping builds of the same job when a newer revision supersedes an older one.
- Store JUnit and SBOM evidence; remove temporary containers and images to control agent disk use.
- Track queue time, p50/p95 pipeline duration, flaky-test rate, stage failure categories, agent saturation, cache hit rate, and time to recover main.
- Scale agents based on queue delay and job resource profiles. Keep caches isolated by trust domain; do not let untrusted builds poison trusted build caches.

## Boundary for GitOps

This pipeline stops after producing and testing a local image. The next phase can publish the image, record its digest and provenance, and open a configuration change for a GitOps controller. The GitOps controller should own environment reconciliation and promotion; Jenkins should not apply manifests directly.

