import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { KpiTargetSettingsService } from '../services/kpi-target-settings.service'
import { prisma } from '../lib/prisma'

const KpiTargetSettingsSchema = z.object({
  // Chaque objectif peut être vidé explicitement avec null si l'utilisateur veut le réinitialiser.
  revenueTarget: z.number().min(0).nullable(),
  ordersTarget: z.number().int().min(0).nullable(),
  clientsTarget: z.number().int().min(0).nullable(),
  conversionRateTarget: z.number().min(0).max(100).nullable(),
})

const CompanyProfileSettingsSchema = z.object({
  companyName: z.string().trim().max(180).optional(),
  address: z.string().trim().max(220).optional(),
  city: z.string().trim().max(100).optional(),
  wilaya: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  fax: z.string().trim().max(50).optional(),
  email: z.string().trim().max(160).optional(),
  website: z.string().trim().max(180).optional(),
  nif: z.string().trim().max(50).optional(),
  rc: z.string().trim().max(120).optional(),
  ai: z.string().trim().max(120).optional(),
  logoUrl: z.string().trim().max(2000).optional(),
  logoBase64: z.string().trim().max(6000000).optional(),
  accentColor: z.string().trim().max(20).optional(),
  vatExempt: z.boolean().optional(),
  paymentTerms: z.string().trim().max(240).optional(),
  legalNotes: z.string().trim().max(2000).optional(),
})

let companySettingsReady = false

async function ensureCompanySettingsTable() {
  if (companySettingsReady) {
    return
  }
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS company_settings (
      scope_id TEXT PRIMARY KEY,
      company_name TEXT,
      address TEXT,
      city TEXT,
      wilaya TEXT,
      postal_code TEXT,
      country TEXT,
      phone TEXT,
      fax TEXT,
      email TEXT,
      website TEXT,
      nif TEXT,
      rc TEXT,
      ai TEXT,
      logo_url TEXT,
      logo_base64 TEXT,
      accent_color TEXT,
      vat_exempt BOOLEAN DEFAULT FALSE,
      payment_terms TEXT,
      legal_notes TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)
  companySettingsReady = true
}

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.companyId || user?.id || user?.userId
}

export default async function settingsRoutes(server: FastifyInstance) {
  server.get('/company-profile', {
    preHandler: [(server as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      await ensureCompanySettingsTable()

      const rows = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT scope_id, company_name, address, city, wilaya, postal_code, country, phone, fax, email, website, nif, rc, ai, logo_url, logo_base64, accent_color, vat_exempt, payment_terms, legal_notes
         FROM company_settings
         WHERE scope_id = $1
         LIMIT 1`,
        ownerScopeId
      )
      const row = rows?.[0]
      const user = (request as any).user || {}

      return reply.send({
        success: true,
        data: {
          companyName: row?.company_name || user.companyName || user.fullName || '',
          address: row?.address || '',
          city: row?.city || user.city || '',
          wilaya: row?.wilaya || '',
          postalCode: row?.postal_code || user.postalCode || '',
          country: row?.country || 'Algérie',
          phone: row?.phone || user.phone || '',
          fax: row?.fax || '',
          email: row?.email || user.email || '',
          website: row?.website || '',
          nif: row?.nif || '',
          rc: row?.rc || '',
          ai: row?.ai || '',
          logoUrl: row?.logo_url || '',
          logoBase64: row?.logo_base64 || '',
          accentColor: row?.accent_color || '#2563EB',
          vatExempt: Boolean(row?.vat_exempt),
          paymentTerms: row?.payment_terms || '',
          legalNotes: row?.legal_notes || '',
        },
      })
    } catch (error: any) {
      server.log.error('Erreur lors de la lecture du profil société', error)
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Erreur lors de la lecture du profil société',
      })
    }
  })

  server.put('/company-profile', {
    preHandler: [(server as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }
      const payload = CompanyProfileSettingsSchema.parse(request.body)
      await ensureCompanySettingsTable()

      await prisma.$executeRawUnsafe(
        `INSERT INTO company_settings (
          scope_id, company_name, address, city, wilaya, postal_code, country, phone, fax, email, website, nif, rc, ai, logo_url, logo_base64, accent_color, vat_exempt, payment_terms, legal_notes, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
        )
        ON CONFLICT (scope_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          wilaya = EXCLUDED.wilaya,
          postal_code = EXCLUDED.postal_code,
          country = EXCLUDED.country,
          phone = EXCLUDED.phone,
          fax = EXCLUDED.fax,
          email = EXCLUDED.email,
          website = EXCLUDED.website,
          nif = EXCLUDED.nif,
          rc = EXCLUDED.rc,
          ai = EXCLUDED.ai,
          logo_url = EXCLUDED.logo_url,
          logo_base64 = EXCLUDED.logo_base64,
          accent_color = EXCLUDED.accent_color,
          vat_exempt = EXCLUDED.vat_exempt,
          payment_terms = EXCLUDED.payment_terms,
          legal_notes = EXCLUDED.legal_notes,
          updated_at = NOW()`,
        ownerScopeId,
        payload.companyName || null,
        payload.address || null,
        payload.city || null,
        payload.wilaya || null,
        payload.postalCode || null,
        payload.country || null,
        payload.phone || null,
        payload.fax || null,
        payload.email || null,
        payload.website || null,
        payload.nif || null,
        payload.rc || null,
        payload.ai || null,
        payload.logoUrl || null,
        payload.logoBase64 || null,
        payload.accentColor || '#2563EB',
        payload.vatExempt ?? false,
        payload.paymentTerms || null,
        payload.legalNotes || null
      )

      return reply.send({
        success: true,
        message: 'Profil société enregistré avec succès',
      })
    } catch (error: any) {
      server.log.error('Erreur lors de la mise à jour du profil société', error)
      return reply.status(400).send({
        success: false,
        message: error?.message || 'Erreur lors de la mise à jour du profil société',
      })
    }
  })

  server.delete('/company-profile/logo', {
    preHandler: [(server as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }
      await ensureCompanySettingsTable()
      await prisma.$executeRawUnsafe(
        `UPDATE company_settings SET logo_url = NULL, logo_base64 = NULL, updated_at = NOW() WHERE scope_id = $1`,
        ownerScopeId
      )
      return reply.send({
        success: true,
        message: 'Logo supprimé avec succès',
      })
    } catch (error: any) {
      server.log.error('Erreur lors de la suppression du logo', error)
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Erreur lors de la suppression du logo',
      })
    }
  })

  server.get('/kpi-targets', {
    preHandler: [(server as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const settings = await KpiTargetSettingsService.getSettings(ownerScopeId)

      return reply.send({
        success: true,
        data: settings,
      })
    } catch (error) {
      server.log.error('Erreur lors de la lecture des objectifs KPI', error)
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la lecture des objectifs KPI',
      })
    }
  })

  server.put('/kpi-targets', {
    preHandler: [(server as any).authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const payload = KpiTargetSettingsSchema.parse(request.body)
      const settings = await KpiTargetSettingsService.saveSettings(ownerScopeId, payload)

      return reply.send({
        success: true,
        data: settings,
        message: 'Objectifs KPI enregistrés avec succès',
      })
    } catch (error: any) {
      server.log.error('Erreur lors de la mise à jour des objectifs KPI', error)
      return reply.status(400).send({
        success: false,
        message: error?.message || 'Erreur lors de la mise à jour des objectifs KPI',
      })
    }
  })
}
