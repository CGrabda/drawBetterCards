const sequelize = require('./db.js');
const { DataTypes, Op } = require('sequelize');
const User = require('./models/user.js')(sequelize, DataTypes)
const {PythonShell} = require('python-shell')

// Dict for setting the number of imports and alphas for backers
var rewardDict = {
    "100": [1, 1],
    "200": [2, 2],
    "300": [3, 3]
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
            var user_payment = query[i]["dataValues"]["payment_date"]
            var tier = query[i]["dataValues"]["patreon_rank"].toString()
            
            var rewards = rewardDict[tier]
            
            // Update the user's rewards and last_payment
            await User.update(
                { imports: rewards[0], alpha_requests: rewards[1], last_payment: user_payment, updatedAt: sequelize.literal('CURRENT_TIMESTAMP') },
                { where: { id: user_id } }
            )
        }
    })
    .catch(e=> {
        console.log(e)
    })
}



module.exports.updateTiers = updateTiers
module.exports.processRewards = processRewards