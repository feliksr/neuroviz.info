import json
import io
import math
import os
import mysql.connector
import numpy as np
import scipy.stats as stats

from werkzeug.utils import secure_filename 
from scipy.io import loadmat
from easydict import EasyDict

from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score

from flask import Flask, request, jsonify
from flask_cors import CORS

application = Flask(__name__)

CORS(application)

DB_CONFIG_JSON = os.environ.get('DB_CONFIG')
if DB_CONFIG_JSON is not None:
    DB_CONFIG = json.loads(DB_CONFIG_JSON)

class DataCache:
    
    @staticmethod
    def init():

        DataCache.wavelets = EasyDict({
            'data' : {},
            'time' : None,
            'freq' : None,
        })

        DataCache.LFPs  = EasyDict({
            'data' : {},
            'time' : None,
        })

        DataCache.groups = []
        DataCache.pca = None

    @staticmethod
    def init_Wavelets(group):
        DataCache.wavelets.data[group] = {} 

    @staticmethod
    def init_LFPs(group):
        DataCache.LFPs.data[group] = {}
        

class Database:

    def get_chans(self, subject, run, category, group):
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        query = """
        SELECT a.channelNumber, a.channelLabel
        FROM arrays a
        JOIN sessions s ON a.session = s.session
        WHERE a.trial = %s AND s.subject = %s AND s.run = %s AND s.stimGroup = %s AND s.category = %s
        """
        cursor.execute(query, (1, subject, run, category,group))
        chans = cursor.fetchall()

        cursor.close()
        conn.close()

        chanNumbers = [chan[0] for chan in chans] 
        chanLabels  = [chan[1] for chan in chans]

        return chanNumbers, chanLabels


    def get_trialData(self, channel, subject, run, category, group):
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("USE my_new_database")

        query = """
        SELECT a.LFP_data, a.wavelet_data, s.timeStart, s.timeStop, s.freqScale, s.xBinsWavelet, s.yBinsWavelet
        FROM arrays a
        JOIN sessions s ON a.session = s.session
        WHERE a.channelNumber = %s AND s.subject = %s AND s.run = %s AND s.stimGroup = %s AND s.category = %s
        """
        cursor.execute(query, (channel, subject, run, category, group))
        arrays = []

        for LFP_data, wavelet_data, timeStart, timeStop, freqScale, xBinsWavelet, yBinsWavelet in cursor.fetchall():
            
            LFPbuffer = io.BytesIO(LFP_data)
            waveletBuffer = io.BytesIO(wavelet_data)

            with np.load(waveletBuffer, allow_pickle=True) as f:
                waveletArray = f['arr_0'] 

            with np.load(LFPbuffer,  allow_pickle=True) as f:
                LFParray = f['arr_0'] 
            
            arrays.append({
                "LFPs": LFParray,
                "wavelets": waveletArray
            })

        cursor.close()
        conn.close()
    
        freqScale_list = json.loads(freqScale)

        return arrays, timeStart, timeStop, freqScale_list, xBinsWavelet, yBinsWavelet


class Upload:
    def upload(self,file):

        filename = secure_filename(file.filename)  
        path, extension = os.path.splitext(filename)   
        extension = extension.lower()          

        if extension == '.npy':
            data = np.load(file, allow_pickle=False).astype(np.int32)

        elif extension == '.mat':
            mat_content = io.BytesIO(file.read())
            mat_data = loadmat(mat_content)
            data = (mat_data[path]).astype(np.int32)
        else:
            data = None

        return data


@application.route('/api/chans', methods=['POST'])
def get_chans():
    args = request.json
    
    subject   = args.get('subject')
    category  = args.get('category')
    run       = args.get('run')
    group     = args.get('group')

    db = Database()
    chanNumbers, chanLabels = db.get_chans(subject, run, category,group)

    return jsonify({
        "chanNumbers": chanNumbers,
        "chanLabels" : chanLabels
    })


