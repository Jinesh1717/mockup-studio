import React, { useState, useRef, Suspense } from 'react';
import { Upload, Loader2, Save, MousePointer2, SlidersHorizontal, Image as ImageIcon, Download, X, Grid } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import ProductModel from './components/ProductModel';


const MODELS = {
  'T-Shirt': '/shirt_baked.glb',
  'Hoodie': '/hoodie.glb', 
  'Cap': '/cap.glb'
};

const PRESET_COLORS = ['#ffffff', '#111111', '#8b0000', '#002244', '#D4AF37', '#228b22'];

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidUpdate(prevProps) {
    if (prevProps.modelUrl !== this.props.modelUrl) {
      this.setState({ hasError: false }); // Reset error if model changes
    }
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function App() {
  const [selectedProduct, setSelectedProduct] = useState('T-Shirt');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  
  // Design states
  const [designFile, setDesignFile] = useState(null);
  const [designUrl, setDesignUrl] = useState(null);
  
  // Decal spatial states
  const [decalPos, setDecalPos] = useState({ x: 0, y: 0.1, z: 0.15 });
  const [decalRot, setDecalRot] = useState({ x: 0, y: 0, z: 0 });
  const [decalScale, setDecalScale] = useState({ x: 0.15, y: 0.15, z: 0.15 });

  const [isSaving, setIsSaving] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  
  const canvasRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setDesignFile(file);
      setDesignUrl(URL.createObjectURL(file)); // Local preview before upload
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDownload = () => {
    const canvasNode = document.querySelector('canvas');
    if (canvasNode) {
      const dataUrl = canvasNode.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.download = `MockupStudio-${selectedProduct}.jpg`;
      link.href = dataUrl;
      link.click();
    }
  };

  const fetchGallery = async () => {
    setIsGalleryOpen(true);
    setIsLoadingGallery(true);
    try {
      const response = await fetch('http://localhost:8000/api/customizer/');
      const data = await response.json();
      setGalleryItems(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load gallery');
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleConfirm = async () => {
    if (!designFile) return alert('Please upload a design first.');
    setIsSaving(true);
    
    try {
      // 1. Capture Snapshot from Canvas
      const canvasNode = document.querySelector('canvas');
      let snapshotBlob = null;
      if (canvasNode) {
        const snapshotUrl = canvasNode.toDataURL('image/jpeg', 0.8);
        const res = await fetch(snapshotUrl);
        snapshotBlob = await res.blob();
      }
      
      // 2. Build FormData for Django Backend
      const formData = new FormData();
      formData.append('product_name', selectedProduct);
      formData.append('color', selectedColor);
      formData.append('design_image', designFile);
      
      if (snapshotBlob) {
        formData.append('preview_snapshot', snapshotBlob, 'snapshot.jpg');
      }
      
      // JSONFields need to be stringified when sent via FormData
      formData.append('decal_position', JSON.stringify(decalPos));
      formData.append('decal_rotation', JSON.stringify(decalRot));
      formData.append('decal_scale', JSON.stringify(decalScale));
      
      // 3. Send POST request to Django
      const response = await fetch('http://localhost:8000/api/customizer/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      alert(`Configuration successfully saved! Config ID: ${data.id}`);
      
    } catch (err) {
      console.error(err);
      alert("Error saving configuration to Django backend!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#E5E7EB] font-sans overflow-hidden selection:bg-[#D4AF37] selection:text-black">
      
      {/* 3D Canvas Area (70%) */}
      <div className="w-[70%] h-full relative" onDragOver={handleDragOver} onDrop={handleFileDrop}>
        <Canvas shadows camera={{ position: [0, 0, 0.8], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[2, 2, 2]} angle={0.2} penumbra={1} castShadow intensity={2} shadow-bias={-0.0001} />
          <Environment preset="city" />
          
          <Suspense fallback={null}>
             <ModelErrorBoundary modelUrl={MODELS[selectedProduct]}>
               <ProductModel 
                  productType={selectedProduct}
                  modelUrl={MODELS['T-Shirt']}
                  color={selectedColor}
                  designUrl={designUrl}
                  decalPos={decalPos}
                  decalRot={decalRot}
                  decalScale={decalScale}
               />
             </ModelErrorBoundary>
             <ContactShadows position={[0, -0.4, 0]} opacity={0.6} scale={2} blur={1.5} far={1} />
          </Suspense>
          
          <OrbitControls 
             makeDefault 
             minPolarAngle={Math.PI / 4} 
             maxPolarAngle={Math.PI / 1.5} 
             enableZoom={true} 
             enablePan={false}
             autoRotate 
             autoRotateSpeed={0.5}
          />
        </Canvas>
        
        {/* Overlay Helper */}
        {!designUrl && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-gray-500 font-semibold tracking-wide flex flex-col items-center opacity-70">
            <ImageIcon size={48} className="mb-2" />
            <p>Drag & Drop a PNG design here</p>
          </div>
        )}
        
        {/* Helper Badge */}
        <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center text-white/80 text-sm">
           <MousePointer2 size={16} className="mr-2 text-[#D4AF37]" />
           Click and drag to rotate 360°
        </div>
      </div>

      {/* Configuration Panel (30%) */}
      <div className="w-[30%] h-full bg-[#0a0a0a] text-white border-l-4 border-l-[#D4AF37] shadow-2xl flex flex-col z-10 overflow-y-auto">
         
         <div className="p-8 border-b border-white/10">
           <h1 className="text-3xl font-bold tracking-tighter uppercase mb-1">MOCKUP<span className="text-[#D4AF37]">STUDIO</span></h1>
           <p className="text-sm text-gray-400">Premium 360° Customizer</p>
         </div>

         <div className="p-8 flex-grow flex flex-col space-y-10">
            
            {/* Product Selection */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-4">1. Model Selection</h3>
              <div className="grid grid-cols-3 gap-3">
                 {Object.keys(MODELS).map(prod => {
                    const isDisabled = prod === 'Hoodie';
                    return (
                    <button 
                       key={prod}
                       onClick={() => !isDisabled && setSelectedProduct(prod)}
                       disabled={isDisabled}
                       className={`py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center
                          ${isDisabled ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5' : 
                          selectedProduct === prod ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                    >
                      <span>{prod}</span>
                      {isDisabled && <span className="text-[9px] mt-1 text-gray-500 uppercase tracking-widest">Coming Soon</span>}
                    </button>
                 )})}
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-4">2. Fabric Color</h3>
              <div className="flex flex-wrap gap-4 items-center">
                 {PRESET_COLORS.map(color => (
                    <button
                       key={color}
                       onClick={() => setSelectedColor(color)}
                       className={`w-10 h-10 rounded-full transition-transform ${selectedColor === color ? 'border-2 border-[#D4AF37] scale-110 shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'border border-white/20'}`}
                       style={{ backgroundColor: color }}
                    />
                 ))}
                 <label className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/20 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="opacity-0 absolute w-0 h-0" />
                    <span className="text-[#D4AF37] text-lg">+</span>
                 </label>
              </div>
            </div>

            {/* Design Uploader */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-4">3. Artwork</h3>
              <label className="border-2 border-dashed border-white/20 hover:border-[#D4AF37] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/5 relative group">
                 <Upload className="text-gray-400 group-hover:text-[#D4AF37] mb-2 transition-colors" size={24} />
                 <span className="text-sm text-gray-300 font-medium">Click to upload PNG</span>
                 <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileDrop} />
              </label>
            </div>

            {/* Decal Sliders (Only show if image exists) */}
            <div className={`transition-opacity duration-500 ${designUrl ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
               <h3 className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold mb-4 flex items-center">
                 <SlidersHorizontal size={14} className="mr-2" /> Decal Adjustments
               </h3>
               
               <div className="space-y-4 text-sm text-gray-300">
                  {/* Position Y (Up/Down) */}
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span>Vertical Position</span>
                      <span className="text-[#D4AF37] font-mono">{decalPos.y.toFixed(2)}</span>
                    </div>
                    <input type="range" min="-0.5" max="0.5" step="0.01" value={decalPos.y} onChange={(e) => setDecalPos({...decalPos, y: parseFloat(e.target.value)})} className="accent-[#D4AF37]" />
                  </div>
                  
                  {/* Position X (Left/Right) */}
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span>Horizontal Position</span>
                      <span className="text-[#D4AF37] font-mono">{decalPos.x.toFixed(2)}</span>
                    </div>
                    <input type="range" min="-0.2" max="0.2" step="0.01" value={decalPos.x} onChange={(e) => setDecalPos({...decalPos, x: parseFloat(e.target.value)})} className="accent-[#D4AF37]" />
                  </div>

                  {/* Scale */}
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span>Size</span>
                      <span className="text-[#D4AF37] font-mono">{decalScale.x.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0.05" max="0.5" step="0.01" value={decalScale.x} onChange={(e) => setDecalScale({ x: parseFloat(e.target.value), y: parseFloat(e.target.value), z: decalScale.z })} className="accent-[#D4AF37]" />
                  </div>
               </div>
            </div>
         </div>

         {/* Sticky Footer Area */}
         <div className="p-8 border-t border-white/10 bg-black sticky bottom-0 flex flex-col gap-3 z-20">
            <button 
               onClick={handleConfirm}
               disabled={isSaving || !designUrl}
               className={`w-full py-4 rounded-xl font-bold flex justify-center items-center transition-all uppercase tracking-wide text-sm
                  ${!designUrl ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-[#D4AF37] hover:bg-[#FADB5F] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]'}`}
            >
               {isSaving ? <><Loader2 className="animate-spin mr-2" /> Saving Configuration...</> : <><Save size={18} className="mr-2" /> Save Design</>}
            </button>
            
            <div className="grid grid-cols-2 gap-3">
               <button 
                  onClick={handleDownload}
                  className="py-3 rounded-xl font-bold flex justify-center items-center transition-all uppercase tracking-wide text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10"
               >
                  <Download size={14} className="mr-2" /> Download
               </button>
               <button 
                  onClick={fetchGallery}
                  className="py-3 rounded-xl font-bold flex justify-center items-center transition-all uppercase tracking-wide text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10"
               >
                  <Grid size={14} className="mr-2" /> Gallery
               </button>
            </div>
            
            <p className="text-gray-500 text-[10px] uppercase tracking-widest text-center mt-2">Powered by Django & WebGL</p>
         </div>

      </div>

      {/* Gallery Modal overlay */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-8">
           <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
              
              <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/50">
                 <h2 className="text-2xl font-bold text-white uppercase tracking-tighter flex items-center">
                    <Grid className="text-[#D4AF37] mr-3" /> Saved Designs Gallery
                 </h2>
                 <button onClick={() => setIsGalleryOpen(false)} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                 {isLoadingGallery ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                       <Loader2 size={48} className="animate-spin text-[#D4AF37] mb-4" />
                       <p>Loading your masterpiece collection...</p>
                    </div>
                 ) : galleryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                       <ImageIcon size={48} className="mb-4 opacity-50" />
                       <p>No designs saved yet. Create something awesome!</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                       {galleryItems.map(item => (
                          <div key={item.id} className="bg-black border border-white/5 rounded-xl overflow-hidden group hover:border-[#D4AF37]/50 transition-all duration-300">
                             <div className="h-48 bg-[#E5E7EB] relative flex justify-center items-center overflow-hidden">
                                {item.preview_snapshot ? (
                                   <img src={item.preview_snapshot} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                   <ImageIcon size={32} className="text-gray-400" />
                                )}
                             </div>
                             <div className="p-4 bg-gradient-to-b from-transparent to-black/50">
                                <div className="flex justify-between items-start mb-2">
                                   <h3 className="text-white font-bold tracking-wide uppercase text-sm">{item.product_name}</h3>
                                   <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: item.color }}></span>
                                </div>
                                <p className="text-gray-500 text-xs font-mono">{new Date(item.created_at).toLocaleDateString()}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
