# Jenkins environment assessment (public-safe copy)

Initial check on 2026-11-03; live recheck on 2026-11-05. Private network addresses, internal URLs, usernames, and agent filesystem paths are omitted from this public copy.

## Live recheck on 2026-11-05

A temporary read-only Jenkins job confirmed that the worker accepts builds and captured its current capabilities. The diagnostic job was deleted after the check.

- Jenkins controller and worker are online; the worker runs Ubuntu 24.04.1 with one executor.
- Node.js, npm, Docker, Podman, Buildah, BuildKit, nerdctl, Gitleaks, Trivy, and Syft are unavailable on the worker.
- Unprivileged user namespaces are disabled, rootless build helpers are absent, and noninteractive sudo is unavailable.
- The controller still has two built-in executors. GitHub Branch Source and Docker Pipeline are not installed.

No container build, image scan, SBOM, or container smoke test ran during this recheck.
## Controller and nodes

- Jenkins is reachable inside the private Hyper-V lab. Its private URL and exact version are omitted here.
- A temporary local-only `jenkins-source-validation` job passed build #4. The production Jenkinsfile is not yet configured as a permanent SCM job.
- The built-in node is online with 2 executors.
- The static Ubuntu agent runs Ubuntu 24.04 on x86_64 with one executor. Its lab address and home path are omitted.
- Its configured label is only `agent-static-1`; the PR Pipeline now expects `linux && docker && ephemeral-ci`; the protected release job expects `linux && docker && release`. Neither label should point at this shared static worker.
- The Git, Pipeline, and JUnit plugins are installed. GitHub Branch Source and Docker Pipeline are not installed.

## Agent toolchain

The agent has Git and curl. These required pipeline tools are missing:

- Node.js and npm
- Docker CLI and Docker daemon
- Gitleaks
- Trivy
- Syft

No pipeline-ready container builder/runtime is configured for this agent. The rootless build path is unavailable, and noninteractive sudo is not available for host-level provisioning.

## Validation already completed

- Local `npm run check` passed.
- Local tests passed: 16 tests, 100% line coverage, 98.92% branch coverage, and 100% function coverage.
- The offline, cache-based npm audit reported zero vulnerabilities; it was not a live registry audit.
- The JUnit conversion output contained 16 tests and zero failures or errors.
- Jenkins source validation passed on build #4 from local commit `109f141`: Node.js 24.18.0, `npm ci`, static checks, online npm audit (0 vulnerabilities), Gitleaks 8.30.1 (no leaks), and all 16 tests. Jenkins recorded 16 passed, 0 failed, 0 skipped, with 100% line coverage, 98.92% branch coverage, and 100% function coverage.
- Jenkins successfully connected to the agent after the pfSense network path became available. A temporary Jenkins pipeline verified the agent state and was then deleted.

## Work required before a full Jenkins run

1. Provision the dedicated agent with the tools above. The current worker account cannot install host packages through noninteractive sudo, so use a managed agent image or provide a controlled OS-level provisioning path.
2. Provision separate `ephemeral-ci` and trusted `release` worker pools; assign their labels only after capabilities and isolation are verified.
3. Configure a Multibranch Pipeline for the public repo `https://github.com/Karthikkasani2002/jenkins-ci-interview-lab`. Install GitHub Branch Source and configure pull-request discovery and webhooks/status reporting.
4. For controller isolation, set the built-in node executor count to zero; this assessment did not change it.

The temporary source-validation job uses a local Git bundle snapshot and is not the production Jenkinsfile-from-SCM job. The Docker build, Trivy image scan, Syft image SBOM, and container smoke test have not run because the agent does not currently have a container runtime.

## CI/CD artifacts authored on 2026-11-05

- PR and protected-release Jenkinsfiles, JCasC baseline, Helm chart, Argo CD bootstrap/dev Applications, production example, install script and UPI/interview docs are authored in this workspace.
- The release job is design only until scoped registry, GitHub and KMS identities are configured and a protected build is run.
- JCasC proposes zero controller executors but has not been applied. The last live Jenkins check showed two built-in executors.
- At the final workspace check, Jenkins was unreachable. No Kubernetes context, kubectl or Helm is available here, so Argo CD installation and reconciliation could not run.
- The existing static worker is not approved for untrusted PR execution; the new PR agent label requires disposable isolated agents.

## Recheck on 2026-11-15

- From this workspace, the Jenkins web endpoint and worker SSH endpoint were unreachable.
- Hyper-V Manager showed the lab firewall, controller and worker VMs in Saved or Off states. The manager runs at a higher integrity level than this automation session; UI control was rejected and PowerShell Get-VM returned CIM access denied. No VM power state was changed.
- The workspace still has no Kubernetes context, kubectl or Helm. Argo CD installation and sync remain pending.
- Next host-side action: an authorized Hyper-V administrator should resume the firewall, Jenkins controller and intended worker VMs. Then provision separate disposable CI and trusted release workers through an OS-admin path before attaching Jenkins labels.

## Live recheck after lab resume on 2026-11-15

- Jenkins 2.568.3 is reachable. The built-in node is online with two executors. `agent-static-1` is online with one executor and only its static label.
- The existing source-validation job ran as build #5 on `agent-static-1`. `npm ci`, `npm run check`, and `npm audit --omit=dev --audit-level=high` completed; the audit reported zero vulnerabilities. The job then failed because its Gitleaks download could not resolve the GitHub release host. Jenkins skipped the test stage, so build #5 is not a passing CI result. Build #4 remains the earlier successful source-validation evidence.
- Local `npm run check` and `npm test` pass: 16 tests, 100% line and function coverage, and 98.92% branch coverage.
- Jenkins' Pipeline Model Converter accepted both `Jenkinsfile` and `Jenkinsfile.release` syntax. Neither file has run end to end from GitHub SCM.
- GitHub Branch Source and Docker Pipeline are not installed. The available static worker is not labeled or provisioned for the pipeline's isolated container build, scanning, SBOM, and smoke-test stages.
- The controller still has two built-in executors; the JCasC baseline has not been applied. No persistent Jenkins configuration was changed during this recheck.
- Next: fix approved worker DNS/HTTPS access to tool sources or use a pinned managed agent image, then provision and verify separate disposable CI and trusted release workers before assigning labels. Keep the controller off build duty and run the full pipeline from SCM after that.
