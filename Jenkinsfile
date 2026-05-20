pipeline {
    agent any

    environment {
        IMAGE_NAME = "two-tier-web-app"
        IMAGE_TAG = "${BUILD_NUMBER}"
        LAST_KNOWN_GOOD_FILE = ".last-known-good-image"
        ROLLBACK_IMAGE_FILE = ".rollback-image"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Create .env') {
            steps {
                withCredentials([
                    string(credentialsId: 'POSTGRES_USER', variable: 'POSTGRES_USER'),
                    string(credentialsId: 'POSTGRES_PASSWORD', variable: 'POSTGRES_PASSWORD'),
                    string(credentialsId: 'POSTGRES_DB', variable: 'POSTGRES_DB')
                ]) {
                    sh '''
                        echo "POSTGRES_USER=${POSTGRES_USER}" > .env
                        echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" >> .env
                        echo "POSTGRES_DB=${POSTGRES_DB}" >> .env
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                 sh '''
                    echo "Building Docker image with Docker Compose..."
                    docker compose build app

                    echo "Tagging image..."
                    docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:${IMAGE_TAG}

                    echo "Built images:"
                    docker images | grep ${IMAGE_NAME} || true
                '''
            }
        }

        stage('Run Migrations') {
            steps {
                sh '''
                    echo "Starting database..."
                    docker compose up -d db

                    echo "Waiting for database container health..."
                    db_container_id=$(docker compose ps -q db)

                    if [ -z "$db_container_id" ]; then
                        echo "Database container was not created."
                        exit 1
                    fi

                    attempts=0

                    while true; do
                        status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$db_container_id" 2>/dev/null || echo "missing")

                        echo "Current db health status: $status"

                        if [ "$status" = "healthy" ]; then
                            echo "Database is healthy."
                            break
                        fi

                        attempts=$((attempts + 1))

                        if [ $attempts -ge 12 ]; then
                            echo "Database failed to become healthy."
                            docker compose logs db || true
                            exit 1
                        fi

                        echo "Database not healthy yet, retrying in 5s..."
                        sleep 5
                    done

                    echo "Running Prisma migrations..."
                    docker compose run --rm migrate
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    if [ -f "${LAST_KNOWN_GOOD_FILE}" ]; then
                        cp "${LAST_KNOWN_GOOD_FILE}" "${ROLLBACK_IMAGE_FILE}"
                        echo "Saved rollback target: $(cat "${ROLLBACK_IMAGE_FILE}")"
                    else
                        rm -f "${ROLLBACK_IMAGE_FILE}"
                        echo "No last-known-good image marker found. Rollback target is unavailable for this run."
                    fi

                    echo "Deploying app container..."

                    docker compose up -d --no-deps --force-recreate app

                    echo "App container started."
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    echo "Waiting for app to be healthy..."

                    attempts=0
                     while true; do
                        status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' two-tier-web-app 2>/dev/null || echo "missing")

                        echo "Current app health status: $status"

                        if [ "$status" = "healthy" ]; then
                            echo "App is healthy."
                            break
                        fi

                        attempts=$((attempts + 1))

                        if [ $attempts -ge 12 ]; then
                            echo "App failed to become healthy."
                            echo "Showing app logs..."
                            docker compose logs app || true
                            exit 1
                        fi

                        echo "Not healthy yet, retrying in 10s..."
                        sleep 10
                    done

                    docker compose ps
                '''
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed! Attempting rollback...'

            withCredentials([
                string(credentialsId: 'POSTGRES_USER', variable: 'POSTGRES_USER'),
                string(credentialsId: 'POSTGRES_PASSWORD', variable: 'POSTGRES_PASSWORD'),
                string(credentialsId: 'POSTGRES_DB', variable: 'POSTGRES_DB')
            ]) {
                sh '''
                    echo "Recreating .env for rollback..."
                    echo "POSTGRES_USER=${POSTGRES_USER}" > .env
                    echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" >> .env
                    echo "POSTGRES_DB=${POSTGRES_DB}" >> .env

                    if [ -f "${ROLLBACK_IMAGE_FILE}" ]; then
                        ROLLBACK_IMAGE=$(cat "${ROLLBACK_IMAGE_FILE}")
                    else
                        ROLLBACK_IMAGE=""
                    fi

                    echo "Rollback image candidate: ${ROLLBACK_IMAGE:-none}"

                    if [ -n "$ROLLBACK_IMAGE" ] && docker image inspect "$ROLLBACK_IMAGE" > /dev/null 2>&1; then
                        echo "Rollback image found. Rolling back to $ROLLBACK_IMAGE"

                        docker tag "$ROLLBACK_IMAGE" ${IMAGE_NAME}:latest

                        docker compose up -d db
                        docker compose up -d --no-deps --force-recreate app

                        echo "Rollback container started."

                        echo "Checking rollback health..."
                        attempts=0

                        while true; do
                            status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' two-tier-web-app 2>/dev/null || echo "missing")

                            echo "Rollback app health status: $status"

                            if [ "$status" = "healthy" ]; then
                                echo "Rollback successful. App is healthy."
                                break
                            fi

                            attempts=$((attempts + 1))

                            if [ $attempts -ge 12 ]; then
                                echo "Rollback app did not become healthy."
                                docker compose logs app || true
                                exit 1
                            fi

                            sleep 10
                        done
                    else
                        echo "No last-known-good image found. Cannot rollback."
                    fi

                    echo "Final compose status:"
                    docker compose ps || true

                    echo "App logs:"
                    docker compose logs app || true
                '''
            }
        }
        success {
            echo 'Deployment successful!'

            sh '''
                echo "${IMAGE_NAME}:${IMAGE_TAG}" > "${LAST_KNOWN_GOOD_FILE}"
                echo "Recorded last known good image: $(cat "${LAST_KNOWN_GOOD_FILE}")"

                echo "Pruning old dangling images..."
                docker image prune -f --filter "until=24h"
            '''
        }
    }
}
