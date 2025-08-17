import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';
import { createOrg, getOrgBySlug, setOrgModules } from './registry.js';
import { encryptPassword } from './encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate slug format
function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug is required and must be a string');
  }
  
  if (slug.length < 3 || slug.length > 32) {
    throw new Error('Slug must be between 3 and 32 characters');
  }
  
  if (!/^[a-z0-9_]+$/.test(slug)) {
    throw new Error('Slug can only contain lowercase letters, numbers, and underscores');
  }
  
  return true;
}

export async function provisionTenant({ name, slug, initialFarmName, adminEmail, adminPassword, modules = [] }) {
  // Validate input
  validateSlug(slug);
  
  if (!name || !initialFarmName || !adminEmail || !adminPassword) {
    throw new Error('All required fields must be provided: name, slug, initialFarmName, adminEmail, adminPassword');
  }

  // Check if slug already exists
  const existingOrg = await getOrgBySlug(slug);
  if (existingOrg) {
    throw new Error(`Organization with slug '${slug}' already exists`);
  }

  const dbName = `${process.env.TENANT_DB_PREFIX || 'tagri_t_'}${slug}`;
  const dbHost = process.env.TENANT_DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.TENANT_DB_PORT) || 5432;
  const dbUser = process.env.TENANT_DB_USER || 'postgres';
  const dbPassword = process.env.TENANT_DB_PASS || 'postgres';

  // Connect to master database to create new tenant database
  const masterSequelize = new Sequelize(process.env.MASTER_DB_URL, {
    logging: false
  });

  try {
    // Create new database (sanitize name)
    const sanitizedDbName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
    await masterSequelize.query(`CREATE DATABASE "${sanitizedDbName}" WITH TEMPLATE template0 ENCODING 'UTF8'`);
    console.log(`Created database: ${sanitizedDbName}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      throw new Error(`Database '${dbName}' already exists`);
    }
    throw new Error(`Failed to create database: ${error.message}`);
  } finally {
    await masterSequelize.close();
  }

  // Connect to the new tenant database
  const tenantSequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false,
    define: { underscored: true }
  });

  try {
    // Set up Umzug for migrations
    const migrationPath = path.resolve(__dirname, '../../migrations_tenant');
    const umzugMigrations = new Umzug({
      migrations: {
        glob: ['*.cjs', { cwd: migrationPath }]
      },
      context: { queryInterface: tenantSequelize.getQueryInterface(), Sequelize },
      storage: new SequelizeStorage({ 
        sequelize: tenantSequelize,
        modelName: 'SequelizeMetaTenant'
      }),
      logger: console
    });

    // Run migrations
    console.log(`Running migrations for tenant: ${slug}`);
    await umzugMigrations.up();

    // Set up Umzug for seeders
    const seederPath = path.resolve(__dirname, '../../seeders_tenant');
    const umzugSeeders = new Umzug({
      migrations: {
        glob: ['*.cjs', { cwd: seederPath }]
      },
      context: { queryInterface: tenantSequelize.getQueryInterface(), Sequelize },
      storage: new SequelizeStorage({ 
        sequelize: tenantSequelize,
        modelName: 'SequelizeMetaTenantSeed'
      }),
      logger: console
    });

    // Set environment variables for seeder
    process.env.TENANT_ADMIN_EMAIL = adminEmail;
    process.env.TENANT_ADMIN_PASSWORD = adminPassword;
    process.env.TENANT_FARM_NAME = initialFarmName;

    // Run seeders
    console.log(`Running seeders for tenant: ${slug}`);
    await umzugSeeders.up();

    // Clean up environment variables
    delete process.env.TENANT_ADMIN_EMAIL;
    delete process.env.TENANT_ADMIN_PASSWORD;
    delete process.env.TENANT_FARM_NAME;

  } catch (error) {
    // If migration/seeding fails, try to clean up
    await tenantSequelize.close();
    
    // Try to drop the database
    const cleanupSequelize = new Sequelize(process.env.MASTER_DB_URL, { logging: false });
    try {
      await cleanupSequelize.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } catch (cleanupError) {
      console.error('Failed to cleanup database:', cleanupError.message);
    }
    await cleanupSequelize.close();
    
    throw new Error(`Failed to provision tenant: ${error.message}`);
  }

  // Close tenant connection
  await tenantSequelize.close();

  // Encrypt password and save org to master database
  const encryptedPassword = encryptPassword(dbPassword);
  
  const org = await createOrg({
    name,
    slug,
    dbName,
    dbHost,
    dbPort,
    dbUser,
    dbPasswordEnc: encryptedPassword
  });

  // Set modules if provided
  if (modules && modules.length > 0) {
    await setOrgModules(org.id, modules);
  }

  console.log(`Successfully provisioned tenant: ${slug}`);
  
  return {
    id: org.id,
    slug,
    name,
    dbName,
    modules: modules || []
  };
}