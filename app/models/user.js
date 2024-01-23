const { DataTypes } = require("sequelize")
const sequelize = require('../db.js')
const bcrypt = require('bcrypt')

module.exports = function(sequelize, Sequelize) {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                is: /^[a-zA-Z0-9_$!#]+$/i,
                notEmpty: true,
                len: [4, 30]
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                isEmail: true,
                len: [6, 50]
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        patreon_rank: {
            type: DataTypes.SMALLINT,
            defaultValue: 0
        },
        imports: {
            type: DataTypes.SMALLINT,
            defaultValue: 0
        },
        alpha_requests: {
            type: DataTypes.SMALLINT,
            defaultValue: 0
        },
        is_admin: {
            type: DataTypes.BOOLEAN,
            defaultValue: null
        },
        unlimited_user: {
            type: DataTypes.BOOLEAN,
            defaultValue: null
        },
        payment_date: {
            type: DataTypes.TIME,
            defaultValue: null
        },
        last_payment: {
            type: DataTypes.TIME
        },
        reset_token: {
            type: DataTypes.STRING,
            defaultValue: null,
            validate: {
                len: 40
            }
        },
        token_expires: {
            type: DataTypes.BIGINT,
            defaultValue: null
        },
    })
  
    User.prototype.validPassword = async function (password) {
        return bcrypt.compare(password, this.password);
    }

    User.prototype.importedDeck = async function () {
        await this.decrement('imports', { by: 1 })
    }

    User.prototype.requestedAlpha = async function () {
        await this.decrement('alpha_requests', { by: 1 })
    }

    return User
}