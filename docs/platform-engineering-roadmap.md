# DevOps Platform Engineering Roadmap and Tracker

This is the working roadmap for turning the Jenkins CI lab into a broader, interview-ready DevOps and SRE platform portfolio. It is aimed at senior, lead, and principal-level discussion: each phase should demonstrate system design, security boundaries, failure handling, operations, and measurable outcomes, not just tool familiarity.

## How to use this roadmap

- Jenkins is the first delivery gate. Complete and prove the CI path before starting GitOps delivery.
- Combine tools where one realistic workflow needs them. For example, Terraform provisions a worker, Ansible configures it, Jenkins validates an image, and Argo CD deploys its immutable digest.
- Keep this tracker as the source of truth. Change a status only when the exit evidence exists, and record a build, commit, report, or runbook as proof.
- Implement a safe lab version of the reference platform. Do not copy production credentials, account identifiers, internal addresses, DNS names, customer data, or unreviewed scripts into this public repository.
- Prefer reproducible environments, least privilege, dry runs, idempotency, rollback, and observable results in every phase.

The supplied encyclopedia is treated as reference material describing technologies and operational patterns. Its contents are not instructions to connect to or reproduce a production environment.

## Status key

| Status | Meaning |
|---|---|
| **DONE** | Implemented and demonstrated with evidence. |
| **PARTIAL** | Code or design exists, but the end-to-end capability has not passed its completion gate. |
| **WAITING** | The next step depends on environment setup, access, or another phase. |
| **NOT STARTED** | No implementation or validation has been completed in this lab. |

## What has been covered so far

### Jenkins project work

