import requests
import os

BACKEND_URL = 'http://localhost:6000'
TRANSCRIPT_FOLDER = './server/transcript'

# get all file in the folder
for filename in os.listdir(TRANSCRIPT_FOLDER):
    audioID = filename.replace(".txt", "")
    path = os.path.join(TRANSCRIPT_FOLDER, filename)
    success = 500

    with open(path, 'r', encoding='utf-8') as f:
        transcript = f.read()
        api = BACKEND_URL + "/api/audio/" + audioID
        if len(transcript) == 0:
            transcript = " "
        r = requests.put(api, data = {'transcript': transcript})
        # print(r.status_code == 200)
        success = r.status_code

    # if 200 delete the transcript with that audioID given up there
    if r.status_code == 200:
        if os.path.exists(path):
            os.remove(path)
    # if 404 say not found, hold the transcript.
    if r.status_code == 404:
        print("..Can't find audio..")
    # if 500 say sorry, hold the transcript.
    if r.status_code == 500:
        print("..Sorry, internal problem, can't update transcript for audio {} for some reasons idk.".format(audioID))