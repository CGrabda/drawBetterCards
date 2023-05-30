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
  })
  
  User.prototype.validPassword = async function (password) {
    return this.password === await bcrypt.hash(password, 10)
  }

  return User
}