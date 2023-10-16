function [x_train, y_train, x_test, y_test] = formatDecodeData(patientData,train_testSplit,channel)

x_train=[]; y_train=[]; x_test=[]; y_test=[];

% a = {'coher','spec','wavelet','LFP'};
% if exist('crossCat','var')
%     b = {'SFCdata_avg','specData_avg','waveData','LFPdata'};
% else
%     b = {'SFCdata','specData','waveData','LFPdata'};
% end

dataParams=patientData.dataParams;
labels = dataParams.(dataParams.comparisonName);
specs = patientData.waveData;
nChans = size(specs(1).group,4);
x_testTrials = {}; x_trainTrials = {}; 
for categ = 1:length(specs)
    nTrials = size(specs(categ).group,3);
    [train_idx, ~, test_idx] = dividerand(nTrials, train_testSplit(1), 0, train_testSplit(2)); 
        
    trainSpecgram = []; testSpecgram = []; 
    % for chan = 1
    % for chan = channel
    for chan = 1:nChans
        specgram = specs(categ).group;
        szSpec = size(specgram);
        if strcmpi(dataParams.alignSpot,'stimulus')
           time = linspace(-2,3,szSpec(2));
           baseline = find(time>-1.5 & time<-0.5);
           visWin = find(time>-1 & time<2);
        elseif strcmpi(dataParams.alignSpot,'response')
           time = linspace(-3,2,szSpec(2));
           baseline = find(time>0.25 & time<1.25);
           visWin = find(time>-1 & time<0);
        end
           
        if ~isempty(specgram)
             
           trainSpecgram(:,:,:,chan)=specgram(:,:,train_idx,chan);
           testSpecgram(:,:,:,chan)=specgram(:,:,test_idx,chan);

        end
    end    
    display(size(trainSpecgram))
    x_trainTrials = [x_trainTrials,trainSpecgram];
    y_train = [y_train; repmat(labels(categ),size(trainSpecgram,3),1)];
    x_testTrials = [x_testTrials,testSpecgram];
    y_test = [y_test; repmat(labels(categ),size(testSpecgram,3),1)];
end

    % for j = 1 : nChans
    %     tmp1 = []; tmp2 = [];
    %     for i = 1:length(x_trainTrials)
    %         tm1 = x_trainTrials{i}(:,:,:,j); 
    %         tm2= x_testTrials{i}(:,:,:,j);
    %         tmp1 = cat(3,tmp1,mean(tm1,3));
    %         tmp2 = cat(3,tmp2,mean(tm2,3)); 
    %     end
    %     tmp1 = mean(tmp1,3); 
    %     tmp2 = mean(tmp2,3);
%        for i = 1:length(x_trainTrials)
            % x_trainTrials{i}(:,:,:,j) = (x_trainTrials{i}(:,:,:,j)./mean(tmp1(baseline,:),1));
            % x_testTrials{i}(:,:,:,j) = (x_testTrials{i}(:,:,:,j)./mean(tmp2(baseline,:),1));
%        end
    % end

for i = 1:length(x_trainTrials)
        
        tm01 = x_trainTrials{i}(1:13,visWin,:,:); 
        tm02 = x_testTrials{i}(1:13,visWin,:,:); 
        szTrain = size(tm01);
        szTest = size(tm02);
        x_trainMatTmp = []; x_testMatTmp = [];
        % for j = 1
   % for j = channel
   for j = 1:nChans
            x_trainMat = reshape(tm01(:,:,:,j),szTrain(1)*szTrain(2),szTrain(3));
            x_trainMatTmp = [x_trainMatTmp, x_trainMat'];
            x_testMat = reshape(tm02(:,:,:,j),szTest(1)*szTest(2),szTest(3));
            x_testMatTmp = [x_testMatTmp, x_testMat'];
   end
        x_train = [x_train; x_trainMatTmp];
        x_test = [x_test; x_testMatTmp];   
end

