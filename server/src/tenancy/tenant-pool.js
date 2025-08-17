import { Sequelize } from 'sequelize';
import { getOrgBySlug } from './registry.js';
import { decryptPassword } from './encryption.js';

// In-memory cache of tenant connections
const tenantConnections = new Map();

export async function getSequelizeForTenant(slug) {
  // Check cache first
  if (tenantConnections.has(slug)) {
    return tenantConnections.get(slug);
  }

  // Get org details from master DB
  const org = await getOrgBySlug(slug);
  if (!org) {
    throw new Error(`Organization with slug '${slug}' not found`);
  }

  // Decrypt password
  const dbPassword = decryptPassword(org.db_password_enc);

  // Create new Sequelize connection
  const sequelize = new Sequelize(
    org.db_name,
    org.db_user,
    dbPassword,
    {
      host: org.db_host,
      port: org.db_port,
      dialect: 'postgres',
      logging: false,
      define: { underscored: true }
    }
  );

  // Test connection
  try {
    await sequelize.authenticate();
  } catch (error) {
    throw new Error(`Failed to connect to tenant database for '${slug}': ${error.message}`);
  }

  // Cache and return
  tenantConnections.set(slug, sequelize);
  return sequelize;
}

export function clearTenantCache(slug) {
  if (tenantConnections.has(slug)) {
    const sequelize = tenantConnections.get(slug);
    sequelize.close();
    tenantConnections.delete(slug);
  }
}

export function clearAllTenantCaches() {
  for (const [slug, sequelize] of tenantConnections) {
    sequelize.close();
  }
  tenantConnections.clear();
}