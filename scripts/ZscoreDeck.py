'''
Written by SoutherlyElf
'''
import re
from sys import argv, exit
from csv import reader
from json import loads, dumps
from requests import request
from time import sleep

scoreFile = "./scripts/data/scoreDict.json"

TOKENS = {
    "Berserker": 1,
    "Warrior": 2,
    "Skirmisher": 3,
    "Grumpus": 4,
    "Strange Shell": 5,
    "Diplomat": 6,
    "Trader": 7,
    "Prospector": 8,
    "Blorb": 9,
    "Grunt": 10,
    "Rebel": 11,
    "Researcher": 12,
    "Disciple": 13,
    "Cleric": 14,
    "Defender": 15,
    "Squire": 16,
    "Bellatoran Warrior": 17,
    "Scholar": 18,
    "Senator": 19,
    "Trooper": 20,
    "AEmberling": 21,
    "Cadet": 22,
    "Explorer": 23,
    "B0-T": 24,
    "Cultist": 25,
    "Fish": 26,
    "Priest": 27,
    "Raider": 28
}

with open(scoreFile) as file:
    scoreDict = loads(file.readline())

debug = False

requestHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-us",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "TE": "trailers"
}

IDENTIFY_HOUSE = {
    "score_adjustment": "1",
    "Brobnar": "2",
    "Dis": "3",
    "Logos": "4",
    "Mars": "5",
    "Sanctum": "6",
    "Shadows": "7",
    "Untamed": "8",
    "Saurian": "9",
    "Star Alliance": "10",
    "Unfathomable": "11",
    "Ekwidon": "12",
    "Geistoid": "13"
}

IDENTIFY_SET = {
    "341": ("COTA", 1),
    "435": ("AOA", 2),
    "452": ("WC", 3),
    "453": ("Anomaly", 0),
    "479": ("MM", 4),
    "496": ("DT", 5),
    "600": ("WOE", 6),
    "601": ("U23", 1001),
    "609": ("VM", 500),
}


def validateLink(deckLink):
    '''
    Ensures that the deck is valid before making any requests
    An invalid match returns True which causes analyzeDeck to return
    '''
    # parse url to get deck id
    deckCode = re.search("\w{8}\-(\w{4}\-){3}\w{12}", deckLink)
    
    if deckCode == None:
        print("There was an error finding the deck code within the link")
        return True, None
    
    else:
        return False, { "code": deckCode.group(0) }


def getDeck(deckLink):
    '''
    Takes a DoK or MasterVault link, or any value with a deck ID embedded
    Requests the MasterVault API for the decklist
    '''
    # parse url to get deck id
    deckId = re.search("\w{8}\-(\w{4}\-){3}\w{12}", deckLink)
    
    if deckId == None:
        print("There was an error finding the deck code within the link")
        return None
    

    response = request("GET", "https://www.keyforgegame.com/api/decks/" + deckId[0] + "/?links=cards,notes", headers=requestHeaders)

    return loads(response.text)


