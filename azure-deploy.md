# RLAI TechEval — Azure Deployment Guide

## Architecture

```
Azure Container Apps (App)
    ↕
Azure Database for PostgreSQL (Flexible Server)
    ↕
Azure Blob Storage (Resumes + Diagrams)
    ↕
Azure Container Registry (Docker Image)
```

---

## Step 1 — Prerequisites

```bash
# Install Azure CLI
brew install azure-cli

# Login
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

---

## Step 2 — Create Resource Group

```bash
az group create \
  --name rg-rlai-eval \
  --location eastus
```

---

## Step 3 — Azure Database for PostgreSQL

```bash
az postgres flexible-server create \
  --resource-group rg-rlai-eval \
  --name psql-rlai-eval \
  --location eastus \
  --admin-user rlaiadmin \
  --admin-password "YourStrongP@ssword123!" \
  --sku-name Standard_B2ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16

# Create database
az postgres flexible-server db create \
  --resource-group rg-rlai-eval \
  --server-name psql-rlai-eval \
  --database-name rlai_eval

# Allow Azure services to connect
az postgres flexible-server firewall-rule create \
  --resource-group rg-rlai-eval \
  --name psql-rlai-eval \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Connection string:**
```
postgresql://rlaiadmin:PASSWORD@psql-rlai-eval.postgres.database.azure.com:5432/rlai_eval?sslmode=require
```

---

## Step 4 — Azure Blob Storage

```bash
az storage account create \
  --name strlaieval \
  --resource-group rg-rlai-eval \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create containers
az storage container create --name rlai-resumes --account-name strlaieval
az storage container create --name rlai-diagrams --account-name strlaieval

# Get connection string
az storage account show-connection-string \
  --name strlaieval \
  --resource-group rg-rlai-eval \
  --query connectionString -o tsv
```

---

## Step 5 — Azure Container Registry

```bash
az acr create \
  --resource-group rg-rlai-eval \
  --name acrrlaieval \
  --sku Basic \
  --admin-enabled true

# Build and push image
az acr build \
  --registry acrrlaieval \
  --image rlai-eval:latest .
```

---

## Step 6 — Azure Container Apps

```bash
# Create environment
az containerapp env create \
  --name cae-rlai-eval \
  --resource-group rg-rlai-eval \
  --location eastus

# Deploy
az containerapp create \
  --name ca-rlai-eval \
  --resource-group rg-rlai-eval \
  --environment cae-rlai-eval \
  --image acrrlaieval.azurecr.io/rlai-eval:latest \
  --registry-server acrrlaieval.azurecr.io \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 1 --memory 2Gi \
  --env-vars \
    DATABASE_URL="postgresql://..." \
    NEXTAUTH_URL="https://YOUR_APP_URL.azurecontainerapps.io" \
    NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
    ANTHROPIC_API_KEY="sk-ant-..." \
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpoints..." \
    AZURE_STORAGE_CONTAINER_RESUMES="rlai-resumes" \
    AZURE_STORAGE_CONTAINER_DIAGRAMS="rlai-diagrams" \
    ADMIN_EMAIL="admin@rightleft.ai" \
    ADMIN_PASSWORD="YourAdminPassword" \
    SMTP_HOST="smtp.gmail.com" \
    SMTP_PORT="587" \
    SMTP_USER="your-email@gmail.com" \
    SMTP_PASS="your-app-password" \
    HR_EMAIL="hr@rightleft.ai"
```

---

## Step 7 — Run Database Migrations

After deployment, run migrations via a one-off job or exec:

```bash
# Option 1: Add startup command (recommended)
# In Dockerfile CMD, before `node server.js`:
# RUN npx prisma db push && node server.js

# Option 2: Exec into container
az containerapp exec \
  --name ca-rlai-eval \
  --resource-group rg-rlai-eval \
  --command "npx prisma db push && npx tsx prisma/seed.ts"
```

---

## Step 8 — Custom Domain (Optional)

```bash
az containerapp hostname add \
  --hostname eval.rightleft.ai \
  --name ca-rlai-eval \
  --resource-group rg-rlai-eval
```

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `DATABASE_URL` | Azure PostgreSQL connection string |
| `NEXTAUTH_URL` | Full URL of your deployed app |
| `NEXTAUTH_SECRET` | 32-char random secret (openssl rand -base64 32) |
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `AZURE_STORAGE_CONTAINER_RESUMES` | Container name for resumes (default: rlai-resumes) |
| `AZURE_STORAGE_CONTAINER_DIAGRAMS` | Container name for diagrams (default: rlai-diagrams) |
| `ADMIN_EMAIL` | Email for admin login |
| `ADMIN_PASSWORD` | Password for admin login |
| `SMTP_HOST` | SMTP server (smtp.gmail.com for Gmail) |
| `SMTP_PORT` | SMTP port (587 for TLS) |
| `SMTP_USER` | SMTP username/email |
| `SMTP_PASS` | SMTP password (Gmail: use App Password) |
| `HR_EMAIL` | HR email to receive candidate notifications |
| `HR_CC_EMAIL` | Optional CC email for HR notifications |

---

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and push
        run: |
          az acr build --registry acrrlaieval --image rlai-eval:${{ github.sha }} .
      - name: Deploy
        run: |
          az containerapp update \
            --name ca-rlai-eval \
            --resource-group rg-rlai-eval \
            --image acrrlaieval.azurecr.io/rlai-eval:${{ github.sha }}
```

---

## Local Development

```bash
# 1. Clone and install
npm install

# 2. Copy env file
cp .env.example .env.local
# Fill in all values

# 3. Push DB schema
npx prisma db push

# 4. Seed admin user
npm run db:seed

# 5. Run dev server
npm run dev
```

Visit http://localhost:3000

Admin panel: http://localhost:3000/admin (login with ADMIN_EMAIL / ADMIN_PASSWORD)
