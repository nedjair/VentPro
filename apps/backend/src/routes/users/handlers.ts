import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../../services/UserService.js';
import { canAccessUser, filterUserData } from '../../middleware/rbac.js';
import {
  CreateUserRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
  ToggleStatusRequest,
  UserFilters,
  PaginationQuery
} from '../../types/user.js';
import { prisma } from '../../lib/prisma';

const userService = new UserService(prisma);

/**
 * GET /users - Récupérer la liste des utilisateurs
 */
export async function getUsersHandler(
  request: FastifyRequest<{
    Querystring: UserFilters & PaginationQuery;
  }>,
  reply: FastifyReply
) {
  try {
    const { page = '1', limit = '10', ...filters } = request.query;
    const currentUser = request.user!;

    // Les managers ne peuvent voir que les utilisateurs de leur entreprise
    if (currentUser.role === 'MANAGER') {
      filters.companyId = currentUser.companyId;
    }

    const result = await userService.getUsers(
      filters,
      { page: parseInt(page), limit: parseInt(limit) }
    );

    // Filtrer les données selon les permissions
    const filteredUsers = result.data.map(user => 
      filterUserData(user, currentUser.role, user.id === currentUser.id)
    );

    return reply.send({
      success: true,
      data: {
        users: filteredUsers,
        pagination: result.pagination
      }
    });
  } catch (error) {
    request.log.error('Erreur lors de la récupération des utilisateurs:', error);
    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * GET /users/:id - Récupérer un utilisateur par ID
 */
export async function getUserByIdHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const currentUser = request.user!;

    const user = await userService.getUserById(id);
    if (!user) {
      return reply.status(404).send({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les permissions d'accès
    if (!canAccessUser(
      currentUser.role,
      currentUser.companyId,
      user.companyId,
      user.id,
      currentUser.id
    )) {
      return reply.status(403).send({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      });
    }

    const filteredUser = filterUserData(user, currentUser.role, user.id === currentUser.id);

    return reply.send({
      success: true,
      data: filteredUser
    });
  } catch (error) {
    request.log.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * POST /users - Créer un nouvel utilisateur
 */
export async function createUserHandler(
  request: FastifyRequest<{
    Body: CreateUserRequest;
  }>,
  reply: FastifyReply
) {
  try {
    const userData = request.body;
    const currentUser = request.user!;

    // Les managers ne peuvent créer que des utilisateurs dans leur entreprise
    if (currentUser.role === 'MANAGER') {
      userData.companyId = currentUser.companyId;
    }

    // Si aucun companyId n'est fourni, utiliser celui de l'utilisateur connecté
    if (!userData.companyId) {
      userData.companyId = currentUser.companyId;
    }

    const user = await userService.createUser(userData);
    const filteredUser = filterUserData(user, currentUser.role);

    return reply.status(201).send({
      success: true,
      data: filteredUser,
      message: 'Utilisateur créé avec succès'
    });
  } catch (error) {
    request.log.error('Erreur lors de la création de l\'utilisateur:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('email existe déjà')) {
        return reply.status(409).send({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Entreprise non trouvée')) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * PUT /users/:id - Mettre à jour un utilisateur
 */
export async function updateUserHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateUserRequest;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const updateData = request.body;
    const currentUser = request.user!;

    // Vérifier que l'utilisateur existe et les permissions
    const existingUser = await userService.getUserById(id);
    if (!existingUser) {
      return reply.status(404).send({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!canAccessUser(
      currentUser.role,
      currentUser.companyId,
      existingUser.companyId,
      existingUser.id,
      currentUser.id
    )) {
      return reply.status(403).send({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      });
    }

    // Les employés ne peuvent modifier que certains champs
    if (currentUser.role === 'EMPLOYEE') {
      const allowedFields = ['firstName', 'lastName', 'email'];
      const filteredData: UpdateUserRequest = {};
      
      for (const field of allowedFields) {
        if (field in updateData) {
          (filteredData as any)[field] = (updateData as any)[field];
        }
      }
      
      Object.assign(updateData, filteredData);
    }

    const updatedUser = await userService.updateUser(id, updateData);
    const filteredUser = filterUserData(updatedUser, currentUser.role, updatedUser.id === currentUser.id);

    return reply.send({
      success: true,
      data: filteredUser,
      message: 'Utilisateur mis à jour avec succès'
    });
  } catch (error) {
    request.log.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    
    if (error instanceof Error && error.message.includes('email existe déjà')) {
      return reply.status(409).send({
        success: false,
        message: error.message
      });
    }

    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * POST /users/:id/change-password - Changer le mot de passe
 */
export async function changePasswordHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: ChangePasswordRequest;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const { currentPassword, newPassword } = request.body;
    const currentUser = request.user!;

    // Vérifier les permissions
    const isAdmin = currentUser.role === 'ADMIN';
    const isOwnAccount = currentUser.id === id;

    if (!isAdmin && !isOwnAccount) {
      return reply.status(403).send({
        success: false,
        message: 'Vous ne pouvez changer que votre propre mot de passe'
      });
    }

    await userService.changePassword(id, currentPassword || '', newPassword, isAdmin);

    return reply.send({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    request.log.error('Erreur lors du changement de mot de passe:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Utilisateur non trouvé')) {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Mot de passe actuel incorrect')) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }
    }

    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * PATCH /users/:id/status - Activer/désactiver un utilisateur
 */
export async function toggleUserStatusHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: ToggleStatusRequest;
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const currentUser = request.user!;

    // Vérifier que l'utilisateur existe
    const existingUser = await userService.getUserById(id);
    if (!existingUser) {
      return reply.status(404).send({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les permissions
    if (!canAccessUser(
      currentUser.role,
      currentUser.companyId,
      existingUser.companyId,
      existingUser.id,
      currentUser.id
    )) {
      return reply.status(403).send({
        success: false,
        message: 'Accès refusé à cet utilisateur'
      });
    }

    // Empêcher de se désactiver soi-même
    if (currentUser.id === id) {
      return reply.status(400).send({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    const updatedUser = await userService.toggleUserStatus(id);
    const filteredUser = filterUserData(updatedUser, currentUser.role);

    return reply.send({
      success: true,
      data: filteredUser,
      message: `Utilisateur ${updatedUser.isActive ? 'activé' : 'désactivé'} avec succès`
    });
  } catch (error) {
    request.log.error('Erreur lors du changement de statut:', error);
    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * DELETE /users/:id - Supprimer un utilisateur
 */
export async function deleteUserHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;
    const currentUser = request.user!;

    // Empêcher de se supprimer soi-même
    if (currentUser.id === id) {
      return reply.status(400).send({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Vérifier que l'utilisateur à supprimer existe
    const userToDelete = await userService.getUserById(id);
    if (!userToDelete) {
      return reply.status(404).send({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les permissions selon le rôle
    if (currentUser.role === 'MANAGER') {
      // Les managers ne peuvent supprimer que les utilisateurs de leur entreprise
      // et ne peuvent pas supprimer d'autres admins ou managers
      if (userToDelete.companyId !== currentUser.companyId) {
        return reply.status(403).send({
          success: false,
          message: 'Vous ne pouvez supprimer que les utilisateurs de votre entreprise'
        });
      }

      if (userToDelete.role === 'ADMIN') {
        return reply.status(403).send({
          success: false,
          message: 'Vous ne pouvez pas supprimer un administrateur'
        });
      }
    }

    await userService.deleteUser(id);

    return reply.send({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    request.log.error('Erreur lors de la suppression de l\'utilisateur:', error);

    if (error instanceof Error && error.message.includes('Utilisateur non trouvé')) {
      return reply.status(404).send({
        success: false,
        message: error.message
      });
    }

    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}

/**
 * GET /users/stats - Statistiques des utilisateurs
 */
export async function getUserStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const currentUser = request.user!;
    
    // Les managers ne voient que les stats de leur entreprise
    const companyId = currentUser.role === 'MANAGER' ? currentUser.companyId : undefined;
    
    const stats = await userService.getUserStats(companyId);

    return reply.send({
      success: true,
      data: stats
    });
  } catch (error) {
    request.log.error('Erreur lors de la récupération des statistiques:', error);
    return reply.status(500).send({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
}
