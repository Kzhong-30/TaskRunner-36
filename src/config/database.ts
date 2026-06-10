import { Sequelize } from 'sequelize';
import { config } from '../config';
import path from 'path';

const dbPath = path.resolve(config.databasePath);

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: config.nodeEnv === 'development' ? console.log : false,
  dialectOptions: {
    foreign_keys: true
  }
});

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connection has been established successfully.');

    const { Conversation, Message, Knowledge, Intent } = require('../models');

    Conversation.hasMany(Message, {
      foreignKey: 'conversationId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    Message.belongsTo(Conversation, {
      foreignKey: 'conversationId'
    });

    await sequelize.sync({ force: false, alter: false });

    console.log('[DB] All models were synchronized successfully.');
  } catch (error) {
    console.error('[DB] Unable to connect to the database:', error);
    throw error;
  }
}
