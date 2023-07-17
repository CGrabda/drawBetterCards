const sequelize = require('./db.js');
const { DataTypes, Op } = require('sequelize');
const User = require('./models/user.js')(sequelize, DataTypes)
const Collection = require('./models/collection.js')(sequelize, DataTypes)
const {PythonShell} = require('python-shell')


// Dict for setting the number of imports and alphas for backers
var rewardDict = {
    "100": [20, 1],
    "200": [100, 5],
    "300": [10000, 10]
}


// Updates the patreon tiers of user, default is the past 3 months
async function updateTiers(lookback_minutes = 131490) {
    var options = {
        mode: 'text',
        pythonPath: process.env.PYTHON_PATH,
        args: [lookback_minutes]
    }

    try {
        // Get the list of current patreons
        await PythonShell.run(process.env.SCRIPT_PATH + 'getPatreons.py', options)
        .then(async messages=> {
            // Check if the python output is an error, then prase json results
            if (messages[0] instanceof Error) {
                return new Error('Deck import error')
            }
            var output = JSON.parse(messages[0])["data"]

            // loop through each [email, tier] returned
            for (var i in output) {
                // Update the user ranks
                await User.update(
                    { patreon_rank: output[i][1], payment_date: output[i][2], updatedAt: sequelize.literal('CURRENT_TIMESTAMP') },
                    { where: { email: output[i][0] } }
                )
            }
        })
    }
    catch (PythonShellError) {
        console.log('Error updating patreon tiers')
        console.log(PythonShellError)
    }
}

// Give rewards to patrons
// Query for all users where payment_date != last_payment
// This indicates they have made a payment but not been given a reward
async function processRewards() {
    await User.findAll({
        where: { payment_date: {[Op.ne]: sequelize.col('last_payment')} }
    })
    .then(async query=> {
        // Loop over each user that has not yet been updated
        for (var i in query) {
            var user_id = query[i]["dataValues"]["id"]
            var old_imports = query[i]["dataValues"]["imports"]
            var user_payment = query[i]["dataValues"]["payment_date"]
            var tier = query[i]["dataValues"]["patreon_rank"].toString()
            
            var rewards = rewardDict[tier]
            var new_imports = rewards[0] + Math.floor(0.5*old_imports)
            
            // Update the user's rewards and last_payment
            await User.update(
                { imports: new_imports, alpha_requests: rewards[1], last_payment: user_payment, updatedAt: sequelize.literal('CURRENT_TIMESTAMP') },
                { where: { id: user_id } }
            )
        }
    })
    .catch(e=> {
        console.log(e)
    })
}


// Retrieves a a user's email and returns it, else null if the user does not exist
async function getEmail(user_email) {
    return await User.findOne({
        where: { email: user_email }
    })
    .then(async query=> {
        if (query) {
            return query["dataValues"]["email"]
        }
    })
    .catch(e=> {
        console.log(e)
    })
}

// Retrieves a a user's email and returns it, else null if the user does not exist
async function setToken(user_email, token, token_expiration) {
    return await User.update(
        { reset_token: token, token_expires: token_expiration },
        { where: { email: user_email } } 
    )
    .then(async query=> {
        if (query) {
            return true
        }
    })
    .catch(e=> {
        console.log(e)
    })
}

// If the user has a valid token that has not expired, return the user object, else null
async function getUserObjectFromToken(token) {
    return await User.findOne({
        where: { reset_token: token }
    }).then(async query=> {
        var token_expires = query["dataValues"]["token_expires"]

        // If the token is valid
        if (token_expires > Date.now()) {
            return query
        }

        // Token is invalid, reset token values to null
        query.set({
            reset_token: null,
            token_expires: null
        })
        await query.save()

        return null
    }).catch(function () {
        console.log(`Error retrieving token: ${token}`)
        return null
    })
}


async function addToCollection(user_id, deck_id) {
    await Collection.create({
        owner_id: user_id,
        deck_id: deck_id
    })
}

async function removeFromCollection(user_id, deck_id) {
    await Collection.destroy({
        where: {
            owner_id: user_id,
            deck_id: deck_id
        },
        force: true
    })
}

async function isDeckInCollection(user_id, deck_id) {
    return await Collection.findOne({
        where: {
            owner_id: user_id,
            deck_id: deck_id
        }
    })
    .then(async query=> {
        // If there is a value, add the user has this deck in their collection
        if (query) {
            return true
        }
        
        // The query result was null, the user does not have this deck
        return false
    })
}


module.exports.updateTiers = updateTiers
module.exports.processRewards = processRewards
module.exports.getEmail = getEmail
module.exports.setToken = setToken
module.exports.getUserObjectFromToken = getUserObjectFromToken
module.exports.addToCollection = addToCollection
module.exports.removeFromCollection = removeFromCollection
module.exports.isDeckInCollection = isDeckInCollection