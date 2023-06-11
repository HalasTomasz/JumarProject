var rodzaj = document.getElementById("id_NrWytl");
  var selectedValue = "{{ rols.NrWytl }}";  // Assuming form is a valid context variable in your template

  for (var i = 0; i < rodzaj.options.length; i++) {
    if (rodzaj.options[i].value == selectedValue) {
      rodzaj.selectedIndex = i;
      break;
    }
  }