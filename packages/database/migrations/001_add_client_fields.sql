-- Migration pour ajouter les nouveaux champs aux clients
-- Date: 2024-01-15

-- Ajouter les nouveaux champs au modèle Client
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'France',
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Créer des index pour les nouveaux champs
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);

-- Créer la table des interactions clients
CREATE TABLE IF NOT EXISTS client_interactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'ORDER', 'INVOICE')),
    subject TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour la table des interactions
CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_type ON client_interactions(type);
CREATE INDEX IF NOT EXISTS idx_client_interactions_date ON client_interactions(date);
CREATE INDEX IF NOT EXISTS idx_client_interactions_user_id ON client_interactions(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at sur client_interactions
CREATE TRIGGER update_client_interactions_updated_at 
    BEFORE UPDATE ON client_interactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Mettre à jour les clients existants pour avoir is_active = true par défaut
UPDATE clients SET is_active = true WHERE is_active IS NULL;

-- Commentaires pour documenter les nouveaux champs
COMMENT ON COLUMN clients.website IS 'Site web du client';
COMMENT ON COLUMN clients.fax IS 'Numéro de fax du client';
COMMENT ON COLUMN clients.billing_address IS 'Adresse de facturation';
COMMENT ON COLUMN clients.billing_postal_code IS 'Code postal de facturation';
COMMENT ON COLUMN clients.billing_city IS 'Ville de facturation';
COMMENT ON COLUMN clients.billing_country IS 'Pays de facturation';
COMMENT ON COLUMN clients.credit_limit IS 'Limite de crédit autorisée';
COMMENT ON COLUMN clients.is_active IS 'Statut actif/inactif du client';
COMMENT ON COLUMN clients.notes IS 'Notes internes sur le client';
COMMENT ON COLUMN clients.tags IS 'Étiquettes associées au client';

COMMENT ON TABLE client_interactions IS 'Historique des interactions avec les clients';
COMMENT ON COLUMN client_interactions.type IS 'Type d''interaction (CALL, EMAIL, MEETING, NOTE, ORDER, INVOICE)';
COMMENT ON COLUMN client_interactions.subject IS 'Sujet de l''interaction';
COMMENT ON COLUMN client_interactions.description IS 'Description détaillée de l''interaction';
COMMENT ON COLUMN client_interactions.date IS 'Date et heure de l''interaction';
COMMENT ON COLUMN client_interactions.user_id IS 'Utilisateur qui a créé l''interaction';
