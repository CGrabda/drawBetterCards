const sequelize = require('./db.js')
const { DataTypes } = require('sequelize')
const Deck = require('./models/deck.js')(sequelize, DataTypes)
const House = require('./models/house.js')(sequelize, DataTypes)
const Multiple = require('./models/multiples.js')(sequelize, DataTypes)
const Pod = require('./models/pod.js')(sequelize, DataTypes)
const Card = require('./models/card.js')(sequelize, DataTypes)
const Set = require('./models/set.js')(sequelize, DataTypes)
const Token = require('./models/token.js')(sequelize, DataTypes)
const Collection = require('./models/collection.js')(sequelize, DataTypes)


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
Deck.hasMany(Pod, { foreignKey: "deck_id", targetKey: "deck_id", onDelete: "cascade", hooks: true })

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
    var pods = []
    
    // Retrieve houses within deck
    for (let j in houseStrings) {
        if (houseStrings[j] != '1') {
            houses.push(Number(houseStrings[j]));
        }
    }

    return sequelize.transaction(async function (t) {
        return await Deck.create({
            deck_code: deck_info["code"],
            deck_name: deck_info["name"],
            raw_score: deck_info["score"],
            house1: houses[0],
            house2: houses[1],
            house3: houses[2],
            set_id: deck_info["set"],
            attributes: {},
            token: deck_info["token"]
        }, {transaction: t})
        .then(async function (deck) {
            for (let i in houses) {
                var house = houses[i]
                var pod = pod_info[house]

                // add the 3 houses of the deck
                pods.push(await Pod.create({
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
                }, {transaction: t}))
            }

            // add the adjustment house (no cards)
            pod = pod_info["1"]
            pods.push(await Pod.create({
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
            }, {transaction: t}));

            return [[deck.deck_id, deck.deck_code], deck, pods]
        }).catch(e=> {
            throw new Error(e)
        })
    }).then(async results => {
        // transaction successful
        // Update all the deck totals
        await updateDeckTotals(results[1], results[2])

        return results[0]
    }).catch(e=> {
        throw new Error(e);
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
    var timer = Date.now()
    // Retrieve all decks and their pods
    return await Deck.findAll({
        include: Pod
    })
    .then(async query=> {
        // Iterate over each deck code and run parseAttributes
        // Updates any scoring adjustments and 
        for (var i in query) {
            await parseAttributes(query[i])
            .catch(e=> {
                throw new Error(e)
            })
        }

        console.log('Count of decks: ' + query.length.toString())
        console.log('Deck adjustments updated in ' + ((Date.now() - timer)/1000).toString() + "s")
        return
    })
    .catch(e=> {
        console.log(e)
        throw new Error('Error adjusting scores on all decks')
    })
}



async function rescoreAllDecks() {
    var timer = Date.now()
    // Retrieve all decks including pods/cards
    return await Deck.findAll({ include: [{ model: Pod, include: {all: true, nested: true} }] })
    .then(async query=> {
        // go through each deck, score all the cardName->scoringDict
        for (var deck_object in query) {
            await rescoreDeck(query[deck_object])
            .catch(e=> {
                console.log("Error Rescoring:", query[deck_object].deck_code)
                console.log(e)
                return e
            })
        }
        
        console.log('Count of decks: ' + query.length.toString())
        console.log('Deck scores updated in ' + ((Date.now() - timer)/1000).toString() + "s")
        return
    })
    .catch(e=> {
        console.log(e)
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
    '20': '2',
    '21': '3',
    '22': '3',
    '23': '2',
    '24': '1',
    '25': '4',
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
    '5': 0.75,
    '6': 1,
}

const IDENTIFY_SET = {
    '1': "COTA",
    '2': "AOA",
    '3': "WC",
    '4': "MM",
    '5': "DT",
    '6': "WOE",
    '7': "GR",
    '500': "VM"
}

const IDENTIFY_HOUSE = {
    '2': 'Brobnar',
    '3': 'Dis',
    '4': 'Logos',
    '5': 'Mars',
    '6': 'Sanctum',
    '7': 'Shadows',
    '8': 'Untamed',
    '9': 'Saurian',
    '10': 'Star Alliance',
    '11': 'Unfathomable',
    '12': 'Ekwidon',
    '13': 'Geistoid',
}

async function getStatsFromCard(card_name) {
    var tokens = card_name.split(" ")
    var first_word = tokens[0]
    var card_stats_ouptut = null

    if (first_word == "It's") {
        card_stats_ouptut = SCORING_DICT["MM"]["It's Coming"]
    }

    // MM Velum/Hyde (WC is covered in document)
    else if (first_word == "Hyde" || first_word == "Velum") {
        card_stats_ouptut = SCORING_DICT["MM"]["Hyde/Velum"]
    }
    
    // TT for non-COTA sets
    else if (first_word == "Timetraveller") {
        card_stats_ouptut = SCORING_DICT["COTA"]["Timetraveller"]
    }

    // HFFS for non-COTA sets
    else if (first_word == "Help") {
        card_stats_ouptut = SCORING_DICT["COTA"]["Help From Future Self"]
    }

    // Hings/Gross from non-DT sets
    else if (first_word == "Com.") {
        if (tokens[2] == "Hings") {
            card_stats_ouptut = SCORING_DICT["DT"]["Com. Officer Hings"]
        }
        else if (tokens[2] == "Gross") {
            card_stats_ouptut = SCORING_DICT["DT"]["Com. Officer Gross"]
        }
    }
    
    // Z-Force from non-DT sets
    else if (first_word[0] == "Z") {
        if (tokens[1] == "Agent") {
            card_stats_ouptut = SCORING_DICT["MM"]["Z-Force Agent 14"]
        }
        else if (tokens[1] == "Tracker") {
            card_stats_ouptut = SCORING_DICT["MM"]["Z-Particle Tracker"]
        }
        else if (tokens[1] == "Blaster") {
            card_stats_ouptut = SCORING_DICT["MM"]["Z-Ray Blaster"]
        }
        else if (tokens[1] == "Emitter") {
            card_stats_ouptut = SCORING_DICT["MM"]["Z-Wave Emitter"]
        }
    }
    
    // Dexus from non-WC decks
    else if (first_word == "Dexus") {
        card_stats_ouptut = SCORING_DICT["WC"]["Dexus"]
    }

    // Toad from non-WC decks
    else if (first_word == "Toad") {
        card_stats_ouptut = SCORING_DICT["WC"]["Toad"]
    }

    // Scylla from non-MM decks
    else if (first_word == "Scylla") {
        card_stats_ouptut = SCORING_DICT["MM"]["Scylla"]
    }

    // Charybdis from non-MM decks
    else if (first_word == "Charybdis") {
        card_stats_ouptut = SCORING_DICT["MM"]["Charybdis"]
    }

    // Gigantic creatures
    // Ultra Gravitron
    else if (first_word == "Ultra") {
        card_stats_ouptut = SCORING_DICT["MM"]["Ultra Big Set"]
    }

    // Niffle Kong
    else if (first_word == "Niffle") {
        card_stats_ouptut = SCORING_DICT["MM"]["Kong Big Set"]
    }

    // Deusillus
    else if (first_word == "Deusillus") {
        card_stats_ouptut = SCORING_DICT["MM"]["Deus Big Set"]
    }
        
    // WC Mega Brobnar creatures
    else if (first_word == "Mega") {
        card_stats_ouptut = SCORING_DICT["WC"][card_name.slice(5)]
    }

    // Shiz Buggies, removes single quotes
    else if (first_word.slice(0, 3) == "Shi") {
        card_stats_ouptut = SCORING_DICT["WOE"][card_name]
    }

    // Dive Deep
    else if (first_word == "Dive") {
        card_stats_ouptut = SCORING_DICT["DT"]["Dive Deep"]
    }

    // Drawn Down
    else if (first_word == "Drawn") {
        card_stats_ouptut = SCORING_DICT["DT"]["Drawn Down"]
    }

    // Ortannu the Chained
    else if (first_word == "Ortannu") {
        card_stats_ouptut = SCORING_DICT["AOA"]["Ortannu the Chained"]
    }
    
    // Ortannu's Binding
    else if (first_word == "Ortannu's") {
        card_stats_ouptut = SCORING_DICT["AOA"]["Ortannu's Binding"]
    }

    else if (first_word == "Monument") {
        card_stats_ouptut = SCORING_DICT["MM"][card_name]
    }

    // Handle anomaly cards
    else if (first_word == "Ghostform") {
        card_stats_ouptut = SCORING_DICT["WC"]["Ghostform"]
    } 

    else if (first_word == "Infomancer") {
        card_stats_ouptut = SCORING_DICT["WC"]["Infomancer"]
    }

    else if (first_word == "Lateral") {
        card_stats_ouptut = SCORING_DICT["WC"]["Lateral Shift"]
    }

    else if (first_word == "Memolith") {
        card_stats_ouptut = SCORING_DICT["WC"]["Memolith"]
    }

    else if (first_word == "Nizak,") {
        card_stats_ouptut = SCORING_DICT["WC"]["Nizak, The Forgotten"]
    }

    else if (first_word == "The") {
        if (tokens[1] == "Grim") {
            card_stats_ouptut = SCORING_DICT["WC"]["The Grim Reaper"]
        }
        else if (tokens[1] == "Red") {
            card_stats_ouptut = SCORING_DICT["WC"]["The Red Baron"]
        }
    }

    else if (first_word == "Timequake") {
        card_stats_ouptut = SCORING_DICT["WC"]["Timequake"]
    }

    else if (first_word == "Ecto-Charge") {
        card_stats_ouptut = SCORING_DICT["WOE"]["Ecto-Charge"]
    }

    else if (first_word == "Near-Future") {
        card_stats_ouptut = SCORING_DICT["WOE"]["Near-Future Lens"]
    }

    else if (first_word == "Curse") {
        card_stats_ouptut = SCORING_DICT["WOE"]["Curse of Forgetfulness"]
    }
    // anomalies finished

    // World's Collide variants
    // Brobnar brews
    else if (tokens.length > 1) {
        if (tokens[1] == "Brew") {
            card_stats_ouptut = SCORING_DICT["WC"]["Brew"]
        }

        // Dis banes
        else if (tokens[1] == "Bane") {
            card_stats_ouptut = SCORING_DICT["WC"]["Bane"]
        }
    }


    if (!card_stats_ouptut) {
        // add console message error adding card
        console.log('Error adding card: ' + card_name)
    }
    return card_stats_ouptut
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

async function scoreMeta(deck_object, attributes) {
    var pods = deck_object.Pods

    // 0R       -2
    // 2R       +1

    // 0Clears  -4
    // 2Clears  +2

    // <1F      -5
    // 1-5F     -2
    // 9+F      +2
    
    // <6C      -4
    // 10+C     +2
    
    // NoScaleA -2
    // Two+ ScaleA

    // 2R different houses +1
    // 2Wipes different houses +2
    // No C in a house -1
    // No A in a house -2


    // stat totalling and house considerations
    var r_count = 0
    var wipes_count = 0
    var f_count = 0
    var c_count = 0
    var scalingA_count = 0
    var houses_with_r_count = 0
    var houses_with_clears_count = 0

    for (var i in pods) {
        r_count += pods[i]["pod_r"]
        wipes_count += pods[i]["pod_wipes"]
        f_count += pods[i]["pod_f"]
        c_count += pods[i]["pod_c"]
        scalingA_count += pods[i]["pod_scaling_a"]
        pods[i]["pod_r"] > 0 ? houses_with_r_count +=1 : null
        pods[i]["pod_wipes"] > 0 ? houses_with_clears_count +=1 : null

        if (pods[i]["house_id"] != 1) {
            var house_name = IDENTIFY_HOUSE[pods[i]["house_id"].toString()]
            // No C in a house -1
            pods[i]["pod_c"] === null ? attributes["No C in " + house_name] = -1 : null

            // No A in a house -2
            pods[i]["pod_a"] === null ? attributes["No A in " + house_name] = -2 : null
        }
    }


    // R scoring
    if (r_count == 0) {
        attributes["No R"] = -2
    }
    else if (r_count >= 2) {
        attributes["2+ R"] = 1
    }

    // Wipes scoring
    if (wipes_count == 0) {
        attributes["No Board Wipes"] = -4
    }
    else if (wipes_count >= 2) {
        attributes["2+ Board Wipes"] = 2
    }

    // F scoring
    if (f_count < 1) {
        attributes["No F"] = -5
    }
    else if (f_count < 5) {
        attributes["1 to 5 F"] = -2
    }
    else if (f_count >= 9) {
        attributes["9+ F"] = 2
    }
    
    // C scoring
    if (c_count < 6) {
        attributes["Less than 6 C"] = -4
    }
    else if (c_count > 10) {
        attributes["10+ C"] = 2
    }

    // Scaling A scoring
    // NoScaleA -2
    // Two+ ScaleA
    if (scalingA_count == 0) {
        attributes["No Scaling AEmber Control"] = -2
    }
    else if (scalingA_count > 1) {
        attributes["2+ Scaling AEmber Control"] = 1
    }
    
    // 2R different houses +1
    if (houses_with_r_count > 1) {
        attributes["2+ R in different houses"] = 1
    }

    // 2Wipes different houses +2
    if (houses_with_clears_count > 1) {
        attributes["2+ Board Wipes in different houses"] = 2
    }
}

async function parseAttributes(deck_object) {
    var attributes = {}

    // Score tokens and updates attributes dict
    return await scoreTokens(deck_object, attributes)
    .then(async function() {
        return await scoreMeta(deck_object, attributes)
        .then(async function() {
            // Goes through each attribute of the deck and tallies score adjustment
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
                updatedAt: sequelize.literal('CURRENT_TIMESTAMP')
            })
    
            
            // Stage adjustment pod values
            adjustment_pod.pod_score = score_adj
    
            // Update db
            await adjustment_pod.save()
            await deck_object.save()
        })
        .catch(e=> {
            console.log(e)
            throw new Error('Error updating bad meta score')
        })
    })
    .catch(e=> {
        console.log(e)
        throw new Error('Error updating token scores')
    })
}


async function rescoreDeck(deck_object) {
    // Retrieve pods from deck
    var pods = deck_object["dataValues"]["Pods"]

    // Initialize variables
    var raw_score = 0
    var adjustment_pod = null

    for (var i in pods) {
        var pod = pods[i]
        var card_counts = {}
        

        // Ignore score adjustment pod, only alters deck values and attributes
        if (pod.house_id != 1) {
            // Set pod scores to 0
            pod.pod_score = 0
            pod.pod_e = 0
            pod.pod_a = 0
            pod.pod_c = 0
            pod.pod_f = 0
            pod.pod_d = 0
            pod.pod_r = 0
            pod.pod_bob = 0
            pod.pod_scaling_a = 0
            pod.pod_wipes = 0
            pod.pod_cheats = 0
            pod.pod_tokens = 0

            // Loop over cards and tally new pod scores
            for (i = 1; i < 13; i++) {
                // Get card information
                var card = pod["card_" + i.toString()]
                try {
                    var card_name = card.card_name
                }
                catch {
                    console.log(pod)
                    console.log(i)
                }
                var set_id = card.card_id.toString().slice(0, -3)
                var set_abbrev = IDENTIFY_SET[set_id]
                var card_stats = null
                
                // Retrieve card stats from scoring dict
                try {
                    card_stats = SCORING_DICT[set_abbrev][card_name]
                    // eslint-disable-next-line
                } catch (e) {}
                

                // Check if card exists within its set first
                if (!card_stats) {
                    //console.log(set_abbrev)
                    //console.log(card_name)
                    // card_stats is undefined and this card is not scored in this set
                    await getStatsFromCard(card_name)
                    .then(output=> {
                        card_stats = output
                    })
                    .catch(e=> {
                        throw new Error(e)
                    })
                    //console.log(card_stats)
                }


                // Add card values to score
                pod.pod_e += card_stats["e"]
                pod.pod_a += card_stats["a"]
                pod.pod_c += card_stats["c"]
                pod.pod_f += card_stats["f"]
                pod.pod_d += card_stats["d"]
                pod.pod_r += card_stats["r"]
                pod.pod_bob += card_stats["bob"]
                pod.pod_scaling_a += card_stats["scalingA"]
                pod.pod_wipes += card_stats["wipes"]
                pod.pod_cheats += card_stats["cheats"]
                pod.pod_tokens += card_stats["tokens"]

                // Count each card, this is for handling scoring card multiples
                try {
                    card_counts[card_name][0] += 1
                } 
                catch {
                    card_counts[card_name] = [1, card_stats["score"], card_stats["multiples"]]
                }
            }
            // Add cards to pod score, factoring in multiples
            for (var key in card_counts) {
                var multiples_count = card_counts[key][0]
                var card_score = card_counts[key][1]
                var multiples_list = card_counts[key][2]
                
                for (i = 0; i < multiples_count; i++) {

                    pod.pod_score += parseInt(card_score) + parseInt(multiples_list[Math.min(i, 4)])
                }
            }
            // Add the score of the pod to the raw score
            raw_score += pod.pod_score

            // Handle card values which may be null, if 0 set to null
            if (!pod.pod_e) {
                pod.pod_e = null
            }
            if (!pod.pod_a) {
                pod.pod_a = null
            }
            if (!pod.pod_c) {
                pod.pod_c = null
            }
            if (!pod.pod_f) {
                pod.pod_f = null
            }
            if (!pod.pod_d) {
                pod.pod_d = null
            }
            if (!pod.pod_r) {
                pod.pod_r = null
            }
            if (!pod.pod_scaling_a) {
                pod.pod_scaling_a = null
            }
            if (!pod.pod_wipes) {
                pod.pod_wipes = null
            }
            if (!pod.pod_cheats) {
                pod.pod_cheats = null
            }
            if (!pod.pod_tokens) {
                pod.pod_tokens = null
            }
            
            // Update pod in db
            await pod.save()
        }
        else {
            // House id is 1, assign the adjustment pod
            adjustment_pod = pod
        }
    }
    
    return await updateDeckTotals(deck_object, pods)
}



async function updateDeckTotals(deck_object, pods) {
    deck_object.adj_score = 0
    deck_object.total_e = 0
    deck_object.total_a = 0
    deck_object.total_c = 0
    deck_object.total_f = 0
    deck_object.total_d = 0
    deck_object.total_r = 0
    deck_object.total_bob = 0
    deck_object.total_scaling_a = 0
    deck_object.total_wipes = 0
    deck_object.total_cheats = 0
    deck_object.total_tokens = 0

    for (var i = 0; i < 4; i++) {
        deck_object.adj_score += (pods[i].pod_score || 0)
        deck_object.total_e += (parseInt(pods[i].pod_e) || 0)
        deck_object.total_a += (parseInt(pods[i].pod_a) || 0)
        deck_object.total_c += (parseInt(pods[i].pod_c) || 0)
        deck_object.total_f += (pods[i].pod_f || 0)
        deck_object.total_d += (pods[i].pod_d || 0)
        deck_object.total_r += (pods[i].pod_r || 0)
        deck_object.total_bob += (pods[i].pod_bob || 0)
        deck_object.total_scaling_a += (pods[i].pod_scaling_a || 0)
        deck_object.total_wipes += (pods[i].pod_wipes || 0)
        deck_object.total_cheats += (pods[i].pod_cheats || 0)
        deck_object.total_tokens += (pods[i].pod_tokens || 0)
    };

    // Push updates to db
    return await deck_object.save();
}


async function reimportDeck(deck_code) {
    // This method does not work because the deck_id is a key and cannot be set
    // within collections to that of a deck that does not exist. It must first be deleted
    // in collections and then re-added. Return deck_code and users collection was deleted
    // from to server and then add back with userFunctions
    /*
    // Takes a deck code and then deletes and reimports the deck into the owner's collection
    // Find deck
    Deck.findOne({
        where: { deck_code: deck_code }
    })
    .then(results=> {
        var old_deck_id = results["dataValues"]["deck_id"]

        // Set deck_id in Collections to 0 to prevent cascade errors
        Collection.update(
            { deck_id: 0 },
            { where: { deck_id: old_deck_id } }
        )
        .then(()=>{
            // Delete deck and pods associated with the deck_id (onDelete: cascade option set for relationship)
            Deck.destroy({
                where: { deck_id: old_deck_id }
            })
            .then(results=> {
                if (results instanceof Error) {
                    throw results
                }
    
                // Import deck
                try {
                    var output = ""
                    // Run python script
                    return PythonShell.run(process.env.SCRIPT_PATH + 'ZscoreDeck.py', options)
                    .then(messages=>{
                        // messages is an array of the output from execution
                        //console.log(messages)
                        if (messages[0] instanceof Error) {
                            return new Error('Deck import error')
                        }
                        output = JSON.parse(messages[0])
        
                        // Add deck to database
                        console.log('Reimporting:' + output["deck_info"]["code"])
                        return addDeck(output["deck_info"], output["pod_info"])
                    })
                    .then(deck_code=> {
                        return deckFunctions.parseAttributesImport(deck_code)
                        .then(output=> {
                            if (output instanceof Error) {
                                throw output
                            }
    
                            // Get new deck_id
                            return Deck.findOne({
                                where: { deck_code: deck_code }
                            })
                            .then(results=> {
                                var new_deck_id = results["dataValues"]["deck_id"]
    
                                // Set Collections where old deck_id to imported deck_id
                                Collection.update(
                                    { deck_id: new_deck_id },
                                    { where: { deck_id: 0 } }
                                )
                                .then(()=>{
                                    return deck_code
                                })
                            })
                        }).catch(e => { console.log(e); throw e });
                    }).catch(e => { console.log(e); throw e });
                }
                catch (PythonShellError) {
                    console.log('Error importing deck')
                    console.log(PythonShellError)
                    throw PythonShellError
                }
            }) 
        })
    })
    */
}


module.exports.addDeck = addDeck
module.exports.getAllDeckInfo = getAllDeckInfo
module.exports.parseAttributesImport = parseAttributesImport
module.exports.adjustScoreOnAllDecks = adjustScoreOnAllDecks
module.exports.rescoreAllDecks = rescoreAllDecks
module.exports.reimportDeck = reimportDeck