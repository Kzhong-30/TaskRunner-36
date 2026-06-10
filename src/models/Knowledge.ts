import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface KnowledgeAttributes {
  id: string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
  vector?: number[];
  views?: number;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface KnowledgeCreationAttributes extends Optional<KnowledgeAttributes, 'id' | 'views' | 'enabled' | 'createdAt' | 'updatedAt'> {}

export class Knowledge extends Model<KnowledgeAttributes, KnowledgeCreationAttributes> {
  declare id: string;
  declare question: string;
  declare answer: string;
  declare category?: string;
  declare keywords?: string[];
  declare vector?: number[];
  declare views: number;
  declare enabled: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Knowledge.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    vector: {
      type: DataTypes.JSON,
      allowNull: true
    },
    views: {
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
    modelName: 'Knowledge',
    tableName: 'knowledge',
    timestamps: true
  }
);
