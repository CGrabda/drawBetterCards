const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
    const Card = sequelize.define('Card', {
        card_id: {
            type: DataTypes.INTEGER,
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
        multiple_id: {
            type: DataTypes.SMALLINT,
            allowNull: false
        },
    },
    {
        timestamps: false 
    })

    return Card
}