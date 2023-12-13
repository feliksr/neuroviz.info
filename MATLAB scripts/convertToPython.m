clear
patientNum = 4;
groupCat = 'targetStatus';
alignSpot = 'response';
stimGroup = 'Stimulus Type';
subject = 'YDX';
lenTime = [-2 1];

[LFP, wavelet,dataParams] = convert(patientNum,groupCat,alignSpot,lenTime);
chanLabels=dataParams.channelLabel;
chanNums=dataParams.chanNum;
freqScale=(1./dataParams.scale)';
groupLabels = strrep(dataParams.(dataParams.comparisonName), ' ', '');

function [LFP, wavelet,dataParams] = convert(patientNum,groupCat,alignSpot,lenTime)

decodeObj = 'ObjectIdentification';
patientsDir = ['\\rolstonserver\d\Code\Feliks\AlgoPlace\Data\' decodeObj '\Processed\' alignSpot '\'];
patientsFiles = dir([patientsDir groupCat]); 
patientFile = patientsFiles(patientNum);

load([patientsDir groupCat '\' patientFile.name]);

labels = strrep(dataParams.(dataParams.comparisonName), ' ', '');

numSamplesLFP = size(LFPdata(1).group,1);
timeLFP = linspace(-dataParams.preSeconds,dataParams.postSeconds,numSamplesLFP);
samplesLFP = find(timeLFP >= lenTime(1) & timeLFP <= lenTime(2));

numSamplesWavelet = size(waveData(1).group,2);
timeWavelet = linspace(-dataParams.preSeconds,dataParams.postSeconds,numSamplesWavelet);
samplesWavelet = find(timeWavelet >= lenTime(1) & timeWavelet <= lenTime(2));

for i = 1:length(labels)
    LFP.(labels{i}) = LFPdata(i).group(samplesLFP,:,:);
    wavelet.(labels{i}) = waveData(i).group(:,samplesWavelet,:,:);
end
end