def parseDecklist(cardIdList, response):
    '''
    Takes the list of card ID's and turns it into a list of card objects
    '''
    cardCount = {}
    idSet = set()
    matchDict = {}
    decklist = []
    enhancements = None

    # Makes a dictionary of cardId:cardObject
    for card in response["_linked"]["cards"]:
        # Makes a dictionary referencing cardId to card object
        # This is done because duplicates within the deck are shown within the card id's, there is only one object per card
        matchDict[card["id"]] = card
    
    # Counts the number of each id in the 
    for cardId in cardIdList:
        # stores all the unique id's
        idSet.add(cardId)

        # adjusts the card count by id
        try:
            cardCount[cardId] += 1

        except:
            cardCount[cardId] = 1

    # Makes the card object list of tuples from the card id set of unique id's
    for cardId in idSet:    
        decklist.append((matchDict[cardId], cardCount[cardId]))


    # For parsing enhancement data
    enhancementDict = {
        "amber": 0,
        "capture": 1,
        "damage": 2,
        "draw": 3,
        "discard": 4
    }


    # Retrieve enhancement data
    if len(response["data"]["bonus_icons"]) > 0:
        enhancements = []
        for bonus in response["data"]["bonus_icons"]:
            card = matchDict[bonus["card_id"]]
            try:
                cardID = int(str(IDENTIFY_SET[str(card["expansion"])][1]) + str(card["card_number"]))
            except ValueError:
                # Handle enhancements on anomalies, set the cardId
                cardName = card["card_title"]

                if cardName == "Orb of Wonder":
                    cardID = 4173
                
                elif cardName == "Valoocanth":
                    cardID = 5350
                    
                elif (card["card_number"][0]) == "A":
                    if (cardName[0] == "E" or cardName[0] == "C" or cardName[:2] == "Ne"):
                        setNum = 6
                    else:
                        setNum = 3
                    cardID = -int(str(setNum) + str(card["card_number"][1:]))
            

            enhancements.append([cardID, [enhancementDict[pip] for pip in bonus["bonus_icons"]]])


    
    return (decklist, enhancements)


