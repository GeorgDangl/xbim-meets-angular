pipeline {
    options {
        disableConcurrentBuilds()
        timeout(time: 1, unit: 'HOURS')
    }
    agent {
        node {
            label 'master'
            customWorkspace 'workspace/xBimMeetsAngular'
        }
    }
    environment {
        KeyVaultBaseUrl = credentials('AzureCiKeyVaultBaseUrl')
        KeyVaultClientId = credentials('AzureCiKeyVaultClientId')
        KeyVaultClientSecret = credentials('AzureCiKeyVaultClientSecret')
    }
    stages {
        stage ('Deploy') {
            steps {
                script {
                    env.PublishEnvironmentName = 'Production'
                }
                powershell './build.ps1 Deploy'
            }
        }
    }
    post {
        always {
            step([$class: 'Mailer',
                notifyEveryUnstableBuild: true,
                recipients: "georg@dangl.me",
                sendToIndividuals: true])
        }
    }
}