@application.route('/api/ANOVA', methods= ['POST'])
def run_ANOVA():
    args         = request.json
    currentGroup = args.get('group')
    channel      = args.get('channel')
    bonfCorrect  = args.get('bonfCorrect')
    PCA_reduce   = args.get('PCAreduce')

    groups = DataCache.groups
    wavelets = DataCache.wavelets
    
    data_ANOVA = {}

    if currentGroup not in groups:
        groups.append(currentGroup)
    
    waveletsArrays = None

    if PCA_reduce:
        waveletsArrays  = DataCache.pca
        
    elif currentGroup in wavelets.data and channel in wavelets.data[currentGroup]:
        waveletsArrays = []
        for group in groups:
            if group in wavelets.data and channel in wavelets.data[group]:
                waveletsArrays.append(wavelets.data[group][channel])  

    if waveletsArrays is not None and len(waveletsArrays)>1:
        waveletsShape = waveletsArrays[0].shape[1:]

        waveletsPvals = np.empty(waveletsShape)
        for row in range(waveletsShape[0]):
            for column in range(waveletsShape[1]):
                values = [wavelet[:, row, column] for wavelet in waveletsArrays]
                _, pVal = stats.f_oneway(*values)

                if bonfCorrect == True:
                    numValues = waveletsShape[0]*waveletsShape[1]
                else:
                    numValues = 1
                
                if math.isnan(pVal):
                    waveletsPvals[row, column] = 1

                else:
                    waveletsPvals[row, column] = min(pVal * numValues, 1)

        waveletsAnova = np.expand_dims(waveletsPvals,axis=0)
  
        data_ANOVA.update({
            "wavelets_data"  : json.dumps(waveletsAnova.tolist()),
            "wavelets_freq"  : wavelets.freq.tolist(),
            "wavelets_time"  : wavelets.time.tolist(),
        })
      
    LFPs = DataCache.LFPs
    LFPsArrays = None

    if currentGroup in LFPs.data and channel in LFPs.data[currentGroup]:
        LFPsArrays = []
        for group in groups:
            if group in LFPs.data and channel in LFPs.data[group]:
                LFPsArrays.append(LFPs.data[group][channel])  
    
    if LFPsArrays is not None and len(LFPsArrays)>1:
        LFPsShape  = LFPsArrays[0].shape[1]
        
        LFPsPvals = np.empty(LFPsShape)
        for row in range(LFPsShape):
            values = [LFP[:,row] for LFP in LFPsArrays]
            _, pVal = stats.f_oneway(*values)

            if bonfCorrect == True:
                numValues = LFPsShape
            else:
                numValues = 1

            if math.isnan(pVal):
                LFPsPvals[row] = .99
            else:
                LFPsPvals[row] = min(pVal * numValues, .99)
        
        LFPsAnova = np.expand_dims(LFPsPvals,axis=0)  

        data_ANOVA.update({
            "LFPs_data"      : json.dumps(LFPsAnova.tolist()),
            "LFPs_time"      : LFPs.time.tolist()
        })

    return jsonify(data_ANOVA)


