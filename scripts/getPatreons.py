import config as config
import requests
from datetime import datetime, timedelta
from json import loads, dumps
from sys import argv

# API auth information
client_id = config.patreon_client_id
client_secret = config.patreon_client_secret
access_token = config.patreon_access_token
campaign_id = config.patreon_campaign_id

# Authenticate with the Patreon API
auth_url = "https://www.patreon.com/api/oauth2/token"
auth_data = {
    "grant_type": "client_credentials",
    "client_id": client_id,
    "client_secret": client_secret
}

headers = {"authorization": "Bearer " + str(access_token)}  # User's Access Token
api = "https://patreon.com/api/oauth2/v2/"


TIER_TO_ID = {
    "1851499": 100,         # Archon
    "1851502": 200,         # Corner Member
    "9064830": 300          # Corner Junkie
}


def patreonRequest(path):
    '''
    Makes an API request to the patreon api with pagination
    Takes a url path as input and appends to the base url with pagination attached

    API base url is https://patreon.com/api/oauth2/v2/
    '''
    responses = []
    cursor = ""

    # Request loop
    while True:
        # Makes request
        response = requests.get(api + path + "&page%5Bsize%5D=200&page%5Bcursor%5D=" + cursor, headers=headers)
        #print(response.text)

        # Add response JSON to responses output list
        response = loads(response.text)
        responses.append(response)

        # Gets the pagination cursor from the response
        try:
            cursor = response["meta"]["pagination"]["cursors"]["next"]
        except:
            cursor = None

        # If cursor is finished, break out of loop
        if not cursor:
            break
    

    return responses


def parseMembers(membersResponse, timeMinutesCheck=131490):
    '''
    '''
    members = []

    # Adds [email, tierId] to the members list
    # tierId references the user the tier is assigned in the database, not the Patreon API
    for page in membersResponse:
        for member in page["data"]:
            email = member["attributes"]["email"]
            patronStatus = member["attributes"]["patron_status"]
            paymentStatus = member["attributes"]["last_charge_status"]
            paymentDate = member["attributes"]["last_charge_date"]
            tierData = member["relationships"]["currently_entitled_tiers"]["data"]

            # If user has no email
            if email is None:
                continue
        
            # User had never paid
            if paymentDate is None:
                continue

            # check that last update is within past x seconds, default is past 3 months, 43830 minutes in a month
            d1 = datetime.timestamp(datetime.strptime(paymentDate, '%Y-%m-%dT%H:%M:%S.%f%z'))
            d2 = datetime.timestamp(datetime.now() - timedelta(minutes=timeMinutesCheck))
            if d1 < d2:
                continue

            # If user isn't an active patron, sets tier to 0
            if patronStatus == "former_patron" or patronStatus == "declined_patron":
                members.append([ email, 0, None ])
                continue

            # Add email and tier to output
            members.append([ email, TIER_TO_ID[tierData[0]["id"]], paymentDate ])

    return members


def main():
    # Get the members
    # Add &fields[tier]=title at the end of request to see the tier the id is correlated with
    membersResponse = patreonRequest("campaigns/" + campaign_id + "/members?include=currently_entitled_tiers&fields[member]=email,last_charge_date,last_charge_status,patron_status")
    #print(membersResponse)

    # Takes the list of member id's and retrieve the member emails
    # If run by the commandline with passed value, handled differently by checking within prior x minutes, else checks past 3 months
    if len(argv) > 1:
        memberInfo = parseMembers(membersResponse, int(argv[1]))
    else:
        memberInfo = parseMembers(membersResponse)
    
    print(dumps({ "data": memberInfo }))


if __name__ == "__main__":
    main()

