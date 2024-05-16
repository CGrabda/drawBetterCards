# Draw Better Cards
A Deck Assessment Tool for the KeyForge Community
https://drawbetter.cards

---

<!-- TOC -->

- [Motivation](#motivation)
- [Features](#features)
- [What we Learned](#what-we-learned)
- [Technologies Used](#technologies-used)
- [Team](#team)

<!-- /TOC -->

## Motivation

In the community for the card game KeyForge, for years there has been a single rating system used to assess decks. This site does not aim to be a collection management system, unlike Decks of KeyForge, but it does aim to provide an additional heuristic for deck assessment. This scoring system was already created and popularized by a member of the community, but it required manually typing each card name into a spreadsheet, so I wanted to provide value to the community through making it more accessible.

## Features

- Uses a PostgreSQL database to store all information
- Uses Express session along with API endpoint and token security protections to securely authenticate users
- Uses the Sequelize ORM to securely make queries, manage database relationships, and manage transactions
- Communicates with the KeyForge API to retrieve deck information and process it
- Leverages session information along with EJS for secure user data management

## What we Learned

Load balancing is important! The initial plan for this site did not include it and the changes would require restructuring the server. Should I make another website I would plan to use NGINX as a proxy server with the Express backend.

Web development projects need deadlines! You can spend as long as you would like on web development and still not have a finished product at the end of the day. 

Planning is everything! I spent two weeks planning the project but should have allocated more time for planning.

## Technologies Used

![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)


![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)![Inkscape](https://img.shields.io/badge/Inkscape-e0e0e0?style=for-the-badge&logo=inkscape&logoColor=080A13)

## Team

| [![Christopher Grabda](https://github.com/CGrabda.png?size=100)](https://github.com/CGrabda) |
|---|
| [Christopher Grabda](https://www.linkedin.com/in/christopher-grabda/) |
