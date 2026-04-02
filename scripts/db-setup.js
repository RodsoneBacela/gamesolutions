#!/usr/bin/env node
// npm run db:setup  — creates default users
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
  console.log('🔧 Setting up database...');
  const adminHash    = await bcrypt.hash('admin123', 12);
  const operatorHash = await bcrypt.hash('operator123', 12);

  await pool.query(`
    INSERT INTO users (username, password_hash, email, role) VALUES
      ('admin',    $1, 'admin@gamesolutions.co.mz',    'admin'),
      ('operator', $2, 'operator@gamesolutions.co.mz', 'user')
    ON CONFLICT (username) DO NOTHING
  `, [adminHash, operatorHash]);

  // Default rates
  await pool.query(`
    INSERT INTO rates (name, duration_min, amount, mode) VALUES
      ('Solo 30min',    30,  80.00, 'Solo'),
      ('Solo 1h',       60,  150.00, 'Solo'),
      ('Solo 2h',       120, 250.00, 'Solo'),
      ('Duo 1h',        60,  200.00, 'Accompanied'),
      ('Duo 2h',        120, 350.00, 'Accompanied')
    ON CONFLICT DO NOTHING
  `);

  // Default stations
  await pool.query(`
    INSERT INTO stations (name, console, description) VALUES
      ('Station 1', 'PlayStation 5', 'TV Samsung 55"'),
      ('Station 2', 'PlayStation 5', 'TV LG 55"'),
      ('Station 3', 'Xbox Series X', 'TV Sony 50"'),
      ('Station 4', 'PC Gaming', 'Monitor 27" 144Hz')
    ON CONFLICT DO NOTHING
  `);

  // Default games
  await pool.query(`
    INSERT INTO games (name, genre, platform, cover_color) VALUES
      ('FIFA 25',          'Futebol',     'PlayStation 5',  50.00, '#22c55e'),
      ('EA Sports FC 25',  'Futebol',     'PlayStation 5',  50.00, '#0ea5e9'),
      ('Call of Duty',     'FPS',         'PlayStation 5',  60.00, '#ef4444'),
      ('Mortal Kombat 1',  'Luta',        'PlayStation 5',  50.00, '#a855f7'),
      ('NBA 2K25',         'Basquete',    'PlayStation 5',  50.00, '#f59e0b'),
      ('GTA V',            'Acção',       'PC Gaming',      40.00, '#f97316'),
      ('Fortnite',         'Battle Royale','PC Gaming',     0.00,  '#06b6d4'),
      ('Minecraft',        'Sandbox',     'Todas',          30.00, '#84cc16')
    ON CONFLICT DO NOTHING
  `);

  console.log('✅ Default users, rates, stations and games created.');
  console.log('   admin / admin123');
  console.log('   operator / operator123');
  console.log('⚠️  Change passwords after first login!');
  await pool.end();
}

setup().catch(err => { console.error(err); process.exit(1); });