def getScore(decklist, pods, deckInfo):
    '''
    Takes the set of each card and finds the score of that card within its set
    Sums all of the scores and returns that value
    '''
    score = 0


    for card in decklist:
        # card[0] is the card object, card[1] is the count

        # Card score is the raw score with adjustment
        cardScore = 0

        # Saves the name of the card, this is to handle specials
        cardName = card[0]["card_title"]

        # Saves the name of the set, this is to handle specials
        setTuple = IDENTIFY_SET[str(card[0]["expansion"])]
        cardSet = setTuple[0]
        setNum = setTuple[1]

        try:
            # Create the card ID
            cardID = int(str(setNum) + str(card[0]["card_number"]))

            # retrieves the full scoring object of the card from the scoring dictionary
            try:
                cardDetails = scoreDict[cardSet][cardName]
            except:
                # Attempt to handle special characters æ and Æ in names
                # (which are omitted from the spreadsheet)
                cardName = cardName.replace("Æ", "AE").replace("æ", "ae").replace("’", "'").replace("”", "\"").replace("“", "\"")

                # Replace Ekwidon unicode characters with the standard letter
                if not cardName.isascii():
                    cardName = cardName.replace(u"\u0103", "a").replace(u"\u0115", "e").replace(u"\u012d", "i").replace(u"\u014f", "o").replace(u"\u016d", "u")

                try:
                    cardDetails = scoreDict[cardSet][cardName]
                except:
                    # Master Vault fix, attempts to use the set of the deck
                    cardSet = deckInfo["setName"]
                    cardDetails = scoreDict[cardSet][cardName]

        except KeyError as e:
            # Handle special cards
            tokens = cardName.lower().split(" ")
            firstWord = tokens[0]

            # Initialize as blank to establish the exception is handled by containing a value
            oldCardName = cardName
            cardName = None

            # The Tide
            if oldCardName == "The Tide":
                continue

            
            else:
                # It's coming
                if firstWord == "it's":
                    cardName = "It's Coming"
                    cardDetails = scoreDict["MM"][cardName]

                # MM Velum/Hyde (WC is covered in document)
                elif firstWord == "hyde":
                    cardName = "Hyde/Velum"
                    cardDetails = scoreDict["MM"][cardName]
                    cardID = 4104
                elif firstWord == "velum":
                    cardName = "Hyde/Velum"
                    cardDetails = scoreDict["MM"][cardName]
                    cardID = 4118
                
                # TT for non-COTA sets
                elif firstWord == "timetraveller":
                    cardName = "Timetraveller"
                    cardDetails = scoreDict["COTA"][cardName]
                    cardID = 1153
                    cardSet = "COTA"
                
                # HFFS for non-COTA sets
                elif firstWord == "help":
                    cardName = "Help From Future Self"
                    cardDetails = scoreDict["COTA"][cardName]
                    cardID = 1111
                    cardSet = "COTA"

                # Hings/Gross from non-DT sets
                elif firstWord == "com.":
                    if tokens[2] == "hings":
                        cardName = "Com. Officer Hings"
                        cardID = 5250
                    elif tokens[2] == "gross":
                        cardName = "Com. Officer Gross"
                        cardID = 5251
                    
                    cardDetails = scoreDict["DT"][cardName]
                    cardSet = "DT"
                
                # Z-Force from non-DT sets
                elif firstWord[0] == "z":
                    if tokens[1] == "agent":
                        cardName = "Z-Force Agent 14"
                        cardID = 4252

                    elif tokens[1] == "tracker":
                        cardName = "Z-Particle Tracker"
                        cardID = 4253

                    elif tokens[1] == "blaster":
                        cardName = "Z-Ray Blaster"
                        cardID = 4255

                    elif tokens[1] == "emitter":
                        cardName = "Z-Wave Emitter"
                        cardID = 4256
                        
                    cardDetails = scoreDict["MM"][cardName]
                    cardSet = "MM"
                
                # Dexus from non-WC decks
                elif firstWord == "dexus":
                    cardName = "Dexus"
                    cardDetails = scoreDict["WC"][cardName]
                    cardID = 3124
                    cardSet = "WC"

                # Toad from non-WC decks
                elif firstWord == "toad":
                    cardName = "Toad"
                    cardDetails = scoreDict["WC"][cardName]
                    cardID = 3405
                    cardSet = "WC"

                # Scylla from non-MM decks
                elif firstWord == "scylla":
                    cardName = "Scylla"
                    cardDetails = scoreDict["MM"][cardName]
                    cardID = 4230
                    cardSet = "MM"

                # Charybdis from non-MM decks
                elif firstWord == "charybdis":
                    cardName = "Charybdis"
                    cardDetails = scoreDict["MM"][cardName]
                    cardID = 4234
                    cardSet = "MM"

                # Gigantic creatures
                # Ultra Gravitron
                elif firstWord == "ultra":
                    cardName = "Ultra Big Set"
                    cardDetails = scoreDict["MM"][cardName]
                    cardSet = "MM"

                # Niffle Kong
                elif firstWord == "niffle":
                    cardName = "Kong Big Set"
                    cardDetails = scoreDict["MM"][cardName]
                    cardSet = "MM"

                # Deusillus
                elif firstWord == "deusillus":
                    cardName = "Deus Big Set"
                    cardDetails = scoreDict["MM"][cardName]
                    cardSet = "MM"
                    
                # WC Mega Brobnar creatures
                elif firstWord == "mega":
                    cardName = oldCardName[5:]
                    cardDetails = scoreDict["WC"][cardName]
                    cardSet = "WC"

                # Shiz Buggies, removes single quotes
                elif firstWord[:3] == "shi":
                    cardName = str.replace(oldCardName, "'", "")
                    cardDetails = scoreDict["WOE"][cardName]
                    cardSet = "WOE"

                # Dive Deep
                elif firstWord == "dive":
                    cardName = "Dive Deep"
                    cardSet = "DT"

                # Drawn Down
                elif firstWord == "drawn":
                    cardName = "Drawn Down"
                    cardSet = "DT"

                # Ortannu the Chained
                elif firstWord == "ortannu":
                    cardName = "Ortannu the Chained"
                    cardSet = "AoA"
                
                # Ortannu's Binding
                elif firstWord == "ortannu's":
                    cardName = "Ortannu's Binding"
                    cardSet = "AoA"

                # ---Vault Master Fixes--- #
                elif firstWord == "chenille":
                    cardName = oldCardName
                    cardSet = "DT"
                    cardID = 5375
                
                elif firstWord == "bombyx":
                    cardName = oldCardName
                    cardSet = "DT"
                    cardID = 5376
                    
                elif firstWord == "fifalde":
                    cardName = oldCardName
                    cardSet = "DT"
                    cardID = 5377


                # World's Collide variants
                # Brobnar brews
                elif len(tokens) > 1:
                    if tokens[1].lower() == "brew":
                        cardName = "Brew"
                        cardDetails = scoreDict["WC"][cardName]

                    # Dis banes
                    elif tokens[1].lower() == "bane":
                        cardName = "Bane"
                        cardDetails = scoreDict["WC"][cardName]
                    
            if cardName == None:
                print("DeckImportError")
                print(e)
                print("\nError adding the card " + card[0]["card_title"] + " to the score")
                print(cardSet, cardID)
                print("Exiting...")
                exit()


        # Handle anomaly cards
        except ValueError as e:
            if cardName == "Orb of Wonder":
                setNum = 4
                cardSet="MM"
                cardID = 4173
                cardDetails = scoreDict[cardSet][cardName]
                exceptionHandled = True
            
            elif cardName == "Valoocanth":
                setNum = 5
                cardSet="DT"
                cardID = 5350
                cardDetails = scoreDict[cardSet][cardName]
                exceptionHandled = True
                
            elif (card[0]["card_number"][0]) == "A":
                if (cardName[0] == "E" or cardName[0] == "C" or cardName[:2] == "Ne"):
                    setNum = 6
                    cardSet="WOE"
                else:
                    setNum = 3
                    cardSet = "WC"
                cardID = -int(str(setNum) + str(card[0]["card_number"][1:]))
                cardDetails = scoreDict[cardSet][cardName]
                exceptionHandled = True
            

            if not exceptionHandled:
                print("DeckImportError")
                print(e)
                print("\nError adding the anomaly " + card[0]["card_title"] + " to the score")
                print("Exiting...")
                exit()
        

        # Adds the raw score and value of multiples for all the cards and attributes
        # Multiples value is the number of cards -1 as the index for the multiples list
        # 1 card is always a multiple adjustment of 0
        
        for i in range(card[1]):
            notToken = True

            # Add to the count of card types
            cardHouse = IDENTIFY_HOUSE[card[0]["house"]]
            cardType = cardDetails["type"]

            if cardType == "Creature":
                pods[cardHouse]["creatures"] += 1
            elif cardType == "Action":
                pods[cardHouse]["actions"] += 1
            elif cardType == "Artifact":
                try:
                    pods[cardHouse]["artifacts"] += 1
                except:
                    pods[cardHouse]["artifacts"] = 1
            elif cardType == "Upgrade":
                try:
                    pods[cardHouse]["upgrades"] += 1
                except:
                    pods[cardHouse]["upgrades"] = 1
            elif cardType == "Token":
                notToken = False

            if notToken:
                # Add the card score
                tempScore = float(cardDetails["score"]) \
                    + float(scoreDict[cardSet][cardName]["multiples"][i if i<5 else 4])
                cardScore += tempScore

                # Add each of the pod scores
                pods[cardHouse]["score"] += tempScore
                pods[cardHouse]["e"] += float(cardDetails["e"])
                pods[cardHouse]["a"] += float(cardDetails["a"])
                pods[cardHouse]["c"] += float(cardDetails["c"])
                pods[cardHouse]["bob"] += float(cardDetails["bob"])

                # Handles adding values which may be null
                try:
                    pods[cardHouse]["f"] += float(cardDetails["f"])
                except:
                    pods[cardHouse]["f"] = float(cardDetails["f"])

                try:
                    pods[cardHouse]["d"] += float(cardDetails["d"])
                except:
                    pods[cardHouse]["d"] = float(cardDetails["d"])

                try:
                    pods[cardHouse]["r"] += float(cardDetails["r"])
                except:
                    pods[cardHouse]["r"] = float(cardDetails["r"])

                try:
                    pods[cardHouse]["scalingA"] += cardDetails["scalingA"]
                except:
                    pods[cardHouse]["scalingA"] = cardDetails["scalingA"]
                
                try:
                    pods[cardHouse]["wipes"] += cardDetails["wipes"]
                except:
                    pods[cardHouse]["wipes"] = cardDetails["wipes"]
                
                try:
                    pods[cardHouse]["cheats"] += cardDetails["cheats"]
                except:
                    pods[cardHouse]["cheats"] = cardDetails["cheats"]
                
                try:
                    pods[cardHouse]["tokens"] += cardDetails["tokens"]
                except:
                    pods[cardHouse]["tokens"] = cardDetails["tokens"]

                

                # Add the card to the house
                pods[cardHouse]["cards"].append(cardID)
            
            else:
                # Card is a token creature
                deckInfo["token"] = TOKENS[cardName]


        # debugging output
        # START DEBUG TEXT
        if debug:
            print()
            print("card:", cardName)
            print("count:", card[1])
            print("rawCardScore:", scoreDict[cardSet][cardName]["score"])
            print("countAdjustment:", scoreDict[cardSet][cardName]["multiples"])
            print("cardScore:", cardScore)
            print("oldDeckScore:", score)
            print("newDeckScore:", score + cardScore)
        # END DEBUG TEXT

        # Values for scoring/counting/returning
        # score/cardScore distinction is for debugging purposes
        score += cardScore

    for pod in pods:
        for value in pods[pod]:
            if pods[pod][value] == 0:
                pods[pod][value] = None
    
    return score, pods


