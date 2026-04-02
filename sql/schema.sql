-- ============================================================
-- GAME SOLUTIONS — Schema Completo v3.6
-- Next.js 16 + PostgreSQL + Abril 2026
--
-- INSTALACAO NOVA:
--   psql -U postgres -c "CREATE DATABASE game_solutions_db;"
--   psql -U postgres -d game_solutions_db -f schema.sql
--   npm run db:setup
--
-- RE-EXECUCAO SEGURA (BD existente):
--   psql -U postgres -d game_solutions_db -f schema.sql
--   Todos os CREATE usam IF NOT EXISTS — seguro re-executar.
--
-- TABELAS (16 total):
--   1.  users
--   2.  refresh_tokens
--   3.  stations
--   4.  rates
--   5.  games
--   6.  clients
--   7.  sessions
--   8.  payments
--   9.  equipment
--   10. maintenance
--   11. financial
--   12. settings
--   13. tournaments
--   14. tournament_players
--   15. tournament_matches
--   16. cash_registers
--
-- VIEWS:   v_station_status, v_dashboard
-- TRIGGER: trg_update_client_stats
-- ============================================================


-- ============================================================
-- 1. UTILIZADORES DO SISTEMA
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL       PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  email         VARCHAR(100),
  role          VARCHAR(10)  NOT NULL DEFAULT 'user'
                  CHECK (role IN ('admin','user')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. REFRESH TOKENS  (autenticacao JWT)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL       PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64)  NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. ESTACOES DE JOGO
