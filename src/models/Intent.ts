import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type IntentType = 'consultation' | 'complaint' | 'after_sales' | 'order_query' | 'human_transfer' | 'unknown';

interface IntentAttributes {
  id: string;
  name: IntentType;
  displayName: string;
  description?: string;
  keywords?: string[];
  examples?: string[];
  priority?: number;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IntentCreationAttributes extends Optional<IntentAttributes, 'id' | 'priority' | 'enabled' | 'createdAt' | 'updatedAt'> {}

export class Intent extends Model<IntentAttributes, IntentCreationAttributes> {
  declare id: string;
  declare name: IntentType;
  declare displayName: string;
  declare description?: string;
  declare keywords?: string[];
  declare examples?: string[];
  declare priority: number;
  declare enabled: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Intent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.ENUM('consultation', 'complaint', 'after_sales', 'order_query', 'human_transfer', 'unknown'),
      allowNull: false,
      unique: true
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    examples: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'Intent',
    tableName: 'intents',
    timestamps: true
  }
);
