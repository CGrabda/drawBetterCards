const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
    const Collection = sequelize.define('Collection', {
        owner_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false
        },
        deck_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
      },
      {
          timestamps: false 
      })

    return Collection
}