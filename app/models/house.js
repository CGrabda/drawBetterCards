
const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
  const House = sequelize.define('House', {
    house_id: {
      type: DataTypes.SMALLINT,
      primaryKey: true,
      allowNull: false,
      unique: true
    },
    house_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
  },
  {
    timestamps: false 
  })

  return House
}