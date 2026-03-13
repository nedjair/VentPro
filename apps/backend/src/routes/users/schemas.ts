/**
 * Schémas de validation pour les routes utilisateurs
 */

// Schéma pour GET /users
export const getUsersSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[1-9][0-9]*$' },
      limit: { type: 'string', pattern: '^[1-9][0-9]*$' },
      search: { type: 'string', minLength: 1, maxLength: 100 },
      role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      isActive: { type: 'string', enum: ['true', 'false'] },
      companyId: { type: 'string', minLength: 1 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  lastLoginAt: { type: ['string', 'null'] },
                  company: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }
};

// Schéma pour GET /users/:id
export const getUserByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            lastLoginAt: { type: ['string', 'null'] },
            company: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

// Schéma pour POST /users
export const createUserSchema = {
  body: {
    type: 'object',
    required: ['email', 'firstName', 'lastName', 'password', 'role'],
    properties: {
      email: { 
        type: 'string', 
        format: 'email',
        maxLength: 255
      },
      firstName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100 
      },
      lastName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100 
      },
      password: { 
        type: 'string', 
        minLength: 8, 
        maxLength: 128,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
      },
      role: {
        type: 'string',
        enum: ['ADMIN', 'MANAGER', 'EMPLOYEE']
      }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        message: { type: 'string' }
      }
    }
  }
};

// Schéma pour PUT /users/:id
export const updateUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 }
    }
  },
  body: {
    type: 'object',
    properties: {
      email: { 
        type: 'string', 
        format: 'email',
        maxLength: 255
      },
      firstName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100 
      },
      lastName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100 
      },
      role: { 
        type: 'string', 
        enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] 
      },
      isActive: { type: 'boolean' }
    }
  }
};

// Schéma pour POST /users/:id/change-password
export const changePasswordSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 }
    }
  },
  body: {
    type: 'object',
    required: ['newPassword', 'confirmPassword'],
    properties: {
      currentPassword: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 128 
      },
      newPassword: {
        type: 'string',
        minLength: 6,
        maxLength: 128
      },
      confirmPassword: {
        type: 'string',
        minLength: 6,
        maxLength: 128
      }
    }
  }
};

// Schéma pour PATCH /users/:id/status
export const toggleStatusSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 }
    }
  },
  body: {
    type: 'object',
    required: ['isActive'],
    properties: {
      isActive: { type: 'boolean' }
    }
  }
};

// Schéma pour DELETE /users/:id
export const deleteUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  }
};

// Schéma pour GET /users/stats
export const getUserStatsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            admins: { type: 'number' },
            managers: { type: 'number' },
            employees: { type: 'number' },
            active: { type: 'number' },
            inactive: { type: 'number' }
          }
        }
      }
    }
  }
};
