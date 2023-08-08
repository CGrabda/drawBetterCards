const sequelize = require('./db.js')
const { DataTypes, Op, fn } = require('sequelize')
const Deck = require('./models/deck.js')(sequelize, DataTypes)
const House = require('./models/house.js')(sequelize, DataTypes)
const Multiple = require('./models/multiples.js')(sequelize, DataTypes)
const Pod = require('./models/pod.js')(sequelize, DataTypes)
const Card = require('./models/card.js')(sequelize, DataTypes)
const Set = require('./models/set.js')(sequelize, DataTypes)
const Token = require('./models/token.js')(sequelize, DataTypes)

const Collection = require('./models/collection.js')(sequelize, DataTypes)
const User = require('./models/user.js')(sequelize, DataTypes)

// Import scoring dict from scripts/data
const SCORING_DICT = require('../scripts/data/scoreDict.json')

// SQL relationships
// Associate deck houses with house ids
Deck.belongsTo(House, { as: "house_1", foreignKey: "house1", targetKey: "house_id" })
Deck.belongsTo(House, { as: "house_2", foreignKey: "house2", targetKey: "house_id" })
Deck.belongsTo(House, { as: "house_3", foreignKey: "house3", targetKey: "house_id" })
Pod.belongsTo(House, { foreignKey: "house_id", targetKey: "house_id" })

// Associate card with multiples pattern
Card.belongsTo(Multiple, {foreignKey: "multiple_id", targetKey: "multiple_id" })

// Associate each card in a deck with its information
Pod.belongsTo(Card, { as: "card_1", foreignKey: "card1", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_2", foreignKey: "card2", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_3", foreignKey: "card3", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_4", foreignKey: "card4", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_5", foreignKey: "card5", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_6", foreignKey: "card6", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_7", foreignKey: "card7", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_8", foreignKey: "card8", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_9", foreignKey: "card9", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_10", foreignKey: "card10", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_11", foreignKey: "card11", targetKey: "card_id" })
Pod.belongsTo(Card, { as: "card_12", foreignKey: "card12", targetKey: "card_id" })

// Associate deck hash between pods and decks
Deck.hasMany(Pod, { foreignKey: "deck_id", targetKey: "deck_id" })

// Associate sets between Deck and Set
Deck.belongsTo(Set, { foreignKey: "set_id" } )

// Associate decks to tokens and tokens to cards
Deck.belongsTo(Token, { foreignKey: "token", targetKey: "token_id" })
Token.belongsTo(Card, { foreignKey: "card_id" })

// Associate decks and users to Collections
Deck.hasMany(Collection, { foreignKey: "deck_id" })
User.hasMany(Collection, { foreignKey: "owner_id", targetKey: "id" })


// Variables
const number_of_sets = 8 + 1
const number_of_houses = 13 + 1
const attribute_array = ['Score', 'E', 'A', 'C', 'F', 'D', 'R', 'BoB', 'ScaleA', 'Wipes', 'Cheats', 'Tokens']
const op_array = ['>', '<', '=']
const search_to_db_name = {
    'Score': 'adj_score',
    'E': 'total_e',
    'A': 'total_a',
    'C': 'total_c',
    'F': 'total_f',
    'D': 'total_d',
    'R': 'total_r',
    'BoB': 'total_bob',
    'ScaleA': 'total_scaling_a',
    'Wipes': 'total_wipes',
    'Cheats': 'total_cheats'
}


