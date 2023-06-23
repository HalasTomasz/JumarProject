 var rodzaj = document.getElementById("id_NrWyt");
  for (var i = 0; i < rodzaj.options.length; i++) {
    console.log(selectedValue)
    if (rodzaj.options[i].value == selectedValue) {
      rodzaj.selectedIndex = i;
      break;
    }
  }

  var rodzaj2 = document.getElementById("id_Status");

  for (var i = 0; i < rodzaj2.options.length; i++) {
    if (rodzaj2.options[i].value == selectedValue2) {
      rodzaj2.selectedIndex = i;
      break;
    }
  }
    var rodzaj3 = document.getElementById("id_Rodzaj");

  for (var i = 0; i < rodzaj3.options.length; i++) {
    if (rodzaj3.options[i].value == selectedValue3) {
      rodzaj3.selectedIndex = i;
      break;
    }
  }