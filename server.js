"use strict";
require('dotenv').config()
const express = require('express')
const app = express()


// node package requirements
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const passport = require('passport')
const fs = require('fs')
const helmet = require('helmet')
const hpp = require('hpp')
const https = require('https')
const moment = require('moment')
const svgCaptcha = require('svg-captcha-fixed');
const toobusy = require('toobusy-js');
const path = require('path');

// db models
const sequelize = require('./app/db.js')
const { DataTypes, Op } = require("sequelize")
const User = require('./app/models/user.js')(sequelize, DataTypes)
const Decks = require('./app/models/deck.js')(sequelize, DataTypes)
const Houses = require('./app/models/house.js')(sequelize, DataTypes)
const Pods = require('./app/models/pod.js')(sequelize, DataTypes)
const Cards = require('./app/models/card.js')(sequelize, DataTypes)
const Sets = require('./app/models/set.js')(sequelize, DataTypes)
const {PythonShell} = require('python-shell')
const deckFunctions = require('./app/deckFunctions.js');

require('./app/passport.js')


// Express Middleware
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false, limit: "1kb" }))
app.use(express.json({ limit: "1kb" }))
app.use(flash())
app.use(session({
    cookie: {
        maxAge: 604800000,
        sameSite: true,
        httpOnly: true,
        
    },
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(express.static('public'));
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
app.use(passport.initialize())
app.use(passport.session())
//app.disable('x-powered-by') handled by helmet, changed


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
        res.status(503).send("Server Too Busy");
    } else {
    next();
    }
});



// SQL relationships
// Associate deck houses with house ids
Decks.belongsTo(Houses, { as: "house_1", foreignKey: "house1", targetKey: "house_id" })
Decks.belongsTo(Houses, { as: "house_2", foreignKey: "house2", targetKey: "house_id" })
Decks.belongsTo(Houses, { as: "house_3", foreignKey: "house3", targetKey: "house_id" })
Pods.belongsTo(Houses, { foreignKey: "house_id", targetKey: "house_id" })

// Associate each card in a deck with its information
Pods.belongsTo(Cards, { as: "card_1", foreignKey: "card1", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_2", foreignKey: "card2", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_3", foreignKey: "card3", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_4", foreignKey: "card4", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_5", foreignKey: "card5", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_6", foreignKey: "card6", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_7", foreignKey: "card7", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_8", foreignKey: "card8", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_9", foreignKey: "card9", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_10", foreignKey: "card10", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_11", foreignKey: "card11", targetKey: "card_id" })
Pods.belongsTo(Cards, { as: "card_12", foreignKey: "card12", targetKey: "card_id" })

// Associate deck hash between pods and decks
Decks.hasMany(Pods, { foreignKey: "deck_id", targetKey: "deck_id" })

// Associate sets between Deck and Set
Decks.belongsTo(Sets, { foreignKey: "set_id" } )


