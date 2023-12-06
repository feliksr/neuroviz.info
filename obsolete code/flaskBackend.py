from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import requests
from io import BytesIO
from config import GITHUB_TOKEN
import scipy.stats as stats

REPO_URL = "https://api.github.com/repos/feliksr/object_decoding2/contents/"

headers = {
    'Authorization': f'token {GITHUB_TOKEN}',
    'Accept': 'application/vnd.github.v3.raw',
}

def load_npy_from_github(filename):
    response = requests.get(REPO_URL + filename, headers=headers)
    return np.load(BytesIO(response.content))

# Load the files
chanNums = load_npy_from_github('chanNums.npy')
timeWavelet = np.round(load_npy_from_github('timeWavelet.npy'), 3)
scale = np.round(load_npy_from_github('scale.npy'), 3)
winWavelet = load_npy_from_github('winWavelet.npy')
timeLFP = np.round(load_npy_from_github('timeLFP.npy'),3)
winLFP = load_npy_from_github('winLFP.npy')

app = Flask(__name__)
# CORS(app)
CORS(app, resources={r"/*": {"origins": "https://feliksr.github.io"}})


class JsonifyWavelet:
    def __init__(self, data):
        self.data = data

    def _convert_data_point(self, time_bin, freq_bin, trial):
        return {
            "time": timeWavelet[time_bin].item(),
            "frequency": scale[freq_bin].item(),
            "power": self.data[freq_bin, time_bin, trial].item()
        }

    def _structure_data(self, trial):
        structured_data = [
            self._convert_data_point(time_bin, freq_bin, trial)
            for time_bin in range(self.data.shape[1])
            for freq_bin in range(self.data.shape[0])
        ]
        return structured_data

    def slice_trials(self):
        trials_data = {}
        for trial in range(self.data.shape[-1]):
            trials_data[trial+1] = self._structure_data(trial)
        return trials_data

class JsonifyLFP:
    def __init__(self, data):
        self.data = data

    def _convert_data_point(self, time_bin, trial):
        return {
            "x": timeLFP[time_bin].item(),
            "y": self.data[time_bin, trial].item()
        }

    def _structure_data(self, trial):
        structured_data = [
            self._convert_data_point(time_bin, trial)
            for time_bin in range(self.data.shape[0])
        ]
        return structured_data

    def slice_trials(self):
        trials_data = {}
        for trial in range(self.data.shape[-1]):
            trials_data[trial+1] = self._structure_data(trial)
        return trials_data

class DataLoader:

    def get_data(self,type,stimGroup,group,chan,window,excludedTrials):
        excluded_trials = excludedTrials.get(group, [])
        excludedTrialsZeroIdx = [trial - 1 for trial in excluded_trials]
        response = requests.get(REPO_URL + f"{stimGroup}/{type}/{group}/Channel_{chan}.npy", headers=headers)

        allData = np.load(BytesIO(response.content))
        includedTrials = np.delete(allData, excludedTrialsZeroIdx, -1)

        if type == 'wavelet':
            windowedData = includedTrials[:, window, :]
        else:
            windowedData = includedTrials[window,:]

        return windowedData


@app.route('/chans', methods=['POST'])

def get_chanNums():
    return chanNums.tolist()

@app.route('/anova', methods=['POST'])

def run_ANOVA():
    args = request.json
    currentChan = args.get('currentChannel')
    allGroups = args.get('allGroups')
    stimGroup = args.get('stimGroup')
    excludedTrials = args.get('excludedTrialsContainer')
    print(currentChan)
    data = DataLoader()

    ANOVAforWavelet = []
    ANOVAforLFP = []
    for group in allGroups:
        wavelet = data.get_data('wavelet',stimGroup,group,currentChan,winWavelet,excludedTrials)
        ANOVAforWavelet.append(wavelet)
        lfp = data.get_data('LFP',stimGroup,group,currentChan,winLFP,excludedTrials)
        ANOVAforLFP.append(lfp)

    pvals_wavelet = np.empty(ANOVAforWavelet[0].shape)
    for row in range(ANOVAforWavelet[0].shape[0]):
        for column in range(ANOVAforWavelet[0].shape[1]):
            _, p_val_wavelet = stats.f_oneway(ANOVAforWavelet[0][row, column], ANOVAforWavelet[1][row, column], ANOVAforWavelet[2][row, column])
            pvals_wavelet[row, column] = p_val_wavelet
    waveletANOVA = np.expand_dims(pvals_wavelet,axis=-1)

    pvals_LFP = np.empty(ANOVAforLFP[0].shape)
    for row in range(ANOVAforLFP[0].shape[0]):
        _, p_val_LFP = stats.f_oneway(ANOVAforLFP[0][row], ANOVAforLFP[1][row], ANOVAforLFP[2][row])
        pvals_LFP[row] = p_val_LFP
    LFPANOVA = np.expand_dims(pvals_LFP,axis=-1)

    converterWaveletANOVA = JsonifyWavelet(waveletANOVA)
    converterLFPANOVA = JsonifyLFP(LFPANOVA)
    trialsWavelet = converterWaveletANOVA.slice_trials()
    trialsLFP = converterLFPANOVA.slice_trials()

    return jsonify({
        "trialsWavelet": trialsWavelet,
        "trialsLFP": trialsLFP
    })

@app.route('/', methods=['POST'])
def serve_data():
    args = request.json
    group = args.get('group')
    stimGroup=args.get('stimGroup')
    currentChannel = args.get('currentChannel')
    meanTrials = args.get('meanTrials')
    excludedTrials = args.get('excludedTrialsContainer')

    data = DataLoader()
    waveletData = data.get_data('wavelet',stimGroup,group,currentChannel,winWavelet,excludedTrials)
    LFPdata = data.get_data('LFP',stimGroup,group,currentChannel,winLFP,excludedTrials)

    if meanTrials == True:
        meanWavelet = np.mean(waveletData,axis=-1)
        meanWavelet = np.expand_dims(meanWavelet,axis=-1)
        converterWavelet = JsonifyWavelet(meanWavelet)

        meanLFP = np.mean(LFPdata,axis=-1)
        meanLFP = np.expand_dims(meanLFP,axis=-1)
        converterLFP = JsonifyLFP(meanLFP)

    else:
        converterWavelet = JsonifyWavelet(waveletData)
        converterLFP = JsonifyLFP(LFPdata)

    trialsWavelet = converterWavelet.slice_trials()
    trialsLFP = converterLFP.slice_trials()


    return jsonify({
        "trialsWavelet": trialsWavelet,
        "trialsLFP": trialsLFP
    })