async function searchDeck(data, req_page, req_user_id=null) {
    var deck_query = {}
    //var include_query = { model: Pod, attributes: [[fn('SUM', sequelize.col('pod_e')), 'total_e']] }
    var include_query = ''
    var notEmpty = false

    // If the name exists, is a string, and is within the length of a name add to query
    if (data.name && typeof data.name === 'string' && data.name != '' && data.name.length < 66) {
        deck_query["deck_name"] = { [Op.iLike]: `%${data.name}%` }
        notEmpty = true
    }

    // If set exists, is a number, and is between 1 and the number of sets, add set searches to query
    if (data.set && (data.set.every( (val, i, arr) => (typeof val === 'number' && val > 0 && val < number_of_sets)))) {
        var additional_query = { set_id: data.set }

        // If query is not empty add onto query with 'and', else, initialize query
        if (notEmpty) {
            deck_query = { [Op.and]: [deck_query, additional_query] }
        }
        else {
            deck_query = additional_query
        }
        notEmpty = true
    }


    // If house exists, is a number, and is between 1 and the number of sets, add set searches to query
    if (data.house && (data.house.every( (val, i, arr) => (typeof val === 'number' && val > 0 && val < number_of_houses)))) {
        var additional_query = { [Op.or]: [{ house1: data.house }, { house2: data.house }, { house3: data.house }] }

        // If query is not empty add onto query with 'or', else, initialize query
        if (notEmpty) {
            deck_query = { [Op.and]: [deck_query, additional_query] }
        }
        else {
            deck_query = additional_query
        }
        notEmpty = true
    }


    // 
    if (data.attr) {
        // Check that attributes and operations are approved and included in their respective array, and that the value is a number between 0 and 1000
        if (data.attr.every( (val, i, arr) => (attribute_array.includes(val[0]) && op_array.includes(val[1]) && typeof val[2] === 'number' && val[2] > 0 && val[2] < 1000) )) {
            for (i = 0; i < data.attr.length; i++) {
                // Create the additional query, determine the operation and create the dict partial
                var operation = {}
                data.attr[i][1] == '>' ? operation = { [Op.gt]: data.attr[i][2] } : (data.attr[i][1] == '<') ? operation = { [Op.lt]: data.attr[i][2] } : operation = { [Op.eq]: data.attr[i][2] }
                 

                var additional_query = { [search_to_db_name[data.attr[i][0]]]: operation }

                if (notEmpty) {
                    deck_query = { [Op.and]: [deck_query, additional_query] }
                }
                else {
                    deck_query = additional_query
                }
                notEmpty = true
            }
        }
    }


    // If req_user_id is passed, add an exclusive join on collection to decks using include
    if (req_user_id) {
        include_query = {
            model: Collection,
            where: { owner_id: req_user_id }
        }
    }

    //console.log('Query:', deck_query, include_query, '\n')

    return await Deck.findAll({
        include: include_query,
        where: deck_query,
        limit: 15,
        offset: 15 * parseInt(req_page),
        order: [['adj_score', 'DESC'], ['createdAt', 'DESC']],
    })
    .catch(e=> {
        console.log('Error searching')
        console.log(e)
    })
}





// Takes the URL params and formats them into a json form for the load post requests to use
async function getQueryData(request_query, request_query_polluted) {
    var data = {}

    var name_search = request_query.name
    var single_set_search = parseInt(request_query.set)
    var single_house_search = parseInt(request_query.house)
    var single_attribute_search = request_query.attr
    var single_op_search = request_query.op
    var single_val_search = parseInt(request_query.val)

    var set_search = request_query_polluted.set
    var house_search = request_query_polluted.house
    var attribute_search = request_query_polluted.attr
    var op_search = request_query_polluted.op
    var val_search = request_query_polluted.val

    // Adds deck name to data
    if (name_search && typeof name_search === 'string' && name_search.length < 66) {
        data["name"] = name_search
    }

    

    // Adds set array to data
    if (set_search) {
        var set_search = set_search.map(function (x) { return parseInt(x); })
        // Check that all values are numbers
        if (set_search.every( (val, i, arr) => (val > 0 && val < number_of_sets))) {
            data["set"] = set_search
        }
    }
    // If set is not array, add single set to data
    else if (single_set_search && typeof single_set_search === 'number' && single_set_search > 0 && single_set_search < number_of_sets) {
        data["set"] = [single_set_search]
    }
    

    // Adds house array to data
    if (house_search) {
        var house_search = house_search.map(function (x) { return parseInt(x); })
        // Check that all values are numbers
        if (house_search.every( (val, i, arr) => (val > 1 && val < number_of_houses))) {
            data["house"] = house_search
        }
    }
    // If set is not array, add single set to data
    else if (single_house_search && typeof single_house_search === 'number' && single_house_search > 1 && single_house_search < number_of_houses) {
        data["house"] = [single_house_search]
    }

    // Easter Egg
    if (single_val_search == 1337) {
        // something super secret
    }

    // Add attribute search to data
    // The length of each seach should be the same, so if attribute array then the rest follow
    if (attribute_search) {
        // Check that the lengths match
        if (attribute_search.length == op_search.length && op_search.length == val_search.length) {

            // Check that attributes and operations are approved and included in their respective array
            if (attribute_search.every( (val, i, arr) => (attribute_array.includes(val))) && op_search.every( (val, i, arr) => (op_array.includes(val)))) {
                // Cast to int
                var val_search = val_search.map(function (x) { return parseInt(x); })

                // Check the value is a number between 0 and 1000
                if (val_search.every( (val, i, arr) => (val > 0 && val < 1000))) {
                    // Add search lists to data
                    data["attr"] = []
                    for (i = 0; i < attribute_search.length; i++) {
                        data["attr"].push([attribute_search[i], op_search[i], val_search[i]])
                    }
                }
            }
        }
    }
    else if (single_attribute_search) {
        // Check the attributes and operations are a string (save resources by cheking if approved once on post)
        if (typeof single_attribute_search === 'string' && typeof single_op_search === 'string' && single_attribute_search.length < 10 && single_op_search.length < 2) {
            // Check the value is a number between 0 and 1000
            if (typeof single_val_search === 'number' && single_val_search > 0 && single_val_search < 1000) {
                data["attr"] = [[single_attribute_search, single_op_search, single_val_search]]
            }
        }
    }


    // console.log('out searchjs:', data)
    return data
}






module.exports.searchDeck = searchDeck
module.exports.getQueryData = getQueryData