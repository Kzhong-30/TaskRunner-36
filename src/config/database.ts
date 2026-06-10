import { Sequelize } from 'sequelize';
import { config } from '../config';
import path from 'path';

const dbPath = path.resolve(config.databasePath);

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: config.nodeEnv === 'development' ? console.log : false
});

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connection has been established successfully.');
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    await sequelize.sync();
    await sequelize.query('PRAGMA foreign_keys = ON;');
    console.log('[DB] All models were synchronized successfully.');
  } catch (error) {
    console.error('[DB] Unable to connect to the database:', error);
    throw error;
  }
}
