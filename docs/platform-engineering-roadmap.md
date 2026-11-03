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
5. Authored a Declarative Jenkinsfile with checkout/preflight, parallel source checks, dependency audit, tests and JUnit output, secret scanning, image build, Trivy image scan, Syft SPDX SBOM, container smoke test, evidence archiving, and cleanup.
6. Ran Jenkins build #4 for source validation. It passed the live dependency audit, static checks, Gitleaks, and all 16 tests. It ran from a local Git bundle snapshot; it did not load the repository Jenkinsfile as a permanent SCM job.
7. Wrote CI architecture, environment assessment, and interview notes covering trust boundaries, controller isolation, agent strategy, failure handling, metrics, and the GitOps boundary.

### Jenkins work that is still open

- The Jenkins controller does not yet have a permanent GitHub Multibranch Pipeline, branch/PR discovery, webhook, and status-check flow for this repository.
- The worker lacks a managed Node/npm and container/scanner toolchain. Docker CLI/daemon (or another selected builder), Gitleaks, Trivy, and Syft need to be supplied through reproducible agent provisioning. Do not run repository builds on the controller.
- The full Jenkinsfile has not yet passed end to end. In particular, the image build, Trivy image scan, Syft image SBOM, smoke test, artifact archive, and cleanup are designed but unverified in Jenkins.
- The controller's built-in executors have not been set to zero. Confirm controller isolation before treating the lab as production-shaped.
- Image publication, immutable digest promotion, signing/provenance, and deployment are intentionally later gates; the current CI design does not deploy.

See [the Jenkins environment assessment](jenkins-environment-assessment.md) for the dated and sanitized execution facts.

## End-to-end learning roadmap

Phases are dependency order, not a rule that only one product can be studied at a time. Keep the scope narrow enough to produce a working, reviewable system at each phase gate.

