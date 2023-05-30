const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
  const Card = sequelize.define('Card', {
    card_id: {
      type: DataTypes.SMALLINT,
      primaryKey: true,
      allowNull: false,
      unique: true
    },
    card_name: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true
    },
    traits: {
      type: DataTypes.JSONB,
      defaultValue: null
    },
  },
  {
    timestamps: false 
  })

  return Card
}