function [valAcc,testAcc,nullAcc] = decodeData(groupCat,specType,trainTestSplit,detectType,alignSpot)
%groupCat or crossCat = stimulusIdentity, targetStatus, or targetStimulus
%specType = coher for coherograms or spec for spectrograms

nPerms = 3; % number of model permutations
PCA = false; nComps = 2:10;
crossval = false; nKFolds= 5; % number of cross fold validation
trainingNums=10;

if strcmpi(detectType,'color')
    decodeObj = 'ColorIdentification';
    perm = 3:14;    
    % nPatients = 11;
    % nPatients = 23;
elseif strcmpi(detectType,'object')  
    decodeObj  = 'ObjectIdentification';
    perm =3:16;
     % nPatients = 14;
     % nPatients = 4;
end

ptDir = ['\\rolstonserver\d\Code\Feliks\AlgoPlace\Data\' decodeObj '\Processed\' alignSpot '\'];
patientFiles = dir([ptDir groupCat]); 

% ptFileNums = 7;
% patientFile = patientFiles(ptFileNums); 
% patientData=load([ptDir groupCat '\' patientFile.name]);
% perm = 1:nPerms

for perm = perm
    patientFile =  patientFiles(perm);
    patientData=load([ptDir groupCat '\' patientFile.name]);
    
    for channel = 1:length(patientData.dataParams.chanNum)
        [x_train,y_train,x_test,y_test] = formatDecodeData(patientData,trainTestSplit,channel);
        if PCA
            display('standardized')
            x_trainSTD = std(x_train,0,1,'omitnan'); 
            x_trainMean = mean(x_train,1,'omitnan');
            x_train = (x_train - x_trainMean) ./ x_trainSTD;
            x_test = (x_test - x_trainMean) ./ x_trainSTD;
            [coeff,scoreTrain,~,~,~,mu] = pca(x_train);
            x_train = scoreTrain(:,nComps);
            x_test = (x_test-mu)*coeff; x_test = x_test(:,nComps);
        end
            
        optimizationMdl = fitcecoc(x_train,y_train,'Coding','onevsall','Learners','svm','OptimizeHyperparameters', ...
            {'BoxConstraint','KernelScale'},'Options',statset('UseParallel',true),'HyperparameterOptimizationOptions', ...
                struct('ShowPlots',0,'MaxObjectiveEvaluations',trainingNums,'Holdout',0.2));
        kernl = optimizationMdl.HyperparameterOptimizationResults.XAtMinObjective.KernelScale;
        constrain = optimizationMdl.HyperparameterOptimizationResults.XAtMinObjective.BoxConstraint;
        temp=templateSVM('KernelFunction','linear','KernelScale',kernl,'BoxConstraint',constrain);
        
        if crossval
            Mdl = fitcecoc(x_train,y_train,'Coding','onevsall','Learners',temp, ...
                'CrossVal','on','KFold',nKFolds,'Options',statset('UseParallel',true));
                   
            valAcc(perm,channel) = round((1-kfoldLoss(Mdl))*100);
            testAccTmp = []; nullAccTmp = [];
            for k=1:length(Mdl.Trained)
                testAccTmp(k) = (1-loss(Mdl.Trained{k},x_test,y_test))*100;
                nullAccTmp(k) =  (1-loss(Mdl.Trained{k},x_test,y_test(randperm(numel(y_test)))))*100;
            end
            testAcc(perm,channel) = mean(testAccTmp);
            nullAcc(perm,channel) = mean(nullAccTmp);
        else
             Mdl = fitcecoc(x_train,y_train,'Coding','onevsall','Learners',temp,'CrossVal', ...
                'off','Options',statset('UseParallel',true));
             valAcc=[];
             testAcc(perm,channel) = (1-loss(Mdl,x_test,y_test))*100;
             nullAcc(perm,channel) = (1-loss(Mdl,x_test,y_test(randperm(numel(y_test)))))*100;
        end
    end
end    
beep