| Phase | Combined tools and skills | Build and prove | Exit gate |
|---|---|---|---|
| **0. Safe lab foundation** | GitHub, secret scanning, lab inventory, Linux/Windows basics | Public-safe repository, branching/review rules, sanitized architecture, secret-handling policy, disposable test data, environment inventory | No real credentials or internal production identifiers in the public repo; clean clone works; risks and trust boundaries are documented |
| **1. Jenkins CI — current priority** | Jenkins, GitHub, Node.js, Docker/OCI, Gitleaks, Trivy, Syft, JUnit | Complete the existing pipeline on a managed dedicated agent; add Multibranch/PR feedback; retain reports and SBOM; measure queue and feedback time | A GitHub PR triggers the Jenkinsfile from SCM; required checks pass; image is built, scanned, smoke-tested, and cleaned up; controller runs no builds |
| **2. CI platform hardening** | Jenkins Configuration as Code, plugin governance, ephemeral agents, credentials, artifact storage | Reproducible controller/agent setup, pinned plugins and tool versions, agent isolation by trust level, credential scoping, backup/restore, retention and capacity policy | A controller or worker can be rebuilt from code; untrusted PRs cannot reach release credentials or privileged shared workers; recovery is rehearsed |
| **3. Infrastructure as Code** | Terraform, AWS IAM, VPC/subnets/routes/security groups, remote state/locking, EC2/EBS, EKS | Create a small isolated environment with least-privilege roles, state separation, network boundaries, reusable modules, plans in CI, and teardown | Plan/apply is reviewable and repeatable; drift is detected; a second environment can be created from the same modules without copying secrets |
| **4. Image and artifact supply chain** | Docker/BuildKit, ECR or equivalent registry, Jenkins, Trivy, Syft, signing/attestation | Build versioned base images; pin inputs; scan and publish by digest; attach SBOM and provenance; define retention and vulnerability exceptions | A release image can be traced to source commit, build, scan, SBOM, and immutable digest; untrusted PRs cannot publish releases |
| **5. Kubernetes packaging and runtime** | Kubernetes/EKS, Helm, Kustomize, ingress/load balancing, HPA/KEDA, secrets integration | Package the API and supporting components, separate environment configuration, readiness/liveness, resource requests/limits, autoscaling, secret injection, and rollback | A clean cluster can install the app; failed health checks stop rollout; config and secret values are separated; capacity limits are demonstrated |
| **6. GitOps delivery** | Argo CD, App-of-Apps, projects/RBAC, Helm/Kustomize, Argo Rollouts, Jenkins | Jenkins publishes a verified immutable digest and updates a reviewed environment change; Argo reconciles it; progressive rollout and rollback are observable | CI never applies production manifests directly; Git is the desired-state record; promotion/rollback evidence identifies the exact digest |
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
| Kubernetes and GitOps | Kubernetes, EKS, Argo CD bootstrap/App-of-Apps/projects/RBAC, Helm, Kustomize, Argo Rollouts, ingress/ALB integration, node termination/draining, CSI secrets, HPA/KEDA, Istio rate limiting, Flink and Kibana deployment patterns | **NOT STARTED** | App deployment repo, reconciliation and promotion demo, rollout analysis, rollback, policy and secret-handling evidence |
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
| JEN-02 | Declarative Jenkins pipeline design | **PARTIAL** | Jenkinsfile has preflight, parallel source gates, container build, Trivy, Syft, smoke test, archive and cleanup | Execute all stages on the managed agent and fix any real execution issues |
| JEN-03 | Source validation in Jenkins | **DONE** | Build #4 passed source validation from a local Git bundle snapshot | This is not equivalent to Multibranch CI; retain it as historical validation only |
| JEN-04 | Jenkinsfile from public GitHub SCM | **WAITING** | Public GitHub repository exists | Configure GitHub Branch Source/Multibranch, PR discovery, webhook and commit status checks; prove a PR run |
| JEN-05 | Reproducible dedicated build agent | **WAITING** | Static Linux agent was inspected | Provision managed Node/npm, selected builder/runtime, Gitleaks, Trivy, Syft and utilities; apply linux/docker labels only when true; capture versions |
| JEN-06 | Full container pipeline | **WAITING** | Dockerfile and stages are authored | Run image build, vulnerability scan, SPDX SBOM generation, constrained smoke test, JUnit/artifact archive and cleanup; keep the exact successful build evidence |
| JEN-07 | Controller isolation and Jenkins governance | **WAITING** | Risk and recommendation are documented | Set built-in executors to zero; review plugins/updates, credentials, backups, permissions and job authorization; record approved configuration |
| JEN-08 | Trust-separated and scalable agents | **NOT STARTED** | PR trust risks are described | Demonstrate disposable untrusted build capacity separated from trusted release/signing workers; measure queueing and agent utilization |
| JEN-09 | Artifact publication and provenance | **NOT STARTED** | CI currently stops before publication | Add registry push only for protected revisions; capture digest, SBOM, provenance/signature and vulnerability exception ownership |
| JEN-10 | Jenkins operations and interview evidence | **PARTIAL** | Architecture and interview guide exist | Add measured stage durations, queue delay, failure taxonomy, flaky-test policy, capacity/recovery drill, and a concise demo walkthrough |

### Jenkins next actions, in order

1. Provision a dedicated, reproducible Linux build worker with the required versions and a container build strategy. Do not install ad hoc tools in every pipeline run.
2. Keep the worker isolated from untrusted pull requests if it exposes a privileged container daemon. Use a disposable worker or remote/rootless builder for untrusted code.
3. Configure Jenkins Multibranch against the public GitHub repository, discover pull requests, add a webhook/status reporting, and make the check required before merge.
4. Set the built-in controller executors to zero and confirm builds run only on the intended worker labels.
5. Run the Jenkinsfile from SCM and close JEN-06 using a passing image build, Trivy report, SPDX SBOM, smoke test, JUnit report, artifact archive, and cleanup evidence.
6. Review the resulting run for security exceptions, stage duration, queue delay, workspace/image cleanup, and actionable failure messages. Only then call Jenkins CI complete.

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
