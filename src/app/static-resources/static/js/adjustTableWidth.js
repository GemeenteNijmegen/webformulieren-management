// Not ideal, but in this case it seems the solution. CSP and header in the webapp module make it difficult 
// to just a stylesheet it seems. Zaak.css is not added to the header for example.

document.addEventListener("DOMContentLoaded", function() {
    // Set the widths for each table column
    document.getElementById('col-formulier-kenmerk').style.width = '5%';
    document.getElementById('col-ingediend').style.width = '10%';
    document.getElementById('col-naam').style.width = '10%';
    document.getElementById('col-kind-info').style.width = '20%';
    document.getElementById('col-tel-mail').style.width = '10%';
    document.getElementById('col-activiteiten').style.width = '20%';
    document.getElementById('col-opmerkingen').style.width = '20%';
    document.getElementById('col-pdf').style.width = '5%';
});