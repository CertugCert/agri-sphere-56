import { sequelize } from '../db.js';

export async function getOrgBySlug(slug) {
  const [orgs] = await sequelize.query(
    `SELECT * FROM orgs WHERE slug = :slug LIMIT 1`,
    { 
      replacements: { slug }, 
      type: sequelize.QueryTypes.SELECT 
    }
  );
  return orgs.length > 0 ? orgs[0] : null;
}

export async function createOrg({ name, slug, dbName, dbHost, dbPort, dbUser, dbPasswordEnc }) {
  const [result] = await sequelize.query(
    `INSERT INTO orgs (id, name, slug, db_name, db_host, db_port, db_user, db_password_enc, created_at) 
     VALUES (gen_random_uuid(), :name, :slug, :dbName, :dbHost, :dbPort, :dbUser, :dbPasswordEnc, now()) 
     RETURNING *`,
    {
      replacements: { name, slug, dbName, dbHost, dbPort, dbUser, dbPasswordEnc },
      type: sequelize.QueryTypes.INSERT
    }
  );
  return result[0];
}

export async function getAllOrgs(limit = 50, offset = 0) {
  const [results] = await sequelize.query(
    `SELECT id, name, slug, db_name, created_at FROM orgs 
     ORDER BY created_at DESC 
     LIMIT :limit OFFSET :offset`,
    {
      replacements: { limit, offset },
      type: sequelize.QueryTypes.SELECT
    }
  );
  return results;
}

export async function setOrgModules(orgId, moduleKeysEnabled) {
  // Remove all existing modules for this org
  await sequelize.query(
    `DELETE FROM org_modules WHERE org_id = :orgId`,
    { replacements: { orgId } }
  );

  // Insert new enabled modules
  if (moduleKeysEnabled && moduleKeysEnabled.length > 0) {
    const values = moduleKeysEnabled.map(moduleKey => 
      `('${orgId}', '${moduleKey}', true)`
    ).join(', ');
    
    await sequelize.query(
      `INSERT INTO org_modules (org_id, module_key, enabled) VALUES ${values}`
    );
  }
}

export async function getOrgModules(orgId) {
  const [results] = await sequelize.query(
    `SELECT module_key FROM org_modules WHERE org_id = :orgId AND enabled = true`,
    {
      replacements: { orgId },
      type: sequelize.QueryTypes.SELECT
    }
  );
  return results.map(r => r.module_key);
}