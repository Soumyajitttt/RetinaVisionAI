function generateCrossMethodCAM(drNet, imgResized, predictedLabel, outputPath, imgFull)
% Cross-checks Grad-CAM against two independent explainability methods -
% occlusion sensitivity and LIME - so a clinician isn't trusting a single
% method's idea of "what the network is looking at". Each alternative
% method's panel is labeled with its Pearson correlation (r) against the
% Grad-CAM map, actually computed via corr2 (not a placeholder number):
% values near +1 mean strong agreement, near 0 or negative mean the
% methods disagree and the result may be worth a second look.
%
% Same imgResized/predictedLabel/imgFull inputs as generateGradCAM.m -
% call this alongside it for every upload.
%
% SPEED NOTE: occlusionSensitivity and imageLIME are both called here
% WITHOUT their Name-Value tuning options previously, which means both
% ran at their slowest/most-thorough defaults - imageLIME in particular
% defaults to NumSamples=2048, i.e. 2048 forward passes through drNet for
% a single image. That alone was responsible for the bulk of the
% pipeline's ~10 minute worst-case runtime. The settings below trade a
% small amount of heatmap smoothness for a large speed win - more than
% enough for a web-viewable overlay, which doesn't need LIME's
% publication-grade default sampling density.
%   - occlusionSensitivity: coarser Stride/MaskSize -> far fewer sliding
%     window passes.
%   - imageLIME: fewer superpixel "features" and far fewer perturbed
%     samples -> the biggest single lever for speed.
% Retune these (larger NumSamples, smaller Stride) later if the coarser
% maps ever look too blocky for clinical use - this is a
% deliberately-documented tradeoff, not an accident.

    grayFull = rgb2gray(imgFull);
    fovMask = imerode(grayFull > 10, strel('disk', round(size(imgFull, 1) * 0.02)));
    fovMaskSoft = imgaussfilt(double(fovMask), round(size(imgFull, 1) * 0.01));
    baseImg = im2double(imgFull);

    % --- 1. Grad-CAM (reference method) ---
    gradMap = gradCAM(drNet, imgResized, predictedLabel);
    gradNorm = normalizeToFov(gradMap, imgFull, fovMask);

    % --- 2. Occlusion sensitivity (tuned for speed - see note above) ---
    occMap = occlusionSensitivity(drNet, imgResized, predictedLabel, ...
        'Stride', 15, 'MaskSize', 30);
    occNorm = normalizeToFov(occMap, imgFull, fovMask);

    % --- 3. LIME (tuned for speed - see note above) ---
    limeMap = imageLIME(drNet, imgResized, predictedLabel, ...
        'NumFeatures', 40, 'NumSamples', 150);
    limeNorm = normalizeToFov(limeMap, imgFull, fovMask);

    occCorr = corr2(gradNorm, occNorm);
    limeCorr = corr2(gradNorm, limeNorm);

    panels = {
        baseImg, ...
        overlayHeat(baseImg, gradNorm, fovMaskSoft), ...
        overlayHeat(baseImg, occNorm, fovMaskSoft), ...
        overlayHeat(baseImg, limeNorm, fovMaskSoft)
    };

    labels = {
        'Original Scan', ...
        '1. Grad-CAM (Gradient)', ...
        sprintf('2. Occlusion (r=%.2f)', occCorr), ...
        sprintf('3. LIME (r=%.2f)', limeCorr)
    };

    panel = composeLabeledPanels(panels, labels);
    imwrite(panel, outputPath);
end

function normMap = normalizeToFov(map, imgFull, fovMask)
    mapFull = imresize(map, [size(imgFull, 1) size(imgFull, 2)], 'bilinear');
    mapFull(~fovMask) = 0;
    normMap = mat2gray(mapFull);
end

function overlay = overlayHeat(baseImg, normMap, fovMaskSoft)
    heatmapRGB = ind2rgb(im2uint8(normMap), jet(256));
    alpha = 0.45 * fovMaskSoft;
    overlay = baseImg .* (1 - alpha) + heatmapRGB .* alpha;
end