# ⚡ Game Solutions — v3.1

Sistema de Gestão de Estabelecimento de Gaming
Stack: Next.js 16 · TypeScript · PostgreSQL · Tailwind CSS

## Instalação Local

### 1. Instalar dependências
npm install

### 2. Configurar .env
cp .env.example .env
# Edita com DATABASE_URL e JWT_SECRET

### 3. Criar base de dados
psql -U postgres -c "CREATE DATABASE game_solutions_db;"
s
npm run db:setup

### 4. Iniciar
npm run dev  →  http://localhost:3000

Login padrão:
  admin / admin123
  operator / operator123

## Tabela Clients (v3.1 nova)
- Registo de clientes com nome, telefone, email, notas
- total_sessions, total_spent, last_visit auto-actualizados via trigger
- Sistema de ranks: Novo / Regular / Pro / VIP
- Autocomplete na criação de sessões

## Deploy Vercel + Neon DB
Ver README completo no repositório.
