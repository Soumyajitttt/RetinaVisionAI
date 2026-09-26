function generateActivationsPanel(drNet, imgResized, outputPath, imgFull, layerGroups)
% Visualizes raw feature-map activations (no class-discriminative Grad-CAM
% weighting) at three depths, for the "Activations" tab - a rawer, more
% diffuse counterpart to Multi-Layer CAM showing what each stage of the
% network responds to in general, not specifically for the predicted
% class. Note this doesn't need predictedLabel, since it isn't
% class-conditioned.
%
% layerGroups : optional struct from pickExplainabilityLayers.m with
%               .early/.mid/.late candidate lists. When omitted, it's
%               computed from drNet directly. Same retry-through-
%               candidates behavior as generateMultiLayerCAM.m.

    if nargin < 5 || isempty(layerGroups)
        layerGroups = pickExplainabilityLayers(drNet);
    end

    stageLabels = {'Early: Edges & Borders', 'Mid: Vessels & Textures', 'Late: Lesion Patterns'};
    stageCandidates = {layerGroups.early, layerGroups.mid, layerGroups.late};

    grayFull = rgb2gray(imgFull);
    fovMask = imerode(grayFull > 10, strel('disk', round(size(imgFull, 1) * 0.02)));

    panels = cell(1, 3);
    usedNames = cell(1, 3);
    for i = 1:3
        [avgAct, usedNames{i}] = tryActivationsCandidates(drNet, imgResized, stageCandidates{i});
        avgAct = imresize(avgAct, [size(imgFull, 1) size(imgFull, 2)], 'bilinear');
        avgAct(~fovMask) = 0;
        actNorm = mat2gray(avgAct);
        panels{i} = ind2rgb(im2uint8(actNorm), jet(256));
    end

    labels = cellfun(@(s, l) sprintf('%s (%s)', s, l), stageLabels, usedNames, 'UniformOutput', false);
    panel = composeLabeledPanels(panels, labels);
    imwrite(panel, outputPath);
end

function [avgAct, usedName] = tryActivationsCandidates(drNet, imgResized, candidateNames)
% Tries each candidate layer name in order, returning the channel-averaged
% activation map from the first one that succeeds.
    lastErr = [];
    for i = 1:numel(candidateNames)
        try
            act = activations(drNet, imgResized, candidateNames{i}, 'OutputAs', 'channels');
            avgAct = max(act, [], 3);
            usedName = candidateNames{i};
            return;
        catch err
            lastErr = err;
        end
    end
    rethrow(lastErr);
end