import { useState } from 'react';

export default function FundusAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('http://localhost:5001/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <form onSubmit={handleUpload} className="space-y-3">
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setFile(e.target.files[0])} 
        />
        <button 
          type="submit" 
          disabled={loading || !file}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Running MATLAB Pipeline...' : 'Analyze Fundus Image'}
        </button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <div className="border p-4 rounded-lg space-y-2 bg-slate-900 text-white">
          <h3 className="font-bold text-lg">{result.gradeText}</h3>
          <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>
          <p>Microaneurysms: {result.maCount} | Exudates: {result.exudateCount}</p>
          
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div>
              <p className="text-xs text-gray-400">Grad-CAM</p>
              <img 
                src={`http://localhost:5001${result.gradcam_url}`} 
                alt="Grad-CAM" 
                className="w-full rounded"
              />
            </div>
            <div>
              <p className="text-xs text-gray-400">Enhanced</p>
              <img 
                src={`http://localhost:5001${result.enhanced_url}`} 
                alt="Enhanced" 
                className="w-full rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}