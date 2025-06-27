-- Script d'initialisation de la base de données
-- Gestion Commerciale TPE

-- Création des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configuration des paramètres PostgreSQL
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Configuration des connexions
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Rechargement de la configuration
SELECT pg_reload_conf();

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Base de données initialisée pour Gestion Commerciale TPE';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'Version PostgreSQL: %', version();
END $$;