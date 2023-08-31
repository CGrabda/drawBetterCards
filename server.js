#!/usr/bin/env node
"use strict";
require('dotenv').config()
const express = require('express')
const app = express()


// node package requirements
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const flash = require('express-flash');
const fs = require('fs');
const helmet = require('helmet');
const hpp = require('hpp');
const https = require('https');
const moment = require('moment');
const nodemailer = require("nodemailer");
const passport = require('passport');
const path = require('path');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const svgCaptcha = require('svg-captcha-fixed');
const toobusy = require('toobusy-js');
const util = require('util');

// db models
const sequelize = require('./app/db.js')
const { DataTypes, Op, Utils, Sequelize } = require("sequelize")
const User = require('./app/models/user.js')(sequelize, DataTypes)
const Decks = require('./app/models/deck.js')(sequelize, DataTypes)
const Collections = require('./app/models/collection.js')(sequelize, DataTypes)
const {PythonShell} = require('python-shell')
const deckFunctions = require('./app/deckFunctions.js');
const userFunctions = require('./app/userFunctions.js');
const deckSearch = require('./app/search.js')
const SessionStore = require('express-session-sequelize')(session.Store);
const sequelizeSessionStore = new SessionStore({
    db: sequelize,
    expiration: 86400000 * 28
})
const token = require('./app/models/token.js');

// Associate decks and users to Collections
Decks.hasMany(Collections, { foreignKey: "deck_id" })
User.hasMany(Collections, { foreignKey: "owner_id", targetKey: "id" })


require('./app/passport.js')



// Express Middleware
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false, limit: "1kb" }))
app.use(express.json({ limit: "1kb" }))
app.use(rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 200, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
}))

app.use(flash())
app.use(session({
    cookie: {
        maxAge: 86400000 * 28,
        sameSite: true,
        httpOnly: true,
        
    },
    secret: process.env.SESSION_SECRET,
    store: sequelizeSessionStore,
    resave: false,
    saveUninitialized: false
}))

app.use(express.static('public'));
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
//app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
app.use(passport.initialize())
app.use(passport.session())
//app.disable('x-powered-by') handled by helmet, changed


// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true,
    requireTLS: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }, 
    dkim: {
        domainName: 'drawbetter.cards',
        keySelector: 'default',
        privateKey: process.env.DKIM
    }
});



// Setup globals for views
app.locals = {
    'card_info': {
        'scoring_dict': require('./scripts/data/scoreDict.json'),
        'card_id_to_name': require('./scripts/data/cardIDToName.json'),
        'card_setnum_to_abbrev': {
            1: 'COTA',
            2: 'AOA',
            3: 'WC',
            4: 'MM',
            5: 'DT',
            6: 'WOE',
            7: 'GR',
            500: 'VM'
        }
    } 
}



// Security Middleware
app.use(helmet.frameguard());
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.ieNoOpen());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 35.2.1' }));
app.use(hpp());
app.use(function(req, res, next) {
    if (toobusy()) {
        // log if you see necessary
        return res.status(503).send("Server Too Busy");
    } else {
    next();
    }
});



// Scheduled tasks
var CronJob = require('cron').CronJob;
// Updates Patreon tiers from payments within the past 3 minutes, runs every 2 minutes
var job1 = new CronJob(
    '1 */2 * * * *',
    function() {
        userFunctions.updateTiers(3)
        .then(async function () {
            return userFunctions.processRewards()
            .then(async function () {
                return userFunctions.offloadOldPatreons()
            })
            .catch(function() {
                console.log("processRewardsError")
            })
        })
        .catch(function() {
            console.log("updateTiersError")
        })
    },
    null,
    true,
    'America/New_York'
);

// Updates Patreon tiers for anyone with history in the past 3 months
// Former patreons that then create an account handled here
var job2 = new CronJob(
    '1 */10 * * * *',
    function() {
        userFunctions.updateTiers();
    },
    null,
    true,
    'America/New_York'
);

