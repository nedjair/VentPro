// Service d'authentification directe via PostgreSQL (sans Prisma)
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

function buildPgConfigFromEnv() {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
        const parsedUrl = new URL(databaseUrl);

        return {
            host: parsedUrl.hostname,
            port: Number(parsedUrl.port || 5432),
            database: parsedUrl.pathname.replace(/^\//, ''),
            user: decodeURIComponent(parsedUrl.username),
            password: decodeURIComponent(parsedUrl.password),
        };
    }

    return {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || 5434),
        database: process.env.POSTGRES_DB || 'gestion_commerciale_tpe',
        user: process.env.POSTGRES_USER || 'tpe_user',
        password: process.env.POSTGRES_PASSWORD || 'tpe_password_2024',
    };
}

// Configuration de la connexion PostgreSQL directe.
// On centralise la lecture de la configuration pour éviter tout identifiant
// ou port codé en dur dans le code applicatif.
const pool = new Pool(buildPgConfigFromEnv());

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
}

export class DirectAuthService {
    /**
     * Authentifie un utilisateur avec email et mot de passe
     */
    async login(credentials: LoginCredentials): Promise<AuthUser | null> {
        const { email, password } = credentials;

        try {
            console.log(`[DirectAuthService] Tentative de connexion pour: ${email}`);

            // Requête SQL directe vers la base de données Docker
            const result = await pool.query(
                'SELECT id, email, password, "fullName", role, "isActive" FROM "User" WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                console.log(`[DirectAuthService] Utilisateur non trouvé: ${email}`);
                return null;
            }

            const user = result.rows[0];
            console.log(`[DirectAuthService] Utilisateur trouvé: ${user.fullName}, rôle: ${user.role}`);

            // Vérifier si le compte est actif
            if (!user.isActive) {
                console.log(`[DirectAuthService] Compte inactif: ${email}`);
                return null;
            }

            // Vérifier le mot de passe
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                console.log(`[DirectAuthService] Mot de passe incorrect pour: ${email}`);
                return null;
            }

            console.log(`[DirectAuthService] Connexion réussie pour: ${email}`);

            return {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
            };
        } catch (error) {
            console.error('[DirectAuthService] Erreur de connexion à la base de données:', error);
            throw error;
        }
    }

    /**
     * Vérifie la connexion à la base de données
     */
    async testConnection(): Promise<boolean> {
        try {
            const result = await pool.query('SELECT 1');
            return result.rows.length > 0;
        } catch (error) {
            console.error('[DirectAuthService] Erreur de test de connexion:', error);
            return false;
        }
    }
}

export const directAuthService = new DirectAuthService();
