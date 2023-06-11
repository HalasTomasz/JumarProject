// =============  Data Table - (Start) ================= //
var minDate, maxDate;

// Custom filtering function which will search data in column four between two values
$.fn.dataTable.ext.search.push(
    function( settings, data, dataIndex ) {
        var min = minDate.val();
        var max = maxDate.val();
        var date = new Date( data[3] );
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
        footerCallback: function (row, data, start, end, display) {
        var api = this.api();


            var intVal = function (i) {
          if (typeof i === 'string') {
            return i.replace(/[\s,]/g, '') * 1; // Remove spaces and commas
          } else if (typeof i === 'number') {
            return i;
          } else {
            return 0;
          }
        };

        pageTotal = api
          .column(5, { page: 'current' })
          .data()
          .reduce(function (a, b) {
            return intVal(a.toString().replace(/\s/g, '')) + intVal(b.toString().replace(/\s/g, ''));
          }, 0);

        pageTotal2 = api
          .column(6, { page: 'current' })
          .data()
          .reduce(function (a, b) {
            return intVal(a.toString().replace(/\s/g, '')) + intVal(b.toString().replace(/\s/g, ''));
          }, 0);


        // Update footer
        // $(api.column(15).footer()).html('$' + pageTotal);
        // $(api.column(16).footer()).html('$' + pageTotal2);

        // Update total data
            console.log(pageTotal)
        $('#total-data').html('DługRolkaProd:  ' + addSeparatorVal(pageTotal) + '   |   WagaRolkaProd:  ' + addSeparatorVal(pageTotal2));
      },
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


});

// =============  Data Table - (End) ================= //
