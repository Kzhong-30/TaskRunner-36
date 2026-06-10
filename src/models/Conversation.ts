import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ConversationStatus = 'active' | 'waiting_for_human' | 'closed';

interface ConversationAttributes {
  id: string;
  userId: string;
  status: ConversationStatus;
  summary?: string;
  intent?: string;
  assignedAgent?: string;
  satisfactionScore?: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConversationCreationAttributes extends Optional<ConversationAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

export class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> {
  declare id: string;
  declare userId: string;
  declare status: ConversationStatus;
  declare summary?: string;
  declare intent?: string;
  declare assignedAgent?: string;
  declare satisfactionScore?: number;
  declare metadata?: Record<string, any>;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'anonymous'
    },
    status: {
      type: DataTypes.ENUM('active', 'waiting_for_human', 'closed'),
      allowNull: false,
      defaultValue: 'active'
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    intent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    assignedAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    satisfactionScore: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  },
  {
    sequelize,
    modelName: 'Conversation',
    tableName: 'conversations',
    timestamps: true
  }
);
