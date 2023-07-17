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
            unique: true,
            validate: {
              len: 36
            }
        },
        deck_name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        alpha_score: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        raw_score: {
            type: DataTypes.SMALLINT,
            allowNull: false
        },
        adj_score: {
            type: DataTypes.SMALLINT,
            defaultValue: null
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
        set_id: {
            type: DataTypes.SMALLINT,
            allowNull: false
        },
        attributes: {
            type: DataTypes.JSONB
        },
        token: {
            type: DataTypes.SMALLINT,
            defaultValue: null,
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

    Deck.prototype.updateAlpha = async function(deck_code, score) {
        await Deck.update(
            { alpha_score: score, updatedAt: sequelize.literal('CURRENT_TIMESTAMP') },
            { where: { deck_code: deck_code } }
          )
      }

    return Deck
}