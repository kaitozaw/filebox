## Project Setup Instructions

### 1. Setup EC2 Instance

- Go to [Filebox's EC2 Instance](https://ap-southeast-2.console.aws.amazon.com/ec2/home?region=ap-southeast-2#InstanceDetails:instanceId=i-03fc79935c6a2b8c6)
- If the instance is not running, click **Instance state > Srart instance**
- After the instance is started, copy the **Public IPv4 address** 

### 2. Configure Github Actions Secrets

- Go to [Filebox's Github Repository](https://github.com/kaitozaw/filebox)
- Navigate to **Setting > Environments > production > Environment secrets** and set **BASE_URL** to "http://{Public IPv4 address}"
- Navigate to **Setting > Actions secrets and variables > Repository secrets** and paste the value from /backend/.env into **PROD_BACKEND**, but update BASE_URL to "http://{Public IPv4 address}"

### 3. Run CI/CD Github Actions

- Push to the remote main branch and run cicd.yml


## Public URL of the Project

- http://13.238.159.193


## How to Login to the Project
- email: kaitozaw@gmail.com
- password: password