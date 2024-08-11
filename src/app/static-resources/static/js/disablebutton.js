document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('generateCsvButton');
    if (button) {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        document.getElementById("bezigMetVerwerken").style.display = 'inline';
        button.disabled = true;
        const form = document.querySelector('form');
        setTimeout(() => {
          form.submit();
        }, 300);
      });
    }
  });
  document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("myForm");
    const generateCsvButton = document.getElementById("generateCsvButton");
    const formName = document.getElementById("formName");
    const formStartDate = document.getElementById("formStartDate");
    const formEndDate = document.getElementById("formEndDate");

    function toggleButtonState() {
        // Check if all fields are empty
        if (formName.value.trim() === "" && formStartDate.value.trim() === "" && formEndDate.value.trim() === "") {
            generateCsvButton.disabled = true;
        } else {
            generateCsvButton.disabled = false;
        }
    }

    // Attach event listeners to input fields
    formName.addEventListener("input", toggleButtonState);
    formStartDate.addEventListener("input", toggleButtonState);
    formEndDate.addEventListener("input", toggleButtonState);

    // Initial check in case the fields are pre-filled
    toggleButtonState();
});