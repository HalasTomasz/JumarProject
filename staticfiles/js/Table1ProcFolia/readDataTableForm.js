$(document).ready(function() {
      // Call the getData function with the appropriate argument here if needed
  });
function getData(id) {
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


function getSmallTableData(id) {
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
    }