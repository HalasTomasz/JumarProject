
function searchTables() {
    var input, filter, tables, table, tr, td, i, j, k, txtValue, matchFound;
    input = document.getElementById("searchInput");
    filter = input.value.toUpperCase();
    tables = document.getElementsByTagName('table');

    for (i = 0; i < tables.length; i++) {
        table = tables[i];
        tr = table.getElementsByTagName("tr");
        matchFound = false;

        for (j = 1; j < tr.length; j++) {
            td = tr[j].getElementsByTagName("td");

            for (k = 0; k < td.length; k++) {
                if (td[k]) {
                    txtValue = td[k].textContent || td[k].innerText;
                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        matchFound = true;
                        break;
                    }
                }
            }

            if (matchFound) {
                tr[j].style.display = "";
            } else {
                tr[j].style.display = "none";
            }
        }

        if (matchFound) {
            table.style.display = "";
        } else {
            table.style.display = "none";
        }
    }
}

function searchDoc2() {
  var input, filter, table, tr, td, i, j, txtValue, matchFound;
  input = document.getElementById("searchInput");
  filter = input.value.toUpperCase();
  table = document.getElementById("mainTable");
  tr = table.getElementsByTagName("tr");
  matchFound = false;

  for (j = 1; j < tr.length; j++) {
    td = tr[j].getElementsByTagName("td");
    matchFound = false;

    for (k = 0; k < td.length; k++) {
      if (td[k]) {
        txtValue = td[k].textContent || td[k].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          matchFound = true;
          break;
        }
      }
    }


    if (matchFound) {
      tr[j].style.display = ""; // Display rows that contain the searched data
    } else {
      tr[j].style.display = "none"; // Hide rows that don't contain the searched data
    }
  }

}
