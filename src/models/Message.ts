import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Conversation } from './Conversation';

export type MessageRole = 'user' | 'assistant' | 'system' | 'human';

interface MessageAttributes {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens?: number;
  emotion?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Message extends Model<MessageAttributes, MessageCreationAttributes> {
  declare id: string;
  declare conversationId: string;
  declare role: MessageRole;
  declare content: string;
  declare tokens?: number;
  declare emotion?: string;
  declare metadata?: Record<string, any>;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Conversations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system', 'human'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tokens: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    emotion: {
      type: DataTypes.STRING,
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
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true,
    indexes: [
      {
        fields: ['conversationId', 'createdAt']
      }
    ]
  }
);

Conversation.hasMany(Message, {
  foreignKey: 'conversationId',
  as: 'messages',
  onDelete: 'CASCADE'
});

Message.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation'
});
