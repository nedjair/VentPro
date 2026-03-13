// Serveur backend simplifié avec authentification directe PostgreSQL
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { directAuthService } from './services/direct-auth.service';

const server = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty'
        }
    }
});

async function start() {
    try {
        // Test de connexion à la base de données
        console.log('🔌 Test de connexion à la base de données...');
        const dbConnected = await directAuthService.testConnection();

        if (dbConnected) {
            console.log('✅ Connexion à la base de données réussie!');
        } else {
            console.log('❌ Échec de la connexion à la base de données');
        }

        // Configuration CORS
        await server.register(cors, {
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        });

        // Configuration JWT
        await server.register(jwt, {
            secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
        });

        // Route de santé
        server.get('/health', async () => {
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: dbConnected ? 'connected' : 'disconnected'
            };
        });

        server.get('/api/health', async () => {
            return {
                status: 'ok',
                message: 'Backend API is running',
                timestamp: new Date().toISOString()
            };
        });

        // Route d'authentification principale
        server.post('/api/v1/auth/login', async (request, reply) => {
            try {
                const { email, password } = request.body as { email: string; password: string };

                if (!email || !password) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Email et mot de passe requis'
                    });
                }

                console.log(`🔐 Tentative de connexion pour: ${email}`);

                // Authentification directe via PostgreSQL
                const user = await directAuthService.login({ email, password });

                if (!user) {
                    console.log(`❌ Échec de connexion pour: ${email}`);
                    return reply.status(401).send({
                        success: false,
                        message: 'Email ou mot de passe incorrect'
                    });
                }

                // Générer les tokens JWT
                const payload = {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    fullName: user.fullName
                };

                const accessToken = server.jwt.sign(payload, { expiresIn: '15m' });
                const refreshToken = server.jwt.sign(payload, { expiresIn: '7d' });

                console.log(`✅ Connexion réussie pour: ${email} (${user.fullName})`);

                return {
                    success: true,
                    message: 'Connexion réussie',
                    data: {
                        user: {
                            id: user.id,
                            email: user.email,
                            firstName: user.fullName.split(' ')[0] || user.fullName,
                            lastName: user.fullName.split(' ').slice(1).join(' ') || '',
                            fullName: user.fullName,
                            role: user.role.toUpperCase(),
                            companyId: 'default-company'
                        },
                        tokens: {
                            accessToken,
                            refreshToken,
                            expiresIn: 900
                        }
                    }
                };
            } catch (error) {
                console.error('❌ Erreur lors de la connexion:', error);
                return reply.status(500).send({
                    success: false,
                    message: 'Erreur serveur lors de la connexion'
                });
            }
        });

        // Route alternative pour /api/auth/login
        server.post('/api/auth/login', async (request, reply) => {
            return server.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: request.body
            }).then(response => {
                reply.status(response.statusCode).send(JSON.parse(response.payload));
            });
        });

        // Route de profil utilisateur
        server.get('/api/v1/users/profile', async (request, reply) => {
            try {
                const authHeader = request.headers.authorization;

                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return reply.status(401).send({
                        success: false,
                        message: 'Token d\'authentification requis'
                    });
                }

                const token = authHeader.substring(7);
                const decoded = server.jwt.verify(token) as any;

                return {
                    success: true,
                    data: {
                        id: decoded.userId,
                        email: decoded.email,
                        firstName: decoded.fullName?.split(' ')[0] || 'User',
                        lastName: decoded.fullName?.split(' ').slice(1).join(' ') || '',
                        fullName: decoded.fullName,
                        role: decoded.role?.toUpperCase() || 'USER',
                        companyId: 'default-company'
                    }
                };
            } catch (error) {
                return reply.status(401).send({
                    success: false,
                    message: 'Token invalide ou expiré'
                });
            }
        });

        // Route du dashboard
        server.get('/api/v1/dashboard/stats', async () => {
            return {
                success: true,
                data: {
                    totalClients: 25,
                    totalProducts: 50,
                    totalOrders: 120,
                    totalRevenue: 450000,
                    lowStockProducts: 5,
                    pendingOrders: 8
                }
            };
        });

        // Démarrage du serveur
        const port = parseInt(process.env.PORT || '3001');
        const host = process.env.HOST || '0.0.0.0';

        await server.listen({ port, host });

        console.log('');
        console.log('='.repeat(50));
        console.log('🚀 SERVEUR BACKEND DÉMARRÉ AVEC SUCCÈS');
        console.log('='.repeat(50));
        console.log(`📡 URL: http://${host}:${port}`);
        console.log(`🏥 Health check: http://localhost:${port}/health`);
        console.log(`🔐 Login: POST http://localhost:${port}/api/v1/auth/login`);
        console.log('='.repeat(50));
        console.log('');

    } catch (error) {
        console.error('❌ Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

start();
