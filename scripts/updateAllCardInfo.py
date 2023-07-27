'''
Takes cards.htm, carDetails.htm, and KF card scores files
Parses card traits, card name to trait, card id to name
    card scores, card multiples

Outputs these into json files^

Creates an upsert query for the Cards table and Multiples table

This script is not pretty as it is a combination of 5 separate one-offs
Combining all the parts into one script makes one comprehensive import script for updating all card data

This also self-validates that all card imports match the proper name and ID
'''
from json import dumps
import re

cardIdNameFile = "./scripts/data/cardNameId.csv"
# Card details is scraped from Archon Arcana cargo query with card traits
cardDetailsFile = "./scripts/rsrc/cardDetails.htm"
scoringFile = "./scripts/rsrc/KF Card Analysis - Card Scores.csv"

outfileScoreDict = "./scripts/data/scoreDict.json"
outfileIDToName = "./scripts/data/cardIDToName.json"
outfileNameToTrait = "./scripts/data/cardNameToTrait.json"
outfileMultiplesQuery = "./scripts/data/updateMultiplesQuery.txt"
outfileMultiples = "./scripts/data/multiplesDict.json"
outfileCardQuery = "./scripts/data/updateCardsQuery.txt"

cardNameToTraitDict = {}
cardIDNameDict = {}
multiplesDict = {}

setDict = {
    "Call of the Archons": "1",
    "Age of Ascension": "2",
    "Worlds Collide": "3",
    "Mass Mutation": "4",
    "Dark Tidings": "5",
    "Winds of Exchange": "6"
}


def normalizeCardName(cardName):
    '''
    Replace unicode characters in card names to match text format
    '''
    cardName = cardName.strip().replace("Æ", "AE").replace("æ", "ae").replace("\u2019", "'").replace("\u201c", "\"").replace("\u201d", "\"").replace("”", "\"").replace("“", "\"")

    # Replace Ekwidon unicode characters with the standard letter
    if not cardName.isascii():
        cardName = cardName.replace(u"\u0103", "a").replace(u"\u0115", "e").replace(u"\u012d", "i").replace(u"\u014f", "o").replace(u"\u016d", "u")

    return cardName

# -------------------- Update the Scoring Dict -------------------- #
'''
Written by SoutherlyElf
'''
from csv import reader
from json import dumps


def scoreCard(scoreDict, line):
    '''
    Takes the line from the CSV for a certain card
    Adds the cards and its attributes to the score dictionary
    '''
    # Replace unicode cahracters that may come through in name
    line[0] = normalizeCardName(line[0])

    # Handle Tokens and thier fractional values
    if line[3] == "T":
        for i in range(len(line)):
            try:
                tokens = line[i].split("/")
                if len(tokens) > 1:
                    line[i] = str(int(tokens[0]) / int(tokens[1]))
            except:
                pass

    # Create the attributes dict
    scoreDict[line[2]][line[0]] = {}
    
    # Add the card score and type
    scoreDict[line[2]][line[0]]["type"] = line[4]
    scoreDict[line[2]][line[0]]["score"] = line[5]

    # Add the other card attributes, don't look at this or think too hard about it just move on
    scoreDict[line[2]][line[0]]["e"] = (float(line[6]) if len(line[6]) > 0 else 0)
    scoreDict[line[2]][line[0]]["a"] = (float(line[7]) if len(line[7]) > 0 else 0)
    scoreDict[line[2]][line[0]]["c"] = (float(line[8]) if len(line[8]) > 0 else 0)
    scoreDict[line[2]][line[0]]["f"] = (float(line[9]) if len(line[9]) > 0 else 0)
    scoreDict[line[2]][line[0]]["d"] = (float(line[10]) if len(line[10]) > 0 else 0)
    scoreDict[line[2]][line[0]]["bob"] = (float(line[11]) if len(line[11]) > 0 else 0)
    scoreDict[line[2]][line[0]]["scalingA"] = (int(line[12]) if len(line[12]) > 0 else 0)
    scoreDict[line[2]][line[0]]["wipes"] = (int(line[13]) if len(line[13]) > 0 else 0)
    scoreDict[line[2]][line[0]]["r"] = (int(line[14]) if len(line[14]) > 0 else 0)
    scoreDict[line[2]][line[0]]["cheats"] = (int(line[15]) if len(line[15]) > 0 else 0)
    scoreDict[line[2]][line[0]]["tokens"] = (int(line[17]) if len(line[17]) > 0 else 0)
    
    # Adds the score adjustment for multiples of a card
    multiplesList = ["0", line[18], line[19], line[20], line[21]]
    scoreDict[line[2]][line[0]]["multiples"] = multiplesList


