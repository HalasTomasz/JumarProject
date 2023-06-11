 var rodzaj = document.getElementById("id_NrWyt");
  var selectedValue = "{{ data.NrWyt }}";  // Assuming form is a valid context variable in your template

  for (var i = 0; i < rodzaj.options.length; i++) {
    if (rodzaj.options[i].value == selectedValue) {
      rodzaj.selectedIndex = i;
      break;
    }
  }

  var rodzaj2 = document.getElementById("id_Status");
  var selectedValue2 = "{{ data.Status }}";  // Assuming form is a valid context variable in your template

  for (var i = 0; i < rodzaj2.options.length; i++) {
    if (rodzaj2.options[i].value == selectedValue2) {
      rodzaj2.selectedIndex = i;
      break;
    }
  }
    var rodzaj3 = document.getElementById("id_Rodzaj");
  var selectedValue3 = "{{ data.Rodzaj }}";  // Assuming form is a valid context variable in your template

  for (var i = 0; i < rodzaj3.options.length; i++) {
    if (rodzaj3.options[i].value == selectedValue3) {
      rodzaj3.selectedIndex = i;
      break;
    }
  }