-- Script d'initialisation PostgreSQL pour l'application de gestion commerciale

-- Création des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Configuration de la locale française
SET lc_messages TO 'fr_FR.UTF-8';
SET lc_monetary TO 'fr_FR.UTF-8';
SET lc_numeric TO 'fr_FR.UTF-8';
SET lc_time TO 'fr_FR.UTF-8';

-- Configuration du timezone
SET timezone TO 'Europe/Paris';

-- Optimisations pour les performances
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Configuration de la mémoire
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Configuration des connexions
ALTER SYSTEM SET max_connections = 200;

-- Recharger la configuration
SELECT pg_reload_conf();
