function generateMultiLayerCAM(drNet, imgResized, predictedLabel, outputPath, imgFull, layerGroups)
% Runs Grad-CAM at three different depths of drNet (early/mid/late) so a
% clinician can see how the network's attention sharpens from generic
% edges to specific lesions as it goes deeper - the "Multi-Layer CAM" tab.
% Same imgResized/predictedLabel/imgFull inputs as generateGradCAM.m, so
% this is meant to be called right alongside it for every upload, on
% whatever image was just analyzed - never a fixed sample image.
%
% layerGroups : optional struct from pickExplainabilityLayers.m with
%               .early/.mid/.late candidate lists. When omitted, it's
%               computed from drNet directly. Each stage tries its
%               candidates in order and uses the first one that doesn't
%               error - some layers (e.g. inside a residual branch on a
%               DAG network like ResNet) aren't valid Grad-CAM feature
%               layers even though they matched the early/mid/late
%               heuristic, so this falls through to the next candidate
%               instead of failing the whole panel.

    if nargin < 6 || isempty(layerGroups)
        layerGroups = pickExplainabilityLayers(drNet);
    end

    stageLabels = {'Early (Edges)', 'Mid (Textures)', 'Late (Lesions)'};
    stageCandidates = {layerGroups.early, layerGroups.mid, layerGroups.late};

    grayFull = rgb2gray(imgFull);
    fovMask = imerode(grayFull > 10, strel('disk', round(size(imgFull, 1) * 0.02)));
    fovMaskSoft = imgaussfilt(double(fovMask), round(size(imgFull, 1) * 0.01));
    baseImg = im2double(imgFull);

    panels = cell(1, 3);
    usedNames = cell(1, 3);
    for i = 1:3
        [map, usedNames{i}] = tryGradCAMCandidates(drNet, imgResized, predictedLabel, stageCandidates{i});
        mapFull = imresize(map, [size(imgFull, 1) size(imgFull, 2)], 'bilinear');
        mapFull(~fovMask) = 0;
        mapNorm = mat2gray(mapFull);
        heatmapRGB = ind2rgb(im2uint8(mapNorm), jet(256));

        alpha = 0.45 * fovMaskSoft;
        panels{i} = baseImg .* (1 - alpha) + heatmapRGB .* alpha;
    end

    labels = cellfun(@(s, l) sprintf('%s: %s', s, l), stageLabels, usedNames, 'UniformOutput', false);
    panel = composeLabeledPanels(panels, labels);
    imwrite(panel, outputPath);
end

function [map, usedName] = tryGradCAMCandidates(drNet, imgResized, predictedLabel, candidateNames)
% Tries each candidate layer name in order, returning the first one that
% successfully produces a Grad-CAM map. Rethrows the last error only if
% every candidate in this stage failed.
    lastErr = [];
    for i = 1:numel(candidateNames)
        try
            map = gradCAM(drNet, imgResized, predictedLabel, 'FeatureLayer', candidateNames{i});
            usedName = candidateNames{i};
            return;
        catch err
            lastErr = err;
        end
    end
    rethrow(lastErr);
end