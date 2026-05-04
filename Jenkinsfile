pipeline {
    agent any

    environment {
        IMAGE_NAME = "two-tier-web-app"
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
                sh 'docker compose build'
            }
        }

        stage('Run Migrations') {
            steps {
                sh 'docker compose up -d db'
                sh 'sleep 5'
                sh 'docker compose run --rm migrate'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose up -d app'
            }
        }

        stage('Verify') {
            steps {
                sh 'docker compose ps'
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed!'
            sh 'docker compose logs app'
        }
        success {
            echo 'Deployment successful!'
        }
    }
}