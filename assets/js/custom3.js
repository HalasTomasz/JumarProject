// =============  Data Table - (Start) ================= //

var minDate, maxDate;

// Custom filtering function which will search data in column four between two values
$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
        var min = minDate.val();
        var max = maxDate.val();

        var date = new Date( data[2] );
        console.log(date)
        if (
            ( min === null && max === null ) ||
            ( min === null && date <= max ) ||
            ( min <= date   && max === null ) ||
            ( min <= date   && date <= max )
        ) {
            return true;
        }
        return false;
    }
);

$(document).ready(function(){

    minDate = new DateTime($('#min'), {
       format: 'DD-MM-YYYY',
    });
    maxDate = new DateTime($('#max'), {
        format: 'DD-MM-YYYY',
    });

    var table = $('#example').DataTable({


           language: {
              search: "Wyszukaj:",
              "buttons": {
                  "copy": "Skopiuj",
                  "excel": "Excel",
                  "print": "Wydrukuj",
              },
              datetime: {
                  previous: 'Wstecz',
                  next: 'Dalej',
                  months: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
                  weekdays: ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'],
                  amPm: ['am', 'pm'],
                  hours: 'Godzina',
                  minutes: 'Minuta',
                  seconds: 'Sekunda',
                  unknown: '-'
              },
              lengthMenu: "Pokaż _MENU_ wpisów",
               info: "Wyświetl _START_ do _END_ z _TOTAL_ rekordów",
              zeroRecords: "Nie znaleziono pasujących rekordów",
                  sEmptyTable: "Brak dostępnych danych w tabeli",
                infoFiltered: "(przefiltrowane z _MAX_ wszystkich rekordów)",
              oPaginate: {
              sFirst: "Pierwsza",
              sLast: "Ostatnia",
              sNext: "Następna",
              sPrevious: "Poprzednia"
                },
                minimumDate: "Minimalna data",
                maximumDate: "Maksymalna data",
          },


        buttons:['copy', 'excel', 'print'],
      scrollX: true,
        
    });
    
    
    table.buttons().container()
    .appendTo('#example_wrapper .col-md-6:eq(0)');

    $('#min, #max').on('change', function () {
        table.draw();
    });

    $('#reset-filter').on('click', function() {
    // Clear the input fields
    minDate.val('');
    maxDate.val('');

    // Redraw the table to remove the applied filtering
    table.draw();
  });

  table.on('mouseenter', 'td', function () {
    let rowIdx = table.cell(this).index().row;
    table
        .rows()
        .nodes()
        .each((el) => el.classList.remove('highlight'));

    table
        .row(rowIdx)
        .nodes()
        .each((el) => el.classList.add('highlight'));
});

});

// =============  Data Table - (End) ================= //

var global_id = NaN
function showPopup(id) {
    // Show the popup
    $(".popup").show();
    // Set the selected object ID
    global_id = id
}

function hidePopup() {
    // Hide the popup
    $(".popup").hide();
}

function updateStatus() {
    // Get the selected object ID and status value

    var status = $("#id_Status").val();
    // Update the object status in the database
    $.ajax({
        url: "/update_status",
        method: "POST",
        data: {
            "id": global_id,
            "status": status,
            "csrfmiddlewaretoken": "{{ csrf_token }}"
        },
        success: function(data) {
            // Hide the popup and refresh the page
            hidePopup();
            window.location.reload();
        },
        error: function(xhr, status, error) {
            // Handle error
            alert("Error updating status.");
        }
    });
}