def parseCardScores(file):
    '''
    Takes the CSV file of the Card Scores Google Sheet page and saves a json object
    Each entry is a dict based on the set
    From the set, each entry is cardName:cardScore

    scoreDict[set][cardname] = score
    '''
    scoreDict = {}

    with open(file, encoding="utf-8") as file:
        next(file)
        csvReader = reader(file)

        # Iterates through the file to generate the dictionary of scores per set
        for line in csvReader:
            # Tries to add value, if fails then instanties the new, blank dictionary
            try:
                # Skips the header lines by seeing if the type value is blank
                if len(line[4]) > 1:
                    # Create and add the attributes to the card
                    scoreCard(scoreDict, line)

            except:
                # Create the set dict
                scoreDict[line[2]] = {}

                # Create and add the attributes to the card
                scoreCard(scoreDict, line)
    
    specialsAdjustment(scoreDict)
    
    return scoreDict


def specialsAdjustment(scoreDict):
    '''
    Takes the score dictionary and adjusts the scores for each special card
    This needs to be done because the card full name is used for multiples but not score
    '''
    # Masters
    cardScore = scoreDict["COTA"].pop("Master of X")["score"]
    scoreDict["COTA"]["Master of 1"]["score"] = cardScore
    scoreDict["COTA"]["Master of 2"]["score"] = cardScore
    scoreDict["COTA"]["Master of 3"]["score"] = cardScore

    # Ambassadors
    cardScore = scoreDict["AOA"].pop("Ambassador")["score"]
    scoreDict["AOA"]["Brobnar Ambassador"]["score"] = cardScore
    scoreDict["AOA"]["Dis Ambassador"]["score"] = cardScore
    scoreDict["AOA"]["Logos Ambassador"]["score"] = cardScore
    scoreDict["AOA"]["Mars Ambassador"]["score"] = cardScore
    scoreDict["AOA"]["Shadows Ambassador"]["score"] = cardScore
    scoreDict["AOA"]["Untamed Ambassador"]["score"] = cardScore

    # Plants
    cardScore = scoreDict["WC"].pop("Plant")["score"]
    scoreDict["WC"]["Brobnar Plant"]["score"] = cardScore
    scoreDict["WC"]["Dis Plant"]["score"] = cardScore
    scoreDict["WC"]["Logos Plant"]["score"] = cardScore
    scoreDict["WC"]["Saurian Plant"]["score"] = cardScore
    scoreDict["WC"]["Star Alliance Plant"]["score"] = cardScore
    scoreDict["WC"]["Untamed Plant"]["score"] = cardScore

    # Evil Twins
    #evilTwinList = ["Evil Armadrone", "Evil Binary Moray", "Evil Captain Kresage", "Evil Old Egad", "Evil PI Sweven", "Evil Prof. Garwynne", "Evil Talmage Steelheart", "Evil Almsmaster", "Evil Grey Augur", "Evil Lærie of the Lake", "Evil Lightsmith Clariel", "Evil Seneschal Sargassa", "Evil Sir Bevor", "Evil Urien the Circumspect", "Evil Bestiarii Urso", "Evil Censor Philo", "Evil Eclectic Ambrosius", "Evil Lapisaurus", "Evil Magistra Vita", "Evil Physicus Felix", "Evil Undagnathus", "Evil Captain No-Beard", "Evil Freebooter Faye", "Evil Hard Simpson", "Evil Hobnobber", "Evil Monty Bank", "Evil One-Eyed Willa", "Evil Sea Urchin", "Evil 5C077", "Evil C.R. Officer Hawkins", "Evil CH-337A", "Evil Colonist Chapman", "Evil Operative Espion", "Evil Rocketeer Tryska", "Evil Shield-U-Later", "Evil Flamegill Enforcer", "Evil Giltspine Netcaster", "Evil Horrid Synan", "Evil Kaupe", "Evil Taniwha", "Evil Tomwa of the Glow", "Evil Wikolia", "Evil Æmberfin Shark", "Evil Chelonia", "Evil Mookling", "Evil Ol' Paddy", "Evil Sporegorger", "Evil Witch of the Dawn", "Evil Youngest Bear"]

    #for evilTwin in evilTwinList:
    #    scoreDict["DT"][evilTwin]["score"] = scoreDict["DT"][evilTwin[5:]]["score"]



scoreDict = parseCardScores(scoringFile)

with open(outfileScoreDict, "w") as file:
    file.write(dumps(scoreDict))





# -------------------- Match each card ID to its name -------------------- #
# Use cardNameId.csv to create a dict of card ID's to their name
with open(cardIdNameFile, encoding="utf-8") as file:
    # Go through each line in the file
    csvReader = reader(file)

    # Populate the cardIDNameDict
    for line in csvReader:
        # If more than 2 lines, the card name contains a comma
        if line[2] != "":
            cardIDNameDict[line[0]] = line[1] + "," + line[2]
        
        else:
            cardIDNameDict[line[0]] = line[1]


