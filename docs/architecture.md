# CI architecture and operational model

## System view

GitHub main or pull-request revision -> Jenkins controller (orchestration only) -> isolated Linux Docker agent -> parallel source and security gates -> container build -> image scan and SBOM -> smoke tests -> JUnit and evidence artifacts.

The repository is public. The current Jenkins source-validation job still uses a local bundle snapshot; GitHub Branch Source, webhooks, and a permanent SCM job are not configured yet.
GitOps delivery will be a separate workflow after CI. Jenkins stops after producing and verifying the image.

## Trust boundaries

1. Jenkins controller stores job configuration and credentials. It schedules work and should not execute repository code.
2. Agent workspaces execute source-controlled scripts and tests. Treat that code as untrusted until reviewed.
3. Docker daemon access can control the host. The lab pipeline requires a dedicated agent. A production setup should use disposable agents or a remote/rootless builder for pull requests and separate trusted release work from untrusted PR work.
4. Credentials should be scoped to the stage that needs them. This CI example needs no credentials because it does not push an image.
5. The output is evidence and a tested local image. The next delivery step should publish an immutable image digest and let GitOps promote that digest through environment-specific configuration.

Jenkins recommends running builds on agents and setting the built-in node executor count to zero; see [Controller Isolation](https://www.jenkins.io/doc/book/security/controller-isolation/).

## Gate design

- Syntax and dependency audit: catch invalid JavaScript and vulnerable direct/transitive packages.
- Unit/API tests: exercise health checks, CRUD, filtering, validation, invalid requests, response headers, and body limits.
- Secret scan: reject committed credentials before image construction.
- Container build: the test stage reruns the test suite; the runtime stage copies only the application.
- Image scan: fail on high or critical unfixed findings. Triage exceptions rather than hiding them with a blanket ignore.
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

