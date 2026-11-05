# Jenkins CI production stack and study map

## Included

- Jenkinsfile: Declarative PR CI with parallel tests/source security, image build, Trivy, SPDX SBOM, constrained container smoke test, JUnit, artifacts and cleanup.
- Jenkinsfile.release: separate protected-main release design. It pushes an immutable image, emits BuildKit provenance/SBOM, scans and smoke-tests the digest, signs through Cosign/KMS, and opens a reviewed dev GitOps PR.
- jenkins/casc.yaml: controller baseline with zero controller executors.
- Optional Kubernetes agent YAML, a hardened Helm chart, Argo CD bootstrap/apps, and guarded Argo CD install script.

The small task API stores state in memory. These files demonstrate delivery patterns; they do not make this code a UPI/payment service.

## Jenkins plugin inventory recorded 2026-11-05

| Capability | Lab controller | Purpose |
|---|---|---|
| Pipeline Aggregator, Pipeline Groovy/CPS, Pipeline Job | Installed | Jenkinsfile execution |
| Git | Installed | SCM checkout |
| Credentials | Installed | Central credential store |
| JUnit | Installed | Test reports |
| Configuration as Code | Installed | Controller settings from YAML |
| SSH Build Agents | Installed | Current static worker connection |
| GitHub Branch Source | Missing | Multibranch branches/PR discovery, webhooks, status checks |
| Credentials Binding | Not verified | Needed to scope publisher/GitOps credentials |
| Docker Pipeline | Missing | Not required; pipeline calls Docker/buildx CLI |
| Kubernetes plugin | Not installed/verified | Optional disposable pod agents; requires a cluster |
| Matrix Authorization or Role Strategy | Not verified | Choose one authorization model and test least privilege |

Exact installed plugin versions were not captured. Pin them before calling controller rebuilds reproducible. Review compatibility and security advisories before upgrade; stage updates and rehearse JENKINS_HOME restore. Keep the plugin set small.

Production extensions by need:
- GitHub Branch Source is the immediate missing PR integration.
- Credentials Binding scopes GHCR and GitOps tokens; use short-lived cloud identity for KMS where supported.
- Kubernetes plugin enables disposable agents after cluster setup. The example pod has no Docker socket and no Kubernetes API token.
- Docker Pipeline is optional. CLI use avoids a plugin dependency, but Docker daemon access remains privileged.
- Lockable Resources is for genuinely shared test environments, not unit-test serialization.
- Warnings NG can publish linter/compiler findings.
- Shared Libraries make sense for reviewed logic reused across teams; trusted libraries have Jenkins privileges and need strong review/version controls.
- Terraform, Ansible and Argo CD can be invoked as tools or own their lifecycle; they do not need Jenkins plugins.

## Groovy and YAML roles

Jenkins Pipeline is authored in a Jenkinsfile using Declarative or Scripted Pipeline syntax, both based on Groovy. Jenkins does not provide a first-party production YAML replacement for Jenkinsfile stages. Groovy handles stages, parallelism, credential scope, conditions, timeouts, retries and post actions.

YAML belongs to the platform config consumed by Jenkins/Kubernetes: JCasC, Kubernetes Pod templates, Helm values/resources, and Argo CD Applications/AppProjects. Those files are versioned in Git but do not replace Pipeline logic.

## CI stage evidence

| Gate | Evidence |
|---|---|
| Checkout/preflight | Clean workspace, tool versions, reachable builder, lockfile install |
| Tests | All tests; 100% line/function and at least 95% branch coverage; JUnit |
| Source security | Syntax, npm audit, Gitleaks, Trivy configuration scan |
| Container | Multi-stage build reruns tests; source/revision labels |
| Image | Trivy all-findings report plus a blocking gate for fixable high/critical findings, and Syft SPDX JSON |
| Smoke | Non-root, read-only root, dropped capabilities, CPU/memory/PID bounds, health and API calls |
| Post | JUnit, archived/fingerprinted reports, image/container cleanup |

Release credentials are separate from PR CI. The protected release job expects ghcr-publisher (GHCR write only) and github-gitops-bot (promotion branch/PR only); KMS uses the configured worker identity and alias. Never store token values in Git.

## Interview coverage

Declarative syntax, Pipeline stages/options/parallel/post, SCM and PR checks, test reports, agent labels and isolation, controller executors, credential scope, immutable images, SBOM/provenance/signing, promotion and rollback, queue and feedback-time metrics, utilization, flaky-rate policy, vulnerability age, and recovery.

## UPI-specific gates still required