with open(outfileIDToName, "w") as file:
    file.write(dumps(cardIDNameDict))




# -------------------- Relate card names to card traits -------------------- #
# Retrieve all card names and traits from cardDetails.htm
with open(cardDetailsFile, encoding="utf-8") as file:
    matches = re.findall("<tr.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n.*<\/td>", file.read())


for match in matches:
    cardName = re.search("title=\"CardData:.*\">C", match).group().split(":")[1][:-3]
    cardName = normalizeCardName(cardName).replace(" (Anomaly)", "")
    
    # Handle Redacted
    if cardName == "(REDACTED)":
        cardName = "[REDACTED]"

    # Handle Evil Twins
    tokens = cardName.split(" (Evil Twin)")
    if len(tokens) > 1:
        cardName = "Evil " + tokens[0]
        
    try:
        traitTokens = re.search("Traits\"><p>.*<\/p", match).group()[11:-3].split(" ")
        cardTraits = [_ for _ in traitTokens if len(_) > 1]
    except AttributeError:
        cardTraits = None

    cardNameToTraitDict[cardName] = cardTraits

# Write card name to trait dict
with open(outfileNameToTrait, "w", encoding="utf-8") as file:
    file.write(dumps(cardNameToTraitDict))




# -------------------- Create Multiples Dict and Query -------------------- #
for gameSet in scoreDict:
    for card in scoreDict[gameSet]:
        multiples = scoreDict[gameSet][card]["multiples"]
        string = "".join(str(x) for x in multiples if x)
        
        if len(string) > 1:
            multiplesDict[string] = multiples
    

keys = list(multiplesDict.keys())
output = "INSERT INTO \"Multiples\" (multiple_id, multiples)\nVALUES"

for i in range(len(keys)):
    output += "\t(" + str(i) + ", "
    output += "ARRAY[" + str(multiplesDict[keys[i]][0])
    output += "," + str(multiplesDict[keys[i]][1])
    output += "," + str(multiplesDict[keys[i]][2])
    output += "," + str(multiplesDict[keys[i]][3])
    output += "," + str(multiplesDict[keys[i]][4])
    output += "]),\n"

    multiplesDict[keys[i]] = i

output = output[:-2]
output += "\nON CONFLICT (multiple_id) DO UPDATE\n"
output += "SET   multiples = excluded.multiples"
output += ";"

with open(outfileMultiplesQuery, "w") as file:
    file.write(output)

with open(outfileMultiples, "w") as file:
    file.write(dumps(multiplesDict))



# -------------------- Card Trait Info to Card SQL Input -------------------- #
scoreFile = "./scoring/scoreDict.json"
multiplesFile = "./cards/multiplesDict.json"

idToTraitDict = {}

IDENTIFY_SET = {
    "1": "COTA",
    "2": "AOA",
    "3": "WC",
    "4": "MM",
    "5": "DT",
    "6": "WOE",
    "500": "VM",
}


# correlate id to traits
for id in cardIDNameDict:
    cardName = cardIDNameDict[id]
    # add in additional card information here. (card_id, card_name, traits, multiples, card_attributes)
    idToTraitDict[id] = (cardName, cardNameToTraitDict[cardName])


# create sql query
cardIDToTraitDict = idToTraitDict
outString = "INSERT INTO \"Cards\" (card_id, card_name, traits, multiple_id)\nVALUES"

