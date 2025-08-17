import { Sequelize } from 'sequelize';
import config from '../config/config.js';

const env = process.env.NODE_ENV || 'development';
const cfg = config[env];

export const sequelize = new Sequelize(
  cfg.database,
  cfg.username,
  cfg.password,
  {
    host: cfg.host,
    port: cfg.port,
    dialect: 'postgres',
    logging: false,
    define: { underscored: true }
  }
);
