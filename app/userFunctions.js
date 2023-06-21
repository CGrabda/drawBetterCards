const sequelize = require('./db.js');
const { DataTypes } = require('sequelize');
const User = require('./models/user.js')(sequelize, DataTypes)
const {PythonShell} = require('python-shell')

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
                    { patreon_rank: output[i][1] },
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

module.exports.updateTiers = updateTiers