-- ============================================================
CREATE TABLE IF NOT EXISTS stations (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  console     VARCHAR(100),           -- ex: PlayStation 5, Xbox Series X, PC Gaming
  description TEXT,                   -- ex: TV Samsung 55"
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. TARIFAS
--
-- amount = valor total que o cliente paga pela sessao (MZN).
-- O preco final da sessao = rate.amount (ponto final).
-- ============================================================
CREATE TABLE IF NOT EXISTS rates (
  id           SERIAL        PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,          -- ex: Solo 30min, Solo 1h, Duo 2h
  duration_min INTEGER       NOT NULL,          -- duracao em minutos
  amount       NUMERIC(10,2) NOT NULL,          -- preco em MZN
  mode         VARCHAR(20)   NOT NULL DEFAULT 'Solo'
                 CHECK (mode IN ('Solo','Accompanied')),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. CATALOGO DE JOGOS
--
-- MODELO C: jogo e apenas registo informativo.
-- NAO afecta o preco da sessao.
-- total_amount = rate.amount (sempre, independente do jogo).
--
-- Utilidade:
--   - Registo do jogo jogado em cada sessao
--   - Historico de jogos favoritos no perfil do cliente
--   - Contador de jogos restantes (games_remaining em sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  genre       VARCHAR(80),             -- ex: Futebol, FPS, Luta, Basquete, Accao
  platform    VARCHAR(100),            -- ex: PlayStation 5, PC Gaming, Todas
  description TEXT,
  cover_color VARCHAR(7)   DEFAULT '#0ea5e9',  -- cor do cartao na UI (#RRGGBB)
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);


-- ============================================================
-- 6. CLIENTES
--
-- total_sessions, total_spent e last_visit sao actualizados
-- AUTOMATICAMENTE via trigger trg_update_client_stats
-- quando sessions.status muda de 'Active' para 'Closed'.
--
-- Ranks (calculados na aplicacao):
--   0-4   sessoes -> Novo
--   5-19  sessoes -> Regular
--   20-49 sessoes -> Pro
--   50+   sessoes -> VIP
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id             SERIAL        PRIMARY KEY,
  name           VARCHAR(150)  NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(100),
  notes          TEXT,
  total_sessions INTEGER       NOT NULL DEFAULT 0,   -- auto via trigger
  total_spent    NUMERIC(10,2) NOT NULL DEFAULT 0,   -- auto via trigger
  last_visit     TIMESTAMPTZ,                        -- auto via trigger
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_name  ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);


-- ============================================================
-- 7. SESSOES DE JOGO
--
-- Relacao de preco (MODELO C):
--   total_amount = rate.amount
--   game_id / game_name = so registo (zero impacto no preco)
--
-- Contador de jogos:
--   games_total     = total de jogos contratados na sessao
--   games_remaining = jogos ainda por jogar (decrementado manualmente)
--   Quando games_remaining = 0 → sistema alerta "Jogos esgotados"
--
-- Ciclo de vida do status:
--   Active  -> Closed     (sessao encerrada normalmente)
--   Active  -> Cancelled  (cancelada pelo operador)
--   Active  -> Paused     (pausada temporariamente)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id              SERIAL        PRIMARY KEY,
  station_id      INTEGER       NOT NULL REFERENCES stations(id),
  client_id       INTEGER       REFERENCES clients(id),   -- NULL = cliente ocasional
  client_name     VARCHAR(150)  NOT NULL,                 -- nome sempre guardado
  mode            VARCHAR(20)   NOT NULL DEFAULT 'Solo'
                    CHECK (mode IN ('Solo','Accompanied')),
  rate_id         INTEGER       REFERENCES rates(id),
  game_id         INTEGER       REFERENCES games(id),     -- jogo escolhido (opcional)
  game_name       VARCHAR(150),                           -- snapshot do nome no momento
  games_total     INTEGER       NOT NULL DEFAULT 0,       -- total de jogos contratados
  games_remaining INTEGER       NOT NULL DEFAULT 0,       -- jogos ainda por jogar
  duration_min    INTEGER       NOT NULL DEFAULT 60,
  started_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expected_end_at TIMESTAMPTZ   NOT NULL,
  ended_at        TIMESTAMPTZ,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,       -- = rate.amount
  status          VARCHAR(20)   NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Closed','Paused','Cancelled')),
  payment_status  VARCHAR(20)   NOT NULL DEFAULT 'Pending'
                    CHECK (payment_status IN ('Pending','Paid','Partial')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_status     ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id  ON sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_game_id    ON sessions(game_id);


-- ============================================================
-- 8. PAGAMENTOS
--
-- Ao criar pagamento, o backend insere automaticamente
-- em financial (Income) via withTransaction().
--
-- balance = total_amount - paid_amount (divida restante)
--   balance <= 0 -> payment_status = 'Paid'
--   balance > 0  -> payment_status = 'Partial'
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id            SERIAL        PRIMARY KEY,
  session_id    INTEGER       REFERENCES sessions(id),
  client_name   VARCHAR(150)  NOT NULL,
  total_amount  NUMERIC(10,2) NOT NULL,
  paid_amount   NUMERIC(10,2) NOT NULL,
  balance       NUMERIC(10,2) NOT NULL DEFAULT 0,
  method        VARCHAR(20)   NOT NULL DEFAULT 'Cash'
                  CHECK (method IN ('Cash','M-Pesa','E-Mola','Transfer','Other')),
  description   TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);


-- ============================================================
-- 9. EQUIPAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment (
  id              SERIAL        PRIMARY KEY,
  name            VARCHAR(150)  NOT NULL,
  category        VARCHAR(50),              -- ex: Console, TV, Cadeira, Mesa
  serial_number   VARCHAR(100),
  status          VARCHAR(20)   NOT NULL DEFAULT 'In Use'
                    CHECK (status IN ('In Use','In Maintenance','Decommissioned')),
  location        VARCHAR(100),             -- ex: Station 1, Armazem
  purchase_value  NUMERIC(10,2),
  warranty_expiry DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 10. MANUTENCAO
--
-- Ao fechar ticket (status -> Closed):
--   - equipment.status volta para 'In Use'
--   - actual_cost inserido em financial (Expense)
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance (
  id              SERIAL        PRIMARY KEY,
  equipment_id    INTEGER       REFERENCES equipment(id),
  equipment_name  VARCHAR(150)  NOT NULL,
  description     TEXT          NOT NULL,
  technician      VARCHAR(100),
  status          VARCHAR(20)   NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open','In Progress','Closed')),
  estimated_cost  NUMERIC(10,2),
  actual_cost     NUMERIC(10,2),
  opened_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);


-- ============================================================
-- 11. MOVIMENTOS FINANCEIROS  (Ledger)
--
-- Insercoes automaticas pelo backend:
--   Pagamento de sessao -> type='Income', category='Gaming Session'
--   Fecho de manutencao -> type='Expense', category='Maintenance'
--
-- Insercoes manuais pelo operador:
--   Receitas avulso (snacks, outros servicos)
--   Despesas (luz, renda, salarios, fornecedores)
-- ============================================================
CREATE TABLE IF NOT EXISTS financial (
  id          SERIAL        PRIMARY KEY,
  description TEXT          NOT NULL,
  category    VARCHAR(100),             -- ex: Gaming Session, Maintenance, Utilities
  type        VARCHAR(10)   NOT NULL CHECK (type IN ('Income','Expense')),
  amount      NUMERIC(10,2) NOT NULL,
  method      VARCHAR(20)   NOT NULL DEFAULT 'Cash',
  date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  reference   TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_date ON financial(date);
CREATE INDEX IF NOT EXISTS idx_financial_type ON financial(type);


-- ============================================================
-- 12. CONFIGURACOES DO SISTEMA
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id    SERIAL       PRIMARY KEY,
  key   VARCHAR(100) UNIQUE NOT NULL,
  value TEXT
);


-- ============================================================
-- 13. TORNEIOS
--
-- Formatos:
--   knockout       = eliminacao directa (bracket)
--   group_knockout = fase de grupos + eliminatorias
--
-- Ciclo de vida do status:
--   Open            -> jogadores adicionados, nao iniciado
--   group_phase     -> a decorrer fase de grupos (so group_knockout)
--   knockout_phase  -> a decorrer eliminatorias
--   Finished        -> torneio terminado, vencedor apurado
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id              SERIAL        PRIMARY KEY,
  name            VARCHAR(150)  NOT NULL,
  tournament_date DATE          NOT NULL,
  entry_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  prize           NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_players     INTEGER       NOT NULL DEFAULT 8,   -- numero par (validado por Zod)
  format          VARCHAR(20)   NOT NULL DEFAULT 'knockout'
                    CHECK (format IN ('knockout','group_knockout')),
  num_groups      INTEGER       NOT NULL DEFAULT 2,   -- numero de grupos (so group_knockout)
  status          VARCHAR(20)   NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open','group_phase','knockout_phase','Finished')),
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 14. JOGADORES DE TORNEIO
--
-- group_name    = grupo atribuido (A, B, C...) — so group_knockout
-- group_wins/losses/points = classificacao da fase de grupos
--   Vencer = +3 pontos | Perder = +0 pontos
-- bracket_pos   = posicao no bracket de eliminacao
-- is_eliminated = TRUE quando eliminado nas eliminatorias
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_players (
  id            SERIAL       PRIMARY KEY,
  tournament_id INTEGER      NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name   VARCHAR(150) NOT NULL,
  station_id    INTEGER      REFERENCES stations(id),
  group_name    VARCHAR(10),            -- ex: A, B, C
  bracket_pos   INTEGER,
  group_wins    INTEGER      NOT NULL DEFAULT 0,
  group_losses  INTEGER      NOT NULL DEFAULT 0,
  group_points  INTEGER      NOT NULL DEFAULT 0,
  is_eliminated BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_players_tid   ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_group ON tournament_players(tournament_id, group_name);


-- ============================================================
-- 15. PARTIDAS DE TORNEIO
--
-- phase:
--   group   = jogo da fase de grupos (tem group_name)
--   knockout = jogo de eliminacao directa (tem round)
--
-- round (knockout):
--   1 = Oitavos de Final
--   2 = Quartos de Final
--   3 = Meias Finais
--   4 = Final
--
-- Ao registar winner_id (via API):
--   phase=group   -> winner: +3pts, +1W | loser: +1L
--   phase=knockout -> loser: is_eliminated=TRUE
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_matches (
  id            SERIAL       PRIMARY KEY,
  tournament_id INTEGER      NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase         VARCHAR(20)  NOT NULL CHECK (phase IN ('group','knockout')),
  round         INTEGER      NOT NULL DEFAULT 1,
  group_name    VARCHAR(10),            -- preenchido so na fase de grupos
  player1_id    INTEGER      REFERENCES tournament_players(id) ON DELETE SET NULL,
  player2_id    INTEGER      REFERENCES tournament_players(id) ON DELETE SET NULL,
  winner_id     INTEGER      REFERENCES tournament_players(id) ON DELETE SET NULL,
  score1        INTEGER,               -- pontuacao do player1 (opcional)
  score2        INTEGER,               -- pontuacao do player2 (opcional)
  status        VARCHAR(20)  NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending','In Progress','Done')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tid   ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_phase ON tournament_matches(tournament_id, phase);


-- ============================================================
-- 16. CAIXA DO DIA
--
-- Fluxo:
--   Operador abre caixa -> define meta do dia (target_amount)
--   Durante o dia: pagamentos acumulam (calculado em tempo real)
--   Operador fecha caixa -> collected_amount guardado, resultado visivel
--
-- Regras:
--   - So pode existir uma caixa com status='Open' por vez
--   - collected_amount e calculado ao fechar (soma de payments.paid_amount)
--   - Meta atingida se collected_amount >= target_amount
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_registers (
  id               SERIAL        PRIMARY KEY,
  opened_by        INTEGER       NOT NULL REFERENCES users(id),
  opened_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  target_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,   -- meta do dia (MZN)
  collected_amount NUMERIC(10,2) NOT NULL DEFAULT 0,   -- total recebido ao fechar
  notes            TEXT,
  status           VARCHAR(10)   NOT NULL DEFAULT 'Open'
                     CHECK (status IN ('Open','Closed')),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);
CREATE INDEX IF NOT EXISTS idx_cash_registers_date   ON cash_registers(opened_at);


-- ============================================================
-- VIEW: v_station_status
-- Estado em tempo real de cada estacao activa.
-- Inclui info da sessao activa: cliente, jogo, jogos restantes,
-- tempo restante (minutos).
-- ============================================================
CREATE OR REPLACE VIEW v_station_status AS
SELECT
  s.id,
  s.name,
  s.console,
  s.is_active,
  CASE WHEN sess.id IS NOT NULL THEN 'Occupied' ELSE 'Available' END AS status,
  sess.id               AS session_id,
  sess.client_name,
  sess.client_id,
  sess.game_name,
  sess.games_total,
  sess.games_remaining,
  sess.started_at,
  sess.expected_end_at,
  sess.total_amount,
  GREATEST(0, EXTRACT(EPOCH FROM (sess.expected_end_at - NOW())) / 60)::INTEGER AS minutes_remaining
FROM stations s
LEFT JOIN sessions sess
  ON sess.station_id = s.id
  AND sess.status = 'Active'
WHERE s.is_active = TRUE;


-- ============================================================
-- VIEW: v_dashboard
-- KPIs agregados para o dashboard principal.
-- Actualizada em cada query (sem cache).
-- ============================================================
CREATE OR REPLACE VIEW v_dashboard AS
SELECT
  (SELECT COUNT(*)
     FROM sessions
    WHERE status = 'Active')::INTEGER                                              AS active_sessions,

  (SELECT COALESCE(SUM(paid_amount), 0)
     FROM payments
    WHERE DATE(created_at) = CURRENT_DATE)::NUMERIC                               AS revenue_today,

  (SELECT COUNT(*)
     FROM sessions
    WHERE DATE(started_at) = CURRENT_DATE)::INTEGER                               AS sessions_today,

  (SELECT COALESCE(SUM(paid_amount), 0)
     FROM payments
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()))::NUMERIC   AS revenue_month,

  (SELECT COUNT(*)
     FROM maintenance
    WHERE status != 'Closed')::INTEGER                                             AS open_maintenance,

  (SELECT COUNT(*)
     FROM clients
    WHERE is_active = TRUE)::INTEGER                                               AS total_clients,

  (SELECT COUNT(*)
     FROM stations
    WHERE is_active = TRUE)::INTEGER                                               AS active_stations;


-- ============================================================
-- TRIGGER: trg_update_client_stats
--
-- Disparado AFTER UPDATE em sessions.
-- Quando status muda de 'Active' para 'Closed' e client_id
-- nao e NULL, actualiza automaticamente:
--   clients.total_sessions += 1
--   clients.total_spent    += session.total_amount
--   clients.last_visit      = NOW()
--   clients.updated_at      = NOW()
-- ============================================================
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Closed' AND OLD.status = 'Active' AND NEW.client_id IS NOT NULL THEN
    UPDATE clients SET
      total_sessions = total_sessions + 1,
      total_spent    = total_spent + NEW.total_amount,
      last_visit     = NOW(),
      updated_at     = NOW()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_client_stats ON sessions;
CREATE TRIGGER trg_update_client_stats
  AFTER UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_client_stats();


-- ============================================================
-- DADOS INICIAIS
-- ============================================================

INSERT INTO settings (key, value) VALUES
  ('currency',           'MZN'),
  ('establishment_name', 'Game Solutions'),
  ('overtime_rate',      '50')
ON CONFLICT (key) DO NOTHING;

-- Nota: utilizadores, tarifas, estacoes e jogos sao criados
-- pelo script:  npm run db:setup  (scripts/db-setup.js)
-- Credenciais padrao:
--   admin    / admin123
--   operator / operator123
