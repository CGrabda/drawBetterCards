const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
    const Token = sequelize.define('Token', {
        token_id: {
            type: DataTypes.SMALLINT,
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        card_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    },
    {
        timestamps: false 
    })

    return Token
}