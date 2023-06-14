const sequelize = require('./db.js');
const { DataTypes } = require("sequelize")
const User = require('./models/user.js')(sequelize, DataTypes)
const passport = require('passport'), LocalStrategy = require('passport-local').Strategy


passport.use(new LocalStrategy(
  async function(username, password, done) {
      try {
        const user = await User.findOne({where: { username: username }})
        if (!user) {
            return done(null, false, { message: 'Your username or password is incorrect.' }) 
        }
        const passVal = await user.validPassword(password)
        if (!passVal) {
            return done(null, false, { message: 'Your username or password is incorrect.' })
        }
        return done(null, user);
      }
      catch (e) {
            console.log(e)
            return done()
      }
  }
))
    
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findByPk(id).then(function(user) { done(null, user); });
});