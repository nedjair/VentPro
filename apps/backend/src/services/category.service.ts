import { randomUUID } from 'node:crypto'
import { prisma, Category, Product } from '@gestion/database'
import { logger } from '../utils/logger'

export interface CreateCategoryData {
  name: string
  description?: string
  parentId?: string
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

interface CurrentSchemaCategoryRow {
  id: string
  name: string
  description: string | null
  parentId: string | null
  parentName: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  productCount: number | string | null
}

export class CategoryService {
  private static normalizeCurrentSchemaCategory(row: CurrentSchemaCategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      parentId: row.parentId || undefined,
      parent: row.parentId
        ? {
            id: row.parentId,
            name: row.parentName || 'Catégorie parente',
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }
        : undefined,
      children: [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        products: Number(row.productCount || 0),
      },
    } as unknown as Category
  }

  private static async getCurrentSchemaCategories(companyId: string, options?: {
    categoryId?: string
    rootsOnly?: boolean
  }): Promise<Category[]> {
    const rows = await prisma.$queryRaw<Array<CurrentSchemaCategoryRow>>`
      SELECT
        c.id,
        c.name,
        c.description,
        c."parentId",
        parent.name AS "parentName",
        c."userId",
        c."createdAt",
        c."updatedAt",
        COUNT(p.id)::int AS "productCount"
      FROM "Category" c
      LEFT JOIN "Category" parent ON parent.id = c."parentId"
      LEFT JOIN "Product" p ON p."categoryId" = c.id
      WHERE c."userId" = ${companyId}
        AND (${options?.categoryId || null}::text IS NULL OR c.id = ${options?.categoryId || null})
        AND (${options?.rootsOnly ? true : null}::boolean IS NULL OR c."parentId" IS NULL)
      GROUP BY c.id, c.name, c.description, c."parentId", parent.name, c."userId", c."createdAt", c."updatedAt"
      ORDER BY c."parentId" ASC NULLS FIRST, c.name ASC
    `

    return rows.map((row) => this.normalizeCurrentSchemaCategory(row))
  }

  /**
   * Créer une nouvelle catégorie
   */
  static async createCategory(
    data: CreateCategoryData,
    companyId: string
  ): Promise<Category> {
    try {
      logger.info('Création d\'une nouvelle catégorie', { companyId, name: data.name })

      try {
        const existingRows = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM "Category"
          WHERE name = ${data.name}
            AND "userId" = ${companyId}
            AND (
              (${data.parentId || null}::text IS NULL AND "parentId" IS NULL)
              OR "parentId" = ${data.parentId || null}
            )
          LIMIT 1
        `

        if (existingRows[0]) {
          throw new Error('Une catégorie avec ce nom existe déjà à ce niveau')
        }

        if (data.parentId) {
          const parentRows = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM "Category"
            WHERE id = ${data.parentId}
              AND "userId" = ${companyId}
            LIMIT 1
          `

          if (!parentRows[0]) {
            throw new Error('Catégorie parent non trouvée')
          }
        }

        const categoryId = randomUUID()

        await prisma.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "Category" (
            id,
            name,
            description,
            "parentId",
            "userId"
          )
          VALUES (
            ${categoryId},
            ${data.name},
            ${data.description?.trim() || null},
            ${data.parentId || null},
            ${companyId}
          )
          RETURNING id
        `

        const [category] = await this.getCurrentSchemaCategories(companyId, { categoryId })
        if (!category) {
          throw new Error('Catégorie non trouvée après création')
        }

        logger.info('Catégorie créée avec succès via le schéma local courant', { categoryId })
        return category
      } catch (currentSchemaError) {
        if (
          currentSchemaError instanceof Error &&
          [
            'Une catégorie avec ce nom existe déjà à ce niveau',
            'Catégorie parent non trouvée',
            'Catégorie non trouvée après création',
          ].includes(currentSchemaError.message)
        ) {
          throw currentSchemaError
        }

        logger.warn('Fallback createCategory vers schéma legacy', { error: currentSchemaError, companyId })
      }

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
      try {
        const [category] = await this.getCurrentSchemaCategories(companyId, { categoryId: id })
        if (category) {
          return category
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback getCategoryById vers schéma legacy', { error: currentSchemaError, id, companyId })
      }

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
      try {
        return await this.getCurrentSchemaCategories(companyId)
      } catch (currentSchemaError) {
        logger.warn('Fallback getCategories vers schéma legacy', { error: currentSchemaError, companyId })
      }

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
      // Compatibilité schéma local : certaines bases PostgreSQL locales ne
      // possèdent pas la table `Category`. Dans ce cas, on préfère renvoyer
      // une liste vide plutôt qu'une erreur 500 côté interface Produits.
      logger.warn('Catégories indisponibles sur le schéma courant, retour liste vide', { error, companyId })
      return [] as Category[]
    }
  }

  /**
   * Récupérer les catégories racines (sans parent)
   */
  static async getRootCategories(companyId: string): Promise<Category[]> {
    try {
      try {
        return await this.getCurrentSchemaCategories(companyId, { rootsOnly: true })
      } catch (currentSchemaError) {
        logger.warn('Fallback getRootCategories vers schéma legacy', { error: currentSchemaError, companyId })
      }

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


