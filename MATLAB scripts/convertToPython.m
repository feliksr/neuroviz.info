clear
patientNum = 3;

[LFP, wavelet,dataParams,lenTime] = convert(patientNum);
chanLabel=dataParams.channelLabel;
chanNum=dataParams.chanNum;
freqScale=(1./dataParams.scale)';
groupLabels = strrep(dataParams.(dataParams.comparisonName), ' ', '');
stimGroup = 'Stimulus Identity';
subject = 'YDX';


function [LFP, wavelet,dataParams,lenTime] = convert(patientNum)
groupCat = 'stimulusIdentity';
alignSpot = 'response';
lenTime = [-2 1];
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
