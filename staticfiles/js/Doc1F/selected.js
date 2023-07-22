 var rodzaj = document.getElementById("id_NrWyt");
  for (var i = 0; i < rodzaj.options.length; i++) {
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

  var rodzaj4 = document.getElementById("id_Priorytet");

  for (var i = 0; i < rodzaj4.options.length; i++) {
    if (rodzaj4.options[i].value == selectedValue4) {
      rodzaj4.selectedIndex = i;
      break;
    }
  }

  var rodzaj5 = document.getElementById("id_Tasma");

  for (var i = 0; i < rodzaj5.options.length; i++) {
    console.log(selectedValue5)
    console.log(rodzaj5.options[i].value)
    if (rodzaj5.options[i].value == selectedValue5) {
      console.log("HERE")
        rodzaj5.selectedIndex = i;
      break;
    }
  }