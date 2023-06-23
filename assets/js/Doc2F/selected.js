 var rodzaj = document.getElementById("id_NrWytl");

  for (var i = 0; i < rodzaj.options.length; i++) {
    if (rodzaj.options[i].value == selectedValue) {
      rodzaj.selectedIndex = i;
      break;
    }
  }