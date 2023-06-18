const sequelize = require('./db.js');
const { DataTypes, Op } = require('sequelize');
const Deck = require('./models/deck.js')(sequelize, DataTypes)
const House = require('./models/house.js')(sequelize, DataTypes)
const Pod = require('./models/pod.js')(sequelize, DataTypes)
const Card = require('./models/card.js')(sequelize, DataTypes)
const Set = require('./models/set.js')(sequelize, DataTypes)
const Token = require('./models/token.js')(sequelize, DataTypes)
const {PythonShell} = require('python-shell')


// SQL relationships
// Associate deck houses with house ids
Deck.belongsTo(House, { as: "house_1", foreignKey: "house1", targetKey: "house_id" })
Deck.belongsTo(House, { as: "house_2", foreignKey: "house2", targetKey: "house_id" })
Deck.belongsTo(House, { as: "house_3", foreignKey: "house3", targetKey: "house_id" })
Pod.belongsTo(House, { foreignKey: "house_id", targetKey: "house_id" })

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


async function addDeck(deck_info, pod_info, user_id, hidden) {
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
            owner_id: user_id,
            deck_name: deck_info["name"],
            hidden: hidden,
            score: deck_info["score"],
            house1: houses[0],
            house2: houses[1],
            house3: houses[2],
            set_id: deck_info["set"],
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
        }).catch(function (err) {
            console.log(err)
            throw new Error('Error importing Deck')
        });
    }).then(function() {
        // transaction successful
        return deck_info["code"]
    }).catch(e=> {
        console.log(e)
        throw new Error('Deck already imported');
    });
}


async function hideDeck(deck_code, bool) {
    await Deck.update(
        { hidden: bool },
        { where: { deck_code: deck_code } }
    )
}


async function updateAlpha(deck_code, score) {
    await Deck.update(
        { alpha_score: score, updatedAt: sequelize.literal('CURRENT_TIMESTAMP') },
        { where: { deck_code: deck_code } }
    )
}


async function getAllDeckInfo(deck_code) {
    return await Deck.findOne({
        where: { deck_code: deck_code },
        include: { all: true , nested: true }
    })
}


async function parseAttributes(deck_code) {
    await getAllDeckInfo(deck_code)
    .then(async query=> {
        var options = {
            mode: 'text',
            pythonPath: process.env.PYTHON_PATH,
            args: [JSON.stringify(query)]
        }

        // Send query output as a JSON to the python attribute script
        // This script handles custom scores and combos
        await PythonShell.run(process.env.SCRIPT_PATH + 'parseAttributes.py', options)
        .then(async messages=> {
            var attributes = JSON.parse(messages[0])
        
            // Add attributes from the script response to deck
            await Deck.update(
                { attributes: attributes, updatedAt: sequelize.literal('CURRENT_TIMESTAMP') },
                { returning: true, where: { deck_code: deck_code } }
            )                                                       // eslint-disable-next-line no-unused-vars
            .then(async function([ rowsUpdate, [updatedDeck] ]) {
                // goes through each attribute and tallies them
                var score_adj = 0
                for (var key in attributes) {
                    score_adj += attributes[key]
                }

                // round value to nearest int
                score_adj = Math.round(score_adj)

                // sets the adjustment Pod value to the score adjustment
                await Pod.update(
                    { pod_score: score_adj },
                    { where: {[Op.and]: [
                        { deck_id: updatedDeck["dataValues"]["deck_id"] },
                        { house_id: 1 }
                    ]}}
                )
            })
        })
    }).catch(e=> {
        console.log(e)
    })
}


module.exports.addDeck = addDeck
module.exports.hideDeck = hideDeck
module.exports.updateAlpha = updateAlpha
module.exports.getAllDeckInfo = getAllDeckInfo
module.exports.parseAttributes = parseAttributes