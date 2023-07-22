
        var dict = {
          "0": 0.95,
          "1": 0.95,
            "2":0.95,
        };
       function zakladkaFunc() {
  var input = document.getElementById('id_SzerRekawa');
  var input2 = document.getElementById('id_SzerWorka');
  var zakladka = document.getElementById('id_Zakladka');

  if (input.value.trim() && input2.value.trim()) {
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');

    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2)) {
      var result = (parseFloat(value1) - parseFloat(value2)) / 2;
      zakladka.value = result;
      addSeparator('id_Zakladka');
    } else {
      zakladka.value = '';
    }
  }
}

function wagafolizlecFunc() {

  var input = document.getElementById('id_SzerRekawa');
  var input2 = document.getElementById('id_DolneOdch');
  var input3 = document.getElementById('id_DlugFoliPlan');
  var input4 = document.getElementById('id_Rodzaj');
  var tasma = document.getElementById('id_Tasma');
  var waga = document.getElementById('id_WagaFoliZlec');

  if (input.value.trim() && input2.value.trim() && input3.value.trim() && input4.value.trim()) {
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');
    var value3 = input3.value.replace(/ /g, '');

    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2) && /^\d*\.?\d+$/.test(value3)) {
      var gest = parseFloat(dict[input4.value]);

      if (!isNaN(gest)) {
        var result = (parseFloat(value1) / 1000 * parseFloat(value2) / 1000 * parseFloat(value3) * 2 * gest).toFixed(2);
        if(tasma.value === '1'){
          result = (result/2).toFixed(2)
        }

        waga.value = result;
        addSeparator('id_WagaFoliZlec');
        wagarolkizlecFunc();
      } else {
        waga.value = '';
      }
    } else {
      waga.value = '';
    }
  }
}

function dlugfoliplanFunc() {
  var input = document.getElementById('id_IloscZlec');
  var input2 = document.getElementById('id_DlugWorka');
  var input3 = document.getElementById('id_DlugFoilPlan_Korekta');
  var dlug = document.getElementById('id_DlugFoliPlan');

  if (input.value.trim() && input2.value.trim() && input3.value.trim()) {
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');
    var value3 = input3.value.replace(/ /g, '');

    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2) && /^\d*\.?\d+$/.test(value3)) {
      var result = (parseFloat(value1) * parseFloat(value2) * parseFloat(value3) / 1000).toFixed(2);
      dlug.value = result;
      addSeparator('id_DlugFoliPlan');
      wagafolizlecFunc();
      dlugrolkiplanFunc();
    } else {
      dlug.value = '';
      wagafolizlecFunc();
    }
  }
}

function dlugrolkiplanFunc() {
  var input = document.getElementById('id_DlugFoliPlan');
  var input2 = document.getElementById('id_IloscRolekZlec');
  var dlug = document.getElementById('id_DlugRolkiPlan');

  if (input.value.trim() && input2.value.trim()) {
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');

    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2) && parseFloat(value2) !== 0) {
      var result = (parseFloat(value1) / parseFloat(value2)).toFixed(2);
      dlug.value = result;
      addSeparator('id_DlugRolkiPlan');
    } else {
      dlug.value = '';
    }
  }
}

function wagarolkizlecFunc() {
  var input = document.getElementById('id_WagaFoliZlec');
  var input2 = document.getElementById('id_IloscRolekZlec');
  var waga = document.getElementById('id_WagaRolkiZlec');

  if (input.value.trim() && input2.value.trim()) {
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');

    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2) && parseFloat(value2) !== 0) {
      var result = (parseFloat(value1) / parseFloat(value2)).toFixed(2);
      waga.value = result;
      addSeparator('id_WagaRolkiZlec');
    } else {
      waga.value = '';
    }
  }
}

function dlugfolizlecFunc() {
  var input = document.getElementById('id_DlugRolkiZlec_Korekta');
  var input2 = document.getElementById('id_IloscRolekZlec');
  var dlug = document.getElementById('id_DlugFoliZlec_Korekta');

  if (input.value.trim() && input2.value.trim()) {
    var value1 = input.value.replace(/ /g, '');
    var value2 = input2.value.replace(/ /g, '');

    if (/^\d*\.?\d+$/.test(value1) && /^\d*\.?\d+$/.test(value2)) {
      var result = (parseFloat(value1) * parseFloat(value2)).toFixed(2);
      dlug.value = result;
      addSeparator('id_DlugFoliZlec_Korekta');
    } else {
      dlug.value = '';
    }
  }
}



  var isFirstLoad = localStorage.getItem('isFirstLoad');

if (!isFirstLoad) {
 zakladkaFunc();
 wagafolizlecFunc();
 dlugfoliplanFunc();
 dlugrolkiplanFunc();
 wagarolkizlecFunc();
 dlugfolizlecFunc();
 localStorage.setItem('isFirstLoad', 'true');
}