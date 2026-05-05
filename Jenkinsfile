pipeline {
    agent any

    environment {
        IMAGE_NAME = "two-tier-web-app"
        IMAGE_TAG = "${BUILD_NUMBER}"
        PREV_TAG = "${BUILD_NUMBER.toInteger() - 1}"
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
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
                sh "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest"
            }
        }

        stage('Run Migrations') {
            steps {
                sh 'docker compose up -d db'
                sh '''
                    echo "Waiting for DB to be ready..."
                    until docker compose exec db pg_isready -h localhost -p 5432; do
                        echo "DB not ready, retrying in 2s..."
                        sleep 2
                    done
                    echo "DB is ready"
                '''
                sh 'docker compose run --rm migrate'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose down'
                sh 'docker compose up -d app'
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    echo "Waiting for app to be healthy..."
                    attempts=0
                    until [ "$(docker inspect --format='{{.State.Health.Status}}' two-tier-web-app)" = "healthy" ]; do
                        attempts=$((attempts + 1))
                        if [ $attempts -ge 10 ]; then
                            echo "App failed to become healthy"
                            exit 1
                        fi
                        echo "Not healthy yet, retrying in 10s..."
                        sleep 10
                    done
                    echo "App is healthy!"
                '''
                sh 'docker compose ps'
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed! Attempting rollback...'
            sh '''
                PREV_IMAGE=${IMAGE_NAME}:$((${BUILD_NUMBER} - 1))
                if docker image inspect $PREV_IMAGE > /dev/null 2>&1; then
                    echo "Rolling back to $PREV_IMAGE"
                    docker stop two-tier-web-app || true
                    docker rm two-tier-web-app || true
                    docker run -d \
                        --name two-tier-web-app \
                        --network two-tier-web-app_default \
                        -p 3001:3000 \
                        -e DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB} \
                        --restart unless-stopped \
                        $PREV_IMAGE
                    echo "Rollback complete"
                else
                    echo "No previous image found, cannot rollback"
                fi
            '''
            sh 'docker compose logs app'
        }
        success {
            echo 'Deployment successful!'
            sh "docker image prune -f --filter 'until=24h'"
        }
    }
}