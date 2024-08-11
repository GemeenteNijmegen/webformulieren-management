document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('generateCsvButton');
    if (button) {
      button.addEventListener('click', function() {
        event.preventDefault();
        console.log('BUTTON');
        // Disable the button
        button.disabled = true;
        
        // Change button text to indicate processing
        button.value = 'Bezig met verwerken...';
    
      });
    }
  });