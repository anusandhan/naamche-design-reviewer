
window.onload = function() {
    document.getElementById('findDesignerBtn').addEventListener('click', async () => {
      // Show spinner and change button text to loading
      document.getElementById('buttonText').innerText = 'Loading...';
      document.getElementById('spinner').classList.remove('hidden');
      document.getElementById('designerInfo').classList.add('hidden');
  
      const response = await fetch("/find-free-designer");
      const data = await response.json();
      console.log("Received response:", data);
  
      if (data.name) {
        document.getElementById('designerInfo').classList.remove('hidden');
        document.getElementById('designerName').textContent = data.name;
        document.getElementById('designerAvatar').src = data.avatar;
      } else {
        console.log("No free designers found.")
      }
  
      // Hide spinner and reset button text
      document.getElementById('buttonText').innerText = 'Find reviewer';
      document.getElementById('spinner').classList.add('hidden');
    });
  };
  
  