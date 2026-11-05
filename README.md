# Jenkins CI/CD Interview Lab

A public portfolio lab for Jenkins CI, protected image release, and GitOps delivery patterns. The sample Node.js task API is intentionally small and stores state in memory; it is not UPI/payment software.

## Read in order

1. [Platform roadmap and status tracker](docs/platform-engineering-roadmap.md)
2. [Jenkins production stack, plugins, Groovy/YAML mapping, and interview coverage](docs/jenkins-production-stack.md)
3. [UPI-oriented CI/CD architecture and payment-grade gaps](docs/upi-ci-cd-architecture.md)
4. [Environment assessment](docs/jenkins-environment-assessment.md)

## Repository implementation

- Jenkinsfile: Declarative PR CI with parallel source/test/security gates, container build, Trivy image scan, Syft SPDX SBOM, hardened smoke test, JUnit/artifacts and cleanup.
- Jenkinsfile.release: protected-main release design that publishes an immutable digest, provenance/SBOM, scans, smoke-tests, signs via Cosign/KMS, then opens a reviewed dev promotion PR.
- jenkins/casc.yaml: controller baseline, including zero controller executors.
- deploy/helm/task-api: hardened Helm templates and dev/prod values with a production digest guard.
- deploy/argocd: restricted Projects, bootstrap/dev reconciliation and manual prod example.
- scripts/install-argocd.sh: guarded Argo CD installation for a chosen context.

Groovy is Jenkins Pipeline as Code. YAML is used for JCasC, Kubernetes agents, Helm and Argo CD configuration; it does not replace Jenkinsfile stages.

## Local application checks

Requires Node.js 24 or newer:

    npm ci
    npm run check
    npm test

The full Jenkins container pipeline and Argo installation are not yet proven live. The Jenkins worker lacks container/scanner tools and OS-level provisioning; this workspace has no Kubernetes context, kubectl or Helm. The tracker separates authored design from passed evidence.

[Public GitHub repository](https://github.com/Karthikkasani2002/jenkins-ci-interview-lab)
