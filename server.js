require('dotenv').config()
const express = require('express')
const app = express()

if (process.env.NODE_ENV !== 'production') {
    app.set('trust proxy', 1) 
}

// node package requirements
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const sequelize = require('./app/db.js')
const { DataTypes, json } = require("sequelize")
const User = require('./app/models/user.js')(sequelize, DataTypes)
const {PythonShell} = require('python-shell')
const deckFunctions = require('./app/deckFunctions.js')

require('./app/passport.js')


// Express Middleware
app.set('view-engine', 'ejs')
app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(session({
    cookie: {
        maxAge: 604800000,
        sameSite: true
    },
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

app.disable('x-powered-by')



// Routes
// landing page
app.get('/', (req, res) => {
    res.render('index.ejs', { isLoggedIn: req.isAuthenticated(), user: req.user })
})


// login page
app.get('/login', isNOTAuthenticated, (req, res) => {
    res.render('login.ejs')
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
app.get('/register', isNOTAuthenticated, (req, res, next) => {
    res.render('register.ejs')
})

// Post register
app.post('/register', isNOTAuthenticated, validateInputLength, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        await User.create({
            username: req.body.name,
            email: req.body.email,
            password: hashedPassword
        })
        console.log(`Created User ${req.body.name}`)
        res.redirect('/login')
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
app.post('/import', isAuthenticated, (req, res, next) => {
    var options = {
        mode: 'text',
        pythonPath: process.env.PYTHON_PATH,
        args: [req.body.deckLink]
    }

    try {
        PythonShell.run(process.env.SCRIPT_PATH, options).then(messages=>{
            // messages is an array of the output from execution
            // console.log(messages[0])
            var output = JSON.parse(messages[0])

            // Add deck to database
            deckFunctions.addDeck(output["deck_info"], output["pod_info"], req.user.id).catch(e => {
                req.flash('error', e.message)
                res.redirect('/')
            })
            console.log("Importing " + output["deck_info"]["name"])
        }).catch(e => { console.log(e) });
    }
    catch (PythonShellError) {
        req.flash('error', 'Error importing deck, contact a team member')
        console.log('Error importing deck, contact a team member')
    }

})


// Mydecks page
app.get('/mydecks', isAuthenticated, (req, res) => {
    res.render('mydecks.ejs', { user: req.user })
    console.log(req)
})


// 404 page
app.use(function(req, res){
    res.status(404).render('404.ejs');
})





// Middleware
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

function validateInputLength(req, res, next) {
    error_messages =  []

    if (req.body.name.length < 4) {
        error_messages.push('Username should be at least 4 characters long')
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