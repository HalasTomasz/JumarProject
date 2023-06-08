
  function addSeparator(inputId) {
  var userInput = document.getElementById(inputId);
  var currentValue = userInput.value.replace(/ /g, ''); // Remove existing spaces
  var formattedInput = addCommas(currentValue);
  userInput.value = formattedInput;
}

function addCommas(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}