// Misc variables declared for functions
const ALPHA_SCORES = ['F', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+']


// Routes
// landing page
app.get('/', (req, res) => {
    Promise.all([
        Decks.findAll({
            where: { hidden: false },
            limit: 5,
            order: [['score', 'DESC' ], ['createdAt', 'DESC']],
        }), 
        Decks.findAll({
            where: {
                [Op.and]: [
                    { createdAt: {[Op.gte]: moment().subtract(30, 'days').toDate()} },
                    { hidden: false }
                ]
            },
            limit: 5,
            order: [['createdAt', 'DESC' ]]
        })
    ])
    .then(queries=> {
        return res.render('index.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, queryTop: queries[0], queryRecent: queries[1] })
    }).catch(e=>{ console.log(e); return res.render('index.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, queryTop: null, queryRecent: null }) });
})


// login page
app.get('/login', isNOTAuthenticated, (req, res) => {
    res.render('login.ejs', { isLoggedIn: req.isAuthenticated() })
})

// Post login
app.post('/login', isNOTAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
    }),
    (req, res) => {
        res.status(200).send({ message: 'Successful Authentication' })
    }
)


// Register page
app.get('/register', isNOTAuthenticated, (req, res) => {
    var captcha = svgCaptcha.create({
        size: 6,
        ignoreChars: '0o1iIlJ', // filter out some characters like 0o1i
        noise: 4, // number of noise lines
        color: true
    });
    req.session.captcha = captcha.text;
    
    res.render('register.ejs', { captcha_image: captcha.data, isLoggedIn: req.isAuthenticated() })
})

// Post register
app.post('/register', isNOTAuthenticated, passedCaptcha, validateInput, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 13)
        User.create({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        })
        .then(function() {
            console.log(`Created User ${req.body.username}`)
            res.redirect('/login')
        }).catch(function () {
            req.flash('error', 'User or Email already taken')
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
        res.redirect('/')
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
            PythonShell.run(process.env.SCRIPT_PATH, options)
            .then(messages=>{
                // messages is an array of the output from execution
                // console.log(messages[0])
                if (messages[0] instanceof Error) {
                    return new Error('Deck import error')
                }
                output = JSON.parse(messages[0])

                // Add deck to database
                console.log('Importing ' + output["deck_info"]["name"])
                return deckFunctions.addDeck(output["deck_info"], output["pod_info"], req.user.id, req.body.hidden).catch(e => {
                    console.log(e)
                    return new Error('Deck add Error')
                });
            })
            .then(output=> {
                if (output instanceof Error) {
                    throw output
                }

                // Decrement Imports by 1
                req.user.importedDeck()
                res.redirect('/deck/' + output)
            }).catch(e => { console.log(e); req.flash('error', 'Error importing deck, contact a team member'); res.redirect('/'); });
        }
        catch (PythonShellError) {
            req.flash('error', 'Error importing deck, contact a team member')
            console.log('Error importing deck')
            console.log(PythonShellError)
            res.redirect('/')
            return
        }
    }
    else {
        req.flash('error', 'No imports available')
        res.redirect('/')
    }
})


// Mydecks page
app.get('/mydecks', isAuthenticated, (req, res) => {
    // Visit mydecks page, deck rendering is handled by /load/mydecks
    res.render('mydecks.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user })
})


// Search/All Decks page
app.get('/search', (req, res) => {
    // Visit search page, deck rendering is handled by /load/search
    res.render('search.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user })
})


// Load post, for search pagination
// eslint-disable-next-line no-unused-vars
app.post('/load/:search', (req, res, next) => {
    // if loading mydecks page
    if (req.params.search == "mydecks") {
        return Decks.findAll({
            // Request originating from mydecks page
            limit: 15,
            offset: 15 * req.body.page,
            where: { owner_id: req.user.id },
            order: [['score', 'DESC'], ['createdAt', 'DESC']]
        })
        .then(results=> {
            return res.json({ html: queryToHTML(results) })
        })
    }
    else if (req.params.search == "search") {
        return Decks.findAll({
            // Request originating from search page
            limit: 15,
            offset: 15 * req.body.page,
            where: { hidden: false },
            order: [['score', 'DESC'], ['createdAt', 'DESC']]
        })
        .then(results=> {
            return res.json({ html: queryToHTML(results) })
        })
    }
    else {
        //error
        return
    }
})


// deck pages
app.get("/deck/:deck_code", isValidCode, function(req, res) {
    // retrieve deck code from subdomain
    var path = req.params.deck_code

    // retrieve deck
    Decks.findOne({
        where: { deck_code: path },
        include: { all: true , nested: true }
    })
    .then(results=> {
        if (results == null) {
            throw new Error();
        }

        // If deck is hidden
        if (results.dataValues.hidden) {
            // See if user is authenticated
            if (typeof req.user === 'undefined') {
                req.flash('error', 'Error viewing deck, contact a team member')
                return res.redirect('/')
            }
            // Check that the authenticated user is the deck owner
            else if (req.user.id == results.owner_id) {
                return res.render('deck.ejs', { query: results, isLoggedIn: req.isAuthenticated(), user: req.user })
            }
            // Else, error the person trying to view is not the owner
            else {
                req.flash('error', 'Error viewing deck, contact a team member')
                return res.redirect('/')
            }
        }
        else {
            // If deck is not hidden, display
            return res.render('deck.ejs', { query: results, isLoggedIn: req.isAuthenticated(), user: req.user })
        }
    }).catch(e=> { req.flash('error', 'Error viewing deck, contact a team member'); console.log(e); res.redirect('/'); })
})


// Post deckaction, hide/unhide toggle or alpha scoring
// eslint-disable-next-line no-unused-vars
app.post('/deck/:deck_code/:deckAction', isAuthenticated, isValidCode, (req, res, next) => {
    // Hide a deck
    var path = req.params.deck_code
    var deckAction = req.params.deckAction

    if (deckAction === 'hide') {
        // Get the requested deck
        Decks.findOne({
            where: { deck_code: path }
        }).then(results=> {
            try {
                // Check if the deck owner is the requester
                if (req.user.id == results.owner_id) {
                    if (results.hidden) {
                        deckFunctions.hideDeck(path, false)
                        return res.redirect('/deck/' + results.deck_code)
                    }
                    else {
                        deckFunctions.hideDeck(path, true)
                        return res.redirect('/deck/' + results.deck_code) 
                    }
                }
                else {
                    throw new Error('Deck owner is not the requesting user')
                }
            }
            catch (e) {
                console.log(e)
                req.flash('error', 'Nice try, bucko ;)')
                return res.redirect('/')
            }
        })
    }
    else if (deckAction === 'alpha') {
        // Update the alpha status
        // Get the requested deck
        Decks.findOne({ where: { deck_code: path } })
        .then(query=> {
            try {
                // if no score
                if (query.alpha_score == null) {
                    // Check if the deck owner is the requester
                    if (req.user.id == query.owner_id) {
                        deckFunctions.updateAlpha(path, "P")
                        // Decrement alpha_requests by 1
                        .then(results=> { req.user.requestedAlpha(); return results })
                        .then(function() { return res.redirect('/deck/' + query.deck_code) })
                    }
                    else {
                        throw new Error('Deck owner is not the requesting user')
                    }
                }
                else if (req.user.is_admin) {
                    // validate that the alpha score is a valid alpha score
                    if (ALPHA_SCORES.includes(req.body.alpha_score)) {
                        deckFunctions.updateAlpha(path, req.body.alpha_score)
                        .then(function() { return res.status(200).send({ message: "Ok" }) })
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
    }
})

// admin pages
app.get("/admin/:path", isAuthenticated, isAdmin, function(req, res) {
    var path = req.params.path

    // render the paths
    if (path == 'landing') {
        res.render('admin.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user })
    }
    else if (path == 'alpha') {
        Decks.findAll({
            where: { alpha_score: "P" },
            order: [['updatedAt', 'ASC' ]],
        })
        .then(results=> { res.render('alpha.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user, query: results }) })
    }
})

// 404 page
app.use(function(req, res, next) {
    var err = new Error('Not Found')
    console.log(req.url)
    res.status(404).render('404.ejs', { user: req.user, isLoggedIn: req.isAuthenticated() });
    next(err)
})

// 500 Server Error
app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
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

    if (req.body.username.length < 4) {
        error_messages.push('Usersname should be at least 4 characters long')
    }
    if (req.body.password.length < 10) {
        error_messages.push('Password should be at least 10 characters long')
    }
    if (req.body.email.length < 6) {
        error_messages.push('Email should be at least 6 characters long')
    }

    if (error_messages.length > 0) {
        req.flash('error', error_messages)
        return res.render('register.ejs')
    }
    
    next();
}

function isValidCode(req, res, next) {
    if (code_re.test(req.params.deck_code)) {
        return next()
    }
    else {
        res.status(404).render('404.ejs');
    }
}

function doesDeckExist(req, res, next) {
    // Check that the deck is not already imported
    var deck_code = link_re.exec(req.body.deckLink)[0]

    if (code_re.test(deck_code)) {
        Decks.findOne({
            where: { deck_code: deck_code }
        }).then(results=> {
            if (results != null) {
                // Deck already exists, redirect to deck page
                return res.redirect('/deck/' + results.dataValues.deck_code)
            }
            else {
                // Deck does not exist
                return next()
            }
        })
    }
    else {
        // Invalid deck code provided
        req.flash('error', 'Error importing deck, invalid deck code')
        return res.redirect('/')
    }
}

function isAdmin (req, res, next) {
    if (req.user.is_admin === true) {
        return next()
    }

    res.status(404).redirect('404.ejs')
}

function passedCaptcha(req, res, next) {
    if (req.session.captcha === req.body.captcha) {
        return next()
    }

    req.flash('error', 'Invalid captcha')
    res.redirect('/register')
}

function queryToHTML(query) {
    var output = ''
    var alpha = ''

    for (var i = 0; i < Object.keys(query).length; i++) {
        alpha = query[i]["dataValues"]["alpha_score"]
        if (alpha ==='P' || alpha == null) {
            alpha = '-'
        }

        output += '<tr>'
        output += '<td>' + query[i]["dataValues"]["score"] + '</td>'
        output += '<td>' + alpha + '</td>'
        output += '<td><a href= "/deck/' + query[i]["dataValues"]["deck_code"] + '">' + query[i]["dataValues"]["deck_name"] + '</a></td>'
        output += '<th><img src= "rsrc/set_' + query[i]["dataValues"]["set_id"] + '.png" width="32px" height="32px" /></th>'
        output += '<td><img src= "rsrc/house_' + query[i]["dataValues"]["house1"] + '.png" width="48px" height="48px" />'
        output += '<img src= "rsrc/house_' + query[i]["dataValues"]["house2"] + '.png" width="48px" height="48px" />'
        output += '<img src= "rsrc/house_' + query[i]["dataValues"]["house3"] + '.png" width="48px" height="48px" /></td>'
        output += '</tr>'
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


