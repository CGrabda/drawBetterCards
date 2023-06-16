const sequelize = require('./db.js');
const { DataTypes } = require('sequelize');
const Deck = require('./models/deck.js')(sequelize, DataTypes)
const Pod = require('./models/pod.js')(sequelize, DataTypes)

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

    // Handle attributes passed from import
    var attributes = null
    console.log(deck_info["attributes"])
    if (Object.keys(deck_info["attributes"]) > 0) {
        attributes = deck_info["attributes"]
    }


    return sequelize.transaction(function (t) {
        return Deck.create({
            deck_code: deck_info["code"],
            owner_id: user_id,
            deck_name: deck_info["name"],
            hidden: hidden,
            score: deck_info["score"],
            attributes: attributes,
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


async function hideDeck(path, bool) {
    await Deck.update(
        { hidden: bool },
        { where: { deck_code: path } }
    )
}


async function updateAlpha(path, score) {
    await Deck.update(
        { alpha_score: score, updatedAt: sequelize.literal('CURRENT_TIMESTAMP') },
        { where: { deck_code: path } }
    )
}

async function parseAttributes(deck_code) {
    await Deck.findOne({
        where: { deck_code: deck_code },
        include: { all: true , nested: true }
    })
    .then(query=> {
        // token scoring adjustment attribute
        if (query.token) {
            var score_adjustment = TOKEN_SCORE_ADJ[TOKENS[query.token.toString()]]

            // count tokens
            // multiply score adjustment by token creation count
            // add to attributes AFTER python function
        }


        // add combo parsing python
        return query
    })
}


module.exports.addDeck = addDeck
module.exports.hideDeck = hideDeck
module.exports.updateAlpha = updateAlpha
module.exports.parseAttributes = parseAttributes