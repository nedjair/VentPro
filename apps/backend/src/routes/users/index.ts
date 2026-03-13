import { FastifyInstance } from 'fastify';
import { authenticateToken } from '../../middleware/auth.js';
import { 
  requirePermission, 
  requireAdmin, 
  requireAdminOrManager,
  validateRoleAssignment 
} from '../../middleware/rbac.js';
import {
  getUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  changePasswordHandler,
  toggleUserStatusHandler,
  getUserStatsHandler
} from './handlers.js';
import {
  getUsersSchema,
  getUserByIdSchema,
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  changePasswordSchema,
  toggleStatusSchema,
  getUserStatsSchema
} from './schemas.js';

/**
 * Routes pour la gestion des utilisateurs
 */
export async function userRoutes(fastify: FastifyInstance) {
  // Appliquer l'authentification à toutes les routes
  fastify.addHook('preHandler', authenticateToken);

  // GET /users - Récupérer la liste des utilisateurs
  fastify.get('/', {
    schema: getUsersSchema,
    preHandler: [requireAdminOrManager]
  }, getUsersHandler);

  // GET /users/stats - Statistiques des utilisateurs
  fastify.get('/stats', {
    schema: getUserStatsSchema,
    preHandler: [requireAdminOrManager]
  }, getUserStatsHandler);

  // GET /users/:id - Récupérer un utilisateur par ID
  fastify.get('/:id', {
    schema: getUserByIdSchema
  }, getUserByIdHandler);

  // POST /users - Créer un nouvel utilisateur
  fastify.post('/', {
    schema: createUserSchema,
    preHandler: [requireAdminOrManager, validateRoleAssignment()]
  }, createUserHandler);

  // PUT /users/:id - Mettre à jour un utilisateur
  fastify.put('/:id', {
    schema: updateUserSchema,
    preHandler: [validateRoleAssignment()]
  }, updateUserHandler);

  // POST /users/:id/change-password - Changer le mot de passe
  fastify.post('/:id/change-password', {
    schema: changePasswordSchema
  }, changePasswordHandler);

  // PATCH /users/:id/status - Activer/désactiver un utilisateur
  fastify.patch('/:id/status', {
    schema: toggleStatusSchema,
    preHandler: [requireAdminOrManager]
  }, toggleUserStatusHandler);

  // DELETE /users/:id - Supprimer un utilisateur
  fastify.delete('/:id', {
    schema: deleteUserSchema,
    preHandler: [requireAdminOrManager]
  }, deleteUserHandler);
}