for id in cardIDToTraitDict:
    cardName, cardTraits = cardIDToTraitDict[id]
    scoreName = cardName.replace("Æ", "AE").replace("æ", "ae").replace("\u2019", "'").replace("”", "\"").replace("“", "\"")

    # Replace Ekwidon unicode characters with the standard letter
    if not scoreName.isascii():
        scoreName = scoreName.replace(u"\u0103", "a").replace(u"\u0115", "e").replace(u"\u012d", "i").replace(u"\u014f", "o").replace(u"\u016d", "u")

    # Get the set of a card
    setId = id[:-3]
    if setId == "-":
        if (scoreName[0] == "E" or scoreName[0] == "C" or scoreName[:2] == "Ne"):
            cardSet="WOE"
        else:
            cardSet = "WC"
    else:
        cardSet = IDENTIFY_SET[setId]

    # Get the multiples value of a card
    try:
        #print(setId, scoreName)
        multiplesString = "".join(str(x) for x in scoreDict[cardSet][scoreName]["multiples"] if x)

    except KeyError:
        # Handle special cards
        tokens = cardName.lower().split(" ")
        firstWord = tokens[0]

        # Initialize as blank to establish the exception is handled by containing a value
        oldCardName = cardName
        cardName = None

        # The Tide
        if firstWord == "the":
            continue


        # It's coming
        if firstWord == "it's":
            cardName = "It's Coming"
            cardSet = "MM"

        # MM Velum/Hyde (WC is covered in document)
        elif firstWord == "hyde" or firstWord == "velum":
            cardName = "Hyde/Velum"
            cardSet = "MM"
                
        # TT for non-COTA sets
        elif firstWord == "timetraveller":
            cardName = "Timetraveller"
            cardSet = "COTA"
                
        # HFFS for non-COTA sets
        elif firstWord == "help":
            cardName = "Help From Future Self"
            cardSet = "COTA"

        # Hings/Gross from non-DT sets
        elif firstWord == "com.":
            if tokens[2] == "hings":
                cardName = "Com. Officer Hings"
            elif tokens[2] == "gross":
                cardName = "Com. Officer Gross"
                    
            cardSet = "DT"
                
        # Z-Force from non-DT sets
        elif firstWord[0] == "z":
            if tokens[1] == "agent":
                cardName = "Z-Force Agent 14"

            elif tokens[1] == "tracker":
                cardName = "Z-Particle Tracker"

            elif tokens[1] == "blaster":
                cardName = "Z-Ray Blaster"

            elif tokens[1] == "emitter":
                cardName = "Z-Wave Emitter"

            cardSet = "MM"
                
        # Dexus from non-WC decks
        elif firstWord == "dexus":
            cardName = "Dexus"
            cardSet = "WC"

        # Toad from non-WC decks
        elif firstWord == "toad":
            cardName = "Toad"
            cardSet = "WC"

        # Scylla from non-MM decks
        elif firstWord == "scylla":
            cardName = "Scylla"
            cardSet = "MM"

        # Charybdis from non-MM decks
        elif firstWord == "charybdis":
            cardName = "Charybdis"
            cardSet = "MM"

        # Gigantic creatures
        # Ultra Gravitron
        elif firstWord == "ultra":
            cardName = "Ultra Big Set"
            cardSet = "MM"

        # Niffle Kong
        elif firstWord == "niffle":
            cardName = "Kong Big Set"
            cardSet = "MM"

        # Deusillus
        elif firstWord == "deusillus":
            cardName = "Deus Big Set"
            cardSet = "MM"
                    
        # WC Mega Brobnar creatures
        elif firstWord == "mega":
            cardName = oldCardName[5:]
            cardSet = "WC"

        # Shiz Buggies, removes single quotes
        elif firstWord[:3] == "shi":
            cardName = str.replace(oldCardName, "'", "")
            cardSet = "WOE"

        # Dive Deep
        elif firstWord == "dive":
            cardName = "Dive Deep"
            cardSet = "DT"

        # Drawn Down
        elif firstWord == "drawn":
            cardName = "Drawn Down"
            cardSet = "DT"

        elif firstWord == "orb":
            cardSet="MM"
            cardName = "Orb of Wonder"

        elif firstWord == "valoocanth":
            cardSet="DT"
            cardName = "Valoocanth"

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
        
        elif firstWord == "bombyx":
            cardName = oldCardName
            cardSet = "DT"
            
        elif firstWord == "fifalde":
            cardName = oldCardName
            cardSet = "DT"

        elif firstWord == "master":
            cardName = oldCardName
            cardSet = "COTA"

        # World's Collide variants
        # Brobnar brews
        elif len(tokens) > 1:
            if tokens[1] == "brew":
                cardName = "Brew"
                cardSet = "WC"

            # Dis banes
            elif tokens[1] == "bane":
                cardName = "Bane"
                cardSet = "WC"

        if cardName == None:
            print("DeckImportError")
            print("\nError adding the card " + oldCardName + " to the query")
            print("Exiting...")
            exit()

    # format into (card_id, card_name, traits, multiples)
    if len(multiplesString) > 1:
        string = " ("
        string += id.replace("A", "") + ", "
        string += "'" + cardName.replace("'", "''") + "', "
        string += ("'" + str(cardTraits).replace("'", "\"") + "', ") if cardTraits != None else "NULL, "
        string += str(multiplesDict[multiplesString])
        string += "),"

        outString += string

outString = outString[:-1]
outString += "\nON CONFLICT (card_id) DO UPDATE\n"
outString += "SET   card_name = excluded.card_name,\n"
outString += "      traits = excluded.traits,\n"
outString += "      multiple_id = excluded.multiple_id"
outString += ";"

with open(outfileCardQuery, "w", encoding="utf-8") as file:
    file.write(outString)