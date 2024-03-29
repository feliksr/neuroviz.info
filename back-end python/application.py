import json
import io
import math
import os
import mysql.connector
import numpy as np
import scipy.stats as stats

from werkzeug.utils import secure_filename 
from scipy.io import loadmat
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

application = Flask(__name__)
application.config['CACHE_TYPE'] = 'SimpleCache'

cache = Cache(application)
timeout = 36000
limiter = Limiter(
    app=application,
    key_func=get_remote_address, 
    default_limits=["3000 per day", "20 per minute"] 
)

CORS(application)

DB_CONFIG_JSON = os.environ.get('DB_CONFIG')
DB_CONFIG = json.loads(DB_CONFIG_JSON)


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
        chanLabels  = [chan[1] for chan in chans]

        return chanNumbers, chanLabels


    def get_trialData(self, channel, 
                      subject, run, 
                      stimGroup, category):
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

            with np.load(waveletBuffer, allow_pickle=True) as f:
                waveletArray = f['arr_0'] 

            with np.load(LFPbuffer,  allow_pickle=True) as f:
                LFParray = f['arr_0'] 
            
            channelArrays.append({
                "LFPs": LFParray,
                "wavelets": waveletArray
            })

        cursor.close()
        conn.close()
    
        freqScale_list = json.loads(freqScale)

        return channelArrays, timeStart, timeStop, freqScale_list, xBinsWavelet, yBinsWavelet


class Upload:
    def upload(self,request):

        filename = secure_filename(request.filename)  
        path, extension = os.path.splitext(filename)   
        extension = extension.lower()          

        if extension == '.npy':
            data = np.load(request, allow_pickle=False).astype(np.int32)

        elif extension == '.mat':
            mat_content = io.BytesIO(request.read())
            mat_data = loadmat(mat_content)
            data = (mat_data[path]).astype(np.int32)
        else:
            data = None

        return data


@application.route('/api/chans', methods=['POST'])
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
        "chanLabels" : chanLabels
    })


@application.route('/api/ANOVA', methods= ['POST'])
@limiter.exempt()
def run_ANOVA():
    LFPs_ANOVA     = None
    wavelets_ANOVA = None
    data_ANOVA     = {}
    
    json_data   = json.loads(request.form['jsonData'])
    
    LFPs          = cache.get('LFPs_data')
    LFPs_time     = cache.get('LFPs_time')
    wavelets_time = cache.get('wavelets_time')
    wavelets_freq = cache.get('wavelets_freq')

    groupNumber = json_data['groupNumber']
    bonfCorrect = json_data['bonfCorrect']
    PCA_reduce  = json_data['PCAreduce']

    if not cache.get('groupNumbers'):
        cache.set('groupNumbers', [], timeout = timeout)

    groupNumbers = cache.get('groupNumbers')
    if groupNumber not in groupNumbers:
        groupNumbers.append(groupNumber)
        cache.set('groupNumbers', groupNumbers, timeout = timeout)
    print('ANOVA', groupNumbers)
    
    wavelets = cache.get('wavelets_data')

    if wavelets and sum(wavelets[i] is not None for i in groupNumbers) > 1:
        
        if PCA_reduce:
            wavelets_arrays  = cache.get('PCA_data')
        else:
            wavelets_arrays = [wavelets[i] for i in groupNumbers if wavelets[i] is not None]
        
        wavelets_shapeWavelet = wavelets_arrays[0].shape[1:]

        wavelets_pVals = np.empty(wavelets_shapeWavelet)
        for row in range(wavelets_shapeWavelet[0]):
            for column in range(wavelets_shapeWavelet[1]):
                values = [wavelet[:, row, column] for wavelet in wavelets_arrays]
                _, pVal = stats.f_oneway(*values)

                if bonfCorrect == True:
                    numValues = wavelets_shapeWavelet[0]*wavelets_shapeWavelet[1]
                else:
                    numValues = 1
                
                if math.isnan(pVal):
                    wavelets_pVals[row, column] = 1

                else:
                    wavelets_pVals[row, column] = min(pVal * numValues, 1)

        wavelets_ANOVA = np.expand_dims(wavelets_pVals,axis=0)
      
    if LFPs and sum(LFPs[i] is not None for i in groupNumbers) > 1:

        LFPs_arrays = [LFPs[i] for i in groupNumbers if LFPs[i] is not None]
        LFPs_shapeLFP = LFPs_arrays[0].shape[1]
        
        LFPs_pVals = np.empty(LFPs_shapeLFP)
        for row in range(LFPs_shapeLFP):
            values = [LFP[:,row] for LFP in LFPs_arrays]
            _, pVal = stats.f_oneway(*values)

            if bonfCorrect == True:
                numValues = LFPs_shapeLFP
            else:
                numValues = 1

            if math.isnan(pVal):
                LFPs_pVals[row] = .99
            else:
                LFPs_pVals[row] = min(pVal * numValues, .99)
        
        LFPs_ANOVA = np.expand_dims(LFPs_pVals,axis=0)  
    
    if wavelets_ANOVA is not None:
        data_ANOVA.update({
            "wavelets_data" : json.dumps(wavelets_ANOVA.tolist()),
            "wavelets_freq"  : wavelets_freq.tolist(),
            "wavelets_time"  : wavelets_time.tolist(),
        })

    if LFPs_ANOVA is not None:
        data_ANOVA.update({
            "LFPs_data"      : json.dumps(LFPs_ANOVA.tolist()),
            "LFPs_time"      : LFPs_time.tolist()
        })

    return jsonify(data_ANOVA)

