import html2canvas from 'html2canvas';

const ExportButton: React.FC = () => {
  const handleExport = async () => {
    try {
      // Find the map container element
      const mapElement = document.querySelector('.leaflet-container');
      if (!mapElement) {
        console.error('Map element not found');
        return;
      }
      
      // Wait a moment to ensure all layers are fully rendered
      setTimeout(async () => {
        try {
          // Use html2canvas to capture the map as an image with improved settings
          const canvas = await html2canvas(mapElement as HTMLElement, {
            useCORS: true, // Allow cross-origin images
            scale: 2, // Higher quality
            allowTaint: true, // Allow tainted canvas for better cross-origin support
            logging: false, // Disable logging
            backgroundColor: null, // Preserve transparency
            // Ensure all layers are captured
            onclone: (document, element) => {
              // Make sure all vector layers are visible in the cloned document
              const layers = element.querySelectorAll('.leaflet-tile-pane, .leaflet-overlay-pane');
              layers.forEach((layer: any) => {
                if (layer) {
                  layer.style.visibility = 'visible';
                  layer.style.opacity = '1';
                }
              });
            }
          });
          
          // Convert the canvas to a data URL
          const imageUrl = canvas.toDataURL('image/png');
          
          // Create a link element to download the image
          const link = document.createElement('a');
          link.download = `avalanche-map-${new Date().toISOString().split('T')[0]}.png`;
          link.href = imageUrl;
          link.click();
        } catch (error) {
          console.error('Error during canvas capture:', error);
        }
      }, 500); // 500ms delay to ensure all layers are rendered
    } catch (error) {
      console.error('Error exporting map:', error);
    }
  };
  
  return (
    <button
      className="export-button"
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: '#3182ce',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        border: 'none',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        cursor: 'pointer'
      }}
      onClick={handleExport}
    >
      Export Map
    </button>
  );
};

export default ExportButton;