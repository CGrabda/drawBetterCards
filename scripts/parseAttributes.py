'''
Script for handling combos and other scoring additions
'''
from json import dumps, loads
from sys import argv

TOKENS = {
    '1': '5',
    '2': '4',
    '3': '3',
    '4': '2',
    '5': '0',
    '6': '3',
    '7': '2',
    '8': '6',
    '9': '1',
    '10': '4',
    '11': '1',
    '12': '3',
    '13': '4',
    '14': '3',
    '15': '4',
    '16': '3',
    '17': '5',
    '18': '3',
    '19': '2',
    '20': '3',
    '21': '5',
    '22': '3',
    '23': '2',
    '24': '1',
    '25': '3',
    '26': '3',
    '27': '2',
    '28': '1'
}

TOKEN_SCORE_ADJ = {
    '0': -1.5,
    '1': -1,
    '2': -0.5,
    '3': 0.25,
    '4': 0.5,
    '5': 1,
    '6': 1.5,
}

def scoreTokens(query, attributes):
    pods = query["Pods"]

    if query["token"] != None:
        tokenCreators = 0
        for pod in pods:
            try:
                tokenCreators += pod["pod_tokens"]
            except TypeError:
                pass

        # Set score adjustment within attributes
        attributes["tokens"] = tokenCreators * TOKEN_SCORE_ADJ[TOKENS[str(query["token"])]]
    
    return attributes


def main():
    # If run by the commandline, handled differently
    if len(argv) > 1:
        attributes = {}
        query = loads(argv[1])

        attributes = scoreTokens(query, attributes)

        print(dumps(attributes))
        

if __name__ == "__main__":
    main()