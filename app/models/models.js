// Sequelize model exports
// File requirements
var sequelize = require('../db.js')
var CardMeta = require('./card.js')
var DeckMeta = require('./deck.js')
var HouseMeta = require('./house.js')
var PodMeta = require('./pod.js')
var UserMeta = require('./user.js')



// Create model object
var Card = sequelize.define('users', CardMeta.attributes, CardMeta.options)
var Deck = sequelize.define('users', DeckMeta.attributes, DeckMeta.options)
var House = sequelize.define('users', HouseMeta.attributes, HouseMeta.options)
var Pod = sequelize.define('users', PodMeta.attributes, PodMeta.options)
var User = sequelize.define('users', UserMeta.attributes, UserMeta.options)

// Associate deck houses with house ids
House.belongsToMany(Deck, { through: "house1"})
House.belongsToMany(Deck, { through: "house2"})
House.belongsToMany(Deck, { through: "house3"})
House.belongsToMany(Pod, { through: "house_id"})
Deck.hasOne(House, { through: "house_id"})
Pod.hasOne(House, { through: "house_id"})

// Associate each card in a deck with its information
Card.belongsToMany(Pod, {through: "card1"})
Card.belongsToMany(Pod, {through: "card2"})
Card.belongsToMany(Pod, {through: "card3"})
Card.belongsToMany(Pod, {through: "card4"})
Card.belongsToMany(Pod, {through: "card5"})
Card.belongsToMany(Pod, {through: "card6"})
Card.belongsToMany(Pod, {through: "card7"})
Card.belongsToMany(Pod, {through: "card8"})
Card.belongsToMany(Pod, {through: "card9"})
Card.belongsToMany(Pod, {through: "card10"})
Card.belongsToMany(Pod, {through: "card11"})
Card.belongsToMany(Pod, {through: "card12"})
Pod.hasOne(Card, {through: "card_id"})

// Associate deck hash between pods and decks
Pod.belongsTo(Deck, { through: "deck_id" })
Deck.belongsToMany(Pod, { through: "deck_id" })

// Exports
module.exports.Card = Card
module.exports.Deck = Deck
module.exports.House = House
module.exports.Pod = Pod
module.exports.User = User