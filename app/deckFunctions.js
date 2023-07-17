const sequelize = require('./db.js')
const { DataTypes } = require('sequelize')
const deck = require('./models/deck.js')
const Deck = require('./models/deck.js')(sequelize, DataTypes)
const House = require('./models/house.js')(sequelize, DataTypes)
const Multiple = require('./models/multiples.js')(sequelize, DataTypes)
const Pod = require('./models/pod.js')(sequelize, DataTypes)
const Card = require('./models/card.js')(sequelize, DataTypes)
const Set = require('./models/set.js')(sequelize, DataTypes)
const Token = require('./models/token.js')(sequelize, DataTypes)

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


async function addDeck(deck_info, pod_info) {
    // check if deck exist by hash, redirect user to page if exists
    var houseStrings = Object.keys(pod_info);
    var houses = [];
    var i = ''
    
    // Retrieve houses within deck
    for (i in houseStrings) {
        if (houseStrings[i] != '1') {
            houses.push(Number(houseStrings[i]));
        }
    }

    return sequelize.transaction(function (t) {
        return Deck.create({
            deck_code: deck_info["code"],
            deck_name: deck_info["name"],
            raw_score: deck_info["score"],
            house1: houses[0],
            house2: houses[1],
            house3: houses[2],
            set_id: deck_info["set"],
            attributes: {},
            token: deck_info["token"]
        }, {transaction: t}).then(async function (deck) {
            for (i in houses) {
                var house = houses[i]
                var pod = pod_info[house]
                // add the 3 houses of the deck
                await Pod.create({
                    deck_id: deck.deck_id,
                    house_id: house,
                    card1: pod["cards"][0],
                    card2: pod["cards"][1],
                    card3: pod["cards"][2],
                    card4: pod["cards"][3],
                    card5: pod["cards"][4],
                    card6: pod["cards"][5],
                    card7: pod["cards"][6],
                    card8: pod["cards"][7],
                    card9: pod["cards"][8],
                    card10: pod["cards"][9],
                    card11: pod["cards"][10],
                    card12: pod["cards"][11],
                    enhancements: pod["enhancements"],
                    pod_score: pod["score"],
                    pod_e: pod["e"],
                    pod_a: pod["a"],
                    pod_c: pod["c"],
                    pod_f: pod["f"],
                    pod_d: pod["d"],
                    pod_r: pod["r"],
                    pod_bob: pod["bob"],
                    pod_scaling_a: pod["scalingA"],
                    pod_wipes: pod["wipes"],
                    pod_cheats: pod["cheats"],
                    pod_tokens: pod["tokens"],
                    pod_creatures: pod["creatures"],
                    pod_artifacts: pod["artifacts"],
                    pod_actions: pod["actions"],
                    pod_upgrades: pod["upgrades"]
                }, {transaction: t})
            }

            // add the adjustment house (no cards)
            pod = pod_info["1"]
            await Pod.create({
                deck_id: deck.deck_id,
                house_id: 1,
                pod_score: pod["score"],
                pod_e: pod["e"],
                pod_a: pod["a"],
                pod_c: pod["c"],
                pod_f: pod["f"],
                pod_d: pod["d"],
                pod_r: pod["r"],
                pod_bob: pod["bob"],
                pod_scaling_a: pod["scalinngA"],
                pod_wipes: pod["wipes"],
                pod_cheats: pod["cheats"],
                pod_tokens: pod["tokens"],
                pod_creatures: pod["creatures"],
                pod_artifacts: pod["artifacts"],
                pod_actions: pod["actions"],
                pod_upgrades: pod["upgrades"]
            }, {transaction: t});

            return [deck.deck_id, deck.deck_code]
        }).catch(function (err) {
            console.log(err)
            throw new Error('Error importing Deck')
        })
    }).then(results => {
        // transaction successful
        return results
    }).catch(e=> {
        console.log(e)
        throw new Error('Deck already imported');
    });
}


async function getAllDeckInfo(deck_code) {
    return await Deck.findOne({
        where: { deck_code: deck_code },
        include: { all: true , nested: true }
    })
}



async function parseAttributesImport(deck_code) {
    // Retrieves deck from db before parsing
    await getAllDeckInfo(deck_code)
    .then(async query=> {
        await parseAttributes(query)
    }).catch(e=> {
        console.log(e)
    })
}

async function adjustScoreOnAllDecks() {
    // Retrieve all deck codes
    return await Deck.findAll({
        include: Pod
    })
    .then(async query=> {
        // Iterate over each deck code and run parseAttributes
        // Updates any scoring adjustments and 
        for (var i in query) {
            await parseAttributes(query[i])
        }
    })
}




// Internal functions, not exported
const TOKENS = {
    '1': '5',
    '2': '4',
    '3': '3',
    '4': '2',
    '5': '0',
    '6': '3',
    '7': '2',
    '8': '6',
    '9': '1',
    '10': '4',
    '11': '1',
    '12': '3',
    '13': '4',
    '14': '3',
    '15': '4',
    '16': '3',
    '17': '5',
    '18': '3',
    '19': '2',
    '20': '3',
    '21': '5',
    '22': '3',
    '23': '2',
    '24': '1',
    '25': '3',
    '26': '3',
    '27': '2',
    '28': '1'
}

const TOKEN_SCORE_ADJ = {
    '0': -1.5,
    '1': -1,
    '2': -0.5,
    '3': 0.25,
    '4': 0.5,
    '5': 1,
    '6': 1.5,
}

async function scoreTokens(deck_object, attributes) {
    var pods = deck_object.Pods

    // If deck has token, count the number of token creators and update attributes dict
    if (deck_object.token != null) {
        var token_score = TOKEN_SCORE_ADJ[TOKENS[deck_object["token"].toString()]]
        var token_creators = 0

        for (var i in pods) {
            token_creators += pods[i]["pod_tokens"]
        }

        // Add score adjustment to attributes
        try {
            attributes["tokens"] = token_creators * token_score
        } catch (error) {
            console.log(error)
        }
    }
}

async function parseAttributes(deck_object) {
    var attributes = {}

    // Score tokens and updates attributes dict
    await scoreTokens(deck_object, attributes)
    .then(async function() {
        // Goes through each attribute of teh deck and tallies score adjustment
        var score_adj = 0
        for (var key in attributes) {
            score_adj += attributes[key]
        }

        // Round value to nearest int
        score_adj = Math.round(score_adj)

        // Calculate adjusted score
        var adjusted_score = deck_object.raw_score + score_adj


        // Retrieve adjustment Pod
        var adjustment_pod = null
        for (var i in deck_object.Pods) {
            if (deck_object.Pods[i].house_id == 1) {
                adjustment_pod = deck_object.Pods[i]
                break
            }
        }


        // Stage deck values, attributes from the script response to deck
        deck_object.set({
            adj_score: adjusted_score,
            attributes: JSON.stringify(attributes),
            UpdatedAt: sequelize.literal('CURRENT_TIMESTAMP')
        })

        
        // Stage adjustment pod values
        adjustment_pod.pod_score = score_adj

        // Update db
        await deck_object.save()
        await adjustment_pod.save()
    })
}


module.exports.addDeck = addDeck
module.exports.getAllDeckInfo = getAllDeckInfo
module.exports.parseAttributesImport = parseAttributesImport
module.exports.adjustScoreOnAllDecks = adjustScoreOnAllDecks