@application.route('/api/PCA', methods= ['POST'])
@limiter.exempt()
def run_PCA():
    json_data   = json.loads(request.form['jsonData'])
    groupNumber = json_data['groupNumber']
    baseCorrect = json_data['baseCorrect']

    wavelets_time = cache.get('wavelets_time')
    wavelets_freq = cache.get('wavelets_freq') 
    wavelets      = cache.get('wavelets_data')

    if not cache.get('groupNumbers'):
        cache.set('groupNumbers', [], timeout = timeout)
    
    groupNumbers = cache.get('groupNumbers')
    if groupNumber not in groupNumbers:
        groupNumbers.append(groupNumber)
        cache.set('groupNumbers', groupNumbers, timeout = timeout)    

    if baseCorrect == True:
        wavelets_arrays = [wavelets[i]*wavelets_freq[None,:,None] for i in groupNumbers if wavelets[i] is not None]
    else:
        wavelets_arrays = [wavelets[i] for i in groupNumbers if wavelets[i] is not None]

    wavelets_shape  = [wavelets.shape for wavelets in wavelets_arrays]

    wavelets_PCA_matrix = [wavelet.reshape(wavelet.shape[0], -1) for wavelet in wavelets_arrays]

    wavelets_PCA_stacked = np.concatenate(wavelets_PCA_matrix, axis=0)

    scaler = StandardScaler()
    wavelets_PCA_scaled = scaler.fit_transform(wavelets_PCA_stacked)
    pca = PCA() 
    wavelets_PCA = pca.fit_transform(wavelets_PCA_scaled)
    maxComponents = (pca.components_.shape[0])
    
    if not json_data['componentStart']:
        componentStart = 0
    elif json_data['componentStart']>maxComponents:
        componentStart = maxComponents
    else :
        componentStart = json_data['componentStart']-1

    if not json_data['componentEnd'] or json_data['componentEnd']>maxComponents:
        componentEnd = maxComponents
    elif json_data['componentEnd']:
        componentEnd = json_data['componentEnd']

    wavelets_PCA_components = wavelets_PCA[:, componentStart:componentEnd]

    components_selected = pca.components_[componentStart:componentEnd]
    wavelets_PCA_mean = pca.mean_

    wavelets_PCA_reconstructed = np.dot(wavelets_PCA_components, components_selected) + wavelets_PCA_mean

    wavelets_trials = [shape[0] for shape in wavelets_shape] 
    
    splits = np.cumsum(wavelets_trials[:-1])

    wavelets_split = np.split(wavelets_PCA_reconstructed, splits)
    
    PCA_data = [wavelet.reshape(wavelets_shape[index]) for index, wavelet in enumerate(wavelets_split)]
    cache.set('PCA_data', PCA_data, timeout= timeout)

    wavelets_data = PCA_data[groupNumbers.index(groupNumber)]

    wavelets_mean = np.expand_dims(np.mean(wavelets_data,axis=0),axis=0)
    
    return jsonify({
        "wavelets_data"  : json.dumps(wavelets_data.tolist()),
        "wavelets_mean"  : json.dumps(wavelets_mean.tolist()),
        "wavelets_freq"  : wavelets_freq.tolist(),
        "wavelets_time"  : wavelets_time.tolist(),
        "componentStart" : componentStart+1,
        "componentEnd"   : componentEnd
    })

