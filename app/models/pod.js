const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
  const Pod = sequelize.define('Pod', {
    deck_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    house_id: {
      type: DataTypes.SMALLINT,
      primaryKey: true,
      allowNull: false
    },
    card1: {
      type: DataTypes.INTEGER,
      defaultValue: null
    },
    card2: {
      type: DataTypes.INTEGER,
      defaultValue: null
    },
    card3: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card4: {
      type: DataTypes.INTEGER,
      defaultValue: null
    },
    card5: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card6: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card7: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card8: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card9: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card10: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card11: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    card12: {
        type: DataTypes.INTEGER,
        defaultValue: null
    },
    enhancements: {
        type: DataTypes.JSONB,
        defaultValue: null
    },
    pod_score: {
        type: DataTypes.SMALLINT
    },
    pod_e: {
        type: DataTypes.DECIMAL
    },
    pod_a: {
        type: DataTypes.DECIMAL
    },
    pod_c: {
        type: DataTypes.DECIMAL
    },
    pod_f: {
        type: DataTypes.DECIMAL
    },
    pod_d: {
        type: DataTypes.DECIMAL
    },
    pod_r: {
        type: DataTypes.DECIMAL
    },
    pod_bob: {
        type: DataTypes.SMALLINT
    },
    pod_scaling_a: {
        type: DataTypes.SMALLINT
    },
    pod_wipes: {
        type: DataTypes.SMALLINT
    },
    pod_cheats: {
        type: DataTypes.SMALLINT
    },
    pod_tokens: {
        type: DataTypes.SMALLINT
    },
    pod_creatures: {
        type: DataTypes.SMALLINT
    },
    pod_artifacts: {
        type: DataTypes.SMALLINT
    },
    pod_actions: {
        type: DataTypes.SMALLINT
    },
    pod_upgrades: {
        type: DataTypes.SMALLINT
    },
  },
  {
    timestamps: false 
  })

  return Pod
}