def distributeEnhancements(scoredPods, enhancements):
    '''
    Takes the deck enhacements and distributes them to their pods

    This is done separately because the enhacement data is not stored with the card
    The other location is parsed with the deck and then enhancements are distributed
    '''
    # Retrieve the keys for iterating
    podKeys = list(scoredPods.keys())
    podKeys.remove("1")


    for pipInfo in enhancements:
        for house in podKeys:
            if pipInfo[0] in scoredPods[house]["cards"]:
                scoredPods[house]["enhancements"].append(pipInfo)
                continue

    

    return scoredPods



def analyzeDeck(deckLink):
    '''
    Queries the API for the deck
    Calculates the Z score for the deck
    prints and returns the resulting score
    '''
    # Number of retries if a request fails
    retryCount = 5

    # Validate the link
    valid, deckInfo = validateLink(deckLink)
    if valid:
        return

    # Make API request and retrieve decklist
    # This loop is for retrying requests when failed or throttled
    while(retryCount > 0):
        try:
            deckResponse = getDeck(deckLink)
            
            # Check if the response is a valid deck
            cardIdList = deckResponse["data"]["_links"]["cards"]
            deckInfo["name"] = deckResponse["data"]["name"].replace("Æ", "AE").replace("æ", "ae").replace("’", "'")
            deckInfo["setName"] = IDENTIFY_SET[str(deckResponse["data"]["expansion"])][0]
            retryCount = 0

        except Exception as e:
            # If throttled, sleep 15 seconds and retry
            if deckResponse["code"] == 429:
                #print("API request throttled, trying again in 15 seconds")
                sleep(15)

            retryCount -= 1
            if retryCount == 0:
                print(e)
                print(deckResponse)
                #print("API Error")
                return

    # Convert the list of card id's into a list of card objects
    decklist, enhancements = parseDecklist(cardIdList, deckResponse)

    # Creates the pod list
    pods = {str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][0]["id"]]):{"score":0, "e":0, "a":0, "c":0, "f":None, "d":None, "r":None, "bob":0, "scalingA":None, "wipes":None, "cheats":None, "tokens":None, "creatures":0, "actions":0, "artifacts":None, "upgrades":None, "cards":[], "enhancements":[]}, \
            str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][1]["id"]]):{"score":0, "e":0, "a":0, "c":0, "f":None, "d":None, "r":None, "bob":0, "scalingA":None, "wipes":None, "cheats":None, "tokens":None, "creatures":0, "actions":0, "artifacts":None, "upgrades":None, "cards":[], "enhancements":[]}, \
            str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][2]["id"]]):{"score":0, "e":0, "a":0, "c":0, "f":None, "d":None, "r":None, "bob":0, "scalingA":None, "wipes":None, "cheats":None, "tokens":None, "creatures":0, "actions":0, "artifacts":None, "upgrades":None, "cards":[], "enhancements":[]}, \
            "1":{"score":0, "e":0, "a":0, "c":0, "f":None, "d":None, "r":None, "bob":0, "scalingA":None, "wipes":None, "cheats":None, "tokens":None, "creatures":0, "actions":0, "artifacts":None, "upgrades":None}}

    deckInfo["token"] = None
    # Add the score of deck
    score, scoredPods =  getScore(decklist, pods, deckInfo)
    deckInfo["score"] = score

    # Add the set of the deck
    deckInfo["set"] = IDENTIFY_SET[str(deckResponse["data"]["expansion"])][1]

    # Add the enhancements to the pods
    # Adjust scores for good/bad enhancements, adds related attribute NOT IMPLEMENTED YET<------------------------
    if enhancements != None:
        scoredPods = distributeEnhancements(scoredPods, enhancements)

    # Order the cards within the pods
    pods[str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][0]["id"]])]["cards"].sort()
    pods[str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][1]["id"]])]["cards"].sort()
    pods[str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][2]["id"]])]["cards"].sort()

    return { "deck_info": deckInfo, "pod_info": scoredPods}