@application.route('/api/PCA', methods= ['POST'])
def run_PCA():

    args         = request.json
    currentGroup = args.get('group')
    channel      = args.get('channel')
    baseCorrect  = args.get('baseCorrect')

    wavelets = DataCache.wavelets
    groups   = DataCache.groups

    if currentGroup not in groups:
        groups.append(currentGroup)
    
    arrays = []
    pcaGroups = []
    for group in groups:
        if group in wavelets.data and channel in wavelets.data[group]:
            if baseCorrect == True:
                arrays.append(wavelets.data[group][channel]*wavelets.freq[None,:,None])
            else:
                arrays.append(wavelets.data[group][channel]) 
            pcaGroups.append(group) 

    shapes = [wavelets.shape for wavelets in arrays]
    trials = [wavelet.shape[0] for wavelet in arrays] 

    pcaMatrix = [wavelet.reshape(wavelet.shape[0], -1) for wavelet in arrays]

    pcaStacked = np.concatenate(pcaMatrix, axis=0)

    scaler = StandardScaler()
    pcaScaled = scaler.fit_transform(pcaStacked)
    pca = PCA() 
    pcaFit = pca.fit_transform(pcaScaled)
    maxComponents = (pca.components_.shape[0])
    
    if not args.get('componentStart'):
        componentStart = 0
        componentEnd = maxComponents
    elif args.get('componentStart'):
        componentStart = args.get('componentStart')
        componentEnd = args.get('componentEnd')

    pcaComponents = pcaFit[:, componentStart:componentEnd]
    
    accuracy = []
    if len(trials)>1:
        targetNames = [f'target{i+1}' for i in range(len(trials))] 
        targetList  = [target for num, target in zip(trials, targetNames) for _ in range(num)]
        xTrain, xTest, yTrain, yTest = train_test_split(pcaComponents, targetList, test_size=0.2)
        mdl = SVC(kernel='linear') 

        mdl.fit(xTrain, yTrain)

        yPred = mdl.predict(xTest)
        accuracy = int(accuracy_score(yTest, yPred) * 100)

    componentSelected = pca.components_[componentStart:componentEnd] 
    pcaMean   = pca.mean_

    pcaReconstructed = np.dot(pcaComponents, componentSelected) + pcaMean
    
    splits = np.cumsum(trials[:-1])

    split = np.split(pcaReconstructed, splits)
    
    DataCache.pca = [wavelet.reshape(shapes[idx]) for idx, wavelet in enumerate(split)]# PCA-transformed wavelets from all selected groups 
    
    pcaWavelets = DataCache.pca[pcaGroups.index(currentGroup)] # PCA-transformed wavelets for currently selected group

    pcaWaveletsMean = np.expand_dims(np.mean(pcaWavelets,axis=0),axis=0)

    return jsonify({
        "wavelets_data" : json.dumps(pcaWavelets.tolist()),
        "wavelets_mean" : json.dumps(pcaWaveletsMean.tolist()),
        "wavelets_freq" : wavelets.freq.tolist(),
        "wavelets_time" : wavelets.time.tolist(),
        "maxComponents" : maxComponents,
        "variance"      : [int(var * 100) for var in pca.explained_variance_ratio_],
        "accuracy"      : accuracy
    })


@application.route('/api/cacheCheck', methods = ['POST'])
def check_Cache():

    LFPsData = None
    waveletsData = None

    args     = request.json
    group    = args.get('group')
    channel  = args.get('channel')

    wavelets = DataCache.wavelets
    LFPs     = DataCache.LFPs
    
    if group in wavelets.data and channel in wavelets.data[group]:
        waveletsData = wavelets.data[group][channel]
        waveletsMean = np.expand_dims(np.mean(waveletsData,axis=0),axis=0)

    if group in LFPs.data and channel in LFPs.data[group]:
        LFPsData = LFPs.data[group][channel]
        LFPsMean = np.expand_dims(np.mean(LFPsData,axis=0),axis=0)
    
    returnData = {}

    if LFPsData is None and waveletsData is None:
        returnData.update({
            "LFPs_data"     : None,
            "wavelets_data" : None
        })
            
    if LFPsData is not None:
        returnData.update({
            "LFPs_data" : json.dumps(LFPsData.tolist()),
            "LFPs_mean" : json.dumps(LFPsMean.tolist()),
            "LFPs_time" : LFPs.time.tolist(),
        })

    if waveletsData is not None:
        returnData.update({
            "wavelets_data" : json.dumps(waveletsData.tolist()),
            "wavelets_mean" : json.dumps(waveletsMean.tolist()),
            "wavelets_time" : wavelets.time.tolist(),
            "wavelets_freq" : wavelets.freq.tolist(),
        })
        
    return jsonify(returnData)


