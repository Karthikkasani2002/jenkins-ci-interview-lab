pipeline {
  // Docker daemon access is privileged. Use a dedicated, disposable agent for untrusted branches.
  agent { label 'linux && docker' }

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '15'))
    disableConcurrentBuilds(abortPrevious: true)
    skipDefaultCheckout(true)
  }

  environment {
    IMAGE_NAME = 'jenkins-ci-interview-lab'
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

    stage('Source checks') {
      parallel {
        stage('Static checks and dependency audit') {
          steps {
            sh '''#!/bin/sh
              set -eu
              npm run check
              npm audit --omit=dev --audit-level=high
            '''
          }
        }

        stage('Unit and API tests') {
          steps {
            sh '''#!/bin/sh
              set +e
              npm test
              test_status=$?
              node --test --test-reporter=junit > test-results/node-junit.xml
              junit_status=$?
              node scripts/junit-to-suite.js test-results/node-junit.xml test-results/junit.xml
              normalize_status=$?
              set -e
              if [ "$test_status" -ne 0 ] || [ "$junit_status" -ne 0 ] || [ "$normalize_status" -ne 0 ]; then
                exit 1
              fi
            '''
          }
        }

        stage('Secret scan') {
          steps {
            sh 'gitleaks detect --source . --redact --exit-code 1'
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
            --build-arg VCS_REF="$GIT_COMMIT" \
            --build-arg VCS_URL="$GIT_URL" \
            --tag "$image_ref" .
        '''
      }
    }

    stage('Image security and SBOM') {
      parallel {
        stage('Vulnerability scan') {
          steps {
            sh 'trivy image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL "$IMAGE_NAME:$BUILD_NUMBER"'
          }
        }

        stage('Generate SBOM') {
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
            --read-only --tmpfs /tmp \
            --cap-drop=ALL --security-opt=no-new-privileges:true \
            --memory=128m --cpus=1 --pids-limit=128 \
            "$image_ref" >/dev/null

          port=""
          health=""
          for attempt in $(seq 1 30); do
            port=$(docker port "$container_name" 3000/tcp | sed 's/.*://')
            if [ -n "$port" ] && curl --fail --silent "http://127.0.0.1:$port/health/ready" >/dev/null; then
              health=$(docker inspect --format '{{.State.Health.Status}}' "$container_name")
              if [ "$health" = "healthy" ]; then
                break
              fi
            fi
            sleep 1
          done

          test -n "$port"
          test "$health" = "healthy"
          curl --fail --silent --show-error "http://127.0.0.1:$port/health/live"
          response=$(curl --fail --silent --show-error \
            --header 'content-type: application/json' \
            --data '{"title":"container smoke test"}' \
            "http://127.0.0.1:$port/api/v1/tasks")
          printf '%s' "$response" | grep -q '"status":"open"'
          test "$(docker inspect --format '{{.Config.User}}' "$container_name")" = "node"
          test "$(docker inspect --format '{{.State.Running}}' "$container_name")" = "true"
        '''
      }
    }

    stage('Prepare CI evidence') {
      steps {
        sh 'docker image inspect "$IMAGE_NAME:$BUILD_NUMBER" --format "{{json .Config.Labels}}" > artifacts/image-labels.json'
      }
    }
  }

  post {
    always {
      sh 'docker rm --force "$IMAGE_NAME-smoke-$BUILD_NUMBER" >/dev/null 2>&1 || true'
      sh 'docker image rm "$IMAGE_NAME:$BUILD_NUMBER" >/dev/null 2>&1 || true'
      junit testResults: 'test-results/junit.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'artifacts/**', fingerprint: true, allowEmptyArchive: true
    }
    success {
      echo 'CI passed. The image remains local to the agent; deployment is handled by the separate GitOps delivery workflow.'
    }
  }
}


