# UPI-oriented CI/CD reference architecture

## Delivery path

1. PRs run Jenkinsfile from SCM on a disposable CI agent. Gates cover tests/coverage, static/dependency checks, secret/config scans, OCI build, image scan, SPDX SBOM and constrained runtime/API smoke tests.
2. Jenkins retains JUnit, coverage, scan reports, SBOM and image metadata. PR jobs receive no registry-write, signing, GitOps-write or production credentials.
3. A separate release job runs only on protected main and a trusted isolated agent. It reruns quality gates, pushes by source commit, records/scans the immutable digest, smoke-tests it, creates provenance/SBOM attestations, signs through Cosign/KMS, then opens a PR changing the dev Helm digest.
4. Merge the promotion PR; Argo CD observes Git and reconciles dev. Jenkins does not kubectl-apply app manifests.
5. Production is a separate reviewed Git change and manual Argo sync. The production Application is an example outside the auto-discovered apps path.

Source commit, Jenkins build, digest, SBOM/provenance, signature and GitOps change form the traceable promotion chain. Rollback starts by reverting the GitOps digest and validating reconciliation/health. Database rollback can be unsafe; payment schema changes require compatible expand/contract and forward-fix plans.

## Ownership

| Concern | Owner |
|---|---|
| Source checks, tests, image build and verification | Jenkins CI |
| Protected publishing, attestations/signing and promotion PR | Jenkins release job |
| Desired state, drift correction, deployment history | Git + Argo CD |
| Cluster, ingress, IAM and runtime policy | Terraform/platform configuration |
| Production approval | Protected review + manual Argo sync |

## Included Argo/Helm setup

- scripts/install-argocd.sh requires explicit KUBE_CONTEXT, at least one Ready node and pins Argo CD v3.6.0; it waits for CRDs/deployments then applies bootstrap.
- deploy/argocd/bootstrap installs a restricted root AppProject and root Application.
- deploy/argocd/apps has a dev-only project and Application with an explicit resource allowlist and namespace.
- deploy/helm/task-api provides security context, resource bounds, probes, graceful termination, image pull secret references and optional PDB/HPA/NetworkPolicy/TLS ingress. Production render requires an actual sha256 digest.
- Dev begins at zero replicas and a bootstrap tag. The first release promotion supplies the immutable digest.
- Production example is manual. Add the actual prod AppProject, registry pull identity, admission/network policy and approved promotion before use.

BuildKit attestations are pushed through a named docker-container builder as required by Docker BuildKit. Cosign uses an awskms:///alias/... key URI and verifies the image signature and SPDX attestation. The install script has not run. This workspace has no Kubernetes context, kubectl or Helm. Argo installation requires an actual cluster and cluster-admin access; Jenkins plugins cannot replace the cluster.

## Payment service requirements beyond this lab

This API is in-memory, not a UPI/TPAP implementation and not suitable for payment traffic. Before calling a related service payment-grade, design and prove:
- idempotent payment initiation, duplicate/replay-safe retries, correlation IDs and audit;
- signed/authenticated partner requests, authorization, rate limits and sensitive-data redaction;
- durable transaction/ledger state, reconciliation and database migration compatibility;
- event schema compatibility, ordering/partitioning, retries/DLQ/replay when Kafka is selected;
- cache/Redis/Aerospike outage and consistency behavior only if those components are selected;
- contract/integration tests with approved sandboxes, fault injection, and load tests from approved SLO/capacity targets;
- key management, encryption, secrets, PII/PCI classification, retention, threat and compliance review;
- tracing, metrics, logs, alerts, SLOs, on-call runbooks, DR, restore and rollback/forward-fix;
- progressive delivery with health signals, abort limits and auditable human production approval.

Do not claim compliance or invent TPS targets.

## Senior interview narrative

“I separated untrusted PR validation from trusted release. Jenkins creates a signed digest-addressed image with SBOM/provenance and cannot deploy directly. A reviewed Git change promotes that exact digest, and Argo CD reconciles it. Production needs another approval gate. I measure feedback time and agent capacity and treat idempotency, reconciliation, schema compatibility and recovery as payment-specific gates. This lab proves delivery mechanics; its in-memory API is not the payment service.”

## Setup after cluster provisioning

1. Configure the intended Kubernetes context and kubectl/Helm clients; confirm target and Ready nodes.
2. Run scripts/install-argocd.sh with KUBE_CONTEXT set to that context; inspect Argo health and Applications.
3. Configure private registry pull identity and release worker identity outside Git.
4. Build pinned disposable CI and trusted release agent images; do not share release secrets with PR agents.
5. Configure GitHub Branch Source, webhooks/status checks, Credentials Binding, authorization, agent pools and JCasC; confirm zero controller executors.
6. Run PR CI and protected release; inspect image digest, scans, attestations, signature, promotion PR and Argo reconciliation before marking end-to-end complete.


## Official Argo CD references

- [Argo CD v3.6.0 release and pinned installation manifest](https://github.com/argoproj/argo-cd/releases/tag/v3.6.0)
- [Argo CD automated sync, pruning and self-heal](https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/)
- [Docker BuildKit attestations](https://docs.docker.com/build/metadata/attestations/)
- [Sigstore Cosign KMS key management](https://docs.sigstore.dev/cosign/key_management/overview/)