// At the first of the month give all users +x imports
// This number is a constant and can be changed in the raw query within function
// CURRENTLY SET TO: +5
var job3 = new CronJob(
    '1 0 0 1 * *',
    function() {
        userFunctions.monthlyImportHit();
    },
    null,
    true,
    'America/New_York'
);



// Misc variables declared for functions
const ALPHA_SCORES = ['F', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+']


// Routes
// landing page
app.get('/', (req, res) => {
    Promise.all([
        Decks.findAll({
            limit: 5,
            order: [['adj_score', 'DESC' ], ['createdAt', 'DESC']],
        }), 
        Decks.findAll({
            where: { createdAt: { [Op.gte]: moment().subtract(30, 'days').toDate() } },
            limit: 5,
            order: [['createdAt', 'DESC' ]]
        })
    ])
    .then(queries=> {
        return res.render('index.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, queryTop: queries[0], queryRecent: queries[1] })
    }).catch(e=>{ console.log(e); return res.render('index.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, queryTop: null, queryRecent: null }) });
})


// About page
app.get('/about', (req, res) => {
    return res.render('about.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user })
})


// Login page
app.get('/login', isNOTAuthenticated, (req, res) => {
    return res.render('login.ejs', { isLoggedIn: req.isAuthenticated() })
})

// Post login
app.post('/login', isNOTAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
    }),
    (req, res) => {
        console.log('Authentication to: ' + req.user.username + ' from ' + req.headers['CF-Connecting-IP'])
        return res.status(200).send({ message: 'Successful Authentication' })
    }
)


// Register page
app.get('/register', isNOTAuthenticated, (req, res) => {
    var captcha = svgCaptcha.create({
        size: 5,
        ignoreChars: '0o1iIlJj', // filter out some characters like 0o1i
        noise: 2, // number of noise lines
        color: true
    });
    req.session.captcha = captcha.text;
    
    return res.render('register.ejs', { captcha_image: captcha.data, isLoggedIn: req.isAuthenticated() })
})

// Post register
app.post('/register', isNOTAuthenticated, passedCaptcha, validateInput, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 13)
        User.create({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            imports: 30
        })
        .then(function() {
            console.log(`Created User ${req.body.username}`)
            res.redirect('/login')
        }).catch(e=> {
            console.log(e)
            req.flash('error', 'An error occurred creating the user')
            res.redirect('/register')
        })
    }
    catch (e) {
        console.log(e)
        res.redirect('/register')
    }
})


// Logout post
app.post('/logout', isAuthenticated, (req, res, next) => {
    req.logOut(function(err) {
        if (err) { return next(err) }
        return res.redirect('/')
    })
})


// Import post
// eslint-disable-next-line no-unused-vars
app.post('/import', isAuthenticated, doesDeckExist, (req, res, next) => {
    var options = {
        mode: 'text',
        pythonPath: process.env.PYTHON_PATH,
        args: [req.body.deckLink]
    }

    // If user has imports remaining, runs import script
    if (req.user.imports > 0) {
        try {
            var output = ""
            // Run python script
            PythonShell.run(process.env.SCRIPT_PATH + 'ZscoreDeck.py', options)
            .then(messages=>{
                // messages is an array of the output from execution
                //console.log(messages)
                if (messages[0] instanceof Error) {
                    return new Error('Deck import error')
                }
                output = JSON.parse(messages[0])

                // Add deck to database
                console.log('Importing from ' + req.user.username + ':' + output["deck_info"]["code"])
                return deckFunctions.addDeck(output["deck_info"], output["pod_info"])
                .then(deck_info => {
                    // Add deck to user's collection on import
                    if (!req.body.isNotInCollection) {
                        console.log('CollectionAdd ' + output["deck_info"]["name"] + ':' + req.user.username)
                        userFunctions.addToCollection(req.user.id, deck_info[0])
                    }
                    return deck_info[1]
                })
                .catch(e => {
                    console.log(e)
                    return new Error('Deck add Error')
                });
            })
            .then(deck_code=> {
                deckFunctions.parseAttributesImport(deck_code)
                .then(output=> {
                    if (output instanceof Error) {
                        throw output
                    }
    
                    // Decrement Imports by 1
                    req.user.importedDeck()
                    return res.redirect('/deck/' + deck_code)
                }).catch(e => { console.log(e); req.flash('error', 'Error adding attributes, contact a team member'); res.redirect('/'); });
            }).catch(e => { console.log(e); req.flash('error', 'Error importing deck, contact a team member'); res.redirect('/'); });
        }
        catch (PythonShellError) {
            req.flash('error', 'Error importing deck, contact a team member')
            console.log('Error importing deck')
            console.log(PythonShellError)
            return res.redirect('/')
        }
    }
    else {
        req.flash('error', 'No imports available')
        return res.redirect('/')
    }
})


// Mydecks page
app.get('/mydecks', isAuthenticated, (req, res) => {
    // Visit mydecks page, deck rendering is handled by /load/mydecks
    console.log("get mydecks:", req.query, req.queryPolluted)
    return deckSearch.getQueryData(req.query, req.queryPolluted)
    .then(results=> {
        return res.render('mydecks.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, searchData: results, searchPath: "mydecks" })
    })
})


// Search/All Decks page
app.get('/search', (req, res) => {
    // Visit search page, deck rendering is handled by /load/search
    return deckSearch.getQueryData(req.query, req.queryPolluted)
    .then(results=> {
        return res.render('search.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, searchData: results, searchPath: "search" })
    })
})


// Load post, for search pagination
// eslint-disable-next-line no-unused-vars
app.post('/load/:search', (req, res, next) => {
    // Check if there is a page with the request, else default to 0
    var data = JSON.parse(req.body.data, req.body.page)
    var page = req.body.page
    if (page % 1 != 0) {
        page = 0
    }

    // If params length > 1, this is a custom search made by the user
    console.log("Load request:" + req.body.data)
    if (Object.keys(data).length){
        if (req.params.search == "mydecks") {
            return deckSearch.searchDeck(data, page, req.user.id)
            .then(results=> {
                return res.json({ html: queryToHTML(results) })
            })
        }
        else if (req.params.search == "search") {
            return deckSearch.searchDeck(data, page)
            .then(results=> {
                return res.json({ html: queryToHTML(results) })
            })
        }
    }
    else {
        // Default search for mydecks page
        if (req.params.search == "mydecks") {
            return Decks.findAll({
                // Request originating from mydecks page
                include: {
                    model: Collections,
                    where: { owner_id: req.user.id }
                },
                limit: 15,
                offset: 15 * page,
                order: [['adj_score', 'DESC'], ['createdAt', 'DESC']],
            })
            .then(results=> {
                return res.json({ html: queryToHTML(results) })
            })
            .catch(e=> {
                console.log("Error fetching mydecks:" + req.user.username)
                req.flash('error', ['An unexpected error occurred, please contact a team member.'])
                //return res.redirect('/')
            })
        }
        // Default search for all decks
        else if (req.params.search == "search") {
            return Decks.findAll({
                // Request originating from search page
                limit: 15,
                offset: 15 * page,
                order: [['adj_score', 'DESC'], ['createdAt', 'DESC']]
            })
            .then(results=> {
                return res.json({ html: queryToHTML(results) })
            })
            .catch(e=> {
                console.log("Error fetching all decks")
                req.flash('error', ['An unexpected error occurred, please contact a team member.'])
                //return res.redirect('/')
            })
        }
        else {
            //error
            return
        }
    }
})


// deck pages
app.get("/deck/:deck_code", isValidCode, function(req, res) {
    // retrieve deck code from subdomain
    var path = req.params.deck_code

    // retrieve deck
    deckFunctions.getAllDeckInfo(path)
    .then(results=> {
        if (results == null) {
            req.flash('error', 'Deck is not yet imported');
            return res.redirect('/');
        }


        if (req.isAuthenticated()) {
            // Check if user has deck in collection
            return userFunctions.isDeckInCollection(req.user.id, results["dataValues"]["deck_id"])
            .then(isInCollection=> {
                return res.render('deck.ejs', { query: results, isLoggedIn: req.isAuthenticated(), user: req.user, isInCollection: isInCollection })
            })
            .catch(e=> {
                console.log(e)
            })
        }
        
        // User is not authenticated, no collection check
        return res.render('deck.ejs', { query: results, isLoggedIn: req.isAuthenticated(), user: req.user, isInCollection: false })
        

    // On error, flash error message and redirect to index
    }).catch(e=> { req.flash('error', 'Error viewing deck, contact a team member'); console.log(e); return res.redirect('/'); })
})


// Post deckaction, mine/notmine collections and alpha scoring
// eslint-disable-next-line no-unused-vars
app.post('/deck/:deck_code/:deckAction', isAuthenticated, isValidCode, (req, res, next) => {
    var deck_code = req.params.deck_code
    var deckAction = req.params.deckAction

    // Add deck to a user's collection
    if (deckAction === 'mine' && (req.user.patreon_rank > 1 || req.user.unlimited_user)) {
        Decks.findOne({ where: { deck_code: deck_code } })
        .then(query=> {
            userFunctions.addToCollection(req.user.id, query["dataValues"]["deck_id"])
            console.log('CollectionAdd ' + query["dataValues"]["deck_name"] + ':' + req.user.username)
            req.flash('success', 'Deck added to collection')

            // Render deck page
            return res.redirect('/deck/' + deck_code)
        })
        .catch(e=> {
            req.flash('error', 'Error adding deck to collection')
            return res.redirect('/deck/' + deck_code)
        })
    }

    // Remove deck from a user's collection
    else if (deckAction === 'notmine') {
        Decks.findOne({ where: { deck_code: deck_code } })
        .then(query=> {
            userFunctions.removeFromCollection(req.user.id, query["dataValues"]["deck_id"])
            console.log('CollectionRemove ' + query["dataValues"]["deck_name"] + ':' + req.user.username)
            req.flash('success', 'Deck removed from collection')

            // Render deck page
            return res.redirect('/deck/' + deck_code)
        })
        .catch(e=> {
            req.flash('error', 'Error removing deck from collection')
            return res.redirect('/deck/' + deck_code)
        })
    }

    // Set unscored deck to pending
    else if (deckAction === 'alpha') {
        // Update the alpha status
        // Get the requested deck
        Decks.findOne({ where: { deck_code: deck_code } })
        .then(query=> {
            try {
                // if no score
                if (query.alpha_score == null) {
                    query.updateAlpha("P")
                    // Decrement alpha_requests by 1
                    .then(results=> { req.user.requestedAlpha(); return results })
                    .catch(e=> {
                        req.flash('error', ['An unexpected error occurred, please contact a team member.'])
                        return res.redirect('/')
                    })

                    // Render deck page
                    .then(function() { return res.redirect('/deck/' + deck_code) })
                    .catch(e=> {
                        req.flash('error', ['An unexpected error occurred, please contact a team member.'])
                        return res.redirect('/')
                    })
                }
                else if (req.user.is_admin) {
                    // validate that the alpha score is a valid alpha score
                    if (ALPHA_SCORES.includes(req.body.alpha_score)) {
                        console.log('Alpha score set on: ' + query.dataValues.deck_id + ' ' + req.user.username + ' ' + req.body.alpha_score)
                        query.updateAlpha(req.body.alpha_score)
                        .then(function() { return res.status(200).send({ message: "Ok" }) })
                        .catch(e=> {
                            req.flash('error', ['An unexpected error occurred, please contact a team member.'])
                            return res.redirect('/')
                        })
                    }
                    else {
                        throw new Error('Invalid Alpha Score')
                    }
                }
                else {
                    throw new Error('Requesting user is not admin')
                }
            }
            catch (e) {
                console.log(e)
                req.flash('error', 'Nice try, bucko ;)')
                return res.redirect('/')
            }
        })
        .catch(e=> {
            req.flash('error', ['An unexpected error occurred, please contact a team member.'])
            return res.redirect('/')
        })
    }

    // Set already scored deck to rescore
    else if (deckAction === 'alpharescore') {
        // Update the alpha status
        // Get the requested deck
        Decks.findOne({ where: { deck_code: deck_code } })
        .then(query=> {
            try {
                // if no score
                if (query.alpha_score != null && query.alpha_score != 'P') {        
                    query.updateAlpha('R' + query.alpha_score)
                    // Decrement alpha_requests by 1
                    .then(results=> { req.user.requestedAlpha(); return results })

                    // Render deck page
                    .then(function() { return res.redirect('/deck/' + deck_code) })

                    .catch(e=> {
                        req.flash('error', ['An unexpected error occurred, please contact a team member.'])
                        return res.redirect('/')
                    })
                }
            }
            catch (e) {
                console.log(e)
                req.flash('error', 'Nice try, bucko ;)')
                return res.redirect('/')
            }
        })
        .catch(e=> {
            req.flash('error', ['An unexpected error occurred, please contact a team member.'])
            return res.redirect('/')
        })
    }
})

// admin pages
app.get("/admin/:path", isAdmin, isAuthenticated, function(req, res) {
    var path = req.params.path

    // render the paths
    if (path == 'landing') {
        res.render('admin.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user })
    }
    else if (path == 'alpha') {
        // Get all decks pending an alpha score then render
        // Alpha score is either P or starts with R
        // Alpha scores with R store the prior score following e.g. RF RA+ RC-
        Decks.findAll({
            where: { [Op.or]: [{ alpha_score: 'P' }, { alpha_score: { [Op.like]: 'R%' } }] },
            order: [['updatedAt', 'ASC' ]],
        })
        .then(results=> { res.render('alpha.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, query: results }) })
        .catch(e=> {
            req.flash('error', ['An unexpected error occurred, please contact a team member.'])
            return res.redirect('/')
        })
    }
    else if (path == 'scoreAdj') {
        // Adjust the scores and get attributes of all decks
        deckFunctions.adjustScoreOnAllDecks()
        .then(function () {
            req.flash('error', ['Score Adjustments Updated. That better have been important...'])
            res.render('admin.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user }) 
        })
        .catch(e=> {
            req.flash('error', ['An unexpected error occurred, please contact a team member.'])
            return res.redirect('/')
        })
    }
    else if (path == 'rescoreAll') {
        // Adjust the scores and get attributes of all decks
        deckFunctions.rescoreAllDecks()
        .then(function () {
            req.flash('error', ['All decks have been rescored. That better have been important...'])
            res.render('admin.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user }) 
        })
        .catch(e=> {
            req.flash('error', ['An unexpected error occurred, please contact a team member.'])
            res.render('admin.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user }) 
        })
    }
    else if (path == 'setUnlimited') {
        // Sets unlimited users and updates all patreon tiers/rewards manually
        userFunctions.setUnlimited()
        .then(function() {
            userFunctions.updateTiers()
            .then(async function () {
                return userFunctions.processRewards()
                .then(async function () {
                    return userFunctions.offloadOldPatreons()
                })
                .catch(function() {
                    console.log("processRewardsError")
                })
            })
            .catch(function() {
                console.log("updateTiersError")
            })
        })
        .then(function () {
            req.flash('error', ['Unlimited users have been initialized.'])
            res.render('admin.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user }) 
        })
        .catch(e=> {
            req.flash('error', ['An unexpected error occurred, please contact a team member.'])
            res.render('admin.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user }) 
        })
    }
})



// Password Reset Page and Logic
app.get('/forgot', (req, res) => {
    res.render('forgot.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user })
})

app.post('/forgot', async (req, res) => {
    const user_email = req.body.email

    if (user_email == null) {
      req.flash('success', ['If that email has an account, it has been sent a password reset'])
      return res.redirect('/forgot')
    }

    const token = (await util.promisify(crypto.randomBytes)(20)).toString('hex')

    // Set token and expiry time
    userFunctions.setToken(user_email, token, Date.now() + 3600000)
  
    const reset_email = {
      to: user_email,
      from: process.env.MAIL_USER,
      subject: 'Draw Better Cards Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.
            
Please click on the following link, or paste this into your browser to complete the process:
https://${req.headers.host}/reset/${token}
            
If you did not request this, please ignore this email and your password will remain unchanged.

    Draw Better Cards and Make Better Passwords!
      `,
    }
  
    await transporter.sendMail(reset_email)

    console.log("Password Reset Token Sent: %s", user_email)
    req.flash('success', ['If that email has an account, it has been sent a password reset'])
    res.redirect('/login')
});
  
app.get('/reset/:token', (req, res) => {
    userFunctions.getUserObjectFromToken(req.params.token)
    .then(user=> {
        // Reset token is invalid, redirect to login
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.')
            return res.redirect('/login')
        }
    
        // Reset token is valid, render page
        res.render('reset.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, token: req.params.token })
    })
    .catch(e=> {
        req.flash('error', ['An unexpected error occurred, please contact a team member.'])
        return res.redirect('/')
    })
})
  
app.post('/reset/:token', async (req, res) => {
    userFunctions.getUserObjectFromToken(req.params.token)
    .then(async user=> {
        // Reset token is invalid
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.')
            return res.redirect('/forgot')
        }


        // Reset token is valid, check if password length is valid
        if (typeof req.body.password === 'string' && req.body.password.length < 10) {
            req.flash('error', 'Password should be at least 10 characters long')
            return res.redirect('/reset/' + req.params.token)
        }
        
        
        
        // Update password and set token info to null
        user.password = await bcrypt.hash(req.body.password, 13)
        user.resetPasswordToken = null
        user.resetPasswordExpires = null
        await user.save()
    
        const resetEmail = {
            to: user.email,
            from: process.env.MAIL_USER,
            subject: 'Your Password Has Been Changed',
            text: `This is a confirmation that the password for your Draw Better Cards account has just been changed.

    Happy forging!
            `,
        }
    
        await transporter.sendMail(resetEmail)
        console.log("Password Reset Confirmation Sent: %s", user.email)

        req.flash('success', ['Success! Your password has been changed.'])
        return res.redirect('/')
    })
    .catch(e=> {
        console.log()
        req.flash('error', 'Error resetting passsword')
        return res.redirect('/forgot')
    })
})


// 404 page
app.get('*', function(req, res){
    console.log('Invalid Path: ' + req.url)
    return res.status(404).render('404.ejs', { user: req.user, isLoggedIn: req.isAuthenticated() });
})

// 500 Server Error
// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
    console.log(err.message)
    req.flash('error', ['An unexpected error occurred, please contact a team member.'])
    return res.redirect('/')
});








// Middleware
const code_re = /^\w{8}-(\w{4}-){3}\w{12}$/;
const link_re = /\w{8}-(\w{4}-){3}\w{12}/;

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}

function isNOTAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }

    next()
}

function validateInput(req, res, next) {
    var error_messages =  []

    if (typeof req.body.username === 'string' && req.body.username.length < 4) {
        error_messages.push('Username should be at least 4 characters long')
    }
    if (typeof req.body.password === 'string' && req.body.password.length < 10) {
        error_messages.push('Password should be at least 10 characters long')
    }
    if (typeof req.body.email === 'string' && req.body.email.length < 6) {
        error_messages.push('Email should be at least 6 characters long')
    }

    if (error_messages.length > 0) {
        req.flash('error', error_messages)
        return res.redirect('register')
    }
    
    next();
}

function isValidCode(req, res, next) {
    if (code_re.test(req.params.deck_code)) {
        return next()
    }
    else {
        res.status(404).render('404.ejs', { user: req.user, isLoggedIn: req.isAuthenticated() });
    }
}

function doesDeckExist(req, res, next) {
    // Check that the deck is not already imported
    try {
        var deck_code = link_re.exec(req.body.deckLink)[0]
    }
    catch {
        req.flash('error', 'Error importing deck, invalid deck code')
        return res.redirect('/')
    }

    if (code_re.test(deck_code)) {
        Decks.findOne({
            where: { deck_code: deck_code }
        }).then(results=> {
            if (results != null) {
                // Deck already exists, redirect to deck page
                req.flash('success', 'Deck already imported')
                return res.redirect('/deck/' + results.dataValues.deck_code)
            }
            else {
                // Deck does not exist
                return next()
            }
        })
        .catch(e=> {
            req.flash('error', 'Error importing deck, invalid deck code')
            return res.redirect('/')
        })
    }
    else {
        // Invalid deck code provided
        req.flash('error', 'Error importing deck, invalid deck code')
        return res.redirect('/')
    }
}

function isAdmin (req, res, next) {
    if (req.user) {
        if (req.user.is_admin === true) {
            return next()
        }
    }

    return res.status(404).redirect('/404')
}

function passedCaptcha(req, res, next) {
    if (req.session.captcha === req.body.captcha) {
        return next()
    }

    req.flash('error', ['Invalid captcha'])
    res.redirect('/register')
}

function queryToHTML(query) {
    var output = ''
    var alpha = ''

    try {
        for (var i = 0; i < Object.keys(query).length; i++) {
            alpha = query[i]["dataValues"]["alpha_score"]
            if (alpha == null || alpha ==='P' || alpha[0] === 'R') {
                alpha = '-'
            }

            output += '<tr>'
            output += '<td>' + query[i]["dataValues"]["adj_score"] + '</td>'
            output += '<td>' + alpha + '</td>'
            output += '<td><a href= "/deck/' + query[i]["dataValues"]["deck_code"] + '">' + query[i]["dataValues"]["deck_name"] + '</a></td>'
            output += '<th><img src= "rsrc/set_' + query[i]["dataValues"]["set_id"] + '.png" width="32px" height="32px" /></th>'
            output += '<td><img src= "rsrc/house_' + query[i]["dataValues"]["house1"] + '.png" width="48px" height="48px" />'
            output += '<img src= "rsrc/house_' + query[i]["dataValues"]["house2"] + '.png" width="48px" height="48px" />'
            output += '<img src= "rsrc/house_' + query[i]["dataValues"]["house3"] + '.png" width="48px" height="48px" /></td>'
            output += '</tr>'
        }
    }
    catch (e) {
        console.log('Error converting query to HTML')
        return '<div class="text-danger">No results found</div>'
    }

    return output
}



// development server, not https encrypted
if (process.env.NODE_ENV !== 'production') {
    app.set('trust proxy', 1)
    
    app.listen(process.env.PORT, async () => {
        console.log(`App listening at localhost:${process.env.PORT}`)
        try {
            await sequelize.sync()
            console.log('Connected to database')
        }
        catch (e) {
            console.error(`Error: Cannot connect to database ${e}`)
        }
    })
}

// prod server, https encrypted
else if (process.env.NODE_ENV == "production") {
    // require HTTPS connections
    app.use(helmet.hsts());

    // trust proxy
    const cloudflareIPs = require('cloudflare-ips');
    cloudflareIPs(
        ips => app.set('trust proxy', ['loopback', ...ips]),
        err => console.error(err.stack),
    );

    // setup pki certs
    const options = {
        key: fs.readFileSync("certs/server.key"),
        cert: fs.readFileSync("certs/certificate.crt"),
        ca: fs.readFileSync('certs/intermediate.crt')
    };
        
    const server = https.createServer(options, app)
        .listen(process.env.PORT, process.env.HOST, async () => {
            console.log(`App listening at localhost:${process.env.PORT}`)
            try {
                await sequelize.sync()
                console.log('Connected to database')
            }
            catch (e) {
                console.error(`Error: Cannot connect to database ${e}`)
            }
        }
    );

    server.setTimeout(30000, (socket) => {
        socket.destroy();
    });
}


