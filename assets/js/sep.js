
  function addSeparator(inputId) {
  var userInput = document.getElementById(inputId);
  var currentValue = userInput.value.replace(/ /g, ''); // Remove existing spaces
  var formattedInput = addCommas(currentValue);
  userInput.value = formattedInput;
}

function addSeparatorVal(inputValue) {
  var currentValue = String(inputValue).replace(/ /g, ''); // Convert to string and remove existing spaces
  var formattedInput = addCommas(currentValue);
  return formattedInput;
}

function addCommas(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}