'''
Written by SoutherlyElf
'''
import re
from sys import argv
from csv import reader
from json import loads, dumps
from requests import request
from time import sleep

with open("./scripts/scoring/scoreDict.json") as file:
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
        "479": ("MM", 4),
        "496": ("DT", 5),
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
            cardID = int(str(IDENTIFY_SET[str(card["expansion"])][1]) + str(card["card_number"]))

            enhancements.append([cardID, [enhancementDict[pip] for pip in bonus["bonus_icons"]]])


    
    return (decklist, enhancements)


def getScore(decklist, pods):
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
                cardName = cardName.replace("Æ", "AE").replace("æ", "ae").replace("’", "'")
                cardDetails = scoreDict[cardSet][cardName]

        except KeyError as e:
            exceptionHandled = False

            # Handle special cards
            tokens = cardName.split(" ")
            firstWord = tokens[0].lower()

            # If it did not have a hyphen in the name
            # The Tide
            if firstWord == "the":
                continue

            
            else:
                # It's coming
                if firstWord == "it's":
                    cardName = "It's Coming"
                    cardDetails = scoreDict["MM"][cardName]
                    exceptionHandled = True
                
                # Deusillus
                elif firstWord == "deusillus":
                    cardName = "Deus Big Set"
                    cardDetails = scoreDict["MM"][cardName]
                    exceptionHandled = True

                # MM Velum/Hyde (WC is covered in document)
                elif firstWord == "hyde" or firstWord == "velum":
                    cardName = "Hyde/Velum"
                    cardDetails = scoreDict["MM"][cardName]
                    exceptionHandled = True
                
                # TT for non-COTA sets
                elif firstWord == "timetraveller":
                    cardName = "Timetraveller"
                    cardDetails = scoreDict["COTA"][cardName]
                    cardSet = "COTA"
                    exceptionHandled = True
                
                # HFFS for non-COTA sets
                elif firstWord == "help":
                    cardName = "Help From Future Self"
                    cardDetails = scoreDict["COTA"][cardName]
                    cardSet = "COTA"
                    exceptionHandled = True

                # World's Collide variants
                # Brobnar brews
                elif len(tokens) > 1:
                    if tokens[1].lower() == "brew":
                        cardName = "Brew"
                        cardDetails = scoreDict["WC"][cardName]
                        exceptionHandled = True

                    # Dis banes
                    elif tokens[1].lower() == "bane":
                        cardName = "Bane"
                        cardDetails = scoreDict["WC"][cardName]
                        exceptionHandled = True
                    
            if not exceptionHandled:
                print("DeckImportError")
                print(e)
                print("\nError adding the card " + card[0]["card_title"] + " to the score")
                print("Exiting...")
                exit()
        

        # Adds the raw score and value of multiples for all the cards and attributes
        # Multiples value is the number of cards -1 as the index for the multiples list
        # 1 card is always a multiple adjustment of 0
        
        for i in range(card[1]):
            # Add the card score
            tempScore = float(cardDetails["score"]) \
                + float(scoreDict[cardSet][cardName]["multiples"][i])
            cardScore += tempScore

            # Add each of the pod scores
            cardHouse = IDENTIFY_HOUSE[card[0]["house"]]
            pods[cardHouse]["score"] += tempScore
            pods[cardHouse]["e"] += float(cardDetails["e"])
            pods[cardHouse]["a"] += float(cardDetails["a"])
            pods[cardHouse]["c"] += float(cardDetails["c"])
            pods[cardHouse]["f"] += float(cardDetails["f"])
            pods[cardHouse]["d"] += float(cardDetails["d"])
            pods[cardHouse]["r"] += float(cardDetails["r"])
            pods[cardHouse]["bob"] += float(cardDetails["bob"])
            pods[cardHouse]["scalingA"] += cardDetails["scalingA"]
            pods[cardHouse]["wipes"] += cardDetails["wipes"]
            pods[cardHouse]["cheats"] += cardDetails["cheats"]
            pods[cardHouse]["tokens"] += cardDetails["tokens"]

            # Add to the count of card types
            cardType = cardDetails["type"]
            if cardType == "Creature":
                pods[cardHouse]["creatures"] += 1
            elif cardType == "Action":
                pods[cardHouse]["actions"] += 1
            elif cardType == "Artifact":
                pods[cardHouse]["artifacts"] += 1
            elif cardType == "Upgrade":
                pods[cardHouse]["upgrades"] += 1

            # Add the card to the house
            pods[cardHouse]["cards"].append(cardID)


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
    pods = {str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][0]["id"]]):{"score":0, "e":0, "a":0, "c":0, "f":0, "d":0, "r":0, "bob":0, "scalingA":0, "wipes":0, "cheats":0, "tokens":0, "creatures":0, "actions":0, "artifacts":0, "upgrades":0, "cards":[], "enhancements":[]}, \
            str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][1]["id"]]):{"score":0, "e":0, "a":0, "c":0, "f":0, "d":0, "r":0, "bob":0, "scalingA":0, "wipes":0, "cheats":0, "tokens":0, "creatures":0, "actions":0, "artifacts":0, "upgrades":0, "cards":[], "enhancements":[]}, \
            str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][2]["id"]]):{"score":0, "e":0, "a":0, "c":0, "f":0, "d":0, "r":0, "bob":0, "scalingA":0, "wipes":0, "cheats":0, "tokens":0, "creatures":0, "actions":0, "artifacts":0, "upgrades":0, "cards":[], "enhancements":[]}, \
            "1":{"score":0, "e":0, "a":0, "c":0, "f":0, "d":0, "r":0, "bob":0, "scalingA":0, "wipes":0, "cheats":0, "tokens":0, "creatures":0, "actions":0, "artifacts":0, "upgrades":0}}

    # Return the score of deck
    score, scoredPods =  getScore(decklist, pods)
    deckInfo["score"] = score

    # Add the enhancements to the pods
    # Adjust scores for good/bad enhancements, adds related attribute NOT IMPLEMENTED YET<------------------------
    if enhancements != None:
        scoredPods = distributeEnhancements(scoredPods, enhancements)

    # Order the cards within the pods
    pods[str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][0]["id"]])]["cards"].sort()
    pods[str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][1]["id"]])]["cards"].sort()
    pods[str(IDENTIFY_HOUSE[deckResponse["_linked"]["houses"][2]["id"]])]["cards"].sort()

    return { "deck_info": deckInfo, "pod_info": scoredPods}


def analyzeCollection(deckLink):
    '''
    
    '''
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
                analyzeCollection(deckLink)

            # Analyze a single deck
            else:
                deckInfo, podInfo = analyzeDeck(deckLink)
                print("\nThe Z-Score of " + deckInfo["name"] + " is " + str(round(deckInfo["score"], 2)) + "\n")

        



if __name__ == "__main__":
    main()