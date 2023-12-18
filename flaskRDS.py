from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import scipy.stats as stats
import mysql.connector
from config import DB_CONFIG
import json
import io

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,  # Use the remote address as the key for rate limiting
    default_limits=["1000 per day", "10 per minute"]  # Default rate limits
)

CORS(app)
# CORS(app, resources={r"/*": {"origins": "https://feliksr.github.io"}})

class JsonifyWavelet:
    def __init__(self, data,timeStart,timeStop,freqScale):
        self.data = data
        self.timeStart = timeStart
        self.timeStop = timeStop
        self.freqScale = freqScale
        self.xTicks = np.linspace(self.timeStart,self.timeStop,self.data.shape[1],endpoint=True)

    def _convert_data_point(self, time_bin, freq_bin, trial):
        return {
            "time": self.xTicks[time_bin].item(),
            "frequency": self.freqScale[freq_bin].item(),
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
            trials_data[trial] = self._structure_data(trial)
        return trials_data


class JsonifyLFP:
    def __init__(self, data,timeStart,timeStop):
        self.data = data
        self.timeStart = timeStart
        self.timeStop = timeStop

        self.xTicks = np.linspace(self.timeStart,self.timeStop,self.data.shape[0],endpoint=True)

    def _convert_data_point(self, time_bin, trial):
        return {
            "x": self.xTicks[time_bin].item(),
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
            trials_data[trial] = self._structure_data(trial)
        return trials_data


class Database:

    def get_chans(self, subject, run, stimGroup, category):
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        query = """
        SELECT a.channelNumber, a.channelLabel
        FROM arrays a
        JOIN sessions s ON a.session = s.session
        WHERE a.trial = %s AND s.subject = %s AND s.run = %s AND s.stimGroup = %s AND s.category = %s
        """
        cursor.execute(query, (1, subject, run, stimGroup, category))
        chans = cursor.fetchall()

        cursor.close()
        conn.close()

        chanNumbers = [chan[0] for chan in chans] 
        chanLabels = [chan[1] for chan in chans]

        return chanNumbers, chanLabels


    def get_trialData(self, channel, subject, run, stimGroup, category):
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        query = """
        SELECT a.LFP_data, a.wavelet_data, s.timeStart, s.timeStop, s.freqScale, s.xBinsWavelet, s.yBinsWavelet
        FROM arrays a
        JOIN sessions s ON a.session = s.session
        WHERE a.channelNumber = %s AND s.subject = %s AND s.run = %s AND s.stimGroup = %s AND s.category = %s
        """
        cursor.execute(query, (channel, subject, run, stimGroup, category))
        channelArrays = []


        for LFP_data, wavelet_data, timeStart, timeStop, freqScale, xBinsWavelet, yBinsWavelet in cursor.fetchall():
            
            LFPbuffer = io.BytesIO(LFP_data)
            waveletBuffer = io.BytesIO(wavelet_data)

            # Load Wavelet Data into NumPy Array

            with np.load(waveletBuffer, allow_pickle=True) as f:
                waveletArray = f['arr_0'] 

            # Load LFP Data into NumPy Array
            with np.load(LFPbuffer,  allow_pickle=True) as f:
                LFParray = f['arr_0'] 
            
            channelArrays.append({
                "LFP": LFParray,
                "wavelet": waveletArray
            })

        cursor.close()
        conn.close()
    
        freqScale_list = json.loads(freqScale)
        freqScale_array = np.array(freqScale_list)
        return channelArrays, timeStart, timeStop, freqScale_array, xBinsWavelet, yBinsWavelet
     
@app.route('/chans', methods=['POST'])
    
def get_chans():
    args = request.json
    
    subject = args.get('subject')
    category = args.get('group')
    stimGroup=args.get('stimGroup')
    run = args.get('run')

    db = Database()
    chanNumbers, chanLabels = db.get_chans(subject, run, stimGroup, category)

    return jsonify({
        "chanNumbers": chanNumbers,
        "chanLabels": chanLabels
    })

@app.route('/anova', methods=['POST'])
    
def run_ANOVA():    
    args = request.json
    subject = args.get('subject')
    currentChannel = args.get('currentChannel')

    run = args.get('run')
    allGroups = args.get('allGroups')
    stimGroup = args.get('stimGroup')
    excludedTrials = args.get('excludedTrialsContainer')

    db = Database()
    
    ANOVAforWavelet = []
    ANOVAforLFP = []
    for category in allGroups:
        arrayList, timeStart, timeStop, freqScale, xBinsWavelet, yBinsWavelet = db.get_trialData(currentChannel, subject, run, stimGroup, category)
    
        decompressedLFP = [item["LFP"] for item in arrayList]
        decompressedWavelet = [item["wavelet"] for item in arrayList]
        reshapedWaveletData = [arr.reshape(xBinsWavelet, yBinsWavelet) for arr in decompressedWavelet]
            
        LFPdata = np.stack(decompressedLFP, axis=-1) 
        waveletData = np.stack(reshapedWaveletData, axis=-1)

        ANOVAforWavelet.append(waveletData)
        ANOVAforLFP.append(LFPdata)

    pvals_wavelet = np.empty(ANOVAforWavelet[0].shape)
    for row in range(ANOVAforWavelet[0].shape[0]):
        for column in range(ANOVAforWavelet[0].shape[1]):
            _, p_val_wavelet = stats.f_oneway(ANOVAforWavelet[0][row, column], ANOVAforWavelet[1][row, column], ANOVAforWavelet[2][row, column])
            pvals_wavelet[row, column] = p_val_wavelet*3
    waveletANOVA = np.expand_dims(pvals_wavelet,axis=-1)
    
    pvals_LFP = np.empty(ANOVAforLFP[0].shape)
    for row in range(ANOVAforLFP[0].shape[0]):
        _, p_val_LFP = stats.f_oneway(ANOVAforLFP[0][row], ANOVAforLFP[1][row], ANOVAforLFP[2][row])
        pvals_LFP[row] = p_val_LFP*3
    LFPANOVA = np.expand_dims(pvals_LFP,axis=-1)  
    
    converterWaveletANOVA = JsonifyWavelet(waveletANOVA,timeStart, timeStop, freqScale)
    converterLFPANOVA = JsonifyLFP(LFPANOVA,timeStart, timeStop)
    channelsWavelet = converterWaveletANOVA.slice_trials()
    channelsLFP = converterLFPANOVA.slice_trials()

    return jsonify({
        "channelsWavelet": channelsWavelet,
        "channelsLFP": channelsLFP
    })

@app.route('/', methods=['POST'])
def serve_data():
    args = request.json
    subject = args.get('subject')
    category = args.get('group')
    stimGroup=args.get('stimGroup')
    currentChannel = args.get('currentChannel')
    meanTrials = args.get('meanTrials')
    excludedTrials = args.get('excludedTrialsContainer')
    run = args.get('run')
    
    db = Database()
    arrayList, timeStart, timeStop, freqScale,xBinsWavelet, yBinsWavelet = db.get_trialData(currentChannel, subject, run, stimGroup, category)
    
    decompressedLFP = [item["LFP"] for item in arrayList]
    decompressedWavelet = [item["wavelet"] for item in arrayList]
    reshapedWaveletData = [arr.reshape(xBinsWavelet, yBinsWavelet) for arr in decompressedWavelet]

        
    LFPdata = np.stack(decompressedLFP, axis=-1) 
    waveletData = np.stack(reshapedWaveletData, axis=-1)

    if meanTrials == True: 
        meanWavelet = np.mean(waveletData,axis=-1)
        meanWavelet = np.expand_dims(meanWavelet,axis=-1)
        converterWavelet = JsonifyWavelet(meanWavelet,timeStart,timeStop,freqScale)

        meanLFP = np.mean(LFPdata,axis=-1)
        meanLFP = np.expand_dims(meanLFP,axis=-1)
        converterLFP = JsonifyLFP(meanLFP,timeStart,timeStop)
        
    else: 
        converterWavelet = JsonifyWavelet(waveletData,timeStart,timeStop,freqScale)
        converterLFP = JsonifyLFP(LFPdata,timeStart,timeStop)
    
    trialsWavelet = converterWavelet.slice_trials()
    trialsLFP = converterLFP.slice_trials()

    return jsonify({
        "trialsWavelet": trialsWavelet,
        "trialsLFP": trialsLFP
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    json_data = json.loads(request.form['json_data'])
    timeStart = json_data['timeStart']
    timeStop = json_data['timeStop']
    freqStart = json_data['freqStart']
    freqStop = json_data['freqStop']

    waveletRequest = request.files['file']
    waveletData = np.load(waveletRequest)
    freqScale = np.logspace(np.log10(freqStart), np.log10(freqStop), waveletData.shape[0])

    converterWavelet = JsonifyWavelet(waveletData[:,::4,:],timeStart,timeStop,freqScale)
    trialsWavelet = converterWavelet.slice_trials()

    return jsonify({
        "trialsWavelet": trialsWavelet
    })
