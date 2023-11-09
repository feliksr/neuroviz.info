clear
patientNum = 3;

[LFP, wavelet, dataParams] = convert(patientNum);
chanLabel=dataParams.channelLabel;
chanNum=dataParams.chanNum;
scale=(1./dataParams.scale)';
waveWin = dataParams.samplesWavelet;
LFPWin = dataParams.samplesLFP;

function [LFP, wavelet, dataParams] = convert(patientNum)
groupCat = 'targetStatus';
alignSpot = 'response';
decodeObj = 'ObjectIdentification';
patientsDir = ['\\rolstonserver\d\Code\Feliks\AlgoPlace\Data\' decodeObj '\Processed\' alignSpot '\'];
patientsFiles = dir([patientsDir groupCat]); 
patientFile = patientsFiles(patientNum);

load([patientsDir groupCat '\' patientFile.name]);
labels = dataParams.(dataParams.comparisonName);

numSamplesLFP = size(LFPdata(1).group,1);
timeLFP = linspace(-dataParams.preSeconds,dataParams.postSeconds,numSamplesLFP);
samplesLFP = find(timeLFP >= -2 & timeLFP <= 1);
dataParams.samplesLFP = samplesLFP;

numSamplesWavelet = size(waveData(1).group,2);
timeWavelet = linspace(-dataParams.preSeconds,dataParams.postSeconds,numSamplesWavelet);
samplesWavelet = find(timeWavelet >= -2 & timeWavelet <= 1);
dataParams.samplesWavelet = samplesWavelet;

for i = 1:length(labels)
    LFP.(labels{i}) = LFPdata(i).group;
    wavelet.(labels{i}) = waveData(i).group;
end
end