@application.route('/api/dbData', methods=['POST'])
def get_data():
    args     = request.json
    subject  = args.get('subject')
    group    = args.get('group')
    category = args.get('category')
    channel  = args.get('channel')
    run      = args.get('run')

    db = Database()
    arrayList, timeStart, timeStop, freqScale, xBins, yBins = db.get_trialData(
        channel, subject, run, category, group
    )
    
    decompressedLFP     = [item["LFPs"] for item in arrayList]
    decompressedWavelet = [item["wavelets"] for item in arrayList]
    reshapedWaveletData = [arr.reshape(xBins, yBins) for arr in decompressedWavelet]
        
    LFPsData     = np.stack(decompressedLFP, axis=-1).transpose(1,0)
    waveletsData = np.stack(reshapedWaveletData, axis=-1).transpose(2,0,1)
    
    wavelets = DataCache.wavelets
    LFPs     = DataCache.LFPs

    LFPs.time     = np.linspace(timeStart,timeStop,LFPsData.shape[1])
    wavelets.time = np.linspace(timeStart,timeStop,waveletsData.shape[2])
    wavelets.freq = np.logspace(np.log10(freqScale[0][0]), 
                                np.log10(freqScale[-1][0]), 
                                waveletsData.shape[1])
    
    if group not in wavelets.data:
        wavelets.data[group] = {}
        LFPs.data[group] = {}

    wavelets.data[group][channel] = waveletsData
    LFPs.data[group][channel] = LFPsData
    
    return jsonify('uploaded data')


@application.route('/api/uploadWavelet', methods=['POST'])
def upload_Wavelet():
    json_data = json.loads(request.form['jsonData'])
    timeStart = json_data['timeStart']
    timeStop  = json_data['timeStop']
    freqLow   = json_data['freqLow']
    freqHigh  = json_data['freqHigh']
    group     = json_data['group']
    channel   = json_data['channel']

    requestFile = request.files['file']
    
    uploads = Upload()
    fileUpload = uploads.upload(requestFile)

    waveletsData = fileUpload.transpose(2,0,1)

    wavelets = DataCache.wavelets
    
    if group not in wavelets.data:
        wavelets.data[group] = {}
    
    wavelets.data[group][channel] = waveletsData
    wavelets.freq = np.logspace(np.log10(freqLow), np.log10(freqHigh), waveletsData.shape[1])
    wavelets.time = np.linspace(timeStart,timeStop,waveletsData.shape[2])

    return jsonify('uploaded wavelet')

   
@application.route('/api/uploadLFP', methods=['POST'])
def upload_LFP():
    json_data   = json.loads(request.form['jsonData'])
    timeStart   = json_data['timeStart']
    timeStop    = json_data['timeStop']
    group       = json_data['group']
    channel     = json_data['channel']
    
    fileRequest = request.files['file']

    uploads = Upload()
    fileUpload = uploads.upload(fileRequest)
    
    data = fileUpload.transpose(1, 0)
    
    LFPs = DataCache.LFPs
    
    if group not in LFPs.data:
        LFPs.data[group] = {}
    LFPs.data[group][channel] = data
    
    LFPs.time = np.linspace(timeStart, timeStop, data.shape[1])

    return jsonify('uploaded LFP')


@application.route('/api/clearAllCache', methods=['POST'])
def clear_AllCache():
    DataCache.init()
    print('cleared cache')
    return jsonify('cleared cache')


@application.route('/api/deleteGroupWavelets', methods = ['POST'])
def delete_GroupWavelets():
    args  = request.json
    group = args.get('group')
    DataCache.init_Wavelets(group)
    return jsonify('deleted Group Wavelets')


@application.route('/api/deleteGroupLFPs', methods = ['POST'])
def delete_GroupLFPs():
    args = request.json
    group = args.get('group')
    DataCache.init_LFPs(group)
    return jsonify('deleted Group LFPs')


@application.route('/api/deleteGroupNumbers', methods=['POST'])
def delete_GroupNumbers():
    DataCache.groups = []
    print('deleted group numbers')
    return jsonify('deleted group numbers')

@application.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200