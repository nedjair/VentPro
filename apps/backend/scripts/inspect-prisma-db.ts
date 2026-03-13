import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  // Liste les tables réelles de la base PostgreSQL locale.
  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)

  // Liste les enums PostgreSQL réellement présents.
  const enums = await prisma.$queryRawUnsafe<Array<{ enum_name: string; values: string[] }>>(`
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `)

  const targets = {
    tables: ['Company', 'StockMovement', 'PurchaseOrder', 'Payment', 'Quote'],
    enums: ['UserRole', 'QuoteStatus', 'PaymentMethod', 'PurchaseOrderStatus'],
  }

  console.log('TABLES')
  console.log(JSON.stringify(tables.map((row) => row.table_name), null, 2))

  console.log('ENUMS')
  console.log(JSON.stringify(enums, null, 2))

  console.log('TARGET_CHECK')
  console.log(JSON.stringify({
    tables: Object.fromEntries(
      targets.tables.map((name) => [name, tables.some((row) => row.table_name === name)])
    ),
    enums: Object.fromEntries(
      targets.enums.map((name) => [name, enums.some((row) => row.enum_name === name)])
    ),
  }, null, 2))

  // Inspecte les colonnes réelles des tables prioritaires pour éviter toute hypothèse.
  const columns = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string; data_type: string }>>(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('User', 'Quote', 'Payment', 'Purchase', 'Stock', 'Product')
    ORDER BY table_name, ordinal_position
  `)

  console.log('COLUMNS')
  console.log(JSON.stringify(columns, null, 2))

  // Liste les valeurs réellement présentes dans les colonnes candidates à des enums.
  const roleValues = await prisma.$queryRawUnsafe<Array<{ value: string | null; count: number }>>(`
    SELECT role AS value, COUNT(*)::int AS count
    FROM "User"
    GROUP BY role
    ORDER BY count DESC, role ASC
  `)

  const quoteStatusValues = await prisma.$queryRawUnsafe<Array<{ value: string | null; count: number }>>(`
    SELECT status AS value, COUNT(*)::int AS count
    FROM "Quote"
    GROUP BY status
    ORDER BY count DESC, status ASC
  `)

  const paymentMethodValues = await prisma.$queryRawUnsafe<Array<{ value: string | null; count: number }>>(`
    SELECT "paymentMethod" AS value, COUNT(*)::int AS count
    FROM "Payment"
    GROUP BY "paymentMethod"
    ORDER BY count DESC, "paymentMethod" ASC
  `)

  const purchaseStatusValues = await prisma.$queryRawUnsafe<Array<{ value: string | null; count: number }>>(`
    SELECT status AS value, COUNT(*)::int AS count
    FROM "Purchase"
    GROUP BY status
    ORDER BY count DESC, status ASC
  `)

  console.log('DISTINCT_VALUES')
  console.log(JSON.stringify({
    userRole: roleValues,
    quoteStatus: quoteStatusValues,
    paymentMethod: paymentMethodValues,
    purchaseStatus: purchaseStatusValues,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error('INSPECT_PRISMA_DB_ERROR', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

