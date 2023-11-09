% Modified from batchAlignLFP by Dr. Elliot Smith
function batchAlignLFP_notBirds(comparisonName,align,color)
dataParams.comparisonName = comparisonName; % targetStatus, targetStimulus, or stimulusIdentity
dataParams.alignSpot = align; % stimulus or response 
dataParams.notchFilter = true; % set filter on(true) or off(false)
dataParams.Fnew = 400; % Downsample to new frequency
% Parameters for chronux, not necessary when using wavelet
dataParams.fpass = [1 50]; % frequency range to analyze
dataParams.movingWin = [0.5 0.2];  %moving window size and step size
dataParams.tapers = [3 5];
dataParams.pad = 1;
dataParams.err = [1 0.05];

if strcmpi(align,'response')
    dataParams.preSeconds =  3; 
    dataParams.postSeconds = 2;
elseif strcmpi(align,'stimulus')
    dataParams.preSeconds =  2; 
    dataParams.postSeconds = 3;
end
if color
    parentDir = '\\rolstonserver\d\Code\Feliks\AlgoPlace\Data\ColorIdentification\';
    % loading habiba's file
    if ~exist('PDdata','var')
        load ([parentDir 'PDdata_030621.mat'])
    end    
    %removing UCLA patients from analysis, no LFP data
    spkData = PDdata([1:8 11:18 22:27]);
    LFPids = [repmat("YCS",1,2) repmat("YCT",1,3) repmat("YCY",1,2) repmat("YDC",1,1) repmat("YDF",1,3) repmat("YDG",1,3) repmat("YDH",1,2) repmat("YDJ",1,6)];

else
    parentDir = '\\rolstonserver\d\Code\Feliks\AlgoPlace\Data\ObjectIdentification\';
    % loading habiba's file
    if ~exist('data','var')
        load ([parentDir 'birdsData_06-Apr-2022.mat'])
    end
    %removing UCLA patient from analysis, no LFP data
    spkData = data([1:11 13:15]);
    LFPids = [repmat("YDX",1,3) repmat("YDY",1,4) repmat("YEA",1,4) repmat("YEB",1,2) repmat("YEC",1,1)];
end
% looping across all patients and sessions        
for sess = 1 : length(spkData)
    unitData = spkData(sess);
    ptID = char(LFPids(sess));
    patientDir = [parentDir ptID '\seeg\'];
    % locate folders with patient LFP data
    LFPfolders = dir(patientDir);
    LFPfolders = LFPfolders(3:end);
    % determine which LFP folders belong to current session/run number
    indxRun = contains(LFPids,ptID);
    dataParams.nRun = nnz(indxRun(1:sess));
    LFPfolder = LFPfolders(dataParams.nRun).name;
    fileDir =  dir(fullfile(patientDir,LFPfolder,'*.ns3'));
    alignLFPandSpikes_Feliks(parentDir,ptID,dataParams,unitData,fileDir,color);
end
beep

  