1. Replace the sample with a reviewed service and approved PSP/bank/NPCI boundaries. No payment integration/data is present.
2. Add idempotency/replay tests, signed partner requests, authorization, audit and contract/version tests.
3. Add durable ledger/state semantics, reconciliation invariants, database expand/contract migration checks and recovery tests. In-memory state fails these.
4. If used, test Kafka schema compatibility, ordering, partitions, retries, DLQ, replay and duplicates; test Redis/Aerospike outage and consistency behavior only for selected components.
5. Add isolated integration tests, fault injection, load tests against approved SLOs, and capacity evidence. Do not invent TPS.
6. Add PII/PCI classification, encryption/key rotation, secret retrieval, retention/deletion, threat model and compliance review.
7. Add SLO dashboards, correlated logs/traces, alerts/runbooks, DR and restore exercises, safe rollback/forward-fix.
8. Use progressive delivery only with meaningful business and technical health signals, pause/abort thresholds, and audited human approval.

These are remaining portfolio goals, not claims from this lab. See docs/upi-ci-cd-architecture.md and docs/platform-engineering-roadmap.md.


## Official references

- [Jenkins Pipeline and Jenkinsfile from SCM](https://www.jenkins.io/doc/book/pipeline/getting-started/)
- [Jenkins Configuration as Code](https://www.jenkins.io/doc/book/managing/casc/)
- [GitHub Branch Source plugin](https://plugins.jenkins.io/github-branch-source/)
- [Jenkins controller isolation](https://www.jenkins.io/doc/book/security/controller-isolation/)

## Advanced Jenkins interview coverage matrix

| Topic | Present in this lab | What to prove next |
|---|---|---|
| Declarative vs Scripted Pipeline and Groovy CPS | Declarative Jenkinsfiles; design discussion | Explain when a small Scripted block is useful; avoid non-serializable state across Pipeline suspension and keep heavy logic in tested scripts/libraries |
| SCM and Multibranch | Jenkinsfile from SCM design; GitHub Branch Source is missing | Configure PR discovery strategy, fork trust policy, webhook/status checks, protected branch rules, and prove a real PR revision |
| Pipeline controls | timeout, timestamps, retention, concurrency control, parallel, post/always, JUnit, archive/fingerprint | Demonstrate when/branch conditions, fail-fast choice, bounded retries for transient infrastructure, and abort/cleanup behavior |
| Matrix and reusable libraries | Documented extension path; not implemented | Use a matrix only for real version/architecture coverage; version and review a trusted Shared Library before multiple jobs depend on it |
| Agent scheduling and isolation | Separate ephemeral-ci and release labels designed; actual worker unavailable | Provision single-build agents, test cleanup after forced termination, measure queue time/capacity, and ensure no PR reaches release credentials |
| Credentials and authorization | Separate credential IDs and stage scopes designed; binding plugin not verified | Enable credential binding, folder/job permissions, Matrix Authorization or Role Strategy, SSO, audit, rotation and denied-access tests |
| Plugin/extensions governance | Current plugin inventory recorded; no pinned plugin catalog | Export exact plugin versions, check compatibility/advisories, test updates in staging, restore JENKINS_HOME, minimize plugin permissions |
| JCasC and controller recovery | YAML baseline authored; not applied | Set CASC_JENKINS_CONFIG, apply in a non-prod controller, restart/reload, diff live config, and rehearse backup/restore |
| Reports and artifact storage | JUnit and archived/fingerprinted evidence | Separate short-lived Jenkins artifacts from durable registry/object-store evidence; prove retention, retrieval and integrity |
| Shared test resources | Lockable Resources/Throttle Concurrent Builds are optional, not installed | Use locks only for a shared sandbox; set capacity limits and lock timeouts; never serialize independent unit tests |
| Supply chain | BuildKit SBOM/provenance, Trivy findings, Syft SPDX, Cosign/KMS signing/verification designed | Run protected release; verify digest/signature/attestations from a separate identity and attach exception owner/expiry |
| Delivery ownership | Promotion PR and Argo reconciliation designed | Prove Argo drift correction, dev promotion, manual production gate, rollback by reverting the digest, and deployment health evidence |

Production plugin choices are driven by this capability matrix. Common candidates beyond those already recorded are Warnings NG, a code coverage publisher, Lockable Resources, Throttle Concurrent Builds, an S3/artifact manager, Prometheus metrics, audit logging, and an authorization/SSO integration. Each adds update and permission surface; add it only for an owned requirement and pin its tested version.

Interviewers may ask about Pipeline restart/resume, “Restart from Stage,” Replay permissions, script approval, sandboxing, CPS serialization, controller upgrades, queue starvation, agent loss, stale workspaces, flaky tests, and secret exposure in fork PRs. For each, answer with the failure boundary, default behavior, recovery evidence and metric rather than only naming a feature.
