# TAgri — Backend (Node/Express + Sequelize) — Multitenancy

Monorepo com frontend (Vite) e backend (Express). Este diretório contém o backend completo com autenticação JWT + refresh rotativo, RBAC, multitenancy por banco e módulo de Suporte.

## Arquitetura Multitenancy

### Banco Mestre
- Armazena organizações, master_users, org_modules
- Gerencia credenciais e módulos habilitados por tenant
- Usado pelo Master Admin para provisionar tenants

### Banco por Tenant  
- Cada organização tem seu próprio banco PostgreSQL
- Contém usuários, roles, permissions, dados de domínio
- Isolamento completo entre organizações

## Requisitos
- Node.js 18+
- PostgreSQL local com role CREATEDB

## Instalação
```bash
cd server
npm i
```

## Configuração
Copie `.env.example` para `.env` e ajuste as variáveis (incluindo MASTER_DB_URL, TENANT_DB_*, MASTER_KMS_KEY).

## Banco de Dados
```bash
npm run db:migrate  # Aplica migrações no banco mestre
npm run db:seed     # Cria master admin (master@agri.local / Master#123)
```

## Desenvolvimento
```bash
npm run dev
```
Servidor em http://localhost:3001

## Uso da API Multitenancy

### 1. Login Master Admin
```bash
POST /api/admin/auth/login
{
  "email": "master@agri.local",
  "password": "Master#123"
}
```

### 2. Criar Tenant
```bash
POST /api/admin/tenants
Authorization: Bearer <master_token>
{
  "name": "Fazenda Modelo",
  "slug": "fazenda_modelo", 
  "initialFarmName": "Sede",
  "adminEmail": "admin@fazenda.com",
  "adminPassword": "Admin#123",
  "modules": ["solo_adubacao", "suporte", "economico"]
}
```

### 3. Login no Tenant
```bash
POST /api/t/fazenda_modelo/auth/login
{
  "email": "admin@fazenda.com",
  "password": "Admin#123"
}
```

### 4. Dados do Usuário (incluindo módulos habilitados)
```bash
GET /api/t/fazenda_modelo/me
Authorization: Bearer <tenant_token>
```

## Scripts
- `dev`: desenvolvimento com nodemon
- `start`: produção
- `db:migrate`: executa migrations
- `db:seed`: popula dados de demonstração
- `test`: Jest (serviços e rotas principais)

## Estrutura
```
src/
  app.js
  server.js
  db.js
  routes/
  services/
  middlewares/
  utils/
config/config.js
migrations/
seeders/
```
