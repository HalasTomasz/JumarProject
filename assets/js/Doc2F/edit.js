
        function wynikFunc() {
  var input = document.getElementById('id_DolneOdch');
  var input2 = document.getElementById('id_WagaRolkiProd');
  var input3 = document.getElementById('id_WagaRolkiZlec');
  if (input.value.trim() && input2.value.trim() && input3.value.trim()) {
    var zakaldka = document.getElementById('id_Wynikowa');
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');
    var value3 = input3.value.replace(/ /g, '');
    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2) && /^\d*\.?\d+$/.test(value3)) {
      var result = (parseFloat(value1) * parseFloat(value2)) / parseFloat(value3);
      if (!isNaN(result)) {
        zakaldka.value = result.toFixed(2);
        wynikowaFunc();
        addSeparator('id_Wynikowa');
      }
    } else {
      zakaldka.value = "";
    }
  }
}

function wynikowaFunc() {
  var input = document.getElementById('id_Wynikowa');
  var input2 = document.getElementById('id_DolneOdch');

  if (input.value.trim() && input2.value.trim()) {
    var waga = document.getElementById('id_Wynik');
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');
    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2)) {
      var result = parseFloat(value1) / parseFloat(value2) * 100;
      if (!isNaN(result)) {
        waga.value = result.toFixed(2);
        addSeparator('id_Wynik');
      }
    } else {
      waga.value = '';
    }
  }
}