const Sequelize = require('sequelize');

require('dotenv').config({path: '../.env'});

const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    schema: 'public',
    freezeTableName: true,
    pool: {
        max: 100,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});
Sequelize.postgres.DECIMAL.parse = function (value) { return parseFloat(value); };

module.exports = sequelize