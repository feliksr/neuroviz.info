% Modified from alignLFPandSpikes from Dr. Elliot Smith
function alignLFPandSpikes_Feliks(parentDir,ptID,dataParams,unitData,fileDir,birds)

% opens NSx file (NS3 in this case for loading LFP data) from Blackrock Neurotech 
LFPData = [];
for i = 1 : length(fileDir)
%     nFile = i
    NSX = openNSx(fullfile(fileDir(i).folder, fileDir(i).name));
%     sizeNSX = size(NSX.Data)
    tmpNSXData = NSX.Data;
    if isequal(class(tmpNSXData),'int16')
        NSXData = NSX.Data;
    else
        NSXData = NSX.Data{end};
    end
    if size(NSXData,1)>50
        LFPData = [LFPData NSXData];
%         LFPsize = size(LFPData)
        % load macroelectrode (LFP) labels
        macroLabels = {NSX.ElectrodesInfo.Label}';
    end
end

idx = contains(macroLabels,'empty') | startsWith(macroLabels,'x') | startsWith(macroLabels,'C') | startsWith(macroLabels,'Z');
% refIDX = startsWith(macroLabels,'C');
% refData = LFPData(refIDX==1,:);
LFPData = LFPData(idx==0,:);
% LFPData = LFPData-refData;
macroLabels = macroLabels(idx==0);

electrodeData = readtable([parentDir ptID '\electrodes.csv']);
for i = 1:length(macroLabels)
    str = deblank(macroLabels{i});
    chanNum = str2num(str(end-2:end));
    matchingRow = electrodeData.ElectrodeID == chanNum;
    chanRegion{i,:} = electrodeData.Area_fs(matchingRow);
    elecNum(i,:) = chanNum;
end

% % Get the number and cell vectors
% numbers = electrodeData.ElectrodeID;
% strings = electrodeData.ROI_vis;
% % Find the indices of numbers corresponding to a specific string value
% matchString = 'ins'; % Replace with the string value you want to match
% matchIndices = find(strcmpi(strings, matchString));
% matchingNumbers = numbers(matchIndices);
% 
% pattern = '\d+';
% numericParts = cellfun(@(s) regexp(s, pattern, 'match'), macroLabels, 'UniformOutput', false);
% numericLastElements = cellfun(@(c) c{end}, numericParts, 'UniformOutput', false);
% numericArray = str2double(numericLastElements);
% 
% [~, matchIdx] = ismember(matchingNumbers, numericArray);
% 
% LFPData=LFPData(matchIdx,:);
% macroLabels = macroLabels(:,matchIdx);

% nUnits = length(unitData.psths)

% load microelectrode (unit) labels.
% microLabels = {unitData.psths.electrodeLabel};
% regions = {unitData.psths.region}; regions = convertCharsToStrings(regions);

%resampling LFP at Fnew sampling frequency and notch filtering...

Fnew = dataParams.Fnew;
Fs = NSX.MetaTags.SamplingFreq;
LFP = resample(double(LFPData),Fnew,Fs,dim=2);


w0 = 60/(Fnew/2); bw = w0/35; [num,dem] = iirnotch(w0,bw);            
w1 = 120/(Fnew/2); bw1= w1/35; [num1,dem1] = iirnotch(w1,bw1);
w2 = 180/(Fnew/2); bw2 = w2/35; [num2,dem2] = iirnotch(w2,bw2);

if dataParams.notchFilter
    filtLFP = filtfilt(num,dem,LFP);
    filtfiltLFP = filtfilt(num1,dem1,filtLFP); 
    LFP = filtfilt(num2,dem2,filtfiltLFP);
