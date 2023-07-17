const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')

module.exports = function(sequelize, Sequelize) {
    const Multiple = sequelize.define('Multiple', {
        multiple_id: {
            type: DataTypes.SMALLINT,
            primaryKey: true,
            allowNull: false,
            unique: true
        },
        multiples: {
            type: DataTypes.ARRAY(DataTypes.SMALLINT),
            allowNull: false,
            unique: true
        },
    },
    {
        timestamps: false 
    })

    return Multiple
}