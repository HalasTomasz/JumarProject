    var selectedCell = null;

    $(document).ready(function(){

        $("td[data-id]").click(function(){
            // Remove previous selection if any
            if (selectedCell !== null) {
                selectedCell.removeClass("selected-cell");
            }
            $("td[data-id]").removeClass("selected-cell");

            console.log("HIHI")
            // Get ID of clicked cell
            var id = $(this).data("id");
            // Set current cell as selected
            console.log(selectedCell)
            selectedCell = $(this);
            console.log(selectedCell)
            selectedCell.addClass("selected-cell");

            // Activate button below the table
            $("#btn-below").prop("disabled", false).data("id", id);
        });

        $("#btn-below").click(function(){
            // Get ID of clicked button
            var id = $(this).data("id");

            // Redirect to Django page with ID parameter
            window.location.href = "/formFolia/" + id;
        });
    });

$(document).ready(function() {
    $('td[data-id]').click(function() {
      var id = $(this).data("id");
      console.log(id)
      $.ajax({
        url: 'get-data/' + id,
        success: function(data) {
          var tbody = $('#tbodyid');
          $("#tbodyid").empty();
          var counter = 1;
          $.each(data, function(index, row) {
              $.each(row, function(index2, row2) {
            var tr = $('<tr>');
            $('<td>').html(counter).appendTo(tr);
            $('<td>').html(row2.id).appendTo(tr);
            $('<td>').html(row2.data).appendTo(tr);
            $('<td>').html(row2.zmiana).appendTo(tr);
            $('<td>').html(row2.rolka).appendTo(tr);
            $('<td>').html(row2.nrwytl).appendTo(tr);
            $('<td>').html(row2.dlugrolkiprod).appendTo(tr);
            $('<td>').html(row2.wagarolkiprod).appendTo(tr);
            $('<td>').html(row2.walce).appendTo(tr);
            $('<td>').html(row2.slimak).appendTo(tr);
            $('<td>').html(row2.uwagi).appendTo(tr);
            $('<td>').html(row2.wynikowa).appendTo(tr);
            $('<td>').html(row2.wynik).appendTo(tr);
            $('<td>').html(row2.operator).appendTo(tr);
            $('<td>').html(row2.mieszanka).appendTo(tr);
            var date = row2.id.split('/')[0];  // extract the date component from the row2.id string
            var pk = row2.id.split('/')[1];  // extract the pk component from the row2.id string
            var rolka = row2.rolka;
            var editUrl = `/editRolForm/${date}/${pk}/${rolka}`;
            var editButton = $('<a>').attr('href', editUrl).text('Edytuj');
            $('<td>').append(editButton).appendTo(tr);
            tbody.append(tr);
            counter++;
            });
          });
            $('td:nth-child(13)').each(function() {
            var value = $(this).text();
            if (parseFloat(value.replace(',', '.')) > 100) {
              $(this).css('color', 'red');
            }
          });
        }
      });
    });
  });

 function getData(id) {
      console.log(id)
    $.ajax({
      url: 'get-data/' + id,
      success: function(data) {
        var tbody = $('#tbodyid');
        $("#tbodyid").empty();
        var counter = 1;
        $.each(data, function(index, row) {
          $.each(row, function(index2, row2) {
            var tr = $('<tr>');
            $('<td>').html(counter).appendTo(tr);
            $('<td>').html(row2.id).appendTo(tr);
            $('<td>').html(row2.data).appendTo(tr);
            $('<td>').html(row2.zmiana).appendTo(tr);
            $('<td>').html(row2.rolka).appendTo(tr);
            $('<td>').html(row2.nrwytl).appendTo(tr);
            $('<td>').html(row2.dlugrolkiprod).appendTo(tr);
            $('<td>').html(row2.wagarolkiprod).appendTo(tr);
            $('<td>').html(row2.walce).appendTo(tr);
            $('<td>').html(row2.slimak).appendTo(tr);
            $('<td>').html(row2.uwagi).appendTo(tr);
            $('<td>').html(row2.wynikowa).appendTo(tr);
            $('<td>').html(row2.wynik).appendTo(tr);
            $('<td>').html(row2.operator).appendTo(tr);
            $('<td>').html(row2.mieszanka).appendTo(tr);
            var date = row2.id.split('/')[0];
            var pk = row2.id.split('/')[1];
            var rolka = row2.rolka;
            var editUrl = `/editRolForm/${date}/${pk}/${rolka}`;
            var editButton = $('<a>').attr('href', editUrl).text('Edytuj');
            $('<td>').append(editButton).appendTo(tr);
            tbody.append(tr);
            counter++;
          });
        });
        $('td:nth-child(13)').each(function() {
          var value = $(this).text();
          if (parseFloat(value.replace(',', '.')) > 100) {
            $(this).css('color', 'red');
          }
        });
      }
    });
  }

$(document).ready(function() {
  // Set up the clickbox to filter the table
  $('#filter-column').on('change', function() {
    var selectedColumn = $(this).val();
    var tableRows = $('#mainTable tbody #special');
      tableRows.hide()
    // If "All" is selected, show all rows
    if (selectedColumn === '') {
      tableRows.show();
      return;
    }

    // Loop through the table rows and hide/show based on selected column value
    tableRows.each(function() {

      var rowValue = $(this).text().toLowerCase();
      if (rowValue.indexOf(selectedColumn) !== -1) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  });
});


$(document).ready(function(){
        // Function to check if a value is over 100
        function isOver100(value) {
            return parseFloat(value.replace(',', '.')) > 100;
        }

        // Iterate over each row in the table
        $("#data-table tbody tr").each(function(){
            // Get the value in the "GrubośćWynikdoZakl" cell
            var value = $(this).find("td:nth-child(13)").text();
            console.log(value)
            // Check if the value is over 100
            if (isOver100(value)) {
                // Apply the red color to the cell
                $(this).find("td:nth-child(13)").css("color", "red");
            }
        });
    });

$(document).ready(function() {
    $('td[data-id]').click(function() {
      var id = $(this).data("id");
      $.ajax({
        url: 'get-dataCal/' + id,
        success: function(data) {
            $.each(data, function(index, row) {


                $('#wagaProd').html(row[0]);
                $('#wagaEnd').html(row[1]);
                $('#dlugProd').html(row[2]);
                $('#dlugEnd').html(row[3]);
                $('#rolkaProd').html(row[4]);
                $('#rolkaEnd').html(row[5]);
            });
        }
       });
    });
  });
