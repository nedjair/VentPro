-- Création de l'utilisateur et des données pour Gestion Commerciale TPE

-- Créer l'utilisateur s'il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'gestion_user') THEN
        CREATE USER gestion_user WITH PASSWORD 'gestion_password_secure_2024';
    END IF;
END
$$;

-- Donner tous les privilèges sur la base de données
GRANT ALL PRIVILEGES ON DATABASE gestion_commerciale TO gestion_user;

-- Se connecter à la base de données gestion_commerciale
\c gestion_commerciale;

-- Donner les privilèges sur le schéma public
GRANT ALL ON SCHEMA public TO gestion_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestion_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestion_user;

-- Créer les tables
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'EMPLOYEE',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type VARCHAR(50) DEFAULT 'INDIVIDUAL',
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    postal_code VARCHAR(20),
    city VARCHAR(255),
    country VARCHAR(255) DEFAULT 'France',
    siret VARCHAR(50),
    vat_number VARCHAR(50),
    payment_terms INTEGER DEFAULT 30,
    discount DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(255) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    vat_rate DECIMAL(5,2) DEFAULT 20,
    stock_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_service BOOLEAN DEFAULT false,
    unit VARCHAR(50) DEFAULT 'pièce',
    category VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donner les privilèges sur les nouvelles tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gestion_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gestion_user;

-- Insérer des données de test
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@demo-tpe.fr', 'demo123', 'Admin', 'User', 'ADMIN'),
('manager@demo-tpe.fr', 'demo123', 'Manager', 'User', 'MANAGER'),
('employee@demo-tpe.fr', 'demo123', 'Employee', 'User', 'EMPLOYEE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO clients (type, first_name, last_name, email, phone, address, city, postal_code) VALUES
('INDIVIDUAL', 'Jean', 'Dupont', 'jean.dupont@example.com', '0123456789', '123 Rue de la Paix', 'Paris', '75001'),
('INDIVIDUAL', 'Marie', 'Martin', 'marie.martin@example.com', '0147258369', '789 Boulevard Saint-Germain', 'Marseille', '13001')
ON CONFLICT DO NOTHING;

INSERT INTO clients (type, company_name, email, phone, address, city, postal_code, siret, vat_number) VALUES
('COMPANY', 'ACME Corp', 'contact@acme.com', '0987654321', '456 Avenue des Champs', 'Lyon', '69001', '12345678901234', 'FR12345678901')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, description, sku, price, cost, stock_quantity, min_stock, category) VALUES
('Ordinateur Portable HP', 'Ordinateur portable HP 15.6" avec processeur Intel i5', 'HP-LAPTOP-001', 699.99, 500.00, 15, 5, 'Informatique'),
('Souris Logitech', 'Souris sans fil Logitech MX Master 3', 'LOG-MOUSE-001', 89.99, 45.00, 25, 10, 'Accessoires')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, description, sku, price, is_service, unit, category) VALUES
('Consultation IT', 'Service de consultation informatique - 1 heure', 'SERV-IT-001', 80.00, true, 'heure', 'Services')
ON CONFLICT (sku) DO NOTHING;