'''
def analyzeCollection(deckLink):
    
    # Open csv file
    with open(deckLink, encoding="utf-8") as file:
        next(file)
        csvReader = reader(file)

        # Erase any file with the name matching the output file
        with open("ZScores_"+deckLink.split("/").pop(), "w") as outFile:
            outFile.write("")


        # Open the output file to append throughout iteration
        with open("ZScores_"+deckLink.split("/").pop(), "a", encoding="utf-8-sig") as outFile:

            # Iterate through each line and analyze each deck
            for line in csvReader:
                score = analyzeDeck(line[49])

                # Write the deck name, score, and DoK link to the output file
                outString = "\"" + line[0] + "\"" + ", " + str(score) + ", " + line[48] + "\n"
                outFile.write(outString)
'''


def main():
    # If run by the commandline, handled differently
    if len(argv) > 1:
        deckLink = argv[1]
        print(dumps(analyzeDeck(deckLink)))

    else:
        print("Automated Z-Score Calculator, powered by southerly elves")

        # Main loop, this allows the user to score multiple decks without having to run the program each time
        while(True):
            # Get user input
            print("Enter the name of a DoK output csv file in this directory to analyze a list of decks")
            deckLink = input("Enter a deck link to analyze a deck or Q to quit\n: ")
            
            # Exit if user wants to quit
            if deckLink.upper() == "Q":
                exit()
            
            # Take each url in the file and calculate the Z score for each
            # Outputs as a csv file
            elif deckLink[-4:] == ".csv":
                # If the file does not exists, prints the error
                try:
                    with open(deckLink) as file:
                        pass
                except FileNotFoundError as e:
                    print(e)
                    print("Error locating the file " + deckLink)
                    continue
                
                # Analyze each deck in the collection
                #analyzeCollection(deckLink)

            # Analyze a single deck
            else:
                try:
                    deckInfo = analyzeDeck(deckLink)
                    print(dumps(deckInfo))
                    #with open("deck.json", "w") as file:
                    #    file.write(dumps(deckInfo))
                    print(deckInfo["deck_info"])
                    print("\nThe Z-Score of " + deckInfo["deck_info"]["name"] + " is " + str(round(deckInfo["deck_info"]["score"], 2)) + "\n")
                except:
                    pass

        



if __name__ == "__main__":
    main()