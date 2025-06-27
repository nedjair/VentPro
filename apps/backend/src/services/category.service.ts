import { prisma, Category } from '@gestion/database'
import { logger } from '../utils/logger'

export interface CreateCategoryData {
  name: string
  description?: string
  parentId?: string
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export class CategoryService {
  /**
   * Créer une nouvelle catégorie
   */
  static async createCategory(
    data: CreateCategoryData,
    companyId: string
  ): Promise<Category> {
    try {
      logger.info('Création d\'une nouvelle catégorie', { companyId, name: data.name })

      // Vérifier l'unicité du nom dans l'entreprise
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: data.name,
          companyId,
          parentId: data.parentId || null,
        },
      })

      if (existingCategory) {
        throw new Error('Une catégorie avec ce nom existe déjà à ce niveau')
      }

      // Vérifier que la catégorie parent existe si spécifiée
      if (data.parentId) {
        const parentCategory = await prisma.category.findFirst({
          where: {
            id: data.parentId,
            companyId,
          },
        })

        if (!parentCategory) {
          throw new Error('Catégorie parent non trouvée')
        }
      }

      const category = await prisma.category.create({
        data: {
          ...data,
          companyId,
        },
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      })

      logger.info('Catégorie créée avec succès', { categoryId: category.id })
      return category
    } catch (error) {
      logger.error('Erreur lors de la création de la catégorie', { error, data })
      throw error
    }
  }

  /**
   * Récupérer une catégorie par ID
   */
  static async getCategoryById(id: string, companyId: string): Promise<Category | null> {
    try {
      const category = await prisma.category.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      })

      return category
    } catch (error) {
      logger.error('Erreur lors de la récupération de la catégorie', { error, id })
      throw error
    }
  }

  /**
   * Récupérer toutes les catégories d'une entreprise
   */
  static async getCategories(companyId: string): Promise<Category[]> {
    try {
      const categories = await prisma.category.findMany({
        where: {
          companyId,
        },
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: [
          { parentId: 'asc' },
          { name: 'asc' },
        ],
      })

      return categories
    } catch (error) {
      logger.error('Erreur lors de la récupération des catégories', { error })
      throw error
    }
  }

  /**
   * Récupérer les catégories racines (sans parent)
   */
  static async getRootCategories(companyId: string): Promise<Category[]> {
    try {
      const categories = await prisma.category.findMany({
        where: {
          companyId,
          parentId: null,
        },
        include: {
          children: {
            include: {
              _count: {
                select: {
                  products: true,
                },
              },
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      })

      return categories
    } catch (error) {
      logger.error('Erreur lors de la récupération des catégories racines', { error })
      throw error
    }
  }

  /**
   * Récupérer l'arbre hiérarchique des catégories
   */
  static async getCategoryTree(companyId: string): Promise<Category[]> {
    try {
      // Récupérer toutes les catégories
      const allCategories = await this.getCategories(companyId)

      // Construire l'arbre hiérarchique
      const categoryMap = new Map<string, Category>()
      const rootCategories: Category[] = []

      // Première passe : créer la map
      allCategories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] })
      })

      // Deuxième passe : construire la hiérarchie
      allCategories.forEach(category => {
        const categoryWithChildren = categoryMap.get(category.id)!
        
        if (category.parentId) {
          const parent = categoryMap.get(category.parentId)
          if (parent) {
            parent.children = parent.children || []
            parent.children.push(categoryWithChildren)
          }
        } else {
          rootCategories.push(categoryWithChildren)
        }
      })

      return rootCategories
    } catch (error) {
      logger.error('Erreur lors de la construction de l\'arbre des catégories', { error })
      throw error
    }
  }

  /**
   * Mettre à jour une catégorie
   */
  static async updateCategory(
    id: string,
    data: UpdateCategoryData,
    companyId: string
  ): Promise<Category> {
    try {
      logger.info('Mise à jour de la catégorie', { categoryId: id, companyId })

      // Vérifier que la catégorie existe et appartient à l'entreprise
      const existingCategory = await this.getCategoryById(id, companyId)
      if (!existingCategory) {
        throw new Error('Catégorie non trouvée')
      }

      // Vérifier l'unicité du nom si modifié
      if (data.name && data.name !== existingCategory.name) {
        const nameExists = await prisma.category.findFirst({
          where: {
            name: data.name,
            companyId,
            parentId: data.parentId || existingCategory.parentId,
            id: { not: id },
          },
        })

        if (nameExists) {
          throw new Error('Une catégorie avec ce nom existe déjà à ce niveau')
        }
      }

      // Vérifier que la catégorie parent existe si modifiée
      if (data.parentId && data.parentId !== existingCategory.parentId) {
        // Empêcher la création de cycles
        if (data.parentId === id) {
          throw new Error('Une catégorie ne peut pas être son propre parent')
        }

        // Vérifier que le nouveau parent n'est pas un descendant
        const isDescendant = await this.isDescendant(id, data.parentId, companyId)
        if (isDescendant) {
          throw new Error('Impossible de déplacer une catégorie vers un de ses descendants')
        }

        const parentCategory = await prisma.category.findFirst({
          where: {
            id: data.parentId,
            companyId,
          },
        })

        if (!parentCategory) {
          throw new Error('Catégorie parent non trouvée')
        }
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data,
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      })

      logger.info('Catégorie mise à jour avec succès', { categoryId: id })
      return updatedCategory
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la catégorie', { error, id, data })
      throw error
    }
  }

  /**
   * Supprimer une catégorie
   */
  static async deleteCategory(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression de la catégorie', { categoryId: id, companyId })

      // Vérifier que la catégorie existe et appartient à l'entreprise
      const existingCategory = await this.getCategoryById(id, companyId)
      if (!existingCategory) {
        throw new Error('Catégorie non trouvée')
      }

      // Vérifier qu'il n'y a pas de produits associés
      const productsCount = await prisma.product.count({
        where: { categoryId: id },
      })

      if (productsCount > 0) {
        throw new Error(
          'Impossible de supprimer cette catégorie car elle contient des produits'
        )
      }

      // Vérifier qu'il n'y a pas de sous-catégories
      const childrenCount = await prisma.category.count({
        where: { parentId: id },
      })

      if (childrenCount > 0) {
        throw new Error(
          'Impossible de supprimer cette catégorie car elle contient des sous-catégories'
        )
      }

      await prisma.category.delete({
        where: { id },
      })

      logger.info('Catégorie supprimée avec succès', { categoryId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression de la catégorie', { error, id })
      throw error
    }
  }

  /**
   * Vérifier si une catégorie est descendante d'une autre
   */
  private static async isDescendant(
    categoryId: string,
    potentialAncestorId: string,
    companyId: string
  ): Promise<boolean> {
    try {
      const category = await prisma.category.findFirst({
        where: {
          id: potentialAncestorId,
          companyId,
        },
        include: {
          parent: true,
        },
      })

      if (!category) {
        return false
      }

      if (category.parentId === categoryId) {
        return true
      }

      if (category.parentId) {
        return await this.isDescendant(categoryId, category.parentId, companyId)
      }

      return false
    } catch (error) {
      logger.error('Erreur lors de la vérification de descendance', { error })
      return false
    }
  }

  /**
   * Obtenir les statistiques des catégories
   */
  static async getCategoryStats(companyId: string) {
    try {
      const [total, withProducts, rootCategories] = await Promise.all([
        prisma.category.count({ where: { companyId } }),
        prisma.category.count({
          where: {
            companyId,
            products: {
              some: {},
            },
          },
        }),
        prisma.category.count({
          where: {
            companyId,
            parentId: null,
          },
        }),
      ])

      return {
        total,
        withProducts,
        rootCategories,
        empty: total - withProducts,
      }
    } catch (error) {
      logger.error('Erreur lors du calcul des statistiques catégories', { error })
      throw error
    }
  }
}


