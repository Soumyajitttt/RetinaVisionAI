function layerGroups = pickExplainabilityLayers(drNet, numPerStage)
% Robust layer selector for DAGNetworks (ResNet-50, etc.)
% Targets main-trunk stage endpoints to prevent DAG graph traversal errors.

    if nargin < 2 || isempty(numPerStage)
        numPerStage = 4;
    end

    allNames = {drNet.Layers.Name};
    numLayers = numel(allNames);

    % Priority 1: Standard ResNet-50 trunk activation layer names
    % Stage 2 (early), Stage 3 (mid), Stage 4/5 (late)
    knownEarly = {'activation_10_relu', 'res2c_relu', 'activation_4_relu', 'res2a_relu'};
    knownMid   = {'activation_22_relu', 'res3d_relu', 'activation_13_relu', 'res3a_relu'};
    knownLate  = {'activation_40_relu', 'res4f_relu', 'activation_49_relu', 'res5c_relu'};

    earlyMatches = intersect(knownEarly, allNames, 'stable');
    midMatches   = intersect(knownMid,   allNames, 'stable');
    lateMatches  = intersect(knownLate,  allNames, 'stable');

    % Priority 2: Layers immediately following an AdditionLayer (trunk endpoints)
    if isempty(earlyMatches) || isempty(midMatches) || isempty(lateMatches)
        types = arrayfun(@(l) class(l), drNet.Layers, 'UniformOutput', false);
        isAdd = contains(types, 'AdditionLayer');
        addIndices = find(isAdd);

        if ~isempty(addIndices)
            % The layer right after an AdditionLayer is the trunk ReLU
            trunkIdx = min(addIndices + 1, numLayers);
            trunkNames = allNames(trunkIdx);

            n = numel(trunkNames);
            if n >= 3
                earlyMatches = trunkNames(1 : max(1, floor(n * 0.33)));
                midMatches   = trunkNames(max(1, floor(n * 0.33)) + 1 : floor(n * 0.66));
                lateMatches  = trunkNames(floor(n * 0.66) + 1 : end);
            end
        end
    end

    % Priority 3: Fallback by safe relative depth on the trunk
    if isempty(earlyMatches)
        earlyIdx = round(numLayers * 0.15);
        earlyMatches = allNames(max(2, min(earlyIdx, numLayers - 3)));
    end
    if isempty(midMatches)
        midIdx = round(numLayers * 0.50);
        midMatches = allNames(max(2, min(midIdx, numLayers - 3)));
    end
    if isempty(lateMatches)
        lateIdx = round(numLayers * 0.85);
        lateMatches = allNames(max(2, min(lateIdx, numLayers - 3)));
    end

    layerGroups.early = ensureCell(earlyMatches, numPerStage);
    layerGroups.mid   = ensureCell(midMatches, numPerStage);
    layerGroups.late  = ensureCell(lateMatches, numPerStage);
end

function out = ensureCell(in, maxCount)
    if ischar(in) || isstring(in)
        out = {char(in)};
    elseif iscell(in)
        out = in(1:min(numel(in), maxCount));
    else
        out = cellstr(in);
    end
end