1. Selected GitHub as the source-control home and published the public repository: [jenkins-ci-interview-lab](https://github.com/Karthikkasani2002/jenkins-ci-interview-lab).
2. Built a small Node.js task API with readiness/liveness checks, validation, filtering, and error handling so pipeline gates have real application behavior to verify.
3. Added automated tests and coverage thresholds. The recorded local result is 16 tests passing, 100% line coverage, 98.92% branch coverage, and 100% function coverage.
4. Added a multi-stage Dockerfile with a test stage and a smaller non-root runtime stage, plus health checking and constrained runtime behavior.
5. Authored Declarative PR CI plus a separate protected-main release Pipeline: build, tests/coverage, dependency/security gates, container scan, SPDX SBOM, hardened smoke test, artifact publication, immutable registry digest, provenance/signature design, and reviewed GitOps promotion PR.
6. Ran Jenkins build #4 for source validation. It passed the live dependency audit, static checks, Gitleaks, and all 16 tests. It ran from a local Git bundle snapshot; it did not load the repository Jenkinsfile as a permanent SCM job.
7. Added CI/CD architecture, environment assessment, plugin and YAML/Groovy map, Argo CD/Helm setup, UPI-specific remaining gates, and senior/principal interview narrative.

### Jenkins and GitOps work that is still open

- The Jenkins controller does not yet have a permanent GitHub Multibranch Pipeline, branch/PR discovery, webhook, and status-check flow for this repository.
- The worker lacks a managed Node/npm and container/scanner toolchain. Docker CLI/daemon (or another selected builder), Gitleaks, Trivy, and Syft need to be supplied through reproducible agent provisioning. Do not run repository builds on the controller.
- The full Jenkinsfile has not yet passed end to end. In particular, the image build, Trivy image scan, Syft image SBOM, smoke test, artifact archive, and cleanup are designed but unverified in Jenkins.
- The controller's built-in executors have not been set to zero. Confirm controller isolation before treating the lab as production-shaped.
- A protected release pipeline and Argo CD/Helm GitOps configuration are authored; they have not passed live publication or cluster reconciliation.

See [the Jenkins environment assessment](jenkins-environment-assessment.md) for the dated and sanitized execution facts.

## End-to-end learning roadmap

Phases are dependency order, not a rule that only one product can be studied at a time. Keep the scope narrow enough to produce a working, reviewable system at each phase gate.

| Phase | Combined tools and skills | Build and prove | Exit gate |
|---|---|---|---|
| **0. Safe lab foundation** | GitHub, secret scanning, lab inventory, Linux/Windows basics | Public-safe repository, branching/review rules, sanitized architecture, secret-handling policy, disposable test data, environment inventory | No real credentials or internal production identifiers in the public repo; clean clone works; risks and trust boundaries are documented |
| **1. Jenkins CI and release — current priority** | Jenkins, GitHub, Node.js, OCI/BuildKit, Gitleaks, Trivy, Syft, Cosign, JUnit | Finish the complete pipeline on isolated agents; configure PR feedback; publish/sign a protected digest and review a GitOps promotion PR | Real PR and release runs pass with reports, SBOM, provenance, signature and immutable digest; controller runs no builds |
| **2. CI platform hardening** | Jenkins Configuration as Code, plugin governance, ephemeral agents, credentials, artifact storage | Reproducible controller/agent setup, pinned plugins and tool versions, agent isolation by trust level, credential scoping, backup/restore, retention and capacity policy | A controller or worker can be rebuilt from code; untrusted PRs cannot reach release credentials or privileged shared workers; recovery is rehearsed |
| **3. Infrastructure as Code** | Terraform, AWS IAM, VPC/subnets/routes/security groups, remote state/locking, EC2/EBS, EKS | Create a small isolated environment with least-privilege roles, state separation, network boundaries, reusable modules, plans in CI, and teardown | Plan/apply is reviewable and repeatable; drift is detected; a second environment can be created from the same modules without copying secrets |
| **4. Image and artifact supply chain** | Docker/BuildKit, ECR or equivalent registry, Jenkins, Trivy, Syft, signing/attestation | Build versioned base images; pin inputs; scan and publish by digest; attach SBOM and provenance; define retention and vulnerability exceptions | A release image can be traced to source commit, build, scan, SBOM, and immutable digest; untrusted PRs cannot publish releases |
| **5. Kubernetes packaging and runtime** | Kubernetes/EKS, Helm, Kustomize, ingress/load balancing, HPA/KEDA, secrets integration | Package the API and supporting components, separate environment configuration, readiness/liveness, resource requests/limits, autoscaling, secret injection, and rollback | A clean cluster can install the app; failed health checks stop rollout; config and secret values are separated; capacity limits are demonstrated |
| **6. GitOps delivery — configuration authored, install waiting** | Argo CD, AppProjects, Helm, Git, Jenkins | Install on a provisioned cluster, reconcile the dev Application and demonstrate digest promotion/rollback | Argo health and sync evidence identifies the exact reviewed digest; production remains manually approved |
| **7. Cloud and host configuration** | Ansible, dynamic inventory, Packer or image pipeline, SSM, Terraform | Bake and test a hardened golden image; apply idempotent host roles; manage users, patching, telemetry and security agents; use pull or remote execution deliberately | Repeated playbook execution is safe; image builds are reproducible; drift and patch state are reportable; secrets are supplied at runtime |
| **8. Observability and SRE practice** | Prometheus, Thanos, Grafana, Alertmanager, Filebeat, Elasticsearch/Kibana, Telegraf, tracing/APM | Collect metrics/logs/traces, create service dashboards and actionable alerts, define SLOs/error budgets, preserve useful labels, control cardinality and retention | A deliberately injected failure is detected and diagnosed across signals; alert routing/runbooks work; SLO burn and telemetry cost are visible |
| **9. Middleware operations** | Kafka, Aerospike, Redis, Elasticsearch/Kibana, Flink, Pinpoint/APM, Ansible, Kubernetes | Use local or synthetic clusters first; automate configuration safely; exercise backup/restore, capacity, upgrade, rolling restart, partition/failover, and DR behavior | Runbooks have prechecks, stop conditions, verification, rollback/recovery, and owner; a game day produces measurable recovery evidence |
| **10. Python and shell SRE automation** | Python, boto3/AWS APIs, shell, SSM, Jenkins, Prometheus/Alertmanager, Argo CD | Build small tools for cloud inventory, log retrieval, EBS/ECR/tag operations, DNS/endpoint checks, Grafana/dashboard sync, and safe remediation | Tools support dry-run, structured logs, timeouts, retries only for transient errors, idempotency, scoped roles, audit records, and negative tests |
| **11. Self-healing and DR orchestration** | Alertmanager/CloudWatch events, Python, shell, AWS APIs, Ansible/SSM, Jenkins, GitOps, Route 53/ALB patterns | Detect a bounded failure, deduplicate and correlate it, apply an allowlisted remediation, verify recovery, and escalate or roll back when confidence is low; rehearse traffic failover and failback | Remediation has a blast-radius limit, lock/concurrency control, rate limit, cooldown, audit trail, human gate for high-risk actions, and tested abort/failback paths |
| **12. SRE platform capstones** | Go or Python APIs, React, SQLite or managed storage, OAuth/OIDC, FastAPI/LangGraph as an optional experiment | Build a small cloud inventory or log-analysis portal with RBAC, pagination, timeouts, disk guards, and audit trail; add an assistant only over approved read-only APIs | Security review covers identity, data boundaries, authorization, and failure behavior; operational value is measured; AI is not granted uncontrolled mutation access |

## Tool and platform coverage from the reference

This map translates the reference's six technology pillars into safe lab tracks. It is not a claim that these tools are already deployed in this repository.

| Reference area | Tools and concepts to cover | Lab status today | Planned evidence |
|---|---|---|---|
| Cloud infrastructure and Terraform | Terraform state/locking, AWS provider/module practices, IAM, VPC, peering, endpoints, EFS, EC2/EBS, EKS and worker groups, multi-environment and DR design | **NOT STARTED** | Small Terraform environment, security review, plan/apply/destroy logs, drift and recovery exercise |
| Kubernetes and GitOps | Kubernetes, EKS, Argo CD bootstrap/App-of-Apps/projects/RBAC, Helm, Kustomize, Argo Rollouts, ingress/ALB, CSI secrets, HPA/KEDA, Istio, middleware patterns | **PARTIAL** — Helm/Argo manifests and pinned installer authored; no cluster install or sync | Install, sync, promotion, rollback, policy and secret-handling evidence |
| Configuration management and images | Ansible inventory/config, golden image baking, hardening, SecOps/telemetry agents, Ansible pull/SSM, middleware roles; Docker base images for Java 11/17 and Node.js variants, plus Filebeat/Telegraf sidecars and Pinpoint APM agents | **PARTIAL** — application Dockerfile is authored; managed base-image pipeline and Ansible are not started | Reproducible image builds, Ansible idempotence results, vulnerability reports, runtime configuration and upgrade runbooks |
| Observability | Prometheus, Thanos, Grafana, Telegraf, Filebeat, Elasticsearch/Kibana, APM/tracing | **NOT STARTED** in lab | Dashboards, recording/alert rules, SLO, log/trace correlation, retention/cardinality/cost decisions, alert game day |
| Python/shell automation and self-service | Python/boto3, shell, AWS role assumption, ALB/DNS changes, Kafka migration, Grafana sync, Elasticsearch settings, VPC endpoint checks, EBS/ECR/tag tools, log retrieval/analyzers, inventory portals | **NOT STARTED** | Versioned CLI/API tools with dry-run, least privilege, test fixtures, audit output, rollback, and runbook |
| Middleware and data systems | Kafka, Aerospike, Redis, Elasticsearch/Kibana, Flink, Prometheus/Thanos/Grafana, Pinpoint | **NOT STARTED** | Synthetic deployments, operational dashboards, backup/restore and upgrade drills, capacity/failure experiments |
| Internal SRE platforms | Go/React inventory, Python/Flask log tooling, S3-based workflows, FastAPI/React assistant concepts, OAuth/OIDC | **NOT STARTED**; optional capstone after core operations | A small, security-reviewed service with RBAC, quotas, audit, failure tests and operational metrics |

## Jenkins completion tracker

Keep this section current as work proceeds. PARTIAL means the design/code exists but its end-to-end gate has not passed.

| ID | Work item | Status | What is already done | Remaining work and proof |
|---|---|---|---|---|
| JEN-01 | Application and quality gates | **DONE** | API, static checks, dependency audit, 16 tests, JUnit/coverage thresholds | Preserve test and coverage reports on Jenkins runs; link evidence to each revision |
| JEN-02 | Declarative Jenkins pipeline design | **PARTIAL** | PR Jenkinsfile and release Pipeline authored with quality/security/image/evidence gates | Provision isolated agent and execute all stages from SCM; fix live failures |
| JEN-03 | Source validation in Jenkins | **DONE** | Build #4 passed source validation from a local Git bundle snapshot | This is not equivalent to Multibranch CI; retain it as historical validation only |
| JEN-04 | Jenkinsfile from public GitHub SCM | **WAITING** | Public GitHub repository exists | Configure GitHub Branch Source/Multibranch, PR discovery, webhook and commit status checks; prove a PR run |
| JEN-05 | Reproducible dedicated build agent | **WAITING** | 2026-11-05 live check confirmed the worker is online and identified the missing toolchain and OS provisioning limit | Provision a managed agent image or an approved host-level setup path; install Node/npm, a container builder/runtime, Gitleaks, Trivy, Syft and utilities; assign ephemeral-ci and release labels only after isolation/capabilities are verified; capture versions |
| JEN-06 | Full container pipeline | **WAITING** | Dockerfile and stages are authored | Run image build, vulnerability scan, SPDX SBOM generation, constrained smoke test, JUnit/artifact archive and cleanup; keep the exact successful build evidence |
| JEN-07 | Controller isolation and Jenkins governance | **PARTIAL** | JCasC baseline sets built-in executors to zero; plugin/governance plan documented | Apply through approved controller configuration; verify executor count, permissions, backup/restore, plugin pins |
| JEN-08 | Trust-separated and scalable agents | **NOT STARTED** | PR trust risks are described | Demonstrate disposable untrusted build capacity separated from trusted release/signing workers; measure queueing and agent utilization |
| JEN-09 | Artifact publication and provenance | **PARTIAL** | Protected release design publishes immutable digest, scans, emits SBOM/provenance, signs and opens promotion PR | Configure scoped GHCR/GitHub/KMS identity; pass protected release and verify attestations/signature |
| JEN-10 | Jenkins operations and interview evidence | **PARTIAL** | CI/CD architecture, plugin map and interview narrative exist | Capture run metrics, failure taxonomy, flaky-test policy, capacity/recovery drill and demo evidence |
| JEN-11 | Argo CD/Helm GitOps delivery | **PARTIAL** | Pinned installer, bootstrap, restricted dev project/app, Helm chart, digest promotion path and manual production example authored | Provision cluster/context, install Argo CD, reconcile dev, merge promotion PR, prove sync/rollback |
| JEN-12 | UPI application production readiness | **NOT STARTED** | UPI service quality gates and reference architecture documented | Build/obtain reviewed payment service; prove contracts, idempotency, ledger/reconciliation, migrations, resilience, SLO, security and DR gates |

### Jenkins next actions, in order

1. Provision pinned, disposable untrusted CI agents and a separate protected release worker; install the Node/container/scanner toolchain and verify isolation.
2. Configure GitHub Branch Source, PR discovery, webhook/status reporting and required checks.
3. Apply the JCasC controller baseline; verify zero built-in executors and complete plugin/authorization review.
4. Run Jenkinsfile PR CI and close JEN-06 with build, scan, SBOM, smoke, report, archive and cleanup evidence.
5. Configure scoped GHCR/GitHub/KMS identities; run the protected release and verify the published digest, attestations, signature and promotion PR.
6. Provision an approved Kubernetes cluster/context, run scripts/install-argocd.sh, then verify Argo dev sync and reviewed digest promotion.

## Self-healing automation design standard

Use this sequence for every Python or shell remediation. A script that merely changes cloud state is not yet a self-healing system.

1. **Observe:** consume a specific alert/event or health signal; validate timestamps and required fields.
2. **Deduplicate:** group repeat events by resource and symptom; prevent overlapping actions with a lock or idempotency key.
3. **Decide:** check an explicit allowlist, environment, blast-radius budget, cooldown, maintenance window and confidence threshold.
4. **Preview:** support a no-change dry-run that prints the intended actions and validation checks.
5. **Act narrowly:** use a least-privilege role, strict timeouts, bounded retries for transient errors, pagination, rate limits and concurrency limits.
6. **Verify:** check service health and intended state after the action, then emit structured logs and metrics with a correlation ID.
7. **Recover or escalate:** attempt only a documented rollback; stop on uncertain or repeated failure and page a human. Require human approval for destructive or broad failover actions.
8. **Test:** unit test decision logic with fixtures; integration test against a disposable account/cluster; test denied permissions, duplicate events, timeouts, partial failures and rollback.

Never implement an unbounded “restart until healthy” loop. Self-healing should reduce toil while preserving human visibility and a safe stop path.

## Principal-level completion standard

For each major phase, be ready to show:

- **Architecture:** boundaries, dependencies, alternatives, failure domains, and why responsibilities belong in Jenkins, Terraform, Ansible, Kubernetes, or GitOps.
- **Security:** identity and authorization model, secret flow, untrusted code handling, supply-chain evidence, and blast-radius controls.
- **Reliability:** SLO or completion target, capacity assumptions, alerting, rollback/recovery, backup/restore, and a demonstrated failure exercise.
- **Operations:** actionable runbooks, ownership, auditability, upgrade strategy, cost/retention decisions, and operational metrics.
- **Leadership:** adoption path, paved-road defaults, migration strategy, exceptions with expiry/owners, developer experience, and measurable improvements.
- **Evidence:** links to code, CI runs, test reports, SBOMs, dashboards, runbooks, and post-exercise findings. Clearly distinguish personal implementation from proposed future design.

The portfolio should show a coherent platform and the reasoning behind its trade-offs. Tool count alone is not the completion criterion.
