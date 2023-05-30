const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
  const Deck = sequelize.define('Deck', {
    deck_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    deck_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    owner_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    deck_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    hidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    alpha_score: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    score: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    house1: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    house2: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    house3: {
      type: DataTypes.SMALLINT,
      allowNull: false
    },
    attributes: {
      type: DataTypes.JSONB,
      defaultValue: null
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false 
  })

  return Deck
}