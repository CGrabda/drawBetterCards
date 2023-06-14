import config as config
import requests
from json import loads

# Replace these values with your own
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

auth_response = requests.post(auth_url, data=auth_data)
print(loads(auth_response))





headers = {"authorization": "Bearer " + str(access_token), "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:113.0) Gecko/20100101 Firefox/113.0"}  # User's Access Token
api = "https://patreon.com/api/oauth2/v2/"

def patreonRequest(path):
    responses = []
    cursor = ""

    while True:
        response = requests.get(api + path, headers=headers, params=cursor)
        print(response)
        response = loads(response.text)

        responses.append(response)
        cursor = response["meta"]["pagination"]["cursors"]["next"]
        if not cursor:
            break
    return responses

def main():
    # Get the campaign Id
    campaignId = patreonRequest("campaigns")[0]["data"][0]["id"]

    test = patreonRequest("/campaigns/%7b" + campaignId + "%7d?fields%5Bcampaign%5D=created_at,creation_name")
    print(test[0])

    # Get the members
    members = patreonRequest("/campaigns/" + campaignId + "/members?include=currently_entitled_tiers")
    print(members)

if __name__ == "__main__":
    main()

# ?include=currently_entitled_tiers&fields[member]=last_charge_date,patron_status&fields[tier]=description,title