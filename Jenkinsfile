pipeline {
  // This label must exist only on an isolated worker with the declared builder toolchain.
  agent { label 'linux && docker && ephemeral-ci' }

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '15'))
    disableConcurrentBuilds(abortPrevious: true)
    skipDefaultCheckout(true)
  }

  environment {
    IMAGE_NAME = 'jenkins-ci-interview-lab'
    NODE_BASE_IMAGE = 'node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53'
  }

  stages {
    stage('Checkout') {
      steps {
        deleteDir()
        checkout scm
        sh 'mkdir -p artifacts test-results'
      }
    }

    stage('Preflight') {
      steps {
        sh '''#!/bin/sh
          set -eu
          node --version
          npm --version
          docker --version
          docker info >/dev/null
          docker buildx version
          gitleaks version
          trivy --version
          syft version
          command -v curl
          command -v sed
          command -v seq
          npm ci --ignore-scripts --no-audit --no-fund
        '''
      }
    }

    stage('Source gates') {
      parallel {
        stage('Unit tests and coverage') {
          steps {
            sh '''#!/bin/sh
              set +e
              npm test > artifacts/test-coverage.txt 2>&1
              coverage_status=$?
              node --test --test-reporter=junit > test-results/node-junit.xml 2> artifacts/junit-stderr.txt
              junit_status=$?
              node scripts/junit-to-suite.js test-results/node-junit.xml test-results/junit.xml
              normalize_status=$?
              set -e
              cat artifacts/test-coverage.txt
              if [ "$coverage_status" -ne 0 ] || [ "$junit_status" -ne 0 ] || [ "$normalize_status" -ne 0 ]; then
                exit 1
              fi
            '''
          }
        }

        stage('Static checks and dependency audit') {
          steps {
            sh '''#!/bin/sh
              set -eu
              npm run check
              npm audit --audit-level=high
            '''
          }
        }

        stage('Secrets and configuration scan') {
          steps {
            sh '''#!/bin/sh
              set -eu
              gitleaks detect --source . --redact --exit-code 1
              trivy config --exit-code 1 --severity HIGH,CRITICAL --skip-dirs .git .
            '''
          }
        }
      }
    }

    stage('Build container') {
      steps {
        sh '''#!/bin/sh
          set -eu
          image_ref="$IMAGE_NAME:$BUILD_NUMBER"
          docker build --pull \
            --build-arg NODE_BASE_IMAGE="$NODE_BASE_IMAGE" \
            --build-arg VCS_REF="$GIT_COMMIT" \
            --build-arg VCS_URL="$GIT_URL" \
            --label org.opencontainers.image.revision="$GIT_COMMIT" \
            --tag "$image_ref" .
          docker image inspect "$image_ref" --format '{{json .Config.Labels}}' > artifacts/image-labels.json
        '''
      }
    }

    stage('Image gates') {
      parallel {
        stage('Vulnerability scan') {
          steps {
            sh '''#!/bin/sh
              set -eu
              trivy image --exit-code 0 --severity HIGH,CRITICAL \
                --format json --output artifacts/trivy-image-all-findings.json "$IMAGE_NAME:$BUILD_NUMBER"
              trivy image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL \
                --format json --output artifacts/trivy-image-blocking.json "$IMAGE_NAME:$BUILD_NUMBER"
            '''
          }
        }

        stage('Generate SPDX SBOM') {
          steps {
            sh 'syft "$IMAGE_NAME:$BUILD_NUMBER" --output spdx-json=artifacts/sbom.spdx.json'
          }
        }
      }
    }

    stage('Container smoke test') {
      steps {
        sh '''#!/bin/sh
          set -eu
          image_ref="$IMAGE_NAME:$BUILD_NUMBER"
          container_name="$IMAGE_NAME-smoke-$BUILD_NUMBER"
          cleanup() { docker rm --force "$container_name" >/dev/null 2>&1 || true; }
          trap cleanup EXIT INT TERM

          docker run --detach --name "$container_name" \
            --publish 127.0.0.1::3000 \
            --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
            --cap-drop=ALL --security-opt=no-new-privileges:true \
            --memory=128m --cpus=1 --pids-limit=128 \
            "$image_ref" >/dev/null

          port=""
          health=""
          for attempt in $(seq 1 30); do
            port=$(docker port "$container_name" 3000/tcp | sed 's/.*://')
            if [ -n "$port" ] && curl --fail --silent "http://127.0.0.1:$port/health/ready" >/dev/null; then
              health=$(docker inspect --format '{{.State.Health.Status}}' "$container_name")
              if [ "$health" = "healthy" ]; then break; fi
            fi
            sleep 1
          done

          test -n "$port"
          test "$health" = "healthy"
          curl --fail --silent --show-error "http://127.0.0.1:$port/health/live" >/dev/null
          response=$(curl --fail --silent --show-error \
            --header 'content-type: application/json' \
            --data '{"title":"container smoke test"}' \
            "http://127.0.0.1:$port/api/v1/tasks")
          printf '%s' "$response" | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const x=JSON.parse(s);if(x.status!=='open'||!x.id)process.exit(1);});"

          docker inspect "$container_name" | node -e "
            let s='';
            process.stdin.on('data',c=>s+=c).on('end',()=>{
              const c=JSON.parse(s)[0];
              if(c.Config.User!=='node'||c.HostConfig.ReadonlyRootfs!==true||
                 !c.HostConfig.CapDrop.includes('ALL')||c.HostConfig.PidsLimit!==128) process.exit(1);
            });
          "
        '''
      }
    }

    stage('Prepare evidence') {
      steps {
        sh '''#!/bin/sh
          set -eu
          printf 'commit=%s\\nimage=%s:%s\\n' "$GIT_COMMIT" "$IMAGE_NAME" "$BUILD_NUMBER" > artifacts/build-info.txt
          docker image inspect "$IMAGE_NAME:$BUILD_NUMBER" --format '{{json .RootFS.Layers}}' > artifacts/image-layers.json
        '''
      }
    }
  }

  post {
    always {
      sh '''#!/bin/sh
        if command -v docker >/dev/null 2>&1; then
          docker rm --force "$IMAGE_NAME-smoke-$BUILD_NUMBER" >/dev/null 2>&1 || true
          docker image rm "$IMAGE_NAME:$BUILD_NUMBER" >/dev/null 2>&1 || true
        fi
      '''
      junit testResults: 'test-results/junit.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'artifacts/**,test-results/**', fingerprint: true, allowEmptyArchive: true
    }
    success {
      echo 'CI evidence is archived. This PR pipeline does not publish images or deploy.'
    }
  }
}