@application.route('/api/stored', methods=['POST'])
def serve_data():
    args        = request.json
    subject     = args.get('subject')
    group       = args.get('group')
    stimGroup   = args.get('stimGroup')
    channel     = args.get('channel')
    run         = args.get('run')
    groupNumber = args.get('groupNumber')
    
    db = Database()
    arrayList, timeStart, timeStop, freqScale, xBins, yBins = db.get_trialData(
        channel, subject, run, stimGroup, group)
    
    decompressedLFP     = [item["LFPs"] for item in arrayList]
    decompressedWavelet = [item["wavelets"] for item in arrayList]
    reshapedWaveletData = [arr.reshape(xBins, yBins) for arr in decompressedWavelet]
        
    LFPs_data     = np.stack(decompressedLFP, axis=-1).transpose(1,0)
    wavelets_data = np.stack(reshapedWaveletData, axis=-1).transpose(2,0,1)

    wavelets_mean = np.expand_dims(np.mean(wavelets_data,axis=0),axis=0)

    LFPs_mean     = np.expand_dims(np.mean(LFPs_data,axis=0),axis=0)
    
    wavelets_freq = np.logspace(np.log10(freqScale[0][0]), np.log10(freqScale[-1][0]), wavelets_data.shape[1])

    wavelets_time = np.linspace(timeStart,timeStop,wavelets_data.shape[2])
    LFPs_time     = np.linspace(timeStart,timeStop,LFPs_data.shape[1])

  
    if not cache.get('wavelets_data'):
        cache.set('LFPs_data', [None] * 10, timeout = timeout)
        cache.set('wavelets_data', [None] * 10, timeout = timeout)
        
    wavelets_arrays = cache.get('wavelets_data')
    LFPs_arrays     = cache.get('LFPs_data')

    wavelets_arrays[groupNumber] = wavelets_data
    LFPs_arrays[groupNumber]     = LFPs_data

    cache.set('LFPs_data', LFPs_arrays, timeout = timeout)
    cache.set('LFPs_time', LFPs_time, timeout = timeout)
    cache.set('wavelets_data', wavelets_arrays , timeout = timeout)
    cache.set('wavelets_time', wavelets_time, timeout = timeout)
    cache.set('wavelets_freq', wavelets_freq, timeout = timeout)

    return jsonify({
        "wavelets_data"  : json.dumps(wavelets_data.tolist()),
        "wavelets_mean"  : json.dumps(wavelets_mean.tolist()),
        "wavelets_freq"  : wavelets_freq.tolist(),
        "wavelets_time"  : wavelets_time.tolist(),
        "LFPs_data"      : json.dumps(LFPs_data.tolist()),
        "LFPs_mean"      : json.dumps(LFPs_mean.tolist()),
        "LFPs_time"      : LFPs_time.tolist()
    })


@application.route('/api/uploadWavelet', methods=['POST'])
def upload_Wavelet():
    json_data   = json.loads(request.form['jsonData'])
    timeStart   = json_data['timeStart']
    timeStop    = json_data['timeStop']
    freqLow     = json_data['freqLow']
    freqHigh    = json_data['freqHigh']
    groupNumber = json_data['groupNumber']

    wavelets_request = request.files['file']
    
    uploads = Upload()
    wavelets_upload = uploads.upload(wavelets_request)

    wavelets_data = wavelets_upload.transpose(2,0,1)

    wavelets_mean  = np.expand_dims(
                            np.mean(wavelets_data,axis=0)
                                ,axis=0)

    if not cache.get('wavelets_data'):
        cache.set('wavelets_data', [None] * 10, timeout = timeout)
        
    arrays = cache.get('wavelets_data')  
    arrays[groupNumber] = wavelets_data
    cache.set('wavelets_data', arrays, timeout= timeout)
    
    wavelets_freq = np.logspace(np.log10(freqLow), np.log10(freqHigh), wavelets_data.shape[1])
    wavelets_time = np.linspace(timeStart,timeStop,wavelets_data.shape[2])
    cache.set('wavelets_time', wavelets_time,timeout = timeout)
    cache.set('wavelets_freq', wavelets_freq, timeout = timeout)

    return jsonify({
        "wavelets_data"  : json.dumps(wavelets_data.tolist()),
        "wavelets_mean"  : json.dumps(wavelets_mean.tolist()),
        "wavelets_freq"  : wavelets_freq.tolist(),
        "wavelets_time"  : wavelets_time.tolist(),
    })
    
@application.route('/api/uploadLFP', methods=['POST'])
def upload_LFP():
    json_data   = json.loads(request.form['jsonData'])
    timeStart   = json_data['timeStart']
    timeStop    = json_data['timeStop']
    groupNumber = json_data['groupNumber']
    
    LFPs_request = request.files['file']

    uploads = Upload()
    LFPs_upload = uploads.upload(LFPs_request)
    
    LFPs_data = LFPs_upload.transpose(1, 0)

    LFPs_mean = np.expand_dims(
                    np.mean(LFPs_data,axis=0)
                        ,axis=0)
    
    if not cache.get('LFPs_data'):
        cache.set('LFPs_data', [None] * 10, timeout = timeout)
          
    arrays = cache.get('LFPs_data')
    arrays[groupNumber] = LFPs_data
    cache.set('LFPs_data', arrays, timeout= timeout)

    LFPs_time = np.linspace(timeStart,timeStop,LFPs_data.shape[1])
    cache.set('LFPs_time', LFPs_time,timeout=timeout)
   
    return jsonify({
        "LFPs_data"  : json.dumps(LFPs_data.tolist()),
        "LFPs_mean"  : json.dumps(LFPs_mean.tolist()),
        "LFPs_time"  : LFPs_time.tolist()
    })

@application.route('/api/clear', methods=['POST'])
@limiter.exempt()
def clear_Cache():
    cache.clear()
    print('cleared cache')
    return 'cleared cache'

@application.route('/api/delete', methods=['POST'])
@limiter.exempt()
def delete_groupNumbers():
    cache.delete('groupNumbers')
    cache.delete('PCA_data')
    print('deleted numbers')
    return 'deleted group numbers and PCA_data'

@application.route('/api/health', methods=['GET'])
@limiter.exempt()
def health_check():
    return jsonify({'status': 'healthy'}), 200
