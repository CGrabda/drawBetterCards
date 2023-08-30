'''
Written by SoutherlyElf
'''
from csv import reader
from json import dumps

filename = "scripts/rsrc/KF Card Analysis - Card Scores.csv"
outFile = "scripts/data/scoreDict.json"


def scoreCard(scoreDict, line):
    '''
    Takes the line from the CSV for a certain card
    Adds the cards and its attributes to the score dictionary
    '''
    # Replace unicode cahracters that may come through in name
    line[0] = line[0].strip().replace("\u2019", "'").replace("\u201c", "\"").replace("\u201d", "\"")

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

    NOT IMPLEMENTED: Anomalies, Evil Twins
    '''
    # Anomalies, Ambassadors, Plants, Sins, Hybrid Mutants, Evil Twins

    # Add thee value of each special mutant to its name
    #prefixes = ["Daemo", "Dino", "Lyco", "Sacro", "Techno", "Umbra", "Xeno"]
    #suffixes = ["Alien", "Beast", "Bot", "Fiend", "Knight", "Saurus", "Thief"]

    #for suffix in suffixes:
    #    cardScore = scoreDict["MM"].pop(suffix)["score"]

    #    for prefix in prefixes:
    #        try:
    #            scoreDict["MM"][prefix + "-" + suffix]["score"] = cardScore
    #        except KeyError:
    #            scoreDict["MM"][prefix + "-" + suffix] = {"score": cardScore, "multiples": [0, 0, 0, 0, 0, "NO MULTIPLES"]}


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



def main():
    scoreDict = parseCardScores(filename)

    with open(outFile, "w") as file:
        file.write(dumps(scoreDict))

if __name__ == "__main__":
    main()