end
% stdLFP = std(LFP,0,'all');
% for i =1:size(LFP,1)
%     for j = 1 : size(LFP,2)
%         if LFP(i,j)>10*stdLFP || LFP(i,j)<-10*stdLFP
% %         figure(i)
% %         plot(LFP(i,:)')
%         LFP(i,:)=NaN;
%         break
%         end
%     end
% end
% 
% notNan = ~isnan(LFP(:,1));
% LFP = LFP(notNan,:);
% % LFP = reshape(LFP, sum(notNan(:,1)), []);
% chanRegion = chanRegion(notNan);
% elecNum = elecNum(notNan);

Fs = Fnew;
dataParams.Fs = Fs; 

% specifies timing of either stimulus (picture) or response (button-press)
if isequal(dataParams.alignSpot,'stimulus')
    alignTimes = unitData.stepVarsFlat(:,7);
    nanTimes = isnan(alignTimes);
    nNan = sum(nanTimes)
    alignTimes(nanTimes) = [];
elseif isequal(dataParams.alignSpot,'response')
    alignTimes = unitData.stepVarsFlat(:,11);
    % remove NaN responses
    nanTimes = isnan(alignTimes);
    nNan = sum(nanTimes)
    alignTimes(nanTimes) = [];
  
end
nTrials = length(alignTimes)

switch dataParams.comparisonName
    case {'stimulusIdentity'}
        categ = unitData.stepVarsFlat(:,6);
        dataParams.stimulusIdentity = unitData.sessionDetails(1).animal_names;
    case {'targetStatus'}
        categ = unitData.stepVarsFlat(:,18);
        dataParams.targetStatus = {'Target', 'Distractor', 'Irrelevant'};
    case {'targetStimulus'}
        categ = unitData.stepVarsFlat(:,23);
        dataParams.targetStimulus = unitData.sessionDetails(1).animal_names;
end
categ(nanTimes) = [];
nCats = length(unique(categ))

phaseLFP = unwrap(angle(hilbert(LFP)));
% looping over trials to epoch data.
for tt = 1:nTrials
    % epoch the LFP data here [channels X samples X trials]
 
    LFPmat(:,:,tt) = LFP(:, (floor(Fs*alignTimes(tt)) - Fs*dataParams.preSeconds) : (floor(Fs*alignTimes(tt)) + Fs*dataParams.postSeconds));
    LFPphase(:,:,tt) = phaseLFP(:, (floor(Fs*alignTimes(tt)) - Fs*dataParams.preSeconds) : (floor(Fs*alignTimes(tt)) + Fs*dataParams.postSeconds));
end  
% szLFPmat=size(LFPmat);
% LFPmatMean=mean(LFPmat,1);
% LFPmatSTD = std(LFPmat,[],'all');
% 
% 
% for i = 1:szLFPmat(3)
%     for j = 1:size(LFPmatMean,2)
%         if LFPmatMean(:,j,i) > 3*LFPmatSTD || LFPmatMean(:,j,i) < -3*LFPmatSTD
% %             figure(i)
%             %  plot(LFPmat(:,:,i)')
% %             keyboard
%             categ(i) = NaN;
%             LFPmat(:,:,i) = NaN;
%             LFPphase(:,:,i) = NaN;
%             alignTimes(i) = NaN;
%             break
%         end
%     end
% end
% 
% categ = categ(~isnan(categ));
% LFPmat = LFPmat(~isnan(LFPmat));
% LFPmat = reshape(LFPmat,szLFPmat(1),szLFPmat(2),[]);
% alignTimes = alignTimes(~isnan(alignTimes));
nTrials = length(alignTimes)
nChans = size(LFP,1)

% % select number of trials for trials
% for i =1:nCats
%    display(sum(categ==i));
%    ind = find(categ == i);
% ind_perm = ind(randperm(length(ind)));
% % Replace the first n-k indices with 0's
%     if numel(ind_perm) > numTrials
%         categ(ind_perm(1:numel(ind_perm)-numTrials)) = 0;
%         display(sum(categ==i))
%     end
% end

% for tt = 1:size(LFPmat,3)
%     for un = 1:nUnits
%         % put spike times in epochs structure
%         spikes = (unitData.psths(un).spikeTimes);
%         if birds
%             spikes = spikes';
%         end
%         tSpikes.unit(un).trial(tt).times = spikes(spikes > (alignTimes(tt) - dataParams.preSeconds) & ...
%             spikes < (alignTimes(tt) + dataParams.postSeconds)) - alignTimes(tt) + dataParams.preSeconds; 
%     end
% end
for ct = 1:nCats
%        for un = 1:nUnits
%            if regions(un)=='RCC' || regions(un)=='LCC'
%             unitLabel = microLabels{un};
%             if birds  
%                 if strcmp('YCS',ptID)
%                     if strcmp(unitLabel,'HCH')
%                     macroChan = 1;
%                 elseif strcmp(unitLabel,'ACC')
%                     macroChan = 34;
%                 elseif strcmp(unitLabel,'PCC')
%                     macroChan = 43;
%                 end
%                 elseif strcmp('YCY',ptID)
%                     if strcmp(unitLabel,'HCH')
%                         macroChan = 29;
%                     elseif strcmp(unitLabel,'ACC')
%                         macroChan = 81;
%                     elseif strcmp(unitLabel,'PCC')
%                         macroChan = 115;
%                     end
%                 else
%                     macroChan=1;
%                 end
%             else
% 
%                 nearestMacroIdx = contains(macroLabels,unitLabel(2:end));
%                 macroChan = find(nearestMacroIdx);
%             end

%             macroChan
%             psthData.group(ct).channels(un).specgram = unitData.psths(un).psth_stimulus_flat(categ==ct,:);
%             dataParams.trialave = 0;
%             dataParams.fpass = [1 50];
%             keyboard
%             if ~isempty(macroChan)
%             [C,phi,~,~,~,t,f,~,~,~] = cohgramcpt(squeeze(LFPmat(macroChan,:,categ==ct)), tSpikes.unit(un).trial(categ==ct)', dataParams.movingWin,dataParams,0);
%             SFCdata.group(ct).channels(un).specgram = C;
%             SFCdata.group(ct).channels(un).phase = phi;
%             SFCdata.group(ct).channels(un).nearestMacro = deblank(macroLabels{macroChan});
%             end
%             dataParams.trialave = 1;
%             [C_avg,phi_avg,~,~,~,t,f,~,~,~]=cohgramcpt(squeeze(LFPmat(macroChan,:,categ==ct)), tSpikes.unit(un).trial(categ==ct), dataParams.movingWin, dataParams, 0);
%             SFCdata_avg.group(ct).channels(un).specgram = C_avg;
%             SFCdata_avg.group(ct).channels(un).phase = phi_avg;
%             SFCdata_avg.group(ct).channels(un).nearestMacro = deblank(macroLabels{macroChan});

%            end
%        end
        
        for chan = 1:nChans
            cwtLFP = [];
            classCat = find(categ==ct);
            for i = 1:length(classCat)
                [LFPcwt,PERIOD,SCALE,COI] = basewaveERP(LFPmat(chan,:,classCat(i))',Fs,4,160,6,0);
%                 [LFPcwt,SCALE] = cwt(LFPmat(chan,:,classCat(i))',Fs);
                magCWT = abs(LFPcwt);
                cwtLFP(:,:,i) = magCWT(1:end-1,1:10:end); 
            end
            if chan == 1
                 waveData(ct).group = cwtLFP;
                 LFPdata(ct).group = squeeze(LFPmat(chan,:,categ==ct));
            else
                 waveData(ct).group = cat(4,waveData(ct).group,cwtLFP);
                 LFPdata(ct).group = cat(3,LFPdata(ct).group,squeeze(LFPmat(chan,:,categ==ct)));
            end
%              LFPdata.group(ct).channels(chan).specgram = squeeze(LFPmat(chan,1:10:end,categ==ct));
            
% phaseData.group(ct).channels(chan).specgram = squeeze(LFPphase(chan,:,categ==ct));

%             dataParams.trialave = 0;
%             dataParams.fpass = [1 50];
%             [S1,~,~,~] = mtspecgramc(squeeze(LFPmat(chan,:,categ==ct)),dataParams.movingWin,dataParams);
%             dataParams.fpass = [70 150];
%             [S2,t,f,~] = mtspecgramc(squeeze(LFPmat(chan,:,categ==ct)),dataParams.movingWin,dataParams);
%             specData.group(ct).channels(chan).specgram = [S1(:,1:2:end,:) S2(:,1:20:end,:)];
%             specData.group(ct).channels(chan).channelLabel = deblank(macroLabels{chan});
%             dataParams.trialave = 1;
%             [S_avg,t,f,~] = mtspecgramc(squeeze(LFPmat(chan,:,categ==ct)),dataParams.movingWin,dataParams);
%             specData_avg.group(ct).channels(chan).specgram = S_avg;
%             specData_avg.group(ct).channels(chan).channelLabel = deblank(macroLabels{chan});
        end
end

dataParams.channelLabel = chanRegion;
dataParams.chanNum = elecNum;

if exist('SCALE','var')
dataParams.scale = SCALE(:,1:end-1);
end

if exist('t','var')
dataParams.time = t;
dataParams.freq = f;
end
% save datafile
vr2={};
vr= {'dataParams','phaseData','LFPdata','specData','specData_avg','psthData', ...
      'SFCdata','SFCdata_avg','waveData'};
for i = 1:length(vr)
    if exist(vr{i})
       vr2{end+1} = vr{i};
    end
end
fileName = [parentDir ptID '_session' num2str(dataParams.nRun) '_' dataParams.comparisonName '.mat'];
if exist(fileName, 'file')
    save(fileName, vr2{:},'-append');
else
    save(fileName, vr2{:},'-v7.3');
end

% chanIdx = [1 10 25 75 90 110 125];
% close all
% for chan = 1:length(chanIdx)
%         trial = 50;
%         [S,t,freq,~] = mtspecgramc(squeeze(LFPmat(chanIdx(chan),:,trial)),dataParams.movingWin,dataParams);
%         time = linspace(-dataParams.preSeconds,dataParams.postSeconds,length(t));
%         fSpec=figure(1);
%         subplot(length(chanIdx),1,chan)
%         imagesc(time,freq,S');
%         set(gca,'YDir','normal')
%         colorbar
%         if chan == length(chanIdx)
%         t = xlabel('Time from stimulus onset (sec)');
%         t.FontSize = 16;
%         end
%         ylabel('Frequency (Hz)')
%         f2Spec = figure(2);
%         subplot(length(chanIdx),1,chan)
%         plot(linspace(-dataParams.preSeconds,dataParams.postSeconds,size(LFPmat,2)),LFPmat(chanIdx(chan),:,trial))
%         axis tight
%         if chan == length(chanIdx)
%         t = xlabel('Time from stimulus onset (sec)');
%         t.FontSize = 16;
%         end
% 
% end
% fSpec.WindowState = 'maximized';
% f2Spec.WindowState = 'maximized';
% 
% [t1,t2] = title(fSpec.Children(end), [ptID ' session ', num2str(sessionNumber)]);
% [t2,s2] = title(f2Spec.Children(end), [ptID ' session ', num2str(sessionNumber)]);
% t1.FontSize = 16;
% t2.FontSize = 16;